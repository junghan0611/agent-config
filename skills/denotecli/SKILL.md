---
name: denotecli
description: "Search, read, and analyze 3,000+ Denote/org-mode notes. Supports title/tag search, full-text search, heading search, outline extraction, and content reading. Use when working with ~/org/, Denote files, org-mode knowledge bases, or when user asks about notes, journal entries, or bibliography."
---

# denotecli — Denote Knowledge Base CLI

Binary: `{baseDir}/denotecli`. All output is JSON. Default --dirs: ~/org.

## Commands

| Command | Args | Description |
|---------|------|-------------|
| `search` | QUERY [--tags T] [--title-only] [--max N] | Find notes by title/tag/ID. Multiple words = AND |
| `search-content` | QUERY [--tags T] [--max N] [--matches M] | Full-text grep across all files (~300ms) |
| `search-headings` | QUERY [--level N] [--tags T] [--max N] | Find org headings across all files |
| `read` | ID [--offset N --limit N] | Read note content + frontmatter + links |
| `read --outline` | ID [--level N] | Heading structure with line numbers → use for offset/limit |
| `day` | DATE [--years-ago N] [--days-ago N] | Legacy date projection: journal/diary/notes (`notes_created` + `notes_modified`) |
| `agenda` | [DATE] [--week] \| --from YYYY-MM-DD --to YYYY-MM-DD | Detailed day/week journal body + agent stamps; `--from`/`--to` are paired and selectors are exclusive |
| `timeline-journal` | --month YYYY-MM | Monthly journal activity overview (count projection) |
| `graph` | ID | Outgoing + incoming links (backlinks) |
| `tags` | [--top N] [--pattern PAT] [--suggest] | Tag stats, duplicate detection |
| `keyword-map` | [QUERY] | Korean↔English keyword mapping |
| `create` | --title T --tags T [--dir D] [--content C] | Create new Denote note |
| `rename-tag` | --from T --to T [--dry-run] | Batch rename tag across all files |

## Examples

```bash
{baseDir}/denotecli search "에릭 호퍼" --max 5
{baseDir}/denotecli search-content "양자역학 관찰자" --max 10
{baseDir}/denotecli search-headings "창조" --level 1 --tags bib
{baseDir}/denotecli read 20250314T152111 --outline --level 2
{baseDir}/denotecli read 20250314T152111 --offset 40 --limit 30
{baseDir}/denotecli day --years-ago 3
{baseDir}/denotecli agenda 2026-09-11
{baseDir}/denotecli agenda 2026-09-11 --week
{baseDir}/denotecli agenda --from 2026-09-07 --to 2026-09-13
{baseDir}/denotecli graph 20250314T125213
{baseDir}/denotecli tags --suggest
{baseDir}/denotecli keyword-map "이맥스"
{baseDir}/denotecli create --title "새 노트" --tags llmlog,topic --dir ~/org/llmlog
{baseDir}/denotecli rename-tag --from llms --to llm --dry-run
```

## Workflow

```
1. search or search-headings → find note ID
2. read ID --outline         → see structure + line numbers
3. read ID --offset N --limit M → read specific section
4. graph ID                  → explore connections
```

For date queries: `day` + gitcli + lifetract = full daily view (see day-query skill).

## Key Flags

| Flag | Commands | Description | Default |
|------|----------|-------------|---------|
| `--dirs D,...` | most | Search directories | ~/org |
| `--max N` | search* | Max result files | 20 |
| `--matches N` | search-content | Max matches per file | 3 |
| `--tags T,...` | search*, create | Filter/assign by tag (OR). Reads filename slots **∪** `#+filetags:` header (union) | all |
| `--level N` | search-headings, read --outline | Max heading level (0=all) | 0 |
| `--offset N` | read | Start line (1-indexed) | 0 |
| `--limit N` | read | Lines to read (0=all) | 0 |
| `--title-only` | search | Title field only | false |

## Output Contract

- **Empty result = `[]`** (JSON array), never `null`. Applies to all search-like commands (`search`, `search-content`, `search-headings`, `tags`, `keyword-map`, `graph` outgoing/incoming, `read --outline`, `rename-tag`, `day` entries). Safe to call `len(json.load(...))` directly. New in `e0a6c52` (2026-05-12).
- **Unknown flag = fatal.** `error: unknown flag: --X` → exit 1. No silent ignore. Typos like `--tag` (vs `--tags`) or `--limit` (vs `--max`) are caught immediately. Applies to all 12 commands. New in `e0a6c52`.
- **Header-aware indexing.** `search` and `--tags` index `#+title:` and `#+filetags:` headers (top 30 frontmatter lines) **in union with** the filename slots. Previously filename-only — 6.4% of corpus (192/3,505 notes) had header-only words that silently missed. Each result carries `header_title` field when present. Added 2026-05-12.

### Agenda / `day` compatibility

`agenda` returns `{from, to, days}`. The inclusive `days` range is date-ascending and retains empty days as `journal: null`, `stamps: []`; agent stamps live only in `days[].stamps`.

`day.journal.entries[]` keeps `time`/`text` and additively carries `todo`, `body`, and `blocks`; `day.datetree` remains one legacy `{source, entries}` object or `null` (never an array). Do not merge stamp data into `day` or change `timeline-journal`.

The canonical public schema, source selection, and exclusions live in denotecli [`README.md` § `denotecli agenda`](https://github.com/junghan0611/denotecli#denotecli-agenda--하루주간-본문-payload); implementation invariants live in its [`AGENTS.md` § `agenda`](https://github.com/junghan0611/denotecli/blob/main/AGENTS.md#agenda--하루주간-본문-문-sorge20). Link there rather than copying field-level schema here.

### Empty day vs unopened root — ask a control day, never the target day

`agenda` returns `journal: null, stamps: []` for **two different situations**, and the JSON
looks identical:

1. **The day really is empty.** The weekly journal is **not generated** — GLG opens each week
   by hand (his ruling, 2026-09-14). So a Monday before he starts the week has no journal at
   all, and that is the normal state, not a fault. Never report it as an anomaly.
2. **The root was never reached.** With `HOME` unset, `denotecli agenda 2026-09-13` cannot
   resolve the org root and still **exits 0 with a well-formed empty day** — on a date that
   actually carries 21 stamps (measured 2026-09-14 01:4x).

So **never infer tool health from the day you are asking about.** Before you write "there is
nothing on that day", send one control query at a pinned past date that is known to carry rows:

```bash
denotecli agenda 2026-09-11 | jq '.days[0].stamps | length'   # 34 normally, 0 if the root is unreachable
```

Measured 2026-09-14 06:5x: `34` with `HOME` set, `0` under `env -u HOME`. Rule:

| control | target day | read it as |
|---|---|---|
| rows | rows | the day's real content |
| rows | empty | the day **is** empty — say so plainly |
| empty | anything | **UNKNOWN** — the tool did not open; do not report absence |

This is the same discipline as the unknown-flag rule above, one level up: there the risk was a
typo'd flag returning empty output, here it is an unreachable root. A false UNKNOWN costs a
sentence; a false "nothing there" becomes the next agent's premise.

**The HTTP door has a window; the CLI does not.** `agenda.junghanacs.com/api/agenda?date=` is the
same board pre-merged (Human · B · Agent rows on one time axis, `source` / `time` / `tags` /
`text`; ~109ms from a container) but it carries a **rolling window of about two weeks** and
answers anything older with `entries: []` — not an error (measured 2026-09-14 07:1x: `2026-08-30`
→ 0, `2026-08-31` → 44, while the local org holds both). A control day inside the window proves
the door opened; it does **not** prove the door can see the date you asked for. For anything
older than ~2 weeks, use the CLI, or only believe a zero when both doors agree on it.

### Modification time — `date` is not it

`date` is the note's **creation** stamp (from its Denote id), so comparing it against a commit
time answers the wrong question. The modification stamp is `#+hugo_lastmod:`, and it now ships
in the JSON of `search` / `list` / `day` / `read`:

- `lastmod` — normalised `YYYY-MM-DD`, the shape `day` has always used.
- `hugo_lastmod` — **raw, with `HH:MM` intact**. Compare times with this one. Normalising the
  time away is what made sorge read an 18:32 commit as newer than a 21:55 stamp on the same day.

So "which notes have gone stale" is one call now, not one call plus opening every file.

`date` itself has two shapes by command, and they are not interchangeable as strings:
`search`/`list` give `2026-02-22` (derived from the id), `read` gives `[2026-02-22 Sun 09:00]`
(the `#+date:` line verbatim).

`read --outline` also carries `description` and `abstract` (the callout before the first
heading), so "what is this note about" no longer needs the body. All four fields are
`omitempty` — a note that lacks one simply has no key.

Full field-by-field contract lives in the denotecli repo (`README.md` `## Output`, `AGENTS.md`);
that repo's caretaker document is denote id `20260222T090000`. Copying the field list here would
make a second copy that ages on its own — v0.9.0, deployed 2026-09-04.

## Notes

### Denote filename format
`YYYYMMDDTHHMMSS[==SIGNATURE]--title__tag1_tag2.org`

### Knowledge base: ~/org/
notes/ (800+), bib/ (900+), journal/ (700+), llmlog/ (300+), meta/, archives/

### Why not rg/fd?
Structured JSON output (ID, tags, links parsed), heading-aware navigation, Korean↔English bridging, tag governance.
