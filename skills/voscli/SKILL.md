---
name: voscli
description: "회사 VOC 분석 워크벤치 — voscli CLI 의 v0.3 baseline/compare/anomaly 파이프라인 (normalize → export-sessions → evidence-lookup → analyze --accept → apply-summary → aggregate-chats → compare day → report --aggregate). 막연한 질문을 raw 전체가 아니라 명령 몇 번으로 답한다. 'voc', 'VOC 리포트', 'voscli', '상담 분석', '원민재 리포트', 'v0.1 closeout', 'v0.2 traceability', 'v0.3 baseline', 'export-sessions', 'evidence-lookup', 'apply-summary', 'aggregate-chats', 'compare day', 'anomaly threshold', 'operating-hours', 'day-kind', 'finding hypotheses', 'agent-helpfulness', '5/4 폭증'."
---

# voscli — VOC Analysis Skill (v0.3)

Thin surface for `~/repos/work/voscli`. voscli 는 분석 SSOT — 본 스킬은 CLI 호출 + agent-result EDN / summary EDN 작성을 안내한다. 도메인 로직은 voscli repo 안.

핵심 원칙:

> **raw 전체를 컨텍스트에 붓지 말고, 명령으로 증거를 좁히고 추론한다.**

## API

| Task | Command / Action | Notes |
|------|------------------|-------|
| go repo | `cd ~/repos/work/voscli` | repo 루트에서 실행 |
| tests | `clj -M:test` | baseline: 132 tests / 486 assertions |
| 1) normalize | `./run.sh normalize ...` | raw chat.edn → sessions.edn + provenance.edn |
| 2) export-sessions | `./run.sh export-sessions ...` | sessions.edn → `chat-sessions/<id>.edn` × N + `_index.edn` (v0.2a) |
| 3) evidence-lookup | `./run.sh evidence-lookup ...` | `_index.edn` 필터 + 본문 evidence 회수 (v0.2b) |
| 4) analyze pack | `./run.sh analyze --in ... --out-dir ...` | LLM 미호출 evidence pack (v0.1b) |
| 5) accept | `./run.sh analyze --accept --result ... --schema-out ...` | agent-result EDN validate (v0.2c finding shape) |
| 6) apply-summary | `./run.sh apply-summary --chat ... --summary ...` | agent summary EDN → chat-session in-place (v0.2d) |
| 7) aggregate-chats | `./run.sh aggregate-chats --chat-dir ...` | chat-sessions → `_aggregate.edn`. v0.3c: 운영시간 마스킹 분기 + day-kind 박힘 |
| 8) compare day | `./run.sh compare day --aggregate ... --base-date ... --new-date ...` | aggregate EDN → compare EDN. v0.3a/b/c (notable/newly/anomaly/operating-hours-only) |
| 9) report | `./run.sh report --ops ... --product ... --provenance ... --aggregate ... --out ...` | Markdown + sidecar |
| review memo | write `ops/reviews/YYYY-MM-DD-*.md` | 가치판단 / 한계 / 다음 액션 |

`data/derived/` 는 ignored — 항상 stale 로 간주, fresh regenerate.

## v0.2 Traceability Pipeline (full)

```bash
cd ~/repos/work/voscli

# 1) raw → ChatSession + provenance
./run.sh normalize --in data/raw/chat.edn --out data/derived/sessions.edn \
  --provenance data/derived/provenance.edn \
  --external-comparisons ops/inputs/external-comparisons-2026-05-04.edn

# 2) sessions → 1상담=1.edn + _index.edn (v0.2a)
./run.sh export-sessions --in data/derived/sessions.edn \
  --out-dir data/derived/chat-sessions

# 3) (선택) _index 로 카테고리 회수 + 본문 evidence (v0.2b)
./run.sh evidence-lookup \
  --index data/derived/chat-sessions/_index.edn \
  --chat-dir data/derived/chat-sessions \
  --by-product P_음식물처리기 \
  --keyword 12시간 --keyword 가열 --keyword 회전 --keyword 온도센서 \
  --out data/derived/chat-sessions/_evidence-음식물처리기.edn

# 4) evidence pack (LLM 미호출)
./run.sh analyze --in data/derived/sessions.edn \
  --provenance data/derived/provenance.edn \
  --out-dir data/derived/analyze

# 5) agent 가 agent-result-{ops,product}.edn 작성 (v0.2c shape) → accept
./run.sh analyze --accept --result data/derived/analyze/agent-result-ops.edn \
  --schema-out data/derived/analyze/validated-ops.edn
./run.sh analyze --accept --result data/derived/analyze/agent-result-product.edn \
  --schema-out data/derived/analyze/validated-product.edn

# 6) (선택, v0.2d) agent 가 chat-session summary 작성 → apply
./run.sh apply-summary \
  --chat data/derived/chat-sessions/<chat-id>.edn \
  --summary <agent-summary-edn-path>

# 7) (v0.2d) chat-sessions 집계 → _aggregate.edn
./run.sh aggregate-chats --chat-dir data/derived/chat-sessions

# 8) (v0.3) compare day — aggregate 안 두 날짜를 비교, compare EDN 산출
./run.sh compare day \
  --aggregate data/derived/chat-sessions/_aggregate.edn \
  --base-date 2026-05-03 \
  --new-date 2026-05-04 \
  --out data/derived/compare/2026-05-03-0504.edn
# 운영시간만 비교하려면 (v0.3c):
./run.sh compare day \
  --aggregate data/derived/chat-sessions/_aggregate.edn \
  --base-date 2026-05-03 --new-date 2026-05-04 \
  --operating-hours-only \
  --out data/derived/compare/2026-05-03-0504-ohs.edn
# anomaly threshold 조정 (v0.3b, default 3.0x / 20):
./run.sh compare day --aggregate ... --base-date ... --new-date ... \
  --ratio-threshold 5.0 --delta-threshold 50 --out ...

# 9) report (--aggregate 주면 본문에 📊 분포 + 🧭 chat-id trace 섹션 추가)
./run.sh report \
  --ops data/derived/analyze/validated-ops.edn \
  --product data/derived/analyze/validated-product.edn \
  --provenance data/derived/provenance.edn \
  --aggregate data/derived/chat-sessions/_aggregate.edn \
  --out data/derived/report/2026-05-04.md \
  --sidecar data/derived/report/2026-05-04.provenance.edn
```

## evidence-lookup 필터

| Flag | 의미 |
|------|------|
| `--by-product P` | chat 의 `:chat/products` 매칭 (반복) |
| `--by-topic T`   | chat 의 `:chat/topics` 매칭 (반복) |
| `--chat-id ID`   | 특정 chat 만 (반복) |
| `--keyword K`    | message text 매칭 (반복, OR) |
| `--person-type T` | default `user`. `manager` / `bot` 명시 가능 (반복) |
| `--include-private` | private message 도 회수, 본문은 `[private — masked]` |
| `--limit N` / `--out PATH` | smoke / EDN 저장 |

chat-level (product/topic/chat-id) 은 **union**. message-level (keyword/person-type/private) 은 통과 조건.

## Summary EDN Contract (v0.2d, apply-summary 입력)

agent 가 chat-session 단위로 작성. **`:summary/*` 만**, `:chat/*` 키 들어가면 거부 (raw 오염 방지).

```clojure
{:summary/created-by :agent              ; :agent | :human | nil
 :summary/model      "claude-opus-4-7"   ; provider/model id, agent skill 표면
 :summary/title      "한 줄 제목"
 :summary/text       "1차 요약 본문 — manager/user 발화 흐름 + 핵심 갭"
 :summary/hypotheses [{:hypothesis/text "..." :hypothesis/source :llm :hypothesis/confidence :med}]
 :summary/actions    [{:action/text "..." :action/team "QC"}]
 :summary/private-evidence-used? false}   ; private memo 를 추론 근거로 썼는가 (외부 인용은 금지)
```

Rules:

- title / text / hypotheses / actions **중 하나 이상 의미 있게** 채워야 함 (empty 거부).
- `apply-summary` 가 raw 영역(`:chat/raw`) 무손실 + `:chat/summary` 만 갱신 + `:chat/summary-applied-at` / `:chat/summary-version` 메타 박음.

## Compare EDN Contract (v0.3a/b/c, `compare day` 출력 — agent 읽기용)

agent 가 작성하는 게 아니라 voscli 가 산출하고 agent 가 운영팀 표면으로 옮길 때
읽는 EDN. 5/14 운영팀 컨슈머 smoke 의 1:1 사상 흐름 그대로.

```clojure
{:compare/version "v0.3c"
 :compare/at      "2026-05-14T02:51:00Z"
 :compare/kind    :day
 :compare/source  {:aggregate ".../aggregate.edn"
                   :base-date "2026-05-03"
                   :new-date  "2026-05-04"}
 :compare/scope   {:operating-hours-only? false}  ; v0.3c
 :compare/days    {:base {:day/date "2026-05-03" :day/kind :weekend
                          :day/day-of-week :sunday :day/holiday-name nil}
                   :new  {:day/date "2026-05-04" :day/kind :weekday
                          :day/day-of-week :monday :day/holiday-name nil}}

 ;; totals / ratios — v0.3a 본체
 :compare/totals       {:sessions {:base 41 :new 197 :delta 156 :ratio 4.80 :pct-change 380.5}
                        :messages {:base 290 :new 1530 :delta 1240 :ratio 5.28 :pct-change 427.6}
                        :private  ... :cs-sharing ... :multi-day ...}
 :compare/ratios       {:private-ratio    {:base 0.041 :new 0.050 :delta 0.009 :delta-pp 0.9}
                        :cs-sharing-ratio ...}
 :compare/per-session  {:messages   {:base 7.07 :new 7.77 :delta 0.69 :ratio 1.10}
                        :private    ... :cs-sharing ...}

 ;; dimension delta — v0.3a
 :compare/messages-by-{person-type,hour,product,topic} [...]
 :compare/joint-messages [{:joint/product :joint/topic :base :new :delta :ratio :pct-change}]

 ;; 승격 — v0.3a top-N + zero-baseline 분리
 :compare/notable-deltas
 {:by-ratio [{:dimension :topic :key "T_동작,제어이상" :base 9 :new 264
              :delta 255 :ratio 29.33}
             ...top 5]
  :by-delta [...top 5]}
 :compare/newly-observed
 [{:dimension :product :key "P_홈카메라(미구분)" :base 0 :new 147 :delta 147 :ratio nil}
  ...]

 ;; threshold flagging — v0.3b
 :compare/anomalies
 {:anomaly/version       "v0.3c"
  :anomaly/thresholds    {:ratio-threshold 3.0 :delta-threshold 20}
  :anomaly/rule          "ratio >= ratio-threshold AND delta >= delta-threshold; base > 0"
  :anomaly/flagged       [{:dimension :topic :key "..." :base :new :delta :ratio} ...]
  :anomaly/flagged-count 11
  :anomaly/newly-flagged [{:dimension :product :key "..." :base 0 :new :delta} ...]
  :anomaly/newly-flagged-count 23}

 :compare/limits []}
```

Rules — agent 가 컨슈머 표면 만들 때:

- `:compare/notable-deltas` 와 `:compare/anomalies` 를 함께 본다. 전자는 항상 top-5, 후자는 룰 통과 항목 전부.
- `:compare/days` 의 `:day/kind` 가 base 와 new 다르면 baseline 오염 경고 (예: weekend ↔ weekday).
- `:compare/scope :operating-hours-only?` 가 true 인 EDN 이면 야간 baseline 노이즈가 제거된 결과 — full-day 와 같이 보면 baseline 효과가 분해됨.
- zero-baseline (`:compare/newly-observed` / `:anomaly/newly-flagged`) 항목은 ratio 미정의이므로 "신규" 로 표면화 — "∞배" 표기 금지.
- raw delta 음수도 의미: 줄어든 항목이 abnormal 일 수 있음 (예: 응대량 급감).

## Result EDN Contract (v0.2c, analyze --accept 입력)

finding 안 3축 확장:

```clojure
{:analysis/persona :ops ; or :product
 :analysis/date    "2026-04-30~2026-05-04"
 :analysis/summary ["..."]
 :analysis/findings
 [{:finding/title           "음식물처리기 장시간 가동 호소 (사용성 갭 vs 실제 결함)"
   :finding/source-chat-ids ["..."]
   :finding/source          :rawmention            ; required: :llm | :rule | :rawmention
   :finding/confidence      :med                   ; recommended: :low | :med | :high
   :finding/priority        :high                  ; optional, only :high

   ;; (v0.2c) evidence — string vector(v0.1 호환) 또는 object vector. mixed OK.
   :finding/evidence
   [{:evidence/text         "12시간이 넘어도 계속 가열중"
     :evidence/chat-id      "69f7e3e07b74d9d42f56"
     :evidence/at           "2026-05-04T13:34:44+09:00"
     :evidence/person-type  :user
     :evidence/source       :rawmention
     :evidence/private?     false
     :evidence/keyword-hits ["12시간" "가열"]}]

   ;; (v0.2c 신규) 분기 가설 1급 — 평면 텍스트로 evidence 에 섞지 말 것.
   :finding/hypotheses
   [{:hypothesis/text             "사용성 갭 — 정상 동작 시간이 user 기대보다 김"
     :hypothesis/source           :llm
     :hypothesis/confidence       :med
     :hypothesis/source-chat-ids  ["..."]}
    {:hypothesis/text             "실제 결함 — 온도센서 회귀 / 회전 모터 이상"
     :hypothesis/source           :llm
     :hypothesis/confidence       :med
     :hypothesis/source-chat-ids  ["..."]}]

   ;; (v0.2c 신규) 가설 → 팀 매핑. :from-hypothesis = hypotheses 0-based 인덱스.
   :finding/actions
   [{:action/text             "사용 전 안내 강화: '최대 20시간 정상' 명시"
     :action/team             "기획"
     :action/from-hypothesis  0
     :action/source-chat-ids  ["..."]}
    {:action/text             "온도센서 로트 회귀 검증"
     :action/team             "QC"
     :action/from-hypothesis  1
     :action/source-chat-ids  ["..."]}]}]
 :analysis/assumptions ["..."]
 :analysis/limits      ["..."]}
```

Rules:

- `:finding/source` 는 필수. `confidence` 강하게 권장.
- 보안/안전/프라이버시 이슈는 `:finding/priority :high` 의식적으로.
- private manager memo 는 보존하되 report 본문에 직접 인용 금지.
- evidence-lookup 출력의 evidence 항목을 그대로 `:finding/evidence` 에 옮길 수 있다 (object form 호환).
- 한 finding 안에 분기 가설이 있으면 `:finding/hypotheses` 안에 별도 entry. 평면 텍스트로 evidence 에 섞지 말 것.
- 액션이 어느 가설에서 나왔는지 `:action/from-hypothesis` 인덱스로 명시. validate 가 hypotheses 길이 cross-check (범위 초과 거부).
- `source-chat-ids` 가 비어 있으면 그 공백 자체가 traceability 갭 — 이유를 limits 에 적기.

## v0.2 / v0.3 Policy Decisions (확정)

### v0.2 baseline (유지)

- **다중일자 chat 정책 = 시작일 귀속** (`:chat/started-at` 의 date 가 그 chat 의 단일 day). `:chat/date-set` 은 sidecar 정보로 보존. `aggregate-chats` 의 `:aggregate/policy {:multi-day/assignment :started-at}` 에 박힘.
- **canonical unit** = `:chat-session` (dedup 후 distinct chatId).
- **라벨 출처** = `:llm` (v0.1 결정 — 사실로 단정하지 않음).
- **private 정책** = 본문 외부 인용 금지. internal evidence 표시만.

### v0.3 신규 (확정)

- **운영시간 기본값** = `[10, 18)` (KST, end exclusive). `aggregate-chats` 가 `:daily/operating-hours-only` 분기를 항상 산출 (기본). `--no-operating-hours` 로 끄거나 `--operating-hours-start/end` 로 override.
- **anomaly threshold 기본값** = `{:ratio-threshold 3.0 :delta-threshold 20}`. 두 조건 AND. zero-baseline 은 delta 만으로 `:newly-flagged` 분리.
- **day-kind 분류** = `:holiday` > `:weekend` > `:weekday`. `voscli.calendar` 의 한국 휴일 2025~2027 hard-code (외부 캘린더 의존 없음).
- **baseline 매칭 정책 보류** — 평일↔평일 / 휴일↔휴일 매칭은 분류만 박고 정책 결정은 [v0.5 signal](#) 트랙. 현재 보유 데이터 (휴일 1건 = 5/3) 로 검증 불가.

### v0.3 → 이후 이행

- **외부 신호 align (앱/펌웨어 릴리즈, Metabase)** → v0.5 signal (구 v0.3d 폐기).
- **`compare week`** → 평일 baseline 분포 부족, 데이터 누적 후 합류.
- **분포 기반 anomaly (z-score / 분위수)** → v0.4 anomaly 본류 (v0.3b 단일 비교 룰 위에 얹음).

## agent-helpfulness smoke (v0.2e)

막연한 질문은 raw 부어넣기 대신 voscli 명령으로 좁힌다. 결과 메모(`ops/reviews/YYYY-MM-DD-*.md`)에 반드시:

1. **사용한 명령** — chronological
2. **회수한 chatIds + evidence** — chat-id 1급 추적
3. **추론한 답** — 단일 결론 강요 X. 가설이 분기되면 분기로.
4. **아직 모르는 것** — 다음 사이클 입력

### 1회차 사례 — "음식물처리기 이슈가 왜 위험한가?" (압축비 ≈ 1:250)

```bash
# 1) _index 로 카테고리 회수
# 2) user 측 안전 키워드 evidence
./run.sh evidence-lookup --by-product P_음식물처리기 \
  --keyword 12시간 --keyword 가열 --keyword 회전 --keyword 온도센서
# 3) manager 측 응답 + private cross-check
./run.sh evidence-lookup --by-product P_음식물처리기 \
  --person-type manager --include-private \
  --keyword AS --keyword 교환 --keyword 안전
```

결과: 단일 "위험" 카테고리가 manager evidence cross-check 로 **"사용성 갭 + 실제 결함" 두 범주 분기** 됨. 메모: [`ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md`](../../../work/voscli/ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md).

### 2회차 사례 — "5/4 폭증의 원인 추정" (v0.2d aggregate 활용)

```bash
# 1) aggregate.edn 의 시작일별 분포 + product/topic by-day 분해
# 2) _index 위에서 5/4 시작 chat 의 product/topic + multi-day 검증
# 3) 5/4 manager 측 폭증 인지 멘트 추출
./run.sh evidence-lookup --chat-id ... --person-type manager \
  --keyword "금일 문의량" --keyword "순차적으로 안내" --keyword "양해 부탁"
```

결과: T_동작,제어이상 5.2x (압도) + multi-day=0 + manager 폭증 매크로 10+ chat → 3분기 가설 (휴일효과 / 외부이벤트 / 운영처리량). **v0.3 baseline/compare 의 가치 제안 직접 입증** — 손으로 한 배율 계산을 v0.3 가 `compare day` 로 자동화. 메모: [`ops/reviews/2026-05-13-v0.2e-5_4-burst-smoke.md`](../../../work/voscli/ops/reviews/2026-05-13-v0.2e-5_4-burst-smoke.md).

### 3회차 사례 — v0.3 운영팀 컨슈머 표면 (담당자 분신)

```bash
# 1) compare day 로 EDN 산출 (운영팀 담당자 분신이 그대로 받음)
./run.sh compare day --aggregate ... --base-date 2026-05-03 --new-date 2026-05-04 \
  --out compare-2026-05-03-0504.edn
# 2) 운영시간 분기도 같이 (5/14 baseline 오염 갭 검증)
./run.sh compare day --aggregate ... --base-date 2026-05-03 --new-date 2026-05-04 \
  --operating-hours-only --out compare-2026-05-03-0504-ohs.edn
# 3) 담당자 분신이 EDN 의 notable-deltas / anomalies / newly-observed / days 를 운영팀 표면으로 옮김.
```

결과: v0.3a notable 5 + v0.3b anomalies 11 flagged + 23 newly-flagged + v0.3c day-kind 명시 (weekend↔weekday) → Sonnet 담당자 분신이 운영팀 표 + 추론 힌트로 변환. csdashboard 회고의 "분석 SSOT 만 책임지고 표면은 분리" 원칙 그대로. 메모: [`ops/reviews/2026-05-14-v0.3a-ops-consumer-smoke.md`](../../../work/voscli/ops/reviews/2026-05-14-v0.3a-ops-consumer-smoke.md).

## Current Direction

v0.0 / v0.1 / v0.2 / v0.3 완료 (2026-05-14). v0.2e 1·2회차 + v0.3a 운영팀 컨슈머 smoke 통과. **본 skill 은 bootstrap** — v0.7 정식 패키지 아님.

다음 v0.4 (**미구현**): 분포 기반 anomaly (z-score / 분위수 / 룰 혼합). v0.3b 의 단일 비교 threshold 위에 평균/표준편차 분포 anomaly 얹음. v0.3c 가 박은 운영시간 마스킹 + day-kind 분류가 분포 안정화의 토양.

v0.5 signal — 외부 운영 신호 결합 (Metabase / 앱·펌웨어 릴리즈 / 사내 공지 / 휴일 baseline 매칭). 구 v0.3d 흡수.

데이터 인입 자동화 (별도 트랙) — v0.3 close 후. 운영팀 시트 분류 흐름 유지 / 채널톡 API 직접 호출 / Airbyte 안 씀 / 분류기 자체화 안 함. voscli 본체 흡수 금지.

References in voscli:

- `README.md` / `ROADMAP.md` / `NEXT.md` (SSOT)
- `ops/reviews/2026-05-13-v0.1-closeout.md`
- `ops/reviews/2026-05-13-v0.2-closeout.md`
- `ops/reviews/2026-05-14-v0.3-closeout.md`
- `ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md` (1회차)
- `ops/reviews/2026-05-13-v0.2e-5_4-burst-smoke.md` (2회차)
- `ops/reviews/2026-05-14-v0.3a-ops-consumer-smoke.md` (3회차)
- `ops/2026-05-13-csdashboard-postmortem.md`
