# Changelog

## Unreleased

## 0.4.13

* Pinned pi-shell-acp to `v0.4.13` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* Upstream `v0.4.13` formalizes the Claude `skillPlugins` install surface: malformed plugin roots now fail fast at settings parse time, `README` gains a first-class `Custom Skills` section plus a self-contained `pi/skill-plugin-example/`, and the reference-consumer link no longer routes careful readers into agent-config's `~/.pi/agent/claude-plugin/` layout as if it were a bridge contract.
* agent-config follows that ownership correction by lowering its own tone around the local Claude plugin farm: this repo now describes `~/.pi/agent/claude-plugin/` as **our** operating layout built by `run.sh setup`, while upstream pi-shell-acp remains the authority for plugin shape, install guidance, and fail-fast validation.
* Oracle / server-mode consumer path stays the same: bump `PI_SHELL_ACP_VERSION` and run `./run.sh setup`. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) still covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.12

* Pinned pi-shell-acp to `v0.4.12` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* v0.4.12 fixes the **Entwurf registry recovery** regression that surfaced on oracle: `loadEntwurfTargets()` is no longer poisoned by a cached `EntwurfRegistryError` after the first missing/stale-registry failure. Registry caching is now positive-only with `mtime`-based invalidation, so repairing `~/.pi/agent/entwurf-targets.json` takes effect on the next call without restarting the running Gemini/MCP process.
* Upstream install policy for `~/.pi/agent/entwurf-targets.json` is now fail-fast instead of silently preserving drift. A stale regular file or wrong symlink now stops `install` / `setup` with an explicit repair path (`./run.sh setup:links --force` or `PI_ENTWURF_TARGETS_PATH=...`) instead of letting the breakage leak later as a sentinel or live `entwurf` failure.
* `./run.sh setup:links [--force]` now exists upstream as a focused repair path for the target registry. This closes the previous guidance gap where the `EntwurfRegistryError` told operators to run `setup:links` even though that subcommand did not exist on the pi-shell-acp side.
* Consumer-side note: agent-config's own `run.sh` already relinks `~/.pi/agent/entwurf-targets.json` to the installed package registry during setup (commit `d9b518a`). With v0.4.12 upstream, the resident-side relink and the bridge-side fail-fast / recovery semantics now align, so the oracle class of drift should be caught earlier and recover cleanly if repaired in-session.

## 0.4.11

* Pinned pi-shell-acp to `v0.4.11` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* v0.4.11 restores **Gemini capability parity** on the ACP bridge surface: operator skills are visible again (`activate_skill` reopened, `skills.enabled: true`, `skills` passthrough restored), Gemini now advertises the same `mcp_pi-tools-bridge_*` / `mcp_session-bridge_*` callable schema entries as Claude and Codex, and invocation no longer dies at a generic admin-policy deny for bridge tools.
* The earlier "Gemini MCP function-schema advertise asymmetry" framing from 0.4.8 / 0.4.9 is retracted. The gap was not an unavoidable upstream Gemini property — it was overlay-induced on the bridge side (policy + settings + skill closure too tight). This matters on the consumer side because our capability-first docs (`~/AGENTS.md`, skill plugin farm, semantic-memory / entwurf guidance) can again describe Gemini as participating in the same skill/MCP dignity surface as the other ACP backends, with the remaining isolation boundary focused on operator memory/settings rather than tool visibility.
* Upstream verification widened accordingly: `check-bridge` now includes a Gemini line and validates both visibility and real `entwurf_send` invocation, while `check-backends` adds assertions for the reopened skills passthrough and the removal of the decorative `mcp.excluded:["*"]` entry. This closes the earlier evidence gap where Gemini regressions could ship without the standard bridge parity gate catching them.
* Oracle / server-mode consumer path stays the same: bump `PI_SHELL_ACP_VERSION` and run `./run.sh setup`. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) still covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.10

* Pinned pi-shell-acp to `v0.4.10` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* **Gemini curated surface narrowed to `gemini-3.1-pro-preview` only.** `gemini-3-flash-preview` is dropped from the curated ACP-routed entwurf target. 3.1 Pro is the subscription-backed high-quality Gemini ACP route — same path as before (gemini CLI binary as the ACP server), better self-reporting (Pro correctly reports Gemini's MCP asymmetry — MCP servers are not registered as model-visible function-schema entries, model routes through `run_shell_command`). Flash had hallucinated MCP tool visibility in baseline tests; Pro does not. The agent-config-side `skills/summarize/` openrouter route (`openrouter/google/gemini-3-flash-preview`) is unaffected — that's a different surface (cheap long-context summarization via openrouter, not pi-shell-acp ACP).
* **Codex entwurf target narrowed to `gpt-5.4` + `gpt-5.5` only.** Registry drops `gpt-5.2` (deprecated, near-retirement) and `gpt-5.4-mini` on both the native `openai-codex` and ACP-routed `pi-shell-acp` paths. `DEFAULT_ENTWURF_MODEL` upstream moved from `openai-codex/gpt-5.2` to `openai-codex/gpt-5.4`, so callers omitting the model field now land on the current preferred model instead of the deprecated default. This collapses the previous policy/code drift (resident `~/AGENTS.md` had instructed agents to pass `gpt-5.4` explicitly because the upstream default was still `5.2`) — the natural no-model default now matches policy. As a result, the `~/AGENTS.md § Entwurf model operating rule` block (5.4 instruction + 5.2 caution) is removed; the registry + upstream default are now the SSOT. `~/AGENTS.md § Model resolution` (still pointing at `pi/entwurf-targets.json` as SSOT) stays.
* **`/make-release` slash command hardened.** Step 4 release-note extraction switched from a fragile awk range expression to a small Python block keyed by `VERSION="$ARGUMENTS"`. Earlier slash-command release runs intermittently produced empty `--notes-file` output even with a valid `## <version> — YYYY-MM-DD` section; the Python rewrite makes the extraction deterministic. Consumer side (this repo) is unaffected — release process lives in pi-shell-acp's `.pi/prompts/make-release.md`.
* Oracle baseline test (taken right after v0.4.9 receive, validates v0.4.10 surface assumptions): four backends — Sonnet 4.6 / Codex gpt-5.4 / Gemini Flash / Gemini Pro 3.1 — answered the same Q-B0 / Q-B0-CARRIER / Q-L1 / Q-L3 probe. All four correctly identified their backend, native-tool surface, and MCP routing. The L4 carrier `GEMINI_SYSTEM_MD_CANARY_PISHELLACP_V1` appeared only on the Gemini sessions (per design — the canary name itself declares the backend). No `denied by admin policy` false positives on Claude / Codex when probing Gemini-named tools (`read_file` / `list_directory` / `glob` / `grep_search` are absent from those backends' schemas, not policy-blocked). Pro's self-report — "MCP/custom 도구들이 단 하나도 포함되어 있지 않습니다 ... 문서에 적혀 있다고 해서 도구가 존재하는 척(환각)하지 않습니다" — is the live evidence backing the 0.4.8 documented Gemini MCP asymmetry.
* **Known issue (Gemini × NixOS, not closable from agent-config side)**: Gemini's native `read_file` rejects NixOS home-manager symlinks with `Path not in workspace: ... resolves outside the allowed workspace directories`. Cause: home-manager dotfiles (`~/.bashrc`, `~/.gnupg/*.conf`, `~/.gtkrc-2.0`, most `~/.config/*`, etc. — 15+ at depth 2 alone) are symlinks to `/nix/store/...`, and Gemini CLI's path validator resolves the symlink before checking the workspace allowlist. Affects every NixOS device. Workaround: route through `run_shell_command "cat <path>"` instead of `read_file` (no symlink resolution). Fix candidate lives upstream in pi-shell-acp's gemini overlay (potentially adding `/nix/store/` to allowed dirs or disabling follow-symlinks); tracked separately, not blocking this release.
* Oracle / server-mode consumer path: `PI_SHELL_ACP_VERSION` bump + `./run.sh setup` continues to be sufficient. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.9

* Pinned pi-shell-acp to `v0.4.9` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* v0.4.9 closes the **L5 — Memory containment** layer on the Gemini backend, the sixth and final channel of the surface-isolation matrix that 0.4.8 opened. pi-shell-acp is the canonical memory authority on the pi side (semantic-memory + Denote llmlog); no backend may run a parallel memory layer that survives across sessions. Claude (`CLAUDE_CONFIG_DIR` + `disallowedTools` + `skillPlugins:[]`) and Codex (`-c memories.{generate,use}_memories=false` + `history.persistence="none"` + `features.memories=false`) already enforce this — Gemini now matches.
  - `experimental.memoryV2:false` + `experimental.autoMemory:false` pinned in overlay `settings.json` (defense in depth — `GEMINI_SYSTEM_MD` already replaces the prompt body, but the explicit pin holds even if the override path ever breaks). Overlay closure widens 14 → 16 keys.
  - `<configDir>/{tmp,history,projects}/` swept at every spawn — any `tmp/<slug>/memory/MEMORY.md`, autoMemory inbox `.patch`, command history, or per-project content from a previous gemini session does not carry. Constant renamed `GEMINI_OVERLAY_EMPTY_DIRS` → `GEMINI_OVERLAY_SWEPT_DIRS` to reflect the stronger contract. Operator's native `~/.gemini/projects.json` continues to never flow through.
  - Root-level `<configDir>/GEMINI.md` and `<configDir>/MEMORY.md` swept by the existing stale-entry cleanup. Within-session `write_file` calls can still create them, but they cannot survive into the next session.
  - `check-backends` 124 → 134 assertions (memoryV2 / autoMemory keys + L5 sweep behaviour for pre-seeded files + engraving substitution defuse).
* **Engraving substitution defuse (gemini)**: recent gemini-cli walks the `GEMINI_SYSTEM_MD` override and rewrites `${AgentSkills}`, `${SubAgents}`, `${AvailableTools}`, and `${<toolName>_ToolName}` with runtime values. Same engravings land verbatim on Claude (`_meta.systemPrompt`) and Codex (`-c developer_instructions`), so any `${...}` literal inside an engraving (e.g. a shell example) was silently mutating Gemini-only. `defuseGeminiSubstitutions` slides the `$` and `{` apart with a zero-width space (U+200B) before writing `system.md` — every substitution regex misses, model still reads the same visual string. Restores cross-backend invariant that the same engraving is not interpolated differently per backend.
* **Backend dependency bumps**:
  - `@agentclientprotocol/claude-agent-acp` 0.31.4 → 0.32.0 (SDK pin stays at `0.21.0`, transitive `@anthropic-ai/claude-agent-sdk` 0.2.121 → 0.2.126). `_meta._claude/origin` may now appear on `usage_update` notifications for task-notification followups (autonomous work triggered by a system message rather than the user prompt) — bridge passes through unchanged.
  - `@zed-industries/codex-acp` 0.12.0 → 0.13.0 (Codex 0.124 → 0.128.0). codex-acp internals shifted to async `AuthManager` + `EnvironmentManager`; new `ThreadGoalUpdated` event is emitted as plain agent text. Mode IDs (`read-only` / `auto` / `full-access`) and `-c features.<key>=false` gating surface unchanged.
  - devDeps `@mariozechner/pi-{ai,coding-agent,tui}` 0.70.2 → 0.73.0. pi-mono 0.71.0 removed the built-in `gemini-cli` *provider*, not the `google` API source — `getModels("google")` still ships `gemini-3-flash-preview`, so `check-models` assertions hold.
* **Release process upgrade**: pi-shell-acp moved to a self-contained `/make-release <version>` slash command at `pi-shell-acp/.pi/prompts/make-release.md`, replacing the old `scripts/release.sh` + `--notes-from-tag` pattern that produced empty release bodies for v0.4.7 / v0.4.6 / v0.4.1 / v0.3.x. New flow: pre-flight gates (argument shape, working tree clean, tag-not-exist local+remote, CHANGELOG section present, package.json version match, `pnpm check`, gh auth target consistency, `git push --dry-run`) → tag → push → `pi:release:<repo>` agenda stamp pointing at `releases/tag/v<version>` → Python-based CHANGELOG section extraction → `gh release create --title "v<version>"` (title is fixed; theme lives in body's first H3) → `gh release view` verify → Google Chat notify → `/tmp` cleanup. Each bash block re-derives its variables (slash command shells are not guaranteed to share state). Consumer side (this repo) is unaffected — release process lives in pi-shell-acp.
* Oracle / server-mode consumer path: bumping `PI_SHELL_ACP_VERSION` and running `./run.sh setup` is sufficient. `setup_npm()` reads installed `package.json#version` and force-upgrades on drift, with the `git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install` fallback if `pi install` reports success without refreshing the working tree.

## 0.4.8

* Pinned pi-shell-acp to `v0.4.8` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`). 0.4.7 is folded into this bump — its single feature (`--emacs-agent-socket` / `PI_EMACS_AGENT_SOCKET`) was already adopted on the resident side, so agent-config jumps `0.4.6 → 0.4.8`.
* v0.4.8 adds **Gemini CLI (`gemini --acp`) as a third ACP backend.** The bridge picks Gemini back up after pi-mono v0.71.0 dropped its built-in Google provider. Operators can now set `backend: "gemini"` in `piShellAcpProvider` or pick `pi-shell-acp/gemini-3-flash-preview` (curated, registered in entwurf-targets with `explicitOnly: true`). Default agent-config settings stay on Claude — Gemini is opt-in per session.
* **Gemini surface isolation closed on five channels** (2026-05-03 baseline): native system body via `GEMINI_SYSTEM_MD = <overlay-home>/.gemini/system.md`, operator memory path via `GEMINI_CLI_HOME`, tool surface via `tools.core` 7-name allow + `--admin-policy` deny-all (defense in depth at registry and policy layers), `GEMINI.md` hierarchical discovery suppressed via sentinel `context.fileName` + `memoryBoundaryMarkers:[]`, MCP whitelist via `mcp.allowed: [pi-tools-bridge, session-bridge]` + `excluded:["*"]`. Carrier appends `GEMINI_SYSTEM_MD_CANARY_PISHELLACP_V1` for baseline operator verification.
* **Documented Gemini asymmetry**: Gemini ACP accepts MCP servers via `mcpServers` but does **not** register them as model-visible function-schema entries the way Claude and Codex do — the model routes MCP calls through `run_shell_command` instead. Operators on the gemini backend should not expect entwurf / semantic-memory tools to appear as `mcp__<server>__<tool>` function entries. This is a Gemini ACP surface property, not closable from the bridge overlay.
* 0.4.7 (folded in) added `--emacs-agent-socket <name>` and `PI_EMACS_AGENT_SOCKET` env propagation, plus folding the socket into the bridge config signature so terminal (`server`) and Emacs-internal (`pi`) sockets don't accidentally cross-contaminate child processes. agent-config's `ec()` helper already honors `PI_EMACS_AGENT_SOCKET` (commit `c743c9d`), so this only changes the upstream surface, not resident behaviour.
* Mitsein cross-reference cleanup landed on the bridge side too: pi-shell-acp/AGENTS.md's "Naming pair" line dropped the now-stale `agent-config/home/MITSEIN.md` link in favor of `defined in the resident's own knowledge base (cwd-scoped, not a global persona)`. The resident-side residency stamp moved to `~/sync/org/MITSEIN.md` in the Mitsein refactor (`f83a48f` / `7965c79` / `d53b37b`). Both sides now agree the persona is cwd-scoped, not global.
* Oracle / server-mode consumer path: bumping `PI_SHELL_ACP_VERSION` and running `./run.sh setup` is sufficient. `setup_npm()` reads installed `package.json#version`, force-upgrades on drift, and falls back to `git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install` if `pi install` reports success but the working tree didn't refresh. No manual intervention needed on oracle.

## 0.4.6

* Pinned pi-shell-acp to `v0.4.6` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.6 restores Hard Rule #2 (`resume > load > new`) on the resume path. Since SDK 0.20.0 promoted `resumeSession` out of the `unstable_*` namespace, every `unstable_resumeSession` call had been throwing `TypeError`, getting silently caught by the bootstrap fallback, and routing every session to `loadSession` instead — capability check still advertised resume but Hard Rule #2 was quietly violated. Consumer impact: long-running entwurf sessions (especially openclaw-style) now skip the full transcript replay that `loadSession` triggers and that the bridge discards under Hard Rule #8, so resume cost no longer scales with session length.
* SDK pins move forward: `@agentclientprotocol/claude-agent-acp` 0.31.0 → 0.31.4, `@agentclientprotocol/sdk` 0.20.0 → 0.21.0 (with `@anthropic-ai/claude-agent-sdk` 0.2.121 transitive). No consumer surface change — same MCP/tool shape.
* Internal hardening at the bridge that doesn't affect our settings but is worth recording for next-class-of-bug prevention: new static gate `./run.sh check-sdk-surface` (and `pnpm check-sdk-surface`) requires every `(connection as any)` cast in `acp-bridge.ts` to carry an `SDK_CAST_OK` (permanent gap) or `SDK_CAST_DEBT` (tracked) marker, wired into `pnpm check` and the husky pre-commit hook. Root tsconfig also flipped `strict: false → true`, surfacing 23 implicit-any executor callbacks plus one real `RpcResponse | null` narrowing bug that was being hidden. AGENTS.md gets Hard Rule #10 ("SDK surface calls must use the typed connection") so the fix is structural rather than vigilance-based.
* Verification still owed on this pin (not blocking the release): `./run.sh smoke-claude /path/to/project` should show `[pi-shell-acp:bootstrap] path=resume` in stderr where 0.4.5 was emitting `path=load`. Recording here so the evidence-level check doesn't get lost.

## 0.4.5

* Pinned pi-shell-acp to `v0.4.5` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.5 moves the heavy pi / `~/AGENTS.md` / `cwd/AGENTS.md` context off the subscription-sensitive system-prompt carrier and into a one-shot first-user augment, so ACP-backed Claude and Codex sessions regain full resident context without triggering Claude Code's large-custom-system-prompt billing path.
* Entwurf-spawned ACP sessions now keep the home context while de-duplicating project AGENTS that already arrived through `<project-context ...>` injection; consumer-side implication: our 담당자 pattern stays intact without repeating repo context.
* Capability/tool-name hygiene is clearer upstream: agents are told to treat the callable schema as the source of truth and not infer concrete tool names from AGENTS prose alone. This aligns with agent-config's capability-first docs introduced in this release.
* `prompts/engraving.md` is now an optional personal surface rather than the place where bridge operating context must fit; pi-shell-acp carries the bridge narrative separately.

## 0.4.1

* Pinned pi-shell-acp to `v0.4.1` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.1 closes a 0.3.0-era release blocker: `pi-extensions/entwurf.ts` and `pi-extensions/entwurf-control.ts` were never wired into `package.json`'s `pi.extensions` array, so `--entwurf-control` and `/entwurf*` slash commands silently failed to load and the MCP bridge's expected sockets at `~/.pi/entwurf-control/` were never created. Both extensions are now registered. Effect for us: human-facing `/entwurf-sessions` / `/entwurf-send` slash commands actually work; the `mcp__pi-tools-bridge__entwurf_*` tools are unaffected (those route through the spawn path, not the control extension).
* New consumer-visible surface: `/entwurf-sessions` enriches each row with `cwd` / `model` / `idle` via a new `get_info` RPC and assigns `[N]` indices for direct addressing; `/entwurf-send <index|sessionId> <message>` is the new human-operator surface (defaults to `follow_up`, auto-attaches `<sender_info>`). The previously dead `~/.pi/entwurf-control/` directory now self-cleans stale `.sock` entries and pre-0.4.1 `.alias` symlinks on each control-server startup.
* **Breaking — entwurf-control surface only.** The `<sessionName>.alias` symlink layer is removed from pi-shell-acp's entwurf-control. Consumer impact: `mcp__pi-tools-bridge__entwurf_send`'s parameter renamed from `target` → `sessionId`; `entwurf_peers` no longer returns `name` / `aliases`; `--entwurf-session <alias>` only accepts a sessionId now. Reviewed agent-config's surface — `home/AGENTS.md` and `home/MITSEIN.md` describe these tools at intent level and don't reference the dropped fields, so no doc changes needed. Independent of agent-config's own `pi-extensions/control.ts` under `~/.pi/session-control/`, which intentionally retains its alias surface (different cost/benefit, no polling timer); the `mcp/session-bridge/`'s `SESSION_NAME` alias also remains as the stable identity surface on that side.
* Identity-verification note: a four-case interview (OpenRouter Sonnet, pi-shell-acp Sonnet, native Codex, pi-shell-acp Codex) was captured against 0.4.0 + this patch. Both pi-shell-acp cases recognize the bridge surface and enumerate `mcp__pi-tools-bridge__*` / `mcp__session-bridge__*` correctly; the two non-bridge cases honestly report the entwurf MCP as documented but absent from their schema. Transcripts move to `BASELINE.md` upstream.

## 0.4.0

* Pinned pi-shell-acp to `v0.4.0` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.0 brings PI-native identity carriers to both backends while isolating operator state with whitelist overlays: Claude now receives the engraving via full system-prompt replacement, Codex via `developer_instructions`, and both backends run behind pi-owned config overlays instead of inheriting the operator's broader config tree.
* Important isolation additions from the upstream release: codex thread/memory SQLite state is pinned inside the overlay via `CODEX_SQLITE_HOME`, compaction opt-in no longer disables identity isolation, and codex memory/history surfaces are further constrained by default.

## 0.3.1

* Pinned pi-shell-acp to `v0.3.1`. v0.3.1 emits a startup warning when `codexDisabledFeatures: []` is detected in settings, since the empty array is a fail-open opt-out (documented at `acp-bridge.ts` as "opt fully out of bridge feature gating") — not the no-op our 0.2.2/0.3.0 changelog entries claimed.
* Removed `codexDisabledFeatures: []` from `pi/settings.json` and `pi/settings.server.json`. With the key absent, pi-shell-acp's nullish-guard applies `DEFAULT_CODEX_DISABLED_FEATURES` (image_generation, tool_suggest, tool_search, multi_agent, apps) — the fail-closed baseline that aligns the codex tool surface with pi's advertised tools.
* Correction to prior entries: 0.2.2 and 0.3.0 described the `[]` knob as "redundant defense-in-depth, harmless". That was wrong. `parseStringArray` returns `undefined` for missing keys, so `merged.codexDisabledFeatures ?? [...DEFAULT]` only falls through on `undefined`/`null`; an explicit `[]` flips the resolution from fail-closed (5 features disabled) to fail-open (all features active). The original 0.2.1 spread-crash workaround should have been deleted in 0.2.2, not retained.

## 0.3.0

* Pinned pi-shell-acp to `v0.3.0` (consumer install path in `run.sh` + `pi/settings.server.json` packages line). v0.3.0 ships two install-automation fixes that close the oracle bootstrap fault from 0.2.x:
  * `CLAUDE_CODE_EXECUTABLE` is now injected into the claude child env automatically. Reason: `claude-agent-acp@0.31.0` (`acp-agent.js:1298`) ignores `_meta.claudeCode.options.pathToClaudeCodeExecutable` and only reads the env var, so on hosts where pi's wrapper sets `NODE_PATH` to a global pnpm store containing both `claude-agent-sdk-linux-arm64` and `claude-agent-sdk-linux-arm64-musl`, the SDK's musl-first auto-detect resolved a non-existent musl binary and surfaced as "Internal error" with no useful tail (oracle, glibc/aarch64). Manual `export CLAUDE_CODE_EXECUTABLE=...` workaround is no longer required.
  * `~/.pi/agent/entwurf-targets.json` symlink is created idempotently by pi-shell-acp's `install_local_package`. Operator overrides are preserved.
* `pi/settings.server.json:18` `codexDisabledFeatures: []` knob retained as defense-in-depth (redundant since 0.2.2 fixed the spread crash; harmless). **— Incorrect, see 0.3.1 correction.**

## 0.2.2

* Pinned pi-shell-acp to `v0.2.2` (consumer install path in `run.sh`). v0.2.2 fixes the universal `codexDisabledFeatures` spread crash that broke fresh consumer installs on 0.2.1 — the bridge now nullish-guards the field in both launch + session reuse paths, so the temporary `codexDisabledFeatures: []` knob in `pi/settings.json` is now redundant (kept as defense-in-depth).

## 0.2.1

* Pinned pi-shell-acp to `v0.2.1` (consumer install + run.sh `pi install` command). v0.2.1 fixes the `husky: command not found` error during `npm install --omit=dev` so server-mode (`pi install git:...`) works on fresh machines.
* Removed model tables from `home/AGENTS.md` and `home/MITSEIN.md`. pi-shell-acp's [`pi/entwurf-targets.json`](https://github.com/junghan0611/pi-shell-acp/blob/main/pi/entwurf-targets.json) is the SSOT registry — bare model IDs auto-route via the registry (native preferred, ACP requires explicit provider). Doc-side tables drifted; the registry is canonical.

## 0.2.0

* Cut docs to align as the reference consumer of `pi-shell-acp` (companion repo).
* Renamed `home/ENTWURF.md` → `home/MITSEIN.md` to disambiguate from pi-shell-acp's `entwurf` mechanism. The resident working-companion persona is now **Mitsein** (Heidegger: "함께 있음", being-with); **Entwurf** (기투, projection-of-self) stays in pi-shell-acp as the delegation mechanism Mitsein calls. `run.sh setup` retires the legacy `~/ENTWURF.md` symlink automatically.
* Updated `home/AGENTS.md`: tool surface now `entwurf` / `entwurf_resume` / `entwurf_send` / `entwurf_peers` (was `delegate*`); default model `pi-shell-acp/claude-opus-4-7`; `repos/gh` list refreshed (added `pi-shell-acp`, `geworfen`, `legoagent-config`, `cos`, `minimal-iot-core`, `abductcli`).
* Removed migrated surface artifacts: `mcp/pi-tools-bridge/dist/`, `mcp/session-bridge/dist/` (SSOT now lives in pi-shell-acp).
* Removed `deprecated/` archive (apps-script experiments, 2025 exploratory notes, legacy `bin/` scripts).
* Slimmed `README.md` to a consumer-facing intro (308 → ~210 lines); pi-shell-acp now owns ACP / skill-plugin / engraving / entwurf specs.
* Added `/boom` command — capture crashed pi-shell-acp sessions into `.agent-reports/` for later triage.
* Added release-hygiene skills: `commit`, `update-changelog`.
* Wired skill plugin farm for pi-shell-acp's SDK isolation mode (`~/.pi/agent/claude-plugin/`).
* Wired `session-bridge` MCP server in `pi/settings.json` alongside `pi-tools-bridge` (matches pi-shell-acp 0.2.0's bundled-server set).
* Hardened `run.sh setup` for fresh consumer installs (Oracle, etc.):
  * Preflight: Node ≥ 22.6, `pi` on PATH, `~/.current-device`, Claude auth.
  * Legacy cleanup: removes pre-migration `extensions/{delegate.ts,lib,semantic-memory}` and `delegate-targets.json` symlinks.
  * Light verification: runs pi-shell-acp's `check-mcp` after install (deterministic, no auth).
  * Stale detection: warns when project-local `.pi/settings.json` references the removed `claude-agent-sdk-pi` provider.
* Switched default pi provider/model to `pi-shell-acp/claude-opus-4-7`.
* Dropped `permissions.defaultMode: "auto"` from `claude/settings.json` — pi-shell-acp's `CLAUDE_CONFIG_DIR` overlay pins `"default"`.
* Migrated install path from npm to pnpm with frozen lockfile; trimmed `setup` to install-only and split `update` for explicit pulls.
* Dropped `effortLevel: xhigh` override on server settings.
* Statusline: read `context_window` directly (no more 200K heuristic), shorten `$HOME` → `~`, drop the always-`default` `output_style` segment.

### Migrated to pi-shell-acp

The Entwurf Orchestration surface (delegate/resume, target registry, identity preservation, `pi-tools-bridge`, `session-bridge`) moved to [pi-shell-acp](https://github.com/junghan0611/pi-shell-acp). agent-config now consumes it via `pi/settings.json`'s `piShellAcpProvider.mcpServers`.

## 0.1.0

* dictcli/emacs skill polish: rewrote dictcli `SKILL.md` to LSP pattern (140 → 77 lines), corrected `lookup` → `graph` command names, added `agent-org-agenda-todos` API to emacs skill.
* `run.sh`: dictcli build failure surfaced (`|| true` → `if !` pattern); cache validation guard added.
* dictcli upstream: cache validate gate, NixOS patchelf skip, reproducible builds across local + oracle.
* pi 0.67.2 compatibility: `control.ts` migrated to `session_start + event.reason` (replaces removed `session_switch`/`session_fork`); `context.ts` migrated `SlashCommandInfo.path` → `sourceInfo.path`.
* Verified delegate sync/async on GPT-5.4 baseline.
