# Models — sibling launch roster (2026-11-23)

Default: `backend: pi`, thinking `medium`. GLG adjusts effort per session; do not raise it automatically.
For a sibling request, resolve the model name below without asking again.

| Name                 | Exact `provider/model`          | Rail                                              |
|----------------------|---------------------------------|---------------------------------------------------|
| Opus                 | `entwurf/claude-opus-5-5`       | Claude subscription                               |
| Sonnet               | `entwurf/claude-sonnet-5-5`     | Claude subscription                               |
| Fable                | `entwurf/claude-fable-5-2`      | Claude subscription; when named                   |
| Hydrogen             | `entwurf/agy-gemini-4-hydrogen` | Personal Google AI Pro via agy ACP; limited quota |
| Flash                | `entwurf/agy-gemini-3.8-flash`  | Personal Google AI Pro via agy ACP; limited quota |
| Terra (personal)     | `openai/gpt-6.1-terra`          | Personal ChatGPT · new Sign in with ChatGPT      |
| Sol (personal)       | `openai/gpt-6.2-sol`            | Personal ChatGPT · new Sign in with ChatGPT      |
| Terra / Terra (work) | `openai-codex/gpt-6.1-terra`    | Work subscription · traditional Codex OAuth      |
| Sol                  | `openai-codex/gpt-6.2-sol`      | Work subscription · traditional Codex OAuth      |
| Astra                | `openai-codex/gpt-6.2-astra`    | Work subscription · traditional Codex OAuth      |
| Luna                 | `openai-codex/gpt-6-luna`       | Work subscription · traditional Codex OAuth      |

- For Pi GPT selection, use the exact provider-qualified ID. Unqualified Terra follows the current Pi default (work). For other GPT models on the personal account, confirm the exact `openai/` entry in the authenticated picker before adding it to this roster.
- Native Codex CLI also uses the work account. Pi’s `openai` Sign in with ChatGPT uses the personal account.
- `./run.sh quota` reports the work account once as `codex-cli` (native CLI). Pi’s work login is not polled separately. Personal Pi `openai` quota has no verified lookup path.
- `entwurf_fresh_call`: pass the exact catalog ID, e.g. `entwurf/claude-opus-5-5`, without a thinking suffix. Entwurf requires an exact curated ACP ID; `:medium` is rejected before launch. Keep Pi's `defaultThinkingLevel` at `medium`; a project override or GLG's explicit session choice takes precedence.
- Claude uses `entwurf` first. Native `claude-code` only when GLG explicitly requests that harness; use the versioned model ID, not `opus`/`sonnet`/`fable` aliases.
- Only the listed rails are authorized. OpenRouter is not a sibling inference rail.
- `pi --list-models` / `./run.sh models` inspect the catalog; they do not expand this roster.
