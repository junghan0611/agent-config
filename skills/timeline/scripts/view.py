#!/usr/bin/env python3
"""timeline/view.py — look at the axis. One local HTML file, no server, no deps.

    python3 timeline/collect.py --as-of 2026-07-14 --out events.jsonl > snapshot.json
    python3 timeline/view.py events.jsonl --snapshot snapshot.json --out axis.html

This is a VIEWER, not a projection. It carries titles, so its output is as local as
`events.jsonl` itself and is gitignored with it — the boundary the FULL keeps (titles and
refs stay on this disk) does not get a hole punched in it because a picture was convenient.
A projection is a separate, later thing: an allowlist of aggregates that may leave.

It is not a citable analyzer either — but saying it "only shows" would be a lie, and this
axis has been bitten enough times by files that claim less than they do. It carries exactly
one judgement: `isQuiet`, the day whose residue is silent while depth 0 is not. That is the
predicate the whole axis argues about, and a viewer that could not point at it would be
useless. So: **one exploratory predicate, and no totals beyond counting it.** Anything more
belongs in the projection, which owns the definition and tests it — a viewer that grows
statistics becomes a second, unreviewed axis, and nobody would notice when the two disagree.

The picture is the argument: one lane per depth, one column per day. Depth 0 runs solid
because a life is lived every day; depths 2 and 3 flicker because artifacts are not. Where
2 and 3 go dark and 0 stays lit, a day was lived that no artifact records — and those
columns are why this axis exists.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# The lane a source is drawn in, and the one judgement drawn about a day, both come from
# the projection — it owns them, tests them, and is what a stranger can check. A viewer with
# its own copy is a second axis that nobody reads, right up to the day the two disagree.
sys.path.insert(0, str(Path(__file__).parent))
from project import DEPTH, is_quiet  # noqa: E402,F401  (re-exported: tests read view.is_quiet)

LANES = [(0, "timelog", "산 대로의 하루"), (1, "journal", "제 손으로 적은 것"),
         (2, "agenda", "에이전트의 흔적"), (3, "note · git", "산출물")]

# What a snapshot has to look like before this page will wear it. The event shape is
# `SCHEMA_VERSION` in the collector; a FULL names all five sources and no more.
SCHEMA_VERSIONS = {"1"}
SOURCES = {"git", "note", "agenda", "journal", "timelog"}
STATUSES = {"ok", "partial", "empty", "stale", "unreadable"}
HEX64 = re.compile(r"[0-9a-f]{64}")
KST_OFFSET = timezone(timedelta(hours=9)).utcoffset(None)


def verify(raw: bytes, events: list[dict], snapshot: dict) -> list[str]:
    """A page may stamp a snapshot only if it drew the FULL that snapshot names.

    The collector refuses to name a lifetract revision it cannot vouch for — a snapshot
    carrying a false provenance is worse than one carrying none. This viewer was doing
    precisely what the collector refuses: hand it 28,662 events and the manifest of a
    *different, failed* run and it printed the page, stamped `20,262 events`, the other
    run's `events_sha256`, and `timelog: unreadable` — while cheerfully painting the depth-0
    lane it had just been told was unreadable. Nothing was wrong with the picture; the
    provenance under it named a FULL it had never seen.

    So the pair is checked before anything is drawn, and the hash is taken over the file's
    own bytes rather than over a re-serialization of the parsed events — re-serializing
    would only prove this program can round-trip its own JSON.

    A malformed snapshot comes back REFUSED, never as a traceback. Every field is checked
    for its type before it is used: `sources: {}` used to sail through (nothing to iterate,
    so no source was unreadable, so the pair looked fine) and `sources: ["bad"]` died with an
    AttributeError. Both are the same mistake — believing the snapshot about its own shape —
    and a viewer that crashes on a bad snapshot has still not refused it."""
    if not isinstance(snapshot, dict) or not isinstance(m := snapshot.get("manifest"), dict):
        return ["the snapshot carries no manifest"]

    errs = []
    if m.get("schema_version") not in SCHEMA_VERSIONS:
        errs.append(f"unknown schema_version {m.get('schema_version')!r} — this viewer reads "
                    f"{', '.join(sorted(SCHEMA_VERSIONS))}")
    # The axis is pinned to KST, so an `as_of` in any other zone did not come off this
    # contract — `+00:00` is not the same midnight, and a bound that cuts the day somewhere
    # else is not the bound this FULL claims. Merely having a timezone was not enough.
    try:
        as_of = datetime.fromisoformat(str(m.get("as_of")))
        if as_of.utcoffset() != KST_OFFSET:
            errs.append(f"as_of {m.get('as_of')!r} is not KST — this axis cuts its days at "
                        f"+09:00")
    except (TypeError, ValueError):
        errs.append(f"as_of {m.get('as_of')!r} is not an instant")

    fp = m.get("events_sha256")
    if not (isinstance(fp, str) and HEX64.fullmatch(fp)):
        errs.append(f"events_sha256 {str(fp)[:16]!r} is not a sha256")
    elif (actual := hashlib.sha256(raw).hexdigest()) != fp:
        errs.append(f"these events are not the ones the snapshot fingerprints — "
                    f"file {actual[:12]}…, manifest {fp[:12]}…")
    # Optional: a 0.6.0 snapshot predates it. If it is there, it has to be a hash.
    if (c := m.get("content_sha256")) is not None and not (
            isinstance(c, str) and HEX64.fullmatch(c)):
        errs.append(f"content_sha256 {str(c)[:16]!r} is not a sha256")

    counts = m.get("counts")
    counted = counts.get("events") if isinstance(counts, dict) else None
    if not isinstance(counted, int) or isinstance(counted, bool) or counted < 0:
        errs.append(f"counts.events {counted!r} is not a count")
    elif counted != len(events):
        errs.append(f"the snapshot counts {counted} events; this file holds {len(events)}")

    sources = m.get("sources")
    if not isinstance(sources, list) or not sources:
        errs.append(f"sources {type(sources).__name__} names no source — a FULL has "
                    f"{len(SOURCES)}: {', '.join(sorted(SOURCES))}")
    elif bad := [s for s in sources
                 if not (isinstance(s, dict) and isinstance(s.get("name"), str)
                         and s.get("status") in STATUSES)]:
        errs.append(f"{len(bad)} source row(s) are not (name, status) — first: "
                    f"{str(bad[0])[:60]}")
    else:
        # Exactly the five, once each. Checking only for missing ones let a snapshot carry a
        # sixth source nobody has heard of, or name `git` twice with two different statuses —
        # and then "is any source unreadable" is being asked of a roster that is not this
        # axis's. The names are read as a list, not a set: a set cannot see a duplicate.
        names = [s["name"] for s in sources]
        if dupes := sorted({n for n in names if names.count(n) > 1}):
            errs.append(f"the snapshot names a source twice: {', '.join(dupes)}")
        if unknown := sorted(set(names) - SOURCES):
            errs.append(f"the snapshot names a source this axis does not collect: "
                        f"{', '.join(unknown)}")
        if missing := sorted(SOURCES - set(names)):
            errs.append(f"the snapshot is missing a depth: no {', '.join(missing)}")
        if dead := sorted(s["name"] for s in sources if s["status"] == "unreadable"):
            errs.append(f"the snapshot is not a FULL: {', '.join(dead)} unreadable")
    return errs


def _js(obj) -> str:
    """Data on its way into a `<script>` tag.

    `json.dumps` escapes nothing HTML cares about, and a title is free text the operator
    wrote: a commit named `fix: escape </script> in the template` would close the tag
    carrying the data and drop the rest of the page into the document as markup. Escaping
    `<` at the JSON layer costs one substitution and ends the whole class — `</script`,
    `<script`, `<!--` — because outside a JSON string there is no `<` to escape. The side
    panel already knew this (titles go in as `textContent`, never as markup); the hole was
    the channel that carries them there.

    Today the corpus holds 18 titles with a `<` in them — `M-<backspace>`, `C-<f12>` — and
    none that close a tag. The fix is not for those; it is for the one that will."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def grid(events: list[dict]) -> list[dict]:
    """One row per day in the span — including the days with nothing, because an absent day
    must be a gap you can see and not a column that silently closes up.

    `q` is computed here, once, over **every** event of the day, and the page only ever reads
    it. That is not tidiness. The predicate used to be re-derived in the browser from the
    counts of whatever survived the domain filter, and depth 0 carries no domain at all — so
    selecting any domain emptied the depth-0 lane, and 2026-02-07, the day this axis exists
    to show, stopped being quiet. Gold marker gone, explanation gone, `잔여물 침묵 0일` in the
    status bar. A filter that changed nothing about the day flipped the one judgement the
    page makes about it. A predicate derived twice is a predicate that can disagree with
    itself, so now it is derived once, upstream of every filter."""
    days: dict[str, dict] = {}
    for e in events:
        d = days.setdefault(e["date_kst"], {"n": [0, 0, 0, 0], "e": []})
        d["n"][DEPTH[e["source"]]] += 1
        d["e"].append({"s": e["source"], "t": (e["title"] or "")[:110],
                       "m": e["duration_min"], "dom": e["domain"]})

    lo, hi = date.fromisoformat(min(days)), date.fromisoformat(max(days))
    out, cur = [], lo
    while cur <= hi:
        k = cur.isoformat()
        day = days.get(k) or {"n": [0, 0, 0, 0], "e": []}
        out.append({"d": k, "q": is_quiet(day["n"]), **day})
        cur += timedelta(days=1)
    return out


def build(events: list[dict], snapshot: dict | None) -> str:
    grid_ = grid(events)
    data = _js(grid_)
    snap = _js(snapshot or {})
    doms = _js(sorted({e["dom"] for d in grid_ for e in d["e"] if e["dom"]}))
    return HTML.replace("__DATA__", data).replace("__SNAP__", snap).replace("__DOMS__", doms)


HTML = r"""<!doctype html>
<meta charset="utf-8"><title>시간축 — 관측소</title>
<style>
  :root { --bg:#0d1117; --fg:#e6edf3; --dim:#7d8590; --line:#21262d; --card:#161b22;
          --d0:#f0883e; --d1:#a371f7; --d2:#3fb950; --d3:#58a6ff; --gold:#f2cc60; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.5 ui-sans-serif,
         system-ui, "Noto Sans KR", sans-serif; }
  header { padding:16px 20px; border-bottom:1px solid var(--line); }
  h1 { margin:0 0 4px; font-size:16px; font-weight:600; }
  .sub { color:var(--dim); font-size:12px; font-family:ui-monospace,monospace; }
  .bar { display:flex; gap:14px; flex-wrap:wrap; align-items:center;
         padding:12px 20px; border-bottom:1px solid var(--line); font-size:13px; }
  .bar label { color:var(--dim); }
  input, select, button { background:var(--card); color:var(--fg); border:1px solid var(--line);
         border-radius:6px; padding:5px 8px; font:inherit; font-size:13px; }
  button { cursor:pointer; }
  button.on { border-color:var(--gold); color:var(--gold); }
  main { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:0;
         height:calc(100vh - 118px); }
  .axis { min-width:0; overflow-x:auto; overflow-y:auto; padding:20px; }
  .lane { display:flex; align-items:center; height:34px; }
  .lab { position:sticky; left:0; width:130px; min-width:130px; background:var(--bg);
         z-index:2; font-size:12px; }
  .lab b { display:block; font-weight:600; }
  .lab span { color:var(--dim); font-size:11px; }
  .cells { display:flex; }
  .c { width:5px; height:24px; margin-right:1px; border-radius:1px; background:#1c2128;
       cursor:pointer; }
  .c:hover { outline:1px solid var(--fg); }
  .c.sel { outline:2px solid var(--gold); }
  .ruler { display:flex; margin-left:130px; color:var(--dim); font-size:10px; height:18px; }
  .yr { border-left:1px solid var(--line); padding-left:3px; }
  aside { border-left:1px solid var(--line); padding:20px; overflow-y:auto; }
  aside h2 { margin:0 0 2px; font-size:15px; }
  .quiet { color:var(--gold); font-size:12px; margin:6px 0 14px; }
  .ev { padding:7px 0; border-top:1px solid var(--line); display:flex; gap:8px; font-size:13px; }
  .tag { font-size:10px; padding:1px 5px; border-radius:4px; height:fit-content;
         white-space:nowrap; font-family:ui-monospace,monospace; }
  .t { flex:1; word-break:break-word; }
  .m { color:var(--dim); font-family:ui-monospace,monospace; font-size:12px; }
  .none { color:var(--dim); padding:20px 0; }
  .legend { display:flex; gap:12px; font-size:11px; color:var(--dim); margin-top:14px;
            margin-left:130px; flex-wrap:wrap; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:4px; }
  /* Narrow window: stack, or the 340px panel eats the axis and the strip renders 0px wide.
     Found the hard way — the browser this was first opened in was 354px across. */
  @media (max-width: 900px) {
    main { grid-template-columns:1fr; grid-template-rows:1fr auto; height:auto; }
    aside { border-left:none; border-top:1px solid var(--line); }
  }
</style>
<header>
  <h1>시간축 — 관측소</h1>
  <div class="sub" id="snap"></div>
</header>
<div class="bar">
  <!-- Both ends included, and the label says so. A machine range is half-open `[from, to)`
       so that neighbouring windows tile exactly, and `collect.py`/`query.py` keep that
       contract. A date picker is not that: pick the last day and the last day should be in
       the picture, or the operator has to type the day *after* the one he means. Inclusive
       here is right — what was wrong was calling it `to`, borrowing the name of a bound that
       excludes. Different meaning, different word. -->
  <label>첫날 <input type="date" id="from"></label>
  <label>마지막 날(포함) <input type="date" id="to"></label>
  <label>도메인
    <select id="dom"><option value="">전부</option></select>
  </label>
  <button id="quiet">잔여물이 침묵한 날만</button>
  <button id="reset">전체 span</button>
  <span class="sub" id="stat"></span>
</div>
<main>
  <div class="axis">
    <div class="ruler" id="ruler"></div>
    <div id="lanes"></div>
    <div class="legend">
      <span><i class="dot" style="background:var(--d0)"></i>깊이0 timelog</span>
      <span><i class="dot" style="background:var(--d1)"></i>깊이1 journal</span>
      <span><i class="dot" style="background:var(--d2)"></i>깊이2 agenda</span>
      <span><i class="dot" style="background:var(--d3)"></i>깊이3 note·git</span>
      <span><i class="dot" style="background:var(--gold)"></i>잔여물 침묵</span>
    </div>
  </div>
  <aside id="side"><div class="none">한 칸을 눌러 그 하루를 편다.</div></aside>
</main>
<script>
const DAYS = __DATA__, SNAP = __SNAP__, DOMS = __DOMS__;
const COL = ['var(--d0)','var(--d1)','var(--d2)','var(--d3)'];
const LANES = [[0,'timelog','산 대로의 하루'],[1,'journal','제 손으로 적은 것'],
               [2,'agenda','에이전트의 흔적'],[3,'note · git','산출물']];
let sel = null, quietOnly = false;

const m = SNAP.manifest || {};
document.getElementById('snap').textContent = m.events_sha256
  ? `${m.device} · collector ${m.collector_version} · events ${m.events_sha256.slice(0,12)} · `
    + `${m.counts.events.toLocaleString()} events`
  : `${DAYS.length}일`;

DOMS.forEach(d => { const o = document.createElement('option'); o.value = o.textContent = d;
                    document.getElementById('dom').append(o); });
const FIRST = DAYS[0].d, LAST = DAYS[DAYS.length-1].d;
// Open on the year where all four depths are actually standing. The full span is one click
// away, and it says something too — depth 2 only begins in 2026 — but a first look at a
// window where half the lanes are structurally empty teaches the wrong thing.
const OPEN = FIRST > '2026-01-01' ? FIRST : '2026-01-01';
document.getElementById('from').value = OPEN;
document.getElementById('to').value = LAST;

// Quiet is decided in Python, over every event of the day, before any filter runs. Deriving
// it here from `d.n` would mean deriving it from whatever the domain filter left behind —
// and depth 0 has no domain, so picking one emptied the lane and un-quieted 2026-02-07, the
// day the axis exists to show. Read the flag; do not re-derive it.
const isQuiet = d => d.q;

function view() {
  // `through` is inclusive — see the note on the picker. This is the screen's range, not the
  // axis's: collect/query take `--to` and exclude it.
  const f = document.getElementById('from').value, through = document.getElementById('to').value;
  const dom = document.getElementById('dom').value;
  return DAYS.filter(d => d.d >= f && d.d <= through)
             .filter(d => !quietOnly || isQuiet(d))
             .map(d => dom ? {...d, e: d.e.filter(e => e.dom === dom),
                              n: count(d.e.filter(e => e.dom === dom))} : d);
}
const DEPTH = {timelog:0, journal:1, agenda:2, note:3, git:3};
function count(evs) { const n = [0,0,0,0]; evs.forEach(e => n[DEPTH[e.s]]++); return n; }

function draw() {
  const days = view();
  const lanes = document.getElementById('lanes'); lanes.innerHTML = '';
  const ruler = document.getElementById('ruler'); ruler.innerHTML = '';
  let yr = '';
  days.forEach(d => {
    const s = document.createElement('span');
    s.style.width = '6px'; s.style.flex = '0 0 6px';
    if (d.d.slice(0,4) !== yr) { yr = d.d.slice(0,4); s.className = 'yr'; s.textContent = yr;
                                 s.style.flex = '0 0 6px'; s.style.overflow = 'visible'; }
    ruler.append(s);
  });
  LANES.forEach(([i, name, desc]) => {
    const lane = document.createElement('div'); lane.className = 'lane';
    lane.innerHTML = `<div class="lab"><b>깊이 ${i}</b><span>${name}</span></div>`;
    const cells = document.createElement('div'); cells.className = 'cells';
    days.forEach(d => {
      const c = document.createElement('div'); c.className = 'c';
      const n = d.n[i];
      if (n) { c.style.background = COL[i];
               c.style.opacity = String(Math.min(1, 0.35 + Math.log1p(n) / 4)); }
      if (isQuiet(d) && i === 0) c.style.boxShadow = '0 0 0 1px var(--gold)';
      if (sel === d.d) c.classList.add('sel');
      c.title = `${d.d} — ${name} ${n}`;
      c.onclick = () => { sel = d.d; draw(); side(d); };
      cells.append(c);
    });
    lane.append(cells); lanes.append(lane);
  });
  const q = days.filter(isQuiet).length;
  const ev = days.reduce((a, d) => a + d.e.length, 0);
  document.getElementById('stat').textContent =
    `${days.length}일 · ${ev.toLocaleString()} events · 잔여물 침묵 ${q}일`;
}

function side(d) {
  const el = document.getElementById('side');
  const order = {timelog:0, journal:1, agenda:2, note:3, git:4};
  const evs = [...d.e].sort((a,b) => order[a.s] - order[b.s] || (b.m||0) - (a.m||0));
  el.innerHTML = `<h2>${d.d}</h2>` + (isQuiet(d)
    ? `<div class="quiet">잔여물이 침묵한 날 — 산출물만 읽는 하네스에게 이 하루는 공백이다.</div>`
    : `<div class="quiet" style="color:var(--dim)">${evs.length} events</div>`);
  if (!evs.length) { el.innerHTML += `<div class="none">이 창에 아무것도 없다.</div>`; return; }
  evs.forEach(e => {
    const row = document.createElement('div'); row.className = 'ev';
    row.innerHTML = `<span class="tag" style="background:${COL[DEPTH[e.s]]}22;`
      + `color:${COL[DEPTH[e.s]]}">${e.s}</span><span class="t"></span>`
      + (e.m ? `<span class="m">${e.m}분</span>` : '');
    row.querySelector('.t').textContent = e.t;      // titles are data, never markup
    el.append(row);
  });
}

document.getElementById('quiet').onclick = e => {
  quietOnly = !quietOnly; e.target.classList.toggle('on', quietOnly); draw(); };
document.getElementById('reset').onclick = () => {
  quietOnly = false; document.getElementById('quiet').classList.remove('on');
  document.getElementById('dom').value = '';
  document.getElementById('from').value = FIRST;
  document.getElementById('to').value = LAST; draw(); };
['from','to','dom'].forEach(id => document.getElementById(id).onchange = draw);
draw();
</script>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="render the LOCAL FULL as one local HTML page")
    ap.add_argument("events", help="events JSONL from collect.py")
    ap.add_argument("--snapshot", help="manifest JSON (collect.py stdout), to stamp the page")
    ap.add_argument("--out", default="axis.html")
    a = ap.parse_args()

    raw = Path(a.events).read_bytes()
    events = [json.loads(line) for line in raw.decode().splitlines() if line]

    # No snapshot, no stamp: an unprovenanced page that says `28,662일` and nothing about
    # where it came from claims nothing, and is still a useful thing to look at. Passing one
    # is a claim, and the claim gets checked.
    snap = None
    if a.snapshot:
        snap = json.loads(Path(a.snapshot).read_text())
        if errs := verify(raw, events, snap):
            for e in errs:
                print(f"REFUSED: {e}", file=sys.stderr)
            print("REFUSED: no page written. A viewer that stamps a snapshot it did not draw "
                  "is worse than one that stamps nothing.", file=sys.stderr)
            return 2

    Path(a.out).write_text(build(events, snap))
    print(f"wrote {len(events)} events -> {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
