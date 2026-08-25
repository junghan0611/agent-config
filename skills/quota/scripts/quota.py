#!/usr/bin/env python3
"""Remaining quota across the five model rails GLG routes siblings onto.

    quota.py                one shot, plain text
    quota.py --watch [SEC]  TUI: full-screen, refreshes in place (default 120s)
    quota.py --json         normalized snapshot (same data the web serves)

All three render collect.snapshot(); no renderer ever calls a vendor
endpoint itself. A dead endpoint prints as UNAVAILABLE for that rail
only and never stops the others. Endpoints are undocumented -- see
SKILL.md and .agent-reports/quota-checks-20260820.md.
"""

import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import collect
import render


def watch(interval):
    """Full-screen refresh loop.

    Vendor endpoints are polled once per `interval` (default 120s, the
    same TTL serve.py caches on). claude's api/oauth/usage answers 429
    with Retry-After ~165s when polled harder, and a 429 there reads as
    "quota exhausted" when it is really "you polled too fast" -- so
    collect.py holds that one rail to a poll per 180s no matter what
    interval is set here.
    """
    sys.stdout.write("\033[?25l")  # hide cursor
    try:
        while True:
            snap = collect.snapshot()
            body = render.render_text(snap, color=sys.stdout.isatty())
            sys.stdout.write("\033[H\033[2J" + body)
            sys.stdout.write(
                f"\n\n{render.DIM}refresh every {interval}s · Ctrl-C to stop{render.RESET}\n"
            )
            sys.stdout.flush()
            time.sleep(interval)
    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\033[?25h\n")  # restore cursor


def main(argv):
    args = argv[1:]
    if "--json" in args:
        print(json.dumps(collect.snapshot(), ensure_ascii=False, indent=1))
        return 0
    if "--watch" in args:
        rest = [a for a in args[args.index("--watch") + 1:] if not a.startswith("-")]
        watch(int(rest[0]) if rest else 120)
        return 0
    print(render.render_text(collect.snapshot(), color=sys.stdout.isatty()))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
