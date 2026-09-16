#!/usr/bin/env bash
# Request one detached local sessions sync, never a timer or a replica publish.
# The timestamp is a request debounce, not an indexing receipt: the manifest remains
# the authority for what actually reached the index.
set -euo pipefail

COOLDOWN_SECONDS="${MEMORY_SYNC_WARM_COOLDOWN_SECONDS:-600}"
case "$COOLDOWN_SECONDS" in
  ''|*[!0-9]*) echo "memory-sync warm: cooldown must be whole seconds (got $COOLDOWN_SECONDS)" >&2; exit 2 ;;
esac

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$BASE_DIR/sync-sessions.sh"
[ -x "$SYNC_SCRIPT" ] || { echo "memory-sync warm: missing executable $SYNC_SCRIPT" >&2; exit 1; }

RUNTIME_DIR="${XDG_RUNTIME_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/agent-config}"
mkdir -p "$RUNTIME_DIR"
STAMP="$RUNTIME_DIR/session-memory-warm.requested"
LOCK="$RUNTIME_DIR/session-memory-warm.lock"
LOG="$RUNTIME_DIR/session-memory-warm.log"

exec 9>"$LOCK"
if ! flock -n 9; then
  exit 0
fi

now="$(date +%s)"
if [ -f "$STAMP" ]; then
  then="$(stat -c %Y "$STAMP")"
  if [ $((now - then)) -lt "$COOLDOWN_SECONDS" ]; then
    exit 0
  fi
fi

# Stamp before the detach so simultaneous session starts share one request. The
# detached child inherits fd 9, deliberately holding this flock until its sync
# finishes; an in-flight writer therefore absorbs every later warm request.
touch "$STAMP"
nohup "$SYNC_SCRIPT" >>"$LOG" 2>&1 </dev/null &
