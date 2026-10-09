/**
 * pi-durable/env.mjs and its dotenv reading — synthetic only.
 *
 *   node --test pi-durable/tests/
 *
 * env.mjs does its work on import, against os.homedir(). So it is never imported in THIS process:
 * every case runs a child node with a fake HOME, a fake cwd and an environment built from nothing
 * (`env -i` style). Every value below is synthetic; no real ~/.env.local is opened.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenv } from "../dotenv.mjs";

const ENV_MJS = fileURLToPath(new URL("../env.mjs", import.meta.url));
const DOTENV_MJS = fileURLToPath(new URL("../dotenv.mjs", import.meta.url));
const BASELINE_TS = fileURLToPath(new URL("../../pi-extensions/env-loader.ts", import.meta.url));
const SENTINEL = "synthetic-value-must-not-leak-7c1e";
const roots = [];
after(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A fake HOME (with ~/.env.local when given) and a separate cwd. */
function sandbox(dotenv) {
	const root = mkdtempSync(path.join(tmpdir(), "pi-durable-env-"));
	roots.push(root);
	const home = path.join(root, "home");
	const cwd = path.join(root, "project");
	mkdirSync(home);
	mkdirSync(cwd);
	if (dotenv !== undefined) writeFileSync(path.join(home, ".env.local"), dotenv);
	return { root, home, cwd };
}

/**
 * Import env.mjs in a child whose environment is exactly PATH + HOME + `env`, run `after` there, and
 * return its JSON. `after` sees `m` (the module namespace) and `before` (the env before the import).
 */
function child({ home, cwd }, env = {}, after = "") {
	const script = `
		const before = { ...process.env, cwd: process.cwd() };
		const m = await import(${JSON.stringify(pathToFileURL(ENV_MJS).href)});
		const out = { summary: m.summary, name: m.default.name, env: { ...process.env }, cwdBefore: before.cwd, cwdAfter: process.cwd() };
		${after}
		console.log(JSON.stringify(out));
	`;
	const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
		cwd,
		env: { PATH: process.env.PATH, HOME: home, ...env },
		encoding: "utf8",
	});
	return { status: r.status, stderr: r.stderr, out: r.status === 0 ? JSON.parse(r.stdout) : undefined };
}

/**
 * pi-extensions/env-loader.ts's own parseDotenv, lifted out of its source text so the comparison
 * follows that file rather than a copy of it. Its two type annotations are dropped; nothing else is
 * touched. It runs only inside a child with a fake HOME (it reads os.homedir()).
 */
function baselineModule(dir) {
	const source = readFileSync(BASELINE_TS, "utf8");
	const fn = /\nfunction parseDotenv\(content: string\): Record<string, string> \{\n[\s\S]*?\n\}\n/.exec(source);
	assert.ok(fn, `parseDotenv not found in ${BASELINE_TS} — the comparator needs updating`);
	const body = fn[0]
		.replace("(content: string): Record<string, string>", "(content)")
		.replace("const vars: Record<string, string> = {};", "const vars = {};");
	assert.ok(!/: (string|Record)/.test(body), "a type annotation is left in the lifted parseDotenv");
	const file = path.join(dir, "baseline.mjs");
	writeFileSync(file, `import os from "node:os";\nimport path from "node:path";\nexport ${body}`);
	return file;
}

/** Both parsers on `text`, in a child whose HOME is fake: { baseline, ours } as plain objects. */
function bothParsers(text) {
	const box = sandbox();
	const script = `
		const { parseDotenv: baseline } = await import(${JSON.stringify(pathToFileURL(baselineModule(box.root)).href)});
		const { parseDotenv: ours } = await import(${JSON.stringify(pathToFileURL(DOTENV_MJS).href)});
		const os = await import("node:os");
		const text = ${JSON.stringify(text)};
		console.log(JSON.stringify({ home: os.homedir(), baseline: baseline(text), ours: Object.fromEntries(ours(text, os.homedir())) }));
	`;
	const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
		cwd: box.cwd,
		env: { PATH: process.env.PATH, HOME: box.home },
		encoding: "utf8",
	});
	assert.equal(r.status, 0, r.stderr);
	return JSON.parse(r.stdout);
}

/** A shell config the way ~/.env.local is one: control lines, branches, conditionals, assignments in each. */
const SHELL_CONFIG = [
	"# a shell config, not a dotenv file",
	"export BASE=1",
	'case "$PWD" in',
	"  */repoA)",
	"    export ROUTE=a",
	"    export FORGE_URL=https://a.example",
	"    ;;",
	"  *)",
	"    export ROUTE=other",
	"    ;;",
	"esac",
	'if [ -n "$X" ]; then',
	"  export COND=yes",
	"fi",
	"dev) export ODD=1 ;;",
	'[ "$A" = b ] && export E=1',
	"export LAST=1",
].join("\n");

describe("dotenv.mjs reads as env-loader.ts parseDotenv does", () => {
	it("matches the live env-loader.ts parser on every line whose key is an identifier", () => {
		const text = [
			"# comment",
			"",
			"  export A=\"a b\"",
			"B=$HOME/b",
			"C=~/c",
			"D=$OTHER/$(x)/`y`",
			"E=",
			"F=1",
			"F=2",
			"G=a=b",
			' W = "plain value" ',
			"export X\t=\tx",
			'Y="a\\"b"',
			"V=v#x",
			"Q1=v # note",
			'Q2="v w" # note',
			'Q3="v"#x',
			'Q4="unterminated',
			"Q5='$HOME/x'",
			'Q6="~/x"',
			"Q7=${HOME}/x",
			"Q8=$HOMEDIR",
			'Q9="',
			"R1=~/a//b/../c",
			"R2='single'",
			"R3=\"mixed'",
			"R4=crlf\r",
			"export\tTAB=1",
			"=novalue",
			"no equals here",
		].join("\n");
		const { baseline, ours } = bothParsers(text);
		const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
		assert.deepEqual(ours, Object.fromEntries(Object.entries(baseline).filter(([key]) => identifier.test(key))));
		assert.deepEqual(
			Object.keys(baseline).filter((key) => !identifier.test(key)),
			["export\tTAB"], // env-loader.ts strips only "export " with a space
		);
		assert.equal(Object.keys(ours).length, 24);
	});

	it("a shell config with case/esac/if/fi and branch patterns is read without failing: every assignment in file order, last value wins, no condition evaluated", () => {
		const { home, baseline, ours } = bothParsers(SHELL_CONFIG);
		assert.ok(home);
		assert.deepEqual(ours, {
			BASE: "1",
			ROUTE: "other", // both branches are read; the later one wins — the case is not evaluated
			FORGE_URL: "https://a.example",
			COND: "yes", // the if is not evaluated either
			LAST: "1",
		});
		// The one deliberate difference: env-loader.ts also injects the non-identifier keys.
		const extra = Object.keys(baseline).filter((key) => !(key in ours));
		assert.deepEqual(extra.sort(), ['[ "$A"', "dev) export ODD"]);
		for (const key of Object.keys(ours)) assert.equal(ours[key], baseline[key], key);
	});

	it("never throws on file content", () => {
		for (const text of ['A="v', "A='v", 'A="v"#x', "case x in", "))) = (((", "=", "\u0000=\u0000", SHELL_CONFIG]) {
			assert.doesNotThrow(() => parseDotenv(text, "/home/fake"), JSON.stringify(text));
		}
	});
});

describe("env.mjs (child process, fake HOME)", () => {
	it("injects a missing key from ~/.env.local; a present key wins, even an empty one", () => {
		const box = sandbox(`export NEW="n"\nOUTER=from-file\nEMPTY=from-file\nP=$HOME/p\n`);
		const { status, out, stderr } = child(box, { OUTER: "outer", EMPTY: "" });
		assert.equal(status, 0, stderr);
		assert.equal(out.env.NEW, "n");
		assert.equal(out.env.P, `${box.home}/p`);
		assert.equal(out.env.OUTER, "outer");
		assert.equal(out.env.EMPTY, "");
		assert.deepEqual(out.summary.injected, ["NEW", "P"]);
		assert.deepEqual(out.summary.kept, ["OUTER", "EMPTY"]);
		assert.equal(out.name, "agent-config-env");
	});

	it("hides the four provider keys: inherited ones are deleted, file ones are not injected", () => {
		const box = sandbox(`GEMINI_API_KEY=${SENTINEL}\nHF_TOKEN=${SENTINEL}\nKEEP=1\n`);
		const { status, out, stderr } = child(box, { OPENROUTER_API_KEY: SENTINEL, GROQ_API_KEY: SENTINEL });
		assert.equal(status, 0, stderr);
		for (const key of ["OPENROUTER_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY", "HF_TOKEN"]) {
			assert.equal(Object.hasOwn(out.env, key), false, key);
		}
		assert.equal(out.env.KEEP, "1");
		assert.deepEqual(out.summary.hidden, ["OPENROUTER_API_KEY", "GROQ_API_KEY"]);
		assert.deepEqual(out.summary.skipped, ["GEMINI_API_KEY", "HF_TOKEN"]);
	});

	it("never writes an identity carrier, present or absent, and never moves the process or reads the project's .env.local", () => {
		const box = sandbox(
			[
				"HOME=/elsewhere",
				"PI_SESSION_ID=file",
				"PI_CODING_AGENT_DIR=/elsewhere",
				"ENTWURF_PRESENT=file",
				"ENTWURF_ADDED=file",
			].join("\n"),
		);
		writeFileSync(path.join(box.cwd, ".env.local"), "PROJECT_ONLY=1\n");
		const { status, out, stderr } = child(box, { ENTWURF_PRESENT: "outer" });
		assert.equal(status, 0, stderr);
		assert.equal(out.env.HOME, box.home);
		assert.equal(Object.hasOwn(out.env, "PI_SESSION_ID"), false);
		assert.equal(Object.hasOwn(out.env, "PI_CODING_AGENT_DIR"), false);
		assert.equal(out.env.ENTWURF_PRESENT, "outer");
		assert.equal(Object.hasOwn(out.env, "ENTWURF_ADDED"), false);
		assert.equal(Object.hasOwn(out.env, "PROJECT_ONLY"), false);
		assert.equal(out.cwdAfter, out.cwdBefore);
		assert.deepEqual(out.summary.skipped, [
			"HOME",
			"PI_SESSION_ID",
			"PI_CODING_AGENT_DIR",
			"ENTWURF_PRESENT",
			"ENTWURF_ADDED",
		]);
	});

	it("a missing ~/.env.local is a no-op (the hide still runs)", () => {
		const box = sandbox();
		const { status, out, stderr } = child(box, { OPENROUTER_API_KEY: SENTINEL });
		assert.equal(status, 0, stderr);
		assert.equal(out.summary.read, false);
		assert.equal(Object.hasOwn(out.env, "OPENROUTER_API_KEY"), false);
	});

	it("a read failure other than a missing file fails the import; file content never does", () => {
		const dir = sandbox();
		mkdirSync(path.join(dir.home, ".env.local"));
		const asDir = child(dir);
		assert.notEqual(asDir.status, 0);
		assert.match(asDir.stderr, /EISDIR/);

		// The shape that refused GLG's launch on 2026-10-08 (a `case` line, `not KEY=value`) now loads.
		const shell = child(sandbox(`${SHELL_CONFIG}\nB="${SENTINEL}\n`));
		assert.equal(shell.status, 0, shell.stderr);
		assert.equal(shell.stderr, "");
		assert.equal(shell.out.env.ROUTE, "other");
		assert.equal(shell.out.env.B, `"${SENTINEL}`); // baseline: the unmatched quote stays
		assert.equal(Object.hasOwn(shell.out.env, "dev) export ODD"), false);

		if (process.getuid?.() !== 0) {
			const locked = sandbox("A=1\n");
			chmodSync(path.join(locked.home, ".env.local"), 0o000);
			const denied = child(locked);
			assert.notEqual(denied.status, 0);
			assert.match(denied.stderr, /EACCES/);
		}
	});

	it("a bash child inherits the result; only a shell that sources the file itself (BASH_ENV) gets a hidden key back", () => {
		const box = sandbox(`export LOADED=yes\nexport OPENROUTER_API_KEY=${SENTINEL}\n`);
		// stdin "ignore", as the durable bash tool spawns a command with no stdin (pi-durable dist/env/node.js
		// spawn, stdio [ignore, pipe, pipe]). With a socket on stdin — Node's default "pipe" — bash takes the
		// remote-shell startup branch and skips BASH_ENV altogether; the last probe pins that.
		const probe = `
			const { execFileSync } = await import("node:child_process");
			const cmd = ["-c", 'printf %s "\${LOADED-unset}|\${OPENROUTER_API_KEY:+set}"'];
			out.bash = execFileSync("bash", cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
			out.bashSocketStdin = execFileSync("bash", cmd, { encoding: "utf8" });
		`;
		const plain = child(box, { OPENROUTER_API_KEY: SENTINEL }, probe);
		assert.equal(plain.status, 0, plain.stderr);
		assert.equal(plain.out.bash, "yes|");

		const sourced = child(box, { OPENROUTER_API_KEY: SENTINEL, BASH_ENV: path.join(box.home, ".env.local") }, probe);
		assert.equal(sourced.status, 0, sourced.stderr);
		assert.equal(Object.hasOwn(sourced.out.env, "OPENROUTER_API_KEY"), false); // the parent stays hidden
		assert.equal(sourced.out.env.BASH_ENV, path.join(box.home, ".env.local")); // not set or cleared here
		assert.equal(sourced.out.bash, "yes|set");
		assert.equal(sourced.out.bashSocketStdin, "yes|");
	});

	it("evaluates once per URL; a second evaluation, or a new process (--continue), changes nothing further", () => {
		const box = sandbox("A=1\n");
		const again = `
			const same = await import(${JSON.stringify(pathToFileURL(ENV_MJS).href)});
			const fresh = await import(${JSON.stringify(`${pathToFileURL(ENV_MJS).href}?again`)});
			out.sameObject = same.summary === m.summary;
			out.second = fresh.summary;
			out.envAfterSecond = { ...process.env };
		`;
		const { status, out, stderr } = child(box, {}, again);
		assert.equal(status, 0, stderr);
		assert.equal(out.sameObject, true);
		assert.deepEqual(out.summary.injected, ["A"]);
		assert.deepEqual(out.second.injected, []);
		assert.deepEqual(out.second.kept, ["A"]);
		assert.deepEqual(out.envAfterSecond, out.env);

		const next = child(box);
		assert.equal(next.status, 0, next.stderr);
		assert.deepEqual(next.out.summary, out.summary);
	});
});

describe("tests/entwurf.test.mjs and tests/background.test.mjs without an Entwurf checkout", () => {
	it("fails by name with a nonzero exit, never a silent skip", () => {
		const { root } = sandbox();
		const entwurfTest = fileURLToPath(new URL("./entwurf.test.mjs", import.meta.url));
		// NODE_TEST_CONTEXT is left out on purpose: inherited, it turns the nested run into a subtest reporter.
		const r = spawnSync(process.execPath, ["--test", entwurfTest], {
			cwd: root,
			env: { PATH: process.env.PATH, HOME: root, AGENT_CONFIG_ENTWURF_DIR: path.join(root, "no-entwurf") },
			encoding: "utf8",
			timeout: 60_000,
		});
		assert.equal(r.status, 1, r.stdout + r.stderr);
		assert.match(r.stdout, /entwurf-checkout-missing: .*no-entwurf\/pi\/pi-durable\/bootstrap\.mjs/);
		assert.match(r.stdout, /^ℹ fail 1$/m);
		assert.match(r.stdout, /^ℹ pass 0$/m);
	});

	it("tests/background.test.mjs fails by name too; only its in-process units pass", () => {
		const { root } = sandbox();
		const backgroundTest = fileURLToPath(new URL("./background.test.mjs", import.meta.url));
		const r = spawnSync(process.execPath, ["--test", backgroundTest], {
			cwd: root,
			env: { PATH: process.env.PATH, HOME: root, AGENT_CONFIG_ENTWURF_DIR: path.join(root, "no-entwurf") },
			encoding: "utf8",
			timeout: 60_000,
		});
		assert.equal(r.status, 1, r.stdout + r.stderr);
		assert.match(r.stdout, /entwurf-checkout-missing: .*no-entwurf\/node_modules\/@earendil-works\/pi-durable/);
		assert.match(r.stdout, /^ℹ fail 1$/m);
		assert.match(r.stdout, /^ℹ pass 5$/m);
	});
});
