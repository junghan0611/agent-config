# Models — sibling launch roster (2026-11-16)

Default: `backend: pi`, thinking `medium`. GLG adjusts effort per session; do not raise it automatically.
For a sibling request, resolve the model name below without asking again.

| Name | Exact `provider/model` | Rail |
|---|---|---|
| Opus | `entwurf/claude-opus-5-5` | Claude subscription |
| Sonnet | `entwurf/claude-sonnet-5-5` | Claude subscription |
| Fable | `entwurf/claude-fable-5-2` | Claude subscription; when named |
| Flash | `entwurf/agy-gemini-3.8-flash` | agy Pro; limited quota |
| Hydrogen | `entwurf/agy-gemini-4-hydrogen` | agy Pro; limited quota |
| Terra | `openai-codex/gpt-6.1-terra` | Codex subscription |
| Sol | `openai-codex/gpt-6.1-sol` | Codex subscription |
| Astra | `openai-codex/gpt-6-astra` | Codex subscription |
| Luna | `openai-codex/gpt-6-luna` | Codex subscription |

- `entwurf_fresh_call`: pass the exact catalog ID, e.g. `entwurf/claude-opus-5-5`, without a thinking suffix. Entwurf requires an exact curated ACP ID; `:medium` is rejected before launch. Keep Pi's `defaultThinkingLevel` at `medium`; a project override or GLG's explicit session choice takes precedence.
- Claude uses `entwurf` first. Native `claude-code` only when GLG explicitly requests that harness; use the versioned model ID, not `opus`/`sonnet`/`fable` aliases.
- Only the listed rails are authorized. OpenRouter is not a sibling inference rail.
- `pi --list-models` / `./run.sh models` inspect the catalog; they do not expand this roster.
