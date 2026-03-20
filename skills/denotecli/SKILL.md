---
name: denotecli
description: "Search, read, and analyze 3,000+ Denote/org-mode notes. Supports title/tag search, full-text search, heading search, outline extraction, and content reading. Use when working with ~/org/, Denote files, org-mode knowledge bases, or when user asks about notes, journal entries, or bibliography."
---

# denotecli — Denote Knowledge Base CLI

Search, read, and analyze 3,000+ Denote/org-mode notes (notes, bib, journal, llmlog).

Binary is bundled in the skill directory. Invoke via `{baseDir}/denotecli`.

All output is JSON.

## Why This Exists (not just rg/fd)

rg and fd can search files. This tool exists for what they can't do:

1. **Structured access** — Denote ID, frontmatter, tags, links parsed into JSON. Agent can reason about metadata, not just grep text.
2. **Heading-aware navigation** — Org-mode headings are the document's semantic units. `search-headings` and `read --outline` let the agent navigate by meaning, not line count.
3. **Korean↔English bridging** — The user thinks in Korean but tags in English. `keyword-map` translates between them. The user knows 한글 terms for everything but may not know the English academic term for fields outside tech.
4. **Tag governance** — English tags are the controlled vocabulary. `tags --suggest` uses stemming to find duplicates (llm/llms, agent/agents). `rename-tag` batch-fixes them across 3000+ files. Fewer tags = less complexity.
5. **Graph traversal** — `[[denote:ID]]` links form a knowledge graph. `graph` reveals what connects to what — no separate DB needed, the files ARE the graph.
6. **Agent as tag enricher** — The user is a polymath (philosophy, physics, art, tech...) who may not know the English term for concepts outside their speciality. The agent can read notes, understand content, and suggest proper English tags that map to universal knowledge categories. This is the long-term value: the agent completes what the human started.

## Typical Workflow

```
1. day 2023-02-22                  → 특정 날짜의 저널/노트/datetree 전체 조회
2. day --years-ago 3               → N년 전 오늘의 모든 기록
3. search "에릭 호퍼"              → find notes by title/tag (fast, filename-only)
4. keyword-map "이맥스"            → Korean↔English keyword mapping (한글→tag)
5. search-headings "창조"          → find topics inside notes (scans all headings)
6. search-content "양자역학 관찰자"  → grep full text across all files
7. read <ID> --outline --level 2   → see document structure before reading
6. read <ID> --offset 41 --limit 20 → read specific section by line range
7. graph <ID>                      → see what links to/from this note
```

## Commands

### day — 특정 날짜의 저널/노트 통합 조회

```bash
{baseDir}/denotecli day 2023-02-22           # 특정 날짜
{baseDir}/denotecli day --years-ago 3        # 3년 전 오늘
{baseDir}/denotecli day --days-ago 7         # 7일 전
{baseDir}/denotecli day 20230222             # Denote ID 호환
```

3개 소스를 통합:
1. **journal/** — daily(archive/일반) 또는 weekly 파일에서 시간 엔트리 추출
2. **diary.org** — datetree 구조에서 CLOCK duration 포함 엔트리
3. **당일 노트** — Denote ID가 해당 날짜로 시작하는 모든 파일

```json
{
  "date": "2023-02-22",
  "day_of_week": "Wednesday",
  "years_ago": 3,
  "journal": {"source": "...", "format": "daily-archive", "entries": [{"time": "06:20", "text": "기상"}]},
  "datetree": {"source": "...", "entries": [{"time": "07:45", "text": "등원", "clock": "0:01"}]},
  "notes_created": [{"id": "20230222T...", "title": "...", "tags": [...]}]
}
```

**day-query 스킬과 연동**: gitcli day, lifetract read와 함께 호출하면 날짜 기반 통합 뷰 완성.

### timeline-journal — 월간 저널 활동 개요

```bash
{baseDir}/denotecli timeline-journal --month 2023-02
{baseDir}/denotecli timeline-journal --from 2023-02-01 --to 2023-02-28
```

날짜별 엔트리 수, 소스(journal/datetree), 생성 노트 수를 한눈에.

```json
{
  "period": "2023-02-01 ~ 2023-02-28",
  "total_days": 28, "active_days": 28,
  "days": [
    {"date": "2023-02-01", "day_of_week": "Wednesday", "sources": ["journal","datetree"], "journal_count": 12, "datetree_count": 4, "notes_count": 0}
  ]
}
```

### search — find notes by title, tag, ID

```bash
{baseDir}/denotecli search "에릭 호퍼" --dirs ~/org --max 5
{baseDir}/denotecli search "emacs" --dirs ~/org --tags emacs
{baseDir}/denotecli search "창조" --dirs ~/org --title-only
```

- Multiple words = AND (all must match)
- Searches: Denote ID, title (from filename), tags
- Case-insensitive (Korean included)
- `--tags TAG`: filter by tag (comma-separated, OR)
- `--title-only`: search title field only

```json
[{"id": "20251107T082610", "title": "제목", "tags": ["tag1", "tag2"], "date": "2025-11-07", "path": "/home/..."}]
```

Signature가 있는 파일의 경우:
```json
[{"id": "20250904T075937", "signature": "5a2", "title": "힣-ai-에이전트-편재성-기억-연결", "tags": ["agents", "ai"], "date": "2025-09-04", "path": "/home/..."}]
```

### keyword-map — Korean↔English keyword mapping

```bash
{baseDir}/denotecli keyword-map "이맥스" --dirs ~/org
{baseDir}/denotecli keyword-map "emacs" --dirs ~/org
{baseDir}/denotecli keyword-map --dirs ~/org --max 100
```

- Extracts `#한글키워드` from meta note titles, maps to English filename tags
- Bidirectional: search by Korean keyword OR English tag
- No query = dump all mappings

```json
{"total_entries": 1, "entries": [{"keyword": "이맥스", "tags": ["emacs", "productivity", "texteditor"], "note_id": "20230521T215600", "title": "‡ #이맥스"}]}
```

### create — create a new Denote note

```bash
{baseDir}/denotecli create --title "대화 주제" --tags llmlog,topic --dir ~/org/llmlog --content "* 본문\n내용"
{baseDir}/denotecli create --title "새 노트" --tags emacs
```

- Auto-generates Denote filename (`YYYYMMDDTHHMMSS--slug__tags.org`) and header
- Tags are sorted alphabetically, sanitized (lowercase, no special chars)
- `--dir`: target directory (default: `~/org/notes`)
- `--content`: optional body text (appended after header)
- Returns created file metadata as JSON

```json
{"id": "20260222T185000", "title": "대화-주제", "tags": ["llmlog", "topic"], "date": "2026-02-22", "path": "/home/.../llmlog/20260222T185000--대화-주제__llmlog_topic.org"}
```

### search-content — grep full text across all files

```bash
{baseDir}/denotecli search-content "양자역학 관찰자" --dirs ~/org --max 10
{baseDir}/denotecli search-content "LSP 설정" --dirs ~/org --tags emacs --matches 1
```

- Full-text search inside all files (~3K files, ~14MB, ~300ms)
- Multiple words = AND (all must appear on same line)
- `--matches N`: max matches per file (default: 3, keeps output concise)
- Snippets trimmed to 200 chars

```json
[{"id": "...", "title": "...", "tags": [...], "path": "...", "matches": [{"line": 499, "snippet": "...양자역학의 관찰자 효과..."}]}]
```

### search-headings — find topics inside notes

```bash
{baseDir}/denotecli search-headings "양자역학" --dirs ~/org --max 10
{baseDir}/denotecli search-headings "창조" --dirs ~/org --level 1 --tags bib --max 5
```

- Searches org headings (`* heading`) across ALL files (~3K files, ~60K headings, ~30ms)
- Returns file metadata + matched heading with line number
- `--level N`: only search headings up to level N (0=all)

```json
[{"id": "...", "title": "...", "tags": [...], "path": "...", "heading": {"level": 1, "title": "양자역학의 해석", "line": 23}}]
```

### read — read note content

```bash
{baseDir}/denotecli read 20250314T152111 --dirs ~/org
{baseDir}/denotecli read 20241206T085900 --dirs ~/org --offset 40 --limit 30
```

- Returns full content + parsed frontmatter + outgoing `[[denote:ID]]` links
- Use `--offset`/`--limit` to read specific line ranges (from outline)

```json
{"id": "...", "title": "...", "tags": [...], "date": "...", "path": "...", "content": "...", "links": ["20240601T204208"]}
```

### read --outline — see document structure

```bash
{baseDir}/denotecli read 20250314T152111 --dirs ~/org --outline
{baseDir}/denotecli read 20250314T152111 --dirs ~/org --outline --level 2
```

- Returns org heading structure: level, title, line number, org tags
- Use before full read — line numbers let you target `--offset`/`--limit` precisely
- `--level N`: filter headings up to level N (0=all)

```json
{"id": "...", "title": "...", "tags": [...], "outline": [{"level": 1, "title": "1장 서론", "line": 5}, {"level": 2, "title": "1.1 배경", "line": 7}], "links": [...]}
```

### graph — outgoing/incoming link traversal

```bash
{baseDir}/denotecli graph 20250314T125213 --dirs ~/org
```

- Returns outgoing links (from this note) and incoming links (notes linking to this)
- Scans all files for incoming backlinks (~85ms for 3K files)

```json
{"id": "...", "title": "...", "outgoing": [{"source_id": "...", "target_id": "..."}], "incoming": [{"source_id": "...", "source_title": "...", "target_id": "..."}]}
```

### tags — knowledge base overview

```bash
{baseDir}/denotecli tags --dirs ~/org --top 20
{baseDir}/denotecli tags --dirs ~/org --pattern "emacs|vim"
```

```json
{"total_files": 3156, "total_tags": 2162, "tags": [{"name": "bib", "count": 966}, ...]}
```

### rename-tag — batch rename a tag across all files

```bash
{baseDir}/denotecli rename-tag --from apples --to apple --dirs ~/org --dry-run
{baseDir}/denotecli rename-tag --from llms --to llm --dirs ~/org
```

- Renames tag in both filename AND `#+filetags:` frontmatter
- Tags re-sorted alphabetically after rename (matches Denote convention)
- Handles merge: if file already has new tag, deduplicates
- `--dry-run`: preview which files would change without modifying

```json
{"old_tag": "apples", "new_tag": "apple", "modified": 25, "files": [...], "dry_run": false}
```

### tags --suggest — find similar/duplicate tags

```bash
{baseDir}/denotecli tags --suggest --dirs ~/org
```

- Detects plural duplicates (llm/llms, agent/agents)
- Detects derivation pairs (communication/communicational)
- Detects prefix overlaps (emacs/emacsian)
- Sorted by combined count (highest impact first)

```json
{"total_tags": 2164, "total_clusters": 75, "clusters": [{"stem": "llm", "tags": [{"name": "llms", "count": 25}, {"name": "llm", "count": 1}], "total": 26}]}
```

## Flags

| Flag | Applies to | Description | Default |
|------|-----------|-------------|---------|
| `--dirs DIR,...` | search, search-*, read, tags | Search directories (comma-separated) | `~/org` |
| `--dir DIR` | create | Target directory for new note | `~/org/notes` |
| `--title TEXT` | create | Note title (required) | — |
| `--content TEXT` | create | Body content | empty |
| `--max N` | search, search-headings, search-content | Max results (files) | 20 |
| `--matches N` | search-content | Max matches per file | 3 |
| `--tags TAG,...` | search, search-content, search-headings, create | Filter/assign by tag (comma, OR) | all / none |
| `--title-only` | search | Search title field only | false |
| `--level N` | search-headings, read --outline | Max heading level (0=all) | 0 |
| `--outline` | read | Show heading structure instead of content | false |
| `--offset N` | read | Start line (1-indexed from outline) | 0 |
| `--limit N` | read | Lines to read (0=all) | 0 |
| `--pattern PAT` | tags | Tag name regex filter | all |
| `--top N` | tags | Top N tags | 50 |
| `--suggest` | tags | Show similar/duplicate tag clusters | false |
| `--from TAG` | rename-tag | Tag to rename from (required) | — |
| `--to TAG` | rename-tag | Tag to rename to (required) | — |
| `--dry-run` | rename-tag | Preview without modifying files | false |

## Denote File Format

- **Filename**: `YYYYMMDDTHHMMSS[==SIGNATURE]--title-with-hyphens[__tag1_tag2].org`
- **ID** = unique timestamp identifier (the key for everything)
- **Signature** = 옵셔널 영숫자 코드 (`==5a2`, `==0za`). ~/org/meta/ 디렉토리의 syntopicon/propaedia 노트 203개가 사용 중
- **Frontmatter**: `#+title:`, `#+date:`, `#+filetags:`, `#+identifier:`
- **Links**: `[[denote:YYYYMMDDTHHMMSS]]`

## Knowledge Base Structure

| Directory | Purpose | Scale |
|-----------|---------|-------|
| `notes/` | Main notes | 800+ |
| `bib/` | Bibliography | 900+ |
| `journal/` | Weekly journals | 700+ |
| `llmlog/` | LLM conversation logs | 300+ |
| `meta/` | Meta topics | - |
| `archives/` | Archived notes | - |
| root `.org` files | diary, tasks, etc. | ~10 |

## Environment Paths

| Environment | Root Path |
|-------------|-----------|
| **Local** (Claude Code) | `~/org` |
| **Container** (OpenClaw) | `~/org` |

Multiple directories: `--dirs ~/org/notes,~/org/bib,~/org/journal,~/org/llmlog`
