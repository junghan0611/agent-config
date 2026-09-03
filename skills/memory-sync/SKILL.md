---
name: memory-sync
description: "Incrementally embed sessions only — two modes. Default = local: this laptop's live sessions, zero ssh (embedding API still remote), no replica update; safe to call often. --global = gather every device (oracle+thinkpad), embed, then push the index AND replicate the corpus to oracle in one breath. OpenRouter Qwen3-Embedding-8B 4096d, ~$0.000–0.001 per call. dim 4096 preflight → API-0 exit when to_index=0. Garden (md) and OpenClaw harvest are NOT here → andenken-embed. '/memory-sync', '/memory-sync --global', 'memory sync', 'session embedding', '세션 임베딩', '세션 증분', '글로벌 세션 동기화', '기억 최신화'."
user_invocable: true
---

# memory-sync — session-index increment, two modes

Increments **only the sessions index** of semantic-memory. Two modes, one script.
These are steps 1) and 2) of the four-step operating procedure GLG fixed on
2026-09-03 (andenken#13, second comment — the thread wins over the body).

| | **local** (default) | **`--global`** |
|--|--|--|
| Step | 1) 빠른 세션 증분 | 2) 글로벌 세션 동기화 |
| Cadence | often / automatable | explicit call |
| Sessions gathered | this device only (`gather-corpus.sh --only <local>`) | every active device in `DEVICES.json` (oracle + thinkpad) |
| SSH / replica traffic | **none** — zero ssh | ssh to oracle (gather, push, replicate) |
| Embedding API | OpenRouter, remote, paid (same in both modes — "no ssh" is not "offline") | same |
| Embeds | new sessions in the corpus | same |
| After embedding | nothing | `sessions.lance` + manifest → oracle, **and** `corpus:replicate` → oracle, together |
| Oracle's bot sees | last `--global` | now |
| Fails when | local rsync fails | a rostered active device is unreachable (`--strict`) |
| Cost | ~$0.000–0.001 | same |

The canonical form of this table is the script's own `--help`
(`sync-sessions.sh --help`, read 2026-09-03 after the andenken steward widened
the help range to include it). If the two disagree, the script is right.

Steps 3) garden embedding (`sync:md`) and 4) OpenClaw harvest (`sync:openclaw`)
are **not here** — they are the `andenken-embed` skill. This skill is one track:
sessions.

## Call

```bash
bash {baseDir}/scripts/sync-sessions.sh             # local  — step 1)
bash {baseDir}/scripts/sync-sessions.sh --global    # global — step 2)
```

`/memory-sync` = local. `/memory-sync --global` = global. Arguments pass straight
through to the SSOT script; the wrapper only sources `~/.env.local` for the key.
`--local` and `--global` are exclusive (both → exit 2, "--local and --global are
exclusive"); an unknown flag is exit 2, "unknown arg: X". Measured 2026-09-03 by
the tester session.

> **On thinkpad only — the script enforces it, in both modes.** A call from a
> non-authority device is refused before any API call or DB write. See § Device
> authority.

## What each mode does

**local** (no flag, or `--local`):

0. **gather this device only.** `gather-corpus.sh --only <local device>` copies
   this machine's admitted live sessions into `$ANDENKEN_SESSION_CORPUS`. The
   indexer reads the corpus, never the live store, so this local copy is what
   makes "new sessions land immediately" true. Local disk only; a failure here
   still aborts with "refusing to index a corpus of unknown freshness" — a
   local rsync that fails is a real failure.
1. dim 4096 preflight (1 call) when there is work.
2. `to_index=0` → API-0 exit. Safe to re-call right after a run.
3. embeds only the new sessions.

**What local buys is not availability but not waiting.** An unreachable oracle
was already a warning, not a failure, in the full gather (`gather-corpus.sh`,
"An unreachable remote is a warning, not a failure"; read 2026-09-03). What local
removes is the ssh connect timeout, the remote enumeration and the rsync round
trip that every full gather pays — zero ssh, every call.

**Local does not update the replica. That is intended.** A step that runs often
must not drag an rsync to oracle every time, or the automation gets heavy. The
price is stated plainly: until the next `--global`, oracle's bots answer from the
index as of the last `--global`, and oracle-native sessions written since then
are not in the index at all. They are not lost — the corpus is append-only, and
`--global` catches them up. No fork is possible from this mode.

**`--global`**:

0. gather **every** active device (`gather-corpus.sh --strict`). An unreachable
   active device is a failure in this mode, not a warning — "global" promises
   both sides agree, and a push without oracle's sessions in it does not deliver
   that. Strict fails *last*: every reachable device is gathered and the
   manifest updated, then exit 1 — it reports incompleteness, it does not undo
   work. **A `--global` that fails because a peer is down is not a broken
   script: run local, and run `--global` again when the peer is back.** The
   full gather's own default stays lenient; only `--global` asks for strict.
1–3. as local.
4. `verify sessions` (API 0) — a failed verify refuses the push. Same rule as
   andenken-embed's "verify BEFORE pushing", now on this path too.
5. push `sessions.lance` + `session-manifest.json` → oracle (`rsync --delete`,
   authority-guarded), **and** `corpus:replicate` → oracle. The two never travel
   apart: on 2026-09-03 the index was pushed without the corpus and the replica
   sat at 75,326 chunks against the canonical 75,922 — asking the bot about that
   day returned nothing. Runs even when `to_index=0` (catch-up path); skipped
   entirely if the embed step did not complete cleanly.

Measured 2026-09-03 17:05/17:07 on thinkpad by the andenken steward: local
printed `mode: local (device=thinkpad)` and `gather corpus (local: thinkpad)`
with no roster loop and no push; global ran `verify sessions before publish` →
rsync index + manifest → `replicate corpus → replica` as one flow.

`--push` is a **deprecated alias of `--global`** (the script prints a notice and
behaves as `--global`). It is no longer part of this skill's surface; write
`--global`. Removal is reviewed once the documentation paths have landed.

## Device authority — call this on thinkpad

thinkpad builds the index; oracle is a **query replica** and receives it by rsync
(`INVARIANT.md` §7.1). Running the indexer on oracle forks the corpus — it happened
once already (2026-06-19→07-06, replica 27,966 chunks against the canonical 24,882).

The gate is the script's, not this page's, and it is the same gate in both modes:

- **The increment refuses on a non-authority device** — after the gather, before
  the dim preflight, the embedding and any DB write, so a refused run costs
  nothing. The gate is the `INDEX_AUTHORITY` test in
  `andenken/scripts/sync-sessions.sh` (grep the name rather than trusting a line
  number). Being *after* the gather is deliberate: a refused local call on
  oracle has already gathered oracle's own sessions, which is the half that
  machine is supposed to do.
- **The push inside `--global` refuses on the same test**, protecting the
  canonical index from being overwritten by an older copy.
- Escape hatches `ANDENKEN_ALLOW_REPLICA_INDEX=1` and `ANDENKEN_INDEX_AUTHORITY`
  exist; both fork the corpus. **Neither mode is implemented through them, and
  neither is a way to catch up.** Catching up is the authority's next
  `--global`.
- **A refusal is not a stale replica.** This machine's sessions still get indexed:
  they travel to the authority as source files via the gather and come back inside
  the pushed index. If oracle's recall feels stale, the fix is `--global` from
  thinkpad.

The sessions track is OpenRouter `qwen/qwen3-embedding-8b` / 4096d. Cost is small
but not zero (`$0.01/M tokens`). Provider/dim safety lives in the andenken SSOT
script.

## One synchronous call

The script takes a **non-blocking flock** (`data/.sync-sessions.lock`): if another
sync already holds it, the second run exits cleanly ("already running") instead of
racing the LanceDB writer. An impatient re-call is safe — it just no-ops. Still
prefer one synchronous call and wait. A `--global` holds the lock through the
push and replicate, so a local call fired during it no-ops too.

To check by hand: `pgrep -af '[s]ync-sessions'` (self-match-safe).

## Role split vs andenken-embed

| | memory-sync (this skill) | andenken-embed (andenken repo) |
|--|--|--|
| Scope | one track: sessions, modes local / global | sessions + md (garden) + OpenClaw harvest, full maintenance |
| Steps of the 4-step procedure | 1), 2) | 3) `sync:md` (+ `sync:md:oracle`), 4) `sync:openclaw` |
| Purpose | recall freshness | re-embed · verify · defrag · replicate · harvest |
| Anywhere | ✅ thin wrapper | in the andenken repo via `./run.sh` |
| md / verify / compact / openclaw | ❌ | ✅ |
| Full rebuild (destructive) | ❌ | human gate (no agent automation) |

Sessions fresh now → `/memory-sync`. Oracle's bots must see today → `/memory-sync
--global`. Garden, OpenClaw, integrity, defrag → `andenken-embed` in the repo.

## Notes

- **Explicit call only** from an agent. Local mode is the shape the timer takes:
  andenken ships `scripts/systemd/andenken-sync-sessions.{service,timer}` (30
  min, `ExecStart` with no arguments = local). It is **not installed** on
  thinkpad (`systemctl --user is-enabled andenken-sync-sessions.timer` →
  not-found, measured by the andenken steward 2026-09-03); installing it is
  GLG's choice, and that infra is separate from this skill.
- When to call local: before a new session, right after `/new`, before a search
  that needs the latest turns.
- When to call global: before asking an oracle-side bot about recent work, at
  end of day, after a long oracle session.
- `SKIP_GATHER=1` is a debugging escape (index whatever snapshot is on disk),
  **not** the local mode and not an operating surface — with it set, a session
  written since the last gather is never seen.
- Full-sync / cost gates / destructive rebuilds are not agent-automated (₩100K
  incident residual safety).
- SSOT is `~/repos/gh/andenken/scripts/sync-sessions.sh`. This skill is a thin
  wrapper that execs it (`{baseDir}/scripts/sync-sessions.sh`). Flag names and
  the mode table above are the contract agreed with the andenken steward on
  2026-09-03 (andenken#13); if the script's `--help` disagrees, the script is
  right and this page owes an edit.
