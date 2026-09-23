---
name: evidence-closure
description: "증거–검출기 폐루프 — 현장·운영·VOC·SQE·GitHub 이슈의 결함 신고를 '입력'으로 받아 raw evidence → 깨진 계약 → 해결안·기각 근거 → 인간 결정 → primary + side-effect red → fix → 전체 green → 원 신고 조건 재검증까지 닫고 검출기를 영구 보존한다. '해결됨' 신고는 옛 코드로 사후 red를 증명한다. 리포·도메인 무관. raw evidence 없으면 계약 후보까지만, production fix 금지. subtract(뺄셈으로 여는 법)의 짝 — 리포를 테스트 루프로 닫는 법. 트리거: '폐루프', 'closure loop', '결함 종결', '해결됐다는데', '사후 red', 'characterization', 'red detector', '검출기 먼저', 'side-effect matrix', '부작용', 'SQE', 'VOC 결함', '현장 재검수', 'decision card', '결함 원장'."
user_invocable: true
---

# evidence-closure — 신고는 입력이다

> SQE·VOC·운영·GitHub 이슈가 "해결됨"이어도 입력일 뿐이다. — GLG 2026-09-23

A defect closes only with **(a)** a detector's red→green receipt and **(b)** re-verification under the original report's conditions. The detector stays forever.

**Pair: `subtract`.** `subtract`는 문제를 뺄셈으로 여는 법, 이 스킬은 리포를 테스트 루프로 닫는 법. `subtract`'s list (0)–(e) with rejection receipts fills step 3's options; this skill proves the chosen fix closed (steps 5–8).

Use when an external-boundary report (field, ops, customer, QA, integration partner) meets code, when accepting another lane's fix, or when "gate is green, why did it break again?". Not for feature work, coverage chasing, or triage only.

## 0. Evidence gate

| Required | Example |
|---|---|
| raw artifact, not a summary | log lines, original report text, repro steps, failing build output |
| provenance | where · when · build/SHA/version |
| observed ≠ expected, one sentence | "still offline after power restore" |

Missing any → **investigate mode**: stop at step 2, mark every contract `hypothesis`, list the evidence needed. **No production fix branch or commit.** A red detector found by reading code is a *new gate-only problem* (its red receipt is its evidence); its link to the report stays `candidate mechanism` — never "resolves the report".

## 1. The loop

| # | Step | Output | Who |
|---|---|---|---|
| 1 | symptom + raw evidence / repro artifact | §0 | discovering side |
| 2 | cause + broken contract | `file:line` + contract sentence (may be several) | detector side |
| 3 | options + **rejection reasons** + side effects (one option → prove it is unique) | decision card | detector side |
| 4 | **human decision** | choice + details | GLG |
| 5 | primary red + **side-effect red matrix** | failing receipt *before* the fix | detector side |
| 6 | production fix | change; commit after approval | owning lane |
| 7 | all green, no regressions | gate receipt with provenance; known-defect tags removed | detector side |
| 8 | **re-verify under original conditions** | same env/procedure log + verdict | boundary side |

Exit: gate-only problems close at 7; anything from an external boundary closes at **8**. `PENDING`, `UNMODELED`, "handed to owner", gate green are **open states, not exits**. A new side-effect red → back to **3**, not an in-place patch.

## 2. Ledger — one row = one contract, one cell = one state

| Axis | States |
|---|---|
| contract (detector) | `COVERED` · `RED-KNOWN` · `UNMODELED` |
| binding (platform/vendor) | `VERIFIED` · `PENDING` · `BLOCKED` · `n/a` |
| boundary (original report) | `RESOLVED` · `OPEN` · `NOT-REPRODUCED` · `NOT-AN-ISSUE` |

Columns: `report·contract | class | detector | waiting at step N | contract | binding | boundary | next evidence`. One report splitting into several rows is normal — never mix a modelable row with an external-binding row. Head the ledger with provenance (SHA · dirty · gate result). Keep `NOT-REPRODUCED` / `NOT-AN-ISSUE` rows.

## 3. Generic classes ↔ project taxonomy adapter

The skill fixes only five classes. Each project maps its own taxonomy onto them in its `AGENTS.md` (class → detector form → exemption rule). No adapter → propose one first; never impose these names.

| Class | What | Detector | Gate proves it? |
|---|---|---|---|
| artifact | final build output (manifest, package, schema, generated config) | parse the artifact, assert | yes |
| policy | pure decision input → choice/display | unit test on pure function | yes |
| adapter | external API/callback → policy input | fake adapter + minimal boundary smoke | translation only |
| lifecycle | state transitions, races, cancel, replace | injected seam + deterministic barrier | as far as the fake models it |
| external | physics, radio, timing, vendor device, human UX, scale | none — boundary evidence | no |

External rows need: env (model/build) · procedure · required log fields · verdict criterion · owner. Without these five it is not `PENDING`, it is empty.

## 4. Already-fixed defects — retrospective path

1. Find the fix commit(s).
2. Build the old tree somewhere disposable: `git worktree add /tmp/<id> <fix>^`, or `git revert --no-commit <fix>` in a clone. Never on the working trunk.
3. Write the detector against current code; **red on old, green on current**; record both SHAs.
4. Green on old too → it does not detect this defect; discard and rewrite.
5. Fill the side-effect matrix (§5) for the landed fix.
6. Boundary cell: cite a same-condition re-verification if one exists, else `OPEN` + request. The report's "resolved" is cited, never used as the exit.
7. Do not reimplement the fix — receive it and pin it with red.

## 5. Side-effect matrix

Primary green is not done. One row per neighbor the change touches:

| Neighbor | Question |
|---|---|
| other callers | does a caller with different assumptions break? |
| shared state / cache | do old references survive replace/eviction? |
| interleaving | replace/cancel *during* an operation — which side wins? |
| projections | UI, logs, metrics, persisted data polluted by stale values? |
| public surface | API/ABI diff, tool-generated receipt |
| error / cancel paths | retry and cleanup still correct? |
| **preservation guard** | the old correct behavior the fix must not remove |

Columns: `id | path | risk sentence | detector | before | after | verdict` (green · RED-KNOWN · characterization · UNMODELED + reason).

## 6. Decision card

```text
## card <id> — <broken contract, one sentence>
evidence:   raw path:line + provenance
contract:   file:line — "<contract>"
options:    A / B / C — change · side effects · rejection reason
recommend:  choice + why
preserve:   behaviors that must survive
detectors:  primary + side-effect rows to write before the fix
external:   what detectors cannot close → boundary rows
```

## Forbidden

- Reading report "resolved", gate green, or detector green as boundary resolved
- Recording `PENDING` / handoff / owner assignment as closed
- A fix without a prior red receipt; a "detector" never red on old code
- Untagged red living in the gate; stale known-defect tags after the fix
- Deleting detectors after closure
- Writing a `hypothesis` link as fact; using a summary as raw evidence
- Reimplementing another lane's fix
- Promoting a source-text grep to a contract detector (auxiliary alarm only)
- Widening public surface for testability (seams stay minimal and private)
- Patching a side-effect red in place without a new decision
- Gate receipts without provenance — an old green passes new source
- Telling anyone outside "resolved" before step 8

