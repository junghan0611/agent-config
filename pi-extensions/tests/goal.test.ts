/**
 * Goal continuation lifecycle regression.
 *
 * Run: bun run pi-extensions/tests/goal.test.ts
 *
 * The extension imports pi runtime packages that are resolved only by Pi's
 * loader. Like the other extension regressions, load an otherwise-identical
 * temporary copy with those runtime values stubbed. No model or network call.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = new URL("../goal.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "goal-extension-"));
const patched = join(dir, "goal.ts");

const STUB = `
const randomUUID = () => "goal-test-id";
const StringEnum = (values, options) => ({ type: "string", enum: [...values], ...options });
const Type = {
	Object: (properties) => ({ type: "object", properties }),
	String: (options) => ({ type: "string", ...options }),
	Number: (options) => ({ type: "number", ...options }),
	Optional: (schema) => ({ ...schema, optional: true }),
};
`;

writeFileSync(
	patched,
	STUB +
		readFileSync(EXT, "utf8")
			.replace(/^import \{ randomUUID \} from "node:crypto";$/m, "")
			.replace(/^import \{ StringEnum \} from "@earendil-works\/pi-ai";$/m, "")
			.replace(/^import type \{ ExtensionAPI, ExtensionContext \} from "@earendil-works\/pi-coding-agent";$/m, "")
			.replace(/^import \{ Type \} from "typebox";$/m, ""),
);

const { default: goalExtension } = await import(patched);

type Handler = (event: any, ctx: any) => Promise<unknown> | unknown;

type Harness = {
	handlers: Map<string, Handler>;
	commands: Map<string, any>;
	tools: Map<string, any>;
	sent: Array<{ message: any; options: any }>;
	/** Pi's one global active-tool list, shared with every other extension. */
	active: string[];
	setCalls: number;
	branch: unknown[];
	ctx: any;
};

// What Pi activates at startup/reload: built-ins plus every extension tool, ours
// included, and one tool another extension owns.
const STARTUP_TOOLS = ["read", "bash", "edit", "other_ext_tool", "get_goal", "update_goal"];

function createHarness({ pendingMessages = false }: { pendingMessages?: boolean } = {}): Harness {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, any>();
	const tools = new Map<string, any>();
	const sent: Array<{ message: any; options: any }> = [];
	const entries: unknown[] = [];

	const harness = {
		handlers,
		commands,
		tools,
		sent,
		active: [...STARTUP_TOOLS],
		setCalls: 0,
		branch: [] as unknown[],
	} as Harness;

	goalExtension({
		on: (event: string, handler: Handler) => handlers.set(event, handler),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		registerCommand: (name: string, command: any) => commands.set(name, command),
		sendMessage: (message: any, options: any) => sent.push({ message, options }),
		appendEntry: (_type: string, entry: unknown) => entries.push(entry),
		getActiveTools: () => [...harness.active],
		setActiveTools: (names: string[]) => {
			harness.setCalls++;
			harness.active = [...names];
		},
	});

	return Object.assign(harness, {
		ctx: {
			hasUI: false,
			isIdle: () => false,
			hasPendingMessages: () => pendingMessages,
			sessionManager: {
				getBranch: () => harness.branch,
				getSessionId: () => "goal-test-session",
			},
			ui: {
				setStatus: () => undefined,
				notify: () => undefined,
			},
			entries,
		},
	});
}

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
	if (ok) {
		console.log(`  ok   ${name}`);
	} else {
		failures++;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

async function createActiveGoal(harness: Harness): Promise<void> {
	await harness.commands.get("goal").handler("Keep the active goal moving", harness.ctx);
	// /goal queues the first continuation itself. The following checks isolate
	// the agent_end path, which is where the late-message race used to lose it.
	harness.sent.length = 0;
}

console.log("goal authority — only the human /goal command can create a goal");
{
	const harness = createHarness();
	check("models have no create_goal tool", !harness.tools.has("create_goal"));
}

console.log("goal continuation — a late pending message must not abandon an active goal");
{
	const harness = createHarness({ pendingMessages: true });
	await createActiveGoal(harness);
	await harness.handlers.get("agent_start")!({}, harness.ctx);
	await harness.handlers.get("agent_end")!(
		{ messages: [{ role: "assistant", stopReason: "stop", usage: { input: 10, output: 2 } }] },
		harness.ctx,
	);

	check("one continuation is scheduled despite a pending user message", harness.sent.length === 1, `sent=${harness.sent.length}`);
	const continuation = harness.sent[0];
	check("continuation is deferred behind existing work", continuation?.options?.deliverAs === "followUp");
	check("continuation triggers the next turn", continuation?.options?.triggerTurn === true);
	check("continuation remains hidden from transcript noise", continuation?.message?.display === false);

	await harness.handlers.get("agent_end")!(
		{ messages: [{ role: "assistant", stopReason: "stop", usage: { input: 1, output: 1 } }] },
		harness.ctx,
	);
	check("the same run cannot enqueue a duplicate continuation", harness.sent.length === 1, `sent=${harness.sent.length}`);
}

console.log("goal completion — terminal status never queues a continuation");
{
	const harness = createHarness();
	await createActiveGoal(harness);
	await harness.tools.get("update_goal").execute("complete", { status: "complete" }, undefined, undefined, harness.ctx);
	await harness.handlers.get("agent_end")!(
		{ messages: [{ role: "assistant", stopReason: "stop", usage: { input: 1, output: 1 } }] },
		harness.ctx,
	);
	check("completed goal stays terminal", harness.sent.length === 0, `sent=${harness.sent.length}`);
}

const goalTools = (h: Harness): string[] => h.active.filter((name) => name === "get_goal" || name === "update_goal");
const others = (h: Harness): string[] => h.active.filter((name) => name !== "get_goal" && name !== "update_goal");
const goalEntry = (status: string) => ({
	type: "custom",
	customType: "goal",
	data: { version: 2, action: "set", goal: { id: `g-${status}`, objective: "Branch goal", status, tokensUsed: 0, timeUsedSeconds: 0 } },
});
async function throws(fn: () => Promise<unknown>): Promise<string | null> {
	try {
		await fn();
		return null;
	} catch (err) {
		return err instanceof Error ? err.message : String(err);
	}
}
const stop = { messages: [{ role: "assistant", stopReason: "stop", usage: { input: 1, output: 1 } }] };

console.log("tool visibility — no goal means no goal tools in the request");
{
	const h = createHarness();
	await h.handlers.get("session_start")!({ reason: "startup" }, h.ctx);
	check("session_start with no goal hides get_goal and update_goal", goalTools(h).length === 0, JSON.stringify(h.active));
	check("every other extension's tool is kept, in order", others(h).join() === "read,bash,edit,other_ext_tool", JSON.stringify(h.active));

	const calls = h.setCalls;
	await h.handlers.get("session_start")!({ reason: "startup" }, h.ctx);
	check("an unchanged loadout is not re-set (no empty tool delta)", h.setCalls === calls, `setCalls ${calls}→${h.setCalls}`);
}

console.log("tool visibility — /goal set|pause|resume|clear follow the state");
{
	const h = createHarness();
	await h.handlers.get("session_start")!({ reason: "startup" }, h.ctx);
	await h.commands.get("goal").handler("Keep going", h.ctx);
	check("/goal <objective> exposes both tools", goalTools(h).join() === "get_goal,update_goal", JSON.stringify(h.active));

	// Another extension toggles its own tool between our transitions.
	h.active.push("waiting_for");
	await h.commands.get("goal").handler("pause", h.ctx);
	check("/goal pause keeps get_goal and hides update_goal", goalTools(h).join() === "get_goal", JSON.stringify(h.active));
	check("a tool another extension added meanwhile survives", h.active.includes("waiting_for"));

	await h.commands.get("goal").handler("resume", h.ctx);
	check("/goal resume exposes update_goal again", goalTools(h).join() === "get_goal,update_goal", JSON.stringify(h.active));

	await h.commands.get("goal").handler("clear", h.ctx);
	check("/goal clear hides both", goalTools(h).length === 0, JSON.stringify(h.active));
	check("clear leaves unrelated tools alone", others(h).join() === "read,bash,edit,other_ext_tool,waiting_for", JSON.stringify(h.active));
}

console.log("update_goal — hidden after a terminal mark, and refused when not active");
{
	const h = createHarness();
	await h.handlers.get("session_start")!({ reason: "startup" }, h.ctx);
	await h.commands.get("goal").handler("Finish it", h.ctx);
	await h.tools.get("update_goal").execute("c1", { status: "complete" }, undefined, undefined, h.ctx);
	check("marking complete hides update_goal for the next request", goalTools(h).join() === "get_goal", JSON.stringify(h.active));
	const again = await throws(() => h.tools.get("update_goal").execute("c2", { status: "blocked" }, undefined, undefined, h.ctx));
	check("a stale update_goal on a complete goal is refused", again !== null && again.includes("complete"), String(again));
	const read = await h.tools.get("get_goal").execute("g1", {}, undefined, undefined, h.ctx);
	check("get_goal still reads the completed goal", read.details.goal?.status === "complete");

	await h.commands.get("goal").handler("Next objective", h.ctx);
	await h.commands.get("goal").handler("pause", h.ctx);
	const paused = await throws(() => h.tools.get("update_goal").execute("c3", { status: "complete" }, undefined, undefined, h.ctx));
	check("update_goal cannot complete a paused goal behind the user's back", paused !== null && paused.includes("paused"), String(paused));
	const state = await h.tools.get("get_goal").execute("g2", {}, undefined, undefined, h.ctx);
	check("the paused goal is unchanged", state.details.goal?.status === "paused");

	await h.commands.get("goal").handler("clear", h.ctx);
	const none = await throws(() => h.tools.get("update_goal").execute("c4", { status: "complete" }, undefined, undefined, h.ctx));
	check("update_goal with no goal is refused", none !== null && none.includes("none"), String(none));
}

console.log("tool visibility — system-driven stops hide update_goal");
{
	const h = createHarness();
	await h.handlers.get("session_start")!({ reason: "startup" }, h.ctx);
	await h.commands.get("goal").handler("Errors stop it", h.ctx);
	await h.handlers.get("agent_start")!({}, h.ctx);
	await h.handlers.get("agent_end")!({ messages: [{ role: "assistant", stopReason: "error", errorMessage: "boom" }] }, h.ctx);
	check("an errored goal turn (blocked) hides update_goal", goalTools(h).join() === "get_goal", JSON.stringify(h.active));

	const a = createHarness();
	await a.handlers.get("session_start")!({ reason: "startup" }, a.ctx);
	await a.commands.get("goal").handler("Abort pauses headless", a.ctx);
	await a.handlers.get("agent_start")!({}, a.ctx);
	await a.handlers.get("agent_end")!({ messages: [{ role: "assistant", stopReason: "aborted" }] }, a.ctx);
	check("a headless abort (paused) hides update_goal", goalTools(a).join() === "get_goal", JSON.stringify(a.active));
}

console.log("tool visibility — session_start / reload / session_tree rebuild from the branch");
{
	const h = createHarness();
	h.branch = [goalEntry("active")];
	await h.handlers.get("session_start")!({ reason: "resume" }, h.ctx);
	check("resuming a branch with an active goal exposes both", goalTools(h).join() === "get_goal,update_goal", JSON.stringify(h.active));

	// Tree navigation: Pi restores the target branch's transcript loadout first
	// (here: it predates both goal tools), then emits session_tree.
	h.branch = [goalEntry("paused")];
	h.active = ["read", "bash", "other_ext_tool"];
	await h.handlers.get("session_tree")!({}, h.ctx);
	check("a tree move onto a paused goal re-adds get_goal only", goalTools(h).join() === "get_goal", JSON.stringify(h.active));

	h.branch = [];
	h.active = ["read", "bash", "other_ext_tool", "get_goal", "update_goal"];
	await h.handlers.get("session_tree")!({}, h.ctx);
	check("a tree move onto a goal-less branch hides a restored loadout", goalTools(h).length === 0, JSON.stringify(h.active));
	check("the restored unrelated tools are kept", others(h).join() === "read,bash,other_ext_tool", JSON.stringify(h.active));

	// Reload: Pi turns every extension tool back on, then emits session_start(reload).
	h.branch = [goalEntry("active"), { type: "custom", customType: "goal", data: { version: 2, action: "clear", goal: null } }];
	h.active = [...STARTUP_TOOLS];
	await h.handlers.get("session_start")!({ reason: "reload" }, h.ctx);
	check("reload of a cleared branch hides the re-enabled goal tools", goalTools(h).length === 0, JSON.stringify(h.active));
}

if (failures > 0) process.exit(1);
