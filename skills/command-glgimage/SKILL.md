---
name: glg-image
description: "이미지 생성 멀티백엔드. 1차=Gemini Flash Lite 1K(속도), 필요 시 Flash 1K·Grok 구독. Denote 파일명 __brand_<maker>. Autholog 재생성 루프용. '이미지 생성', '그림 뽑아', 'glg-image', '나노바나나', 'flash lite'."
compatibility: "Node 20+ and GEMINI_API_KEY for gemini lite/flash; grok CLI optional subscription backend"
---

# Image generation — multi-backend (speed first)

Autholog edits often regenerate an image **2–3 times** in one sitting. **Wall-clock latency matters more than shaving API cents.** Default is fast Gemini Lite @ 1K; Grok remains a subscription option; Codex is opt-in only (style mismatch).

## Default policy

| Rule | Value |
|------|--------|
| **1st try** | **Gemini 3.1 Flash Lite Image** (`gemini-3.1-flash-lite-image`) @ **1K** |
| Resolution | **1K always** unless GLG explicitly asks 2K/4K (Lite cannot do 2K/4K) |
| Escalate | Lite weak on lock → **Flash** (`gemini-3.1-flash-image`) still @ 1K |
| Alt | **grok** Imagine (sub, ~40s, cel-flat) when GLG wants that look or API key missing |
| Avoid default | **codex** (painterly); **Pro Image**; auto-**2K** |
| Filename | `~/screenshot/YYYYMMDDTHHMMSS--<slug>__brand_<maker>.jpg` |

### Maker tags (`__brand_<maker>`)

| maker | Backend |
|-------|---------|
| `geminilite` | Nano Banana 2 Lite |
| `geminiflash` | Nano Banana 2 (Flash) |
| `geminipro` | Nano Banana Pro (explicit only) |
| `grok` | Grok Imagine |
| `codex` | Codex image_gen (explicit only) |
| `nanobanana` | legacy gemini dumps only |

## Model card (product names)

| Product | API id | Role | Size | Notes |
|---------|--------|------|------|--------|
| **Nano Banana 2 Lite** | `gemini-3.1-flash-lite-image` | **Default** — speed/cost | **1K only** | <~2s target; not for heavy multi-ref / long multi-turn edit chains |
| **Nano Banana 2** | `gemini-3.1-flash-image` | Workhorse escalate | 0.5K / **1K** / 2K / 4K | Better consistency, text, multi-ref; we still default **1K** |
| **Nano Banana Pro** | `gemini-3-pro-image` (+ preview ids) | Premium | 1K–4K | Explicit only |
| **Grok Imagine** | via `grok` CLI `image_gen` | Sub alt | ~1280×720 | No Gemini $; slower agent loop than Lite |

### Gemini $ (paid tier, image **output** — scales with size)

Flash Image (~$60/1M image tokens): **1K ≈ $0.067**, **2K ≈ $0.101**, 4K ≈ $0.151, 0.5K ≈ $0.045.  
Flash Lite Image (~$15–30/1M depending tier): **1K ≈ $0.017–0.034**.  
**2K is not free upgrade** — do not auto-2K on autholog retries.

## Filename contract

```text
YYYYMMDDTHHMMSS--<slug>__brand_<maker>.<ext>
```

KST Denote timestamp · short ascii slug · **required maker tag**.  
Never leave maker-less finals. Session caches under `~/.grok/sessions/` or `~/.codex/generated_images/` are intermediate only.

## Invoke

### A. Gemini Lite / Flash (primary path)

```bash
TS=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
# 1st try — lite
node {baseDir}/gemini-image-gen.mjs \
  --prompt-file PROMPT.txt \
  --aspect-ratio 16:9 \
  --image-size 1K \
  --model lite \
  --output ~/screenshot/${TS}--<slug>__brand_geminilite.jpg \
  --json

# escalate — flash still 1K
node {baseDir}/gemini-image-gen.mjs \
  --prompt-file PROMPT.txt \
  --aspect-ratio 16:9 \
  --image-size 1K \
  --model flash \
  --output ~/screenshot/${TS}--<slug>__brand_geminiflash.jpg \
  --json
```

Aliases: `lite` · `flash` · `pro` · full API ids.  
CLI default model = **lite**, default size = **1K**. Lite + `--image-size 2K` is rejected.

Exact-prompt mode: pass autholog `:PROMPT:` body **verbatim** (no rewrite).

### B. Grok (subscription alt)

```bash
# --prompt-file alone (do NOT combine with -p)
grok --prompt-file AGENT_WRAPPER.txt \
  --always-approve --max-turns 8 \
  --output-format plain --cwd /tmp
```

Wrapper forces exact prompt + final path ending in `__brand_grok.jpg`.

### C. Codex — only if GLG asks

`codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox ...` → `__brand_codex.jpg`.

## Autholog loop (2–3 retries)

1. Extract exact `:PROMPT:`.
2. Generate **lite @ 1K** → open pixels → check locks (body, no extra cast, no text, meaning).
3. If fail: same prompt again **lite**, or escalate **flash @ 1K** (not 2K).
4. Optional third: **grok** if Lite/Flash miss the cel mood GLG wants.
5. Record path + maker + model in note; keep `:PROMPT:` unchanged.

Do **not** burn retries on Pro or 2K unless GLG says so.

## GLGMAN mode

Canonical command note: `~/repos/gh/agent-config/commands/glg-image.md`  
World SSOT botlog: `20260327T100239` — offset-read common block only when composing a **new** scene. Existing autholog `:PROMPT:` already embeds world lock → use as-is.

## Quality gate

- Claimed path must exist.
- Subject integrity + forbidden-object/text locks.
- Name pose/object drift honestly.
- Never print API keys.
- Never silent Pro / 2K escalate after one weak Lite frame.

## Reference batch (2026-08-02 tears, same prompt)

| brand | backend | px | ~latency |
|-------|---------|-----|----------|
| grok | Imagine | 1280×720 | ~40s |
| geminiflash | flash 1K | 1376×768 | ~10s |
| codex | (opt-in) | 1672×941 | ~90s |

Lite not in that batch; product target &lt;2s + lowest $ — use as autholog first shot going forward.
