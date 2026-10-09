/**
 * pi-durable/background-bash.mjs (through index.mjs) — API 0, nothing of the operator's touched.
 *
 *   node --test pi-durable/tests/
 *
 * Two halves:
 *   1. Units: background-bash.mjs in this process (no import-time effect; it reads HOME only when a tool
 *      runs); index.mjs only in a child with a synthetic HOME, because importing it evaluates env.mjs.
 *   2. Scenarios (tests/scenarios.mjs), each in a child node whose environment is built from nothing, with a
 *      synthetic HOME and cwd: a real durable `Harness` from the Entwurf checkout's SDK on MemoryStorage or a
 *      test-owned temporary SQLite file, pi-ai's faux provider as the only model, real bash children. No
 *      network, credential, live durable DB, TUI or vendor model turn.
 *
 * The scenarios need a built Entwurf checkout (AGENT_CONFIG_ENTWURF_DIR, default ~/repos/gh/entwurf). Without
 * one this file FAILS by name (`entwurf-checkout-missing`), never a skip that exits 0.
 *
 * What this does not prove: the durable app's TUI (no footer badge exists — that is an Entwurf product change),
 * a real model choosing the tool, the bridge child's environment, or behavior under any SDK but the checkout's.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
// background-bash.mjs does nothing at import (it reads HOME only when a tool runs). index.mjs evaluates env.mjs,
// which reads the home ~/.env.local and edits process.env — so it is imported only inside a child with a
// synthetic HOME (the index-shape unit below), never here.
import { ANSI_ESCAPE, MAX_TIMEOUT_SECS, markEligible, reportText, stripAnsi, tailText } from "../background-bash.mjs";

const SCENARIOS = fileURLToPath(new URL("./scenarios.mjs", import.meta.url));
const INDEX = fileURLToPath(new URL("../index.mjs", import.meta.url));
const PI_EXTENSION = fileURLToPath(new URL("../../pi-extensions/background-bash.ts", import.meta.url));
const ENTWURF = process.env.AGENT_CONFIG_ENTWURF_DIR ?? path.join(homedir(), "repos", "gh", "entwurf");
const SDK = path.join(ENTWURF, "node_modules", "@earendil-works");
const missing = [
	path.join(SDK, "pi-durable", "dist", "index.js"),
	path.join(SDK, "pi-durable", "dist", "storage", "sqlite", "node.js"),
	path.join(SDK, "pi-ai", "dist", "providers", "faux.js"),
	path.join(SDK, "chord", "dist", "context", "index.js"),
].filter((file) => !existsSync(file));
const skip = missing.length > 0 && "entwurf-checkout-missing (see the prerequisite test)";

it("[prerequisite] the Entwurf checkout's durable SDK is present", () => {
	assert.deepEqual(missing, [], `entwurf-checkout-missing: ${missing.join(", ")}`);
});

const roots = [];
after(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function sandbox() {
	const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pi-durable-bg-")));
	roots.push(root);
	const home = path.join(root, "home");
	const cwd = path.join(root, "project");
	mkdirSync(home);
	mkdirSync(cwd);
	return { root, home, cwd };
}

function scenario(box, name, { step, env = {}, expectKilled = false } = {}) {
	const r = spawnSync(process.execPath, [SCENARIOS, name, ...(step ? [step] : [])], {
		cwd: box.cwd,
		env: { PATH: process.env.PATH, HOME: box.home, AGENT_CONFIG_ENTWURF_DIR: ENTWURF, ...env },
		encoding: "utf8",
		timeout: 90_000,
	});
	if (expectKilled) {
		assert.equal(r.signal, "SIGKILL", `${name}/${step} should die by SIGKILL: ${r.status} ${r.stderr}`);
		return undefined;
	}
	assert.equal(r.status, 0, `${name}${step ? `/${step}` : ""}: ${r.signal ?? ""} ${r.stderr}`);
	return JSON.parse(r.stdout.trim().split("\n").at(-1));
}

const header = (text) => text.split("\n")[0];

function groupAlive(pgid) {
	try {
		process.kill(-pgid, 0);
		return true;
	} catch (error) {
		if (error.code === "ESRCH") return false;
		throw error;
	}
}

describe("units (this process)", () => {
	it("strips terminal control sequences exactly as pi-extensions/background-bash.ts does", () => {
		const source = readFileSync(PI_EXTENSION, "utf8");
		const block = /const ANSI_ESCAPE = new RegExp\(\n\t(\[[\s\S]*?\])\.join\("\|"\),\n\t"g",\n\);/.exec(source);
		assert.ok(block, `ANSI_ESCAPE not found in ${PI_EXTENSION} — the comparator needs updating`);
		const theirs = new RegExp(new Function(`return ${block[1]}`)().join("|"), "g");
		assert.equal(ANSI_ESCAPE.source, theirs.source);
		const corpus = "\x1b]0;title\x07a\x1b[31mred\x1b[0m\x1b(0b\x1b7c\x1b[200~p\x1b[201~\rprogress\r\n";
		assert.equal(stripAnsi(corpus), "aredbcp\nprogress\r\n");
	});

	it("tails by lines and by UTF-8 bytes, marker included, cutting only on character boundaries", () => {
		const lines = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
		assert.equal(tailText(lines, 3), "line 197\nline 198\nline 199");
		const MARK = "<truncated>\n";
		// One long line of 2-, 3- and 4-byte characters, cut at every byte position.
		for (const unit of ["é", "가", "😀"]) {
			const long = unit.repeat(100);
			for (let max = 13; max <= 60; max++) {
				const tail = tailText(long, 120, max);
				assert.ok(Buffer.byteLength(tail) <= max, `${unit} ${max}: ${Buffer.byteLength(tail)} bytes`);
				assert.ok(tail.startsWith(MARK), `${unit} ${max}`);
				const body = tail.slice(MARK.length);
				assert.ok(!body.includes("�"), `${unit} ${max}: ${JSON.stringify(body)}`);
				assert.ok(long.endsWith(body), `${unit} ${max}`);
				assert.ok(Buffer.byteLength(body) > max - MARK.length - Buffer.byteLength(unit), `${unit} ${max}: too short`);
			}
		}
		// The reviewer's case: 101 bytes, the 12-byte marker included, leaves 89 bytes = 29 whole characters.
		assert.equal(tailText("가".repeat(100), 120, 101), `${MARK}${"가".repeat(29)}`);
		// A line break inside the cut moves the cut to the next line start.
		assert.equal(tailText(`${"가".repeat(50)}\n${"나".repeat(5)}`, 120, 40), `${MARK}${"나".repeat(5)}`);
		// A replacement character the command itself printed is output, not damage: it stays.
		assert.equal(tailText(`x${"�".repeat(3)}y`, 120, 100), `x${"�".repeat(3)}y`);
		assert.ok(tailText(`${"a".repeat(200)}�z`, 120, 30).endsWith("�z"));
	});

	it("a report names itself as an automated task result, and an interrupted one keeps its uncertainty", () => {
		const input = { command: "make", description: "", cwd: "/w", logPath: "/l.log" };
		const exited = reportText(7, input, { status: "exited", exitCode: 0, tail: "ok", startedAt: 0, endedAt: 1000 });
		assert.equal(header(exited), "[background task result] bash_background #7 · status: exited 0 · automated report, not from the user");
		const lost = reportText(7, input, { status: "interrupted", pgid: null });
		assert.match(header(lost), /status: interrupted/);
		assert.match(lost, /NOT run again/);
		assert.match(lost, /may never have started/);
		const orphan = reportText(7, input, { status: "interrupted", pgid: 4242 });
		assert.match(orphan, /process group 4242: it may have run partly, finished, or still be running orphaned/);
		assert.doesNotMatch(orphan, /Continue with the work/);
	});

	it("a termination that could not confirm the group gone: the report warns, the log gets no result mark", () => {
		const input = { command: "stuck", description: "", cwd: "/w", logPath: "/l.log" };
		const base = { exitCode: null, signal: "SIGKILL", tail: "", startedAt: 0, endedAt: 7000 };
		for (const status of ["killed", "timedOut"]) {
			const survived = { ...base, status, termination: "survived", pgid: 4242 };
			const text = reportText(9, input, survived);
			assert.match(header(text), new RegExp(`status: ${status}, end unconfirmed`));
			assert.match(text, /WARNING: its process group 4242 was sent SIGTERM and then SIGKILL but was still present/);
			assert.match(text, /its end is NOT confirmed\. Check the system for processes of group 4242/);
			assert.equal(markEligible(survived), false);
		}
		for (const termination of ["terminated", "killed", undefined]) {
			const ended = { ...base, status: "killed", ...(termination ? { termination, pgid: 4242 } : {}) };
			assert.doesNotMatch(reportText(9, input, ended), /WARNING|end unconfirmed/);
			assert.equal(markEligible(ended), true);
		}
		assert.equal(markEligible({ status: "exited", exitCode: 0 }), true);
	});

	it("index.mjs is one native object: env first, then the two tools and one task, named agent-config", () => {
		const box = sandbox();
		const r = spawnSync(
			process.execPath,
			[
				"--input-type=module",
				"-e",
				`const m = await import(${JSON.stringify(pathToFileURL(INDEX).href)}); const d = m.default;
				console.log(JSON.stringify({ name: d.name, tools: d.tools.map((t) => [t.name, t.replay]), tasks: d.tasks.map((t) => t.definition.name), sections: d.sections, hooks: d.hooks, wraps: d.wraps }));`,
			],
			{ cwd: box.cwd, env: { PATH: process.env.PATH, HOME: box.home }, encoding: "utf8" },
		);
		assert.equal(r.status, 0, r.stderr);
		const agentConfig = JSON.parse(r.stdout);
		assert.equal(agentConfig.name, "agent-config");
		assert.deepEqual(
			agentConfig.tools,
			[
				["bash_background", "unsafe"],
				["bash_background_check", "unsafe"],
			],
		);
		assert.deepEqual(agentConfig.tasks, ["agent-config.bash-background"]);
		for (const key of ["sections", "hooks", "wraps"]) assert.deepEqual(agentConfig[key], []);
	});
});

describe("background-bash on the real durable SDK (faux model, synthetic HOME)", { skip, concurrency: 4 }, () => {
	it("start returns at once; the conversation is idle while it runs; ONE report wakes the model", () => {
		const out = scenario(sandbox(), "nonblocking");
		assert.ok(out.startMs < 5_000, `start took ${out.startMs}ms`);
		assert.match(out.result, /^Started background task #\d+\./);
		assert.deepEqual(out.whileRunning.graph, [
			{ id: out.id, kind: "agent-config.bash-background", status: "running", background: true },
		]);
		assert.equal(out.whileRunning.live, false); // no run: the root is idle while the command runs
		assert.equal(out.whileRunning.reports, 0);
		assert.equal(out.runs, 1);
		assert.equal(out.reports.length, 1);
		assert.equal(header(out.reports[0].text), `[background task result] bash_background #${out.id} · status: exited 0 · automated report, not from the user`);
		assert.match(out.reports[0].text, /Output \(tail\):\ndone-output/);
		assert.equal(out.answers.filter((a) => a.startsWith("noted")).length, 1);
		// The normal path never passes through `started` as a phase of its own: the result is the command's.
		assert.equal(out.state.status, "terminal");
		assert.equal(out.state.outcome.result.status, "exited");
	});

	it("a report that arrives while the root is busy waits as a follow-up, then starts the next run", () => {
		const out = scenario(sandbox(), "busy");
		assert.equal(out.reportsWhileBusy, 0);
		assert.equal(out.queued.length, 1);
		assert.equal(out.queued[0].mode, "followUp");
		assert.match(header(out.queued[0].text), /^\[background task result\] bash_background #\d+ · status: exited 0/);
		assert.equal(out.reports, 1);
		assert.deepEqual(out.answers.slice(-2), ["ok released", out.answers.at(-1)]);
		assert.match(out.answers.at(-1), /^noted \[background task result\]/);
	});

	it("non-zero exit, timeout (escalating to SIGKILL past an ignored SIGTERM), refused spawn, missing cwd", () => {
		const out = scenario(sandbox(), "failures");
		const [a, b, c] = out.states.map((state) => state.outcome.result);
		assert.deepEqual([a.status, a.exitCode, a.tail], ["exited", 3, "broken"]);
		assert.deepEqual([b.status, b.signal], ["timedOut", "SIGKILL"]);
		assert.ok(out.elapsedMs >= 4_000, `the SIGKILL grace was skipped: ${out.elapsedMs}ms`);
		assert.equal(out.groupAlive, false);
		assert.equal(c.status, "failed");
		assert.match(c.error, /null bytes/);
		const byId = Object.fromEntries(out.reports.map((r) => [Number(/#(\d+)/.exec(r.text)[1]), r.text]));
		assert.match(byId[out.ids[0]], /This did not pass/);
		assert.match(byId[out.ids[1]], /hit the 1s timeout you set/);
		assert.match(byId[out.ids[2]], /could not be started at all/);
		assert.match(out.missingCwd, /\[error\] Working directory does not exist: .*missing-dir/);
		assert.equal(out.tasksAfter, out.tasksBefore);
	});

	it("stop signals only this app's own child; ended and listing are reported, not hidden", () => {
		const out = scenario(sandbox(), "stop");
		assert.match(out.killResult, /^Sent SIGTERM to #\d+'s process group/);
		assert.equal(out.reports.length, 1);
		assert.match(header(out.reports[0].text), /status: killed/);
		assert.match(out.again, /^Nothing was signalled: #\d+ — it has already ended\./);
		assert.match(out.listing, new RegExp(`^#${out.id} killed`));
		assert.match(out.detail, /\n\nNo output\.$/);
		assert.equal(out.groupAlive, false);
	});

	it("at most five live; the sixth is refused in the creating commit and spawns nothing", () => {
		const out = scenario(sandbox(), "cap");
		assert.match(out.refused, /\[error\] Refusing to start: 5 background tasks are already live/);
		assert.equal(out.liveAtCap, 5);
		assert.equal(out.runs, 5);
		assert.equal(out.reports, 5);
	});

	it("ordinary abort leaves background work; abort({ background: true }) kills it — terminal aborted, no report", () => {
		const out = scenario(sandbox(), "abort");
		assert.equal(out.afterOrdinary.length, 1);
		assert.equal(out.first.outcome.result.status, "exited");
		assert.deepEqual(out.second.outcome, { status: "aborted", reason: "aborted by the host" });
		assert.deepEqual(out.graph, []);
		assert.equal(out.reports, 1); // the first one only
	});

	it("closing the app kills the group and writes no result; every reopen sees ONE interrupted report; no re-run", () => {
		const out = scenario(sandbox(), "close");
		assert.ok(out.goneMs < 8_000);
		assert.equal(out.runs, 1);
		assert.equal(out.reports.length, 2);
		for (const reports of out.reports) {
			assert.equal(reports.length, 1);
			assert.match(header(reports[0].text), new RegExp(`#${out.id} · status: interrupted`));
			assert.match(reports[0].text, new RegExp(`process group ${out.pgid}`));
		}
	});

	it("a task created but never scheduled before a close runs exactly once on reopen", () => {
		const out = scenario(sandbox(), "pending");
		assert.equal(out.runsBeforeReopen, 0);
		assert.equal(out.runs, 1);
		assert.equal(out.reports.length, 1);
		assert.match(header(out.reports[0].text), /status: exited 0/);
	});

	it("prunes only logs with an old result mark; printed text cannot impersonate the mark", () => {
		const out = scenario(sandbox(), "prune");
		assert.deepEqual(out.remaining, ["b-old-unmarked.log", "c-old-imitation.log", "d-new-mark.log", "d-new-mark.log.result"]);
	});

	it("a real interrupted log (close → reopen) survives aging; a real completed one is pruned", () => {
		const out = scenario(sandbox(), "pruneReal");
		assert.equal(out.status, "interrupted");
		assert.match(out.interruptedLogText, /\[bash_background: process ended, killed SIGTERM\]\n$/); // the old false authority
		assert.deepEqual(out.marks, { completed: true, interrupted: false });
		assert.deepEqual(out.survived, { completed: false, interrupted: true });
	});

	it("a same-group descendant that still holds stdout keeps the task live and its late output in the result", () => {
		const out = scenario(sandbox(), "late");
		assert.deepEqual(out.afterLeaderExit, { graph: 1, reports: 0 });
		assert.equal(out.result.status, "exited");
		assert.equal(out.result.tail, "early\nlate-descendant-output");
		assert.ok(out.result.endedAt - out.result.startedAt >= 600);
		assert.match(out.log, /\nearly\nlate-descendant-output\n\n\[bash_background: process ended, exited 0\]\n$/);
	});

	it("stop of a TERM-ignoring /dev/null descendant: the report comes only after SIGKILL took the group", () => {
		const out = scenario(sandbox(), "stopStubborn");
		assert.equal(out.groupAtReport, false);
		assert.ok(out.reportMs >= 4_500, `${out.reportMs}ms`);
		assert.equal(out.result.status, "killed");
		assert.equal(out.result.termination, "killed");
	});

	it("a separate app process that closes and exits naturally leaves no TERM-ignoring descendant behind", () => {
		const box = sandbox();
		const t0 = Date.now();
		const out = scenario(box, "closeExit");
		const exitMs = Date.now() - t0;
		const alive = groupAlive(out.pgid);
		if (alive) process.kill(-out.pgid, "SIGKILL"); // this test's own group only
		assert.equal(alive, false, `group ${out.pgid} outlived the app process`);
		assert.ok(out.closeMs >= 4_500, `close joined the termination: ${out.closeMs}ms`);
		assert.ok(exitMs < 20_000);
	});

	it("tool bounds: a timeout outside (0, Node's timer max] and lines < 1 are refused", () => {
		const out = scenario(sandbox(), "bounds");
		assert.equal(MAX_TIMEOUT_SECS, 2147483);
		assert.match(out.hugeTimeout, /\[error\][^]*timeout: must be <= 2147483/);
		assert.match(out.zeroTimeout, /\[error\][^]*timeout: must be > 0/);
		assert.match(out.zeroLines, /\[error\][^]*lines: must be >= 1/);
		assert.match(out.oneLine, /\n\ntwo$/);
		assert.equal(out.tasks, 1);
	});

	it("the whole log file, header and closing markers included, stays within the cap; the report's tail is the real end", () => {
		const out = scenario(sandbox(), "logcap");
		const cap = 16 * 1024 * 1024;
		const dropped = out.headerBytes + 17_000_013 - (cap - 512);
		assert.equal(out.result.logBytesDropped, dropped);
		assert.ok(out.size <= cap, `log is ${out.size} bytes`);
		assert.ok(
			out.end.endsWith(`\n[log capped at ${cap} bytes; ${dropped} bytes not written]\n[bash_background: process ended, exited 0]\n`),
			out.end.slice(-120),
		);
		assert.match(out.result.tail, /tail-marker$/);
		assert.ok(out.report.includes(`(capped; ${dropped} bytes not written)`));
	});

	it("a log that cannot be written is named in the result and the report; the app keeps running", () => {
		const out = scenario(sandbox(), "logloss");
		const result = out.state.outcome.result;
		assert.equal(result.status, "exited");
		assert.match(result.logError, /^ENOENT: /);
		assert.equal(result.tail, "after-loss");
		assert.match(out.report, /The log could not be written \(ENOENT: .*\); the tail below is from memory\./);
	});
});

describe("crash windows: SIGKILL of the durable process, then a reopen (temp SQLite)", { skip, concurrency: 4 }, () => {
	/** Step `crash` dies by SIGKILL; an orphaned group is recorded and killed by the test; step `reopen`. */
	function crash(window) {
		const box = sandbox();
		const env = { CRASH_WINDOW: window };
		scenario(box, "crash", { step: "crash", env, expectKilled: true });
		const pidfile = path.join(box.cwd, "pid");
		const pgid = existsSync(pidfile) ? Number(readFileSync(pidfile, "utf8").trim()) : undefined;
		const orphaned = pgid !== undefined && groupAlive(pgid);
		if (orphaned) process.kill(-pgid, "SIGKILL");
		return { ...scenario(box, "crash", { step: "reopen", env }), pgid, orphaned };
	}

	it("after the intent, before any spawn: interrupted with no process group, never run", () => {
		const out = crash("intent");
		assert.deepEqual(out.before, { runs: 0, reports: 0, graph: out.before.graph });
		assert.equal(out.runs, 0);
		assert.equal(out.reports.length, 1);
		assert.match(header(out.reports[0].text), /status: interrupted/);
		assert.match(out.reports[0].text, /may never have started/);
	});

	it("after the spawn, before the process group is recorded: interrupted, uncertain, not run again", () => {
		const out = crash("spawned");
		assert.equal(out.orphaned, true);
		assert.equal(out.runs, 1);
		assert.equal(out.reports.length, 1);
		assert.match(out.reports[0].text, /No process group id was recorded/);
	});

	it("while the command runs: interrupted with the recorded process group, not run again", () => {
		const out = crash("running");
		assert.equal(out.orphaned, true);
		assert.equal(out.runs, 1);
		assert.equal(out.reports.length, 1);
		assert.match(out.reports[0].text, new RegExp(`process group ${out.pgid}:`));
		// The genuinely interrupted log has no result mark and survives aging past the retention.
		assert.deepEqual(out.retention, { logExisted: true, mark: false, survived: true });
	});

	it("after the report is admitted, before the terminal commit: the requestId keeps it to ONE report and ONE wake", () => {
		const out = crash("report");
		assert.equal(out.before.reports, 1); // admitted before the crash
		assert.equal(out.runs, 1);
		assert.equal(out.reports.length, 1);
		assert.match(header(out.reports[0].text), /status: exited 0/);
		assert.equal(out.answers.filter((a) => a.startsWith("noted")).length, 1);
	});
});
