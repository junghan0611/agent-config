/**
 * agent-config's durable native module: env first, then the tools, as ONE native Extension object — Entwurf's
 * `--native-module` takes a single file.
 *
 * PARTIAL PREVIEW, not a launch default: the footer hourglass background work requires does not exist yet
 * (an Entwurf product change), so the README helpers keep naming env.mjs. Exercised by API-0 tests on Entwurf
 * 0.33.0 / SDK 1.1.0 only.
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

const parts = [env, backgroundBash];
const field = (key) => parts.flatMap((part) => part[key] ?? []);

export default {
	name: "agent-config",
	tools: field("tools"),
	sections: field("sections"),
	hooks: field("hooks"),
	wraps: field("wraps"),
	tasks: field("tasks"),
};
