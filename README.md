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

- **11,844 chunks** indexed from 94 sessions across 15+ projects
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

## Economics

| | Without session_search | With session_search |
|---|---|---|
| "What did we discuss about X yesterday?" | grep → read × 5-10 → **50K tokens** | 1 tool call → **2K tokens** |
| Cost | Claude API tokens (expensive) | Gemini embed $0.0001 + local search |

Indexing 94 sessions: **$0.19 one-time**. Each query: effectively free.
The expensive model's tokens go to *work*, not to *remembering*.

## License

MIT
