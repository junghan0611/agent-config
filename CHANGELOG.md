# Changelog

## Unreleased

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
