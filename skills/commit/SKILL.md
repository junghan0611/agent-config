---
name: commit
description: "Read this skill before making git commits"
---

Create a git commit for the current changes using a concise Conventional Commits-style subject.

## Format

`<type>(<scope>): <summary>`

- `type` REQUIRED. Use `feat` for new features, `fix` for bug fixes. Other common types: `docs`, `refactor`, `chore`, `test`, `perf`.
- `scope` OPTIONAL. Short noun in parentheses for the affected area (e.g., `api`, `parser`, `ui`).
- `summary` REQUIRED. Short, imperative, <= 72 chars, no trailing period.

## Notes

- Body is OPTIONAL. If needed, add a blank line after the subject and write short paragraphs.
- Do NOT include breaking-change markers or footers.
- Do NOT add sign-offs (no `Signed-off-by`).
- Do NOT add AI attribution (no `Generated with Claude`, `Co-Authored-By: Claude`, etc.). Keep the log clean.
- Commit only by default. Push only when GLG explicitly requests `push` or `commit + push` in the
  current session. A commit request alone never implies push; commits may be batched before one
  push so the agenda timeline stays useful.
- If it is unclear whether a file should be included, ask the user which files to commit.
- Treat any caller-provided arguments as additional commit guidance. Common patterns:
  - Freeform instructions should influence scope, summary, and body.
  - File paths or globs should limit which files to commit. If files are specified, only stage/commit those unless the user explicitly asks otherwise.
  - If arguments combine files and instructions, honor both.

## Steps

1. Infer from the prompt if the user provided specific file paths/globs and/or additional instructions.
2. Review `git status` and `git diff` to understand the current changes (limit to argument-specified files if provided).
3. (Optional) Run `git log -n 50 --pretty=format:%s` to see commonly used scopes.
4. If there are ambiguous extra files, ask the user for clarification before committing.
5. Stage only the intended files (all changes if no files specified).
6. Run `git commit -m "<subject>"` (and `-m "<body>"` if needed).
7. If GLG explicitly requested push in the current session:
   - verify the current branch, upstream and worktree state;
   - use an ordinary push only — never force, bypass hooks or set an unsafe override;
   - after push succeeds, stamp the agenda as described below.

## Post-push — agenda stamp (required)

The commit is the agent's job; **GLG decides whether and when to push**. An explicit push request
authorizes the agent to execute it. Never infer push from a commit request alone. Once a requested
push succeeds, stamp it so the agenda link resolves. Do not stamp local-only commits — the link may
break.

```bash
# 1. Collect commit info
REMOTE=$(git remote get-url origin)
REPO_URL=$(echo "$REMOTE" | sed -E 's|git@github(-[a-z]+)?\.com:|https://github.com/|;s|\.git$||')
REPO_NAME=$(basename "$REMOTE" .git)
REPO_TAG=$(echo "$REPO_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[-.]//g')  # lowercase org tag
SHA=$(git rev-parse --short HEAD)
MSG=$(git log -1 --pretty=%s)

# 2. Agenda stamp (with commit link)
SCRIPT="$HOME/.pi/agent/skills/pi-skills/agenda/scripts/agenda-stamp.sh"
[ -x "$SCRIPT" ] || SCRIPT="$HOME/.claude/skills/agenda/scripts/agenda-stamp.sh"  # per-harness fallback
"$SCRIPT" \
  "${REPO_NAME}: ${MSG} [[${REPO_URL}/commit/${SHA}][${SHA}]]" \
  "pi:commit:${REPO_TAG}"
```

Optional — Google Chat notification (one CLI call, no token cost):

```bash
source ~/.env.local && gog chat messages send "$GOG_CHAT_SPACE_ID" \
  --account "$GOG_CHAT_ACCOUNT" \
  --text "🔨 *${REPO_NAME}* commit: ${MSG}
→ ${REPO_URL}/commit/${SHA}"
```

Notes:
- Multiple sequential commits → stamp only the last one.
- Env vars (`GOG_CHAT_*`) live in `~/.env.local` (see PRIVATE.md).
- If `agenda-stamp.sh` fails after reasonable retries, STOP and report the exact command + error. Never fall back to `Write`/`Edit`/heredoc on the same target.
- For **release tags** (not commits), the stamp uses `pi:release:` — see the `tag-release` skill.
