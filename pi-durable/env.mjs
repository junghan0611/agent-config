/**
 * pi-durable's env-loader and provider hide, as one native module.
 *
 *   entwurf pi-durable --provider <p> --model <m> --width task-wide \
 *     --native-module /abs/path/agent-config/pi-durable/env.mjs
 *   entwurf pi-durable --continue --native-module /abs/path/agent-config/pi-durable/env.mjs
 *
 * The durable app does not load pi-extensions/ (its runtime installs native Extension objects, not
 * ExtensionAPI factories), so neither env-loader.ts nor hide-providers.ts runs there. Entwurf's
 * `--native-module` ingress evaluates this file before the TUI and the runtime are imported, and the
 * runtime creates its provider runtime before it installs any extension (entwurf
 * pi/pi-durable/carrier/runtime.js:140-146) — so the work is this file's top level, not a hook.
 *
 * Top level, in order:
 *   1. Delete the four hidden provider keys from the inherited environment (hide-providers.ts).
 *   2. Read ~/.env.local and set each key the process does not already have (env-loader.ts),
 *      except the hidden four and the identity carriers.
 *
 * Deliberate differences from env-loader.ts:
 *   - Home file only. A project .env.local is not read: whether a repository's file may set this
 *     process's environment is an open question (NEXT.md, the 2026-09-29 Pi extension audit's finding E,
 *     env-loader.ts:85-90), not this file's.
 *   - A key that is present wins even when it is empty (env-loader.ts kept only truthy ones). An empty
 *     value set on purpose is an opt-out, the way ANDENKEN_SESSION_CORPUS="" is (AGENTS.md).
 *   - HOME, PI_SESSION_ID, PI_CODING_AGENT_DIR and every ENTWURF_* are never written. Entwurf compares
 *     them across this module's evaluation and refuses the launch if one changed.
 *   - A missing file is a no-op; any other read failure throws, and Entwurf refuses the launch as
 *     native-module-import-failed. File content never fails the launch: dotenv.mjs reads it the way
 *     env-loader.ts does and skips what is not an assignment (a `case` is not evaluated).
 *   - No status line: the durable app has no footer for an extension to write.
 *
 * The hidden keys are gone from this process and from every child that inherits its environment —
 * the durable bash tool spreads process.env into its children (pi-durable dist/env/node.js
 * getShellEnv). A child that sources ~/.env.local itself, explicitly or through BASH_ENV, gets them
 * back; that is the path the skills that need them already take. This module does not set BASH_ENV,
 * and BASH_ENV is the weaker of the two: bash skips it when its stdin is a socket, which is what a
 * durable bash command that is fed stdin gets (dist/env/node.js spawn; tests/env.test.mjs pins both).
 *
 * Nothing is printed. `summary` carries key names only, never values.
 */
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseDotenv } from "./dotenv.mjs";

/** Same four as hide-providers.ts HIDDEN_PROVIDER_KEYS and env-loader.ts SKIP_KEYS, kept by hand. */
export const HIDDEN_PROVIDER_KEYS = ["OPENROUTER_API_KEY", "HF_TOKEN", "GROQ_API_KEY", "GEMINI_API_KEY"];

/** Entwurf's identity carriers (bootstrap.mjs IDENTITY_KEYS, plus every ENTWURF_*). */
const isIdentity = (key) =>
	key === "HOME" || key === "PI_SESSION_ID" || key === "PI_CODING_AGENT_DIR" || key.startsWith("ENTWURF_");

const hidden = HIDDEN_PROVIDER_KEYS.filter((key) => Object.hasOwn(process.env, key));
for (const key of hidden) delete process.env[key];

const home = os.homedir();
const file = path.join(home, ".env.local");
let text;
try {
	text = readFileSync(file, "utf8");
} catch (error) {
	if (error?.code !== "ENOENT") throw error;
}

const injected = [];
const kept = [];
const skipped = [];
if (text !== undefined) {
	for (const [key, value] of parseDotenv(text, home)) {
		if (HIDDEN_PROVIDER_KEYS.includes(key) || isIdentity(key)) skipped.push(key);
		else if (Object.hasOwn(process.env, key)) kept.push(key);
		else {
			process.env[key] = value;
			injected.push(key);
		}
	}
}

/** What this evaluation did, by key name. */
export const summary = { file, read: text !== undefined, hidden, injected, kept, skipped };

export default { name: "agent-config-env" };
