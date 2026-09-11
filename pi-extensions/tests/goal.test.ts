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
	ctx: any;
};

function createHarness({ pendingMessages = false }: { pendingMessages?: boolean } = {}): Harness {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, any>();
	const tools = new Map<string, any>();
	const sent: Array<{ message: any; options: any }> = [];
	const entries: unknown[] = [];

	goalExtension({
		on: (event: string, handler: Handler) => handlers.set(event, handler),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		registerCommand: (name: string, command: any) => commands.set(name, command),
		sendMessage: (message: any, options: any) => sent.push({ message, options }),
		appendEntry: (_type: string, entry: unknown) => entries.push(entry),
	});

	return {
		handlers,
		commands,
		tools,
		sent,
		ctx: {
			hasUI: false,
			isIdle: () => false,
			hasPendingMessages: () => pendingMessages,
			sessionManager: {
				getBranch: () => [],
				getSessionId: () => "goal-test-session",
			},
			ui: {
				setStatus: () => undefined,
				notify: () => undefined,
			},
			entries,
		},
	};
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

if (failures > 0) process.exit(1);
