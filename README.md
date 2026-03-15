# agent-config

**Contextual continuity infrastructure for AI coding agents.**

When you work with multiple agents across dozens of projects, the hardest problem isn't code — it's context. Every new session starts from zero. Every compaction loses nuance. Every agent asks the same questions you answered yesterday.

agent-config solves this. It's the public, reproducible layer that lets your agents remember, search, and stay aligned with your evolving perspective — without repeating yourself.

> Part of the [-config ecosystem](#the--config-ecosystem) by [@junghan0611](https://github.com/junghan0611)

## The Problem

A single person runs 6+ concurrent projects with AI agents. Each project has its own session, its own context window, its own amnesia:

```
You
 ├── pi session A  (embedded systems, Zig)
 ├── pi session B  (IoT platform, Matter/Flutter)
 ├── pi session C  (this repo, agent infra)
 ├── pi session D  (semantic DSL, Clojure)
 ├── openclaw bot  (research, philosophy)
 └── openclaw bot  (another perspective)
```

The projects differ. But the design direction, the technology choices, the *why* behind every decision — that comes from one person. Explaining it from scratch every session is exhausting.

**AGENTS.md gives rules. Semantic memory gives context. Botlogs give decision history.**

agent-config holds the tools that make this work.

## What's Here

### Pi Extensions

Extensions load into the [Pi coding agent](https://github.com/badlogic/pi-mono) runtime, registering tools and commands that the LLM can use autonomously.

#### [semantic-memory](pi-extensions/semantic-memory/)

Session RAG — search past conversations by meaning, not keywords.

- **11,378 session chunks** (3072d) + **103,898 org chunks** (768d)
- **Gemini Embedding 2** native API (3072d, Matryoshka-ready)
- **Hybrid retrieval**: vector search + BM25 full-text + RRF fusion + recency decay
- **Jina Reranker v3** cross-encoder (optional)
- **LanceDB** serverless vector store (173MB, file-based)
- **41 tests** (unit + integration), API-free unit tests for CI

```
"어제 openclaw에서 memory 설정한 거"
→ [0.183] openclaw gemini-embedding-2 API discussion
→ [0.141] memory-lancedb-pro reference discussion
→ [0.121] openclaw bot sync conversation
```

Vague Korean queries find precise cross-session context. The agent calls `session_search` autonomously when it needs past context.

### Skills

Skills provide workflow guidance to agents. Migration from [pi-skills](https://github.com/junghan0611/pi-skills) is planned — agenda stamps, botlog writing, day queries, punchout summaries, and 20+ other skills.

### Configuration

- `AGENTS.md` — agent directives (stable, rarely changes)
- `.beads/` — issue tracking via [beads_rust](https://github.com/junghan0611/beads_rust)

## The -config Ecosystem

Each repo owns one layer of a reproducible personal computing environment:

```
nixos-config          OS — NixOS flakes, hardware, services
doomemacs-config      Editor — Doom Emacs, org-mode, denote
zotero-config         Bibliography — 8,000+ references
agent-config          Agent infrastructure — this repo
memex-kb              Knowledge base integration
meta-config           Orchestration across layers
```

agent-config supersedes the deprecated private `claude-config`. What was 103 private memory files is now 11,844 searchable vectors in a public repo. The shift: from hoarding context privately to building open infrastructure that *any* agent can use.

## Architecture Decisions

**Why Gemini Embedding 2 native API (not OpenAI-compatible)?**
taskType (RETRIEVAL_QUERY vs DOCUMENT), batchEmbedContents, outputDimensionality (Matryoshka). The OpenAI-compatible endpoint loses all three. We track [OpenClaw](https://github.com/openclaw)'s Gemini pattern as upstream.

**Why LanceDB (not SQLite+vec)?**
Serverless, file-based, no extensions to compile. The DB is a directory you can rsync. OpenClaw uses SQLite+vec; we chose LanceDB for portability across NixOS machines.

**Why Jina Rerank instead of MMR?**
OpenClaw uses Jaccard-based MMR for diversity. We use Jina's cross-encoder reranker — it understands meaning, not just token overlap. Different tradeoff: their MMR is free and local; our rerank is an API call but more accurate. Both are valid.

**Why 3072d now, 768d later?**
Phase 1 (sessions): ~12K vectors, 173MB at 3072d — precision matters for vague queries. Phase 2 (3000+ org notes): Matryoshka 768d cuts storage 75% with minimal quality loss at scale.

## Roadmap

- [x] Phase 1: Session RAG (pi local sessions)
- [ ] OpenClaw bot session integration (Oracle VM → git pull → reindex)
- [ ] Phase 2: ~/org Denote notes (3000+ notes, Matryoshka 768d)
- [ ] CLI extraction for non-pi environments (OpenClaw bots via skill)
- [ ] pi-skills migration into this repo
- [ ] Day-query integration (session context as 6th data source)

## Setup

```bash
# Clone
git clone https://github.com/junghan0611/agent-config.git
cd agent-config

# Install extension dependencies
cd pi-extensions/semantic-memory && npm install

# Symlink for pi auto-discovery
ln -s $(pwd)/pi-extensions/semantic-memory ~/.pi/agent/extensions/semantic-memory

# Environment (in ~/.env.local)
# GEMINI_API_KEY=...     (required)
# JINA_API_KEY=...       (optional, for rerank)

# Test
npm test                              # 41 tests
npm run test:search -- "your query"   # live search

# In pi session
/memory reindex        # index all sessions
/memory status         # check index stats
# Or just ask naturally — the agent calls session_search on its own
```

## Benchmark

### Org-mode RAG Quality (Phase 2)

19 hand-curated queries across 9 categories, testing cross-lingual search on 3000+ Korean org-mode notes with English tags.

| Category | Queries | Tests |
|----------|---------|-------|
| **cross-lingual** | 4 | Korean query → English-tagged note (e.g., "보편 학문" → `universalism` tag) |
| **morphological** | 2 | `universal` vs `유니버셜` — transliteration + morphological variants |
| **dialectical** | 2 | Opposite concepts in same meta-note ("보편 ↔ 특수") |
| **korean-concept** | 3 | Pure Korean concept search |
| **tag-boost** | 2 | Tags should boost relevance |
| **indirect** | 2 | Notes connected via dblock, not direct content match |
| **vague-short** | 2 | "특이점" (2 chars), "깨달음" (1 word) — hardest |
| **gptel-context** | 1 | GPTEL property metadata |
| **heading-precision** | 1 | 2-tier heading vs content accuracy |

Difficulty: 🟢 easy (8) · 🟡 medium (8) · 🔴 hard (3)

Every query runs with **and without Jina Rerank** for A/B comparison. Results logged to [`benchmark-log.jsonl`](pi-extensions/semantic-memory/benchmark-log.jsonl) — each run appends, so improvement over time is trackable.

```bash
./run.sh bench:dry    # see queries + expected results
./run.sh bench        # full evaluation (needs indexed org DB)
```

**Latest benchmark** (2026-03-15, commit `c2466b8`):

| Metric | Score |
|--------|-------|
| Hit Rate | **100% (19/19)** |
| MRR | **0.872** |
| R@5 | 0.754 |
| R@10 | 0.789 |

**Last index** (2026-03-15):

| Store | Chunks | Files | Dims | Fragments | Size |
|-------|--------|-------|------|-----------|------|
| Sessions | 11,378 | 95/100 | 3072d | 7 | 161MB |
| Org | 103,898 | 2,765/2,787 | 768d | 53 | 752MB |

<details>
<summary>Log format (JSONL, 1 line per query per run)</summary>

```json
{
  "timestamp": "2026-03-14T15:30:00.000Z",
  "query": "보편 학문에 대한 문서",
  "category": "cross-lingual",
  "difficulty": "medium",
  "lang": "ko",
  "recall5": 0.67,
  "recall10": 1.00,
  "mrr": 0.50,
  "hit": true,
  "rerank": false,
  "topResults": ["20250424T233558--†-보편-특수...", "20250516T090655--모티머애들러..."],
  "notes": "힣봇이 denotecli로 못 찾은 실제 사례"
}
```
</details>

### The 3-Layer Cross-Lingual Model

Why some queries are "hard" by design:

| Layer | Mechanism | Handles | Status |
|-------|-----------|---------|--------|
| **1. Embedding** | Gemini multilingual vectors | "보편" ≈ "universalism" | ✅ This repo |
| **2. dblock** | Denote regex link graph | 22 notes linked in meta-note | ✅ Emacs (existing) |
| **3. dictcli** | Personal vocabulary ontology | 보편↔특수 dialectical pairs | 🚧 Prototype |

Layer 1 alone should solve the "보편 학문" failure case. Layers 2+3 are needed for dialectical pairs and indirect connections. The benchmark deliberately includes queries that **only layer 2 or 3 can fully answer** — tracking how close layer 1 gets reveals where to invest next.

## Economics

| | Without session_search | With session_search |
|---|---|---|
| "What did we discuss about X yesterday?" | grep → read × 5-10 → **50K tokens** | 1 tool call → **2K tokens** |
| Cost | Claude API tokens (expensive) | Gemini embed $0.0001 + local search |

Indexing: Sessions $0.07 + Org $0.06 = **$0.13 total**. Each query: effectively free.
DB size: 913MB (Sessions 161MB + Org 752MB). LanceDB fragments: 60 total.
The expensive model's tokens go to *work*, not to *remembering*.

## License

MIT
