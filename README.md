# agent-config

**Profile Harness — the gravity center where alien intelligences resonate with a being.**

Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/).

agent-config implements that gravity center. The shared foundation where agents remember, search, and stay aligned.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

### Harness Support

| Harness | Memory | Skills | Config |
|---------|--------|--------|--------|
| **[pi](https://github.com/badlogic/pi-mono)** | andenken **extension** (native `registerTool`, in-process LanceDB) | 26 skills (semantic-memory excluded — extension covers it) | extensions + themes + keybindings |
| **Claude Code** | andenken **skill** (CLI wrapper via bash) | 27 skills (full set including semantic-memory) | CLAUDE.md + hooks |
| **OpenCode** | andenken **skill** (CLI wrapper via bash) | 27 skills (full set) | settings |
| **OpenClaw** (Oracle VM) | andenken **skill** (same skills/ via symlink mount) | 27 skills (Nix store mount in Docker) | openclaw.json |

Session JSONL from all harnesses flows into [andenken](https://github.com/junghan0611/andenken)'s unified index. Each chunk carries a `source` field (`"pi"` | `"claude"`) so you can filter, compare, or roll back across harnesses.

## What's Here

### Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Dims | Purpose |
|------|-----|------|---------|
| `session_search` | sessions.lance | 768d | Past pi + Claude Code conversations |
| `knowledge_search` | org.lance (707MB) | 768d | Org-mode knowledge base (3,300+ Denote notes) |

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and `knowledge_search` fires with dictcli query expansion — finding `universalism`-tagged notes without being told the English word.

**3-Layer Cross-Lingual Search:**

| Layer | Mechanism | Example |
|-------|-----------|---------|
| **1. Embedding** | Gemini multilingual vectors | "보편" ≈ "universalism" |
| **2. dblock** | Denote regex link graph | 22 notes linked in meta-note |
| **1.5 BM25** | Korean josa removal (dual emit) | "위임의" → "위임" + "위임의" (BM25 both) |
| **3. dictcli** | Personal vocabulary graph (2,400+ triples) | `expand("보편")` → `[universal, universalism, paideia]` |

Pi loads andenken as a **compiled pi package** (`pi install`), not a symlinked `.ts` file. This bypasses jiti parsing limitations and allows direct LanceDB access in-process. Claude Code and OpenCode use the CLI wrapper skill instead.

### Pi Extensions ([`pi-extensions/`](pi-extensions/))

| Extension | Purpose |
|-----------|---------|
| `env-loader.ts` | Load ~/.env.local at session start |
| `context.ts` | /context command — show loaded extensions, skills, context usage |
| `go-to-bed.ts` | Late night reminder |
| `peon-ping.ts` | Sound notifications |
| `gemini-image-gen.ts` | Gemini image generation (나노바나나 2flash) |
| `delegate.ts` | Spawn independent agent process (local or SSH remote) |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

Semantic memory extension lives in [andenken](https://github.com/junghan0611/andenken) (separate repo, loaded as pi package).
Telegram bridge lives in [entwurf](https://github.com/junghan0611/entwurf) (separate repo, loaded as pi package).

### Skills ([`skills/`](skills/)) — 27 skills

| Category | Skills |
|----------|--------|
| **Data Access** | denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query |
| **Agent Memory** | session-recap, dictcli, semantic-memory, improve-agent |
| **Writing** | botlog, botment, agenda, punchout |
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

## Shell Aliases (`~/.bashrc.local`)

```bash
# Claude Code + 텔레그램
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official'
alias claude-tgd='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'

# pi: --session-control 기본 (delegate 비동기 알림 + 세션 간 RPC)
alias pi='command pi --session-control'
# 분신 에이전트: 텔레그램 브릿지 (entwurf 패키지 설치 필요)
alias pi-home='command pi --session-control --telegram'
```

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
- Symlink: pi extensions + skills (semantic-memory excluded) + themes + settings + keybindings
- Install: andenken as pi package (compiled extension)
- Symlink: Claude Code + OpenCode skills (full set including semantic-memory) + prompts
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
| **[entwurf](https://github.com/junghan0611/entwurf)** | **Presence** | **Telegram bridge — 분신 에이전트 원격 접근** |
| [memex-kb](https://github.com/junghan0611/memex-kb) | Knowledge | Legacy document conversion pipeline |
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Orchestration | OpenClaw bot configurations |
| [geworfen](https://github.com/junghan0611/geworfen) | Being | Existence data viewer — WebTUI agenda |

### Skill Source Repos

| CLI | Repo | Language | Purpose |
|-----|------|----------|---------|
| denotecli | [junghan0611/denotecli](https://github.com/junghan0611/denotecli) | Go | Denote knowledge base search (3000+ notes) |
| gitcli | [junghan0611/gitcli](https://github.com/junghan0611/gitcli) | Go | Local git commit timeline (50+ repos) |
| lifetract | [junghan0611/lifetract](https://github.com/junghan0611/lifetract) | Go | Samsung Health + aTimeLogger tracking |
| dictcli | [junghan0611/dictcli](https://github.com/junghan0611/dictcli) | Clojure/GraalVM | Personal vocabulary graph (2,400+ triples) |
| bibcli | [junghan0611/zotero-config](https://github.com/junghan0611/zotero-config) | Go | BibTeX search (8,000+ entries) |

### Archived

| Repo | Note |
|------|------|
| [pi-skills](https://github.com/junghan0611/pi-skills) | Migrated to `agent-config/skills/` |

## Architecture Decisions

**Why trust agent intuition over documentation?** When an agent calls `emacsclient -s server` and fails because the right socket is `agent-server`, that's not the agent's fault — the naming violated intuition. We renamed: agent daemon → `server` (default, intuitive), user's GUI Emacs → `user` (human bears the non-obvious name). This principle applies everywhere: if an agent fails once, it's a naming/design problem, not a docs problem.

**Why andenken as separate repo?** Semantic memory serves pi, Claude Code, and future agents. It's not pi-specific. Data (LanceDB) lives with the code, not in `~/.pi/agent/memory/`. Pi gets a compiled extension (native tools, in-process); other harnesses get a CLI skill (same search quality, subprocess overhead).

**Why no compact?** `/new` + semantic search = instant + cheaper. Session JSONL is written in real-time; `/new` hook auto-indexes.

**Why Gemini Embedding 2?** taskType, batchEmbedContents, Matryoshka outputDimensionality 768d. OpenClaw upstream tracking.

**Why rate limiter 3s?** We hit a ₩100,000 (~$69) embedding cost bomb on 2026-03-30. Multiple `--force` org indexing runs against the Gemini API. Added 4 safety layers: 3s rate limiter, cost estimator (`estimate.ts`), $1 abort threshold, removed auto-indexing on `/new`. 3s is conservative but intentional — 4 minutes of slow sync beats another $69 bill.

**Why MMR over Jina Rerank?** Jina hurts Korean+English mixed docs. Jaccard-based MMR is free, local, better.

**Why Korean josa removal in BM25?** Korean particles ("의", "에서", "으로") break BM25 token matching. Dual emit indexes both original and particle-stripped text. 17x score improvement.

**Why dictcli expand?** "보편" alone gives MRR 0.13. With expand → "보편 universal universalism paideia" → MRR jumps.

## Economics

| | Without semantic search | With semantic search |
|---|---|---|
| "What did we discuss about X?" | grep → read × 5-10 → **50K tokens** | 1 tool call → **2K tokens** |
| "What did I do last session?" | raw JSONL read → **100KB** | session-recap → **4KB** |

Total indexing: **~$0.13**. Each query: effectively free.

## License

MIT
