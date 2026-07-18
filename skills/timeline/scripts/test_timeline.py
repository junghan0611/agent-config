#!/usr/bin/env python3
"""timeline/test_timeline.py — the properties that must hold, on synthetic data.

    python3 timeline/test_timeline.py

Deliberately NOT pinned to the live corpus. Today's real audit says 4 duplicate Denote
identifiers and 17 unparseable lastmods; if the operator fixes those files tomorrow the
numbers SHOULD change, and a test that fails for that reason is a test that punishes
housekeeping. So the fixtures assert the invariant instead: ambiguity is rejected, never
guessed.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import collect  # noqa: E402
from collect import (KST, Reject, Repos, _event, check, device_name,  # noqa: E402
                     duplicate_ids, forge_id_from_remote, in_range, load_registry,
                     make_event_id, normalize_git_ts, parse_agenda_ts, parse_denote_id,
                     parse_kst, parse_lastmod, sha256, sort_key, time_component)

FAILED: list[str] = []


def ok(name: str, cond: bool, detail: str = ""):
    print(("  ok  " if cond else "  FAIL") + f"  {name}" + (f"  — {detail}" if detail else ""))
    if not cond:
        FAILED.append(name)


def raises(fn, reason: str) -> bool:
    try:
        fn()
    except Reject as r:
        return r.reason == reason
    return False


def test_time():
    day = parse_lastmod("[2026-07-12]")
    ok("day-only lastmod invents no instant",
       day["ts"] is None and day["ts_precision"] == "day"
       and day["date_kst"] == "2026-07-12")

    minute = parse_lastmod("[2026-07-12 Sun 14:30]")
    ok("minute lastmod is a KST instant",
       minute["ts"] == "2026-07-12T14:30:00+09:00" and minute["ts_precision"] == "minute")

    sec = parse_lastmod("Time-stamp: <2026-07-12 14:30:05>")
    ok("Time-stamp form parses to the second",
       sec["ts"] == "2026-07-12T14:30:05+09:00" and sec["ts_precision"] == "second")

    ok("garbage lastmod is rejected, not coerced",
       raises(lambda: parse_lastmod("last tuesday"), "unparseable_lastmod"))

    ok("naive git timestamp is rejected",
       raises(lambda: normalize_git_ts("2026-07-12T14:30:00"), "naive_git_timestamp"))

    # The whole reason the timezone is a contract and not a detail.
    late = normalize_git_ts("2026-07-12T20:00:00+00:00")
    ok("a +0000 commit late in the UTC day belongs to the NEXT day in Seoul",
       late["date_kst"] == "2026-07-13" and late["ts"] == "2026-07-13T05:00:00+09:00",
       "20:00Z -> 05:00 KST +1d")

    ok("denote id is a KST second", parse_denote_id("20260712T143005")["ts"]
       == "2026-07-12T14:30:05+09:00")
    ok("bad denote id is rejected",
       raises(lambda: parse_denote_id("2026-07-12"), "bad_denote_identifier"))
    ok("agenda stamp is a KST minute",
       parse_agenda_ts("2026-07-12", "14:30")["ts"] == "2026-07-12T14:30:00+09:00")
    ok("a non-KST offset is not silently accepted",
       raises(lambda: parse_kst("2026-07-12T14:30:00+00:00"), "not_kst_offset"))


def test_range():
    frm = parse_kst("2026-07-01T00:00:00+09:00")
    to = parse_kst("2026-07-13T00:00:00+09:00")
    inst = lambda d, t: {"ts": f"{d}T{t}+09:00", "date_kst": d, "ts_precision": "second"}
    dayev = lambda d: {"ts": None, "date_kst": d, "ts_precision": "day"}

    ok("[from, to) includes the lower bound", in_range(inst("2026-07-01", "00:00:00"),
                                                       frm, to))
    ok("[from, to) excludes the upper bound", not in_range(inst("2026-07-13", "00:00:00"),
                                                           frm, to))
    ok("the last instant before the bound is in",
       in_range(inst("2026-07-12", "23:59:59"), frm, to))
    ok("a day event whose whole day is inside is in", in_range(dayev("2026-07-12"),
                                                               frm, to))
    ok("a day event on the excluded final day is out — not guessed into the window",
       not in_range(dayev("2026-07-13"), frm, to))


def test_identity():
    tp = parse_denote_id("20260712T143005")
    sha = "45ac17609fc750d81c527fc9350d79057659d004"
    e1 = make_event_id("git", f"git:github.com/o/r@{sha}", "authored", tp, sha)
    e2 = make_event_id("git", f"git:github.com/o/r@{sha}", "authored", tp, sha)
    ok("event_id is deterministic", e1 == e2)
    ok("time_kind is part of identity",
       e1 != make_event_id("git", f"git:github.com/o/r@{sha}", "stamped", tp, sha))
    ok("a day event keys on the date, never on a fabricated midnight",
       time_component({"ts": None, "date_kst": "2026-07-12", "ts_precision": "day"})
       == "date:2026-07-12")

    ev = _event(source="git", entity_id=f"git:github.com/o/r@{sha}", time_kind="authored",
                tp=parse_agenda_ts("2026-07-12", "14:30"), domain="agent", layer="product",
                title="t", ref=None, native_id=sha, locator="/tmp/r")
    ok("the full sha survives into the entity — never truncated to 7",
       ev["entity_id"].endswith(sha) and len(sha) == 40)
    ok("a well-formed event passes the contract", check(ev) == [])

    bad = dict(ev, ts_precision="day")          # a day event still carrying an instant
    ok("an invented instant on a day event is caught",
       "day event carries an invented instant" in check(bad))
    bad2 = dict(ev, ts="2026-07-12T14:30:00+00:00")
    ok("a non-KST instant is caught", "ts is not a KST instant" in check(bad2))


def test_ambiguity_is_rejected():
    names = ["20260712T143005--a.org", "20260712T143005--b.org", "20260101T000000--c.org"]
    dupes = duplicate_ids(names)
    ok("a Denote id naming two notes is flagged — both sides, not a coin toss",
       dupes == {"20260712T143005"})
    ok("an id naming exactly one note is untouched", "20260101T000000" not in dupes)


def test_agenda_occurrence():
    """Two stamps, same file, same title, same minute. They are two events."""
    tp = parse_agenda_ts("2026-07-12", "14:30")
    from collect import _h
    n1 = _h("a.org", "stamp", time_component(tp), "1")
    n2 = _h("a.org", "stamp", time_component(tp), "2")
    ok("occurrence separates two identical stamps", n1 != n2)
    ok("the same occurrence is stable across runs",
       n1 == _h("a.org", "stamp", time_component(tp), "1"))
    e1 = make_event_id("agenda", f"agenda:{n1}", "stamped", tp, n1)
    e2 = make_event_id("agenda", f"agenda:{n2}", "stamped", tp, n2)
    ok("so their event ids differ", e1 != e2)


def test_stamp_identity_ignores_the_query_window():
    """A stamp's id must not depend on which range someone happened to ask for. Counting
    occurrence only among the stamps that survived the filter made the SECOND of two
    identical stamps become the first — and silently change its id."""
    import tempfile

    import collect

    body = ("**** did a thing\n<2026-07-12 Sun 14:30>\n"
            "**** did a thing\n<2026-07-12 Sun 14:30>\n"
            "**** later thing\n<2026-07-13 Mon 09:00>\n")
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "a.org").write_text(body)
        keep = collect.AGENDA_DIR
        try:
            collect.AGENDA_DIR = Path(tmp)
            src = collect.Source("agenda")
            ids = [s["native"] for s in collect.read_stamps(src)]
        finally:
            collect.AGENDA_DIR = keep
    ok("two identical stamps get two identities", ids[0] != ids[1] and len(ids) == 3)
    ok("occurrence is counted before any window, so a narrow query cannot renumber it",
       len(set(ids)) == 3)


JOURNAL_FIXTURE = """\
* 2026-07-11 Saturday
:PROPERTIES:
:CUSTOM_ID: h-2026-07-11
:END:
** 16:42 장염 복통
<2026-07-11 Sat 16:42>
** 18:26 인간 환멸
<2026-07-11 Sat 18:26>
some prose about the day
* 2026-07-12 Sunday
** DONE 13:45 식사 후
CLOSED: [2026-07-13 Mon 06:35]
<2026-07-12 Sun 13:45>
** a heading that only talks about a date
I wrote about <2026-07-12 Sun 09:00> but nothing happened at 09:00.
** quoting the agenda
#+begin_quote
<2026-07-12 Sun 10:00>
#+end_quote
** 20:00 same minute
<2026-07-12 Sun 20:00>
** 20:00 same minute
<2026-07-12 Sun 20:00>
"""


def journal_events(body: str = JOURNAL_FIXTURE):
    import tempfile

    import collect
    with tempfile.TemporaryDirectory() as tmp:
        # The locator must read as a path from ~/org, so the fixture mirrors the real
        # layout instead of the collector being loosened to accept a stray directory.
        jdir = Path(tmp) / "journal"
        jdir.mkdir()
        (jdir / "20260706T000000--2026-07-06__journal_week27.org").write_text(body)
        (jdir / "templates.org").write_text("** 09:00 template\n<2026-07-12 Sun 09:00>\n")
        keep_org, keep_j = collect.ORG, collect.JOURNAL_DIR
        try:
            collect.ORG, collect.JOURNAL_DIR = Path(tmp), jdir
            src = collect.Source("journal")
            frm, as_of = parse_kst("2026-01-01T00:00:00+09:00"), parse_kst(
                "2027-01-01T00:00:00+09:00")
            return collect.collect_journal(Repos.__new__(Repos), frm, as_of, src), src
        finally:
            collect.ORG, collect.JOURNAL_DIR = keep_org, keep_j


def test_journal_reads_the_lane_the_agenda_shows():
    """A heading is an event exactly when an ACTIVE timestamp is attached to it — the same
    condition that puts it in the operator's org-agenda.

    Two ways to get this wrong, and both are in the fixture. Scanning the body for any
    `<...>` collects the dates the operator merely wrote ABOUT, and reading inside a
    `#+begin_quote` collects the agenda he was quoting. Neither happened at that minute."""
    events, _ = journal_events()
    titles = [e["title"] for e in events]
    ok("the Saturday the axis called empty has two events",
       [e["title"] for e in events if e["date_kst"] == "2026-07-11"]
       == ["16:42 장염 복통", "18:26 인간 환멸"])
    ok("a date merely written about is not an event",
       not any("only talks about" in t for t in titles))
    ok("a timestamp inside a quote block is not an event",
       not any("quoting" in t for t in titles))
    ok("a planning line does not hide the timestamp behind it",
       "DONE 13:45 식사 후" in titles, "the 53 DONE headings")
    ok("templates are not records", not any("template" in t for t in titles))
    ok("every journal event passes the contract", not [e for e in events if check(e)])


def test_journal_identity_holds_still_while_the_heading_moves():
    """A workflow state and a tag are built to change; what happened at 16:42 is not.

    If identity keyed on them, marking a TODO done — or refiling it — would silently
    retire one event and mint another in its place, which is exactly the drift the line
    number was kept out of the id to avoid."""
    import collect
    plain = collect.stable_title("16:42 장염 복통")
    ok("a TODO state is not part of what happened",
       collect.stable_title("TODO 16:42 장염 복통") == plain)
    ok("neither is finishing it",
       collect.stable_title("DONE 16:42 장염 복통") == plain)
    ok("neither is a refile or an archive",
       collect.stable_title("DONE [#A] 16:42 장염 복통  :REFILED:ARCHIVE:") == plain)
    events, _ = journal_events()
    same_minute = [e for e in events if e["title"] == "20:00 same minute"]
    ok("two headings at the same minute are two events",
       len(same_minute) == 2
       and same_minute[0]["entity_id"] != same_minute[1]["entity_id"])


def test_journal_has_no_domain():
    """`domain` answers "what kind of repository did this land in". A heading lands in no
    repository, and `unmapped` does not mean "no repo" — it means "a repo nobody has
    classified yet". Filing the operator's own voice under it would put it in the same
    bucket as real repos and bend every slice by domain."""
    events, _ = journal_events()
    ok("no journal event claims a domain",
       all(e["domain"] is None and e["layer"] is None for e in events))
    ok("so a domain slice cannot swallow the human lane",
       not [e for e in events if e["domain"] == "unmapped"])


def fake_lifetract(reach: str | None = "2026-07-13") -> str:
    """A stand-in that answers both questions the collector asks: what happened, and how
    far down the log actually goes. `reach=None` is the older binary that cannot say."""
    status = ('{"database": {}}' if reach is None
              else '{"database": {"last_time_block": "%s"}}' % reach)
    return f"""#!/bin/sh
if [ "$1" = "status" ]; then
  echo '{status}'
  exit 0
fi
cat <<'JSON'
[{{"date": "2026-07-12", "categories": [{{"name": "\\uc218\\uba74", "minutes": 514}},
                                       {{"name": "\\uac00\\uc871", "minutes": 636.4}}]}},
 {{"date": "2026-07-11", "categories": [{{"name": "\\uc218\\uba74", "minutes": 0}}]}}]
JSON
"""


FAKE_LIFETRACT = fake_lifetract()


def timelog_events(tool: str | None):
    import collect
    keep = os.environ.get("LIFETRACT")
    try:
        if tool:
            os.environ["LIFETRACT"] = tool
        else:
            os.environ["LIFETRACT"] = "/nonexistent/lifetract"
        src = collect.Source("timelog")
        frm, as_of = parse_kst("2026-01-01T00:00:00+09:00"), parse_kst(
            "2026-07-14T00:00:00+09:00")
        return collect.collect_timelog(Repos.__new__(Repos), frm, as_of, src), src
    finally:
        os.environ.pop("LIFETRACT", None)
        if keep:
            os.environ["LIFETRACT"] = keep


def test_depth_zero_is_a_span_not_a_moment():
    """A time block lasted nine hours. Giving it an instant would be the same fabrication
    as writing 00:00 for a day-only note — so the day is the coordinate and `duration_min`
    carries the length."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        tool = Path(tmp) / "lifetract"
        tool.write_text(FAKE_LIFETRACT)
        tool.chmod(0o755)
        events, src = timelog_events(str(tool))
    by = {(e["date_kst"], e["title"]): e for e in events}
    sleep = by[("2026-07-12", "수면")]
    ok("a block carries how long it lasted", sleep["duration_min"] == 514.0)
    ok("and no invented instant", sleep["ts"] is None and sleep["ts_precision"] == "day")
    ok("it is tracked, not authored", sleep["time_kind"] == "tracked")
    ok("a block claims no repository domain",
       sleep["domain"] is None and sleep["layer"] is None)
    ok("each (day, category) is its own entity",
       len({e["entity_id"] for e in events}) == 2)
    ok("a zero-length block is rejected, not carried",
       len(events) == 2 and any(r["reason"] == "empty_time_block" for r in src.rejected))
    ok("every depth-0 event passes the contract", not [e for e in events if check(e)])


def test_a_missing_skill_is_a_hole_not_a_zero():
    """If lifetract is gone the source must say `unreadable`. A depth-0 hole that reports
    itself as zero minutes is a lie about a life, and it is exactly the failure the Source
    contract exists to prevent."""
    events, src = timelog_events(None)
    ok("no events", events == [])
    ok("and the FULL says the source could not be read", src.status == "unreadable")


def test_the_collector_does_not_own_the_time_log():
    """The blocks live in a sqlite file that `lifetract` already owns, and the collector
    consumes the skill instead of opening it. That is not a preference — parsing it here
    would duplicate a parser AND inherit three problems that belong to the skill: the
    interval shape, the midnight rule, and the comments that name who was there.

    This test is the guard. The day someone 'optimizes' the subprocess away by opening the
    database directly, it fails. It looks for the import, not for the word — the docstring
    above is allowed to say why the database is not ours."""
    import inspect

    import collect
    src = inspect.getsource(collect)
    ok("the collector never opens the database itself",
       "import sqlite3" not in src and "sqlite3." not in src)
    ok("the time log is read through the skill", "lifetract" in src)


def a_day(source, day):
    return {"source": source, "date_kst": day}


def test_a_lagging_depth_zero_that_misses_a_lived_day_is_stale():
    """The failure this exists to stop, stated as a rule.

    Depth 0 comes off a phone by hand, and it once sat two months behind while git, agenda
    and journal ran on to July. The collector called that `ok` — 8,000-odd events, no
    warning — and so those weeks read as weeks of rest. They were not; nobody had exported.

    A lag is a lie only once something else testifies the days were lived. So: a day that
    carries a commit, a stamp or a journal line happened, and if depth 0 stops before it,
    the hours are unrecorded rather than unlived. The source says `stale` and names the
    day. It cannot be skimmed as fine, and it tells the reader what to do about it."""
    src = collect.Source("timelog")
    src.reaches = "2026-05-18"
    src.done(8114)
    ok("a source that read cleanly starts out ok", src.status == "ok")
    collect.flag_unrecorded_days(
        [a_day("timelog", "2026-05-18"), a_day("git", "2026-07-13"),
         a_day("journal", "2026-07-12")], src)
    ok("depth 0 stopping short of a day other sources saw is not ok",
       src.status == "stale")
    ok("...and the gap is named, with the act that closes it",
       src.errors and "2026-05-18" in src.errors[0] and "phone" in src.errors[0])
    ok("the reach is on the record either way", src.report()["reaches"] == "2026-05-18")


def test_depth_zero_lagging_a_day_nobody_lived_is_not_stale():
    """The other half of the rule, and the reason it can be trusted.

    The export is a hand act, so depth 0 is normally a day or two behind and that says
    nothing false — this morning's blocks are still on the phone, and no other source
    claims those hours either. An alarm that fires every morning is an alarm nobody reads,
    and then the two-month hole slips past under the noise it taught everyone to ignore."""
    src = collect.Source("timelog")
    src.reaches = "2026-07-13"
    src.done(8400)
    collect.flag_unrecorded_days(
        [a_day("timelog", "2026-07-13"), a_day("git", "2026-07-13")], src)
    ok("a bottom that reaches every day the axis can see is ok", src.status == "ok")
    ok("and it says nothing alarming", src.errors == [])


def test_a_source_that_gave_nothing_is_not_ok():
    """The fifth face of the one bug this axis kept meeting: something is missing, and the
    run says it is fine.

    `ok` means read-and-had-something, and readers skim it as the second. A disk where
    `~/org` never mounted returns notes: accepted 0, rejected 0, `ok` — an entire depth
    reported as fine and absent, which is how a lived stretch gets read as an empty one.
    So zero is `empty`, a word that cannot be skimmed as fine. A genuinely quiet window
    says `empty` as well, and that is simply true of that run."""
    quiet = collect.Source("note")
    quiet.done(0)
    ok("a source that handed back nothing does not call itself ok",
       quiet.status == "empty")
    speaking = collect.Source("note")
    speaking.done(5512)
    ok("...and a source that did its job still says ok", speaking.status == "ok")
    torn = collect.Source("note")
    torn.reject("dup_denote_id", "20240101T000000")
    torn.done(3)
    ok("rejects with events kept are still partial", torn.status == "partial")
    gone = collect.Source("timelog")
    gone.unreadable("lifetract not found")
    gone.done(0)
    ok("and an unreadable source stays unreadable, not merely empty",
       gone.status == "unreadable")


def test_a_skill_that_cannot_say_its_reach_says_that_much():
    """An older binary answers `status` without the field. Unknown freshness is reported as
    unknown — the collector must not let silence pass for a current bottom."""
    src = collect.Source("timelog")
    src.reaches = None
    src.done(8400)
    collect.flag_unrecorded_days([a_day("git", "2026-07-14")], src)
    ok("an unknown reach is written down, not assumed current",
       src.errors and "freshness unknown" in src.errors[0])
    ok("and no reach is claimed", "reaches" not in src.report())


FAKE_LIFETRACT_NULL = """#!/bin/sh
if [ "$1" = "status" ]; then echo '{"database": {"last_time_block": "2026-07-13"}}'; exit 0; fi
echo 'null'
"""


def test_a_time_log_that_answers_null_is_not_an_empty_one():
    """`[]` is an empty window — a fact, and `empty` is the word for it. `null` is the skill
    declining to answer in a shape the contract allows, and the two must not arrive at the
    same place. Before this guard, `null` reached `for day in payload` and died with a
    TypeError that said nothing about depth 0; a consumer has to name the violation itself
    rather than trust the producer never to regress."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        tool = Path(tmp) / "lifetract"
        tool.write_text(FAKE_LIFETRACT_NULL)
        tool.chmod(0o755)
        events, src = timelog_events(str(tool))
    ok("no events are invented from a malformed answer", events == [])
    ok("and the source says it could not be read, not that it was empty",
       src.status == "unreadable")
    ok("and it says what shape it got", any("not an array" in e for e in src.errors))


def deployed_lifetract(tmp: Path, body: str, record: dict | None) -> Path:
    """Stand in for the deploy: a binary at the canonical path, and the record beside it
    that claims to describe that binary."""
    skills = tmp / ".claude/skills"
    (skills / "lifetract").mkdir(parents=True)
    tool = skills / "lifetract/lifetract"
    tool.write_text(body)
    tool.chmod(0o755)
    collect.DEPLOYED_LIFETRACT = tool
    collect.PROVENANCE = skills / ".provenance.json"
    if record is not None:
        collect.PROVENANCE.write_text(json.dumps({"tools": {"lifetract": record}}))
    return tool


def test_a_snapshot_names_the_build_that_produced_depth_zero():
    """`code_sha256` pins this collector, and this collector does not produce depth 0 — a
    binary outside the repo does, and it is rebuilt without asking. A FULL that fingerprints
    the collector while saying nothing about the skill cannot be reproduced.

    Three answers, and the third is the one worth a test: a record that DISAGREES with the
    binary is not an absence, it is a contradiction — someone rebuilt without redeploying,
    and the manifest is one line from naming a revision that did not produce these events."""
    import tempfile
    keep = (collect.DEPLOYED_LIFETRACT, collect.PROVENANCE)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            tool = deployed_lifetract(Path(tmp), FAKE_LIFETRACT, None)
            digest = collect.sha256(tool.read_bytes())
            rec = {"repo": "lifetract", "vcs_revision": "34a28cc", "src_tree": "688d7a0",
                   "sha256": digest}

            _, src = timelog_events(str(tool))                    # no record at all
            ok("with no record the sha is still written down",
               src.tool["sha256"] == digest and src.status == "ok")
            ok("and no revision is claimed", src.tool["vcs_revision"] is None,
               "unknown is the truth; this collector cannot tell")

            collect.PROVENANCE.write_text(json.dumps({"tools": {"lifetract": rec}}))
            _, src = timelog_events(str(tool))                    # record agrees
            ok("an agreeing record names the revision that produced depth 0",
               src.tool["vcs_revision"] == "34a28cc" and src.tool["src_tree"] == "688d7a0")
            ok("and the source is readable", src.status == "ok")
            ok("no wall clock rides along", "generated_at" not in src.tool)

            collect.PROVENANCE.write_text(json.dumps(
                {"tools": {"lifetract": {**rec, "sha256": "0" * 64}}}))
            events, src = timelog_events(str(tool))               # record disagrees
            ok("a record that disagrees with the binary makes depth 0 unreadable",
               src.status == "unreadable" and events == [],
               "a snapshot carrying a false provenance is worse than one carrying none")
            ok("and it says which two hashes disagree",
               any("provenance record" in e for e in src.errors))
    finally:
        collect.DEPLOYED_LIFETRACT, collect.PROVENANCE = keep


FAKE_LIFETRACT_TZ = """#!/bin/sh
if [ "$1" = "status" ]; then exit 1; fi
printf '[{"date": "2026-07-12", "categories": [{"name": "TZ=%s", "minutes": 1}]}]\\n' \
"${TZ:-unset}"
"""


def test_the_child_is_told_which_zone_this_axis_lives_in():
    """The collector pins TZ for the lifetract child, and this is what proves it still does.

    The zone must not be the caller's to choose: a shell must not decide which day a night
    belonged to. Nothing else in this file would notice if the pin were dropped —
    test_tz_determinism exercises the parsers, not the subprocess, and the other depth-0
    tests use a fake that ignores its environment. So a fake that reports the zone it was
    run under is the only witness. Remove the `env=` from collect_timelog and this fails;
    that is the whole point of it.

    The skill was fixed to compute in KST regardless (2026-07-14), so this is now belt and
    braces — but the binaries on this disk are older than the fix, and stating the axis's
    zone is right even when the callee no longer needs to be told."""
    import tempfile
    before = os.environ.get("TZ")
    seen = []
    try:
        with tempfile.TemporaryDirectory() as tmp:
            tool = Path(tmp) / "lifetract"
            tool.write_text(FAKE_LIFETRACT_TZ)
            tool.chmod(0o755)
            for tz in ("UTC", "Pacific/Kiritimati"):
                os.environ["TZ"] = tz
                time.tzset()
                events, _ = timelog_events(str(tool))
                seen.append(events[0]["title"] if events else "no events")
    finally:
        if before is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = before
        time.tzset()
    ok("the child reads the time log in KST however the caller's shell is set",
       seen == ["TZ=Asia/Seoul", "TZ=Asia/Seoul"])


def test_remote_identity():
    ok("ssh remote -> forge id",
       forge_id_from_remote("git@github.com:junghan0611/notes.git")
       == "github.com/junghan0611/notes")
    ok("https remote -> forge id",
       forge_id_from_remote("https://github.com/junghan0611/notes")
       == "github.com/junghan0611/notes")
    ok("an unparseable remote yields no identity",
       forge_id_from_remote("/home/junghan/some/local/dir") is None)


def test_a_commit_is_found_by_sha_not_by_name():
    """The join must survive the three ways a name lies: the repo is renamed, it moves to
    another owner, and — the silent one — its old name is handed to a DIFFERENT repo. A
    stamp written years ago still names the commit correctly, because a sha is content."""
    import subprocess
    import tempfile
    from collect import Repos, commit_ref, resolve_shas

    with tempfile.TemporaryDirectory() as tmp:
        run = lambda *a: subprocess.run(["git", "-C", tmp, *a], capture_output=True,
                                        text=True, check=True)
        run("init", "-q", "-b", "main")
        run("config", "user.email", "t@t")
        run("config", "user.name", "junghan")
        run("commit", "-q", "--allow-empty", "-m", "the commit that outlives its name")
        full = run("rev-parse", "HEAD").stdout.strip()

        repos = Repos.__new__(Repos)          # the clone now answers to its NEW name
        repos.clones = [("github.com/junghan0611/garden_v5", Path(tmp))]
        repos.dirs = {"github.com/junghan0611/garden_v5": Path(tmp)}

        found, ambiguous = resolve_shas(repos, [full[:7]])
        ok("a stamp written under the OLD name still finds the commit",
           found.get(full[:7]) == (full, "github.com/junghan0611/garden_v5"),
           "old name in the URL, current repo in the entity")
        ok("nothing is ambiguous here", not ambiguous)

        missing, _ = resolve_shas(repos, ["deadbee"])
        ok("a commit that is not on this disk stays unresolved, never invented",
           "deadbee" not in missing)

    ok("a commit URL yields (named repo, short sha)",
       commit_ref("x [[https://github.com/junghanacs/andenken/commit/68b10f2][68b10f2]]")
       == ("github.com/junghanacs/andenken", "68b10f2"))
    ok("a release stamp is not a commit stamp",
       commit_ref("v1 https://github.com/junghan0611/entwurf/releases/tag/v1") is None)


def test_the_operator_is_known_by_his_address_not_his_display_name():
    """A clone holds everyone's commits, so the author filter decides whose life this axis
    measures — and it was quietly dropping the operator's own.

    The display name is whatever a machine's gitconfig was set to that year: `junghan`,
    `Junghan Kim`, `Jung Han`, `mayor`, `정한` all sign real commits here. Matching the name
    alone lost 740 of them, 500 in 2026, and two whole days fell out of the axis. Adding
    `Jung Han` would recover 733/495 but still miss seven: `mayor` and `정한` share no substring with any
    spelling of the name — they are only recognizable by the address they were sent from.

    So this asserts the *rule*, not a list of spellings: a commit is his if the name OR the
    email says so, and a stranger's commit stays out. Revert `is_operator` to the name and
    the last three of these fail."""
    import subprocess
    import tempfile
    from collect import Repos, collect_git

    mine = [("Jung Han", "junghanacs@gmail.com", "the name with a space"),
            ("mayor", "31724164+junghan0611@users.noreply.github.com", "a nickname"),
            ("정한", "jhkim2@example.invalid", "the name in Korean")]
    with tempfile.TemporaryDirectory() as tmp:
        run = lambda *a: subprocess.run(["git", "-C", tmp, *a], capture_output=True,
                                        text=True, check=True)
        run("init", "-q", "-b", "main")
        run("commit", "-q", "--allow-empty", "-m", "plain junghan",
            "--author", "junghan <junghanacs@gmail.com>")
        for name, email, subject in mine:
            run("commit", "-q", "--allow-empty", "-m", subject,
                "--author", f"{name} <{email}>")
        run("commit", "-q", "--allow-empty", "-m", "somebody else's work",
            "--author", "Peter Steinberger <steipete@gmail.com>")

        repos = Repos.__new__(Repos)
        repos.clones = [("github.com/junghan0611/x", Path(tmp))]
        repos.domains, repos.unmapped = {}, set()
        src = collect.Source("git")
        frm, as_of = parse_kst("2000-01-01T00:00:00+09:00"), parse_kst(
            "2100-01-01T00:00:00+09:00")
        got = {e["title"] for e in collect_git(repos, frm, as_of, src)}

    ok("the log line still parses after the email was added to it",
       not src.rejected, f"rejected: {src.rejected[:2]}")
    ok("the plain spelling is still his", "plain junghan" in got)
    for _, _, subject in mine:
        ok(f"and so is {subject}", subject in got)
    ok("a stranger's commit stays out of his time axis",
       "somebody else's work" not in got)


def test_clones_that_disagree_about_a_prefix():
    """Two clones can expand the same 7-char prefix to two different commits. Taking the
    first one would be the same silent corruption as the name-based join, in a new hat."""
    from collect import merge_hits

    a, b = "github.com/o/a", "github.com/o/b"
    x = "45ac17609fc750d81c527fc9350d79057659d004"
    y = "45ac176ffffffffffffffffffffffffffffffff0"

    ok("one commit, mirrored in two clones, is still one commit",
       merge_hits([(a, x), (b, x)], False) == ("resolved", (x, a)),
       "first clone in sorted order names it — the same choice the git source makes")
    ok("two clones expanding one prefix to two commits is ambiguous, not a race",
       merge_hits([(a, x), (b, y)], False) == ("ambiguous", None))
    ok("a prefix nobody holds stays unresolved",
       merge_hits([], False) == ("unresolved", None))
    ok("git calling a prefix ambiguous inside one clone is still ambiguous",
       merge_hits([(a, x)], True) == ("ambiguous", None))


def test_tz_determinism():
    """The system clock's timezone must not touch a single byte."""
    def snapshot():
        return [
            parse_lastmod("[2026-07-12]"),
            parse_lastmod("[2026-07-12 Sun 14:30]"),
            parse_denote_id("20260712T143005"),
            normalize_git_ts("2026-07-12T20:00:00+00:00"),
            parse_agenda_ts("2026-07-12", "14:30"),
        ]

    before = os.environ.get("TZ")
    try:
        os.environ["TZ"] = "Asia/Seoul"
        time.tzset()
        seoul = snapshot()
        os.environ["TZ"] = "UTC"
        time.tzset()
        utc = snapshot()
        os.environ["TZ"] = "Pacific/Kiritimati"       # +14, the far edge
        time.tzset()
        far = snapshot()
    finally:
        if before is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = before
        time.tzset()
    ok("parsing is identical under Asia/Seoul, UTC and +14", seoul == utc == far)
    ok("KST is a fixed +09:00, with no DST to drift under",
       KST.utcoffset(datetime.now()) == timedelta(hours=9))


def test_query_never_reads_the_clock():
    """A query over a fixed FULL must return the same slice on any day, in any timezone.
    An earlier draft defaulted the upper bound to `date.today() + 1`, which quietly made
    the answer depend on when you asked."""
    import query

    class Args:
        day = month = frm = to = None

    inst = {"ts": "2030-01-01T00:00:00+09:00", "date_kst": "2030-01-01",
            "ts_precision": "second"}
    dayev = {"ts": None, "date_kst": "1999-12-31", "ts_precision": "day"}

    def unbounded_keeps_everything():
        frm, to = query.window(Args())
        return (frm, to) == (None, None) and all(
            query.within(e, frm, to) for e in (inst, dayev))

    before = os.environ.get("TZ")
    try:
        results = []
        for tz in ("Asia/Seoul", "UTC", "Pacific/Kiritimati"):
            os.environ["TZ"] = tz
            time.tzset()
            results.append(unbounded_keeps_everything())
    finally:
        if before is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = before
        time.tzset()
    ok("no range = the whole file, in any timezone — future and past events alike",
       all(results))

    src = Path(__file__).with_name("query.py").read_text()
    ok("query.py never calls date.today()", "date.today()" not in src)

    half = Args()
    half.frm = "2026-07-01"
    frm, to = query.window(half)
    ok("--from alone is open-ended upward",
       to is None and query.within(inst, frm, to)
       and not query.within(dayev, frm, to))


def test_sort_is_total():
    tp = parse_agenda_ts("2026-07-12", "14:30")
    day = {"date_kst": "2026-07-12", "ts": None, "ts_precision": "day", "event_id": "z"}
    inst = {"date_kst": "2026-07-12", "ts": tp["ts"], "ts_precision": "minute",
            "event_id": "a"}
    ok("a day sorts before the instants inside it",
       sorted([inst, day], key=sort_key)[0] is day)


def test_a_snapshot_can_name_itself():
    """Two machines, same code, same --as-of, different FULLs — one holds a clone the other
    lacks, one has a branch that was never pushed. Both are honest. The manifest therefore
    has to carry enough to tell them apart, or one will quietly stand in for the other."""
    a = [{"event_id": "1", "x": 1}, {"event_id": "2", "x": 2}]
    b = [{"event_id": "1", "x": 1}, {"event_id": "2", "x": 3}]     # one event differs
    body = lambda evs: "".join(json.dumps(e, sort_keys=True) + "\n" for e in evs)

    ok("the same events fingerprint the same",
       sha256(body(a).encode()) == sha256(body(a).encode()))
    ok("one differing event changes the fingerprint — a FULL cannot be swapped unnoticed",
       sha256(body(a).encode()) != sha256(body(b).encode()))
    ok("the machine names itself, and it is never blank",
       isinstance(device_name(), str) and device_name().strip() != "")


def test_the_registry_can_be_read_from_two_files():
    """The public table cannot name every repo. The FULL still has to see them, so the
    registry is read from a committed file and a gitignored one — and the run must say
    which, or a thinner FULL could pass for the same FULL."""
    import json as _json
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        pub, loc = Path(td) / "domains.json", Path(td) / "domains.local.json"
        pub.write_text(_json.dumps({"repos": {
            "github.com/me/open": {"domain": "garden", "layer": "product"},
            "github.com/me/both": {"domain": "unmapped", "layer": "unmapped"}}}))
        loc.write_text(_json.dumps({"repos": {
            "github.com/me/both": {"domain": "infra", "layer": "forge"},
            "github.com/client/secret": {"domain": "embedded", "layer": "product"}}}))

        only_public, used = load_registry([pub])
        ok("without the overlay the public table stands alone",
           set(only_public) == {"github.com/me/open", "github.com/me/both"})
        ok("and the manifest names the one registry it read", used == ["domains.json"])

        merged, used = load_registry([pub, loc])
        ok("a repo the public table cannot name still reaches the FULL",
           merged["github.com/client/secret"]["domain"] == "embedded")
        ok("the overlay wins where the two disagree",
           merged["github.com/me/both"]["domain"] == "infra")
        ok("the public entries survive untouched",
           merged["github.com/me/open"]["domain"] == "garden")
        ok("a FULL collected with the overlay cannot be mistaken for one without",
           used == ["domains.json", "domains.local.json"])

        loc.unlink()
        _, used = load_registry([pub, loc])
        ok("a missing overlay is simply absent, never an error",
           used == ["domains.json"])


def test_the_registry_reports_both_of_its_gaps():
    """domains.json is the list of repos this axis means to observe. It can disagree with
    the disk in two directions, and each means something different."""
    r = Repos.__new__(Repos)
    r.unmapped = set()
    r.dirs = {"github.com/a/here": "/repos/here", "github.com/a/stranger": "/repos/x"}
    r.domains = {"github.com/a/here": {"domain": "infra", "layer": "forge"},
                 "github.com/a/elsewhere": {"domain": "agent", "layer": "product"}}

    ok("a registered repo with no clone here is named — the work happened, this disk "
       "just cannot read it", r.uncloned() == ["github.com/a/elsewhere"])
    ok("a repo that is both registered and cloned is not a gap",
       "github.com/a/here" not in r.uncloned())
    ok("a cloned repo missing from the registry collects as unmapped, not as a guess",
       r.domain_layer("github.com/a/stranger") == ("unmapped", "unmapped"))
    ok("...and it is named, so a new repo cannot enter the axis unclassified and unseen",
       r.unregistered_clones() == ["github.com/a/stranger"])

    # A stamp can name a repo this disk does not hold. That forge id gets no domain either,
    # but it is not drift and it will not go away — so it must not sit in the alarm that is
    # supposed to read zero.
    r.domain_layer("github.com/a/only-ever-stamped")
    ok("a repo known only from a stamp does not raise the drift alarm",
       r.unregistered_clones() == ["github.com/a/stranger"])
    ok("...though it is still reported as having no domain",
       "github.com/a/only-ever-stamped" in r.unmapped)


# ------------------------------------------------- the FULL, and what it is worth citing

def _fake_event(source: str):
    """One well-formed event per source, so main()'s write path can be exercised without
    eight seconds of real disk."""
    if source == "timelog":
        return _event(source="timelog", entity_id="timelog:2026-07-13:수면",
                      time_kind="tracked", tp=collect._tp(None, "2026-07-13", "day"),
                      domain=None, layer=None, title="수면", tags=[], duration_min=514.0,
                      ref={"kind": "lifetract", "value": "read 2026-07-13"},
                      native_id="2026-07-13:수면", locator="lifetract read 2026-07-13")
    kind = {"git": "authored", "note": "created", "agenda": "stamped", "journal": "logged"}
    return _event(source=source, entity_id=f"{source}:x", time_kind=kind[source],
                  tp=collect._tp("2026-07-13T10:00:00+09:00", "2026-07-13", "second"),
                  domain=None, layer=None, title=f"a {source} thing", tags=[],
                  ref={"kind": "org", "value": f"{source}.org"}, native_id="x",
                  locator=f"{source}.org:12")


def run_collector(out: Path, dead: str | None):
    """collect.main() with the five sources stubbed. `dead` names the one that cannot be
    read — the whole point being what main() does with `--out` when that happens."""
    import contextlib
    import io

    class FakeRepos:
        registries: list = []
        unmapped: set = set()
        unregistered_clones = staticmethod(lambda: [])
        uncloned = staticmethod(lambda: [])

    def collector(name):
        def fn(repos, frm, as_of, src):
            if name == "agenda":
                src.unresolved_short = []
            if name == dead:
                src.unreadable(f"{name} could not be read")
                return []
            return [_fake_event(name)]
        return fn

    saved = {n: getattr(collect, f"collect_{n}") for n in
             ("git", "notes", "agenda", "journal", "timelog")}
    argv, repos_cls = sys.argv, collect.Repos
    try:
        for n, attr in (("git", "git"), ("note", "notes"), ("agenda", "agenda"),
                        ("journal", "journal"), ("timelog", "timelog")):
            setattr(collect, f"collect_{attr}", collector(n))
        collect.Repos = FakeRepos
        sys.argv = ["collect.py", "--as-of", "2026-07-14", "--out", str(out)]
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = collect.main()
        return rc, json.loads(buf.getvalue())
    finally:
        for n, fn in saved.items():
            setattr(collect, f"collect_{n}", fn)
        collect.Repos, sys.argv = repos_cls, argv


def test_a_failed_run_leaves_the_last_good_full_alone():
    """The collector used to write the events file first and check the sources afterwards,
    so a run with an unreadable lifetract still wrote a depth-0-less file over the FULL that
    was already there — and it did it at the one moment the loss could not be undone, since
    a FULL is only cheap to rebuild while the sources can still be read."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "events.jsonl"

        rc, snap = run_collector(out, dead=None)
        good = out.read_bytes()
        ok("a run with every source answering writes the FULL", rc == 0 and out.is_file())
        ok("and the manifest fingerprints exactly those bytes",
           snap["manifest"]["events_sha256"] == collect.sha256(good))

        rc, snap = run_collector(out, dead="timelog")
        ok("a run that could not read a source exits 2", rc == 2)
        ok("it does not overwrite the FULL that was there", out.read_bytes() == good)
        ok("and it still says what it saw and could not read",
           [s for s in snap["manifest"]["sources"]
            if s["name"] == "timelog"][0]["status"] == "unreadable")
        ok("no temp file is left behind",
           [p.name for p in Path(tmp).iterdir()] == ["events.jsonl"])

        missing = Path(tmp) / "never-written.jsonl"
        rc, _ = run_collector(missing, dead="timelog")
        ok("a partial FULL is not created where none existed", not missing.exists())


def test_a_full_replaces_its_predecessor_or_leaves_it_alone():
    """`write_text` truncates the file the moment it opens it, so a write that dies halfway
    — a full disk, a kill — leaves something that is neither the old FULL nor the new one,
    and nothing downstream can tell. The bytes go to a temp file in the same directory and
    arrive by rename, which the filesystem does whole or not at all.

    The witness has to be the *interrupted* write. `no temp file is left behind` passes just
    as happily against a plain `write_bytes` that never made one — a guard whose only test
    is satisfied by its own absence is not guarded."""
    import tempfile
    was_here = b'{"the FULL":"that was already here"}\n'
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "events.jsonl"
        out.write_bytes(was_here)

        def full_disk(*a):
            raise OSError("no space left on device")

        real, crashed = os.replace, False
        try:
            os.replace = full_disk
            try:
                collect.write_atomic(out, b'{"the new one":true}\n')
            except OSError:
                crashed = True
        finally:
            os.replace = real

        ok("a write that could not land is a write that did not happen", crashed)
        ok("the FULL that was there is byte-for-byte what it was", out.read_bytes() == was_here)
        ok("and the half-written bytes are not lying around",
           [p.name for p in Path(tmp).iterdir()] == ["events.jsonl"])


def test_the_fingerprint_answers_the_question_it_is_asked():
    """Two hashes, because a reader asks two questions and one hash cannot answer both.

    `events_sha256` covers the bytes — reproduce this run on this disk. `content_sha256`
    covers the observation — is this still the same day being described? They came apart
    when `provenance.locator` started carrying a line number: the agenda is a reverse
    datetree, so one new stamp pushes every older line down and the byte fingerprint of
    28,662 unchanged events moves. It happened three times in one afternoon."""
    evs = [_fake_event(s) for s in ("git", "note", "agenda", "journal", "timelog")]
    base_events = collect.sha256(collect.events_bytes(evs))
    base_content = collect.sha256(collect.content_bytes(evs))

    shifted = [dict(e) for e in evs]
    for e in shifted:                                  # a stamp lands; every line moves down
        p = dict(e["provenance"])
        p["locator"] = p["locator"].replace(":12", ":16")
        e["provenance"] = p
    ok("a line shift moves the byte fingerprint",
       collect.sha256(collect.events_bytes(shifted)) != base_events)
    ok("...and leaves the content fingerprint exactly where it was",
       collect.sha256(collect.content_bytes(shifted)) == base_content)

    moved = [dict(e) for e in evs]                     # the same commit, read from elsewhere
    for e in moved:
        p = dict(e["provenance"])
        p["locator"] = "/somewhere/else/" + p["locator"]
        e["provenance"] = p
    ok("a clone read from another path is the same observation",
       collect.sha256(collect.content_bytes(moved)) == base_content)

    # And the reason a citation cannot be `content_sha256` alone. The collector's version
    # rides in `provenance`, so bumping it moves the bytes and leaves the content where it
    # was — which is right (the observations did not change), and is exactly why the reader
    # has to be handed `code_sha256`, `as_of` and the source statuses alongside the content
    # hash. The content hash answers "the same day?", never "collected by what, and when?".
    rebuilt = [dict(e) for e in evs]
    for e in rebuilt:
        p = dict(e["provenance"])
        p["collector_version"] = "99.0.0"
        e["provenance"] = p
    ok("a new collector version moves the byte fingerprint",
       collect.sha256(collect.events_bytes(rebuilt)) != base_events)
    ok("...and not the content one — so cite the code_sha256 too, never the content alone",
       collect.sha256(collect.content_bytes(rebuilt)) == base_content)

    for label, mutate in (
            ("a title", lambda e: e.update(title="something else")),
            ("a duration", lambda e: e.update(duration_min=(e["duration_min"] or 0) + 1)),
            ("a domain", lambda e: e.update(domain="elsewhere")),
            ("a ref", lambda e: e.update(ref={"kind": "org", "value": "other.org"})),
            ("a day", lambda e: e.update(date_kst="2099-01-01"))):
        changed = [dict(e) for e in evs]
        mutate(changed[0])
        ok(f"but {label} changing does change the content fingerprint",
           collect.sha256(collect.content_bytes(changed)) != base_content)


def test_a_journal_ref_carries_no_line_number():
    """The line lives in the locator, where the content hash cannot see it. It used to live
    in the ref as well — `file::18` — so inserting one line into an old journal re-minted
    the fingerprint of an observation nobody had touched. Identity never needed it: a
    heading is `(file, stable title, time, occurrence)`."""
    events, _ = journal_events()
    refs = [e["ref"]["value"] for e in events]
    ok("the ref names the file and stops", all("::" not in r for r in refs), refs[0])
    ok("the line is still on record, in the locator",
       all(re.fullmatch(r".+\.org:\d+", e["provenance"]["locator"]) for e in events))
    ok("and it is kept out of the content the axis fingerprints",
       all("provenance" not in json.loads(line)
           for line in collect.content_bytes(events).decode().splitlines()))


def test_the_time_log_comment_never_reaches_the_axis():
    """150 time blocks carry a comment naming who was there — a family member, a place.
    The collector does not open the database, so it cannot read them; but the guard against
    *that* is a guard on the mechanism, and this one is on the outcome. Hand the collector a
    lifetract that volunteers a comment and no part of it may survive into an event.

    The category names are deliberately NOT checked against a list. That taxonomy belongs to
    lifetract, and a timeline holding an allowlist of it would turn this axis into the thing
    a new category has to ask permission from."""
    import tempfile
    sentinel = "PRIVATE-SENTINEL-누구와-어디서"
    payload = ('[{"date": "2026-07-12", "categories": ['
               f'{{"name": "가족", "minutes": 611.6, "comment": "{sentinel}"}},'
               f'{{"name": "새범주", "minutes": 30, "note": "{sentinel}"}}]}}]')
    with tempfile.TemporaryDirectory() as tmp:
        tool = Path(tmp) / "lifetract"
        tool.write_text('#!/bin/sh\nif [ "$1" = "status" ]; then\n'
                        '  echo \'{"database": {"last_time_block": "2026-07-13"}}\'\n'
                        '  exit 0\nfi\ncat <<\'JSON\'\n' + payload + '\nJSON\n')
        tool.chmod(0o755)
        events, src = timelog_events(str(tool))

    ok("a category the axis has never heard of still lands", len(events) == 2)
    ok("no event carries a comment key",
       not [e for e in events if "comment" in e or "comment" in (e["ref"] or {})])
    ok("and the sentinel is nowhere in the bytes the axis writes",
       sentinel not in collect.events_bytes(events).decode())


def test_the_viewer_refuses_a_snapshot_it_did_not_draw():
    """Hand the viewer a good FULL and the manifest of a *different*, failed run and it drew
    the page anyway — stamping the other run's fingerprint, the other run's event count, and
    `timelog: unreadable` over a depth-0 lane it had just painted. The collector refuses to
    name a provenance it cannot vouch for; the viewer was doing exactly what the collector
    refuses."""
    import tempfile
    sys.path.insert(0, str(Path(__file__).parent))
    import view

    evs = [_fake_event(s) for s in ("git", "note", "agenda", "journal", "timelog")]
    raw = collect.events_bytes(evs)
    good = {"manifest": {"schema_version": "1", "as_of": "2026-07-14T00:00:00+09:00",
                         "events_sha256": collect.sha256(raw),
                         "content_sha256": collect.sha256(collect.content_bytes(evs)),
                         "counts": {"events": len(evs)},
                         "sources": [{"name": n, "status": "ok"} for n in
                                     ("git", "note", "agenda", "journal", "timelog")]}}
    ok("a page may be stamped with the snapshot of the FULL it drew",
       view.verify(raw, evs, good) == [])

    def refuses(snapshot, because: str) -> bool:
        return any(because in e for e in view.verify(raw, evs, snapshot))

    other = json.loads(json.dumps(good))
    other["manifest"]["events_sha256"] = "0" * 64
    ok("not with a fingerprint of some other FULL", refuses(other, "not the ones"))

    miscounted = json.loads(json.dumps(good))
    miscounted["manifest"]["counts"]["events"] = 20262
    ok("not with a count that is not this file's", refuses(miscounted, "counts 20262"))

    dead = json.loads(json.dumps(good))
    dead["manifest"]["sources"][4]["status"] = "unreadable"
    ok("and not with a snapshot that is not a FULL at all",
       refuses(dead, "not a FULL: timelog unreadable"))

    # Both assertions belong INSIDE the directory. Outside it, `not out.exists()` is true
    # because the directory is gone — the witness for "no page was written" was passing on
    # a page that had been written and then deleted with the tmpdir. A test that its own
    # teardown satisfies is not a test, and the revert audit said so: pulling `verify()` out
    # of main() broke exactly one assertion, when it should have broken two.
    with tempfile.TemporaryDirectory() as tmp:
        ev_file, snap_file = Path(tmp) / "events.jsonl", Path(tmp) / "snapshot.json"
        out = Path(tmp) / "axis.html"
        ev_file.write_bytes(raw)
        snap_file.write_text(json.dumps(other))
        argv = sys.argv
        try:
            sys.argv = ["view.py", str(ev_file), "--snapshot", str(snap_file),
                        "--out", str(out)]
            rc = view.main()
        finally:
            sys.argv = argv
        ok("a refused pair exits non-zero", rc == 2)
        ok("and no page is written at all", not out.exists())


def test_a_malformed_snapshot_is_refused_not_crashed_on():
    """The viewer must not believe a snapshot about its own shape. `sources: {}` sailed
    through — nothing to iterate, so nothing was unreadable, so the pair looked fine — and
    `sources: ["bad"]` died with an AttributeError. A crash is not a refusal: it says the
    viewer was reading a snapshot it had already failed to understand."""
    sys.path.insert(0, str(Path(__file__).parent))
    import view

    evs = [_fake_event(s) for s in ("git", "note", "agenda", "journal", "timelog")]
    raw = collect.events_bytes(evs)
    good = {"schema_version": "1", "as_of": "2026-07-14T00:00:00+09:00",
            "events_sha256": collect.sha256(raw),
            "content_sha256": collect.sha256(collect.content_bytes(evs)),
            "counts": {"events": len(evs)},
            "sources": [{"name": n, "status": "ok"} for n in
                        ("git", "note", "agenda", "journal", "timelog")]}
    ok("a well-formed FULL is accepted", view.verify(raw, evs, {"manifest": good}) == [])

    for label, m in (
            ("no manifest at all", None),
            ("a manifest that is a string", "manifest"),
            ("sources as an empty object", {**good, "sources": {}}),
            ("sources as a list of strings", {**good, "sources": ["bad"]}),
            # Not iterable at all. These are the ones that make the type check load-bearing:
            # without it the row check walks straight into a TypeError, and a crash is not a
            # refusal. Leave them out and the guard has no witness — the revert audit caught
            # exactly that.
            ("sources that are nothing", {**good, "sources": None}),
            ("sources that are a number", {**good, "sources": 5}),
            ("sources missing from the manifest", {k: v for k, v in good.items()
                                                   if k != "sources"}),
            ("a source row with no status", {**good, "sources": [{"name": "git"}]}),
            ("a status nobody defined", {**good, "sources": [{"name": "git",
                                                              "status": "fine"}]}),
            ("a depth missing entirely", {**good, "sources": good["sources"][:4]}),
            ("a schema this viewer cannot read", {**good, "schema_version": "99"}),
            ("an as_of that is not an instant", {**good, "as_of": "어제"}),
            ("an as_of with no timezone", {**good, "as_of": "2026-07-14T00:00:00"}),
            # The axis cuts its days at +09:00. A bound in another zone is another midnight,
            # so having *a* timezone was never the question — having this one is.
            ("an as_of in UTC", {**good, "as_of": "2026-07-14T00:00:00+00:00"}),
            ("an as_of in some other zone", {**good, "as_of": "2026-07-14T00:00:00+05:30"}),
            # Exactly five, once each. A roster with a stranger on it, or with `git` on it
            # twice under two statuses, is not this axis's roster — and "is any source
            # unreadable" then asks the wrong list.
            ("a source this axis does not collect",
             {**good, "sources": good["sources"] + [{"name": "zotero", "status": "ok"}]}),
            ("a source named twice",
             {**good, "sources": good["sources"] + [{"name": "git", "status": "empty"}]}),
            ("a fingerprint that is not a hash", {**good, "events_sha256": 123}),
            ("a content hash that is not a hash", {**good, "content_sha256": "nope"}),
            ("counts that are not counts", {**good, "counts": "many"}),
            ("a negative count", {**good, "counts": {"events": -1}}),
            ("a count that is a bool", {**good, "counts": {"events": True}})):
        snapshot = {"manifest": m} if m is not None else {}
        try:
            errs = view.verify(raw, evs, snapshot)
            ok(f"REFUSED: {label}", bool(errs), (errs or ["accepted it"])[0][:60])
        except Exception as exc:                                   # noqa: BLE001
            ok(f"REFUSED: {label}", False, f"crashed instead: {type(exc).__name__}")


def test_the_quiet_day_stays_quiet_when_the_screen_is_filtered():
    """The one judgement the page makes is `quiet`: the residue is silent and the life is
    not. It is a fact about the day. It used to be re-derived in the browser from whatever
    the domain filter had left — and depth 0 carries no domain, so picking any domain emptied
    the depth-0 lane and 2026-02-07 stopped being quiet: gold marker gone, explanation gone,
    `잔여물 침묵 0일` in the status bar. The day had not changed. So the predicate is computed
    once, in Python, over every event, and the page only reads the flag."""
    sys.path.insert(0, str(Path(__file__).parent))
    import view

    lived = _fake_event("timelog")                     # depth 0: 611 minutes, no domain
    lived["date_kst"] = "2026-02-07"
    worked = _fake_event("git")                        # depth 3, on another day, in a domain
    worked["domain"] = "agent"
    rows = {d["d"]: d for d in view.grid([lived, worked])}

    ok("the day with only a life on it is quiet", rows["2026-02-07"].get("q") is True)
    ok("the day with residue on it is not", rows["2026-07-13"].get("q") is False)
    ok("the flag travels with the day, not with the filter",
       "q" in rows["2026-02-07"] and view.is_quiet(rows["2026-02-07"]["n"]))
    ok("the days between are drawn, empty, and not quiet — an absent day is a visible gap",
       len(rows) == 157 and not any(rows[d].get("q") for d in rows if d not in
                                    ("2026-02-07", "2026-07-13")))
    # The page must read the flag rather than recompute it from the filtered counts.
    ok("the page reads the flag it was given", "const isQuiet = d => d.q;" in view.HTML)


def test_a_title_cannot_close_the_script_tag():
    """A title is free text the operator wrote. `fix: escape </script> in the template` is a
    commit message someone will write, and it would close the tag carrying the data and drop
    the rest of the page into the document as markup. The side panel already knew titles are
    data (`textContent`, never markup); the hole was the channel that carries them there."""
    sys.path.insert(0, str(Path(__file__).parent))
    import view

    evs = [_fake_event("git")]
    evs[0]["title"] = "fix: escape </script><h1>pwned</h1> in the template"
    html = view.build(evs, None)
    ok("the data cannot close the script tag it rides in", html.count("</script>") == 1)
    ok("no injected markup lands in the document", "<h1>pwned</h1>" not in html)
    ok("and the title is still carried, escaped", "\\u003c/script" in html)


def refuses(fn) -> bool:
    """The collector rejects a record with `Reject`; a consumer refuses a whole FULL by
    leaving, and says why on stderr. `raises` above only knows the first kind."""
    import contextlib
    import io

    try:
        with contextlib.redirect_stderr(io.StringIO()):
            fn()
    except SystemExit as e:
        return e.code == 2
    return False


def _projection_pair(evs: list[dict]) -> tuple[bytes, dict]:
    """A FULL and the snapshot that describes it, in the shape `project.py` reads: the pair
    fingerprint the viewer checks, plus the citation fields the projection prints."""
    raw = collect.events_bytes(evs)
    names = ("git", "note", "agenda", "journal", "timelog")
    sources = [{"name": n, "status": "ok", "accepted": sum(e["source"] == n for e in evs),
                "rejected": 0, "errors": []} for n in names]
    sources[-1]["tool"] = {"repo": "lifetract", "src_tree": "b" * 40,
                           "vcs_revision": "c" * 40, "sha256": "d" * 64}
    return raw, {"manifest": {
        "schema_version": "1", "as_of": "2026-07-14T00:00:00+09:00",
        "collector_version": collect.COLLECTOR_VERSION,
        "events_sha256": collect.sha256(raw),
        "content_sha256": collect.sha256(collect.content_bytes(evs)),
        "code_sha256": "a" * 64,
        "counts": {"events": len(evs), "entities": len({e["entity_id"] for e in evs})},
        "sources": sources}}


def _write_pair(tmp: Path, evs: list[dict]) -> tuple[str, str]:
    raw, snap = _projection_pair(evs)
    (tmp / "events.jsonl").write_bytes(raw)
    (tmp / "snapshot.json").write_text(json.dumps(snap))
    return str(tmp / "events.jsonl"), str(tmp / "snapshot.json")


def test_the_projection_refuses_a_pair_it_cannot_verify():
    """The one file allowed to leave this disk is the one that must be surest of what it is
    describing. Verification is not re-derived here — `view.verify` owns the pair contract —
    and a refusal writes nothing: a projection that half-wrote a public page before noticing
    the snapshot was not its own would publish numbers nobody can trace."""
    import tempfile
    sys.path.insert(0, str(Path(__file__).parent))
    import project

    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        evs = [_fake_event(s) for s in ("git", "note", "agenda", "journal", "timelog")]
        ev_file, snap_file = _write_pair(tmp, evs)
        out = tmp / "projection.md"

        # The events say one thing; the snapshot fingerprints another.
        snapshot = json.loads(Path(snap_file).read_text())
        snapshot["manifest"]["events_sha256"] = "0" * 64
        Path(snap_file).write_text(json.dumps(snapshot))
        ok("a projection of a FULL the snapshot does not fingerprint is refused",
           refuses(lambda: project.read(ev_file, snap_file)))
        ok("and nothing is written on the way out", not out.exists())

        # An unreadable source is not a FULL, and a partial axis may not be published as one.
        snapshot["manifest"]["events_sha256"] = collect.sha256(Path(ev_file).read_bytes())
        snapshot["manifest"]["sources"][0]["status"] = "unreadable"
        Path(snap_file).write_text(json.dumps(snapshot))
        ok("a snapshot with a dead source cannot be projected",
           refuses(lambda: project.read(ev_file, snap_file)))


def test_no_title_ref_or_locator_reaches_the_projection():
    """The FULL is local because it carries what the operator wrote and where it was read
    from. The projection is public because it carries neither. That is not a filter applied
    at the end — the aggregator never holds a commit message, a note title, a journal
    heading, or a locator, so there is nothing to forget to strip. The one title that does
    leave is depth 0's, and there it is a lifetract category (`수면`), which is the thing the
    axis is arguing with."""
    import tempfile
    sys.path.insert(0, str(Path(__file__).parent))
    import project

    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        evs = [_fake_event(s) for s in ("git", "note", "agenda", "journal", "timelog")]
        for e in evs:
            if e["source"] != "timelog":
                e["title"] = f"SECRET-{e['source']}-title"
                e["ref"] = {"kind": "org", "value": f"SECRET-{e['source']}.org"}
                e["provenance"]["locator"] = f"SECRET-{e['source']}.org:42"
        ev_file, snap_file = _write_pair(tmp, evs)
        events, snapshot = project.read(ev_file, snap_file)
        agg = project.aggregate(events, date(2026, 1, 1), date(2026, 7, 14))
        text = "\n".join(project.body(agg, snapshot["manifest"], "md")
                         + project.body(agg, snapshot["manifest"], "org"))

    ok("no title the operator wrote leaves in the projection", "SECRET" not in text)
    ok("no ref and no locator leave either",
       ".org" not in text and ":42" not in text)
    ok("the depth-0 category does leave — it is what the axis argues with", "수면" in text)


def test_the_quiet_day_is_found_in_the_data_not_written_into_the_code():
    """2026-02-07 is in the output because the data puts it there. A projection that named
    its own golden days would keep saying them after they stopped being true — which is the
    exact failure this axis exists to expose, committed by the thing that exposes it."""
    import tempfile
    sys.path.insert(0, str(Path(__file__).parent))
    import project

    lived = _fake_event("timelog")                 # depth 0 only: a day with no residue
    lived["date_kst"] = "2026-02-07"
    lived["entity_id"] = "timelog:2026-02-07:수면"
    worked = _fake_event("git")                    # depth 3 on another day
    with tempfile.TemporaryDirectory() as d:
        ev_file, snap_file = _write_pair(Path(d), [lived, worked])
        events, snapshot = project.read(ev_file, snap_file)
        agg = project.aggregate(events, date(2026, 1, 1), date(2026, 7, 14))
        text = "\n".join(project.body(agg, snapshot["manifest"], "md"))

    ok("the day that was lived and left nothing behind is named", agg["quiet"] == ["2026-02-07"])
    ok("the day with residue on it is not quiet", "2026-07-13" not in agg["quiet"])
    ok("and it reaches the page with its blocks", "2026-02-07" in text and "514.0분" in text)
    ok("the lens that reads only residue loses exactly that day",
       agg["seen"][(2, 3)] == 1 and agg["seen"][(0, 1, 2, 3)] == 2)
    src = (Path(__file__).parent / "project.py").read_text()
    ok("no golden date is written into the projector",
       not re.search(r"20\d\d-\d\d-\d\d", src))


def test_the_projection_does_not_move_when_the_shell_does():
    """Same input, same bytes — including from a machine whose clock and zone disagree with
    the axis. The window comes off the manifest's `as_of`, never off today's date: a
    projection rebuilt in December still describes the FULL it was handed."""
    import tempfile
    sys.path.insert(0, str(Path(__file__).parent))
    import project

    def render() -> str:
        with tempfile.TemporaryDirectory() as d:
            evs = [_fake_event(s) for s in ("git", "note", "agenda", "journal", "timelog")]
            ev_file, snap_file = _write_pair(Path(d), evs)
            events, snapshot = project.read(ev_file, snap_file)
            agg = project.aggregate(events, date(2026, 1, 1), date(2026, 7, 14))
            return "\n".join(project.body(agg, snapshot["manifest"], "md"))

    before = os.environ.get("TZ")
    try:
        os.environ["TZ"] = "Asia/Seoul"
        time.tzset()
        seoul = render()
        os.environ["TZ"] = "Pacific/Kiritimati"
        time.tzset()
        kiritimati = render()
    finally:
        if before is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = before
        time.tzset()

    ok("the public reading is the same bytes twice", render() == seoul)
    ok("and the shell's timezone does not change what it says", seoul == kiritimati)


def test_the_viewer_and_the_projection_judge_a_day_the_same_way():
    """One definition of `quiet`, imported. The viewer used to keep its own copy — and two
    copies of the one judgement this axis makes is two axes, with nobody watching the day
    they disagree."""
    sys.path.insert(0, str(Path(__file__).parent))
    import project
    import view

    ok("the viewer reads the predicate the projection owns", view.is_quiet is project.is_quiet)
    ok("and the depth map too", view.DEPTH is project.DEPTH)


def main() -> int:
    for t in (test_time, test_range, test_identity, test_ambiguity_is_rejected,
              test_agenda_occurrence, test_stamp_identity_ignores_the_query_window,
              test_journal_reads_the_lane_the_agenda_shows,
              test_journal_identity_holds_still_while_the_heading_moves,
              test_journal_has_no_domain,
              test_depth_zero_is_a_span_not_a_moment,
              test_a_missing_skill_is_a_hole_not_a_zero,
              test_the_collector_does_not_own_the_time_log,
              test_the_child_is_told_which_zone_this_axis_lives_in,
              test_a_source_that_gave_nothing_is_not_ok,
              test_a_lagging_depth_zero_that_misses_a_lived_day_is_stale,
              test_depth_zero_lagging_a_day_nobody_lived_is_not_stale,
              test_a_skill_that_cannot_say_its_reach_says_that_much,
              test_a_time_log_that_answers_null_is_not_an_empty_one,
              test_a_snapshot_names_the_build_that_produced_depth_zero,
              test_remote_identity, test_a_commit_is_found_by_sha_not_by_name,
              test_the_operator_is_known_by_his_address_not_his_display_name,
              test_clones_that_disagree_about_a_prefix, test_tz_determinism,
              test_query_never_reads_the_clock, test_sort_is_total,
              test_a_snapshot_can_name_itself,
              test_the_registry_can_be_read_from_two_files,
              test_the_registry_reports_both_of_its_gaps,
              test_a_failed_run_leaves_the_last_good_full_alone,
              test_a_full_replaces_its_predecessor_or_leaves_it_alone,
              test_the_fingerprint_answers_the_question_it_is_asked,
              test_a_journal_ref_carries_no_line_number,
              test_the_time_log_comment_never_reaches_the_axis,
              test_the_viewer_refuses_a_snapshot_it_did_not_draw,
              test_a_malformed_snapshot_is_refused_not_crashed_on,
              test_the_quiet_day_stays_quiet_when_the_screen_is_filtered,
              test_a_title_cannot_close_the_script_tag,
              test_the_projection_refuses_a_pair_it_cannot_verify,
              test_no_title_ref_or_locator_reaches_the_projection,
              test_the_quiet_day_is_found_in_the_data_not_written_into_the_code,
              test_the_projection_does_not_move_when_the_shell_does,
              test_the_viewer_and_the_projection_judge_a_day_the_same_way):
        print(f"\n{t.__name__}")
        t()
    print()
    if FAILED:
        print(f"FAILED {len(FAILED)}: {', '.join(FAILED)}")
        return 1
    print("all green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
