# agent-config

**Contextual continuity infrastructure for AI agents.** Every new AI session starts at zero — no memory of past conversations, no access to your knowledge base, no awareness of your tools. agent-config solves this: when you switch agents, sessions, or even models, the same human's memory, knowledge, and work context carries over.

**Official reference consumer and proving ground for [`entwurf`](https://github.com/junghan0611/entwurf).**

`entwurf` is the integrated substrate that configures every harness and unifies agent integration — the strong, stable core (a garden-citizen dispatch substrate, not a pi adapter). agent-config is the resident-side layer that feeds it: the **skills SSOT** (`skills/`) plus a **시험소 (proving ground)** where harness config, hooks, and wiring are hardened on the operator's real surface and soak-tested for weeks before being promoted into entwurf. Pushing unproven config straight into entwurf would weaken the core, so agent-config absorbs that churn first.

The two are not co-equal halves — entwurf is the destination, agent-config is where things are proven before they get there:

- **entwurf** → integrated harness config, agent integration, backend bridge, MCP injection, verification harnesses — the stable core
- **agent-config** → skills SSOT, real consumer profile, day-to-day operating surface, and the incubator that hardens config before promotion

> The natural end state is a thin skills SSOT plus a test bench: **agent-config quiet means the pipeline is healthy.** See [ROADMAP § purpose shift](ROADMAP.md).

### The bench is self-sufficient

A proving ground that can only install what it already believes in is not a proving ground. This repo's `run.sh` stands up, pins, and tears down the things it evaluates **on its own** — including whole agent runtimes that compete with the stack it currently runs. Nothing about that path routes through entwurf, pi, or any harness under test.

That self-sufficiency is what lets the subject matter widen. The bench started at "does this skill load in five harnesses" and now reaches questions like *does a runtime that writes its own skills beat a human-authored skill set* — see [§ Agent Runtime Bench](#agent-runtime-bench). The rule that makes those answers worth anything is boring and strict: **the subject is version-pinned and installed small**, so a re-run means the same thing twice.

> **What this is NOT:** not a prompt collection, not a LangChain-style automation layer, not a generic multi-agent framework. It is the infrastructure that lets one human's memory, knowledge, and working surface survive across sessions, harnesses, and models.

## Official Reference Surface for entwurf

If `entwurf` asks “what does a real consumer look like?”, this repo is the answer.

| Surface | Owned by | Reference in this repo |
|---------|----------|------------------------|
| ACP backend bridge | `entwurf` | consumed through `pi/settings.json` (`_common` + device overlay) |
| MCP servers (`entwurf-bridge`) | `entwurf` | **not wired here** — entwurf's own install writes `entwurfProvider.mcpServers` and records its stable bin |
| Entwurf install / auth / setup | `entwurf` | **not consumer-installed here** — this repo clones the source for dogfooding and hands install to entwurf's own `./run.sh setup`; a consumer install here would weaken entwurf's release gate |
| Claude skill plugin farm | pair boundary | this repo builds one consumer layout at `~/.pi/agent/claude-plugin/`, then points `entwurf` at it |
| Skills / prompts / themes / profile | `agent-config` | SSOT in `skills/`, `commands/`, `pi-themes/`, `home/AGENTS.md` |
| Consumer install/update policy | `agent-config` | `run.sh setup` / server-device upgrade path |
| Production verification | pair boundary | day-to-day use here, bridge invariants in `entwurf` |

In short: **entwurf defines the bridge contract; agent-config proves the contract against lived use.**

## Why This Exists

The hardest problem in working with AI agents is not code generation — it's continuity. You build context over hours, then the session ends. Next session: blank slate. Switch from Claude to GPT: blank slate. Move from your laptop to your phone: blank slate.

agent-config attacks this with three layers:

1. **Shared memory layer** ([andenken](https://github.com/junghan0611/andenken)) — past conversations from every harness + the exported public digital garden in a semantically searchable index. Ask "보편 학문 관련 노트 찾아줘" and it searches the garden md memory without being told the English word.

2. **Shared skill set** — the same capabilities (search notes, read bibliography, check git history, write to journal) available identically whether you're in pi, Claude Code, Codex, Antigravity, or OpenClaw.

3. **Session continuity protocol** — `/new` + recap + semantic search instead of expensive compact. Start a new session, recover full context in seconds for ~2K tokens instead of re-reading 50K.

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/). Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

The result: context survives across sessions, across harnesses, across models. One human's digital universe stays coherent no matter which AI is looking at it.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

### Harness Support

| Harness | Memory | Skills | Notes |
|---------|--------|--------|-------|
| **pi + entwurf** (default Claude path) | andenken extension on pi side; Claude side gets full skill set via this repo's plugin farm | full skill set on both sides — `semantic-memory` mounted as a SKILL.md skill, plus `session_search` / `knowledge_search` registerTool on pi for direct calls | SDK isolation (`settingSources: []`); skills injected via `entwurfProvider.skillPlugins` |
| **pi + anthropic** (`claude-opus-4-8` / `claude-sonnet-5`) | andenken extension (in-process LanceDB) | full skill set including `semantic-memory` skill; `session_search` / `knowledge_search` registerTool also available | Direct provider — available, not the current default |
| **Claude Code** | andenken skill (CLI wrapper) | full skill set | CLAUDE.md + hooks; `entwurf-bridge` MCP available; settings tuned to mirror entwurf overlay (`autoMemoryEnabled: false`, binary/external tools deny-listed); `permissions.defaultMode: bypassPermissions` — agent-config owns the native key, entwurf owns the ACP overlay's |
| **Codex CLI** | skill surface + repo-managed MCP registration | full skill set | `~/.codex/skills/` from SSOT + `codex/config.toml` carries `entwurf-bridge`; verified as a garden citizen from a direct session |
| **Antigravity CLI (`agy`)** | repo-managed settings + skills | full skill set | `~/.gemini/antigravity-cli/{settings.json,skills}` from SSOT; `mcp_config.json` is entwurf-owned. Native-push citizen (`entwurf_register_native`) — no mailbox, replies inject into the live conversation |
| **OpenClaw** (4 bots) | andenken skill (same SSOT via symlink) | full skill set | settings / Nix store mount |

**OpenCode is not used.** It once appeared in this table and in the fan-out list, but `run.sh` never wires it — there is no `~/.config/opencode/skills` link and no OpenCode branch anywhere in setup. The rows have been removed rather than left as an aspiration; a harness this repo does not actually reach should not be advertised as supported.

Session indexing is currently strongest on the `pi` + `claude` axes inside [andenken](https://github.com/junghan0611/andenken)'s unified index. Each chunk carries a `source` field (`"pi"` | `"claude"`) so you can filter, compare, or roll back across those transcript families. Other direct harnesses now share the same skills/MCP dignity surface here even where session indexing has not yet been widened to first-class source tags.

## What's Here

### Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Purpose |
|------|-----|---------|
| `session_search` | sessions.lance | Past pi + Claude Code conversations |
| `knowledge_search` / `search-md` | md.lance | Public digital garden export (`~/repos/gh/notes/content`) — agent-facing knowledge axis |

Both axes embed through **OpenRouter Qwen3-Embedding-8B at 4096d** (LanceDB + hybrid retrieval: vector + FTS with score normalization). The Gemini embedding path is retired — `gemini-embeddings.ts` and `GeminiProvider` survive in andenken only as an unreferenced back-compat shim, and no preset selects them.

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and the md knowledge surface fires with dictcli query expansion. The older org embedding track is disabled in production; use `denotecli` for exact/raw Denote lookups. Loading strategy per harness lives in the Harness Support table above.

### Pi Extensions ([`pi-extensions/`](pi-extensions/))

| Extension | Purpose |
|-----------|---------|
| `background-bash.ts` | `bash_background` — run a slow command without blocking; the agent is re-invoked with its exit code and output when it finishes |
| `review.ts` | `/review` — review a PR, base branch, commit, uncommitted changes, or a folder |
| `goal.ts` | `/goal` — long-running objective mode; keeps continuing itself until the objective is met or a budget is hit |
| `continue.ts` | `shift+alt+enter` — send "continue" when the agent has stopped |
| `env-loader.ts` | Load `~/.env.local` at session start |
| `hide-providers.ts` | Keep skill-only keys (OpenRouter, HF, Google, Groq) out of pi so their 440 models stay out of the picker — see [MODELS.md](MODELS.md) |
| `upstage-provider.ts` | Register Upstage Solar as an OpenAI-compatible provider |
| `context.ts` | `/context` — show loaded extensions, skills, context usage |
| `glg-footer.ts` | Footer signature |
| `go-to-bed.ts` | Late-night reminder |
| `peon-ping.ts` | Sound notifications |
| `gemini-image-gen.ts` | Gemini image generation (nanobanana) |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

**Direction: this surface shrinks.** A pi extension only exists inside pi — Claude Code, Codex, and Antigravity cannot see it. A skill runs everywhere. So capability that agents actually call is migrating extension → skill (semantic memory is the finished case: `skills/semantic-memory/` is a CLI wrapper every harness can invoke, while the pi-side `session_search` / `knowledge_search` registerTool remains a convenience, not the only door). What stays here is pi-local ergonomics — env loading, sound, footer, cost breakdown.

The four extensions added on 2026-08-07 do not contradict that. None of them could be a skill: they hook pi's turn loop, which no CLI can reach from outside. Three (`review`, `goal`, `continue`) are adopted from [earendil-works/agent-stuff](https://github.com/earendil-works/agent-stuff) with local tuning; `background-bash` was written here.

#### `background-bash` — why it exists

pi's built-in bash tool is synchronous only. A slow `pnpm check` therefore either blocks the whole turn or gets parked in tmux, and parked work needs a human to come back and look at it. The observed failure mode is the agent announcing "I'll run pnpm check" and then ending the turn, waiting on a keystroke. Claude Code does not have this problem: `run_in_background` plus a completion notification re-invokes the model.

pi has no completion hook — but it does not need one. `pi.sendMessage(..., { triggerTurn: true })` may be called from **any** async callback, and `agent-session.ts` explicitly runs a continuation for messages queued after a turn ends ("queued by agent_end extension handlers"). So the child process's `exit` handler queues the result and triggers a turn; if a turn is already running it is delivered as a follow-up. `goal.ts` uses the same mechanism from `agent_end`. The footer shows `⏳ n tasks` while anything is pending.

Two things learned the hard way, recorded so they are not re-derived: spawn through pi's own `getShellConfig()` (it returns `bash -c`, and a login shell sources a profile that injects OSC escape bytes into model context), and `detached: true` + `process.kill(-pgid, …)` (signalling only the bash pid leaves a pipeline's descendants running).

The external pi packages that remain live are semantic-memory ([andenken](https://github.com/junghan0611/andenken)) and entwurf's self-registered install — neither is declared from here; see [§ -config Ecosystem](#the--config-ecosystem).

### entwurf Surface Reference

This repo is the **official consumer reference** for the `entwurf` surface.

| entwurf surface | Where this repo consumes it |
|---|---|
| backend provider (`entwurfProvider`) | `pi/settings.json` (`_common` + device overlay) |
| MCP bridge (`entwurf-bridge`) | same settings files |
| `entwurf_v2` / `entwurf_peers` / `entwurf_self` / `entwurf_inbox_read` / `entwurf_fresh_call` / `entwurf_register_native` | `home/AGENTS.md`, operational use, skills like `entwurf-peek` |
| skill plugin injection | `run.sh setup` builds this repo's local plugin root and points settings at it |
| install / version pin | **entwurf's own `./run.sh`** — this repo pins nothing on its behalf |

So when `entwurf` changes, this is the first consumer that should stay green.

The bridge surface above is the **v2** one. The v1 trio (`entwurf` / `entwurf_resume` / `entwurf_send`) was removed in a hard cut (entwurf `CHANGELOG.md` #50) and no longer exists anywhere — a doc row naming those tools is stale, not a fallback. Note also that `session_search` / `knowledge_search` never came from this bridge: they are andenken's pi-native `registerTool` surface.

There is deliberately **no release-pin row** here. This repo does not carry an entwurf version constant, an install spec, or a tracking ref — `setup_repos` clones the source for dogfooding and stops there. It does not even declare entwurf as a pi package any more: entwurf's own `./run.sh install` registers it as a user-scope citizen in `~/.pi/agent/settings.json`, and `remove-user-scope` is the inverse. Install, auth, and version selection belong to that side, because a consumer that pins its own copy weakens the release gate it is supposed to exercise.

Spec, verification harnesses, and the sync/async contract remain in [entwurf `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/entwurf/blob/main/AGENTS.md).

### Claude Code as Native Pi Surface

When entwurf isn't the path (operator chooses native Claude Code, or the 2026-06-15 Anthropic billing shift puts more sessions on direct Claude Code), `claude/settings.fragment.json` (workstation) and `claude/settings.server.json` (server) keep the native session as close to entwurf's ACP overlay as possible.

`~/.claude/settings.json` is **co-owned** with entwurf's meta-bridge installer (keysets *intended* to be disjoint — see the warning below). On workstations `setup` therefore **merges** the agent-config keyset (`settings.fragment.json`) into the live file instead of symlinking it — a symlink is whole-file ownership and the next writer's atomic rename would silently clobber the other side. agent-config owns hooks / language / 개인취향 toggles / `enabledPlugins.*@claude-plugins-official` / **`permissions.defaultMode`**; entwurf owns `permissions.allow/deny` / `statusLine` / B-lite single-driver scalars / meta wiring (`enabledPlugins.entwurf-meta-receive`, `extraKnownMarketplaces`). The `permissions` object is split down the middle and stays disjoint: the fragment carries `defaultMode` alone and jq's recursive object merge leaves entwurf's `allow`/`deny` arrays untouched. The SSOT for entwurf's side is `entwurf.install-state.json`, and entwurf ships the preventive check: `./run.sh check-keyset-overlap <fragment>` from the entwurf repo names every colliding key. Server devices take the same keyset-merge path (`run.sh` merges `settings.server.json` into the live file — it is **not** a symlink), and they do carry a meta-bridge: oracle's install-state owns 18 keys as of 2026-08-08.

⚠️ **The disjointness claim does not currently hold.** `check-keyset-overlap` reports 2 collisions for `settings.fragment.json` (`enableWorkflows`, `workflowKeywordTriggerEnabled`) and 20 for `settings.server.json` — the server file still carries entwurf's whole keyset from the pre-merge single-owner era, including `permissions.allow/deny`, `statusLine`, and the meta wiring. Values happen to match on both sides, so nothing misbehaves yet; that is precisely the silent shape [`5b9c75c`](https://github.com/junghan0611/agent-config/commit/5b9c75c) called a drift bomb when it ceded `permissions.allow/deny`. `permissions.defaultMode` is **not** among the collisions — the pin below is clean. Cleanup is unscheduled; run the guard before adding any key to either file.

| Axis | entwurf overlay | agent-config Claude Code |
|---|---|---|
| `permissions.defaultMode` | `"default"` (overlay-authored, `overlay.ts`) — **should be `"bypassPermissions"`** | `"bypassPermissions"` |
| auto-memory | `autoMemoryEnabled: false` + empty `projects/` tree | same — per-cwd `memory/` kept empty |
| binary tools (PlanMode / Worktree) | not exposed | deny-listed |
| external surface tools (AskUserQuestion / Task* / Cron*) | not exposed | deny-listed |
| plugin farm | none | `enabledPlugins` false for all |
| MCP entwurf bridge | `entwurf-bridge` mounted | `mcp__entwurf-bridge__*` allowed |
| operator hooks | empty (`hooks: {}`) | `peon-ping` retained (deliberate) |

**`permissions.defaultMode: "bypassPermissions"` — two surfaces that must carry the same value.** Both `settings.fragment.json` (workstation) and `settings.server.json` (server) pin the key here as of 2026-08-08. **This pin is a stopgap held on entwurf's behalf, not a claim of ownership** — see the handover condition below.

Two surfaces, because there are two config reads. Native Claude Code reads `~/.claude/settings.json`. An ACP peer does **not**: `claude-agent-acp` reads through `CLAUDE_CONFIG_DIR`, which entwurf's overlay redirects at a pi-owned directory whose `settings.json` the overlay authors itself ([`pi-extensions/lib/acp/overlay.ts`](https://github.com/junghan0611/entwurf), `overlaySettingsJson()`). A peer session therefore never sees this repo's value at all. **If the two surfaces disagree, the failure is silent and asymmetric** — the operator's own sessions run bypass while every peer still stalls on a skill edit, which reads as "entwurf is broken" rather than "one config key is unpaired."

An allow-list cannot substitute. The overlay's premise — "`default` auto-passes every tool we expose, because `permissionAllow` names them explicitly" — has one hole: Claude Code carries a **hardcoded `.claude/` write guard** that no allow-list clears (regression from v2.1.79, [claude-code#36497](https://github.com/anthropics/claude-code/issues/36497), still open; two sibling reports closed *not planned*, upstream's position being "use bypass"). Measured on v2.1.226: under `default` + full allow-list an edit to `~/.claude/skills/…/SKILL.md` prompts (`Yes, and allow Claude to edit its own settings for this session`) and the session **blocks until a human answers** — and the prompt's only escape hatch is scoped `for this session`, so there is no durable opt-out. Under `bypassPermissions` the same edit passes silently, as does a write to `~/.claude/` itself. A peer editing a skill mid-collaboration therefore stalls indefinitely; that is the whole failure mode.

`merge_settings` is EXISTING-WINS, so this pin only **fills** the key on a device that lacks it. A device already carrying `"default"` keeps it and `setup` emits a divergence warning instead — clear the key from the live file to let the new default land.

**The split is deliberate and settled (2026-08-08, with entwurf's steward) — this key stays here.** The dividing line is blast radius, not key tidiness:

| Layer | Owner | Why |
|---|---|---|
| Native Claude Code, operator-wide | **agent-config / operator** | `~/.claude/settings.json` governs *every* native session. `bypassPermissions` is the same authority as `--dangerously-skip-permissions`, so a public package must not switch it on as a side effect of installing a plugin and a mailbox. Turning global YOLO on is the operator's own act. |
| ACP child runtime, isolated | **entwurf overlay** | The child is sealed off by `CLAUDE_CONFIG_DIR` and never reads the file above, so the value has to be pinned again in `overlay.ts`. entwurf also constrains the callable-tool surface and owns the unattended turn, so the risk stays inside its own sandbox. |

entwurf's meta-bridge deliberately does **not** claim `permissions.defaultMode`: its `smoke-meta-keyset-guard.sh` fixture lists the key as a legitimate consumer-owned field ("`permissions.defaultMode` … must NOT trip the guard"). Reading its ownership of `permissions.allow/deny` as an argument that it should own `defaultMode` too gets the boundary backwards — those constrain which tools exist, this one decides how much authority the operator hands the whole machine.

Entwurf claiming the native key later would be a policy change, not a one-line addition: managed-scalar entry, install/uninstall snapshot and restore, keyset-guard update, removal from this repo in the same beat, explicit opt-in for public installs, and clean-host docs carrying the warning. Not scheduled.

⚠️ One asymmetry survives the split. entwurf's `MANAGED_SETTINGS_SCALARS` pins `skipDangerousModePermissionPrompt: true`, and that key only does anything under `bypassPermissions` — it suppresses the confirmation Claude Code shows on entering the dangerous mode. So the package declines to turn global YOLO on, yet disarms the last warning shown to whoever does. Observed directly: flipping `defaultMode` on thinkpad and oracle brought bypass up silently on both, no prompt. If the boundary is "the operator owns this decision," the operator arguably owns the warning attached to it too. Raised with entwurf; unresolved.

Aside from the hook channel, the two surfaces are interchangeable. This is the resident-side counterpart to **Asymmetric Mitsein** (비대칭 공존) — pi can spawn or message native Claude Code without the native surface drifting from pi conventions. Both halves of the harness pair stay aligned regardless of which one the operator is sitting in.

### Skills ([`skills/`](skills/))

42 skills. Categories: data access (denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query, timeline), agent memory (session-recap, dictcli, semantic-memory, memory-sync, improve-agent), writing (botlog, botment, agenda, punchout, autholog-mend), communication (slack-latest, jiracli, telegram), code surface (forge — v1.5, multi-profile), work workbench (plane), web/media (brave-search, exa-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe), release hygiene (commit, tag-release, next-handoff), reasoning (logickocli), entwurf (entwurf-peek), harness wrappers (command-recall, command-glgimage — for harnesses with no custom-command surface), tools (emacs, tmux, diskspace, cloudflare, quota, butlercli).

**Binary skills: agent-config owns the skill surface, alone.** For skills backed by a sibling-repo CLI (denotecli, bibcli, gitcli, lifetract), this repo owns **both** the `SKILL.md` and the deployed binary; the sibling repo holds **code only** and its own `deploy` never writes into the skill directory. Two owners means nobody knows which one is true. `run.sh setup:build` gates each install behind the sibling repo's test suite and refuses uncommitted sources, then writes [`skills/.provenance.json`](skills/.provenance.json) — per tool: `vcs_revision`, `src_tree`, and the installed binary's `sha256`. A snapshot whose tools cannot be named is not reproducible, it only looks it. (`dictcli` is the open gap: GraalVM native-image doesn't ride the Go gate, so it carries no provenance yet.)

**Web search:** `brave-search` for cheap keyword/freshness/country-scoped lookups; `exa-search` for intent-based semantic queries, code-context retrieval (GitHub + Stack Overflow + docs aggregated for an LLM), and structured grounded output via `--output-schema`.

**Code surface:** `forge` is the **code-side sibling of botment** — same single-bot identity (`glg-bot`), same footer-signature model, same closed-loop instinct, but pointed at self-hosted Forgejo instead of remark42. **v1.5 박힘** (2026-05-27): `bin/forge` 5-command (`list-open` / `state` / `comment` / `label-add` / `issue-create`), multi-profile (oracle: `forge.junghanacs.com` 가동 / work: 회사 인스턴스 가동), machine identity SSOT 분리 (`~/.current-forge-profile`), footer 자동 조립, mutating stderr observability. SSOT 는 [`forge-config`](https://github.com/junghan0611/forge-config) — 이 repo 의 `skills/forge/SKILL.md` 는 thin pointer. 로드맵: [agent-config #13](https://github.com/junghan0611/agent-config/issues/13).

**Skill doc principle (LSP pattern):** Agents don't read full docs. Each `SKILL.md` has a single API table at the top — function/command + args + example. English body, Korean description only. Target: <100 lines, <4KB. Like LSP autocomplete: see the signature, call immediately.

### Pi Config ([`pi/`](pi/))

| File | Purpose |
|------|---------|
| `settings.json` | The single pi settings **reference**: `_common` plus `_workstation` / `_server` overlays, with `_`-prefixed keys carrying the prose. `setup` resolves one overlay and **merges** the result — never symlinks, because the pi runtime co-owns the live file |
| `keybindings.json` | Custom keybindings |
| `claude-plugin.json` | Manifest used by this repo's local entwurf Claude plugin root |

This repo is a place to **look a setting up**, not a live config store. The merge is EXISTING-WINS, so editing `pi/settings.json` provisions a fresh machine and only *warns* on a running one — to change a running one, edit `~/.pi/agent/settings.json`. `pi/settings.server.json` was folded in on 2026-08-06: with entwurf's `packages[]` entry and the runtime's `lastChangelogVersion` both removed as not-ours, its only remaining divergence was `defaultThinkingLevel`, and a whole second copy of a file for one scalar is a file that drifts.

### entwurf Skill Plugin (agent-config local layout)

entwurf runs Claude with `settingSources: []` (SDK isolation), so `~/.claude/skills/` is **not** auto-discovered. The bridge's install contract — plugin shape, `skillPlugins`, fail-fast validation — is documented upstream in entwurf's README §Custom Skills.

What this repo does is narrower: `run.sh setup` builds **one local consumer layout** under `~/.pi/agent/claude-plugin/` (manifest + per-skill symlinks back to `agent-config/skills/`) and points this repo's pi settings at that path. That path is an agent-config convention, not a entwurf contract.

Adding a new skill here still works the same way: drop it into `agent-config/skills/<name>/SKILL.md` and re-run `./run.sh setup`. The same SSOT fans out to five surfaces: `~/.claude/skills/`, `~/.pi/agent/skills/pi-skills/`, `~/.pi/agent/claude-plugin/skills/`, `~/.codex/skills/`, and `~/.gemini/antigravity-cli/skills/` (Antigravity direct).

> `~/.gemini/` is Antigravity's home, not Gemini CLI's. The standalone `gemini` binary is gone from this machine and its legacy surface (`~/.gemini/settings.json`, `~/.gemini/skills/`) was retired 2026-08-06 — but `~/.gemini/antigravity-cli/` and `~/.gemini/config/` are live and must survive any cleanup of that directory.

Codex direct mode also uses this repo-managed surface for MCP now: `codex/config.toml` carries a `entwurf-bridge` stdio registration, so direct Codex sessions can see the same bridge family instead of remaining the one MCP-empty harness.

For Antigravity direct mode, `run.sh setup` wires only the skills path. Both `settings.json` and `mcp_config.json` are **not** wired from here — `entwurf`'s `install-agy-bridge` / `install-agy-statusline` adapters own them: they adopt or create a regular file and record the bare `entwurf-bridge` / `entwurf-agy-statusline` stable bins. A symlink from this repo makes those adapters REFUSE.

`settings.json` was linked from here until 2026-08-13. It caused a silent regression loop: every `setup:links` pushed the live file — carrying entwurf's exact permission grants and statusLine — aside as `.bak.YYYYMMDD` and replaced it with the repo copy, so agy lost its entwurf wiring until the next `install-agy-*` run (observed twice each on thinkpad and oracle). agy also replaces the file rather than following a symlink when it saves settings, so the link never survived anyway. Skills stay ours; settings and MCP do not.

Because Antigravity and Codex do not expose the same repo-managed custom command-file surface as pi / Claude Code, selected high-value commands can also be translated into thin wrapper skills (current prototypes: `skills/command-recall/`, `skills/command-glgimage/`). `command-glgimage` now bundles a zero-dependency Gemini REST CLI, so Claude Code and other harnesses can generate exact-prompt document figures to a requested path without pi's native `generate_image` tool; GLGMAN world anchoring is an explicit mode, not a restriction on general image generation.

### Themes ([`pi-themes/`](pi-themes/))

`glg-dark` (custom, Ghostty Dracula compatible).

### Commands ([`commands/`](commands/))

| Command | Purpose |
|---------|---------|
| `/recall` | Multi-axis context hydration without compact — daily memory-axis ritual |
| `/discuss` | Planning interviewer — turns a rough idea into a plan by asking at most three questions a round, each with a recommended default. Does not implement |
| `/boom` | Capture a crashed entwurf session into `.agent-reports/` for later triage |
| `/pandoc-html` | Markdown/Org → Google Docs HTML/DOCX |
| `/glg-image` | Image generation entry |
| `/metaplay` | Meta agent play |
| `/docplay` | Random document polish play (front matter/title/tags/links/rename) |
| `/authologplay` | Mend one raw autholog piece into garden core text + links + a GLGMAN Universe image |
| `/scaleplay` | Take a scene whose scale won't sit still: commit the first intuition, measure it, accumulate in `studies/` |

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # clone/pull + build CLIs + symlink everything + pnpm install
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

`./run.sh setup` performs:

- Clone missing tracked repos (`setup` does **not** pull existing repos; use `./run.sh update` for pulls)
- Build native CLI binaries (Go + GraalVM) — **gated**: each Go CLI must pass its sibling repo's test suite and be built from committed sources, or it is not installed. `skills/.provenance.json` records what actually landed; `./run.sh env` warns when a live binary drifts from its recorded build
- Symlink pi extensions, full skill set (including `semantic-memory`), themes, settings, keybindings, prompts
- Run andenken's own `run.sh setup` (build + deps). It is **no longer declared as a pi package here** — agents reach it through the `semantic-memory` skill, which every harness can invoke. Where it is already registered as a pi package, pi additionally gets the `session_search` / `knowledge_search` registerTool; that is a pi-local convenience, not the shared door
- Symlink Codex / Antigravity surfaces (`~/.codex/config.toml`, `~/.gemini/antigravity-cli/settings.json`, `~/.gemini/antigravity-cli/skills`) plus skills and Claude Code commands. `~/.claude/settings.json` is **merged** (keyset, never symlinked) — co-owned with entwurf meta-bridge; both workstation (`settings.fragment.json`) and server (`settings.server.json`) merge the same way, and `pi/settings.json` merges too (co-owned with the pi runtime)
- Symlink `~/.local/bin` PATH binaries
- pnpm install for extensions and skills
- Hand off entwurf validation (typecheck, MCP, dual-backend smoke, persisted-bootstrap continuity, cancel-cleanup) to entwurf's own `run.sh`

What `setup` deliberately does **not** do: install entwurf (that is entwurf's own `./run.sh setup` — see [§ entwurf Surface Reference](#entwurf-surface-reference)) and install the runtime under evaluation (`./run.sh setup:hermes`, [§ Agent Runtime Bench](#agent-runtime-bench)). Both are omissions with a reason, not gaps to fill.

## Agent Runtime Bench

Some questions cannot be answered by reading a project's README. *Does a runtime that generates its own skills from experience beat a human-authored skill set?* You only find out by standing both up on the same machine, giving them the same repeated task, and looking at what each wrote down afterwards.

So this repo installs the competition. The current subject is [Hermes Agent](https://github.com/NousResearch/hermes-agent) — an independent runtime with its own gateway, state tree, cron, memory and skill generation. It is a **candidate under evaluation, not adopted infrastructure**: nothing about it is declared in `nixos-config`, and `setup:hermes` is not part of `setup`.

```bash
./run.sh setup:hermes    # pinned tag, minimal closure, explicit call only
```

Two constraints carry the whole thing, and both are one careless edit from being lost:

**Pinned, never fast-forwarded.** `THIRD_PARTY_PACKAGE_REPOS` is the obvious home for the clone, but every entry there is pulled to latest on `setup` and `update`. A subject that moves between runs cannot be re-measured, so hermes is kept out of that map on purpose and `HERMES_TAG` selects the version.

**Installed small, not merely configured small.** Upstream's default build adds 18 optional groups — messaging (Telegram/Discord/Slack), voice, web-search backends. Built that way, "integrations stay off" is a promise about configuration. Built from `.#minimal` they are absent from the closure and cannot be switched on by mistake. The single group added back is `anthropic`, without which `hermes auth add anthropic --type oauth` logs in successfully and only fails later at inference — the auth layer and the SDK are separate, so a successful login proves nothing about reachability.

What that leaves is a runtime that reaches Claude, GPT (`openai-codex` OAuth) and Solar (auto-discovered `UPSTAGE_API_KEY`) while being structurally unable to talk to a messaging platform. State lives in `~/.hermes`; deleting it resets the baseline, and the first run after that is t=0 for anything the runtime claims to have learned.

The comparison target is not another product. It is this repo's own loop — `AGENTS.md` + `skills/` + semantic memory + `botlog`/`NEXT` — and the honest question is whether a machine-written skill trail is more transparent and reproducible than the hand-written one.

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

## Shell Aliases (`~/.bashrc.local`)

```bash
# Claude Code + Telegram bridge
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official'
alias claude-tgd='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'

# pi garden launcher helper — a --entwurf-control session needs NO id injection.
# pi mints its own session id (a uuidv7 is normal), session_start attaches it to
# its meta-record, and the RECORD mints the garden id and keys the control socket
# on it. The old `--session-id "$(run.sh new-session-id)"` form was retired in
# entwurf #50 C2; it gave a session two address-shaped strings, only one of which
# was an address. The wrapper is kept only so the variants below stay one edit wide.
_pi_garden_pi() { command pi "$@"; }

# pi: garden citizen with the agent Emacs socket
# (`pihome`, the --telegram presence variant, was dropped 2026-08-06 with the bridge)
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
- [MODELS.md](MODELS.md) — which model rails exist and on what contract terms (rolling quota → Copilot credits → metered API), plus a regenerable `pi --list-models` snapshot (`./run.sh models`)

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
