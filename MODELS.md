# Model Rails — sibling launch roster

`pi --list-models` answers what pi can call, not which contract GLG has. This is the manual roster to read before opening an entwurf sibling. `./run.sh models` prints and diffs the live catalog; it never writes this file.

## Current rails — 2026-10-27

| Rail                | Used in                         | Choose for                           |
|---------------------|---------------------------------|--------------------------------------|
| Claude subscription | Claude Code, pi (`entwurf` ACP) | Opus / Sonnet; Fable only when named |
| Codex subscription  | pi                              | GPT family                           |
| Grok subscription   | pi                              | Grok family                          |
| Upstage API         | pi                              | Korean work (`solar-pro4`)           |

A provider merely appearing in pi's live catalog is not permission to spend it. Do not choose a provider absent from this roster; OpenRouter is never an inference rail.

## Choose a rail

1. Spend subscription and rolling-quota rails first: `openai-codex`, `xai`, and Claude (`entwurf` / Claude Code). Consult their current quota when it matters.
2. Use direct APIs only for a clear purpose: `upstage` for Korean work.

If GLG names neither a model nor a documented default for the requested backend, ask.

## Model selectors

For a `pi` sibling, pass one exact `provider/model` pair from this curated list:

```text
provider        model
entwurf         claude-opus-5
entwurf         claude-sonnet-5
openai-codex    gpt-6-astra
openai-codex    gpt-6-luna
openai-codex    gpt-6.1-sol
openai-codex    gpt-6.1-terra
upstage         solar-pro4
xai             grok-4.7
```

`pi --list-models 'gpt-6.1-terra'` reports `openai-codex/gpt-6.1-terra` with **500K context**, 128K max output, thinking and image support.

The operator's shell launchers are:

| Function | Model | Thinking |
|----------|-------|----------|
| `pit` | `openai-codex/gpt-6.1-terra` | `medium` |
| `pis` | `openai-codex/gpt-6.1-sol` | `medium` |
| `pish` | `openai-codex/gpt-6.1-sol` | `high` |

All three call `_pi_garden_pi --entwurf-control --emacs-agent-socket server`, select the model and thinking level above, and forward `"$@"`.

For `entwurf_fresh_call` with `backend: "pi"`, pass the effort in its `model` input: `openai-codex/gpt-6.1-terra:medium`, `openai-codex/gpt-6.1-sol:medium`, or `openai-codex/gpt-6.1-sol:high`. The pi CLI parses the suffix as its thinking level; entwurf accepts the colon and forwards the model string as the pi `--model` value. Check the installed entwurf release before relying on these selectors.

For a `claude-code` sibling, use `opus` by default; `sonnet` is the lighter option; use `fable` only when GLG names it. `omp` has its own profiles in `omp/agents/`; do not infer an OMP selector from the pi list.
