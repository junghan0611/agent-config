---
name: memory-sync
description: "Incrementally embed sessions only — two modes. Default = local: this laptop's live sessions, zero ssh (embedding API still remote), no replica update, no archive commit; safe to repeat. --global = gather every device (oracle+thinkpad), embed, then push the index AND replicate the corpus to oracle in one breath. OpenRouter Qwen3-Embedding-8B 4096d, ~$0.000–0.001 per call. dim 4096 preflight → API-0 exit when to_index=0. Garden (md) and OpenClaw harvest are NOT here → andenken-embed. '/memory-sync', '/memory-sync --global', 'memory sync', 'session embedding', '세션 임베딩', '세션 증분', '글로벌 세션 동기화', '기억 최신화'."
user_invocable: true
---

# memory-sync — sessions index increment

| Call | Gathers | Archive | After embedding | Fails when |
|---|---|---|---|---|
| `/memory-sync` = `bash {baseDir}/scripts/sync-sessions.sh` | this device only, zero ssh | no commit; newest regular sources indexed even if `HEAD` is older | nothing — oracle stays at the last `--global` | local rsync, readiness or form check fails |
| `/memory-sync --global` = `… sync-sessions.sh --global` | every active device in `DEVICES.json` (strict) | one checkpoint commit of that gather | verify → corpus + archive receive on oracle → push the paired index | unreachable device, archive refusal, verify or replication failure |

Both modes call the paid OpenRouter embedding API; `to_index=0` makes no API call. In archive mode every call first runs a whole-ledger readiness pass, so neither mode is a cost or latency promise. **thinkpad** only (index authority). SSOT: `~/repos/gh/andenken/scripts/sync-sessions.sh --help`; if this page disagrees, the script is right.

## Stop rules

| Signal | Do |
|---|---|
| exit 2 — usage, invalid annex bin, sessions policy pin, or `SKIP_GATHER=1` with `--global` on an archive corpus (API 0) | fix the call; no fallback |
| authority refusal (not thinkpad) | run on thinkpad; never set `ANDENKEN_ALLOW_REPLICA_INDEX` or `ANDENKEN_INDEX_AUTHORITY` |
| exit 75 `sessions-writer-busy` | wait for it, then one serial retry |
| exit 75 `sessions-writer-stale-lock` | stop; an operator confirms no writer and removes it by hand |
| exit 75 `corpus-custody-*` / `corpus-archive-lock` | custody held elsewhere or descriptor lost; stop, never reopen or delete the lock |
| exit 3 (source form), 10–18 (archive settings, budget, ledger, metadata) | stop; no local fallback or retry before the state is inspected |
| exit 19 `corpus-archive-restore-failed` | corpus index left as found — operator only |
| `--global` exit 1 | run local only when the log shows an unreachable device (`⚠ <device> unreachable`, `--strict: active device(s) not gathered`); otherwise inspect |
| verify failure | push refused; report, never push by hand |

Running sync? `pgrep -af '[s]ync-sessions'`.

## Boundaries

- Garden md, OpenClaw harvest, verify/compact and full rebuild → `andenken-embed` (andenken repo). Full rebuild and cost gates are human-only.
- Live pi-durable SQLite is never gathered; closed snapshots are admitted separately (andenken#15).
- `SKIP_GATHER=1` is a debugging escape, not a mode. No timer or cron.

## Corpus archive — code ready, first real run gated

GLG chose git-annex (agent-config#32). When the corpus root has a `.git` directory, `--global` is the commit-and-ship act: it commits that run's gather once and carries the same commit to oracle before the index. Local never commits. **Code support and synthetic end-to-end checks are done; the first real admission on both hosts and the first full run wait for the coordinator's gate and receipt.** Until that receipt exists, do not claim the archive holds the corpus.

- Never stage sources by hand; use the managed checkpoint, which enforces dotfiles/unlocked mode and verifies pointers.
- No `drop`/`dropunused`/`gc --prune` or lock deletion; never bypass or change the commit hook.

Order, exit codes, custody, annex bin: `~/repos/gh/agent-config/docs/memory-and-sessions.md` § Sessions sync operations.
