# Storage ledger

This is agent-config's durable record of memory storage placement, relocation, recovery and retirement. `NEXT.md` names the next action; this ledger keeps the current layout and dated evidence. It is not a new database, backup service or scheduled job.

## Recording workflow

After an explicitly requested storage operation:

1. Record the request, host, exact scope and before/after locations.
2. Separate copy, verification, activation and source removal. State what remains recoverable and what does not.
3. Carry decisive evidence here: content checks, repository identity, live-data invariants and observed capacity. Distinguish direct measurements from another owner's receipt.
4. Keep raw transcripts, credentials, per-file source paths, full inventories and private operational details outside this public repository. Name their private receipt location; do not imply another host can read it.
5. Update the current-layout table, append a dated event without erasing earlier events, and refresh the next action in `NEXT.md`.
6. Commit the bounded record through the commit skill. Push only on GLG's explicit request; stamp the successful push. No timer, automatic push or repeated data maintenance is introduced.

A Git metadata push is not a content backup. Moving a repository with its UUID is not creating another independent replica. Free-space observations are not promises about future allocation or reclamation.

## Current layout — internal recovery verified 2026-11-04

| Asset | Physical location | Role and availability |
|---|---|---|
| Earlier session corpus, complete `.git` and annex objects | `/mnt/data/agent-memory-thinkpad-20261103/session` | Preserved by the earlier move; external drive currently absent, contents not reverified today |
| Active local session corpus path | `$HOME/repos/gh/session` | Ordinary internal directory, `junghan:users` mode 0755; recovery baseline 3753 files/3139 keys independently hash-verified, subsequent C2 maintenance holds 3769 ledger sources and 3175 retained keys; no external dependency |
| Retained old sessions DB and original metadata | `/mnt/data/agent-memory-thinkpad-20261103/old-retained` | Old DB at `sessions.lance`; the remaining old-generation copy was moved, not discarded |
| Active sessions, MD and OpenClaw LanceDB stores | `$HOME/repos/gh/andenken/data` | Remain on the internal filesystem; not moved by this operation |
| Oracle source corpus and query replicas | Existing Oracle locations | Recovery baseline 3753 source hashes checked; subsequent C2 corpus publication and all three query DBs verified on 2026-11-04 |
| Private GitHub session repository | Git metadata branches `main` and `git-annex` | References, inventory and history only; no annex content upload |

The external parent directory is private (mode 0700). No encryption was configured during this operation; filesystem permissions are not disk encryption.

### Connection and boot boundary

**The internal path is authoritative for ongoing collection; the external disk is an occasional, explicitly requested archive copy, not a dependency of normal maintenance.** GLG clarified this on 2026-11-04. The earlier bind-mount design and root-owned mode-000 guard are superseded; both mounts were absent when the local directory was reactivated.

The permission-only change initially left an empty directory. Subsequent authorized recovery restored the current corpus and C0/C1-referenced history from Oracle, using ordinary file transfer plus Git bundle/receive rather than copying `.git` between hosts. The local repository has a new annex UUID distinct from Oracle and the external cold copy; all current-ledger files and referenced content keys passed independent hash verification. Normal managed-archive maintenance can now use the internal path.

The external `MOUNTING.md` describes the previous live-bind design and must not be followed to bind over the active local directory. A future explicit archive update must preserve and reconcile the existing external originals and history; do not overwrite or delete them as though the empty local directory were a complete replacement.

## Event history

### 2026-11-03 — Private metadata publication

Direct coordinator receipt BG15058, exit0: private visibility and reachable corpus-pointer safety were checked under custody before atomic Git push. Remote `main` matched `8fe911aca55baa73a93da8e7917ab44cadb6b372`; remote `git-annex` matched `f1171903b25cca01da7130099ae5e9e107d05b61`. Reachable metadata comprised 3423 blobs / 3,592,040 bytes. Corpus entries were annex pointers, not raw session bodies. Normal hooks and the 06:14 agenda stamp completed; no original content was uploaded.

### 2026-11-03 — Oracle old DB retirement

Oracle owner's BG4824 receipt reports GLG's separate direct retirement request at 06:12:06. The coordinator independently read the resulting retirement JSON and observed the old DB absent. The owner measured 9,283,805,184 allocated bytes recovered, with the active DB inode and active/original metadata unchanged. Original corpus, annex content and other backups were outside the operation.

The historical v4278 / 121842-row DB is therefore no longer available on Oracle. Its original metadata and adoption/retirement receipts remain. This Oracle permission was not treated as authority to delete ThinkPad data.

### 2026-11-03 — Regenerable npm cache cleanup

Direct BG15146 receipt: only npm's derived `_cacache` download cache was removed. Observed free space rose from 5,541,126,144 to 15,828,410,368 bytes: 10,287,284,224 bytes recovered. `_npx` and the last old-DB root retained their inodes; current databases, originals and annex objects were not touched. The existing translation-server `npm start` process was preserved.

Two earlier exit75 attempts removed nothing: one process probe matched its own shell text; the next also classified a long-running `npm start` service as a package writer. The corrected probe examined executable arguments and distinguished services from install/download operations. Installed npm source confirmed that cache cleanup targets derived `_cacache`, separately from `_npx`.

### 2026-11-03 — ThinkPad external relocation

GLG explicitly requested moving the old DB and the session folder to the connected external disk. Direct BG15247 completed at 06:47:45 KST, exit 0 / 3m36s.

- A single USB ext4 filesystem was mounted by its validated UUID, with `nodev,nosuid`. Existing disk contents were not formatted, overwritten or cleaned.
- The sync lock, original corpus custody and common sessions writer lock fenced the move. Complete source trees were copied into new external directories with metadata preserved; this was same-repository relocation, not replica bootstrap or raw `.git` replication between hosts.
- Complete source-before/source-after/destination trees matched by file SHA256, size, mode, owner, nanosecond mtime and symlink target. Corpus: 7067 regular files / 14,008,231,115 apparent bytes including its complete Git/annex store. Old-retained tree: 1137 regular files / 9,281,206,936 apparent bytes including original metadata.
- Corpus file-manifest digest: `34d6b97f375b403ce79e3df8d7234310139cca7695662ea4a403c3936e146233`. Old-retained file-manifest digest: `1f7bb15a7b9926cc38434900180ad1bffa4354a4e3415dff5bbe1dcc0900ae37`. These are migration manifests, not the corpus MANIFEST or adoption-tree digest.
- Destination custody was held before switching the stable home path to the bind mount. Preflight passed there, followed by all 3753 corpus entries and annex objects matching the selected C1 ledger. Main, git-annex ref, annex UUID and local config SHA were unchanged.
- The active internal DB retained its inode, version 106 / 115920 unique rows / 4096 dimensions /ID-set digest and all four metadata SHA values. No embedding, reindex, rebuild, compact, environment edit or runtime restart occurred.
- Only after verification and filesystem sync were the migrated local corpus backup and local old-DB directory removed. The external old DB remains available. Local original-metadata files and a move marker remain at the former retained parent.
- Internal free space rose from 15,830,802,432 to 39,179,882,496 bytes: 23,349,080,064 observed bytes recovered. External free space after the move was 105,423,044,608 bytes. Rounded `df` values: internal 37GiB, external 99GiB.
- Post-job checks confirmed the correct external UUID at the home-path bind, no hidden local relocation backup, and all owned sync/custody/shared writer locks released.

Private evidence on ThinkPad: `.agent-reports/20261102-session-integrity/{external-migration-20261103.json,npm-cache-cleanup-20261103.json,FINAL-CLOSEOUT.md}`. On the external disk: `MIGRATION.json`, `CORPUS-FILES.json`, `OLD-RETAINED-FILES.json`, `MOUNTING.md`. Decisive measurements are carried above; these host-local files are not public downloads.

### 2026-11-03 — Manual connection retained by choice

After the move and ledger publication, GLG explicitly said automatic mounting was unnecessary. No persistent mount or OS-switch task is queued. Keep the documented manual connection and normal-unmount procedure; a later configuration change requires a new request.

### 2026-11-04 — Restore the internal collection path without the external drive

The external-primary design had made the local path inaccessible whenever the drive was absent. GLG clarified that local collection must remain available and the external disk should receive only occasional explicitly requested copies. The earlier relocation interpreted that intent incorrectly.

Direct checks found no session bind, no `/mnt/data` mount and no external block device. After verifying that the underlying directory was empty and not a symlink or mountpoint, only its owner and mode were changed from `root:root` 000 to `junghan:users` 0755. Read/write/traverse checks passed. No contents were restored, collected or deleted; no Git initialization, indexing, mount, environment or database change was performed. The absent external copy was untouched.

### 2026-11-04 — Oracle source copy independently checked

GLG requested checking whether Oracle still held a copy and making internal source recovery the top NEXT item. Read-only inspection found the source corpus, Git main `8fe911aca55baa73a93da8e7917ab44cadb6b372`, git-annex ref `f1171903b25cca01da7130099ae5e9e107d05b61`, its independent annex UUID and 3139 regular files in the annex object store.

Direct BG15761 completed successfully in 1m59s: all 3753 files listed in `MANIFEST.sha256` passed `sha256sum --check --status`, with zero missing files or errors. They comprise 3752 JSONL files and one SQLite file, totaling 6,308,719,987 bytes. The ledger SHA before and after verification was exactly `f21c10148ed22dbfe46c870efa9246ae90de4bbb0745a3637beee65ed90199d3`. This verifies the current ledger's source contents, not every historical version or annex key. Private receipt: `.agent-reports/20261104-internal-corpus-recovery/oracle-readonly-verification.json`.

No restoration, collection, indexing or original-content change was performed. Local source recovery remains the priority; an empty writable directory is not a restored corpus. Any restoration must preserve the Oracle copy and handle Git/annex identities deliberately rather than raw-rsync `.git` between hosts.

### 2026-11-04 — Internal corpus and referenced version content restored

GLG authorized bringing the Oracle source copy back to the laptop, setting it up, then running normal whole-axis incremental maintenance, with existing Opus citizen `754cad` as the sole executor. Recovery used metadata-preserving `rsync -a` excluding `.git`, then the existing archive helper's bundle/receive contract under sync and corpus custody locks. No source deletion, raw `.git` replication, hardlinks, bind mount or database rewrite was used.

The executor's recovery receipt reports 3761 regular worktree files (3753 ledger sources plus eight metadata files), 6,310,360,083 bytes. All 3753 ledger sources matched the Oracle ledger. Local main is `8fe911aca55baa73a93da8e7917ab44cadb6b372`; local annex UUID is `d38a3dd0-6bff-4ab3-84e3-6dc5f9a847c4`, not Oracle's UUID or the former laptop UUID still held by the external cold copy. Fifteen C0-only keys (370,625,635 bytes) were additionally retrieved using standard git-annex transfer; the temporary Oracle remote was removed afterward. C0/C1 together reference 3139 keys totaling 5,960,662,406 bytes. The executor directly hashed every key and read back one changed path against each version's own ledger without changing the worktree. Its sessions reader verification passed: 115,920 unique rows, 4096 dimensions, zero orphan source files.

Coordinator BG15885 independently rechecked all current ledger file hashes and all 3139 actual local annex object hashes, sizes and single-link status: PASS. HEAD and ledger SHA remained stable across the check; three actual DB manifest hashes matched pre-recovery values. The executor's before/after sessions, MD and OpenClaw DB tree receipts also matched. Coordinator-observed free space was 15,781,322,752 bytes. No paid embedding occurred during recovery or this review.

Oracle originals, main/history and existing objects were preserved. The executor reports git-annex transfer state updates on Oracle (keys database, index stat refresh, last-index ref and transfer directories); this was not a claim of zero filesystem metadata writes. Unreachable incident Git objects and non-ref state from the old laptop repository were not reconstructed; their earlier external cold copy remains separate. The internal corpus no longer requires that external disk. Private receipts: `.agent-reports/20261104-internal-corpus-recovery/{RECOVERY-RECEIPT.md,coordinator-independent-verification.json}`. Whole-axis incremental maintenance was authorized to proceed only after the independent recovery check passed.

### 2026-11-04 — Post-recovery whole-axis incremental maintenance

Executor `754cad` reports all usual stages 2 → 3 → 4 completed successfully from 11:04 to 11:19. An API-0 managed gather and estimate preceded one paid sessions-global run. C2 is `4fae6345ddb6d6ed5b601c3934c7d4bc1d504ba0`: 36 changed/new files, 5240 chunks, zero errors, 108 API calls, approximately 1.815M tokens and $0.018 estimated session-provider cost. The current corpus has 3769 ledger files; its C0/C1 history remains retained. Oracle received 36 additional keys and the new internal-laptop UUID, then reverse annex logs were merged before the DB and paired session/durable/policy/S0 metadata were published. Final reported main and git-annex refs match both hosts; each holds 3175 objects.

Executor verification: sessions 117,096 unique rows, zero orphans, 4096 dimensions. Garden MD required no embedding calls; both sides verified 11,218 unique rows and zero orphans. The coordinator independently read identical garden source HEAD `6dd568882dba53a65622953facc56af58a32d8c6` and clean `content/` worktrees on both hosts; Oracle's 36 mtime suspects are not treated as a reason for replica-side indexing.

OpenClaw's first harvest found three dirty agents with valid identities. Normal upstream increments ran serially, then a second harvest showed all active agents clean. Only four confirmed superseded derived rows were pruned after backup and live recheck; 932 retained archive-class rows stayed. Four-core OpenClaw compaction reduced logical fragments 11 → 1; verification and Oracle publication completed at 10,518 unique rows. Upstream OpenClaw indexing used its own provider: its monetary cost was not measured and is not included in the approximately $0.018 sessions estimate.

The executor reports all writer locks released and final free space of 14,947,278,848 bytes locally and 13,114,494,976 on Oracle. No session/MD compaction, full rebuild, newly admitted live durable snapshot, GitHub metadata push or source-repo commit occurred. Private execution evidence: the Stage 2 section of `.agent-reports/20261104-internal-corpus-recovery/RECOVERY-RECEIPT.md` and adjacent `s2-*` logs. Coordinator final BG15972 independently passed all three DB verifiers on both hosts (exit 0 / 11s). Main was exactly `4fae6345ddb6d6ed5b601c3934c7d4bc1d504ba0` and git-annex exactly `759aeab753407f23cdef988a6529a428582646ce` on both; all five session/durable/policy/S0/MD metadata file SHA values matched across hosts. Sessions and MD had zero orphan files; OpenClaw's 618 harvest-host source paths are intentionally outside its verifier's existence checks. Local corpus worktree was clean and free space was 14,946,586,624 bytes. Full decisive hashes and verification limits are in private `FINAL-CLOSEOUT.md` beside the execution receipt. Completion DM 944 was delivered once and GLG acknowledged it; source documentation publication was then separately requested.

## Open decisions

- No persistent external or bind mount is queued. The external disk is not required for the active local path.
- The earlier OpenClaw compaction hold was closed by the authorized 2026-11-04 usual maintenance run. No repeat compaction is queued; later work still follows the [maintenance authority](memory-and-sessions.md#role-split-vs-andenken-embed).
- Any later retirement of the external old DB, annex version drop, incident-object GC, new content destination or newer live durable snapshot requires its own scope. Storage relocation is not authority for those operations.
