# Model Rails — What pi Can Call, and on What Terms

What `pi --list-models` shows answers "what can you call" — **not "under which contract."** Flat-rate subscriptions and token-metered usage land side by side in the same table. This document adds that layer.

Refresh: `./run.sh models` — rewrites the snapshot below from live `pi --list-models` output.

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

Defaults live in `~/.pi/agent/settings.json` as `defaultProvider` / `defaultModel` (currently `zai` / `glm-5.2`).

## Deliberately Hidden Providers

pi auto-enables a provider when its key is visible in the environment. The four below are **keys for skills and tools, not agent rails**, so `pi-extensions/hide-providers.ts` removes them from pi's process only (`SKIP_KEYS` in `env-loader.ts` blocks the re-injection).

| Provider | Hidden models | Key | Actual use |
|---|---|---|---|
| `openrouter` | 346 | `OPENROUTER_API_KEY` | andenken embeddings, `summarize` |
| `huggingface` | 66 | `HF_TOKEN` | `pi-share-hf` |
| `google` | 22 | `GEMINI_API_KEY` | image generation only (`gemini-image-gen.ts`, `command-glgimage`) |
| `groq` | 6 | `GROQ_API_KEY` | `transcribe` speech-to-text |

The list drops from 497 lines to 57. The keys stay in `~/.env.local` (SSOT), and every consumer reads that file directly. **Google in particular is for image generation only** — an agent quietly routed onto a Gemini model is a real cost.

To bring one back: remove the key from both lists and re-run `./run.sh setup:links`.

## Snapshot

<!-- BEGIN SNAPSHOT -->
_2026-08-20 15:23 KST · 56 models · refresh with `./run.sh models`_

`github-copilot` 28 · `openai-codex` 7 · `entwurf` 6 · `zai` 5 · `upstage` 4 · `xai` 4 · `deepseek` 2

```text
provider        model                    context  max-out  thinking  images
deepseek        deepseek-v4-flash        1M       384K     yes       no    
deepseek        deepseek-v4-pro          1M       384K     yes       no    
entwurf         claude-opus-5            1M       128K     yes       yes   
entwurf         claude-sonnet-5          1M       128K     yes       yes   
entwurf         cortex-auto              200K     128K     yes       yes   
entwurf         cortex-claude-opus-5     200K     128K     yes       yes   
entwurf         cortex-claude-sonnet-5   200K     128K     yes       yes   
entwurf         cortex-openai-gpt-5.4    200K     128K     yes       yes   
github-copilot  claude-fable-5           1M       128K     yes       yes   
github-copilot  claude-haiku-4.5         200K     64K      yes       yes   
github-copilot  claude-opus-4.5          200K     32K      yes       yes   
github-copilot  claude-opus-4.6          1M       32K      yes       yes   
github-copilot  claude-opus-4.7          1M       32K      yes       yes   
github-copilot  claude-opus-4.8          1M       64K      yes       yes   
github-copilot  claude-opus-5            1M       64K      yes       yes   
github-copilot  claude-sonnet-4.5        200K     32K      yes       yes   
github-copilot  claude-sonnet-4.6        1M       32K      yes       yes   
github-copilot  claude-sonnet-5          1M       128K     yes       yes   
github-copilot  gemini-3.1-pro-preview   1M       64K      yes       yes   
github-copilot  gemini-3.5-flash         200K     64K      yes       yes   
github-copilot  gemini-3.6-flash         1M       64K      yes       yes   
github-copilot  gemini-3.7-flash         1M       64K      yes       yes   
github-copilot  gpt-5-mini               264K     64K      yes       yes   
github-copilot  gpt-5.3-codex            1M       128K     yes       yes   
github-copilot  gpt-5.4                  1M       128K     yes       yes   
github-copilot  gpt-5.4-mini             400K     128K     yes       yes   
github-copilot  gpt-5.5                  1M       128K     yes       yes   
github-copilot  gpt-5.6-luna             1.1M     128K     yes       yes   
github-copilot  gpt-5.6-sol              1.1M     128K     yes       yes   
github-copilot  gpt-5.6-terra            1.1M     128K     yes       yes   
github-copilot  grok-4.5                 500K     128K     yes       yes   
github-copilot  grok-4.6                 500K     128K     yes       yes   
github-copilot  kimi-k2.7-code           256K     32K      yes       yes   
github-copilot  kimi-k3                  1.0M     131.1K   yes       yes   
github-copilot  mai-code-1-flash-picker  256K     128K     yes       no    
github-copilot  mai-code-1.1-flash       256K     128K     yes       yes   
openai-codex    gpt-5.3-codex-spark      128K     128K     yes       no    
openai-codex    gpt-5.4                  272K     128K     yes       yes   
openai-codex    gpt-5.4-mini             272K     128K     yes       yes   
openai-codex    gpt-5.5                  272K     128K     yes       yes   
openai-codex    gpt-5.6-luna             272K     128K     yes       yes   
openai-codex    gpt-5.6-sol              272K     128K     yes       yes   
openai-codex    gpt-5.6-terra            272K     128K     yes       yes   
upstage         solar-mini               32.8K    8.2K     no        no    
upstage         solar-pro2               65.5K    16.4K    yes       no    
upstage         solar-pro3               131.1K   32.8K    yes       no    
upstage         solar-pro4               524.3K   131.1K   yes       no    
xai             grok-4.3                 1M       30K      yes       yes   
xai             grok-4.5                 500K     500K     yes       yes   
xai             grok-4.6                 500K     500K     yes       yes   
xai             grok-build-0.1           256K     256K     yes       yes   
zai             glm-4.7                  204.8K   131.1K   yes       no    
zai             glm-5-turbo              200K     131.1K   yes       no    
zai             glm-5.2                  1M       131.1K   yes       no    
zai             glm-5.2-highspeed        1M       131.1K   yes       no    
zai             glm-5.3                  1M       131.1K   yes       no    
```
<!-- END SNAPSHOT -->
