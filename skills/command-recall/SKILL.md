---
name: recall
description: "멀티하네스용 /recall 래퍼. native custom command surface가 없는 하네스(예: Antigravity, Codex)에서도 /recall에 해당하는 복귀를 skill로 호출한다. entwurf-peek로 지금의 판, 양 하네스 session-recap, NEXT·ROADMAP·git, semantic 세션축+가든축을 세워 돌아올 자리를 복원한다."
---

# recall — multi-harness wrapper for `/recall`

Canonical SSOT: `~/repos/gh/agent-config/commands/recall.md`

Use this skill on harnesses that do **not** support repo-managed custom command prompt files directly.

## Goal

Restore the **whole board** the operator returns to — not one session's recap.
Being invoked at all is the signal for the comprehensive lane: simple questions
("뭐 하고 있었지", "누가 살아있지", "이거 예전에 어디서 했지") belong to
`session-recap` / `entwurf-peek` / `semantic-memory` directly and must not come here.

Build every section below. What scales with state is the **output**, not the work.

## Workflow

### 0. Pick scope

Default project = basename of CWD.
If the user names another repo/topic, use that instead.

### 1. The live board

Run the `entwurf-peek` skill's `situation`, **unfiltered**, then speak about the current
project first. Narrowing with `-p` hides cross-repo siblings working the same seam, which
is the main thing this section is for.

It is a read-only projection: `record` is fact, transcript last-event is an estimate, and
`➖ unprobed` means *this surface cannot tell*, not "dead". Never quote it as a dispatch or
placement authority.

### 2. Both harnesses' session spine

The operator moves between pi and Claude Code and entwurf opens siblings on both, so a
single-harness recap is half the board. Call each side **separately** — `--source all` does
not guarantee one from each (it merges into one recency list and takes the top N).

Choose skip from the caller surface:

| Caller | pi recap | Claude recap |
|---|---|---|
| pi (native or ACP) | default skip | `--skip 0` |
| Claude Code | `--skip 0` | default skip |
| Codex / Antigravity / any third surface | `--skip 0` | `--skip 0` |

Both use **`--min-kb 0`**; this is a return lane where recency outranks size. Default
`--skip 1` is valid only when the caller is actually writing that indexed source. Codex
and Antigravity write neither, so both corpora belong to somebody else.

Suppress probes by reading the output, not by byte floor: if one side is a smoke/1-turn
session, widen that side only (`-s 3`) keeping its caller-table skip value.

Lead with the header of what you actually read, naming both sides:

```text
조회 프로젝트: <PROJECT>
대상 세션: ═══ <project> [claude] (...) ═══ + ═══ <project> [pi:gpt] (...) ═══
```

Then the conscious markers:

```bash
cat <PROJECT_PATH>/NEXT.md 2>/dev/null
cat <PROJECT_PATH>/ROADMAP.md 2>/dev/null
git -C <PROJECT_PATH> status --short
git -C <PROJECT_PATH> log --since="yesterday" --oneline
```

### 3. Semantic recall — two axes, one call each

Run **both**, with concrete proper nouns drawn from §1–§2, not abstract restatements:

- `semantic-memory search-sessions` — the work lineage
- `semantic-memory search-md` — the garden's concept and principle

Do not lean on the session search's automatic garden fallback; it fires only when session
results are thin, so the garden axis vanishes exactly when sessions look healthy.

To read around a session hit use `--with-excerpt`. To restore the whole session a hit came
from, hand its `file` to `session-recap --session-file`. The path joins; the `line` does not.

### 4. Day-axis only on explicit request

Use `gitcli day`, `denotecli day`, `lifetract`, calendar only when the user asks for full yesterday/today/day-axis restoration.

## Output mode

### Zero / closed state

Use a short answer like:

```text
마지막 작업: <YYYY-MM-DD, one-line summary>.
NEXT.md 비어 있고 tree clean. zero-state 시작.
```

### Mid-flight state

Use:

```text
조회 범위:
- board: ...      (살아있는 시민, 없으면 "없음")
- session: ...    (양 하네스 — 각각 이름, 없는 쪽은 없다고)
- semantic: ...   (세션축 / 가든축 각각)
- day-axis: ...
- conscious markers: ...

복원된 맥락:
- ...

놓치기 쉬운 축:
- ...

아직 안 본 것:
- ...
```

## Rules

- Prefer `NEXT.md` / `ROADMAP.md` / git state over chatter.
- No raw JSONL reads when `session-recap` can do it.
- No padding when state is clean.
- This skill is the **skill-form translation** of `/recall`, not a different workflow.
