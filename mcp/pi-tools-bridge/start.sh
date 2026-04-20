#!/usr/bin/env bash
# pi-tools-bridge launcher.
#
# Loads an env file so downstream CLIs (andenken) find GEMINI_API_KEY /
# ANDENKEN_PROVIDER / etc.  Override the env file with PI_TOOLS_BRIDGE_ENV_FILE.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${PI_TOOLS_BRIDGE_ENV_FILE:-$HOME/.env.local}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

exec node "$HERE/dist/mcp/pi-tools-bridge/src/index.js"
