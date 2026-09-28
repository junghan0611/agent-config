/**
 * [DEMO] autopilot → decision-gate 다리 한 판 — 사람이 눈으로 보는 결정적 통합 판.
 *
 *   ./run.sh demo:autopilot            # 몇 초, 텔레그램 0 · 모델 0 · 유료 API 0
 *   bun run pi-extensions/tests/autopilot.demo.ts [--quiet]
 *
 * GLG 2026-09-28: 익스텐션이 연결은 되었다는 것을 dummy 호출로라도 보이게 — 이 시나리오가
 * 버려지지 않았다는 것을 나중에 읽는 사람이 볼 수 있게.
 *
 * 무엇이 **실물**이고 무엇이 **가짜**인가 — 이 구분이 이 파일의 전부다.
 *   실물: `autopilot.ts` 의 상태기계 전부, `decision-gate.ts` 의 `runConsult`(모델 선택 →
 *         사이드 세션 → dig 도구 → 영수증 조립), context 필터. 두 번째 상태기계는 없다.
 *   가짜: 시계(10m/20m 를 건너뛴다), DM 발신(실물 dm.sh 를 `--dry-run` 으로만 — 텔레그램 0),
 *         사이드 세션(`createAgentSession` 스텁 — 모델 호출 0), 모델 레지스트리(`demo/stub-sibling`
 *         하나), dig 이 부를 스킬 경로(없는 자리 → ENOENT, semantic-memory·임베딩 호출 0),
 *         세션(메모리 배열 — 실제 pi 세션 JSONL 에 아무것도 안 쓴다).
 *
 * 그래서 결과는 **hold** 다. 잠정 판단이 서려면 진짜 dig 히트가 인용돼야 하고, 가짜 히트로
 * verdict 를 만들면 권한 없는 판정을 연출하는 것이 된다. verdict 경로는 `autopilot.test.ts` 가 잰다.
 *
 * 이 파일은 `pi-extensions/tests/` 에 있어서 `run.sh setup` 의 `pi-extensions/*.ts` 링크에
 * 안 잡힌다 — pi 확장으로 실리지 않는다. 영수증은 stdout 에만 나간다: andenken 수확이 이것을
 * 진짜 consult 증거로 읽을 길이 없다.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const quiet = process.argv.includes("--quiet");
const say = (s = ""): void => {
	if (!quiet) console.log(s);
};
const indent = (s: string): string => s.split("\n").map((l) => `    │ ${l}`).join("\n");

const dir = mkdtempSync(join(tmpdir(), "autopilot-demo-"));
const STUB = `
const parseJsonWithRepair = (s) => JSON.parse(s);
const StringEnum = (values, options) => ({ type: "string", enum: [...values], ...options });
const createAgentSession = async (options) => {
	const stub = globalThis.__decisionGateStubs?.createAgentSession;
	if (!stub) throw new Error("[DEMO] no stub side session installed — refusing to create a real one");
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
for (const name of ["decision-gate.ts", "autopilot.ts"]) {
	const src = readFileSync(new URL(`../${name}`, import.meta.url).pathname, "utf8")
		.replace(/^import \{[^}]*\} from "@earendil-works\/pi-ai";$/m, "")
		.replace(/^import \{[^}]*\} from "@earendil-works\/pi-coding-agent";$/m, "")
		.replace(/^import \{ Type \} from "typebox";$/m, "");
	writeFileSync(join(dir, name), STUB + src);
}
const ap = await import(join(dir, "autopilot.ts"));
const dg = await import(join(dir, "decision-gate.ts"));

// ── 가짜 경계들 ───────────────────────────────────────────────────────────
const DEMO_MODEL = { provider: "demo", id: "stub-sibling" };
process.env.DECISION_GATE_MODELS = `${DEMO_MODEL.provider}/${DEMO_MODEL.id}`;
// dig 이 부를 스킬 경로는 없는 자리 — ENOENT, semantic-memory·임베딩 호출 0.
process.env.AGENT_CONFIG_SKILLS_DIR = join(dir, "no-skills-here");
/** 확장이 지은 argv 의 dm.sh 자리를 이 리포의 실물 dm.sh 로 되짚는다(스킬 경로를 위에서 비웠으므로). */
const REPO_DM = new URL("../../skills/dm/scripts/dm.sh", import.meta.url).pathname;

let sideSessions = 0;
let sidePrompt = "";
(globalThis as Record<string, unknown>).__decisionGateStubs = {
	createAgentSession: async (options: { customTools: Array<{ execute: Function }> }) => {
		sideSessions++;
		const messages: unknown[] = [];
		return {
			session: {
				state: { messages },
				prompt: async (text: string) => {
					sidePrompt = text;
					// 실물 dig 도구를 한 번 부른다 — 다리가 도구까지 닿는다는 것. 스킬 경로가 없어 ENOENT 로 끝난다.
					await options.customTools[0].execute("demo-dig", { axis: "sessions", query: "[DEMO] push or wait" }, undefined, undefined, {});
					messages.push({
						role: "assistant",
						content: [
							{
								type: "text",
								text: '[DEMO stub sibling — no model was called] The only dig failed (no skills dir), so GLG\'s axes were not read.\nPROVISIONAL: none\n```json\n{"kind":"inference","cited":[]}\n```',
							},
						],
					});
				},
				abort: async () => {},
				dispose: () => {},
			},
		};
	},
};

type Entry = { type: "custom"; customType: string; data: Record<string, unknown> };
const entries: Entry[] = [];
const sent: Array<{ msg: Record<string, unknown>; opts: Record<string, unknown> }> = [];
const handlers = new Map<string, Function>();
const tools = new Map<string, { execute: Function }>();
const commands = new Map<string, { handler: Function }>();
const dmCalls: Array<{ argv: string[]; body: string; dryRun: string; status: number | null }> = [];
const timers: Array<{ fn: () => void; ms: number; done: boolean }> = [];
const T0 = Date.UTC(2026, 8, 28, 9, 0, 0); // 18:00 KST
let clock = T0;

const pi = {
	on: (e: string, h: Function) => handlers.set(e, h),
	registerTool: (t: { name: string; execute: Function }) => tools.set(t.name, t),
	registerCommand: (n: string, c: { handler: Function }) => commands.set(n, c),
	appendEntry: (customType: string, data: Record<string, unknown>) => entries.push({ type: "custom", customType, data }),
	sendMessage: (msg: Record<string, unknown>, opts: Record<string, unknown>) => sent.push({ msg, opts }),
};
const ctx = {
	hasUI: false,
	model: { provider: "anthropic", id: "claude-opus-5" },
	modelRegistry: { getAvailable: () => [DEMO_MODEL], hasConfiguredAuth: () => true, getApiKeyAndHeaders: async () => ({ ok: true }) },
	isIdle: () => true,
	hasPendingMessages: () => false,
	sessionManager: { getEntries: () => entries, getBranch: () => entries, getSessionId: () => "demo-session" },
	ui: { notify: () => {} },
};

ap.default(pi, {
	now: () => clock,
	schedule: (fn: () => void, ms: number) => {
		const t = { fn, ms, done: false };
		timers.push(t);
		return t;
	},
	cancel: (t: { done: boolean }) => (t.done = true),
	// 실물 dm.sh 를 **--dry-run 으로만** 부른다 — 그 스크립트는 토큰을 읽기 전에 완성된 메시지를
	// 출력하고 exit 0 한다(skills/dm/scripts/dm.sh 의 DRY_RUN 분기). 텔레그램 0.
	dm: async (argv: string[], body: string) => {
		if (!argv[0]?.endsWith("/dm/scripts/dm.sh")) throw new Error(`[DEMO] unexpected DM argv: ${argv.join(" ")}`);
		const run = Bun.spawnSync([REPO_DM, ...argv.slice(1), "--dry-run", "--machine", "demo"], { stdin: Buffer.from(body) });
		const stdout = run.stdout.toString();
		dmCalls.push({ argv, body, dryRun: stdout, status: run.exitCode });
		return { status: run.exitCode, stdout: `[DEMO dry-run] ${stdout}`, stderr: run.stderr.toString() };
	},
	// consult 는 일부러 안 갈아 끼운다 — 실물 runConsult 가 도는 것이 이 판의 요점이다.
});

const flush = async (): Promise<void> => {
	for (let i = 0; i < 20; i++) await Promise.resolve();
	await new Promise((r) => setTimeout(r, 0));
};
const kst = (ms: number): string => new Date(ms + 9 * 3_600_000).toISOString().slice(11, 16);
async function silence(label: string): Promise<void> {
	const t = timers.filter((x) => !x.done).pop();
	if (!t) throw new Error(`[DEMO] expected a running clock before "${label}"`);
	t.done = true;
	clock += t.ms;
	say(`\n  ⏱  ${kst(clock)} KST — ${label} (GLG silent ${Math.round((clock - T0) / 60_000)}m, simulated)`);
	t.fn();
	await flush();
}

// ── 판 ───────────────────────────────────────────────────────────────────
const QUESTION = "[DEMO] push the autopilot pilot now, or wait for the live-test approval?";
say("════ [DEMO] autopilot → decision-gate bridge — not evidence, not GLG's answer ════");
say("  real: autopilot.ts state machine · decision-gate runConsult · context filter");
say("  fake: clock · DM send (real dm.sh --dry-run) · side session (no model) · registry demo/stub-sibling · in-memory session");

await handlers.get("session_start")!({ type: "session_start" }, ctx);
say(`\n  ${kst(clock)} KST — operator: /autopilot on`);
await commands.get("autopilot")!.handler("on", ctx);
say(`  ${kst(clock)} KST — coordinator: waiting_for(kind:"glg", question:"${QUESTION}")`);
await tools.get("waiting_for")!.execute("demo", { kind: "glg", question: QUESTION }, undefined, undefined, ctx);
await handlers.get("agent_end")!({ messages: [{ role: "assistant", content: [{ type: "text", text: `Tests are green. ${QUESTION}` }] }] }, ctx);
await handlers.get("agent_settled")!({ type: "agent_settled" }, ctx);
say(`  ${kst(clock)} KST — turn settled · clock armed for ${timers.at(-1)!.ms / 60_000}m`);

await silence("ask interval elapsed → DM #1");
say(`    DM #1 via skills/dm/scripts/dm.sh ${dmCalls[0]?.argv.slice(1).join(" ")} --dry-run → exit ${dmCalls[0]?.status} (NOT sent)`);
say(indent(dmCalls[0]?.dryRun.trimEnd() ?? "(none)"));

await silence("gate interval elapsed → decision-gate runConsult");
const receipt = entries.find((e) => e.customType === dg.CONSULT_ENTRY_TYPE)?.data as
	| { trigger: { kind: string; question: string }; model: { provider: string; id: string } | null; outcome: string; digs: Array<{ axis: string; error?: string }>; answer: { kind: string; citedHitIds: string[] } }
	| undefined;
say(`    side session created: ${sideSessions} (stub) · prompt carries the question: ${sidePrompt.includes(QUESTION)}`);
if (receipt) {
	say(`    consult receipt: trigger=${receipt.trigger.kind} · model=${receipt.model?.provider}/${receipt.model?.id} · outcome=${receipt.outcome} · evidence=${receipt.answer.kind} · cited=${receipt.answer.citedHitIds.length}`);
	for (const d of receipt.digs) say(`    dig ${d.axis}: ${(d.error ?? "ok").split("\n")[0]}`);
}
say(`    DM #2 via dm.sh --dry-run → exit ${dmCalls[1]?.status} (NOT sent):`);
say(indent(dmCalls[1]?.dryRun.trimEnd() ?? "(none)"));
const panel = sent.find((s) => s.msg.customType === ap.VERDICT_MESSAGE_TYPE);
say(`    panel left in session (triggerTurn:${panel?.opts.triggerTurn}):`);
say(indent(String(panel?.msg.content ?? "(none)")));

clock += 5 * 60_000;
say(`\n  ${kst(clock)} KST — GLG types in the session (interactive input)`);
await handlers.get("input")!({ type: "input", text: "기다려", source: "interactive" }, ctx);
const ctxOut = (await handlers.get("context")!({ messages: [{ role: "custom", ...panel?.msg }, { role: "user", content: "기다려" }] })).messages;
say("    the same panel as the model now sees it:");
say(indent(String(ctxOut[0]?.content ?? "").split("\n").slice(0, 2).join("\n")));

const events = entries.filter((e) => e.customType === ap.AUTOPILOT_ENTRY_TYPE).map((e) => e.data.event);
say(`\n  autopilot entries: ${events.join(" → ")}`);

// ── 단언 — 데모이자 통합 판 ─────────────────────────────────────────────
const failures: string[] = [];
const must = (ok: boolean, what: string): void => {
	if (!ok) failures.push(what);
};
must(dmCalls.length === 2, "exactly two DMs were attempted, both as dm.sh --dry-run");
must(dmCalls.every((c) => c.status === 0 && c.dryRun.startsWith("DM demo ") && c.dryRun.includes("pi/claude-opus-5")), "the real dm.sh composed both messages in dry-run");
must(dmCalls.every((c) => c.argv.includes("--stdin") && c.argv.includes("pi/claude-opus-5")), "DM argv is dm.sh --as pi/<model> --stdin");
must(sideSessions === 1, "exactly one stub side session");
must(receipt?.trigger.kind === "autopilot" && receipt.trigger.question === QUESTION, "consult receipt carries the autopilot trigger");
must(receipt?.model?.provider === "demo", "consult receipt names the demo model, not a real rail");
must(receipt?.outcome === "ok" && receipt.answer.citedHitIds.length === 0, "consult ran and cited nothing");
must((receipt?.digs ?? []).length === 1 && !!receipt?.digs[0].error, "the one dig reached the real dig tool and failed closed");
must(sent.every((s) => s.opts.triggerTurn === false), "nothing this extension sent triggers a turn");
must(!handlers.has("tool_call"), "no tool_call hook");
must(String(panel?.msg.content).startsWith("[autopilot verdict — advisory only"), "panel opens with its lack of authority");
must(String(panel?.msg.content).includes("did not reach a provisional answer"), "the honest outcome is a hold");
must(String(ctxOut[0]?.content).startsWith(ap.HISTORICAL_HEADER), "after GLG spoke the panel is labeled historical");
must(JSON.stringify(events) === JSON.stringify(["armed", "asked", "dm1", "hold", "glg-spoke"]), `event sequence (${events.join(",")})`);

say("");
if (failures.length) {
	for (const f of failures) console.log(`  FAIL ${f}`);
	console.log(`\n[DEMO] ${failures.length} failure(s)`);
	process.exit(1);
}
console.log(`[DEMO] bridge exercised — 14 invariants hold · 0 Telegram · 0 model calls · 0 session files written`);
