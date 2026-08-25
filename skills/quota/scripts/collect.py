#!/usr/bin/env python3
"""Collect the five model rails into one normalized snapshot.

This is the single source of truth: quota.py (text), --watch (TUI) and
serve.py (web) all render *this* dict and never call a vendor endpoint
themselves. Endpoints are undocumented -- see SKILL.md and
~/repos/gh/agent-config/.agent-reports/quota-checks-20260820.md.

Normalized shape:

    {"ts": ISO8601, "rails": [
        {"rail": "claude", "status": "ok"|"unavailable", "reason": str|None,
         "plan": str|None, "gauges": [gauge, ...]}]}

    gauge = {"key", "label", "used_pct", "used", "limit", "unit",
             "resets_at" (ISO|None), "period_start" (ISO|None),
             "window_seconds" (int|None), "window", "basis", "active", "note"}

`period_start` + `resets_at` let a renderer say how far into the window
we are, which is the number that actually matters: 48% burned is calm at
day 6 of 7 and alarming at day 1. Where the vendor does not send a start
we derive it as resets_at - window_seconds.

`basis` records what the endpoint actually tells us about the window, so
the display never overstates it:
    rolling  -- vendor returns a relative countdown (codex)
    period   -- vendor returns explicit start/end (grok)
    calendar -- calendar boundary (copilot, 1st of month)
    anchor   -- absolute reset instant only; period length inferred (claude, zai)

Never prints a raw token. Credentials are read from local files straight
into request headers and discarded.
"""

import datetime
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import railauth as _q  # verified auth/refresh plumbing

KST = datetime.timezone(datetime.timedelta(hours=9))


def _iso(dt):
    return dt.astimezone(datetime.timezone.utc).isoformat()


def _from_ms(ms):
    return _iso(datetime.datetime.fromtimestamp(ms / 1000, tz=datetime.timezone.utc))


def _from_s(s):
    return _iso(datetime.datetime.fromtimestamp(s, tz=datetime.timezone.utc))


H, D = 3600, 86400
WINDOW_SECONDS = {"5h": 5 * H, "7d": 7 * D}


def _month_before(iso):
    """Start of the calendar month that ends at `iso` (copilot's 1st-of-month)."""
    dt = datetime.datetime.fromisoformat(iso)
    year, month = (dt.year - 1, 12) if dt.month == 1 else (dt.year, dt.month - 1)
    return _iso(dt.replace(year=year, month=month))


def gauge(key, label, used_pct, resets_at=None, used=None, limit=None,
          unit=None, window=None, basis="anchor", active=False, note=None,
          period_start=None, window_seconds=None):
    if window_seconds is None:
        window_seconds = WINDOW_SECONDS.get(window)
    # Derive the start where the vendor only sends the end instant.
    if period_start is None and resets_at and window_seconds:
        period_start = _iso(datetime.datetime.fromisoformat(resets_at)
                            - datetime.timedelta(seconds=window_seconds))
    if window_seconds is None and period_start and resets_at:
        window_seconds = int((datetime.datetime.fromisoformat(resets_at)
                              - datetime.datetime.fromisoformat(period_start)).total_seconds())
    return {
        "key": key, "label": label,
        "used_pct": None if used_pct is None else round(float(used_pct), 1),
        "used": used, "limit": limit, "unit": unit,
        "resets_at": resets_at, "period_start": period_start,
        "window_seconds": window_seconds, "window": window, "basis": basis,
        "active": active, "note": note,
    }


def collect_copilot():
    tok = _q._load_json(_q.PI_AUTH)["github-copilot"]["refresh"]
    _, body = _q._get(
        "https://api.github.com/copilot_internal/user",
        headers={"Authorization": f"token {tok}",
                 "User-Agent": "GithubCopilot/1.0",
                 "Accept": "application/json"},
    )
    d = json.loads(body)
    q = d["quota_snapshots"]["premium_interactions"]
    # quota_reset_date_utc carries the instant; quota_reset_date is date-only.
    reset = d.get("quota_reset_date_utc")
    if reset:
        reset = _iso(datetime.datetime.fromisoformat(reset.replace("Z", "+00:00")))
    return {
        "plan": d.get("copilot_plan"),
        "gauges": [gauge(
            "premium", "premium requests",
            100.0 - float(q["percent_remaining"]),
            resets_at=reset, used=q.get("credits_used"), limit=q["entitlement"],
            unit="req", window="1mo", basis="calendar", active=True,
            period_start=_month_before(reset) if reset else None,
        )],
    }


def collect_zai():
    tok = _q._load_json(_q.PI_AUTH)["zai"]["key"]
    _, body = _q._get(
        "https://api.z.ai/api/monitor/usage/quota/limit",
        headers={"Authorization": tok, "Accept-Language": "en-US,en",
                 "Content-Type": "application/json"},
    )
    data = json.loads(body)["data"]
    gauges = []
    for l in data.get("limits", []):
        # unit 3 = hours, unit 6 = weeks; `number` is how many of them.
        n = l.get("number") or 1
        if l.get("unit") == 3:
            key, window, label, secs = "5h", f"{n}h", f"{n}h", n * H
        elif l.get("unit") == 6:
            key, window, label, secs = "weekly", "7d", "weekly", n * 7 * D
        else:
            key = window = label = f"u{l.get('unit')}n{l.get('number')}"
            secs = None
        # `usage` is the LIMIT, `currentValue` is what has been spent.
        # nextResetTime is ABSENT while the window is untouched (0% used).
        reset = l.get("nextResetTime")
        gauges.append(gauge(
            key, label, l.get("percentage"),
            resets_at=_from_ms(reset) if reset else None,
            used=l.get("currentValue"), limit=l.get("usage"),
            unit="credit", window=window, basis="anchor",
            window_seconds=secs, active=bool(l.get("currentValue")),
            note=None if reset else "untouched window — vendor sends no reset time",
        ))
    return {"plan": data.get("level"), "gauges": gauges}


def collect_codex():
    oc = _q._load_json(_q.PI_AUTH)["openai-codex"]
    _, body = _q._get(
        "https://chatgpt.com/backend-api/wham/usage",
        headers={"Authorization": f"Bearer {oc['access']}",
                 "chatgpt-account-id": oc["accountId"],
                 "Accept": "application/json",
                 "User-Agent": "codex_cli_rs/0.1",
                 "originator": "codex_cli_rs"},
    )
    d = json.loads(body)
    gauges = []
    for key, label in (("primary_window", "primary"), ("secondary_window", "secondary")):
        w = (d.get("rate_limit") or {}).get(key)
        if not w:
            continue
        secs = w.get("limit_window_seconds") or 0
        window = f"{secs // 86400}d" if secs >= 86400 else f"{secs // 3600}h"
        reset = w.get("reset_at")
        gauges.append(gauge(
            key, f"{window} {label}", w.get("used_percent"),
            resets_at=_from_s(reset) if reset else None,
            window=window, window_seconds=secs or None, basis="rolling",
            active=(key == "primary_window"),
        ))
    return {"plan": d.get("plan_type"), "gauges": gauges}


def collect_claude():
    tok = _q._load_json(_q.CLAUDE_CREDS)["claudeAiOauth"]["accessToken"]
    _, body = _q._get(
        "https://api.anthropic.com/api/oauth/usage",
        headers={"Authorization": f"Bearer {tok}",
                 "anthropic-beta": "oauth-2025-04-20",
                 "User-Agent": "claude-code/2.1.0",
                 "Accept": "application/json"},
    )
    d = json.loads(body)
    gauges = []
    # limits[] is richer than five_hour/seven_day: it carries per-model
    # scoped windows and which one is currently binding (is_active).
    for l in d.get("limits") or []:
        kind = l.get("kind")
        scope = ((l.get("scope") or {}).get("model") or {}).get("display_name")
        if kind == "session":
            label, window = "5h session", "5h"
        elif kind == "weekly_all":
            label, window = "7d all models", "7d"
        elif kind == "weekly_scoped":
            label, window = f"7d {scope or 'scoped'}", "7d"
        else:
            label, window = kind or "?", None
        reset = l.get("resets_at")
        gauges.append(gauge(
            kind, label, l.get("percent"),
            resets_at=_iso(datetime.datetime.fromisoformat(reset)) if reset else None,
            window=window, basis="anchor", active=bool(l.get("is_active")),
            note=None if l.get("severity") == "normal" else l.get("severity"),
        ))
    if not gauges:  # older shape without limits[]
        for k, label, window in (("five_hour", "5h session", "5h"),
                                 ("seven_day", "7d all models", "7d")):
            w = d.get(k)
            if w:
                gauges.append(gauge(k, label, w.get("utilization"),
                                    resets_at=_iso(datetime.datetime.fromisoformat(
                                        w["resets_at"])) if w.get("resets_at") else None,
                                    window=window, basis="anchor"))
    return {"plan": None, "gauges": gauges}


def collect_grok():
    tok, data, scope, entry = _q._grok_access_token()
    url = "https://cli-chat-proxy.grok.com/v1/billing?format=credits"
    headers = {"Authorization": f"Bearer {tok}", "Accept": "application/json",
               "User-Agent": "quota-skill/1.0"}
    try:
        _, body = _q._get(url, headers=headers)
    except urllib.error.HTTPError as e:
        if e.code != 401:
            raise
        updates = _q._grok_refresh_oidc(entry)
        entry.update(updates)
        _q._grok_persist_auth(data, scope, updates)
        headers["Authorization"] = f"Bearer {entry['key']}"
        _, body = _q._get(url, headers=headers)
    cfg = json.loads(body)["config"]
    period = cfg.get("currentPeriod") or {}
    end = period.get("end") or cfg.get("billingPeriodEnd")
    reset = _iso(datetime.datetime.fromisoformat(end.replace("Z", "+00:00"))) if end else None
    start = period.get("start")
    start = _iso(datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))) if start else None
    gauges = [gauge("weekly", "weekly credits", cfg.get("creditUsagePercent"),
                    resets_at=reset, period_start=start, window="7d",
                    basis="period", active=True)]
    cap = (cfg.get("onDemandCap") or {}).get("val", 0) or 0
    if cap:
        used = (cfg.get("onDemandUsed") or {}).get("val", 0) or 0
        gauges.append(gauge("ondemand", "추가 크레딧", 100.0 * used / cap,
                            used=used, limit=cap, unit="credit", basis="calendar"))
    return {"plan": None, "gauges": gauges}


# --- per-rail cache -------------------------------------------------------
#
# Two jobs. (1) Do not re-poll a rail that answered moments ago -- claude's
# api/oauth/usage 429s with Retry-After ~165s, so polling it faster than
# MIN_INTERVAL manufactures the very failure we are trying to report.
# (2) When a poll does fail, keep showing the last good numbers marked
# stale instead of blanking the rail: a 4-minute-old 18% is far more useful
# than UNAVAILABLE.

CACHE_DIR = os.path.expanduser("~/.local/share/quota")
CACHE = os.path.join(CACHE_DIR, "rails.json")

MIN_INTERVAL = {"claude": 180}  # seconds; measured Retry-After was 165
STALE_MAX = 6 * 3600            # older than this and the numbers are noise


def _cache_load():
    try:
        with open(CACHE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _cache_save(cache):
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        tmp = CACHE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(cache, f, ensure_ascii=False)
        os.replace(tmp, CACHE)
    except OSError:
        pass  # a read-only cache must never break the reading


def _age(entry, now):
    try:
        return (now - datetime.datetime.fromisoformat(entry["ts"])).total_seconds()
    except (KeyError, ValueError, TypeError):
        return None


RAILS = [
    ("claude", collect_claude),
    ("codex", collect_codex),
    ("zai", collect_zai),
    ("grok", collect_grok),
    ("copilot", collect_copilot),
]


def _retry_after(e):
    """Seconds the vendor asked us to wait, if it said."""
    if not isinstance(e, urllib.error.HTTPError) or e.code != 429 or not e.headers:
        return None
    try:
        return max(0, int(e.headers.get("Retry-After") or 0)) or None
    except ValueError:
        return None


def _reason(e):
    if isinstance(e, urllib.error.HTTPError):
        if e.code == 429:
            # Not "you are out of quota" -- the endpoint itself is rate
            # limited. Anthropic sends Retry-After; say it out loud so the
            # number is never mistaken for a spent budget.
            ra = e.headers.get("Retry-After") if e.headers else None
            return f"HTTP 429 rate-limited by the endpoint" + (f" — retry in {ra}s" if ra else "")
        return f"HTTP {e.code} from vendor endpoint"
    if isinstance(e, FileNotFoundError):
        return f"credential file missing: {e.filename}"
    if isinstance(e, KeyError):
        return f"expected field/credential missing: {e}"
    return f"{type(e).__name__}: {e}"


def snapshot(only=None, force=False):
    """Collect every rail. Failures are isolated per rail, never fatal.

    A rail polled within its MIN_INTERVAL is served from cache; a rail that
    fails falls back to its last good numbers marked `stale`. `force=True`
    skips the interval guard (it does not skip the fallback).
    """
    now = datetime.datetime.now(KST)
    cache = _cache_load()
    rails, dirty = [], False
    for name, fn in RAILS:
        if only and name not in only:
            continue
        cached = cache.get(name)
        age = _age(cached, now) if cached else None

        # Honor a Retry-After we were already given: retrying inside the
        # window just burns another request against the same bucket.
        blocked = cached.get("blocked_until") if cached else None
        if blocked:
            try:
                until = datetime.datetime.fromisoformat(blocked)
            except ValueError:
                until = None
            if until and now < until:
                wait = int((until - now).total_seconds())
                reason = f"HTTP 429 rate-limited by the endpoint — retry in {wait}s (not re-polled)"
                if cached.get("gauges") and age is not None and age < STALE_MAX:
                    rails.append({"rail": name, "status": "stale", "reason": reason,
                                  "plan": cached.get("plan"), "gauges": cached["gauges"],
                                  "fetched_at": cached.get("ts"), "age_seconds": int(age)})
                else:
                    rails.append({"rail": name, "status": "unavailable", "reason": reason,
                                  "plan": None, "gauges": [], "fetched_at": None,
                                  "age_seconds": None})
                continue

        if not force and cached and age is not None and age < MIN_INTERVAL.get(name, 0):
            rails.append({"rail": name, "status": "ok", "reason": None,
                          "plan": cached.get("plan"), "gauges": cached["gauges"],
                          "fetched_at": cached["ts"], "age_seconds": int(age)})
            continue
        try:
            r = fn()
            cache[name] = {"ts": now.isoformat(), "plan": r.get("plan"),
                           "gauges": r["gauges"]}  # success clears blocked_until
            dirty = True
            rails.append({"rail": name, "status": "ok", "reason": None,
                          "plan": r.get("plan"), "gauges": r["gauges"],
                          "fetched_at": now.isoformat(), "age_seconds": 0})
        except Exception as e:  # noqa: BLE001 -- one dead vendor must not stop the rest
            reason = _reason(e)
            wait = _retry_after(e)
            if wait:
                entry = dict(cached or {})
                entry["blocked_until"] = (now + datetime.timedelta(seconds=wait)).isoformat()
                cache[name] = entry
                dirty = True
            if cached and cached.get("gauges") and age is not None and age < STALE_MAX:
                rails.append({"rail": name, "status": "stale", "reason": reason,
                              "plan": cached.get("plan"), "gauges": cached["gauges"],
                              "fetched_at": cached["ts"], "age_seconds": int(age)})
            else:
                rails.append({"rail": name, "status": "unavailable", "reason": reason,
                              "plan": None, "gauges": [], "fetched_at": None,
                              "age_seconds": None})
    if dirty:
        _cache_save(cache)
    return {"ts": now.isoformat(), "rails": rails}


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--force"]
    print(json.dumps(snapshot(set(args) or None, force="--force" in sys.argv[1:]),
                     ensure_ascii=False, indent=1))
