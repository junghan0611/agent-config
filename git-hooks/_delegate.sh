#!/usr/bin/env bash
# Chain to repo-local hook if it exists (husky / lefthook / hand-written).
# Usage: _delegate.sh <hook-name> [args...]
#
# Resolution order:
#   1. <repo>/.git/hooks/<hook-name>     (per-repo classic)
#   2. <repo>/.husky/<hook-name>          (husky)
#   3. <repo>/.lefthook.yml etc.          (skipped — lefthook manages itself)
#
# If none exists, exit 0 (no-op).

set -uo pipefail

HOOK_NAME="${1:-}"
shift || true

[ -z "$HOOK_NAME" ] && { echo "_delegate.sh: hook name required" >&2; exit 2; }

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
GIT_DIR=$(git rev-parse --git-common-dir 2>/dev/null) || GIT_DIR="$REPO_ROOT/.git"

# 1. classic .git/hooks/<name>
LOCAL_HOOK="$GIT_DIR/hooks/$HOOK_NAME"
if [ -x "$LOCAL_HOOK" ]; then
  exec "$LOCAL_HOOK" "$@"
fi

# 2. husky
HUSKY_HOOK="$REPO_ROOT/.husky/$HOOK_NAME"
if [ -x "$HUSKY_HOOK" ]; then
  exec "$HUSKY_HOOK" "$@"
fi

# nothing to delegate
exit 0
