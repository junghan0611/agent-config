/**
 * Background bash for the durable app, as a native extension: start a long command, keep working or end the
 * turn, and be re-invoked once with its result. The same two tool names as pi-extensions/background-bash.ts,
 * so a model's habits carry over; none of that file's ExtensionAPI machinery is reproduced.
 *
 * No SDK import. defineExtension/defineTool are identity functions and defineTask returns `{ definition }`
 * (pi-durable dist/harness/define.js, dist/tasks.js), and pi-ai validates a plain JSON-Schema `parameters`
 * (dist/utils/validation.js validateToolArguments). So this file is plain objects, and agent-config resolves
 * no @earendil-works package of its own: the durable app that installs it brings the one SDK set.
 *
 * Each command is one durable task, `agent-config.bash-background`, owned by the calling conversation and
 * created `background: true`: the conversation's Esc and idle waits do not reach it, and the scheduler,
 * the commit line and the conversation inbox carry everything. There is no manager, watcher or queue here.
 *
 *   launch   commit {phase: "started"} — the execution intent — THEN spawn; wait until the child has exited
 *            AND its stdio has closed (timeout, kill and the invocation's signal terminate the group first);
 *            commit {phase: "report", result}; then write the log's result mark (retention authority).
 *   started  reached only by recovery: the durable process stopped after the intent and before the result.
 *            The command is NEVER spawned again; the result is `interrupted` — uncertain: with no recorded
 *            pgid it may never have started; with one it may have run partly, finished, or still be running
 *            as an orphaned process group.
 *   report   submit the report to the owning conversation as a follow-up input with requestId
 *            `bash-background-report:<taskId>` (a repeated submit returns the first one), then terminal.
 *   abort    a host abort mark (Conversation.abort({ background: true })): terminal aborted, no report —
 *            the host asked everything to stop, so nothing re-wakes the model.
 *
 * A crash before the `started` commit leaves `launch`, and nothing has run: it runs once on reopen. Closing
 * the app signals the invocation; the process group is killed, the closing Harness refuses the next commit,
 * and the reopen lands in `started`. An arbitrary shell command is not replay-safe and nothing here makes it
 * so: this only guarantees that recovery never runs it a second time.
 *
 * `bash_background_check { id, kill: true }` signals the process group of a task THIS process spawned. A
 * tool has no `abortTask` (Harness-only), and the child exists only in this process anyway. Termination
 * (stop, timeout, abort, close) is SIGTERM then SIGKILL, joined: the result waits for the group to be gone, and
 * its ref'ed timers keep a closing app alive for that wait. The wait is bounded (SIGKILL at 5 s, then at most
 * 2 s more); it confirms an end only when the group is observed gone. A group still present after it is
 * `survived`: the report says its end is unconfirmed and the log gets no result mark. Waiting for the child's
 * stdio to close has no such bound — a process that survives SIGKILL (uninterruptible sleep, for one) and holds
 * the output keeps the task live; nothing here can force that.
 *
 * Logs age out after 7 days only when their result mark exists — written after the durable result commit,
 * never by anything a command prints. A running or interrupted command's log stays.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const TASK_KIND = "agent-config.bash-background";
export const EXTENSION_NAME = "agent-config-background-bash";
/** Live tasks of this kind, session-wide, counted in the commit that would create one more. */
export const MAX_LIVE = 5;
/** Trailing output that rides along in a report. */
export const NOTIFY_MAX_LINES = 120;
export const NOTIFY_MAX_BYTES = 12_000;
/**
 * The whole log file stays within this size: header and output share `LOG_MAX_BYTES - LOG_MARKER_RESERVE`, and
 * the two closing marker lines (each well under 200 bytes) fit the reserve. The report reads its tail from memory.
 */
export const LOG_MAX_BYTES = 16 * 1024 * 1024;
const LOG_MARKER_RESERVE = 512;
/** Raw output kept in memory for the report and for `bash_background_check` while the command runs. */
const TAIL_KEEP_BYTES = 64 * 1024;
/** SIGTERM, then SIGKILL after this; then wait at most `KILL_WAIT_MS` more for the group to be gone. */
const KILL_GRACE_MS = 5_000;
const KILL_WAIT_MS = 2_000;
/** Node's timer range: a larger delay fires at once. */
export const MAX_TIMEOUT_SECS = Math.floor((2 ** 31 - 1) / 1000);
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const LIVE_STATUSES = ["pending", "running", "waiting", "completing"];

/** Read at each use: HOME is the operator's, and a test gives a child process a synthetic one. */
export const logDir = () => path.join(os.homedir(), ".pi", "durable-background");

/**
 * The retention mark of a log: written only AFTER the task's result is durably committed. A log without it —
 * a command still running (perhaps in another durable session sharing the directory), or one interrupted by a
 * close or a crash — is never pruned. Nothing a command prints can stand in for it.
 */
export const resultMark = (logPath) => `${logPath}.result`;

/** taskId → { pgid, tail, timedOut, killRequested, termination? } for the commands this process spawned. */
const children = new Map();

/** The same expression as pi-extensions/background-bash.ts ANSI_ESCAPE, kept by hand (tests compare them). */
export const ANSI_ESCAPE = new RegExp(
	[
		"\\x1b\\][\\s\\S]*?(?:\\x07|\\x1b\\\\)",
		"\\x1b[PX^_][\\s\\S]*?\\x1b\\\\",
		"\\x1b\\[[0-?]*[ -/]*[@-~]",
		"\\x1b[()*+#][0-9A-Za-z]",
		"\\x1b[78]",
		"\\x1b[@-Z\\\\-_]",
	].join("|"),
	"g",
);

export function stripAnsi(text) {
	return text.replace(ANSI_ESCAPE, "").replace(/\r(?!\n)/g, "\n");
}

/** `buf` from `start`, moved forward past UTF-8 continuation bytes so it begins on a character boundary. */
function fromRuneBoundary(buf, start) {
	let at = Math.max(0, start);
	while (at < buf.byteLength && (buf[at] & 0xc0) === 0x80) at += 1;
	return buf.subarray(at);
}

const TRUNCATED = "<truncated>\n";

/**
 * Last lines of `raw`, at most `maxLines` lines and at most `maxBytes` UTF-8 bytes INCLUDING the `<truncated>`
 * marker. A byte cut lands on a character boundary (never a partial rune, and a U+FFFD the command printed
 * stays), then moves to the next line start when the cut text has one.
 */
export function tailText(raw, maxLines = NOTIFY_MAX_LINES, maxBytes = NOTIFY_MAX_BYTES) {
	const tail = stripAnsi(raw).split("\n").slice(-maxLines).join("\n").trimEnd();
	const buf = Buffer.from(tail, "utf8");
	if (buf.byteLength <= maxBytes) return tail;
	let cut = fromRuneBoundary(buf, buf.byteLength - (maxBytes - TRUNCATED.length)).toString("utf8");
	const line = cut.indexOf("\n");
	if (line >= 0) cut = cut.slice(line + 1);
	return `${TRUNCATED}${cut}`;
}

export function formatDuration(ms) {
	const secs = Math.round(ms / 1000);
	if (secs < 60) return `${secs}s`;
	return `${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, "0")}s`;
}

/** The shell the durable bash tool uses on this platform: /bin/bash, else bash on PATH (NixOS has no /bin/bash). */
const shell = () => (existsSync("/bin/bash") ? "/bin/bash" : "bash");

/**
 * Whether a committed result may give its log a result mark (and so let it age out). Not when the termination
 * this app started could not confirm the group gone: that log may be the only trace of what is still running.
 */
export const markEligible = (result) => result.termination !== "survived";

/** Delete logs older than the retention whose result mark says the task's result was committed. */
function pruneOldLogs(dir) {
	if (!existsSync(dir)) return;
	const cutoff = Date.now() - LOG_RETENTION_MS;
	for (const name of readdirSync(dir)) {
		if (!name.endsWith(".log.result")) continue;
		const mark = path.join(dir, name);
		// ENOENT: another process pruned it between the listing and here.
		try {
			if (statSync(mark).mtimeMs >= cutoff) continue;
			for (const file of [mark.slice(0, -".result".length), mark]) {
				try {
					unlinkSync(file);
				} catch (error) {
					if (error?.code !== "ENOENT") throw error;
				}
			}
		} catch (error) {
			if (error?.code !== "ENOENT") throw error;
		}
	}
}

/** Signal a process group this app spawned. false: the group is gone (ESRCH). */
function signalGroup(pgid, sig) {
	try {
		process.kill(-pgid, sig);
		return true;
	} catch (error) {
		if (error?.code === "ESRCH") return false;
		throw error;
	}
}

/**
 * Terminate an owned child's process group, once per child: SIGTERM, SIGKILL after the grace, and resolve when
 * the group is gone ("terminated" / "killed") or, past a bounded wait, "survived". The timers are ref'ed on
 * purpose: an app that is closing does not exit before this finishes — an unref'ed escalation would be
 * cancelled by the exit and leave a TERM-ignoring descendant behind.
 *
 * Only for a child in `children` (spawned here). A pgid recorded by an earlier run is never signalled. Once the
 * leader is gone a bare pgid cannot prove the group is still ours; a pgid recycled inside the grace window would
 * be signalled — accepted, as in the Pi extension.
 */
function terminate(entry) {
	entry.termination ??= new Promise((resolve) => {
		const pgid = entry.pgid;
		if (!signalGroup(pgid, "SIGTERM")) {
			resolve("terminated");
			return;
		}
		const begun = Date.now();
		let killed = false;
		const check = () => {
			if (!signalGroup(pgid, 0)) {
				resolve(killed ? "killed" : "terminated");
				return;
			}
			const elapsed = Date.now() - begun;
			if (!killed && elapsed >= KILL_GRACE_MS) {
				killed = true;
				signalGroup(pgid, "SIGKILL");
			}
			if (elapsed >= KILL_GRACE_MS + KILL_WAIT_MS) resolve("survived");
			else setTimeout(check, 50);
		};
		setTimeout(check, 50);
	});
	return entry.termination;
}

/**
 * Spawn `input.command` now and return `{ pid, done }`. `done` resolves exactly once with the result: after the
 * child has exited AND its stdout/stderr have closed (a same-group descendant still holding them keeps the task
 * live and its output in the result), and after any termination this app started has finished. A descendant
 * that detached its stdio is not followed. `pid` is undefined when no process came into being.
 */
function startCommand(taskId, input, signal) {
	const startedAt = Date.now();
	const entry = { pgid: undefined, tail: Buffer.alloc(0), timedOut: false, killRequested: false };
	const budget = LOG_MAX_BYTES - LOG_MARKER_RESERVE;
	let written = 0;
	let dropped = 0;
	let logError;
	let timer;
	let settled = false;
	let resolve;
	const done = new Promise((r) => {
		resolve = r;
	});
	// The log is a disk boundary: a full disk or a removed directory must not throw out of a child's event
	// handler and take the durable app down. The first failure stops the writing and rides in the result.
	const writeLog = (data) => {
		if (logError !== undefined) return;
		try {
			appendFileSync(input.logPath, data);
		} catch (error) {
			logError = `${error.code ?? "error"}: ${error.message}`;
		}
	};
	/** Header and output share the budget; what does not fit is counted, not written. */
	const writeBudgeted = (chunk) => {
		const room = Math.max(0, budget - written);
		const part = chunk.byteLength > room ? chunk.subarray(0, room) : chunk;
		if (part.byteLength > 0) writeLog(part);
		written += part.byteLength;
		dropped += chunk.byteLength - part.byteLength;
	};
	try {
		mkdirSync(path.dirname(input.logPath), { recursive: true });
	} catch (error) {
		logError = `${error.code ?? "error"}: ${error.message}`;
	}
	writeBudgeted(Buffer.from(`$ ${input.command}\n`, "utf8"));
	const onAbort = () => {
		if (entry.pgid !== undefined) terminate(entry);
	};
	const settle = async (result) => {
		if (settled) return;
		settled = true;
		signal.removeEventListener("abort", onAbort);
		if (timer !== undefined) clearTimeout(timer);
		const termination = entry.termination === undefined ? undefined : await entry.termination;
		children.delete(taskId);
		const endedAt = Date.now();
		if (dropped > 0) writeLog(`\n[log capped at ${LOG_MAX_BYTES} bytes; ${dropped} bytes not written]`);
		writeLog(`\n[bash_background: process ended, ${result.status} ${result.exitCode ?? result.signal ?? ""}]\n`);
		resolve({
			...result,
			startedAt,
			endedAt,
			tail: tailText(entry.tail.toString("utf8")),
			logBytesDropped: dropped,
			...(termination === undefined ? {} : { termination, pgid: entry.pgid }),
			...(logError === undefined ? {} : { logError }),
		});
	};
	let child;
	try {
		child = spawn(shell(), ["-c", input.command], {
			cwd: input.cwd,
			stdio: ["ignore", "pipe", "pipe"],
			env: process.env,
			detached: true,
		});
	} catch (error) {
		// A synchronous spawn refusal (an argument node rejects, such as a NUL byte) is the command's failure.
		settle({ status: "failed", exitCode: null, signal: null, error: error.message });
		return { pid: undefined, done };
	}
	const append = (chunk) => {
		entry.tail = Buffer.concat([entry.tail, chunk]);
		if (entry.tail.byteLength > TAIL_KEEP_BYTES) {
			entry.tail = fromRuneBoundary(entry.tail, entry.tail.byteLength - TAIL_KEEP_BYTES);
		}
		writeBudgeted(chunk);
	};
	child.stdout.on("data", append);
	child.stderr.on("data", append);
	// No pid: the spawn itself failed (a missing cwd, for one); "error" settles. With a pid, an "error" cannot
	// mean the process is gone, so "close" still decides.
	child.once("error", (error) => {
		if (entry.pgid === undefined) settle({ status: "failed", exitCode: null, signal: null, error: error.message });
	});
	child.once("close", (code, sig) => {
		const status = entry.timedOut ? "timedOut" : entry.killRequested || sig ? "killed" : "exited";
		settle({ status, exitCode: code, signal: sig });
	});
	if (child.pid === undefined) return { pid: undefined, done };
	entry.pgid = child.pid;
	children.set(taskId, entry);
	if (signal.aborted) onAbort();
	else signal.addEventListener("abort", onAbort, { once: true });
	if (input.timeoutSecs !== undefined) {
		timer = setTimeout(() => {
			entry.timedOut = true;
			terminate(entry);
		}, input.timeoutSecs * 1000);
		timer.unref();
	}
	return { pid: child.pid, done };
}

const commit = (runtime, checkpoint, context) =>
	runtime.commit(() => ({ status: "running", checkpoint }), context);

const BackgroundBashTask = {
	definition: {
		name: TASK_KIND,
		version: 1,
		initial: () => ({ phase: "launch" }),
		phases: {
			async launch(task, runtime, context) {
				// The execution intent is durable before anything runs.
				await commit(runtime, { phase: "started" }, context);
				const { pid, done } = startCommand(task.id, task.input, runtime.signal);
				if (pid !== undefined) await runtime.memo("pgid", pid, context);
				const result = await done;
				// Refused while the Harness closes or under an abort mark (the invocation's signal has already
				// terminated the group): the scheduler ends the invocation, and the reopen lands in `started`
				// (close) or the abort handler runs (mark). Either way no result mark is written below.
				await commit(runtime, { phase: "report", result }, context);
				// The result is durable: the log may now age out — unless the group's end is unconfirmed. A failure
				// here only keeps the log; it is reported to the host, not thrown — the committed checkpoint must
				// not be faulted after the fact.
				if (markEligible(result)) {
					try {
						writeFileSync(resultMark(task.input.logPath), `${JSON.stringify({ task: task.id, status: result.status })}\n`);
					} catch (error) {
						runtime.report(new Error(`bash_background #${task.id}: result mark not written, log kept: ${error.message}`));
					}
				}
			},
			async started(_task, runtime, context) {
				const pgid = await runtime.memo("pgid", context);
				await commit(runtime, { phase: "report", result: { status: "interrupted", pgid: pgid ?? null } }, context);
			},
			async report(task, runtime, context) {
				const owner = await runtime.conversation(runtime.conversationId, context);
				if (owner === undefined) throw new Error(`conversation ${runtime.conversationId} of task ${task.id} is gone`);
				await owner.submit(
					{
						type: "input",
						content: reportText(task.id, task.input, task.state.checkpoint.result),
						whenBusy: "followUp",
						requestId: `bash-background-report:${task.id}`,
					},
					context,
				);
				await runtime.commit(
					() => ({ status: "terminal", outcome: { status: "completed", result: task.state.checkpoint.result } }),
					context,
				);
			},
		},
		async abort(task, runtime, context) {
			const entry = children.get(task.id);
			if (entry?.pgid !== undefined) await terminate(entry);
			await runtime.commit(
				() => ({ status: "terminal", outcome: { status: "aborted", reason: "aborted by the host" } }),
				context,
			);
		},
	},
};

/** One word for a result, as the report header and the task listing show it. */
export function statusWord(result) {
	const word = result.status === "exited" ? `exited ${result.exitCode}` : result.status;
	return result.termination === "survived" ? `${word}, end unconfirmed` : word;
}

/**
 * The follow-up input a finished task posts to its conversation. It arrives as a user-role input, so its
 * first line says what it is: an automated result of one task, not something the operator typed.
 */
export function reportText(taskId, input, result) {
	const elapsed =
		result.endedAt !== undefined && result.startedAt !== undefined
			? ` after ${formatDuration(result.endedAt - result.startedAt)}`
			: "";
	const outcome =
		result.status === "exited"
			? `It exited with code ${result.exitCode}${elapsed}.`
			: result.status === "timedOut"
				? `It hit the ${input.timeoutSecs}s timeout you set and was terminated${elapsed}.`
				: result.status === "killed"
					? `It was killed (signal ${result.signal ?? "unknown"})${elapsed}.`
					: result.status === "failed"
						? `It failed to start: ${result.error}`
						: "The durable app stopped after this task recorded its intent to run the command and before it recorded a result.";
	const directive =
		result.status === "interrupted"
			? [
					"Its outcome is unknown, and it was NOT run again.",
					result.pgid === null
						? "No process group id was recorded: the command may never have started, or it started and its process group was not recorded."
						: `A process was started as process group ${result.pgid}: it may have run partly, finished, or still be running orphaned (the id may also have been reused since).`,
					"Check its log and the system state before deciding whether to run it again.",
				].join(" ")
			: result.status === "timedOut"
				? "The command did not finish in the time you allowed. Decide whether it needs longer, whether it is stuck, or whether a narrower command would do — do not blindly re-run it."
				: result.status === "failed"
					? "The command could not be started at all. Check the command and working directory."
					: result.status === "killed"
						? "It was stopped before it finished."
						: result.exitCode === 0
							? "Continue with the work this task was blocking."
							: "This did not pass. Read the output, fix the cause, and re-run it.";
	return [
		`[background task result] bash_background #${taskId} · status: ${statusWord(result)} · automated report, not from the user`,
		input.description ? `Description: ${input.description}` : undefined,
		`Command: ${input.command}`,
		`Working directory: ${input.cwd}`,
		`Full log: ${input.logPath}${result.logBytesDropped > 0 ? ` (capped; ${result.logBytesDropped} bytes not written)` : ""}`,
		result.logError === undefined ? undefined : `The log could not be written (${result.logError}); the tail below is from memory.`,
		outcome,
		result.termination === "survived"
			? `WARNING: its process group ${result.pgid} was sent SIGTERM and then SIGKILL but was still present when this app stopped waiting — its end is NOT confirmed. Check the system for processes of group ${result.pgid} before relying on it having stopped or running it again. Its log is kept (no result mark).`
			: undefined,
		"",
		result.status === "interrupted" ? undefined : result.tail ? `Output (tail):\n${result.tail}` : "No output.",
		result.status === "interrupted" ? undefined : "",
		directive,
	]
		.filter((line) => line !== undefined)
		.join("\n");
}

async function liveCount(tx) {
	let n = 0;
	for (const status of LIVE_STATUSES) n += (await tx.scanTasks({ kind: TASK_KIND, status }, MAX_LIVE + 1)).items.length;
	return n;
}

const text = (value, details) => ({ content: [{ type: "text", text: value }], ...(details ? { details } : {}) });

function describe(record) {
	const { input, state } = record;
	const label = input.description ? `${input.description} — ` : "";
	const span =
		record.startedAt === undefined ? "" : ` (${formatDuration((record.endedAt ?? Date.now()) - record.startedAt)})`;
	let status;
	if (state.status === "terminal" || state.status === "completing") {
		const outcome = state.outcome;
		status =
			outcome.status === "completed"
				? statusWord(outcome.result)
				: outcome.status === "faulted"
					? `faulted (${outcome.error.message})`
					: outcome.status;
	} else status = `${state.status} ${state.checkpoint.phase}${children.has(record.id) ? "" : " (no process here)"}`;
	return `#${record.id} ${status}${span}: ${label}${input.command}`;
}

const startTool = {
	name: "bash_background",
	description:
		"Start a long-running bash command in the background and return immediately with a task id. You are " +
		"re-invoked automatically with its exit status and output when it finishes, so do NOT poll or wait: start " +
		"it, continue with other useful work or end your turn, and act on the report when it arrives. Use it for " +
		"builds, test suites, type checks, installs and anything else over roughly thirty seconds; use bash for quick " +
		"commands. Never announce that you will run a slow command and then end the turn without starting it. The " +
		"command is never re-run automatically: if this app stops while it runs, you get an `interrupted` report.",
	parameters: {
		type: "object",
		properties: {
			command: { type: "string", description: "Bash command to run in the background" },
			description: { type: "string", description: "Short label for this task, e.g. 'pnpm check'" },
			cwd: { type: "string", description: "Working directory (default: the conversation's directory)" },
			timeout: {
				type: "number",
				exclusiveMinimum: 0,
				maximum: MAX_TIMEOUT_SECS,
				description: `Kill the command after this many seconds (optional, no default; at most ${MAX_TIMEOUT_SECS})`,
			},
		},
		required: ["command"],
		additionalProperties: false,
	},
	replay: "unsafe",
	async execute(args, api, context) {
		if (!args.command.trim()) throw new Error("command is empty");
		if (args.timeout !== undefined && !(args.timeout > 0 && args.timeout <= MAX_TIMEOUT_SECS)) {
			throw new Error(`timeout must be more than 0 and at most ${MAX_TIMEOUT_SECS} seconds, got ${args.timeout}`);
		}
		const base = (await api.agent(context)).cwd ?? process.cwd();
		const cwd = args.cwd === undefined ? base : path.resolve(base, args.cwd);
		if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new Error(`Working directory does not exist: ${cwd}`);
		const dir = logDir();
		pruneOldLogs(dir);
		const input = {
			command: args.command,
			description: args.description ?? "",
			cwd,
			...(args.timeout === undefined ? {} : { timeoutSecs: args.timeout }),
			logPath: path.join(dir, `${Date.now()}-${randomUUID().slice(0, 8)}.log`),
		};
		const id = await api.commit(async (tx) => {
			if ((await liveCount(tx)) >= MAX_LIVE) {
				throw new Error(
					`Refusing to start: ${MAX_LIVE} background tasks are already live. Wait for a report, or stop one with bash_background_check.`,
				);
			}
			return tx.createTask(BackgroundBashTask, input, { ownership: { kind: "conversation" }, background: true });
		}, context);
		return text(
			[
				`Started background task #${id}.`,
				`Command: ${input.command}`,
				`Working directory: ${input.cwd}`,
				`Log: ${input.logPath}`,
				"",
				"You will be re-invoked automatically when it ends. Do not poll for it and do not wait idly — continue",
				"with other work, or end the turn if there is nothing else to do.",
			].join("\n"),
			{ taskId: id, logPath: input.logPath },
		);
	},
};

const checkTool = {
	name: "bash_background_check",
	description:
		"Inspect background tasks started with bash_background: list them, read a task's output, or stop one. You " +
		"normally do not need this — finished tasks report themselves. Use it to look at a task that is still " +
		"running, or to stop one.",
	parameters: {
		type: "object",
		properties: {
			id: { type: "integer", description: "Task id, e.g. 12. Omit to list recent tasks." },
			kill: { type: "boolean", description: "Send SIGTERM to the task's process group (SIGKILL after 5s)" },
			lines: { type: "integer", minimum: 1, description: "How many trailing output lines to show (default 60)" },
		},
		additionalProperties: false,
	},
	replay: "unsafe",
	async execute(args, api, context) {
		if (args.lines !== undefined && !(Number.isInteger(args.lines) && args.lines >= 1)) {
			throw new Error(`lines must be a positive integer, got ${args.lines}`);
		}
		if (args.id === undefined) {
			const page = await api.commit((tx) => tx.scanTasks({ kind: TASK_KIND, order: "descending" }, 20), context);
			if (page.items.length === 0) return text("No background tasks.");
			return text(page.items.map(describe).join("\n"), { count: page.items.length });
		}
		const record = await api.getTask(args.id, context);
		if (record === undefined || record.kind !== TASK_KIND) throw new Error(`No such background task: #${args.id}`);
		const entry = children.get(record.id);
		if (args.kill) {
			// Only a process group this app spawned and still holds. A pgid recorded by an earlier run is never
			// signalled: it may be an orphan, or the id may belong to someone else by now.
			if (entry?.pgid === undefined) {
				const live = LIVE_STATUSES.includes(record.state.status);
				const result = record.state.outcome?.result ?? record.state.checkpoint?.result;
				const why = !live
					? "it has already ended"
					: result?.status === "interrupted"
						? "it was interrupted by an earlier stop of this app, and its process group is not this app's to signal"
						: "this app holds no process for it (it has not started here yet, or it is being reported)";
				return text(`Nothing was signalled: #${record.id} — ${why}. ${describe(record)}`, { killed: null });
			}
			entry.killRequested = true;
			terminate(entry);
			return text(`Sent SIGTERM to #${record.id}'s process group. You will get its report when it exits.`, {
				killed: record.id,
			});
		}
		const lines = args.lines ?? 60;
		const result = record.state.outcome?.result ?? record.state.checkpoint?.result;
		const output =
			entry !== undefined
				? tailText(entry.tail.toString("utf8"), lines)
				: result?.tail !== undefined
					? tailText(result.tail, lines)
					: "<no output held by this app>";
		const empty = entry !== undefined ? "No output yet." : "No output.";
		return text(`${describe(record)}\nLog: ${record.input.logPath}\n\n${output || empty}`, {
			status: record.state.status,
		});
	},
};

export default { name: EXTENSION_NAME, tools: [startTool, checkTool], tasks: [BackgroundBashTask] };
