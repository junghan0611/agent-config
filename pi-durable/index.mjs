/**
 * agent-config's durable native module: env first, then the tools, as ONE native Extension object — Entwurf's
 * `--native-module` takes a single file.
 *
 * Entwurf supplies the native background badge. This aggregate adds env policy, background tools and explicit
 * review preparation. Dated supply/test scopes live in README.md; importing this file does not update a running app.
 *
 *   entwurf pi-durable --provider <p> --model <m> --width task-wide \
 *     --native-module /abs/path/agent-config/pi-durable/index.mjs
 *   entwurf pi-durable --continue --native-module /abs/path/agent-config/pi-durable/index.mjs
 *
 * `./env.mjs` is imported first, so ESM evaluates it (hide, then ~/.env.local) before `./background-bash.mjs`
 * and before anything Entwurf loads after this module. env.mjs stays usable on its own, env-only, as
 * `agent-config-env`; this file registers `agent-config`. The registry stores no name: a conversation selects
 * every installed extension unless configured otherwise. A live background task resumes only in a launch that
 * installs its definition again — reopened with env.mjs alone, it waits, pending, for one that does.
 */
import env from "./env.mjs";
import backgroundBash from "./background-bash.mjs";
import review from "./review.mjs";

const parts = [env, backgroundBash, review];
const field = (key) => parts.flatMap((part) => part[key] ?? []);

export default {
	name: "agent-config",
	tools: field("tools"),
	sections: field("sections"),
	hooks: field("hooks"),
	wraps: field("wraps"),
	tasks: field("tasks"),
};
