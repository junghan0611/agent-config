---
name: memory-sync
description: "Incremental semantic memory sync for local + oracle. Inspect cost first, ask for approval, then sync sessions/org safely with throttling. '/memory-sync', 'memory sync', 'reindex memory', 'embedding update'."
user_invocable: true
---

# memory-sync

Safely update `andenken` semantic memory across:
- local machine (`thinkpad`)
- remote host (`oracle`)

This workflow exists to avoid **cost spikes**, **duplicate rebuilds**, and **cross-host confusion**.

## Core principle

Treat memory indexing as a **slow incremental sync**, not as a peak-throughput batch job.

## Mandatory order

1. Inspect status and estimated cost
2. Ask user approval
3. Incremental local sessions
4. Incremental local org
5. `rsync` local org index to oracle
6. Incremental oracle sessions
7. Report actual cost/time

## Step 0 — verify location

Before doing cross-host sync work:

```bash
cat ~/.current-device
TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S'
```

Normal direction:
- build on `thinkpad`
- push org index to `oracle`
- let `oracle` index sessions only

## Step 1 — inspect cost first

```bash
# Quick overview (sessions + org + oracle)
bash ~/.pi/agent/skills/pi-skills/memory-sync/scripts/sync-status.sh

# Detailed cost estimate (dry-run, no indexing)
cd ~/repos/gh/andenken && ./run.sh estimate all
# or: ./run.sh estimate sessions | ./run.sh estimate org
```

Show the result as a compact table before doing anything.
Do **not** auto-run after inspection.

## Step 2 — approval gate

Ask the user explicitly.

Rules:
- incremental only by default
- `--force` requires separate confirmation
- if estimated cost is **>$1**, reconfirm before proceeding

## Step 3 — local sessions

```bash
cd ~/repos/gh/andenken && source ~/.env.local
./run.sh index:sessions
```

## Step 4 — local org

```bash
cd ~/repos/gh/andenken && source ~/.env.local
./run.sh index:org
```

Important:
- trust the pre-flight estimate, not the raw `new file` count
- interrupted org runs can create a large stale set on the next run
- `./run.sh index:org --force` requires separate approval

## Step 5 — post-indexing verify (local)

```bash
cd ~/repos/gh/andenken && ./run.sh verify all
```

Must pass before rsync. Checks: duplicates, orphans, ghost zone, manifest.

## Step 6 — rsync org to oracle

```bash
rsync -avz --delete ~/repos/gh/andenken/data/org.lance/ oracle:~/repos/gh/andenken/data/org.lance/
rsync -avz ~/repos/gh/andenken/data/org-manifest.json oracle:~/repos/gh/andenken/data/
```

Org should usually be embedded **once locally** and copied.
Do not pay twice for the same corpus unless explicitly needed.

## Step 7 — oracle sessions

```bash
ssh oracle "cd ~/repos/gh/andenken && source ~/.env.local && ./run.sh index:sessions"
```

## Step 8 — oracle verify + final report

```bash
ssh oracle "cd ~/repos/gh/andenken && ./run.sh verify all"
cd ~/repos/gh/andenken && ./run.sh status
ssh oracle "cd ~/repos/gh/andenken && ./run.sh status"
```

Report format:

```text
=== memory-sync done ===
| item | before | after | cost |
|------|--------|-------|------|
| local sessions | X | Y | $A |
| local org | X | Y | $B |
| oracle sessions | X | Y | $C |
| oracle org | rsync | rsync | $0 |
| total |  |  | $T |
| duration | Xm Ys |
```

## Safety rules

- **use `./run.sh` interface** — never call `indexer.ts` directly (no `--dry-run` guard)
- always use `INDEX_CONCURRENCY=1` (run.sh default)
- rely on throttling; do not chase peak throughput
- prefer repeated cheap incrementals over rare large rebuilds
- oracle is a receiver for org, not the primary org builder
- if something looks surprisingly large, stop and re-check pre-flight
- verify before rsync — don't push unverified data to oracle

## Available run.sh commands

| Command | Purpose |
|---------|--------|
| `./run.sh status` | Index statistics |
| `./run.sh estimate all` | **Dry-run cost estimate** (no indexing) |
| `./run.sh index:sessions` | Incremental session indexing |
| `./run.sh index:org` | Incremental org indexing |
| `./run.sh verify all` | Post-indexing integrity check |
| `./run.sh cleanup org --dry-run` | Cleanup dry-run (report only) |
| `./run.sh cleanup org` | Dedup + orphan + manifest repair |
| `./run.sh search "query"` | Live search test |
