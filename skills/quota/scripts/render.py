#!/usr/bin/env python3
"""Shared rendering for the quota snapshot: bars, reset clocks, text layout.

The TUI (quota.py --watch) and the web page (serve.py) render the same
numbers through the same helpers, so the two surfaces can never drift.
Zero dependencies -- stdlib only, because this skill is symlinked into
several harnesses that do not share a Python environment.
"""

import datetime
import unicodedata

KST = datetime.timezone(datetime.timedelta(hours=9))
WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

RESET = "\033[0m"
DIM = "\033[2m"
BOLD = "\033[1m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"


def dwidth(s):
    """Display width: Korean/CJK glyphs occupy two terminal cells."""
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in s)


def pad(s, width):
    return s + " " * max(0, width - dwidth(s))


def parse(iso):
    return datetime.datetime.fromisoformat(iso).astimezone(KST) if iso else None


def fmt_when(iso, now=None):
    """Absolute reset instant in KST, with the weekday spelled out.

    The weekday matters: the five rails reset on Mon/Mon/Thu/Fri/1st, so
    "7 days" alone tells GLG nothing about which day the wall runs out.
    Same-day resets drop the date and show clock time only.
    """
    dt = parse(iso)
    if not dt:
        return "—"
    now = now or datetime.datetime.now(KST)
    if dt.date() == now.date():
        return dt.strftime("%H:%M")
    return f"{dt.strftime('%m-%d')}({WEEKDAY[dt.weekday()]}) {dt.strftime('%H:%M')}"


def fmt_left(iso, now=None):
    """Countdown to the reset, coarse-grained on purpose."""
    dt = parse(iso)
    if not dt:
        return ""
    now = now or datetime.datetime.now(KST)
    secs = (dt - now).total_seconds()
    if secs <= 0:
        return "resetting"
    d, rem = divmod(int(secs), 86400)
    h, rem = divmod(rem, 3600)
    m = rem // 60
    if d:
        return f"in {d}d {h}h"
    if h:
        return f"in {h}h {m}m"
    return f"in {m}m"


def pacing(g, now=None):
    """How far into the window we are, and how fast the budget is burning.

    Returns (elapsed_pct, pace) where pace = used% / elapsed%. This is the
    number that decides whether a bar should alarm: 69% burned is calm at
    day 5 of 7 (pace 0.97) and 48% is alarming on day 1 of 7 (pace 2.9).
    """
    start, end = g.get("period_start"), g.get("resets_at")
    pct = g.get("used_pct")
    if not (start and end):
        return None, None
    s, e = parse(start), parse(end)
    span = (e - s).total_seconds()
    if span <= 0:
        return None, None
    now = now or datetime.datetime.now(KST)
    elapsed = max(0.0, min(100.0, 100.0 * (now - s).total_seconds() / span))
    if pct is None or elapsed <= 0:
        return elapsed, None
    return elapsed, pct / elapsed


def level_name(g, now=None):
    """Severity band, shared with the web page's CSS classes.

    Pace drives the color; the absolute number only overrides it near the
    wall, where "on pace" stops being reassuring.
    """
    pct = g.get("used_pct")
    if pct is None:
        return "none"
    if pct >= 90:
        return "crit"
    elapsed, pace = pacing(g, now)
    if pace is None:  # no window info -- fall back to absolute
        return "crit" if pct >= 90 else "warn" if pct >= 70 else "ok"
    if elapsed < 5:  # too early for the ratio to mean anything
        return "warn" if pct >= 25 else "ok"
    if pace >= 2.0:
        return "crit"
    if pace >= 1.3 or pct >= 80:
        return "warn"
    return "ok"


LEVEL_COLOR = {"crit": RED, "warn": YELLOW, "ok": GREEN, "none": DIM}


def level_color(g, now=None):
    return LEVEL_COLOR[level_name(g, now)]


def fmt_pace(g, now=None):
    elapsed, pace = pacing(g, now)
    if pace is None or elapsed is None or elapsed < 5:
        return ""
    return f"{pace:.1f}x"


def bar(g, width=20, color=True, now=None):
    """Usage bar with a marker at the elapsed-time position.

    The marker is the whole point: it turns "how much is gone" into "how
    much is gone versus how much of the window is gone".
    """
    pct = g.get("used_pct")
    if pct is None:
        return DIM + "·" * width + RESET if color else "·" * width
    filled = min(width, max(0, round(width * pct / 100)))
    cells = ["█"] * filled + ["░"] * (width - filled)
    elapsed, _ = pacing(g, now)
    lvl = level_color(g, now)
    if not color:
        if elapsed is not None:
            i = min(width - 1, max(0, int(width * elapsed / 100)))
            cells[i] = "┃"
        return "".join(cells)
    out = lvl + "".join(cells) + RESET
    if elapsed is not None:
        i = min(width - 1, max(0, int(width * elapsed / 100)))
        out = (lvl + "".join(cells[:i]) + RESET + CYAN + "┃" + RESET
               + lvl + "".join(cells[i + 1:]) + RESET)
    return out


def fmt_amount(g):
    if g.get("used") is None or g.get("limit") is None:
        if g.get("used") is not None:
            return f"{g['used']:,.0f} {g.get('unit') or ''}".strip()
        return ""
    return f"{g['used']:,.0f}/{g['limit']:,.0f} {g.get('unit') or ''}".strip()


def resets_sorted(snap):
    """Every gauge that has a reset instant, soonest first.

    Deduplicated per rail+instant so claude's three windows sharing one
    Monday boundary print as one line, not three.
    """
    seen, out = set(), []
    for rail in snap["rails"]:
        for g in rail["gauges"]:
            if not g.get("resets_at"):
                continue
            k = (rail["rail"], g["resets_at"])
            if k in seen:
                continue
            seen.add(k)
            out.append((g["resets_at"], rail["rail"], g["label"]))
    return sorted(out)


def render_text(snap, color=True, barw=20):
    """The one text layout, used for plain output and for --watch."""
    now = datetime.datetime.now(KST)
    c = (lambda s, code: f"{code}{s}{RESET}") if color else (lambda s, code: s)
    lines = []
    ts = parse(snap["ts"]) or now
    head = f"quota — {ts.strftime('%Y-%m-%d')}({WEEKDAY[ts.weekday()]}) {ts.strftime('%H:%M')} KST"
    lines.append(c(head, BOLD))
    lines.append("")

    for rail in snap["rails"]:
        name = rail["rail"]
        if rail["status"] == "unavailable":
            lines.append(f"{c(pad(name, 9), BOLD)}{c('UNAVAILABLE — ' + (rail['reason'] or ''), RED)}")
            lines.append("")
            continue
        plan = f"  {c(rail['plan'], DIM)}" if rail.get("plan") else ""
        # A stale rail still shows its numbers -- a 4-minute-old 18% beats a
        # blank line -- but says so, and says why it could not refresh.
        tag = ""
        age = rail.get("age_seconds")
        if rail["status"] == "stale":
            tag = c(f"  stale — {rail.get('reason') or ''} (as of {fmt_when(rail.get('fetched_at'), now)})", YELLOW)
        elif age and age >= 60:
            tag = c(f"  as of {fmt_when(rail.get('fetched_at'), now)}", DIM)
        lines.append(f"{c(pad(name, 9), BOLD)}{plan}{tag}")
        for g in rail["gauges"]:
            mark = c("●", CYAN) if g.get("active") else " "
            pct = g.get("used_pct")
            pcts = "   —" if pct is None else f"{pct:>3.0f}%"
            amount = fmt_amount(g)
            pace = fmt_pace(g, now)
            when = fmt_when(g.get("resets_at"), now)
            left = fmt_left(g.get("resets_at"), now)
            reset = f"{when}  {c(left, DIM)}" if g.get("resets_at") else c(g.get("note") or "—", DIM)
            lines.append(
                f"  {mark} {pad(g['label'], 18)}{bar(g, barw, color, now)} "
                f"{c(pcts, level_color(g, now) if color else '')} "
                f"{pad(pace, 6)}{pad(amount, 22)}{reset}"
            )
        lines.append("")

    lines.append(c("┃ = elapsed point in window · pace = used% / elapsed% (1.0x = on track)", DIM))
    lines.append("")
    lines.append(c("resets — soonest first", BOLD))
    for iso, rail, label in resets_sorted(snap):
        lines.append(f"  {pad(fmt_when(iso, now), 18)}{pad(fmt_left(iso, now), 13)}"
                     f"{c(rail + ' · ' + label, DIM)}")
    return "\n".join(lines)
