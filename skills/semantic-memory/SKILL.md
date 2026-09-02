---
name: semantic-memory
description: "Meaning search over past pi/Claude sessions and the public garden. Use for past decisions, concept discovery, cross-lingual retrieval, and time/project session slices. Start with 5, choose, then open. Exact title/person → denotecli; whole-day truth → timeline/day-query. Triggers: semantic memory, session search, knowledge search, 의미 검색, 과거 결정."
---

# semantic-memory

Search, choose, then open. CLI: `{baseDir}/semantic-memory`;
the table omits this prefix.

## API

| Intent | Call | Next move |
|---|---|---|
| Past decision/conversation | `search-sessions "query" --limit 5` | Inspect top 3–5; choose one session. |
| Known time/project | `search-sessions "query" --project andenken --date-from ISO --date-to ISO --mode recent` | Caller supplies a half-open ISO window; no embed/BM25/dictcli. |
| Meaning in known slice | `search-sessions "query" --project andenken --date-from ISO --date-to ISO --mode hybrid --limit 5` | Structured filters first, semantic rank second. |
| Public-garden concept | `search-md "query" --limit 5` | Choose a document and open its path; `--full` widens snippets. |
| Exact title/tag/person | `denotecli search "name" --max 5` | Semantic neighbors never prove exact existence. |
| Chosen session context | `search-sessions "query" --with-excerpt --excerpt-limit 1` | Surrounding turns; raise to at most 3. Whole session: `session-recap --session-file <file>` — the `file` is a corpus path and joins as-is. |
| Health / maintenance | `status` · `memory-sync` · `andenken-embed` | Check freshness; full maintenance is human-gated. |

## Eight operating rules

1. **Pick the axis.** Sessions recover what was said/decided and carry
   time/project signals. MD recovers durable public interpretation; it has no
   production time/project query axis.
2. **Freshness first.** Run `memory-sync` before recent-work retrieval when the
   transcript may have grown. A stale absence is not a ranking miss.
3. **Start at 5.** MD keeps the same 40-candidate pool for limits up to 10, so 5
   lowers reading cost without shrinking findability. Widen only after reading
   the first screen and refining concrete names or terms.
4. **Open, do not re-query.** Results are compact document candidates: title,
   Denote ID/path, description, and short snippets. Read the chosen path; add
   excerpts only after choosing a session hit.
5. **Scores rank; they do not certify.** Scores are uncalibrated within-query
   signals. Session and MD score distributions are not comparable.
6. **People/existence need exact proof.** Semantic search proposes candidates;
   `denotecli` confirms the exact room/person before you assert or link it.
7. **Count documents, not rows.** Repeated chunks are one document. Explore
   results need distinct useful documents; a narrow lookup may favor one.
8. **Know the limits.** No production track has automatic Kiwi stem enrichment;
   dictcli expansion needs Hangul. MD `indexedAt` is export mtime, not the note
   date. Confirm temporal claims with `timeline`.

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
- `reindex --force` is destructive and paid-remote gated. Prefer `memory-sync`;
  full rebuilds require the human cost gate.
