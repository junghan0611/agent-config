/**
 * Keep unused providers out of pi's model list.
 *
 * pi discovers providers from the environment — a key being set is the whole
 * reason a provider appears in `/model` and `--list-models`. Four keys that
 * exist here for *skills and tools*, not for pi, were dragging 440 models into
 * the picker: OpenRouter 346, Hugging Face 66, Google 22, Groq 6. pi has no
 * setting to disable a built-in provider, and `pi.unregisterProvider(id)` does
 * not touch built-ins (measured: the counts did not move). Removing the
 * variables from pi's own process before provider discovery is the lever that
 * works.
 *
 * The keys themselves stay in ~/.env.local, which is their SSOT. Every consumer
 * reads that file rather than pi's process env:
 *
 *   OPENROUTER_API_KEY  memory-sync, summarize — both `source ~/.env.local`
 *   GROQ_API_KEY        transcribe — sources it too, since this landed
 *   GEMINI_API_KEY      gemini-image-gen.ts parses the file directly; the
 *                       command-glgimage script already had --env-file
 *   HF_TOKEN            pi-share-hf, a separate repo that is not installed
 *                       here as a pi extension
 *
 * Google is the one that had to change code: its consumer is an in-process pi
 * extension, so it could not fall back to a child shell's environment. GLG uses
 * Google for image generation only — an agent silently routed onto a Gemini
 * model is a real cost, which is why the key is hidden rather than left visible.
 *
 * On top of that, BASH_ENV=~/.env.local makes every bash pi spawns re-source
 * the file, so a child gets the keys back even without an explicit source. The
 * explicit sources are what this relies on; BASH_ENV is the belt.
 *
 * env-loader.ts would put all three straight back on session_start, so it skips
 * them by name. Both halves are needed: this one removes what the shell
 * exported, the skip list stops the re-injection.
 *
 * None of these is an agent rail. OpenRouter stays GLG's personal embedding and
 * image rail through those skills (see AGENTS.md); Groq is speech-to-text; HF is
 * session sharing. Only the model picker changes.
 *
 * To bring one back: drop it from HIDDEN_PROVIDER_KEYS and from env-loader's
 * SKIP_KEYS, then re-run `./run.sh setup:links`.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Kept in sync with env-loader.ts's SKIP_KEYS by hand — two short lists in two
 * files beat one shared module that both have to import at startup.
 */
const HIDDEN_PROVIDER_KEYS = ["OPENROUTER_API_KEY", "HF_TOKEN", "GROQ_API_KEY", "GEMINI_API_KEY"];

export default function (_pi: ExtensionAPI) {
	// Extension factories run before provider discovery, which is why this is a
	// bare factory body and not a session_start handler.
	for (const key of HIDDEN_PROVIDER_KEYS) delete process.env[key];
}
