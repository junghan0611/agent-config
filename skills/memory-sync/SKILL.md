---
name: memory-sync
description: "Incrementally embed sessions only — two modes. Default = local: this laptop's live sessions, zero ssh (embedding API still remote), no replica update; safe to call often. --global = gather every device (oracle+thinkpad), embed, then push the index AND replicate the corpus to oracle in one breath. OpenRouter Qwen3-Embedding-8B 4096d, ~$0.000–0.001 per call. dim 4096 preflight → API-0 exit when to_index=0. Garden (md) and OpenClaw harvest are NOT here → andenken-embed. '/memory-sync', '/memory-sync --global', 'memory sync', 'session embedding', '세션 임베딩', '세션 증분', '글로벌 세션 동기화', '기억 최신화'."
user_invocable: true
---

# memory-sync — sessions index increment

| Call | Gathers | After embedding | Fails when |
|---|---|---|---|
| `/memory-sync` = `bash {baseDir}/scripts/sync-sessions.sh` | this device only, zero ssh | nothing — oracle stays at the last `--global` | local rsync fails |
| `/memory-sync --global` = `… sync-sessions.sh --global` | every active device in `DEVICES.json` (strict) | verify, then push index **and** replicate corpus to oracle together | an active device is unreachable, or verify fails |

Both modes call the paid OpenRouter embedding API (~$0.000–0.001); `to_index=0` exits with zero API calls. Run on **thinkpad** only (index authority). The SSOT is `~/repos/gh/andenken/scripts/sync-sessions.sh --help`; if this page disagrees, the script is right.

## Stop rules

| Signal | Do |
|---|---|
| exit 2 — `--local` with `--global`, or unknown flag | fix the call |
| authority refusal (not thinkpad) | run on thinkpad; never set `ANDENKEN_ALLOW_REPLICA_INDEX` or `ANDENKEN_INDEX_AUTHORITY` — both fork the corpus |
| exit 75 `sessions-writer-busy` | wait for the named writer, then one serial retry |
| exit 75 `sessions-writer-stale-lock` | stop; an operator confirms no writer runs and removes the lock by hand — never auto-reclaim |
| `--global` exit 1, peer down | run local now; `--global` again when the peer is back |
| verify failure | push is refused; report, do not push by hand |

Check for a running sync: `pgrep -af '[s]ync-sessions'`.

## Boundaries

- Garden md, OpenClaw harvest, verify/compact and full rebuild → `andenken-embed` in the andenken repo. Full rebuild and cost gates are human-only.
- Live pi-durable SQLite is never gathered; closed snapshots are admitted separately (andenken#15).
- `SKIP_GATHER=1` is a debugging escape, not a mode. No timer or cron.

## Corpus archive checkpoint — approved, not integrated

GLG chose git-annex (agent-config#32): an explicitly requested whole-embedding run commits the gathered sessions and MANIFEST files once, after gather and inventory update, before embedding. **No SSOT script does this yet, and no source file is admitted.**

- **Do not run the legacy full-root corpus replication during this transition: it does not exclude `.git`.** `--global` runs it (`replicate-corpus.sh --strict`), so coordinate with the Andenken owner until that compatibility change lands.
- Do not initialize, admit into or commit the real corpus without the coordinator's GO; never bypass or change the commit hook.
- Every corpus path sits under a dot directory, so git-annex stores raw content in Git unless `annex.dotfiles` is on; every staged corpus path must be an annex pointer before any commit.

Modes in detail, device authority, locks, measured pitfalls and the archive helper's phases: `~/repos/gh/agent-config/docs/memory-and-sessions.md` § Sessions sync operations.
