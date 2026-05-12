---
name: semantic-memory
description: "Semantic search over past sessions (pi + Claude Code) and the public digital garden md index (andenken md.lance, OpenRouter Qwen3-Embedding-8B 4096d). Uses LanceDB + hybrid retrieval (vector + FTS with score normalization). Korean↔English cross-lingual via dictcli expand. Recall tracking for memory consolidation. Use when searching for past conversations, decisions, context, or garden knowledge concepts."
---

# semantic-memory — Semantic Memory CLI

Search past sessions and the public digital garden md index by meaning. Hybrid retrieval: vector similarity + full-text search, MMR diversity. Sessions keep recency decay; md garden search disables decay because garden knowledge is not chronological.

Binary is a shell wrapper. Invoke via `{baseDir}/semantic-memory`.

All output is JSON.

## Why This Exists (not just grep/denotecli)

1. **Semantic search** — "NixOS GPU 설정" finds "RTX 5080 cluster configuration" even without keyword overlap
2. **Cross-lingual** — Korean "보편" finds English-tagged "universalism" notes via dictcli expand
3. **Korean morphology** — "설계했다" → stem "설계" via Kiwi (dictcli stem). 동사 활용형, 존경어, 복합명사 해체. 인덱싱 시 자동 적용
4. **Session memory** — Search past pi + Claude Code conversations, decisions, context across all projects. Filter by `--source pi` or `--source claude`
5. **Garden memory** — Search the exported public garden (`~/repos/gh/notes/content`) through andenken `md.lance`. This is the agent-facing knowledge axis; org embedding is disabled in production.
6. **Hybrid retrieval** — Vector similarity (0.7) + BM25 full-text (0.3), with score normalization and MMR diversity. Cross-signal agreement bonus for results found by both methods. md search has no recency decay.
7. **Auto-fallback** — When session results are thin, automatically includes knowledge/garden results
8. **Recall tracking** — Every search logged to `recalls.jsonl` for memory consolidation analysis

## Commands

### search-sessions — search past sessions by meaning

```bash
{baseDir}/semantic-memory search-sessions "NixOS GPU cluster setup" --limit 10
{baseDir}/semantic-memory search-sessions "claude-config memory 정리"
{baseDir}/semantic-memory search-sessions "beads migration"
{baseDir}/semantic-memory search-sessions "andenken 작업" --source claude
{baseDir}/semantic-memory search-sessions "nixos setup" --source pi
```

- Searches pi + Claude Code session JSONL files (user messages, assistant responses, compaction summaries)
- `--source pi` or `--source claude` to filter by harness (default: all)
- Korean queries auto-expanded via dictcli (e.g., "보편" → "universal, universalism, paideia")
- Auto-fallback to the knowledge/garden surface when session results are insufficient
- Default limit: 10

```json
{
  "query": "NixOS GPU cluster setup",
  "expanded": ["universal", "universalism"],
  "fallback": false,
  "count": 5,
  "results": [
    {
      "project": "hej-nixos-cluster",
      "role": "user",
      "source": "pi",
      "score": 0.0123,
      "file": "/home/.../.jsonl",
      "line": 42,
      "timestamp": "2026-03-15T10:30:00.000Z",
      "text": "RTX 5080 클러스터 NixOS 설정..."
    }
  ]
}
```

### search-md — search public garden md knowledge

```bash
{baseDir}/semantic-memory search-md "체화인지 embodied cognition" --limit 10
{baseDir}/semantic-memory search-md "양자역학 관찰자"
{baseDir}/semantic-memory search-md "digital garden"
```

- Searches the public digital garden export (`~/repos/gh/notes/content`) through `md.lance`
- Uses OpenRouter Qwen3-Embedding-8B 4096d via `ANDENKEN_MD_*`
- Vector input is body-only; FTS text includes Title/Tags + body
- Score normalization: vector + FTS on equal footing with cross-signal bonus
- MMR diversity re-ranking enabled by default; recency decay disabled for md
- Korean↔English cross-lingual via dictcli expand; short CJK fallback catches 1–2 character Hangul queries

```json
{
  "query": "체화인지 embodied cognition",
  "expanded": ["embodied", "cognition", "embodiment"],
  "count": 8,
  "results": [
    {
      "project": "notes",
      "role": "doc",
      "score": 0.4521,
      "file": "/home/.../repos/gh/notes/content/notes/20240601T123456.md",
      "line": 15,
      "timestamp": "2026-05-12T00:00:00.000Z",
      "text": "Title: 체화인지 embodied cognition\nTags: cognition, embodiment\n\n체화인지는 몸과 환경이..."
    }
  ]
}
```

### status — show index statistics

```bash
{baseDir}/semantic-memory status
```

```json
{
  "sessions": {
    "chunks": 15420,
    "indexed_files": 850,
    "total_files": 860
  },
  "md": {
    "chunks": 10119,
    "indexed_files": 2192,
    "indexed": true
  },
  "knowledge": {
    "chunks": 10119,
    "indexed_files": 2192,
    "indexed": true,
    "source": "md"
  },
  "org": {
    "chunks": 44916,
    "indexed": true,
    "production": "disabled"
  }
}
```

### reindex — rebuild session index

```bash
{baseDir}/semantic-memory reindex
{baseDir}/semantic-memory reindex --force
```

- Incremental by default (only new sessions)
- `--force`: drop and rebuild entire index
- Progress logged to stderr, final result to stdout as JSON

```json
{
  "indexed_sessions": 10,
  "new_chunks": 234,
  "total_chunks": 15654
}
```

## Flags

| Flag | Applies to | Description | Default |
|------|-----------|-------------|---------|
| `--limit N` | search-sessions, search-md, search-knowledge | Max results | 10 |
| `--source S` | search-sessions | Filter by harness: `pi` or `claude` | all |
| `--force` | reindex | Drop and rebuild entire index | false |

## Architecture

```
CLI (cli.ts)
  ├── embedding-provider.ts — Provider abstraction (ollama/vLLM/Gemini) + CachingProvider
  ├── store.ts              — LanceDB vector store (search + FTS)
  ├── retriever.ts          — Hybrid retrieval (weighted/RRF + optional decay + MMR + score normalization)
  ├── session-indexer.ts    — Session JSONL parser
  ├── md-chunker.ts         — OpenClaw-style Markdown chunker (CJK weighted)
  └── org-chunker.ts        — Org-mode chunker (disabled production track)
```

Index locations:
- Sessions: `~/repos/gh/andenken/data/sessions.lance`
- MD knowledge: `~/repos/gh/andenken/data/md.lance`
- Org: `~/repos/gh/andenken/data/org.lance` (disabled in production)

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `ANDENKEN_SESSION_PROVIDER` | sessions | Usually `openrouter` |
| `ANDENKEN_SESSION_MODEL` / `ANDENKEN_SESSION_DIMENSIONS` | sessions | `qwen/qwen3-embedding-8b` / `4096` |
| `ANDENKEN_MD_PROVIDER` | md | Usually `openrouter` |
| `ANDENKEN_MD_MODEL` / `ANDENKEN_MD_DIMENSIONS` | md | `qwen/qwen3-embedding-8b` / `4096` |
| `ANDENKEN_MD_API_KEY` | md | OpenRouter API key (often `$OPENROUTER_API_KEY`) |
| `ANDENKEN_ALLOW_PAID_FULL_REBUILD` | full rebuild | Set to `1` only after reviewing `./run.sh estimate:md` |

## Relationship to Other Skills

- **denotecli**: Exact title/tag/content matching. Use denotecli for precise lookups, semantic-memory for conceptual/meaning-based search.
- **dictcli**: Auto-invoked internally for Korean→English query expansion (expand). Kiwi stemming belongs to older org-indexing paths; md production search uses CJK-aware chunking + expand/FTS fallback.
- **session-recap**: Extracts text from single session JSONL. semantic-memory searches across ALL sessions semantically.
