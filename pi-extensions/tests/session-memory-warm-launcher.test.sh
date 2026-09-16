#!/usr/bin/env bash
# Detached local warm launcher regression — no andenken process or API call.
set -euo pipefail

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT
mkdir -p "$ROOT/scripts" "$ROOT/run"
cp "$(dirname "$0")/../../skills/memory-sync/scripts/warm-local.sh" "$ROOT/scripts/warm-local.sh"
cat >"$ROOT/scripts/sync-sessions.sh" <<'EOF'
#!/usr/bin/env bash
printf '%s:%s\n' "$#" "$*" >>"$CALLS"
[ -n "${SYNC_SLEEP_SECONDS:-}" ] && sleep "$SYNC_SLEEP_SECONDS"
EOF
chmod +x "$ROOT/scripts/warm-local.sh" "$ROOT/scripts/sync-sessions.sh"

CALLS="$ROOT/calls"
export CALLS
run_warm() {
	XDG_RUNTIME_DIR="$ROOT/run" MEMORY_SYNC_WARM_COOLDOWN_SECONDS=600 "$ROOT/scripts/warm-local.sh"
}
wait_for_calls() {
	for _ in $(seq 1 50); do
		[ -f "$CALLS" ] && return 0
		sleep 0.02
	done
	echo "FAIL: detached runner did not start" >&2
	return 1
}

run_warm
wait_for_calls
[ "$(wc -l <"$CALLS")" -eq 1 ] || { echo "FAIL: first warm count" >&2; exit 1; }
[ "$(cat "$CALLS")" = "0:" ] || { echo "FAIL: warm passed unexpected args: $(cat "$CALLS")" >&2; exit 1; }

run_warm
sleep 0.05
[ "$(wc -l <"$CALLS")" -eq 1 ] || { echo "FAIL: cooldown did not coalesce" >&2; exit 1; }

touch -d '11 minutes ago' "$ROOT/run/session-memory-warm.requested"
run_warm
for _ in $(seq 1 50); do
	[ "$(wc -l <"$CALLS")" -eq 2 ] && break
	sleep 0.02
done
[ "$(wc -l <"$CALLS")" -eq 2 ] || { echo "FAIL: expired cooldown did not relaunch" >&2; exit 1; }

# The detached sync inherits the launcher lock. Even a deliberately expired
# request stamp cannot start a second writer while the first one is alive.
touch -d '11 minutes ago' "$ROOT/run/session-memory-warm.requested"
export SYNC_SLEEP_SECONDS=1
run_warm
unset SYNC_SLEEP_SECONDS
for _ in $(seq 1 50); do
	[ "$(wc -l <"$CALLS")" -eq 3 ] && break
	sleep 0.02
done
[ "$(wc -l <"$CALLS")" -eq 3 ] || { echo "FAIL: sleeping sync did not start" >&2; exit 1; }
touch -d '11 minutes ago' "$ROOT/run/session-memory-warm.requested"
run_warm
sleep 0.05
[ "$(wc -l <"$CALLS")" -eq 3 ] || { echo "FAIL: in-flight flock did not coalesce" >&2; exit 1; }
sleep 1.05
touch -d '11 minutes ago' "$ROOT/run/session-memory-warm.requested"
run_warm
for _ in $(seq 1 50); do
	[ "$(wc -l <"$CALLS")" -eq 4 ] && break
	sleep 0.02
done
[ "$(wc -l <"$CALLS")" -eq 4 ] || { echo "FAIL: lock did not release after sync" >&2; exit 1; }

echo "PASS: detached local warm launcher coalesces requests without arguments"
