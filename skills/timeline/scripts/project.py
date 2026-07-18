#!/usr/bin/env python3
"""timeline/project.py — the only reading of this axis that may leave the disk.

    python3 timeline/project.py events.jsonl --snapshot snapshot.json \
        --md timeline/projection.md --org timeline/projection.org

The FULL is local: it carries titles, refs, and the locators of the machine that read them.
A projection is the opposite promise — an allowlist of aggregates, small enough that a
stranger can check what it says, and tracked so that a document can cite it on a machine
that has never seen the FULL. The dossier builds from `projection.org`, not from
`events.jsonl`, and that is the point: the evidence is public, the source stays home.

**Allowlisted by construction, not by review.** The aggregator reads exactly five fields —
`source`, `date_kst`, `duration_min`, and (for depth 0 alone) `title`, which there is a
lifetract category and not free text. It never reads `ref`, `provenance`, or the title of a
commit, note, journal heading, or agenda stamp. There is no filter to forget to apply,
because the private fields are never in hand.

**This file owns the quiet predicate.** `view.py` imports it rather than keeping a second
copy: two definitions of the one judgement this axis makes is two axes, and nobody would
notice the day they disagreed.

**Dates are derived, never written down.** The days this axis is known for reach the page
because the data puts them there. Naming them in here would produce a document that keeps
saying them after they have stopped being true — the very failure the axis exists to expose,
committed by the thing exposing it. A test greps this file for a date literal and fails on
one, prose included: a guard you can talk your way around is not a guard.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# Which zoom level a source is. `git` and `note` share depth 3: both are residue.
DEPTH = {"timelog": 0, "journal": 1, "agenda": 2, "note": 3, "git": 3}

LENSES = [
    ((2, 3), "깊이 2·3 — 잔여물만 (에이전트 스탬프 · 커밋 · 노트)"),
    ((1, 2, 3), "깊이 1·2·3 — 잔여물 + 손으로 적은 저널"),
    ((0, 1, 2, 3), "깊이 0 포함 — 산 대로의 하루"),
]

LANES = [
    (0, "timelog", "산 대로의 하루 — 수면 · 가족 · 독서 · 본짓", "의도"),
    (1, "journal", "그날 손으로 적은 것", "의도"),
    (2, "agenda", "에이전트가 남긴 스탬프", "잔여물"),
    (3, "note · git", "커밋과 노트", "잔여물"),
]


def is_quiet(n: list[int]) -> bool:
    """The residue is silent and the life is not: nothing in depth 2 or 3, yet depth 0 has
    blocks. It is a fact about **the day** — not about the filter, the screen, or the window
    the reader happens to be looking through."""
    return n[0] > 0 and n[2] == 0 and n[3] == 0


def read(events_path: str, snapshot_path: str) -> tuple[list[dict], dict]:
    """Refuse before reading anything into the output. The hash is taken over the file's own
    bytes, and `view.verify` owns the pair contract — schema, KST `as_of`, the roster of five
    sources, no `unreadable` — so there is one definition of "this snapshot describes this
    FULL" and this projector cannot drift from the viewer's.

    The import is late on purpose: `view` reads the depth map and the quiet predicate back
    out of this file, and a projector that imported the viewer at module level would close
    the loop and break whichever of the two a caller happened to import first."""
    import view  # noqa: PLC0415

    raw = Path(events_path).read_bytes()
    events = [json.loads(ln) for ln in raw.decode().splitlines() if ln.strip()]
    snapshot = json.loads(Path(snapshot_path).read_text())
    if errs := view.verify(raw, events, snapshot):
        for e in errs:
            print(f"REFUSED: {e}", file=sys.stderr)
        raise SystemExit(2)
    return events, snapshot


def aggregate(events: list[dict], frm: date, to: date) -> dict:
    """Everything the projection is allowed to know, and nothing else.

    Note what is *not* read here. A commit's message, a note's title, a journal heading, the
    line an agenda stamp sits on — none of it is in scope, so none of it can leak by being
    forgotten. Depth 0's `title` is read because a lifetract category (`가족`, `독서`) is what
    the axis is arguing with; its `comment` never reaches an event in the first place, and
    the collector has a test that keeps it that way."""
    days: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0, 0])
    lived: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for e in events:
        d = date.fromisoformat(e["date_kst"])
        if not (frm <= d < to):
            continue
        depth = DEPTH[e["source"]]
        days[e["date_kst"]][depth] += 1
        if depth == 0 and e["duration_min"]:
            lived[e["date_kst"]][e["title"]] += e["duration_min"]

    span = [(frm + timedelta(days=i)).isoformat() for i in range((to - frm).days)]
    quiet = sorted(d for d in span if is_quiet(days[d]))
    return {
        "frm": frm, "to": to, "span": span, "days": days, "lived": lived, "quiet": quiet,
        "coverage": {dep: sum(1 for d in span if days[d][dep]) for dep in (0, 1, 2, 3)},
        "seen": {lens: sum(1 for d in span if any(days[d][x] for x in lens))
                 for lens, _ in LENSES},
    }


def _blocks(agg: dict, day: str) -> str:
    """A quiet day's depth 0, longest block first. Minutes and categories may leave; the
    comment attached to a block may not, and never arrives here to be dropped."""
    cats = sorted(agg["lived"][day].items(), key=lambda kv: (-kv[1], kv[0]))
    return " · ".join(f"{c} {m:.1f}분" for c, m in cats)


def body(agg: dict, m: dict, kind: str) -> list[str]:
    """The reading itself, in the two markups the axis has consumers for. The numbers are
    computed once, above; this only sets them. `kind` picks the syntax — Org for the
    dossier's `#+include`, GFM for the public one-pager — and nothing else differs, because a
    second rendering that could say a different number would be a second axis."""
    b = "*" if kind == "org" else "**"          # Org bold is one star; GFM wants two

    def dl(term: str, desc: str) -> str:
        """A definition list, in the only two dialects here. Writing Org's `::` into GFM
        would print the colons; GFM has no description list, so the term goes bold."""
        return f"- {term} :: {desc}" if kind == "org" else f"- **{term}** — {desc}"

    def code(s: str) -> str:
        """Field names go in code markup for a reason beyond taste: Org reads `content_sha256`
        as a subscript, and the PDF duly set `sha256` small and low. Verbatim turns that off.

        A hash gets grouped as well. LaTeX cannot break a word, and a 64-character monospace
        token ran past the text block — `make check` caught it. Split in half it still
        overflowed: two 32-character chunks are one break opportunity, and TeX preferred to
        overrun by 3pt rather than take it. Grouped in sixteens there is always a break where
        the line needs one, and a fingerprint reads better in groups anyway. Every digit is
        there, in order — a citation you cannot check is not a citation."""
        if kind == "md":
            return f"`{s}`"
        if len(s) > 32 and all(c in "0123456789abcdef" for c in s):
            return " ".join(f"={s[i:i + 16]}=" for i in range(0, len(s), 16))
        return f"={s}="

    n = len(agg["span"])
    out: list[str] = []

    out += [f"{b}에이전트를 수십 개 붙여도 지나간 시간은 만들어낼 수 없습니다.{b} 이 축은 산출물이",
            "아니라 하루를 셉니다. 같은 기간을 어느 깊이까지 읽느냐에 따라, 살았지만 아무 산출물도",
            "남기지 않은 날이 보이거나 사라집니다.", ""]

    out += ["| 깊이 | 무엇이 보이나 | 기록의 성격 | 커버리지 |",
            "|---|---|---|---|" if kind == "md" else "|---+---+---+---|"]
    for dep, _src, what, kindof in LANES:
        out.append(f"| {dep} | {what} | {kindof} | {agg['coverage'][dep]}일 / {n}일 |")
    out.append("")

    out += [f"{b}렌즈를 바꾸면 며칠이 사라지는가.{b} 창은 {agg['frm']} 이상 {agg['to']} 미만(KST)이고,",
            f"그 사이의 모든 날 {n}일이 분모입니다.", ""]
    out += ["| 읽는 렌즈 | 보이는 날 | 사라지는 날 |",
            "|---|---|---|" if kind == "md" else "|---+---+---|"]
    for lens, label in LENSES:
        seen = agg["seen"][lens]
        out.append(f"| {label} | {seen}일 | {n - seen}일 |")
    out.append("")

    if agg["quiet"]:
        out += [f"{b}잔여물이 통째로 침묵한 날.{b} 커밋도 노트도 에이전트 스탬프도 없는데, 산 시간은",
                "있습니다. 산출물만 읽는 판독기에게 이 날들은 공백입니다.", ""]
        for d in agg["quiet"]:
            total = sum(agg["lived"][d].values())
            counts = agg["days"][d]
            out.append(dl(d, f"{_blocks(agg, d)} (합 {total:,.0f}분) — 저널 {counts[1]}건 · "
                             f"스탬프 {counts[2]}건 · 커밋·노트 {counts[3]}건"))
        out.append("")

    src = {s["name"]: s for s in m["sources"]}
    tool = src["timelog"].get("tool") or {}
    out += [f"{b}이 판독의 출처.{b} 인용은 내용 지문 하나로 하지 않습니다 — 같은 내용이라도 창이",
            "다르면 다른 판독이고, 소스가 부분적이면 다른 품질이며, 깊이 0을 만든 도구가 다르면",
            "다른 손이 적은 것입니다.", ""]
    out += [dl(f"창 ({code('as_of')})", f"{m['as_of']} — 배타적 상한"),
            dl("소스 상태", " · ".join(
                f"{s['name']} {s['status']}({s['accepted']:,})" for s in m["sources"])),
            dl(f"깊이 0 도구 ({code('src_tree')})",
               f"{tool.get('repo', '?')} {code(tool.get('src_tree', '?'))}"),
            dl("이벤트", f"{m['counts']['events']:,}건 / 엔티티 "
                        f"{m['counts']['entities']:,}건")]

    # The two fingerprints get a line of their own. Sixty-four monospace characters fit
    # across the PDF's text block, but not once a description label has taken the front of
    # the line — and TeX would rather overrun the margin by 9pt than break between them. So
    # in Org (the rendering that becomes a PDF) the label ends its line and the hash starts a
    # fresh one. The Markdown page has no such constraint and keeps them in the list.
    if kind == "org":
        out += ["",
                f"관측 지문 {code('content_sha256')} \\\\",
                f"{code(m['content_sha256'])} \\\\",
                f"수집기 {code('code_sha256')} — collector {m['collector_version']} \\\\",
                code(m["code_sha256"]), ""]
    else:
        out += [dl(f"관측 지문 ({code('content_sha256')})", code(m["content_sha256"])),
                dl(f"수집기 ({code('code_sha256')})",
                   f"{code(m['code_sha256'])} — collector {m['collector_version']}"), ""]

    out += [f"{b}이 지문이 증명하지 않는 것.{b} 해시는 바이트와 내용이 같은지, 바꿔치기가 없었는지를",
            "확인할 뿐입니다. 이 코드가 실제로 돌았음도, 소스가 진실하고 완전함도 증명하지 않습니다.",
            "깊이 0은 폰에서 손으로 export한 1인칭 기록이라 외부에서 원본을 재구성할 길이 없고,",
            "확인할 수 있는 것은 파생의 일관성입니다. 원본(FULL)은 제목과 참조를 품으므로 공개하지",
            "않습니다 — 이 문서에는 집계만 나옵니다. 시간 블록은 시작 날짜에 귀속되며, 하루를 24시간",
            "파티션으로 나눈 것이 아닙니다.", ""]
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="the public reading of the LOCAL FULL")
    ap.add_argument("events")
    ap.add_argument("--snapshot", required=True)
    ap.add_argument("--from", dest="frm", metavar="YYYY-MM-DD",
                    help="default: 1 January of the as_of year")
    ap.add_argument("--md", help="public one-pager (GFM)")
    ap.add_argument("--org", help="heading-less body for a document #+include")
    args = ap.parse_args()

    events, snapshot = read(args.events, args.snapshot)
    m = snapshot["manifest"]
    # The window comes off the manifest, never off the wall clock: a projection regenerated
    # in December must still describe the FULL it was handed, not the day it was rebuilt.
    to = date.fromisoformat(m["as_of"][:10])
    frm = date.fromisoformat(args.frm) if args.frm else date(to.year, 1, 1)
    if frm >= to:
        print(f"REFUSED: the window [{frm}, {to}) is empty", file=sys.stderr)
        return 2
    agg = aggregate(events, frm, to)

    if args.org:
        Path(args.org).write_text("\n".join(
            [f"# generated by timeline/project.py — do not edit; regenerate from the FULL",
             f"# window [{frm}, {to}) · content_sha256 {m['content_sha256'][:12]}…", ""]
            + body(agg, m, "org")) + "\n")
    if args.md:
        Path(args.md).write_text("\n".join(
            [f"# 시간축 — 공개 판독 ({frm.year})", "",
             "<!-- generated by timeline/project.py — do not edit; regenerate from the FULL -->",
             ""] + body(agg, m, "md")) + "\n")
    if not (args.org or args.md):
        sys.stdout.write("\n".join(body(agg, m, "md")) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
