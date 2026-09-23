# Model Rails — sibling launch roster

`pi --list-models` answers what pi can call, not which contract GLG has. This is the
manual roster to read before opening an entwurf sibling. `./run.sh models` prints and
diffs the live catalog; it never writes this file.

## Current rails — 2026-09-23

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

pi 형제를 Codex 구독으로 열 때 기본은 `openai-codex/gpt-6-sol`의 `medium`이다.
더 어려운 일은 `high` 또는 `xhigh`, 대량의 단순 작업은 `gpt-6-luna`, 가장 어려운
종단 간 작업은 `gpt-6-astra`를 고른다. Codex 구독의 실제 사용량은 API 단가에서
추정하지 않고 현재 쿼터로 확인한다.

If GLG names neither a model nor a documented default for the requested backend, ask.

## Model selectors

For a `pi` sibling, pass one exact `provider/model` pair from this curated list:

```text
provider        model
deepseek        deepseek-flash
entwurf         claude-opus-5
entwurf         claude-sonnet-5
openai-codex    gpt-6-astra
openai-codex    gpt-6-luna
openai-codex    gpt-6-sol
upstage         solar-pro4
xai             grok-4.7
zai             glm-5.3
```

Pi CLI accepts `--thinking medium`, `--thinking high`, and `--thinking xhigh`.
The operator's `pit`, `pis`, and `pisx` functions launch those three GPT-6 Sol
efforts respectively. For `entwurf_fresh_call` with `backend: "pi"`, pass the
effort in its `model` input: `openai-codex/gpt-6-sol:medium`,
`openai-codex/gpt-6-sol:high`, or `openai-codex/gpt-6-sol:xhigh`. The pi CLI
parses the suffix as its thinking level; entwurf accepts the colon and forwards
the model string as the pi `--model` value. These are the intended fresh-call
selectors; check the installed entwurf release before relying on them.

For a `claude-code` sibling, use `opus` by default; `sonnet` is the lighter option;
use `fable` only when GLG names it. `omp` has its own profiles in `omp/agents/`; do
not infer an OMP selector from the pi list.
