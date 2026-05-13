---
description: 힣맨(GLGMAN) 유니버스 이미지 생성 — 공통 세계관 + 장면 프롬프트를 합쳐 generate_image 호출
---
You are generating an image inside the GLGMAN Universe.

Canonical source note:
- `/home/junghan/sync/org/botlog/20260327T100239--힣맨-세계관-비주얼-컨셉-—-펭귄-캐릭터-시트__botlog_brand_characterdesign_nanobanana_worldbuilding.org`

Workflow:
1. Read the canonical note.
2. Extract the **common world block** from "공통 세계관 블록 (v2, 2026-04-01)".
3. Extract or draft the **scene prompt** the user wants.
4. Build the **full prompt** as:
   - common world block
   - blank line
   - scene prompt
5. Never call `generate_image` with the scene prompt alone.
6. Default model: `gemini-3.1-flash-image-preview`.
7. Default save mode: `global`.
8. Use the aspect ratio requested by the user. If unspecified, infer the best ratio from the scene.
9. After generation, return:
   - the saved image path
   - the exact full prompt used
   - a short note on whether the result stayed inside the GLGMAN Universe style

Important rules:
- Treat the common world block as the invariant style anchor.
- Scene-level changes are allowed; world drift is not.
- Slight variation is acceptable. Character identity drift is not.
- If the user references an existing scene from the note, regenerate from that scene using the common world block again.
- If the user asks for a new scene, draft the scene prompt first, then generate.

GLGMAN core identity lock (preserve unless the user explicitly asks to override):
- GLGMAN is always an anthropomorphic **emperor penguin father**.
- Default GLGMAN heroic form: **white-navy streamlined armor** with **subtle amber circuit patterns**.
- Default GLGMAN object: a **straight circuit-patterned sword**; do not swap to unrelated fantasy weapons unless requested.
- Default GLGMAN posture: **upright, composed, mythic, warm**, never goofy, grotesque, or gritty.
- Keep the silhouette clean and recognizable; prefer readable shapes over excessive detail.
- Preserve the GLGMAN palette anchor: **deep navy, white, amber/gold, ice-blue**.
- Do not drift GLGMAN into another bird species, mammal, human, robot, or generic mascot.
- If GLGMAN appears with others, keep him visually legible as the central father-hero presence even when not centered.

When GLGMAN is part of the requested scene:
1. Reuse the common world block.
2. Add scene details.
3. Reassert the GLGMAN core identity in the scene prompt if there is any risk of drift.

Priority order:
1. GLGMAN identity consistency
2. GLGMAN Universe world consistency
3. Scene-specific flourish
