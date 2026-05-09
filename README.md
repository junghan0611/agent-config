# agent-config

**Contextual continuity infrastructure for AI agents.** Every new AI session starts at zero — no memory of past conversations, no access to your knowledge base, no awareness of your tools. agent-config solves this: when you switch agents, sessions, or even models, the same human's memory, knowledge, and work context carries over.

**Official reference consumer of [`pi-shell-acp`](https://github.com/junghan0611/pi-shell-acp).**

agent-config is the resident-side layer: skills, extensions, themes, prompts, profile, and operating conventions. `pi-shell-acp` is the bridge layer: it connects pi to Claude Code, Codex, and Gemini ACP backends while keeping the surface under pi's control.

Together they ship as a pair:

- **pi-shell-acp** → backend bridge, MCP injection, entwurf surface, verification harnesses
- **agent-config** → real consumer profile, real skills, real day-to-day operating surface, real production proof

> **What this is NOT:** not a prompt collection, not a LangChain-style automation layer, not a generic multi-agent framework. It is the infrastructure that lets one human's memory, knowledge, and working surface survive across sessions, harnesses, and models.

## Official Reference Surface for pi-shell-acp

If `pi-shell-acp` asks “what does a real consumer look like?”, this repo is the answer.

| Surface | Owned by | Reference in this repo |
|---------|----------|------------------------|
| ACP backend bridge | `pi-shell-acp` | consumed through `pi/settings.json` / `pi/settings.server.json` |
| MCP servers (`pi-tools-bridge`, `session-bridge`) | `pi-shell-acp` | wired in `piShellAcpProvider.mcpServers` |
| Entwurf target policy | `pi-shell-acp` | pinned/installed here; exercised in real workflows |
| Claude skill plugin farm | pair boundary | this repo builds one consumer layout at `~/.pi/agent/claude-plugin/`, then points `pi-shell-acp` at it |
| Skills / prompts / themes / profile | `agent-config` | SSOT in `skills/`, `commands/`, `pi-themes/`, `home/AGENTS.md` |
| Consumer install/update policy | `agent-config` | `run.sh setup` / server-device upgrade path |
| Production verification | pair boundary | day-to-day use here, bridge invariants in `pi-shell-acp` |

In short: **pi-shell-acp defines the bridge contract; agent-config proves the contract against lived use.**

## Why This Exists

The hardest problem in working with AI agents is not code generation — it's continuity. You build context over hours, then the session ends. Next session: blank slate. Switch from Claude to GPT: blank slate. Move from your laptop to your phone: blank slate.

agent-config attacks this with three layers:

1. **Shared memory layer** ([andenken](https://github.com/junghan0611/andenken)) — past conversations from every harness + 3,300+ personal notes in a semantically searchable index. Ask "보편 학문 관련 노트 찾아줘" and it finds `universalism`-tagged notes without being told the English word.

2. **Shared skill set** — the same capabilities (search notes, read bibliography, check git history, write to journal) available identically whether you're in pi, Claude Code, OpenCode, or OpenClaw.

3. **Session continuity protocol** — `/new` + recap + semantic search instead of expensive compact. Start a new session, recover full context in seconds for ~2K tokens instead of re-reading 50K.

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/). Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

The result: context survives across sessions, across harnesses, across models. One human's digital universe stays coherent no matter which AI is looking at it.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

### Harness Support

| Harness | Memory | Skills | Notes |
|---------|--------|--------|-------|
| **pi + pi-shell-acp** (default Claude path) | andenken extension on pi side; Claude side gets full skill set via this repo's plugin farm | full skill set on both sides — `semantic-memory` mounted as a SKILL.md skill, plus `session_search` / `knowledge_search` registerTool on pi for direct calls | SDK isolation (`settingSources: []`); skills injected via `piShellAcpProvider.skillPlugins` |
| **pi + anthropic** (`claude-opus-4-7` / `claude-sonnet-4-6`) | andenken extension (in-process LanceDB) | full skill set including `semantic-memory` skill; `session_search` / `knowledge_search` registerTool also available | Direct provider — available, not the current default |
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

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and `knowledge_search` fires with dictcli query expansion — finding `universalism`-tagged notes without being told the English word. Loading strategy per harness lives in the Harness Support table above.

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

External pi packages — semantic-memory ([andenken](https://github.com/junghan0611/andenken)) and Telegram bridges ([entwurf](https://github.com/junghan0611/entwurf), [pi-telegram](https://github.com/badlogic/pi-telegram)) — see [§ -config Ecosystem](#the--config-ecosystem).

### pi-shell-acp Surface Reference

This repo is the **official consumer reference** for the `pi-shell-acp` surface.

| pi-shell-acp surface | Where this repo consumes it |
|---|---|
| backend provider (`piShellAcpProvider`) | `pi/settings.json`, `pi/settings.server.json` |
| MCP bridge (`pi-tools-bridge`, `session-bridge`) | same settings files |
| `entwurf` / `entwurf_resume` / `entwurf_send` / `entwurf_peers` | `home/AGENTS.md`, operational use, skills like `entwurf-peek` |
| skill plugin injection | `run.sh setup` builds this repo's local plugin root and points settings at it |
| release pin | `package.json` + `pi/settings.server.json` + `run.sh` + `CHANGELOG.md` |

So when `pi-shell-acp` changes, this is the first consumer that should stay green.

Spec, verification harnesses, and the sync/async contract remain in [pi-shell-acp `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/pi-shell-acp/blob/main/AGENTS.md).

### Skills ([`skills/`](skills/))

Categories: data access (denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query), agent memory (session-recap, dictcli, semantic-memory, improve-agent), writing (botlog, botment, agenda, punchout), communication (slack-latest, jiracli, telegram), web/media (brave-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe), release hygiene (commit, update-changelog), tools (emacs, tmux, diskspace).

**Skill doc principle (LSP pattern):** Agents don't read full docs. Each `SKILL.md` has a single API table at the top — function/command + args + example. English body, Korean description only. Target: <100 lines, <4KB. Like LSP autocomplete: see the signature, call immediately.

### Pi Config ([`pi/`](pi/))

| File | Purpose |
|------|---------|
| `settings.json` | Default model, theme, thinking level, `piShellAcpProvider` |
| `keybindings.json` | Custom keybindings |
| `claude-plugin.json` | Manifest used by this repo's local pi-shell-acp Claude plugin root |

### pi-shell-acp Skill Plugin (agent-config local layout)

pi-shell-acp runs Claude with `settingSources: []` (SDK isolation), so `~/.claude/skills/` is **not** auto-discovered. The bridge's install contract — plugin shape, `skillPlugins`, fail-fast validation — is documented upstream in pi-shell-acp's README §Custom Skills.

What this repo does is narrower: `run.sh setup` builds **one local consumer layout** under `~/.pi/agent/claude-plugin/` (manifest + per-skill symlinks back to `agent-config/skills/`) and points this repo's pi settings at that path. That path is an agent-config convention, not a pi-shell-acp contract.

Adding a new skill here still works the same way: drop it into `agent-config/skills/<name>/SKILL.md` and re-run `./run.sh setup`. All four local farms — `~/.claude/skills/`, `~/.pi/agent/skills/pi-skills/`, `~/.pi/agent/claude-plugin/skills/`, `~/.codex/skills/` — refresh from the same SSOT.

### Themes ([`pi-themes/`](pi-themes/))

`glg-dark` (custom, Ghostty Dracula compatible).

### Commands ([`commands/`](commands/))

| Command | Purpose |
|---------|---------|
| `/recap` | Multi-axis context hydration without compact |
| `/boom` | Capture a crashed pi-shell-acp session into `.agent-reports/` for later triage |
| `/pandoc-html` | Markdown/Org → Google Docs HTML/DOCX |
| `/glg-image` | Image generation entry |
| `/metaplay` | Meta agent play |
| `/docplay` | Random document polish play (front matter/title/tags/links/rename) |

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # clone/pull + build CLIs + symlink everything + pnpm install
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

`./run.sh setup` performs:

- Clone missing tracked repos (`setup` does **not** pull existing repos; use `./run.sh update` for pulls)
- Build native CLI binaries (Go + GraalVM)
- Symlink pi extensions, full skill set (including `semantic-memory`), themes, settings, keybindings, prompts
- Install andenken as a pi package (compiled extension — exposes `session_search` / `knowledge_search` registerTool alongside the SKILL.md skill)
- Symlink Claude Code / OpenCode / Codex skills + Claude Code commands (direct mode + plugin namespace)
- Symlink `~/.local/bin` PATH binaries
- pnpm install for extensions and skills
- Hand off pi-shell-acp validation (typecheck, MCP, dual-backend smoke, persisted-bootstrap continuity, cancel-cleanup) to pi-shell-acp's own `run.sh`

## Session Management — No Compact

We don't use compact. Compact = AI reads entire conversation and summarizes = expensive + slow.

Instead:

1. When conversation gets long, `/new` to start fresh
2. `/new` auto-indexes the current session + the last 24h
3. In the new session, recover context with `/recap`

`/recap` is now a **multi-axis context hydration** protocol owned by agent-config, not a pi-shell-acp bridge contract. It starts with `session-recap -p <repo> -m 15` but does not stop at one repo transcript. When the work crossed projects or days, it combines:

- `session-recap` — repo-local transcript extractor, no raw JSONL
- `session_search` — cross-project / cross-session semantic recall
- `knowledge_search` — journal/llmlog/design-history recall
- `gitcli day --summary` + `denotecli day` — day-axis reconstruction
- journal `§repo` markers — sibling/담당자 call index

The answer must state which axes were seen and which were not. This keeps recap token-light while avoiding false confidence from a plausible single-session summary.

The protocol itself lives in [`commands/recap.md`](commands/recap.md). The 2026-05-08 derivation history and raw evidence log are kept as a Denote llmlog note (`20260508T090911`, `~/org/llmlog/`) rather than as in-repo docs — recap is a resident-side memory workflow, not a spec this repo carries.

## Public Verification — Sessions as Evidence

This repo also owns the **resident-side policy** for publishing session artifacts when GLG wants public verification of harness behavior.

- `pi-shell-acp` owns bridge mechanism and invariants.
- `agent-config` owns export/review/upload workflow and publication criteria.
- Goal: long-term trust through evidence — raw-session publication, reject history, and later failure/drift analysis.
- Minimum publication gates: secret redaction, deny patterns, secret scanning (e.g. TruffleHog), semantic privacy review, small-batch dry-run.
- `pi-share-hf` is a strong reference shape for this pipeline.

## Persistent Agent — pi-entwurf

A persistent pi session on Oracle VM, accessible via Telegram `@glg_entwurf_bot`. The always-on presence agent — a 분신(Entwurf) that carries context across days. tmux session `pi-entwurf`, model `claude-opus-4-6`, full skill set.

Bridges: [pi-telegram](https://github.com/badlogic/pi-telegram) (production — queue · file I/O · stop · streaming preview) + [entwurf](https://github.com/junghan0611/entwurf) (minimal presence — `--telegram` flag). See [§ -config Ecosystem](#the--config-ecosystem) for both rows.

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
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Font | Custom monospace programming font |
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
