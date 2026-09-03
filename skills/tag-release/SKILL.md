---
name: tag-release
description: "Cut an OpenClaw-style CalVer snapshot tag AND publish the matching GitHub Release. Tag loop = collect commits + closed NEXT.md items, move them to CHANGELOG.md, remove only those closed items from NEXT.md, then pre-flight/tag/push/gh-release/stamp when explicitly requested. The GitHub Release is REQUIRED — GLG reads release notes on github.com, so a tag with no release is an unfinished cut. Attaching build artifacts is the optional part. Not SemVer/deploy; doc/ops repos tag too. ROADMAP.md is optional/manual. Triggers: 태그 박자, 릴리즈 컷, 릴리즈 노트, changelog 정리, NEXT 비우자/갈무리, cut a release/tag, publish release, vYYYY.M.D[-suffix]."
---

# tag-release — CalVer snapshot for NEXT → CHANGELOG

## API

| Phase | Do | Stop when |
|---|---|---|
| Prepare | choose `TAG`; update `CHANGELOG.md`; trim migrated closed items from `NEXT.md`; gate; commit via `commit` skill | before Make |
| Make | only after an explicit tag-release request/approval: pre-flight, tag, push, **`gh release create`**, stamp | after the release is live on github.com + stamp |
| After | report optional follow-ups | `ROADMAP.md` is manual if present |

## Model

This is a **tag loop**, not a package release. Daily work accumulates through the
`commit` skill; occasionally closed work moves from volatile `NEXT.md` into durable
`CHANGELOG.md` and gets a CalVer bookmark.

```
commits + closed NEXT items -> CHANGELOG ## Unreleased
  -> promote to ## vYYYY.M.D[-suffix]
  -> remove only migrated closed items from NEXT.md
  -> pre-flight -> tag/push -> gh release create -> stamp
```

Rules:
- Tag format: `vYYYY.M.D[-suffix]`. Same-day follow-ups are normal: `v2026.6.12`, `v2026.6.12-fix.1`, `v2026.6.12-docs.2`.
- Suffix is free-form follow-up text, not SemVer prerelease pressure.
- `CHANGELOG.md` = past / what closed. `ROADMAP.md` = future / where to go, optional and manual.
- Do not create a `docs/archive` graveyard just to hide closed NEXT items. Detailed docs are fine if reachable from `AGENTS.md`, `README.md`, `NEXT.md`, or workspace SSOT pointers.
- **A tag without a GitHub Release is an unfinished cut, not a style choice.** GLG reads release notes on github.com — that page, not `CHANGELOG.md`, is where a cut becomes visible. `git push origin "$TAG"` creates no release; `gh release create` does. If a previous tag has no release, backfill it in the same session and say so.
- Release notes are the CHANGELOG section for that tag, verbatim. Do not re-summarize — the section was already written once and a second summary drifts from it.
- **Attaching build artifacts is optional and off by default.** Source tarballs are auto-attached by GitHub. Add `--attach` only for a binary a user cannot produce themselves; never attach gitignored build output as if it were reviewed.
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

Release — **required, same breath as the push.** Notes are the CHANGELOG section, extracted verbatim; the release title is that heading's own text:

```bash
NOTES=$(mktemp)
awk -v t="## $TAG" '$0==t||index($0,t" ")==1{f=1;next} f&&/^## /{exit} f' CHANGELOG.md > "$NOTES"
test -s "$NOTES"                                   # empty notes = wrong tag heading, abort
TITLE=$(grep -m1 -E "^## $TAG([[:space:]]|\$)" CHANGELOG.md | sed 's/^## //')
gh release create "$TAG" --title "$TITLE" --notes-file "$NOTES"
gh release view "$TAG" --json url -q .url          # receipt: paste this to GLG
```

Optional, only when asked: `--attach <file>` for a binary a user cannot build, `--latest=false` for a backfill, `--draft` when GLG wants to read before it is public.

Backfill a tag that was pushed without a release (same extraction, no new tag):

```bash
gh release create "$OLDTAG" --title "$TITLE" --notes-file "$NOTES" --latest=false
```

Stamp after successful remote push:

```bash
SCRIPT="$HOME/.pi/agent/skills/pi-skills/agenda/scripts/agenda-stamp.sh"; [ -x "$SCRIPT" ] || SCRIPT="$HOME/.claude/skills/agenda/scripts/agenda-stamp.sh"
REPO=$(basename "$(git remote get-url origin)" .git); RTAG=$(echo "$REPO" | sed 's/[-.]//g')
URL=$(git remote get-url origin | sed -E 's|git@github(-[a-z]+)?\.com:|https://github.com/|;s|\.git$||')
"$SCRIPT" "${REPO}: tag ${TAG} [[${URL}/releases/tag/${TAG}][${TAG}]]" "pi:release:${RTAG}"
```


## Failure

- Hook block: fix diff; no bypass. Stamp failure: stop and report exact command + error.
- Wrong local unpushed tag: `git tag -d "$TAG"`, fix HEAD, redo. Wrong pushed tag: report to GLG.
- `gh release create` fails after the tag is pushed: the tag is live and the cut is **not** done. Fix and re-run the release step alone — do not delete or move the tag. Wrong notes on a live release: `gh release edit "$TAG" --notes-file <fixed>`.
