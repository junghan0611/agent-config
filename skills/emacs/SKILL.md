---
name: emacs
description: "Emacs daemon — org manipulation, denote notes, citar bibliography, org-agenda, arbitrary elisp. Two sockets: server (agent work), user (show file to user). Core: agent-denote-add-history(ID,CONTENT), agent-denote-add-heading(ID,TITLE,&rest), agent-denote-add-link(ID,TARGET-ID,DESC). DESC is required — omitting causes hang."
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
| `agent-denote-add-heading` | ID, TITLE, ?TAG, BODY | `ec '(agent-denote-add-heading "ID" "Title" "LLMLOG" "body")'` |
| `agent-denote-add-link` | ID, TARGET-ID, DESC | `ec '(agent-denote-add-link "ID1" "ID2" "desc")'` ⚠️ DESC required — hang if omitted |
| `agent-denote-search` | QUERY, ?TYPE(title/tag/fulltext) | `ec '(agent-denote-search "term" (quote tag))'` |
| `agent-denote-keywords` | — | `ec '(agent-denote-keywords)'` → all tags list |
| `agent-denote-rename-by-front-matter` | FILE | `ec '(agent-denote-rename-by-front-matter "/path")'` |
| `agent-denote-rename-bulk` | DIRECTORY | `ec '(agent-denote-rename-bulk "/path/")'` |
| `agent-org-read-file` | FILE | `ec '(agent-org-read-file "/path")'` → content string |
| `agent-org-get-headings` | FILE, ?MAX-LEVEL | `ec '(agent-org-get-headings "/path" 2)'` |
| `agent-org-get-properties` | FILE | `ec '(agent-org-get-properties "/path")'` → alist |
| `agent-org-dblock-update` | FILE | `ec '(agent-org-dblock-update "/path")'` — ~/org/ all |
| `agent-org-agenda-day` | ?DATE | `ec '(agent-org-agenda-day "-1")'` — nil=today |
| `agent-org-agenda-week` | ?DATE | `ec '(agent-org-agenda-week)'` |
| `agent-org-agenda-tags` | MATCH | `ec '(agent-org-agenda-tags "commit")'` |
| `agent-citar-lookup` | QUERY, ?MAX | `ec '(agent-citar-lookup "karpathy" 5)'` |
| `agent-server-status` | — | `ec '(agent-server-status)'` → version, uptime |
| `agent-being-data` | ?AS-JSON | `ec '(agent-being-data)'` → notes/journal/garden counts |

add-heading: 3rd arg is TAG if UPPERCASE (e.g. "LLMLOG"), BODY otherwise. "LLMLOG:ARCHIVE" for multiple tags.

```bash
# insert after a specific heading
ec '(agent-denote-add-heading "ID" "New Section" "body" "After This Heading")'
```

## Arbitrary Elisp

ec accepts any elisp expression. Use for one-off org parsing or runtime extensions.

```bash
ec '(emacs-version)'
ec '(mapcar #'\''buffer-name (buffer-list))'
```

## Notes (read if needed)

### Paths
- Read: ~/org/, ~/repos/gh/, ~/repos/work/, ~/repos/3rd/
- Write: ~/org/botlog/, ~/repos/gh/self-tracking-data/
- Dblock update: ~/org/ (all org files)
- Denote append (add-*): ~/org/ (all denote files, append-only)

### Daemon management
- thinkpad: `cd ~/repos/gh/doomemacs-config && ./run.sh agent start|stop|restart`
- oracle: `~/openclaw/emacs-agent.sh start|stop|restart`

### Agenda
DATE format: nil=today, "-1"=yesterday, "+3"=3days, "2026-03-01"=specific date.
Returns plain text: `"Monday 1 April 2026\n  Agent: 9:20...... commit :pi:\n  Human: 13:40...... 작업 시작"`
