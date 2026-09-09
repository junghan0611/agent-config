---
name: harness-bench
description: "agent-config 루트의 대문자 하네스 벤치(HERMES / OMP / OUROBOROS / HERDR / PRIME / YEGGE) 상태를 보고, 리서치 뒤 그 문서를 갱신한다. 채택이 아니다. 스킬 주입·라이브 setup 금지. 트리거: '하네스 리서치', 'HERMES', 'OMP.md', 'OUROBOROS', 'HERDR', 'PRIME', 'prime-agent', 'YEGGE', '벤치', '대문자 문서', 'harness bench', 'harness research'."
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
