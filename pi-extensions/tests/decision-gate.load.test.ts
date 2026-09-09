/**
 * decision-gate 로드 스모크 — **스텁 없이 실물 pi 패키지로** 확장을 불러온다.
 *
 *   bun run pi-extensions/tests/decision-gate.load.test.ts
 *   ./run.sh test:decision-gate   (스텁 회귀 다음에 같이 돈다)
 *
 * 왜 하나 더 있나. 옆 파일 `decision-gate.test.ts` 는 `@earendil-works/*` 를 스텁으로
 * 바꿔치기해서 로직만 잰다 — 빠르고 어디서나 돌지만, **실물 pi 의 의미**는 못 본다.
 * 2026-09-09 의 실물 실패 셋이 정확히 그 틈에서 나왔다(#24 코멘트): `noTools:"all"`
 * 이 커스텀 툴까지 끈다는 것, 확장 심링크가 안 풀린다는 것, 히트 id 가 인용으로 안
 * 풀린다는 것. 계약 테스트는 셋 다 통과하는데 물건은 안 돌았다.
 *
 * 그래서 여기서는 이 기기에서 **실제로 도는** pi 의 패키지 트리를 `which pi` 에서
 * 되짚어 찾아 그 트리로 확장을 import 한다. 재는 것은 셋뿐이다:
 *   1. 확장이 실물 typebox/`StringEnum`/`SessionManager` 로 로드된다
 *   2. 어느 이벤트에 붙는가 — `agent_settled` 가 consult 자리다(#24, 2026-09-09)
 *   3. 로드 시점에 `pi` 에서 만지는 API 가 `on` 하나다 — 본대화 유입 경로 없음
 *
 * pi 를 그 모양으로 안 깐 기기에서는 **skip 을 찍고 통과**한다. 옆 파일의 심링크 홉
 * 검사와 같은 규율이다 — 안 잰 것을 통과로 읽히게 두지 않는다.
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * 실제로 도는 `pi` 에서 그 패키지의 peer `node_modules` 를 되짚는다. 못 찾으면 왜
 * 못 찾았는지를 문자열로 돌려준다 — 이유 없는 skip 은 "안 쟀다"를 "통과"로 읽히게 한다.
 *
 * **PATH 를 먼저 씻는다.** bun 은 스크립트가 사는 자리에서 위로 올라가며
 * `<dir>/node_modules/.bin` 을 PATH 앞에 붙이는데, 이 리포의 `node_modules/.bin/pi`
 * 는 2026-03 에 깔린 옛 이름(`@mariozechner/pi-coding-agent`)의 잔재라 그걸 집으면
 * **로그인 셸에서 도는 pi 와 다른 물건**을 재게 된다 [측정 2026-09-09 oracle].
 */
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

const dir = mkdtempSync(join(tmpdir(), "decision-gate-load-"));
symlinkSync(peer, join(dir, "node_modules"));
cpSync(new URL("../decision-gate.ts", import.meta.url).pathname, join(dir, "ext.ts"));

const mod = await import(join(dir, "ext.ts"));

const handlers = new Map<string, unknown>();
const commands = new Map<string, unknown>();
const touched: string[] = [];
const fakePi = new Proxy(
	{
		on: (e: string, h: unknown) => handlers.set(e, h),
		appendEntry: () => {},
		registerCommand: (name: string, opts: unknown) => commands.set(name, opts),
		sendMessage: () => {
			throw new Error("the consult path must not send messages");
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

check("the extension loads against the installed pi, not a stub", typeof mod.default === "function");
check("the consult is wired to agent_settled", handlers.has("agent_settled"));
check("agent_end is wired too — it only carries the last words over", handlers.has("agent_end"));
check("the context filter is wired — the operator panel never reaches the model", handlers.has("context"));
check("no fourth event is registered", handlers.size === 3, [...handlers.keys()].join(","));
check("the /decision-gate command is registered", commands.has("decision-gate"));
check(
	"loading touches only on / registerCommand — no inflow API is even read",
	[...new Set(touched)].every((t) => t === "on" || t === "registerCommand"),
	touched.join(","),
);

// 실물 typebox 로 지어진 도구 스키마. 스텁 Type 은 이걸 못 잡는다.
const { tool, budget } = mod.createDigTool([], { maxDigs: 1 });
const axes = (tool.parameters as { properties: Record<string, { enum?: string[] }> }).properties?.axis?.enum;
check("dig's axis enum survives the real typebox", Array.isArray(axes) && axes.length === 4, JSON.stringify(axes));
check("a fresh budget has spent nothing", budget.spawned === 0 && budget.refused === 0);

// 실물 SessionManager / ResourceLoader 로 지은 사이드 세션 옵션.
const opts = mod.buildConsultSessionOptions({ provider: "zai", id: "glm-5.3" }, tool);
check("built-ins stay suppressed with the real session factory", opts.noTools === "builtin");
check("the allowlist is still dig alone", opts.tools.length === 1 && opts.tools[0] === "dig");
check("the real SessionManager.inMemory() is what holds the side session", typeof opts.sessionManager?.appendCustomEntry === "function");
check("the emptied loader really returns no skills or extensions", opts.resourceLoader.getSkills().skills.length === 0 && opts.resourceLoader.getExtensions().extensions.length === 0);

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
