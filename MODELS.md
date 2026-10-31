# Model Rails — sibling launch roster

`pi --list-models` answers what pi can call, not which contract GLG has. This is the manual roster to read before opening an entwurf sibling. `./run.sh models` prints and diffs the live catalog; it never writes this file.

## Current rails — 2026-11-01

| Rail                | Used in                         | Choose for                           |
|---------------------|---------------------------------|--------------------------------------|
| Claude subscription | pi (`claude-code` provider), Claude Code, pi (`entwurf` ACP) | Opus / Sonnet; Fable only when named |
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
claude-code     claude-opus-5-5
claude-code     claude-sonnet-5
claude-code     claude-fable-5-1
openai-codex    gpt-6-astra
openai-codex    gpt-6-luna
openai-codex    gpt-6.1-sol
openai-codex    gpt-6.1-terra
upstage         solar-pro4
xai             grok-4.7
```

### Claude subscription inside Pi

`claude-code` is the **Pi provider** from [earendil-works/pi-claude-code](https://github.com/earendil-works/pi-claude-code), not the standalone Claude Code harness/backend. Pi owns tools, conversation and compaction; the installed Claude Code CLI supplies model access using its existing subscription login. No copied credentials or separate Pi login. The existing `entwurf` ACP route remains available.

- Opus: `pi --entwurf-control --model claude-code/claude-opus-5-5`
- Sonnet: `pi --entwurf-control --model claude-code/claude-sonnet-5 --thinking medium`
- Start a new ordinary Pi process after package installation; registering a classic Pi extension does not also install it into pi-durable.
- **Experimental, Oracle + ThinkPad trials (2026-11-01):** source `70abb65186592ca788b29b3db22c3160d629c41f`, Pi 1.4.0, upstream 15/15 + typecheck, and real Sonnet → Pi `read` → final-answer round trips passed. The Oracle receipt came through Git; ThinkPad directly verified one fixture read, two responses with `isUsingOverage=false`, and existing settings/packages unchanged except this one addition. Opus was listed, not live-tested. Other devices were not installed or changed.
- Use `medium` for the tested Sonnet path. `off` maps to `thinking: disabled` in this ref and the current API rejected it with HTTP 400 (requesting `between_tools` instead); no tool ran. The provider source was not patched. Process exit 0 alone is not a successful model response.
- Keep `PI_CLAUDE_CODE_ALLOW_USAGE_CREDITS` unset/false. API-key/proxy/cloud overrides are rejected by the provider. Its overage guard stops **after** detecting a charged response, not before the first possible charge; subscription billing policy can change. Pi's displayed list-price estimate is not an extra-usage bill.

### Claude Pi launchers

GLG supplied these current shell definitions and reported starting work on Oracle (2026-11-01):

```bash
pico() { _pi_garden_pi --model claude-code/claude-opus-5-5 --thinking high --entwurf-control --emacs-agent-socket server "$@"; }
pics() { _pi_garden_pi --model claude-code/claude-sonnet-5 --thinking high --entwurf-control --emacs-agent-socket server "$@"; }
picf() { _pi_garden_pi --model claude-code/claude-fable-5-1 --thinking high --entwurf-control --emacs-agent-socket server "$@"; }
```

All three preserve caller arguments and select the ordinary Pi provider, not the native Claude Code backend. Fable remains explicit-use only. The local live fixture verified Sonnet at `medium`; the operator's `high` workflows and live Opus/Fable are not independently qualified by that fixture. This roster records the supplied mapping; it does not edit the shell file.

### GPT launchers

`pi --list-models 'gpt-6.1-terra'` reports `openai-codex/gpt-6.1-terra` with **500K context**, 128K max output, thinking and image support.

The operator's shell launchers are:

| Function | Model | Thinking |
|----------|-------|----------|
| `pit` | `openai-codex/gpt-6.1-terra` | `medium` |
| `pis` | `openai-codex/gpt-6.1-sol` | `medium` |
| `pish` | `openai-codex/gpt-6.1-sol` | `high` |

All three call `_pi_garden_pi --entwurf-control --emacs-agent-socket server`, select the model and thinking level above, and forward `"$@"`.

For `entwurf_fresh_call` with `backend: "pi"`, pass the effort in its `model` input: `openai-codex/gpt-6.1-terra:medium`, `openai-codex/gpt-6.1-sol:medium`, or `openai-codex/gpt-6.1-sol:high`. The pi CLI parses the suffix as its thinking level; entwurf accepts the colon and forwards the model string as the pi `--model` value. Check the installed entwurf release before relying on these selectors.

### Native harness selectors

For a `claude-code` sibling, use `opus` by default; `sonnet` is the lighter option; use `fable` only when GLG names it. `omp` has its own profiles in `omp/agents/`; do not infer an OMP selector from the pi list.
