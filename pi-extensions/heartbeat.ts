/**
 * Heartbeat Extension
 *
 * A session-lifetime clock. `/heartbeat 10m` arms it; the timer then wakes this
 * same session and runs one turn with a standing instruction: look up the
 * memory and time axes for grounds, record them, take one step — and only then,
 * if there is nothing to do, go quiet.
 *
 * That order is the whole point. The clock is the cheap half; every harness has
 * one. What GLG refuses in the autopilot/"proceed if no answer" features of
 * other harnesses is not the clock but proceeding with no grounds — "왜 내 기억도
 * 안쳐다보고 무슨 근거로 진행을 하냐는거야" (2026-09-09). So the tick prompt puts
 * the lookup first and the silence token last. openclaw measured what happens
 * when that order is inverted: 1330 heartbeats, 529 consecutive NO_REPLY, 6-8
 * tokens a turn — the prompt's own right answer arrived before any judgement
 * did (openclaw-config workspace-bbot/AGENTS.md:48; agent-config#23).
 *
 * Deliberately absent, and not to be added back:
 * - No job store, no scheduler class, no daemon, no residency. prime-agent's
 *   heartbeat is daemon-only by construction (it throws "Heartbeats require
 *   daemon mode" outside it) and its `scheduled-jobs.json` is the kind of state
 *   whose loss would erase registered work. We borrow its *syntax* and two of
 *   its *policies*, not a line of its code (agent-config#23 §3).
 * - No persistence of any kind: this lives in the process and dies with it.
 *   A resumed session does not inherit a clock.
 * - OFF by default. Linking this extension wakes nothing; a human must type
 *   `/heartbeat`. This house has never run a turn without a human starting it.
 *
 * Borrowed policies (prime-agent core/cron-jobs.ts):
 * - Busy means drop the tick, never queue it (:1350-1371).
 * - steer / follow_up as a field of the heartbeat, default steer (:27).
 * - 10s floor on the interval (:1116).
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const TICK_MESSAGE_TYPE = "heartbeat-tick";
const UI_MESSAGE_TYPE = "heartbeat-ui";
const MIN_INTERVAL_MS = 10_000;
const DEFAULT_INTERVAL = "5m";
const MAX_INSTRUCTION_CHARS = 4_000;
const USAGE = "Usage: /heartbeat [--every <interval>] [--steer|--follow-up] [instruction]\n       /heartbeat 10m | pause | resume | clear | status";

/**
 * Both notes are shown to the operator, not just written in a comment. A flag
 * that does less than its name promises, and a clock that dies with the
 * session, are exactly the kind of non-obvious behaviour AGENTS.md says the
 * human must not be left to discover ("Trust Agent Intuition").
 *
 * They carry the conclusion only, one line each: the reasoning (why a job
 * store would be a shackle, why this harness cannot tell streaming from
 * compaction) lives in README.md § heartbeat. A status panel that wraps to ten
 * rows stops being read, which loses the fact it was added to preserve.
 */
const LIFETIME_NOTE = "Session-only — dies on exit, /new and /resume. Chosen, not missing (README § heartbeat).";
const DELIVERY_NOTE = "steer ≈ follow-up here — a tick is only ever sent while the session is idle.";

type DeliveryMode = "steer" | "follow_up";

interface Schedule {
	/** Canonical form, e.g. "every 10m". */
	expression: string;
	intervalMs: number;
}

interface Heartbeat {
	schedule: Schedule;
	/** Operator text appended to the standing tick instruction, never replacing it. */
	instruction?: string;
	deliveryMode: DeliveryMode;
	status: "active" | "paused";
	ticks: number;
	dropped: number;
	nextRunAtMs?: number;
}

type ParsedCommand =
	| { type: "status" }
	| { type: "pause" }
	| { type: "resume" }
	| { type: "clear" }
	| { type: "set"; interval: string; instruction?: string; deliveryMode?: DeliveryMode };

const UNIT_PATTERN = "s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours";
const INTERVAL_RE = new RegExp(`^(\\d+)\\s*(${UNIT_PATTERN})$`, "i");
const LEADING_INTERVAL_RE = new RegExp(`^(?:(?:every|each)\\s+)?(\\d+\\s*(?:${UNIT_PATTERN}))(?:\\b|$)\\s*`, "i");
const EVERY_OPTION_RE = /^--every[\s=]+(\S+)\s*/i;
const DELIVERY_RE = /^(--steer|--follow-up|--followup)(?:\b|$)\s*/i;

/** Parse "10m" / "every 10 minutes" into a canonical schedule. Floor is 10s. */
export function parseSchedule(input: string): Schedule {
	const body = input.trim().replace(/^(?:every|each)\s+/i, "").trim();
	const match = INTERVAL_RE.exec(body);
	if (!match) throw new Error(`Invalid interval "${input}". Use seconds, minutes or hours: 30s, 10m, 2h`);
	const amount = Number.parseInt(match[1]!, 10);
	const unit = match[2]!.toLowerCase();
	const suffix = unit.startsWith("s") ? "s" : unit.startsWith("m") ? "m" : "h";
	const multiplier = suffix === "s" ? 1_000 : suffix === "m" ? 60_000 : 3_600_000;
	const intervalMs = amount * multiplier;
	// prime-agent core/cron-jobs.ts:1116 — same floor, same message.
	if (intervalMs < MIN_INTERVAL_MS) throw new Error("Recurring interval must be at least 10 seconds");
	return { expression: `every ${amount}${suffix}`, intervalMs };
}

function consumeDelivery(text: string): { mode?: DeliveryMode; rest: string } {
	const match = DELIVERY_RE.exec(text);
	if (!match) return { rest: text };
	const mode: DeliveryMode = /steer/i.test(match[1]!) ? "steer" : "follow_up";
	// Strip a standalone "--" separator, never a flag like "--follow-up".
	const rest = text.slice(match[0].length).replace(/^--(?=\s|$)/, "").trim();
	return { mode, rest };
}

function consumeInterval(text: string): { interval: string; rest: string } | undefined {
	const option = EVERY_OPTION_RE.exec(text);
	if (option) return { interval: option[1]!, rest: text.slice(option[0].length).trim() };
	const leading = LEADING_INTERVAL_RE.exec(text);
	if (leading) return { interval: leading[1]!, rest: text.slice(leading[0].length).trim() };
	return undefined;
}

/**
 * `/heartbeat` grammar, shaped after prime-agent's parseHeartbeatCommand
 * (core/cron-jobs.ts:1165) minus the schedule kinds a session-lifetime clock
 * cannot honour: `at <ISO>`, 5-field cron and one-shot `in <n><unit>` all need
 * either wall-clock precision we do not care about or a `completed` state we
 * refuse to store.
 *
 * One deliberate divergence: prime-agent rejects a bare `/heartbeat 10m` with a
 * usage error. Here it is legal and runs the standing instruction, because GLG
 * asked for exactly that shape ("/heartbeat 10m 이런식으로 간단하게") and because
 * the standing instruction — not the operator's text — is what this tool is for.
 */
export function parseCommand(input: string): ParsedCommand {
	const text = input.replace(/^\/heartbeat\b/, "").trim();
	const lower = text.toLowerCase();
	if (!text || lower === "status") return { type: "status" };
	if (lower === "pause") return { type: "pause" };
	if (lower === "resume") return { type: "resume" };
	if (lower === "clear" || lower === "stop") return { type: "clear" };

	const leading = consumeDelivery(text);
	const interval = consumeInterval(leading.rest);
	const trailing = consumeDelivery(interval ? interval.rest : leading.rest);
	const deliveryMode = trailing.mode ?? leading.mode;
	const instruction = trailing.rest.trim();

	if (!interval && !instruction) throw new Error(USAGE);
	if (instruction.length > MAX_INSTRUCTION_CHARS) {
		throw new Error(`Heartbeat instruction is too long (${instruction.length} > ${MAX_INSTRUCTION_CHARS} chars)`);
	}
	return {
		type: "set",
		interval: interval?.interval ?? DEFAULT_INTERVAL,
		...(instruction ? { instruction } : {}),
		...(deliveryMode ? { deliveryMode } : {}),
	};
}

/**
 * Drop the tick when the session is not plainly idle.
 *
 * prime-agent can tell streaming from compaction and lets a `steer` heartbeat
 * cut into a plain streaming turn (cron-jobs.ts:1350-1371). We cannot: pi's
 * extension surface exposes `isIdle()` only, and its expression is
 * `!_isAgentRunActive && !isCompacting` (core/agent-session.ts:924-927) — two
 * states behind one boolean. Steering into a compaction is the unsafe case
 * prime-agent names, so both delivery modes defer here and `--steer` cannot
 * interrupt a running turn in this house. That is a limitation, not a feature.
 */
export function shouldDropTick(ctx: Pick<ExtensionContext, "isIdle" | "hasPendingMessages">): boolean {
	return !ctx.isIdle() || ctx.hasPendingMessages();
}

/**
 * The standing tick instruction. The order of the steps is the contract: the
 * lookup comes first and the silence token comes last, so a quiet tick is the
 * end of a judgement instead of its substitute.
 *
 * Step 2 asks for the grounds to land somewhere a reader can reach without the
 * session transcript, because a gate is not proved by what it blocked but by
 * what it left behind (agent-config#24, 2026-09-09). It deliberately names no
 * path: where that record lives is still open, and openclaw moved its own
 * contract out of a file and into `cron scratch` this week, which is evidence
 * that the seat moves. So require the property, not the location.
 *
 * It deliberately does not name *who* digs either. Whether the grounds are
 * fetched inside this turn or by a sibling is GLG's call, still open (#24).
 */
export function tickPrompt(hb: Heartbeat, tick: number): string {
	const lines = [
		`Heartbeat tick #${tick} (${hb.schedule.expression}). The clock sent this, not the operator.`,
		"",
		"Follow these in order. Do not skip ahead to step 5.",
		"1. Look up the memory and time axes for grounds bearing on the work in front of you. Recollection and assumption do not count as grounds.",
		"2. Leave the grounds where a reader who never opens this session can find them — a commit, an issue comment, a note, whichever this repo already uses. Each one carries its source and its evidence state (measured / read at / inherited), and what it decides.",
		"3. Take exactly one step those grounds support. Then stop — do not chain a second step.",
		"4. If you found no grounds, do not proceed. State what you looked for, where you looked, and stop there.",
		"5. Only after 1-4: if nothing needs attention, reply exactly HEARTBEAT_OK and nothing else.",
	];
	if (hb.instruction) lines.push("", `Operator instruction for this heartbeat: ${hb.instruction}`);
	return lines.join("\n");
}

function formatMs(ms: number): string {
	if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
	if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
	return `${(ms / 3_600_000).toFixed(1)}h`;
}

export default function (pi: ExtensionAPI) {
	let hb: Heartbeat | null = null;
	let timer: NodeJS.Timeout | undefined;
	/**
	 * The context is a live getter proxy over the extension runner and throws
	 * once that runner goes stale (core/extensions/runner.ts:602-604), so holding
	 * it is safe and a use-after-teardown crashes honestly. We disarm on
	 * shutdown/switch/session start anyway, so a tick never runs against one.
	 */
	let latest: ExtensionContext | undefined;

	function disarm(): void {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		if (hb) hb.nextRunAtMs = undefined;
	}

	function arm(): void {
		disarm();
		if (!hb || hb.status !== "active") return;
		const { intervalMs } = hb.schedule;
		hb.nextRunAtMs = Date.now() + intervalMs;
		timer = setTimeout(fire, intervalMs);
		// A clock must never be the reason pi stays alive.
		timer.unref?.();
	}

	function fire(): void {
		timer = undefined;
		if (!hb || hb.status !== "active") return;
		const ctx = latest;
		if (!ctx) {
			// No session context has been seen yet; try again next interval.
			arm();
			return;
		}
		if (shouldDropTick(ctx)) {
			hb.dropped++;
			updateStatus(ctx);
			arm();
			return;
		}
		hb.ticks++;
		const tick = hb.ticks;
		const deliverAs = hb.deliveryMode === "follow_up" ? "followUp" : "steer";
		updateStatus(ctx);
		arm();
		pi.sendMessage(
			{
				customType: TICK_MESSAGE_TYPE,
				content: tickPrompt(hb, tick),
				display: false,
				details: { tick, schedule: hb.schedule.expression },
			},
			// deliverAs matters only for the race between the idle check above and
			// this call; goal.ts:553-557 makes the same choice at the same seam.
			{ triggerTurn: true, deliverAs },
		);
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		if (!hb) {
			ctx.ui.setStatus("heartbeat", undefined);
			return;
		}
		const theme = ctx.ui.theme;
		if (hb.status === "paused") {
			ctx.ui.setStatus("heartbeat", theme.fg("warning", "Heartbeat paused (/heartbeat resume)"));
			return;
		}
		const due = hb.nextRunAtMs ? ` · next ${formatMs(Math.max(0, hb.nextRunAtMs - Date.now()))}` : "";
		ctx.ui.setStatus("heartbeat", theme.fg("accent", `Heartbeat ${hb.schedule.expression.replace(/^every /, "")} · tick ${hb.ticks}${due}`));
	}

	function show(content: string): void {
		pi.sendMessage({ customType: UI_MESSAGE_TYPE, content, display: true }, { triggerTurn: false });
	}

	/**
	 * Four lines, wrapped or not: one state line, the instruction, and the two
	 * notes. The instruction is elided rather than allowed to wrap, because an
	 * operator reading a status panel wants to know which heartbeat is armed,
	 * not to re-read the text they typed.
	 */
	function summary(): string {
		if (!hb) return `Heartbeat is off.\n\n${USAGE}`;
		const next = hb.nextRunAtMs ? ` · next ~${formatMs(Math.max(0, hb.nextRunAtMs - Date.now()))}` : "";
		const typed = hb.instruction ?? "(standing default — find grounds, leave them findable, take one step)";
		const instruction = typed.length > 88 ? `${typed.slice(0, 87)}…` : typed;
		return [
			`Heartbeat ${hb.status} · ${hb.schedule.expression.replace(/^every /, "")} · ${hb.deliveryMode} · tick ${hb.ticks} · dropped ${hb.dropped}${next}`,
			`instruction: ${instruction}`,
			LIFETIME_NOTE,
			DELIVERY_NOTE,
		].join("\n");
	}

	/**
	 * A session start of any reason disarms and forgets. This is where "off by
	 * default" is enforced in code rather than in a comment: startup, reload and
	 * resume all land here, so no session ever inherits a clock it did not ask
	 * for in this process.
	 *
	 * Do not "fix" this by arming here. `run.sh setup` symlinks every
	 * pi-extensions/*.ts into ~/.pi/agent/extensions (run.sh:960), so this file
	 * loads in every pi session on the machine. This handler is the only thing
	 * standing between that and a machine full of sessions that wake themselves
	 * with nobody asking. Arming belongs in the /heartbeat handler and nowhere
	 * else.
	 */
	pi.on("session_start", async (_event, ctx) => {
		latest = ctx;
		disarm();
		hb = null;
		updateStatus(ctx);
	});

	pi.on("session_before_switch", async () => {
		disarm();
		hb = null;
		return {};
	});

	pi.on("session_shutdown", async () => {
		disarm();
		hb = null;
	});

	// Keep the freshest context, and refresh the countdown in the status line.
	pi.on("agent_start", async (_event, ctx) => {
		latest = ctx;
	});
	pi.on("agent_end", async (_event, ctx) => {
		latest = ctx;
		updateStatus(ctx);
	});
	pi.on("turn_end", async (_event, ctx) => {
		latest = ctx;
		updateStatus(ctx);
	});

	/**
	 * Keep the context clean: UI chatter never reaches the model, and only the
	 * most recent tick prompt survives, so an hour of ticks does not become an
	 * hour of duplicated instructions (goal.ts:658-677 does the same).
	 */
	pi.on("context", async (event) => {
		let lastTickIndex = -1;
		for (let i = 0; i < event.messages.length; i++) {
			const msg = event.messages[i] as { customType?: string };
			if (msg.customType === TICK_MESSAGE_TYPE) lastTickIndex = i;
		}
		return {
			messages: event.messages.filter((message, index) => {
				const msg = message as { customType?: string };
				if (msg.customType === UI_MESSAGE_TYPE) return false;
				if (msg.customType === TICK_MESSAGE_TYPE) return index === lastTickIndex;
				return true;
			}),
		};
	});

	pi.registerCommand("heartbeat", {
		description: "Wake this session on a timer to look up grounds and take one step",
		getArgumentCompletions: (prefix: string) => {
			const items = [
				{ value: "10m", label: "10m", description: "wake every 10 minutes" },
				{ value: "pause", label: "pause", description: "stop ticking, keep the setting" },
				{ value: "resume", label: "resume", description: "start ticking again" },
				{ value: "clear", label: "clear", description: "turn the heartbeat off" },
				{ value: "status", label: "status", description: "show the current heartbeat" },
			];
			const filtered = items.filter((item) => item.value.startsWith(prefix.trimStart()));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			latest = ctx;
			let command: ParsedCommand;
			try {
				command = parseCommand(args);
			} catch (err) {
				// Operator input is external; a usage error is a designed outcome,
				// not an invariant breach. Anything else still crashes.
				show(err instanceof Error ? err.message : String(err));
				return;
			}

			switch (command.type) {
				case "status":
					show(summary());
					updateStatus(ctx);
					return;
				case "pause":
					if (!hb) {
						show("Heartbeat is off; nothing to pause.");
						return;
					}
					hb.status = "paused";
					disarm();
					show(summary());
					updateStatus(ctx);
					return;
				case "resume":
					if (!hb) {
						show(`Heartbeat is off; nothing to resume.\n\n${USAGE}`);
						return;
					}
					hb.status = "active";
					arm();
					show(summary());
					updateStatus(ctx);
					return;
				case "clear":
					disarm();
					hb = null;
					show("Heartbeat off.");
					updateStatus(ctx);
					return;
				case "set": {
					let schedule: Schedule;
					try {
						schedule = parseSchedule(command.interval);
					} catch (err) {
						show(err instanceof Error ? err.message : String(err));
						return;
					}
					hb = {
						schedule,
						...(command.instruction ? { instruction: command.instruction } : {}),
						deliveryMode: command.deliveryMode ?? hb?.deliveryMode ?? "steer",
						status: "active",
						ticks: 0,
						dropped: 0,
					};
					arm();
					show(summary());
					updateStatus(ctx);
					return;
				}
			}
		},
	});
}
