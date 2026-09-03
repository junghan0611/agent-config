# agent-config

**Contextual continuity infrastructure for AI agents.** Every new AI session starts at zero — no memory of past conversations, no access to your knowledge base, no awareness of your tools. agent-config solves this: when you switch agents, sessions, or even models, the same human's memory, knowledge, and work context carries over.

## How to Read This

This is a front door, not a manual. It is written for someone who wants to see **what one operator actually runs day to day** — not for someone about to install a framework. Four things to hold before the first table.

**1. This repo is not the engine.** The engine is [`entwurf`](https://github.com/junghan0611/entwurf) (v0.17.2, 2026-09-03) — the dispatch substrate that lets six already-existing harnesses address one another by **garden id**. agent-config is the resident side: the **skills SSOT** plus the **시험소 (proving ground)** where config is hardened on a real daily surface before entwurf absorbs it. So when a table below describes harness wiring, read it as *what is currently being proven here*, not as a finished contract.

**2. A quiet repo is a healthy one.** The end state is a thin skills SSOT plus a test bench. Growth here is not progress — a busy changelog usually means something is still being proven. Do not read the skill count as a feature list; the identity is the working method, not the tool count.

**3. Read one of three passes, depending on why you came:**

| You came for | Read |
|---|---|
| *What can these agents actually do?* | [§ Skills](#skills-skills) · [§ Semantic Memory](#semantic-memory--andenken) |
| *How does context survive a new session?* | [§ Why This Exists](#why-this-exists) · [§ Session Management](#session-management--new--recall) |
| *Is any of this measured, or just asserted?* | [§ Agent Runtime Bench](#agent-runtime-bench) · [OMP.md](OMP.md) · [MODELS.md](MODELS.md) |

**4. Sentences here try to carry their evidence.** Where a claim was measured, the receipt is named — a date, a host, a file, a version. Where it is inherited or still open, it says so. A sentence that cannot name one of those is a hypothesis, including in this document. This is the same rule the agents working in this repo are held to.

> **What this is NOT:** not a prompt collection, not a LangChain-style automation layer, not a generic multi-agent framework. It is the infrastructure that lets one human's memory, knowledge, and working surface survive across sessions, harnesses, and models.

## What This Is

**Official reference consumer and proving ground for [`entwurf`](https://github.com/junghan0611/entwurf).**

`entwurf` is the integrated substrate that configures every harness and unifies agent integration — the strong, stable core (a garden-citizen dispatch substrate, not a pi adapter). agent-config is the resident-side layer that feeds it: the **skills SSOT** (`skills/`) plus a **시험소 (proving ground)** where harness config, hooks, and wiring are hardened on the operator's real surface and soak-tested for weeks before being promoted into entwurf. Pushing unproven config straight into entwurf would weaken the core, so agent-config absorbs that churn first.

The two are not co-equal halves — entwurf is the destination, agent-config is where things are proven before they get there:

- **entwurf** → integrated harness config, agent integration, backend bridge, MCP injection, verification harnesses — the stable core
- **agent-config** → skills SSOT, real consumer profile, day-to-day operating surface, and the incubator that hardens config before promotion

> The natural end state is a thin skills SSOT plus a test bench: **agent-config quiet means the pipeline is healthy.** See [ROADMAP § purpose shift](ROADMAP.md).

**Why the boundary moved, in the operator's own words:** [§agent-config: 스킬 SSOT와 시험소 — 멀티하네스 이후](https://notes.junghanacs.com/botlog/20260312T174622). That is the 담당자 문서 (resident's note) for this repo — a public, append-only record in the digital garden of how the job here was re-scoped when harness integration went to entwurf and semantic memory went to andenken. It reads as a chronology rather than a spec, which is the point: this README says what is true now, that note says how it got here.

### The bench is self-sufficient

A proving ground that can only install what it already believes in is not a proving ground. This repo's `run.sh` stands up, pins, and tears down the things it evaluates **on its own** — including whole agent runtimes that compete with the stack it currently runs. Nothing about that path routes through entwurf, pi, or any harness under test.

That self-sufficiency is what lets the subject matter widen. The bench started at "does this skill load in five harnesses"; it now asks whether a runtime that writes its own skills beats a human-authored set, whether one sibling with an internal team costs the operator fewer inspection points than three visible ones, and — on the arm being built here rather than installed — whether a Lisp workspace can stand up an RLM loop that a Python REPL currently carries. See [§ Agent Runtime Bench](#agent-runtime-bench). The rule that makes those answers worth anything is boring and strict: **the subject is version-pinned and installed small**, so a re-run means the same thing twice.

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

2. **Shared skill set** — the same capabilities (search notes, read bibliography, check git history, write to journal) available identically whether you're in pi, Claude Code, Codex, Antigravity, Copilot CLI, Kiro, or OpenClaw. One rail is held out on purpose: OMP gets no skills from here, because it is the subject of a measurement (below), and a subject you have already furnished is no longer a subject.

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
| **Antigravity CLI (`agy`)** | repo-managed settings + skills | full skill set | `~/.gemini/antigravity-cli/skills` from SSOT; `settings.json` + `mcp_config.json` are entwurf-owned. Native-push citizen (`entwurf_register_native`) — no mailbox, replies inject into the live conversation |
| **Copilot CLI** | skill surface only from this repo | full skill set | `~/.copilot/skills` → `skills/` (directory symlink). `settings.json` / birth plugin / statusLine are entwurf-owned (`install-copilot-bridge`, `install-copilot-statusline`). No MCP doorbell on this rail yet |
| **Kiro CLI** (optional) | skill surface only from this repo | full skill set when installed | `~/.kiro/skills` → `skills/` when `kiro-cli` is on `PATH`. Kiro is intentionally not an entwurf citizen; its settings, agents, and sessions remain Kiro-owned. |
| **OMP** (`omp`, oh-my-pi) | none from this repo | **deliberately none** | The fifth garden backend, admitted by entwurf 0.16.0 (2026-08-31) as a self-fetch citizen. Everything on this rail is entwurf-owned (`install-omp-bridge` / `install-omp-receive` / `install-omp-config`); this repo wires **nothing** — there is no `omp` branch in `run.sh` and no `~/.omp/skills` (measured on oracle, 2026-09-04). That absence is the experiment, not a gap: see [§ Agent Runtime Bench](#agent-runtime-bench) and [OMP.md](OMP.md) |
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
| `entwurf_v2` / `entwurf_peers` / `entwurf_self` / `entwurf_inbox_read` / `entwurf_fresh_call` / `entwurf_resume_call` / `entwurf_register_native` | `home/AGENTS.md`, operational use, skills like `entwurf-peek` |
| skill plugin injection | `run.sh setup` builds this repo's local plugin root and points settings at it |
| install / version pin | **entwurf's own `./run.sh`** — this repo pins nothing on its behalf |

So when `entwurf` changes, this is the first consumer that should stay green.

**Six rails, one address layer (entwurf 0.17.2).** The citizen set is no longer Claude-plus-others: Claude Code, Copilot CLI and **OMP** are mailbox-backed self-fetch citizens, Antigravity is a native-push citizen with no mailbox at all, Codex has a verified delivery probe but no managed install lane yet, and pi supplies the control sockets. `entwurf_fresh_call` opens a new visible sibling on `pi` / `claude-code` / `copilot` / `omp`; `entwurf_resume_call` reopens a dormant **pi** citizen under its own garden id without running a turn. A dormant citizen on any other rail is honestly unreachable rather than silently resumed in the background — the hidden-resume path was withdrawn under entwurf's visible-first rule, and that refusal is a feature this repo relies on.

The seven tools above are what this session's MCP schema actually exposes (read 2026-09-04); the bridge surface is the **v2** one. The v1 trio (`entwurf` / `entwurf_resume` / `entwurf_send`) was removed in a hard cut (entwurf `CHANGELOG.md` #50) and no longer exists anywhere — a doc row naming those tools is stale, not a fallback. Note also that `session_search` / `knowledge_search` never came from this bridge: they are andenken's pi-native `registerTool` surface.

There is deliberately **no release-pin row** here. This repo does not carry an entwurf version constant, an install spec, or a tracking ref — `setup_repos` clones the source for dogfooding and stops there. It does not even declare entwurf as a pi package any more: entwurf's own `./run.sh install` registers it as a user-scope citizen in `~/.pi/agent/settings.json`, and `remove-user-scope` is the inverse. Install, auth, and version selection belong to that side, because a consumer that pins its own copy weakens the release gate it is supposed to exercise.

Spec, verification harnesses, and the sync/async contract remain in [entwurf `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/entwurf/blob/main/AGENTS.md).

### Claude Code as Native Pi Surface

When entwurf isn't the path (operator chooses native Claude Code, or the 2026-06-15 Anthropic billing shift puts more sessions on direct Claude Code), `claude/settings.fragment.json` (workstation) and `claude/settings.server.json` (server) keep the native session as close to entwurf's ACP overlay as possible.

`~/.claude/settings.json` is **co-owned** with entwurf's meta-bridge installer (keysets *intended* to be disjoint — see the warning below). On workstations `setup` therefore **merges** the agent-config keyset (`settings.fragment.json`) into the live file instead of symlinking it — a symlink is whole-file ownership and the next writer's atomic rename would silently clobber the other side. agent-config owns hooks / language / 개인취향 toggles / `enabledPlugins.*@claude-plugins-official` / **`permissions.defaultMode`**; entwurf owns `permissions.allow/deny` / `statusLine` / B-lite single-driver scalars / meta wiring (`enabledPlugins.entwurf-meta-receive`, `extraKnownMarketplaces`). The `permissions` object is split down the middle and stays disjoint: the fragment carries `defaultMode` alone and jq's recursive object merge leaves entwurf's `allow`/`deny` arrays untouched. The SSOT for entwurf's side is `entwurf.install-state.json`, and entwurf ships the preventive check: `./run.sh check-keyset-overlap <fragment>` from the entwurf repo names every colliding key. Server devices take the same keyset-merge path (`run.sh` merges `settings.server.json` into the live file — it is **not** a symlink), and they do carry a meta-bridge: oracle's install-state owns 17 settings keys plus `mcpServers.entwurf-bridge` in `~/.claude.json` (measured 2026-09-01 — `python3 scripts/meta-bridge-state.py check` from the entwurf repo).

**The keyset is disjoint again (2026-09-01).** `check-keyset-overlap` went 2 → 0 for `settings.fragment.json` and 18 → 2 for `settings.server.json`. The server file had carried entwurf's whole keyset from the pre-merge single-owner era — `statusLine`, `extraKnownMarketplaces.meta-bridge-local`, `enabledPlugins.entwurf-meta-receive`, `cleanupPeriodDays` and the B-lite scalars — and two of those copies had gone stale: the `statusLine.command` still named `~/.claude/statusline.sh` and the marketplace `.assembled` path still named `~/repos/gh/entwurf/pi/meta-bridge/`, both locations entwurf has since moved from (live values: `entwurf/scripts/meta-bridge-statusline.sh`, `~/.local/share/entwurf/meta-bridge/`). EXISTING-WINS meant the stale copies never reached the live file, which is exactly the silent shape [`5b9c75c`](https://github.com/junghan0611/agent-config/commit/5b9c75c) called a drift bomb. The remaining 2 collisions are `permissions.allow`/`deny`, **kept on purpose**: entwurf's ledger records one added item there (`allow: ["mcp__entwurf-bridge__*"]`, `deny: []`), so the arrays are substantially ours, and under `permissions.defaultMode: "bypassPermissions"` they are inert anyway. `permissions.defaultMode` is **not** among the collisions — the pin below is clean. Run the guard before adding any key to either file.

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

43 skills (counted 2026-09-04). Categories: data access (denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query, timeline), agent memory (session-recap, dictcli, semantic-memory, memory-sync, improve-agent), writing (botlog, botment, agenda, punchout, autholog-mend), communication (slack-latest, jiracli, telegram), code surface (forge — v1.5, multi-profile), work workbench (plane), web/media (brave-search, exa-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe), release hygiene (commit, tag-release, next-handoff), reasoning (logickocli), entwurf (entwurf-peek), harness wrappers (command-recall, command-glgimage — for harnesses with no custom-command surface), tools (emacs, tmux, diskspace, cloudflare, quota, butlercli).

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

Adding a new skill here still works the same way: drop it into `agent-config/skills/<name>/SKILL.md` and re-run `./run.sh setup`. The same SSOT fans out to pi, Claude Code, the entwurf Claude plugin, Codex, Antigravity, and Copilot when its runtime/home is present. When `kiro-cli` is installed, it also links Kiro's personal root at `~/.kiro/skills/`.

> `~/.gemini/` is Antigravity's home, not Gemini CLI's. The standalone `gemini` binary is gone from this machine and its legacy surface (`~/.gemini/settings.json`, `~/.gemini/skills/`) was retired 2026-08-06 — but `~/.gemini/antigravity-cli/` and `~/.gemini/config/` are live and must survive any cleanup of that directory.

Codex direct mode also uses this repo-managed surface for MCP now: `codex/config.toml` carries a `entwurf-bridge` stdio registration, so direct Codex sessions can see the same bridge family instead of remaining the one MCP-empty harness.

For Antigravity direct mode, `run.sh setup` wires only the skills path. Both `settings.json` and `mcp_config.json` are **not** wired from here — `entwurf`'s `install-agy-bridge` / `install-agy-statusline` adapters own them: they adopt or create a regular file and record the bare `entwurf-bridge` / `entwurf-agy-statusline` stable bins. A symlink from this repo makes those adapters REFUSE.

The same split now covers Claude Code's own status line. `claude/statusline.sh` and its `~/.claude/statusline.sh` symlink were removed 2026-09-01: `statusLine` is an entwurf-owned key (`meta-bridge-statusline.sh`), the repo copy was unreferenced once that key left the fragments, and a stale script sitting on the path entwurf had moved off is how the last drift bomb was built. Do not re-add it — open the entwurf repo to change how the status line renders.

The same ownership split applies to Copilot CLI: `run.sh setup` links only `~/.copilot/skills` (directory symlink to SSOT). `~/.copilot/settings.json`, the birth plugin marketplace unit, and statusLine stay with entwurf (`install-copilot-bridge` / `install-copilot-statusline`). Do not symlink Copilot settings from this repo.

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
- Symlink Codex / Antigravity / Copilot skill surfaces (`~/.codex/config.toml` + skills, `~/.gemini/antigravity-cli/skills`, `~/.copilot/skills`) plus Claude Code commands. When installed, Kiro gets only `~/.kiro/skills`; its settings, agents, and sessions stay Kiro-owned. Antigravity/Copilot settings are **not** linked here (entwurf-owned). `~/.claude/settings.json` is **merged** (keyset, never symlinked) — co-owned with entwurf meta-bridge; both workstation (`settings.fragment.json`) and server (`settings.server.json`) merge the same way, and `pi/settings.json` merges too (co-owned with the pi runtime)
- Symlink `~/.local/bin` PATH binaries
- pnpm install for extensions and skills
- Hand off entwurf validation (typecheck, MCP, dual-backend smoke, persisted-bootstrap continuity, cancel-cleanup) to entwurf's own `run.sh`

What `setup` deliberately does **not** do: install entwurf (that is entwurf's own `./run.sh setup` — see [§ entwurf Surface Reference](#entwurf-surface-reference)) and install the runtime under evaluation (`./run.sh setup:hermes`, [§ Agent Runtime Bench](#agent-runtime-bench)). Both are omissions with a reason, not gaps to fill.

## Agent Runtime Bench

Some questions cannot be answered by reading a project's README. *Does a runtime that generates its own skills from experience beat a human-authored skill set?* You only find out by standing both up on the same machine, giving them the same repeated task, and looking at what each wrote down afterwards.

Three subjects sit on this bench, and they ask three different questions:

| Subject | Question | Standing |
|---|---|---|
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Does a self-learning runtime out-write a hand-authored skill set? | candidate, pinned, not adopted |
| [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) | Does one sibling with an internal team cost the operator fewer inspection hops? | **admitted as a sibling** (entwurf 0.16.0); the operator question is still open |
| [prime-agent](https://github.com/junghan0611/prime-agent) (fork) | Can a Lisp workspace stand up the RLM loop a Python REPL carries today? | **built here**, not installed — Clojure is already the default kernel |


This comparison belongs here, not in entwurf. **entwurf guarantees its own garden-id,
delivery, and visible-lifecycle logic and compares today's code with yesterday's; it does
not rank other harnesses.** agent-config is the operator-side proving ground, so it asks
whether an external runtime actually reduces GLG's inspection points without weakening
identity, memory, or alignment. This is not a tournament and it is not a reason to grow
entwurf into a planner.

The first subject is [Hermes Agent](https://github.com/NousResearch/hermes-agent) — an independent runtime with its own gateway, state tree, cron, memory and skill generation. It is a **candidate under evaluation, not adopted infrastructure**: nothing about it is declared in `nixos-config`, and `setup:hermes` is not part of `setup`.

```bash
./run.sh setup:hermes    # pinned tag, minimal closure, explicit call only
```

Two constraints carry the whole thing, and both are one careless edit from being lost:

**Pinned, never fast-forwarded.** `THIRD_PARTY_PACKAGE_REPOS` is the obvious home for the clone, but every entry there is pulled to latest on `setup` and `update`. A subject that moves between runs cannot be re-measured, so hermes is kept out of that map on purpose and `HERMES_TAG` selects the version.

**Installed small, not merely configured small.** Upstream's default build adds 18 optional groups — messaging (Telegram/Discord/Slack), voice, web-search backends. Built that way, "integrations stay off" is a promise about configuration. Built from `.#minimal` they are absent from the closure and cannot be switched on by mistake. The single group added back is `anthropic`, without which `hermes auth add anthropic --type oauth` logs in successfully and only fails later at inference — the auth layer and the SDK are separate, so a successful login proves nothing about reachability.

What that leaves is a runtime that reaches Claude, GPT (`openai-codex` OAuth) and Solar (auto-discovered `UPSTAGE_API_KEY`) while being structurally unable to talk to a messaging platform. State lives in `~/.hermes`; deleting it resets the baseline, and the first run after that is t=0 for anything the runtime claims to have learned.

The comparison target is not another product. It is this repo's own loop — `AGENTS.md` + `skills/` + semantic memory + `botlog`/`NEXT` — and the honest question is whether a machine-written skill trail is more transparent and reproducible than the hand-written one.

The second subject is [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) — a fork of the very harness this repo already runs, tuned as a coding-first surface. It asks a different question than Hermes: not *does it learn better*, but *does one visible sibling with an internal team cost GLG fewer inspection points than routing the same job through two or three visible sibling hops*. The currency is not tokens. It is **the number of boundaries the operator has to personally inspect.**

**That subject has since been admitted as a sibling — and this section used to say the opposite.** entwurf 0.16.0 (2026-08-31) admitted OMP as the **fifth garden backend**: birth hook, an omp-native MCP hand, an addressed-receive extension, and `entwurf_fresh_call` on all three public surfaces. It is live on this host — `omp/18.0.0`, with `entwurf-meta-omp` and `entwurf-receive-omp` installed under `~/.omp/agent/extensions/` and a native `entwurf-bridge` entry in `~/.omp/agent/mcp.json` (measured on oracle, 2026-09-04). The earlier "no citizenship implementation has started" line in [OMP.md](OMP.md) predates that release; the correction is stamped at the top of that file.

Admission did not settle the bench question, and the two must not be confused:

| | Owner | Settled? |
|---|---|---|
| *Is omp addressable as one garden citizen?* | `entwurf` | **Yes** — 0.16.0, one process = one garden id. In-process subagents are not citizens and do not widen the contract |
| *Does routing work through omp reduce GLG's inspection hops?* | `agent-config` | **Open** — the D-axis in [OMP.md](OMP.md) (D1–D5) is still unmeasured |

Three things stay deliberately unwired here while D is open: no `omp` branch in this repo's `run.sh`, no entry in `nixos-config`, and **no skills SSOT injection into `~/.omp`** (verified absent, 2026-09-04). A subject you have already furnished with your own skill set can no longer answer whether it needed one. The provider seal, operator boundary, and reproduce block live in [OMP.md](OMP.md) — omp installs from one pinned upstream command rather than a `run.sh` lane, so the doc is the install SSOT until that changes.

### The third subject is one GLG is building

[prime-agent](https://github.com/junghan0611/prime-agent) is a fork of [PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent), and it is where the bench stops measuring other people's runtimes and grows an arm of its own.

Upstream's core abstraction is the **Recursive Language Model** — context as variables, subagents as function calls, all of it inside a *persistent Python REPL* that survives across turns. This fork replaces that language. `prime-agent-runtime-clj/` stands a **Clojure/SCI workspace on a GraalVM native image** beside the Python one, and since checkpoint `edc3a3e8` (H8) **Clojure is the default kernel with no fallback** — a missing binary raises a teaching error instead of quietly reverting to Python (`PRIME_AGENT_KERNEL_RUNTIME`, branch `feat/clojure-runtime`).

The reason is not language preference. It is what a Lisp workspace makes *legible*:

> Natural language is exploration; Lisp is the public state, the contract, and the form. What the model did has to survive as a form in the workspace, not as a paragraph claiming it did. — the fork's `AGENTS.md`

Which makes the success condition unusual for an agent project: not a benchmark score, but **whether GLG can read the workspace forms and decide the next design from them.** Three rules keep that honest, and they are the same rules this repo's bench runs on:

- **The Python oracle is never deleted.** Two arms have to stand side by side or there is no comparison — only an assertion.
- **Coverage is standing, not procedure.** *"When coverage is there and the possibility is real, the possibility becomes real. Get it wrong and it is just fraud."* (GLG) No claim of performance or advantage is made before the contract coverage exists to back it.
- **A failure is an observation to classify, not a verdict.** A red on the Clojure arm is recorded as `semantics-gap`, `model-fumble`, or `harness-gap` — whichever the receipt supports. A prose-only pass or a Python fallback is not a Lisp success.

Scope boundary, stated once so it is not re-derived: this is an experiment in **computation inside one citizen**. It does not touch entwurf's address, delivery, or receipt layer, and it never promotes a message between siblings into an executable form. Coordination and computation stay apart ([entwurf#88](https://github.com/junghan0611/entwurf/issues/88)). Current position and the open board live in the fork's `NEXT.md` and [issue #1](https://github.com/junghan0611/prime-agent/issues/1).

[YEGGE.md](YEGGE.md) is the lighter observation log. Wheelhouse is neither installed nor a
candidate: it is an occasional external sighting used to separate durable runtime facts
from cockpit fashion. Its current entry records one useful confirmation only — tmux can
own session lifetime while Emacs remains a replaceable projection — and explicitly opens
no implementation lane.

## Session Management — `/new` + recall

The working method is unchanged and simple: when a conversation gets long, start a new one and rebuild context from the memory axes instead of paying a model to re-read and summarize itself.

1. When conversation gets long, `/new` to start fresh
2. Run `memory-sync` / `/memory reindex` explicitly when recent sessions need fresh indexing (no hidden paid auto-indexing)
3. In the new session, recover context with `/recall`

**What changed is that this is a habit, not a config lock — and this section used to claim otherwise.** It was titled *No Compact* and read as though the harness were pinned against compaction. It is not, on any surface the operator runs today:

| Surface | Compaction key | Measured |
|---|---|---|
| `~/.claude/settings.json` | **no compaction key at all** | oracle, 2026-09-04 |
| `~/.pi/agent/settings.json` (live) | `compaction.enabled: true` | oracle, 2026-09-04 |
| `pi/settings.json` (this repo's reference) | **removed 2026-09-04** — was `enabled: false` | this release |

entwurf gave the switch back on 2026-09-03: `autoCompactEnabled` and `env.DISABLE_AUTOCOMPACT` moved from `MANAGED_SETTINGS_SCALARS` to `RETIRED_SETTINGS_SCALARS` (entwurf 0.17.2, #94). Retirement moved **ownership, not state** — nobody's compaction was switched on by that release — and the record carries its own correction: `env.DISABLE_AUTOCOMPACT` was a no-op at Claude Code 2.1.259, so the only key that ever suppressed compaction was `autoCompactEnabled`. The operator declines to declare it either way, and this repo's reference file now says nothing about it either.

Dropping that key was not tidying. Because `merge_settings` is EXISTING-WINS, the `false` never reached a running machine — it only provisioned *fresh* ones with an intention the operator had abandoned, which is precisely the drift shape this repo elsewhere calls a bomb. The reason is kept where the key used to be, as `_no_compaction` in `pi/settings.json`, so nobody re-adds it from memory.

The lesson is worth keeping separately from the setting: **a habit that only works when a config enforces it was never a habit.** `/new` + `/recall` costs ~2K tokens and is chosen every time, which is why removing the lock changed nothing about how sessions are actually run.

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
| [prime-agent](https://github.com/junghan0611/prime-agent) | Runtime (fork) | RLM harness fork whose persistent workspace is Clojure/SCI on GraalVM instead of Python — the bench subject GLG builds rather than installs |

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
