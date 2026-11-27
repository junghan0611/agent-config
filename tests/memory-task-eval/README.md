# Memory-task evaluation

Does an agent with a memory tool recover **what was decided, under which constraint, what was rejected and why** — with citations and without inventing? Everything here is synthetic. No real session, note, credential, trace or database belongs in this tree.

This is the consumer-side harness. Indexing and retrieval logic belong to [andenken](https://github.com/junghan0611/andenken) and are not reimplemented here.

## Sets

| Set | Question | Shape | Status |
|---|---|---|---|
| `v1` | Does the wiring work, and does turning the tool on change answers? | 4 tasks, 24 sessions, 56 rows; arms `off` / `baseline` | Executed once ([receipt](receipts/v1-run-2026-11-27.md)). At ceiling; it cannot rank retrieval builds. |
| `v2` | Comparison of two retrieval builds | 8 tasks, 176 sessions, 496 rows; arms `baseline` / `improved` | Frozen, never retrieved, **held back** (below) |

v2 is a separate set, not a retuning of v1. Its public pins: `freeze.json` sha256 `3e32a1908cbb0a82b53ee58e54fa2ae682c1f24c255140590cd1c106c3471e6b`, fixtures `0ed27c5881e2a136afe6a27231c5f74c96308d0c4ffd6f93865e874041218fad`, seed 2026112702.

## v2 order gate and publication hold

1. **Variant freeze first.** Both v2 builds come from the same base commit (andenken `90ee1841e1a96feb1cd5af77eec0aa3bfe61556b`, pinned in `sets.json`) with the same dependencies and build config (`package.json`, lock files, installed LanceDB version, `tsconfig.json`); the freeze holds the exact patch hash and both `dist` hashes. The earlier `f57e3b2` build is evidence for the v1 wiring and tool-effect run only, not a v2 baseline. No build path is built into the driver; the run record carries the pins and re-checks them before every use:

   ```bash
   python3 $E/drive.py freeze-builds --build "$BASE_BUILD" --improved-build "$IMPROVED_BUILD" \
     --base-commit <40-hex> --patch <diff file> --expect-patch-sha <announced hash> \
     --deps-ledger DEPS.sha256 --deps-links DEPS.links --andenken "$ANDENKEN_DIR" --record variant-freeze.json
   ```

   A build directory is `git archive <base>` (plus, for the improved arm, `git apply` of the one diff), the built `dist/`, and a `node_modules` that both arms share. The command refuses unless the baseline source equals the base commit, the improved source equals base plus exactly that diff (which may not touch dependencies, config or build output), the shared dependencies equal the owner's ledger, and each `dist/` equals a fresh compile of its verified source. The record holds hashes, counts, the Node version and a time, no paths; `pin`, `retrieve` and `run` re-hash dist, source and dependency bytes. It does not judge whether a set can discriminate the pinned diff.
   Then fix what both arms share with `drive.py consumer-manifest --build … --improved-build … --variant-freeze … --record consumer-manifest.json`. It derives each arm's real sandbox command, environment, agent settings and probe invocation, replaces host and build paths with placeholders and refuses unless the two are identical; it also pins the Pi, Node and sandbox bytes, model, prompts, limits, guard, probe and scorer. It is path-free and deterministic. A v2 `pin` needs it (`--consumer-manifest`), and `retrieve` / `run` recompute it and refuse drift.
2. Until then the build side receives **only metadata and freeze hashes**: no v2 corpus, tasks, gold, controls or generator.
3. Afterwards the index owner receives the corpus **only**.

`drive.py pin` refuses a v2 run record without a matching variant freeze, and `retrieve` / `run` re-check it. The driver cannot see when a corpus was handed over; that order is the coordinator's to keep.

The whole `v2/` directory stays out of this public repository, even after a variant is frozen, so it can remain a holdout for future comparisons. A public clone can run the offline suite and regenerate v1, but cannot regenerate v2. The hold and the gate are procedural, not access control: anyone with the same user account on the authoring host can read the files.

**Check whether the holdout can exercise the proposed change before building an index.** The first ranked-session variant was frozen and both builds independently reproduced, but the preflight showed the frozen holdout could not exercise its trigger. No v2 index, retrieval comparison, or model runs followed. This is not a tie or a no-regression result. A targeted fixture can test the mechanism; a separate, appropriately covered holdout is needed to measure downstream usefulness.

## Files

| Path | Role | Changing it |
|---|---|---|
| `v*/generate.py` | Deterministic fixtures, tasks, gold, design assertions | New fixtures hash: a new set |
| `v*/score.py` | Scorer, no model judge | v2: new set. v1: invalidates comparison with the receipt |
| other files in `v2/` (held) | Set rules and run-time parts pinned by the v2 freeze, plus `test_v2.py` and `FREEZE.md` | Pinned files: new set |
| `sets.json` | Expected hashes, counts, arms, seeds | Only together with a new set |
| `drive.py` | Sandbox, index gate, variant freeze, run record, batch loop | Free to maintain; each run record pins its hash |
| `coverage.mjs` | Asks andenken's own extractor whether every gold line is indexable | — |
| `test_offline.py` | Offline regression (v1 and generic driver) | — |
| `receipts/` | Aggregates and hashes of what actually happened | Append, do not rewrite |

`v1/generate.py` differs from the executed original in one line: it no longer pins a sibling `drive.py`. Fixtures are byte-identical (same aggregate hash).

## Offline check

```bash
python3 tests/memory-task-eval/test_offline.py   # python3; no andenken, index, network, auth or model
python3 tests/memory-task-eval/v2/test_v2.py     # python3 + node; only where v2/ is present
```

The public suite covers v1 regeneration against its frozen hash, the v1 scorer and event parsing (hand-written Pi event shapes), the batch loop with a fake process and fake credential, the default-off subscription gate, the variant freeze, and a scan for host paths, token-like strings and run artifacts. The v2 suite covers regeneration, its scorer and run-time parts, the two-build batch loop and the retrieval step with fakes.

## Dependencies for host runs

Linux with `bwrap`; Node from `/nix/store`; Python 3; the system CA bundle under `/etc/ssl/certs`; Pi **1.6.1** (found in the pnpm store, or `--pi-package` / `PI_PACKAGE_DIR`); an andenken checkout (`--andenken` / `ANDENKEN_DIR`, default `~/repos/gh/andenken`); a build directory holding `dist/`, `package.json` and `node_modules` (LanceDB 0.40.0); loopback Ollama on `127.0.0.1:11435` serving `bge-m3` with digest `7907646426070047…`. If `node_modules` is a symlink into a live checkout, dependencies are **not** pinned: record the andenken HEAD with the run.

The recorded baseline build is an isolated build of andenken `f57e3b2`; its `dist/` was reproduced byte-identically from that commit on 2026-11-27.

## Index handoff (owner: andenken)

This repo does not build indexes. The stock `candidate:sessions:build` asks a human for an interactive `yes`; do not fake a TTY. Ask the andenken owner for a synthetic index with this contract:

- Input: the generated `corpus/` tree **only**. Never `tasks.json`, `gold.json`, `controls.json` or this set's directory.
- Built through the real session extractor, keeping source JSONL line numbers.
- Output: a data directory holding only `sessions.lance` (`ollama-bge-m3-1024`, 1024d, stamp and FTS), with `sessionFile` absolute under a corpus root that is byte-identical to the generated one.
- A receipt with hashes and a read-only verify script, run before and after consumption.

The consumer only ever opens copies. The gate requires the exact row and file counts, no row outside the corpus root, every gold coordinate present, and no `md` or `openclaw` axis.

## Reproduce

Scratch is disposable: generate it outside the repository and under a path that reveals nothing personal, because index rows and tool results carry it to the model.

```bash
E=tests/memory-task-eval; S=$(mktemp -d /tmp/memeval.XXXXXX); SET=v1
python3 $E/$SET/generate.py $S/fixtures
REPO=$PWD; (cd "$ANDENKEN_DIR" && ANDENKEN_ENV_MODE=process-only node --import tsx "$REPO/$E/coverage.mjs" "$ANDENKEN_DIR" $S/fixtures)
python3 $E/drive.py dry-run  --set $SET --fixtures $S/fixtures
python3 $E/drive.py boundary --set $SET --fixtures $S/fixtures --build "$BUILD"
# v2: freeze-builds comes before any handoff (order gate above). After the owner handoff:
python3 $E/drive.py pin --set $SET --fixtures $S/fixtures --index "$HANDOFF/data" --corpus-root "$HANDOFF/corpus" \
  --build "$BUILD" --record $S/record.json            # v2: add --improved-build and --variant-freeze
python3 $E/drive.py retrieve --record $S/record.json --out $S/retrieval   # v2 only, no chat model; after first use the set cannot change
```

If the handoff keeps its own corpus root, generate fixtures anywhere and pass `--corpus-root`.

### Subscription turns are off by default

```bash
python3 $E/drive.py run --record $S/record.json --go "$(sha256sum $S/record.json | cut -c1-64)" \
  --allow-subscription-turns --out "$PRIVATE_OUT"
```

Without the flag nothing is read or created. The flag is a mechanism, not an approval: each batch still needs the owner's explicit permission for the rail and the run count. Rail: `openai/gpt-6.2-sol`, thinking `medium`. One pass in a seeded order; no retry or fallback; an unclean run, unexpected model or non-synthetic string stops the batch. Per run: 180 s, and the set's tool-attempt cap.

## Isolation, and what it does not cover

Each execution is a fresh `bwrap` sandbox: no host home, no gold or tasks, corpus read-only, a throwaway index copy, an allowlisted environment. For `run` only, a throwaway agent directory receives just the `openai` OAuth entry with refresh disabled, deleted afterwards (also on TERM/HUP; `SIGKILL` or power loss can leave it in a mode-0700 temp directory). Pi retries and compaction are disabled by settings.

- The network namespace is shared with the host: **egress is not blocked**. The model's only tool is `session_search`.
- The access token is readable by the sandboxed Pi process.
- The forbidden-string check runs on output events. It is after-the-fact detection, not prevention.
- `dictcli` query expansion is off in the sandbox, unlike an everyday consumer.
- Regex scoring can misjudge paraphrases. Raw synthetic answers may be read; frozen scores stay.

Run outputs (events, results, stderr) stay private and out of Git. Publish aggregates and hashes as a receipt.

## Not covered

pi-durable rows (blocked on an owner contract for a synthetic closed snapshot), garden and OpenClaw axes, cross-lingual claims, real-use quality, and any production corpus. `retrieve` and the v2 `run` path have not executed against an index yet.
