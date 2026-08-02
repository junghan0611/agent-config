---
name: autholog-mend
description: "ROSSE/autholog 원석 수선 — 날것을 ~/org/notes의 기존 빈방에 원문 1개+해설본 1개로 승격. [!danger] 원문 보존, outgoing 자석 연결(meta dblock 갱신 금지), autholog 1편당 GLGMAN Universe 이미지 1장과 검색 가능한 :PROMPT: 헤딩을 둔다. Triggers: 어쏠로그, autholog, 날것, 원석, 빈방, 인테리어, ROSSE, 가든으로 회수, 수선."
---

# autholog-mend — raw writing intake

Recover GLG's public raw writing as a `notes/` autholog. This is the raw → room → outgoing magnets → world-image skill lane (the old monolithic `/mend` command split here and into `tag-mend`). For one-document core-garden restoration and its playful image/prompt round, enter `/authologplay`; this skill remains the ROSSE intake and room-choice contract.

## Contract

- **One raw piece, one autholog.** Never hide a new piece inside a related note.
- **Reuse a real empty room.** Search thin/hold/temp/outdated notes, but do not evict a short note whose topic is still alive.
- **Raw voice is sacred.** Preserve exact text in `#+begin_quote` + `[!danger]`; do not fix spelling or prompts.
- **Add explanation.** Give time/place, concepts, misreading boundaries, links, and the reason this room fits.
- **Connect magnets, do not rebuild them.** On the new autholog only, point `관련메타` / `관련노트` at useful `meta/` notes and keep established English tags. Do not refresh/eval meta dblocks so a write “shows up” in the magnet — GLG’s export script does that. Regexp fixes on a broken dblock definition are fine; body rewrites of meta notes are not part of this lane. `notes/` is GLG's rail; agent exposition stays in `botlog/`.
- **One autholog, one world image.** Every autholog ultimately has one GLGMAN Universe image: 200 authologs means 200 images.
- **Prompt headings are the visual index.** Put the complete prompt below a heading tagged `:PROMPT:` such as `** 프롬프트 전문 :PROMPT:`. This is a heading tag, never a filetag.
- **Text comes first.** Keep an adequate image despite minor prompt drift and describe the delivered pixels honestly. If GLG defers image work, finish the text; backfill legacy authologs gradually, never as a bulk image job.
- **Preserve room 히스토리.** A moved seed goes to its proper meta/hub and remains named under `옛 방의 씨앗`.
- **Name the author in 히스토리.** Every 히스토리 line names who wrote that pass. Raw voice stays `@junghan`. Agent mend/re-explanation names the **model with version** (e.g. `sonnet5`, `opus`, `gpt-5.6`, `grok-4.5`) so the 해설본's stance is legible later — harness-only stamps like bare `pi` are not enough. Read the live session model (`PI_MODEL` / `PI_AGENT_ID`); never invent one. Do not hard-code one sigil grammar; follow the pattern already used in nearby recent 히스토리 lines, and keep the version visible inside whatever form that is. Never merge a human edit and an agent edit into one untagged line.

## Image contract

- Before drafting, offset-read the GLGMAN common block and the nearest `:PROMPT:` headings only; do not fork the visual language, and do not load the full character sheet or world bible.
- Keep image link, generation parameters, and complete prompt together in the autholog.
- Compare the actual image with the prompt. Reversed gestures, missing objects, or ambiguity are provenance.
- New mends normally close with an image. Existing image-less authologs are a slow backfill queue unless GLG explicitly asks for generation now.

## Context budget / retrieval gate

Concentrate force on three points only: **(A) ops context + raw restore**, **(B) room judgment**, **(C) present re-explanation + anchors + image**. Everything else stays thin and decisive.

### Hard stops

- **Raw once.** Read the source raw fully exactly once. Treat later `exact-match` verification as the final gate, not a second interpretive pass.
- **Outline-first candidates.** After semantic/`denotecli` search, run `denotecli read ID --outline` only. Reject immediately when outline/frontmatter already shows a living independent raw, a finished autholog with another piece, or a long reading note. Do **not** full-body `denotecli read ID` on candidates.
- **Body read is narrow.** Open body only for the chosen room, or for a still-undecided candidate, and only the needed `offset` window (~40–80 lines). Stop the candidate loop the moment one true empty/thin room is confirmed.
- **Cap 2–5 candidates.** Never widen the set to “be thorough.” Graph/backlink walks run only after room choice, and only when the selected room or raw actually needs link repair — never per candidate.
- **Re-explanation anchors: 2–4.** Read only the parts the raw itself calls. Label each use as fact / association / judgment. Do not preload adjacent garden lore.
- **Image SSOT is offset-thin.** Read the GLGMAN common block and the nearest `:PROMPT:` via offset. Do not read the full character sheet or world bible. Generation: skill `glg-image` — **speed first** (autholog often retries 2–3×): default **Gemini Flash Lite @ 1K**, escalate Flash @ 1K, optional **grok**; filename `__brand_<geminilite|geminiflash|grok|…>` required. No auto-2K/Pro.
- **No dblock refresh/eval.** Never run org dblock update / agent-server dblock eval to “reflect” a new magnet while writing. GLG’s garden-export script refreshes magnets. Conservative **regexp edits** on an existing dblock definition are allowed when the pattern itself is wrong (`\|` etc.). Do not bulk-edit reverse-link indexes. On the new autholog, repair only its own outgoing `관련메타` / `관련노트` links (and move a displaced seed when Contract requires it).
- **tag-mend is optional and separate.** Invoke only for new/suspicious tags or a filename-boundary problem. Standard authologs that already carry established magnet tags get a filename-budget check only.
- **Final verify is focused.** Raw exact match, focused diff of touched files, filename budget, image exists (+ pixels vs prompt when generated). No whole-repo `status` archaeology, no full diff dump, no meta-index rebuild.

### Allowed deep reads

| Target | Depth |
|--------|--------|
| Source raw | Full, once |
| Candidate rooms | `--outline` first; body only if still needed, 40–80 lines |
| Chosen room | Enough to remodel safely |
| Re-explanation anchors | 2–4 notes, needed sections only |
| GLGMAN / image | Common block + adjacent prompt offsets |
| Meta notes | Outgoing link targets of the new autholog only; never their dblocks |

## Workflow

1. **Stop before writing** when room choice is ambiguous.
2. **Find 2–5 candidates** with `denotecli search`, `search-content`, `knowledge_search`, then `read --outline` only — obey the retrieval gate; drop living/long notes at outline.
3. **Choose one true room:** stale/thin/outdated, conceptually resonant, and not a complete autholog with another raw piece. Confirm → stop searching.
4. **Undo wrong placement first.** Restore a displaced topic before reusing another room.
5. **Remodel:** front matter, abstract, 히스토리 (agent line = model with version; follow nearby stamp pattern), outgoing meta/notes links, concise explanation (fact/association/judgment), exact raw block, optional follow-up raw, and old-room seed.
6. **Outgoing links only.** Same magnet rule as Contract: point `관련메타` / `관련노트` at useful magnets; move a displaced seed when needed. No dblock refresh/eval; no unverified LLM citations or claims.
7. **Handle the image.** Offset-read common block + nearest prompt; generate via skill `glg-image` (**lite@1K first**, then flash@1K, optional grok). Save `~/screenshot/YYYYMMDDTHHMMSS--slug__brand_<geminilite|geminiflash|grok>.jpg`. Keep complete prompt under `:PROMPT:`; or record explicit text-first deferral without claiming completion.
8. **Rename through Emacs:** `agent-denote-set-front-matter ... :rename t`; never raw `mv`.
9. **Verify (focused):** `denotecli read ID --outline`, raw exact match, actual pixels vs prompt, image path exists, filename budget, focused diff of touched files only.
10. **Report context spent.** After the mend closes, give a short spend note for this pass only: roughly what was read (raw / outlines / chosen room / anchors / image SSOT), what was written, and approximate bulk (e.g. candidate full-body avoided). No whole-session dump — just enough that the next reader sees where force went.

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
