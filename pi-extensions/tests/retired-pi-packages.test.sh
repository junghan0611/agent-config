#!/usr/bin/env bash
# Retired Pi package leftovers — setup reports them with the exact command and exits
# non-zero; it never removes them and never runs pi. Synthetic HOME per case, a stub
# `pi` that records any call, no real Pi, settings, network or credentials.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT
RECALL="npm:@ogulcancelik/pi-session-recall"
BASE='["../../repos/gh/andenken","/synthetic/repos/gh/entwurf"]'
FAILS=0

STUB="$ROOT/stub-bin"
mkdir -p "$STUB"
cat >"$STUB/pi" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$PI_CALLS"
exit 97
EOF
chmod +x "$STUB/pi"

fail() { echo "FAIL [$1]: $2" >&2; FAILS=$((FAILS + 1)); }

# new_case NAME [SETTINGS-JSON] — a synthetic HOME; settings omitted = absent file.
new_case() {
	local dir="$ROOT/$1"
	mkdir -p "$dir/home/.pi/agent/extensions"
	[ $# -lt 2 ] || printf '%s\n' "$2" >"$dir/home/.pi/agent/settings.json"
	echo "$dir"
}

settings_sha() {
	local f="$1/home/.pi/agent/settings.json"
	if [ -e "$f" ]; then sha256sum <"$f" | cut -c1-64; else echo absent; fi
}

fake_install() {
	local pkg="$1/home/.pi/agent/npm/node_modules/@ogulcancelik/pi-session-recall"
	mkdir -p "$pkg"
	printf '%s\n' '{"name":"@ogulcancelik/pi-session-recall","pi":{"extensions":["session-recall.ts"]}}' >"$pkg/package.json"
	printf '%s\n' 'throw new Error("fixture: must never load");' >"$pkg/session-recall.ts"
}

# Old machines carry the link to the deleted compat source: it dangles.
compat_link() { ln -s "$ROOT/deleted-source/session-recall-compat.ts" "$1/home/.pi/agent/extensions/session-recall-compat.ts"; }

# check_door NAME EXPECTED-RC [+PATTERN | -PATTERN]...
# Runs the real setup:pi-packages door twice; both runs must agree and change nothing.
check_door() {
	local name=$1 want=$2 dir="$ROOT/$1" before after rc1 rc2 p
	shift 2
	before=$(settings_sha "$dir")
	for n in 1 2; do
		set +e
		(cd "$REPO" && env -i HOME="$dir/home" PATH="$STUB:$PATH" LANG=C.UTF-8 PI_CALLS="$dir/pi-calls" \
			bash ./run.sh setup:pi-packages) >"$dir/out.$n" 2>&1
		echo $? >"$dir/rc.$n"
		set -e
	done
	rc1=$(cat "$dir/rc.1"); rc2=$(cat "$dir/rc.2")
	after=$(settings_sha "$dir")
	[ "$rc1" = "$want" ] || fail "$name" "rc $rc1, expected $want: $(cat "$dir/out.1")"
	[ "$rc2" = "$rc1" ] || fail "$name" "second run rc $rc2 differs from first $rc1"
	cmp -s "$dir/out.1" "$dir/out.2" || fail "$name" "second run output differs: $(diff "$dir/out.1" "$dir/out.2")"
	[ "$after" = "$before" ] || fail "$name" "settings changed: $before -> $after"
	[ ! -e "$dir/pi-calls" ] || fail "$name" "pi was called: $(cat "$dir/pi-calls")"
	for p in "$@"; do
		case "$p" in
			+*) grep -qF -- "${p#+}" "$dir/out.1" || fail "$name" "missing: ${p#+}" ;;
			-*) ! grep -qF -- "${p#-}" "$dir/out.1" || fail "$name" "unexpected: ${p#-}" ;;
		esac
	done
	echo "  $name: rc=$rc1 x2, settings $before"
}

# check_smoke NAME [+PATTERN | -PATTERN]... — the smoke must refuse before it starts pi.
check_smoke() {
	local name=$1 dir="$ROOT/$1" rc p
	shift
	set +e
	(cd "$REPO" && env -i HOME="$dir/home" PATH="$STUB:$PATH" LANG=C.UTF-8 PI_CALLS="$dir/smoke-pi-calls" \
		python3 pi-extensions/tests/pi-packages-smoke.py) >"$dir/smoke.out" 2>&1
	rc=$?
	set -e
	[ "$rc" = 1 ] || fail "smoke/$name" "rc $rc, expected 1: $(cat "$dir/smoke.out")"
	[ ! -e "$dir/smoke-pi-calls" ] || fail "smoke/$name" "pi was started: $(cat "$dir/smoke-pi-calls")"
	for p in "$@"; do
		case "$p" in
			+*) grep -qF -- "${p#+}" "$dir/smoke.out" || fail "smoke/$name" "missing: ${p#+}" ;;
			-*) ! grep -qF -- "${p#-}" "$dir/smoke.out" || fail "smoke/$name" "unexpected: ${p#-}" ;;
		esac
	done
	echo "  smoke/$name: rc=$rc, pi not started"
}

echo "== setup:pi-packages door"

new_case fresh "{\"theme\":\"fixture\",\"packages\":$BASE}" >/dev/null
check_door fresh 0 "+no retired package registered" "-⚠" "-leftovers remain"

d=$(new_case absent)
check_door absent 0 "+no retired package registered" "-⚠"

d=$(new_case object "{\"theme\":\"fixture\",\"packages\":$(jq -c --arg r "$RECALL" '. + [{source: $r, extensions: []}]' <<<"$BASE")}")
fake_install "$d"
compat_link "$d"
check_door object 1 \
	"+retired Pi package still registered (filtered object): $RECALL — remove with: pi remove $RECALL" \
	"+retired Pi extension still present: $d/home/.pi/agent/extensions/session-recall-compat.ts — remove with: ./run.sh setup:links" \
	"+retired Pi package leftovers remain: $RECALL $d/home/.pi/agent/extensions/session-recall-compat.ts" \
	"-no retired package registered"
[ -f "$d/home/.pi/agent/npm/node_modules/@ogulcancelik/pi-session-recall/package.json" ] || fail object "fake install was removed"
[ -L "$d/home/.pi/agent/extensions/session-recall-compat.ts" ] || fail object "compat link was removed by the package door"
jq -e --arg r "$RECALL" '.packages == (["../../repos/gh/andenken","/synthetic/repos/gh/entwurf"] + [{source: $r, extensions: []}]) and .theme == "fixture"' \
	"$d/home/.pi/agent/settings.json" >/dev/null || fail object "other packages or settings not preserved"

d=$(new_case string "{\"packages\":$(jq -c --arg r "$RECALL" '[.[0], $r, .[1]]' <<<"$BASE")}")
check_door string 1 \
	"+retired Pi package still registered (string): $RECALL — remove with: pi remove $RECALL" \
	"-retired Pi extension still present"

d=$(new_case both "{\"packages\":$(jq -c --arg r "$RECALL" '. + [$r, {source: $r, extensions: []}]' <<<"$BASE")}")
check_door both 1 "+retired Pi package still registered (string, filtered object): $RECALL"

d=$(new_case link-only "{\"packages\":$BASE}")
compat_link "$d"
check_door link-only 1 "+retired Pi extension still present:" "-retired Pi package still registered"

new_case broken-json '{"packages": [' >/dev/null
check_door broken-json 1 "+cannot read packages[] in" "+retired package check not done" "-no retired package registered"

new_case packages-object '{"packages":{"source":"x"}}' >/dev/null
check_door packages-object 1 "+packages is not an array" "-no retired package registered"

echo "== pi-packages-smoke refusals (before any pi start)"
check_smoke object "+pi remove $RECALL" "-no manifest"
# Registered, never installed: must still name the recall leftover, not a missing manifest.
check_smoke string "+pi remove $RECALL" "-no manifest"
check_smoke link-only "+run: ./run.sh setup:links"

if [ "$FAILS" -gt 0 ]; then
	echo "FAIL: $FAILS check(s) failed" >&2
	exit 1
fi
echo "PASS: retired Pi packages are reported with the exact command, the doors exit non-zero, nothing is removed and pi is never run"
