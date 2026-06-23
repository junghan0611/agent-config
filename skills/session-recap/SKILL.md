---
name: session-recap
description: "Extract a compact recap from previous pi or Claude Code session JSONL without reading raw JSONL. Use for 'last session', 'what was I doing', continuity restore, and pi-internal GPT vs ACP recall via --source pi --harness gpt|acp. Preserves the skip-before-size edge case; retry with --min-kb 0 when a real recent session is below the default size floor."
---

# session-recap — extract a session summary

Extract **only** user/assistant text from a session JSONL.
**Never** `read` a raw JSONL directly — it dumps ~50KB of JSON noise into context.

**Multi-harness**: handles both pi and Claude Code sessions. **Default source is the
current harness** (running under Claude Code → `claude`, otherwise → `pi`). To continue
prior work cleanly you want the *same* harness's sessions. Override with `--source`.
Inside `--source pi`, use `--harness gpt|acp|all` to distinguish pi native GPT/Codex
from entwurf Claude/Opus. `--source claude` still means Claude Code only.

**Corpus filters** (aligned with andenken `session-indexer.ts` — 0d4432b "tighten
corpus to garden-native >300KB, drop tmp + legacy"). Same discipline as session
embeddings, so recap usually sees substantive sessions instead of probes. Three filters
exist, and their order is part of the contract:

- **Structural filters** (applied *before* skip):
  - **tmp dirs excluded** (both runtimes) — pi `--tmp…--` / claude `-tmp…` scratch.
  - **pi garden-native filename only** — `_YYYYMMDDTHHMMSS-<6hex>.jsonl` (0.9.0+). Legacy
    forms (`_<uuid>`/`_delegate-`/`_entwurf-`) excluded. claude is always UUID, so no
    filename filter.
- **Pi harness filter** `--harness gpt|acp|all` (applied *after* skip, before size):
  `gpt` = pi native OpenAI/Codex (`openai-codex` / `gpt-*`), `acp` = entwurf
  Claude (`entwurf` / `claude-*`). Unknown pi sessions pass only with `all`.
- **Size filter** `--min-kb 300` (applied *after* skip + harness): drops short test/probe
  fragments from what's *shown*. This is a heuristic, not truth: a real GPT/Codex
  session can be below 300KB. Disable with `--min-kb 0` when the expected session is
  missing or the header looks stale.

**Why size filter runs after skip (bug fix 2026-06-19).** `--skip 1` drops the current
live session, identified by the invariant **current session = newest mtime** (true on
any harness — it's the file being written right now). Early in a session that file is
still small (<300KB). If the size filter ran first it would drop the current session
from the list, so `--skip 1` would then drop the most-recent *real* session instead and
recap would surface a stale one. So: structural filters → skip on the full recency list
→ optional pi harness filter → size filter on the survivors.

**Size-floor edge case.** If `--source pi --harness gpt` (or `acp`) returns no session or
an older-than-expected header, do **not** switch project names or read raw JSONL. First
retry the same command with `--min-kb 0` (or a lower floor such as `--min-kb 100`). The
300KB default is there to suppress probes; it is allowed to hide a real but shorter
conversation.

This skill is the low-level extractor under `/recall`. Single repo/session restore lives
here; multi-axis recall (cross-project, day-query, journal `§`/llmlog) follows
`commands/recall.md`. (The old slash name `/recap` collided with a Claude Code built-in
and was renamed 2026-05-12.)

## API

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15
```

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project NAME` | all | Project filter (exact match). **Always specify.** |
| `-m, --messages N` | 20 | Last N messages per session |
| `-s, --sessions N` | 1 | Last N sessions |
| `-c, --chars N` | 300 | Max chars per message |
| `-a, --all-projects` | - | Include all projects |
| `--commits` | off | Include git commit commands |
| `--cost` | off | Session cost summary |
| `--skip N` | 1 | Skip newest N sessions (the current one) |
| `-f, --format` | text | `text` or `json` |
| `--source` | current harness | `pi`, `claude`, `all`. Unset → Claude Code=claude, else pi |
| `--harness` | all | pi-internal filter: `gpt`, `acp`, `all`. Use with `--source pi` or `all` |
| `--min-kb N` | 300 | Size floor, `size > N*KB`. `0` disables; use it when a real recent GPT/ACP session is below the default floor |

## Examples

```bash
# last session
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15

# previous session + cost
python3 {baseDir}/scripts/session-recap.py -p dictcli -m 20 --cost

# all recent sessions
python3 {baseDir}/scripts/session-recap.py -a -m 10

# last 3 sessions
python3 {baseDir}/scripts/session-recap.py -p notes -s 3 -m 10

# commit list
python3 {baseDir}/scripts/session-recap.py -p nixos-config --commits

# pi sessions only
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source pi

# pi native GPT/Codex sessions only
python3 {baseDir}/scripts/session-recap.py -p entwurf -m 15 --source pi --harness gpt

# entwurf Claude/Opus sessions only (not Claude Code)
python3 {baseDir}/scripts/session-recap.py -p entwurf -m 15 --source pi --harness acp

# Claude Code sessions only
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source claude

# both harnesses (default is current harness only)
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source all

# recent session too small (<300KB) to pass the filter — disable size filter
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --min-kb 0
```

## Choosing `-p` (project name)

Default rule: **the last directory component of CWD**.
project = repo directory name (~/repos/gh/**agent-config** → `agent-config`).

| CWD | `-p` value |
|-----|-----------|
| `~/repos/gh/agent-config` | `agent-config` |
| `~/repos/work/some-proj` | `some-proj` |
| `/home/junghan` (home) | `home` |

### User intent overrides the CWD rule

In these cases don't use the CWD basename mechanically — use **the project of the
context the user pointed at**:

- "home 디렉토리 분신", "Entwurf", "분신 기록" → `-p home`
- "COS" / 비서실장 session → `-p cos`
- a named repo steward session → that repo name (`andenken`, `notes`, `entwurf`, …)

When unsure:

```bash
ls -lt ~/.pi/agent/sessions/ | head
```

inspect the recent session dirs and **confirm the user's stated task matches a recent
session name**.

Without `-p`, you get the single newest session across all projects — possibly a
different repo's.

## Workflow: "what was I just doing?"

```
Step 0: First decide if the user means home / Entwurf / COS / a specific repo steward.
Step 1: python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15
        (source unset → current harness auto: claude under Claude Code, else pi)
Step 2: Verify the target via the header (`═══ project [source] (file...) ═══` or
        `═══ project [pi:gpt|pi:acp] (...) ═══`) and the first 1–3 messages.
Step 3: If empty, stale, or too short → rerun the SAME axis with --min-kb 0 first
        (small recent session), then widen to --source all → -s 3 --skip 0
Step 4: Summarize from the verified output only.
```

## Escalation: multi-axis recall

Don't stop at session-recap — escalate to the `/recall` protocol when:

- The retrieved session is short (1-turn entwurf / smoke / "Reply OK").
- The user says "어제 전체", "오늘 이어서", "기억축", "compact 없이", "나를 리콜".
- The current repo session is right but cross-project recall (agent-config / andenken /
  voscli …) looks important.
- A journal `§repo` marker or llmlog may be the real spine of the work.

Escalation order: `session-recap` → extract proper nouns from the output →
two-pass `session_search` → if needed `day-query` (`gitcli --summary`, `denotecli day`,
`lifetract`, calendar) → report both the axis you saw and the one you didn't.

**Why harness-matched default?** To continue prior work you must read the *same*
harness's sessions (claude under Claude Code, pi under pi — auto). Historically Claude
Code produced many 1–2 message stubs, which argued for preferring `pi`; the **>300KB
size filter** now removes those stubs, so claude sessions also retain only real work.
Use `--source all` to see across harnesses. Use `--source pi --harness gpt` when the
operator says "GPT session" and means pi native GPT/Codex, not a project named `gpt`.

## Answer rules (important)

A summary answer must include at least these two lines:

- `조회 프로젝트: <PROJECT>`
- `대상 세션: ═══ ... ═══` (the header line)

And the summary must be grounded **strictly in the actual output text**. Do not blend in
memory, other sessions, or similar-looking work.

### Recommended response template

```text
조회 프로젝트: home
대상 세션: ═══ home [pi] (2026-04-19T23-53-12-415Z_...) ═══
# or: 대상 세션: ═══ entwurf [pi:gpt] (...) ═══

요약:
- ...
- ...
- ...
```

Writing the header first pins **what you are actually looking at** into the answer.

### When the output differs from the expected topic

If the expected topic (e.g. a denote wrapper) isn't in the output, don't force-fit it —
say so first:

- `현재 조회된 세션에는 denote wrapper 맥락이 없습니다.`
- `지금 출력은 모델 확인/인사 세션입니다.`
- `원하면 -p home 또는 -s 3으로 다시 확인하겠습니다.`

A mismatch is a **signal, not a failure**. Report it, then widen scope.

**Do not:**
- ❌ `read` the raw session JSONL (50KB JSON noise)
- ❌ Re-check the raw JSONL after `session_search` (redundant)
- ❌ Re-run the same command with tweaked flags 5+ times when empty
- ❌ Summarize from memory without checking the output header
- ❌ Use the CWD basename mechanically and ignore the user's stated context
     (home / Entwurf / COS / a specific repo steward)

## Cost

| Method | Context | Cost |
|--------|---------|------|
| raw JSONL read | ~100KB | ~$0.63 |
| **session-recap** | ~4KB | ~$0.09 |
