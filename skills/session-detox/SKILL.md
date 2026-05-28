---
name: session-detox
description: "세션 안정화용 프롬프트 표면 정리. AGENTS/NEXT/SKILL/USER/SOUL/TOOLS 등 prompt-surface 문서를 스캔해 known unstable idioms를 찾고, 안전한 치환을 먼저 적용한 뒤 남은 hit를 수동 검수한다. Use when the user says '세션 망가졌어', '프롬프트 정리', 'detox', '세션 안정화', or a harness starts spiraling after local docs/prompts.'"
---

# session-detox

Prompt-surface cleanup for unstable sessions.

## API

| Step | Command | Purpose |
|---|---|---|
| 1 | `python ./scripts/session-detox.py scan` | Scan likely prompt docs in the current git repo and print hit locations only |
| 2 | `python ./scripts/session-detox.py apply` | Apply safe deterministic replacements only |
| 3 | `python ./scripts/session-detox.py verify` | Exit non-zero if any hits remain |
| 4 | `python ./scripts/session-detox.py scan --show-line` | Optional: show line text for the remaining manual pass |
| 5 | `python ./scripts/session-detox.py scan --all-tracked` | Widen scope beyond prompt docs when the problem leaked into general docs |

Resolve `./scripts/...` relative to this skill directory. Add `--root /path/to/repo` when detoxing another repo.

## Workflow

1. Run `scan` first.
2. Run `apply` for the safe auto-fixes.
3. Run `verify`.
4. If hits remain, do a **small manual pass** on the listed files:
   - in pi: use `read` + `edit`
   - elsewhere: use the local editing surface
5. Run `verify` again until clean.
6. Review `git diff --stat` and a focused `git diff` before finishing.

## Scope rule

Default scope is **prompt-surface files only** inside the current git repo:
- `AGENTS.md`, `NEXT.md`, `README.md`, `ROADMAP.md`
- `IDENTITY.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `FOLLOWUP.md`, `MEMORY.md`
- any `SKILL.md`
- markdown under `commands/`

Use `--all-tracked` only when the unstable wording spread beyond the prompt surface.

## Notes

- `apply` is intentionally conservative. It fixes only high-confidence phrases.
- The remaining pass is expected. Some wording needs context-sensitive rewriting.
- The script ignores vendored trees such as `node_modules/`, `npm/`, `.git/`, `.pnpm/`.
- The script operates on **git-tracked** `.md` / `.org` / `.txt` files only.
- If the repo is not a git repo, stop and do the cleanup manually.
