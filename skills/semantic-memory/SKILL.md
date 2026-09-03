---
name: semantic-memory
description: "Meaning search over three separate axes — own pi/Claude sessions, the public garden, and (pending) OpenClaw bot memory — always naming which axis a hit came from. Use for past decisions, concept discovery, cross-lingual retrieval, and time/project session slices. Start with 5, choose, then open. Exact title/person → denotecli; whole-day truth → timeline/day-query. Triggers: semantic memory, session search, knowledge search, 의미 검색, 과거 결정."
---

# semantic-memory

Search, choose, then open. CLI: `{baseDir}/semantic-memory`;
the table omits this prefix. **The CLI surface is exactly
`search-sessions | search-md | search-knowledge | status | reindex`**
(`search-openclaw` is pending, andenken#13) — anything
else named here is a *sibling skill*, invoked on its own, not a subcommand.
Calling one as a subcommand returns `{"error":"Unknown command"}`
(reproduced at the bot 2026-09-03, reported by the GPT bot on andenken#10).

## API

| Intent | Call | Next move |
|---|---|---|
| Past decision/conversation | `search-sessions "query" --limit 5` | Inspect top 3–5; choose one session. |
| Known time/project | `search-sessions "query" --project andenken --date-from ISO --date-to ISO --mode recent` | Caller supplies a half-open ISO window; no embed/BM25/dictcli. |
| Meaning in known slice | `search-sessions "query" --project andenken --date-from ISO --date-to ISO --mode hybrid --limit 5` | Structured filters first, semantic rank second. |
| Public-garden concept | `search-md "query" --limit 5` | Choose a document and open its path; `--full` widens snippets. |
| What a bot said/remembers | **not callable yet** — `search-openclaw` is a planned subcommand (andenken#13); running it today returns `{"error":"Unknown command"}` | Until it ships, say so; do not substitute a session or md search and call it bot memory. |
| Exact title/tag/person | `denotecli search "name" --max 5` | Semantic neighbors never prove exact existence. |
| Chosen session context | `search-sessions "query" --with-excerpt --excerpt-limit 1` | Surrounding turns; raise to at most 3. Whole session: `session-recap --session-file <file>` — the `file` is a corpus path and joins as-is. |
| Health / maintenance | `status` (CLI) · then the `memory-sync` / `andenken-embed` **skills** | Check freshness; full maintenance is human-gated. |

## Three axes — say which one you searched

GLG's rule (2026-09-03): when a hit is quoted, the reader must be able to tell
**OpenClaw bot memory** from **our own sessions** from **the garden**. The three
are different corpora with different provenance, and no one of them is a fallback
for another.

| Axis | Track | What it is | Provenance to carry |
|---|---|---|---|
| sessions | `search-sessions` | pi / Claude Code transcripts of GLG's own work, every device | harness (`pi`/`claude`), device segment of `file`, project, date |
| garden | `search-md` | published notes (`notes/content`) | Denote ID / path |
| openclaw | `search-openclaw` *(planned, not callable)* | chunks the OpenClaw bots embedded themselves (`memory` + `sessions` sources, 6 agents), harvested as-is with zero re-embedding | `agent` (glg/bbot/gpt/…), `source` (`memory`/`sessions`), path, `updated_at` |

Rules that follow:

- **One axis per call, named in the answer.** "found in glg-bot's memory" and
  "found in your 2026-08 Claude session" are different claims. Never write
  "found in memory" for either.
- **Scores never cross axes** (rule 6 below), and neither do results: no
  automatic openclaw fallback into a session search, no session fallback into
  openclaw. The existing labeled MD fallback on thin session hits is the only
  cross-axis row and it stays labeled.
- **OpenClaw `source=memory` is the bot's durable memory, not a transcript.**
  Quote it as what the bot *keeps*, `source=sessions` as what was *said*.
- Chunking differs (OpenClaw `chunkTokens:400`), so rule 8's "count documents"
  applies per axis with a different density.
- **The openclaw track is local/replica only and never mixes with the garden
  (md) axis by any path.** md is the exported, public axis. The bot index holds
  GLG's whole world — family, health, money, code, in one place (measured
  2026-09-03 by the andenken steward on a sample). GLG's ruling, same day:
  "가족은 하나야. 그러려고 합친 거야" — that is the point of harvesting it, not a
  problem to filter. The only wall is local versus public; inside local, do not
  invent a personal/coding split the owner did not ask for.
- **"Not found in sessions, so try bot memory" is not a valid move.** Choose
  the axis from the question, never from a miss on another axis. This holds
  for the pi tools too, where an agent picks the tool by judgment.

**This table is the CLI surface.** The pi extension exposes a different surface:
its tools are `session_search` and `knowledge_search` only (andenken `index.ts`,
read by the andenken steward 2026-09-03), and there is **no openclaw tool in pi
yet** — a sibling inside pi cannot reach that axis until andenken adds
`openclaw_search` (open item on andenken#13). Do not assume the table above is
callable from pi.

The `search-openclaw` subcommand and the `openclaw.lance` track are being built in
andenken (andenken#13); until the CLI ships, this section is the contract, not a
working call.

## Nine operating rules

1. **Pick the axis.** Sessions recover what was said/decided and carry
   time/project signals. MD recovers durable public interpretation; it has no
   production time/project query axis. OpenClaw recovers what the bots said and
   kept, keyed by agent.
2. **Freshness first.** Invoke the `memory-sync` **skill** (not
   `semantic-memory memory-sync` — that is not a subcommand) before recent-work
   retrieval when the transcript may have grown. A stale absence is not a
   ranking miss.
3. **Start at 5.** MD keeps the same 40-candidate pool for limits up to 10, so 5
   lowers reading cost without shrinking findability. Widen only after reading
   the first screen and refining concrete names or terms.
4. **Open, do not re-query.** Results are compact document candidates: title,
   Denote ID/path, description, and short snippets. Read the chosen path; add
   excerpts only after choosing a session hit.
5. **Two passes, not one.** A first query in GLG's own abstract phrasing
   retrieves the neighborhood, rarely the canonical hit. Read the top candidates
   for concrete handles — project names, file names, coined terms, commands —
   and search again with those. This is the normal shape of the tool, not a
   recovery from a bad query: an independent GPT-bot run reached the wrong
   neighbor on pass 1 and the exact source turn on pass 2 (andenken#10,
   2026-09-03). Rule 4 forbids re-querying the *same* abstraction; this rule
   requires re-querying with what pass 1 taught you.
   Corollary: a long natural-language sentence is the weakest possible pass-1
   query. It also triggers the widest dictcli expansion, and wide expansion
   measurably hurts — the same run saw `["salvation","saving","rescueing"]`
   attached to a query about session addressing (andenken#12). Keep pass 1
   short and conceptual; put the length into pass 2's concrete terms.
6. **Scores rank; they do not certify.** Scores are uncalibrated within-query
   signals. Session and MD score distributions are not comparable. **Nothing in
   the ranking is recency** — the session axis applies no temporal decay
   (`recencyHalfLifeDays: 0` at `cli.ts:255` and `index.ts:571`, and
   `retriever.ts:365` short-circuits at `<= 0`; read 2026-09-03). A hit from
   2026-04 can outrank one from an hour ago on merit alone. When recency is
   what you actually want, say so with `--mode recent` or `--date-from`, never
   by assuming the top row is the newest.
7. **People/existence need exact proof.** Semantic search proposes candidates;
   `denotecli` confirms the exact room/person before you assert or link it.
8. **Count documents, not rows.** Repeated chunks are one document, and the
   session axis is chunk-dense: 75,267 chunks over 1,609 files, one session
   reaching 1,382 (measured 2026-09-03 from `andenken/data/session-manifest.json`).
   Long turns are split into numbered parts rather than truncated at 2K, so
   several rows from one turn is the normal shape, not a ranking signal.
   Explore results need distinct useful documents; a narrow lookup may favor one.
9. **Know the limits.** No production track has automatic Kiwi stem enrichment;
   dictcli expansion needs Hangul. MD `indexedAt` is export mtime, not the note
   date. Confirm temporal claims with `timeline`. A question-shaped query
   retrieves its own echo — asking `"남은 작업 뭐지"` returns the turns where
   *that question was asked*, not the answers (andenken golden, 2026-09-03,
   inherited). That is the concrete case behind rule 5 and `AGENTS.md`'s
   two-step strategy.

An unfiltered session search may append labeled MD fallback rows when session
hits are thin. Keep tracks separate and never compare their scores.

## Session options

`--source pi|claude` · `--date-from ISO` · `--date-to ISO` ·
`--project a,b` · `--role user,assistant,compaction` · `--session-file PATH` ·
`--session-file-contains TEXT` · `--mode semantic|hybrid|recent` ·
`--with-excerpt` · `--excerpt-limit N`.

`recent` is a timestamp-DESC stored scan with no embedding/BM25/dictcli call.
These options are for `search-sessions`; `search-md` accepts query, limit, and
`--full` only. Convert natural-language KST dates to ISO in the caller.

## Device axis — one index, two machines

The session index is built from the **gathered corpus**, not from one machine's live
store, so results mix thinkpad and oracle work and a query from either machine can
recover the other's. Measured 2026-09-03 by reading
`andenken/data/session-manifest.json`: 1,609 of 1,609 indexed paths are corpus paths
(oracle 1,017 / thinkpad 592), zero live-store paths.

- **There is no `--device` option here, by design** — no schema gained a device
  column. The device is the segment after the corpus root in the returned `file`
  (`~/repos/gh/session/<device>/…`). Read it there when provenance matters.
- The device says where a session was **collected**, not where it was created (the
  machines exchanged an `rsync -a` with mtimes preserved). Label with it; never rank
  or date with it.
- The returned `file` is exactly what `session-recap --session-file` takes — that
  seam is the reason no path is ever assembled by hand. `session-recap --device
  <name>` is the place a device *filter* exists.
- A hit whose path lives under the other device is normal now, not a bug report. Say
  which machine it came from when you quote it.

## Boundaries

- A day with no semantic hit is not an empty day: use `timeline` / `day-query`.
- Missing cwd, parent/child, or garden identity is not inferred: use
  `entwurf-peek` for the canonical meta-record join.
- Production org embedding is disabled: use `denotecli` for exact/raw `~/org`.
- `reindex --force` is destructive and paid-remote gated. Prefer the
  `memory-sync` skill; full rebuilds require the human cost gate.
