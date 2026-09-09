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
 * **어느 이벤트에 다는가 — `agent_settled` 다 (2026-09-09 정정).**
 * `agent_end` 확장 핸들러는 에이전트 루프 **안에서** await 되고, 그 await 가 끝난
 * 뒤에야 pi 가 자동 재시도·압축·큐된 continuation 을 결정한다. 즉 `agent_end` 에
 * consult 를 달면 몇 분짜리 사이드 세션이 **재시도 앞을 막고**, 재시도가 도는
 * 실행에서는 같은 턴에 두 번 켜질 수 있다. `agent_settled` 는 *"no automatic retry,
 * compaction, or queued continuation will run"* 뒤에 정확히 한 번 온다 — "담당자
 * 턴이 blocked 로 끝났다"는 계약의 문자 그대로의 자리다.
 *
 * 영수증은 **이 기기에서 실제로 도는 설치본**에서 읽었다(pi 0.85.1,
 * `@earendil-works/pi-coding-agent/dist/`):
 * - `core/agent-session.js:474`      `await this._extensionRunner.emit({type:"agent_end"})`
 * - `core/agent-session.js:776-810`  그 뒤의 재시도·압축·`hasQueuedMessages()` 루프
 * - `core/agent-session.js:784`      루프가 끝난 `finally` 에서 `_emitAgentSettled()`
 * - `core/extensions/types.d.ts:561,926`  `agent_settled` 이벤트와 그 `on` 오버로드
 * 소스 쪽 같은 자리는 `pi-mono@0.85.0 src/core/agent-session.ts:773-774,1104-1146`
 * 과 `src/core/extensions/types.ts:740-743` (클론 읽음).
 *
 * 마지막 assistant 텍스트는 `agent_end` 가 지나갈 때 받아 두기만 한다 — 그 핸들러는
 * 아무것도 결정하지 않는다.
 *
 * **이 이동의 값이 공짜는 아니다.** `agent_settled` 핸들러도 await 된다
 * (`dist/core/agent-session.js:347-354,766-784`, 교차검수 2026-09-09 이 자리를 지적했다).
 * 즉 consult 는 재시도 앞을 막지 않는 대신 **정착 뒤를 막는다** — `-p` 프린트 모드의 종료와
 * 대화형 idle 복귀가 그만큼 늦다. 상한이 `CONSULT_DEADLINE_MS` 이므로 최악이 그 값이고,
 * 실측 두 판은 1분 안에 끝났다. 이건 결함이 아니라 **아는 대가**이고, 모르는 채로 두지
 * 않으려고 여기 적는다.
 *
 * **예산이 코드에 있다.** consult 는 상주의 시간·쿼터를 아끼려고 존재하는데, 캐는
 * 손이 무한히 캘 수 있으면 그 이유가 뒤집힌다 — 실측 2026-09-09 한 판이 dig 21회를
 * 불렀고, 그 앞의 첫 시도는 아무 말 없이 9분을 멈췄다. 그래서 dig 은
 * `MAX_DIGS_PER_CONSULT` 회까지만 실제로 프로세스를 띄우고, 전체 consult 에는
 * `CONSULT_DEADLINE_MS` 벽시계가 걸리며, 잘린 사실은 엔트리의 `budget` 에 남는다.
 * 조용히 잘리면 그건 다시 "밖에서 똑같이 보이는 침묵"이다. 두 상한 다 **잘 돈 판
 * 위에** 잡혀 있다 — 상한이 성공 사례를 깎으면 그건 안전이 아니다.
 *
 * Armin 원시체 리믹스이지 새 아키텍처가 아니다:
 * - 사이드 세션 + 커스텀 엔트리     ← agent-stuff `btw.ts:557-563`, `:878`
 * - 스킬/확장 비운 ResourceLoader   ← agent-stuff `btw.ts:85-100` (재귀 방지)
 * - 빠른 모델 후보 프로브           ← agent-stuff `answer.ts:82-106`
 * 셋 다 참조 시점 agent-stuff HEAD `122e299`.
 */

import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
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

/**
 * `DECISION_GATE_DEBUG=1` 이면 진행 지점을 stderr 로 흘린다. 이 확장은 `agent_settled`
 * 안에서 중첩 세션을 돌리므로, 실패는 예외가 아니라 **정지**로 나타난다 — 실측
 * 2026-09-09: 커밋 직후 첫 실물 시도가 stderr 한 줄 없이 9분을 멈췄다. 어디서
 * 멈췄는지 말해 주지 않는 코드는 면피와 같은 값이라 추적을 상주시킨다.
 */
function trace(step: string): void {
	if (process.env.DECISION_GATE_DEBUG) console.error(`[decision-gate] ${step}`);
}

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
 * 한 consult 안에서 실제로 프로세스를 띄우는 dig 의 상한. 넘으면 도구는 프로세스를
 * 띄우지 않고 거절만 돌려주고, 그 사실이 엔트리 `budget.digsRefused` 로 남는다.
 *
 * **아는 성공 판보다 위에 잡는다.** 유일하게 잘 돈 실물(2026-09-09)이 sessions 9 /
 * garden 4 / openclaw 4 / timeline 1 = **18회**였고, 그 앞 판은 21회였다 [#24 코멘트].
 * 그 아래로 자르면 안전이 아니라 **잘 돌던 것을 깎는 것**이다. 이 상한이 막는 것은
 * 좋은 판이 아니라, 즉시 실패하는 dig 을 무한히 되부르는 병리다(ENOENT 는 ms 안에
 * 돌아오므로 벽시계만으로는 수천 번이 들어온다).
 */
const MAX_DIGS_PER_CONSULT = 24;

/** dig 한 번의 벽시계. 검색 CLI 한 번이 이보다 오래 걸리면 그건 답이 아니라 장애다. */
const DIG_TIMEOUT_MS = 60_000;

/**
 * consult 전체의 벽시계. 넘으면 사이드 세션을 abort 하고, **그때까지 캔 것으로
 * 엔트리를 쓴다** — 시간이 끝났다고 영수증까지 버리지 않는다.
 *
 * 8분은 잰 값이 아니다. 잰 것은 둘뿐이다: 잘 돈 판이 dig 18회였다는 것과, 첫 실물
 * 시도가 **stderr 한 줄 없이 9분을 멈췄다**는 것 [#24 코멘트, 2026-09-09]. 그래서
 * 성공 판이 넉넉히 들어가고 무한 정지는 끊기는 자리에 뒀다. 잰 값이 아니라는 것을
 * 여기 적어 두는 이유는, 다음 사람이 이 숫자를 근거처럼 물려받지 않게 하기 위해서다.
 */
const CONSULT_DEADLINE_MS = 480_000;

/**
 * 후보 하나. `provider` 가 없으면 **아무 레일이나** — 그때 순서는 `RAIL_ORDER` 다.
 * 그래서 GLG 가 `/decision-gate model luna` 라고만 쳐도 뜻이 선다.
 */
export interface FastCandidate {
	provider?: string;
	model: string;
}

/**
 * 레일 소비 순서. `MODELS.md`(rolling quota → Copilot credits → metered) 를 따른다.
 * provider 를 안 적은 후보를 풀 때, 그리고 기본 후보 순서를 정할 때 둘 다 쓴다.
 */
const RAIL_ORDER = ["openai-codex", "github-copilot", "zai", "xai"] as const;

/**
 * 빠른 모델 기본 후보 — 순서가 계약이다. 쿼터로 고르고 이름으로 고르지 않는다(#24).
 * GLG 예시가 terra 라 terra 를 앞에 둔다. 모델 id 는 `MODELS.md` 스냅샷에서 읽었다.
 *
 * **이건 기본값일 뿐이고, GLG 가 그때그때 지정할 수 있다** (2026-09-09 요청:
 * *"오프스가 돌다가 게이트는 terra 또는 luna로 잡아 놓고 답변 받게 한다든가"*).
 * 우선순위는 세션 지정(`/decision-gate model …`) → 환경변수 `DECISION_GATE_MODELS`
 * (`~/.env.local`, env-loader 가 싣는다) → 이 배열.
 *
 * OpenRouter 는 여기 없고 앞으로도 없다. 지정해도 안 걸린다 —
 * `hide-providers.ts:58` 이 provider discovery 전에 `OPENROUTER_API_KEY` 를
 * `process.env` 에서 지우므로 auth 프로브가 구조적으로 실패한다.
 */
const FAST_MODEL_CANDIDATES: ReadonlyArray<FastCandidate> = [
	{ provider: "openai-codex", model: "gpt-5.6-terra" },
	{ provider: "github-copilot", model: "gpt-5.6-terra" },
	{ provider: "zai", model: "glm-5.3" },
	{ provider: "xai", model: "grok-4.6" },
];

/** 환경변수로 지정할 때 읽는 키. 복수형이 정본이고 단수형도 받는다. */
const MODEL_ENV_KEYS = ["DECISION_GATE_MODELS", "DECISION_GATE_MODEL"] as const;

/** 후보 목록이 어디서 왔는가. 엔트리에 실어 두면 나중에 판정할 때 섞이지 않는다. */
export type CandidateSource = "session" | "env" | "default";

/**
 * `"openai-codex/gpt-5.6-terra, luna"` → 후보 둘. 쉼표로 나누고, `/` 앞은 provider.
 * `/` 가 없으면 provider 를 비워 둔다 — "이 이름을 가진 모델이면 아무 레일이나".
 */
export function parseModelSpec(spec: string): FastCandidate[] {
	return spec
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.map((part) => {
			const slash = part.indexOf("/");
			if (slash < 1) return { model: part };
			return { provider: part.slice(0, slash).trim(), model: part.slice(slash + 1).trim() };
		})
		.filter((c) => c.model.length > 0);
}

/** 환경변수에 지정이 있으면 그것, 없으면 null. */
export function candidatesFromEnv(env: Record<string, string | undefined>): FastCandidate[] | null {
	for (const key of MODEL_ENV_KEYS) {
		const raw = env[key];
		if (!raw || !raw.trim()) continue;
		const parsed = parseModelSpec(raw);
		if (parsed.length) return parsed;
	}
	return null;
}

/**
 * 후보 표현을 레지스트리의 실제 모델로 편다. **정확한 id 가 먼저**, 그 다음 부분
 * 일치 — GLG 가 `luna` 라고만 쳐도 `gpt-5.6-luna` 로 서게 하되, 정확히 적은 이름을
 * 부분일치가 밀어내지 않게 한다. provider 를 안 적었으면 `RAIL_ORDER` 순으로 준다.
 *
 * 여기서 auth 는 안 본다 — 그건 `selectFastModel` 의 자리이고, 이 함수는 "무엇을
 * 후보로 볼 것인가"만 답한다. 둘을 갈라 둬야 `status` 가 "있는데 인증이 없다"를
 * 말할 수 있다.
 */
export function resolveCandidates(available: ReadonlyArray<Model<Api>>, candidates: ReadonlyArray<FastCandidate>): Model<Api>[] {
	const railIndex = (provider: string): number => {
		const i = RAIL_ORDER.indexOf(provider as (typeof RAIL_ORDER)[number]);
		return i < 0 ? RAIL_ORDER.length : i;
	};
	const out: Model<Api>[] = [];
	const seen = new Set<string>();
	for (const want of candidates) {
		const pool = available.filter((m) => (want.provider ? m.provider === want.provider : true));
		const byRail = (a: Model<Api>, b: Model<Api>): number => {
			const rail = railIndex(a.provider) - railIndex(b.provider);
			return rail !== 0 ? rail : a.provider.localeCompare(b.provider);
		};
		// **정확한 이름이 있으면 부분일치는 아예 안 본다.** 편의가 지정을 덮으면 안 된다 —
		// `openai-codex/gpt-5.6-terra` 라고 적었는데 `…-terra-preview` 가 딸려 들어오면
		// 상주 제외 뒤에 엉뚱한 모델이 서고, 그건 지정이 아니라 추측이다.
		const exact = pool.filter((m) => m.id === want.model).sort(byRail);
		const matched = exact.length > 0 ? exact : pool.filter((m) => m.id.includes(want.model)).sort(byRail);
		for (const m of matched) {
			const key = `${m.provider}/${m.id}`;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(m);
		}
	}
	return out;
}

/** 캘 수 있는 축. 이름이 곧 argv 를 고르는 열쇠다. */
const DIG_AXES = ["sessions", "garden", "openclaw", "timeline"] as const;
type DigAxis = (typeof DIG_AXES)[number];

/** 한 번의 캠. `hits` 가 andenken 되먹임의 재료다. */
export interface DigRecord {
	axis: DigAxis;
	query: string;
	/** 실제로 실행된 argv 전체. 나중에 재현할 수 있어야 한다. */
	argv: string[];
	/**
	 * `<file>:<line>` 또는 경로 — 축마다 안정적인 식별자 하나. `label` 은 형제가
	 * 인용할 때 쓰는 짧은 손잡이다(`sessions#3`). 실측 2026-09-09: 100자짜리
	 * 경로만 주면 형제는 그걸 안 쓰고 파일명 안의 UUID 를 골라 적는다 — 그러면
	 * `citedHitIds` 가 `hits[].id` 로 안 풀려 되먹임 고리가 끊긴다.
	 */
	hits: Array<{ label: string; id: string; score?: number; timestamp?: string; text?: string }>;
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
/**
 * 이 판이 어떻게 끝났는가. **성공만 기록하면 실패한 전이는 표식이 없어서 다음
 * `agent_settled` 가 같은 전이를 다시 유료로 캔다** — 교차검수(`openai-codex/gpt-5.6-terra`,
 * 2026-09-09)가 잡은 구멍이고, `findPendingBlocked` 가 이 엔트리 하나만 보고 에지를
 * 판정하므로 영수증이 없으면 "한 전이 한 발화"가 깨진다. 그래서 결과가 무엇이든 엔트리는
 * 나간다.
 */
export type ConsultOutcome = "ok" | "no-model" | "deadline" | "error";

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
	/** 실제로 캔 모델. `outcome:"no-model"` 이면 아무도 안 섰다는 뜻으로 null 이다. */
	model: { provider: string; id: string } | null;
	/** 이 판의 결말. `ok` 가 아니면 `error` 에 이유가 있다. */
	outcome: ConsultOutcome;
	/** `ok` 가 아닐 때의 사유 한 줄. 사람이 읽을 것이지 파싱할 것이 아니다. */
	error?: string;
	/**
	 * 아껴 준 상주 레일. 이게 `model` 과 같으면 이 확장은 존재 이유를 잃은 것이고,
	 * 그래서 `selectFastModel` 이 같은 레일을 애초에 안 고른다. 나중에 영수증만 보고
	 * 그 계약이 실제로 지켜졌는지 볼 수 있도록 엔트리에 같이 싣는다.
	 */
	resident: { provider: string; id: string } | null;
	/** 이 판의 후보 목록이 어디서 왔는가 — 세션 지정 / 환경변수 / 기본값. */
	modelSource: CandidateSource;
	/** 예산이 걸렸는가. 잘린 consult 와 다 캔 consult 는 "도움이 되었는가"가 다르다. */
	budget: {
		maxDigs: number;
		digsSpawned: number;
		/** 상한에 걸려 프로세스를 안 띄우고 거절한 dig 호출 수. */
		digsRefused: number;
		deadlineMs: number;
		/** 벽시계가 사이드 세션을 끊었는가. */
		deadlineHit: boolean;
	};
	digs: DigRecord[];
	answer: {
		text: string;
		kind: "inference" | "quote";
		/** 형제가 적은 그대로의 손잡이. 안 풀리는 것도 남긴다 — 그 차이가 신호다. */
		citedLabels: string[];
		/** `citedLabels` 중 실제로 `digs[].hits[].label` 로 풀린 것들의 전체 id. */
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
 * 스킬 CLI 의 자리. 확장은 `~/.pi/agent/extensions/` 에 심링크로 걸린다(`run.sh:960`).
 *
 * **실측 2026-09-09 — pi 는 그 심링크를 풀지 않는다.** 첫 실물 시도에서 5번의 dig 이
 * 전부 `spawnSync /home/junghan/.pi/agent/skills/semantic-memory/semantic-memory
 * ENOENT` 로 떨어졌다. `import.meta.url` 이 심링크 경로를 그대로 주므로 `../skills/`
 * 는 리포가 아니라 pi 설정 디렉터리를 가리켰다(거기엔 `pi-skills/` 밖에 없다).
 * 그래서 `realpathSync` 로 먼저 실경로를 얻는다.
 *
 * 그 다음에도 못 찾으면 fail-closed 로 두지 않고 후보를 순서대로 본다 — 없으면
 * 마지막 후보를 반환하고, dig 은 ENOENT 를 `error` 로 기록한다. 조용한 0건이 아니다.
 */
function skillsRoot(): string {
	const override = process.env.AGENT_CONFIG_SKILLS_DIR;
	if (override) return override;
	const here = fileURLToPath(import.meta.url);
	const candidates = [
		// 심링크를 푼 뒤의 리포 안 자리 — 정상 경로
		path.resolve(path.dirname(realpathSync(here)), "..", "skills"),
		// 심링크가 아니거나 realpath 가 안 통할 때
		path.resolve(path.dirname(here), "..", "skills"),
	];
	return candidates.find((c) => existsSync(c)) ?? candidates[0];
}

/**
 * 축 → argv. **여기가 G2 의 실제 자물쇠다.** 셸을 태우지 않고, 접두를 이 함수가
 * 짓고, 모델은 인자만 고른다. 그래서 `git push` 도 `curl` 도 `dm.sh` 도 이 경로에
 * 존재하지 않는다.
 *
 * **증명한 것과 안 한 것을 갈라 둔다** (교차검수 2026-09-09): 이 함수가 짓는 argv 로는
 * `reindex`·push·curl·dm 에 닿을 길이 없다는 것은 회귀로 고정돼 있다. 그러나 그 CLI **내부가
 * 읽기 전용이라는 것**은 여기서 증명하지 않았다 — andenken 소스까지 따라가야 하는 별개의 일이다.
 * 또 이 CLI 는 인자를 positional 로 읽으므로 `--` 로 끊을 수 없고(실측: `-- <query>` 는 usage
 * error), 질의가 `-` 로 시작하면 usage error 로 떨어진다. 권한 상승 경로는 못 찾았고, 그
 * 실패는 이제 엔트리에 사유로 남는다.
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
function extractHits(axis: DigAxis, stdout: string, nextLabel: () => string): DigRecord["hits"] {
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
				label: nextLabel(),
				id,
				score: typeof r.score === "number" ? r.score : undefined,
				timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
				text: typeof r.text === "string" ? r.text.slice(0, 400) : undefined,
			},
		];
	});
}

/** 한 프로세스 실행의 결과. `spawnSync` 를 안 쓰는 이유는 `runArgv` 주석에 있다. */
export interface DigRun {
	stdout: string;
	stderr: string;
	status: number | null;
	error?: string;
}

export type DigRunner = (argv: string[], opts: { timeoutMs: number; signal?: AbortSignal }) => Promise<DigRun>;

/** stdout 을 이만큼 받으면 죽인다. 검색 CLI 가 이 이상을 뱉으면 그건 답이 아니다. */
const MAX_DIG_OUTPUT_BYTES = 8 * 1024 * 1024;

/**
 * dig 한 번 = 자식 프로세스 하나. **`spawnSync` 가 아니다** — 그것은 Node 의
 * 이벤트 루프 전체를 멈춘다. 이 도구는 `agent_settled` 안에서 도는 사이드 세션이
 * 부르므로, 동기 spawn 은 캐는 동안 pi 의 TUI·타이머·다른 확장까지 같이 세운다
 * (하트비트 시계도 그동안 안 돈다). 비동기로 띄우면 벽시계 deadline 이 실제로
 * 끊을 수 있고, 도구의 `signal` 도 살아난다.
 *
 * shell 없음(`spawn` 기본값). argv 접두는 `buildDigArgv` 가 짓는다 — G2 의 자물쇠.
 */
const runArgv: DigRunner = (argv, opts) =>
	new Promise<DigRun>((resolve) => {
		if (opts.signal?.aborted) {
			resolve({ stdout: "", stderr: "", status: null, error: "aborted before start" });
			return;
		}
		// `detached` 는 자식을 **프로세스 그룹 리더**로 만든다. 그래야 아래 kill 이 트리
		// 전체를 끊는다 — 이 CLI 는 래퍼 셸이 `npx tsx …` 를 exec 하는 모양이라
		// (`skills/semantic-memory/semantic-memory`) 직계 pid 만 죽이면 손자가 남는다.
		// 교차검수 2026-09-09 가 지적한 자리이고, 상한이 실제로 서려면 그룹이어야 한다.
		// 실측 2026-09-09 (이 CLI 로 직접): 자손 2개 중 그룹 kill 은 **생존 0**, 직계 pid
		// kill 은 **생존 2** — npx/tsx 가 그대로 남아 돌았다.
		const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"], detached: true });
		let stdout = "";
		let stderr = "";
		let bytes = 0;
		let settled = false;
		const finish = (r: DigRun): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			opts.signal?.removeEventListener("abort", onAbort);
			resolve(r);
		};
		const kill = (why: string): void => {
			// 그룹을 먼저 친다. 이미 죽은 그룹은 ESRCH 로 던지는데 그건 외부 상태 경계라
			// 면피가 아니다 — 그때는 직계 pid 로 한 번 더 시도하고 끝낸다.
			try {
				if (child.pid) process.kill(-child.pid, "SIGKILL");
			} catch {
				child.kill("SIGKILL");
			}
			finish({ stdout, stderr, status: null, error: why });
		};
		const timer = setTimeout(() => kill(`timed out after ${opts.timeoutMs}ms`), opts.timeoutMs);
		const onAbort = (): void => kill("aborted — consult deadline or session abort");
		opts.signal?.addEventListener("abort", onAbort, { once: true });
		child.stdout?.on("data", (chunk: Buffer) => {
			bytes += chunk.length;
			if (bytes > MAX_DIG_OUTPUT_BYTES) {
				kill(`output exceeded ${MAX_DIG_OUTPUT_BYTES} bytes`);
				return;
			}
			stdout += chunk.toString();
		});
		child.stderr?.on("data", (chunk: Buffer) => {
			if (stderr.length < 4000) stderr += chunk.toString();
		});
		// spawn 실패(ENOENT 등)는 예외가 아니라 이벤트로 온다. 외부 경계라 기록이 답이다.
		child.on("error", (err: Error) => finish({ stdout, stderr, status: null, error: err.message }));
		child.on("close", (code) => finish({ stdout, stderr, status: code }));
	});

/**
 * dig 이 왜 실패했는지 한 줄로. **실물 2026-09-09 이 자리를 잡았다** — oracle 에서
 * `search-openclaw` 는 exit 4 로 끝나면서 진짜 이유를 **stdout 에 구조화해서** 내놓고
 * (`state:"absent"`, `authority:"thinkpad"`, `reason`, `next`), stderr 에는 npm 경고와
 * provider 배너만 남긴다. 앞의 500자를 그대로 실으면 영수증에 배너만 남아 "왜 못
 * 캤는가"가 사라진다.
 *
 * 순서: 프로세스 자체의 오류 → stdout 의 구조화된 설명 → 소음을 걷은 stderr 의 **끝**
 * → 종료코드. 사이드 세션도 이 문장을 그대로 받으므로, 형제가 "openclaw 축은 이
 * 기기에 없어서 못 봤다"를 말할 수 있게 된다 — 침묵을 증거로 쓰지 않는 자리다.
 */
export function explainFailure(stdout: string, stderr: string, status: number | null): string {
	const start = stdout.indexOf("{");
	if (start >= 0) {
		try {
			const o = parseJsonWithRepair<Record<string, unknown>>(stdout.slice(start));
			const parts = ["error", "state", "reason", "authority", "host", "next"]
				.filter((k) => typeof o[k] === "string")
				.map((k) => `${k}=${o[k] as string}`);
			if (parts.length) return parts.join(" · ").slice(0, 500);
		} catch {
			// 구조화된 설명이 아니었을 뿐이다. 아래 stderr 로 내려간다.
		}
	}
	const noise = /^(npm (warn|notice)|🟡|⚠️|\(node:)/u;
	const lines = stderr
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !noise.test(l));
	if (lines.length) {
		const joined = lines.join(" | ");
		return joined.length > 500 ? joined.slice(-500) : joined;
	}
	return `exited with status ${status}`;
}

/** 이 consult 가 예산을 얼마나 썼는가. 도구가 제자리에서 갱신하고 엔트리가 싣는다. */
export interface DigBudget {
	max: number;
	spawned: number;
	refused: number;
}

/**
 * 사이드 세션에 주는 유일한 도구. 캔 것은 `digs` 로 모인다.
 *
 * `runner` 는 테스트 이음매다 — 기본값이 실물 `runArgv` 이고, 테스트만 가짜를
 * 넣어 **상한이 프로세스를 안 띄우는 것**을 프로세스 없이 잰다.
 */
export function createDigTool(
	digs: DigRecord[],
	opts: { eventsFile?: string; maxDigs?: number; timeoutMs?: number; runner?: DigRunner } = {},
): { tool: ToolDefinition; budget: DigBudget } {
	const budget: DigBudget = { max: opts.maxDigs ?? MAX_DIGS_PER_CONSULT, spawned: 0, refused: 0 };
	const timeoutMs = opts.timeoutMs ?? DIG_TIMEOUT_MS;
	const runner = opts.runner ?? runArgv;
	let seq = 0;
	const tool = {
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
		async execute(_id, params, signal, _onUpdate, _ctx) {
			const axis = params.axis as DigAxis;
			// 상한. 넘으면 **프로세스를 안 띄운다** — 거절도 한 번만 기록해서 엔트리가
			// 거절문으로 부풀지 않게 하고, 개수는 budget 이 센다.
			if (budget.spawned >= budget.max) {
				budget.refused++;
				const why = `dig budget exhausted — ${budget.max} searches per consult. Answer now with what you already have, and say plainly what you could not check.`;
				if (budget.refused === 1) digs.push({ axis, query: params.query, argv: [], hits: [], error: why });
				return { content: [{ type: "text", text: why }], isError: true };
			}
			const limit = typeof params.limit === "number" ? Math.min(Math.max(1, params.limit), 10) : 5;
			const argv = buildDigArgv(axis, params.query, limit, opts.eventsFile);
			if (axis === "timeline" && !existsSync(argv[2])) {
				const record: DigRecord = {
					axis,
					query: params.query,
					argv,
					hits: [],
					error: `no LOCAL FULL at ${argv[2]} — timeline needs collect.py first, which this path does not run`,
				};
				digs.push(record);
				return { content: [{ type: "text", text: record.error! }], isError: true };
			}
			budget.spawned++;
			// shell 없음. 접두는 buildDigArgv 가 지었고 모델은 인자만 골랐다.
			const run = await runner(argv, { timeoutMs, signal });
			const record: DigRecord = {
				axis,
				query: params.query,
				argv,
				hits: extractHits(axis, run.stdout, () => `${axis}#${++seq}`),
				error: run.error ? run.error : run.status !== 0 ? explainFailure(run.stdout, run.stderr, run.status) : undefined,
			};
			digs.push(record);
			// 원문 JSON 을 통째로 돌려주지 않는다. 실측 2026-09-09: 그렇게 하면 21번의
			// dig 에 입력 16.6K 토큰이 들었고, 형제는 그 안의 UUID 를 손잡이로 착각했다.
			// 손잡이·경로·발췌만 준다 — 인용할 수 있는 것만 보이게.
			const digest = record.hits.length
				? record.hits.map((h) => `[${h.label}] ${h.id}\n${(h.text ?? "").replace(/\s+/gu, " ").slice(0, 300)}`).join("\n\n")
				: record.error || "(no hits)";
			return { content: [{ type: "text", text: digest }], isError: !!record.error };
		},
	} as ToolDefinition;
	return { tool, budget };
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
	'{"kind":"quote"|"inference","cited":["<the [label] of every hit you actually used>", ...]}',
	'Cite by the bracketed label the dig tool printed (for example "sessions#3"), never by a path, a UUID or a line number.',
	'Use "quote" only when you are reproducing GLG\'s own words from a hit. Otherwise "inference".',
	"If you found nothing, say so plainly and return kind=inference with an empty cited list. Not finding is a result, not a failure.",
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
		// 실측 2026-09-09: `noTools:"all"` 은 **커스텀 툴까지** 끈다(타입 주석 그대로 —
		// "all: start with no tools enabled"). 첫 실물 시도에서 형제가 dig 을 못 보고
		// `{"query":...}` 를 텍스트로 지어냈다. 그래서 기본 억제는 "builtin" 으로 두고,
		// 허용목록에 dig 하나만 이름으로 올린다 — 허용목록은 빌트인·확장·커스텀 전부에
		// 걸리므로 read/bash/edit/write 는 이름이 없어 그대로 꺼진다.
		noTools: "builtin" as const,
		tools: ["dig"],
		customTools: [digTool],
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
export function parseVerdict(text: string): { kind: "inference" | "quote"; citedLabels: string[] } {
	const fence = /```json\s*([\s\S]*?)```/g;
	let last: string | null = null;
	for (const m of text.matchAll(fence)) last = m[1];
	if (!last) return { kind: "inference", citedLabels: [] };
	try {
		const v = parseJsonWithRepair<{ kind?: unknown; cited?: unknown; citedHitIds?: unknown }>(last);
		const raw = Array.isArray(v.cited) ? v.cited : Array.isArray(v.citedHitIds) ? v.citedHitIds : [];
		return {
			kind: v.kind === "quote" ? "quote" : "inference",
			// `[sessions#3]` 로 적어도 `sessions#3` 로 적어도 같은 것으로 받는다.
			citedLabels: raw.filter((x): x is string => typeof x === "string").map((x) => x.replace(/^\[|\]$/gu, "").trim()),
		};
	} catch {
		// 형제가 형식을 어긴 것뿐이다. 산출을 버리지 않고 유추로 강등한다.
		return { kind: "inference", citedLabels: [] };
	}
}

/** 손잡이를 실제 히트 id 로 되돌린다. 안 풀리는 손잡이는 조용히 버려지지 않는다 —
 * `citedLabels` 에 그대로 남아 개수 차이로 드러난다. */
export function resolveCitedIds(digs: DigRecord[], labels: string[]): string[] {
	const byLabel = new Map(digs.flatMap((d) => d.hits.map((h) => [h.label, h.id] as const)));
	return labels.flatMap((l) => {
		const id = byLabel.get(l);
		return id ? [id] : [];
	});
}

/**
 * 빠른 모델 하나 고르기 — `answer.ts:82-106` 패턴에서 **폴백만 뒤집었다.**
 * answer.ts 는 후보가 없으면 `return currentModel` 로 현재 모델에 떨어지는데,
 * 여기서 그러면 이 확장이 존재하는 이유(느린 상주의 쿼터를 안 쓴다)가 사라진다.
 * 그래서 fail-closed: 없으면 `null` 이고 consult 를 아예 안 돈다.
 *
 * **`resident` 를 받는 이유 (2026-09-09 정정).** 후보 순서만 보고 고르면 상주가
 * 이미 그 후보일 때 — 이 집에서 terra 는 흔한 상주다 — consult 가 아끼려던 바로
 * 그 레일을 한 번 더 태운다. GLG 가 말한 자리는 *"답변도 느리고 쿼터를 많이
 * 차지하는 모델이 고민하는 중에 … 빠른 형제에게 얼른 물어보는거야"* 이므로,
 * 같은 provider+id 는 형제가 아니라 자기 자신이다. 건너뛴다.
 *
 * **같은 provider+id 만 건너뛴다.** 다른 provider 의 같은 이름(`github-copilot/gpt-5.6-terra`
 * vs `openai-codex/gpt-5.6-terra`)은 `MODELS.md` 가 별도 계약·별도 레일로 두므로 일부러 허용한다.
 * 두 이름이 실은 같은 쿼터를 공유하는 숨은 별칭이라면 이 fail-closed 는 뚫린다 — 그걸 확인하는
 * 코드도 테스트도 여기 없다(교차검수 2026-09-09).
 *
 * 실제 잔량(쿼터)은 **여기서 안 잰다.** `skills/quota` 는 벤더 엔드포인트를 때리는
 * 별도 프로세스라 blocked 전이 경로에 네트워크 대기를 하나 더 다는 셈이고, 그
 * 결정은 이 패스의 몫이 아니다. 지금 계약은 "지정된 후보 중 상주가 아니면서 인증된
 * 첫 번째"이고, 그 이상을 주장하지 않는다.
 */
export async function selectFastModel(
	registry: ModelRegistry,
	resident?: { provider: string; id: string } | null,
	candidates: ReadonlyArray<FastCandidate> = FAST_MODEL_CANDIDATES,
): Promise<Model<Api> | null> {
	const available = registry.getAvailable();
	for (const model of resolveCandidates(available, candidates)) {
		if (resident && resident.provider === model.provider && resident.id === model.id) continue;
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

/**
 * 엔트리 하나를 짓는 순수 함수. 세션을 안 띄우고도 스키마를 잴 수 있게 떼어 둔다 —
 * `budget` 이 실제로 실린다는 것과 `helpful` 이 null 로 남는다는 것이 계약이다.
 */
export function buildConsultDetails(args: {
	blocked: BlockedGoal;
	sessionId: string;
	model: { provider: string; id: string } | null;
	outcome: ConsultOutcome;
	error?: string;
	resident: { provider: string; id: string } | null;
	modelSource: CandidateSource;
	digs: DigRecord[];
	budget: DigBudget;
	deadlineMs: number;
	deadlineHit: boolean;
	text: string;
	verdict: { kind: "inference" | "quote"; citedLabels: string[] };
	usage?: AssistantMessage["usage"];
	now?: number;
}): ConsultDetails {
	return {
		version: 1,
		timestamp: args.now ?? Date.now(),
		trigger: {
			goalId: args.blocked.id,
			goalStatus: "blocked",
			goalUpdatedAt: args.blocked.updatedAt,
			objective: args.blocked.objective,
			sessionId: args.sessionId,
		},
		model: args.model,
		outcome: args.outcome,
		...(args.error ? { error: args.error } : {}),
		resident: args.resident,
		modelSource: args.modelSource,
		budget: {
			maxDigs: args.budget.max,
			digsSpawned: args.budget.spawned,
			digsRefused: args.budget.refused,
			deadlineMs: args.deadlineMs,
			deadlineHit: args.deadlineHit,
		},
		digs: args.digs,
		answer: {
			text: args.text,
			kind: args.verdict.kind,
			citedLabels: args.verdict.citedLabels,
			citedHitIds: resolveCitedIds(args.digs, args.verdict.citedLabels),
		},
		usage: args.usage,
		helpful: null,
	};
}

/** `/decision-gate` 가 찍는 패널. 이 타입은 컨텍스트에서 빠진다(아래 `context` 핸들러). */
const UI_MESSAGE_TYPE = "decision-gate-ui";

const USAGE = [
	"Usage: /decision-gate [status]",
	"       /decision-gate model <provider/id>[, <provider/id> ...]",
	"       /decision-gate model reset",
	"",
	"Examples: /decision-gate model openai-codex/gpt-5.6-terra",
	"          /decision-gate model luna, terra      (provider omitted → any rail, in MODELS.md order)",
].join("\n");

export default function (pi: ExtensionAPI) {
	let running = false;
	/**
	 * 이 세션에서만 사는 후보 지정. 파일에 안 쓴다 — 상태 저장소를 만들지 않는다는
	 * #24 의 선이 여기도 그대로다. 다음 세션은 환경변수/기본값으로 돌아간다.
	 */
	let sessionCandidates: FastCandidate[] | null = null;
	/**
	 * `agent_settled` 는 메시지를 안 실어 준다(설치본 `core/extensions/types.d.ts:561`
	 * — 필드가 `type` 하나다). 상주가 멈추며 한 마지막 말은 형제에게 줄 유일한 세션
	 * 맥락이라, 지나가는 `agent_end` 에서 받아만 둔다. **이 핸들러는 아무것도 결정하지
	 * 않는다** — 결정하면 루프 안에서 재시도 앞을 막게 되고, 그게 이 확장을
	 * `agent_settled` 로 옮긴 이유다.
	 */
	let lastAssistantText = "";

	/** 지금 이 세션이 쓰는 후보와 그 출처. 세션 지정 → 환경변수 → 기본값. */
	function currentCandidates(): { candidates: ReadonlyArray<FastCandidate>; source: CandidateSource } {
		if (sessionCandidates?.length) return { candidates: sessionCandidates, source: "session" };
		const fromEnv = candidatesFromEnv(process.env);
		if (fromEnv) return { candidates: fromEnv, source: "env" };
		return { candidates: FAST_MODEL_CANDIDATES, source: "default" };
	}

	function show(content: string): void {
		pi.sendMessage({ customType: UI_MESSAGE_TYPE, content, display: true }, { triggerTurn: false });
	}

	function describe(c: FastCandidate): string {
		return c.provider ? `${c.provider}/${c.model}` : `*/${c.model}`;
	}

	/**
	 * 상태 패널. **"지정했다"와 "실제로 설 수 있다"를 갈라서 보여준다** — 후보에 있는데
	 * 레지스트리에 없거나 인증이 없으면 그 자리에서 그렇게 적힌다. 그래야 consult 가
	 * 조용히 fail-closed 로 넘어간 이유를 나중에 안 캐도 된다.
	 */
	function status(ctx: ExtensionContext): string {
		const { candidates, source } = currentCandidates();
		const resident = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "(none)";
		const available = ctx.modelRegistry.getAvailable();
		const resolved = resolveCandidates(available, candidates);
		const lines = [
			`decision-gate — consult model`,
			`  candidates (${source}): ${candidates.map(describe).join(", ")}`,
			`  resident (skipped):     ${resident}`,
		];
		if (resolved.length === 0) {
			lines.push("  resolves to:            (nothing in this registry — consult will be skipped)");
		} else {
			for (const m of resolved) {
				const id = `${m.provider}/${m.id}`;
				const why =
					ctx.model && m.provider === ctx.model.provider && m.id === ctx.model.id
						? "skipped — this is the resident"
						: ctx.modelRegistry.hasConfiguredAuth(m)
							? "authed"
							: "no auth configured";
				lines.push(`  ${resolved.indexOf(m) === 0 ? "→" : " "} ${id.padEnd(34)} ${why}`);
			}
		}
		const consults = ctx.sessionManager
			.getBranch()
			.filter((e) => (e as { customType?: string }).customType === CONSULT_ENTRY_TYPE).length;
		lines.push(
			`  consults this session:  ${consults}/${MAX_CONSULTS_PER_SESSION}`,
			`  per consult:            ${MAX_DIGS_PER_CONSULT} digs max, ${DIG_TIMEOUT_MS / 1000}s each, ${CONSULT_DEADLINE_MS / 60_000}min wall clock`,
			`  fires on:               update_goal(blocked), once per transition, at agent_settled`,
		);
		return lines.join("\n");
	}

	pi.on("agent_end", async (event, _ctx) => {
		const last = (event.messages as unknown[]).filter((m) => (m as { role?: string }).role === "assistant").pop() as
			| AssistantMessage
			| undefined;
		if (last) lastAssistantText = textOf(last.content);
	});

	/**
	 * 패널은 사람 것이지 모델 것이 아니다. heartbeat 가 같은 자리에서 하는 것과 같게
	 * (`heartbeat.ts:372`) 컨텍스트에서 걷어낸다 — 이 확장의 "본대화 유입 없음"은
	 * 여기서도 지켜진다.
	 */
	pi.on("context", async (event) => {
		return {
			messages: event.messages.filter((m) => (m as { customType?: string }).customType !== UI_MESSAGE_TYPE),
		};
	});

	pi.registerCommand("decision-gate", {
		description: "Pick which fast model digs GLG's axes when a goal turn declares itself blocked",
		getArgumentCompletions: (prefix: string) => {
			const items = [
				{ value: "status", label: "status", description: "show candidates, auth and budget" },
				{ value: "model ", label: "model <provider/id>", description: "set the consult model for this session" },
				{ value: "model reset", label: "model reset", description: "back to DECISION_GATE_MODELS / built-in order" },
			];
			const filtered = items.filter((item) => item.value.startsWith(prefix.trimStart()));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			const text = (args ?? "").trim();
			if (!text || text === "status") {
				show(status(ctx));
				return;
			}
			if (!text.startsWith("model")) {
				// 사람 입력이라 사용법이 답이다 — 여기서 crash 하는 것은 면피가 아니라 무례다.
				show(`Unknown argument: ${text}\n\n${USAGE}`);
				return;
			}
			const spec = text.slice("model".length).trim();
			if (!spec || spec === "reset" || spec === "default") {
				sessionCandidates = null;
				show(`Consult model reset.\n\n${status(ctx)}`);
				return;
			}
			const parsed = parseModelSpec(spec);
			if (parsed.length === 0) {
				show(`Could not read a model out of: ${spec}\n\n${USAGE}`);
				return;
			}
			const resolved = resolveCandidates(ctx.modelRegistry.getAvailable(), parsed);
			if (resolved.length === 0) {
				// 지정은 받되 안 서는 것을 조용히 받아 두지 않는다.
				show(`No model in this registry matches: ${parsed.map(describe).join(", ")}\n\n${status(ctx)}`);
				return;
			}
			sessionCandidates = parsed;
			show(status(ctx));
		},
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (running) return; // consult 자체가 도는 동안의 재진입 방지
		const blocked = findPendingBlocked(ctx.sessionManager.getBranch());
		if (!blocked) return;
		trace(`blocked goal ${blocked.id} — selecting a fast model`);

		running = true;
		const resident = ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : null;
		const { candidates, source } = currentCandidates();
		const digs: DigRecord[] = [];
		const { tool, budget } = createDigTool(digs);
		let model: Model<Api> | null = null;
		let outcome: ConsultOutcome = "error";
		let failure: string | undefined;
		let deadlineHit = false;
		let text = "";
		let verdict: { kind: "inference" | "quote"; citedLabels: string[] } = { kind: "inference", citedLabels: [] };
		let usage: AssistantMessage["usage"] | undefined;

		try {
			model = await selectFastModel(ctx.modelRegistry, resident, candidates);
			if (!model) {
				// fail-closed. 상주 모델로 떨어지지 않는다 — 그러면 이 확장이 없는 것만 못하다.
				outcome = "no-model";
				failure = `no fast model available from the ${source} candidates (${candidates.map(describe).join(", ")})${
					resident ? `, resident ${resident.provider}/${resident.id} excluded` : ""
				}. Set one with /decision-gate model <provider/id>`;
				if (ctx.hasUI) ctx.ui.notify(`decision-gate: ${failure}`, "warning");
				else console.error(`[decision-gate] ${failure}`);
			} else {
				trace(`fast model = ${model.provider}/${model.id} (${source}) — creating side session`);
				const { session } = await createAgentSession(
					buildConsultSessionOptions(model, tool) as Parameters<typeof createAgentSession>[0],
				);
				// 벽시계. 끊더라도 캔 것은 아래에서 그대로 엔트리로 나간다.
				const deadline = setTimeout(() => {
					deadlineHit = true;
					trace(`deadline ${CONSULT_DEADLINE_MS}ms reached — aborting the side session`);
					void session.abort();
				}, CONSULT_DEADLINE_MS);
				try {
					trace("side session up — prompting");
					await session.prompt(firstUserPrompt(blocked.objective, lastAssistantText), { source: "extension" });
					trace(`prompt returned — ${digs.length} dig record(s), ${budget.spawned} spawned, ${budget.refused} refused`);
					const response = lastAssistant(session);
					text = response ? textOf(response.content) : "";
					verdict = parseVerdict(text);
					usage = response?.usage;
					outcome = deadlineHit ? "deadline" : "ok";
					if (deadlineHit) failure = `consult was cut at the ${CONSULT_DEADLINE_MS / 60_000}min wall clock`;
				} finally {
					clearTimeout(deadline);
					try {
						await session.abort();
					} catch {
						// 임시 세션 teardown. 외부 상태 경계라 면피가 아니다.
					}
					session.dispose();
				}
			}
		} catch (err) {
			// abort 로 끊긴 판도 여기로 온다 — 그래서 deadlineHit 을 먼저 본다.
			outcome = deadlineHit ? "deadline" : "error";
			failure = err instanceof Error ? err.message : String(err);
			if (ctx.hasUI) ctx.ui.notify(`decision-gate consult ${outcome}: ${failure}`, "error");
			else console.error(`[decision-gate] consult ${outcome}: ${failure}`);
		} finally {
			/**
			 * **결과가 무엇이든 엔트리는 나간다.** 성공만 남기면 실패한 전이에 표식이 없어
			 * 다음 `agent_settled` 가 같은 전이를 다시 유료로 캔다 — `findPendingBlocked` 가
			 * 이 엔트리 하나로 에지를 판정하기 때문이다. 세션당 상한 3회도 이 엔트리를 세므로,
			 * 실패가 기록되어야 반복 실패가 상한에 걸린다. (교차검수 2026-09-09)
			 */
			const details = buildConsultDetails({
				blocked,
				sessionId: ctx.sessionManager.getSessionId(),
				model: model ? { provider: model.provider, id: model.id } : null,
				outcome,
				error: failure,
				resident,
				modelSource: source,
				digs,
				budget,
				deadlineMs: CONSULT_DEADLINE_MS,
				deadlineHit,
				text,
				verdict,
				usage,
			});
			pi.appendEntry(CONSULT_ENTRY_TYPE, details);
			trace(
				`entry written — outcome=${outcome} kind=${verdict.kind} cited=${details.answer.citedHitIds.length}/${verdict.citedLabels.length} resolved`,
			);
			if (outcome === "ok" && ctx.hasUI) {
				const cut = budget.refused ? `, ${budget.refused} dig(s) refused by budget` : "";
				ctx.ui.notify(
					`decision-gate: ${model?.provider}/${model?.id} dug ${budget.spawned} axis call(s), ${verdict.kind}, ${details.answer.citedHitIds.length} cited${cut}.`,
					budget.refused ? "warning" : "info",
				);
			}
			running = false;
		}
	});
}
