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

## Current layout — measured 2026-11-03 06:47 KST

| Asset | Physical location | Role and availability |
|---|---|---|
| ThinkPad session corpus, complete `.git` and annex objects | `/mnt/data/agent-memory-thinkpad-20261103/session` | The same canonical repository, now on external USB ext4; no new annex UUID |
| Existing session access path | `$HOME/repos/gh/session` | Bind mount of the external corpus; existing configuration and indexed source paths unchanged |
| Retained old sessions DB and original metadata | `/mnt/data/agent-memory-thinkpad-20261103/old-retained` | Old DB at `sessions.lance`; the remaining old-generation copy was moved, not discarded |
| Active sessions, MD and OpenClaw LanceDB stores | `$HOME/repos/gh/andenken/data` | Remain on the internal filesystem; not moved by this operation |
| Oracle source corpus and query replicas | Existing Oracle locations | Not moved during the ThinkPad USB operation; earlier publication receipts are separate |
| Private GitHub session repository | Git metadata branches `main` and `git-annex` | References, inventory and history only; no annex content upload |

The external parent directory is private (mode 0700). No encryption was configured during this operation; filesystem permissions are not disk encryption.

### Connection and boot boundary

**The mounts currently apply to this boot only. Persistent automatic mounting has not been configured.** The external filesystem is mounted at `/mnt/data`; the corpus is bind-mounted at its original home path. This is not a symlink or an environment-variable rewrite.

When unmounted, the underlying home-path mountpoint is root-owned mode 000. This prevents ordinary gather from silently writing a new empty legacy corpus there. Do not chmod away the guard when the drive is absent. The private migration receipt identifies the validated device UUID; do not select a disk solely by `/dev/sdX` or label.

Reconnection and normal unmount commands are on the drive at `agent-memory-thinkpad-20261103/MOUNTING.md`. Verify the device UUID, mount the filesystem, then bind the corpus. Before unplugging, finish readers/writers and normally unmount the home-path bind, then `/mnt/data`; no forced or lazy unmount. Persistent UUID-based mounts belong in `nixos-config` and need a separate configuration/apply decision.

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

## Open decisions

- Persistent mounting is intentionally not configured, following GLG's decision above; do not resume it as unfinished work.
- The earlier OpenClaw compaction capacity hold is relieved by the reclaimed space, but compaction has not run and does not restart automatically. Reassess need and budget under the existing [maintenance authority](memory-and-sessions.md#role-split-vs-andenken-embed).
- Any later retirement of the external old DB, annex version drop, incident-object GC, new content destination or newer live durable snapshot requires its own scope. Storage relocation is not authority for those operations.
