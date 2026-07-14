---
name: lifetract
description: "Query personal life-tracking data: Samsung Health (sleep, steps, heart rate, stress, exercise, weight) + aTimeLogger (18 time categories) + Home Assistant REST (live sensors via ha.junghanacs.com). All records use Denote IDs (YYYYMMDDTHHMMSS) for cross-referencing with denotecli. DB mode (lifetract.db) for instant queries, individual Samsung commands have CSV fallback, and today's DB gaps can use Home Assistant."
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
lifetract.db 있음 → 모든 명령: DB 쿼리 (~90ms) → JSON
lifetract.db 없음 → sleep/steps/heart/stress/exercise: CSV 파싱 (~300ms) → JSON
                  → time/timeline/today/read:          exit 1
```

- `lifetract import --exec` 실행 후 모든 조회가 DB 모드
- DB 없으면 개별 Samsung 명령(`sleep`/`steps`/`heart`/`stress`/`exercise`)만 CSV 직접 파싱
- `time`과 시간축을 합치는 `timeline`/`today`/`read`는 DB가 없으면 **exit 1** — aTimeLogger를 못 읽은 구멍을 0으로 내보내지 않는다

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
    "stale_days": 1, "freshness_checked": true, "warnings": []
  }
}
```

**`last_*` / `stale_days` / `warnings` 가 이 명령의 요점이다.** Samsung export 는 사람이
폰에서 손으로 내보내야 흐른다 — 안 넣어주면 조용히 낡는다. 숫자를 저널에 사실로 박기
전에 여기부터 봐라 (§시간 계약 4항).

**`warnings: []` 는 `freshness_checked: true` 일 때만 "성하다"는 뜻이다.** DB 가 없거나
검사 자체가 실패하면 `freshness_checked: false` 이고, 그때의 빈 목록은 "이상 없음"이 아니라
**"보지 않았음"** 이다. 검사하지 않은 것이 합격으로 보이면 그건 검사가 아니다.

### import — DB 생성

```bash
lifetract import                    # dry-run: 매니페스트 확인
lifetract import --exec             # 실행: CSV+aTimeLogger → lifetract.db
```

202,479 rows, ~38MB, ~2s. Active tables: sleep, sleep_stage, heart_rate, steps_daily,
stress, exercise, weight, atl_category, atl_interval. HRV는 은퇴했다: Samsung export 1,058행에
`rmssd`가 없고 `binning_data`만 있어, 예전 importer가 전부 `0.0`으로 넣던 빈 껍데기였다.

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

**`rows` 는 DB 에 실제로 앉은 행수다** — 우리가 건넨 행수가 아니라. 예전엔 `INSERT` 결과를
안 보고 세서, DB 가 거부한 행도 "imported" 로 원장에 박혔다. **손실 가드가 그 가짜 숫자를
기준으로 삼고 있었다.**

**`rejected` 는 승격을 막지 않지만 반드시 보고된다.** 재본 적 없는 시각(1970-01-01 epoch,
2000-01-01)을 실은 행과, Samsung 이 같은 날을 다시 동기화해 최신 개정판으로 대체된 행이다.
조용히 버리는 도구는 조용히 잃는 도구와 같은 침묵이라 매 run 이 이유별 개수를 말한다.
거절은 영구적인 손실 예산이 아니다. 정상 baseline 뒤에는 accepted rows 가 하나라도 줄면
현재 rejected 가 몇 개든 `shrunk` 다. 새 거절 정책은 전수 대조한 명시적 baseline 전환으로만
들어오며, 산술 허용량을 상시 열어두지 않는다.

**경고가 하나라도 있으면 승격되지 않는다 — 첫 import 도 예외가 아니다. 우회 플래그는 없다.**
예전엔 "빈 것만" 막았는데, Samsung 여러 스트림 성공 + aTimeLogger 실패 같은 **부분 성공**은 그대로
운영 DB 가 됐다. 그 순간 "못 봤다"를 말할 에러 경로가 사라진다 — DB 가 있으니 이후로는 그냥
`[]` 다. **불완전한 DB 는 운영 자리에 오지 않는다.** 스트림 하나가 빠진 DB 는 그 스트림에
대해 영원히 `[]` 를 답하고, 소비자(관측소)는 그 구멍을 0 으로 기록한다.

**`rows` 옆의 `invalid` 를 봐라.** 파일에 행은 있는데 필수 필드가 없거나 시각·필수 수치가
파싱 안 되는 행 수다. Samsung 이 헤더 하나만 개명하거나 숫자 자리에 garbage를 넣어도 예전엔
`empty` 또는 측정값 0으로 보였다 (첫 import 는 baseline 이 없어 경고조차 없었다).
**`invalid > 0` 이면 승격이 막힌다.** 빈 선택 필드는 0으로 둘 수 있지만, 값이 있는데 읽히지
않는 것은 0이 아니다.

**`atl_category` 는 독립 스트림이다.** `time` 조회는 카테고리를 INNER JOIN 하므로,
카테고리가 사라지면 블록 수가 그대로여도 **시간축이 전멸한다.** 예전 원장은 interval 만
세서 이 손실을 못 봤다 (`status: ok`, `warnings: []`, time 30일 → 0). 세지 않는 스트림은
잃어도 모른다. 고아 블록(없는 카테고리를 가리키는 블록) 검사도 함께 돈다.

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

**자동 HA fallback (오늘 자리에 한정)**: DB 가 오늘 자리를 비웠으면 (Samsung CSV 가 아직 안 들어왔으면) `today` 와 `read <오늘>` 이 자동으로 HA 라이브 값으로 채운다. `source` 가 `"db+ha"` 로 바뀌고, `ha_sources` 가 어떤 필드가 HA 에서 왔는지 알려준다. *과거 날짜는 enrichment 안 됨* — HA recorder 는 backfill 자리가 아니다. 끄려면 `LIFETRACT_NO_HA=1`. Sleep 은 *옛 row 가 오늘로 잡히는 stale* 자리도 감지해서 HA 로 덮어쓴다 (최근 36h 의 sleep_duration history 를 합산 — main sleep + nap 둘 다 잡음).

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

**걸음 수 계약:** `steps_daily` 는 측정일마다 정확히 한 행이다. 날짜는 Samsung의
`day_time` 만 읽으며 `create_time` 으로 대신하지 않는다. `day_time` 은 epoch-ms와
벽시계 문자열 양쪽을 지원하고, 못 읽거나 미래면 invalid로 승격을 막는다. 같은 날의
재동기화 행은 최신 `update_time` 한 건만 남기며, 동시각에 값이 충돌하면 임의로 고르지
않고 invalid다. DB도 날짜 UNIQUE로 같은 불변식을 강제한다.

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

**현재 상태 (phase 7 read-only)**: `cmdToday` / `cmdRead <오늘>` 이 DB miss 또는 stale sleep 자리에서 자동으로 HA `GetState` + `GetHistory` 를 호출해 응답에 채워준다 (`source: "db+ha"`, `ha_sources: [...]`). DB upsert 는 의도적으로 하지 않는다. Samsung export 가 영구 SSOT이고 HA recorder 는 30일 보조면이라, 덜 아는 값을 본 DB에 흡수하지 않는다.

## Flags

| Flag | Default | 설명 |
|------|---------|------|
| `--days N` | 7 | 창 길이 (**무시되지 않는다** — 아래 조합표) |
| `--from YYYY-MM-DD` | — | 창 시작 (포함) |
| `--to YYYY-MM-DD` | — | 창 끝 (**배타적**) |
| `--data-dir DIR` | `~/repos/gh/self-tracking-data` | 데이터 루트 |
| `--shealth-dir DIR` | 최신 자동감지 | Samsung Health 디렉토리 |
| `--summary` | false | 요약 모드 |
| `--category CAT` | 전체 | 시간 카테고리 필터 |
| `--exec` | false | import 실행 모드 |

### 창 조합 — 모든 조합이 뜻을 갖는다

| 조합 | 창 |
|------|-----|
| `--days N` | `[내일-N, 내일)` — **오늘 포함 정확히 N일** (`1`=오늘) |
| `--days N --to T` | `[T-N, T)` — **T 에 끝나는 N일** |
| `--days N --from F` | `[F, F+N)` — **F 에 시작하는 N일** |
| `--from F --to T` | `[F, T)` |
| `--from F` | `[F, 내일)` |
| `--to T` | T 이전 전부 (하한 개방) |
| `--days N --from F --to T` | **에러** (과지정 — 둘만 말해라) |

`--days` 는 예전에 `--from`/`--to` 앞에서 **조용히 죽었다.** `--days 3 --to 2026-07-01`
이 1,701일치를 답하고도 "3일"이라 했다. **틀린 숫자보다 그럴듯한 틀린 숫자가 나쁘다** —
아무도 다시 안 보고, 저널에 사실로 박힌다.

파싱 안 되는 값·오타·중복 플래그는 전부 **exit 1**. `--fro 2026-07-01` 은 조용히 무시되고
기본 7일을 답하고 있었다. 받아놓고 무시하는 플래그는 도구가 조용히 하는 거짓말이다.

DB 모드와 CSV 폴백은 **같은 창에 같은 답**을 낸다 (예전엔 CSV 쪽이 창을 통째로 무시했다).

## 시간 계약 (Time Contract)

에이전트가 이 CLI 의 숫자를 저널·노트에 **사실로 기록**하기 전에 알아야 할 여섯.
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

**6. 빈 것은 `[]` 다. `null` 이 아니다.**

목록을 내는 모든 명령(`sleep` `steps` `heart` `stress` `exercise` `timeline` `time`)은
빈 창에서도 **배열**을 낸다. 그냥 돌려도 된다:

```python
for row in json.loads(out):   # 조용한 날에도 안 터진다
    ...
```

`warnings` 도 같다 — **비어도 키가 사라지지 않는다** (`"warnings": []`). 키의 부재는
"검사했고 아무것도 없었다"가 아니라 "검사한 적 없는 옛 바이너리"와 구별되지 않는다.
영(零)은 답이고, 구멍은 답이 아니다.

**단, 답할 수 없을 때는 빈 배열이 아니라 실패다.** `time` 은 DB 가 없으면 `[]` 가 아니라
**에러 + exit 1** 을 낸다 — "시간을 안 썼다"와 "못 봤다"는 다른 말이고, 같은 모양으로
나가면 안 된다. 창은 비었는데 DB 가 낡아서 그런 것이면 stdout 은 `[]` 를 주고 그 사정은
**stderr** 에 적는다:

```
warning: no aTimeLogger blocks in the requested window;
         DB holds blocks only through 2026-07-13 — run 'lifetract import --exec' …
```

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

## Data Coverage (DB snapshot 2026-07-14; Samsung complete days → 2026-07-13, steps includes 2026-07-14 partial)

| Source | Period | Rows |
|--------|--------|------|
| Samsung Health sleep | 2017-03 ~ 2026-07 | 4,737 |
| Samsung Health sleep_stage | 2017-03 ~ 2026-07 | 85,103 |
| Samsung Health heart rate | 2017-05 ~ 2026-07 | 64,541 |
| Samsung Health steps_daily | 2017-03 ~ 2026-07 | 3,381 |
| Samsung Health stress | 2017-03 ~ 2026-07 | 27,598 |
| Samsung Health exercise | 2017-03 ~ 2026-07 | 2,199 |
| Samsung Health weight | — | 285 |
| aTimeLogger | 2021-10 ~ 2026-07 | 14,617 intervals (18 categories) |
| Home Assistant REST | live (recorder 30일 보관) | 24 sensor (phase 7 read-only fallback 활성) |

합계 **202,479 rows** (HRV 빈 껍데기 1,058행 은퇴, heart sentinel 14행 거부,
`atl_category` 18행 포함). **이 표는 손으로 관리하는 낡는 숫자다** — 믿기 전에 `lifetract status`
를 봐라 (`stale_days`, `warnings`). Samsung CSV 가 본 SSOT 이고 사람이 폰에서 주기적으로
내보내야 흐른다. 오늘 자리 라이브는 `ha` 커맨드 + `today`/`read <오늘>` 의 자동 HA fallback.

## Related Skills

| Skill | 연계 |
|-------|------|
| **denotecli** | 같은 Denote ID 축 — 노트/저널 |
| **gogcli** | Google Calendar — 같은 날짜의 일정 |
| **bibcli** | 참고문헌 — 저널 엔트리에 연결 |
