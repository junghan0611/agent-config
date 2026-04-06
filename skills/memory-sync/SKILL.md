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
bash ~/.pi/agent/skills/pi-skills/memory-sync/scripts/sync-status.sh
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
INDEX_CONCURRENCY=1 npx tsx indexer.ts sessions
```

## Step 4 — local org

```bash
cd ~/repos/gh/andenken && source ~/.env.local
INDEX_CONCURRENCY=1 npx tsx indexer.ts org
```

Important:
- trust the pre-flight estimate, not the raw `new file` count
- interrupted org runs can create a large stale set on the next run

## Step 5 — rsync org to oracle

```bash
rsync -avz ~/repos/gh/andenken/data/org.lance/ oracle:~/repos/gh/andenken/data/org.lance/
rsync -avz ~/repos/gh/andenken/data/org-manifest.json oracle:~/repos/gh/andenken/data/
```

Org should usually be embedded **once locally** and copied.
Do not pay twice for the same corpus unless explicitly needed.

## Step 6 — oracle sessions

```bash
ssh oracle "cd ~/repos/gh/andenken && source ~/.env.local && INDEX_CONCURRENCY=1 npx tsx indexer.ts sessions"
```

## Step 7 — final report

```bash
cd ~/repos/gh/andenken && npx tsx indexer.ts status
ssh oracle "cd ~/repos/gh/andenken && npx tsx indexer.ts status"
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

- always use `INDEX_CONCURRENCY=1`
- rely on throttling; do not chase peak throughput
- prefer repeated cheap incrementals over rare large rebuilds
- oracle is a receiver for org, not the primary org builder
- if something looks surprisingly large, stop and re-check pre-flight
