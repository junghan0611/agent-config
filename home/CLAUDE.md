@AGENTS.md

## Skill `{baseDir}` Placeholder — Claude Code Resolution

pi runtime auto-injects "References are relative to <baseDir>" before each
SKILL.md body (`agent-session.ts:1160`), so the placeholder resolves
transparently there. Claude Code does not, so resolve it yourself when you
read any file under `~/.claude/skills/` or `~/.claude/commands/`:

- `~/.claude/skills/<name>/SKILL.md` → `{baseDir}` = `~/.claude/skills/<name>/`
- `~/.claude/commands/<name>.md` → commands have no scripts of their own;
  the script lives in the cognate skill. Example: `/recall` uses
  `~/.claude/skills/session-recap/scripts/`. When unsure, `ls ~/.claude/skills/`
  before invoking.

Do NOT edit the SKILL.md / command sources to remove `{baseDir}` — pi and
openclaw consume the same files via different surfaces, and the placeholder
must remain intact for them.

