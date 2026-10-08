/**
 * pi-durable/env.mjs against Entwurf's own code — synthetic, API 0, nothing of the operator's touched.
 *
 *   node --test pi-durable/tests/
 *
 * Two separate pieces of evidence; neither stands in for the other:
 *
 *   1. Ingress order: Entwurf's bootstrap `main` (pi/pi-durable/bootstrap.mjs), driven through its own
 *      test seams — `loadTui`, `open`, and the contact's `connect` — exactly as Entwurf's
 *      pi-durable-native-module.test.ts drives it. This proves the module is evaluated before the TUI
 *      and the open, passes the identity and directory guards, and lands after the contact. It does
 *      NOT open the real carrier, storage, a bridge or a citizen: `open` and `connect` are stubs and
 *      every garden root is a temp directory.
 *   2. Provider discovery: pi-coding-agent's real ModelRuntime (the one carrier/runtime.js:140 creates),
 *      with PI_OFFLINE=1 and a fake agent dir, counting available models by provider with and without
 *      the module. No network, no model turn.
 *
 * Both run in a child node with an environment built from nothing and a fake HOME. They need a built
 * Entwurf checkout (AGENT_CONFIG_ENTWURF_DIR, default ~/repos/gh/entwurf). Without one this file FAILS
 * by name (`entwurf-checkout-missing`) instead of skipping: a skip exits 0 and reads as a pass. For the
 * unit half alone, run `node --test pi-durable/tests/env.test.mjs`.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const ENV_MJS = fileURLToPath(new URL("../env.mjs", import.meta.url));
const ENTWURF = process.env.AGENT_CONFIG_ENTWURF_DIR ?? path.join(homedir(), "repos", "gh", "entwurf");
const BOOTSTRAP = path.join(ENTWURF, "pi", "pi-durable", "bootstrap.mjs");
const CONTACT = path.join(ENTWURF, "mcp", "entwurf-bridge", "dist", "pi-extensions", "meta-bridge-pi-durable.js");
const MODEL_RUNTIME = path.join(
	ENTWURF,
	"node_modules",
	"@earendil-works",
	"pi-coding-agent",
	"dist",
	"core",
	"model-runtime.js",
);
const SYNTHETIC = "synthetic-not-a-key-3a9d";
const missing = [BOOTSTRAP, CONTACT, MODEL_RUNTIME].filter((file) => !existsSync(file));
// The suites below cannot run without these; the prerequisite test is what fails, once, by name.
const skip = missing.length > 0 && "entwurf-checkout-missing (see the prerequisite test)";

it("[prerequisite] a built Entwurf checkout is present", () => {
	assert.deepEqual(missing, [], `entwurf-checkout-missing: ${missing.join(", ")}`);
});

const roots = [];
after(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function sandbox(dotenv) {
	const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pi-durable-env-entwurf-")));
	roots.push(root);
	const home = path.join(root, "home");
	const cwd = path.join(root, "project");
	mkdirSync(home);
	mkdirSync(cwd);
	writeFileSync(path.join(home, ".env.local"), dotenv);
	return { root, home, cwd };
}

function node({ cwd, home }, env, script) {
	const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
		cwd,
		env: { PATH: process.env.PATH, HOME: home, ...env },
		encoding: "utf8",
		timeout: 60_000,
	});
	assert.equal(r.status, 0, r.stderr);
	return JSON.parse(r.stdout.trim().split("\n").at(-1));
}

/** Entwurf's `main` with recording seams; prints what each phase saw, by key presence. */
const seamScript = (root, argv) => `
	import path from "node:path";
	const { main } = await import(${JSON.stringify(pathToFileURL(BOOTSTRAP).href)});
	const { PI_DURABLE_TOOL_SCHEMAS } = await import(${JSON.stringify(pathToFileURL(CONTACT).href)});
	const root = ${JSON.stringify(root)};
	const seen = () => ({ LOADED: process.env.LOADED ?? null, OPENROUTER_API_KEY: "OPENROUTER_API_KEY" in process.env, GEMINI_API_KEY: "GEMINI_API_KEY" in process.env });
	const trace = { events: [], specs: [] };
	const client = {
		pid: 4242,
		listTools: async () => Object.entries(PI_DURABLE_TOOL_SCHEMAS).map(([name, inputSchema]) => ({ name, inputSchema })),
		async callTool(name) { return { text: name + " ok", isError: false }; },
		async close() {},
	};
	await main(${JSON.stringify(argv)}, {
		loadTui: async () => {
			trace.events.push("loadTui");
			trace.atTui = seen();
			return { runDurableTui: async () => { trace.events.push("tui"); } };
		},
		open: async (options) => {
			trace.events.push("open");
			trace.opened = { cwd: options.cwd, continueSession: options.continueSession, names: options.extensions.map((e) => e.name) };
			return {
				view: { current: () => ({ session: { id: "1759622400000-0b5e2a4c-1f3d-4e8a-9c7b-2d6f8e1a3c5b", directory: path.join(root, "durable"), cwd: options.cwd } }) },
				controller: {}, settings: {}, submitToRoot: async () => ({ id: 41 }), close: async () => {},
			};
		},
		contact: {
			sessionsDir: path.join(root, "meta-sessions"), sendersDir: path.join(root, "meta-senders"),
			mailboxDir: path.join(root, "meta-mailbox"), receiversDir: path.join(root, "meta-receivers"),
			connect: async (spec) => { trace.specs.push({ LOADED: spec.env.LOADED ?? null, OPENROUTER_API_KEY: "OPENROUTER_API_KEY" in spec.env }); return client; },
		},
	});
	trace.cwd = process.cwd();
	console.log(JSON.stringify(trace));
`;

describe("env.mjs through Entwurf's --native-module ingress", { skip }, () => {
	const dotenv = [
		"export LOADED=yes",
		`GEMINI_API_KEY=${SYNTHETIC}`,
		"ENTWURF_SYNTH_PRESENT=file",
		"ENTWURF_SYNTH_ADDED=file",
		"HOME=/elsewhere",
	].join("\n");
	const inherited = { OPENROUTER_API_KEY: SYNTHETIC, ENTWURF_SYNTH_PRESENT: "outer" };

	for (const [label, argv] of [
		["new session", ["--provider", "loopback", "--model", "scripted", "--width", "task-wide", "--native-module", ENV_MJS]],
		["--continue", ["--continue", "--native-module", ENV_MJS]],
	]) {
		it(`${label}: initialized before the TUI and the open, guards pass, installed after the contact`, () => {
			const box = sandbox(dotenv);
			const trace = node(box, inherited, seamScript(box.root, argv));
			assert.deepEqual(trace.events, ["loadTui", "open", "tui"]);
			assert.deepEqual(trace.atTui, { LOADED: "yes", OPENROUTER_API_KEY: false, GEMINI_API_KEY: false });
			assert.deepEqual(trace.opened, { cwd: box.cwd, continueSession: label === "--continue", names: ["entwurf", "agent-config-env"] });
			assert.equal(trace.cwd, box.cwd);
			// The bridge spawn SPEC built from process.env (not the bridge child's actual inheritance).
			assert.deepEqual(trace.specs, [{ LOADED: "yes", OPENROUTER_API_KEY: false }]);
		});
	}
});

describe("env.mjs against pi's real provider discovery (offline)", { skip }, () => {
	const discovery = (withModule) => `
		${withModule ? `await import(${JSON.stringify(pathToFileURL(ENV_MJS).href)});` : ""}
		const { ModelRuntime } = await import(${JSON.stringify(pathToFileURL(MODEL_RUNTIME).href)});
		const runtime = await ModelRuntime.create();
		const by = {};
		for (const model of await runtime.getAvailable()) by[model.provider] = (by[model.provider] ?? 0) + 1;
		console.log(JSON.stringify(by));
	`;

	it("the four providers appear from the keys alone, and disappear with the module (inherited and file keys alike)", () => {
		const box = sandbox([`GEMINI_API_KEY=${SYNTHETIC}`, `HF_TOKEN=${SYNTHETIC}`].join("\n"));
		const env = {
			PI_OFFLINE: "1",
			PI_CODING_AGENT_DIR: path.join(box.home, ".pi", "agent"),
			OPENROUTER_API_KEY: SYNTHETIC,
			GROQ_API_KEY: SYNTHETIC,
		};
		// Control: the inherited two only — the file is not read without the module.
		const without = node(box, env, discovery(false));
		assert.ok(without.openrouter > 0 && without.groq > 0, JSON.stringify(without));
		// Control: all four present in the environment light up all four providers.
		const allFour = node(box, { ...env, GEMINI_API_KEY: SYNTHETIC, HF_TOKEN: SYNTHETIC }, discovery(false));
		for (const provider of ["openrouter", "groq", "google", "huggingface"]) {
			assert.ok(allFour[provider] > 0, `${provider}: ${JSON.stringify(allFour)}`);
		}
		const withModule = node(box, env, discovery(true));
		for (const provider of ["openrouter", "groq", "google", "huggingface"]) {
			assert.equal(withModule[provider], undefined, `${provider}: ${JSON.stringify(withModule)}`);
		}
	});
});
