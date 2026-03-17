# agent-config

**Contextual continuity infrastructure for AI coding agents.**

When you work with multiple agents across dozens of projects, the hardest problem isn't code — it's context. Every new session starts from zero. Every compaction loses nuance. Every agent asks the same questions you answered yesterday.

agent-config solves this. It's the public, reproducible layer that lets your agents remember, search, and stay aligned with your evolving perspective — without repeating yourself.

> Part of the [-config ecosystem](#the--config-ecosystem) by [@junghan0611](https://github.com/junghan0611)

## What's Here

### Semantic Memory ([`pi-extensions/semantic-memory/`](pi-extensions/semantic-memory/))

Two tools registered automatically in every pi session:

| Tool | DB | Dims | Purpose |
|------|-----|------|---------|
| `session_search` | sessions.lance | 3072d | Past agent conversations |
| `knowledge_search` | org.lance | 768d | Org-mode knowledge base (3000+ Denote notes) |

The agent calls these autonomously. Ask "보편 학문 관련 노트 찾아줘" and `knowledge_search` fires with dictcli query expansion — finding `universalism`-tagged notes without being told the English word.

**3-Layer Cross-Lingual Search:**

| Layer | Mechanism | Example |
|-------|-----------|---------|
| **1. Embedding** | Gemini multilingual vectors | "보편" ≈ "universalism" |
| **2. dblock** | Denote regex link graph | 22 notes linked in meta-note |
| **3. dictcli** | Personal vocabulary graph | `expand("보편")` → `[universal, universalism, paideia]` |

**Stack**: Gemini Embedding 2 native API · LanceDB · weighted merge + MMR · temporal decay · org-aware 2-tier chunking · dictcli expand · session→knowledge auto-fallback

### Pi Extensions ([`pi/extensions/`](pi/extensions/))

| Extension | Purpose |
|-----------|---------|
| `semantic-memory/` | session_search + knowledge_search + /memory + /whoami + /new auto-indexing |
| `env-loader.ts` | Load ~/.env.local at session start |
| `context.ts` | /context command — show loaded extensions, skills, context usage |
| `go-to-bed.ts` | Late night reminder |
| `notify.ts` | Desktop notifications |
| `peon-ping.ts` | Sound notifications |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

### Skills ([`skills/`](skills/)) — 25 skills

| Category | Skills |
|----------|--------|
| **Data Access** | denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query |
| **Agent Memory** | session-recap, dictcli, improve-agent |
| **Writing** | botlog, agenda, punchout |
| **Communication** | slack-latest, jiracli |
| **Web/Media** | brave-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe |
| **Tools** | emacs, tmux, diskspace |
| **Utility** | bd-to-br-migration |

Each skill has a `SKILL.md` that agents read. CLI binaries (Go/GraalVM) are built by `./run.sh setup`.

### Pi Config ([`pi/`](pi/))

| File | Purpose |
|------|---------|
| `settings.json` | Default model, theme, thinking level |
| `keybindings.json` | Custom keybindings |

### Themes ([`pi-themes/`](pi-themes/))

7 themes: glg-dark (custom, Ghostty Dracula compatible), catppuccin-mocha, cyberpunk, gruvbox-dark, nord, oh-p-dark, tokyo-night.

### Commands ([`commands/`](commands/))

| Command | Purpose |
|---------|---------|
| `/recap` | Quick recap of previous session |

## Session Management — No Compact

**We don't use compact.** Compact = AI reads entire conversation and summarizes = expensive + slow.

Instead:
1. When conversation gets long, `/new` to start fresh
2. `/new` auto-indexes current session + recent 24h sessions
3. In new session, recover context:
   - `session-recap -p <repo> -m 15` → 4KB summary (instant)
   - `session_search` → semantic search (all sessions)
   - `knowledge_search` → org knowledge base (3-layer expansion)

**Zero to sync in seconds** — 3-layer search replaces compact.

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # clone repos + build CLIs + symlink everything + npm install
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

`./run.sh setup` does:
- Clone 5 source repos (if missing)
- Build 6 native CLI binaries (Go + GraalVM)
- Symlink: pi extensions + skills + themes + settings + keybindings
- Symlink: Claude Code + OpenCode skills
- Symlink: ~/.local/bin PATH binaries
- npm install for extensions and skills

### Index

```bash
./run.sh index:sessions --force   # ~2 min, $0.07
./run.sh index:org --force         # ~30 min, $0.06
./run.sh status                    # verify
./run.sh bench                     # 19-query benchmark
```

## Benchmark

19 hand-curated queries, 9 categories, testing cross-lingual search on 3000+ Korean org-mode notes with English tags.

**Latest** (2026-03-17):

| Metric | Score |
|--------|-------|
| Hit Rate | **100% (19/19)** |
| MRR | **0.872** |
| R@5 | 0.754 |
| R@10 | 0.789 |

| Store | Chunks | Files | Dims | Size |
|-------|--------|-------|------|------|
| Sessions | 11,400+ | 100+ | 3072d | ~230MB |
| Org | 104,000+ | 2,780+ | 768d | ~1GB |

Results logged to [`benchmark-log.jsonl`](pi-extensions/semantic-memory/benchmark-log.jsonl) for tracking improvement over time.

## The -config Ecosystem

Each repo owns one layer of a reproducible personal computing environment:

| Repo | Layer | Description |
|------|-------|-------------|
| [nixos-config](https://github.com/junghan0611/nixos-config) | OS | NixOS flakes, hardware, services |
| [doomemacs-config](https://github.com/junghan0611/doomemacs-config) | Editor | Doom Emacs, org-mode, denote |
| [zotero-config](https://github.com/junghan0611/zotero-config) | Bibliography | 8,000+ references, bibcli |
| **[agent-config](https://github.com/junghan0611/agent-config)** | **Agent infra** | **This repo — extensions, skills, memory, themes** |
| [memex-kb](https://github.com/junghan0611/memex-kb) | Knowledge | Legacy document conversion pipeline |
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Orchestration | OpenClaw bot configurations |
| [geworfen](https://github.com/junghan0611/geworfen) | Meta | Cross-repo coordination |

### Skill Source Repos

Custom CLI tools built from these repos:

| CLI | Repo | Language | Purpose |
|-----|------|----------|---------|
| denotecli | [junghan0611/denotecli](https://github.com/junghan0611/denotecli) | Go | Denote knowledge base search (3000+ notes) |
| gitcli | [junghan0611/gitcli](https://github.com/junghan0611/gitcli) | Go | Local git commit timeline (50+ repos) |
| lifetract | [junghan0611/lifetract](https://github.com/junghan0611/lifetract) | Go | Samsung Health + aTimeLogger tracking |
| dictcli | [junghan0611/dictcli](https://github.com/junghan0611/dictcli) | Clojure/GraalVM | Personal vocabulary graph (1,150 triples) |
| bibcli | [junghan0611/zotero-config](https://github.com/junghan0611/zotero-config) | Go | BibTeX search (8,000+ entries) |

### Archived

| Repo | Note |
|------|------|
| [pi-skills](https://github.com/junghan0611/pi-skills) | Migrated to `agent-config/skills/` |

## Architecture Decisions

**Why no compact?** Compact = AI summarizes 600K tokens = expensive + slow. `/new` + semantic search = instant + cheaper. Session JSONL is written in real-time; `/new` hook auto-indexes before switching.

**Why Gemini Embedding 2 native API?** taskType, batchEmbedContents, outputDimensionality (Matryoshka). OpenAI-compatible endpoint loses all three. We track [OpenClaw](https://github.com/nicepkg/openclaw)'s Gemini pattern as upstream.

**Why LanceDB?** Serverless, file-based, rsync-able. WriteBuffer (2000 chunks per flush) minimizes fragments.

**Why MMR over Jina Rerank?** Benchmarked both. Jina reranker v3 hurts Korean+English mixed docs (MRR 0.642). Jaccard-based MMR is free, local, better (MRR 0.717→0.872).

**Why 3072d for sessions, 768d for org?** Sessions (~11K vectors): precision for vague queries. Org (~104K vectors): Matryoshka 768d cuts storage 75% at scale.

**Why dictcli expand in search pipeline?** "보편" alone gives MRR 0.13. With expand → "보편 universal universalism paideia" → MRR jumps. 3rd layer makes 1st layer stronger.

## Economics

| | Without semantic search | With semantic search |
|---|---|---|
| "What did we discuss about X?" | grep → read × 5-10 → **50K tokens** | 1 tool call → **2K tokens** |
| "What did I do last session?" | raw JSONL read → **100KB** | session-recap → **4KB** |

Total indexing: **$0.13** (sessions $0.07 + org $0.06). Each query: effectively free.

## License

MIT
