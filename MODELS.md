# Model Rails — sibling launch roster

`pi --list-models` answers what pi can call, not which contract GLG has. This is the
manual roster to read before opening an entwurf sibling. `./run.sh models` prints and
diffs the live catalog; it never writes this file.

## Current rails — 2026-09-22

| Rail | Used in | Choose for |
|---|---|---|
| Claude subscription | Claude Code, pi (`entwurf` ACP) | Opus / Sonnet; Fable only when named |
| Codex subscription | pi | GPT family |
| Grok subscription | pi | Grok family |
| Z.AI subscription | pi | GLM family |
| Upstage API | pi | Korean work (`solar-pro4`) |
| DeepSeek API | pi | DeepSeek Flash |

A provider merely appearing in pi's live catalog is not permission to spend it. Do
not choose a provider absent from this roster; OpenRouter is never an inference rail.

## Choose a rail

1. Spend subscription and rolling-quota rails first: `zai`, `openai-codex`, `xai`,
   and Claude (`entwurf` / Claude Code). Consult their current quota when it matters.
2. Use direct APIs only for a clear purpose: `upstage` for Korean work and `deepseek`
   for DeepSeek-specific work.

If GLG names neither a model nor a documented default for the requested backend, ask.

## Model selectors

For a `pi` sibling, pass one exact `provider/model` pair from this curated list:

```text
provider        model
deepseek        deepseek-flash
entwurf         claude-opus-5
entwurf         claude-sonnet-5
openai-codex    gpt-5.6-luna
openai-codex    gpt-5.6-sol
openai-codex    gpt-5.6-terra
upstage         solar-pro4
xai             grok-4.6
zai             glm-5.3
```

For a `claude-code` sibling, use `opus` by default; `sonnet` is the lighter option;
use `fable` only when GLG names it. `omp` has its own profiles in `omp/agents/`; do
not infer an OMP selector from the pi list.
