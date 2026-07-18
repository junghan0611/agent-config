#!/usr/bin/env python3
"""timeline/query.py — pull a slice out of the LOCAL FULL.

    python3 timeline/query.py events.jsonl --day 2026-07-12
    python3 timeline/query.py events.jsonl --month 2026-07 --source git
    python3 timeline/query.py events.jsonl --from 2026-01-01 --to 2026-07-01 \
        --count entities

Every range is KST and half-open: `--to 2026-07-01` excludes July 1st entirely, and
`--day 2026-07-12` means exactly that one day. Either bound may be left off — `--from`
alone means everything since, `--to` alone everything before. **No range at all means the
whole file**, and it means that no matter what day it is or what timezone the machine
thinks it is in: a query over a fixed FULL never reads the wall clock.

Counting is never implicit. `--count events` and `--count entities` answer different
questions — one commit written and then stamped in the agenda is TWO events about ONE
entity — so the caller has to say which one they mean.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect import SOURCES, parse_kst, sort_key  # noqa: E402


def _midnight(day: str) -> datetime:
    return parse_kst(f"{day}T00:00:00+09:00")


def window(args) -> tuple[datetime | None, datetime | None]:
    """--day / --month / --from / --to all collapse to one half-open [from, to), where
    either end may be None meaning "unbounded". Nothing here consults today's date."""
    if args.day:
        d = date.fromisoformat(args.day)
        return _midnight(d.isoformat()), _midnight((d + timedelta(days=1)).isoformat())
    if args.month:
        y, m = (int(x) for x in args.month.split("-"))
        end = date(y + (m == 12), (m % 12) + 1, 1)
        return _midnight(date(y, m, 1).isoformat()), _midnight(end.isoformat())
    return (_midnight(args.frm) if args.frm else None,
            _midnight(args.to) if args.to else None)


def within(ev: dict, frm: datetime | None, to: datetime | None) -> bool:
    """Half-open [from, to), open at either end. A day event has no instant, so it is in
    only when its whole day is — the same rule the collector applies."""
    if ev["ts_precision"] == "day":
        d = date.fromisoformat(ev["date_kst"])
        return not ((frm and d < frm.date()) or (to and d >= to.date()))
    t = parse_kst(ev["ts"])
    return not ((frm and t < frm) or (to and t >= to))


def keep(ev: dict, args) -> bool:
    if args.source and ev["source"] not in args.source:
        return False
    if args.domain and ev["domain"] not in args.domain:
        return False
    if args.layer and ev["layer"] not in args.layer:
        return False
    if args.time_kind and ev["time_kind"] not in args.time_kind:
        return False
    if args.has_ref and not ev["ref"]:
        return False
    if args.no_ref and ev["ref"]:
        return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description="query the LOCAL FULL event log")
    ap.add_argument("events", help="events JSONL from collect.py")
    ap.add_argument("--from", dest="frm", metavar="YYYY-MM-DD")
    ap.add_argument("--to", metavar="YYYY-MM-DD", help="exclusive upper bound")
    # No range given = the whole file. The default is not "today"; a query has no
    # business asking the operating system what day it is.
    ap.add_argument("--day", metavar="YYYY-MM-DD")
    ap.add_argument("--month", metavar="YYYY-MM")
    ap.add_argument("--source", action="append", choices=SOURCES)
    ap.add_argument("--domain", action="append")
    ap.add_argument("--layer", action="append")
    ap.add_argument("--time-kind", action="append", dest="time_kind")
    ap.add_argument("--has-ref", action="store_true")
    ap.add_argument("--no-ref", action="store_true")
    ap.add_argument("--count", choices=("events", "entities"),
                    help="print a number instead of the events; say WHICH number")
    ap.add_argument("--format", choices=("jsonl", "json"), default="jsonl")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    if args.has_ref and args.no_ref:
        ap.error("--has-ref and --no-ref cannot both hold")
    frm, to = window(args)

    hits = []
    with open(args.events) as fh:
        for line in fh:
            if not line.strip():
                continue
            ev = json.loads(line)
            if within(ev, frm, to) and keep(ev, args):
                hits.append(ev)
    hits.sort(key=sort_key)

    if args.count == "events":
        print(len(hits))
        return 0
    if args.count == "entities":
        print(len({e["entity_id"] for e in hits}))
        return 0

    if args.limit:
        hits = hits[:args.limit]
    if args.format == "json":
        json.dump(hits, sys.stdout, ensure_ascii=False, indent=2, sort_keys=True)
        sys.stdout.write("\n")
    else:
        for e in hits:
            print(json.dumps(e, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
