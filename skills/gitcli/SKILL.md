---
name: gitcli
description: "Local git timeline CLI. Query commit history across 50+ repositories. Use when user asks about coding activity, what they worked on, commit history, project timeline, or 'what did I do on [date]'."
---

# gitcli v0.4.0 — Local Git Timeline CLI

Query commit history across all local git repositories (~/repos/gh, ~/repos/work).

Binary is bundled in the skill directory. Invoke via `{baseDir}/gitcli`.

All output is JSON.

## The time axis (v0.4.0)

gitcli computes in **KST since 2026-07-14**, following the time contract in
`~/repos/gh/junghan0611/timeline/README.md` — the same contract `collect.py` implements,
so the two answer a day identically (verified: equal full-sha sets).

- A commit belongs to the day of its **author** timestamp in Seoul. A commit written at
  20:00 UTC belongs to the *next* Seoul day.
- Every instant on the wire is RFC3339 with `+09:00` (`ts`, `first_commit`, `last_commit`).
- Windows snap to midnight KST and are half-open on instants — a day is never sliced.
- Each commit carries the **full `sha`** (joins the timeline) plus a short `hash` (for humans).
- Walks `--all --no-merges`, deduped by sha across clones.
- Symlinked repos are followed (`~/repos/gh/org` → `~/sync/org` was invisible before v0.4.0).
- Unreadable repos are reported in `rejects`, never silently read as "no commits".

## When to Use

- "어제 뭐 코딩했지?" → `gitcli day --days-ago 1 --me --summary`
- "pi-mono 최근 커밋" → `gitcli log pi-mono --days 7`
- "이번 달 활동량" → `gitcli timeline --month 2026-02 --me`
- "리포 몇 개야?" → `gitcli repos`
- 특정 날짜 활동 → `gitcli day 2025-10-10 --me --summary`
- "회사 작업 정리" → `gitcli timeline --month 2026-02 --me --repos ~/repos/work`
- "연봉협상 자료" → `gitcli timeline --days 90 --me --repos ~/repos/work`

## Commands

### day — 특정 날짜의 모든 커밋

```bash
gitcli day                              # 오늘
gitcli day 2025-10-10 --me --summary    # 개요 (토큰 절약, 기본 추천)
gitcli day 2025-10-10 --me              # 상세 (커밋 메시지/diff 통계 포함)
gitcli day 20251010                     # Denote ID 호환
gitcli day --years-ago 1 --me           # 1년 전 오늘
gitcli day --days-ago 7 --me            # 7일 전
gitcli day --repos ~/repos/gh --me      # 특정 디렉토리만
gitcli day --me --max 10                # 상세 모드에서 최근 10커밋만
```

**`--summary` 출력** (~500B, 96% 절감):
```json
{"date":"2026-02-22","total_commits":45,"repos_summary":[{"name":"denotecli","commits":16},{"name":"pi-skills","commits":4}],"summary":{"active_repos":6,"first_commit":"2026-02-22T16:39:07+09:00","last_commit":"2026-02-22T20:18:44+09:00","active_hours":3.65}}
```

**기본 출력** (~13KB): 커밋별 hash, sha, ts, time, message, files_changed, insertions, deletions 포함.

`--max N`으로 자르면 `summary.dropped`에 **버린 커밋 수**가 실린다 (상한값 N이 아니다).

### repos — 리포 목록과 통계

```bash
gitcli repos                        # 기본 (~/repos/gh + ~/repos/work)
gitcli repos --repos ~/repos/gh    # 개인만
```

### log — 특정 리포 커밋 로그

```bash
gitcli log agent-config --days 7
gitcli log agent-config --from 2025-10-01 --to 2025-10-31
gitcli log nixos-config --from v2026.5.30-beta.1  # OpenClaw-style tag date accepted
gitcli log nixos-config --author junghan
```

리포 이름은 `gitcli repos`가 내는 이름이다. 없는 이름을 주면 `repo not found`로 죽는다.

### timeline — 기간별 활동 개요

```bash
gitcli timeline --days 30 --me
gitcli timeline --month 2025-10 --me
```

Output: period, total_commits, active_days, daily[].{date, commits, repos[], hours}

`--me` works here as of v0.4.0. Before that the flag was documented but never read, so
`timeline --me` silently counted everyone's commits.

## Important Notes

- **`--me --summary` 기본 사용**: 토큰 절약 + 포크/AI 커밋 필터링
- **`--tz`**: v0.4.0부터 no-op. KST가 계약이자 기본이므로 넘겨도 무해하지만 필요 없다.
- **기본 경로**: `~/repos/gh,~/repos/work` (둘 다 스캔)
- **경로 분리**: 개인(`--repos ~/repos/gh`), 회사(`--repos ~/repos/work`)
- **repos는 항상 `[]`**: 커밋 없는 날도 null 아닌 빈 배열 반환
- **authors 없으면 경고**: `~/.config/gitcli/authors` 미존재 시 stderr 경고 출력

## Author Config (~/.config/gitcli/authors)

```
# 한 줄에 하나, 대소문자 무관 부분 일치
junghan     # 개인: junghan, junghan0611, Jung Han, junghanacs
jhkim2      # 회사: Junghan Kim <jhkim2@goqual.com>
```

## Repo Groups

| 경로 | 성격 | 리포 수 | 기간 |
|------|------|---------|------|
| `~/repos/gh` | 개인 GitHub | ~57 | 2011~ |
| `~/repos/work` | 회사 GitHub | ~25 | 2025~ |

리포 수는 손으로 관리하는 낡는 숫자다. 살아있는 값은 `gitcli repos`가 낸다.
