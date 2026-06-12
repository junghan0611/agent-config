---
name: tag-release
description: "Cut an OpenClaw-style CalVer tag for a repo — the occasional 'tag loop' that gathers commits + NEXT.md closed items, moves them into CHANGELOG, clears NEXT, then tags/pushes/stamps. The tag marks where NEXT was emptied (not a deploy version), so doc/ops repos tag too; ROADMAP is optional (dev repos only). Use when the user says '태그 박자', '릴리즈 컷', 'changelog 정리', 'NEXT 비우자/갈무리', 'cut a release/tag', or wants a vYYYY.M.D[-suffix] snapshot."
---

# tag-release — OpenClaw-style CalVer tag + CHANGELOG

The **tag loop** of the GLG workflow (the daily loop is the `commit` skill). 매일 `commit`
으로 쌓다가, **가끔 한 판** 돌려 그동안의 진행을 시간축으로 갈무리한다.

핵심은 *배포*가 아니라 **갈무리**다. 태그를 박는 순간은 = `NEXT.md`의 닫힌 항목을
`CHANGELOG.md`로 내리고 **NEXT를 비우는 지점**이다. 그래서 배포 아티팩트가 없는 repo
(문서·운영 repo, 예: cos 비서실장)도 태그를 단다 — 태그 = "이 날, 이 상태로 NEXT를 한 번
비웠다"는 시간축 책갈피이지 SemVer 릴리즈가 아니다.

```
[commit skill] 매일 커밋 ──── 가끔 ────▶ tag-release 한 판:
  NEXT.md 닫힌 항목 → CHANGELOG ## Unreleased 로 내림 → NEXT 비움
    → promote ## Unreleased → ## vYYYY.M.D[-suffix]   ← Prepare (no tag/push)
    → tag + push + stamp                               ← Make (clean HEAD, GLG-approved)
    → (옵셔널) ROADMAP "current position" 갱신          ← 개발 repo만, 있으면
```

## Principles

- **OpenClaw-style CalVer**: tags are `vYYYY.M.D` with optional suffix, e.g. `v2026.5.31`, `v2026.5.31-beta.1`, `v2026.5.31-rc.1`. Use no SemVer package bump.
- **Sort rule**: unpadded `vYYYY.M.D` breaks plain lexical sort. If listing tags, use version sort (`git tag --sort=-version:refname`), never `git tag | sort`.
- **CHANGELOG is SSOT**; any GitHub release body is extracted from it.
- **Prepare and Make never merge** — Make publishes from a clean HEAD, and its `git tag`/`git push` are **run by GLG**, never the agent alone.
- **Harness-neutral**: git + gitcli + the global stamp pattern only.
- **NEXT를 버리지 않고 옮긴다**: tag-release는 `NEXT.md`의 *완료된* 항목을 삭제하는 게 아니라
  `CHANGELOG.md`로 *이주*시키는 의식이다. `docs/` 폴더를 새로 파지 않는다 (만드는 순간 아무도
  안 봄). 기록은 사라지지 않고 시간축(CHANGELOG)으로 내려간다.
- **문서 표면은 네 개로 통일**: `AGENTS.md`(영속 spec, 무시간) / `README.md`(입구) /
  `CHANGELOG.md`(과거·시간축, *무엇이 닫혔나*) / `ROADMAP.md`(미래·방향, *어디로 가나*).
  그 외 문서는 옵셔널 — 필요하면 만들고 AGENTS.md에 링크. 1주일 뒤 바뀔 것은 AGENTS에 안 담는다.
- **ROADMAP은 옵셔널**: 아직 NEXT로도 못 담는 *가고자 하는 방향*이 있는 **개발 프로젝트**만 둔다.
  방향이 외부(사람·조직)에서 오는 운영·문서 repo(예: cos)는 ROADMAP이 없을 수 있다 — 정상.
  없으면 그 단계를 건너뛴다. 이 스킬이 ROADMAP을 새로 *만들지는* 않는다.
- **repo 유형 무관**: 단독 repo든 메타리포(리포의 리포, 예: cos 포트폴리오 NEXT)든 같은 의식.
  메타리포는 도메인 그룹별로 닫힌 항목을 CHANGELOG에 날짜+그룹으로 내린다.

## Prepare (no tag, no push)

1. **Baseline**: `git describe --tags --abbrev=0` (none → first tag; establishes the changelog anchor). If reachability is not enough and you list tags, use `git tag --sort=-version:refname`.
2. **Collect** commits since baseline: convert the tag date to `YYYY-MM-DD` (`v2026.5.31-beta.1` → `2026-05-31`) and run `gitcli log <repo> --from <date> --to <today> --author <author>`. Cross-check exact boundaries with `git log <tag>..HEAD --oneline`.
3. **Update `## Unreleased`**: 출처는 ① 커밋(gitcli)과 ② **`NEXT.md`의 닫힌 항목**(완료된 NOW/
   트랙). notable only (features/fixes/breaking; drop typos/refactors). Past-tense entries, PRs over
   hashes, breaking→features→fixes. Append, never replace. 메타리포는 도메인 그룹/날짜로 묶어 내린다.
   Create `CHANGELOG.md` if absent (format below).
4. **Promote** `## Unreleased` to `## <TAG>`, leaving a fresh empty `## Unreleased` above.
   헤딩에 한 줄 제목을 붙여도 된다 (`## v2026.6.12 — 문서 구조 재정렬`).
5. **NEXT 비우기**: 방금 CHANGELOG로 내린 *완료* 항목을 `NEXT.md`에서 제거한다. 진행 중·미착수
   항목은 남긴다 — tag-release는 NEXT를 *갈무리*하지 비우지 않은 일까지 지우지 않는다. (ROADMAP이
   있는 repo면 "current position"도 이때 함께 보지만, 갱신은 Make 이후 수동.)
6. **(optional) gate**: nix repo → `nix flake check`; else the repo's check.
7. **Commit** per `commit` skill (`chore(release): prepare v2026.5.31` — 또는 재구조화처럼 본문이
   곧 릴리즈면 `docs(...)`/`refactor(...)`도 가능), release-prep files only. Stop and ask GLG before Make.

## Make (after GLG approval)

Pre-flight — abort on first failure:

```bash
TAG="v2026.5.31"  # optional suffix: v2026.5.31-beta.1
git diff-index --quiet HEAD --                  # clean tree
test -z "$(git tag -l "$TAG")"                  # no local collision
test -z "$(git ls-remote --tags origin "$TAG")" # no remote collision
grep -Fq "## ${TAG}" CHANGELOG.md               # section exists (제목 suffix 허용: "## v… — title")
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

- **ROADMAP** (있으면): "current position"을 갱신 — *어디로 가나*(미래·방향, why/how). CHANGELOG가
  *무엇이 닫혔나*(과거·what)라면 ROADMAP은 그 직교축. 없는 repo면 건너뛴다 (개발 repo만 보통 있음).
- **NEXT.md**는 Prepare 5단계에서 이미 *완료분만* CHANGELOG로 내려가 비워졌다. 진행 중 항목은 그대로 남아 다음 세션이 이어받는다.
- **AGENTS.md**는 사람 소유 — 이 스킬이 자동 편집하지 않는다.

## What this does NOT do

- No SemVer bump, no `npm publish`, no solo agent push/tag, no `--no-verify`.
- **편집하는 것은 `CHANGELOG.md`(append/promote)와 `NEXT.md`(완료분 비우기)뿐.** ROADMAP/AGENTS는 자동 편집 안 함. No rewrite of past CHANGELOG sections (old SemVer lines stay as history; new entries CalVer only).

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
