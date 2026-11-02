# Memory, sessions and public verification

Moved from the root README at `f05f103` (2026-10-30) without rewriting; only links and positional words were adjusted for the new location. The front door is [README.md](../README.md).

## Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Purpose |
|------|-----|---------|
| `session_search` / sessions skill axis | sessions.lance | pi/Claude Code records plus explicitly admitted closed pi-durable snapshots |
| `knowledge_search` / `search-md` | md.lance | Public digital garden export (`~/repos/gh/notes/content`) — agent-facing knowledge axis |
| `semantic-memory` OpenClaw axis | openclaw.lance | Private bot records, explicitly labeled and never a fallback from another axis |

Sessions and md embed through **OpenRouter Qwen3-Embedding-8B at 4096d**, with LanceDB vector/FTS retrieval. OpenClaw's independently computed compatible vectors are harvested, not re-embedded by this repo; row/vector publication is not a whole-hybrid quality certificate. FTS diagnostics distinguish a healthy zero from failure, not overall search usefulness. The Gemini embedding path is retired — `gemini-embeddings.ts` and `GeminiProvider` survive in andenken only as an unreferenced back-compat shim, and no preset selects them.

Agents call these autonomously. Ask "find notes on universal scholarship" and the md knowledge surface fires with dictcli query expansion. The older org embedding track is disabled in production; use `denotecli` for exact/raw Denote lookups. Loading strategy per harness lives in the [Harness Support](harness-surfaces.md#harness-support) table.

## Session Management — `/new` + recall

`/new` + recall is the explicit cross-harness recovery path when a new session is the right boundary. It is not an alternative policy that suppresses in-session compaction.

1. When a fresh session is preferable, `/new` to start fresh
2. The index-authority Pi host requests one detached local session refresh at session start / native session search; it never waits, uses a timer, or publishes to Oracle. Run `memory-sync` explicitly only when fresh-now is required.
3. In the new session, recover context with `/recall`

Compaction is an allowed lifecycle on every harness; agent-config and entwurf do not write a suppress/enable policy. The current surfaces are:

| Surface | Compaction key | Measured |
|---|---|---|
| `~/.claude/settings.json` | **no compaction key at all** | oracle, 2026-09-04 |
| `~/.pi/agent/settings.json` (live) | `compaction.enabled: true` | oracle, 2026-09-04 |
| `pi/settings.json` (this repo's reference) | **removed 2026-09-04** — was `enabled: false` | this release |

entwurf retired `autoCompactEnabled` and `env.DISABLE_AUTOCOMPACT` from its managed settings in 0.17.2 (#94). That retirement leaves timing and enablement to the harness that owns them; it does not prescribe a state. `pi/settings.json` likewise carries no compaction key, so a fresh machine receives Pi defaults rather than a stale policy.

As of 2026-10-03, compaction is left to **Pi's built-in text summarization for every provider, including `openai-codex`**. The Codex-native checkpoint extension is retired; no replacement compaction extension or policy key is installed. Text summaries are readable and can travel across models; faster compaction is not guaranteed. `/recall` still serves the distinct job of crossing sessions and harnesses.

**Migration:** removing a package from `pi/packages.json` does not uninstall it on an existing device. Run `pi remove npm:@ogulcancelik/pi-codex-compaction` on each device, then start a **new Pi process and session**. A running process may retain the loaded extension. Do not resume an old native-checkpoint session without it: the visible summary is only a marker, while the actual context requires the removed extension's `details.replacementHistory` handling. Keep old transcripts as evidence and recover through `/recall` instead.

`/recall` is the **multi-axis context hydration** protocol owned by agent-config — not a per-session recap, not a entwurf bridge contract. It starts with `session-recap -p <repo> -m 15` but does not stop at one repo transcript. When the work crossed projects or days, it combines:

- `session-recap` — repo-local transcript extractor, no raw JSONL
- `session_search` — cross-project / cross-session semantic recall
- `knowledge_search` / `search-md` — public garden md concepts, journal exports, botlog/llmlog-derived design history
- `gitcli day --summary` + `denotecli day` — day-axis reconstruction
- journal `§repo` markers — sibling/resident call index

The answer must state which axes were seen and which were not. This keeps `/recall` token-light while avoiding false confidence from a plausible single-session summary.

The protocol itself lives in [`commands/recall.md`](../commands/recall.md). The 2026-05-08 derivation history and raw evidence log are kept as a Denote llmlog note (`20260508T090911`, `~/org/llmlog/`) rather than as in-repo docs — `/recall` is a resident-side memory workflow, not a spec this repo carries. Renamed from `/recap` on 2026-05-12 to avoid shadowing Claude Code's built-in `/recap` (one-line session summary, feature-flagged via `tengu_sedge_lantern`); the two now coexist.

## Session originals under version control — #32 v1 preparation

The goal is to version-control the `sessions` folder and to check a retrieved original against the SHA ledger of the corresponding Git commit. The current scope of [#32](https://github.com/junghan0611/agent-config/issues/32) is a simple history and content-identity check. Separate signatures, keys or author authentication, and a complete version match between the embeddings and the originals, are not prerequisites.

| Step | Minimal rule |
|---|---|
| Store | Put the gathered original versions in git-annex and keep the existing `MANIFEST.json` and `MANIFEST.sha256` in the same commit. **Commit once, at the point where the session copy and ledger update of an explicitly requested full embedding have finished.** Concurrent gathering must not leave the stage and the ledger out of step. |
| Retrieve | Obtain the needed past version in a separate read location. Do not check out the current gathering folder to a past commit. Transfer content objects only in an explicit retrieval step. |
| Compare | Compare the actual file SHA256 with that path's value in the chosen commit's `MANIFEST.sha256`, and read the chosen commit's ID, date and message alongside it. The path's last-change commit is separate reference information. |

On 2026-11-02 GLG **chose git-annex** and decided to put the commit procedure into the sessions copy step of the full-embedding skill. A full embedding includes the usual global incremental request and does not necessarily mean a full rebuild. There is no commit per file or per automatic local warm; the commit reuses the gather of the same run. When nothing changed, no empty commit is made. Automatic execution is not yet implemented in the SSOT scripts; it will be connected after the actual corpus conversion and after compatibility with the existing replication and ledger.

The originals must be retrievable too. A ledger and pointers in Git alone do not show that the content objects are kept. Unretrieved objects, missing ledger entries and hash mismatches are kept distinct, and another, newer file is never silently substituted. The originals and metadata such as the ledger and file names are private by default. There is no plan to put session originals into this public config repo.

On 2026-11-02, git-annex 10.20260421 was tested in its default locked mode with one fake JSONL (205→271 bytes) and local producer/reader repositories. The third run passed 21/21 checks, and the two earlier failed runs were kept. This repo's coordinator read the scripts, logs and result table and independently checked 12 artifact SHAs and the original objects and ledgers of both commits. These are observations of this small setup, not a certification of real corpus operation, independent-host recovery, or scale/performance.

| Observation | Result |
|---|---|
| Clone without content → explicit local get | Unretrieved was kept distinct from mismatch; after retrieval the file matched the chosen commit's ledger |
| Retrieving a past commit in a separate read repo | The old original was also retrieved and its SHA matched; the producer repo's main and current v2 content stayed as they were |
| Comparing against another revision's ledger, or against an exported copy with 1 byte changed | Mismatch detected; the original annex objects were not modified |
| Separate annex init | The producer and reader repos have different annex UUIDs |

The evidence is the local private `fixture-annex/RESULT.md` (SHA256 `505bfa2289e1ba02cadd3deb36bdb42ca0d7415439bf7b6acd7f0d2081405329`) with its scripts, receipts and logs. The exact location is recorded in the issue branch NEXT. All reproduction inputs are synthetic.

The initial operating plan puts no automatic cleanup of content objects into the store or retrieve procedure. In this test, an object still referenced by an old commit was listed by `annex unused` as well. Do not conclude that `dropunused` is safe because the Git history remains. An explicit get also changed the producer repo's internal `refs/annex/last-index`, so it is not called a read without any side effect. At GLG's follow-up request, Git/annex metadata and a private origin were prepared in the existing `session` folder itself. The whole directory, including `.git`, is the backup unit. The originals are not ignored but managed as annex references; no actual registration or conversion of originals, initial main commit/push, or production reader change has been made yet. The existing ledger and roster SHAs were identical before and after the preparation.

Minimal touch points before migration:

- Andenken's existing `rsync` replication of the corpus root must not raw-copy `.git`. Excluding `.git` and actually transferring the content objects are separate matters.
- The ledger walk must exclude `.git` and distinguish unretrieved symlinks/pointers from real missing files or mismatches. In this default setup the annex keys carried no `.jsonl`, so the initial hypothesis that objects would leak into the ledger was not reproduced. Excluding `.git` remains a touch point to avoid needless internal traversal and configuration dependence.
- The retrieval location for original versions must not mix into normal gather/index discovery, and must keep the existing reader's allowed paths and closed-snapshot boundary.
- Every corpus path sits under a dot directory (`.claude/`, `.pi/`), and git-annex adds dotfiles to Git rather than the annex unless told otherwise. A first local admission attempt on 2026-11-02 staged file contents into Git this way; it was caught before any commit and unstaged without touching the originals. Admission needs `annex.dotfiles` enabled and a pointer check before every corpus commit. The real corpus remains unregistered. The corpus repository now disables automatic Git garbage collection so that no unreferenced object is removed without approval, and its private inventory has a GLG-approved named commit-hook exception; whether to reclaim the unreferenced Git copies is still an open decision.

agent-config owns the storage method, version retrieval and the ledger/commit rules; Andenken #18 owns the minimal compatible changes to its own gathering, replication, ledger and reader. Nix owns tool supply and storage placement. The actual change scope and the preservation and recovery of the originals are checked again before operational migration.

## Sessions sync operations

Moved from `skills/memory-sync/SKILL.md` on 2026-11-02, when that skill was cut down to its call surface (call, stop rules, boundaries). The wording is kept; only headings and line wrapping changed. The skill stays the entry point; this section is the reference behind it. The SSOT for behavior is `~/repos/gh/andenken/scripts/sync-sessions.sh` and its `--help`: if this page disagrees, the script is right and this page owes an edit.

### Two modes

These are steps 1) and 2) of the four-step operating procedure GLG fixed on 2026-09-03 (andenken#13, second comment — the thread wins over the body).

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

The canonical form of this table is the script's own `--help` (`sync-sessions.sh --help`, read 2026-09-03 after the andenken steward widened the help range to include it).

`/memory-sync` = local. `/memory-sync --global` = global. Arguments pass straight through to the SSOT script; the wrapper only sources `~/.env.local` for the key. `--local` and `--global` are exclusive (both → exit 2, "--local and --global are exclusive"); an unknown flag is exit 2, "unknown arg: X". Measured 2026-09-03 by the tester session.

**local** (no flag, or `--local`):

0. **gather this device only.** `gather-corpus.sh --only <local device>` copies this machine's admitted live sessions into `$ANDENKEN_SESSION_CORPUS`. The indexer reads the corpus, never the live store, so this local copy is what makes "new sessions land immediately" true. Local disk only; a failure here still aborts with "refusing to index a corpus of unknown freshness" — a local rsync that fails is a real failure.
1. dim 4096 preflight (1 call) when there is work.
2. `to_index=0` → API-0 exit. Safe to re-call right after a run.
3. embeds only the new sessions.

**What local buys is not availability but not waiting.** An unreachable oracle was already a warning, not a failure, in the full gather (`gather-corpus.sh`, "An unreachable remote is a warning, not a failure"; read 2026-09-03). What local removes is the ssh connect timeout, the remote enumeration and the rsync round trip that every full gather pays — zero ssh, every call.

**Local does not update the replica. That is intended.** A step that runs often must not drag an rsync to oracle every time, or the automation gets heavy. The price is stated plainly: until the next `--global`, oracle's bots answer from the index as of the last `--global`, and oracle-native sessions written since then are not in the index at all. They are not lost — the corpus is append-only, and `--global` catches them up. No fork is possible from this mode.

**`--global`**:

0. gather **every** active device (`gather-corpus.sh --strict`). An unreachable active device is a failure in this mode, not a warning — "global" promises both sides agree, and a push without oracle's sessions in it does not deliver that. Strict fails *last*: every reachable device is gathered and the manifest updated, then exit 1 — it reports incompleteness, it does not undo work. **A `--global` that fails because a peer is down is not a broken script: run local, and run `--global` again when the peer is back.** The full gather's own default stays lenient; only `--global` asks for strict.
1–3. as local.
4. `verify sessions` (API 0) — a failed verify refuses the push. Same rule as andenken-embed's "verify BEFORE pushing", now on this path too.
5. push `sessions.lance` + `session-manifest.json` → oracle (`rsync --delete`, authority-guarded), **and** `corpus:replicate` → oracle. The two never travel apart: on 2026-09-03 the index was pushed without the corpus and the replica sat at 75,326 chunks against the canonical 75,922 — asking the bot about that day returned nothing. Runs even when `to_index=0` (catch-up path); skipped entirely if the embed step did not complete cleanly.

Measured 2026-09-03 17:05/17:07 on thinkpad by the andenken steward: local printed `mode: local (device=thinkpad)` and `gather corpus (local: thinkpad)` with no roster loop and no push; global ran `verify sessions before publish` → rsync index + manifest → `replicate corpus → replica` as one flow.

`--push` is a **deprecated alias of `--global`** (the script prints a notice and behaves as `--global`). It is no longer part of the skill's surface; write `--global`. Removal is reviewed once the documentation paths have landed.

**pi-durable is an explicit snapshot source (2026-10-15, andenken#15).** Neither mode gathers live durable DBs or runs `index:durable`. Authorized closed snapshots are admitted/indexed separately through Andenken's `andenken-embed` maintenance contract. Global sync publishes their already indexed rows, durable checkpoint manifest and corpus copies; it does not establish coverage of new durable turns. `durable:plan` compares candidates without indexing. Reading is in `semantic-memory` § pi-durable; never add live SQLite files to the JSONL gather/rsync path.

### Device authority

thinkpad builds the index; oracle is a **query replica** and receives it by rsync (`INVARIANT.md` §7.1). Running the indexer on oracle forks the corpus — it happened once already (2026-06-19→07-06, replica 27,966 chunks against the canonical 24,882).

The gate is the script's, not this page's, and it is the same gate in both modes:

- **The increment refuses on a non-authority device** — after the gather, before the dim preflight, the embedding and any DB write, so a refused run costs nothing. The gate is the `INDEX_AUTHORITY` test in `andenken/scripts/sync-sessions.sh` (grep the name rather than trusting a line number). Being *after* the gather is deliberate: a refused local call on oracle has already gathered oracle's own sessions, which is the half that machine is supposed to do.
- **The push inside `--global` refuses on the same test**, protecting the canonical index from being overwritten by an older copy.
- Escape hatches `ANDENKEN_ALLOW_REPLICA_INDEX=1` and `ANDENKEN_INDEX_AUTHORITY` exist; both fork the corpus. **Neither mode is implemented through them, and neither is a way to catch up.** Catching up is the authority's next `--global`.
- **A refusal is not a stale replica.** This machine's sessions still get indexed: they travel to the authority as source files via the gather and come back inside the pushed index. If oracle's recall feels stale, the fix is `--global` from thinkpad.

The sessions track is OpenRouter `qwen/qwen3-embedding-8b` / 4096d. Cost is small but not zero (`$0.01/M tokens`). Provider/dim safety lives in the andenken SSOT script.

### Writer locks

All sessions writers share Andenken's `.sessions-write.lock` owner-token contract, including sync/admit/index/cleanup/compact and newly loaded Pi reindex. At the common writer gate, busy/stale is a **named exit 75**, not success or permission to delete the lock. Busy: wait for the named writer to finish before a later serial retry. Stale: an operator checks that no writer runs, then manually removes that lock directory; never auto-reclaim it. Older already-loaded Pi code needs separate operational coordination; a build alone does not update its in-memory functions.

The script takes the shared **non-blocking sessions writer lock** (`data/.sessions-write.lock`, or the configured data root) after gather/authority checking and before DB status, holding it through verify/push/replicate. A competing writer at this gate exits **75** with `sessions-writer-busy` or `sessions-writer-stale-lock`; it does not wait or silently succeed. Node and Bash children re-enter only with the live owner's token. No automatic stale reclaim. The older **sync-only flock** (`data/.sync-sessions.lock`) still runs first: local-vs-sync coalesces successfully and global-vs-sync waits for its own pass. That sync-only behavior does not bypass the common gate shared with durable index/admit/cleanup/Pi. Step 0's JSONL gather precedes the common gate; exit75 does not mean that gather did nothing. Use one invocation and inspect its result before deciding whether a later retry is needed.

To check by hand: `pgrep -af '[s]ync-sessions'` (self-match-safe).

### Role split vs andenken-embed

| | memory-sync (skill) | andenken-embed (andenken repo) |
|--|--|--|
| Scope | one track: sessions, modes local / global | sessions + md (garden) + OpenClaw harvest, full maintenance |
| Steps of the 4-step procedure | 1), 2) | 3) `sync:md` (+ `sync:md:oracle`), 4) `sync:openclaw` |
| Purpose | recall freshness | re-embed · verify · defrag · replicate · harvest |
| Anywhere | ✅ thin wrapper | in the andenken repo via `./run.sh` |
| md / verify / compact / openclaw | ❌ | ✅ |
| Full rebuild (destructive) | ❌ | human gate (no agent automation) |

Sessions fresh now → `/memory-sync`. Oracle's bots must see today → `/memory-sync --global`. Garden, OpenClaw, integrity, defrag → `andenken-embed` in the repo.

### Cadence

- **No timer or cron.** On the index-authority Pi host, the consumer-side `session-memory-warm` extension requests the local path detached at `session_start`, then occasionally before native `session_search`. It shares `warm-local.sh`'s 10-minute request debounce, never waits or publishes, and can leave a current result one sync behind. The gathered local corpus includes both Pi and Claude Code transcripts, so that one Pi pulse refreshes the shared sessions index Claude Code later queries; only Pi receives the freshness line. Other harnesses remain explicit. The existing andenken systemd timer is **not installed** on thinkpad (`systemctl --user is-enabled andenken-sync-sessions.timer` → not-found, measured 2026-09-03), and this feature does not install it.
- Call local explicitly when fresh-now is required: before a handoff, after a long session, or when the displayed freshness receipt is too old.
- When to call global: before asking an oracle-side bot about recent work, at end of day, after a long oracle session.
- `SKIP_GATHER=1` is not the local mode. Managed archive global/full runs refuse it before work; managed local still validates custody/readiness and regular sources. Where a legacy debug path allows it, newer live sessions are not gathered.
- Full-sync / cost gates / destructive rebuilds are not agent-automated (₩100K incident residual safety).
- The skill is a thin wrapper that execs the SSOT script (`skills/memory-sync/scripts/sync-sessions.sh`). Flag names and the mode table are the contract agreed with the andenken steward on 2026-09-03 (andenken#13).

### Corpus archive checkpoint — operational admission and version readback

GLG selected **git-annex** for the sessions corpus on 2026-11-02 (agent-config#32). During an explicitly requested whole-embedding maintenance run, checkpoint the gathered session files and existing MANIFEST files together in one Git commit **after successful corpus copying and inventory update**, before proceeding to embedding/publication. Reuse that run's gather; do not gather twice. A whole-embedding ask can be ordinary global incremental maintenance, not necessarily a destructive full rebuild.

This is not a commit per file, per automatic warm request, or per local sync. Unchanged archive state needs no empty commit. Record the archive commit and manifest digest in the maintenance result; exact embedding-to-source version identity is not a new prerequisite. Git metadata push/content replication needs its own approved destination and transfer scope; this rule does not authorize a public session upload.

**Operational receipt — 2026-11-03.** Both hosts admitted C0 `c741a97e…` with 3744 originals, independent annex UUIDs, regular unlocked files and unchanged original inode/SHA. One normal global incremental pass checkpointed C1 `8fe911ac…` (3753 originals, 6,308,719,987 bytes), received 24 new keys on Oracle and merged location logs before publishing the paired index/manifests. Fresh native reads agreed at v106 / 115920 unique 4096d rows; all four session metadata SHA values matched. An independent sparse reader retrieved one changed JSONL at both C0 and C1: each actual SHA/size matched its revision's ledger and the two versions differed. The producer's HEAD/index/config stayed unchanged; annex last-index moved, a recorded readback limit. GitHub metadata push remains separately unapproved. Do not re-initialize this real corpus or repeat the batch merely to inspect it.

The operational pass used Andenken `06e923be` and helper `e2a3718c`; subsequent maintenance-guard hardening is separate evidence. Both old v4278 databases and exact original metadata/absence were retained inode-preserving while selected v80 was adopted, then incrementally updated. Preserve originals, all annex versions, incident Git objects and retained databases; no automatic rollback, drop or GC is authorized. The owning full-maintenance procedure remains Andenken's `andenken-embed` skill. See [CHANGELOG](../CHANGELOG.md) for the three-axis run, bounded recovery, capacity-deferred OpenClaw compact and unmeasured search/runtime boundaries.

Until 2026-11-03 this section said not to run the legacy full-root corpus replication, because it did not exclude `.git`. In archive mode replication now excludes `/.git/` and carries the archive commit through the helper; see the order below.

Measured pitfalls from preparation (2026-11-02) and operational admission (2026-11-03):

| Pitfall | Measured | Required handling |
|---|---|---|
| Every corpus path sits under a dot directory (`<device>/.claude/…`, `<device>/.pi/…`) | `git annex add` treated all 3744 files as dotfiles and staged their **full content into Git** ("dotfile; adding content to git repository"); `annex.largefiles=anything` in `.gitattributes` does not override it. Caught before commit, then unstaged index-only | The canonical sets `annex.dotfiles true` in the git-annex branch (2026-11-02, coordinator GO), and the helper still passes `-c annex.dotfiles=true -c annex.addunlocked=true` on every add |
| Pointer guard | — | Before any corpus commit, every staged path under `oracle/` and `thinkpad/` must be a blob under 1 KiB reading `/annex/objects/SHA256E-s<size>--<ledger sha256>`; otherwise do not commit |
| Unreachable Git objects expire silently | Synthetic: default `git gc` deleted unreachable Git objects older than two weeks, loose or in a cruft pack; `gc.pruneExpire=never` kept them. This concerns unreachable Git objects only — not annex content, and not versions reachable from a Git ref | The thinkpad corpus repo sets `gc.pruneExpire=never` and `gc.auto=0` (2026-11-02, coordinator GO); a replica sets the same at init, before its first commit |
| Automatic Git maintenance ignores `gc.auto=0` | First real run (2026-11-03): during merge-log, Git 2.54 replaced the canonical's packs (the old cruft pack and two others gave way to a new cruft pack, a new pack and a multi-pack-index). The trigger was not traced; `git maintenance run --auto` after fetch/commit is the working hypothesis. All 3128 previously retained Git objects survived, re-hashed by content (ok 3128, bad 0) | Both corpus repos set repo-local `maintenance.auto=false` (2026-11-03, coordinator GO) next to `gc.pruneExpire=never` and `gc.auto=0`, and the helper's `gc_protection` check refuses (exit 10) unless `maintenance.auto` reads as a Git-boolean false both locally and effectively. These settings disable automatic maintenance and protect against ordinary expiration defaults; they do not make packs immutable or prohibit a manual `git gc` or `repack` |
| Global hook on corpus metadata | `MANIFEST.json`/`MANIFEST.sha256` paths contain identity terms; strict mode blocked the metadata commit (212 matches) | GLG approved a named private-repo exception for this one repository on 2026-11-02 (secret scanning stays on; hook regression tests pass). Never bypass, override or change the hook mode as an agent |
| Replica host tooling | Oracle had a valid `git-annex` store path but none on any profile PATH | Pass the existing GC-rooted binary explicitly through `ANDENKEN_REPLICA_ANNEX_BIN` (below); do not install, switch or edit `~/.env.local` to make a run pass |

### Archive mode in the sync flow (Andenken #18)

Archive mode means the corpus root has a `.git` directory. A `.git` of any other shape (a gitfile or a symlink) is refused with exit 10 before any work; no `.git` at all keeps the legacy behavior.

`--global` in archive mode, in order:

1. Sessions policy pin check. `SKIP_GATHER=1` is refused here (`archive-skip-gather-refused`, exit 2, API 0), because skipping the gather would skip the checkpoint and publish a ledger the archive never committed.
2. Locks: the sync flock (FD 9) and the archive custody lock `<corpus>/.git/corpus-custody.lock` (FD 8, exported as `ANDENKEN_CORPUS_CUSTODY_FD=8` so every child re-enters on the same descriptor) are taken before the gather and held to the end of the run. The shared sessions writer lock is taken later: after the gather, before the index status read and the dimension probe.
3. Gather: the helper's `preflight` and the read-only source `form` check run before any copy; then the strict gather of every active device, the manifest update, and the helper's `checkpoint` (one commit, on the index authority only). A strict gather with an unreachable device ends with exit 1 and no checkpoint.
4. Index: the paid embedding runs only when `to_index` > 0.
5. Publish: `verify sessions` (API 0), then corpus replication — replica `preflight`, rsync with `/.git/` excluded under the replica's custody lock, `bundle`, replica `receive`, the location log merged back — and only then the index and manifest push. If the corpus or archive replication fails, its exit code is kept and the index transfer never starts, so the replica keeps its previous index. The index and manifest push itself is an rsync, not an atomic swap: if it fails partway, there is no guarantee that the replica's old index survives; only the remaining publish steps stop.

`--local` in archive mode holds custody, runs the same `preflight` and `form` before copying this device's sessions, updates the manifest and never commits. It indexes the newest regular sources even when `HEAD` is older. With `SKIP_GATHER=1` it still runs `preflight` and `form` before the writer starts. The readiness pass covers the whole ledger on every call, so local is not a latency promise.

| Exit | From | Meaning | Next |
|---|---|---|---|
| 1 with `--strict: active device(s) not gathered` | gather | A peer was unreachable; reachable devices were gathered, nothing was committed | Run local now and `--global` when the peer is back |
| 1 otherwise | wrapper | For example an authority refusal or a failed rsync | Inspect; it is not a peer-down signal |
| 2 | wrapper or indexer | Usage error, invalid annex bin directory, malformed sessions policy pin, or `archive-skip-gather-refused` | Fix the call or the pin; no fallback |
| 3 | `corpus-manifest.sh form` | A source is a symlink or an unretrieved pointer rather than a regular file with its own bytes | Stop; materialize through the corpus owner |
| 10–18 | helper | Precondition, budget, raw content in Git, ledger, key, hook, tree, divergence or verify | Stop; inspect before any retry or local fallback |
| 19 | helper, passed through unchanged | A staging step failed and its index restore failed too | Operator only; nothing further runs |
| 75 | custody (`corpus-custody-busy`, `-foreign`, `-fd-lost`, `-lock-not-regular`, `-open-failed`; `corpus-archive-lock`) | Another archive writer holds custody, or the inherited descriptor was lost | Stop and inspect; never open the lock afresh or delete it |
| 75 | sessions writer (`sessions-writer-busy`, `sessions-writer-stale-lock`) | Another index writer, or a stale lock | Busy: wait, then one serial retry. Stale: an operator removes it by hand |

Node children are launched with `node --import tsx`, because `pnpm exec tsx` was measured to drop FD 8.

**Oracle's `git-annex`.** No profile PATH on oracle carries `git-annex` (2026-11-02). The replica side therefore gets the existing GC-rooted binary explicitly, for that command only: set `ANDENKEN_REPLICA_ANNEX_BIN` to the absolute `bin` directory under the GC root `~/.local/state/session-annex/gcroots/git-annex-10.20260421` on oracle, written out as an absolute path. The wrapper refuses a relative value (exit 2), and the replica refuses a directory that does not exist there. Do not hard-code a Nix store path, install anything, switch profiles or add this to `~/.env.local`. Putting `git-annex` on oracle's PATH is a separate, later permission. On thinkpad `ANDENKEN_CORPUS_ANNEX_BIN` is optional; unset means the normal PATH.

### Archive helper — `corpus-archive.py` (contract v2)

`skills/memory-sync/scripts/corpus-archive.py` implements the checkpoint and the replica path as phases. Andenken's wrappers call it in archive mode as described above; it has not run against the real corpus yet. The canonical reference is its `--help` and module docstring.

| Phase | Host | Does |
|---|---|---|
| `preflight` | either | Read-only readiness: repository, tools, protections, raw content in Git, ledger pair, each source a present regular file inside its parents and not an unretrieved pointer, space budget. It does not require `HEAD` to match the current ledger: a local warm indexes newer regular sources with no archive commit |
| `checkpoint` | canonical | Admit exactly the ledger's changed paths (unlocked, dotfiles) and commit at most once |
| `bundle` | either | Package `main` + `git-annex` into a Git bundle; the repository is unchanged |
| `receive` | replica | Admit local regular copies under the canonical keys, then fast-forward `main` to canonical |
| `merge-log` | either | Union another host's `git-annex` branch (location log) from a bundle; `main` untouched |
| `verify` | either | Read-only audit of one archive version: compare a commit's (or the index's) ledger, pointers, worktree and objects. `--paths-from` takes a UTF-8 file with one relative path per line; an empty selection, empty line or repeated path is a usage error, so a narrowed scope cannot pass as success |

Mutating phases need the custody lock `<corpus>/.git/corpus-custody.lock`: the caller holds it with `flock` and passes the inherited descriptor as `--lock-fd N`, or an operator passes `--standalone`. `preflight` and `verify` run without it, but check it the same way when either flag is given, so a lost or wrong descriptor from an operating writer is 75. The lock is taken once per process. A Node caller must map the descriptor into the Python child explicitly; a `pnpm exec tsx` hop was measured to drop it, while `node --import tsx` keeps it. The path list comes from `MANIFEST.json` only; nothing walks the corpus or `.git`. No push, drop, gc, prune or content transfer happens inside the helper; the replica's copy arrives by `rsync --exclude=/.git/` run under the same lock on the receiving host.

The index restore covers only the staging step. What a failure leaves behind depends on where it happens:

| Failure point | Exit | State left behind |
|---|---|---|
| Before staging: arguments, lock, preflight, ledger and source checks, ancestry, metadata alignment | 2, 10, 11, 12, 13, 17, 75 | Index and `main` untouched. `receive` and `merge-log` may already have fetched the bundle into `refs/remotes/<name>/*` |
| Staging: `annex add`, metadata add, index guard, object check, and in `receive` the tree comparison | 13, 14, 16 | The index entries the phase changed are put back. Content objects already ingested stay in `.git/annex/objects`; the next attempt reuses them, and nothing drops them. Any other exception restores the same way and then crashes without a JSON summary |
| Restoring the index after a staging failure | 19 | The JSON names the original error and the restore failure; the index is left as found for inspection |
| `checkpoint` commit rejected (hook) | 15 | No commit. The staged pointers stay on purpose for inspection, so the next `checkpoint` refuses until an operator resolves the index |
| `receive` moving `main` (`update-ref` with the old value as guard) | 10 | `main` unchanged while the index already holds the canonical tree. The next `receive` refuses until an operator resolves it |
| `receive` or `merge-log` merging the location log (`git annex merge`) | 10 | `main` is already adopted (in `receive`); the location log is not merged yet. Running the same phase again retries the merge |

Rollback is partial, not atomic: an error in the JSON summary does not mean the phase was undone as a whole. The helper does not roll back refs automatically; the operator reads the state from the JSON and the repository. The space budget counts every key the ledger implies whose content object is not already present, so objects left by an earlier failed admission are reused rather than charged again.

Exit codes: 0 ok/unchanged, 2 usage, 10 precondition, 11 budget, 12 raw content in Git, 13 ledger, 14 key, 15 hook, 16 tree, 17 diverged, 18 verify, 19 restore, 75 lock.

## Public Verification — Sessions as Evidence

This repo also owns the **resident-side policy** for publishing session artifacts when GLG wants public verification of harness behavior.

- `entwurf` owns bridge mechanism and invariants.
- `agent-config` owns export/review/upload workflow and publication criteria.
- Goal: long-term trust through evidence — raw-session publication, reject history, and later failure/drift analysis.
- Minimum publication gates: secret redaction, deny patterns, secret scanning (e.g. TruffleHog), semantic privacy review, small-batch dry-run.
- `pi-share-hf` is a strong reference shape for this pipeline.
