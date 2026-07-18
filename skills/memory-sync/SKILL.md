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

Just call it. No args, no preview needed. The script handles it:

1. **dim 4096 preflight** (1 call) confirms provider/DB dim agreement.
2. **`to_index=0` → API-0 exit.** Nothing to embed → no probe, just exit (zero cost).
   Safe to re-call right after a run.
3. `to_index≥1` embeds only the new sessions. Usually a few seconds, ~$0.000–0.001.

| Flag | Default | Effect |
|------|---------|--------|
| (none) | - | sessions increment, no oracle push |
| `--push` | off | after finishing, rsync `sessions.lance` + `session-manifest.json` → oracle |

The sessions track is OpenRouter `qwen/qwen3-embedding-8b` / 4096d. The old
`--backend ollama|gpu1i` 2560d path is retired. Cost is small but not zero
(`$0.01/M tokens`). The wrapper sources `~/.env.local` for `OPENROUTER_API_KEY`;
provider/dim safety lives in the andenken SSOT script.

## One synchronous call — no races

This script has **no concurrency lock.** Two instances at once → index race.

| Pattern | OK |
|---------|-----|
| Synchronous call, wait to completion | ✅ correct |
| Background call, then other work | ⚠️ don't re-call the same sync |
| Background + sleep polling + follow-up sync | ❌ self-inflicted race |
| Concurrent call from two sessions | ❌ one session only |

Re-calling out of impatience = race. Wait for completion. Check first:
`pgrep -af 'sync-sessions|indexer.ts'` — if it returns, wait for it to finish.

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
