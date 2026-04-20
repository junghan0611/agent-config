---
name: emacs
description: "Emacs daemon — org manipulation, denote notes, citar bibliography, org-agenda, arbitrary elisp. Two sockets: server (agent work), user (show file to user). Core: agent-denote-add-history(ID,CONTENT), agent-denote-add-heading(ID,TITLE,BODY) or (ID,TITLE,TAG,BODY) — no tag? body as 3rd arg. Never pass nil. agent-denote-add-link(ID,TARGET-ID,DESC). DESC required — hang if omitted."
---

# Emacs Agent Server

## Connect

```bash
ec() { emacsclient -s server --eval "$1"; }  # agent work
eu() { emacsclient -s user --no-wait "$@"; }  # show file to user
# Docker: ec() { emacsclient -s /run/emacs/server --eval "$1"; }
```

Define ec/eu in EVERY bash call (subshell resets).

## API

| Function | Args | Example |
|----------|------|---------|
| `agent-denote-add-history` | ID, CONTENT | `ec '(agent-denote-add-history "ID" "@pi — msg")'` |
| `agent-denote-add-heading` | ID, TITLE, BODY | `ec '(agent-denote-add-heading "ID" "Title" "body")'` |
| | ID, TITLE, TAG, BODY | `ec '(agent-denote-add-heading "ID" "Title" "LLMLOG" "body")'` |
| `agent-denote-add-link` | ID, TARGET-ID, DESC | `ec '(agent-denote-add-link "ID1" "ID2" "desc")'` ⚠️ DESC required — hang if omitted |
| `agent-denote-set-front-matter` | ID, &rest PLIST | `ec '(agent-denote-set-front-matter "ID" :title "새 제목" :filetags (quote ("meta" "reasoning")))'` |
| `agent-denote-search` | QUERY, ?TYPE(title/tag/fulltext) | `ec '(agent-denote-search "term" (quote tag))'` |
| `agent-denote-keywords` | — | `ec '(agent-denote-keywords)'` → all tags list |
| `agent-denote-rename-by-front-matter` | FILE | `ec '(agent-denote-rename-by-front-matter "/path")'` |
| `agent-denote-rename-bulk` | DIRECTORY | `ec '(agent-denote-rename-bulk "/path/")'` |
| `agent-org-read-file` | FILE | `ec '(agent-org-read-file "/path")'` → content string (guarded paths only) |
| `agent-org-get-headings` | FILE, ?MAX-LEVEL | `ec '(agent-org-get-headings "/path" 2)'` |
| `agent-org-get-properties` | FILE | `ec '(agent-org-get-properties "/path")'` → alist |
| `agent-org-dblock-update` | FILE | `ec '(agent-org-dblock-update "/path")'` — ~/org/ all |
| `agent-org-agenda-day` | ?DATE | `ec '(agent-org-agenda-day "-1")'` — nil=today |
| `agent-org-agenda-week` | ?DATE | `ec '(agent-org-agenda-week)'` |
| `agent-org-agenda-tags` | MATCH | `ec '(agent-org-agenda-tags "commit")'` |
| `agent-org-agenda-todos` | ?PROJECT, ?PRIORITY | `ec '(agent-org-agenda-todos "andenken")'` |
| `agent-citar-lookup` | QUERY, ?MAX | `ec '(agent-citar-lookup "karpathy" 5)'` |
| `agent-server-status` | — | `ec '(agent-server-status)'` → version, uptime |
| `agent-being-data` | ?AS-JSON | `ec '(agent-being-data)'` → notes/journal/garden counts |

agent-org-agenda-todos: PROJECT is level-2 heading name in Entwurf agenda (e.g. "andenken", "blog", "agent-config"). PRIORITY is "A"/"B"/"C". Both optional — nil returns all TODOs grouped by project.

For agenda/task-hub work, prefer `agent-org-agenda-day/week/todos` over `agent-org-read-file`.
If the target file lives under `~/sync/org/...`, `agent-org-read-file` may be blocked by path guards even when the file is conceptually part of the workflow. In that case:
1. use `agent-org-agenda-todos` first
2. use `agent-org-agenda-day/week` for schedule context
3. only if raw structure is still needed, fall back to shell tools (`rg`) instead of repeatedly calling blocked Emacs read APIs

add-heading: 3rd arg is TAG if UPPERCASE (e.g. "LLMLOG"), BODY otherwise. ⚠️ Never pass `nil` — body silently drops. No tag? Put body as 3rd arg directly.

set-front-matter: touches only front matter / pre-heading region. Supported keys now: `:title`, `:filetags`, `:description`, `:reference`, `:date`, `:hugo_lastmod`. Missing keys are created, existing keys replaced. Unknown front matter lines are preserved.

```bash
# no tag — body as 3rd arg
ec '(agent-denote-add-heading "ID" "New Section" "body text here")'
# with tag — TAG then body
ec '(agent-denote-add-heading "ID" "New Section" "LLMLOG" "body text here")'
# insert after a specific heading
ec '(agent-denote-add-heading "ID" "New Section" "body" "After This Heading")'

# set front matter
ec '(agent-denote-set-front-matter "ID" :title "새 제목" :description "요약")'
ec '(agent-denote-set-front-matter "ID" :filetags (quote ("meta" "reasoning")) :reference "key1;key2")'
```

## Arbitrary Elisp

ec accepts any elisp expression. Use for one-off org parsing or runtime extensions.

```bash
ec '(emacs-version)'
ec '(mapcar #'\''buffer-name (buffer-list))'
```

## Notes (read if needed)

### Paths
- Read: `~/org/`, `~/repos/gh/`, `~/repos/work/`, `~/repos/3rd/` (guarded allowlist)
- Write: `~/org/botlog/`, `~/repos/gh/self-tracking-data/`
- Dblock update: `~/org/` (all org files)
- Denote append (add-*): `~/org/` (all denote files, append-only)
- `~/sync/org/...` may be part of the real workflow but still blocked for `agent-org-read-file`; treat that as a known interface boundary

### Daemon management
- thinkpad: `cd ~/repos/gh/doomemacs-config && ./run.sh agent start|stop|restart`
- oracle: `~/openclaw/emacs-agent.sh start|stop|restart`

### Agenda
DATE format: nil=today, "-1"=yesterday, "+3"=3days, "2026-03-01"=specific date.
Returns plain text: `"Monday 1 April 2026\n  Agent: 9:20...... commit :pi:\n  Human: 13:40...... 작업 시작"`

Recommended order for Entwurf/COS operation:
1. `agent-org-agenda-day` — today's integrated working surface
2. `agent-org-agenda-todos` — Entwurf task hub view by project/priority
3. `agent-org-agenda-week` — weekly framing
4. `agent-org-read-file` — only for allowed raw org files when truly needed
