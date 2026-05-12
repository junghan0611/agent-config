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
| `day` | DATE [--years-ago N] [--days-ago N] | Journal/diary/notes for a date (`notes_created` + `notes_modified`) |
| `timeline-journal` | --month YYYY-MM | Monthly journal activity overview |
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
| `--tags T,...` | search*, create | Filter/assign by tag (OR). Reads filename slot only — `#+filetags:` header **not** indexed | all |
| `--level N` | search-headings, read --outline | Max heading level (0=all) | 0 |
| `--offset N` | read | Start line (1-indexed) | 0 |
| `--limit N` | read | Lines to read (0=all) | 0 |
| `--title-only` | search | Title field only | false |

## Output Contract

- **Empty result = `[]`** (JSON array), never `null`. Applies to all search-like commands (`search`, `search-content`, `search-headings`, `tags`, `keyword-map`, `graph` outgoing/incoming, `read --outline`, `rename-tag`, `day` entries). Safe to call `len(json.load(...))` directly. New in `e0a6c52` (2026-05-12).
- **Unknown flag = fatal.** `error: unknown flag: --X` → exit 1. No silent ignore. Typos like `--tag` (vs `--tags`) or `--limit` (vs `--max`) are caught immediately. Applies to all 11 commands. New in `e0a6c52`.

## Notes

### Denote filename format
`YYYYMMDDTHHMMSS[==SIGNATURE]--title__tag1_tag2.org`

### Knowledge base: ~/org/
notes/ (800+), bib/ (900+), journal/ (700+), llmlog/ (300+), meta/, archives/

### Why not rg/fd?
Structured JSON output (ID, tags, links parsed), heading-aware navigation, Korean↔English bridging, tag governance.
