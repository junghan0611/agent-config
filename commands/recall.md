---
description: Multi-axis context hydration — restore the whole board the operator returns to, without raw JSONL and without compaction. Typing /recall is itself the signal for the comprehensive lane: entwurf-peek for the live board, BOTH harnesses' sessions, NEXT/ROADMAP + git, and semantic recall on the session and garden axes. Day-axis on request. Build every axis; report each one in proportion.
---

# /recall — Multi-Axis Context Hydration

## Why this exists

`/recall` is **복귀** — returning to the whole board, not recapping one session. Sessions are a 담당자 unit, one axis among several. Run between sessions, after `/new`, when the date rolls over, or when the thread has been lost.

**Typing `/recall` is already the signal.** Simple questions do not come here and must not be answered by this ritual:

| The operator asks | Owner | Not this command |
|---|---|---|
| "뭐 하고 있었지" / "이어서" | `session-recap` directly | |
| "누가 살아있지" / "누구한테 맡길까" | `entwurf-peek situation` directly | |
| "이거 예전에 어디서 했지" | `semantic-memory` directly | |
| **"/recall" / 복귀 / 교대** | **this command — build the whole board** | |

So `/recall` does not re-narrow to the cheapest axis it can get away with. It builds §1–§3 every time. What scales with state is the **output** (§6), not the work.

## Goal-state

You can issue the *next* turn as a one-liner, **and** you know who else is on the board. If the operator can immediately say "어제 이어서 jiracli 마무리하자" and you know which commit, file, and branch to touch — and which sibling is holding which lane — you are done.

Reaching that at §1 does not license skipping §2–§3. It licenses reporting them in two lines each.

## Tools at your disposal

- `entwurf-peek situation` (§1) — who is alive, where, doing what — the live board
- `session-recap` (§2) — the spine of pi **and** Claude session JSONL, both harnesses
- `NEXT.md` + optional `ROADMAP.md` + `git status` + `git log --since=yesterday` (§2.5) — conscious markers, cheapest signal
- `semantic-memory` (§3) — two axes: past sessions, and the garden
- `gitcli day` / `denotecli day` / `lifetract` (§4) — day-axis, on request only

## 0. Pick scope

Default project = last segment of CWD:
- `~/repos/gh/agent-config` → `agent-config`
- `/home/junghan` → `home`

User intent overrides the default:
- "home 디렉토리 분신", "Entwurf" → `home`
- "COS" → `cos`
- explicit repo name → that repo

Date rolled over since last session? Mind the yesterday/today boundary.

Scope unclear? List recent sessions:

```bash
ls -lt ~/.pi/agent/sessions/ | head
```

## 1. The live board — who else is here

Call the **`entwurf-peek` skill** and run its `situation`. Invoke it through whatever
surface your harness exposes it on — do not hardcode a host path; the skill directory
differs per harness and an isolated-HOME sibling will not find yours.

```
entwurf-peek situation          # default: unfiltered recent roster
entwurf-peek situation --json   # to parse rather than read
```

Run it **unfiltered by default**, then speak about the current project first. `-p <PROJECT>`
narrows to one repo and hides exactly the thing this section exists for — the Nano↔Gecko
case, where a sibling in *another* repo turned out to be working the same seam. Narrow only
when the roster is too long to read.

This is a **read-only projection**, not a dispatch surface. Pass `--self-id <GID>` (from
`entwurf_self`) to mark your own row.

Read the fact/estimate split honestly and carry it into §6: `record` is fact, transcript
last-event is an estimate. `➖ unprobed` means *this surface cannot tell*, not "dead".

A live sibling in this repo is not noise — it is the single most decision-relevant thing
`/recall` can surface. Two agents editing the same lane is the failure this section exists
to prevent.

## 2. Both harnesses' session spine

The operator moves between pi and Claude Code, and entwurf opens siblings on both. **A
single-harness recap is half the board.** Call each harness separately — `--source all`
does *not* guarantee one from each, because it merges into one recency list and takes the
top N from whichever side happens to be newer.

Choose skip from the **caller**, not by pretending every caller is one of these two
indexed sources:

| Caller running `/recall` | pi recap | Claude recap |
|---|---|---|
| pi (native or ACP) | default skip | `--skip 0` |
| Claude Code | `--skip 0` | default skip |
| Codex / Antigravity / any third surface | `--skip 0` | `--skip 0` |

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15 --source pi <PI_SKIP> --min-kb 0
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15 --source claude <CLAUDE_SKIP> --min-kb 0
```

**Why the skip differs.** Default `--skip 1` exists to drop "the session being written
right now", identified as *newest mtime*. That invariant holds only when the caller is
actually writing that indexed source. From Claude Code, the newest pi session is a
sibling's; from pi, the newest Claude session is someone else's. Codex and Antigravity
write neither indexed corpus, so skipping either side discards another citizen.

**Why `--min-kb 0`.** The 300KB floor is `session-recap`'s probe-suppression default for
*discovery*. `/recall` is a return lane where **recency outranks size** — a 94KB session
from an hour ago beats a 400KB one from last month. Do not invent an intermediate floor;
it only hides real work at a different threshold.

Suppress probes by **looking at the output**, not by byte count. If one harness came back
as a smoke test or a 1-turn entwurf ("Reply OK"), expand **that harness only** with `-s 3`
and preserve the skip value from the caller table. Widening never turns somebody else's
source into your live session.

Do not mechanically fan out to `-s 3` on both sides. Inside pi you can also split the model
axis with `--harness gpt` (pi native GPT/Codex) or `--harness acp` (entwurf Claude/Opus) —
when the operator says "GPT session" they mean this axis, not a project named `gpt`.

Lead your reply with the header of what you actually read:

```text
조회 프로젝트: <PROJECT>
대상 세션: ═══ <project> [claude] (...) ═══ + ═══ <project> [pi:gpt] (...) ═══
```

### 2.5 Conscious markers

```bash
cat <PROJECT_PATH>/NEXT.md 2>/dev/null
cat <PROJECT_PATH>/ROADMAP.md 2>/dev/null
git -C <PROJECT_PATH> status --short
git -C <PROJECT_PATH> log --since="yesterday" --oneline
```

Near-zero cost and higher signal than session chatter (see §5). Never skip these.

## 3. Semantic recall — two axes, one call each

Run **both**. They are different axes by construction, so this is not the old "pick a
different angle" judgment call — it is two fixed passes:

| Pass | Call | Looks for |
|---|---|---|
| 1. Session axis | `semantic-memory search-sessions "<terms>"` | the work lineage — where this was done before, what was decided |
| 2. Garden axis | `semantic-memory search-md "<terms>"` | the concept and principle — what the garden already says about it |

Do **not** rely on `search-sessions`' automatic garden fallback to cover pass 2. It fires
only when session results are thin, so the garden axis silently disappears exactly when
sessions look healthy.

**Draw the terms from what §1–§2 produced** — concrete proper nouns, file names, repo
names, commit subjects, sibling ids. Abstract restatements of the operator's question
retrieve poorly; that is why the two-step strategy in `AGENTS.md` exists.

To read the turns around a session hit, stay in this tool — `--with-excerpt`. To restore
the *whole* session a hit came from, hand its `file` to `session-recap --session-file`.
The path joins; the `line` does not.

If a returned session path is already covered by §2, its new-information value is near
zero — say so in §6 in one clause and move on. That is a reporting decision, not a reason
to have skipped the call.

`semantic-memory` is exposed identically on every backend (pi native / ACP Claude / Codex / Gemini / Claude Code / Antigravity). Use whichever surface your own tool schema shows first.

| Backend | Primary call (skill) | Extra surface |
|---------|---------------------|---------------|
| pi native | `semantic-memory` skill (SKILL.md) | andenken extension's `session_search` / `knowledge_search` registerTool |
| ACP Claude (via entwurf) | `agent-config-skills:semantic-memory` Skill (plugin namespace) | — |
| ACP Codex / Gemini | `semantic-memory` skill (SKILL.md) | direct binary path |
| Claude Code (direct) | `semantic-memory` skill (`~/.claude/skills/`) | — |

All surfaces hit the same andenken CLI and return the same results. Do not detour to "unify" surfaces — call the one you see first.

## 4. Day-axis — explicit request only

Run only when the user asks for "어제 전체" / "오늘 이어서" / "나를 리콜" / "기억축":

```bash
gitcli day <DATE> --me --summary
denotecli day <DATE> --dirs ~/org
lifetract read <DATE> --data-dir ~/repos/gh/self-tracking-data
```

Add calendar when relevant:

```bash
gog -j calendar list --from <DATE>T00:00:00+09:00 --to <NEXT_DATE>T00:00:00+09:00 --account junghanacs@gmail.com
```

This axis is the most expensive and the most likely to be skipped. The operator will ask if they want it — do not preempt.

## 5. Conscious markers outrank session chatter

Signal priority, highest first:

1. `NEXT.md` — explicit immediate next step maintained by the operator
2. `ROADMAP.md` — medium-horizon repo direction when present
3. `§repo` headings in today's journal — sibling/담당자 invocation index
4. llmlog notes — designs the operator consciously recorded
5. recent commits + working tree state
6. session JSONL recap — working chatter, lowest signal

A clean `NEXT.md` + clean `git status` is a **stronger** signal than five sessions of recap text. `ROADMAP.md` adds direction, not urgency. Do not override conscious markers with session-recap inferences.

The live board (§1) sits outside this ranking — it does not tell you *what* to do next, it tells you **who else is already doing it**. A clean NEXT plus a live sibling in the same lane is not a zero state; it is a coordination question.

## 6. Response format — proportional to state

The response shape must match the state. The two modes below are not interchangeable.

### Zero/closed state

Triggered by: `NEXT.md` empty, `git status` clean, no live sibling on this lane, last turn was closure — **not** by having skipped sections. You still ran §1–§3; they simply found a closed board.

```text
마지막 작업: <YYYY-MM-DD, one-line summary of the last meaningful commit or closure>.
NEXT.md 비어 있고 tree clean. 살아있는 형제 없음. zero-state 시작.
```

Use the actual date, not "어제" — the same template must work whether the last work was yesterday or five days ago. Three lines is honest. Do not pad. Do not invent "놓치기 쉬운 축" entries to fill the structure — when there is nothing pending, say so.

### Mid-flight state

Triggered by: open `NEXT.md` items, uncommitted work, a live sibling, or §3 surfacing something §2 did not.

```text
조회 범위:
- board: ...      (live citizens, or "없음")
- session: ...    (BOTH harnesses — name each, or say which side had none)
- semantic: ...   (session axis / garden axis — say what each returned)
- day-axis: ...   (or "skipped — not requested")
- conscious markers: ...

복원된 맥락:
- ...

놓치기 쉬운 축:
- ...

아직 안 본 것:
- ...
```

Korean labels are part of the output format — keep them.

## Forbidden

- Reading raw JSONL directly — use `session-recap`.
- Skipping the §2 header, or reporting one harness as if it were both.
- **Skipping §1 or §3 because §2 "looked sufficient."** That gate is why semantic recall quietly stopped happening. `/recall` builds the board; only §6 scales down.
- Using `--source all` to mean "both harnesses" — it does not (one recency list, top N from whichever side is newer).
- `--skip 1` on the *other* harness — its newest session is a sibling's, not yours.
- Inventing an intermediate `--min-kb` for this lane. It is `0`.
- Treating `search-sessions`' garden fallback as the garden axis — call `search-md` explicitly.
- Handing a semantic hit's `line` to `session-recap`. The `file` joins; the `line` does not (use `--with-excerpt` to read around a hit).
- Quoting `entwurf-peek` transcript estimates as facts, or using it as a dispatch/placement authority.
- Calling one repo's recap "the whole picture" — say so explicitly when you have only a single-repo view, and offer day-axis as a follow-up if the operator wants cross-repo.
- Padding §6 to fill the mid-flight structure when state is clean.

## Begin at §0 now
