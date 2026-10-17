---
name: summarize
description: "URL/파일/미디어 요약 및 콘텐츠 추출. YouTube 영상, 웹페이지, PDF, 팟캐스트, 오디오/비디오 지원. 구독 CLI 레일만 쓴다(기본 Codex gpt-6-luna). 정본이 필요한 YouTube 자막은 youtube-transcript 스킬을 쓴다."
---

# summarize

[@steipete/summarize](https://github.com/steipete/summarize) — installed via nixos-config
(`scripts/external-packages.sh`, pnpm global), checked at **0.25.2** (2026-10-17). Upstream ships its
own agent skill (`.agents/skills/summarize`); this page keeps the house rules. Exact flags:
`summarize --help`.

**Always run it through `{baseDir}/scripts/summarize`**, never bare `summarize`. The wrapper drops
every metered API key (OpenRouter, Groq, Gemini, OpenAI, …) before exec, so only subscription CLI
rails remain. Bare `summarize` still sees those keys in the login env: media transcription tries
Groq first whenever `GROQ_API_KEY` is set, and `--model auto` can fall back to API providers.

## Rail — subscription CLIs only

`~/.summarize/config.json` (live, 2026-10-17; the old OpenRouter model is in `config.json.bak-20261017`):

```json
{ "model": { "id": "cli/pi/openai-codex/gpt-6-luna" },
  "cli": { "enabled": ["pi", "codex", "claude", "grok"], "autoFallback": { "enabled": false } } }
```

| Model | Rail | 6.8KB Korean note, `--length short` (2026-10-17) |
|-------|------|---------------------------------------------------|
| `cli/pi/openai-codex/gpt-6-luna` (default) | Codex subscription through pi (`--no-tools --no-skills --no-session`) | 7.0s, ↑2.8k ↓0.3k |
| `cli/codex/gpt-6-luna` | the same Codex subscription through codex CLI (isolated `CODEX_HOME`) | 11s, ↑16k ↓0.2k — bare `cli/codex` asks for `gpt-5.5` and fails |
| `cli/claude/sonnet` | Claude subscription | 8.2s, ↑36k ↓0.3k — Claude Code's own prompt overhead |
| `cli/grok` | SuperGrok | 2m6s, ↓7.4k reasoning — too slow for routine use |

The `$` in the finish line is an API-equivalent estimate; these rails spend subscription quota.
Never pass `openrouter/*`, `google/*`, `openai/*` or `--model free`.

## YouTube canon belongs to youtube-transcript

`summarize --extract` returns captions, but it is a screening path, not evidence. When quotation,
evidence or garden import matters — who said exactly what — use `youtube-transcript`: it splits turns
only at the source's `>>` and never lets an LLM reshape punctuation (GLG: *LLM이 개입되면 안돼*).
`--markdown-mode llm` rewrites sentence boundaries. When unsure, fail toward `youtube-transcript`.

## Commands

| Task | Command | ⚠️ |
|------|---------|----|
| Extract web text, no LLM | `{baseDir}/scripts/summarize URL --extract --format md --plain` | try this first |
| YouTube captions (screening) | `{baseDir}/scripts/summarize URL --extract --plain` | not canon (above) |
| Summarize URL / PDF / file | `{baseDir}/scripts/summarize INPUT --lang ko --plain` | `--length short/medium/long/xl/xxl` or chars; default `long` |
| Pick another rail once | `{baseDir}/scripts/summarize INPUT --model cli/codex/gpt-6-luna --plain` | only `cli.enabled` providers are accepted |
| Automation | `{baseDir}/scripts/summarize INPUT --json --metrics off` | text in `.summary` or `.extracted.content`; stderr stays separate |
| Slides | `{baseDir}/scripts/summarize URL --slides` · `summarize slides URL --render auto` | needs yt-dlp + ffmpeg; OCR needs tesseract (absent) |
| Status | `{baseDir}/scripts/summarize status` | should list only Claude/Codex/Pi/Grok CLI |
| Cache | `--no-cache` (LLM cache only) · `--cache-stats` · `--clear-cache` | content-hash keyed; repeats are free |

## Notes

- Audio/video with no captions needs transcription. With the keys dropped only local engines remain, and none is installed (no whisper.cpp/ONNX), so it fails closed. Groq transcription is the separate `transcribe` skill.
- `--extract` skips only the final summary call; on media it may still transcribe.
- `--diarize` needs ElevenLabs/OpenAI keys — not available on this rail.
- Use `--timeout 5m` for long inputs. Default language is the source's; pass `--lang ko` when the user did not ask otherwise.
