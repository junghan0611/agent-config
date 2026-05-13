---
name: voscli
description: "회사 VOC 분석 워크벤치 — voscli CLI 의 v0.2 traceability 파이프라인 (normalize → export-sessions → evidence-lookup → analyze --accept → apply-summary → aggregate-chats → report --aggregate). 막연한 질문을 raw 전체가 아니라 명령 몇 번으로 답한다. 'voc', 'VOC 리포트', 'voscli', '상담 분석', '원민재 리포트', 'v0.1 closeout', 'v0.2 traceability', 'export-sessions', 'evidence-lookup', 'apply-summary', 'aggregate-chats', 'finding hypotheses', 'agent-helpfulness', '5/4 폭증'."
---

# voscli — VOC Analysis Skill (v0.2)

Thin surface for `~/repos/work/voscli`. voscli 는 분석 SSOT — 본 스킬은 CLI 호출 + agent-result EDN / summary EDN 작성을 안내한다. 도메인 로직은 voscli repo 안.

핵심 원칙:

> **raw 전체를 컨텍스트에 붓지 말고, 명령으로 증거를 좁히고 추론한다.**

## API

| Task | Command / Action | Notes |
|------|------------------|-------|
| go repo | `cd ~/repos/work/voscli` | repo 루트에서 실행 |
| tests | `clj -M:test` | baseline: 112 tests / 364 assertions |
| 1) normalize | `./run.sh normalize ...` | raw chat.edn → sessions.edn + provenance.edn |
| 2) export-sessions | `./run.sh export-sessions ...` | sessions.edn → `chat-sessions/<id>.edn` × N + `_index.edn` (v0.2a) |
| 3) evidence-lookup | `./run.sh evidence-lookup ...` | `_index.edn` 필터 + 본문 evidence 회수 (v0.2b) |
| 4) analyze pack | `./run.sh analyze --in ... --out-dir ...` | LLM 미호출 evidence pack (v0.1b) |
| 5) accept | `./run.sh analyze --accept --result ... --schema-out ...` | agent-result EDN validate (v0.2c finding shape) |
| 6) apply-summary | `./run.sh apply-summary --chat ... --summary ...` | agent summary EDN → chat-session in-place (v0.2d) |
| 7) aggregate-chats | `./run.sh aggregate-chats --chat-dir ...` | chat-sessions → `_aggregate.edn` (v0.2d) |
| 8) report | `./run.sh report --ops ... --product ... --provenance ... --aggregate ... --out ...` | Markdown + sidecar |
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

# 8) report (--aggregate 주면 본문에 📊 분포 + 🧭 chat-id trace 섹션 추가)
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

## v0.2 Policy Decisions (확정)

- **다중일자 chat 정책 = 시작일 귀속** (`:chat/started-at` 의 date 가 그 chat 의 단일 day). `:chat/date-set` 은 sidecar 정보로 보존. `aggregate-chats` 의 `:aggregate/policy {:multi-day/assignment :started-at}` 에 박힘.
- **canonical unit** = `:chat-session` (dedup 후 distinct chatId).
- **라벨 출처** = `:llm` (v0.1 결정 — 사실로 단정하지 않음).
- **private 정책** = 본문 외부 인용 금지. internal evidence 표시만.
- v0.2 미확정 → v0.3 흡수: 운영시간 마스킹 기본값 / baseline 정의 / anomaly threshold / 외부 신호 (휴일 캘린더 / 릴리즈 일정) 연결.

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

## Current Direction

v0.0/v0.1/v0.2a/b/c/d 완료. v0.2e 1·2회차 smoke 통과. **본 skill 은 bootstrap** — v0.7 정식 패키지 아님.

다음 v0.3 (**미구현**): baseline/compare day/week, anomaly threshold, 운영시간 마스킹 기본값, 외부 신호 (휴일 캘린더 / 릴리즈 일정 / Metabase) 연결. v0.2e 2회차 smoke 가 v0.3 의 가치 제안을 직접 입증.

References in voscli:

- `README.md` / `ROADMAP.md` / `NEXT.md` (SSOT)
- `ops/reviews/2026-05-13-v0.1-closeout.md`
- `ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md` (1회차)
- `ops/reviews/2026-05-13-v0.2e-5_4-burst-smoke.md` (2회차)
- `ops/2026-05-13-csdashboard-postmortem.md`
