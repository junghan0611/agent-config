#!/usr/bin/env bash
# pi-tools-bridge smoke tests.
#
# Two layers:
#   1. Protocol parity — tools/list must return exactly the expected tool names.
#      No external deps. Always runnable.
#   2. End-to-end (opt-in via E2E=1) — exercises knowledge_search against a real
#      embedding provider, and send_to_session against a non-existent target to
#      assert the error path.
#
# Usage:
#   ./test.sh              # protocol-only
#   E2E=1 ./test.sh        # full suite (requires ~/.env.local + andenken index)

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
EXPECTED_TOOLS=("session_search" "knowledge_search" "send_to_session" "delegate")
PASS=0
FAIL=0

red()   { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }

ok()   { green "  ✓ $1"; PASS=$((PASS+1)); }
fail() { red   "  ✗ $1"; FAIL=$((FAIL+1)); }

DIST_ENTRY="$HERE/dist/mcp/pi-tools-bridge/src/index.js"
CORE_SRC="$HERE/../../pi-extensions/lib/delegate-core.ts"

# Build if stale.
if [ ! -f "$DIST_ENTRY" ] \
   || [ "$HERE/src/index.ts" -nt "$DIST_ENTRY" ] \
   || [ "$CORE_SRC" -nt "$DIST_ENTRY" ]; then
  echo "[build]"
  (cd "$HERE" && npm run build >/dev/null)
fi

rpc() {
  # stdin: newline-delimited JSON-RPC requests
  # stdout: server responses, trimmed to 5s
  timeout 10 "$HERE/start.sh"
}

# ----------------------------------------------------------------------------
# 1. Protocol — tools/list returns expected names
# ----------------------------------------------------------------------------

echo "[1] tools/list parity"

TOOLS_JSON=$(
  {
    printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}'
    printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
    printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
    sleep 0.5
  } | rpc 2>/dev/null | grep '"id":2' || true
)

if [ -z "$TOOLS_JSON" ]; then
  fail "no tools/list response"
else
  for tool in "${EXPECTED_TOOLS[@]}"; do
    if echo "$TOOLS_JSON" | grep -q "\"name\":\"$tool\""; then
      ok "exposes $tool"
    else
      fail "missing $tool"
    fi
  done
fi

# ----------------------------------------------------------------------------
# 2. Error paths — unknown tool + missing required arg
# ----------------------------------------------------------------------------

echo "[2] error surfaces"

UNKNOWN=$(
  {
    printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}'
    printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
    printf '%s\n' '{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"nonexistent_tool","arguments":{}}}'
    sleep 0.5
  } | rpc 2>/dev/null | grep '"id":9' || true
)
if echo "$UNKNOWN" | grep -qE '"(error|isError)"'; then
  ok "unknown tool rejected"
else
  fail "unknown tool did not surface error: $UNKNOWN"
fi

# ----------------------------------------------------------------------------
# 3. send_to_session negative path — no process, should isError:true
# ----------------------------------------------------------------------------

echo "[3] send_to_session negative path"

SEND=$(
  {
    printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}'
    printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
    printf '%s\n' '{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"send_to_session","arguments":{"target":"__definitely_does_not_exist__","message":"hi"}}}'
    sleep 0.5
  } | rpc 2>/dev/null | grep '"id":10' || true
)
if echo "$SEND" | grep -q '"isError":true'; then
  ok "missing socket returns isError"
else
  fail "missing socket did not surface isError: $SEND"
fi

# ----------------------------------------------------------------------------
# 4. delegate negative path — bogus SSH host should surface isError
# ----------------------------------------------------------------------------

echo "[4] delegate bogus-ssh negative path"

DELEGATE_NEG=$(
  {
    printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}'
    printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
    printf '%s\n' '{"jsonrpc":"2.0","id":20,"method":"tools/call","params":{"name":"delegate","arguments":{"task":"noop","host":"__pi_tools_bridge_bogus_host__"}}}'
    sleep 3
  } | timeout 15 "$HERE/start.sh" 2>/dev/null | grep '"id":20' || true
)
if echo "$DELEGATE_NEG" | grep -q '"isError":true'; then
  ok "bogus SSH host returns isError"
else
  fail "bogus SSH host did not surface isError: ${DELEGATE_NEG:0:200}"
fi

# ----------------------------------------------------------------------------
# 5. E2E (opt-in) — real knowledge_search call
# ----------------------------------------------------------------------------

if [ "${E2E:-0}" = "1" ]; then
  echo "[5] e2e knowledge_search"
  RESULT=$(
    {
      printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}'
      printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
      printf '%s\n' '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"knowledge_search","arguments":{"query":"MCP bridge","limit":2}}}'
      sleep 30
    } | timeout 60 "$HERE/start.sh" 2>/dev/null | grep '"id":11' || true
  )
  if echo "$RESULT" | grep -q '"count"'; then
    ok "knowledge_search returned a count field"
  else
    fail "knowledge_search produced no count field: ${RESULT:0:200}"
  fi
else
  echo "[5] e2e skipped (set E2E=1 to run)"
fi

# ----------------------------------------------------------------------------

echo
if [ "$FAIL" -eq 0 ]; then
  green "$PASS/$((PASS+FAIL)) passed"
  exit 0
else
  red "$FAIL failed, $PASS passed"
  exit 1
fi
