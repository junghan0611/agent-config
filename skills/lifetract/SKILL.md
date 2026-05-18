---
name: lifetract
description: "Query personal life-tracking data: Samsung Health (sleep, steps, heart rate, stress, exercise, weight, HRV) + aTimeLogger (18 time categories) + Home Assistant REST (live sensors via ha.junghanacs.com). All records use Denote IDs (YYYYMMDDTHHMMSS) for cross-referencing with denotecli. DB mode (lifetract.db) for instant queries, CSV fallback when DB absent, HA fetch for live sensor reads."
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
// 데이터 있는 날 (read 2025-10-04 형태)
{"date": "2025-10-04", "steps": 41382, "sleep_hours": 1.5, "avg_hr": 93.1, "stress_avg": 20.9, "time_categories": [...], "source": "db"}
// 데이터 없는 날 — time_categories 등 omitempty 필드 누락
{"date": "2026-05-18", "steps": 0, "sleep_hours": 0, "avg_hr": 0, "stress_avg": 0, "source": "db"}
```

`time_categories` 가 비면 JSON 에서 키 자체가 빠진다 (omitempty). 데이터 있는 날 vs 없는 날 둘 다 정상 출력.

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

### ha — Home Assistant REST (live sensors)

```bash
lifetract ha ping                              # 연결 확인
lifetract ha state heart_rate                  # 도메인 이름으로 한 sensor 가져오기
lifetract ha state sleep_duration              # (또는 literal entity_id 도 OK)
lifetract ha states                            # 등록된 24개 known sensor 일괄 조회
lifetract ha entities                          # HA 가 노출하는 모든 entity (raw, known 플래그 표시)
lifetract ha history sleep_duration --days 7   # 7일치 state 변화 (HA recorder)
```

```json
// ha state heart_rate
{
  "entity_id": "sensor.sm_s942n_s26_glgman_heart_rate",
  "kind": "heart_rate",
  "state": "111.0",
  "value": 111,
  "unit": "bpm",
  "last_changed": "2026-05-17T22:34:11Z",
  "attributes": {...}
}
```

**토큰**: `pass show 2fa/totp/ha/junghanacs` (primary) → env `HA_TOKEN` (fallback) → `~/.lifetract/ha.env`. 토큰값 자체는 절대 commit/push 금지.

**도메인 kind**: `sleep_duration`, `steps_daily`, `distance_daily`, `floors_daily`, `heart_rate`, `resting_heart_rate`, `heart_rate_variability`, `weight`, `body_fat`, `height`, `calories_burned`, `active_calories_burned`, `basal_metabolic_rate`, `hydration`, `detected_activity`, `geocoded_location`, `battery`, `sleep_confidence`, `respiratory_rate`, `oxygen_saturation`, `body_temperature`, `blood_glucose`, `systolic_blood_pressure`, `diastolic_blood_pressure` (24종).

새 sensor 추가 = `lifetract/ha_entities.go` 의 `KnownEntities` 에 한 줄.

**`ha history` 동작**: HA recorder 는 *state 변화 시점에만* row 저장. recorder 30일 보관은 "있는 데이터 보존" 이지 "없는 데이터 채워줌" 이 아님. HA 인프라가 띄워진 시점 이전 데이터는 영원히 안 잡힘. 과거는 Samsung CSV export 가 유일한 길. HA history = *내일부터의 적립* 자리.

```json
// ha history sleep_duration --days 7
{
  "entity_id": "sensor.sm_s942n_s26_glgman_sleep_duration",
  "kind": "sleep_duration",
  "unit": "min",
  "days": 7,
  "from": "2026-05-11T...+09:00",
  "to":   "2026-05-18T...+09:00",
  "count": 2,
  "points": [
    {"last_changed": "...", "value": 427, "unit": "min", "attributes": {"endTime": "..."}},
    ...
  ]
}
```

Phase 3.5 현재: read-only (DB 에 안 씀). Phase 4 에서 `cmdToday`/`cmdRead` 가 DB miss 시 자동 HA fetch (state + history) 후 DB upsert 예정 — *on-query lazy ingest*.

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

## Data Coverage (DB snapshot 2026-03-10)

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
| Home Assistant REST | live (recorder 30일 보관) | 24 sensor (phase 3) |

CSV/SQLite 기반 DB 는 2026-03-10 까지. 이후 데이터는 `ha` 커맨드로 라이브 조회 가능 (DB 미적재). Phase 4 마이그레이션 후 lazy ingest 로 자동 누적.

## Related Skills

| Skill | 연계 |
|-------|------|
| **denotecli** | 같은 Denote ID 축 — 노트/저널 |
| **gogcli** | Google Calendar — 같은 날짜의 일정 |
| **bibcli** | 참고문헌 — 저널 엔트리에 연결 |
