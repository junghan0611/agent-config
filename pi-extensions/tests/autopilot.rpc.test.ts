/**
 * autopilot 실물 설치 모양 증명 — **설치된 pi 바이너리**가, 운영과 같은 모양(확장 디렉터리에
 * `autopilot.ts` 와 `decision-gate.ts` 심링크 둘)으로 두 확장을 싣고 `/autopilot` 이 도는가.
 *
 *   bun run pi-extensions/tests/autopilot.rpc.test.ts
 *   ./run.sh demo:autopilot   (오프라인 데모 다음에 같이 돈다)
 *
 * 격리: 임시 `PI_CODING_AGENT_DIR` 에 `extensions/` 만 둔다 — settings·auth·packages 가 없어서
 * 이 기기의 ~/.pi/agent 는 읽지도 쓰지도 않는다. `--no-session` 이라 세션 파일도 없다. 보내는
 * 것은 RPC `get_commands` 와 슬래시 명령(`/autopilot on`·`status`·`off`)뿐 — 확장 명령은 모델
 * 턴 없이 처리되므로 LLM·텔레그램·consult 호출이 0 이다.
 *
 * 이 판은 consult 를 부르지 않는다(모델 턴이 없으면 `waiting_for` 도 없다). consult 다리는
 * `autopilot.demo.ts` 가 실물 `runConsult` 로 잰다 — 영수증 둘은 일부러 따로다.
 *
 * 실물로 알게 된 것 하나: pi 로더는 상대 import 를 **심링크가 놓인 자리** 기준으로 푼다.
 * `autopilot.ts` 만 링크하면 `Cannot find module './decision-gate.ts'` 로 실패한다 — 그래서
 * 여기서도 둘을 나란히 링크하고, 하나만 링크한 판이 실패한다는 것도 같이 잰다.
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

type Json = Record<string, unknown>;

/** 격리된 agent dir 로 pi rpc 를 띄우고, 명령을 하나씩 보내며 id 로 응답을 기다린다. */
async function runRpc(links: string[], commands: Json[]): Promise<{ lines: Json[]; stderr: string; exit: number | null }> {
	const agentDir = mkdtempSync(join(tmpdir(), "autopilot-rpc-"));
	mkdirSync(join(agentDir, "extensions"));
	for (const f of links) symlinkSync(join(EXT_DIR, f), join(agentDir, "extensions", f));
	// Real-runtime active-tool observation without an LLM turn or operator config.
	writeFileSync(join(agentDir, "extensions", "probe.ts"), `export default function (pi) { pi.registerCommand("tools-probe", { handler: async () => pi.sendMessage({ customType: "tools-probe", content: JSON.stringify(pi.getActiveTools()), display: true }, { triggerTurn: false }) }); }\n`);
	const proc = Bun.spawn([piBin!, "--mode", "rpc", "--no-session"], {
		cwd: agentDir,
		env: { ...process.env, PATH: cleanPath, PI_CODING_AGENT_DIR: agentDir },
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
					// pi 가 JSON 이 아닌 줄을 찍을 수 있다(외부 프로세스 출력) — 기록만 한다.
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
	const exit = await Promise.race([proc.exited, new Promise<null>((r) => setTimeout(() => (proc.kill(), r(null)), 10_000))]);
	await reader;
	const stderr = await new Response(proc.stderr).text();
	rmSync(agentDir, { recursive: true, force: true });
	return { lines, stderr, exit };
}

const prompt = (id: string, message: string): Json => ({ id, type: "prompt", message });
const response = (lines: Json[], id: string): Json | undefined => lines.find((l) => l.type === "response" && l.id === id);
const entries = (lines: Json[]): Json[] =>
	lines.filter((l) => l.type === "entry_appended").map((l) => l.entry as Json).filter((e) => e.customType === "autopilot");

console.log(`rpc smoke — ${piBin} with an isolated PI_CODING_AGENT_DIR`);

// ── 운영 모양: 둘 다 링크 ────────────────────────────────────────────────
{
	const { lines, stderr } = await runRpc(
		["autopilot.ts", "decision-gate.ts"],
		[{ id: "c", type: "get_commands" }, prompt("before", "/tools-probe"), prompt("on", "/autopilot on 10m 20m"), prompt("armed", "/tools-probe"), prompt("st", "/autopilot status"), prompt("off", "/autopilot off"), prompt("after", "/tools-probe")],
	);
	const cmds = ((response(lines, "c")?.data as { commands?: Array<{ name: string; source: string }> })?.commands ?? []).filter((c) => c.source === "extension").map((c) => c.name);
	check("the installed pi registers /autopilot", cmds.includes("autopilot"), cmds.join(","));
	check("and /decision-gate beside it", cmds.includes("decision-gate"));
	check("no extension load error on stderr", !/Failed to load extension/.test(stderr), stderr.slice(0, 300));
	const ev = entries(lines).map((e) => (e.data as Json).event);
	check("/autopilot on arms in the real runtime (entry `armed`)", ev.includes("armed"), ev.join(","));
	const panels = lines.filter((l) => l.type === "message_end" && (l.message as Json)?.customType === "autopilot-ui").map((l) => String((l.message as Json).content));
	check("/autopilot status reports the session budget", panels.some((p) => p.includes("DMs 0/4 this session")));
	check("/autopilot off disarms", panels.some((p) => p === "Autopilot off."));
	const loadouts = lines.filter((l) => l.type === "message_end" && (l.message as Json)?.customType === "tools-probe").map((l) => JSON.parse(String((l.message as Json).content)) as string[]);
	check("real Pi hides waiting_for off and exposes it only on", loadouts.length === 3 && !loadouts[0].includes("waiting_for") && loadouts[1].includes("waiting_for") && !loadouts[2].includes("waiting_for"), JSON.stringify(loadouts));
	check("unrelated tools survive both toggles", loadouts.length === 3 && loadouts[0].filter((x) => x !== "waiting_for").join() === loadouts[1].filter((x) => x !== "waiting_for").join() && loadouts[0].join() === loadouts[2].join());
	check("every command was accepted", ["before", "on", "armed", "st", "off", "after"].every((id) => response(lines, id)?.success === true));
	check("no assistant turn ran — zero model calls", !lines.some((l) => l.type === "message_end" && (l.message as Json)?.role === "assistant"));
}

// ── 하나만 링크하면 실패한다 — 그래서 둘을 나란히 링크한다 ─────────────────
{
	const { lines, stderr } = await runRpc(["autopilot.ts"], [{ id: "c", type: "get_commands" }]);
	const cmds = ((response(lines, "c")?.data as { commands?: Array<{ name: string; source: string }> })?.commands ?? []).map((c) => c.name);
	check(
		"autopilot.ts linked alone fails to resolve ./decision-gate.ts (loader resolves from the symlink's dir)",
		/Cannot find module '\.\/decision-gate\.ts'/.test(stderr + JSON.stringify(lines)) && !cmds.includes("autopilot"),
		stderr.slice(0, 300),
	);
}

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
