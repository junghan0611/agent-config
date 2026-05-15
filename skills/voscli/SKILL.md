---
name: voscli
description: "VOC analysis workbench for ~/repos/work/voscli. Use for daily VOC reports, anomaly review, compare-day analysis, chat traceability, evidence lookup, and driver/response-lane classification. Triggers: 'voc', 'voscli', 'VOC report', 'anomaly', 'compare day', 'evidence-lookup', 'today to watch', 'driver', 'response lane'."
user_invocable: true
---

# voscli — VOC Analysis Skill

Thin skill surface for `~/repos/work/voscli`.

Use this skill when the user wants:
- a daily VOC report
- what looks unusual today
- comparison between two days
- which product/topic/joint category caused a spike
- chat-level traceability or quote recovery
- which operational lane an anomaly belongs to (driver classification)

## First Principle

**Do not paste raw chat data into context.**
Narrow with voscli commands first, then reason from derived outputs.

## Main Commands

Run from repo root:

```bash
cd ~/repos/work/voscli
```

| Goal | Command |
|---|---|
| Build sessions from raw data | `./run.sh normalize ...` |
| Export one-chat-per-file | `./run.sh export-sessions ...` |
| Recover chat evidence | `./run.sh evidence-lookup ...` |
| Build analysis pack | `./run.sh analyze --in ... --out-dir ...` |
| Validate agent result EDN | `./run.sh analyze --accept ...` |
| Apply per-chat summary | `./run.sh apply-summary ...` |
| Build aggregate view | `./run.sh aggregate-chats ...` |
| Compare two dates | `./run.sh compare day ...` |
| Detect anomalies vs baseline | `./run.sh anomaly ...` |
| Classify anomaly into drivers / response lanes | `./run.sh classify-drivers ...` |
| Render final Markdown report | `./run.sh report ... [--drivers drivers.edn]` |
| Run tests | `clj -M:test` |

## Which Command to Use

| Question | Use |
|---|---|
| “How is today different from usual?” | `anomaly` |
| “How is today different from yesterday?” | `compare day` |
| “Which product/topic/joint caused the spike?” | `anomaly` then `evidence-lookup` |
| “Show the actual chats behind this signal.” | `evidence-lookup` |
| “Which operational lane does this belong to?” | `classify-drivers` |
| “Give me the daily Markdown for ops.” | `report --drivers ...` |

## Current Working Pattern (v0.5a)

### 1. Daily anomaly
Use `anomaly` for baseline-based outlier detection.

- It checks today against earlier days.
- It covers both total volume and category-level signals.
- It can surface product, topic, and product×topic joint spikes.
- Operating-hours-only scope may also be included when available — when an entry's mod-z is sharper in ohs than in full-day, the night-time noise was diluting the signal, so the daytime cause becomes the priority for follow-up.

### 2. Direct day-vs-day comparison
Use `compare day` when the user asks for a direct comparison between two specific dates.

- This is not the same as anomaly detection.
- Use it as a complement, not a substitute, when the question is explicitly comparative.

### 3. Driver classification
Use `classify-drivers` to translate an anomaly into operational lines.

- It is deterministic and rule-based — no LLM call.
- A driver is the operational meaning of the anomaly (quality / usage-setup / order-delivery / pre-purchase / promotion / account-access / security-trust / b2b-sales / ops-load / unclassified).
- Each driver carries `response-lanes` — the actual handoff routes (e.g. `cs-triage`, `qc`, `manufacturer-escalation`, `exchange-refund`, `content-update`, `security-escalation`).
- Joint entries (product × topic) match strictly; topic entries match strictly; product-only entries are deliberately marked as `needs-disambiguation` with joint-hints as auxiliary signal.
- `T_동작,제어이상` matches both `:quality` and `:usage-setup` as **ambiguous** — never collapse to one driver before checking evidence.
- `:ops-load` is an **operational overlay**, not a contact driver. It rides on top of the contact-driver signal; the report renders it separately.

### 4. Final report surface
Use `report --anomaly ... --drivers ...` to generate the operator-facing Markdown.

- The report places a deterministic **“Today to watch”** section at the top when anomaly input is provided.
- When drivers input is provided, each root-cause entry gets an inline `Driver / 대응축 / 판정` block, and ops-load surfaces as an **operational overlay** line above the rest.
- That `.md` is the main operator surface: overall scale, root signals (with driver + response lanes), additional signals, operating-hours comparison, and next actions.
- When `report.md` is provided to the agent, no further voscli call is needed for an ops-level summary.

## Minimal Workflow

### Daily report workflow
```bash
./run.sh normalize ...
./run.sh export-sessions ...
./run.sh aggregate-chats ...
./run.sh anomaly --aggregate ... --target YYYY-MM-DD --out anomaly.edn
./run.sh classify-drivers --anomaly anomaly.edn --out drivers.edn
./run.sh report --ops ... --product ... --provenance ... --aggregate ... --anomaly anomaly.edn --drivers drivers.edn --out report.md
```

### Traceability workflow
```bash
./run.sh evidence-lookup --index ... --chat-dir ... --by-product ...
./run.sh evidence-lookup --index ... --chat-dir ... --by-topic ...
./run.sh evidence-lookup --index ... --chat-dir ... --by-product ... --by-topic ...
```

## Evidence Lookup Rule

Use `evidence-lookup` whenever you need:
- real chat IDs
- actual user/manager lines
- proof for a product/topic/joint claim
- disambiguation between `:quality` and `:usage-setup` on `T_동작,제어이상`
- topic resolution for a product-only driver candidate

Prefer command-based narrowing over manual reading.

## Fast-Fail Rule

voscli is **strict**.
If a command exits with a violation, do **not** pretend a result exists.

Examples:
- missing target date
- invalid baseline
- too-small baseline
- inconsistent scope
- mismatch between anomaly input and aggregate input
- unsupported taxonomy or drivers version
- mismatched target-date or anomaly-version between drivers and anomaly inputs

If it fails:
1. say it failed
2. name the violation
3. suggest the next valid command

## Interpretation Rules

- **Anomaly** = unusual relative to earlier baseline
- **Compare day** = direct difference between two dates
- **Evidence** = chat-level support, not summary guesswork
- **Driver** = operational meaning of an anomaly (which problem)
- **Response lanes** = where to hand it off (which team / which action)
- **Layer** = `:contact` (customer-facing driver) / `:operational` (ops overlay) / `:fallback` (unclassified)
- **Report** = deterministic operator surface, not fresh reasoning

## Output Discipline

When answering from voscli outputs:
- separate **observed signal** from **hypothesis**
- cite product/topic/joint keys precisely
- use chat IDs when available
- do not overstate weak signals
- spike entries surface first — they often signal categories that were absent before and need immediate operator attention
- do not treat zero-result anomaly as “nothing happened” until you also check category signals or compare-day context
- when a driver is **ambiguous** or **needs-disambiguation**, say so explicitly and propose the evidence-lookup step that would resolve it
- never collapse multiple driver candidates into one without evidence
- when ops-load fires, name it as an operational overlay distinct from the customer-facing driver

## Current Scope

This skill is for the current voscli flow centered on:
- traceability
- compare-day review
- anomaly review
- driver / response-lane classification
- report generation

For domain rules, schemas, roadmap, and policy decisions, read the repo docs:
- `~/repos/work/voscli/AGENTS.md`
- `~/repos/work/voscli/README.md`
- `~/repos/work/voscli/ROADMAP.md`
- `~/repos/work/voscli/NEXT.md`
- `~/repos/work/voscli/data/driver/taxonomy.edn`
