# agent-config

**Contextual continuity infrastructure for AI coding agents.**

When you work with multiple agents across dozens of projects, the hardest problem isn't code — it's context. Every new session starts from zero. Every compaction loses nuance. Every agent asks the same questions you answered yesterday.

agent-config solves this. It's the public, reproducible layer that lets your agents remember, search, and stay aligned with your evolving perspective — without repeating yourself.

> Part of the [-config ecosystem](#the--config-ecosystem) by [@junghan0611](https://github.com/junghan0611)

## What's Here

### Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Dims | Purpose |
|------|-----|------|---------|
| `session_search` | sessions.lance (145MB) | 3072d | Past pi + Claude Code conversations |
| `knowledge_search` | org.lance (1.5GB) | 768d | Org-mode knowledge base (3000+ Denote notes) |

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and `knowledge_search` fires with dictcli query expansion — finding `universalism`-tagged notes without being told the English word.

**3-Layer Cross-Lingual Search:**

| Layer | Mechanism | Example |
|-------|-----------|---------|
| **1. Embedding** | Gemini multilingual vectors | "보편" ≈ "universalism" |
| **2. dblock** | Denote regex link graph | 22 notes linked in meta-note |
| **3. dictcli** | Personal vocabulary graph | `expand("보편")` → `[universal, universalism, paideia]` |

Pi loads andenken as extension via symlink: `~/.pi/agent/extensions/semantic-memory → ~/repos/gh/andenken`.

### Pi Extensions ([`pi-extensions/`](pi-extensions/))

| Extension | Purpose |
|-----------|---------|
| `env-loader.ts` | Load ~/.env.local at session start |
| `context.ts` | /context command — show loaded extensions, skills, context usage |
| `go-to-bed.ts` | Late night reminder |
| `peon-ping.ts` | Sound notifications |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

Semantic memory extension lives in [andenken](https://github.com/junghan0611/andenken) (separate repo, symlinked).

### Skills ([`skills/`](skills/)) — 26 skills

| Category | Skills |
|----------|--------|
| **Data Access** | denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query |
| **Agent Memory** | session-recap, dictcli, semantic-memory, improve-agent |
| **Writing** | botlog, agenda, punchout |
| **Communication** | slack-latest, jiracli |
| **Web/Media** | brave-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe |
| **Tools** | emacs, tmux, diskspace |
| **Utility** | bd-to-br-migration |

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
| `/pandoc-html` | Markdown/Org → Google Docs HTML/DOCX |

## Session Management — No Compact

**We don't use compact.** Compact = AI reads entire conversation and summarizes = expensive + slow.

Instead:
1. When conversation gets long, `/new` to start fresh
2. `/new` auto-indexes current session + recent 24h sessions
3. In new session, recover context:
   - `session-recap -p <repo> -m 15` → 4KB summary (instant)
   - `session_search` → semantic search (all sessions)
   - `knowledge_search` → org knowledge base (3-layer expansion)

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # clone repos + build CLIs + symlink everything + npm install
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

`./run.sh setup` does:
- Clone source repos (if missing) — including andenken
- Build 6 native CLI binaries (Go + GraalVM)
- Symlink: pi extensions + andenken + skills + themes + settings + keybindings
- Symlink: Claude Code + OpenCode skills + prompts
- Symlink: ~/.local/bin PATH binaries
- npm install for extensions and skills

## The -config Ecosystem

| Repo | Layer | Description |
|------|-------|-------------|
| [nixos-config](https://github.com/junghan0611/nixos-config) | OS | NixOS flakes, hardware, services |
| [doomemacs-config](https://github.com/junghan0611/doomemacs-config) | Editor | Doom Emacs, org-mode, denote |
| [zotero-config](https://github.com/junghan0611/zotero-config) | Bibliography | 8,000+ references, bibcli |
| **[agent-config](https://github.com/junghan0611/agent-config)** | **Agent infra** | **Extensions, skills, themes, settings** |
| **[andenken](https://github.com/junghan0611/andenken)** | **Memory** | **Semantic memory — sessions + org knowledge base** |
| [memex-kb](https://github.com/junghan0611/memex-kb) | Knowledge | Legacy document conversion pipeline |
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Orchestration | OpenClaw bot configurations |
| [geworfen](https://github.com/junghan0611/geworfen) | Meta | Cross-repo coordination |

### Skill Source Repos

| CLI | Repo | Language | Purpose |
|-----|------|----------|---------|
| denotecli | [junghan0611/denotecli](https://github.com/junghan0611/denotecli) | Go | Denote knowledge base search (3000+ notes) |
| gitcli | [junghan0611/gitcli](https://github.com/junghan0611/gitcli) | Go | Local git commit timeline (50+ repos) |
| lifetract | [junghan0611/lifetract](https://github.com/junghan0611/lifetract) | Go | Samsung Health + aTimeLogger tracking |
| dictcli | [junghan0611/dictcli](https://github.com/junghan0611/dictcli) | Clojure/GraalVM | Personal vocabulary graph (1,150+ triples) |
| bibcli | [junghan0611/zotero-config](https://github.com/junghan0611/zotero-config) | Go | BibTeX search (8,000+ entries) |

### Archived

| Repo | Note |
|------|------|
| [pi-skills](https://github.com/junghan0611/pi-skills) | Migrated to `agent-config/skills/` |

## Architecture Decisions

**Why andenken as separate repo?** Semantic memory serves pi, Claude Code, and future agents. It's not pi-specific. Data (LanceDB) lives with the code, not in `~/.pi/agent/memory/`.

**Why no compact?** `/new` + semantic search = instant + cheaper. Session JSONL is written in real-time; `/new` hook auto-indexes.

**Why Gemini Embedding 2?** taskType, batchEmbedContents, Matryoshka outputDimensionality. OpenClaw upstream tracking.

**Why MMR over Jina Rerank?** Jina hurts Korean+English mixed docs. Jaccard-based MMR is free, local, better.

**Why dictcli expand?** "보편" alone gives MRR 0.13. With expand → "보편 universal universalism paideia" → MRR jumps.

## Economics

| | Without semantic search | With semantic search |
|---|---|---|
| "What did we discuss about X?" | grep → read × 5-10 → **50K tokens** | 1 tool call → **2K tokens** |
| "What did I do last session?" | raw JSONL read → **100KB** | session-recap → **4KB** |

Total indexing: **~$0.13**. Each query: effectively free.

## License

MIT
