---
name: voscli
description: "회사 VOC 분석 워크벤치 — voscli CLI 의 v0.2 traceability 파이프라인 (normalize → export-sessions → evidence-lookup → analyze --accept → report). 막연한 질문을 raw 전체가 아니라 명령 몇 번으로 답한다. 'voc', 'VOC 리포트', 'voscli', '상담 분석', '원민재 리포트', 'v0.1 closeout', 'v0.2 traceability', 'export-sessions', 'evidence-lookup', 'finding hypotheses', 'agent-helpfulness'."
---

# voscli — VOC Analysis Skill (v0.2)

Thin surface for `~/repos/work/voscli`. voscli 는 분석 SSOT — 본 스킬은 CLI 호출 + agent-result EDN 작성을 안내한다. 도메인 로직은 voscli repo 안.

핵심 원칙:

> **raw 전체를 컨텍스트에 붓지 말고, 명령으로 증거를 좁히고 추론한다.**

## API

| Task | Command / Action | Notes |
|------|------------------|-------|
| go repo | `cd ~/repos/work/voscli` | repo 루트에서 실행 |
| tests | `clj -M:test` | baseline: 96 tests / 317 assertions |
| 1) normalize | `./run.sh normalize ...` | raw chat.edn → sessions.edn + provenance.edn |
| 2) export-sessions | `./run.sh export-sessions ...` | sessions.edn → `chat-sessions/<id>.edn` × N + `_index.edn` (v0.2a) |
| 3) evidence-lookup | `./run.sh evidence-lookup ...` | `_index.edn` 필터 + 본문 evidence 회수 (v0.2b) |
| 4) analyze pack | `./run.sh analyze --in ... --out-dir ...` | LLM 미호출 evidence pack (v0.1b) |
| 5) accept | `./run.sh analyze --accept --result ... --schema-out ...` | agent-result EDN validate |
| 6) report | `./run.sh report --ops ... --product ... --provenance ... --out ... --sidecar ...` | Markdown + sidecar |
| review memo | write `ops/reviews/YYYY-MM-DD-*.md` | 가치판단 / 한계 / 다음 액션 |

`data/derived/` 는 ignored — 항상 stale 로 간주, fresh regenerate.

## v0.2 Traceability Pipeline

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

# 5) agent 가 agent-result-{ops,product}.edn 작성 → accept
./run.sh analyze --accept --result data/derived/analyze/agent-result-ops.edn \
  --schema-out data/derived/analyze/validated-ops.edn
./run.sh analyze --accept --result data/derived/analyze/agent-result-product.edn \
  --schema-out data/derived/analyze/validated-product.edn

# 6) report
./run.sh report \
  --ops data/derived/analyze/validated-ops.edn \
  --product data/derived/analyze/validated-product.edn \
  --provenance data/derived/provenance.edn \
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

## Result EDN Contract (v0.2c)

`analyze --accept` 에 넘기는 EDN — finding 안 3축 확장:

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

## agent-helpfulness smoke (v0.2e)

막연한 질문은 raw 부어넣기 대신 voscli 명령으로 좁힌다. 결과 메모(`ops/reviews/YYYY-MM-DD-*.md`)에 반드시:

1. **사용한 명령** — chronological
2. **회수한 chatIds + evidence** — chat-id 1급 추적
3. **추론한 답** — 단일 결론 강요 X. 가설이 분기되면 분기로.
4. **아직 모르는 것** — 다음 사이클 입력

샘플 workflow (1회차: "음식물처리기 이슈가 왜 위험한가?"):

```bash
# 1) _index 로 카테고리 회수
clj -M -e '(filter #(some #{"P_음식물처리기"} (:chat/products %))
                   (:export/chats (clojure.edn/read-string
                     (slurp "data/derived/chat-sessions/_index.edn"))))'

# 2) user 측 안전 키워드 evidence
./run.sh evidence-lookup --by-product P_음식물처리기 \
  --keyword 12시간 --keyword 가열 --keyword 회전 --keyword 온도센서 ...

# 3) manager 측 응답 + private (cross-check 용 — internal evidence)
./run.sh evidence-lookup --by-product P_음식물처리기 \
  --person-type manager --include-private \
  --keyword AS --keyword 교환 --keyword 안전 ...
```

1회차 사례: 단일 "위험" 카테고리가 manager evidence cross-check 로 **"사용성 갭 + 실제 결함" 두 범주 분기** 됨. 컨텍스트 압축비 ≈ 1:250 (raw 1.6MB → evidence EDN 6KB). 참고 메모: [`ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md`](../../../work/voscli/ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md).

## Current Direction

v0.0/v0.1/v0.2a/v0.2b/v0.2c 완료. v0.2e 1회차 통과. **본 skill 은 bootstrap** — v0.7 정식 패키지 아님.

다음 v0.2d (**미구현**): chat-session `:chat/summary` placeholder 채우기 + 제품 × 문의유형 joint distribution + report 본문 chat-id trace 섹션. v0.2e 2회차 후보: "5/4 폭증의 원인 추정".

References in voscli:

- `README.md` / `ROADMAP.md` / `NEXT.md` (SSOT)
- `ops/reviews/2026-05-13-v0.1-closeout.md`
- `ops/reviews/2026-05-13-v0.2e-agent-helpfulness-smoke.md`
- `ops/2026-05-13-csdashboard-postmortem.md`
