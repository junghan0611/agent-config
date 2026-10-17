#!/usr/bin/env bash
# Reauthorize one stored gog account without widening its grant.
# The client and --services come from the account's own record, never a default.
#
#   reauth.sh <email> start                  snapshot grant, print consent URL
#   reauth.sh <email> finish '<redirect-url>' exchange the code (paste it yourself)
#   reauth.sh <email> verify                 valid? services kept? scopes lost/gained?
set -euo pipefail

usage() { echo "usage: reauth.sh <email> start | finish '<redirect-url>' | verify" >&2; exit 2; }
email="${1:-}"; action="${2:-}"
[[ -n "$email" && -n "$action" ]] || usage

umask 077
state_dir="${GOG_REAUTH_DIR:-${XDG_RUNTIME_DIR:-/tmp}/gog-reauth}"
mkdir -p "$state_dir"
before="$state_dir/$email.before.json"
granted="$state_dir/$email.granted.txt"

account_json() {
	gog auth list --json --no-input "$@" | EMAIL="$email" python3 -I -c '
import json, os, sys
accts = json.load(sys.stdin)["accounts"]
hit = [a for a in accts if a["email"] == os.environ["EMAIL"]]
if not hit:
    sys.exit("no stored gog account: " + os.environ["EMAIL"])
print(json.dumps(hit[0]))'
}

field() { python3 -I -c 'import json,sys; a=json.load(open(sys.argv[1])); v=a[sys.argv[2]]; print(",".join(v) if isinstance(v,list) else v)' "$before" "$1"; }

# Step 1 and step 2 must carry identical flags: gog keys the saved PKCE state on client + scopes + force-consent.
login_args() { echo login "$email" --client "$(field client)" --remote --force-consent --services "$(field services)" --no-input; }

case "$action" in
start)
	[[ -f "$before" ]] || account_json > "$before"
	echo "client=$(field client) services=$(field services)" >&2
	url=$(gog $(login_args) --step 1 | awk -F'\t' '$1=="auth_url"{print $2}')
	[[ "$url" == https://accounts.google.com/* && "$url" == *response_type=* ]] || { echo "no consent URL from gog" >&2; exit 1; }
	echo
	echo "Open in the browser profile signed in as $email, consent, then copy the failed 127.0.0.1 page URL:"
	echo
	echo "${url}&login_hint=${email}"
	;;
finish)
	redirect="${3:-}"
	[[ "$redirect" == http://127.0.0.1:*code=* ]] || { echo "expected the http://127.0.0.1:<port>/oauth2/callback?...code=... URL" >&2; exit 2; }
	[[ -f "$before" ]] || { echo "run start first" >&2; exit 2; }
	# gog records the requested set at login; Google's redirect scope list is the grant receipt.
	REDIRECT="$redirect" python3 -I -c 'import os, urllib.parse as u; q = u.parse_qs(u.urlparse(os.environ["REDIRECT"]).query); print("\n".join(sorted(q.get("scope", [""])[0].split())))' > "$granted"
	gog $(login_args) --step 2 --auth-url "$redirect"
	;;
verify)
	[[ -f "$before" ]] || { echo "run start first" >&2; exit 2; }
	[[ -s "$granted" ]] || { echo "no granted scopes recorded; finish with the full redirect URL" >&2; exit 2; }
	account_json --check | BEFORE="$before" GRANTED="$granted" python3 -I -c '
import json, os, sys
now = json.load(sys.stdin)
was = json.load(open(os.environ["BEFORE"]))
granted = set(open(os.environ["GRANTED"]).read().split())
lost = sorted(set(was["scopes"]) - granted)
gained = sorted(granted - set(was["scopes"]))
print("valid:", now.get("valid"))
print("created_at:", was["created_at"], "->", now["created_at"])
print("services kept:", sorted(was["services"]) == sorted(now["services"]))
print("granted:", len(was["scopes"]), "->", len(granted), "| lost:", lost or "none", "| gained:", gained or "none", "| gog record:", len(now["scopes"]), "(requested set)")
ok = now.get("valid") is True and now["created_at"] != was["created_at"] and not lost and sorted(was["services"]) == sorted(now["services"])
print("REAUTH OK" if ok else "REAUTH NOT CLEAN")
sys.exit(0 if ok else 1)'
	;;
*) usage ;;
esac
