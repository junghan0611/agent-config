#!/usr/bin/env bash
# Copy one gog account's refresh token into another host's keyring (e.g. the Oracle bot host).
# The export file carries secrets: it lives 0600 in a temp path on each side and is deleted on exit.
# The remote keyring is backed up first; the remote's own GOG_KEYRING_PASSWORD (~/.env.local) re-encrypts it.
#
#   push-token.sh <email> <ssh-host>
set -euo pipefail

email="${1:-}"; host="${2:-}"
[[ -n "$email" && -n "$host" ]] || { echo "usage: push-token.sh <email> <ssh-host>" >&2; exit 2; }

umask 077
tmp=$(mktemp "${XDG_RUNTIME_DIR:-/tmp}/gog-token.XXXXXX")
trap 'rm -f "$tmp"' EXIT
gog auth tokens export "$email" --out "$tmp" --overwrite --no-input >/dev/null

remote=$(ssh "$host" 'umask 077; mktemp /tmp/gog-token.XXXXXX')
scp -q "$tmp" "$host:$remote"

ssh "$host" bash -s -- "$email" "$remote" <<'REMOTE'
set -euo pipefail
email=$1; file=$2
trap 'rm -f "$file"' EXIT
set -a; . ~/.env.local >/dev/null 2>&1; set +a
gog=${GOG_BIN:-$HOME/.local/bin/gog}
cfg=$HOME/.config/gogcli
backup=$cfg/token-backup-$(date +%Y%m%dT%H%M%S)
mkdir -m 700 "$backup"
cp -a "$cfg/keyring" "$backup/"
echo "backup: $backup"
"$gog" auth tokens import "$file" --no-input >/dev/null
for bin in "$gog" "$HOME/openclaw/bin/gog"; do
	[[ -x "$bin" ]] || continue
	"$bin" auth list --check --json --no-input --timeout 15s | EMAIL="$email" BIN="$bin" python3 -I -c '
import json, os, sys
a = [x for x in json.load(sys.stdin)["accounts"] if x["email"] == os.environ["EMAIL"]][0]
print(os.environ["BIN"], "valid:", a.get("valid"), "created_at:", a["created_at"], "services:", len(a["services"]))'
done
REMOTE
