---
name: glg-image
description: "Gemini 이미지 생성 독립 스킬. pi의 generate_image 도구가 없는 Claude Code·Codex·Antigravity에서도 번들된 무의존 CLI로 이미지·문서 인포그래픽을 생성한다. Org의 이미지 프롬프트 실행, 지정 경로 저장, 화면비·해상도 선택, GLGMAN 세계관 이미지 생성에 사용. '이미지 생성', '그림 뽑아', '인포그래픽', 'image prompt', 'glg-image', '나노바나나'."
compatibility: "Node.js 20+ and GEMINI_API_KEY in the environment or ~/.env.local"
---

# Gemini image generation

## API

| Task | Command |
|---|---|
| Exact prompt file → project image | `node {baseDir}/gemini-image-gen.mjs --prompt-file PROMPT.txt --aspect-ratio 16:9 --output images/result.png` |
| Inline prompt → global screenshot | `node {baseDir}/gemini-image-gen.mjs --prompt "PROMPT" --aspect-ratio 1:1` |
| High resolution | add `--image-size 2K` (use `4K` only when needed) |
| Expensive pro model | add `--model gemini-3-pro-image-preview` **only when explicitly requested** |
| Machine-readable result | add `--json` |
| Validate without API cost | add `--dry-run` |
| Help | `node {baseDir}/gemini-image-gen.mjs --help` |

Default model: `gemini-3.1-flash-image-preview`. The CLI loads `GEMINI_API_KEY` from the environment, then `~/.env.local`; it has no npm dependencies.

## Modes

### Exact-prompt mode — default

Use for document figures, infographics, architecture diagrams, and any authored prompt.

1. Preserve the supplied prompt verbatim in a temporary or source-controlled prompt file.
2. Run the bundled CLI with `--prompt-file` and an explicit `--output` path.
3. Read stdout for the actual saved path; verify the file type, dimensions, text legibility, and factual correspondence.
4. Return the saved path and exact prompt. Do not add the GLGMAN world block.

For Org documents, the `:noexport:` image prompt is the source. Extract that prompt exactly, generate into the document's `images/` directory, then rebuild the document.

### GLGMAN Universe mode — only when requested

Canonical command: `~/repos/gh/agent-config/commands/glg-image.md`

Canonical note: `/home/junghan/sync/org/botlog/20260327T100239--힣맨-세계관-비주얼-컨셉-—-펭귄-캐릭터-시트__botlog_brand_characterdesign_nanobanana_worldbuilding.org`

1. Read `공통 세계관 블록 (v2, 2026-04-01)` from the canonical note.
2. Append a blank line and the scene prompt.
3. Generate from that full prompt file. Never use the scene prompt alone.
4. Preserve GLGMAN as an anthropomorphic emperor penguin father: white/navy armor, subtle amber circuits, straight circuit sword, composed and warm; palette deep navy, white, amber/gold, ice-blue.

## Quality gate

- Reject unreadable or hallucinated labels; regenerate or use a deterministic diagram.
- Do not claim an output path until the file exists.
- Use the flash model first. A failed composition is not a reason to silently switch to the costly pro model.
- Never print or return the API key.
