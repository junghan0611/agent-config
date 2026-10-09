/**
 * Scenarios for background.test.mjs, one per child process:
 *
 *   node scenarios.mjs <name> [step]
 *
 * Run only by that test, with a synthetic HOME and cwd and AGENT_CONFIG_ENTWURF_DIR. Each prints one JSON line.
 * Crash scenarios run in two steps against the same test-owned SQLite file: step `crash` dies by SIGKILL at a
 * chosen point, step `reopen` opens the file again with the real extension.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import agentConfig from "../index.mjs";
import { context, emit, gated, Hold, open, sleep, until } from "./driver.mjs";

const [name, step] = process.argv.slice(2);
const here = (file) => path.join(process.cwd(), file);
const marker = here("marker");
const gate = here("gate");
const database = here("session.sqlite");
const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");
const runs = () => read(marker).split("\n").filter(Boolean).length;
const release = (file = gate) => writeFileSync(file, "");
const task = agentConfig.tasks[0].definition;
const die = () => process.kill(process.pid, "SIGKILL");

/** Whether a process group exists (signal 0). ESRCH is the answer "no", not a failure. */
function groupAlive(pgid) {
	try {
		process.kill(-pgid, 0);
		return true;
	} catch (error) {
		if (error.code === "ESRCH") return false;
		throw error;
	}
}

const outcome = async (h, id) => (await h.root.commit((tx) => tx.task(id), context))?.state;
const started = (text) => Number(/Started background task #(\d+)/.exec(text)?.[1]);
async function startTask(h, args) {
	await h.say(`RUN ${JSON.stringify(args)}`);
	const results = await h.toolResults();
	return { id: started(results.at(-1)), result: results.at(-1) };
}
const settle = async (h, n = 1) => {
	await until(async () => (await h.reports()).length >= n, 20_000, `${n} report(s)`);
	await until(async () => (await h.answers()).filter((a) => a.startsWith("noted")).length >= n, 20_000, "noted");
	await until(async () => (await h.graph()).length === 0, 10_000, "empty graph");
};

const scenarios = {
	/** Start returns at once; the conversation is idle while the command runs; one report wakes the model. */
	async nonblocking() {
		const h = await open({ extensions: [agentConfig] });
		const t0 = Date.now();
		const { id, result } = await startTask(h, { command: gated({ marker, gate }), description: "probe" });
		const startMs = Date.now() - t0;
		await h.root.waitForIdle(context);
		const whileRunning = { graph: await h.graph(), live: await h.live(), runs: runs(), reports: (await h.reports()).length };
		release();
		await settle(h);
		const state = await outcome(h, id);
		emit({ id, result, startMs, whileRunning, reports: await h.reports(), answers: await h.answers(), runs: runs(), state });
		await h.harness.close(context);
	},

	/** The report arrives while the root is busy: it waits in the inbox as a follow-up, then starts the next run. */
	async busy() {
		const h = await open({ extensions: [agentConfig, Hold] });
		await startTask(h, { command: gated({ marker, gate }) });
		const hold = here("hold");
		const held = await h.root.submit({ type: "input", content: `HOLD ${JSON.stringify({ gate: hold })}` }, context);
		await until(() => h.live(), 10_000, "busy root");
		release();
		const queued = await until(async () => {
			const items = await h.inbox();
			return items.length > 0 ? items : false;
		}, 15_000, "queued report");
		const reportsWhileBusy = (await h.reports()).length;
		release(hold);
		await held.wait(context);
		await settle(h);
		emit({ queued, reportsWhileBusy, reports: (await h.reports()).length, answers: await h.answers() });
		await h.harness.close(context);
	},

	/** Non-zero exit, a timeout (with a group that ignores SIGTERM), and a spawn that cannot happen. */
	async failures() {
		const h = await open({ extensions: [agentConfig] });
		const pidfile = here("pid");
		const a = await startTask(h, { command: "echo broken >&2; exit 3" });
		const b = await startTask(h, {
			command: `echo $$ > ${JSON.stringify(pidfile)}; trap '' TERM; sleep 30`,
			timeout: 1,
		});
		// A NUL byte: node refuses the spawn synchronously.
		const c = await startTask(h, { command: "echo a\u0000b" });
		const t0 = Date.now();
		await settle(h, 3);
		// A missing directory is refused by the tool itself: no task, nothing spawned.
		const tasksBefore = (await h.root.commit((tx) => tx.scanTasks({ kind: "agent-config.bash-background" }, 50), context)).items.length;
		await h.say(`RUN ${JSON.stringify({ command: "true", cwd: here("missing-dir") })}`);
		const missingCwd = (await h.toolResults()).at(-1);
		const tasksAfter = (await h.root.commit((tx) => tx.scanTasks({ kind: "agent-config.bash-background" }, 50), context)).items.length;
		const pgid = Number(read(pidfile).trim());
		emit({
			ids: [a.id, b.id, c.id],
			reports: await h.reports(),
			states: [await outcome(h, a.id), await outcome(h, b.id), await outcome(h, c.id)],
			pgid,
			groupAlive: groupAlive(pgid),
			elapsedMs: Date.now() - t0,
			missingCwd,
			tasksBefore,
			tasksAfter,
		});
		await h.harness.close(context);
	},

	/** Stop through the check tool: only this process's own child; listing; already-ended. */
	async stop() {
		const h = await open({ extensions: [agentConfig] });
		const pidfile = here("pid");
		const { id } = await startTask(h, { command: `echo $$ > ${JSON.stringify(pidfile)}; sleep 30` });
		await until(() => read(pidfile).trim(), 10_000, "pid");
		await h.say(`CHECK ${JSON.stringify({ id, kill: true })}`);
		const killResult = (await h.toolResults()).at(-1);
		await settle(h);
		await h.say(`CHECK ${JSON.stringify({ id, kill: true })}`);
		const again = (await h.toolResults()).at(-1);
		await h.say(`CHECK ${JSON.stringify({})}`);
		const listing = (await h.toolResults()).at(-1);
		await h.say(`CHECK ${JSON.stringify({ id })}`);
		const detail = (await h.toolResults()).at(-1);
		const pgid = Number(read(pidfile).trim());
		emit({ id, killResult, again, listing, detail, reports: await h.reports(), groupAlive: groupAlive(pgid) });
		await h.harness.close(context);
	},

	/** At most five live; the sixth start is refused in the creating commit and nothing is spawned for it. */
	async cap() {
		const h = await open({ extensions: [agentConfig] });
		for (let i = 0; i < 5; i++) await startTask(h, { command: gated({ marker, gate }) });
		await until(() => runs() === 5, 10_000, "five running");
		await h.say(`RUN ${JSON.stringify({ command: gated({ marker, gate }) })}`);
		const refused = (await h.toolResults()).at(-1);
		const liveAtCap = (await h.graph()).length;
		release();
		await settle(h, 5);
		emit({ refused, liveAtCap, runs: runs(), reports: (await h.reports()).length });
		await h.harness.close(context);
	},

	/** Ordinary abort leaves background work; abort({ background: true }) kills it, terminal aborted, no report. */
	async abort() {
		const h = await open({ extensions: [agentConfig] });
		const first = await startTask(h, { command: gated({ marker, gate }) });
		await h.root.abort(context);
		const afterOrdinary = await h.graph();
		release();
		await settle(h);
		const pidfile = here("pid");
		const second = await startTask(h, { command: `echo $$ > ${JSON.stringify(pidfile)}; sleep 30` });
		await until(() => read(pidfile).trim(), 10_000, "pid");
		await h.root.abort(context, { background: true });
		const pgid = Number(read(pidfile).trim());
		await until(() => !groupAlive(pgid), 8_000, "group gone");
		await sleep(300);
		emit({
			afterOrdinary,
			first: await outcome(h, first.id),
			second: await outcome(h, second.id),
			graph: await h.graph(),
			reports: (await h.reports()).length,
		});
		await h.harness.close(context);
	},

	/** Closing the app kills the group and writes no result; the reopen reports `interrupted` once, never re-runs. */
	async close() {
		const pidfile = here("pid");
		const h = await open({ extensions: [agentConfig], storage: database });
		const { id } = await startTask(h, { command: `echo $$ > ${JSON.stringify(pidfile)}; ${gated({ marker, gate })}` });
		await until(() => runs() === 1 && read(pidfile).trim(), 10_000, "running");
		const pgid = Number(read(pidfile).trim());
		await h.harness.close(context);
		const goneMs = await (async () => {
			const t0 = Date.now();
			await until(() => !groupAlive(pgid), 8_000, "group gone after close");
			return Date.now() - t0;
		})();
		const reports = [];
		for (let i = 0; i < 2; i++) {
			const again = await open({ extensions: [agentConfig], storage: database });
			again.harness.resume();
			await settle(again);
			reports.push(await again.reports());
			await again.harness.close(context);
		}
		release();
		await sleep(300);
		emit({ id, pgid, goneMs, runs: runs(), reports });
	},

	/** Created but never scheduled before a close: nothing ran, so the reopen runs it exactly once. */
	async pending() {
		const h = await open({ extensions: [agentConfig], storage: database });
		const input = { command: gated({ marker }), description: "", cwd: process.cwd(), logPath: here("pending.log") };
		const id = await h.root.commit(
			(tx) => tx.createTask(agentConfig.tasks[0], input, { ownership: { kind: "conversation" }, background: true }),
			context,
		);
		await h.harness.close(context);
		const runsBeforeReopen = runs();
		const again = await open({ extensions: [agentConfig], storage: database });
		again.harness.resume();
		await settle(again);
		emit({ id, runsBeforeReopen, runs: runs(), reports: await again.reports() });
		await again.harness.close(context);
	},

	/**
	 * Old logs: pruned only with an old result mark. A log whose text imitates the end line, a log without a
	 * mark, and a log whose mark is recent stay; an old mark whose log is gone is cleared.
	 */
	async prune() {
		const dir = path.join(process.env.HOME, ".pi", "durable-background");
		const { mkdirSync, utimesSync, readdirSync } = await import("node:fs");
		mkdirSync(dir, { recursive: true });
		const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
		const files = {
			"a-old-marked.log": "$ true\n",
			"a-old-marked.log.result": "{}\n",
			"b-old-unmarked.log": "$ sleep 1d\nstill going\n",
			"c-old-imitation.log": "$ echo\n[bash_background: process ended, exited 0]\n",
			"d-new-mark.log": "$ true\n",
			"d-new-mark.log.result": "{}\n",
			"e-orphan-mark.log.result": "{}\n",
		};
		for (const [file, body] of Object.entries(files)) {
			writeFileSync(path.join(dir, file), body);
			if (!file.startsWith("d-") || file.endsWith(".log")) utimesSync(path.join(dir, file), old, old);
		}
		const h = await open({ extensions: [agentConfig] });
		await startTask(h, { command: "true" });
		await settle(h);
		emit({ remaining: readdirSync(dir).filter((f) => !/^\d/.test(f)).sort() });
		await h.harness.close(context);
	},

	/** A real interrupted log (close → reopen) and a real completed one, both aged: only the completed one goes. */
	async pruneReal() {
		const dir = path.join(process.env.HOME, ".pi", "durable-background");
		const { utimesSync } = await import("node:fs");
		const logOf = (report) => /Full log: (\S+)/.exec(report.text)[1];
		const first = await open({ extensions: [agentConfig], storage: database });
		await startTask(first, { command: "echo finished" });
		await settle(first);
		const completed = logOf((await first.reports())[0]);
		await startTask(first, { command: gated({ marker, gate }) });
		await until(() => runs() === 1, 10_000, "running");
		await first.harness.close(context);
		const again = await open({ extensions: [agentConfig], storage: database });
		again.harness.resume();
		await settle(again, 2);
		const interruptedReport = (await again.reports()).at(-1);
		const interrupted = logOf(interruptedReport);
		const marks = { completed: existsSync(`${completed}.result`), interrupted: existsSync(`${interrupted}.result`) };
		const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
		for (const file of [completed, `${completed}.result`, interrupted]) utimesSync(file, old, old);
		await startTask(again, { command: "true" });
		await settle(again, 3);
		emit({
			dir,
			status: /status: (\S+)/.exec(interruptedReport.text)[1],
			interruptedLogText: read(interrupted),
			marks,
			survived: { completed: existsSync(completed), interrupted: existsSync(interrupted) },
		});
		await again.harness.close(context);
	},

	/** More output than the log cap: the file stops at the cap plus two marker lines; the report tail is the end. */
	async logcap() {
		const h = await open({ extensions: [agentConfig] });
		const command = "head -c 17000000 /dev/zero | tr '\\0' a; echo; echo tail-marker";
		const { id } = await startTask(h, { command });
		await settle(h);
		const state = await outcome(h, id);
		const { statSync } = await import("node:fs");
		const logPath = /Full log: (\S+)/.exec((await h.reports())[0].text)[1];
		const log = readFileSync(logPath, "utf8");
		emit({
			headerBytes: Buffer.byteLength(`$ ${command}\n`),
			size: statSync(logPath).size,
			head: log.slice(0, 60),
			end: log.slice(-200),
			result: { ...state.outcome.result, tail: state.outcome.result.tail.slice(-40) },
			report: (await h.reports())[0].text.slice(0, 600),
		});
		await h.harness.close(context);
	},

	/** The leader exits; a same-group descendant still holds stdout and prints later: the task stays live. */
	async late() {
		const h = await open({ extensions: [agentConfig] });
		const pidfile = here("pid");
		const { id } = await startTask(h, {
			command: `echo $$ > ${JSON.stringify(pidfile)}; (sleep 0.7; echo late-descendant-output) & echo early`,
		});
		const leader = Number(await until(() => read(pidfile).trim(), 10_000, "pid"));
		await until(() => {
			try {
				process.kill(leader, 0);
				return false;
			} catch (error) {
				if (error.code === "ESRCH") return true;
				throw error;
			}
		}, 10_000, "leader exit");
		const afterLeaderExit = { graph: (await h.graph()).length, reports: (await h.reports()).length };
		await settle(h);
		const state = await outcome(h, id);
		const log = read(/Full log: (\S+)/.exec((await h.reports())[0].text)[1]);
		emit({ afterLeaderExit, result: state.outcome.result, log });
		await h.harness.close(context);
	},

	/** Stop a group whose descendant ignores SIGTERM with its stdio on /dev/null: the report waits for SIGKILL. */
	async stopStubborn() {
		const h = await open({ extensions: [agentConfig] });
		const pidfile = here("pid");
		const desc = here("desc");
		const { id } = await startTask(h, {
			command: `echo $$ > ${JSON.stringify(pidfile)}; (trap '' TERM; echo up > ${JSON.stringify(desc)}; sleep 60) </dev/null >/dev/null 2>&1 & sleep 60`,
		});
		await until(() => read(pidfile).trim() && read(desc), 10_000, "descendant up");
		const pgid = Number(read(pidfile).trim());
		const t0 = Date.now();
		await h.say(`CHECK ${JSON.stringify({ id, kill: true })}`);
		await until(async () => (await h.reports()).length === 1, 20_000, "report");
		const groupAtReport = groupAlive(pgid);
		const reportMs = Date.now() - t0;
		await settle(h);
		emit({ pgid, groupAtReport, reportMs, result: (await outcome(h, id)).outcome.result });
		await h.harness.close(context);
	},

	/**
	 * A separate app process closes while a group with a TERM-ignoring /dev/null descendant runs, then ends
	 * NATURALLY (no process.exit): the joined termination must finish before the process can exit.
	 */
	async closeExit() {
		const h = await open({ extensions: [agentConfig] });
		const pidfile = here("pid");
		const desc = here("desc");
		await startTask(h, {
			command: `echo $$ > ${JSON.stringify(pidfile)}; (trap '' TERM; echo up > ${JSON.stringify(desc)}; sleep 60) </dev/null >/dev/null 2>&1 & sleep 60`,
		});
		await until(() => read(pidfile).trim() && read(desc), 10_000, "descendant up");
		const t0 = Date.now();
		await h.harness.close(context);
		emit({ pgid: Number(read(pidfile).trim()), closeMs: Date.now() - t0 });
	},

	/** Tool-level bounds: a timeout past Node's timer range and a non-positive line count are refused. */
	async bounds() {
		const h = await open({ extensions: [agentConfig] });
		await h.say(`RUN ${JSON.stringify({ command: "true", timeout: 3_000_000 })}`);
		const hugeTimeout = (await h.toolResults()).at(-1);
		await h.say(`RUN ${JSON.stringify({ command: "true", timeout: 0 })}`);
		const zeroTimeout = (await h.toolResults()).at(-1);
		const { id } = await startTask(h, { command: "echo one; echo two" });
		await settle(h);
		await h.say(`CHECK ${JSON.stringify({ id, lines: 0 })}`);
		const zeroLines = (await h.toolResults()).at(-1);
		await h.say(`CHECK ${JSON.stringify({ id, lines: 1 })}`);
		const oneLine = (await h.toolResults()).at(-1);
		const tasks = (await h.root.commit((tx) => tx.scanTasks({ kind: "agent-config.bash-background" }, 50), context)).items.length;
		emit({ hugeTimeout, zeroTimeout, zeroLines, oneLine, tasks });
		await h.harness.close(context);
	},

	/** The log directory disappears mid-run: no throw out of the child's handlers; the report says so. */
	async logloss() {
		const h = await open({ extensions: [agentConfig] });
		const dir = path.join(process.env.HOME, ".pi", "durable-background");
		const { id } = await startTask(h, { command: `sleep 0.2; rm -rf ${JSON.stringify(dir)}; sleep 0.2; echo after-loss` });
		await settle(h);
		emit({ state: await outcome(h, id), report: (await h.reports())[0].text });
		await h.harness.close(context);
	},

	/**
	 * Crash windows, by SIGKILL of the durable process itself. Step `crash` installs a copy of the task whose
	 * `launch` dies at the chosen point (the real `launch` for `running`); step `reopen` installs the real one.
	 */
	async crash() {
		const window = process.env.CRASH_WINDOW;
		const pidfile = here("pid");
		if (step === "reopen") {
			const h = await open({ extensions: [agentConfig], storage: database });
			const before = { runs: runs(), reports: (await h.reports()).length, graph: await h.graph() };
			h.harness.resume();
			await settle(h);
			await sleep(500);
			const reports = await h.reports();
			const answers = await h.answers();
			// The interrupted log, aged past the retention, survives the prune the next start runs.
			const log = /Full log: (\S+)/.exec(reports[0].text)[1];
			let retention = { logExisted: existsSync(log) };
			if (retention.logExisted) {
				const { utimesSync } = await import("node:fs");
				const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
				utimesSync(log, old, old);
				retention.mark = existsSync(`${log}.result`);
				await startTask(h, { command: "true" });
				await settle(h, 2);
				retention.survived = existsSync(log);
			}
			emit({ before, runs: runs(), reports, answers, retention });
			await h.harness.close(context);
			return;
		}
		const crashing = {
			// The intent is committed; the process dies before anything is spawned.
			intent: async (_task, runtime, ctx) => {
				await runtime.commit(() => ({ status: "running", checkpoint: { phase: "started" } }), ctx);
				die();
			},
			// A command is spawned after the intent; the process dies before its process group is recorded.
			spawned: async (t, runtime, ctx) => {
				await runtime.commit(() => ({ status: "running", checkpoint: { phase: "started" } }), ctx);
				const child = spawn("bash", ["-c", `echo $$ > ${JSON.stringify(pidfile)}; ${t.input.command}`], {
					cwd: t.input.cwd,
					stdio: "ignore",
					detached: true,
				});
				child.unref();
				await until(() => runs() === 1 && read(pidfile).trim(), 10_000, "spawned");
				die();
			},
			// The real launch; the process dies while the command runs.
			running: async (t, runtime, ctx) => {
				const real = task.phases.launch(t, runtime, ctx);
				await until(() => runs() === 1 && read(pidfile).trim(), 10_000, "running");
				die();
				await real;
			},
		}[window];
		const phases = { ...task.phases };
		if (crashing) phases.launch = crashing;
		if (window === "report") {
			// The real phases; the report is admitted, and the process dies before the terminal commit.
			phases.report = (t, runtime, ctx) =>
				task.phases.report(
					t,
					new Proxy(runtime, {
						get: (target, key) => (key === "commit" ? () => die() : Reflect.get(target, key)),
					}),
					ctx,
				);
		}
		const extension = { ...agentConfig, tasks: [{ definition: { ...task, phases } }] };
		const h = await open({ extensions: [extension], storage: database });
		const command =
			window === "running"
				? `echo $$ > ${JSON.stringify(pidfile)}; ${gated({ marker, gate })}`
				: gated({ marker, gate: window === "report" ? undefined : gate });
		await startTask(h, { command });
		await sleep(30_000);
		throw new Error(`crash window ${window} never died`);
	},
};

const run = scenarios[name];
if (run === undefined) throw new Error(`unknown scenario ${name}`);
await run();
