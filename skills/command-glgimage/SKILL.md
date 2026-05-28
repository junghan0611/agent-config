---
name: glg-image
description: "멀티하네스용 /glg-image 래퍼. GLGMAN 유니버스 공통 세계관 블록과 장면 프롬프트를 합쳐 이미지를 만든다. Antigravity/Codex처럼 네이티브 이미지 생성이 있는 하네스에서는 그것을 우선 사용하고, 없으면 repo tool(generate_image)로 폴백한다."
---

# glg-image — multi-harness wrapper for `/glg-image`

Canonical SSOT: `~/repos/gh/agent-config/commands/glg-image.md`

## Goal

Generate an image inside the **GLGMAN Universe** without losing the world/character anchor.

Canonical note:
- `/home/junghan/sync/org/botlog/20260327T100239--힣맨-세계관-비주얼-컨셉-—-펭귄-캐릭터-시트__botlog_brand_characterdesign_nanobanana_worldbuilding.org`

## Workflow

1. Read the canonical note.
2. Extract the **common world block** from `공통 세계관 블록 (v2, 2026-04-01)`.
3. Extract or draft the user's **scene prompt**.
4. Build the full prompt as:
   - common world block
   - blank line
   - scene prompt
5. Never generate from the scene prompt alone.

## Generation routing

### Prefer native image generation when available

On harnesses like **Antigravity** or **Codex** that already expose built-in image generation under the subscription plan, use that native capability first.

### Fallback

If the harness has no native image generation path, use the repo-side image generation tool (`generate_image`) if available.

## Return

Always return:
- image path / artifact handle if available
- the **exact full prompt** used
- a short note on whether the result stayed inside the GLGMAN Universe style

## GLGMAN identity lock

Preserve unless the user explicitly overrides:
- anthropomorphic **emperor penguin father**
- default heroic form: **white-navy streamlined armor** with **subtle amber circuit patterns**
- default object: a **straight circuit-patterned sword**
- posture: **upright, composed, mythic, warm**
- palette anchor: **deep navy, white, amber/gold, ice-blue**

Do not drift GLGMAN into another species, human, generic robot, or random mascot.

## Priority order

1. GLGMAN identity consistency
2. GLGMAN Universe world consistency
3. Scene-specific flourish

## Rule

This skill is the **skill-form translation** of `/glg-image` for harnesses without native repo-managed custom commands.
