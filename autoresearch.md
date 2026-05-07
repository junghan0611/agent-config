# Autoresearch: session-recap latency

## Objective
Optimize `skills/session-recap/scripts/session-recap.py` for the common interactive path:
`python3 skills/session-recap/scripts/session-recap.py -p agent-config -m 15 --source pi`

## Metrics
- **Primary**: `recap_ms` (ms, lower is better)
- **Secondary**: `spread_ms` — run-to-run spread across repeated samples

## How to Run
`./autoresearch.sh` — runs the target command 7 times, reports median latency and spread.

## Files in Scope
- `skills/session-recap/scripts/session-recap.py` — target script
- `autoresearch.sh` — benchmark harness
- `autoresearch.checks.sh` — syntax check
- `autoresearch.md` — session notes
- `autoresearch.ideas.md` — deferred ideas

## Off Limits
- Benchmark cheating (no fake output, no weakening functionality)
- Changing user-facing defaults unless justified by real UX
- Editing session files under `~/.pi/agent/sessions/`

## Constraints
- Preserve output semantics for normal use
- Keep project/source filtering behavior intact
- Do not overfit to a single empty or tiny session file

## What's Been Tried
- Baseline not yet established for this target.
- First hypothesis: reduce per-run allocation and list growth in message extraction by keeping only the final N messages in a bounded deque instead of collecting every message then slicing.
