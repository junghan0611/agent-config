---
name: recall
description: "멀티하네스용 /recall 래퍼. native custom command surface가 없는 하네스(예: Antigravity, Codex)에서도 /recall에 해당하는 다축 맥락 복원을 skill로 호출한다. session-recap, NEXT.md, git status/log, semantic-memory를 조합해 어제/오늘의 작업축을 되살린다."
---

# recall — multi-harness wrapper for `/recall`

Canonical SSOT: `~/repos/gh/agent-config/commands/recall.md`

Use this skill on harnesses that do **not** support repo-managed custom command prompt files directly.

## Goal

Restore just enough working memory that the next user turn can be a one-liner.
Stop early when state is already clean.

## Workflow

### 0. Pick scope

Default project = basename of CWD.
If the user names another repo/topic, use that instead.

### 1. Repo-local session spine

Use `session-recap` first.
Always lead with:

```text
조회 프로젝트: <PROJECT>
대상 세션: ═══ <project> [...] ═══
```

Then immediately check the three cheapest conscious markers:

```bash
cat <PROJECT_PATH>/NEXT.md 2>/dev/null
git -C <PROJECT_PATH> status --short
git -C <PROJECT_PATH> log --since="yesterday" --oneline
```

### 2. Expand only if §1 is thin

Expand when:
- the recap is only a smoke/1-turn session
- the expected topic is absent
- the date rolled over and the real work was earlier

Otherwise stop.

### 3. Semantic recall only when needed

Use `semantic-memory` only if §1+§2 still leave a real gap.
Do **not** run two same-axis semantic searches just to look busy.
Shift axis (repo / time / domain), or skip.

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
- session: ...
- semantic: ...
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

- Prefer `NEXT.md` / git state over chatter.
- No raw JSONL reads when `session-recap` can do it.
- No padding when state is clean.
- This skill is the **skill-form translation** of `/recall`, not a different workflow.
