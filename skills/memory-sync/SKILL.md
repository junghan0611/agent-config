---
name: memory-sync
description: "Incrementally embed sessions only — two modes. Default = local: this laptop's sessions, zero ssh (API still remote), no replica update, no archive commit. --global = gather every device (oracle+thinkpad), embed, then push index + corpus to oracle together. OpenRouter Qwen3-Embedding-8B 4096d. No spend cap: after a parser/policy change or with unknown backlog, size it via andenken-embed first. Garden (md) and OpenClaw harvest are NOT here → andenken-embed. '/memory-sync', '/memory-sync --global', 'memory sync', 'session embedding', '세션 임베딩', '세션 증분', '글로벌 세션 동기화', '기억 최신화'."
user_invocable: true
---

# memory-sync — sessions index increment

| Call | Gathers | Archive | After embedding | Fails when |
|---|---|---|---|---|
| `/memory-sync` = `bash {baseDir}/scripts/sync-sessions.sh` | this device, zero ssh | no commit; newest sources indexed even if `HEAD` is older | nothing — oracle stays at last `--global` | local rsync, readiness or form check |
| `/memory-sync --global` = `… sync-sessions.sh --global` | all active `DEVICES.json` devices (strict) | one checkpoint commit of that gather | verify → corpus + archive to oracle → paired index push | unreachable device, archive, verify or replication |

Both modes use the paid embedding API. `to_index=0` = no embedding call, not zero side effects: gather, locks, readiness and manifest still run; `--global` still publishes. **thinkpad** only (index authority). SSOT: `~/repos/gh/andenken/scripts/sync-sessions.sh --help` — the script wins.

## Stop rules

| Signal | Do |
|---|---|
| first use after parser/policy change, or backlog unknown | Existing rows impose no spend cap; an eligible pending set is sent without a cost prompt. Stop before sync, warm release or local fallback; follow `andenken-embed` § "First run after the writer-recovery release (once)": incremental backlog → `estimate:sessions`, full historical candidate → `candidate:sessions:plan` (API 0). GLG accepts **whole** scope + cost |
| exit 2 — usage, invalid annex bin, sessions policy pin, or `SKIP_GATHER=1` with `--global` on an archive corpus (API 0) | fix the call; no fallback |
| not thinkpad (authority refusal) | run on thinkpad; never set `ANDENKEN_ALLOW_REPLICA_INDEX` / `ANDENKEN_INDEX_AUTHORITY` |
| exit 75 `sessions-writer-busy` | wait for it, then one serial retry |
| exit 75 `sessions-writer-stale-lock` | stop; operator confirms no writer, removes it by hand |
| exit 75 `corpus-custody-*` / `corpus-archive-lock` | custody held or descriptor lost; stop, never reopen/delete the lock |
| exit 3 (source form), 10–18 (archive settings, budget, ledger, metadata) | stop; no fallback or retry before inspection |
| exit 19 `corpus-archive-restore-failed` | corpus index left as found — operator only |
| `--global` exit 1 | run local only if the first-use row is cleared **and** the log shows unreachable (`⚠ <device> unreachable`, `--strict: active device(s) not gathered`); otherwise inspect |
| verify failure | push refused; report, never push by hand |

Running? `pgrep -af '[s]ync-sessions'`.

## Boundaries

- Garden md, OpenClaw harvest, verify/compact, full rebuild → `andenken-embed`. Full rebuild and cost gates are human-only.
- Live pi-durable SQLite is never gathered (closed snapshots: andenken#15).
- `SKIP_GATHER=1` is a debugging escape, not a mode. No timer or cron.

## Corpus archive — operational since 2026-11-03

git-annex (#32). With a `.git` corpus root, `--global` commits its gather once and ships it before the index; local never commits. The 2026-11-03 receipt (docs § Corpus archive checkpoint) covers C0 on both hosts and one global pass (C1) only; later checkpoints need own receipts; GitHub metadata push unapproved.

- Never stage sources by hand (managed checkpoint verifies pointers). No `drop`/`dropunused`/`gc --prune`, lock deletion or commit-hook bypass.

Order, exit codes, custody, annex bin: `~/repos/gh/agent-config/docs/memory-and-sessions.md` § Sessions sync operations.
