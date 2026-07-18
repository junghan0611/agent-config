#!/usr/bin/env python3
"""timeline/collect.py — read the existing surfaces, emit the LOCAL FULL event log.

    python3 timeline/collect.py --out events.jsonl

Five sources, no network, nothing invented — read at four depths of the same day:
git repos under ~/repos and Denote notes under ~/org (depth 3), the agent agenda under
~/org/botlog/agenda (2), the operator's own journal headings (1), and the time blocks he
logs by hand, read through the `lifetract` skill rather than parsed here (0).

This is the LOCAL FULL. Titles and refs are kept exactly as they read on this machine.
What may be published is a separate and *later* question that deliberately does not live
here: a collector that decides what to hide is a wall, and the point of this axis is to
open one.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

SCHEMA_VERSION = "1"
# 0.6.0 changed who counts as the operator: the author is matched by name OR email, where
# 0.5.0 matched the name alone and silently dropped 740 of his own commits (500 in 2026).
# Two FULLs that disagree by 500 commits in 2026 must not both call themselves 0.5.0 — a reader comparing
# them would see a man who suddenly started committing more, not a collector that started
# recognizing him. The version is where that difference is declared.
#
# 0.7.0 changes what a FULL *is*, in three ways a reader has to be able to tell apart:
# a journal `ref` no longer carries the line number it was read at, so the same heading has
# different bytes than it did under 0.6.0; the manifest carries a second fingerprint
# (`content_sha256`); and a run that could not read a source no longer writes `--out` at all.
# The event shape did not change, so `SCHEMA_VERSION` stays 1 — a 0.6.0 FULL still parses.
COLLECTOR_VERSION = "0.7.0"

# The sources, in depth order: 0 the life as lived, 1 the operator's own marks, 2 the
# agents' traces, 3 the detail. `query.py` reads this list rather than keeping its own —
# a second copy went stale the moment a source was added, and `--source journal` was
# rejected by a filter that had never heard of it.
SOURCES = ("timelog", "journal", "agenda", "note", "git")

HOME = Path.home()
ORG = HOME / "org"
AGENDA_DIR = ORG / "botlog/agenda"
ROOTS = [HOME / "repos/gh", HOME / "repos/work"]
DOMAINS_FILE = Path(__file__).parent / "domains.json"
DOMAINS_LOCAL = Path(__file__).parent / "domains.local.json"   # gitignored; see load_registry

# Where the skill deploy leaves its record of what it built, and the binary that record is
# about. Both belong to `agent-config`, not to this repo — we read them, never write them.
DEPLOYED_LIFETRACT = HOME / ".claude/skills/lifetract/lifetract"
PROVENANCE = HOME / ".claude/skills/.provenance.json"

KST = timezone(timedelta(hours=9), "KST")

# Whose commits are the operator's. Matched against the author's name AND email, because
# the name is a display string that every machine's gitconfig writes its own way —
# `junghan`, `Junghan Kim`, `Jung Han`, `junghanacs`, `mayor`, `정한` all appear in this
# history — while the email is the identity git actually carries. Matching the name alone
# dropped 740 commits (500 in 2026, two whole days of the axis). Adding `Jung Han` would
# recover 733/495 of them but still miss `mayor` and `정한`: those commits are only
# recognizable by their address. On this disk these two keys match 19 distinct name/email
# pairs and nothing that is not the operator.
AUTHORS = ("junghan", "jhkim2")

log = lambda *a: print(*a, file=sys.stderr)  # noqa: E731


def _sh(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True).stdout


# ---------------------------------------------------------------------------- time


class Reject(Exception):
    """A record that cannot be honestly normalized. Recorded, never coerced."""

    def __init__(self, reason: str, value: object = None):
        super().__init__(reason)
        self.reason, self.value = reason, value


def _tp(ts: str | None, date_kst: str, precision: str) -> dict:
    """A time point is a tagged union, not a datetime with a quality flag. An event known
    only to its day has NO instant — writing 00:00 would fabricate a coordinate that a
    naive consumer reads as fact."""
    return {"ts": ts, "date_kst": date_kst, "ts_precision": precision}


_LASTMOD_FORMS = [
    (re.compile(r"^\[(\d{4})-(\d{2})-(\d{2}) \w{3} (\d{2}):(\d{2})\]$"), "minute"),
    (re.compile(r"^<(\d{4})-(\d{2})-(\d{2}) \w{3} (\d{2}):(\d{2})>$"), "minute"),
    (re.compile(r"^Time-stamp:\s*<(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})"),
     "second"),
    (re.compile(r"^\[(\d{4})-(\d{2})-(\d{2})(?: \w{3})?\]$"), "day"),
]


def parse_lastmod(raw: str) -> dict:
    """`#+hugo_lastmod` -> time point. Roughly half of them carry no time of day."""
    v = raw.strip()
    for pat, precision in _LASTMOD_FORMS:
        m = pat.match(v)
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        d = date(g[0], g[1], g[2]).isoformat()
        if precision == "day":
            return _tp(None, d, "day")
        return _tp(datetime(*g, tzinfo=KST).isoformat(), d, precision)
    raise Reject("unparseable_lastmod", raw)


def parse_denote_id(ident: str) -> dict:
    """The creation coordinate the Denote identifier records — not a certified fact
    about when the thought began. Files move; identifiers get reused."""
    m = re.fullmatch(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})", ident)
    if not m:
        raise Reject("bad_denote_identifier", ident)
    dt = datetime(*[int(x) for x in m.groups()], tzinfo=KST)
    return _tp(dt.isoformat(), dt.date().isoformat(), "second")


def parse_agenda_ts(day: str, hhmm: str) -> dict:
    y, mo, d = (int(x) for x in day.split("-"))
    h, mi = (int(x) for x in hhmm.split(":"))
    dt = datetime(y, mo, d, h, mi, tzinfo=KST)
    return _tp(dt.isoformat(), dt.date().isoformat(), "minute")


def normalize_git_ts(iso: str) -> dict:
    """The author timestamp exactly as the commit records it — a coordinate carried by
    the evidence, not a certification (an author date can be set). Offset-aware:
    convert, never assume. Hundreds of commits carry +0000, and a +0000 commit at 23:30
    belongs to the NEXT day in Seoul."""
    dt = datetime.fromisoformat(iso)
    if dt.tzinfo is None:
        raise Reject("naive_git_timestamp", iso)
    dt = dt.astimezone(KST)
    return _tp(dt.isoformat(), dt.date().isoformat(), "second")


def parse_kst(ts: str) -> datetime:
    """Parse and *check* the offset. A regex suffix test is not a parse."""
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None or dt.utcoffset() != timedelta(hours=9):
        raise Reject("not_kst_offset", ts)
    return dt


def in_range(tp: dict, frm: datetime, as_of: datetime) -> bool:
    """Half-open [from, as_of) in KST. A day event has no instant, so it belongs to the
    window only when its whole day lies inside — the partial final day is excluded
    rather than guessed at."""
    if tp["ts_precision"] == "day":
        return frm.date() <= date.fromisoformat(tp["date_kst"]) < as_of.date()
    return frm <= parse_kst(tp["ts"]) < as_of


def sort_key(ev: dict) -> tuple:
    """Total order, so two runs cannot disagree. A day event sorts before the instants
    of the same day: it is the day, not a moment in it."""
    return (ev["date_kst"], 0 if ev["ts_precision"] == "day" else 1,
            ev["ts"] or "", ev["event_id"])


# ------------------------------------------------------------------------ identity


def time_component(tp: dict) -> str:
    return f"date:{tp['date_kst']}" if tp["ts_precision"] == "day" else tp["ts"]


def make_event_id(source: str, entity_id: str, time_kind: str, tp: dict,
                  native_id: str = "") -> str:
    key = (f"v{SCHEMA_VERSION}\x1f{source}\x1f{entity_id}\x1f{time_kind}"
           f"\x1f{time_component(tp)}\x1f{native_id}")
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def _h(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()[:16]


_SSH_REMOTE = re.compile(r"^(?:ssh://)?git@([^:/]+)[:/](.+)$")
_URL_REMOTE = re.compile(r"^[a-z+]+://(?:[^@/]+@)?([^/]+)/(.+)$")


def forge_id_from_remote(url: str) -> str | None:
    """`git@github.com:owner/repo.git` -> `github.com/owner/repo`. A folder name is not
    a repo name — `notes/` on disk is `notes.junghanacs.com` on the forge — so identity
    comes from the remote and never from the path."""
    url = url.strip().removesuffix(".git")
    m = _SSH_REMOTE.match(url) or _URL_REMOTE.match(url)
    if not m:
        return None
    host = re.sub(r"^github-[a-z]+\.com$", "github.com", m.group(1))
    parts = [p for p in m.group(2).split("/") if p]
    if len(parts) < 2:
        return None
    return f"{host}/{parts[-2]}/{parts[-1]}"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def events_bytes(events: list[dict]) -> bytes:
    """Exactly the bytes that land in `--out`. `events_sha256` covers these."""
    return "".join(json.dumps(e, ensure_ascii=False, sort_keys=True) + "\n"
                   for e in events).encode()


def content_bytes(events: list[dict]) -> bytes:
    """The same events with `provenance` dropped. `content_sha256` covers these.

    Two fingerprints because a reader asks two different questions, and one hash cannot
    answer both. `events_sha256` answers *are these the same bytes* — it is what makes a
    run reproducible on this disk, and it must cover everything written. But a citation
    asks something else: *is this still the same observation?* Those came apart the moment
    `provenance.locator` started carrying a line number. The agenda is a reverse datetree,
    so one new stamp pushes every older line down; on the afternoon this was written the
    same 28,662 events, unchanged, produced three different `events_sha256` in half an hour
    while nothing about the day being described had moved. A citation that dies whenever
    the operator stamps an agenda is not a citation.

    So `content_sha256` drops `provenance` — the whole of it, no field-by-field exceptions:

    - `adapter` is `source` (0 of 28,662 events disagree),
    - `collector_version` is in the manifest,
    - `native_id` is already hashed into `event_id`, which stays in the content,
    - `locator` is *where this was read on this disk* — a line number, an absolute clone
      path — and none of it is a claim about what happened.

    Nothing else may smuggle a location in. `ref` used to: the journal wrote `file::18`, so
    inserting one line into an old journal changed the fingerprint of an observation nobody
    had touched. That was fixed at the source rather than exempted here, and it must stay
    fixed — the day this hash needs a per-source exception is the day it starts lying about
    what it covers."""
    return "".join(json.dumps({k: v for k, v in e.items() if k != "provenance"},
                              ensure_ascii=False, sort_keys=True) + "\n"
                   for e in events).encode()


def write_atomic(path: Path, data: bytes) -> None:
    """Replace the FULL, or leave the old one alone. Never a half of each.

    `write_text` truncates the moment it opens, so a run that dies mid-write leaves a file
    that is neither the old FULL nor the new one — and nothing downstream can tell."""
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        tmp.write_bytes(data)
        os.replace(tmp, path)          # same directory: the rename is atomic
    finally:
        tmp.unlink(missing_ok=True)


def device_name() -> str:
    """Which machine collected this.

    A FULL is bounded by the disk it was read from, so the disk is part of what the FULL
    *is*. Two machines run the same code against the same `--as-of` and disagree — one
    holds a clone the other lacks, one has a local branch that was never pushed — and
    both are telling the truth. A snapshot that does not say where it was taken cannot be
    compared with another one; it can only be mistaken for it."""
    f = HOME / ".current-device"
    if f.exists() and f.read_text().strip():
        return f.read_text().strip()
    import socket
    return socket.gethostname()


def load_registry(files: list[Path] | None = None) -> tuple[dict, list[str]]:
    """The registry, read from one file or two, later winning over earlier.

    `domains.json` is committed and names only repos the forge reports as public;
    `domains.local.json` is not committed and holds the rest. The line is drawn on
    visibility — a fact the repo itself knows — so that what goes in the public table cannot
    drift with anyone's judgement about a name.

    Be exact about what the second file buys, because the temptation is to claim more. It
    does not decide what may be published, filter an event, or scrub a name: every clone on
    disk is walked either way, and a repo absent from the registry still lands in the FULL,
    under its real name, marked `unmapped`. What the overlay preserves is the *domain and
    layer* of those repos — drop it and this year's unmapped commits go from 2% to 11%, and
    a slice by domain stops describing the work it is supposed to describe.

    It is not a secrecy mechanism, and the audit is the proof: `unmapped_repos`,
    `unregistered_clones` and `uncloned_repos` name repos from both files, and the audit is
    not gitignored. What is gitignored is `events.jsonl`, which carries the titles and refs.
    Repo names are deliberately not treated as the secret here; see the README.

    Which registries a run actually read is declared in the manifest, so a FULL collected
    with the overlay can never be mistaken for one collected without it."""
    out: dict = {}
    used: list[str] = []
    for f in (files if files is not None else [DOMAINS_FILE, DOMAINS_LOCAL]):
        if not f.exists():
            continue
        out.update(json.loads(f.read_text())["repos"])
        used.append(f.name)
    return out, used


class Repos:
    """Where the clones are, and which domain each repo belongs to.

    `clones` keeps every checkout, because two clones of one repo can sit on different
    branches and hold different commits. `dirs` keeps one per repo — that is all a short
    sha needs to be expanded."""

    def __init__(self):
        self.clones: list[tuple[str, Path]] = []
        self.dirs: dict[str, Path] = {}
        self.unmapped: set[str] = set()
        self.domains, self.registries = load_registry()
        for root in ROOTS:
            if not root.is_dir():
                continue
            for d in sorted(root.iterdir()):
                if not (d / ".git").exists():
                    continue
                fid = forge_id_from_remote(
                    _sh(["git", "-C", str(d), "remote", "get-url", "origin"]))
                if fid:
                    self.clones.append((fid, d))
                    self.dirs.setdefault(fid, d)

    def domain_layer(self, fid: str) -> tuple[str, str]:
        d = self.domains.get(fid)
        if not d:
            self.unmapped.add(fid)
            return "unmapped", "unmapped"
        return d.get("domain", "unmapped"), d.get("layer", "unmapped")

    def uncloned(self) -> list[str]:
        """Named in the registry, absent from this disk. The registry names the repos this
        axis reads commits from, so one listed here with no clone is a hole in the FULL:
        the commits happened, this machine simply cannot read them. Reported by name,
        because the alternative is a gap that looks exactly like a stretch of doing
        nothing."""
        return sorted(set(self.domains) - set(self.dirs))

    def unregistered_clones(self) -> list[str]:
        """On this disk, missing from the registry. This is the drift alarm: a repo whose
        commits are entering the axis with no domain because nobody has said what it is.

        Kept apart from `unmapped` on purpose. That set also holds forge ids seen only in a
        stamp's URL — a repo this disk does not carry — which is expected and does not go
        away. Counting the two together would leave a number that is never zero, and an
        alarm that never falls silent is one nobody reads."""
        return sorted(set(self.dirs) - set(self.domains))


class Source:
    """Every source reports what it could and could not do. Silently skipping an
    unreadable source is forbidden — a partial FULL circulating as a FULL is the worst
    thing this collector could hand anyone."""

    def __init__(self, name: str):
        self.name = name
        self.status = "ok"
        self.errors: list[str] = []
        self.rejected: list[dict] = []
        self.accepted = 0
        self.reaches: str | None = None
        self.tool: dict | None = None       # the build of the skill that produced this

    def reject(self, reason: str, where: str):
        self.rejected.append({"reason": reason, "where": where})

    def unreadable(self, msg: str):
        self.status = "unreadable"
        self.errors.append(msg)

    def stale(self, msg: str):
        """Readable, and what it says is old. A source whose data stops two months back
        while the run reaches today is not `ok`, and calling it `ok` is how a lived day
        gets read as a day of rest. `stale` cannot be skimmed as fine."""
        if self.status != "unreadable":
            self.status = "stale"
        self.errors.append(msg)

    def done(self, n: int):
        """A source that handed back nothing is `empty`, never `ok`.

        `ok` says two things at once — I read it, and it had something to say — and the
        second is the one that gets skimmed. Point the collector at a machine where `~/org`
        never mounted and notes come back zero, rejected zero, `ok`: a whole depth reported
        as fine and absent. Every silence this axis met was of that shape, so a source that
        gives nothing must say so in the word a reader cannot misread. An honestly quiet
        window says `empty` too, and that costs nothing — `empty` is a fact about this run,
        not an accusation."""
        self.accepted = n
        if self.status in ("unreadable", "stale"):
            return
        self.status = "empty" if n == 0 else ("partial" if self.rejected else "ok")

    def report(self) -> dict:
        r = {"name": self.name, "status": self.status, "accepted": self.accepted,
             "rejected": len(self.rejected), "errors": self.errors[:20]}
        if self.reaches is not None:
            r["reaches"] = self.reaches
        if self.tool is not None:
            r["tool"] = self.tool
        return r


def _event(source: str, entity_id: str, time_kind: str, tp: dict, domain: str, layer: str,
           title: str, ref: dict | None, native_id: str, locator: str,
           tags: list[str] | None = None, extra: dict | None = None,
           duration_min: float | None = None) -> dict:
    prov = {"adapter": source, "collector_version": COLLECTOR_VERSION,
            "native_id": native_id, "locator": locator, **(extra or {})}
    return {
        "schema_version": SCHEMA_VERSION,
        "event_id": make_event_id(source, entity_id, time_kind, tp, native_id),
        "entity_id": entity_id,
        "time_kind": time_kind,
        "ts": tp["ts"], "date_kst": tp["date_kst"], "ts_precision": tp["ts_precision"],
        "source": source, "domain": domain, "layer": layer,
        "title": title, "tags": tags or [],
        # How long it lasted, when the source measures a span rather than a moment. Every
        # other event is an instant and carries null — a commit does not take 20 minutes,
        # it is a point where 20 minutes of work landed.
        "duration_min": duration_min,
        "ref": ref, "provenance": prov,
    }


# ----------------------------------------------------------------------------- git


def is_operator(author: str, email: str) -> bool:
    """Is this commit the operator's? Name and email are searched together, so a commit is
    his if EITHER says so — the name may be anything the machine was configured with, but
    the address stays his."""
    return any(a in f"{author} {email}".lower() for a in AUTHORS)


def collect_git(repos: Repos, frm: datetime, as_of: datetime, src: Source) -> list[dict]:
    """One commit, one authored event. The entity keeps the FULL sha: truncating it to
    the 7 chars an agenda stamp happens to carry would join the two by baking a
    collision risk into identity itself.

    `--all`, not HEAD. Work that was abandoned on a branch still happened, and keeping
    only what got merged would leave a time axis that records nothing but the successes.

    The author is read by name *and* email — see AUTHORS. A clone holds everyone's
    commits, so this filter decides whose life the axis is measuring, and it was silently
    dropping the operator's own work whenever his gitconfig wrote a different name."""
    events, seen = [], set()
    for fid, d in sorted(repos.clones):
        out = _sh(["git", "-C", str(d), "log", "--all", "--no-merges",
                   "--pretty=format:%H\x1f%aI\x1f%an\x1f%ae\x1f%s"])
        domain, layer = repos.domain_layer(fid)
        for line in out.splitlines():
            parts = line.split("\x1f")
            if len(parts) != 5:
                src.reject("malformed_log_line", fid)
                continue
            sha, ts, author, email, subject = parts
            if not is_operator(author, email):
                continue
            if sha in seen:                 # duplicate clones share history
                continue
            seen.add(sha)
            try:
                tp = normalize_git_ts(ts)
            except Reject as r:
                src.reject(r.reason, fid)
                continue
            if not in_range(tp, frm, as_of):
                continue
            events.append(_event(
                source="git", entity_id=f"git:{fid}@{sha}", time_kind="authored", tp=tp,
                domain=domain, layer=layer, title=subject,
                ref={"kind": "git", "value": f"{fid}@{sha}"},
                native_id=sha, locator=str(d)))
    return events


# --------------------------------------------------------------------------- notes

DENOTE_RE = re.compile(r"^(\d{8}T\d{6})--(.+?)(?:__(.+))?\.org$")
TITLE_RE = re.compile(r"^#\+title:\s*(.*)$", re.M)
LASTMOD_RE = re.compile(r"^#\+hugo_lastmod:\s*(.*)$", re.M)


def duplicate_ids(names: list[str]) -> set[str]:
    """A Denote identifier is supposed to name exactly one note. A few name two. A
    coordinate pointing at two places is not a coordinate, so BOTH sides are rejected
    and reported — guessing which note the id "really" means is a fabrication, and it is
    exactly how the wrong note would later ship under the right one's label."""
    seen: dict[str, int] = {}
    for n in names:
        m = DENOTE_RE.match(n)
        if m:
            seen[m.group(1)] = seen.get(m.group(1), 0) + 1
    return {i for i, c in seen.items() if c > 1}


def collect_notes(repos: Repos, frm: datetime, as_of: datetime,
                  src: Source) -> list[dict]:
    """Two events per note, answering different questions. `created` is when the room was
    built; `modified` is when it was re-worked — and re-work happens *in place*, so a
    note polished ten times still shows one creation. Counting only creations is how the
    revision axis disappears."""
    if not ORG.is_dir():
        src.unreadable(f"{ORG} not found")
        return []
    files = sorted(ORG.rglob("*.org"))
    dupes = duplicate_ids([f.name for f in files])
    events = []
    for f in files:
        m = DENOTE_RE.match(f.name)
        if not m:
            continue
        ident, slug, tagstr = m.groups()
        rel = f.relative_to(ORG)
        if rel.parts[0] == "botlog" and "agenda" in rel.parts:
            continue                        # the agenda is its own source
        if ident in dupes:
            src.reject("duplicate_denote_identifier", ident)
            continue
        try:
            created = parse_denote_id(ident)
        except Reject as r:
            src.reject(r.reason, f.name)
            continue
        text = f.read_text(errors="replace")
        tm = TITLE_RE.search(text)
        common = dict(
            source="note", entity_id=f"denote:{ident}", domain="garden", layer="product",
            title=(tm.group(1).strip() if tm else slug.replace("-", " ")),
            tags=(tagstr.split("_") if tagstr else []),
            ref={"kind": "denote", "value": ident}, native_id=ident, locator=str(rel))
        if in_range(created, frm, as_of):
            events.append(_event(time_kind="created", tp=created, **common))
        lm = LASTMOD_RE.search(text)
        if lm and lm.group(1).strip():
            try:
                mod = parse_lastmod(lm.group(1))
            except Reject as r:
                src.reject(r.reason, f.name)
                continue
            if in_range(mod, frm, as_of):
                events.append(_event(time_kind="modified", tp=mod, **common))
    return events


# -------------------------------------------------------------------------- agenda

AGENDA_HEAD = re.compile(r"^\*{4} (.+?)(?:\s+:([a-z0-9:_]+):)?\s*$")
AGENDA_TS = re.compile(r"^<(\d{4}-\d{2}-\d{2}) \w{3} (\d{2}:\d{2})>")
# Not only commits: stamps also carry release, PR and issue links. An earlier regex
# matched `/commit/` alone, so release stamps fell through the commit branch entirely.
GITHUB_REF = re.compile(
    r"https://github\.com/([^]/\s]+)/([^]/\s]+)/(commit|releases/tag|compare|pull|issues)"
    r"/([^]\s\[]+)")
SHA_RE = re.compile(r"^[0-9a-f]{7,40}$")


def read_stamps(src: Source) -> list[dict]:
    """Every stamp in the agenda, in sorted source order, before any window is applied.

    The window comes later on purpose. Occurrence is counted here, over ALL stamps, so a
    stamp's identity cannot change depending on which range someone asked for."""
    stamps: list[dict] = []
    occurrence: dict = {}
    for f in sorted(AGENDA_DIR.glob("*.org")):
        head = None
        for lineno, line in enumerate(f.read_text(errors="replace").splitlines(), 1):
            hm = AGENDA_HEAD.match(line)
            if hm:
                head = (hm.group(1),
                        [t for t in (hm.group(2) or "").split(":") if t], lineno)
                continue
            if not head:
                continue
            tm = AGENDA_TS.match(line)
            if not tm:
                continue
            title, tags, at = head
            head = None
            try:
                tp = parse_agenda_ts(*tm.groups())
            except (ValueError, Reject):
                src.reject("unparseable_agenda_timestamp", f"{f.name}:{at}")
                continue
            # Two stamps can share a file, a title AND a minute (23 pairs do). So a
            # stamp's own identity is (file, title, time, occurrence) — never the commit
            # it names, and never the line it sits on. Keying on the commit sha collapsed
            # two real stamps into one.
            key = (f.name, title, time_component(tp))
            occurrence[key] = occurrence.get(key, 0) + 1
            stamps.append({"file": f.name, "line": at, "title": title, "tags": tags,
                           "tp": tp,
                           "native": _h(f.name, title, time_component(tp),
                                        str(occurrence[key]))})
    return stamps


def commit_ref(title: str) -> tuple[str, str] | None:
    """(forge id as the stamp wrote it, short sha) for a stamp that names a commit."""
    m = GITHUB_REF.search(title)
    if not m or m.group(3) != "commit" or not SHA_RE.match(m.group(4)):
        return None
    return f"github.com/{m.group(1)}/{m.group(2)}", m.group(4)


def merge_hits(hits: list[tuple[str, str]], ambiguous_in_a_clone: bool) -> tuple[str, tuple | None]:
    """Decide one short prefix from what every clone said about it.

    `hits` is (forge id, full sha) for each clone that resolved the prefix, in sorted
    clone order. The same commit sitting in several clones is not ambiguity — it is one
    commit, and the first clone in sorted order names it, which is exactly the choice the
    git source makes when it dedups by sha. But a prefix that expands to DIFFERENT full
    shas in different clones is genuinely ambiguous, and taking the first one would be
    the same silent corruption we just removed from the name-based join, wearing a
    different hat."""
    if ambiguous_in_a_clone:
        return "ambiguous", None
    fulls = {full for _, full in hits}
    if not fulls:
        return "unresolved", None
    if len(fulls) > 1:
        return "ambiguous", None
    full = fulls.pop()
    return "resolved", (full, next(fid for fid, f in hits if f == full))


def resolve_shas(repos: Repos, shorts: list[str]) -> tuple[dict, set]:
    """short prefix -> (full sha, the forge id of the clone that holds it).

    Identity by CONTENT, not by name. A commit is unchanged when its repo is renamed,
    when it moves to another owner, and — the dangerous one — when its old name is later
    handed to a DIFFERENT repo. A name-based join breaks on all three, and it breaks
    silently, which is the worst way to break. The sha does not care.

    EVERY clone is asked about EVERY prefix. Stopping at the first hit would be faster and
    would quietly pick a winner whenever two clones disagree about what a 7-char prefix
    means. Offline, and it refuses to guess: disagreement is rejected, absence stays
    unresolved."""
    if not shorts:
        return {}, set()
    hits: dict[str, list[tuple[str, str]]] = {s: [] for s in shorts}
    clone_ambiguous: set[str] = set()
    payload = "\n".join(shorts) + "\n"
    for fid, d in sorted(repos.clones):
        r = subprocess.run(["git", "-C", str(d), "cat-file", "--batch-check"],
                           input=payload, capture_output=True, text=True)
        # One output line per input line, in order: "<full sha> commit <size>", or
        # "<input> missing", or "<input> ambiguous".
        for short, line in zip(shorts, r.stdout.splitlines()):
            parts = line.split()
            if len(parts) == 3 and parts[1] == "commit":
                hits[short].append((fid, parts[0]))
            elif len(parts) >= 2 and parts[1] == "ambiguous":
                clone_ambiguous.add(short)

    found: dict[str, tuple[str, str]] = {}
    ambiguous: set[str] = set()
    for short in shorts:
        status, value = merge_hits(hits[short], short in clone_ambiguous)
        if status == "resolved":
            found[short] = value
        elif status == "ambiguous":
            ambiguous.add(short)
    return found, ambiguous


def collect_agenda(repos: Repos, frm: datetime, as_of: datetime,
                   src: Source) -> list[dict]:
    """A stamp naming a commit is a second event ABOUT that commit, not a copy of it — so
    it joins the commit's entity when the sha resolves, and keeps an identity of its own
    when it does not."""
    if not AGENDA_DIR.is_dir():
        src.unreadable(f"{AGENDA_DIR} not found")
        return []
    src.unresolved_short = 0
    stamps = [s for s in read_stamps(src) if in_range(s["tp"], frm, as_of)]
    found, ambiguous = resolve_shas(
        repos, sorted({cr[1] for s in stamps if (cr := commit_ref(s["title"]))}))

    events: list[dict] = []
    for s in stamps:
        tp, native = s["tp"], s["native"]
        entity, ref = f"agenda:{native}", None
        domain, layer = "agent", "product"
        m = GITHUB_REF.search(s["title"])
        if m:
            # The ref is kept exactly as the stamp wrote it, old repo name and all. The
            # LOCAL FULL records what the source said; only the ENTITY is normalized to
            # the commit the sha actually names.
            ref = {"kind": "url", "value": m.group(0)}
            named = fid = f"github.com/{m.group(1)}/{m.group(2)}"
            cr = commit_ref(s["title"])
            if cr:
                short = cr[1]
                if short in ambiguous:
                    src.reject("ambiguous_short_sha", short)
                    continue
                if short in found:
                    full, home = found[short]
                    entity, fid = f"git:{home}@{full}", home   # joins the commit itself
                else:
                    entity = f"git:{named}@short:{short}"      # honestly unresolved
                    src.unresolved_short += 1
            # Ask the domain table only about the repo we actually landed on. Asking it
            # about the name in the URL too would count long-dead names — a repo's maiden
            # name, an owner it left years ago — as repos missing from the table.
            domain, layer = repos.domain_layer(fid)
        events.append(_event(
            source="agenda", entity_id=entity, time_kind="stamped", tp=tp,
            domain=domain, layer=layer, title=s["title"], tags=s["tags"], ref=ref,
            native_id=native, locator=f"{s['file']}:{s['line']}"))
    return events


# ------------------------------------------------------------------------- journal

JOURNAL_DIR = ORG / "journal"
JOURNAL_HEAD = re.compile(r"^(\*+)\s+(.*?)\s*$")
JOURNAL_TAGS = re.compile(r"\s+:([A-Za-z0-9_@#%:]+):$")
JOURNAL_TS = re.compile(r"^<(\d{4}-\d{2}-\d{2}) \w{2,3}(?: (\d{2}:\d{2}))?[^>]*>")
DRAWER = re.compile(r"^:[A-Za-z][A-Za-z0-9_-]*:$")
PLANNING = re.compile(r"^(?:CLOSED|SCHEDULED|DEADLINE):")
PRIORITY = re.compile(r"^\[#[A-Z]\]\s*")
TODO_STATES = {"TODO", "DONE", "NEXT", "WAIT", "HOLD", "IDEA", "KILL", "PROJ", "STRT",
               "LOOP"}


def parse_journal_ts(day: str, hhmm: str | None) -> dict:
    if hhmm:
        return parse_agenda_ts(day, hhmm)
    y, mo, d = (int(x) for x in day.split("-"))
    return _tp(None, date(y, mo, d).isoformat(), "day")


def stable_title(title: str) -> str:
    """What is left of a heading once the parts built to change are taken off.

    A workflow state and a tag are *designed* to move: a TODO becomes DONE, a refile adds
    `:REFILED:`, an archive adds `:ARCHIVE:`. What happened at 16:42 does not move. Keying
    identity on a state would make today's entry a different event tomorrow — the same
    reason the line number is kept out of the id."""
    t = JOURNAL_TAGS.sub("", title).strip()
    parts = t.split(maxsplit=1)
    if parts and parts[0] in TODO_STATES:
        t = parts[1] if len(parts) > 1 else ""
    return PRIORITY.sub("", t).strip()


def attached_line(body: list[str]) -> str | None:
    """The first line of a heading's body that is neither blank, a drawer, nor a planning
    line. Only that line may carry the heading's timestamp.

    Scanning the whole body for any `<...>` instead would collect the dates the operator
    merely *wrote about* — a quoted date, a plan for next week — as the moment the heading
    happened."""
    drawer = False
    for line in body:
        s = line.strip()
        if not s:
            continue
        if drawer:
            drawer = s.upper() != ":END:"
            continue
        if DRAWER.match(s):
            drawer = True
            continue
        if PLANNING.match(s):
            continue                        # CLOSED:/SCHEDULED:/DEADLINE: sit before it
        return s
    return None


def read_journal(src: Source) -> list[dict]:
    """Every timestamped journal heading, in source order, before any window is applied.

    A heading becomes an event exactly when an ACTIVE timestamp is attached to it — which
    is the same condition that makes it appear in the operator's org-agenda. That is not a
    coincidence to be improved on: the agenda view is the axis, and this reads the lane it
    already shows. Headings without one are not events and are not defects; the practice of
    timestamping them began in 2026, and the years before it are prose.

    Occurrence is counted over ALL of them, so a heading's identity cannot change with the
    range someone asked for — the same discipline the agenda source uses."""
    entries: list[dict] = []
    occurrence: dict = {}
    for f in sorted(JOURNAL_DIR.glob("*.org")):
        if not DENOTE_RE.match(f.name):
            continue                        # templates are not records
        rel = str(f.relative_to(ORG))
        lines = f.read_text(errors="replace").splitlines()
        heads: list[tuple[int, int, str]] = []
        in_block = False
        for lineno, line in enumerate(lines, 1):
            low = line.strip().lower()
            if low.startswith("#+begin"):
                in_block = True
            elif low.startswith("#+end"):
                in_block = False
            elif not in_block:
                hm = JOURNAL_HEAD.match(line)
                if hm:
                    heads.append((lineno, len(hm.group(1)), hm.group(2)))
        for n, (lineno, level, title) in enumerate(heads):
            if level == 1:
                continue                    # the day heading; its children carry the times
            end = heads[n + 1][0] if n + 1 < len(heads) else len(lines) + 1
            first = attached_line(lines[lineno:end - 1])
            tm = JOURNAL_TS.match(first) if first else None
            if not tm:
                continue
            try:
                tp = parse_journal_ts(*tm.groups())
            except (ValueError, Reject):
                src.reject("unparseable_journal_timestamp", f"{rel}:{lineno}")
                continue
            stable = stable_title(title)
            key = (rel, stable, time_component(tp))
            occurrence[key] = occurrence.get(key, 0) + 1
            tg = JOURNAL_TAGS.search(title)
            entries.append({
                "rel": rel, "line": lineno, "title": title,
                "tags": [t for t in (tg.group(1).split(":") if tg else []) if t],
                "tp": tp,
                "native": _h(rel, stable, time_component(tp), str(occurrence[key]))})
    return entries


def collect_journal(repos: Repos, frm: datetime, as_of: datetime,
                    src: Source) -> list[dict]:
    """The operator's own voice, at a timestamp — the lane of the agenda the collector
    could not see.

    The other three sources are traces an artifact left behind: a commit, a note, a stamp.
    A journal heading is none of those. It is a message, and it carries what no artifact
    can — the body, the family, the commute, the intent. A Saturday with no commits is not
    an empty day; it is a day whose only record is this.

    It is given NO domain. `domain` answers "what kind of repository did this land in",
    and a heading lands in no repository. Filing it under `garden` would invent one, and
    filing it under `unmapped` — which means "a repo nobody has classified yet" — would put
    it in the same bucket as real repos and quietly bend every slice by domain. `null` is
    the honest answer to a question that does not apply."""
    if not JOURNAL_DIR.is_dir():
        src.unreadable(f"{JOURNAL_DIR} not found")
        return []
    # The ref names the file and stops there. It used to carry `::{line}`, which put a line
    # number in the content — the one part of a journal that moves when nothing happened.
    # Insert a line into an old day and every heading below it got a new fingerprint for an
    # observation that had not changed. The line is still recorded, in `provenance.locator`,
    # where every other exact-local trace lives and where the content hash cannot see it.
    # Identity never needed it either: a heading is `(file, stable title, time, occurrence)`.
    return [_event(
        source="journal", entity_id=f"journal:{e['native']}", time_kind="logged",
        tp=e["tp"], domain=None, layer=None, title=e["title"], tags=e["tags"],
        ref={"kind": "org", "value": e["rel"]},
        native_id=e["native"], locator=f"{e['rel']}:{e['line']}")
        for e in read_journal(src) if in_range(e["tp"], frm, as_of)]


# ------------------------------------------------------------------------- timelog


def lifetract_bin() -> Path | None:
    """The skill that owns the time log.

    `$LIFETRACT`, when set, is the whole answer — an explicit path that quietly falls back
    to some other binary is worse than one that fails. Otherwise: the harness skill dirs,
    then PATH."""
    if (env := os.environ.get("LIFETRACT")):
        p = Path(env)
        return p if p.is_file() and os.access(p, os.X_OK) else None
    cands = [DEPLOYED_LIFETRACT,
             HOME / ".pi/agent/skills/pi-skills/lifetract/lifetract"]
    if (w := shutil.which("lifetract")):
        cands.append(Path(w))
    return next((c for c in cands if c.is_file() and os.access(c, os.X_OK)), None)


def tool_provenance(tool: Path) -> tuple[dict, str | None]:
    """Which build of the skill produced depth 0.

    `code_sha256` pins this file, and this file does not produce depth 0 — a lifetract
    binary outside the repo does, and it is rebuilt without asking us. So a FULL that
    fingerprints the collector and says nothing about the skill cannot actually be
    reproduced: the same code and the same `--as-of`, run a week later against a rebuilt
    lifetract, is a different measurement wearing the same fingerprint. The deploy writes
    a record next to the skills, and the collector reads it rather than trusting the path.

    Three answers, and the difference between the last two is the whole point:

    - **No record**, or a record that does not describe the binary we actually chose
      (`$LIFETRACT` aimed at a dev build): the sha is still computed and written, the
      revision stays `null`. This collector cannot tell, and unknown is the truth.
    - **Record agrees** with the binary: the four stable fields go into the manifest.
      `generated_at` does not — a wall clock in the output would break the determinism the
      rest of this file exists to protect.
    - **Record disagrees**: that is not an absence, it is a contradiction. Someone rebuilt
      the binary without redeploying, and the manifest is one line away from naming a
      revision that did not produce these events. A snapshot carrying a false provenance is
      worse than one carrying none, so depth 0 goes `unreadable` and the run is not a FULL.
    """
    digest = sha256(tool.read_bytes())
    # Absolute install paths are deliberately absent: they vary by harness and home directory
    # without changing the build. The stable identity is the binary hash plus the deploy record.
    prov = {"sha256": digest, "repo": None, "vcs_revision": None, "src_tree": None}
    try:
        rec = json.loads(PROVENANCE.read_text())["tools"]["lifetract"]
        if not isinstance(rec, dict):
            raise TypeError
    except (OSError, ValueError, KeyError, TypeError):
        return prov, None                       # no record; the sha alone is what we know
    if tool.resolve() != DEPLOYED_LIFETRACT.resolve():
        return prov, None                       # the record is not about this binary
    if rec.get("sha256") != digest:
        return prov, (f"deployed lifetract does not match the provenance record: binary "
                      f"{digest[:12]}, record {str(rec.get('sha256'))[:12]} — rebuilt "
                      f"without redeploying, so depth 0's revision cannot be named")
    prov.update({k: rec.get(k) for k in ("repo", "vcs_revision", "src_tree")})
    return prov, None


def timelog_reach(tool: Path, env: dict) -> str | None:
    """The last day depth 0 actually has, whatever window this run asked for.

    This is not `max(date_kst)` of the events we kept — that would only ever report the
    edge of the window, which tells the reader nothing about the source. The skill knows
    where its own data stops, so it is asked.

    An older binary answers `status` without the field. That returns None, which the
    manifest prints as an unknown reach, and unknown is the truth: this collector cannot
    tell, and saying so beats implying the bottom is current."""
    r = subprocess.run([str(tool), "status"], capture_output=True, text=True, env=env)
    if r.returncode != 0:
        return None
    try:
        out = json.loads(r.stdout or "{}")
    except json.JSONDecodeError:
        return None
    db = out.get("database") if isinstance(out, dict) else None
    return db.get("last_time_block") if isinstance(db, dict) else None


def collect_timelog(repos: Repos, frm: datetime, as_of: datetime,
                    src: Source) -> list[dict]:
    """Depth 0 — the day as it was lived. The one source this collector does not parse.

    The blocks sit in a sqlite file that `lifetract` already owns. Opening it here would
    duplicate a parser that exists, and it would drag in three problems that are not ours:
    a block is an interval, sleep crosses midnight almost every night, and 150 blocks carry
    a comment naming who was there. Consuming the skill answers all three at once —
    lifetract reports a day's minutes per category, already filed under the day the block
    started, with no comment attached. The collector is supposed to shrink toward the
    skills; this is the first source where it actually does.

    So an event here is a span, not a moment: `2026-07-12, 수면, 514분`. `duration_min`
    carries it, `ts` is null, and the day is the coordinate — writing an instant for a
    block that lasted nine hours would be the same fabrication as writing 00:00 for a
    day-only note.

    If the tool is missing the source says `unreadable`. It does NOT quietly reach past it
    into the database: a depth-0 hole must be visible, not filled by a shortcut.

    And a hole is not only an absence — it is also an age. Depth 0 arrives by a hand export
    from a phone, so its bottom lags whenever nobody has exported; it once sat two months
    behind while every other source reached today. A run that reports 8,400 events and
    `ok` while the blocks stop in May tells the reader that those weeks were unlived. So
    the collector asks the skill how fresh it is and writes the answer down: `reaches` is
    the last day depth 0 has, and a source the skill calls stale is reported `stale`, not
    `ok`. The skill owns that judgement — we consume it rather than re-deriving it."""
    tool = lifetract_bin()
    if tool is None:
        src.unreadable("lifetract not found; set $LIFETRACT")
        return []
    # TZ is pinned for the child. The skill computes in KST since 2026-07-14, so this is
    # belt and braces — but an older binary on some disk still reads $TZ (under TZ=UTC a
    # day lost 220 minutes), and stating the axis's zone is right even when the callee no
    # longer needs telling. A shell must not decide which day a night belonged to.
    env = {**os.environ, "TZ": "Asia/Seoul"}
    src.tool, mismatch = tool_provenance(tool)
    if mismatch:
        src.unreadable(mismatch)
        return []
    src.reaches = timelog_reach(tool, env)
    # The window is half-open [from, to), which is what `as_of` already means, so the two
    # line up exactly and no margin is needed. The old `--days N` form cut at "now minus
    # N×24h" — an instant mid-day, not a midnight — and silently truncated the oldest day
    # of every window: --days 2 reported 79 minutes of 독서 on 2026-07-12 where --days 3
    # reported 139.5, with no warning either time. That is fixed in the skill now; asking
    # for the window we actually want is how the fix is used.
    r = subprocess.run([str(tool), "time",
                        "--from", frm.date().isoformat(),
                        "--to", as_of.date().isoformat()],
                       capture_output=True, text=True, env=env)
    if r.returncode != 0:
        src.unreadable(f"lifetract time failed: {r.stderr.strip()[:200]}")
        return []
    try:
        payload = json.loads(r.stdout or "[]")
    except json.JSONDecodeError:
        src.unreadable("lifetract time returned no JSON")
        return []
    # A window with no blocks is `[]` — an empty day is a fact, and `done(0)` will call the
    # source `empty`. `null` is not that: it is the skill declining to answer in a shape the
    # contract allows, and iterating it would crash with a TypeError that says nothing about
    # depth 0. The skill returns `[]` today; a consumer still has to catch the violation
    # rather than assume the producer will never regress.
    if not isinstance(payload, list):
        src.unreadable(f"lifetract time returned {type(payload).__name__}, not an array")
        return []

    events = []
    for day in payload:
        try:
            d = date.fromisoformat(day["date"]).isoformat()
        except (KeyError, TypeError, ValueError):
            src.reject("bad_lifetract_day", str(day)[:60])
            continue
        tp = _tp(None, d, "day")
        if not in_range(tp, frm, as_of):
            continue
        for c in sorted(day.get("categories", []), key=lambda c: c["name"]):
            minutes = round(float(c["minutes"]), 1)
            if minutes <= 0:
                src.reject("empty_time_block", f"{d}:{c['name']}")
                continue
            events.append(_event(
                source="timelog", entity_id=f"timelog:{d}:{c['name']}",
                time_kind="tracked", tp=tp, domain=None, layer=None,
                title=c["name"], tags=[], duration_min=minutes,
                ref={"kind": "lifetract", "value": f"read {d}"},
                native_id=f"{d}:{c['name']}", locator=f"lifetract read {d}"))
    return events


# ------------------------------------------------------------------------ contract

TIME_KINDS = {"authored", "created", "modified", "stamped", "tracked", "logged"}
PRECISIONS = {"second", "minute", "day"}


def check(ev: dict) -> list[str]:
    """The whole contract, in one function. If an event needs more than this to be
    trusted, the shape is wrong — not the checker."""
    errs = []
    if ev["time_kind"] not in TIME_KINDS:
        errs.append("time_kind")
    if ev["ts_precision"] not in PRECISIONS:
        errs.append("ts_precision")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", ev["date_kst"] or ""):
        errs.append("date_kst")
    if ev["ts_precision"] == "day":
        if ev["ts"] is not None:
            errs.append("day event carries an invented instant")
    else:
        try:
            if parse_kst(ev["ts"]).date().isoformat() != ev["date_kst"]:
                errs.append("date_kst disagrees with ts")
        except (Reject, TypeError, ValueError):
            errs.append("ts is not a KST instant")
    if not ev["event_id"] or not ev["entity_id"]:
        errs.append("identity")
    return errs


def tally(items) -> dict:
    out: dict = {}
    for i in items:
        out[i] = out.get(i, 0) + 1
    return dict(sorted(out.items()))


# ---------------------------------------------------------------------------- main


def flag_unrecorded_days(events: list[dict], timelog: Source) -> None:
    """Depth 0 arrives by hand, so it lags — and a lag is only a lie once the axis has
    evidence the days were lived.

    The rule needs no threshold and no guess. If a day carries commits, stamps or a journal
    line, that day happened; if depth 0 stops before it, those hours are unrecorded rather
    than unlived, and the source is `stale`. If nothing else speaks for those days either,
    depth 0 lagging by a day or two says nothing false, and the run stays `ok` — which is
    why this does not cry wolf every morning before the export.

    That distinction is the whole point. The axis once had depth 0 stopping in May while
    git, agenda and journal ran to July, reported `ok`, and read those weeks as rest."""
    if timelog.status == "unreadable":
        return
    if timelog.reaches is None:
        timelog.errors.append("lifetract did not say how far depth 0 reaches "
                              "(old binary?) — freshness unknown")
        return
    after = sorted({e["date_kst"] for e in events
                    if e["source"] != "timelog" and e["date_kst"] > timelog.reaches})
    if after:
        timelog.stale(
            f"depth 0 stops at {timelog.reaches}, but {len(after)} later day(s) "
            f"({after[0]}…{after[-1]}) carry events from other sources — those hours are "
            f"unrecorded, not unlived. Export the time log from the phone.")


def main() -> int:
    ap = argparse.ArgumentParser(description="collect the LOCAL FULL event log")
    ap.add_argument("--from", dest="frm", default="2015-01-01", metavar="YYYY-MM-DD")
    ap.add_argument("--as-of", metavar="YYYY-MM-DD",
                    help="EXCLUSIVE upper bound at KST midnight. Default is tomorrow, "
                         "so today is fully included; pass it explicitly to reproduce a "
                         "run byte for byte.")
    ap.add_argument("--out", default="", metavar="FILE",
                    help="events JSONL; manifest and audit go to stdout either way")
    args = ap.parse_args()

    as_of_day = args.as_of or (datetime.now(KST).date() + timedelta(days=1)).isoformat()
    frm = parse_kst(f"{args.frm}T00:00:00+09:00")
    as_of = parse_kst(f"{as_of_day}T00:00:00+09:00")

    repos = Repos()
    collectors = (("git", collect_git), ("note", collect_notes),
                  ("agenda", collect_agenda), ("journal", collect_journal),
                  ("timelog", collect_timelog))
    sources = {n: Source(n) for n, _ in collectors}
    events: list[dict] = []
    for name, fn in collectors:
        src = sources[name]
        evs = fn(repos, frm, as_of, src)
        src.done(len(evs))
        events += evs
        log(f"[{name}] {src.status} accepted={src.accepted} rejected={len(src.rejected)}")

    flag_unrecorded_days(events, sources["timelog"])

    broken = [{"event_id": e["event_id"], "errors": errs}
              for e in events if (errs := check(e))]
    if broken:
        log(f"FATAL: {len(broken)} events fail the shape. First 3:")
        for b in broken[:3]:
            log("   ", json.dumps(b, ensure_ascii=False))
        return 1

    events.sort(key=sort_key)
    entities = {e["entity_id"] for e in events}
    rejected = [r for n, _ in collectors for r in sources[n].rejected]

    # The snapshot has to be able to name itself. Two machines run this code against the
    # same --as-of and produce different FULLs — different clones, unpushed branches — and
    # neither is wrong. `--as-of` fixes the upper bound in time; it does not freeze the
    # local refs. So the fingerprint below is what lets two snapshots be *compared* rather
    # than silently substituted for one another.
    body = events_bytes(events)

    # No wall clock anywhere in the output: the same inputs and the same --as-of must
    # produce the same bytes, under any TZ.
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "collector_version": COLLECTOR_VERSION,
        "timezone": "Asia/Seoul",
        "from": frm.isoformat(),
        "as_of": as_of.isoformat(),
        "as_of_is": "exclusive upper bound",
        "device": device_name(),
        "code_sha256": sha256(Path(__file__).read_bytes()),
        "events_sha256": sha256(body),
        "content_sha256": sha256(content_bytes(events)),
        "counts": {"events": len(events), "entities": len(entities)},
        "registries": repos.registries,
        "sources": [sources[n].report() for n, _ in collectors],
    }
    audit = {
        "events_by_source": tally(e["source"] for e in events),
        "events_by_time_kind": tally(e["time_kind"] for e in events),
        "events_by_precision": tally(e["ts_precision"] for e in events),
        "entities_by_kind": tally(e.split(":")[0] for e in entities),
        "span": {"first": events[0]["date_kst"] if events else None,
                 "last": events[-1]["date_kst"] if events else None},
        "rejected": tally(r["reason"] for r in rejected),
        "rejected_samples": sorted(
            ({"reason": r["reason"], "where": r["where"]} for r in rejected),
            key=lambda r: (r["reason"], r["where"]))[:10],
        "unresolved_short_sha": sources["agenda"].unresolved_short,
        "unmapped_repos": sorted(repos.unmapped),
        "unregistered_clones": repos.unregistered_clones(),
        "uncloned_repos": repos.uncloned(),
    }

    dead = [n for n, _ in collectors if sources[n].status == "unreadable"]

    # A run that could not read a source did not produce a FULL, and it must not leave one
    # lying where a FULL is expected. It used to: the file was written first and the source
    # checked afterwards, so pointing the collector at a missing lifetract still wrote 20,262
    # events over the 28,662 that were already there. Depth 0 was simply gone, `query.py
    # --day 2026-02-07` — the day this axis exists for — came back empty, and nothing in the
    # events file said a word about why. Worse, it happened at exactly the moment the loss
    # could not be undone: the FULL is cheap to rebuild only while the sources can be read.
    #
    # So the write is the last thing, it happens only when every source answered, and it goes
    # through a temp file. A failed run leaves the previous FULL exactly as it found it.
    if args.out:
        if dead:
            log(f"NOT writing {args.out}: {', '.join(dead)} unreadable — this run is not a "
                f"FULL, and anything already at that path is left untouched.")
        else:
            write_atomic(Path(args.out), body)   # exactly the bytes events_sha256 covers
            log(f"wrote {len(events)} events -> {args.out}")

    # The manifest and the audit go to stdout either way. A failed run still has to be able
    # to say what it saw and what it could not read — that is the difference between a hole
    # and a silence.
    json.dump({"manifest": manifest, "audit": audit}, sys.stdout,
              ensure_ascii=False, indent=2, sort_keys=True)
    sys.stdout.write("\n")

    if dead:
        log(f"FATAL: source unreadable: {', '.join(dead)} — this is not a FULL.")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
