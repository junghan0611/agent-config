# agent-config

**Contextual continuity infrastructure for AI agents.** Every new AI session starts at zero — no memory of past conversations, no access to your knowledge base, no awareness of your tools. agent-config solves this: when you switch agents, sessions, or even models, the same human's memory, knowledge, and work context carries over.

> **What this is NOT:** not a prompt collection, not a LangChain-style tool-calling automation layer, not a multi-agent orchestration framework. It is the infrastructure that makes any AI agent — regardless of provider — remember who you are and what you've been working on.

> **Companion repo.** agent-config is the [reference consumer](https://github.com/junghan0611/pi-shell-acp#reference-consumer) of [`pi-shell-acp`](https://github.com/junghan0611/pi-shell-acp) and the two ship as a pair. pi-shell-acp is the *thin bridge*: it borrows each backend's identity (Claude Code, Codex) and keeps the operating surface — tools, MCP, skills, permissions — under pi's control. agent-config is what fills that operating surface — extensions, skills, profile, themes, prompts — and proves the bridge against day-to-day work.

## Why This Exists

The hardest problem in working with AI agents is not code generation — it's continuity. You build context over hours, then the session ends. Next session: blank slate. Switch from Claude to GPT: blank slate. Move from your laptop to your phone: blank slate.

agent-config attacks this with three layers:

1. **Shared memory layer** ([andenken](https://github.com/junghan0611/andenken)) — past conversations from every harness + 3,300+ personal notes in a semantically searchable index. Ask "보편 학문 관련 노트 찾아줘" and it finds `universalism`-tagged notes without being told the English word.

2. **Shared skill set** — the same capabilities (search notes, read bibliography, check git history, write to journal) available identically whether you're in pi, Claude Code, OpenCode, or OpenClaw.

3. **Session continuity protocol** — `/new` + recap + semantic search instead of expensive compact. Start a new session, recover full context in seconds for ~2K tokens instead of re-reading 50K.

The result: context survives across sessions, across harnesses, across models. One human's digital universe stays coherent no matter which AI is looking at it.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

## The Profile Harness Concept

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/).

Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

### Harness Support

| Harness | Memory | Skills | Notes |
|---------|--------|--------|-------|
| **pi + pi-shell-acp** (default Claude path) | andenken extension on pi side; Claude side gets full skill set via plugin farm | pi: extension covers semantic-memory natively. pi-shell-acp Claude: SDK plugin at `~/.pi/agent/claude-plugin/` includes semantic-memory skill | SDK isolation (`settingSources: []`); skills injected via `piShellAcpProvider.skillPlugins` |
| **pi + anthropic** (`claude-opus-4-7` / `claude-sonnet-4-6`) | andenken extension (in-process LanceDB) | extension covers semantic-memory | Direct provider — available, not the current default |
| **pi-entwurf** (Oracle, tmux) | andenken extension + pi-telegram | full skill set + Telegram bridge | Persistent Opus session via `@glg_entwurf_bot` |
| **Claude Code** | andenken skill (CLI wrapper) | full skill set | CLAUDE.md + hooks |
| **OpenCode / OpenClaw** | andenken skill (same SSOT via symlink) | full skill set | settings / Nix store mount |

Session JSONL from all harnesses flows into [andenken](https://github.com/junghan0611/andenken)'s unified index. Each chunk carries a `source` field (`"pi"` | `"claude"`) so you can filter, compare, or roll back across harnesses.

## What's Here

### Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Purpose |
|------|-----|---------|
| `session_search` | sessions.lance | Past pi + Claude Code conversations |
| `knowledge_search` | org.lance | Org-mode knowledge base (3,300+ Denote notes) |

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and `knowledge_search` fires with dictcli query expansion — finding `universalism`-tagged notes without being told the English word.

Pi loads andenken as a **compiled pi package** (`pi install`) — direct LanceDB access in-process. Claude Code, OpenCode, OpenClaw, and the pi-shell-acp Claude side use the CLI wrapper skill instead.

### Pi Extensions ([`pi-extensions/`](pi-extensions/))

| Extension | Purpose |
|-----------|---------|
| `env-loader.ts` | Load `~/.env.local` at session start |
| `context.ts` | `/context` — show loaded extensions, skills, context usage |
| `control.ts` | Cross-session control plane (forked from agent-stuff) |
| `go-to-bed.ts` | Late-night reminder |
| `peon-ping.ts` | Sound notifications |
| `gemini-image-gen.ts` | Gemini image generation (nanobanana) |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

Semantic memory extension lives in [andenken](https://github.com/junghan0611/andenken) (separate repo, loaded as a pi package).
Telegram bridge lives in [entwurf](https://github.com/junghan0611/entwurf) (separate repo, loaded as a pi package).
Production Telegram bridge uses [pi-telegram](https://github.com/badlogic/pi-telegram) (`pi install` package).

### Entwurf Orchestration → [pi-shell-acp](https://github.com/junghan0611/pi-shell-acp)

`entwurf` (delegate/resume), cross-session messaging, and the pi-facing MCP bridge (`pi-tools-bridge`, `session-bridge`) all live in pi-shell-acp now. agent-config consumes the surface via `pi/settings.json`'s `piShellAcpProvider.mcpServers` entry.

Spec, verification harnesses, and the sync/async contract are in [pi-shell-acp `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/pi-shell-acp/blob/main/AGENTS.md).

### Skills ([`skills/`](skills/))

Categories: data access (denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query), agent memory (session-recap, dictcli, semantic-memory, improve-agent), writing (botlog, botment, agenda, punchout), communication (slack-latest, jiracli, telegram), web/media (brave-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe), release hygiene (commit, update-changelog), tools (emacs, tmux, diskspace).

**Skill doc principle (LSP pattern):** Agents don't read full docs. Each `SKILL.md` has a single API table at the top — function/command + args + example. English body, Korean description only. Target: <100 lines, <4KB. Like LSP autocomplete: see the signature, call immediately.

### Pi Config ([`pi/`](pi/))

| File | Purpose |
|------|---------|
| `settings.json` | Default model, theme, thinking level, `piShellAcpProvider` |
| `keybindings.json` | Custom keybindings |
| `claude-plugin.json` | Manifest for the pi-shell-acp Claude skill plugin (symlinked to `~/.pi/agent/claude-plugin/`) |

### pi-shell-acp Skill Plugin (`~/.pi/agent/claude-plugin/`)

pi-shell-acp runs Claude with `settingSources: []` (SDK isolation), so `~/.claude/skills/` is **not** auto-discovered. Skills must be injected through the SDK's `plugins:[{type:"local", path}]` channel — pi-shell-acp exposes this as `piShellAcpProvider.skillPlugins`.

`run.sh setup` builds the plugin layout under `~/.pi/agent/claude-plugin/` (manifest + per-skill symlinks back to `agent-config/skills/`). One operator step per machine: register the plugin root in `~/.pi/agent/settings.json`:

```json
"piShellAcpProvider": {
  "skillPlugins": ["/home/junghan/.pi/agent/claude-plugin"]
}
```

Adding a new skill: drop it into `agent-config/skills/<name>/SKILL.md` and re-run `./run.sh setup`. All four farms — `~/.claude/skills/`, `~/.pi/agent/skills/pi-skills/`, `~/.pi/agent/claude-plugin/skills/`, `~/.codex/skills/` — refresh from the same SSOT.

### Themes ([`pi-themes/`](pi-themes/))

`glg-dark` (custom, Ghostty Dracula compatible).

### Commands ([`commands/`](commands/))

| Command | Purpose |
|---------|---------|
| `/recap` | Quick recap of previous session |
| `/boom` | Capture a crashed pi-shell-acp session into `.agent-reports/` for later triage |
| `/pandoc-html` | Markdown/Org → Google Docs HTML/DOCX |
| `/glg-image` | Image generation entry |
| `/metaplay` | Meta agent play |

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # clone/pull + build CLIs + symlink everything + pnpm install
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

`./run.sh setup` performs:

- Clone or fast-forward pull every tracked repo (including andenken and `pi-shell-acp`)
- Build native CLI binaries (Go + GraalVM)
- Symlink pi extensions, skills (semantic-memory excluded — covered by extension), themes, settings, keybindings
- Install andenken as a pi package (compiled extension)
- Symlink Claude Code / OpenCode / Codex skills + prompts
- Symlink `~/.local/bin` PATH binaries
- pnpm install for extensions and skills
- Hand off pi-shell-acp validation (typecheck, MCP, dual-backend smoke, persisted-bootstrap continuity, cancel-cleanup) to pi-shell-acp's own `run.sh`

## Session Management — No Compact

We don't use compact. Compact = AI reads entire conversation and summarizes = expensive + slow.

Instead:

1. When conversation gets long, `/new` to start fresh
2. `/new` auto-indexes the current session + the last 24h
3. In the new session, recover context with:
   - `session-recap -p <repo> -m 15` → 4KB summary (instant)
   - `session_search` → semantic search across all sessions
   - `knowledge_search` → 3-layer expansion over the org knowledge base

## Persistent Agent — pi-entwurf

A persistent pi session on Oracle VM, accessible via Telegram `@glg_entwurf_bot`. The always-on presence agent — a 분신(Entwurf) that carries context across days. tmux session `pi-entwurf`, model `claude-opus-4-6`, full skill set.

Two Telegram bridges coexist:

| Bridge | Package | Purpose |
|--------|---------|---------|
| [pi-telegram](https://github.com/badlogic/pi-telegram) | `pi install` (production) | Queuing, file I/O, stop, streaming preview |
| [entwurf](https://github.com/junghan0611/entwurf) | local package (minimal) | Presence bridge philosophy, `--telegram` flag |

## Shell Aliases (`~/.bashrc.local`)

```bash
# Claude Code + Telegram bridge
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official'
alias claude-tgd='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'

# pi: --session-control default (async entwurf notifications + inter-session RPC)
alias pi='command pi --session-control'
alias pi-home='command pi --session-control --telegram'
```

## The -config Ecosystem

| Repo | Layer | Description |
|------|-------|-------------|
| [nixos-config](https://github.com/junghan0611/nixos-config) | OS | NixOS flakes, hardware, services |
| [doomemacs-config](https://github.com/junghan0611/doomemacs-config) | Editor | Doom Emacs, org-mode, denote |
| [zotero-config](https://github.com/junghan0611/zotero-config) | Bibliography | 8,000+ references, bibcli |
| **[agent-config](https://github.com/junghan0611/agent-config)** | **Agent infra** | **Extensions, skills, themes, settings — this repo** |
| **[pi-shell-acp](https://github.com/junghan0611/pi-shell-acp)** | **Provider (ACP bridge)** | **Default Claude path in pi. ACP bridge to Claude Code + Codex** |
| **[andenken](https://github.com/junghan0611/andenken)** | **Memory** | **Semantic memory — sessions + org knowledge base** |
| **[entwurf](https://github.com/junghan0611/entwurf)** | **Presence** | **Telegram bridge — minimal presence bridge** |
| **[pi-telegram](https://github.com/badlogic/pi-telegram)** | **Transport** | **Production Telegram DM bridge — queue/file/streaming** |
| [memex-kb](https://github.com/junghan0611/memex-kb) | Knowledge | Legacy document conversion pipeline |
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Orchestration | OpenClaw bot configurations |
| [geworfen](https://github.com/junghan0611/geworfen) | Being | Existence data viewer — WebTUI agenda |

### Skill Source Repos

| CLI | Repo | Language | Purpose |
|-----|------|----------|---------|
| denotecli | [junghan0611/denotecli](https://github.com/junghan0611/denotecli) | Go | Denote knowledge base search (3,000+ notes) |
| gitcli | [junghan0611/gitcli](https://github.com/junghan0611/gitcli) | Go | Local git commit timeline (50+ repos) |
| lifetract | [junghan0611/lifetract](https://github.com/junghan0611/lifetract) | Go | Samsung Health + aTimeLogger tracking |
| dictcli | [junghan0611/dictcli](https://github.com/junghan0611/dictcli) | Clojure/GraalVM | Personal vocabulary graph (3,971 triples) |
| bibcli | [junghan0611/zotero-config](https://github.com/junghan0611/zotero-config) | Go | BibTeX search (8,000+ entries) |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
