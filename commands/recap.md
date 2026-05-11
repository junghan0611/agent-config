---
description: 다축 맥락 복원 — compact 없이 session/day/semantic 축으로 recap
---
`/recap` is **multi-axis context hydration**. Execute the steps below in order and produce the §6 response. Do not stop after acknowledging this brief.

Goal: recover the context you must continue from, without raw JSONL reads and without compaction.

Scripts you will call:
- `session-recap` — used in §1 and §2 (run `--help` first only if the signature is unfamiliar)
- `day-query` — used in §4, only when the user explicitly asks for a day axis ("어제 전체", "오늘 이어서", "나를 리콜", "기억축")

## 0. Pick the scope

Default project = last segment of CWD:
- `~/repos/gh/agent-config` → `agent-config`
- `/home/junghan` → `home`

User intent overrides the default:
- "home 디렉토리 분신", "Entwurf" → `home`
- "COS" → `cos`
- explicit repo name → that repo

If the date rolled over since the last session, mind the yesterday/today boundary.

If you are unsure which project the user means, list recent sessions:

```bash
ls -lt ~/.pi/agent/sessions/ | head
```

## 1. Recap the repo-local pi sessions

Run:

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15 --source pi
```

Always include this header in your reply:

```text
조회 프로젝트: <PROJECT>
대상 세션: ═══ <project> [pi] (...) ═══
```

## 2. Expand immediately if the recap is short or off-target

Expand when any of these holds:

- a 1-turn entwurf
- a "Reply only OK" smoke session
- the topic the user expects is missing
- the date rolled over and the long work happened yesterday

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 20 -s 5 --skip 0 --source all
```

## 3. Cross-session semantic recall

Pull proper nouns from the recap output and run `semantic-memory` in two passes:

1. Meta query — the abstract topic the user named
2. Concrete query — terms harvested from the meta result: repo / version / commit / skill / `§` label / design phrase

Example:

```text
recap 기억축 compact 없이 모든 축 day-query agent-config pi-shell-acp 0.5.0
agent-recall session-recap v2 prompt spine compact transcript recall UX
```

**`semantic-memory` is exposed identically on every backend** (pi / ACP Claude / Codex / Gemini). Use whichever surface your own tool schema shows first — the capability is the same.

| Backend | Primary call (skill) | Extra surface |
|---------|---------------------|---------------|
| pi native | `semantic-memory` skill (SKILL.md) | andenken extension's `session_search` / `knowledge_search` registerTool |
| ACP Claude (via pi-shell-acp) | `agent-config-skills:semantic-memory` Skill (plugin namespace) | — |
| ACP Codex / Gemini | `semantic-memory` skill (SKILL.md) | direct binary path |

All three surfaces hit the same andenken CLI and return the same results. Do not detour to "unify" surfaces — call the one you see first.

## 4. Day-axis hydration

Run the day-axis only when the user asks for "어제 전체" / "오늘 이어서" / "나를 리콜" / "기억축":

```bash
gitcli day <DATE> --me --summary
denotecli day <DATE> --dirs ~/org
lifetract read <DATE> --data-dir ~/repos/gh/self-tracking-data
```

Add calendar when relevant:

```bash
gog -j calendar list --from <DATE>T00:00:00+09:00 --to <NEXT_DATE>T00:00:00+09:00 --account junghanacs@gmail.com
```

## 5. Conscious markers outrank session chatter

journal / llmlog signals take priority over session-recap output:

- `§repo` = sibling / 담당자 invocation index
- llmlog = designs the operator consciously recorded
- session JSONL = working chatter

Do not declare "80% sufficient" from session-recap alone.

## 6. Final response format

Reply with this exact structure (Korean labels are part of the output format, not instructions):

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

Forbidden:
- reading raw JSONL directly
- skipping the header in the §1 reply
- calling one repo's session "the whole picture"
- repeating the same meta query

Begin at §0 now.
