/**
 * Background Bash Extension
 *
 * Gives the pi agent what Claude Code's `run_in_background` gives Claude: the
 * ability to start a long command, keep working (or end the turn), and then be
 * *re-invoked automatically when the command exits*.
 *
 * The gap this closes: pi's built-in bash tool is synchronous only. So a long
 * `pnpm check` either blocks the whole turn or gets parked in tmux — and parked
 * work needs someone to come back and look at it. In practice the agent says
 * "I'll run pnpm check" and the turn ends there, waiting on a human to nudge it.
 *
 * How the wake-up works: pi has no completion hook, but `pi.sendMessage(...,
 * { triggerTurn: true })` may be called from any async callback. So the child's
 * `exit` handler queues the result and triggers a turn. If a turn is already
 * running, it is delivered as a follow-up so it lands the moment that turn ends.
 * Same mechanism goal.ts uses from `agent_end`.
 *
 * Tools:
 *   bash_background        start a command, return immediately with a task id
 *   bash_background_check  poll status / read output / kill a task
 *
 * GLG, 2026-08-07. Not upstream — written for this repo.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { getShellConfig, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const LOG_DIR = path.join(os.homedir(), ".pi", "background");
/** Concurrency cap. Past this the agent is spawning, not working. */
const MAX_RUNNING = 5;
/** How much trailing output rides along in the completion message. */
const NOTIFY_MAX_LINES = 120;
const NOTIFY_MAX_BYTES = 12_000;
const MESSAGE_TYPE = "background_task_result";
/** How many finished task records to keep in a long-lived session. */
const MAX_FINISHED = 50;

type TaskStatus = "running" | "exited" | "killed" | "timedOut" | "failed";

interface Task {
	id: string;
	command: string;
	description: string;
	cwd: string;
	logPath: string;
	child?: ChildProcess;
	/** Process group id, kept after the child reference is cleared so kills can escalate. */
	pgid?: number;
	status: TaskStatus;
	exitCode: number | null;
	signal: string | null;
	startedAt: number;
	endedAt?: number;
	error?: string;
	/** Seconds requested by the caller, when a timeout was asked for. */
	timeoutSecs?: number;
}

const tasks = new Map<string, Task>();
let counter = 0;
let shuttingDown = false;
/**
 * Latest context seen from a tool call or lifecycle event. The child `exit`
 * handler fires outside any handler, so it has no ctx of its own.
 */
let lastCtx: ExtensionContext | undefined;
/** Set in the default export; sendMessage lives on ExtensionAPI, not on ctx. */
let api: ExtensionAPI | undefined;

/** Task ids whose termination we requested via timeout, not by the user. */
const timedOut = new Set<string>();

/** Wired up in the default export; redraws the footer and starts/stops the tick. */
let refreshStatus: () => void = () => {};

/**
 * Drop background logs older than a week. Without this the directory only ever
 * grows, and nothing else on the system knows to clean it.
 */
function pruneOldLogs(): void {
	const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
	try {
		for (const name of readdirSync(LOG_DIR)) {
			if (!name.endsWith(".log")) continue;
			const full = path.join(LOG_DIR, name);
			try {
				if (statSync(full).mtimeMs < cutoff) unlinkSync(full);
			} catch {
				// Raced with something else; nothing to do.
			}
		}
	} catch {
		// No log dir yet.
	}
}

/**
 * Signal the task's whole process group, not just the bash pid — a pipeline's
 * descendants keep running otherwise. Escalates to SIGKILL if it does not die.
 *
 * The escalation deliberately keys off the stored pgid rather than task.status or
 * task.child. The group leader (bash) usually exits on SIGTERM immediately, which
 * clears task.child and moves the status off "running" — so gating on either of
 * those means the escalation never fires for exactly the case it exists for: a
 * descendant that ignored SIGTERM and outlived its leader.
 */
function killTree(task: Task): void {
	const pgid = task.pgid;
	if (pgid === undefined) return;

	const signalGroup = (sig: NodeJS.Signals): boolean => {
		try {
			process.kill(-pgid, sig);
			return true;
		} catch {
			// ESRCH: the whole group is gone. Nothing survived, nothing to escalate.
			return false;
		}
	};

	if (!signalGroup("SIGTERM")) return;
	// SIGKILL terminates stopped processes too, so there is nothing to probe for
	// first. Note what this does NOT do: once the leader is gone, a bare pgid
	// cannot prove the group is still ours, so a pgid recycled inside this 5s
	// window would be signalled. Proving identity would need a retained
	// supervisor or cgroup; the residual risk is accepted, not eliminated.
	const escalate = setTimeout(() => signalGroup("SIGKILL"), 5_000);
	escalate.unref?.();
}

function nextId(): string {
	counter += 1;
	return `bg${String(counter).padStart(2, "0")}`;
}

/**
 * Keep the finished-task map bounded. Disk logs prune across sessions, but a pi
 * session left open for days would otherwise accumulate records forever.
 */
function pruneFinishedTasks(): void {
	const finished = [...tasks.values()].filter((task) => task.status !== "running");
	if (finished.length <= MAX_FINISHED) return;
	finished
		.sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))
		.slice(0, finished.length - MAX_FINISHED)
		.forEach((task) => tasks.delete(task.id));
}

function runningCount(): number {
	let n = 0;
	for (const task of tasks.values()) if (task.status === "running") n += 1;
	return n;
}

function formatDuration(ms: number): string {
	const secs = Math.round(ms / 1000);
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	return `${mins}m${String(secs % 60).padStart(2, "0")}s`;
}

/**
 * Strip terminal control sequences from output headed for the model.
 *
 * `bash -c` no longer sources a profile, so the OSC title noise is gone at the
 * source — but plenty of commands colour their own output, and pnpm/vitest draw
 * progress with CSI. None of that means anything in a transcript, and escape
 * bytes in model context are worth refusing on principle. The raw log on disk
 * keeps everything.
 */
const ANSI_ESCAPE = new RegExp(
	[
		// String-terminated sequences first: OSC, and DCS/SOS/PM/APC.
		"\\x1b\\][\\s\\S]*?(?:\\x07|\\x1b\\\\)",
		"\\x1b[PX^_][\\s\\S]*?\\x1b\\\\",
		// CSI: params 0-?, intermediates space-/, final @-~ — the final byte range
		// is @-~, not A-Za-z, or bracketed-paste (ESC[200~) slips through.
		"\\x1b\\[[0-?]*[ -/]*[@-~]",
		// Charset selection, e.g. ESC(0 — three bytes, so the printable that
		// follows must survive.
		"\\x1b[()*+#][0-9A-Za-z]",
		// Two-byte escapes: ESC7 / ESC8, and the Fe controls.
		"\\x1b[78]",
		"\\x1b[@-Z\\\\-_]",
	].join("|"),
	"g",
);

function stripAnsi(text: string): string {
	return (
		text
			.replace(ANSI_ESCAPE, "")
			// Lone carriage returns from progress redraws
			.replace(/\r(?!\n)/g, "\n")
	);
}

/** Last lines of a task's log, bounded by both line count and bytes. */
function tailLog(task: Task, maxLines = NOTIFY_MAX_LINES, maxBytes = NOTIFY_MAX_BYTES): string {
	if (!existsSync(task.logPath)) return "";
	let text: string;
	try {
		text = readFileSync(task.logPath, "utf8");
	} catch (err) {
		return `<could not read log: ${err instanceof Error ? err.message : String(err)}>`;
	}
	const lines = stripAnsi(text).split("\n");
	let tail = lines.slice(-maxLines).join("\n");
	// Cut on the byte buffer, not the UTF-16 string: slicing the string counts
	// code units, so Korean output would blow past maxBytes.
	const buf = Buffer.from(tail, "utf8");
	if (buf.byteLength > maxBytes) {
		tail = buf.subarray(-maxBytes).toString("utf8");
		const cut = tail.indexOf("\n");
		// Dropping to the next newline also discards any partial leading rune.
		tail = cut >= 0 ? tail.slice(cut + 1) : tail.replace(/^�/, "");
		tail = `<truncated>\n${tail}`;
	}
	return tail.trimEnd();
}

function describeTask(task: Task): string {
	const label = task.description ? `${task.description} — ` : "";
	const elapsed = formatDuration((task.endedAt ?? Date.now()) - task.startedAt);
	switch (task.status) {
		case "running":
			return `${task.id} running (${elapsed}): ${label}${task.command}`;
		case "killed":
			return `${task.id} killed after ${elapsed}: ${label}${task.command}`;
		case "timedOut":
			return `${task.id} timed out after ${elapsed} (limit ${task.timeoutSecs}s): ${label}${task.command}`;
		case "failed":
			return `${task.id} failed to start: ${label}${task.command} (${task.error ?? "unknown error"})`;
		default:
			return `${task.id} exited ${task.exitCode} after ${elapsed}: ${label}${task.command}`;
	}
}

/**
 * Show what is still cooking in the footer. glg-footer.ts already renders
 * getExtensionStatuses() on its third line, so setStatus is all this needs —
 * the footer itself stays untouched.
 *
 * GLG needs to see at a glance whether something is still pending, because a
 * quiet pi looks identical whether it is done or waiting on a build.
 */
function updateStatus(ctx: ExtensionContext | undefined): void {
	if (!ctx?.hasUI) return;
	const running = [...tasks.values()].filter((task) => task.status === "running");
	if (running.length === 0) {
		ctx.ui.setStatus("background", undefined);
		return;
	}
	// Deliberately terse: the footer shares one line with every other extension
	// status, so this says only whether something is pending and how much. Which
	// task, how long, and its output belong in /bg and bash_background_check.
	const theme = ctx.ui.theme;
	const label = running.length === 1 ? "1 task" : `${running.length} tasks`;
	ctx.ui.setStatus("background", theme.fg("accent", `⏳ ${label}`));
}

/**
 * Wake the agent with a finished task. Mirrors goal.ts's queueContinuation:
 * fire straight away when idle, otherwise ride in behind the running turn.
 */
function notifyCompletion(task: Task): void {
	if (shuttingDown) return;
	const ctx = lastCtx;
	if (!ctx || !api) return;

	const outcome =
		task.status === "timedOut"
			? `hit the ${task.timeoutSecs}s timeout you set and was terminated`
			: task.status === "killed"
				? `was killed (signal ${task.signal ?? "unknown"})`
				: task.status === "failed"
					? `failed to start: ${task.error ?? "unknown error"}`
					: `exited with code ${task.exitCode}`;

	// A timeout is something the caller asked for, not a failure of the command —
	// telling the agent to "fix the cause and re-run" would send it chasing a bug
	// that may not exist.
	const directive =
		task.status === "timedOut"
			? "The command did not finish in the time you allowed. Decide whether it needs longer, whether it is stuck, or whether a narrower command would do — do not blindly re-run it."
			: task.status === "failed"
				? "The command could not be started at all. Check the command and working directory."
				: task.exitCode === 0
					? "Continue with the work this task was blocking."
					: "This did not pass. Read the output, fix the cause, and re-run it.";

	const tail = tailLog(task);
	const body = [
		`Background task ${task.id} ${outcome} after ${formatDuration((task.endedAt ?? Date.now()) - task.startedAt)}.`,
		task.description ? `Description: ${task.description}` : undefined,
		`Command: ${task.command}`,
		`Full log: ${task.logPath}`,
		"",
		tail ? `Output (last ${NOTIFY_MAX_LINES} lines):\n${tail}` : "No output.",
		"",
		directive,
	]
		.filter((line) => line !== undefined)
		.join("\n");

	const message = {
		customType: MESSAGE_TYPE,
		content: body,
		display: true,
		details: { taskId: task.id, exitCode: task.exitCode, status: task.status },
	};

	// ExtensionAPI.sendMessage returns void, not a promise — the Promise<void>
	// overload belongs to ReplacedSessionContext. So a plain try/catch is the whole
	// story here; awaiting or .catch()-ing this would throw on undefined.
	try {
		const options = ctx.isIdle()
			? ({ triggerTurn: true } as const)
			: ({ triggerTurn: true, deliverAs: "followUp" } as const);
		api.sendMessage(message, options);
	} catch (err) {
		const reason = `background-bash: failed to deliver result for ${task.id}: ${err instanceof Error ? err.message : String(err)}`;
		if (ctx.hasUI) ctx.ui.notify(reason, "error");
		else console.error(reason);
	}
}

function startTask(command: string, description: string, cwd: string, timeoutSecs?: number): Task {
	mkdirSync(LOG_DIR, { recursive: true });
	const id = nextId();
	const task: Task = {
		id,
		command,
		description,
		cwd,
		logPath: path.join(LOG_DIR, `${Date.now()}-${id}.log`),
		status: "running",
		exitCode: null,
		signal: null,
		startedAt: Date.now(),
		timeoutSecs,
	};
	tasks.set(id, task);

	appendFileSync(task.logPath, `$ ${command}\n`);

	// Borrow pi's own shell resolution so a background command behaves exactly like
	// one run through the built-in bash tool. That means `bash -c`, not `-lc`: a
	// login shell sources the profile, which emits an OSC title sequence into the
	// captured output and then into the model's context.
	//
	// detached:true matches pi's bash tool too (it spawns detached off win32). It
	// puts the command in its own process group so we can signal the whole
	// pipeline — killing just the bash pid leaves `... | xargs sha256sum` grinding
	// away. The cost is that a hard pi crash can orphan the group, so
	// session_shutdown kills the group explicitly.
	const shellConfig = getShellConfig();
	const child = spawn(shellConfig.shell, [...shellConfig.args, command], {
		cwd,
		stdio: ["ignore", "pipe", "pipe"],
		env: process.env,
		detached: true,
	});
	task.child = child;
	task.pgid = child.pid;

	const append = (chunk: Buffer | string) => {
		try {
			appendFileSync(task.logPath, chunk.toString());
		} catch {
			// A full disk must not take the session down with it.
		}
	};
	child.stdout?.on("data", append);
	child.stderr?.on("data", append);

	let timer: NodeJS.Timeout | undefined;
	if (timeoutSecs && timeoutSecs > 0) {
		timer = setTimeout(() => {
			if (task.status !== "running") return;
			timedOut.add(task.id);
			killTree(task);
		}, timeoutSecs * 1000);
		timer.unref?.();
	}

	child.once("error", (err) => {
		if (timer) clearTimeout(timer);
		task.status = "failed";
		task.error = err.message;
		task.endedAt = Date.now();
		task.child = undefined;
		refreshStatus();
		notifyCompletion(task);
	});

	child.once("exit", (code, signal) => {
		if (timer) clearTimeout(timer);
		if (task.status !== "running") return;
		task.exitCode = code;
		task.signal = signal;
		task.status = timedOut.has(task.id) ? "timedOut" : signal ? "killed" : "exited";
		timedOut.delete(task.id);
		task.endedAt = Date.now();
		task.child = undefined;
		refreshStatus();
		notifyCompletion(task);
	});

	return task;
}

export default function backgroundBashExtension(pi: ExtensionAPI): void {
	api = pi;

	// No timer: the status is just a count, and the count only changes when a task
	// starts or ends — both of which call this already.
	refreshStatus = () => {
		pruneFinishedTasks();
		updateStatus(lastCtx);
	};

	pi.on("session_start", (_event, ctx) => {
		lastCtx = ctx;
		shuttingDown = false;
		pruneOldLogs();
		refreshStatus();
	});
	pi.on("agent_start", (_event, ctx) => {
		lastCtx = ctx;
		refreshStatus();
	});
	pi.on("agent_end", (_event, ctx) => {
		lastCtx = ctx;
		refreshStatus();
	});

	pi.on("session_shutdown", () => {
		shuttingDown = true;
		for (const task of tasks.values()) {
			if (task.status === "running") killTree(task);
		}
	});

	pi.registerTool({
		name: "bash_background",
		label: "Background Bash",
		description:
			"Start a long-running bash command in the background and return immediately with a task id. " +
			"You are automatically re-invoked with the exit code and output when it finishes, so you do NOT " +
			"need to poll or wait — start it, do other useful work or end your turn, and act on the result " +
			"when it arrives. Use this for builds, test suites, type checks, installs, and anything else " +
			"that takes more than roughly thirty seconds. Use the ordinary bash tool for quick commands.",
		promptSnippet:
			"bash_background: run a slow command (build/test/check) without blocking; you are woken with its result.",
		promptGuidelines: [
			"For commands that take more than ~30s (pnpm check, test suites, builds, installs), use bash_background instead of bash. Never announce that you will run a slow command and then end the turn — start it in the background, and you will be re-invoked when it exits.",
			"After a background task reports a non-zero exit, read its output, fix the cause, and re-run it rather than handing the failure back unexamined.",
		],
		parameters: Type.Object({
			command: Type.String({ description: "Bash command to run in the background" }),
			description: Type.Optional(
				Type.String({ description: "Short label for this task, e.g. 'pnpm check'" }),
			),
			cwd: Type.Optional(Type.String({ description: "Working directory (defaults to the session cwd)" })),
			timeout: Type.Optional(
				Type.Number({ description: "Kill the command after this many seconds (optional, no default)" }),
			),
		}),
		execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
			lastCtx = ctx;

			if (runningCount() >= MAX_RUNNING) {
				throw new Error(
					`Refusing to start: ${MAX_RUNNING} background tasks are already running. Wait for one to finish or kill it with bash_background_check.`,
				);
			}

			const cwd = params.cwd ?? process.cwd();
			const task = startTask(params.command, params.description ?? "", cwd, params.timeout);
			refreshStatus();

			return {
				content: [
					{
						type: "text" as const,
						text: [
							`Started background task ${task.id} (pid ${task.child?.pid ?? "unknown"}).`,
							`Command: ${task.command}`,
							`Log: ${task.logPath}`,
							"",
							"You will be re-invoked automatically when it exits. Do not poll for it and do not",
							"wait idly — continue with other work, or end the turn if there is nothing else to do.",
						].join("\n"),
					},
				],
				details: { taskId: task.id, logPath: task.logPath },
			};
		},
	});

	pi.registerTool({
		name: "bash_background_check",
		label: "Background Bash Status",
		description:
			"Inspect background tasks started with bash_background: list them, read output from one, or kill one. " +
			"You normally do not need this — finished tasks report themselves. Use it to look at a task that is " +
			"still running, or to stop one.",
		parameters: Type.Object({
			id: Type.Optional(Type.String({ description: "Task id, e.g. 'bg01'. Omit to list all tasks." })),
			kill: Type.Optional(Type.Boolean({ description: "Send SIGTERM to the given task" })),
			lines: Type.Optional(Type.Number({ description: "How many trailing output lines to show (default 60)" })),
		}),
		execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
			lastCtx = ctx;

			if (!params.id) {
				if (tasks.size === 0) {
					return { content: [{ type: "text" as const, text: "No background tasks." }], details: {} };
				}
				const listing = [...tasks.values()].map(describeTask).join("\n");
				return { content: [{ type: "text" as const, text: listing }], details: { count: tasks.size } };
			}

			const task = tasks.get(params.id);
			if (!task) {
				throw new Error(`No such background task: ${params.id}`);
			}

			if (params.kill) {
				if (task.status !== "running") {
					return {
						content: [{ type: "text" as const, text: `${task.id} is not running (${task.status}).` }],
						details: { status: task.status },
					};
				}
				killTree(task);
				return {
					content: [{ type: "text" as const, text: `Sent SIGTERM to ${task.id}. You will be notified when it exits.` }],
					details: { killed: task.id },
				};
			}

			const tail = tailLog(task, params.lines ?? 60);
			return {
				content: [
					{
						type: "text" as const,
						text: `${describeTask(task)}\nLog: ${task.logPath}\n\n${tail || "No output yet."}`,
					},
				],
				details: { status: task.status, exitCode: task.exitCode },
			};
		},
	});

	pi.registerCommand("bg", {
		description: "List background tasks started by the agent",
		handler: async (_args, ctx) => {
			lastCtx = ctx;
			if (!ctx.hasUI) return;
			const listing = tasks.size === 0 ? "No background tasks." : [...tasks.values()].map(describeTask).join("\n");
			ctx.ui.notify(listing, "info");
		},
	});
}
