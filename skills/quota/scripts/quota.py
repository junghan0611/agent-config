#!/usr/bin/env python3
"""Print remaining quota for the five model rails GLG routes siblings onto.

One GET (or, for grok, one minimal completion) per rail, best-effort:
a dead/blocked endpoint prints as unavailable and does not stop the rest.
Endpoints are undocumented except where noted — see
~/repos/gh/agent-config/.agent-reports/quota-checks-20260820.md for how
each one was found and verified live.

Never prints a raw token. Credentials are read from local files straight
into request headers and discarded.
"""

import datetime
import json
import os
import sys
import urllib.error
import urllib.request

HOME = os.path.expanduser("~")
PI_AUTH = os.path.join(HOME, ".pi", "agent", "auth.json")
CLAUDE_CREDS = os.path.join(HOME, ".claude", ".credentials.json")

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
        dt = datetime.datetime.fromisoformat(iso_or_epoch)
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


def check_grok():
    """One minimal completion (max_tokens=1) — the only way to see the
    x-ratelimit-* headers. This is a per-minute RPM/TPM ceiling, NOT a
    depleting subscription balance; no endpoint for the latter was found."""
    tok = _load_json(PI_AUTH)["xai"]["access"]
    payload = json.dumps(
        {"model": "grok-4.3", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1}
    ).encode()
    resp, _ = _get(
        "https://api.x.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        data=payload,
        method="POST",
    )
    h = resp.headers
    return (
        f"{h['x-ratelimit-remaining-requests']}/{h['x-ratelimit-limit-requests']} req, "
        f"{h['x-ratelimit-remaining-tokens']}/{h['x-ratelimit-limit-tokens']} tok THIS MINUTE "
        f"(rate ceiling, NOT a subscription balance — no balance endpoint exists)"
    )


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
