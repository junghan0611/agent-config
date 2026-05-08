---
name: day-query
description: "날짜 기반 통합 조회 — 특정 날짜(또는 기간)에 사용자가 무엇을 했는지, 무엇을 만들었는지, 무엇을 읽었는지, 몸 상태는 어땠는지를 한번에 파악. git 커밋, org 저널, denote 노트, bib 참고문헌, 건강/시간 데이터를 시간축으로 통합하여 사용자의 하루를 재구성한다. Use when user asks 'what did I do on [date]', '어제 뭐 했지', '3년전 오늘', or any date-based activity question."
---

# day-query — 날짜 기반 통합 조회 스킬

특정 날짜에 대해 **모든 데이터 소스**를 조회하여 사용자의 하루를 재구성한다.

## When to Use

- "어제 뭐 했지?" / "3년 전 오늘"
- "2025-10-10에 뭘 작업했나"
- "이번 주 활동 정리"
- "지난 달 얼마나 코딩했지?"
- "연봉협상 자료 정리해줘" (회사 리포 기준)

## 호출 순서 (5개 CLI)

날짜 질문을 받으면 아래 CLI를 **순차 호출**한다:

### 1. 코딩 활동 (gitcli)

```bash
gitcli day <DATE> --me --summary                     # 개요 (토큰 절약, 기본 추천)
gitcli day <DATE> --me                               # 상세 (커밋 메시지 포함)
gitcli day <DATE> --me --repos ~/repos/gh            # 개인만
gitcli day <DATE> --me --repos ~/repos/work          # 회사만
gitcli day <DATE> --me --tz +09:00                   # UTC 서버에서 KST 기준 조회
```

### 2. 저널/노트 (denotecli)

```bash
denotecli day <DATE> --dirs ~/org                   # 저널+당일 노트 통합
denotecli day --days-ago 1 --dirs ~/org              # 어제
denotecli day --years-ago 3 --dirs ~/org             # 3년 전 오늘
```

Journal(daily/weekly), diary.org datetree, 당일 생성 노트(`notes_created`), `#+hugo_lastmod:` 기준 수정 노트(`notes_modified`)를 한번에 반환.
`<DATE>` 형식: `2025-10-04` 또는 `20251004`.

### 3. 건강/시간 추적 (lifetract)

```bash
lifetract read <DATE> --data-dir ~/repos/gh/self-tracking-data
```

수면, 걸음, 심박, 스트레스, aTimeLogger 시간 카테고리.

### 4. 참고문헌 (bibcli, 선택 — 히트율 낮음)

```bash
bibcli search "<YYYYMMDD>" --dir ~/org/resources
```

당일 추가된 Zotero 참고문헌. citation key에 날짜 접두사가 있는 경우만 매칭.
대부분의 날짜에서 0건이 정상.

### 5. 일정/할일 (gogcli, 선택)

```bash
gog -j calendar list --from <DATE>T00:00:00+09:00 --to <NEXT_DATE>T00:00:00+09:00 --account junghanacs@gmail.com
gog -j tasks lists --account junghanacs@gmail.com
gog -j tasks list <listId> --all --account junghanacs@gmail.com
```

Google Calendar 일정, Tasks 할일.
`--date` 플래그는 없음. `--from`/`--to` 조합 사용.
**`-j` 필수** — 없으면 colored text 출력되어 JSON 파싱 불가.
`--account` 또는 `GOG_ACCOUNT` 환경변수 필요.

## 날짜 형식 (모든 CLI 공통)

| 입력 | 해석 |
|------|------|
| `2025-10-10` | 해당 날짜 |
| `20251010` | Denote ID 호환 |
| `--years-ago N` | N년 전 오늘 |
| `--days-ago N` | N일 전 오늘 |

## 2단계 조회 전략

토큰 절약을 위해 **개요 → 상세** 순서로 조회:

```bash
# 1단계: 개요 (항상 — ~500B)
gitcli day <DATE> --me --summary          # 리포별 커밋 수만 (96% 절감)
denotecli day <DATE> --dirs ~/org         # 저널/노트 개요

# 2단계: 상세 (사용자가 요청 시)
gitcli day <DATE> --me                             # 전체 커밋 상세
gitcli log <repo-name> --from <DATE> --to <DATE>   # 특정 리포만
denotecli read <ID> --offset 1 --limit 50           # 특정 노트 본문
```

커밋 50+인 날은 `--summary` 없이 15KB+. **기본은 항상 --summary 사용**.

## 통합 해석 가이드

에이전트가 5개 결과를 받으면:

1. **시간순 병합** — 커밋 시각 + 저널 시각 + 건강 데이터를 시간축으로 정렬
2. **패턴 인식** — "새벽 2시부터 코딩, 점심 안 먹음, 스트레스 높음"
3. **장기 비교** — `--years-ago`로 작년 같은 시기와 비교
4. **프로젝트 추적** — gitcli timeline으로 프로젝트 전환 패턴 파악

## JSON 파싱 주의

- **gitcli** (v0.2.0+): `repos`는 항상 `[]` (null 아님). `--summary`는 `repos_summary` 키 사용.
- **denotecli**: `journal`/`datetree`는 데이터 없으면 `null`, `notes_created`/`notes_modified`는 `[]`. 키는 항상 존재. `notes_modified`는 명시적인 `#+hugo_lastmod:`만 신뢰(mtime fallback 없음). 같은 날 만들고 수정된 파일은 `notes_created`에만 들어감(중복 방지).
- **lifetract**: 건강 데이터 없으면 `{id, date}`만 반환. 나머지 키 생략.
- **--me 필터**: `~/.config/gitcli/authors` 파일 없으면 경고 출력 후 전체 커밋 반환 (v0.1.1+).
- **timezone**: 서버가 UTC인 경우, KST 새벽(00:00~08:59) 커밋이 UTC 전날로 분류될 수 있음.

## Repo Groups (gitcli용)

| 경로 | 성격 | 용도 |
|------|------|------|
| `~/repos/gh` | 개인 GitHub (~30 repos) | 개인 프로젝트 |
| `~/repos/work` | 회사 GitHub (~18 repos) | 업무/연봉협상 |

`--me` 플래그: `~/.config/gitcli/authors`에 정의된 패턴으로 본인 커밋만 필터.

## 사용 예시

### "3년 전 오늘 뭐 했지?"

```bash
gitcli day --years-ago 3 --me --summary
denotecli day --years-ago 3 --dirs ~/org
lifetract read $(date -d '3 years ago' +%Y-%m-%d) --data-dir ~/repos/gh/self-tracking-data
```

### "이번 달 회사 작업 정리"

```bash
gitcli timeline --month 2026-02 --me --repos ~/repos/work
```

### "어제 하루 전체"

```bash
gitcli day --days-ago 1 --me --summary
denotecli day --days-ago 1 --dirs ~/org
lifetract read $(date -d yesterday +%Y-%m-%d) --data-dir ~/repos/gh/self-tracking-data
gog -j calendar list --from $(date -d yesterday +%Y-%m-%d)T00:00:00+09:00 --to $(date +%Y-%m-%d)T00:00:00+09:00 --account junghanacs@gmail.com
```
