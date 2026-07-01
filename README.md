# agent-config

**Contextual continuity infrastructure for AI agents.** Every new AI session starts at zero — no memory of past conversations, no access to your knowledge base, no awareness of your tools. agent-config solves this: when you switch agents, sessions, or even models, the same human's memory, knowledge, and work context carries over.

**Official reference consumer and proving ground for [`entwurf`](https://github.com/junghan0611/entwurf).**

`entwurf` is the integrated substrate that configures every harness and unifies agent integration — the strong, stable core (a garden-citizen dispatch substrate, not a pi adapter). agent-config is the resident-side layer that feeds it: the **skills SSOT** (`skills/`) plus a **시험소 (proving ground)** where harness config, hooks, and wiring are hardened on the operator's real surface and soak-tested for weeks before being promoted into entwurf. Pushing unproven config straight into entwurf would weaken the core, so agent-config absorbs that churn first.

The two are not co-equal halves — entwurf is the destination, agent-config is where things are proven before they get there:

- **entwurf** → integrated harness config, agent integration, backend bridge, MCP injection, verification harnesses — the stable core
- **agent-config** → skills SSOT, real consumer profile, day-to-day operating surface, and the incubator that hardens config before promotion

> The natural end state is a thin skills SSOT plus a test bench: **agent-config quiet means the pipeline is healthy.** See [ROADMAP § purpose shift](ROADMAP.md).

> **What this is NOT:** not a prompt collection, not a LangChain-style automation layer, not a generic multi-agent framework. It is the infrastructure that lets one human's memory, knowledge, and working surface survive across sessions, harnesses, and models.

## Official Reference Surface for entwurf

If `entwurf` asks “what does a real consumer look like?”, this repo is the answer.

| Surface | Owned by | Reference in this repo |
|---------|----------|------------------------|
| ACP backend bridge | `entwurf` | consumed through `pi/settings.json` / `pi/settings.server.json` |
| MCP servers (`entwurf-bridge`) | `entwurf` | wired in `entwurfProvider.mcpServers` |
| Entwurf target policy | `entwurf` | pinned/installed here; exercised in real workflows |
| Claude skill plugin farm | pair boundary | this repo builds one consumer layout at `~/.pi/agent/claude-plugin/`, then points `entwurf` at it |
| Skills / prompts / themes / profile | `agent-config` | SSOT in `skills/`, `commands/`, `pi-themes/`, `home/AGENTS.md` |
| Consumer install/update policy | `agent-config` | `run.sh setup` / server-device upgrade path |
| Production verification | pair boundary | day-to-day use here, bridge invariants in `entwurf` |

In short: **entwurf defines the bridge contract; agent-config proves the contract against lived use.**

## Why This Exists

The hardest problem in working with AI agents is not code generation — it's continuity. You build context over hours, then the session ends. Next session: blank slate. Switch from Claude to GPT: blank slate. Move from your laptop to your phone: blank slate.

agent-config attacks this with three layers:

1. **Shared memory layer** ([andenken](https://github.com/junghan0611/andenken)) — past conversations from every harness + the exported public digital garden in a semantically searchable index. Ask "보편 학문 관련 노트 찾아줘" and it searches the garden md memory without being told the English word.

2. **Shared skill set** — the same capabilities (search notes, read bibliography, check git history, write to journal) available identically whether you're in pi, Claude Code, Codex, Antigravity, OpenCode, or OpenClaw.

3. **Session continuity protocol** — `/new` + recap + semantic search instead of expensive compact. Start a new session, recover full context in seconds for ~2K tokens instead of re-reading 50K.

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/). Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

The result: context survives across sessions, across harnesses, across models. One human's digital universe stays coherent no matter which AI is looking at it.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

### Harness Support

| Harness | Memory | Skills | Notes |
|---------|--------|--------|-------|
| **pi + entwurf** (default Claude path) | andenken extension on pi side; Claude side gets full skill set via this repo's plugin farm | full skill set on both sides — `semantic-memory` mounted as a SKILL.md skill, plus `session_search` / `knowledge_search` registerTool on pi for direct calls | SDK isolation (`settingSources: []`); skills injected via `entwurfProvider.skillPlugins` |
| **pi + anthropic** (`claude-opus-4-8` / `claude-sonnet-5`) | andenken extension (in-process LanceDB) | full skill set including `semantic-memory` skill; `session_search` / `knowledge_search` registerTool also available | Direct provider — available, not the current default |
| **pi-entwurf** (Oracle, tmux) | andenken extension + pi-telegram | full skill set + Telegram bridge | Persistent Opus session via `@glg_entwurf_bot` |
| **Claude Code** | andenken skill (CLI wrapper) | full skill set | CLAUDE.md + hooks; `entwurf-bridge` MCP available; settings tuned to mirror entwurf overlay (`defaultMode: default`, `autoMemoryEnabled: false`, binary/external tools deny-listed) |
| **Codex CLI** | skill surface + repo-managed MCP registration | full skill set | `~/.codex/skills/` from SSOT + `codex/config.toml` carries `entwurf-bridge`; direct `entwurf` / `entwurf_resume` verified |
| **Antigravity CLI (`agy`)** | repo-managed settings + skills + MCP | full skill set | `~/.gemini/antigravity-cli/{settings,skills,mcp_config}.json` from SSOT; direct `entwurf` / sync `entwurf_resume` verified |
| **OpenCode / OpenClaw** | andenken skill (same SSOT via symlink) | full skill set | settings / Nix store mount |

Session indexing is currently strongest on the `pi` + `claude` axes inside [andenken](https://github.com/junghan0611/andenken)'s unified index. Each chunk carries a `source` field (`"pi"` | `"claude"`) so you can filter, compare, or roll back across those transcript families. Other direct harnesses now share the same skills/MCP dignity surface here even where session indexing has not yet been widened to first-class source tags.

## What's Here

### Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Purpose |
|------|-----|---------|
| `session_search` | sessions.lance | Past pi + Claude Code conversations |
| `knowledge_search` / `search-md` | md.lance | Public digital garden export (`~/repos/gh/notes/content`) — agent-facing knowledge axis |

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and the md knowledge surface fires with dictcli query expansion. The older org embedding track is disabled in production; use `denotecli` for exact/raw Denote lookups. Loading strategy per harness lives in the Harness Support table above.

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

### entwurf Surface Reference

This repo is the **official consumer reference** for the `entwurf` surface.

| entwurf surface | Where this repo consumes it |
|---|---|
| backend provider (`entwurfProvider`) | `pi/settings.json`, `pi/settings.server.json` |
| MCP bridge (`entwurf-bridge`) | same settings files |
| `entwurf` / `entwurf_resume` / `entwurf_send` / `entwurf_peers` | `home/AGENTS.md`, operational use, skills like `entwurf-peek` |
| skill plugin injection | `run.sh setup` builds this repo's local plugin root and points settings at it |
| release pin | `package.json` + `pi/settings.server.json` + `run.sh` + `CHANGELOG.md` |

So when `entwurf` changes, this is the first consumer that should stay green.

Spec, verification harnesses, and the sync/async contract remain in [entwurf `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/entwurf/blob/main/AGENTS.md).

### Claude Code as Native Pi Surface

When entwurf isn't the path (operator chooses native Claude Code, or the 2026-06-15 Anthropic billing shift puts more sessions on direct Claude Code), `claude/settings.fragment.json` (workstation) and `claude/settings.server.json` (server) keep the native session as close to entwurf's ACP overlay as possible.

`~/.claude/settings.json` is **co-owned** with entwurf's meta-bridge installer (disjoint keysets). On workstations `setup` therefore **merges** the agent-config keyset (`settings.fragment.json`) into the live file instead of symlinking it — a symlink is whole-file ownership and the next writer's atomic rename would silently clobber the other side. agent-config owns hooks / language / 개인취향 toggles / `enabledPlugins.*@claude-plugins-official`; entwurf owns `permissions.allow/deny` / `statusLine` / B-lite single-driver scalars / meta wiring (`enabledPlugins.entwurf-meta-receive`, `extraKnownMarketplaces`). The fragment is verified disjoint from entwurf's keyset (SSOT: `entwurf.install-state.json`). Server devices have no meta-bridge, so they stay a single-owner symlink to `settings.server.json`.

| Axis | entwurf overlay | agent-config Claude Code |
|---|---|---|
| `permissions.defaultMode` | `"default"` | `"default"` |
| auto-memory | `autoMemoryEnabled: false` + empty `projects/` tree | same — per-cwd `memory/` kept empty |
| binary tools (PlanMode / Worktree) | not exposed | deny-listed |
| external surface tools (AskUserQuestion / Task* / Cron*) | not exposed | deny-listed |
| plugin farm | none | `enabledPlugins` false for all |
| MCP entwurf bridge | `entwurf-bridge` mounted | `mcp__entwurf-bridge__*` allowed |
| operator hooks | empty (`hooks: {}`) | `peon-ping` retained (deliberate) |

Aside from the hook channel, the two surfaces are interchangeable. This is the resident-side counterpart to **Asymmetric Mitsein** (비대칭 공존) — pi can spawn or message native Claude Code without the native surface drifting from pi conventions. Both halves of the harness pair stay aligned regardless of which one the operator is sitting in.

### Skills ([`skills/`](skills/))

Categories: data access (denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query), agent memory (session-recap, dictcli, semantic-memory, improve-agent), writing (botlog, botment, agenda, punchout), communication (slack-latest, jiracli, telegram), code surface (forge — v1.5, multi-profile), company workbench (voscli), web/media (brave-search, exa-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe), release hygiene (commit, tag-release), tools (emacs, tmux, diskspace).

**Web search:** `brave-search` for cheap keyword/freshness/country-scoped lookups; `exa-search` for intent-based semantic queries, code-context retrieval (GitHub + Stack Overflow + docs aggregated for an LLM), and structured grounded output via `--output-schema`.

**Code surface:** `forge` is the **code-side sibling of botment** — same single-bot identity (`glg-bot`), same footer-signature model, same closed-loop instinct, but pointed at self-hosted Forgejo instead of remark42. **v1.5 박힘** (2026-05-27): `bin/forge` 5-command (`list-open` / `state` / `comment` / `label-add` / `issue-create`), multi-profile (oracle: `forge.junghanacs.com` 가동 / work: 회사 인스턴스 가동), machine identity SSOT 분리 (`~/.current-forge-profile`), footer 자동 조립, mutating stderr observability. SSOT 는 [`forge-config`](https://github.com/junghan0611/forge-config) — 이 repo 의 `skills/forge/SKILL.md` 는 thin pointer. 로드맵: [agent-config #13](https://github.com/junghan0611/agent-config/issues/13).

**Skill doc principle (LSP pattern):** Agents don't read full docs. Each `SKILL.md` has a single API table at the top — function/command + args + example. English body, Korean description only. Target: <100 lines, <4KB. Like LSP autocomplete: see the signature, call immediately.

### Pi Config ([`pi/`](pi/))

| File | Purpose |
|------|---------|
| `settings.json` | Default model, theme, thinking level, `entwurfProvider` |
| `keybindings.json` | Custom keybindings |
| `claude-plugin.json` | Manifest used by this repo's local entwurf Claude plugin root |

### entwurf Skill Plugin (agent-config local layout)

entwurf runs Claude with `settingSources: []` (SDK isolation), so `~/.claude/skills/` is **not** auto-discovered. The bridge's install contract — plugin shape, `skillPlugins`, fail-fast validation — is documented upstream in entwurf's README §Custom Skills.

What this repo does is narrower: `run.sh setup` builds **one local consumer layout** under `~/.pi/agent/claude-plugin/` (manifest + per-skill symlinks back to `agent-config/skills/`) and points this repo's pi settings at that path. That path is an agent-config convention, not a entwurf contract.

Adding a new skill here still works the same way: drop it into `agent-config/skills/<name>/SKILL.md` and re-run `./run.sh setup`. The same SSOT now fans out to `~/.claude/skills/`, `~/.config/opencode/skills/`, `~/.pi/agent/skills/pi-skills/`, `~/.pi/agent/claude-plugin/skills/`, `~/.codex/skills/`, `~/.gemini/skills/` (Gemini legacy), and `~/.gemini/antigravity-cli/skills/` (Antigravity direct).

Codex direct mode also uses this repo-managed surface for MCP now: `codex/config.toml` carries a `entwurf-bridge` stdio registration, so direct Codex sessions can see the same bridge family instead of remaining the one MCP-empty harness.

For Antigravity direct mode, `run.sh setup` also wires `antigravity/settings.json` into `~/.gemini/antigravity-cli/settings.json` so statusline / permission / model choices live in-repo instead of only inside agy's self-written local state.

For Antigravity direct-mode MCP, `run.sh setup` also wires `antigravity/mcp_config*.json` into both `~/.gemini/antigravity-cli/mcp_config.json` (documented path) and `~/.gemini/config/mcp_config.json` (current live-runtime compatibility path).

Because Antigravity and Codex do not expose the same repo-managed custom command-file surface as pi / Claude Code, selected high-value commands can also be translated into thin wrapper skills (current prototypes: `skills/command-recall/`, `skills/command-glgimage/`).

### Themes ([`pi-themes/`](pi-themes/))

`glg-dark` (custom, Ghostty Dracula compatible).

### Commands ([`commands/`](commands/))

| Command | Purpose |
|---------|---------|
| `/recall` | Multi-axis context hydration without compact — daily memory-axis ritual |
| `/boom` | Capture a crashed entwurf session into `.agent-reports/` for later triage |
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
- Symlink OpenCode / Codex / Gemini legacy / Antigravity surfaces (`~/.codex/config.toml`, `~/.gemini/settings.json`, `~/.gemini/antigravity-cli/settings.json`, `~/.gemini/antigravity-cli/skills`, `~/.gemini/antigravity-cli/mcp_config.json`) plus skills and Claude Code commands. `~/.claude/settings.json` is **merged** (keyset, never symlinked) — co-owned with entwurf meta-bridge; both workstation (`settings.fragment.json`) and server (`settings.server.json`) merge the same way, and `pi/settings.json` merges too (co-owned with the pi runtime)
- Symlink `~/.local/bin` PATH binaries
- pnpm install for extensions and skills
- Hand off entwurf validation (typecheck, MCP, dual-backend smoke, persisted-bootstrap continuity, cancel-cleanup) to entwurf's own `run.sh`

## Session Management — No Compact

We don't use compact. Compact = AI reads entire conversation and summarizes = expensive + slow.

Instead:

1. When conversation gets long, `/new` to start fresh
2. Run `memory-sync` / `/memory reindex` explicitly when recent sessions need fresh indexing (no hidden paid auto-indexing)
3. In the new session, recover context with `/recall`

`/recall` is the **multi-axis context hydration** protocol owned by agent-config — not a per-session recap, not a entwurf bridge contract. It starts with `session-recap -p <repo> -m 15` but does not stop at one repo transcript. When the work crossed projects or days, it combines:

- `session-recap` — repo-local transcript extractor, no raw JSONL
- `session_search` — cross-project / cross-session semantic recall
- `knowledge_search` / `search-md` — public garden md concepts, journal exports, botlog/llmlog-derived design history
- `gitcli day --summary` + `denotecli day` — day-axis reconstruction
- journal `§repo` markers — sibling/담당자 call index

The answer must state which axes were seen and which were not. This keeps `/recall` token-light while avoiding false confidence from a plausible single-session summary.

The protocol itself lives in [`commands/recall.md`](commands/recall.md). The 2026-05-08 derivation history and raw evidence log are kept as a Denote llmlog note (`20260508T090911`, `~/org/llmlog/`) rather than as in-repo docs — `/recall` is a resident-side memory workflow, not a spec this repo carries. Renamed from `/recap` on 2026-05-12 to avoid shadowing Claude Code's built-in `/recap` (one-line session summary, feature-flagged via `tengu_sedge_lantern`); the two now coexist.

## Public Verification — Sessions as Evidence

This repo also owns the **resident-side policy** for publishing session artifacts when GLG wants public verification of harness behavior.

- `entwurf` owns bridge mechanism and invariants.
- `agent-config` owns export/review/upload workflow and publication criteria.
- Goal: long-term trust through evidence — raw-session publication, reject history, and later failure/drift analysis.
- Minimum publication gates: secret redaction, deny patterns, secret scanning (e.g. TruffleHog), semantic privacy review, small-batch dry-run.
- `pi-share-hf` is a strong reference shape for this pipeline.

## Persistent Agent — pi-entwurf

A persistent pi session on Oracle VM, accessible via Telegram `@glg_entwurf_bot`. The always-on presence agent — a 분신(Entwurf) that carries context across days. tmux session `pi-entwurf`, model `claude-opus-4-8`, full skill set.

Bridges: [pi-telegram](https://github.com/badlogic/pi-telegram) (production — queue · file I/O · stop · streaming preview) + [entwurf](https://github.com/junghan0611/entwurf) (minimal presence — `--telegram` flag). See [§ -config Ecosystem](#the--config-ecosystem) for both rows.

## Shell Aliases (`~/.bashrc.local`)

```bash
# Claude Code + Telegram bridge
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official'
alias claude-tgd='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'

# pi garden launcher helper (entwurf 0.9.0): every --entwurf-control
# resident session must be born with a garden-native session id.
_pi_garden_pi() {
  local sid
  sid="$($HOME/repos/gh/entwurf/run.sh new-session-id)" || return
  command pi --session-id "$sid" "$@"
}

# pi: presence agent variant (Telegram bridge)
pihome() { _pi_garden_pi --entwurf-control --telegram "$@"; }
pia() { _pi_garden_pi --entwurf-control --emacs-agent-socket server "$@"; }
```

## The -config Ecosystem

| Repo | Layer | Description |
|------|-------|-------------|
| [nixos-config](https://github.com/junghan0611/nixos-config) | OS | NixOS flakes, hardware, services |
| [doomemacs-config](https://github.com/junghan0611/doomemacs-config) | Editor | Doom Emacs, org-mode, denote |
| [zotero-config](https://github.com/junghan0611/zotero-config) | Bibliography | 8,000+ references, bibcli |
| **[agent-config](https://github.com/junghan0611/agent-config)** | **Agent infra** | **Extensions, skills, themes, settings — this repo** |
| **[entwurf](https://github.com/junghan0611/entwurf)** | **Provider (ACP bridge)** | **Default Claude path in pi. ACP bridge to Claude Code + Codex** |
| **[andenken](https://github.com/junghan0611/andenken)** | **Memory** | **Semantic memory — sessions + md public garden knowledge** |
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

## Planning Files

- [NEXT.md](NEXT.md) — volatile next-step anchor for the next session
- [ROADMAP.md](ROADMAP.md) — medium-horizon tracks and direction
- [CHANGELOG.md](CHANGELOG.md) — closed history

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
