---
name: agenda
description: "에이전트 어젠다 — reverse datetree에 타임스탬프 엔트리 추가. 에이전트 활동을 org-agenda에서 볼 수 있게 기록. Use when starting work, completing a task, or any notable activity to stamp. '도장', 'stamp', '기록', 'agenda에 찍어'."
user_invocable: true
---

# agenda — Agent Activity Stamps

Stamp agent activity to `~/org/botlog/agenda/` reverse datetree. Visible in org-agenda alongside human activity.

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

## Read Recent Activity

```bash
DEVICE=$(cat ~/.current-device)
AGENDA=$(find ~/org/botlog/agenda/ -name "*__agenda_${DEVICE}.org" | head -1)
head -30 "$AGENDA"   # reverse datetree: top = latest
```

## Notes

- Files auto-created per device in `~/org/botlog/agenda/`
- Agenda = shared bulletin board. Stamps = posts. Agents = residents.
- Don't stamp too often — meaningful activity units only
