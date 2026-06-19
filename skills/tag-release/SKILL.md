---
name: tag-release
description: "Cut an OpenClaw-style CalVer snapshot tag. Tag loop = collect commits + closed NEXT.md items, move them to CHANGELOG.md, remove only those closed items from NEXT.md, then pre-flight/tag/push/stamp when explicitly requested. Not SemVer/deploy; doc/ops repos tag too. ROADMAP.md is optional/manual. Triggers: 태그 박자, 릴리즈 컷, changelog 정리, NEXT 비우자/갈무리, cut a release/tag, vYYYY.M.D[-suffix]."
---

# tag-release — CalVer snapshot for NEXT → CHANGELOG

## API

| Phase | Do | Stop when |
|---|---|---|
| Prepare | choose `TAG`; update `CHANGELOG.md`; trim migrated closed items from `NEXT.md`; gate; commit via `commit` skill | before Make |
| Make | only after an explicit tag-release request/approval: pre-flight, tag, push, stamp | after successful remote push + stamp |
| After | report optional follow-ups | `ROADMAP.md` is manual if present |

## Model

This is a **tag loop**, not a package release. Daily work accumulates through the
`commit` skill; occasionally closed work moves from volatile `NEXT.md` into durable
`CHANGELOG.md` and gets a CalVer bookmark.

```
commits + closed NEXT items -> CHANGELOG ## Unreleased
  -> promote to ## vYYYY.M.D[-suffix]
  -> remove only migrated closed items from NEXT.md
  -> pre-flight -> tag/push -> stamp
```

Rules:
- Tag format: `vYYYY.M.D[-suffix]`. Same-day follow-ups are normal: `v2026.6.12`, `v2026.6.12-fix.1`, `v2026.6.12-docs.2`.
- Suffix is free-form follow-up text, not SemVer prerelease pressure.
- `CHANGELOG.md` = past / what closed. `ROADMAP.md` = future / where to go, optional and manual.
- Do not create a `docs/archive` graveyard just to hide closed NEXT items. Detailed docs are fine if reachable from `AGENTS.md`, `README.md`, `NEXT.md`, or workspace SSOT pointers.
- Boundary truth is `git log <baseline>..HEAD`; date-based `gitcli log` is only a readable timeline aid.
- Agent edits only `CHANGELOG.md` + `NEXT.md`. No automatic `ROADMAP.md` / `AGENTS.md` edits. No unsolicited tag-release; Make runs only on an explicit GLG request/approval. Never `--no-verify`.

## Prepare — no tag, no push

1. **Choose tag**
   - Base `TAG=vYYYY.M.D`; for “앗차”/same-day follow-up use `vYYYY.M.D-fix.1`, `vYYYY.M.D-cleanup.1`, etc.
2. **Find baseline**
   - `BASELINE=$(git describe --tags --abbrev=0 2>/dev/null || true)`.
   - If listing tags, use `git tag --sort=-version:refname` (never lexical `sort`).
3. **Collect changes**
   - Exact: `git log ${BASELINE:+$BASELINE..}HEAD --oneline`.
   - Optional: `gitcli log` from the baseline date for human timeline only.
4. **Update `## Unreleased`**
   - Sources: notable commits + closed `NEXT.md` items.
   - Past tense; breaking -> features -> fixes, or domain groups for meta repos.
   - Append; do not rewrite old sections. Create `CHANGELOG.md` if absent.
5. **Promote**
   - Rename filled `## Unreleased` to `## $TAG`; create a fresh empty `## Unreleased` above.
   - Title suffix allowed: `## v2026.6.12 — 문서 구조 재정렬`.
6. **Trim `NEXT.md`**
   - Remove only closed items just migrated to `CHANGELOG.md`.
   - Keep active blockers / next moves / unstarted work. Refresh top pointer so it is not stale.
7. **Gate + commit**
   - Run repo check (`nix flake check` for nix repos; otherwise normal check if present).
   - Commit release-prep files via `commit` skill, e.g. `chore(release): prepare v2026.6.12-fix.1`.
   - Continue to Make only if the current request/approval explicitly includes tagging/release execution; otherwise stop here.

## Make — after GLG approval

Pre-flight; abort on first failure:

```bash
TAG="v2026.6.12-fix.1"
git diff-index --quiet HEAD --
test -z "$(git tag -l "$TAG")"
test -z "$(git ls-remote --tags origin "$TAG")"
grep -qE "^## $TAG([[:space:]]|$)" CHANGELOG.md  # exact tag heading at line start, optional title suffix. (grep, not awk positional fields — bare \$N positionals get stripped when this skill is injected into an agent context)
git push --dry-run origin HEAD
```

Publish after pre-flight:

```bash
git tag "$TAG" && git push origin HEAD && git push origin "$TAG"
```

Stamp after successful remote push:

```bash
SCRIPT="$HOME/.pi/agent/skills/pi-skills/agenda/scripts/agenda-stamp.sh"; [ -x "$SCRIPT" ] || SCRIPT="$HOME/.claude/skills/agenda/scripts/agenda-stamp.sh"
REPO=$(basename "$(git remote get-url origin)" .git); RTAG=$(echo "$REPO" | sed 's/[-.]//g')
URL=$(git remote get-url origin | sed -E 's|git@github(-[a-z]+)?\.com:|https://github.com/|;s|\.git$||')
"$SCRIPT" "${REPO}: tag ${TAG} [[${URL}/releases/tag/${TAG}][${TAG}]]" "pi:release:${RTAG}"
```

Optional GitHub release: extract matching CHANGELOG section to a temp file, then `gh release create "$TAG" --notes-file <tmp>`.

## Failure

- Hook block: fix diff; no bypass. Stamp failure: stop and report exact command + error.
- Wrong local unpushed tag: `git tag -d "$TAG"`, fix HEAD, redo. Wrong pushed tag: report to GLG.
