/**
 * goal tool visibility in the installed pi — off / on / off through the real
 * runtime's session_start, session_tree and reload paths.
 *
 *   bun run pi-extensions/tests/goal.rpc.test.ts
 *
 * Isolation: a temporary PI_CODING_AGENT_DIR holding only `extensions/`, so this
 * machine's ~/.pi/agent (settings, auth, packages) is neither read nor written,
 * and provider key variables are dropped from the child env. No model turn runs:
 * `/goal <objective>` and `/goal resume` queue a continuation turn, so the goal is
 * seeded as a session entry by a probe extension and entered with a real tree
 * move instead. Only `/goal pause` and `/goal clear` are sent — neither triggers
 * a turn. Zero model, network, DM or paid calls.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
	if (ok) console.log(`  ok   ${name}`);
	else {
		failures++;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

const cleanPath = (process.env.PATH ?? "").split(":").filter((p) => !p.endsWith("/node_modules/.bin")).join(":");
const piBin = Bun.which("pi", { PATH: cleanPath });
if (!piBin) {
	console.log("skip rpc smoke — no `pi` on the login PATH");
	process.exit(0);
}

const EXT_DIR = new URL("..", import.meta.url).pathname;

// Seeds session entries and drives the command-only tree/reload actions. Entry
// ids live on globalThis so they outlive the extension runtime that /reload-probe
// replaces.
const PROBE = `
const ids = (globalThis.__goalProbeIds ??= {});
export default function (pi) {
	pi.registerCommand("tools-probe", { handler: async () => pi.sendMessage({ customType: "tools-probe", content: JSON.stringify(pi.getActiveTools()), display: true }, { triggerTurn: false }) });
	pi.registerCommand("seed", {
		handler: async (name, ctx) => {
			if (name === "base") pi.appendEntry("probe-base", {});
			else pi.appendEntry("goal", { version: 2, action: "set", goal: { id: "g-" + name, objective: "seeded " + name, status: name, tokensUsed: 0, timeUsedSeconds: 0 } });
			ids[name] = ctx.sessionManager.getLeafId();
		},
	});
	pi.registerCommand("tree-to", { handler: async (name, ctx) => { await ctx.navigateTree(ids[name]); } });
	pi.registerCommand("reload-probe", { handler: async (_args, ctx) => { await ctx.reload(); } });
}
`;

type Json = Record<string, unknown>;

async function runRpc(commands: Json[]): Promise<{ lines: Json[]; stderr: string }> {
	const agentDir = mkdtempSync(join(tmpdir(), "goal-rpc-"));
	mkdirSync(join(agentDir, "extensions"));
	symlinkSync(join(EXT_DIR, "goal.ts"), join(agentDir, "extensions", "goal.ts"));
	writeFileSync(join(agentDir, "extensions", "probe.ts"), PROBE);
	const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/API_KEY|_TOKEN|OAUTH/i.test(k)));
	const proc = Bun.spawn([piBin!, "--mode", "rpc"], {
		cwd: agentDir,
		env: { ...env, PATH: cleanPath, PI_CODING_AGENT_DIR: agentDir },
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	const lines: Json[] = [];
	const waiters = new Map<string, () => void>();
	const reader = (async () => {
		const decoder = new TextDecoder();
		let buf = "";
		for await (const chunk of proc.stdout) {
			buf += decoder.decode(chunk);
			let nl: number;
			while ((nl = buf.indexOf("\n")) >= 0) {
				const line = buf.slice(0, nl).trim();
				buf = buf.slice(nl + 1);
				if (!line) continue;
				let o: Json;
				try {
					o = JSON.parse(line);
				} catch {
					o = { type: "raw", line };
				}
				lines.push(o);
				if (o.type === "response" && typeof o.id === "string") waiters.get(o.id)?.();
			}
		}
	})();
	for (const cmd of commands) {
		const done = new Promise<void>((resolve) => waiters.set(cmd.id as string, resolve));
		proc.stdin.write(`${JSON.stringify(cmd)}\n`);
		await Promise.race([done, new Promise((r) => setTimeout(r, 15_000)), proc.exited]);
	}
	proc.stdin.end();
	await Promise.race([proc.exited, new Promise<null>((r) => setTimeout(() => (proc.kill(), r(null)), 10_000))]);
	await reader;
	const stderr = await new Response(proc.stderr).text();
	rmSync(agentDir, { recursive: true, force: true });
	return { lines, stderr };
}

const prompt = (id: string, message: string): Json => ({ id, type: "prompt", message });

console.log(`rpc smoke — ${piBin} with an isolated PI_CODING_AGENT_DIR`);

const steps: Json[] = [
	prompt("p-start", "/tools-probe"),
	prompt("s-base", "/seed base"),
	prompt("s-active", "/seed active"),
	prompt("p-seeded", "/tools-probe"),
	prompt("t-active", "/tree-to active"),
	prompt("p-on", "/tools-probe"),
	prompt("pause", "/goal pause"),
	prompt("p-paused", "/tools-probe"),
	prompt("clear", "/goal clear"),
	prompt("p-cleared", "/tools-probe"),
	prompt("t-back", "/tree-to active"),
	prompt("p-tree-on", "/tools-probe"),
	prompt("reload", "/reload-probe"),
	prompt("p-reload", "/tools-probe"),
	prompt("t-base", "/tree-to base"),
	prompt("p-off", "/tools-probe"),
];
const { lines, stderr } = await runRpc(steps);

check("no extension load error on stderr", !/Failed to load extension/.test(stderr), stderr.slice(0, 300));
check("every command was accepted", steps.every((s) => lines.find((l) => l.type === "response" && l.id === s.id)?.success === true),
	JSON.stringify(lines.filter((l) => l.type === "response" && l.success !== true)).slice(0, 400));

const loadouts = lines
	.filter((l) => l.type === "message_end" && (l.message as Json)?.customType === "tools-probe")
	.map((l) => JSON.parse(String((l.message as Json).content)) as string[]);
const goal = (tools: string[] | undefined) => (tools ?? []).filter((t) => t === "get_goal" || t === "update_goal").join(",");
const [start, seeded, on, paused, cleared, treeOn, reloaded, off] = loadouts;

check("eight loadouts observed", loadouts.length === 8, `got ${loadouts.length}`);
check("startup with no goal: neither goal tool is active", goal(start) === "", JSON.stringify(start));
check("a seeded entry alone changes nothing until a session event", goal(seeded) === "", JSON.stringify(seeded));
check("tree move onto an active goal: get_goal + update_goal", goal(on) === "get_goal,update_goal", JSON.stringify(on));
check("/goal pause: get_goal only", goal(paused) === "get_goal", JSON.stringify(paused));
check("/goal clear: none", goal(cleared) === "", JSON.stringify(cleared));
check("tree move back onto the active goal: both again", goal(treeOn) === "get_goal,update_goal", JSON.stringify(treeOn));
check("reload on an active branch: both (not every extension tool)", goal(reloaded) === "get_goal,update_goal", JSON.stringify(reloaded));
check("tree move onto the goal-less base: none", goal(off) === "", JSON.stringify(off));
const rest = (tools: string[] | undefined) => (tools ?? []).filter((t) => t !== "get_goal" && t !== "update_goal").join(",");
check("built-in tools are identical in every loadout", loadouts.length === 8 && loadouts.every((t) => rest(t) === rest(start)), JSON.stringify(loadouts.map(rest)));
check("no assistant turn ran — zero model calls", !lines.some((l) => l.type === "message_end" && (l.message as Json)?.role === "assistant"));

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
