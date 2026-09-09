/**
 * raw-paste 확장 회귀 — pi의 진짜 StdinBuffer에 대고 돌린다.
 *
 *   bun run pi-extensions/tests/raw-paste.test.ts
 *
 * 확장은 `@earendil-works/pi-tui`를 static import 하는데 그건 pi 번들 안에서만
 * 풀린다. 그래서 이 테스트는 확장 파일을 읽어 그 import 한 줄만 로컬 pi 소스
 * 체크아웃으로 바꿔치기한 임시 복사본을 만들어 불러온다 — 로직은 원본 그대로다.
 * pi 소스가 없으면(PI_SRC) 건너뛴다.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PI_SRC =
	process.env.PI_SRC ?? `${process.env.HOME}/repos/3rd/pi/pi-mono/packages/tui/src/stdin-buffer.ts`;
const EXT = new URL("../raw-paste.ts", import.meta.url).pathname;

if (!existsSync(PI_SRC)) {
	console.log(`SKIP: pi 소스 없음 (${PI_SRC}). PI_SRC로 지정할 수 있다.`);
	process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "rawpaste-"));
const copy = join(dir, "patched.ts");
writeFileSync(
	copy,
	readFileSync(EXT, "utf8")
		.replace(/^import type \{ ExtensionAPI \}.*$/m, "")
		.replace(
			/^import \{ StdinBuffer \} from "@earendil-works\/pi-tui";$/m,
			`import { StdinBuffer } from "${PI_SRC}";`,
		)
		.replace(/^export default function \(pi: ExtensionAPI\) \{/m, "export { installPatch, stats };\nfunction __unused(pi: any) {"),
);

const { StdinBuffer } = await import(PI_SRC);
const { installPatch, stats } = await import(copy);

installPatch();
console.log("patched:", stats.patched, stats.reason);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function check(name: string, got: unknown, want: unknown) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) fails++;
	console.log(
		`${ok ? "PASS" : "FAIL"} ${name}` +
			(ok ? "" : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`),
	);
}
function mk() {
	const b: any = new (StdinBuffer as any)({});
	const data: string[] = [];
	const paste: string[] = [];
	b.on("data", (d: string) => data.push(d));
	b.on("paste", (c: string) => paste.push(c));
	return { b, data, paste };
}

// 1. 평범한 Enter 한 번 → 10ms 창이 만료되면 키로 그대로 재생된다.
{
	const { b, data, paste } = mk();
	b.process("\r");
	check("1a enter는 창 안에서 아직 안 나감", [data.length, paste.length], [0, 0]);
	await sleep(30);
	check("1b enter 재생", [data, paste], [["\r"], []]);
}

// 2. 한 read 안에 여러 줄 → paste로 승격.
{
	const { b, data, paste } = mk();
	b.process("a\rb\rc");
	check("2 한방 멀티라인 → paste", [data, paste], [[], ["a\rb\rc"]]);
}

// 3. 창 안에서 쪼개져 온 붙여넣기 → 합쳐서 한 번의 paste.
{
	const { b, data, paste } = mk();
	b.process("line 1\r");
	await sleep(3);
	b.process("line 2\rline 3");
	check("3 split raw paste 합침", [data, paste], [[], ["line 1\rline 2\rline 3"]]);
	await sleep(30);
	check("3b 이후 잔여 없음", [data.length, paste.length], [0, 1]);
}

// 4. 창 만료 뒤 도착한 조각은 승격하지 않는다(omp와 같은 보수적 동작).
{
	const { b, data, paste } = mk();
	b.process("x\r");
	await sleep(30);
	b.process("y\rz");
	await sleep(30);
	check("4 창 만료 뒤엔 키 경로", [paste, data], [[], ["x", "\r", "y", "\r", "z"]]);
}

// 5. 마커가 오는 정상 환경은 건드리지 않는다.
{
	const { b, data, paste } = mk();
	b.process("\x1b[200~x\ny\x1b[201~");
	check("5 bracketed paste 보존", [data, paste], [[], ["x\ny"]]);
}

// 6. tmux xterm 재인코딩 복원. tmux는 paste 안 CR을 Ctrl+M = 109로 보낸다(13 아님).
{
	const { b, data, paste } = mk();
	b.process("\x1b[200~a\x1b[27;5;109~b\x1b[201~");
	check("6 xterm 재인코딩 복원", [data, paste], [[], ["a\rb"]]);
}

// 7. 후보 뒤에 ESC 입력이 오면 후보를 먼저 흘리고 정상 파싱.
{
	const { b, data, paste } = mk();
	b.process("\r");
	b.process("\x1b[A");
	await sleep(30);
	check("7 ESC 오면 후보 먼저 흘림", [data, paste], [["\r", "\x1b[A"], []]);
}

// 8. 줄바꿈 없는 평범한 타이핑은 창을 타지 않는다.
{
	const { b, data, paste } = mk();
	b.process("h");
	b.process("i");
	check("8 일반 키 통과", [data, paste], [["h", "i"], []]);
}

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
