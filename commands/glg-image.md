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
