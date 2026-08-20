#!/usr/bin/env python3
"""Print remaining quota for the five model rails GLG routes siblings onto.

One GET per rail, best-effort: a dead/blocked endpoint prints as
unavailable and does not stop the rest. Endpoints are undocumented
except where noted — see
~/repos/gh/agent-config/.agent-reports/quota-checks-20260820.md for how
each one was found and verified live.

Never prints a raw token. Credentials are read from local files straight
into request headers and discarded.
"""

import datetime
import json
import os
import sys
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


def check_copilot():
    """Needs the ghu_ GitHub-App user token (auth.json's `refresh` field),
    NOT the short-lived `access` field — that one is a Copilot-proxy
    session token good only against the completions proxy, not this
    account-info endpoint."""
    tok = _load_json(PI_AUTH)["github-copilot"]["refresh"]
    _, body = _get(
        "https://api.github.com/copilot_internal/user",
        headers={
            "Authorization": f"token {tok}",
            "User-Agent": "GithubCopilot/1.0",
            "Accept": "application/json",
        },
    )
    d = json.loads(body)
    q = d["quota_snapshots"]["premium_interactions"]
    reset = d.get("quota_reset_date", "?")
    return (
        f"{q['remaining']:>6}/{q['entitlement']:<6} premium reqs "
        f"({q['percent_remaining']:.1f}% left)  reset {reset}"
    )


def check_zai():
    tok = _load_json(PI_AUTH)["zai"]["key"]
    _, body = _get(
        "https://api.z.ai/api/monitor/usage/quota/limit",
        headers={
            "Authorization": tok,
            "Accept-Language": "en-US,en",
            "Content-Type": "application/json",
        },
    )
    limits = json.loads(body)["data"]["limits"]
    lines = []
    for l in limits:
        window = "5h  " if l["unit"] == 3 else ("weekly" if l["unit"] == 6 else f"u{l['unit']}n{l['number']}")
        reset = _kst(l["nextResetTime"], is_epoch_ms=True)
        lines.append(
            f"{window} {l['remaining']:>6}/{l['usage']:<6} credits "
            f"({100 - l['percentage']}% left)  reset {reset}"
        )
    return "\n      ".join(lines)


def check_codex():
    oc = _load_json(PI_AUTH)["openai-codex"]
    _, body = _get(
        "https://chatgpt.com/backend-api/wham/usage",
        headers={
            "Authorization": f"Bearer {oc['access']}",
            "chatgpt-account-id": oc["accountId"],
            "Accept": "application/json",
            "User-Agent": "codex_cli_rs/0.1",
            "originator": "codex_cli_rs",
        },
    )
    d = json.loads(body)
    p = d["rate_limit"]["primary_window"]
    days = p["limit_window_seconds"] / 86400
    remain_days = p["reset_after_seconds"] / 86400
    used = p["used_percent"]
    return (
        f"plan {d.get('plan_type', '?'):<6} {used:>5.1f}% used of {days:.0f}d window  "
        f"resets in {remain_days:.1f}d"
    )


def check_claude():
    tok = _load_json(CLAUDE_CREDS)["claudeAiOauth"]["accessToken"]
    _, body = _get(
        "https://api.anthropic.com/api/oauth/usage",
        headers={
            "Authorization": f"Bearer {tok}",
            "anthropic-beta": "oauth-2025-04-20",
            "User-Agent": "claude-code/2.1.0",
            "Accept": "application/json",
        },
    )
    d = json.loads(body)
    fh, sd = d["five_hour"], d["seven_day"]
    return (
        f"5h {fh['utilization']:>5.1f}% used  reset {_kst(fh['resets_at'])}\n"
        f"      7d {sd['utilization']:>5.1f}% used  reset {_kst(sd['resets_at'])}"
    )


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


def check_grok():
    """SuperGrok weekly credit usage via grok CLI billing proxy.

    Primary metric: creditUsagePercent (matches grok.com/?_s=usage and
    `grok` CLI). Auth is ~/.grok/auth.json OIDC access token (~6h), not
    the api.x.ai key in pi auth.json.

    Distinct from the api.x.ai per-minute RPM/TPM rate ceiling (see
    report §4 / SKILL.md) — that still exists but does not answer
    "how much SuperGrok is left this week" and is not queried here.
    """
    tok, data, scope, entry = _grok_access_token()
    url = "https://cli-chat-proxy.grok.com/v1/billing?format=credits"
    headers = {
        "Authorization": f"Bearer {tok}",
        "Accept": "application/json",
        "User-Agent": "quota-skill/1.0",
    }
    try:
        _, body = _get(url, headers=headers)
    except urllib.error.HTTPError as e:
        if e.code != 401:
            raise
        # Stale token that expires_at did not catch — refresh once and retry.
        updates = _grok_refresh_oidc(entry)
        entry.update(updates)
        _grok_persist_auth(data, scope, updates)
        headers["Authorization"] = f"Bearer {entry['key']}"
        _, body = _get(url, headers=headers)

    cfg = json.loads(body)["config"]
    used = float(cfg["creditUsagePercent"])
    left = 100.0 - used
    period = cfg.get("currentPeriod") or {}
    end = period.get("end") or cfg.get("billingPeriodEnd")
    reset = _kst(end) if end else "?"
    products = cfg.get("productUsage") or []
    product = products[0]["product"] if products else "SuperGrok"
    line = f"weekly {used:>5.1f}% used ({left:.1f}% left)  reset {reset}  [{product} credits]"
    # Surface on-demand only when a cap is configured (val can be nested).
    od_cap = (cfg.get("onDemandCap") or {}).get("val", 0) or 0
    od_used = (cfg.get("onDemandUsed") or {}).get("val", 0) or 0
    if od_cap:
        line += f"\n      on-demand {od_used}/{od_cap}"
    return line


RAILS = [
    ("copilot", check_copilot),
    ("zai", check_zai),
    ("codex", check_codex),
    ("claude", check_claude),
    ("grok", check_grok),
]


def main():
    print(f"quota check — {datetime.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %Z')}")
    print()
    for name, fn in RAILS:
        try:
            result = fn()
            print(f"{name:<8} {result}")
        except urllib.error.HTTPError as e:
            print(f"{name:<8} UNAVAILABLE — HTTP {e.code} from vendor endpoint")
        except FileNotFoundError as e:
            print(f"{name:<8} UNAVAILABLE — credential file missing: {e.filename}")
        except KeyError as e:
            print(f"{name:<8} UNAVAILABLE — expected field/credential missing: {e}")
        except Exception as e:
            print(f"{name:<8} UNAVAILABLE — {type(e).__name__}: {e}")


if __name__ == "__main__":
    sys.exit(main())
