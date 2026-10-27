import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// browser-eval.js runs against a stub puppeteer-core, so no browser, profile,
// or port 9222 is touched. The stub holds a handle between connect and
// disconnect, like the real CDP socket.
const FAKE_PUPPETEER = `
export default {
	connect() {
		const mode = process.env.FAKE_CDP;
		if (mode === "hang") return new Promise(() => {});
		if (mode === "refuse") return Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:9222"));
		const socket = setInterval(() => {}, 1000);
		const page = {
			evaluate: async (fn, code) => {
				if (mode === "throw") throw new Error("Evaluation failed: ReferenceError: nope is not defined");
				return fn(code);
			},
		};
		return Promise.resolve({
			pages: async () => (mode === "no-tab" ? [] : [page]),
			disconnect: async () => clearInterval(socket),
		});
	},
};
`;

const here = dirname(fileURLToPath(import.meta.url));
const sandbox = mkdtempSync(join(tmpdir(), "browser-eval-test-"));
const stubDir = join(sandbox, "node_modules", "puppeteer-core");
mkdirSync(stubDir, { recursive: true });
writeFileSync(join(stubDir, "package.json"), JSON.stringify({ name: "puppeteer-core", type: "module", main: "index.js" }));
writeFileSync(join(stubDir, "index.js"), FAKE_PUPPETEER);
writeFileSync(join(sandbox, "package.json"), JSON.stringify({ type: "module" }));
copyFileSync(join(here, "browser-eval.js"), join(sandbox, "browser-eval.js"));
test.after(() => rmSync(sandbox, { recursive: true, force: true }));

function run(mode, code) {
	const started = Date.now();
	const r = spawnSync(process.execPath, [join(sandbox, "browser-eval.js"), code], {
		cwd: sandbox,
		env: { ...process.env, FAKE_CDP: mode },
		encoding: "utf8",
		timeout: 15000,
	});
	return { ...r, ms: Date.now() - started };
}

test("short eval exits as soon as it disconnects, not after the 5s connect timeout", () => {
	const r = run("ok", "({ title: 'Example', links: 3 })");
	assert.equal(r.status, 0, r.stderr);
	assert.equal(r.stdout, "title: Example\nlinks: 3\n");
	assert.ok(r.ms < 2000, `took ${r.ms}ms`);
});

test("connect that never answers still fails with the timeout message", () => {
	const r = run("hang", "1");
	assert.equal(r.status, 1);
	assert.match(r.stderr, /✗ Could not connect to browser: timeout/);
	assert.ok(r.ms >= 4500, `timed out after only ${r.ms}ms`);
});

test("refused connect fails fast with the connect hint", () => {
	const r = run("refuse", "1");
	assert.equal(r.status, 1);
	assert.match(r.stderr, /✗ Could not connect to browser: connect ECONNREFUSED/);
	assert.match(r.stderr, /Run: browser-start\.js/);
	assert.ok(r.ms < 2000, `took ${r.ms}ms`);
});

test("no open tab fails fast", () => {
	const r = run("no-tab", "1");
	assert.equal(r.status, 1);
	assert.match(r.stderr, /✗ No active tab found/);
	assert.ok(r.ms < 2000, `took ${r.ms}ms`);
});

test("page-side error still surfaces as a non-zero exit", () => {
	const r = run("throw", "nope");
	assert.notEqual(r.status, 0);
	assert.match(r.stderr, /ReferenceError: nope is not defined/);
});
