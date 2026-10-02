---
name: botlog
description: "봇 노트 — 공개 botlog(기본=리포 담당자 문서)와 비공개 llmlog(임시 작업기, 최소 생성). Use when user says 'botlog', 'llmlog', '담당자 문서', '노트 만들어', '기록해', '지침 남겨', '전달해', '작업기록', 'write a note', or wants agent work saved as a denote note."
user_invocable: true
---

# botlog / llmlog — API

| Operation / signature | Command / example |
|---|---|
| Steward search | `denotecli search "§<repo>" --dirs ~/org/botlog --max 8` |
| Keyword search | `denotecli search "<repo-keyword>" --dirs ~/org/botlog --max 8` |
| `agent-denote-add-history(ID, "@mitsein/<model> — what changed")` | `ec '(agent-denote-add-history "ID" "@mitsein/<model> — what changed")'` |
| `agent-denote-add-heading(ID, TITLE, TAG, BODY)` | `ec '(agent-denote-add-heading "ID" "[YYYY-MM-DD] 담당자의 현재 보고 — ..." "LLMLOG" "body")'` |
| `agent-denote-add-link(ID, TARGET-ID, DESC)` | `ec '(agent-denote-add-link "ID" "TARGET-ID" "link description")'` |
| New ID (Creation gate below) | `TS=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')` |
| New filename | botlog: `~/org/botlog/${TS}--§repo-slug__botlog_tag1_tag2.org`; llmlog: `~/org/llmlog/${TS}--slug__llmlog_tag1_tag2.org` |
| Agenda stamp (`agenda` skill) | `{skillsDir}/agenda/scripts/agenda-stamp.sh "botlog: §repo steward update — ..." "botlog:tag"` |
| ⚠ Stamp failure after reasonable retries | **STOP & report**; never substitute Write/Edit/heredoc on `~/org/botlog/agenda/` (Single Writer Rule) |
| History author | GLG: `@junghan`; agent: `@mitsein/<model>` with **model-with-version** (e.g. `sonnet5`, `grok-4.5`) |
| Model source | Read live `PI_MODEL` / `PI_AGENT_ID`; **never invent**; harness-only `pi` is insufficient |

## Decision cheat-sheet

| GLG intent | Surface |
|---|---|
| Repo public face / progress posture | **botlog 담당자 문서** (default); Creation gate below |
| Long case journey | Neighbor botlog/case note; link from steward, do not merge |
| Next-session handoff | Repo **NEXT.md** / `NEXT--<branch>.md` (next-handoff skill) |
| What was done | Agenda stamp |
| Session diary / operational detail | Repo NEXT or short existing llmlog heading |
| Requested private scratch | **llmlog**; see llmlog creation |
| GLG raw public voice | **autholog-mend**, not botlog |
| Tag/filename magnet hygiene | **tag-mend** |

## Creation gate — search FIRST

Run both API searches before creating a note.
**Do not grow botlog count by default.** One steward per repo/stable workstream.

| Found | Action |
|---|---|
| Existing `§repo` steward | Update: 히스토리 + links; dated current report when posture changes |
| Empty room reserved for repo | Reopen; prefer empty rooms over new IDs |
| GLG names/offers an empty room ID | Use that ID, never mint another |
| Only unrelated botlogs | Create one steward or ask GLG which empty room |
| Public essay, not a steward update | Separate botlog only if GLG asks or the piece must stay public |

## Identity / publication

| | botlog (`~/org/botlog/`) | llmlog (`~/org/llmlog/`) |
|---|---|---|
| Role | Public garden steward | Private temporary work body or **고민 좌표**; both first-class |
| Recall | **Never. Published to a URL = already out in the world** (also meta · bib · notes) | Deletable / `deprecated/` — never published |
| Filetag | `:botlog:` required | `:llmlog:` required |
| `#+description:` / `#+hugo_lastmod:` | Required | Omit |
| Abstract | Required | Required if file exists |

**The folder is a consequence of publication, not of note type.**

## Steward shape

Read outline/abstract, then needed sections; references supply shape, not policy overrides.

| Part | Content / action |
|---|---|
| Strong reference | `denotecli read 20260223T040400 --outline` — §memex-kb |
| Alternate reference | `20260220T201100` — §garden2wikidocs public timeline/hub |
| Title | `§<repo>` or established project sigil |
| Scope | Ownership and non-scope |
| SSOT | `~/repos/gh/<repo>/`, run.sh, skills, AGENTS |
| Operating picture | Durable architecture, boundaries, retirements, open confirms that matter next month |
| Judgment | Current steward judgment |
| Outgoing links | Related meta; big-picture/execution contracts; cases follow Decision cheat-sheet |
| Day-one structure | Reference sections are optional; steward posture is not |
| Reopen | Keep identifier; rewrite title/tags/abstract/body |
| Retitle | Emacs/denote front-matter rename, **not raw `mv`** |
| Prior use | Optional vacancy/recovery 히스토리; `* 옛 방의 씨앗` / ARCHIVE only if displaced use must stay named |

## llmlog creation — not default continuity

| Rule / eligible case | Action / condition |
|---|---|
| Default | Prefer not to create: use/append existing NEXT/note, not per-session “just in case” files, NEXT duplicates, or second stewards |
| GLG request | Explicit llmlog / private work note |
| Cross-repo concern | Several repos/issues; no single repo NEXT/steward can hold it |
| Multi-hop entwurf | Private append-only body needed; no NEXT/existing note fits |
| Private content | Must stay private and cannot live in repo; no existing note fits |
| Body | Short, append-only by heading; link back to repo NEXT/steward; avoid deletion debt |

Issue text rots as code moves; the 고민 does not.
The concern note prevents each repo's steward from re-interpreting it their own way,
and lets a new session handed only an issue find the concern above it.
An issue comment would trap that cross-repo concern inside one issue.

### Issue linkage — note holds concern; children hold work (1:N, cross-repo)

| Rule | Action |
|---|---|
| Child issues | In note: `[[https://github.com/<owner>/<repo>/issues/N][<repo>#N]]` + one line naming each issue's role |
| Back-reference | Issue body: ``llmlog `<denote-id>` — <title>``; ID + title, **not URL** (private) |
| Status | GitHub is SSOT; never copy open/closed into note |
| Format | Plain links (25 notes already do), **no new org keyword/property**. `:ISSUE:` tried once in `20260513T133346`, now `deprecated/`, not adopted |
| Lifetime | All children closed: **necessary, not sufficient**; new issues may attach. Tool may report open-child count; **human decides retirement**; eligibility follows Identity / publication |
| Board | **sorge** owns cross-repo visibility to other stewards |
| Reference | `20260408T120252`: `담당자: <repo> · <date> · 근거는 [[…][<repo>#N]]` |

## Shared mechanics — Emacs skill for writes

| Contract | Rule |
|---|---|
| Headers | Both required: `#+title`, `#+date`, `#+filetags`, `#+identifier`, `#+export_file_name` (`ID.md`); optional `#+reference` bib keys. Differences: Identity / publication |
| Abstract shape | After headers, before `* 히스토리`: `#+begin_quote` → `[!abstract] 이 노트에 대하여` → blank line + body → `#+end_quote` |
| SEO vs lead-in | Botlog description: 1–2 SEO sentences; abstract: body lead-in with **different sentences** |
| Syntax | Org only, no Markdown tables |
| History | First heading `* 히스토리`; reverse chronological |
| Synthesis | Agent headings may use `:LLMLOG:` even in botlog |
| Tags | `[a-z0-9]` only, alphabetically sorted; established magnets first; new/suspicious → Decision cheat-sheet |
| dblock | GLG export scripts refresh/eval; not writing-time magnet catch-up. Fix regexp **definitions** only when broken |
