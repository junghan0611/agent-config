---
name: autholog-mend
description: "ROSSE/autholog 원석 수선 — 링크드인·페이스북·텔레그램 날것을 ~/org/notes의 기존 빈방/outdated 방에 원문 1개+해설본 1개로 승격. 원문은 [!danger] quote로 보존, 관련 meta 자석까지 갱신, botlog와 역할 분리. Triggers: 어쏠로그, autholog, 날것, 원석, 빈방, 인테리어, ROSSE, 링크드인 글 담아, 가든으로 회수, 수선."
---

# autholog-mend — raw writing intake into notes

Use when GLG throws raw public text and wants it recovered as an **autholog** note.
This is a specialized lane of `/mend`: not generic formatting, but **raw → notes room → meta graph**.

## Contract

- **Raw piece 1 = notes autholog 1.** Do not merely append it under a related note.
- **Prefer an existing room.** Search `~/org/notes` for stale/thin/hold/temp/outdated rooms; reuse by preserving Denote ID.
- **Raw voice is sacred.** Preserve GLG's original text inside:
  ```org
  #+begin_quote
  [!danger]
  ...raw text...
  #+end_quote
  ```
- **Add an explanation layer.** Explain time/place/concepts, possible misreadings, related botlog, and why this raw piece belongs here.
- **Update meta magnets.** If the raw text introduces terms, repair/create links to `meta/` notes and add English tags/keywords when useful.
- **Separate rails.** `notes/` = GLG raw + recovered explanation. `botlog/` = agents' research/exposition. Link botlog; do not merge roles.
- **Respect consolidation direction.** If GLG intentionally folds a book-only note into a person/hub note and leaves the old ID as a future room, do not auto-restore it as a loss. Preserve the decision in history and keep the empty room useful for later raw material.

## Workflow

1. **Stop before writing.** If a raw piece arrives, first discuss strategy if GLG asks or if the room is ambiguous.
2. **Find candidate rooms.** Use `denotecli search`, `search-content`, `knowledge_search`; inspect 2–5 candidates with `read --outline`.
3. **Choose one room.** Criteria: stale/thin/outdated, conceptually resonant, not already a complete autholog with a different raw piece.
4. **Undo wrong placement first.** If you appended the raw text to a related note, remove that addition before continuing.
5. **Remodel the note.** Set title/tags/description/abstract, add `히스토리`, `관련메타`, `관련노트`, explanatory sections, raw `[!danger]` block, optional follow-up comment `[!danger]` block, and a short visible `옛 방의 씨앗` section when reusing a room. Do not mark the old-room seed `:noexport:` by default; use `:noexport:` only for private, noisy, or explicitly hidden material.
6. **Repair meta notes.** Add missing concept anchors and English tags, e.g. `재주 → talent/skill/ability`, `재수 → luck/fortune/chance/fate`.
7. **Rename via Emacs front matter.** Use `agent-denote-set-front-matter ... :rename t`; never raw `mv`.
8. **Verify.** `denotecli read ID --outline`, `git status --short`, and a focused diff.

## Standard sections

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
* <core axis 1>
* <core axis 2>
* <misreading / writing ethic / garden role>
* 원문 보존 — <surface> 날것
#+begin_quote
[!danger]
...
#+end_quote
* 후속 댓글 보존 — ...
#+begin_quote
[!danger]
...
#+end_quote
* 옛 방의 씨앗
```

## Example anchor

2026-06-25 pattern:
- Reused `20240730T091506` thin “철새/가야 할 길” room.
- Remodeled it into `@힣: 제주 재주 재수 — 정보과학회에서 전문가의 막차를 떠나보내며`.
- Preserved raw LinkedIn text and follow-up comment as `[!danger]` blocks.
- Updated `20250424T225036` with `재수/운/행운/우연` + `luck/fortune/chance`.
- Updated `20240414T224508` with `재주/능력` + `skill/ability`.
- Linked `20260222T035900` as botlog counterpart instead of merging it.
