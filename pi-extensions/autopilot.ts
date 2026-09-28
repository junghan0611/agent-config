/**
 * autopilot — 침묵을 트리거로, 판단은 GLG 의 기억축에서, 실행은 아직 없다
 *
 * GLG (2026-09-28 16:49, 저널 week39.org:81-115 — GLG 가 이 세션에 직접 붙인 원문):
 *
 *   "욜로로 가다가. glg가 판단좀해줘라고 남겼는데? 답이 없으면 dm으로 보내고, 그래도
 *    답이 없으면 decision-gate가 열려서 기억축으로 내가 판단했음직한 것을 찾고 결정하고
 *    진행하는거야. 물론 dm으로 메시지를 보내줘야지. glg가 답장 안해서 이렇게 판단내리고
 *    형제들하고 진행합니다. 라고 말이야. 그러면 내가 나중에 보고 그게 아니면 얼른 와서
 *    하지 말라고 하겠지 아니면 오케이라고 하든가."
 *
 *   "지금은 자동은 아니지만, 내가 먼저 말을 하거든 dm 스킬로 메시지를 보내주면 …
 *    근데 이것도 내가 말을 해줘야하는거거든. 그냥은 dm 스킬로 메시지 안보낼거거든."
 *
 * 그래서 이 확장이 하는 것은 그 문장의 앞 세 걸음이다:
 *
 *   1. 담당자 턴이 정착했고(`agent_settled`) **그 턴이 `waiting_for(kind:"glg")` 를 선언했으면**
 *      — 시계를 건다. 묻는 모양의 말은 무장하지 않는다(아래 v3 문단, 상태줄 힌트뿐).
 *   2. `askMs` 동안 GLG 입력이 없으면 — DM 한 통(질문). DM 이 실패하면 여기서 멈춘다.
 *   3. `gateMs` 더 없으면 — decision-gate 의 consult 를 같은 예산으로 돌려 GLG 가 내렸음직한
 *      답을 캐고, DM 한 통 더 + 세션 안에 **패널**로 남긴다.
 *
 * 예산은 **세션의 것**이다(무장 상태의 것이 아니다): DM 4통·consult 3회. `/autopilot off`
 * 후 다시 `on` 해도 되살아나지 않고, 세션 엔트리에서 다시 세므로 reload·resume 에도
 * 이어진다.
 *
 * **네 번째 걸음("진행")은 여기 없다 (2026-09-28).** 이 파일은 턴을 돌리지 않고 도구를
 * 실행하지 않는다 — `pi.sendMessage` 는 `triggerTurn:false` 로만 부르고 `tool_call` 훅이 없다.
 * 그래서 "잠정 권한의 경계"라는 문제 자체가 아직 생기지 않는다: **아무것도 실행되지
 * 않는 것이 경계다.** 진행을 붙이려면 GLG 가 경계 모델을 정해야 한다(README § autopilot —
 * 실행 0 vs 활성 도구 allowlist + bash 전면 차단 + 미지 도구 fail-closed). regex deny
 * 목록은 경계가 아니다(교차검수 2026-09-28, `openai-codex/gpt-6-sol`): 간접 호출·스크립트
 * 쓰기·임의 커스텀 도구를 못 막는다. 그 결론을 여기 적어 두는 이유는 다음 손이 deny
 * 목록으로 "진행"을 붙이고 안전하다고 적지 않게 하기 위해서다.
 *
 * 트리거는 goal 이 아니고, 텍스트 냄새도 아니다 — **코디네이터의 명시 선언**이다 (v3, 2026-09-28).
 * #24 는 "텍스트를 냄새 맡지 않는다 — `update_goal(blocked)` 만"으로 닫혔는데, 평범한 pi
 * 세션은 목표를 선언하지 않는다(GLG 정정 2026-09-28: goals are rarely set). 그렇다고 `?` 로
 * 무장하면 부수적인 물음마다 DM 이 나간다(교차검수 (2)). 그리고 GLG 가 같은 날 정정한 것이
 * 하나 더 있다 — *"코디네이터가 멈춘다고 대답을 기다리는것은 또 아니 … 형제한테 맡겨놓은것을
 * 기다리는중이라면 형제가 돌고 있는지 확인 … 오토파일럿은 혼자가 아니야."* 멈춤 ≠ GLG 질문.
 *
 * 그래서 이 확장은 도구 하나를 준다: `waiting_for(kind: glg | peer | local | none, question?)`.
 * 무장된 세션에서만 시스템 프롬프트에 한 문단이 붙어, 턴을 끝내는 이유가 GLG 의 결정이면
 * 그렇게 **선언**하고 끝내게 한다. 형제·백그라운드를 기다리는 거면 `peer`/`local` 로 선언한다 —
 * 그 판정은 확장의 스캐너가 아니라 **코디네이터 모델이 공개 사실(entwurf_peers ·
 * bash_background_check)로** 한다. 확장은 meta-record 도 mailbox 도 transcript mtime 도 읽지
 * 않는다: 그것은 entwurf 의 계약이고, 부재와 mtime 은 "일하고 있다/멈췄다"의 사실이 아니다
 * (교차검수 2026-09-28, `openai-codex/gpt-6-sol`). 선언 없이 묻는 모양으로 끝나면 상태줄
 * **힌트**만 뜬다 — 타이머도 DM 도 없다.
 *
 * 집 규칙은 heartbeat 와 같다: **기본 OFF, 사람이 켠다, 세션과 함께 죽는다.** 모든 pi
 * 세션(entwurf ACP 자식·`-p` 포함)이 이 파일을 싣기 때문이다 — 기본 ON 이면 자식마다
 * GLG 에게 DM 이 간다.
 *
 * GLG 의 답 = 이 세션의 **interactive `input`** 만이다(pi 0.87.1 `types.d.ts:721-733`).
 * rpc(형제 steer)·extension source 는 GLG 가 아니므로 시계를 안 멈춘다. 텔레그램 답장은
 * 세션에 닿지 않는다(브릿지 없음) — DM 문구는 그래서 원격 취소를 광고하지 않는다.
 * 입력이 오면 `generation` 이 오르고, 그 앞에서 떠난 DM·consult 는 **stale** 로 버려진다:
 * 돌아온 뒤에 DM#2 도 패널도 남기지 않는다(교차검수 (4)). 이미 남은 판정 패널은 지우지
 * 않는다 — GLG 가 "그대로 해/아니" 할 때 담당자가 읽을 자리다 — 대신 모델에게 갈 때
 * **"GLG 가 그 뒤에 말했다, 이 판정은 지난 것이다"** 라는 머리를 달고 간다(`context`).
 *
 * consult 는 `decision-gate.ts` 의 `runConsult` 그대로다(같은 캐는 손, 같은 dig 예산, 같은
 * 세션당 3회, 같은 엔트리). 다만 **타이머 콜백에서** 돌므로 `agent_settled` 의 정착 뒤를
 * 막지 않는다 — goal 경로가 지던 "최대 8분 idle 지연" 비용이 이 경로에는 없다.
 */

import { spawn } from "node:child_process";
import * as path from "node:path";

import { StringEnum, type AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { CONSULT_ENTRY_TYPE, resolveCandidateSource, runConsult, skillsRoot, type ConsultDetails } from "./decision-gate.ts";

/** 이 확장이 남기는 엔트리. 단계마다 하나 — 무장·시계·DM·판정·취소가 전부 여기 남는다. */
export const AUTOPILOT_ENTRY_TYPE = "autopilot";
/** 상태 패널. 모델에게 안 간다(아래 `context` 핸들러). */
const UI_MESSAGE_TYPE = "autopilot-ui";
/** 잠정 판단 패널. **모델에게 간다** — GLG 가 돌아와 "그대로 해" 할 때 담당자가 읽을 첨가 정보다. 최신 하나만 남긴다. */
export const VERDICT_MESSAGE_TYPE = "autopilot-verdict";

/** 근거 없는 초기값 둘(2026-09-28). GLG 원문에 숫자가 없고, 실측도 아직 없다. */
export const DEFAULT_ASK_MS = 10 * 60_000;
export const DEFAULT_GATE_MS = 20 * 60_000;
const MIN_INTERVAL_MS = 60_000;
/** 세션당 DM 상한. 한 사이클이 2통(질문·판정)이므로 두 사이클이다. 텔레그램은 사람의 주의를 직접 가져가는 면이다. */
export const MAX_DMS_PER_SESSION = 4;
/** decision-gate 와 같은 값. 여기서 다시 세는 이유는 그 상수가 export 되지 않아서다 — 어긋나면 그쪽이 정본이다. */
const MAX_CONSULTS_PER_SESSION = 3;
const DM_TIMEOUT_MS = 30_000;
/** DM 과 패널에 실을 질문 꼬리 길이. 텔레그램 한 화면. */
const QUESTION_TAIL_CHARS = 600;
/** 잠정 판단이 서려면 실제 히트가 최소 이만큼 인용돼야 한다(#24 G1 의 정신 — 인용 없는 항목은 불명). */
export const REQUIRE_CITED_HITS = 1;

const USAGE = [
	"Usage: /autopilot on [<ask> [<gate>]]     e.g. /autopilot on 10m 20m",
	"       /autopilot on --ask 10m --gate 20m",
	"       /autopilot off | status",
	"",
	"ask  = silence after a question before DM #1 (default 10m)",
	"gate = further silence before decision-gate digs GLG's axes and DM #2 (default 20m)",
	"Armed sessions get one system-prompt paragraph: end a GLG-decision turn with waiting_for(kind:\"glg\", question).",
	"Nothing is executed on the verdict — it is left as a panel for GLG to confirm.",
].join("\n");

/** 선언의 종류. `none` 은 진행 중인 사이클을 접는 선언이다("더는 GLG 를 기다리지 않는다"). */
export const WAIT_KINDS = ["glg", "peer", "local", "none"] as const;
export type WaitKind = (typeof WAIT_KINDS)[number];

/**
 * 무장된 세션의 시스템 프롬프트에 붙는 한 문단. 무장 안 된 세션에는 안 붙는다 — 그래야
 * 이 파일을 싣는 모든 pi 세션이 갑자기 도구 하나를 부르기 시작하지 않는다.
 */
export const ARMED_PROMPT = [
	"Autopilot is armed in this session (advisory-only pilot; nothing is executed on its verdicts).",
	'When you end a turn because GLG must decide something, make your last tool call waiting_for(kind:"glg", question:"<the exact question>") and then stop.',
	'If you are instead waiting on a sibling or a background task, declare waiting_for(kind:"peer") or waiting_for(kind:"local") — check entwurf_peers / bash_background_check first if unsure. A stopped coordinator is not automatically a GLG question.',
	'If a question you declared no longer needs GLG, declare waiting_for(kind:"none").',
	"GLG's silence is never authorization. After the configured silence a DM goes to him, and later decision-gate leaves a provisional verdict as a panel — you do not act on it until GLG confirms.",
].join(" ");

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수 — 세션 없이 잰다
// ─────────────────────────────────────────────────────────────────────────────

/** `10m` / `90s` / `1h`. 바닥 60초 — 질문하고 1분 만에 DM 하는 것은 GLG 가 자리를 비웠다는 근거가 아니다. */
export function parseDuration(input: string): number {
	const m = /^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs)$/i.exec(input.trim());
	if (!m) throw new Error(`Invalid interval "${input}". Use 30s, 10m, 2h`);
	const n = Number.parseInt(m[1]!, 10);
	const u = m[2]!.toLowerCase()[0];
	const ms = n * (u === "s" ? 1_000 : u === "m" ? 60_000 : 3_600_000);
	if (ms < MIN_INTERVAL_MS) throw new Error("autopilot intervals must be at least 1 minute");
	return ms;
}

export type AutopilotCommand = { type: "status" } | { type: "off" } | { type: "on"; askMs: number; gateMs: number };

export function parseCommand(input: string): AutopilotCommand {
	const text = input.replace(/^\/autopilot\b/, "").trim();
	const lower = text.toLowerCase();
	if (!text || lower === "status") return { type: "status" };
	if (lower === "off" || lower === "stop" || lower === "clear") return { type: "off" };
	if (!/^on\b/i.test(text)) throw new Error(USAGE);
	let rest = text.slice(2).trim();
	let askMs = DEFAULT_ASK_MS;
	let gateMs = DEFAULT_GATE_MS;
	const flag = (name: string): void => {
		const re = new RegExp(`--${name}[\\s=]+(\\S+)`, "i");
		const m = re.exec(rest);
		if (!m) return;
		const ms = parseDuration(m[1]!);
		if (name === "ask") askMs = ms;
		else gateMs = ms;
		rest = rest.replace(m[0], "").trim();
	};
	flag("ask");
	flag("gate");
	const positional = rest.split(/\s+/).filter(Boolean);
	if (positional.length > 2) throw new Error(USAGE);
	if (positional[0]) askMs = parseDuration(positional[0]);
	if (positional[1]) gateMs = parseDuration(positional[1]);
	return { type: "on", askMs, gateMs };
}

/**
 * 묻는 모양의 최소 정의 — **힌트 전용** (v3). 선언 없이 이 모양으로 끝나면 상태줄에 한 줄
 * 뜰 뿐, 타이머도 DM 도 없다. 그리고 `glg` 선언에 question 이 비어 있을 때 마지막 말에서
 * 질문 꼬리를 꺼내는 데 쓴다. `GLG` 한 단어는 "GLG, 끝났습니다"도 잡아서 뺐다.
 */
const ASK_MARKERS =
	/[?？]|(판단|결정|선택|골라|정해\s*주|할까요|어떨까|괜찮을까|괜찮으|확인\s*부탁|확인해\s*주|알려\s*주|말씀해\s*주|어느\s*쪽|should i|shall i|do you want|which (one|way)|your call|ok to|okay to)/iu;

/** heartbeat 의 조용한 정답. 물음이 아니다. */
const QUIET_TOKENS = new Set(["HEARTBEAT_OK", "NO_REPLY"]);

/**
 * 마지막 assistant 메시지에서 질문 꼬리를 꺼낸다. 없으면 null. 문단 단위로 **뒤에서부터**
 * 보고, 묻는 문단부터 끝까지를 돌려준다(질문 뒤에 선택지가 따라오는 모양이 흔하다).
 */
export function findAsk(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed || QUIET_TOKENS.has(trimmed)) return null;
	const paragraphs = trimmed.split(/\n\s*\n/u).map((p) => p.trim()).filter(Boolean);
	for (let i = paragraphs.length - 1; i >= 0; i--) {
		if (ASK_MARKERS.test(paragraphs[i]!)) {
			const tail = paragraphs.slice(i).join("\n\n");
			return tail.length > QUESTION_TAIL_CHARS ? `${tail.slice(0, QUESTION_TAIL_CHARS - 1)}…` : tail;
		}
	}
	return null;
}

/** 사이드 세션에 주는 첫 프롬프트. 시스템 프롬프트는 decision-gate 의 것 그대로다. */
export function consultPrompt(question: string, lastWords: string, silentMs: number): string {
	return [
		`GLG's resident agent paused ${Math.round(silentMs / 60_000)} minutes ago to ask GLG this, and GLG has not answered:`,
		"",
		question,
		"",
		"The resident's full last message:",
		"",
		lastWords.slice(0, 4000) || "(none)",
		"",
		"Dig the axes and report what GLG himself has already said or decided that bears on this question.",
		'Then, on its own line just before the json block, write "PROVISIONAL: <the answer GLG would most likely give, in his own terms>" — or "PROVISIONAL: none" if the axes do not support one. Do not invent a preference the axes do not show.',
	].join("\n");
}

/** 형제의 `PROVISIONAL:` 줄. 없거나 `none` 이면 null. */
export function parseProvisional(text: string): string | null {
	let last: string | null = null;
	for (const m of text.matchAll(/^\s*PROVISIONAL:\s*(.+?)\s*$/gimu)) last = m[1]!;
	if (!last || /^none\b/i.test(last)) return null;
	return last;
}

/**
 * 잠정 판단이 **서지 않는** 이유 한 줄, 서면 null. 서는 조건 셋은 전부 영수증에서 읽는다:
 * consult 가 ok 로 끝났고, PROVISIONAL 줄이 있고, 실제 히트가 인용됐다. 셋 중 하나라도
 * 없으면 "근거 없음 — 대기"다. heartbeat step 4 와 같은 자리다.
 */
export function holdReason(details: ConsultDetails): string | null {
	if (details.outcome !== "ok") return `consult ${details.outcome}${details.error ? `: ${details.error}` : ""}`;
	if (!parseProvisional(details.answer.text)) return "the sibling found no answer GLG's axes support (PROVISIONAL: none)";
	if (details.answer.citedHitIds.length < REQUIRE_CITED_HITS) return "the provisional answer cites no resolvable hit — an uncited inference does not open the gate";
	return null;
}

function minutes(ms: number): string {
	return `${Math.round(ms / 60_000)}m`;
}

function hhmm(ms: number): string {
	return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** DM #1. 무엇을 기다리는지, 답이 없으면 무엇이 일어나는지(그리고 무엇이 일어나지 **않는지**). */
export function dmAskBody(question: string, askMs: number, gateMs: number): string {
	return [
		`[autopilot] 담당자가 GLG 판단을 기다린 지 ${minutes(askMs)}. ${minutes(gateMs)} 더 답이 없으면 decision-gate 가 기억축·시간축을 캐서 잠정 판단을 세션에 남깁니다 — 진행은 하지 않습니다.`,
		`Q: ${question}`,
	].join("\n");
}

/** DM #2 — 판단이 섰을 때. 원격 취소를 광고하지 않는다: 세션 입력이 오면 무효라는 사실만. */
export function dmVerdictBody(question: string, details: ConsultDetails, provisional: string, silentMs: number): string {
	const model = details.model ? `${details.model.provider}/${details.model.id}` : "no model";
	return [
		`[autopilot] GLG 답 없음 ${minutes(silentMs)}. decision-gate 잠정 판단 — 진행 안 함, 세션 패널로 남김.`,
		`Q: ${question.slice(0, 300)}`,
		`잠정: ${provisional.slice(0, 400)}`,
		`근거: ${details.answer.citedHitIds.length}건 인용 · ${model} · ${details.answer.kind}`,
		"세션에 입력이 들어오면 이 판단은 무효.",
	].join("\n");
}

/** DM #2 — 판단이 안 섰을 때. 침묵을 근거로 쓰지 않았다는 것을 알린다. */
export function dmHoldBody(question: string, reason: string, silentMs: number): string {
	return [
		`[autopilot] GLG 답 없음 ${minutes(silentMs)}. decision-gate: 근거 부족 — 잠정 판단 없음, 대기. (${reason.slice(0, 300)})`,
		`Q: ${question.slice(0, 300)}`,
	].join("\n");
}

/** 세션 안 패널. 이건 모델에게도 간다 — 첫 줄이 그래서 권한 부정문이다. */
export function verdictPanel(args: {
	question: string;
	askedAt: number;
	dm1At: number;
	dm2At: number;
	details: ConsultDetails;
	provisional: string | null;
	hold: string | null;
}): string {
	const { details } = args;
	const model = details.model ? `${details.model.provider}/${details.model.id}` : "no model";
	const lines = [
		"[autopilot verdict — advisory only. Not GLG's answer. Nothing was executed on it.]",
		`Asked GLG at ${hhmm(args.askedAt)} · silent ${minutes(args.dm2At - args.askedAt)} · DM #1 ${hhmm(args.dm1At)} · DM #2 ${hhmm(args.dm2At)}`,
		`Q: ${args.question}`,
		"",
	];
	if (args.hold) {
		lines.push(`decision-gate did not reach a provisional answer: ${args.hold}`, "Waiting for GLG. Do not proceed on this question until he answers.");
	} else {
		lines.push(
			`decision-gate (${model}, ${details.budget.digsSpawned} digs, ${details.answer.citedHitIds.length} cited hits, ${details.answer.kind}):`,
			`PROVISIONAL: ${args.provisional}`,
			"",
			"Grounds:",
			details.answer.text.slice(0, 1500),
			"",
			"When GLG returns: he confirms or rejects this in one line. Until then nothing proceeds on this basis — silence is not authorization.",
		);
	}
	return lines.join("\n");
}

/**
 * 지난 판정의 머리. GLG 가 그 판정 뒤에 말했거나 질문이 거둬졌으면, 패널은 컨텍스트에
 * 남되(그가 "그대로 해" 할 때 담당자가 읽어야 한다) 현재의 권한처럼 읽히지 않게 이 줄을
 * 앞에 단다.
 */
export const HISTORICAL_HEADER =
	"[autopilot verdict — HISTORICAL. GLG spoke after it was left (or the question was withdrawn). It is not his answer and grants nothing; only what GLG himself said after it decides.]";

type PanelContent = string | Array<{ type: string; text?: string }>;

/** 패널 내용에 머리를 단다. 이미 달렸으면 그대로. */
export function markHistorical(content: PanelContent): PanelContent {
	if (typeof content === "string") return content.startsWith(HISTORICAL_HEADER) ? content : `${HISTORICAL_HEADER}\n${content}`;
	if (content[0]?.type === "text" && content[0].text?.startsWith(HISTORICAL_HEADER)) return content;
	return [{ type: "text", text: HISTORICAL_HEADER }, ...content];
}

/**
 * 모델에게 가는 메시지 목록을 거른다 — 순수 함수라 세션 없이 잰다.
 *
 *  - 상태 패널(`autopilot-ui`)은 빠진다.
 *  - 판정 패널은 **최신 하나만** 남는다(heartbeat.ts 와 같은 규율).
 *  - 그 하나 뒤에 `user` 메시지가 있거나, 그 판정의 consult 가 무효 목록에 있으면
 *    `HISTORICAL_HEADER` 를 달고 간다. 사용자 메시지는 형제 steer 일 수도 있는데 그래도
 *    머리를 단다 — 머리는 권한을 **빼기만** 하므로 넘치게 다는 쪽이 안전하다.
 */
export function filterContext<M>(messages: ReadonlyArray<M>, invalidated: ReadonlySet<number>): M[] {
	const typeOf = (m: M): string | undefined => (m as { customType?: string }).customType;
	let lastVerdict = -1;
	for (let i = 0; i < messages.length; i++) if (typeOf(messages[i]!) === VERDICT_MESSAGE_TYPE) lastVerdict = i;
	const spokenAfter = lastVerdict >= 0 && messages.slice(lastVerdict + 1).some((m) => (m as { role?: string }).role === "user");
	const out: M[] = [];
	messages.forEach((message, index) => {
		const t = typeOf(message);
		if (t === UI_MESSAGE_TYPE) return;
		if (t === VERDICT_MESSAGE_TYPE) {
			if (index !== lastVerdict) return;
			const ts = (message as { details?: { consultTimestamp?: number } }).details?.consultTimestamp;
			if (spokenAfter || (ts !== undefined && invalidated.has(ts))) {
				const m = message as unknown as { content: PanelContent };
				out.push({ ...(message as object), content: markHistorical(m.content) } as M);
				return;
			}
		}
		out.push(message);
	});
	return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// DM — dm.sh 를 argv 고정으로 부른다
// ─────────────────────────────────────────────────────────────────────────────

export interface DmRun {
	status: number | null;
	stdout: string;
	stderr: string;
	error?: string;
}
export type DmRunner = (argv: string[], body: string, opts: { timeoutMs: number }) => Promise<DmRun>;

/** `skills/dm/scripts/dm.sh --as pi/<model> --stdin`. 본문은 stdin — 셸도 인자 확장도 없다. */
export function buildDmArgv(as: string): string[] {
	return [path.join(skillsRoot(), "dm", "scripts", "dm.sh"), "--as", as, "--stdin"];
}

const runDm: DmRunner = (argv, body, opts) =>
	new Promise<DmRun>((resolve) => {
		const child = spawn(argv[0]!, argv.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		let settled = false;
		const finish = (r: DmRun): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(r);
		};
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			finish({ status: null, stdout, stderr, error: `dm timed out after ${opts.timeoutMs}ms` });
		}, opts.timeoutMs);
		child.stdout?.on("data", (c: Buffer) => (stdout += c.toString()));
		child.stderr?.on("data", (c: Buffer) => (stderr += c.toString()));
		// spawn 실패(ENOENT)는 이벤트로 온다 — 외부 경계, 기록이 답이다.
		child.on("error", (err: Error) => finish({ status: null, stdout, stderr, error: err.message }));
		child.on("close", (code) => finish({ status: code, stdout, stderr }));
		// dm.sh 가 본문을 읽기 전에 죽으면 stdin 쓰기가 EPIPE 를 낸다 — 리스너가 없으면 pi 전체가 죽는다.
		child.stdin?.on("error", (err: Error) => finish({ status: null, stdout, stderr, error: `dm stdin: ${err.message}` }));
		child.stdin?.end(body);
	});

// ─────────────────────────────────────────────────────────────────────────────
// 확장
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "waiting-ask" | "waiting-gate" | "gating" | "verdict" | "hold";

interface Cycle {
	phase: Phase;
	question: string;
	/** 담당자 턴이 정착한 시각. 침묵은 여기서부터다. */
	askedAt: number;
	/** 이 사이클이 시작할 때의 generation. 어긋나면 그 사이 GLG 가 말한 것이다. */
	gen: number;
	/** 이 사이클이 속한 세션의 epoch. 세션이 바뀌면 옛 사이클은 새 세션에 아무것도 쓰지 않는다. */
	epoch: number;
	dm1At?: number;
	dm2At?: number;
	/** 판정 패널이 가리키는 consult 엔트리의 timestamp. 무효 처리의 키다. */
	verdictTs?: number;
}

/** 이 턴에 코디네이터가 선언한 것. 턴이 정착하면 소비되고 비워진다. */
interface Declared {
	kind: WaitKind;
	question?: string;
	note?: string;
	at: number;
}

/** 무장 상태. `/autopilot off` 로 사라진다 — 예산은 여기 없다(아래 `Ledger`). */
interface Armed {
	askMs: number;
	gateMs: number;
	cycle: Cycle | null;
	declared: Declared | null;
}

/**
 * 세션의 장부. **무장과 무관하게** 세션 동안 산다 — off→on 이 DM 예산을 되살리던 구멍
 * (교차검수 2026-09-28)을 닫는 자리다. `session_start` 에서 세션 엔트리를 다시 세어
 * 채우므로 reload·resume 뒤에도 이어진다.
 */
interface Ledger {
	dmsSent: number;
	dropped: number;
	cancelled: number;
}

/** 테스트 이음매. pi 는 한 인자로 부르고, 테스트만 시계·DM·consult 를 갈아 끼운다. */
export interface AutopilotDeps {
	dm?: DmRunner;
	now?: () => number;
	schedule?: (fn: () => void, ms: number) => unknown;
	cancel?: (handle: unknown) => void;
	/** 기본은 `decision-gate.ts` 의 `runConsult`. 스텁 테스트가 영수증 모양을 직접 넣을 때만 쓴다. */
	consult?: typeof runConsult;
}

/** 세션 엔트리에서 이미 나간 DM 을 센다 — 장부의 정본. */
export function countSentDms(entries: ReadonlyArray<unknown>): number {
	let n = 0;
	for (const e of entries) {
		const x = e as { type?: string; customType?: string; data?: { dmSent?: unknown } };
		if (x.type === "custom" && x.customType === AUTOPILOT_ENTRY_TYPE && x.data?.dmSent === true) n++;
	}
	return n;
}

export default function (pi: ExtensionAPI, deps: AutopilotDeps = {}) {
	const dm = deps.dm ?? runDm;
	const consult = deps.consult ?? runConsult;
	const now = deps.now ?? Date.now;
	const schedule =
		deps.schedule ??
		((fn: () => void, ms: number): unknown => {
			const t = setTimeout(fn, ms);
			// 시계가 pi 를 살려 두는 이유가 되면 안 된다 — heartbeat.ts:240 과 같다.
			t.unref?.();
			return t;
		});
	const cancel = deps.cancel ?? ((h: unknown): void => clearTimeout(h as NodeJS.Timeout));

	let auto: Armed | null = null;
	let ledger: Ledger = { dmsSent: 0, dropped: 0, cancelled: 0 };
	/** interactive 입력마다 +1. 무장과 무관하게 단조 증가 — in-flight DM/consult 의 stale 판정 키. */
	let generation = 0;
	/** 세션 경계마다 +1. 옛 세션의 in-flight 결과가 새 세션에 엔트리를 남기지 못하게 한다. */
	let epoch = 0;
	/** 떠났지만 아직 안 돌아온 DM. 예산 검사에 더한다 — 두 사이클이 겹쳐도 상한을 넘지 않게. */
	let dmInFlight = 0;
	/** 떠났지만 아직 영수증을 안 남긴 consult. */
	let consultRunning = false;
	/** GLG 가 말했거나 거둬져 지난 것이 된 판정(consult timestamp). `context` 가 머리를 단다. */
	const invalidated = new Set<number>();
	let timer: unknown;
	let latest: ExtensionContext | undefined;
	let lastAssistantText = "";
	/** 도는 consult 를 GLG 입력이 끊는 손. */
	let inflight: AbortController | null = null;

	function record(event: string, fields: Record<string, unknown> = {}): void {
		pi.appendEntry(AUTOPILOT_ENTRY_TYPE, { version: 1, at: now(), event, ...fields });
	}

	/** 그 사이클의 세션이 아직 이 세션일 때만 기록한다. */
	function recordFor(cycle: Cycle, event: string, fields: Record<string, unknown> = {}): void {
		if (cycle.epoch === epoch) record(event, fields);
	}

	function show(content: string): void {
		pi.sendMessage({ customType: UI_MESSAGE_TYPE, content, display: true }, { triggerTurn: false });
	}

	function disarmTimer(): void {
		if (timer !== undefined) {
			cancel(timer);
			timer = undefined;
		}
	}

	/**
	 * 지금 사이클을 접는다 — 시계·in-flight consult 를 끊고, 남은 판정은 지난 것으로 표시한다.
	 * `event` 가 있으면 진행 중이던(판정 전) 사이클에 한해 그 이름으로 기록한다.
	 */
	function dropCycle(event: string | null, fields: Record<string, unknown> = {}): void {
		disarmTimer();
		inflight?.abort();
		inflight = null;
		const c = auto?.cycle;
		if (!c) return;
		if (c.verdictTs !== undefined) invalidated.add(c.verdictTs);
		if (event && c.phase !== "verdict" && c.phase !== "hold") record(event, { phase: c.phase, question: c.question, ...fields });
		auto!.cycle = null;
	}

	/** 완전 OFF — `/autopilot off`. 장부는 남는다. */
	function off(reason: string): void {
		dropCycle("cancelled", { reason });
		auto = null;
	}

	/** 세션 경계 — 무장·사이클을 버리고, 이 세션의 것이던 in-flight 는 새 세션에 쓰지 못하게 한다. */
	function boundary(reason: string): void {
		off(reason);
		epoch++;
		invalidated.clear();
		dmInFlight = 0;
		consultRunning = false;
	}

	function dmBudgetLeft(): boolean {
		return ledger.dmsSent + dmInFlight < MAX_DMS_PER_SESSION;
	}

	/** DM 한 통. 예산이 없으면 null(보내지 않는다). 성공한 통만 장부에 오른다. */
	async function sendDm(ctx: ExtensionContext, cycle: Cycle, body: string): Promise<DmRun | null> {
		if (!dmBudgetLeft()) return null;
		dmInFlight++;
		let run: DmRun;
		try {
			run = await dm(buildDmArgv(`pi/${ctx.model?.id ?? "unknown"}`), body, { timeoutMs: DM_TIMEOUT_MS });
		} catch (err) {
			// 외부 경계(프로세스·텔레그램). 거부도 "보내지 못함"이다 — 실패 영수증으로 바꿔 hold 로 보낸다.
			run = { status: null, stdout: "", stderr: "", error: `dm runner rejected: ${err instanceof Error ? err.message : String(err)}` };
		} finally {
			if (cycle.epoch === epoch) dmInFlight--;
		}
		if (run.status === 0 && cycle.epoch === epoch) ledger.dmsSent++;
		return run;
	}

	function status(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		if (!auto) {
			ctx.ui.setStatus("autopilot", undefined);
			return;
		}
		const theme = ctx.ui.theme;
		const c = auto.cycle;
		if (!c) {
			ctx.ui.setStatus("autopilot", theme.fg("dim", `autopilot armed · ${minutes(auto.askMs)}/${minutes(auto.gateMs)} · DMs ${ledger.dmsSent}/${MAX_DMS_PER_SESSION}`));
			return;
		}
		const left = (until: number): string => minutes(Math.max(0, until - now()));
		const text =
			c.phase === "waiting-ask"
				? `autopilot · waiting for GLG · DM in ${left(c.askedAt + auto.askMs)} · /autopilot off to cancel`
				: c.phase === "waiting-gate"
					? `autopilot · DM sent · gate in ${left((c.dm1At ?? c.askedAt) + auto.gateMs)} · /autopilot off to cancel`
					: c.phase === "gating"
						? "autopilot · decision-gate digging GLG's axes…"
						: c.phase === "verdict"
							? "autopilot · provisional verdict left in session — waiting for GLG"
							: "autopilot · no grounds — holding for GLG";
		ctx.ui.setStatus("autopilot", theme.fg(c.phase === "waiting-ask" || c.phase === "waiting-gate" ? "accent" : "warning", text));
	}

	function summary(): string {
		const budget = `DMs ${ledger.dmsSent}/${MAX_DMS_PER_SESSION} this session`;
		if (!auto) return `Autopilot is off · ${budget}.\n\n${USAGE}`;
		const c = auto.cycle;
		return [
			`Autopilot armed · ask ${minutes(auto.askMs)} · gate ${minutes(auto.gateMs)} · ${budget} · dropped ${ledger.dropped} · cancelled ${ledger.cancelled}`,
			c ? `cycle: ${c.phase} · asked ${hhmm(c.askedAt)} · Q: ${c.question.slice(0, 88)}${c.question.length > 88 ? "…" : ""}` : "cycle: none — waits for a turn that declares waiting_for(kind:\"glg\")",
			"GLG's answer = interactive input in this session only. Sibling messages and background results do not count.",
			"Verdicts are advisory panels. Nothing is executed until GLG confirms.",
			"Session-only, in-process: dies on exit, /new, /resume and reload — a timed DM is not promised across any of those (README § autopilot). The DM/consult budget is the session's and survives /autopilot off.",
		].join("\n");
	}

	/** 사이클 시작 — 정착한 턴이 `waiting_for(glg)` 를 선언했을 때. */
	function startCycle(ctx: ExtensionContext, question: string): void {
		if (!auto) return;
		const cycle: Cycle = { phase: "waiting-ask", question, askedAt: now(), gen: generation, epoch };
		auto.cycle = cycle;
		record("asked", { question, askMs: auto.askMs, gateMs: auto.gateMs });
		disarmTimer();
		timer = schedule(() => void onAsk(cycle), auto.askMs);
		status(ctx);
	}

	/** 시계가 울렸는데 세션이 놀고 있지 않다 — GLG 는 아니지만(그러면 input 이 먼저 왔다) 누가 돌리고 있다. 사이클을 버린다. */
	function busy(ctx: ExtensionContext, cycle: Cycle, at: string): boolean {
		if (ctx.isIdle() && !ctx.hasPendingMessages()) return false;
		ledger.dropped++;
		if (auto) auto.cycle = null;
		record("dropped-busy", { at, question: cycle.question });
		status(ctx);
		return true;
	}

	function stale(cycle: Cycle): boolean {
		return !auto || generation !== cycle.gen || cycle.epoch !== epoch || auto.cycle !== cycle;
	}

	async function onAsk(cycle: Cycle): Promise<void> {
		timer = undefined;
		const ctx = latest;
		if (!auto || !ctx || stale(cycle) || cycle.phase !== "waiting-ask") return;
		if (busy(ctx, cycle, "ask")) return;
		const run = await sendDm(ctx, cycle, dmAskBody(cycle.question, auto.askMs, auto.gateMs));
		if (!run) {
			cycle.phase = "hold";
			record("budget-exhausted", { dmsSent: ledger.dmsSent, question: cycle.question });
			if (ctx.hasUI) ctx.ui.notify(`autopilot: DM budget (${MAX_DMS_PER_SESSION}/session) spent — holding without paging GLG`, "warning");
			status(ctx);
			return;
		}
		if (stale(cycle)) {
			// GLG 가 DM 이 나가는 사이에 말했다. 보낸 통은 보낸 것이고(장부에 오른다), 그 뒤는 없다.
			recordFor(cycle, "dm1-stale", { status: run.status, dmSent: run.status === 0, question: cycle.question });
			return;
		}
		if (run.status !== 0) {
			// 묻지 못한 침묵은 무응답이 아니다 — gate 를 열지 않는다.
			cycle.phase = "hold";
			const why = run.error ?? run.stderr.trim().split("\n").pop() ?? `exit ${run.status}`;
			record("dm1-failed", { status: run.status, error: why, question: cycle.question });
			if (ctx.hasUI) ctx.ui.notify(`autopilot: DM #1 failed (${why}) — not opening the gate on an unasked silence`, "error");
			else console.error(`[autopilot] DM #1 failed: ${why}`);
			status(ctx);
			return;
		}
		cycle.dm1At = now();
		cycle.phase = "waiting-gate";
		record("dm1", { dmSent: true, messageId: /messageId=(\d+)/.exec(run.stdout)?.[1] ?? null, question: cycle.question });
		disarmTimer();
		timer = schedule(() => void onGate(cycle), auto.gateMs);
		status(ctx);
	}

	async function onGate(cycle: Cycle): Promise<void> {
		timer = undefined;
		const ctx = latest;
		if (!auto || !ctx || stale(cycle) || cycle.phase !== "waiting-gate") return;
		if (busy(ctx, cycle, "gate")) return;
		const consults =
			ctx.sessionManager.getBranch().filter((e) => (e as { customType?: string }).customType === CONSULT_ENTRY_TYPE).length + (consultRunning ? 1 : 0);
		if (consults >= MAX_CONSULTS_PER_SESSION) {
			cycle.phase = "hold";
			record("consult-budget-exhausted", { consults, question: cycle.question });
			if (ctx.hasUI) ctx.ui.notify(`autopilot: consult budget (${MAX_CONSULTS_PER_SESSION}/session) spent — holding`, "warning");
			status(ctx);
			return;
		}
		cycle.phase = "gating";
		status(ctx);
		const controller = new AbortController();
		inflight = controller;
		consultRunning = true;
		const { candidates, source } = resolveCandidateSource(null);
		const silentMs = now() - cycle.askedAt;
		let details: ConsultDetails;
		try {
			// 영수증은 이 사이클의 세션에만 쓴다 — 세션이 바뀐 뒤 돌아온 판은 새 세션에 남지 않는다.
			details = await consult({ appendEntry: (t, d) => (cycle.epoch === epoch ? pi.appendEntry(t, d) : undefined) }, ctx, {
				trigger: { kind: "autopilot", question: cycle.question, objective: `GLG asked: ${cycle.question.slice(0, 200)}`, sessionId: ctx.sessionManager.getSessionId(), askedAt: cycle.askedAt },
				prompt: consultPrompt(cycle.question, lastAssistantText, silentMs),
				candidates,
				source,
				signal: controller.signal,
			});
		} finally {
			if (cycle.epoch === epoch) consultRunning = false;
			if (inflight === controller) inflight = null;
		}
		if (stale(cycle)) {
			// 영수증은 runConsult 가 이미 남겼다. 그 위에 DM#2 도 패널도 얹지 않는다.
			recordFor(cycle, "consult-stale", { outcome: details.outcome, question: cycle.question });
			return;
		}
		const hold = holdReason(details);
		const provisional = hold ? null : parseProvisional(details.answer.text);
		cycle.dm2At = now();
		cycle.phase = hold ? "hold" : "verdict";
		cycle.verdictTs = details.timestamp;
		const body = hold ? dmHoldBody(cycle.question, hold, cycle.dm2At - cycle.askedAt) : dmVerdictBody(cycle.question, details, provisional!, cycle.dm2At - cycle.askedAt);
		const run = await sendDm(ctx, cycle, body);
		const dmSent = run?.status === 0;
		if (stale(cycle)) {
			// DM#2 가 나가는 사이에 GLG 가 말했다 — 패널은 남기지 않는다.
			recordFor(cycle, "verdict-stale", { hold, dmSent, question: cycle.question });
			return;
		}
		record(hold ? "hold" : "verdict", {
			question: cycle.question,
			provisional,
			hold,
			consultTimestamp: details.timestamp,
			dmSent,
			dm2: run ? { status: run.status, error: run.error ?? null } : "skipped — DM budget",
		});
		// 패널은 turn 을 돌리지 않는다. 이것이 이 파일의 네 번째 걸음이 아직 없다는 것의 코드다.
		pi.sendMessage(
			{
				customType: VERDICT_MESSAGE_TYPE,
				content: verdictPanel({ question: cycle.question, askedAt: cycle.askedAt, dm1At: cycle.dm1At ?? cycle.askedAt, dm2At: cycle.dm2At, details, provisional, hold }),
				display: true,
				details: { consultTimestamp: details.timestamp, hold },
			},
			{ triggerTurn: false },
		);
		status(ctx);
	}

	// ── 이벤트 ──────────────────────────────────────────────────────────────

	/**
	 * 어떤 이유의 세션 시작이든 OFF. 여기가 "기본 OFF" 가 주석이 아니라 코드인 자리다(heartbeat.ts:327).
	 * 장부는 세션 엔트리에서 다시 센다 — reload·resume 이 예산을 되살리지 않는다.
	 */
	pi.on("session_start", async (_event, ctx) => {
		latest = ctx;
		boundary("session_start");
		ledger = { dmsSent: countSentDms(ctx.sessionManager.getEntries()), dropped: 0, cancelled: 0 };
		status(ctx);
	});
	pi.on("session_before_switch", async () => {
		boundary("session_before_switch");
		return {};
	});
	pi.on("session_shutdown", async () => {
		boundary("session_shutdown");
	});

	pi.on("agent_start", async (_event, ctx) => {
		latest = ctx;
	});
	pi.on("agent_end", async (event, ctx) => {
		latest = ctx;
		const last = (event.messages as unknown[]).filter((m) => (m as { role?: string }).role === "assistant").pop() as AssistantMessage | undefined;
		if (last) {
			lastAssistantText = last.content
				.filter((p) => p.type === "text")
				.map((p) => (p as { text: string }).text)
				.join("\n")
				.trim();
		}
	});

	/**
	 * 담당자 턴이 정착했다. 무장돼 있고 이 턴에 `waiting_for(glg)` 선언이 있으면 시계를 건다.
	 * `peer`/`local`/`none` 이면 기록과 상태줄뿐이다 — 멈춤 ≠ GLG 질문.
	 *
	 * **마지막 선언이 이긴다** (교차검수 조건, 2026-09-28). DM 은 오직 *방금 정착한 턴*의
	 * `glg` 선언에서만 나간다. 선언 없이 정착한 턴(형제 답·백그라운드 결과가 돌린 턴 포함)은
	 * 대기 중이던 사이클을 **접는다** — 그 질문이 아직 유효하면 코디네이터가 그 턴에서 다시
	 * 선언한다(무장 프롬프트가 매 턴 그렇게 시킨다). stale 한 질문으로 GLG 를 부르는 것보다
	 * 한 번 더 선언하는 쪽이 싸다. verdict/hold 로 끝난 사이클은 패널을 지난 것으로 표시하고 접는다.
	 */
	pi.on("agent_settled", async (_event, ctx) => {
		latest = ctx;
		if (!auto) return;
		const declared = auto.declared;
		auto.declared = null;
		if (auto.cycle) dropCycle("withdrawn", { by: declared?.kind ?? "no re-declaration in the settled turn" });
		if (!declared) {
			if (findAsk(lastAssistantText) && ctx.hasUI) {
				ctx.ui.setStatus("autopilot", ctx.ui.theme.fg("dim", 'autopilot armed · last turn looked like a question but declared nothing — waiting_for(kind:"glg") arms it'));
				return;
			}
			status(ctx);
			return;
		}
		if (declared.kind === "glg") {
			const question = declared.question?.trim() || findAsk(lastAssistantText) || lastAssistantText.slice(-QUESTION_TAIL_CHARS).trim() || "(no question text)";
			startCycle(ctx, question);
			return;
		}
		record("waiting", { kind: declared.kind, note: declared.note ?? null });
		if (ctx.hasUI && declared.kind !== "none") {
			ctx.ui.setStatus("autopilot", ctx.ui.theme.fg("dim", `autopilot armed · waiting for ${declared.kind} — no DM`));
			return;
		}
		status(ctx);
	});

	/** 무장된 세션에만 한 문단. 무장 안 됐으면 프롬프트를 건드리지 않는다. */
	pi.on("before_agent_start", async (event) => {
		if (!auto) return undefined;
		return { systemPrompt: `${event.systemPrompt}\n\n${ARMED_PROMPT}` };
	});

	/**
	 * GLG 가 말했다 — interactive 만. 시계·in-flight 전부 무효. rpc/extension 은 형제와 확장이라
	 * 시계를 멈추지 않는다: 형제가 steer 를 보냈다고 GLG 가 답한 것이 아니다.
	 * generation 은 무장 여부와 무관하게 오른다 — 꺼져 있던 동안의 말도 말이다.
	 */
	pi.on("input", async (event, ctx) => {
		latest = ctx;
		if (event.source !== "interactive") return undefined;
		generation++;
		if (!auto) return undefined;
		auto.declared = null;
		const c = auto.cycle;
		if (c) {
			ledger.cancelled++;
			record("glg-spoke", { phase: c.phase, question: c.question });
			if (ctx.hasUI && (c.phase === "verdict" || c.phase === "hold")) {
				ctx.ui.notify("autopilot: GLG is back — the provisional verdict above is now his to confirm or reject", "info");
			}
		}
		dropCycle(null);
		status(ctx);
		return undefined;
	});

	/** 상태 패널은 모델에게 안 간다. 판정 패널은 최신 하나만, 지난 것이면 머리를 달고 간다(`filterContext`). */
	pi.on("context", async (event) => ({ messages: filterContext(event.messages, invalidated) }));

	/**
	 * 코디네이터의 선언. 실행하는 것은 없다 — 이 턴이 왜 끝나는지를 적을 뿐이고, 정착할 때
	 * `agent_settled` 가 소비한다. 무장 안 된 세션에서 부르면 그렇게 말하고 아무것도 안 남긴다.
	 */
	pi.registerTool({
		name: "waiting_for",
		label: "Waiting for",
		description:
			'Declare why this turn is ending: kind="glg" (GLG must decide — give the exact question; after the armed silence he gets a DM and decision-gate leaves a provisional verdict, nothing executed), "peer" (a sibling is working — check entwurf_peers first), "local" (a background task is running — check bash_background_check first), or "none" (a question you declared no longer needs GLG). Only meaningful while /autopilot is armed.',
		promptSnippet: "Declare whether this turn ends waiting on GLG, a sibling, a background task, or nothing",
		parameters: Type.Object({
			kind: StringEnum(WAIT_KINDS, { description: "glg | peer | local | none" }),
			question: Type.Optional(Type.String({ description: 'For kind="glg": the exact question GLG must answer.' })),
			note: Type.Optional(Type.String({ description: "Optional one line: which sibling / which task / why none." })),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			latest = ctx as ExtensionContext;
			const kind = params.kind as WaitKind;
			if (!auto) {
				return { content: [{ type: "text", text: `autopilot is off — waiting_for(${kind}) noted for this turn only; nothing will be sent. A human arms it with /autopilot on.` }] };
			}
			auto.declared = { kind, question: typeof params.question === "string" ? params.question : undefined, note: typeof params.note === "string" ? params.note : undefined, at: now() };
			const what =
				kind === "glg"
					? `declared: waiting for GLG. If he stays silent ${minutes(auto.askMs)} after this turn settles, one DM goes out; ${minutes(auto.gateMs)} later decision-gate digs his axes and leaves a provisional verdict as a panel — nothing is executed on it. End the turn now.`
					: kind === "none"
						? "declared: no longer waiting for GLG. Any running autopilot cycle is withdrawn when this turn settles."
						: `declared: waiting for ${kind}. No DM will be sent for this turn.`;
			return { content: [{ type: "text", text: what }] };
		},
	});

	pi.registerCommand("autopilot", {
		description: "When a turn declares waiting_for(glg) and GLG stays silent: DM him, then let decision-gate leave a provisional verdict (nothing executed)",
		getArgumentCompletions: (prefix: string) => {
			const items = [
				{ value: "on", label: "on", description: `arm — DM after ${minutes(DEFAULT_ASK_MS)} silence, gate after ${minutes(DEFAULT_GATE_MS)} more` },
				{ value: "on 10m 20m", label: "on <ask> <gate>", description: "arm with your own intervals" },
				{ value: "off", label: "off", description: "disarm and forget the current cycle" },
				{ value: "status", label: "status", description: "show the armed intervals and the current cycle" },
			];
			const filtered = items.filter((item) => item.value.startsWith(prefix.trimStart()));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			latest = ctx;
			let command: AutopilotCommand;
			try {
				command = parseCommand(args ?? "");
			} catch (err) {
				// 사람 입력이라 사용법이 답이다.
				show(err instanceof Error ? err.message : String(err));
				return;
			}
			switch (command.type) {
				case "status":
					show(summary());
					status(ctx);
					return;
				case "off":
					off("/autopilot off");
					show("Autopilot off.");
					status(ctx);
					return;
				case "on": {
					// 다시 무장하면 진행 중이던 사이클은 접힌다(도는 consult 도 끊는다). 장부는 그대로다.
					if (auto) dropCycle("cancelled", { reason: "/autopilot on (re-armed)" });
					auto = { askMs: command.askMs, gateMs: command.gateMs, cycle: null, declared: null };
					record("armed", { askMs: auto.askMs, gateMs: auto.gateMs });
					show(summary());
					status(ctx);
					return;
				}
			}
		},
	});
}
