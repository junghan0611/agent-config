---
name: agenda
description: "에이전트 어젠다 — reverse datetree에 타임스탬프 엔트리 추가. 에이전트 활동을 org-agenda에서 볼 수 있게 기록. Use when starting work, completing a task, or any notable activity to stamp. '도장', 'stamp', '기록', 'agenda에 찍어'."
user_invocable: true
---

# agenda — Agent Activity Stamps

Stamp agent activity to `~/org/botlog/agenda/` reverse datetree. Visible in org-agenda alongside human activity.

## First Distinction: Activity Timeline vs Task Hub

Do not confuse these two surfaces.

| Surface | Purpose | Typical path | How to read |
|--------|---------|--------------|-------------|
| **Activity timeline** | What was done | `~/org/botlog/agenda/*__agenda_<device>.org` | `agent-org-agenda-day/week` or top of file |
| **Task hub** | What should be done | `~/sync/org/botlog/agenda/20260325T171244--entwurf__agenda.org` | `agent-org-agenda-todos` first, raw grep fallback if needed |

### Rule

- Use **activity timeline** for stamps only.
- Use **Entwurf agenda task hub** for `TODO / NEXT / DONE / DONT`.
- Do **not** use activity stamps as task management.

## Usage

```bash
{baseDir}/scripts/agenda-stamp.sh "title" "tag1:tag2" "" --body "body text
multiline ok"
```

| Param | Pos | Required | Description |
|-------|-----|----------|-------------|
| title | 1 | ✅ | What was done (one line) |
| tags | 2 | optional | `tag1:tag2` colon-separated. `[a-z0-9]` only |
| device | 3 | optional | `""` = auto from `~/.current-device` |
| --body | flag | optional | Multiline text below timestamp |
| --body-file | flag | optional | Read body from file |

## When to Stamp

| Moment | Title pattern | Tags |
|--------|--------------|------|
| Session start | "session start" | `pi` |
| Task complete | "what was done" | `pi:topic` |
| After commit | "repo: commit msg [[URL][SHA]]" | `pi:commit:reponame` |
| Session end | "session end" | `pi` |

## Output Format

```org
**** agent-config: feat: telegram skill [[url][abc1234]] :pi:commit:agentconfig:
<2026-04-01 Wed 09:47>
from: pi@thinkpad
- tdlib based chat read/write
- 4 bots accessible
```

## Key Rules

- **No TODO/DONE** — visibility, not task management
- **Body required** — empty stamps are useless (who did what?)
- **`from:` auto-injected** — `AGENT_ID@device` (default: `pi@~/.current-device`)
- **Reverse datetree** — newest on top, agents read/write front only
- **Tags**: `[a-z0-9]` only. No hyphens, no underscores

## TODO for Cross-Agent Requests

Use `TODO` keyword when requesting another agent's attention:

```bash
{baseDir}/scripts/agenda-stamp.sh "TODO: review sLLM benchmark" "review:homeagent"
```

Other agent sees it in org-agenda → processes → stamps `DONE`.

## Read Agenda Safely

### Preferred: unified agenda API via Emacs

```bash
ec() { emacsclient -s server --eval "$1"; }
ec '(agent-org-agenda-day)'          # today's integrated timeline
ec '(agent-org-agenda-week)'         # this week
ec '(agent-org-agenda-todos)'        # all Entwurf TODO/NEXT grouped by project
ec '(agent-org-agenda-todos "andenken")'
ec '(agent-org-agenda-todos "andenken" "A")'
```

Use this first when the goal is:
- know what is active today
- inspect Entwurf project TODOs
- avoid raw file reads and token waste

### Activity timeline file (device-local)

```bash
DEVICE=$(cat ~/.current-device)
AGENDA=$(find ~/org/botlog/agenda/ -name "*__agenda_${DEVICE}.org" | head -1)
head -30 "$AGENDA"   # reverse datetree: top = latest
```

### Entwurf task hub fallback

`agent-org-read-file` may reject `~/sync/org/...` due to path guards. Do **not** keep retrying the blocked Emacs read API.
Use the higher-level agenda API first, and if you still need the raw task-hub structure, use shell grep as a fallback:

```bash
FILE=~/sync/org/botlog/agenda/20260325T171244--entwurf__agenda.org

# headings / project map
rg '^(\*+|#+title:|#+date:|#+filetags:)' "$FILE" | head -120

# open task lines
rg '^(\*+ )?(TODO|NEXT|DONT) ' "$FILE" | head -120
```

This is a temporary interface workaround until a dedicated task-hub API exists.

## Notes

- Files auto-created per device in `~/org/botlog/agenda/`
- Agenda = shared bulletin board. Stamps = posts. Agents = residents.
- Don't stamp too often — meaningful activity units only
- For Entwurf operations, **start from `agent-org-agenda-day/week/todos` before any raw file read**.
- If Emacs raw file read is blocked for `~/sync/org/...`, that is an interface limitation, not a cue to keep poking the same API.
