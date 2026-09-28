/**
 * autopilot 회귀 — 침묵 → DM → consult → 패널, 그리고 **실행 0** 계약.
 *
 *   bun run pi-extensions/tests/autopilot.test.ts
 *   ./run.sh test:autopilot
 *
 * 실물 DM 도 유료 consult 도 없다. 시계·DM·consult 는 `AutopilotDeps` 이음매로 갈아
 * 끼우고, 한 판만 `decision-gate.ts` 의 실물 `runConsult` 를 스텁 사이드 세션으로 태운다
 * (그 판도 `createAgentSession` 스텁이라 모델을 부르지 않는다). 확장은
 * `@earendil-works/*` 를 static import 하므로 decision-gate.test.ts 와 같은 방법 —
 * import 줄만 스텁으로 바꾼 임시 복사본 둘(autopilot + decision-gate)을 같은 디렉터리에
 * 두고 불러온다. 로직은 원본 그대로다.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "autopilot-"));

const STUB = `
const parseJsonWithRepair = (s) => JSON.parse(s);
const StringEnum = (values, options) => ({ type: "string", enum: [...values], ...options });
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

function patch(name: string): void {
	const src = readFileSync(new URL(`../${name}`, import.meta.url).pathname, "utf8")
		.replace(/^import \{[^}]*\} from "@earendil-works\/pi-ai";$/m, "")
		.replace(/^import \{[^}]*\} from "@earendil-works\/pi-coding-agent";$/m, "")
		.replace(/^import \{ Type \} from "typebox";$/m, "");
	writeFileSync(join(dir, name), STUB + src);
}
patch("decision-gate.ts");
patch("autopilot.ts");

const mod = await import(join(dir, "autopilot.ts"));
const dg = await import(join(dir, "decision-gate.ts"));
const {
	default: autopilot,
	parseCommand,
	parseDuration,
	findAsk,
	parseProvisional,
	holdReason,
	filterContext,
	markHistorical,
	countSentDms,
	buildDmArgv,
	HISTORICAL_HEADER,
	ARMED_PROMPT,
	AUTOPILOT_ENTRY_TYPE,
	VERDICT_MESSAGE_TYPE,
	MAX_DMS_PER_SESSION,
	DEFAULT_ASK_MS,
	DEFAULT_GATE_MS,
} = mod;
const { CONSULT_ENTRY_TYPE, buildConsultDetails } = dg;

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
	if (ok) console.log(`  ok   ${name}`);
	else {
		failures++;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

// ── 순수 함수 ─────────────────────────────────────────────────────────────
console.log("pure — parsing, question tail, verdict gate");

check("default intervals are 10m and 20m", (() => { const c = parseCommand("on"); return c.type === "on" && c.askMs === DEFAULT_ASK_MS && c.gateMs === DEFAULT_GATE_MS && DEFAULT_ASK_MS === 600_000 && DEFAULT_GATE_MS === 1_200_000; })());
check("positional intervals", (() => { const c = parseCommand("/autopilot on 2m 3m"); return c.type === "on" && c.askMs === 120_000 && c.gateMs === 180_000; })());
check("flag intervals", (() => { const c = parseCommand("on --ask 5m --gate=1h"); return c.type === "on" && c.askMs === 300_000 && c.gateMs === 3_600_000; })());
check("empty is status, off/stop are off", parseCommand("").type === "status" && parseCommand("off").type === "off" && parseCommand("stop").type === "off");
check("a sub-minute interval is refused", (() => { try { parseDuration("30s"); return false; } catch { return true; } })());
check("junk is refused with usage", (() => { try { parseCommand("maybe"); return false; } catch (e) { return String(e).includes("Usage"); } })());
check("findAsk returns the asking paragraph and what follows", findAsk("did X.\n\nShould I push now?\n\n- a\n- b") === "Should I push now?\n\n- a\n- b");
check("findAsk ignores heartbeat silence", findAsk("HEARTBEAT_OK") === null);
check("findAsk does not fire on a report", findAsk("GLG, 끝났습니다. 테스트 초록.") === null);
check("PROVISIONAL line parsed, last wins", parseProvisional("PROVISIONAL: a\nPROVISIONAL: wait for CI") === "wait for CI");
check("PROVISIONAL: none is no answer", parseProvisional("PROVISIONAL: none") === null);

function details(over: Partial<{ outcome: string; text: string; cited: string[]; digs: unknown[]; ts: number }> = {}) {
	const d = buildConsultDetails({
		trigger: { kind: "autopilot", question: "q", objective: "o", sessionId: "s", askedAt: 0 },
		model: { provider: "zai", id: "glm-5.3" },
		outcome: (over.outcome ?? "ok") as "ok",
		resident: null,
		modelSource: "default",
		digs: (over.digs ?? [{ axis: "sessions", query: "q", hits: [{ label: "sessions#1", id: "hit-1" }] }]) as never,
		budget: { max: 24, spawned: 1, refused: 0 },
		deadlineMs: 480_000,
		deadlineHit: false,
		text: over.text ?? 'GLG said wait.\nPROVISIONAL: wait for CI\n```json\n{"kind":"quote","cited":["sessions#1"]}\n```',
		verdict: { kind: "quote", citedLabels: over.cited ?? ["sessions#1"] },
		now: over.ts ?? 1000,
	});
	return d;
}
check("an ok, cited, provisional consult opens a verdict", holdReason(details()) === null);
check("an uncited provisional holds", (holdReason(details({ cited: [] })) ?? "").includes("cites no"));
check("PROVISIONAL: none holds", (holdReason(details({ text: "PROVISIONAL: none" })) ?? "").includes("none"));
check("a failed consult holds", (holdReason(details({ outcome: "deadline" })) ?? "").startsWith("consult deadline"));
check("dm argv is dm.sh --as <id> --stdin — body never on argv", (() => { const a = buildDmArgv("pi/x"); return a[0].endsWith("skills/dm/scripts/dm.sh") && a.slice(1).join(" ") === "--as pi/x --stdin"; })());

// ── 컨텍스트 필터 ─────────────────────────────────────────────────────────
console.log("context — status panels never reach the model; stale verdicts are labeled, not deleted");
const ui = { role: "custom", customType: "autopilot-ui", content: "status" };
const v1 = { role: "custom", customType: VERDICT_MESSAGE_TYPE, content: "old", details: { consultTimestamp: 1 } };
const v2 = { role: "custom", customType: VERDICT_MESSAGE_TYPE, content: "new", details: { consultTimestamp: 2 } };
const asst = { role: "assistant", content: [] };
const user = { role: "user", content: "그대로 해" };
{
	const out = filterContext([ui, v1, asst, v2], new Set());
	check("ui panel dropped, only the latest verdict kept", out.length === 2 && out[1] === v2);
	check("a current verdict is passed as-is", out[1].content === "new");
	const after = filterContext([v2, user], new Set());
	check("GLG speaking after the verdict keeps it, labeled historical", after.length === 2 && String(after[0].content).startsWith(HISTORICAL_HEADER) && String(after[0].content).endsWith("new"));
	check("the original message object is not mutated", v2.content === "new");
	const inv = filterContext([asst, v2], new Set([2]));
	check("a withdrawn verdict (invalidated ts) is labeled too", String(inv[1].content).startsWith(HISTORICAL_HEADER));
	check("labeling is idempotent", markHistorical(markHistorical("x")) === `${HISTORICAL_HEADER}\nx`);
	check("array content gets a header part", (markHistorical([{ type: "text", text: "x" }]) as Array<{ text: string }>)[0].text === HISTORICAL_HEADER);
}

// ── 하네스 ───────────────────────────────────────────────────────────────
type Entry = { type: "custom"; customType: string; data: Record<string, unknown> };
type Timer = { fn: () => void; ms: number; cancelled: boolean };

function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}
const flush = async (): Promise<void> => {
	for (let i = 0; i < 20; i++) await Promise.resolve();
	await new Promise((r) => setTimeout(r, 0));
};

function harness(opts: { entries?: Entry[]; consult?: (pi: unknown, ctx: unknown, req: Record<string, unknown>) => Promise<unknown>; dm?: (argv: string[], body: string) => Promise<{ status: number | null; stdout: string; stderr: string; error?: string }> } = {}) {
	const handlers = new Map<string, Function>();
	const tools = new Map<string, { execute: Function }>();
	const commands = new Map<string, { handler: Function }>();
	const entries: Entry[] = opts.entries ?? [];
	const sent: Array<{ msg: Record<string, unknown>; opts: Record<string, unknown> }> = [];
	const timers: Timer[] = [];
	const dms: Array<{ argv: string[]; body: string }> = [];
	const consults: Array<Record<string, unknown>> = [];
	let clock = 1_000_000;
	const state = { idle: true, pending: false };
	const statusLine: { text?: string } = {};

	const pi = {
		on: (e: string, h: Function) => handlers.set(e, h),
		registerTool: (t: { name: string; execute: Function }) => tools.set(t.name, t),
		registerCommand: (n: string, c: { handler: Function }) => commands.set(n, c),
		appendEntry: (customType: string, data: Record<string, unknown>) => entries.push({ type: "custom", customType, data }),
		sendMessage: (msg: Record<string, unknown>, o: Record<string, unknown>) => sent.push({ msg, opts: o }),
	};
	const ctx = {
		hasUI: true,
		model: { provider: "anthropic", id: "claude-opus-5" },
		modelRegistry: {},
		isIdle: () => state.idle,
		hasPendingMessages: () => state.pending,
		sessionManager: { getEntries: () => entries, getBranch: () => entries, getSessionId: () => "sess-ap" },
		ui: { setStatus: (_k: string, t?: string) => (statusLine.text = t), notify: () => {}, theme: { fg: (_c: string, t: string) => t } },
	};
	autopilot(pi, {
		now: () => clock,
		schedule: (fn: () => void, ms: number) => {
			const t = { fn, ms, cancelled: false };
			timers.push(t);
			return t;
		},
		cancel: (h: Timer) => (h.cancelled = true),
		dm:
			opts.dm ??
			(async (argv: string[], body: string) => {
				dms.push({ argv, body });
				return { status: 0, stdout: `messageId=${dms.length}`, stderr: "" };
			}),
		consult:
			opts.consult ??
			(async (_pi: unknown, _ctx: unknown, req: Record<string, unknown>) => {
				consults.push(req);
				return details({ ts: clock });
			}),
	});
	const live = (): Timer[] => timers.filter((t) => !t.cancelled);
	const h = {
		handlers, tools, commands, entries, sent, timers, dms, consults, state, ctx, statusLine,
		advance: (ms: number) => (clock += ms),
		events: () => entries.filter((e) => e.customType === AUTOPILOT_ENTRY_TYPE).map((e) => e.data.event),
		live,
		/** 가장 최근의 살아 있는 시계를 울린다. */
		fire: async (): Promise<Timer> => {
			const t = live().pop()!;
			t.cancelled = true;
			clock += t.ms;
			t.fn();
			await flush();
			return t;
		},
		start: async () => handlers.get("session_start")!({ type: "session_start" }, ctx),
		cmd: async (args: string) => commands.get("autopilot")!.handler(args, ctx),
		declare: async (kind: string, question?: string) => tools.get("waiting_for")!.execute("t", { kind, question }, undefined, undefined, ctx),
		settle: async (text = "") => {
			await handlers.get("agent_end")!({ messages: [{ role: "assistant", content: [{ type: "text", text }] }] }, ctx);
			await handlers.get("agent_settled")!({ type: "agent_settled" }, ctx);
		},
		input: async (source = "interactive") => handlers.get("input")!({ type: "input", text: "hi", source }, ctx),
		/** 한 사이클을 DM#1 까지. */
		askCycle: async (q = "push or wait?") => {
			await h.declare("glg", q);
			await h.settle(`Done. ${q}`);
			await h.fire();
		},
	};
	return h;
}

// ── 기본 OFF ─────────────────────────────────────────────────────────────
console.log("default off — every pi session loads this file");
{
	const h = harness();
	await h.start();
	const r = await h.declare("glg", "q?");
	check("waiting_for while off says so and records nothing", String(r.content[0].text).includes("autopilot is off") && h.entries.length === 0);
	await h.settle("Should I push?");
	check("a settled question while off arms no clock", h.timers.length === 0 && h.dms.length === 0);
	check("the system prompt is untouched while off", (await h.handlers.get("before_agent_start")!({ systemPrompt: "S" })) === undefined);
	check("no tool_call hook exists — nothing is gated or executed", !h.handlers.has("tool_call"));
	check("waiting_for is the only tool", [...h.tools.keys()].join() === "waiting_for");
}

// ── 선언이 무장한다, 모양은 아니다 ─────────────────────────────────────────
console.log("declaration arms the clock; a question shape does not");
{
	const h = harness();
	await h.start();
	await h.cmd("on");
	check("arming records the intervals", h.events().includes("armed"));
	check("armed sessions get the declaration paragraph", ((await h.handlers.get("before_agent_start")!({ systemPrompt: "S" })) as { systemPrompt: string }).systemPrompt === `S\n\n${ARMED_PROMPT}`);
	await h.settle("Which one should I pick?");
	check("an undeclared question only hints", h.timers.length === 0 && (h.statusLine.text ?? "").includes("declared nothing"));
	for (const k of ["peer", "local", "none"]) {
		await h.declare(k);
		await h.settle("Should I push?");
	}
	check("peer / local / none arm nothing and send nothing", h.timers.length === 0 && h.dms.length === 0);
	check("they are recorded as waiting", h.events().filter((e) => e === "waiting").length === 3);
	await h.declare("glg", "push now or wait for CI?");
	await h.settle("Done.");
	check("only a glg declaration on the settled turn starts the clock", h.live().length === 1 && h.live()[0].ms === DEFAULT_ASK_MS);
	check("the declared question is the cycle's question", h.entries.at(-1)!.data.question === "push now or wait for CI?");
}

// ── 한 사이클 전체 ───────────────────────────────────────────────────────
console.log("full cycle — DM #1, gate, consult, DM #2, panel; nothing executed");
{
	const h = harness();
	await h.start();
	await h.cmd("on");
	await h.askCycle("push now or wait for CI?");
	check("DM #1 goes out after the ask interval", h.dms.length === 1);
	check("DM #1 names the question and says it will not proceed", h.dms[0].body.includes("Q: push now or wait for CI?") && h.dms[0].body.includes("진행은 하지 않습니다"));
	check("DM #1 is sent as pi/<resident model>", h.dms[0].argv.includes("pi/claude-opus-5"));
	check("the gate clock is armed for the gate interval", h.live().length === 1 && h.live()[0].ms === DEFAULT_GATE_MS);
	check("no consult before the gate", h.consults.length === 0);
	await h.fire();
	check("the gate runs exactly one consult", h.consults.length === 1);
	const trig = h.consults[0].trigger as Record<string, unknown>;
	check("the consult carries an autopilot trigger with the question", trig.kind === "autopilot" && trig.question === "push now or wait for CI?");
	check("the consult is cancellable", h.consults[0].signal instanceof AbortSignal);
	check("DM #2 carries the provisional answer", h.dms.length === 2 && h.dms[1].body.includes("잠정: wait for CI") && h.dms[1].body.includes("진행 안 함"));
	const panel = h.sent.find((s) => s.msg.customType === VERDICT_MESSAGE_TYPE)!;
	check("a verdict panel is left", !!panel);
	check("the panel never triggers a turn", panel.opts.triggerTurn === false);
	check("the panel opens with its lack of authority", String(panel.msg.content).startsWith("[autopilot verdict — advisory only"));
	check("every message this extension sends is triggerTurn:false", h.sent.every((s) => s.opts.triggerTurn === false));
	check("the verdict entry records the DM", h.entries.some((e) => e.data.event === "verdict" && e.data.dmSent === true));
	check("no clock is left running after the verdict", h.live().length === 0);
}

// ── hold 경로 ─────────────────────────────────────────────────────────────
console.log("hold — no grounds, no provisional answer");
{
	const h = harness({ consult: async () => details({ cited: [] }) });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	await h.fire();
	check("an uncited consult sends a hold DM, not a verdict", h.dms.length === 2 && h.dms[1].body.includes("근거 부족"));
	const panel = String(h.sent.find((s) => s.msg.customType === VERDICT_MESSAGE_TYPE)!.msg.content);
	check("the hold panel tells the resident not to proceed", panel.includes("Do not proceed"));
}

// ── DM #1 실패 ───────────────────────────────────────────────────────────
console.log("DM #1 failure — an unasked silence never opens the gate");
{
	const h = harness({ dm: async () => ({ status: 5, stdout: "", stderr: "delivery failed" }) });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	check("DM #1 failure is recorded", h.events().includes("dm1-failed"));
	check("no gate clock after a failed DM #1", h.live().length === 0);
	check("no consult after a failed DM #1", h.consults.length === 0);
	check("a failed DM does not spend the budget", countSentDms(h.entries) === 0);
}

{
	const h = harness({ dm: async () => { throw new Error("spawn EACCES"); } });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	const f = h.entries.find((e) => e.data.event === "dm1-failed");
	check("a rejecting DM runner fails closed as dm1-failed", !!f && String(f.data.error).includes("spawn EACCES"));
	check("and opens no gate", h.live().length === 0 && h.consults.length === 0);
}
{
	let n = 0;
	const h = harness({ dm: async () => { if (++n === 2) throw new Error("boom"); return { status: 0, stdout: "", stderr: "" }; } });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	await h.fire();
	const v = h.entries.find((e) => e.data.event === "verdict");
	check("a rejecting DM #2 still leaves the panel, recorded as not sent", !!v && v.data.dmSent === false && h.sent.some((s) => s.msg.customType === VERDICT_MESSAGE_TYPE));
	check("the ledger counts only the delivered DM", countSentDms(h.entries) === 1);
}

// ── 취소 ─────────────────────────────────────────────────────────────────
console.log("cancellation — GLG input, re-declaration rules");
{
	const h = harness();
	await h.start();
	await h.cmd("on");
	await h.declare("glg", "q1?");
	await h.settle();
	const askTimer = h.live()[0];
	await h.input("rpc");
	check("a sibling's rpc input is not GLG — the clock keeps running", !askTimer.cancelled);
	await h.input("extension");
	check("extension input is not GLG either", !askTimer.cancelled);
	await h.input("interactive");
	check("GLG's interactive input cancels the clock", askTimer.cancelled);
	check("and records that GLG spoke", h.events().includes("glg-spoke"));
	askTimer.fn();
	await flush();
	check("a timer that fires anyway after GLG spoke sends nothing", h.dms.length === 0);

	await h.declare("glg", "q2?");
	await h.settle();
	await h.settle("background result arrived");
	check("a later settled turn with no re-declaration withdraws the cycle", h.live().length === 0 && h.events().at(-1) === "withdrawn");

	for (const k of ["none", "peer", "local"]) {
		await h.declare("glg", "q3?");
		await h.settle();
		await h.declare(k);
		await h.settle();
		check(`a later ${k} declaration withdraws the cycle`, h.live().length === 0 && h.entries.some((e) => e.data.event === "withdrawn" && e.data.by === k));
	}

	await h.declare("glg", "q4?");
	await h.settle();
	await h.declare("glg", "q4 revised?");
	await h.settle();
	check("a re-declared glg question restarts the clock with the new question", h.live().length === 1 && h.entries.at(-1)!.data.question === "q4 revised?");
	await h.cmd("off");
	check("/autopilot off cancels the clock", h.live().length === 0 && h.events().includes("cancelled"));
	check("the prompt paragraph is gone once off", (await h.handlers.get("before_agent_start")!({ systemPrompt: "S" })) === undefined);
}

// ── 바쁨 ─────────────────────────────────────────────────────────────────
console.log("busy — a running turn drops the tick, never stacks it");
{
	const h = harness();
	await h.start();
	await h.cmd("on");
	await h.declare("glg", "q?");
	await h.settle();
	h.state.idle = false;
	await h.fire();
	check("a busy session drops the cycle without a DM", h.dms.length === 0 && h.events().includes("dropped-busy"));
}

// ── 경합: in-flight ──────────────────────────────────────────────────────
console.log("races — in-flight DM / consult never publish after GLG spoke");
{
	// DM #1 이 나가는 중에 GLG 가 말한다.
	const d = deferred<{ status: number; stdout: string; stderr: string }>();
	let calls = 0;
	const h = harness({ dm: async () => (calls++, d.promise) });
	await h.start();
	await h.cmd("on");
	await h.declare("glg", "q?");
	await h.settle();
	const t = h.live()[0];
	t.cancelled = true;
	t.fn();
	await flush();
	check("DM #1 is in flight", calls === 1);
	await h.input();
	d.resolve({ status: 0, stdout: "", stderr: "" });
	await flush();
	check("a DM #1 that returns after GLG spoke arms no gate", h.live().length === 0 && h.events().includes("dm1-stale"));
	check("but the DM that did go out is on the ledger", countSentDms(h.entries) === 1);
}
{
	// consult 가 도는 중에 GLG 가 말한다.
	const d = deferred<unknown>();
	let signal: AbortSignal | undefined;
	const h = harness({ consult: async (_p, _c, req) => ((signal = req.signal as AbortSignal), d.promise) });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	const gate = h.live()[0];
	gate.cancelled = true;
	gate.fn();
	await flush();
	check("the consult is in flight", !!signal && !signal.aborted);
	await h.input();
	check("GLG's input aborts the running consult", signal!.aborted);
	d.resolve(details());
	await flush();
	check("a consult that returns after GLG spoke sends no DM #2", h.dms.length === 1);
	check("and leaves no panel", !h.sent.some((s) => s.msg.customType === VERDICT_MESSAGE_TYPE));
	check("it is recorded as stale", h.events().includes("consult-stale"));
}
{
	// DM #2 가 나가는 중에 GLG 가 말한다.
	const d = deferred<{ status: number; stdout: string; stderr: string }>();
	let n = 0;
	const h = harness({ dm: async () => (++n === 2 ? d.promise : { status: 0, stdout: "", stderr: "" }) });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	const gate = h.live()[0];
	gate.cancelled = true;
	gate.fn();
	await flush();
	check("DM #2 is in flight", n === 2);
	await h.input();
	d.resolve({ status: 0, stdout: "", stderr: "" });
	await flush();
	check("a DM #2 that returns after GLG spoke leaves no panel", !h.sent.some((s) => s.msg.customType === VERDICT_MESSAGE_TYPE) && h.events().includes("verdict-stale"));
	check("both delivered DMs are on the ledger", countSentDms(h.entries) === 2);
}
{
	// /autopilot on 으로 재무장하면 도는 consult 도 끊긴다.
	let signal: AbortSignal | undefined;
	const d = deferred<unknown>();
	const h = harness({ consult: async (_p, _c, req) => ((signal = req.signal as AbortSignal), d.promise) });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	const gate = h.live()[0];
	gate.cancelled = true;
	gate.fn();
	await flush();
	await h.cmd("on 5m 5m");
	check("re-arming aborts the running consult", signal!.aborted);
	d.resolve(details());
	await flush();
	check("and its result publishes nothing", h.dms.length === 1 && !h.sent.some((s) => s.msg.customType === VERDICT_MESSAGE_TYPE));
}

// ── 예산 ─────────────────────────────────────────────────────────────────
console.log("budgets — per session, not per arm");
{
	const h = harness();
	await h.start();
	await h.cmd("on");
	await h.askCycle("a?");
	await h.fire(); // DM 2
	await h.cmd("off");
	await h.cmd("on");
	await h.askCycle("b?");
	check("off → on does not refill the DM budget", countSentDms(h.entries) === 3);
	await h.fire(); // DM 4
	check("two full cycles spend the 4 DMs", h.dms.length === MAX_DMS_PER_SESSION && MAX_DMS_PER_SESSION === 4);
	await h.input();
	await h.declare("glg", "c?");
	await h.settle();
	await h.fire();
	check("a fifth DM is refused and the cycle holds", h.dms.length === 4 && h.events().includes("budget-exhausted"));
	check("no consult without DM #1", h.consults.length === 2);
}
{
	// reload/resume — 같은 세션 엔트리로 다시 시작해도 예산은 이어진다.
	const prior: Entry[] = [1, 2, 3, 4].map((i) => ({ type: "custom", customType: AUTOPILOT_ENTRY_TYPE, data: { event: "dm1", dmSent: true, i } }));
	const h = harness({ entries: prior });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	check("a resumed session keeps its spent DM budget", h.dms.length === 0 && h.events().includes("budget-exhausted"));
}
{
	// consult 상한은 decision-gate 와 공유 — 가지에 3개면 더 없다.
	const prior: Entry[] = [1, 2, 3].map(() => ({ type: "custom", customType: CONSULT_ENTRY_TYPE, data: {} }));
	const h = harness({ entries: prior });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	await h.fire();
	check("the shared consult cap (3) holds the cycle", h.consults.length === 0 && h.events().includes("consult-budget-exhausted"));
}

// ── 세션 경계 ─────────────────────────────────────────────────────────────
console.log("session boundary — default off again; an old in-flight consult writes nothing into the new session");
{
	let signal: AbortSignal | undefined;
	const d = deferred<unknown>();
	const h = harness({ consult: async (p, _c, req) => ((signal = req.signal as AbortSignal), d.promise.then((x) => ((p as { appendEntry: Function }).appendEntry(CONSULT_ENTRY_TYPE, { late: true }), x))) });
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	const gate = h.live()[0];
	gate.cancelled = true;
	gate.fn();
	await flush();
	await h.handlers.get("session_before_switch")!({}, h.ctx);
	h.entries.length = 0; // 새 세션
	await h.start();
	check("the switch aborts the running consult", signal!.aborted);
	d.resolve(details());
	await flush();
	check("its receipt does not land in the new session", h.entries.length === 0, JSON.stringify(h.entries));
	check("no DM #2 from the old session", h.dms.length === 1);
	check("the new session starts disarmed", (await h.handlers.get("before_agent_start")!({ systemPrompt: "S" })) === undefined);
}

// ── 판정 뒤의 GLG ─────────────────────────────────────────────────────────
console.log("after the verdict — GLG's reply sees the panel labeled historical");
{
	const h = harness();
	await h.start();
	await h.cmd("on");
	await h.askCycle();
	await h.fire();
	const panel = h.sent.find((s) => s.msg.customType === VERDICT_MESSAGE_TYPE)!.msg;
	const msgs = [{ role: "custom", ...panel }];
	const before = (await h.handlers.get("context")!({ messages: msgs })).messages;
	check("before GLG speaks the panel reaches the model as-is", before[0].content === panel.content);
	await h.input();
	const after = (await h.handlers.get("context")!({ messages: msgs })).messages;
	check("after GLG spoke the same panel is labeled historical", String(after[0].content).startsWith(HISTORICAL_HEADER));
}

// ── 실물 runConsult 한 판 ─────────────────────────────────────────────────
console.log("real runConsult — stub side session, abort wired, receipt shape");
{
	let aborted = 0;
	let prompted = "";
	const release = deferred<void>();
	(globalThis as Record<string, unknown>).__decisionGateStubs = {
		createAgentSession: async () => ({
			session: {
				state: { messages: [{ role: "assistant", content: [{ type: "text", text: "PROVISIONAL: none" }] }] },
				prompt: async (t: string) => {
					prompted = t;
					await release.promise;
				},
				abort: async () => {
					aborted++;
					release.resolve();
				},
				dispose: () => {},
			},
		}),
	};
	const handlers = new Map<string, Function>();
	const commands = new Map<string, { handler: Function }>();
	const tools = new Map<string, { execute: Function }>();
	const entries: Entry[] = [];
	const timers: Timer[] = [];
	const dms: string[] = [];
	const pi = {
		on: (e: string, fn: Function) => handlers.set(e, fn),
		registerTool: (t: { name: string; execute: Function }) => tools.set(t.name, t),
		registerCommand: (n: string, c: { handler: Function }) => commands.set(n, c),
		appendEntry: (customType: string, data: Record<string, unknown>) => entries.push({ type: "custom", customType, data }),
		sendMessage: () => {},
	};
	const model = { provider: "zai", id: "glm-5.3" };
	const ctx = {
		hasUI: false,
		model: { provider: "anthropic", id: "claude-opus-5" },
		modelRegistry: { getAvailable: () => [model], hasConfiguredAuth: () => true, getApiKeyAndHeaders: async () => ({ ok: true }) },
		isIdle: () => true,
		hasPendingMessages: () => false,
		sessionManager: { getEntries: () => entries, getBranch: () => entries, getSessionId: () => "s-real" },
		ui: { notify: () => {} },
	};
	process.env.DECISION_GATE_MODELS = "zai/glm-5.3";
	autopilot(pi, {
		schedule: (fn: () => void, ms: number) => (timers.push({ fn, ms, cancelled: false }), timers.at(-1)),
		cancel: (t: Timer) => (t.cancelled = true),
		dm: async (_a: string[], b: string) => (dms.push(b), { status: 0, stdout: "", stderr: "" }),
	});
	await handlers.get("session_start")!({}, ctx);
	await commands.get("autopilot")!.handler("on", ctx);
	await tools.get("waiting_for")!.execute("t", { kind: "glg", question: "rail?" }, undefined, undefined, ctx);
	await handlers.get("agent_end")!({ messages: [{ role: "assistant", content: [{ type: "text", text: "Which rail?" }] }] }, ctx);
	await handlers.get("agent_settled")!({}, ctx);
	timers.at(-1)!.fn();
	await flush();
	timers.at(-1)!.fn();
	await flush();
	check("the real consult prompt carries the question", prompted.includes("rail?") && prompted.includes("PROVISIONAL"));
	await handlers.get("input")!({ source: "interactive", text: "wait" }, ctx);
	await flush();
	check("GLG's input aborts the real side session", aborted >= 1);
	const receipt = entries.find((e) => e.customType === CONSULT_ENTRY_TYPE)?.data as { trigger: { kind: string }; outcome: string; error?: string } | undefined;
	check("the receipt is still written, trigger autopilot", receipt?.trigger.kind === "autopilot");
	check("and it says it was cancelled", receipt?.outcome === "error" && (receipt.error ?? "").includes("cancelled"));
	check("no DM #2 after the cancelled consult", dms.length === 1);
	delete process.env.DECISION_GATE_MODELS;
}

console.log(failures === 0 ? "\nall green" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
