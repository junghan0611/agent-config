# timeline — the KST time axis, collected once and queried many times

Nothing here is new data. Surfaces that already exist are read and normalized onto one
axis, at four depths of the same day:

| depth | source | what it reads | events it produces |
|---|---|---|---|
| 0 | `timelog` | the hand-logged time blocks, **through the `lifetract` skill** | `tracked` — one per (day, category) |
| 1 | `journal` | timestamped headings in `~/org/journal/*.org` | `logged` — one per heading |
| 2 | `agenda` | `~/org/botlog/agenda/*.org` | `stamped` — one per stamp |
| 3 | `note` | Denote `.org` files under `~/org` | `created`, `modified` — up to two per note |
| 3 | `git` | every ref (`--all`) in the clones under `~/repos/gh`, `~/repos/work` | `authored` — one per commit |

The depths are zoom levels on one day, not a priority order. **0 and 1 are records the
operator made on purpose; 2 and 3 are residue left by artifacts.** A harness that reads
only the residue can say what was produced and nothing about the life that produced it.

```
collect.py  →  events.jsonl (LOCAL FULL)  →  query.py  →  a slice
```

The LOCAL FULL keeps titles and refs exactly as they read on this machine. **Deciding what
may be published is a separate, later step and is deliberately not in the collector.** A
collector that decides what to hide is a wall, and the point of this axis is to open one.
`events*.jsonl` is gitignored; it does not leave the machine by accident.

## Run

```bash
python3 timeline/collect.py --as-of 2026-07-14 --out events.jsonl   # audit → stdout
python3 timeline/query.py events.jsonl --day 2026-07-13
python3 timeline/query.py events.jsonl --month 2026-07 --source git --count events
python3 timeline/test_timeline.py
```

`--as-of` is an **exclusive** upper bound at KST midnight. `--as-of 2026-07-14` includes
all of July 13th. It defaults to tomorrow, so a bare run includes today — but pin it
explicitly whenever you want to reproduce a run.

`query.py` with no range returns the whole file. It never asks the operating system what
day it is, so the same FULL yields the same slice on any day, in any timezone. `--from`
alone means everything since; `--to` alone, everything before.

## What "every ref" does and does not mean

The git source walks `--all`: every ref the local clone holds, not just the branch that
happens to be checked out. Work abandoned on a branch still happened, and keeping only
what got merged would leave a time axis that records nothing but the successes.

It is bounded by what is on this disk. **Not** included: repos never cloned here, remote
branches never fetched, and objects already pruned as unreachable. A commit seen in more
than one clone is counted once — dedup is by sha.

## The agenda is not a second copy of git

Commits are the record that is complete. A commit exists because work was written down at
the moment it happened, and it exists whether or not anyone chose to mark it afterwards.

Agenda stamps are not that. **The first stamp in the whole corpus is 2026-02-27** — before
that date the practice did not exist — and even after it, a stamp is written when an agent
marks a session worth marking, not once per commit. So the two sources are asymmetric on
purpose: git is the measure, the agenda is a sparse commentary laid over it. A month with
no stamps is not a month with no work, and an unstamped repo is not an idle one.

This is why `domains.json` is drawn around the repos that hold **commits**, and why a repo
known only from a stamp is left out of it. A stamp's URL carries whatever name the repo had
*that day*; the commit it names is found by sha, in whichever clone actually holds it, and
inherits that repo's domain. Registering the old name as if it were a second repo would put
a ghost in the registry and, worse, make the audit cry about a missing clone forever.

## Depth 0 is consumed, not parsed

The time blocks live in a sqlite database that the `lifetract` skill already owns. The
collector does not open it. It shells out to the skill and takes what it reports — a day's
minutes per category — and a test fails if anyone ever "optimizes" that subprocess into a
direct database read.

This is not tidiness. Parsing the file here would have copied a parser that exists **and**
inherited three problems that belong to the skill, not to this axis:

- a block is an **interval** (`start`/`finish`), and events here are moments;
- sleep **crosses midnight** almost every night, so some rule has to say which day owns it;
- 150 blocks carry a **comment naming who was there** — a family member, a place.

Consuming the skill answers all three at once. `lifetract` reports minutes already filed
under the day the block *started*, and it never hands over the comments. So the event is a
span with a day for a coordinate: `2026-07-12 · 수면 · 514분`, `ts: null`,
`duration_min: 514.0`. Writing an instant for a nine-hour block would be the same
fabrication as writing `00:00` for a day-only note.

Two things follow that are easy to get wrong.

- **`$TZ` is pinned for the child process.** The skill reads it: run the collector under
  `TZ=UTC` and the same blocks land on different days — one day lost 220 minutes in the
  check. The canonical zone is this axis's contract, so the collector states it instead of
  letting a shell decide which day a night belonged to.
- **A missing skill is a hole, not a zero.** If `lifetract` is not found the source reports
  `unreadable` and the FULL says so. It does not fall back to the database. A depth-0 gap
  that shows up as zero minutes is a lie about a life.

The direction is that the collector keeps shrinking toward the skills — `gitcli`,
`denotecli` and the agenda already own parsers this file still duplicates. Depth 0 is the
first source where it stopped duplicating.

## The journal is the human lane, and it was missing

The other three sources are traces an artifact left behind — a commit, a note, a stamp.
A journal heading is not that. It is the operator's own message at a minute, and it
carries what no artifact can: the body, the family, the commute, the intent.

**2026-07-11 is why this source exists.** The axis reported zero events for that
Saturday. The journal held two headings — `16:42 장염 복통` (gastroenteritis) and
`18:26 인간 환멸` (disillusionment with people). A day is not empty because nothing
was committed.

A heading becomes an event **exactly when an active timestamp is attached to it** —
which is the same condition that makes it appear in the operator's org-agenda. That is
not a rule invented here; the agenda view *is* the axis, and this reads the lane it
already shows.

Attached means the first line of the heading's body that is neither blank, a drawer,
nor a planning line (`CLOSED:` / `SCHEDULED:` / `DEADLINE:` — 53 finished headings hide
their timestamp behind one). Nothing else in the body counts, and `#+begin_…` blocks are
not read at all. Scanning the whole body for any `<…>` would collect the dates the
operator merely *wrote about* — a plan for next week, a quoted agenda — as if they were
the moment the heading happened.

Identity is `(file, heading text, time, occurrence)`, with the **workflow state and the
tags stripped out**. A `TODO` becomes `DONE`; a refile adds `:REFILED:`; an archive adds
`:ARCHIVE:`. Those are built to change, and what happened at 16:42 is not — keying on
them would retire one event and mint another in its place, for the same reason the line
number is kept out of the id.

The heading gets **no `domain` and no `layer`**: `null`, not `unmapped`. See the registry
section below for why that distinction is load-bearing.

Timestamping headings is a **2026 practice**. Of ~10,500 journal headings, about 1,230
carry one and nearly all of them are this year. Earlier journals are prose, and their
silence is the record — not a defect to go repair.

## The registry, and the one thing it cannot carry

`domains.json` is the registry: the repos this axis reads commits from, each with a domain
and a layer. It can disagree with the disk in two directions, and the audit names both.

- `unregistered_clones` — a repo on disk that the table does not know. Its commits are in
  the FULL, but with no domain, so a repo cannot slip into the axis unclassified and
  unnoticed. This one is meant to sit at zero.
- `uncloned_repos` — a repo the table names that this disk does not hold. Its commits
  cannot be read at all, and an unread repo leaves a gap that looks exactly like a stretch
  of doing nothing.

(`unmapped_repos` is the wider list: every forge id that ended up with no domain, including
ones known only from a stamp's URL because the repo is not on this disk. It does not fall
to zero, which is why the drift alarm above is kept separate from it.)

**`unmapped` is not `null`.** `unmapped` is a claim about a repository — one nobody has
classified yet. `null` is what the journal source carries, and it says the question does
not apply: a heading lands in no repository at all. Collapse the two and the operator's
own voice joins the unclassified repos in every slice by domain.

`domains.json` names only the repos the forge reports as **public**. Everything else —
private, archived, no longer there — is registered in `domains.local.json`, which is
gitignored, merged after the public table, and declared in the manifest under `registries`.
The line is drawn on visibility because that is a fact the repo itself knows; a table drawn
instead on what an author feels able to say out loud is a table that drifts.

Be exact about what that second file buys, because the temptation is to claim more. It does
not decide what may be published, it filters no event, it scrubs no name: every clone is
walked either way, and a repo missing from the registry still lands in the FULL under its
real name, marked `unmapped`. What the overlay preserves is those repos' **domain and
layer** — drop it and this year's unmapped commits go from 2% to 11%, so a slice by domain
stops describing the work it is meant to describe.

## Repo names are not the secret, and the history keeps them

`95807a5` committed a public table that named 40 repos which are not public, 17 of them
under work accounts. `d87dae8` caught it and redrew the table on forge visibility. That
redraw fixed the rule going forward; it did not remove the names from the history, and it
was never going to — `95807a5` is an ancestor of `main` in a public repo, and the names are
one `git show` away.

**That is a decision, not an oversight.** A repo's name carries almost nothing on its own,
and rewriting a pushed history to unpublish a list of names would also erase the commit
that records the mistake being caught — in an axis whose whole claim is that the record is
the measure, that is the more expensive loss. Anyone who rediscovers those names and
reaches for a force-push should stop at this paragraph.

So be clear about where the boundary actually runs. It protects the **payload, not the
roster**: `events.jsonl` holds the titles and refs of commits and notes, and it is
gitignored. The audit names repos — in `unmapped_repos`, `unregistered_clones`,
`uncloned_repos`, drawn from both registries — and it is not gitignored, on purpose.

## The time contract

- Canonical timezone is `Asia/Seoul`. Every instant on the wire is RFC3339 with `+09:00`.
- Ranges are half-open `[from, as_of)` in KST.
- Git times come from the **offset-aware author timestamp**, converted to KST. A naive git
  timestamp is rejected, never assumed. A commit written at 20:00 UTC belongs to the *next*
  day in Seoul, and hundreds of commits carry `+0000`.
- Denote identifiers and agenda stamps are KST-local by construction.
- `time_kind` ∈ `authored | created | modified | stamped | logged | tracked`.
- `duration_min` is how long it lasted, and only a span carries one. Every other event is
  null: a commit does not take twenty minutes, it is the point where twenty minutes landed.
- `ts_precision` ∈ `second | minute | day`.
- **A day-only time has no instant.** It carries `ts: null` and lives on `date_kst`.
  Writing `00:00` would fabricate a coordinate that a naive consumer reads as fact.
- Entities and events are different things. One note is up to two events; one commit is an
  `authored` event *and* every agenda stamp written about it. So `--count events` and
  `--count entities` answer different questions and the caller must say which.
- Git entities keep the **full sha**. An agenda stamp carries a 7-char prefix; it joins the
  commit only when a local clone expands that prefix to exactly one full sha. Ambiguous →
  rejected. Not expandable → kept as `git:<repo>@short:<prefix>`, honestly unresolved.
- **A commit is found by its sha, not by its repo's name.** The stamp's URL is recorded
  as written, but the *entity* is whatever commit that sha actually names, in whichever
  clone holds it.
- The output is deterministic: the same disk and the same `--as-of` produce the same bytes,
  under any system timezone. There is no wall clock anywhere in the output.

```bash
# the check that matters
TZ=UTC       python3 timeline/collect.py --as-of 2026-07-14 --out /tmp/a.jsonl > /tmp/a.json
TZ=Asia/Seoul python3 timeline/collect.py --as-of 2026-07-14 --out /tmp/b.jsonl > /tmp/b.json
cmp /tmp/a.jsonl /tmp/b.jsonl && cmp /tmp/a.json /tmp/b.json
```

## A FULL is local, and it says so

Determinism stops at the disk, and that is not a defect to be engineered away. **`--as-of`
fixes the upper bound in time; it does not freeze the local refs.** Two machines running
this exact code against the same `--as-of` will disagree: one holds a clone the other
never made, one carries a branch that was never pushed, one can expand a short sha the
other cannot. Every one of those FULLs is telling the truth about the disk it read.

So the manifest carries what it takes to tell two snapshots apart instead of silently
substituting one for the other:

```json
"device": "thinkpad",
"code_sha256":    "fc6aed78…",  // the collector that produced it
"events_sha256":  "655332…",    // exactly the bytes written to events.jsonl
"content_sha256": "1d8b217e…",  // the same events without `provenance`
"registries":     ["domains.json", "domains.local.json"]
```

Two fingerprints, because two different questions get asked. `events_sha256` covers the
bytes: it is what makes a run reproducible on this disk, so it has to cover everything,
including where each event was read from. `content_sha256` drops `provenance` and covers
what was observed — and that is the one to cite. The difference is not academic. A
`locator` carries a line number, the agenda is a *reverse* datetree, and so one new stamp
pushes every older line down: on the afternoon this was written, 28,662 events that had not
changed in any respect produced three different `events_sha256` inside half an hour. A
citation pinned to the bytes dies the next time the operator stamps an agenda; one pinned to
the content survives, and still moves the moment a title, a time, a duration or a ref does.

Be exact about what the hashes are worth, because it is less than it looks. They do not
prove that this code ran: anyone can produce bytes and a hash of those bytes together. The
manifest *records* a claimed derivation — this collector, this lifetract build, these source
statuses, this `as_of` — and the hashes let a reader check that the bytes and the content in
front of them are the ones that manifest names, and catch a substitution. They say nothing
about whether the sources told the truth, or whether they were complete. So a citation needs
the context, not the hash alone: `as_of` + `content_sha256` + `code_sha256` + the source
statuses + the depth-0 tool revision. The same content collected through a different window,
or with a source `stale`, is not the same claim.

What an outside reader can independently verify depends on how far an event actually reached
in public. Commits pushed to a public remote, and the records exported to the public garden —
the journal goes out in full except what is marked `:noexport:`, and the notes are published —
can be checked against something other than this disk. Private repos, refs that were never
pushed, and Org records that never left cannot. Depth 0 least of all: it is a first-party
export from a phone, and what can be checked there is the consistency of the derivation —
run the old and the new lifetract against the same database and diff the depth-0 events — not
the raw material. Verifiability is not a property of a depth, then, but of an event's reach;
the ratio moves with the local refs and with what the garden has published, so it is measured
when it is claimed, not frozen here.

A run that could not read a source is **not a FULL, and does not get written.** The
collector used to write the events file first and check the sources afterwards, so a missing
`lifetract` still left 20,262 events sitting where 28,662 had been — depth 0 silently gone,
`--day 2026-02-07` answering with nothing, and the loss landing at exactly the moment it
could not be undone. Now the write is last, it happens only when every source answered, and
it goes through a temp file and a rename. `--out` is left alone; the manifest still goes to
stdout and still names what could not be read; the exit code is 2.

Two traps follow, and both are easy to walk into:

- **`uncloned_repos` does not catch everything.** It names repos with *no clone here at
  all*. A repo cloned on both machines, where one holds a local branch the other never
  fetched, loses those commits **silently** — the repo is present, so nothing complains.
  Comparing two FULLs means comparing sha sets, not reading the audit.
- **`event_id` is not a merge key.** It is derived from `entity_id`, and the same agenda
  stamp becomes `git:…@<full sha>` on a machine that can expand the prefix and
  `git:…@short:<prefix>` on one that cannot. Merging two FULLs on `event_id` therefore
  *duplicates* exactly the events that the two machines disagree about — the ones you were
  merging to reconcile. A union FULL has to key on native identity (git: full sha; agenda:
  the stamp's `native_id`; note: Denote id + `time_kind` + time coordinate) and reconcile
  resolved against unresolved entities afterwards.

## Known source defects

Recorded in the audit as rejections, never guessed at. These are properties of the raw
material *today*; if the files are fixed, the numbers should change:

- **Duplicate Denote identifiers.** A handful of ids name two notes each. An identifier that
  points at two places is not a coordinate, so *both* sides are rejected and reported.
- **Unparseable `#+hugo_lastmod`.** A few dozen notes carry a lastmod no format matches.
  The note's `created` event still lands; only the `modified` event is dropped.
- **Unresolvable short shas.** An agenda stamp whose commit is on no clone here has no local
  object to expand its 7-char prefix against. It stays unresolved rather than being
  force-joined to a guess.

## Why the join is by sha and not by name

A repo name is not a stable identifier, and this axis spans years of them changing. Names
lie in three ways, and the third is the dangerous one:

- a repo is **renamed** (`garden` → `garden_v5`);
- it **moves to another owner** (`junghanacs/andenken` → `junghan0611/andenken`);
- its old name is **handed to a different repo** — `garden` is freed, then reused for what
  used to be `notes`. Now one string means two repos, and only the era tells them apart.

A table of old→new names survives the first, cannot express the second, and is actively
*wrong* about the third: it would quietly drag the new `garden` onto the old one's identity.
So there is no such table. A stamp's URL is kept exactly as written, and the commit it names
is found by asking the clones which one holds that sha. A commit does not change when its
repo is renamed, sold, or replaced.

## Deliberately not here

Publication decisions, URL liveness checks, sensitive-term handling, HTML or MCP surfaces,
and any source beyond the three above. They belong downstream of a FULL that is already
trustworthy — and they are exactly what turned an earlier attempt into a checkpoint bigger
than the thing it was checking.

Repos absent from `domains.json` collect as `domain: unmapped`. That is a gap in the table,
not a claim about the repo.
