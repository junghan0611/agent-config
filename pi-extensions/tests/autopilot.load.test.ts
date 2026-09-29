/**
 * autopilot 로드 스모크 — **스텁 없이 실물 pi 패키지로** 확장을 불러온다.
 *
 *   bun run pi-extensions/tests/autopilot.load.test.ts
 *   ./run.sh test:autopilot   (스텁 회귀 다음에 같이 돈다)
 *
 * 옆 파일 `autopilot.test.ts` 는 import 를 스텁으로 바꿔 로직만 잰다. 여기서는
 * decision-gate.load.test.ts 와 같은 방법으로 이 기기에서 실제로 도는 pi 의 패키지 트리를
 * 되짚어 두 파일(autopilot + 그것이 import 하는 decision-gate)을 같이 불러온다. 재는 것:
 *   1. 자매 파일 import 가 실물 모듈 해석으로 풀린다
 *   2. 실물 typebox/`StringEnum` 으로 `waiting_for` 스키마가 선다
 *   3. 붙는 이벤트가 정확히 그 목록이다 — `tool_call` 이 없다(실행 0)
 *   4. 로드 시점에 만지는 API 가 on/registerTool/registerCommand 뿐 — sendMessage 없음
 *
 * pi 를 그 모양으로 안 깐 기기에서는 skip 을 찍고 통과한다.
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

function resolvePiPeerModules(): { peer: string } | { skip: string } {
	const cleanPath = (process.env.PATH ?? "")
		.split(":")
		.filter((p) => !p.endsWith("/node_modules/.bin"))
		.join(":");
	const shim = Bun.which("pi", { PATH: cleanPath });
	if (!shim) return { skip: "no `pi` on the login PATH" };
	// pnpm 은 셸 shim 을 깔고(cmd-shim-target 주석), 다른 설치 모양은 cli.js 로 바로
	// 심링크한다. 둘 다 받는다.
	const script = readFileSync(shim, "utf8");
	const target = /cmd-shim-target=(\S+)/u.exec(script)?.[1] ?? /exec node\s+"([^"]+cli\.js)"/u.exec(script)?.[1];
	const cli = target ? target.replace(/^\$basedir(_win)?/u, dirname(shim)) : realpathSync(shim);
	if (!existsSync(cli)) return { skip: `pi shim points at a missing cli: ${cli}` };
	// .../node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js → .../node_modules
	const pkgRoot = realpathSync(cli).replace(/\/dist\/.*$/u, "");
	const peer = join(pkgRoot, "..", "..");
	if (!existsSync(join(peer, "@earendil-works", "pi-ai")))
		return { skip: `no @earendil-works/pi-ai next to the running pi (looked in ${peer})` };
	return { peer: realpathSync(peer) };
}

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
	if (ok) console.log(`  ok   ${name}`);
	else {
		failures++;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

const resolved = resolvePiPeerModules();
if ("skip" in resolved) {
	console.log(`skip load smoke — ${resolved.skip}`);
	process.exit(0);
}
const peer = resolved.peer;
console.log(`load smoke — the real pi package tree at ${peer}`);

const dir = mkdtempSync(join(tmpdir(), "autopilot-load-"));
symlinkSync(peer, join(dir, "node_modules"));
// 원래 이름 그대로 — autopilot.ts 는 "./decision-gate.ts" 를 import 한다.
cpSync(new URL("../autopilot.ts", import.meta.url).pathname, join(dir, "autopilot.ts"));
cpSync(new URL("../decision-gate.ts", import.meta.url).pathname, join(dir, "decision-gate.ts"));

const mod = await import(join(dir, "autopilot.ts"));

const handlers = new Map<string, unknown>();
const commands = new Map<string, unknown>();
const tools = new Map<string, { parameters: { properties: Record<string, { enum?: string[] }> } }>();
const touched: string[] = [];
const fakePi = new Proxy(
	{
		on: (e: string, h: unknown) => handlers.set(e, h),
		registerCommand: (name: string, opts: unknown) => commands.set(name, opts),
		registerTool: (t: { name: string; parameters: never }) => tools.set(t.name, t),
		appendEntry: () => {
			throw new Error("loading must not write entries");
		},
		sendMessage: () => {
			throw new Error("loading must not send messages");
		},
	} as Record<string, unknown>,
	{
		get(target, prop: string) {
			touched.push(prop);
			return target[prop];
		},
	},
);
mod.default(fakePi);

const expected = ["session_start", "session_before_switch", "session_tree", "session_shutdown", "agent_start", "agent_end", "agent_settled", "before_agent_start", "input", "context"];
check("the extension loads against the installed pi, sibling import included", typeof mod.default === "function" && typeof mod.filterContext === "function");
check("exactly the expected events are wired", [...handlers.keys()].sort().join() === [...expected].sort().join(), [...handlers.keys()].join(","));
check("no tool_call hook — nothing is gated or executed", !handlers.has("tool_call"));
check("the /autopilot command is registered", commands.has("autopilot"));
check("waiting_for is the only tool", [...tools.keys()].join() === "waiting_for");
const kinds = tools.get("waiting_for")?.parameters?.properties?.kind?.enum;
check("waiting_for's kind enum survives the real StringEnum", JSON.stringify(kinds) === JSON.stringify(["glg", "peer", "local", "none"]), JSON.stringify(kinds));
check(
	"loading touches only on / registerTool / registerCommand",
	[...new Set(touched)].every((t) => t === "on" || t === "registerTool" || t === "registerCommand"),
	touched.join(","),
);
check("the DM runner points at the repo's dm skill", mod.buildDmArgv("pi/x")[0].endsWith("/dm/scripts/dm.sh"));

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
