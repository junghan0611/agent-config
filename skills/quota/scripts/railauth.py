#!/usr/bin/env python3
"""Credential loading, HTTP, and grok OIDC refresh for the quota rails.

Extracted from quota.py so the collector and the renderers share one
verified auth path. Never prints a raw token: credentials are read from
local files straight into request headers and discarded.
"""

import datetime
import json
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request

HOME = os.path.expanduser("~")
PI_AUTH = os.path.join(HOME, ".pi", "agent", "auth.json")
CLAUDE_CREDS = os.path.join(HOME, ".claude", ".credentials.json")
GROK_AUTH = os.path.join(HOME, ".grok", "auth.json")

TIMEOUT = 15


def _get(url, headers, data=None, method=None):
    req = urllib.request.Request(url, headers=headers, data=data, method=method)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp, resp.read()


def _load_json(path):
    with open(path) as f:
        return json.load(f)


def _kst(iso_or_epoch, is_epoch_seconds=False, is_epoch_ms=False):
    if is_epoch_ms:
        dt = datetime.datetime.fromtimestamp(iso_or_epoch / 1000, tz=datetime.timezone.utc)
    elif is_epoch_seconds:
        dt = datetime.datetime.fromtimestamp(iso_or_epoch, tz=datetime.timezone.utc)
    else:
        s = iso_or_epoch
        # grok auth.json uses nanosecond fractions; fromisoformat accepts ≤6 digits
        if isinstance(s, str) and "." in s:
            head, frac_tz = s.split(".", 1)
            digits = ""
            rest = ""
            for i, ch in enumerate(frac_tz):
                if ch.isdigit():
                    digits += ch
                else:
                    rest = frac_tz[i:]
                    break
            s = f"{head}.{digits[:6]}{rest}"
        dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    kst = dt.astimezone(datetime.timezone(datetime.timedelta(hours=9)))
    return kst.strftime("%m-%d %H:%M KST")


def _grok_auth_entry():
    """~/.grok/auth.json is keyed by OIDC scope URL; one entry on a solo box."""
    data = _load_json(GROK_AUTH)
    if not data:
        raise KeyError("empty ~/.grok/auth.json")
    scope = next(iter(data))
    entry = data[scope]
    if not isinstance(entry, dict) or "key" not in entry:
        raise KeyError("grok auth entry missing key")
    return data, scope, entry


def _grok_token_expired(entry, skew_seconds=60):
    exp = entry.get("expires_at")
    if not exp:
        return False
    s = exp
    if "." in s:
        head, frac_tz = s.split(".", 1)
        digits = ""
        rest = ""
        for i, ch in enumerate(frac_tz):
            if ch.isdigit():
                digits += ch
            else:
                rest = frac_tz[i:]
                break
        s = f"{head}.{digits[:6]}{rest}"
    dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    now = datetime.datetime.now(datetime.timezone.utc)
    return dt <= now + datetime.timedelta(seconds=skew_seconds)


def _grok_refresh_oidc(entry):
    """Refresh via auth.x.ai OIDC (same path grok CLI logs as try_refresh_pure).

    Returns updated fields only — caller decides whether to persist.
    Does not print tokens.
    """
    rt = entry.get("refresh_token")
    client_id = entry.get("oidc_client_id")
    issuer = (entry.get("oidc_issuer") or "https://auth.x.ai").rstrip("/")
    if not rt or not client_id:
        raise KeyError("grok refresh_token or oidc_client_id missing")
    body = urllib.parse.urlencode(
        {
            "grant_type": "refresh_token",
            "refresh_token": rt,
            "client_id": client_id,
        }
    ).encode()
    _, raw = _get(
        f"{issuer}/oauth2/token",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        data=body,
        method="POST",
    )
    tok = json.loads(raw)
    access = tok.get("access_token")
    if not access:
        raise KeyError("oidc refresh response missing access_token")
    expires_in = int(tok.get("expires_in") or 21600)
    new_exp = (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expires_in)
    ).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    updated = {
        "key": access,
        "expires_at": new_exp,
    }
    if tok.get("refresh_token"):
        updated["refresh_token"] = tok["refresh_token"]
    return updated


def _grok_persist_auth(data, scope, updates):
    """Best-effort atomic write back to ~/.grok/auth.json (grok CLI also owns this)."""
    data[scope].update(updates)
    directory = os.path.dirname(GROK_AUTH)
    fd, tmp = tempfile.mkstemp(prefix=".auth.json.", dir=directory)
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        os.replace(tmp, GROK_AUTH)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        # Non-fatal: in-memory token still works for this request.


def _grok_access_token():
    data, scope, entry = _grok_auth_entry()
    if _grok_token_expired(entry):
        updates = _grok_refresh_oidc(entry)
        entry.update(updates)
        _grok_persist_auth(data, scope, updates)
    return entry["key"], data, scope, entry
