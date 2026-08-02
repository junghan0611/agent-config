---
name: botlog
description: "봇 노트 — 공개 botlog(기본=리포 담당자 문서)와 비공개 llmlog(임시 작업기, 최소 생성). Use when user says 'botlog', 'llmlog', '담당자 문서', '노트 만들어', '기록해', '지침 남겨', '전달해', '작업기록', 'write a note', or wants agent work saved as a denote note."
user_invocable: true
---

# botlog / llmlog — Agent Notes

## Identity

Two modes, different jobs. Do not treat botlog as an infinite dump of agent essays.

| | **botlog** (`~/org/botlog/`) | **llmlog** (`~/org/llmlog/`) |
|---|---|---|
| Public | Digital garden | Private |
| Default role | **담당자 문서** — one living public face per repo/workstream | Temporary work scratch / rare handoff body |
| Tag | `:botlog:` required | `:llmlog:` required |
| Growth | Prefer **update existing** over create | Prefer **do not create** |
| `#+description:` / `#+hugo_lastmod:` | required (hugo SEO) | omit |
| `[!abstract] 이 노트에 대하여` | required | required if file exists |

Default mode = **botlog as 담당자 문서**.  
llmlog only when GLG explicitly wants a private work body, or a short-lived scratch that cannot live in repo `NEXT.md` / llmlog heading append.

## botlog center — 담당자 문서

A **담당자 문서** is the public steward note for a repo (or stable workstream). Title usually carries `§<repo>` (or the established project sigil). It answers: what this house owns, what it refuses, where code/docs live, and the current judgment — not a session diary.

Reference shapes (read outline / abstract first; do not full-dump):

- `20260223T040400` — `§memex-kb` 담당자 문서 (current strong pattern)
- `20260220T201100` — `§garden2wikidocs` 프로젝트 공개 시간축·담당 허브

### What belongs in the 담당자 문서

- Scope and non-scope (맡은 것 / 맡지 않는 것)
- SSOT paths (`~/repos/gh/<repo>/`, run.sh, skills, AGENTS)
- Current architecture or operating picture in durable language
- Boundaries, retirements, and open confirms that still matter next month
- Outgoing links: 관련메타, 큰그림/실행 계약, **독립 사례 문서는 이웃으로** (do not absorb long journeys)
- Dated **현재 보고** headings when the steward posture actually changed
- 히스토리 lines with **model-with-version** on agent passes (same authorship legibility as autholog-mend)

### What does not belong

- Blow-by-blow session logs (use repo `NEXT.md`, agenda stamp, or a short llmlog heading if unavoidable)
- One-off research essays that are not the repo’s public face (separate botlog only when GLG asks, or when the piece must stay public and is not a steward update)
- Absorbing every case study into the steward note — keep case docs as neighbors
- Creating a second 담당자 문서 for the same repo

### Create vs update (botlog)

```bash
# Search existing steward / project botlog FIRST
denotecli search "§<repo>" --dirs ~/org/botlog --max 8
denotecli search "<repo-keyword>" --dirs ~/org/botlog --max 8
```

| Found | Action |
|-------|--------|
| Existing `§repo` 담당자 문서 | **Update** — 히스토리 + 현재 보고 heading + links. Do not create another. |
| Empty botlog room reserved for this repo | **Reopen that room** (title/tags/body). Prefer empty rooms over new IDs. |
| Only unrelated botlogs | Create one 담당자 문서 (or ask GLG which empty room). |
| GLG names an empty room ID | Use that ID. Example pattern: recovered empty botlog rooms after autholog move. |

**Do not grow botlog count by default.** One steward face per repo is enough; depth goes into updates and neighbor case docs.

### 담당자 문서 — standard shape

```org
#+title:      §<repo>: <one-line steward posture>
#+date:       [YYYY-MM-DD Day HH:MM]
#+filetags:   :botlog:<repotag>:...:
#+hugo_lastmod: [YYYY-MM-DD Day HH:MM]
#+identifier: YYYYMMDDTHHMMSS
#+export_file_name: YYYYMMDDTHHMMSS.md
#+description: <1-2 sentence SEO card — not the same sentences as abstract>
#+reference:  <optional bib keys>

#+begin_quote
[!abstract] 이 노트에 대하여

이 노트는 <repo> 담당자가 지금 무엇을 맡고 무엇을 맡지 않는지 기록하는 자리다. ...
#+end_quote

* 히스토리
- [YYYY-MM-DD ...] @mitsein/<model-with-version> — ...

* 관련메타
- [[denote:...][† ...]]

* 관련노트
** 담당자의 큰그림과 실행 계약
- =~/repos/gh/<repo>/= — SSOT
- [[denote:...][...]] — ...

** 독립된 사례 문서 — 합치지 않고 이웃으로 둔다
- [[denote:...][...]] — why it stays separate

* [YYYY-MM-DD] 담당자의 현재 보고 — <title> :LLMLOG:

durable posture, boundaries, judgment...

** 지금 맡은 것
** 현재 경계와 남은 확인
** 담당자의 판단
```

Not every section is mandatory on day one; the steward posture and “update not multiply” rule are.

When reopening an empty room, keep identifier; rewrite title/tags/abstract/body; leave a 히스토리 line for the prior vacancy/recovery if useful; optional `* 옛 방의 씨앗` / ARCHIVE only when a displaced prior use must stay named.

## llmlog — minimal temporary work body

llmlog is **not** the default continuity surface anymore.

### Prefer instead

1. **Repo `NEXT.md` / `NEXT--<branch>.md`** — disposable handoff, concrete next step (see next-handoff skill)
2. **Append heading** on an existing llmlog or botlog 담당자 문서 when the workstream already has a home
3. **Agenda stamp** for “what was done”
4. **autholog-mend** when the material is GLG raw public voice — not botlog

### Create llmlog only when

- GLG explicitly says `llmlog` / private work note
- A multi-hop entwurf needs a private append-only body and no NEXT/existing note fits
- The content must not be garden-public and cannot live in the repo

### llmlog anti-patterns

- New llmlog per session “just in case”
- Duplicating NEXT into a long llmlog that later needs deletion
- Using llmlog as a second 담당자 문서

If an llmlog is created, keep it short, append-only by heading, and point back to repo NEXT / 담당자 botlog. Deletion debt is real — do not make files you expect someone to clean up.

## Shared mechanics

### Headers

| Header | botlog | llmlog |
|---|---|---|
| `#+title` | ✅ often `§repo: ...` | ✅ |
| `#+date` | ✅ | ✅ |
| `#+filetags` | ✅ `:botlog:...:` | ✅ `:llmlog:...:` |
| `#+identifier` | ✅ | ✅ |
| `#+export_file_name` | ✅ | ✅ |
| `#+description` | ✅ required | — |
| `#+hugo_lastmod` | ✅ required | — |
| `#+reference` | optional | optional |

### Abstract

Right after headers, before `* 히스토리`:

```org
#+begin_quote
[!abstract] 이 노트에 대하여

...
#+end_quote
```

botlog: `#+description:` and abstract must be **different sentences** (card meta vs body lead-in).

### Authorship in 히스토리

- GLG: `@junghan`
- Agent: **model with version** visible (e.g. nearby pattern `@mitsein/sonnet5`, `@mitsein/grok-4.5`). Harness-only (`pi` alone) is not enough.
- Read live session model (`PI_MODEL` / `PI_AGENT_ID`); never invent.

### Body conventions

- First heading: `* 히스토리` (reverse chronological)
- Content headings that are agent synthesis: `:LLMLOG:` tag on the heading is fine even inside botlog (garden convention)
- Org syntax only (no markdown tables)
- Tags: `[a-z0-9]` only, alphabetically sorted, prefer established magnets (tag-mend if new/suspicious)

### Create file (only after search / empty-room decision)

```bash
TS=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
# botlog: ~/org/botlog/${TS}--§repo-slug__botlog_tag1_tag2.org
# llmlog: ~/org/llmlog/${TS}--slug__llmlog_tag1_tag2.org
```

Prefer Emacs/denote front-matter rename when reopening or retitling an existing ID. Do not raw-`mv` Denote files casually.

### Update existing (emacs skill)

```bash
ec '(agent-denote-add-history "ID" "@mitsein/<model> — what changed")'
ec '(agent-denote-add-heading "ID" "[YYYY-MM-DD] 담당자의 현재 보고 — ..." "LLMLOG" "body")'
ec '(agent-denote-add-link "ID" "TARGET-ID" "link description")'
```

### Stamp agenda

```bash
{skillsDir}/agenda/scripts/agenda-stamp.sh "botlog: §repo steward update — ..." "botlog:tag"
```

If the script fails after reasonable retries, **STOP and report** — do not substitute Write/Edit/heredoc on `~/org/botlog/agenda/`. See `agenda` skill → Single Writer Rule.

### dblock

Same garden rule: no dblock refresh/eval so magnets “catch up” while writing. GLG export scripts refresh. Regexp **definition** fixes only when broken.

## Decision cheat-sheet

| GLG intent | Surface |
|------------|---------|
| Repo steward public face / progress posture | **botlog 담당자 문서** (update or one empty room) |
| Long case journey under a repo | Neighbor botlog/case note — link from 담당자, don’t merge |
| Next session handoff | Repo **NEXT.md** |
| Private scratch GLG asked for | **llmlog** (minimal) or append existing |
| GLG raw public voice | **autholog-mend**, not botlog |
| Tag/filename magnet hygiene | **tag-mend** |

## New repo steward (e.g. zotero-config)

When GLG asks a repo 담당자 to write “one botlog”:

1. Search `botlog` for `§<repo>` / repo keywords — update if a steward face already exists
2. Prefer a **빈 botlog 방** GLG designates (rooms emptied after autholog recovery, etc.). Do not mint a new identifier when an empty room is offered
3. Write **one** 담당자 문서: scope, non-scope, SSOT path, current judgment, neighbor links
4. Later progress = 히스토리 + 현재 보고 update — not a new botlog each time GLG says “갱신”
5. Session ops / handoff stay in that repo’s `NEXT.md`, not a fresh llmlog
