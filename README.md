# agent-config

**Contextual continuity infrastructure for AI agents.** Every new AI session starts at zero — no memory of past conversations, no access to your knowledge base, no awareness of your tools. agent-config solves this: when you switch agents, sessions, or even models, the same human's memory, knowledge, and work context carries over.

> **What this is NOT:** This is not a prompt collection, not a LangChain-style tool-calling automation layer, not a multi-agent orchestration framework. It is the infrastructure that makes any AI agent — regardless of provider — remember who you are and what you've been working on.

## Why This Exists

The hardest problem in working with AI agents is not code generation — it's continuity. You build context over hours, then the session ends. Next session: blank slate. Switch from Claude to GPT: blank slate. Move from your laptop to your phone: blank slate.

agent-config attacks this with three layers:

1. **Shared memory layer** ([andenken](https://github.com/junghan0611/andenken)) — past conversations from every harness + 3,300+ personal notes in a semantically searchable index. Ask "보편 학문 관련 노트 찾아줘" and it finds `universalism`-tagged notes without being told the English word.

2. **Shared skill set** (27 skills) — the same capabilities (search notes, read bibliography, check git history, write to journal) available identically whether you're in pi, Claude Code, OpenCode, or OpenClaw.

3. **Session continuity protocol** — `/new` + recap + semantic search instead of expensive compact. Start a new session, recover full context in seconds for ~2K tokens instead of re-reading 50K.

The result: context survives across sessions, across harnesses, across models. One human's digital universe stays coherent no matter which AI is looking at it.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

## The Profile Harness Concept

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/).

Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

### Harness Support

| Harness | Memory | Skills | Config |
|---------|--------|--------|--------|
| **[pi](https://github.com/badlogic/pi-mono)** + **[pi-shell-acp](https://github.com/junghan0611/pi-shell-acp)** | andenken **extension** on the pi side; Claude side gets the full skill set via plugin farm (no native andenken there) | pi: 27 skills (semantic-memory excluded — extension covers it). pi-shell-acp Claude: 28 skills via `~/.pi/agent/claude-plugin/` (SDK plugin) | current default Claude path in pi via ACP bridge. Claude Code auth/capabilities stay on the Claude side. SDK isolation (`settingSources: []`) — skills injected through `piShellAcpProvider.skillPlugins` |
| **[pi](https://github.com/badlogic/pi-mono)** + **[@benvargas/pi-claude-code-use](https://github.com/ben-vargas/pi-packages/tree/main/packages/pi-claude-code-use)** | andenken **extension** (native `registerTool`, in-process LanceDB) | 27 skills (semantic-memory excluded — extension covers it) | currently disabled by default. Keep only as an optional Claude Code compatibility patch path when explicitly re-enabled |
| **[pi](https://github.com/badlogic/pi-mono)** + **anthropic** (`claude-opus-4-6` / `claude-sonnet-4-6`) | andenken **extension** (native `registerTool`, in-process LanceDB) | 27 skills (semantic-memory excluded — extension covers it) | direct built-in provider path remains available, but is not the current default Claude route |
| **pi-entwurf** (Oracle, tmux) | andenken **extension** + pi-telegram | 26 skills + Telegram bridge | persistent Opus session, `@glg_entwurf_bot` |
| **Claude Code** | andenken **skill** (CLI wrapper via bash) | 28 skills (full set including semantic-memory) | CLAUDE.md + hooks |
| **OpenCode** | andenken **skill** (CLI wrapper via bash) | 28 skills (full set) | settings |
| **OpenClaw** (Oracle VM) | andenken **skill** (same skills/ via symlink mount) | 28 skills (Nix store mount in Docker) | openclaw.json |

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
| **3. dictcli** | Personal vocabulary graph (3,971 triples) | `expand("보편")` → `[universal, universalism, paideia]` |

Pi loads andenken as a **compiled pi package** (`pi install`), not a symlinked `.ts` file. This bypasses jiti parsing limitations and allows direct LanceDB access in-process. Claude Code and OpenCode use the CLI wrapper skill instead.

### Pi Extensions ([`pi-extensions/`](pi-extensions/))

| Extension | Purpose |
|-----------|---------|
| `env-loader.ts` | Load ~/.env.local at session start |
| `context.ts` | /context command — show loaded extensions, skills, context usage |
| `go-to-bed.ts` | Late night reminder |
| `peon-ping.ts` | Sound notifications |
| `gemini-image-gen.ts` | Gemini image generation (nanobanana 2flash) |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

Semantic memory extension lives in [andenken](https://github.com/junghan0611/andenken) (separate repo, loaded as pi package).
Telegram bridge lives in [entwurf](https://github.com/junghan0611/entwurf) (separate repo, loaded as pi package).
Production Telegram bridge uses [pi-telegram](https://github.com/badlogic/pi-telegram) (by pi author, `pi install` package) — queuing, file I/O, stop/abort, streaming preview.

### Entwurf Orchestration (consumer side)

Delegate/resume, cross-session messaging, and the pi-facing MCP bridge (`pi-tools-bridge`, `session-bridge`) migrated to [pi-shell-acp](https://github.com/junghan0611/pi-shell-acp). agent-config consumes the surface via `pi/settings.json`'s `piShellAcpProvider.mcpServers` entry (points at pi-shell-acp's `mcp/pi-tools-bridge/start.sh`).

Spec, verification harnesses (`sentinel-runner.sh`, `session-messaging-smoke.sh`, `mcp/pi-tools-bridge/test.sh`), and the Phase 0.5 sync/async contract all live in pi-shell-acp `AGENTS.md` § Entwurf Orchestration. The rename `delegate` → `entwurf` ships there in a single follow-up commit; tool name is still `delegate` on both sides until then.

### Skills ([`skills/`](skills/)) — 28 skills

| Category | Skills |
|----------|--------|
| **Data Access** | denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query |
| **Agent Memory** | session-recap, dictcli, semantic-memory, improve-agent |
| **Writing** | botlog, botment, agenda, punchout |
| **Communication** | slack-latest, jiracli, telegram |
| **Web/Media** | brave-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe |
| **Tools** | emacs, tmux, diskspace |

**Skill doc principle (LSP pattern):** Agents don't read full docs. Each SKILL.md has a single API table at the top — function/command + args + example. English body, Korean description only. Target: <100 lines, <4KB. Like LSP autocomplete: see the signature, call immediately.

### Pi Config ([`pi/`](pi/))

| File | Purpose |
|------|---------|
| `settings.json` | Default model, theme, thinking level |
| `keybindings.json` | Custom keybindings |
| `claude-plugin.json` | Manifest (canonical source) for the pi-shell-acp Claude skill plugin. Symlinked into `~/.pi/agent/claude-plugin/.claude-plugin/plugin.json` by `run.sh setup` |

### pi-shell-acp Skill Plugin (`~/.pi/agent/claude-plugin/`)

pi-shell-acp runs the Claude backend with `settingSources: []` (SDK isolation), so `~/.claude/skills/` is **not** auto-discovered. Skills must be injected through the SDK's `plugins:[{type:"local", path}]` channel — `pi-shell-acp` exposes this as `piShellAcpProvider.skillPlugins` (an array of absolute plugin-root paths).

`run.sh setup` builds the plugin layout under `~/.pi/agent/claude-plugin/` so pi-shell-acp can attach it on every session bootstrap:

```
~/.pi/agent/claude-plugin/
├── .claude-plugin/
│   └── plugin.json        → agent-config/pi/claude-plugin.json (symlink)
└── skills/
    ├── agenda             → agent-config/skills/agenda
    ├── bibcli             → agent-config/skills/bibcli
    └── …                    (all 28 skills, including semantic-memory —
                              the Claude side has no andenken native tool)
```

**Operator step (once per machine):** add the plugin root to `~/.pi/agent/settings.json`:

```json
"piShellAcpProvider": {
  "skillPlugins": ["/home/junghan/.pi/agent/claude-plugin"]
}
```

Then a `pi-shell-acp/claude-*` session should list all 28 skills.

**Adding a new skill** later: drop it into `agent-config/skills/<name>/SKILL.md` and re-run `./run.sh setup`. All four farms — `~/.claude/skills/` (native Claude Code), `~/.pi/agent/skills/pi-skills/` (pi), `~/.pi/agent/claude-plugin/skills/` (pi-shell-acp), `~/.codex/skills/` (Codex) — refresh from the same SSOT.

### Themes ([`pi-themes/`](pi-themes/))

1 theme: glg-dark (custom, Ghostty Dracula compatible).

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

## Persistent Agent — pi-entwurf (Oracle)

A persistent pi session on Oracle VM, accessible via Telegram `@glg_entwurf_bot`. This is the **always-on presence agent** — a 분신(Entwurf) that maintains context across days.

**Why this exists (2026-04-06):** Anthropic blocked flat-rate API access for third-party apps (OpenClaw). OpenClaw bots switched to GitHub Copilot relay (`github-copilot/claude-sonnet-4.6` for glg, `github-copilot/claude-opus-4.6` for main). But a direct pi session on Oracle bypasses this entirely — Anthropic API direct, Opus, full skills, no intermediary.

| Component | Detail |
|-----------|--------|
| tmux session | `pi-entwurf` |
| Model | `claude-opus-4-6` |
| Telegram bot | `@glg_entwurf_bot` (pi-telegram bridge) |
| Working dir | `~` (home) |
| Skills | Full 27 skills + semantic memory |
| Role | Life-support agent, research, note-taking, agenda |

**Two Telegram bridges coexist:**

| Bridge | Package | Purpose |
|--------|---------|--------|
| [pi-telegram](https://github.com/badlogic/pi-telegram) | `pi install` (production) | Queuing, file I/O, stop, streaming preview |
| [entwurf](https://github.com/junghan0611/entwurf) | local package (minimal) | Presence bridge philosophy, `--telegram` flag |

**OpenClaw vs pi-entwurf:**

| | OpenClaw bots | pi-entwurf |
|---|---|---|
| Runtime | Docker sandbox | NixOS host direct |
| Model routing | GitHub Copilot relay | Anthropic API direct |
| Multi-bot | 4 bots (main/glg/gpt/gemini) | 1 persistent session |
| Skills | Same 28 skills (mounted) | Same 27 skills (native) |
| Use case | Family/public service | Personal deep work |

## Shell Aliases (`~/.bashrc.local`)

```bash
# Claude Code + Telegram bridge
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official'
alias claude-tgd='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'

# pi: --session-control default (async delegate notifications + inter-session RPC)
alias pi='command pi --session-control'
# Entwurf agent: Telegram bridge (requires entwurf package)
alias pi-home='command pi --session-control --telegram'
```

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # clone/pull repos + build CLIs + symlink everything + pnpm install
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

`./run.sh setup` does:
- Clone missing repos and fast-forward pull existing ones — including andenken and `pi-shell-acp`
- Build 6 native CLI binaries (Go + GraalVM)
- Symlink: pi extensions + skills (semantic-memory excluded) + themes + settings + keybindings
- Install: andenken as pi package (compiled extension)
- Symlink: Claude Code + OpenCode + Codex skills (full set including semantic-memory) + prompts
- Symlink: ~/.local/bin PATH binaries
- pnpm install for extensions and skills
- pi-shell-acp validation (`typecheck` + `check-mcp` + dual-backend smoke + strict persisted bootstrap continuity + cancel-cleanup smoke). ACP/MCP bridge chain validations (`pi-tools-bridge` build + direct `tools/list` + protocol tests + pi-native async delegate smoke) moved to pi-shell-acp's own `run.sh` with the Entwurf Orchestration migration.

## The -config Ecosystem

| Repo | Layer | Description |
|------|-------|-------------|
| [nixos-config](https://github.com/junghan0611/nixos-config) | OS | NixOS flakes, hardware, services |
| [doomemacs-config](https://github.com/junghan0611/doomemacs-config) | Editor | Doom Emacs, org-mode, denote |
| [zotero-config](https://github.com/junghan0611/zotero-config) | Bibliography | 8,000+ references, bibcli |
| **[agent-config](https://github.com/junghan0611/agent-config)** | **Agent infra** | **Extensions, skills, themes, settings** |
| **[andenken](https://github.com/junghan0611/andenken)** | **Memory** | **Semantic memory — sessions + org knowledge base** |
| **[entwurf](https://github.com/junghan0611/entwurf)** | **Presence** | **Telegram bridge — Entwurf minimal presence bridge** |
| **[pi-telegram](https://github.com/badlogic/pi-telegram)** | **Transport** | **Telegram DM bridge — production queue/file/streaming** |
| **[pi-shell-acp](https://github.com/junghan0611/pi-shell-acp)** | **Provider (ACP bridge)** | **Current default Claude path in pi. Thin ACP bridge to Claude Code, with Claude-side auth/capability loading preserved** |
| **[@benvargas/pi-claude-code-use](https://github.com/ben-vargas/pi-packages/tree/main/packages/pi-claude-code-use)** | **Provider patch** | **Currently disabled by default pending account-risk observation. Optional compatibility patch only if manually re-enabled** |
| [memex-kb](https://github.com/junghan0611/memex-kb) | Knowledge | Legacy document conversion pipeline |
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Orchestration | OpenClaw bot configurations |
| [geworfen](https://github.com/junghan0611/geworfen) | Being | Existence data viewer — WebTUI agenda |

### Skill Source Repos

| CLI | Repo | Language | Purpose |
|-----|------|----------|---------|
| denotecli | [junghan0611/denotecli](https://github.com/junghan0611/denotecli) | Go | Denote knowledge base search (3000+ notes) |
| gitcli | [junghan0611/gitcli](https://github.com/junghan0611/gitcli) | Go | Local git commit timeline (50+ repos) |
| lifetract | [junghan0611/lifetract](https://github.com/junghan0611/lifetract) | Go | Samsung Health + aTimeLogger tracking |
| dictcli | [junghan0611/dictcli](https://github.com/junghan0611/dictcli) | Clojure/GraalVM | Personal vocabulary graph (3,971 triples, 2,449 trans) |
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

## Changelog

### 2026-04-15 — dictcli/emacs 스킬 정비 + 빌드 안전성 강화

- **dictcli SKILL.md**: 한글→영문 재작성 (LSP 패턴, 140줄→77줄), lookup→graph 커맨드 수정, 실측 데이터 반영
- **emacs SKILL.md**: `agent-org-agenda-todos` API 추가
- **run.sh**: dictcli 빌드 실패 `|| true` → `if !` 패턴으로 가시화
- **dictcli 리포(ded6c81)**: 캐시 validate 검증, NixOS patchelf 건너뛰기, 양쪽(local+oracle) 재현 완료
- Skills: 27→28 (telegram 추가 반영)

### 2026-04-15 — pi 0.67.2 호환 업데이트

- **control.ts**: `session_switch`/`session_fork` 이벤트 제거 → `session_start` + `event.reason`으로 통합 (pi 0.65.0 breaking change)
- **context.ts**: `SlashCommandInfo.path` → `sourceInfo.path`로 마이그레이션 (pi 0.62.0 breaking change)
- **node_modules**: pi-coding-agent 0.62.0 → 0.67.2 업데이트
- **pi/settings.json**: pi 0.67.2 반영
- delegate sync/async 기능 검증 완료 (GPT-5.4)

## License

MIT
