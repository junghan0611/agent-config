#!/usr/bin/env bash
# memory-sync/scripts/sync-sessions.sh — thin wrapper.
# SSOT: ~/repos/gh/andenken/scripts/sync-sessions.sh
# Load API keys for the current sessions track (OpenRouter 8B/4096d). The
# SSOT script still owns provider/dim safety and API0 no-work paths.
if [ -f "$HOME/.env.local" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.env.local"
fi
exec "$HOME/repos/gh/andenken/scripts/sync-sessions.sh" "$@"
