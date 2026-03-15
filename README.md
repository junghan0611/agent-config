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

Two tools registered automatically in every pi session:

| Tool | DB | Dims | Purpose |
|------|-----|------|---------|
| `session_search` | sessions.lance (161MB) | 3072d | Past agent conversations |
| `knowledge_search` | org.lance (752MB) | 768d | Org-mode knowledge base (3000+ Denote notes) |

The agent calls these autonomously — ask "보편 학문 관련 노트 찾아줘" and it finds `universalism`-tagged notes without being told the English word.

**Stack**: Gemini Embedding 2 native API · LanceDB serverless · weighted merge + MMR diversity · temporal decay · org-aware 2-tier chunking (headings + content)

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

agent-config supersedes the deprecated private `claude-config`. What was 103 private memory files is now 115K searchable vectors in a public repo. The shift: from hoarding context privately to building open infrastructure that *any* agent can use.

## Architecture Decisions

**Why Gemini Embedding 2 native API (not OpenAI-compatible)?**
taskType (RETRIEVAL_QUERY vs DOCUMENT), batchEmbedContents, outputDimensionality (Matryoshka). The OpenAI-compatible endpoint loses all three. We track [OpenClaw](https://github.com/nicepkg/openclaw)'s Gemini pattern as upstream.

**Why LanceDB (not SQLite+vec)?**
Serverless, file-based, no extensions to compile. The DB is a directory you can rsync. OpenClaw uses SQLite+vec; we chose LanceDB for portability across NixOS machines.

**Why MMR instead of Jina Rerank?**
Benchmarked both. Jina reranker v3 **hurts** Korean+English mixed docs (MRR 0.642 → 0.717 with MMR). Jaccard-based MMR is free, local, and better for our multilingual corpus. Jina kept as optional for future multilingual rerankers.

**Why 3072d for sessions, 768d for org?**
Sessions (~11K vectors): precision matters for vague queries across conversations. Org (~104K vectors): Matryoshka 768d cuts storage 75% with minimal quality loss at scale. Both use the same Gemini Embedding 2 model.

**Why WriteBuffer?**
LanceDB creates one fragment per `table.add()` call. Without buffering, 2,787 org files → 3,084 fragments → 1.1GB. With WriteBuffer (2000 chunks per flush): 53 fragments → 752MB.

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
# JINA_API_KEY=...       (optional, kept for future reranker)

# Index
./run.sh index:sessions --force     # ~1 min, $0.07
./run.sh index:org --force           # ~30 min, $0.06
./run.sh status                      # verify

# Test
./run.sh test:unit                   # 30 tests, no API
./run.sh test                        # all tests

# In pi session — tools are available automatically
# Or use commands:
/memory status                       # show index stats
/memory reindex                      # incremental session reindex
```

## Benchmark

19 hand-curated queries across 9 categories, testing cross-lingual search on 3000+ Korean org-mode notes with English tags.

| Category | Queries | Tests |
|----------|---------|-------|
| **cross-lingual** | 4 | Korean query → English-tagged note ("보편 학문" → `universalism` tag) |
| **morphological** | 2 | `universal` vs `유니버셜` — transliteration + morphological variants |
| **dialectical** | 2 | Opposite concepts in same meta-note ("보편 ↔ 특수") |
| **korean-concept** | 3 | Pure Korean concept search |
| **tag-boost** | 2 | Tags should boost relevance |
| **indirect** | 2 | Notes connected via dblock, not direct content match |
| **vague-short** | 2 | "특이점" (2 chars), "깨달음" (1 word) — hardest |
| **gptel-context** | 1 | GPTEL property metadata |
| **heading-precision** | 1 | 2-tier heading vs content accuracy |

Difficulty: 🟢 easy (8) · 🟡 medium (8) · 🔴 hard (3)

Every query runs **with and without MMR** for A/B comparison. Results logged to [`benchmark-log.jsonl`](pi-extensions/semantic-memory/benchmark-log.jsonl) for tracking improvement over time.

```bash
./run.sh bench:dry    # see queries + expected results
./run.sh bench        # full evaluation
```

**Latest** (2026-03-15, `91d87e6`):

| Metric | Score |
|--------|-------|
| Hit Rate | **100% (19/19)** |
| MRR | **0.872** |
| R@5 | 0.754 |
| R@10 | 0.789 |

| Store | Chunks | Files | Dims | Fragments | Size |
|-------|--------|-------|------|-----------|------|
| Sessions | 11,378 | 95/100 | 3072d | 7 | 161MB |
| Org | 103,898 | 2,765/2,787 | 768d | 53 | 752MB |

### The 3-Layer Cross-Lingual Model

Why some queries are "hard" by design:

| Layer | Mechanism | Handles | Status |
|-------|-----------|---------|--------|
| **1. Embedding** | Gemini multilingual vectors | "보편" ≈ "universalism" | ✅ This repo |
| **2. dblock** | Denote regex link graph | 22 notes linked in meta-note | ✅ Emacs (existing) |
| **3. dictcli** | Personal vocabulary ontology | 보편↔특수 dialectical pairs | 🚧 [Prototype](https://github.com/junghan0611/dictcli) |

Layer 1 alone achieves 100% hit rate. Layers 2+3 are needed for dialectical pairs and indirect connections. The benchmark deliberately includes queries that **only layer 2 or 3 can fully answer** — tracking how close layer 1 gets reveals where to invest next.

## Roadmap

- [x] Phase 1: Session RAG (3072d, pi local sessions)
- [x] Phase 2: Org-mode knowledge base (768d, 2-tier org-aware chunking)
- [x] Benchmark: 19 queries, 9 categories, cross-lingual, public JSONL tracking
- [x] WriteBuffer: fragment reduction 58x (3,084 → 53)
- [ ] OpenClaw bot session integration (Oracle VM → git pull → reindex)
- [ ] Day-query integration (session context as 6th data source)
- [ ] pi-skills migration into this repo
- [ ] 3-layer query expansion (dictcli wordmap → embedding boost)

## Economics

| | Without semantic search | With semantic search |
|---|---|---|
| "What did we discuss about X?" | grep → read × 5-10 → **50K tokens** | 1 tool call → **2K tokens** |
| Cost | Claude API tokens (expensive) | Gemini embed $0.0001 + local search |

Total indexing cost: **$0.13** (sessions $0.07 + org $0.06). Each query: effectively free.
DB total: **913MB** (sessions 161MB + org 752MB). 60 LanceDB fragments.

## License

MIT
