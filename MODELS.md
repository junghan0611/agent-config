# Model Rails — What pi Can Call, and on What Terms

What `pi --list-models` shows answers "what can you call" — **not "under which contract."** Flat-rate subscriptions and token-metered usage land side by side in the same table. This document adds that layer.

**The list below is hand-picked and stays that way.** `./run.sh models` prints the live
`pi --list-models` output and diffs it against this file — it **writes nothing**. Until
2026-09-04 it rewrote the block between two snapshot markers, which meant every model GLG
deleted by hand came back on the next run: the curation was living inside an auto-generated
region. The markers are gone, the list is 20 of the 54 pi currently offers, and adding one
is a deliberate act.

## What GLG Uses Today — 2026-08-20

What GLG actually runs on now, and **which harness** each rail serves. This file is the SSOT for those facts — until now they had nowhere to live and were scattered.

| Rail | Used in | Covers |
|---|---|---|
| Claude subscription | Claude Code, pi (`entwurf` ACP) | Opus / Sonnet |
| GitHub Copilot subscription | pi (`github-copilot`), Copilot | **One storefront for GPT · Claude · Grok · Gemini · Kimi** |
| Codex subscription | pi only | GPT family |
| Grok subscription | pi | Grok family |
| Z.AI subscription | pi | GLM family |
| Upstage | pi | **Korean provider. `solar-pro4` sees real use** |
| DeepSeek API | pi | DeepSeek family |

Prices and ownership (company vs personal) are deliberately not recorded — this tracks "what is in use today," nothing more. **Keeping all of these costs money, and the lineup changes** — hence the date stamp. This file is a snapshot, not a permanent contract.

When a rail is added or removed: update this table and its date first, then run `./run.sh models` to refresh the snapshot.

## Priority Order When Opening a Sibling

The reason this file exists. When GLG opens a sibling through entwurf, "what can we hand it" is answered by the table above, and "what do we spend first" is answered by this order. This is not something each sibling should re-derive every time — consult what is written here.

1. **Rolling quota and flat-rate rails first.** `zai` (weekly credits + a 5-hour rolling window), `openai-codex`, `xai`, `entwurf` (Claude) — rails whose window reopens with time. Spend one dry and you wait; it does not disappear.
2. **GitHub Copilot next.** Convenient — GPT, Claude, and Grok all callable through one window — but **credits, once deducted, are gone.** Not a quota that comes back; a balance that shrinks. Work a rolling rail could do does not get burned here.
3. **Metered APIs only with a clear purpose.** `upstage` (Korean rail, `solar-pro4`), `deepseek`. Every call is an invoice line.

The sibling rules in AGENTS.md (approved rails, no OpenRouter) answer "what is allowed." This section answers, within that set, "what to spend first." If the two ever conflict, AGENTS.md wins.

## Rails

How the rails above map to pi providers.

| Provider | Contract | Auth | Notes |
|---|---|---|---|
| `entwurf` | Claude subscription | registered by the entwurf bridge | Sibling rail. `claude-opus-5` / `claude-sonnet-5` + `cortex-*` |
| `github-copilot` | Copilot subscription | OAuth (`/login`) | One storefront for Claude · Gemini · GPT · Grok · Kimi, plus the `mai-code-*` models — but **credit-depleting.** See "Priority Order When Opening a Sibling" above |
| `openai-codex` | Codex subscription | OAuth (`/login`) | Flat rate |
| `xai` | Grok subscription | OAuth (`/login`) | Flat rate |
| `zai` | GLM Coding Plan (Lite) | API key (`/login zai`) | Since 2026-08-20. 10,000 weekly credits · 5-hour rolling window. The endpoint itself is the subscription rail (`/api/coding/paas/v4`), so it cannot bill as metered usage |
| `deepseek` | Metered (API) | `DEEPSEEK_API_KEY` | |
| `upstage` | Metered (API) | `UPSTAGE_API_KEY` | Korean provider. Registered by `pi-extensions/upstage-provider.ts`; the model in real use is `solar-pro4`. Solar Open 2 is private beta |

All seven are rails in active use. Priority follows contract shape — rolling quota → Copilot credits → metered.

Defaults live in `~/.pi/agent/settings.json` as `defaultProvider` / `defaultModel` (currently `zai` / `glm-5.3`).

## Deliberately Hidden Providers

pi auto-enables a provider when its key is visible in the environment. The four below are **keys for skills and tools, not agent rails**, so `pi-extensions/hide-providers.ts` removes them from pi's process only (`SKIP_KEYS` in `env-loader.ts` blocks the re-injection).

| Provider | Hidden models | Key | Actual use |
|---|---|---|---|
| `openrouter` | 346 | `OPENROUTER_API_KEY` | andenken embeddings **only** — 임베딩·이미지 전용 레일이고 추론 레일이 아니다 |
| `huggingface` | 66 | `HF_TOKEN` | `pi-share-hf` |
| `google` | 22 | `GEMINI_API_KEY` | image generation only (`gemini-image-gen.ts`, `command-glgimage`) |
| `groq` | 6 | `GROQ_API_KEY` | `transcribe` speech-to-text |

The list drops from 497 lines to 57. The keys stay in `~/.env.local` (SSOT), and every consumer reads that file directly. **Google in particular is for image generation only** — an agent quietly routed onto a Gemini model is a real cost.

To bring one back: remove the key from both lists and re-run `./run.sh setup:links`.

## The claude-code rail — what a Claude Code sibling opens with

Not a pi provider, so it is **not** in the snapshot below and `./run.sh models` does not diff
it. `entwurf_fresh_call --backend claude-code` takes these aliases (measured from
`claude --help`, 2026-09-04):

| Alias | Full id | When |
|---|---|---|
| `opus` | `claude-opus-5` | **default for a claude-code sibling.** Use this unless GLG names another |
| `sonnet` | `claude-sonnet-5` | lighter work on the same rail |
| **`fable`** | `claude-fable-5` | **only when GLG asks for it by name.** Reserved for genuinely hard design problems — not a default, not a tie-breaker |

`~/.claude/settings.json` carries `modelSettings` for `claude-opus-5` and `claude-fable-5`
(both `effortLevel: xhigh`), so both are configured; being configured is not being default.

> This table exists because its absence caused a real error. On 2026-09-04 a sibling was
> opened on `fable` with no instruction to do so: the only place naming a concrete
> claude-code model string was a *spelling* rule in `home/AGENTS.md` ("when GLG says 페블,
> pass `fable`"), and a required `model` field got filled from the nearest remembered string.
> That paragraph has been deleted and the roster lives here instead. **When no model is named
> and none is documented for a rail, ask — do not fill a required field from memory.**

## Same names on the omp rail

`omp` is a garden sibling, and its model ids are the **same `provider/model` strings pi uses**
— verified 2026-09-04 by running `omp models` against `pi --list-models`. A model named here
can be handed to an omp sibling as-is.

Three differences worth knowing before you pass one:

| | pi | omp |
|---|---|---|
| xAI provider key | `xai` | **`xai-oauth`** |
| Claude / Upstage | `entwurf` rail + `upstage` | **absent** — omp has no entwurf bridge and no Upstage |
| Copilot breadth | 23 | **83**, including explicit `-1m` variants (`claude-opus-5-1m`) |

So a Claude sibling cannot be opened on omp's own providers; omp reaches Claude through
`github-copilot` instead. And `entwurf_fresh_call` takes a *fuzzy pattern* for omp, not an
exact id.

## Snapshot — hand-curated

```text
provider        model                    context  max-out  thinking  images
deepseek        deepseek-v4-flash        1M       384K     yes       no    
deepseek        deepseek-v4-pro          1M       384K     yes       no    
entwurf         claude-opus-5            1M       128K     yes       yes   
entwurf         claude-sonnet-5          1M       128K     yes       yes   
github-copilot  gemini-3.1-pro-preview   1M       64K      yes       yes   
github-copilot  gemini-3.7-flash         1M       64K      yes       yes   
github-copilot  gpt-5.6-luna             1.1M     128K     yes       yes   
github-copilot  gpt-5.6-sol              1.1M     128K     yes       yes   
github-copilot  gpt-5.6-terra            1.1M     128K     yes       yes   
github-copilot  grok-4.6                 500K     128K     yes       yes   
github-copilot  kimi-k3                  1.0M     131.1K   yes       yes   
openai-codex    gpt-5.6-luna             272K     128K     yes       yes   
openai-codex    gpt-5.6-sol              272K     128K     yes       yes   
openai-codex    gpt-5.6-terra            272K     128K     yes       yes   
upstage         solar-pro4               524.3K   131.1K   yes       no    
xai             grok-4.6                 500K     500K     yes       yes   
zai             glm-5.3                  1M       131.1K   yes       no    
```
