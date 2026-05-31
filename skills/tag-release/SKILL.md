---
name: tag-release
description: "Cut an OpenClaw-style CalVer tag for a repo — gather commits, refresh CHANGELOG, promote, tag, push, stamp. Use when the user says '태그 박자', '릴리즈 컷', 'changelog 정리', 'cut a release/tag', or wants a vYYYY.M.D[-suffix] snapshot."
---

# tag-release — OpenClaw-style CalVer tag + CHANGELOG

The **tag loop** of the GLG workflow (the daily loop is the `commit` skill). Runs occasionally to publish a snapshot.

```
[gitcli] commits since last tag → refresh CHANGELOG ## Unreleased
  → promote to ## vYYYY.M.D[-suffix] ← Prepare (no tag/push)
  → tag + push + stamp              ← Make (clean HEAD, GLG-approved)
  → ROADMAP "current position" snapshot (manual)
```

## Principles

- **OpenClaw-style CalVer**: tags are `vYYYY.M.D` with optional suffix, e.g. `v2026.5.31`, `v2026.5.31-beta.1`, `v2026.5.31-rc.1`. Use no SemVer package bump.
- **Sort rule**: unpadded `vYYYY.M.D` breaks plain lexical sort. If listing tags, use version sort (`git tag --sort=-version:refname`), never `git tag | sort`.
- **CHANGELOG is SSOT**; any GitHub release body is extracted from it.
- **Prepare and Make never merge** — Make publishes from a clean HEAD, and its `git tag`/`git push` are **run by GLG**, never the agent alone.
- **Harness-neutral**: git + gitcli + the global stamp pattern only.

## Prepare (no tag, no push)

1. **Baseline**: `git describe --tags --abbrev=0` (none → first tag; establishes the changelog anchor). If reachability is not enough and you list tags, use `git tag --sort=-version:refname`.
2. **Collect** commits since baseline: convert the tag date to `YYYY-MM-DD` (`v2026.5.31-beta.1` → `2026-05-31`) and run `gitcli log <repo> --from <date> --to <today> --author <author>`. Cross-check exact boundaries with `git log <tag>..HEAD --oneline`.
3. **Update `## Unreleased`**: notable only (features/fixes/breaking; drop typos/refactors). Past-tense entries, PRs over hashes, breaking→features→fixes. Append, never replace. Create `CHANGELOG.md` if absent (format below).
4. **Promote** `## Unreleased` to `## <TAG>`, leaving a fresh empty `## Unreleased` above.
5. **(optional) gate**: nix repo → `nix flake check`; else the repo's check.
6. **Commit** per `commit` skill (`chore(release): prepare v2026.5.31`), release-prep files only. Stop and ask GLG before Make.

## Make (after GLG approval)

Pre-flight — abort on first failure:

```bash
TAG="v2026.5.31"  # optional suffix: v2026.5.31-beta.1
git diff-index --quiet HEAD --                  # clean tree
test -z "$(git tag -l "$TAG")"                  # no local collision
test -z "$(git ls-remote --tags origin "$TAG")" # no remote collision
grep -Fxq "## ${TAG}" CHANGELOG.md              # exact section exists
git push --dry-run origin HEAD                  # real pushability
```

Tag + push (lightweight tag; body comes from CHANGELOG):

```bash
git tag "$TAG" && git push origin HEAD && git push origin "$TAG"
```

The push must pass the global git hook (secret/identity-term blocker) — fix the diff per its output, never `--no-verify`.

**Stamp** — identical to the `commit` skill's post-commit stamp, but with `pi:release:<repo>` so org-agenda can filter releases from `pi:commit:`:

```bash
TAG="v2026.5.31"  # same value used above
SCRIPT="$HOME/.pi/agent/skills/pi-skills/agenda/scripts/agenda-stamp.sh"
[ -x "$SCRIPT" ] || SCRIPT="$HOME/.claude/skills/agenda/scripts/agenda-stamp.sh"
REPO=$(basename "$(git remote get-url origin)" .git); RTAG=$(echo "$REPO" | sed 's/[-.]//g')
URL=$(git remote get-url origin | sed -E 's|git@github(-[a-z]+)?\.com:|https://github.com/|;s|\.git$||')
"$SCRIPT" "${REPO}: tag ${TAG} [[${URL}/releases/tag/${TAG}][${TAG}]]" "pi:release:${RTAG}"
```

**(optional)** GitHub release: extract the CHANGELOG section to a temp file (never edit CHANGELOG itself) → `gh release create "$TAG" --notes-file <tmp>`.

## After the tag (manual, not this skill)

Refresh ROADMAP "current position" — narrative (why/how), orthogonal to CHANGELOG (what). NEXT.md / AGENTS.md stay human-owned too.

## What this does NOT do

- No SemVer bump, no `npm publish`, no solo agent push/tag, no `--no-verify`.
- No auto-edit of ROADMAP/AGENTS. No rewrite of past CHANGELOG sections (old SemVer lines stay as history; new entries CalVer only).

## CHANGELOG format (when absent)

```markdown
# Changelog

All notable changes, tracked by CalVer date tags.

## Unreleased

## v2026.5.31

- first snapshot entry
```

## Failure / Recovery

| State | Action |
|---|---|
| pre-flight fail | abort, report which check |
| push fail / hook block | abort before stamp; fix diff, retry; no bypass |
| local tag at wrong commit (unpushed) | `git tag -d "$TAG"`, fix HEAD, redo |
| pushed tag at wrong commit | force-push territory — report to GLG |
| stamp fail | **STOP and report** the exact command + error (global rule — never silently proceed, never fall back to Write/Edit on the agenda target) |
