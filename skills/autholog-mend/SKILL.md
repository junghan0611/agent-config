---
name: autholog-mend
description: "ROSSE/autholog 원석 수선 — 날것을 ~/org/notes의 기존 빈방에 원문 1개+해설본 1개로 승격. [!danger] 원문 보존, meta 자석 갱신, autholog 1편당 GLGMAN Universe 이미지 1장과 검색 가능한 :PROMPT: 헤딩을 둔다. Triggers: 어쏠로그, autholog, 날것, 원석, 빈방, 인테리어, ROSSE, 가든으로 회수, 수선."
---

# autholog-mend — raw writing intake

Recover GLG's public raw writing as a `notes/` autholog. This is the raw → room → meta → world-image lane of `/mend`. For one-document core-garden restoration and its playful image/prompt round, enter `/authologplay`; this skill remains the ROSSE intake and room-choice contract.

## Contract

- **One raw piece, one autholog.** Never hide a new piece inside a related note.
- **Reuse a real empty room.** Search thin/hold/temp/outdated notes, but do not evict a short note whose topic is still alive.
- **Raw voice is sacred.** Preserve exact text in `#+begin_quote` + `[!danger]`; do not fix spelling or prompts.
- **Add explanation.** Give time/place, concepts, misreading boundaries, links, and the reason this room fits.
- **Repair magnets.** Connect useful `meta/` notes and established English tags. `notes/` is GLG's rail; agent exposition stays in `botlog/`.
- **One autholog, one world image.** Every autholog ultimately has one GLGMAN Universe image: 200 authologs means 200 images.
- **Prompt headings are the visual index.** Put the complete prompt below a heading tagged `:PROMPT:` such as `** 프롬프트 전문 :PROMPT:`. This is a heading tag, never a filetag.
- **Text comes first.** Keep an adequate image despite minor prompt drift and describe the delivered pixels honestly. If GLG defers image work, finish the text; backfill legacy authologs gradually, never as a bulk image job.
- **Preserve room 히스토리.** A moved seed goes to its proper meta/hub and remains named under `옛 방의 씨앗`.
- **Name the author in 히스토리.** Every 히스토리 line carries who wrote it: `@junghan` for GLG's own edit, `@mitsein/<model>` (or `@pi@<device>`) for the agent's pass. Never merge a human edit and an agent edit into one untagged line — authorship is exactly what this format exists to keep legible.

## Image contract

- Search nearby `:PROMPT:` headings and the current GLGMAN world SSOT before drafting; do not fork the visual language.
- Keep image link, generation parameters, and complete prompt together in the autholog.
- Compare the actual image with the prompt. Reversed gestures, missing objects, or ambiguity are provenance.
- New mends normally close with an image. Existing image-less authologs are a slow backfill queue unless GLG explicitly asks for generation now.

## Workflow

1. **Stop before writing** when room choice is ambiguous.
2. **Find 2–5 candidates** with `denotecli search`, `search-content`, `knowledge_search`, then `read --outline`.
3. **Choose one true room:** stale/thin/outdated, conceptually resonant, and not a complete autholog with another raw piece.
4. **Undo wrong placement first.** Restore a displaced topic before reusing another room.
5. **Remodel:** front matter, abstract, 히스토리, meta/notes, concise explanation, exact raw block, optional follow-up raw, and old-room seed.
6. **Repair meta notes.** Move useful seeds; do not promote unverified LLM citations or claims.
7. **Handle the image.** Reuse/generate in-world, tag the complete prompt heading `:PROMPT:`, or record explicit text-first deferral without claiming completion.
8. **Rename through Emacs:** `agent-denote-set-front-matter ... :rename t`; never raw `mv`.
9. **Verify:** `denotecli read ID --outline`, raw exact match, actual pixels vs prompt, image path, `git status --short`, focused diff.

## Standard shape

```org
#+title:      @힣: ...
#+filetags:   :autholog:...:
#+description: ...

#+begin_quote
[!abstract] 이 노트에 대하여
...
#+end_quote

* 히스토리
* 관련메타
* 관련노트
* 한 줄
* <core axes and misreading boundary>
* 이미지 — <scene and actual reading>
** 생성 파라미터
** 프롬프트 전문 :PROMPT:
* 원문 보존 — <surface> 날것
#+begin_quote
[!danger]
...exact raw...
#+end_quote
* 후속 댓글 보존 — ...
* 옛 방의 씨앗
```
