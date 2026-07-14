---
name: lifetract
description: "Query personal life-tracking data: Samsung Health (sleep, steps, heart rate, stress, exercise, weight, HRV) + aTimeLogger (18 time categories) + Home Assistant REST (live sensors via ha.junghanacs.com). All records use Denote IDs (YYYYMMDDTHHMMSS) for cross-referencing with denotecli. DB mode (lifetract.db) for instant queries, CSV fallback when DB absent, automatic HA fallback for today's gaps (today/read <오늘> 시 DB 가 빈 자리를 HA 라이브로 자동 채움)."
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
  "samsung_health": {"path": "...", "available": true, "csv_count": 78},
  "atimelogger": {"path": "...", "available": true, "size_mb": 5.0},
  "database": {
    "path": "...", "available": true, "size_mb": 37.3, "mode": "db",
    "last_time_block": "2026-07-13", "last_sleep": "2026-07-13", "last_steps": "2026-07-13",
    "stale_days": 1, "warnings": []
  }
}
```

**`last_*` / `stale_days` / `warnings` 가 이 명령의 요점이다.** Samsung export 는 사람이
폰에서 손으로 내보내야 흐른다 — 안 넣어주면 조용히 낡는다. 숫자를 저널에 사실로 박기
전에 여기부터 봐라 (§시간 계약 4항).

### import — DB 생성

```bash
lifetract import                    # dry-run: 매니페스트 확인
lifetract import --exec             # 실행: CSV+aTimeLogger → lifetract.db
```

203,539 rows, 38MB, ~2s. Tables: sleep, sleep_stage, heart_rate, steps_daily, stress,
exercise, weight, hrv, atl_category, atl_interval.

**import 는 자기가 뭘 잃었는지 말한다.** `total_rows` 말고 **`status` 를 먼저 봐라.**

```json
{
  "status": "warning",
  "warnings": ["stress: 27,598 rows (2026-07-14 12:25) → 0 — stream lost [empty]"],
  "total_rows": 175941,
  "prev_total_rows": 203539,
  "tables": [
    {"name": "stress", "rows": 0, "status": "empty", "prev_rows": 27598, "delta": -27598}
  ]
}
```

| 낱말 | 뜻 |
|---|---|
| `ok` | 읽었고, 지난번보다 줄지 않았다 |
| `empty` | 읽히긴 했는데 **0 행**. 지난번에 행이 있었다면 **잃은 것** |
| `shrunk` | 지난 import 보다 **적다** — Samsung export 는 누적 덤프라 줄면 이상하다 |

직전 행수는 DB 안 `import_log` 원장에 산다 (import 가 DB 를 지워도 이월된다).
**첫 import 는 비교 대상이 없으니 경고하지 않는다** — `note` 가 그렇게 말한다.
원장을 직접 읽는다면 **`GROUP BY import_id`** 를 써라. `imported_at` 은 한 import 를
묶지 못한다 (옛 행들은 초 경계를 넘어 2~3 개로 쪼개져 있다).

*왜 있나: 2026-07-14, 글롭 하나가 7MB stress 대신 1KB histogram 을 집어 27,598 행이
통째로 0 이 됐는데 import 는 `"ok"` 라고 했다. 테스트는 초록불이었다. 잡은 건 총 행수가
203,539 → 175,941 로 떨어진 걸 **사람이 눈으로 본 것**뿐이었다. 이제 도구가 말한다.*

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
// 데이터 없는 날 — DB 가 빈 자리는 자동으로 HA 가 채움 (phase 7 read-only fallback)
{"date": "2026-05-26", "steps": 7099, "sleep_hours": 4.8, "avg_hr": 137, "stress_avg": 0, "source": "db+ha", "ha_sources": ["steps","heart_rate","sleep"]}
```

`time_categories` 가 비면 JSON 에서 키 자체가 빠진다 (omitempty). 데이터 있는 날 vs 없는 날 둘 다 정상 출력.

**자동 HA fallback (오늘 자리에 한정)**: DB 가 오늘 자리를 비웠으면 (Samsung CSV 가 아직 안 들어왔으면) `today` 와 `read <오늘>` 이 자동으로 HA 라이브 값으로 채운다. `source` 가 `"db+ha"` / `"csv+ha"` 로 바뀌고, `ha_sources` 가 어떤 필드가 HA 에서 왔는지 알려준다. *과거 날짜는 enrichment 안 됨* — HA recorder 는 backfill 자리가 아니다. 끄려면 `LIFETRACT_NO_HA=1`. Sleep 은 *옛 row 가 오늘로 잡히는 stale* 자리도 감지해서 HA 로 덮어쓴다 (최근 36h 의 sleep_duration history 를 합산 — main sleep + nap 둘 다 잡음).

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

**현재 상태 (phase 7 read-only)**: `cmdToday` / `cmdRead <오늘>` 이 DB miss 또는 stale sleep 자리에서 자동으로 HA `GetState` + `GetHistory` 를 호출해 응답에 채워준다 (`source: "db+ha"`, `ha_sources: [...]`). DB upsert 는 아직 안 함 — 다음 turn 에 `source TEXT` 컬럼 + `(date, source)` upsert 로 *on-query lazy ingest* 완성 예정 (plan.md Phase 7 후반부).

## Flags

| Flag | Default | 설명 |
|------|---------|------|
| `--days N` | 7 | 오늘 기준 상대 기간 |
| `--from YYYY-MM-DD` | — | 창 시작 (포함). `--days` 를 덮어씀 |
| `--to YYYY-MM-DD` | — | 창 끝 (**배타적**). `--days` 를 덮어씀 |
| `--data-dir DIR` | `~/repos/gh/self-tracking-data` | 데이터 루트 |
| `--shealth-dir DIR` | 최신 자동감지 | Samsung Health 디렉토리 |
| `--summary` | false | 요약 모드 |
| `--category CAT` | 전체 | 시간 카테고리 필터 |
| `--exec` | false | import 실행 모드 |

## 시간 계약 (Time Contract)

에이전트가 이 CLI 의 숫자를 저널·노트에 **사실로 기록**하기 전에 알아야 할 다섯.
전문·근거는 [AGENTS.md §3.5](AGENTS.md), 강제는 `lifetract/timeaxis_test.go`.

**1. 모든 날짜는 KST 고정.** 호출한 셸의 `$TZ` 가 답을 바꾸지 못한다.

**2. 창은 반개방 `[from, to)`.** `--to` 는 배타적:

```bash
lifetract time --from 2026-07-01 --to 2026-07-08   # 7일 (7/1 ~ 7/7)
```

경계는 KST 자정이다. `--days 3` 과 `--days 5` 는 같은 과거 날짜에 대해 **같은
답**을 낸다 — 창을 넓혀도 과거는 안 바뀐다.

**재현이 필요하면 `--from/--to` 를 써라.** `--days` 는 오늘 기준이라 내일이면
다른 질문이 된다. 저널에 박아 넣을 숫자라면 특히.

**3. 블록은 시작일에 귀속.** 수면 `21:14 → 05:48` 은 전부 시작한 날의 것.
자정을 넘어도 쪼개지 않는다.

**4. 낡음은 스스로 신고한다.** 숫자를 믿기 전에 봐라:

```bash
lifetract status | jq '.database | {last_time_block, stale_days, warnings}'
```

`warnings` 가 비어 있지 않으면 **폰 export 가 멈춘 것**이다. **적은 숫자가 나오는 게
"그날 아무것도 안 했다"는 뜻이 아니다.**

**5. 잃음도 스스로 신고하고, 잃은 DB 는 승격되지 않는다.**

```bash
lifetract import --exec | jq '{status, warnings, candidate_path}'
```

`status` 가 `ok` 가 아니면 스트림 하나가 죽은 것이다. 그리고 그때 **운영 DB 는 그대로
남는다** — import 는 후보(`lifetract.db.candidate`)에 짓고 성한 run 만 원자적으로
갈아끼운다. `candidate_path` 가 있으면 그 run 은 **승격되지 않았고**, 조회는 여전히
직전의 성한 DB 를 읽는다. 잃었다고 말하면서 잃은 DB 를 넘겨주면 그 경고는 묘비명이다.

**도구가 조용하다고 데이터가 온전한 것이 아니었다** — 그래서 이제 도구가 먼저 말한다.

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

## Data Coverage (DB snapshot 2026-07-14, Samsung CSV → 2026-07-13)

| Source | Period | Rows |
|--------|--------|------|
| Samsung Health sleep | 2017-03 ~ 2026-07 | 4,737 |
| Samsung Health sleep_stage | 2017-03 ~ 2026-07 | 85,103 |
| Samsung Health heart rate | 2017-05 ~ 2026-07 | 64,555 |
| Samsung Health steps_daily | 2017-03 ~ 2026-07 | 3,387 |
| Samsung Health stress | 2017-03 ~ 2026-07 | 27,598 |
| Samsung Health exercise | 2017-03 ~ 2026-07 | 2,199 |
| Samsung Health weight | — | 285 |
| Samsung Health HRV | 2017 ~ 2025 | 1,058 (S26 이후 0건) |
| aTimeLogger | 2021-10 ~ 2026-07 | 14,617 intervals (18 categories) |
| Home Assistant REST | live (recorder 30일 보관) | 24 sensor (phase 7 read-only fallback 활성) |

합계 **203,539 rows**. **이 표는 손으로 관리하는 낡는 숫자다** — 믿기 전에 `lifetract status`
를 봐라 (`stale_days`, `warnings`). Samsung CSV 가 본 SSOT 이고 사람이 폰에서 주기적으로
내보내야 흐른다. 오늘 자리 라이브는 `ha` 커맨드 + `today`/`read <오늘>` 의 자동 HA fallback.

## Related Skills

| Skill | 연계 |
|-------|------|
| **denotecli** | 같은 Denote ID 축 — 노트/저널 |
| **gogcli** | Google Calendar — 같은 날짜의 일정 |
| **bibcli** | 참고문헌 — 저널 엔트리에 연결 |
