#!/usr/bin/env python3
"""Remaining quota across the three active model rails GLG routes siblings onto.

    quota.py                one shot, plain text
    quota.py --watch [SEC]  TUI: full-screen, refreshes in place (default 60s)
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

    Each refresh can poll one due rail; collect.py owns intervals and backoff.
    """
    sys.stdout.write("\033[?25l")  # hide cursor
    try:
        while True:
            snap = collect.snapshot(automatic=True)
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
        watch(int(rest[0]) if rest else 60)
        return 0
    print(render.render_text(collect.snapshot(), color=sys.stdout.isatty()))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
