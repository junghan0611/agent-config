---
name: botlog
description: "봇 노트 생성 — 에이전트가 리서치/분석/대화 결과를 org-mode denote 형식으로 기록. botlog(공개)과 llmlog(비공개 작업기록) 두 모드 지원. Use when user says 'botlog', 'llmlog', '노트 만들어', '기록해', '지침 남겨', '전달해', '작업기록', 'write a note', or wants agent work saved as a denote note."
user_invocable: true
---

# botlog / llmlog — Agent Notes

## Two Modes

| | **botlog** (`~/org/botlog/`) | **llmlog** (`~/org/llmlog/`) |
|---|---|---|
| Public | Digital garden | Private (agent work log) |
| Tag | `:botlog:` required | `:llmlog:` required |
| Use | Research/analysis results | Work instructions, delegation |

Default = botlog. Use llmlog when: "지침 남겨", "전달해", "llmlog", delegate-spawned agents.

## Before Creating — Search First!

```bash
{skillsDir}/denotecli/denotecli search "<keyword>" --dirs ~/org/botlog --max 5
```

| Found | Action |
|-------|--------|
| Related note exists | Add history + new heading to existing note (emacs skill) |
| Similar but different | Create new note + link to existing |
| Nothing found | Create new note |

## Create

### 1. Generate timestamp and filename

```bash
TS=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
# Filename: ${TS}--title-slug__botlog_tag1_tag2.org
```

### 2. Write file via bash heredoc

```bash
cat <<'EOF' > ~/org/botlog/${TS}--title__botlog_tag1_tag2.org
#+title:      Title Here
#+date:       [2026-04-01 Wed 12:00]
#+filetags:   :botlog:tag1:tag2:
#+identifier: 20260401T120000
#+export_file_name: 20260401T120000.md

* 히스토리
- [2026-04-01 Wed 12:00] 생성 — one-line description

* Main Heading :LLMLOG:

Content here.

** 관련 노트

- [[denote:JOURNALID][journal title]] — weekly journal
EOF
```

### 3. Update existing notes (emacs skill)

```bash
ec '(agent-denote-add-history "ID" "@pi — what was added")'
ec '(agent-denote-add-heading "ID" "[2026-04-01] New Topic" "LLMLOG" "body")'
ec '(agent-denote-add-link "ID" "TARGET-ID" "link description")'
```

### 4. Stamp agenda

```bash
{skillsDir}/agenda/scripts/agenda-stamp.sh "botlog: title summary" "botlog:tag"
```

If the script fails after reasonable retries, **STOP and report** — do not substitute `Write` / `Edit` / heredoc on `~/org/botlog/agenda/`. See `agenda` skill → Single Writer Rule.

## Format Rules

- Header: `#+title`, `#+date`, `#+filetags`, `#+identifier`, `#+export_file_name`
- First heading: `* 히스토리` (reverse-chronological entries)
- Content headings: `:LLMLOG:` tag required
- Last section: `** 관련 노트` with `[[denote:ID][title]]` links
- Org syntax only (no markdown tables). Use `#+begin_quote` for quotes
- Tags: `[a-z0-9]` only, alphabetically sorted, 3~7 tags
