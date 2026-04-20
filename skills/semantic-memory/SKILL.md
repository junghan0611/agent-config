---
name: semantic-memory
description: "Semantic search over past sessions (pi + Claude Code) and org-mode knowledge base (95K+ chunks, Qwen3-4B 2560d). Uses local embedding (ollama/vLLM) + LanceDB + hybrid retrieval (vector + FTS with score normalization). Korean morphological analysis via Kiwi (dictcli stem) + Korean↔English cross-lingual via dictcli expand. Recall tracking for memory consolidation. Use when searching for past conversations, decisions, context, or knowledge base concepts."
---

# semantic-memory — Semantic Memory CLI

Search past sessions and org-mode knowledge base by meaning. Hybrid retrieval: vector similarity + full-text search, temporal decay, MMR diversity.

Binary is a shell wrapper. Invoke via `{baseDir}/semantic-memory`.

All output is JSON.

## Why This Exists (not just grep/denotecli)

1. **Semantic search** — "NixOS GPU 설정" finds "RTX 5080 cluster configuration" even without keyword overlap
2. **Cross-lingual** — Korean "보편" finds English-tagged "universalism" notes via dictcli expand
3. **Korean morphology** — "설계했다" → stem "설계" via Kiwi (dictcli stem). 동사 활용형, 존경어, 복합명사 해체. 인덱싱 시 자동 적용
4. **Session memory** — Search past pi + Claude Code conversations, decisions, context across all projects. Filter by `--source pi` or `--source claude`
5. **Hybrid retrieval** — Vector similarity (0.7) + BM25 full-text (0.3), with score normalization, temporal decay, and MMR diversity. Cross-signal agreement bonus for results found by both methods.
6. **Auto-fallback** — When session results are thin, automatically includes knowledge base results
7. **Recall tracking** — Every search logged to `recalls.jsonl` for memory consolidation analysis

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
- Auto-fallback to knowledge base when session results are insufficient
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

### search-knowledge — search org-mode knowledge base

```bash
{baseDir}/semantic-memory search-knowledge "체화인지 embodied cognition" --limit 10
{baseDir}/semantic-memory search-knowledge "양자역학 관찰자"
{baseDir}/semantic-memory search-knowledge "digital garden"
```

- Searches 3,000+ Denote org-mode notes (95K+ chunks)
- Uses Qwen3-Embedding-4B 2560d via ollama (local, $0)
- Score normalization: vector + FTS on equal footing with cross-signal bonus
- MMR diversity re-ranking enabled by default
- Korean↔English cross-lingual via dictcli expand

```json
{
  "query": "체화인지 embodied cognition",
  "expanded": ["embodied", "cognition", "embodiment"],
  "count": 8,
  "results": [
    {
      "project": "notes",
      "role": "document",
      "score": 0.4521,
      "file": "/home/.../org/notes/20240601T...__embodiedcognition.org",
      "line": 15,
      "timestamp": "2024-06-01",
      "text": "체화인지는 몸과 환경이..."
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
  "knowledge": {
    "chunks": 104812,
    "indexed": true
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
| `--limit N` | search-sessions, search-knowledge | Max results | 10 |
| `--source S` | search-sessions | Filter by harness: `pi` or `claude` | all |
| `--force` | reindex | Drop and rebuild entire index | false |

## Architecture

```
CLI (cli.ts)
  ├── embedding-provider.ts — Provider abstraction (ollama/vLLM/Gemini) + CachingProvider
  ├── store.ts              — LanceDB vector store (search + FTS)
  ├── retriever.ts          — Hybrid retrieval (weighted/RRF + decay + MMR + score normalization)
  ├── session-indexer.ts    — Session JSONL parser
  └── org-chunker.ts        — Org-mode note chunker
```

Index locations:
- Sessions: `~/.pi/agent/memory/sessions.lance`
- Knowledge: `~/.pi/agent/memory/org.lance`

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `ANDENKEN_PROVIDER` | Yes | `vllm` (ollama/vLLM) or `gemini` |
| `ANDENKEN_VLLM_ENDPOINT` | vllm | Endpoint URL (e.g. `http://localhost:11434`) |
| `ANDENKEN_VLLM_MODEL` | vllm | Model name (e.g. `qwen3-embedding:4b`) |
| `ANDENKEN_VLLM_PRESET` | vllm | Preset (e.g. `ollama/qwen3-embedding:4b`) |
| `GOOGLE_AI_API_KEY` | gemini | Gemini API key (fallback provider) |

## Relationship to Other Skills

- **denotecli**: Exact title/tag/content matching. Use denotecli for precise lookups, semantic-memory for conceptual/meaning-based search.
- **dictcli**: Auto-invoked internally for Korean→English query expansion (expand) + Korean morphological analysis (stem via Kiwi). Stem은 인덱싱 시 배치 호출, expand는 검색 시 쿼리 확장.
- **session-recap**: Extracts text from single session JSONL. semantic-memory searches across ALL sessions semantically.
