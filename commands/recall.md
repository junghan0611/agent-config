---
description: Multi-axis context hydration — restore the working memory the operator must continue from, without raw JSONL and without compaction. Combines session-recap, NEXT.md / git, semantic-memory, and (on demand) day-axis. Called dozens of times per day across multiple harnesses; treat it as a precision ritual, not a checklist. Stop early when state is already clean — proportional output beats exhaustive output.
---

# /recall — Multi-Axis Context Hydration

## Why this exists

`/recall` is the operator's daily memory-axis restoration. Not a per-session recap — sessions are a 담당자 unit, just one of the axes seen. The goal is to revive the operator's **overall** memory axis: at minimum, what is happening across yesterday and today, across repos / harnesses / domains. Run between sessions, after `/new`, when the date rolls over, or when the thread has been lost. It is called dozens of times per day across pi, Claude Code, OpenCode — so token efficiency matters as much as correctness.

## Goal-state — stop when this holds

You can issue the *next* turn as a one-liner. If the user can immediately say "어제 이어서 jiracli 마무리하자" and you know which commit, file, and branch to touch, you are done.

If you reach goal-state at §1, **do NOT run §2-§4 just to be thorough**. Stop early and produce §6 in proportion. Padding the structure when state is clean is the most common failure mode of this command.

## Tools at your disposal

- `session-recap` (§1, §2) — extract the spine of pi/Claude session JSONL
- `NEXT.md` + `git status` + `git log --since=yesterday` (§1.5) — conscious markers, cheapest signal
- `semantic-memory` (§3) — cross-session semantic recall, on demand
- `gitcli day` / `denotecli day` / `lifetract` (§4) — day-axis, on demand only

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

## 1. Repo-local session spine

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15 --source pi
```

Always lead your reply with this header:

```text
조회 프로젝트: <PROJECT>
대상 세션: ═══ <project> [pi] (...) ═══
```

Immediately after §1 output, glance at the three cheapest conscious markers:

```bash
cat <PROJECT_PATH>/NEXT.md 2>/dev/null
git -C <PROJECT_PATH> status --short
git -C <PROJECT_PATH> log --since="yesterday" --oneline
```

For a clean state, these three plus §1 hit ~80% of the needed context. Do not skip them — they are a near-zero-cost upgrade to §1.

## 2. Expand ONLY if §1 is genuinely thin

**Skip §2 when ALL of these hold** (zero/closed state — the dominant case for daily-driver use):

- `NEXT.md` missing, empty, or contains "no open items" — treat all three as zero
- `git status` clean
- closure signal — either a recent user turn matched ("다 했어", "지워", "정리하자", "끝", "완료", "clean", "커밋푸시", "스탬프 고고") **OR** the objective form holds: `git log --since=yesterday` shows commits **and** working tree is clean (work shipped, nothing pending)

The objective form matters because the text-pattern list will never be exhaustive. If commits shipped and the tree is clean, that *is* closure regardless of how the operator phrased it.

**Run §2 when any of these hold**:

- §1 returned only a 1-turn entwurf or a "reply OK" smoke session
- the topic the user *expects* is absent from §1
- date rolled over and the substantive work happened yesterday or earlier

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 20 -s 5 --skip 0 --source all
```

## 3. Semantic recall — shift axis, do not narrow

**Run §3 only when §1+§2 still leave a gap the user is likely to ask about.** When you run it, the two passes must hit **different axes** — same-axis queries produce confirmation bias, not new information.

| Pass | Axis | Good example | Bad example |
|------|------|--------------|-------------|
| 1. Meta | abstract topic the user named | `qmd vulkan nix-ld thinkpad NixOS` | — |
| 2. Concrete — **DIFFERENT AXIS** | cross-repo OR temporal OR different domain | `this week's NEXT.md follow-ups across repos` / `OpenClaw 5.7 baseline andenken bake-off` | `NIX_LD_LIBRARY_PATH prebuilt llama-addon node-llama-cpp localBuilds` (different vocabulary, **same topic** — still same-axis) |

**Different vocabulary on the same topic is still same-axis.** This is the most common failure mode of §3 — the model swaps surface terms while staying anchored to the same subject, producing confirmation bias dressed up as a new query.

Narrowing within the same topic is a wasted call. If §1 covered topic X well, §3 should look at **not-X** — adjacent repos, the previous week, a parallel skill domain. If you cannot think of a different axis worth asking, skip §3 entirely.

Before reading §3 results, check whether the returned session file paths are already covered by §1+§2. If yes, the new information value is near zero — note that in your §6 and move on.

`semantic-memory` is exposed identically on every backend (pi native / ACP Claude / Codex / Gemini / Claude Code / OpenCode). Use whichever surface your own tool schema shows first.

| Backend | Primary call (skill) | Extra surface |
|---------|---------------------|---------------|
| pi native | `semantic-memory` skill (SKILL.md) | andenken extension's `session_search` / `knowledge_search` registerTool |
| ACP Claude (via pi-shell-acp) | `agent-config-skills:semantic-memory` Skill (plugin namespace) | — |
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

1. `NEXT.md` — explicit "what is left to do" maintained by the operator
2. `§repo` headings in today's journal — sibling/담당자 invocation index
3. llmlog notes — designs the operator consciously recorded
4. recent commits + working tree state
5. session JSONL recap — working chatter, lowest signal

A clean `NEXT.md` + clean `git status` is a **stronger** signal than five sessions of recap text. Do not override conscious markers with session-recap inferences.

## 6. Response format — proportional to state

The response shape must match the state. The two modes below are not interchangeable.

### Zero/closed state

Triggered by: §2 skipped, §3 skipped, `NEXT.md` empty, `git status` clean, last turn was closure.

```text
마지막 작업: <YYYY-MM-DD, one-line summary of the last meaningful commit or closure>.
NEXT.md 비어 있고 tree clean. zero-state 시작.
```

Use the actual date, not "어제" — the same template must work whether the last work was yesterday or five days ago. Three lines is honest. Do not pad. Do not invent "놓치기 쉬운 축" entries to fill the structure — when there is nothing pending, say so.

### Mid-flight state

Triggered by: open `NEXT.md` items, uncommitted work, live thread, or §3 actually surfaced new information.

```text
조회 범위:
- session: ...
- semantic: ...   (or "skipped — §1 sufficient")
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
- Skipping the §1 header.
- Calling one repo's recap "the whole picture" — say so explicitly when you have only a single-repo view, and offer day-axis as a follow-up if the operator wants cross-repo.
- Running §3 with two same-axis queries (confirmation bias).
- Padding §6 to fill the mid-flight structure when state is clean.
- Running §2-§4 mechanically when goal-state was already reached at §1.

## Begin at §0 now
