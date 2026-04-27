---
description: 터진 세션 캡처 — 사용자가 던진 텍스트로 .agent-reports/에 incident 노트 + 세션 발췌 저장
argument-hint: "<터진 상황 한 줄>"
---
You are NOT the crashed agent. The crashed session is dead — you are working from outside, on whatever the user pastes.

User-supplied context: $ARGUMENTS

The user will also paste:
- A transcript snippet from the crashed session
- A short Korean description of what blew up
- Optionally a session id, cwd hint, or backend/model name

## Your job

Capture the incident into the **target repo's** `.agent-reports/` so the next working agent can pick it up. Do not try to fix anything.

## Steps

1. **Locate the target repo.** From the user's text or the cwd they mention. If unclear, ask.

2. **Detect cwd, backend, model, time.** Pull what you can from the pasted transcript. Best-effort.

3. **Find the original session JSONL.** Use the right convention:

   | Backend | Path | cwd encoding |
   |---------|------|---------------|
   | pi | `~/.pi/agent/sessions/<encoded>/<ISO>_<id>.jsonl` | leading `/` dropped, `/\\:` → `-`, wrapped in `--…--`. Example: `/home/junghan/repos/gh/agent-config` → `--home-junghan-repos-gh-agent-config--` |
   | Claude Code | `~/.claude/projects/<encoded>/<uuid>.jsonl` | leading `/` becomes `-`, `/` → `-`. Example: `-home-junghan-repos-gh-agent-config` |
   | Codex | `~/.codex/sessions/YYYY/MM/*.jsonl` | no cwd encoding — search by date |

   If session id given → grep filename. Otherwise → list the encoded dir, pick the JSONL whose mtime sits in the user's time window. If multiple plausible candidates, list them and ask.

4. **Pull a small extract.** Roughly the error and ±20 surrounding turns. Do not copy the entire file unless the user asks.

5. **Write the incident note.**
   - Path: `<repo>/.agent-reports/incidents/<YYYYMMDDTHHMMSS>-<slug>.md`
   - Slug: short kebab-case from the user's one-liner.
   - If the repo has its own `.agent-reports/TEMPLATE.md`, follow it. Otherwise use the default below.

6. **Save the extract.**
   - Path: `<repo>/.agent-reports/session-extracts/<same-timestamp>_<session-id>.jsonl`
   - Reference it from the note's Session Metadata.

7. **Create directories if missing.** `mkdir -p <repo>/.agent-reports/{incidents,session-extracts}`. Do **not** add anything to `.gitignore` unless the user asks — that is repo policy.

8. **Report back.** One short summary: incident note path, extract path, and what you couldn't determine (so the user can fill it in).

## Default note format (only if the repo has no TEMPLATE.md)

```markdown
# Incident: <user one-liner>

## 1. Summary
- Status: draft
- Observed at (KST): YYYY-MM-DD HH:MM
- Repo / cwd: <path>
- Backend / model: <backend> / <model>
- Surface symptom: `<exact error>`

## 2. Session Metadata
- Original JSONL: <absolute path>
- Local extract: <relative path under .agent-reports/session-extracts/>
- sessionKey / acpSessionId / launchSource: <fill what you can>

## 3. Trigger Context
<user description, lightly cleaned up>

## 4. Exact Error / Transcript Snippet
\`\`\`text
<paste from user + extract>
\`\`\`

## 5. Initial Analysis
### Facts
- (only what the transcript proves)
### Hypotheses
- (clearly marked as guesses)
### Non-goals
- 

## 6. Handoff to Working Agent
Read in order:
1. This note
2. The extract above
3. <any related llmlog or doc the user mentioned>

Then do:
1. 
2. 

Avoid:
- 

## 7. Follow-up Questions
- [ ] 

## 8. Resolution Notes
(fill after fix)
- Root cause:
- Fix:
- Verification:
```

## Rules

- Separate facts (what the transcript shows) from hypotheses (what you guess). Never mix them.
- Do not copy session ids or auth tokens into anything that could become a public issue.
- Do not run `git add` / `commit` unless the user asks. Branch / worktree strategy is a later concern.
- If you cannot find the original JSONL, still write the note — say "JSONL not located" in Session Metadata. A note with a gap beats no note.
