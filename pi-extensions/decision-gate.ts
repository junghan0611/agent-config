/**
 * decision-gate — 빠른 형제에게 캐게 하고, 흔적만 남긴다
 *
 * 담당자 턴이 `update_goal(status:"blocked")` 로 끝났을 때, **다른(빠른) 모델**을
 * 한 턴 돌려 GLG 의 기억축·시간축을 대신 훑게 하고, 그 결과를 세션 JSONL 에
 * 커스텀 엔트리 하나로 남긴다. 그게 전부다.
 *
 * 계약과 그 근거는 agent-config#24 와 `decision-gate/README.md`. 여기 주석은
 * **코드가 왜 이 모양인지**만 적는다.
 *
 * GLG (2026-09-09, journal week36.org:579-625):
 *
 *   "답변도 느리고 쿼터를 많이 차지하는 모델이 고민하는 중에, 내 시맨틱 검색하고
 *    뭐하고 하면서 쿼터를 다 써버리는 문제가 있을거야. 턴도 느린데 이런것 하면
 *    소용도 없거든. 그럴 경우에는 빠른 형제에게 얼른 물어보는거야."
 *
 *   "세션 기록은 따로 안남아도 되거든. 그냥 메인세션에 첨가 정보로 들어가주면
 *    그 자체로 '선택' 과정 협업의 흔적이 될거야. 이게 힣의 기억축을 살리는 협업이거든."
 *
 *   "메인세션에 흔적으로 남은것을 추려서 도움이 되었는가 판단하면 andenken한테
 *    지식 기억층에 쓰레기 정보를 좀 빼고 개선해달라고 요청할수 있거든."
 *
 * 마지막 인용이 스키마를 정한다. 엔트리가 질문+답변 영수증으로만 남으면 나중에
 * "도움이 되었는가"를 **판정할 수가 없다** — 어떤 히트가 돌아왔고 그중 무엇이
 * 실제로 인용됐는지가 안 남기 때문이다. 소급이 안 되는 종류의 결정이라
 * `ConsultDetails.digs[].hits` 와 `answer.citedHitIds` 는 v0 부터 있다.
 *
 * 이 확장이 **하지 않는** 것 (전부 의도):
 * - 계속 진행을 시키지 않는다. `queueContinuation` 근처에 가지 않는다. 캐는 손일
 *   뿐이고 문은 여전히 판단축 §1~§6 + `decision-gate/gate_lint.py` 다.
 * - `pi.sendUserMessage` 를 부르지 않는다. 본대화 유입이 아니라 사이드 엔트리다.
 * - `goal.ts` 를 한 줄도 고치지 않는다. `goal.ts:410-415` 의 `persist()` 가 이미
 *   상태를 세션 로그에 쓰므로, 그 엔트리를 읽어 전이를 감지한다.
 * - 판단축 `.md` 를 쓰지 않고 lint 도 부르지 않는다. v0 은 엔트리 하나다.
 * - 상태 저장소·시계·원장을 만들지 않는다. 상한도 이 세션의 엔트리를 세서 건다.
 *
 * Armin 원시체 리믹스이지 새 아키텍처가 아니다:
 * - 사이드 세션 + 커스텀 엔트리     ← agent-stuff `btw.ts:557-563`, `:878`
 * - 스킬/확장 비운 ResourceLoader   ← agent-stuff `btw.ts:85-100` (재귀 방지)
 * - 빠른 모델 후보 프로브           ← agent-stuff `answer.ts:82-106`
 * 셋 다 참조 시점 agent-stuff HEAD `122e299`.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { parseJsonWithRepair, StringEnum, type AssistantMessage, type Model, type Api } from "@earendil-works/pi-ai";
import {
	createAgentSession,
	createExtensionRuntime,
	SessionManager,
	type AgentSession,
	type ExtensionAPI,
	type ExtensionContext,
	type ModelRegistry,
	type ResourceLoader,
	type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

/** 이 확장이 남기는 유일한 커스텀 엔트리. andenken 수확이 이 이름을 잡는다. */
export const CONSULT_ENTRY_TYPE = "decision-gate-consult";

/** `goal.ts:26` 의 STATE_TYPE. 그 파일을 안 고치고 읽기만 하려고 값을 복제한다. */
const GOAL_STATE_TYPE = "goal";

/**
 * 한 세션에서 부를 수 있는 최대 횟수. #24 의 초기값 3을 그대로 쓴다 — 그 이슈가
 * "근거 없는 초기값"이라고 스스로 적어 뒀고, 실측 전까지는 바꿀 근거도 없다.
 * 상태 저장소를 만들지 않으려고 하루가 아니라 **세션** 기준으로 센다.
 */
const MAX_CONSULTS_PER_SESSION = 3;

/**
 * 빠른 모델 후보 — 순서가 계약이다. 쿼터로 고르고 이름으로 고르지 않는다(#24).
 * GLG 예시가 terra 라 terra 를 앞에 둔다. 레일 순서는 `MODELS.md`(rolling quota
 * → Copilot credits → metered) 를 따르고, 모델 id 는 그 파일의 스냅샷에서 읽었다.
 *
 * OpenRouter 는 여기 없고 앞으로도 없다. 넣어도 안 걸린다 —
 * `hide-providers.ts:58` 이 provider discovery 전에 `OPENROUTER_API_KEY` 를
 * `process.env` 에서 지우므로 auth 프로브가 구조적으로 실패한다.
 */
const FAST_MODEL_CANDIDATES: ReadonlyArray<{ provider: string; model: string }> = [
	{ provider: "openai-codex", model: "gpt-5.6-terra" },
	{ provider: "github-copilot", model: "gpt-5.6-terra" },
	{ provider: "zai", model: "glm-5.3" },
	{ provider: "xai", model: "grok-4.6" },
];

/** 캘 수 있는 축. 이름이 곧 argv 를 고르는 열쇠다. */
const DIG_AXES = ["sessions", "garden", "openclaw", "timeline"] as const;
type DigAxis = (typeof DIG_AXES)[number];

/** 한 번의 캠. `hits` 가 andenken 되먹임의 재료다. */
export interface DigRecord {
	axis: DigAxis;
	query: string;
	/** 실제로 실행된 argv 전체. 나중에 재현할 수 있어야 한다. */
	argv: string[];
	/** `<file>:<line>` 또는 경로 — 축마다 안정적인 식별자 하나. */
	hits: Array<{ id: string; score?: number; timestamp?: string }>;
	error?: string;
}

/**
 * 세션 JSONL 에 남는 것. **필드 하나하나가 나중의 판정 재료다.**
 *
 * `kind` 는 유추와 인용을 갈라 둔다. GLG 는 유추를 허용했다 — *"그 형제가 시맨틱
 * 뒤져서 이런것 같다고 알려주는거야. 이 정보는 결정하는데 귀한 정보가 될거거든."*
 * 그러나 #24 의 G1 은 게이트에서 인용을 요구한다. 층이 다르므로 충돌이 아니고,
 * 표류를 막는 자물쇠가 이 한 필드다: 유추는 유추로 라벨되어 인용 자리에 못 선다.
 */
export interface ConsultDetails {
	version: 1;
	timestamp: number;
	trigger: {
		goalId: string;
		/** 항상 "blocked". 다른 경로로 이 확장은 켜지지 않는다. */
		goalStatus: "blocked";
		/** 같은 전이에 두 번 붙지 않게 하는 에지 검출 키. */
		goalUpdatedAt: number;
		objective: string;
		sessionId: string;
	};
	model: { provider: string; id: string };
	digs: DigRecord[];
	answer: {
		text: string;
		kind: "inference" | "quote";
		/** `digs[].hits[].id` 의 부분집합. 형제가 스스로 신고한 것. */
		citedHitIds: string[];
	};
	usage?: AssistantMessage["usage"];
	/**
	 * "도움이 되었는가" — 이 확장은 **채우지 않는다.** 자기 진척을 자기가 채점하는
	 * 것이 #23 이 막으려던 바로 그것이다. 나중에 사람이나 수확 쪽이 채운다.
	 */
	helpful: null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 캐는 손 — argv 가 고정된 도구 하나
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 스킬 CLI 의 자리. 확장은 `~/.pi/agent/extensions/` 에 심링크로 걸리는데
 * (`run.sh:960`), node/bun 이 심링크를 풀어 주므로 `import.meta.url` 은 리포
 * 안의 실경로를 준다. 그래서 `../skills/` 가 이 집의 스킬 SSOT 로 바로 닿는다.
 */
function skillsRoot(): string {
	const override = process.env.AGENT_CONFIG_SKILLS_DIR;
	if (override) return override;
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");
}

/**
 * 축 → argv. **여기가 G2 의 실제 자물쇠다.** 셸을 태우지 않고, 접두를 이 함수가
 * 짓고, 모델은 인자만 고른다. 그래서 `git push` 도 `curl` 도 `dm.sh` 도 이 경로에
 * 존재하지 않는다.
 *
 * `reindex` 를 뚫어 두지 않은 것이 핵심이다 — ₩100,000 임베딩 사건의 경로가 그거고,
 * 검색 한 번의 질의 임베딩(수천분의 1센트)과 전체 재구축은 같은 "유료 API"라는
 * 말로 뭉뚱그릴 수 없다. consult 자체가 유료 모델을 부르는 물건이므로 G2 의
 * "유료 API 지출"은 **새 지출 권한을 열지 않는다**로 읽는다. 그 읽기가 틀리면
 * 고칠 자리는 이 함수 하나다.
 */
export function buildDigArgv(axis: DigAxis, query: string, limit: number, eventsFile?: string): string[] {
	const root = skillsRoot();
	const sm = path.join(root, "semantic-memory", "semantic-memory");
	switch (axis) {
		case "sessions":
			return [sm, "search-sessions", query, "--limit", String(limit)];
		case "garden":
			return [sm, "search-md", query, "--limit", String(limit)];
		case "openclaw":
			return [sm, "search-openclaw", query, "--limit", String(limit)];
		case "timeline": {
			// timeline 은 caller 가 만든 LOCAL FULL 을 읽는다. 없으면 캐지 않는다 —
			// collect.py 는 8초 걸리고 파일을 쓰므로 이 경로에 두지 않는다.
			const events = eventsFile ?? path.join(process.cwd(), "events.jsonl");
			return ["python3", path.join(root, "timeline", "scripts", "query.py"), events, "--day", query, "--format", "json"];
		}
	}
}

/** 축마다 다른 결과 모양에서 안정적인 식별자 하나씩. */
function extractHits(axis: DigAxis, stdout: string): DigRecord["hits"] {
	const start = stdout.indexOf("{");
	if (start < 0) return [];
	let parsed: unknown;
	try {
		// CLI 가 stdout 앞에 npm 경고와 provider 배너를 흘린다(실측 2026-09-09).
		// 그래서 첫 `{` 부터 잘라 넘긴다. 외부 입력 파싱이라 catch 가 면피가 아니다.
		parsed = parseJsonWithRepair<unknown>(stdout.slice(start));
	} catch {
		return [];
	}
	const rows = Array.isArray(parsed)
		? parsed
		: ((parsed as { results?: unknown[]; events?: unknown[] })?.results ??
			(parsed as { events?: unknown[] })?.events ??
			[]);
	if (!Array.isArray(rows)) return [];
	return rows.flatMap((row) => {
		if (!row || typeof row !== "object") return [];
		const r = row as Record<string, unknown>;
		const file = typeof r.file === "string" ? r.file : typeof r.path === "string" ? r.path : undefined;
		const id =
			axis === "timeline"
				? typeof r.ref === "string"
					? r.ref
					: JSON.stringify(r.id ?? r.title ?? "")
				: file
					? typeof r.line === "number"
						? `${file}:${r.line}`
						: file
					: undefined;
		if (!id) return [];
		return [
			{
				id,
				score: typeof r.score === "number" ? r.score : undefined,
				timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
			},
		];
	});
}

/** 사이드 세션에 주는 유일한 도구. 캔 것은 `digs` 로 모인다. */
function createDigTool(digs: DigRecord[], eventsFile?: string): ToolDefinition {
	return {
		name: "dig",
		label: "Dig",
		description:
			"Search GLG's own axes for what he already said or did. sessions = his pi/Claude transcripts; garden = his published notes; openclaw = his bots' memory; timeline = a day slice of the local event log. Name the axis you used when you quote a hit; the three corpora are not fallbacks for one another. Returns JSON.",
		promptSnippet: "Search GLG's memory (sessions/garden/openclaw) and time (timeline) axes",
		parameters: Type.Object({
			axis: StringEnum(DIG_AXES, { description: "Which axis to search." }),
			query: Type.String({ description: "Search text. For axis=timeline, a YYYY-MM-DD day instead." }),
			limit: Type.Optional(Type.Number({ description: "Max hits. Default 5." })),
		}),
		async execute(_id, params, _signal, _onUpdate, _ctx) {
			const limit = typeof params.limit === "number" ? Math.min(Math.max(1, params.limit), 10) : 5;
			const argv = buildDigArgv(params.axis as DigAxis, params.query, limit, eventsFile);
			if (params.axis === "timeline" && !existsSync(argv[2])) {
				const record: DigRecord = {
					axis: params.axis,
					query: params.query,
					argv,
					hits: [],
					error: `no LOCAL FULL at ${argv[2]} — timeline needs collect.py first, which this path does not run`,
				};
				digs.push(record);
				return { content: [{ type: "text", text: record.error! }], isError: true };
			}
			// shell 없음. 접두는 buildDigArgv 가 지었고 모델은 인자만 골랐다.
			const run = spawnSync(argv[0], argv.slice(1), { encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
			const stdout = run.stdout ?? "";
			const record: DigRecord = {
				axis: params.axis as DigAxis,
				query: params.query,
				argv,
				hits: extractHits(params.axis as DigAxis, stdout),
				error: run.error ? String(run.error.message) : run.status !== 0 ? (run.stderr || "").slice(0, 500) : undefined,
			};
			digs.push(record);
			return {
				content: [{ type: "text", text: stdout.slice(stdout.indexOf("{") >= 0 ? stdout.indexOf("{") : 0) || record.error || "(no output)" }],
				isError: !!record.error,
			};
		},
	} as ToolDefinition;
}

// ─────────────────────────────────────────────────────────────────────────────
// 사이드 세션
// ─────────────────────────────────────────────────────────────────────────────

const CONSULT_SYSTEM_PROMPT = [
	"You are a fast sibling called into GLG's stalled session. The resident agent is blocked and cannot spend its own quota digging.",
	"Your one job: search GLG's own axes with the `dig` tool and report what HE already said or decided about this — not what you think is right.",
	"GLG's memory axis and time axis are both recorded, so his likely position is usually inferable. An inference is welcome; a fabricated quote is not.",
	"Name the axis every hit came from. sessions, garden and openclaw are different corpora and none is a fallback for another.",
	"Finish with a fenced ```json block, and nothing after it:",
	'{"kind":"quote"|"inference","citedHitIds":["<hit id you actually used>", ...]}',
	'Use "quote" only when you are reproducing GLG\'s own words from a hit. Otherwise "inference".',
	"If you found nothing, say so plainly and return kind=inference with an empty citedHitIds. Not finding is a result, not a failure.",
].join("\n");

/**
 * 사이드 세션의 자원을 전부 비운다 — 스킬·확장·프롬프트·테마·AGENTS.md.
 * `btw.ts:85-100` 그대로다. 확장을 비우는 것이 **이 확장이 자기 안에서 다시 도는
 * 재귀를 막는다.** 스킬을 비우는 대신 실행할 명령은 `dig` 도구가 들고 있다.
 */
function createConsultResourceLoader(): ResourceLoader {
	const extensionsResult = { extensions: [], errors: [], runtime: createExtensionRuntime() };
	return {
		getExtensions: () => extensionsResult,
		getSkills: () => ({ skills: [], diagnostics: [] }),
		getPrompts: () => ({ prompts: [], diagnostics: [] }),
		getThemes: () => ({ themes: [], diagnostics: [] }),
		getAgentsFiles: () => ({ agentsFiles: [] }),
		getSystemPrompt: () => CONSULT_SYSTEM_PROMPT,
		getAppendSystemPrompt: () => [],
		extendResources: () => {},
		reload: async () => {},
	} as unknown as ResourceLoader;
}

/**
 * 사이드 세션 옵션. **순수 함수로 떼어 둔 이유가 G2 테스트다** — 세션을 띄우지
 * 않고 이 객체만 보면 push·유료·외부 발신 권한이 없음을 확인할 수 있다(#24 G2
 * done_when). 이 모양이 바뀌면 테스트가 먼저 깨진다.
 */
export function buildConsultSessionOptions(model: Model<Api>, digTool: ToolDefinition) {
	return {
		sessionManager: SessionManager.inMemory(), // 두 번째 세션 파일 없음 (GLG: "세션 기록은 따로 안남아도 되거든")
		model,
		thinkingLevel: "off" as const,
		noTools: "all" as const, // read/bash/edit/write 전부 꺼진다
		customTools: [digTool], // 남는 도구는 dig 하나
		resourceLoader: createConsultResourceLoader(),
	};
}

function lastAssistant(session: AgentSession): AssistantMessage | null {
	for (let i = session.state.messages.length - 1; i >= 0; i--) {
		const m = session.state.messages[i];
		if (m.role === "assistant") return m as AssistantMessage;
	}
	return null;
}

function textOf(parts: AssistantMessage["content"]): string {
	return parts
		.filter((p) => p.type === "text")
		.map((p) => (p as { text: string }).text)
		.join("\n")
		.trim();
}

/** 꼬리의 json 블록에서 형제의 자기신고를 꺼낸다. 없으면 유추·인용 0으로 본다. */
export function parseVerdict(text: string): { kind: "inference" | "quote"; citedHitIds: string[] } {
	const fence = /```json\s*([\s\S]*?)```/g;
	let last: string | null = null;
	for (const m of text.matchAll(fence)) last = m[1];
	if (!last) return { kind: "inference", citedHitIds: [] };
	try {
		const v = parseJsonWithRepair<{ kind?: unknown; citedHitIds?: unknown }>(last);
		return {
			kind: v.kind === "quote" ? "quote" : "inference",
			citedHitIds: Array.isArray(v.citedHitIds) ? v.citedHitIds.filter((x): x is string => typeof x === "string") : [],
		};
	} catch {
		// 형제가 형식을 어긴 것뿐이다. 산출을 버리지 않고 유추로 강등한다.
		return { kind: "inference", citedHitIds: [] };
	}
}

/**
 * 빠른 모델 하나 고르기 — `answer.ts:82-106` 패턴에서 **폴백만 뒤집었다.**
 * answer.ts 는 후보가 없으면 `return currentModel` 로 현재 모델에 떨어지는데,
 * 여기서 그러면 이 확장이 존재하는 이유(느린 상주의 쿼터를 안 쓴다)가 사라진다.
 * 그래서 fail-closed: 없으면 `null` 이고 consult 를 아예 안 돈다.
 */
export async function selectFastModel(registry: ModelRegistry): Promise<Model<Api> | null> {
	for (const candidate of FAST_MODEL_CANDIDATES) {
		const model = registry.find(candidate.provider, candidate.model);
		if (!model) continue;
		const auth = await registry.getApiKeyAndHeaders(model);
		if (auth.ok) return model;
	}
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 트리거 — goal.ts 를 읽기만 한다
// ─────────────────────────────────────────────────────────────────────────────

type BlockedGoal = { id: string; objective: string; updatedAt: number };

/**
 * `goal.ts:410-415` 의 `persist()` 가 상태를 세션 로그에 이미 쓴다. 그 마지막
 * 엔트리가 blocked 이고 아직 이 전이에 consult 를 안 붙였으면 캐야 할 자리다.
 * `goal.ts:568-580` 의 `reconstructState()` 와 같은 읽기이며, 그래서 goal.ts 는
 * 한 줄도 안 고친다 — 로컬 델타를 0 으로 두면 upstream 리베이스가 살아 있다.
 */
export function findPendingBlocked(entries: ReadonlyArray<unknown>): BlockedGoal | null {
	let goal: BlockedGoal | null = null;
	let consulted = 0;
	const seen = new Set<string>();

	for (const raw of entries) {
		const e = raw as { type?: string; customType?: string; data?: unknown };
		if (e.type !== "custom") continue;
		if (e.customType === GOAL_STATE_TYPE) {
			const g = (e.data as { goal?: { id?: unknown; status?: unknown; objective?: unknown; updatedAt?: unknown } })?.goal;
			goal =
				g && g.status === "blocked" && typeof g.id === "string"
					? {
							id: g.id,
							objective: typeof g.objective === "string" ? g.objective : "",
							updatedAt: typeof g.updatedAt === "number" ? g.updatedAt : 0,
						}
					: null;
		} else if (e.customType === CONSULT_ENTRY_TYPE) {
			consulted++;
			const t = (e.data as ConsultDetails | undefined)?.trigger;
			if (t) seen.add(`${t.goalId}@${t.goalUpdatedAt}`);
		}
	}

	if (!goal) return null;
	if (consulted >= MAX_CONSULTS_PER_SESSION) return null; // 상한은 세션 안에서만 센다 — 저장소를 만들지 않으려고
	if (seen.has(`${goal.id}@${goal.updatedAt}`)) return null; // 같은 전이에 두 번 붙지 않는다
	return goal;
}

function firstUserPrompt(objective: string, lastAssistantText: string): string {
	return [
		`GLG's resident agent just declared itself blocked on this objective:`,
		"",
		objective || "(no objective recorded)",
		"",
		"Its last words before stopping:",
		"",
		lastAssistantText.slice(0, 4000) || "(none)",
		"",
		"Dig the axes and report what GLG himself has already said or decided that bears on this.",
	].join("\n");
}

export default function (pi: ExtensionAPI) {
	let running = false;

	pi.on("agent_end", async (event, ctx) => {
		if (running) return; // consult 자체가 도는 동안의 재진입 방지
		const blocked = findPendingBlocked(ctx.sessionManager.getBranch());
		if (!blocked) return;

		const model = await selectFastModel(ctx.modelRegistry);
		if (!model) {
			// fail-closed. 상주 모델로 떨어지지 않는다 — 그러면 이 확장이 없는 것만 못하다.
			if (ctx.hasUI) ctx.ui.notify("decision-gate: no fast model available; skipping consult.", "warning");
			else console.error("[decision-gate] no fast model available; skipping consult");
			return;
		}

		running = true;
		const digs: DigRecord[] = [];
		try {
			const { session } = await createAgentSession(
				buildConsultSessionOptions(model, createDigTool(digs)) as Parameters<typeof createAgentSession>[0],
			);
			try {
				const lastText = textOf(
					((event.messages as unknown[]).filter((m) => (m as { role?: string }).role === "assistant").pop() as
						| AssistantMessage
						| undefined
					)?.content ?? [],
				);
				await session.prompt(firstUserPrompt(blocked.objective, lastText), { source: "extension" });
				const response = lastAssistant(session);
				const text = response ? textOf(response.content) : "";
				const verdict = parseVerdict(text);

				const details: ConsultDetails = {
					version: 1,
					timestamp: Date.now(),
					trigger: {
						goalId: blocked.id,
						goalStatus: "blocked",
						goalUpdatedAt: blocked.updatedAt,
						objective: blocked.objective,
						sessionId: ctx.sessionManager.getSessionId(),
					},
					model: { provider: model.provider, id: model.id },
					digs,
					answer: { text, kind: verdict.kind, citedHitIds: verdict.citedHitIds },
					usage: response?.usage,
					helpful: null,
				};
				pi.appendEntry(CONSULT_ENTRY_TYPE, details);

				if (ctx.hasUI) {
					ctx.ui.notify(
						`decision-gate: ${model.provider}/${model.id} dug ${digs.length} axis call(s), ${verdict.kind}, ${verdict.citedHitIds.length} cited.`,
						"info",
					);
				}
			} finally {
				try {
					await session.abort();
				} catch {
					// 임시 세션 teardown. 외부 상태 경계라 면피가 아니다.
				}
				session.dispose();
			}
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			if (ctx.hasUI) ctx.ui.notify(`decision-gate consult failed: ${reason}`, "error");
			else console.error(`[decision-gate] consult failed: ${reason}`);
		} finally {
			running = false;
		}
	});
}
