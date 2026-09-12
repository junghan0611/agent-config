---
name: harness-bench
description: "하네스 리서치 장기 관측소 — agent-config 루트의 대문자 하네스 문서(HERMES / OMP / OUROBOROS / HERDR / PRIME / YEGGE)를 상태·증거로 갱신한다. 채택·성능·좋고 나쁨 판정이 아니다. RLM 기억, native 형제 delivery/UX 대칭성, 역할이 아닌 다른 학교 모델과의 협업, 스펙 전 탐색 대화를 본다. 스킬 주입·라이브 setup 금지. 트리거: '하네스 리서치', 'HERMES', 'OMP.md', 'OUROBOROS', 'HERDR', 'PRIME', 'prime-agent', 'YEGGE', '벤치', '대문자 문서', 'harness bench', 'harness research'."
user_invocable: true
---

# harness-bench — uppercase harness subjects

Repo: `~/repos/gh/agent-config`. The files are the subjects. This skill does not install them.

| Call | Args | Example |
|---|---|---|
| `status` | none | `python3 {baseDir}/scripts/status.py` |
| `show` | `NAME` (file stem) | `python3 {baseDir}/scripts/status.py OUROBOROS` |
| update | after research | append a dated `## [YYYY-MM-DD]` heading to that `NAME.md`. Do not rewrite |

`status` lists every root `ALLCAPS.md` bench/observation file with its kind and latest 상태 date. `show` prints the `## 상태` (or first dated) section.

## Research center (GLG)

This is a living, periodic observation loop, not a one-off introduction scrape or a
procurement scorecard. Preserve prior receipts, upstream responses, rejected routes,
and unresolved questions so the next research turn resumes the inquiry rather than
reconstructing it.

Do **not** ask whether a harness is good/bad, superior/inferior, or the one to select.
That verdict is not the research question. Vendor surfaces can differ, and a missing
first route may have a supported alternative or an unsafe workaround; record the
boundary and evidence before drawing any capability conclusion.

Keep these four lenses together:

1. **RLM / long-lived memory.** How does the harness preserve, retrieve, and renew
   context across long-running loops and runtime boundaries?
2. **Delivery and symmetric UX.** Can a native, already-born peer be addressed as a
   sibling without depending on GUI/web control, while preserving equivalent calling
   experience across harnesses? This is not a performance benchmark.
3. **Calling a peer.** Do not reduce a sibling to a named internal role such as
   `reviewer` or `tasker`. Keep the other model/school visible and ask it to help the
   sibling that called it; creation and addressing are different capabilities.
4. **Discovery-first dialogue.** Do not demand an early specification, interrogate
   GLG for choices, or turn an unknown into a menu. Investigate with GLG, bring back
   measured/read evidence and newly visible possibilities, and let the shape emerge.

## Viewpoint (GLG)

- **entwurf is the floor.** Do not rank it. Ask how *other* harnesses carry memory across runtimes, and how they run long.
- **Candidate ≠ adopted.** No `nixos-config` declaration. Do not symlink `skills/` into their tree. Do not run their live `setup` into this HOME (MCP/rules land in files entwurf co-owns).
- **Learn if there is something to learn.** Popularity is not the score. Verification terrain is: their sealed gate vs our open receipts (`measured` / `read at` / `inherited`).
- **YEGGE.md is observation only**, not a bench matrix. Same hang, no install path.
- **One advantage per subject — `protocol.md`.** When a run day comes, exercise only what each harness pushes; protocol.md names it plus the turn and isolation it needs. The rail is chosen that day from `MODELS.md`, not frozen here.

README table `Subject / Question / Standing` is the index. A table row without a sibling `NAME.md` is not a license to invent one.

## Research then update

1. `status` → pick the file.
2. Read that file's 오독 / 미해결 / matrix first, then the upstream clone or docs it names.
3. Append. Documents grow: new `## [YYYY-MM-DD]` + evidence state on every fact. Do not restack old sections.
4. Mark matrix rows `측정됨` / `미측정` / `막힘` / `안 함` only from this turn's evidence.
5. Isolation for any run: throwaway HOME or a pin the matching `run.sh` target already owns (`setup:hermes`). If neither exists, do not install — write `미측정` and the missing pin.

OpenRouter is not an inference rail. Use an approved subscription from `MODELS.md`.
