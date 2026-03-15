---
name: lifetract
description: "Query personal life-tracking data: Samsung Health (sleep, steps, heart rate, stress, exercise, weight, HRV) + aTimeLogger (18 time categories). All records use Denote IDs (YYYYMMDDTHHMMSS) for cross-referencing with denotecli. DB mode (lifetract.db) for instant queries, CSV fallback when DB absent."
---

# lifetract — Life Tracking CLI

Query and analyze personal health and time-tracking data.
All records carry Denote IDs (`YYYYMMDDTHHMMSS`) — same axis as denotecli.

Binary is bundled in the skill directory. Invoke via `{baseDir}/lifetract`.

All output is JSON.

## Why This Exists (not sqlite3/pandas)

Do NOT open lifetract.db or CSV files directly with Python/sqlite3/pandas.

1. **Denote ID mapping** — Raw CSVs use Samsung's epoch timestamps. The CLI converts them to `YYYYMMDDTHHMMSS` Denote IDs for cross-referencing with denotecli/gitcli.
2. **Multi-source join** — Sleep, heart rate, steps, stress, exercise, time tracking from different tables/sources, unified per-day. Manual SQL gets this wrong.
3. **JSON for agents** — Structured output ready for reasoning. No parsing needed.

## When to Use

- "오늘 몸 상태" → `lifetract today`
- "어제 뭐 했지?" → `lifetract read 2026-03-09`
- "최근 수면 패턴" → `lifetract sleep --days 30 --summary`
- "이번 주 시간 사용" → `lifetract time --days 7`
- "운동 기록" → `lifetract exercise --days 30`
- "30일 추이" → `lifetract timeline --days 30`

## Quick Start

```bash
lifetract status                    # 데이터 소스 + DB 상태
lifetract import --exec             # CSV+aTimeLogger → lifetract.db (1.5초)
lifetract today                     # 오늘 통합 요약
lifetract read 2025-10-04           # 특정 날짜 종합 (건강+시간추적)
lifetract timeline --days 30        # 30일 횡단 뷰
```

## Architecture

```
lifetract.db 존재? → DB 쿼리 (~90ms) → JSON
                  → CSV 파싱 (~300ms) → JSON (fallback)
```

- `lifetract import --exec` 실행 후 모든 조회가 DB 모드
- DB 없으면 CSV 직접 파싱 (Samsung Health만, aTimeLogger 불가)

## Commands

### status — 데이터 소스 확인

```bash
lifetract status
```

```json
{
  "samsung_health": {"path": "...", "available": true, "csv_count": 77},
  "atimelogger": {"path": "...", "available": true, "size_mb": 5.0},
  "database": {"path": "...", "available": true, "size_mb": 33.3, "mode": "db"}
}
```

### import — DB 생성

```bash
lifetract import                    # dry-run: 매니페스트 확인
lifetract import --exec             # 실행: CSV+aTimeLogger → lifetract.db
```

198,030 rows, 36MB, ~3s. Tables: sleep, sleep_stage, heart_rate, steps_daily, stress, exercise, weight, hrv, atl_category, atl_interval.

### read — Denote ID로 조회

```bash
lifetract read 20250115T000000      # Day ID → 그날 종합
lifetract read 2025-01-15           # 같은 결과 (날짜 단축형)
lifetract read 20250115T233000      # Event ID → 개별 수면/운동
```

Day 조회 시 건강 메트릭 + aTimeLogger 시간 카테고리 + 수면 세션 + 운동 모두 포함.

### today — 오늘 요약

```bash
lifetract today
```

```json
{"date": "2025-10-04", "steps": 41382, "sleep_hours": 1.5, "avg_hr": 93.1, "stress_avg": 20.9, "time_categories": [...], "source": "db"}
```

### timeline — 날짜별 횡단 뷰

```bash
lifetract timeline --days 7
lifetract timeline --days 30
```

denotecli 저널과 같은 날짜 키(`YYYYMMDDT000000`)로 정렬. 건강+시간+운동 통합.

### sleep / steps / heart / stress / exercise

```bash
lifetract sleep --days 7
lifetract sleep --days 30 --summary
lifetract steps --days 7
lifetract heart --days 7
lifetract stress --days 7
lifetract exercise --days 30
```

### time — aTimeLogger 시간 추적

```bash
lifetract time --days 7
lifetract time --days 30 --category 본짓
```

카테고리: 본짓, 수면, 가족, 식사, 독서, 운동, 걷기, 수행, 셀프토크, 낮잠, 준비, 집안일, 이동, 쇼핑, 딴짓, 유튜브, 짧은휴식, 여가활동 (18종)

### export — 공개용 내보내기 계획

```bash
lifetract export
```

## Flags

| Flag | Default | 설명 |
|------|---------|------|
| `--days N` | 7 | 조회 기간 |
| `--data-dir DIR` | `~/repos/gh/self-tracking-data` | 데이터 루트 |
| `--shealth-dir DIR` | 최신 자동감지 | Samsung Health 디렉토리 |
| `--summary` | false | 요약 모드 |
| `--category CAT` | 전체 | 시간 카테고리 필터 |
| `--exec` | false | import 실행 모드 |

## Denote ID 체계

| 레벨 | 형식 | 예시 | 용도 |
|------|------|------|------|
| Day | `YYYYMMDDT000000` | `20250115T000000` | denotecli 저널과 동일 |
| Event | `YYYYMMDDTHHMMSS` | `20250115T233000` | 수면/운동 개별 이벤트 |

## Cross-referencing

```bash
# 그날 뭘 했고, 몸 상태는 어땠는지
lifetract read 2025-10-04
# 그날 무슨 생각을 적었는지
denotecli search "20251004"
```

같은 Denote ID 축 → 두 CLI의 결과를 날짜로 조인 가능.

## Data Coverage (updated 2026-03-10)

| Source | Period | Rows |
|--------|--------|------|
| Samsung Health sleep | 2017-03 ~ 2026-03 | 4,489 |
| Samsung Health heart rate | 2017-03 ~ 2026-03 | 62,036 |
| Samsung Health steps | 2017 ~ 2026-03 | 9,692 |
| Samsung Health stress | 2017-03 ~ 2026-03 | 25,768 |
| Samsung Health exercise | 2017-03 ~ 2026-03 | 2,195 |
| Samsung Health weight | — | 283 |
| Samsung Health HRV | — | 1,058 |
| aTimeLogger | 2021-10 ~ 2026-03 | 13,918 intervals |

## Related Skills

| Skill | 연계 |
|-------|------|
| **denotecli** | 같은 Denote ID 축 — 노트/저널 |
| **gogcli** | Google Calendar — 같은 날짜의 일정 |
| **bibcli** | 참고문헌 — 저널 엔트리에 연결 |
