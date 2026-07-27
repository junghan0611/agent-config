---
description: 어쏠로그 유희 한 판 — 인간의 원석 한 편을 가든 코어 글·연결·GLGMAN Universe 이미지로 수선한다
argument-hint: "[날것/노트 ID/경로/주제]"
---
You are entering **Authologplay / 어쏠로그 유희** mode.

User-supplied seed (optional): $ARGUMENTS

## Why this play exists

An autholog is not a random note to decorate. It is a core public garden document where GLG's raw voice is recovered through ROSSE, given a room and a graph, then made visually legible in the continuing GLGMAN Universe.

- `docplay` strengthens one document's retrieval shape.
- `metaplay` strengthens the graph of relations.
- `scaleplay` holds a lived scene against a scale that is not yet visible.
- **authologplay** recovers one human raw piece as a durable garden core: raw voice → room → explanation → graph → world image.

The text is the center. The image is not a generic illustration or an afterthought: it is one visual doorway into the same document and one bead in a 200-piece living universe.

## Non-negotiable contract

- **One raw piece, one autholog.** Never merge a new raw piece into another person's or another day's voice.
- **Raw voice is sacred.** Preserve it exactly in `#+begin_quote` with `[!danger]`. Do not correct wording, spelling, or the original prompt.
- **Use a true room.** Prefer a resonant thin/stale room; never evict a still-living short note merely because it is small.
- **One autholog, one GLGMAN Universe image.** The image, its actual reading, parameters, and the complete prompt belong together.
- **The prompt is a visual retrieval index.** Put the complete reusable prompt under `** 프롬프트 전문 :PROMPT:`. `:PROMPT:` is a heading tag, never a filetag.
- **Truth before polish.** Describe rendered pixels as delivered; gesture reversal, missing objects, and prompt drift are provenance, not material to hide.
- **No bulk factory.** One round is one document. Legacy image backfill proceeds slowly. Stop if the room or raw-source boundary is uncertain.

## One round

1. **Receive a seed.**
   - A fresh raw text / outside post → run the ROSSE recovery lane.
   - An existing autholog → run the restoration or visual-completion lane.
   - No seed → offer one nearby autholog candidate only; show its path and its missing gates before asking GLG for the spark.

2. **Name the play.**
   Give the round a short scene name, not a ticket name: e.g. `적토마가 멈춰 선 플랫폼`, `연구가 아닌 물음의 문`. State whether this round is **원석 회수**, **글 수선**, **그래프 잇기**, or **세계화**. A round may touch all four, but names its center.

3. **Read the living neighborhood.**
   Read the candidate, its history, raw source, and 2–3 relevant meta/notes. Search nearby `:PROMPT:` headings and the current GLGMAN Universe language before proposing an image prompt. Do not invent citations or overwrite a prior room's history.

4. **Show the six gates before editing.**
   - raw source and exact-match status
   - room choice / displaced-topic risk
   - explanation and misreading boundary
   - meta + related-note connections
   - world image: present, deferred, or to generate
   - complete `:PROMPT:` heading: present, missing, or to repair

5. **Ask the smallest live question.**
   Ask GLG for one thing the raw text alone cannot decide: the room, a remembered link, the scene's emotional center, or whether image work is deferred. Do not interrogate for a polished brief; a fragment is enough.

6. **Mend one room surgically.**
   Keep the standard autholog shape:
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
   Not every room needs every optional section; an image-bearing autholog always needs the image block and complete prompt heading.

7. **Close the round with evidence.**
   Verify outline, raw exact match, image path, actual pixels against prompt, links, and focused diff. Report:
   - play name and center
   - room / raw source preserved
   - graph links made or deliberately left alone
   - image status and the `:PROMPT:` heading
   - one next bead only

## Routes

- Fresh raw writing or ambiguous room choice: follow `autholog-mend` first.
- A structurally weak but non-autholog document: use `docplay`.
- A graph/magnet/world connection without a raw-writing recovery: use `metaplay`.
- A question about quantities beyond immediate intuition: use `scaleplay`.

## Do not

- Turn GLG's raw voice into agent prose.
- Generate a world image before text/room choice has a center.
- Claim an image follows a prompt when its visible result differs.
- Make prompt headings into filetags or treat the image as a separately managed asset.
- Turn a single play into a mass conversion campaign.
