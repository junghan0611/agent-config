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

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and the md knowledge surface fires with dictcli query expansion. The older org embedding track is disabled in production; use `denotecli` for exact/raw Denote lookups. Loading strategy per harness lives in the [Harness Support](harness-surfaces.md#harness-support) table.

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
- journal `§repo` markers — sibling/담당자 call index

The answer must state which axes were seen and which were not. This keeps `/recall` token-light while avoiding false confidence from a plausible single-session summary.

The protocol itself lives in [`commands/recall.md`](../commands/recall.md). The 2026-05-08 derivation history and raw evidence log are kept as a Denote llmlog note (`20260508T090911`, `~/org/llmlog/`) rather than as in-repo docs — `/recall` is a resident-side memory workflow, not a spec this repo carries. Renamed from `/recap` on 2026-05-12 to avoid shadowing Claude Code's built-in `/recap` (one-line session summary, feature-flagged via `tengu_sedge_lantern`); the two now coexist.

## Public Verification — Sessions as Evidence

This repo also owns the **resident-side policy** for publishing session artifacts when GLG wants public verification of harness behavior.

- `entwurf` owns bridge mechanism and invariants.
- `agent-config` owns export/review/upload workflow and publication criteria.
- Goal: long-term trust through evidence — raw-session publication, reject history, and later failure/drift analysis.
- Minimum publication gates: secret redaction, deny patterns, secret scanning (e.g. TruffleHog), semantic privacy review, small-batch dry-run.
- `pi-share-hf` is a strong reference shape for this pipeline.
