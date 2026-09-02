---
name: memory-sync
description: "Incrementally embed sessions only — near-live. On call, new sessions land in semantic-memory immediately. OpenRouter Qwen3-Embedding-8B 4096d, paid remote but ~$0.000–0.001 for a few recent sessions. dim 4096 preflight → API-0 exit when to_index=0. Use before a new session or when recent-session recall feels stale. '/memory-sync', 'memory sync', 'session embedding', '세션 임베딩', '세션 증분', '기억 최신화'."
user_invocable: true
---

# memory-sync — live session-index increment

Increments **only the sessions index** of semantic-memory. On call, new sessions
land in the memory layer right away. The one hand that keeps session recall fresh
— call it right before searching (semantic-memory) to catch the latest turns.

**md (garden), verify, compact, oracle replication are NOT done here.** That full
maintenance belongs to the `andenken-embed` skill in the andenken repo. This skill
is **one track, immediate increment** only.

## Call

```bash
bash {baseDir}/scripts/sync-sessions.sh           # sessions increment (default)
bash {baseDir}/scripts/sync-sessions.sh --push    # increment + oracle rsync (DB+manifest)
```

> **On thinkpad only.** See § Device authority below — this runs the indexer, and
> `INVARIANT.md` §7.1 says oracle must not.

Just call it. No args, no preview needed. The script handles it:

0. **`corpus:gather`** — collects every device's admitted sessions into
   `$ANDENKEN_SESSION_CORPUS` first, because the index is built from the corpus, not
   from this machine's live store. Network I/O (ssh rsync to oracle), delta-only. A
   device that is unreachable is a warning; a gather that *fails* aborts with
   "refusing to index a corpus of unknown freshness" and embeds nothing
   (`andenken/scripts/sync-sessions.sh:74-81`, read 2026-09-03). `SKIP_GATHER=1`
   opts out. Skipped entirely when `ANDENKEN_SESSION_CORPUS` is unset.
1. **dim 4096 preflight** (1 call) confirms provider/DB dim agreement.
2. **`to_index=0` → API-0 exit.** Nothing to embed → no probe, just exit (zero cost).
   Safe to re-call right after a run.
3. `to_index≥1` embeds only the new sessions — **from every device**, not just this
   one. Usually a few seconds, ~$0.000–0.001.

| Flag | Default | Effect |
|------|---------|--------|
| (none) | - | sessions increment, no oracle push |
| `--push` | off | after finishing, rsync `sessions.lance` + `session-manifest.json` → oracle. **thinkpad only** — refused elsewhere by the authority guard |

## Device authority — call this on thinkpad

thinkpad builds the index; oracle is a **query replica** and receives it by rsync
(`INVARIANT.md` §7.1). Running the indexer on oracle forks the corpus — it happened
once already (2026-06-19→07-06, replica 27,966 chunks against the canonical 24,882).

- `--push` is guarded: it refuses unless `~/.current-device` matches
  `$ANDENKEN_INDEX_AUTHORITY` (default `thinkpad`).
- **The increment itself is not guarded.** Measured 2026-09-03: `INDEX_AUTHORITY` is
  referenced only inside `push_replica` (`andenken/scripts/sync-sessions.sh:148-154`),
  so a plain call from oracle embeds into oracle's own `sessions.lance` and diverges
  it from the canonical index — silently, until the next push overwrites it.
- So the rule lives here rather than in a guard: **on oracle, do not call this.** If
  oracle's recall feels stale, the fix is a push from thinkpad, not a local sync.

The sessions track is OpenRouter `qwen/qwen3-embedding-8b` / 4096d. The old
`--backend ollama|gpu1i` 2560d path is retired. Cost is small but not zero
(`$0.01/M tokens`). The wrapper sources `~/.env.local` for `OPENROUTER_API_KEY`;
provider/dim safety lives in the andenken SSOT script.

## One synchronous call

The script takes a **non-blocking flock** (`data/.sync-sessions.lock`): if another
sync already holds it, the second run exits cleanly ("already running") instead of
racing the LanceDB writer. So an impatient re-call is safe — it just no-ops while
the first finishes. Still prefer one synchronous call and wait, so you don't fire
redundant runs.

| Pattern | Result |
|---------|--------|
| Synchronous call, wait to completion | ✅ correct |
| Background call, then other work | ⚠️ fine — but don't re-fire; the lock no-ops it |
| Concurrent call from two sessions / cron | ✅ safe — the second backs off cleanly |

To check by hand, use a self-match-safe pattern (a plain `pgrep -af sync-sessions`
also matches pgrep's own command line): `pgrep -af '[s]ync-sessions'`.

## Role split vs andenken-embed

| | memory-sync (this skill) | andenken-embed (andenken repo) |
|--|--|--|
| Scope | one track: sessions | sessions + md (garden) full maintenance |
| Purpose | recall freshness, immediate live increment | re-embed · verify · defrag · replicate |
| Anywhere | ✅ thin wrapper | in the andenken repo via `./run.sh` |
| md / verify / compact / oracle ops | ❌ (→ andenken-embed) | ✅ |
| Full rebuild (destructive) | ❌ | human gate (no agent automation) |

Just want sessions fresh fast → this skill. Need md increment / integrity checks /
fragment cleanup / oracle replication → `andenken-embed` in the repo.

## Notes

- **Explicit call only.** An agent does not call this on cron/automatically.
  (The andenken `sync-sessions.sh` itself assumes an hourly cron cadence, but that
  is andenken-side infra running separately from this skill's invocation.)
- When to call: before starting a new session, right after `/new` when prior-session
  recall is needed, before a search to catch the latest turns.
- Full-sync / cost gates / destructive rebuilds are not agent-automated (₩100K
  incident residual safety). Sessions increment only here; the rest → andenken-embed.
- SSOT is `~/repos/gh/andenken/scripts/sync-sessions.sh`. This skill is a thin
  wrapper that execs it (`{baseDir}/scripts/sync-sessions.sh`).
