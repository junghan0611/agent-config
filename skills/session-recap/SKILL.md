---
name: session-recap
description: "Extract a compact recap from previous pi or Claude Code session JSONL without reading raw JSONL. Use for 'last session', 'what was I doing', continuity restore, and pi-internal GPT vs ACP recall via --source pi --harness gpt|acp. Preserves the skip-before-size edge case; retry with --min-kb 0 when a real recent session is below the default size floor."
---

# session-recap — extract a session summary

Extract **only** user/assistant text from a session JSONL.
**Never** `read` a raw JSONL directly — it dumps ~50KB of JSON noise into context.

**Multi-harness corpus**: handles pi and Claude Code sessions. The unset-source runtime
fallback is Claude Code → `claude`, every other surface → `pi`; only those first two
callers are truly harness-matched. Codex, Antigravity, and other third surfaces write
neither indexed corpus, so they must choose `--source` explicitly and normally use
`--skip 0`. Inside `--source pi`, use `--harness gpt|acp|all` to distinguish pi native
GPT/Codex from entwurf Claude/Opus. `--source claude` still means Claude Code only.

**Corpus filters** (aligned with andenken `session-indexer.ts` — 0d4432b "tighten
corpus … >300KB, drop tmp + legacy"; the pi filename spec was re-pinned to the current
native form on 2026-08-10). Same discipline as session
embeddings, so recap usually sees substantive sessions instead of probes. Three filters
exist, and their order is part of the contract:

- **Structural filters** (applied *before* skip):
  - **tmp dirs excluded** (both runtimes) — pi `--tmp…--` / claude `-tmp…` scratch.
  - **pi current native filename only** — `<created-at>_<UUIDv7>.jsonl`, pi's present-day
    session id. **No backward compatibility** (GLG ruling 2026-08-10): the older garden-id
    form (`_YYYYMMDDTHHMMSS-<6hex>`), UUIDv4, `_delegate-`, and `_entwurf-` are *not*
    OR'd back in — corpus admission is one current spec. pi stopped emitting garden-id
    suffixes on 2026-08-06; a filter still demanding them made every pi session after that
    date invisible to both recap and the andenken session index. Filenames do not carry
    identity: the `garden id ↔ nativeSessionId ↔ transcriptPath` join belongs to the
    entwurf meta-record, and neither recap nor andenken reimplements it. claude is always
    UUID, so no filename filter.
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
| `--source` | runtime fallback | `pi`, `claude`, `all`. Unset → Claude Code=claude, every other surface=pi; third surfaces should set explicitly |
| `--harness` | all | pi-internal filter: `gpt`, `acp`, `all`. Use with `--source pi` or `all` |
| `--min-kb N` | 300 | Size floor, `size > N*KB`. `0` disables; use it when a real recent GPT/ACP session is below the default floor |
| `--device NAME` | all | Session-corpus device filter (`oracle`, `thinkpad`). **Implies `--skip 0`** unless you pass `--skip` yourself. Only meaningful with a corpus configured — see below |
| `--session-file PATH` | — | **Exact selection.** One absolute `.jsonl` path. Bypasses every discovery filter; cannot be combined with any of them |

### Session corpus — other machines' sessions

`ANDENKEN_SESSION_CORPUS` (set in `~/.env.local`, shared with andenken's indexer)
points at the gathered corpus, where every device's sessions live under
`<corpus>/<device>/` keeping the runtime's own path shape. Unset → live stores only,
exactly as before.

**The variable is the switch; `~/.env.local` is its SSOT.** When the variable is
*absent* from the process environment, recap reads that one key out of the file
before giving up. A process environment is captured once at login, so a line added
to `.env.local` afterwards is invisible to every session, daemon and agent that
started earlier — measured 2026-09-03, a shell carried every other
`ANDENKEN_SESSION_*` but not `ANDENKEN_SESSION_CORPUS`, and the corpus was silently
off while `semantic-memory` kept returning corpus paths that `--session-file` then
refused. Setting the variable to the empty string (`export ANDENKEN_SESSION_CORPUS=`)
is still a deliberate live-only opt-out and wins over the file.

**Discovery reads live ∪ corpus, not corpus instead of live.** andenken's indexer
replaces the live stores because `sync-sessions.sh` gathers first and so owns the
corpus's freshness; recap has no gather step. Corpus-only discovery would drop *this
machine's current session* whenever it was written after the last gather, and that
silently breaks the `--skip 1` invariant (current session = newest mtime) the whole
size-filter ordering above exists to protect.

Copies of one session held by two devices are folded by **basename** (UUID session id):
larger file wins — a transcript only grows, so the larger copy holds strictly more turns
— and a size tie breaks on the lexicographically smaller path, which keeps the choice
stable across machines. Same rule as andenken `dedupeByBasename`. Measured 2026-09-02:
2,104 live → 2,567 after union (+463 oracle), 0.07s.

The header shows provenance as `[claude@oracle]` / `[pi:gpt@oracle]`; live sessions carry
no `@` suffix. **A device says where a session was collected, not where it was created.**
The two machines exchanged an `rsync -a` with mtimes preserved, so origin is not
recoverable — use it to label and filter, never to rank.

### `--device` — what it selects, and why it skips nothing

`--device` filters before the dedupe fold, so it names *the copy under that device*,
not "the winner that happened to come from there". Two consequences, both measured
2026-09-03 on the live corpus:

- **On this machine, `--device thinkpad` is the corpus copy, not the live one.** Of
  2,575 discovered sessions the winning copy was live for 2,106 and `oracle` for 469
  — **zero** thinkpad-corpus winners, because a live transcript is always at least as
  large as its gathered copy. `--device thinkpad` is therefore how you reach a
  session that was *deleted from the live store* and survives only in the append-only
  corpus; for anything still live it just names the other copy of the same session.
- **`--device` implies `--skip 0`.** `--skip 1` exists to drop "the session being
  written right now", identified as newest mtime. That session is in the *live* store
  and carries no device, so it can never appear in a device-filtered list — skipping
  one there throws away the other machine's genuine newest session instead. Measured:
  `-p agent-config --device oracle` hid the 2026-09-02T19:08 session (`69f08580`)
  entirely until `--skip 0`. An explicit `--skip N` is still honoured.

## Exact selection — `--session-file`

The flags above *search* for a session. `--session-file` **names** one. Use it when
another tool already found the exact session — today that means `semantic-memory`, whose
results carry the session `file`. Without this flag search hands you a precise answer and
recap goes back to guessing "the recent session of this project".

```bash
# semantic-memory found it → restore it exactly
python3 {baseDir}/scripts/session-recap.py --session-file /abs/path/session.jsonl -m 20
```

**What it bypasses — all of it, deliberately.** tmp exclusion, the pi native
filename spec, `--min-kb`, and **`--skip 1`**. Dropping skip means exact selection *can
target the live current session* — sometimes what you want, but never by accident.
Reading your own live transcript may show an inverted `기간` line because the file is
still being appended and is not strictly time-ordered; the extracted text is unaffected.

**It refuses rather than guesses.** Combining it with `-s/-p/-a/--skip/--source/
--harness/--min-kb` is an error (exit 2), not a silent override — those flags describe a
search that is no longer happening. Named errors, each a different fact: not absolute ·
not `.jsonl` · a symlink · unreadable · outside `~/.pi/agent/sessions`,
`~/.claude/projects`, and (when set) the corpus roots · **parsed 0 messages** (exit 1 — the path is a real session file
but holds no readable turns; nothing is printed to stdout, so you can never write a
header for a session you did not actually read).

The header contract is unchanged, plus one `파일:` line carrying the full path, so the
answer rules below apply identically.

### Seam contract — what this flag does and does not join

| Signal | Owner | Consumed here? |
|---|---|---|
| `file` / `sessionFile` (path) | semantic-memory | **Yes** — `--session-file` |
| `line` / `lineNumber` | semantic-memory | **No.** Different address space |

**`entwurf-peek` → recap is still an open seam.** peek resolves a citizen's transcript
path internally but never emits it: `peek` prints only `<parent>/<name>` and has no
`--json`, and `situation --json` rows carry no transcript path. So a garden id cannot be
turned into a `--session-file` argument yet. Do not describe that path as available.

`semantic-memory` reports `sessionFile:lineNumber` where `lineNumber` is the **raw JSONL
line** (blank and non-message records included). recap counts **filtered messages**. The
two never line up, so recap does not take a line anchor and will not grow one. To read
around a semantic hit, that is semantic-memory's own job:
`semantic-memory search-sessions ... --with-excerpt`. Division of labor: **the hit
neighborhood belongs to semantic-memory, the exact session's spine belongs to recap.**

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
ls -lt ~/.pi/agent/sessions/ | head          # live store on this machine
```

inspect the recent session dirs and **confirm the user's stated task matches a recent
session name**.

Without `-p`, you get the single newest session across all projects — possibly a
different repo's.

## Workflow: "what was I just doing?"

```
Step 0: First decide if the user means home / Entwurf / COS / a specific repo steward.
Step 1: python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15
        (pi/Claude Code: unset source follows that runtime; third surfaces: set it explicitly)
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

**Why the runtime fallback?** To continue prior work under pi or Claude Code, read that
same runtime's sessions (pi under pi, claude under Claude Code — automatic). Codex,
Antigravity, and other third surfaces have no matching indexed source, so the fallback to
pi is only a compatibility default, not a claim that pi is their current transcript.
Historically Claude Code produced many 1–2 message stubs, which argued for preferring
`pi`; the **>300KB size filter** now removes those stubs, so claude sessions also retain
only real work. Use `--source all` to see across harnesses. Use `--source pi --harness
gpt` when the operator says "GPT session" and means pi native GPT/Codex, not a project
named `gpt`.

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
