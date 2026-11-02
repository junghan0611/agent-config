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

agent-config owns the storage method, version retrieval and the ledger/commit rules; Andenken #18 owns the minimal compatible changes to its own gathering, replication, ledger and reader. Nix owns tool supply and storage placement. The actual change scope and the preservation and recovery of the originals are checked again before operational migration.

## Public Verification — Sessions as Evidence

This repo also owns the **resident-side policy** for publishing session artifacts when GLG wants public verification of harness behavior.

- `entwurf` owns bridge mechanism and invariants.
- `agent-config` owns export/review/upload workflow and publication criteria.
- Goal: long-term trust through evidence — raw-session publication, reject history, and later failure/drift analysis.
- Minimum publication gates: secret redaction, deny patterns, secret scanning (e.g. TruffleHog), semantic privacy review, small-batch dry-run.
- `pi-share-hf` is a strong reference shape for this pipeline.
