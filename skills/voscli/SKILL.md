---
name: voscli
description: "회사 VOC 분석 워크벤치 — voscli CLI를 사용해 normalize → analyze pack → agent-result EDN 작성 → accept → report → review 메모까지 수행. 'voc', 'VOC 리포트', 'voscli', '상담 분석', '원민재 리포트', 'v0.1 closeout', 'v0.2 traceability'."
---

# voscli — VOC Analysis Bootstrap Skill

Thin bootstrap surface for `~/repos/work/voscli`. voscli is the analysis SSOT; this skill only wraps the CLI and guides agent-authored EDN results.

## API

| Task | Command / Action | Notes |
|------|------------------|-------|
| go repo | `cd ~/repos/work/voscli` | Always run from repo root |
| tests | `clj -M:test` | Current baseline: 60 tests / 203 assertions |
| regenerate | see "Fresh v0.1 pipeline" below | Treat `data/derived/` as stale; it is ignored |
| accept result | `./run.sh analyze --accept --result data/derived/analyze/agent-result-ops.edn --schema-out data/derived/analyze/validated-ops.edn` | Repeat for product |
| render report | `./run.sh report --ops ... --product ... --provenance data/derived/provenance.edn --out data/derived/report/2026-05-04.md --sidecar data/derived/report/2026-05-04.provenance.edn` | Markdown + sidecar |
| review memo | write `ops/reviews/YYYY-MM-DD-*.md` | Value judgment / limits / next actions |

## Fresh v0.1 Pipeline

```bash
cd ~/repos/work/voscli
./run.sh normalize --in data/raw/chat.edn --out data/derived/sessions.edn \
  --provenance data/derived/provenance.edn \
  --external-comparisons ops/inputs/external-comparisons-2026-05-04.edn
./run.sh analyze --in data/derived/sessions.edn --provenance data/derived/provenance.edn \
  --out-dir data/derived/analyze
```

Then read:

- `data/derived/analyze/ops-pack.edn`
- `data/derived/analyze/product-pack.edn`
- `data/derived/analyze/result-schema.edn`

Create:

- `data/derived/analyze/agent-result-ops.edn`
- `data/derived/analyze/agent-result-product.edn`

Then:

```bash
./run.sh analyze --accept --result data/derived/analyze/agent-result-ops.edn \
  --schema-out data/derived/analyze/validated-ops.edn
./run.sh analyze --accept --result data/derived/analyze/agent-result-product.edn \
  --schema-out data/derived/analyze/validated-product.edn
./run.sh report \
  --ops data/derived/analyze/validated-ops.edn \
  --product data/derived/analyze/validated-product.edn \
  --provenance data/derived/provenance.edn \
  --out data/derived/report/2026-05-04.md \
  --sidecar data/derived/report/2026-05-04.provenance.edn
```

## Result EDN Contract

Each analysis result must include:

```clojure
{:analysis/persona :ops ; or :product
 :analysis/date "2026-04-30~2026-05-04"
 :analysis/summary ["..."]
 :analysis/findings
 [{:finding/title "..."
   :finding/evidence ["..."]
   :finding/source-chat-ids ["..."] ; may be [] but key required
   :finding/action-candidate "..."
   :finding/source :llm ; required: :llm | :rule | :rawmention
   :finding/confidence :med ; optional: :low | :med | :high
   :finding/priority :high ; optional, only :high
   :finding/related-team "R&D"}] ; product optional
 :analysis/assumptions ["..."]
 :analysis/limits ["..."]}
```

Rules:

- `:finding/source` is required. `confidence` is strongly recommended.
- Use `:finding/priority :high` consciously for security/safety/privacy issues.
- Never quote private manager memo text in external report prose.
- Keep count differences as provenance; do not force-align 503/523/408/279.
- If `source-chat-ids` is empty, say why and push the gap to v0.2 traceability.

## Current Direction

v0.1 is closed. This skill is a bootstrap before v0.2, not the final v0.7 skill package.

Next v0.2 target: 1 chat = 1 EDN, raw + summary split, high-priority raw evidence lookup, product × topic joint distribution, hypothesis/action pairs with traceable chat IDs.

References in voscli:

- `NEXT.md`
- `ROADMAP.md`
- `ops/reviews/2026-05-13-v0.1-closeout.md`
- `ops/2026-05-13-csdashboard-postmortem.md`
