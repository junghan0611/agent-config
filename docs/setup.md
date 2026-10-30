# Setup details and shell helpers

Moved from the root README at `f05f103` (2026-10-30) without rewriting; only links and positional words were adjusted for the new location. The front door is [README.md](../README.md).

## What `./run.sh setup` performs

`./run.sh setup` performs:

- Clone missing tracked repos (`setup` does **not** pull existing repos; use `./run.sh update` for pulls)
- Build native CLI binaries (Go + GraalVM) — **gated**: each Go CLI must pass its sibling repo's test suite and be built from committed sources, or it is not installed. `skills/.provenance.json` records what actually landed; `./run.sh doctor:bins` warns when a live binary drifts from its recorded build, is stale against its source, or was built for another arch
- Link pi extensions, the shared skill set (including `semantic-memory`), themes, keybindings, prompts and the repo-managed OMP task-agent catalog; co-owned settings remain regular files and use the explicit merge paths below (ownership detail: [Claude Code as Native Pi Surface](harness-surfaces.md#claude-code-as-native-pi-surface))
- Run andenken's own `run.sh setup` (build + deps). It is **no longer declared as a pi package here** — agents reach it through the `semantic-memory` skill, which every harness can invoke. Where it is already registered as a pi package, pi additionally gets the `session_search` / `knowledge_search` registerTool; that is a pi-local convenience, not the shared door
- Link Codex / Antigravity / Copilot skill surfaces (`~/.codex/skills`, `~/.gemini/antigravity-cli/skills`, `~/.copilot/skills`) plus Claude Code commands. `~/.codex/config.toml` is materialized as a regular file: agent-config supplies initial defaults, entwurf owns its MCP/env + `thread-title` atoms. When installed, Kiro gets only `~/.kiro/skills`; its settings, agents, and sessions stay Kiro-owned. Antigravity/Copilot settings are **not** linked here (entwurf-owned). `~/.claude/settings.json` is **merged** (keyset, never symlinked) — co-owned with entwurf meta-bridge; both workstation (`settings.fragment.json`) and server (`settings.server.json`) merge the same way, and `pi/settings.json` merges too (co-owned with the pi runtime)
- Symlink `~/.local/bin` PATH binaries
- pnpm install for extensions and skills
- Hand off entwurf validation (typecheck, MCP, dual-backend smoke, persisted-bootstrap continuity, cancel-cleanup) to entwurf's own `run.sh`

What `setup` deliberately does **not** do: install entwurf (that is entwurf's own `./run.sh setup` — see [§ entwurf Surface Reference](entwurf-consumer.md#entwurf-surface-reference)) and install the runtime under evaluation (`./run.sh setup:hermes`, [§ Agent Runtime Bench](runtime-bench.md#agent-runtime-bench)). Both are omissions with a reason, not gaps to fill.

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

# Current model launchers (GLG-supplied mapping, 2026-10-27; see MODELS.md).
# openai-codex/gpt-6.1-terra is listed with 500K context; no inference test here.
pit() { _pi_garden_pi --entwurf-control --emacs-agent-socket server --model openai-codex/gpt-6.1-terra --thinking medium "$@"; }
pis() { _pi_garden_pi --entwurf-control --emacs-agent-socket server --model openai-codex/gpt-6.1-sol --thinking medium "$@"; }
pish() { _pi_garden_pi --entwurf-control --emacs-agent-socket server --model openai-codex/gpt-6.1-sol --thinking high "$@"; }

# pi-durable: env-first BG aggregate + native badge. Current supplier: Entwurf 0.45.0 / Pi 1.4.0 SDK.
# Historical API-0 and installed fixture scopes remain in pi-durable/README.md.
# New session: provider + exact model + task-wide width. Thinking is the model :level suffix.
# Every process names its native module explicitly; put that path in the helper once.
pdt() {
	entwurf pi-durable --provider openai-codex --model gpt-6.1-sol:medium \
		--width task-wide --native-module "$HOME/repos/gh/agent-config/pi-durable/index.mjs" "$@"
}
pds() {
	entwurf pi-durable --provider openai-codex --model gpt-6.1-sol:high \
		--width task-wide --native-module "$HOME/repos/gh/agent-config/pi-durable/index.mjs" "$@"
}
# Reopen this cwd's newest-created saved session. Do not pass fresh-only provider/model/width flags.
pdc() {
	entwurf pi-durable --continue \
		--native-module "$HOME/repos/gh/agent-config/pi-durable/index.mjs"
}
```

These are shell examples, not functions installed by `run.sh setup`. `pdt` also names the module so changing thinking effort does not silently drop the environment policy. `pdc` is cwd-local, **not** a garden-id picker: return to the same repository before reopening. `--continue` accepts `--native-module`, but rejects the fresh-only provider/model/width/bootstrap flags. Neither an extension directory nor a saved session automatically reattaches this module. GLG authorized the local `~/.bashrc.local` **pdc only** to use `index.mjs` on 2026-10-09; other live helpers were not rewritten. In an already-open shell, reload that file (`source ~/.bashrc.local`) before using `pdc`. The earlier host observation was a globally available checkout DEVLINK, not a global npm installation. GLG reported the 0.45.0 installation on 2026-10-27; this documentation preparation does not independently certify the running processes' acquisition source or loaded bytes. Installing/upgrading remains Entwurf's responsibility.

Measured 2026-10-08 on thinkpad: `pdc` reopened the same garden id with the module in the native argv, prior dialogue visible, and all four hidden provider keys absent from the bash child. The older 0.31.0 two-Ctrl+C observation is not a 0.32.0 exit guarantee; exit behavior was not re-measured in this cut. [Reference implementation and limitations](../pi-durable/README.md).
