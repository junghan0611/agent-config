---
name: improve-agent
description: Analyze past session files (pi or Claude Code) to find recurring AI agent issues and fix them via AGENTS.md updates, new skills, or code/infra changes. Use when asked to improve agent workflow, find recurring problems, optimize AGENTS.md, create skills from session patterns, or understand what went wrong across sessions. Also covers tone — when the complaint is that the agent *sounded* defeated, self-critical, or that collaboration felt heavy, use `--says` and the opening-frame method in Step 3c rather than word counts.
---

# Improve Agent

Analyze past coding sessions to find recurring agent issues, then fix them by
updating AGENTS.md, creating new skills, or improving code/infra.

**Multi-harness.** Both pi (`~/.pi/agent/sessions/<mangled-cwd>/`) and Claude Code
(`~/.claude/projects/<mangled-cwd>/`) are supported. `extract.py` translates Claude
Code records into the pi schema on read, so every mode below works on either source.
Default source is the harness you are running under; override with `--source`.

## How It Works

Each session is a JSONL file capturing tool calls, tool results (with
success/failure), user messages, assistant prose, and compaction summaries.
Patterns across sessions show where the agent repeatedly struggles.

The two harnesses record the same events under different names. What the adapter
normalizes — worth knowing when you drop to raw JSONL in Step 3b:

| Signal | pi | Claude Code |
|---|---|---|
| tool call | `toolCall`, `arguments.path` | `tool_use`, `input.file_path` |
| tool result | `role: toolResult`, `isError` | `tool_result` block in a **user** message, `is_error` |
| user abort | `stopReason: "aborted"` | text `[Request interrupted by user]` |
| **permission denial** | — | `is_error` result: *"user doesn't want to proceed"* |
| compaction | `type: "compaction"` | user record, `isCompactSummary: true` |

Claude Code carries one signal pi does not: a **denied permission prompt** — the
user reading a proposed tool call and pressing No. It is reported as a
correction, not a failure: nothing broke, the agent was about to do the wrong
thing. High-value, and easy to lose in the failure stats if you don't split it.

## Extraction Script

```bash
python3 {baseDir}/extract.py [options]
```

Auto-discovers the sessions directory from `$PWD` for the current harness.
Use `--source` to pick a harness, `--sessions-dir` to point somewhere explicit.

Changing `extract.py`? Run the regression suite — it pins the clock, the
prose/thinking split, and the denial-vs-failure boundary, all of which have
broken before:

```bash
python3 {baseDir}/test_extract.py
```

### Modes

| Mode | What it extracts |
|------|------------------|
| `--summary` | Overview: session count, tool usage, failure count, abort count |
| `--commands --stats` | Most common bash commands (frequency table) |
| `--reads --stats` | Most read files |
| `--says --match REGEX` | What the agent *said* — its prose. The only window on tone |
| `--failures --stats` | Tool failures (`isError=true`) with triggering command context |
| `--corrections` | User corrections: aborted agent turns paired with next user message |
| `--sequences` | Narrative view: tool calls, user messages, failures in order |
| `--sequences --match ERROR` | Zoom into error sequences with surrounding context |
| `--compactions` | Session summaries: goals, progress, blockers, decisions |
| `--context LINE` | Full untruncated context around a specific line in a session file |

### Common Options

| Flag | Description |
|------|-------------|
| `--source pi\|claude\|all` | Harness to analyze (default: the one you're running under) |
| `--match REGEX` | Filter items by regex |
| `--stats` | Frequency table instead of raw output |
| `--last N` | Number of recent sessions (default: 10) |
| `--top N` | Items in frequency table (default: 30) |
| `--before DATE` | Only sessions before this date (ISO: 2026-03-01) |
| `--after DATE` | Only sessions on or after this date (ISO: 2026-03-01) |
| `--include-heuristic` | With `--failures`: also show pattern-matched output (noisy) |
| `--sessions-dir PATH` | Override auto-discovered sessions dir |
| `--projects DIR [DIR ...]` | Analyze sessions from multiple project directories |
| `--session-file PATH` | Session file path (required with `--context`) |
| `--window N` | Entries before/after `--context` line (default: 5) |

### Output Format

All output includes JSONL line references (`L:NNN` or `session:LNNN`)
and the **full filepath** to the session file (as a header per session,
or as a legend in stats mode). This lets you jump from any finding
directly to the raw data.

To drill into a specific event with the built-in context viewer:

```bash
python3 {baseDir}/extract.py --context 42 --session-file /path/to/session.jsonl
```

Or manually with jq/sed:

```bash
sed -n '42p' /path/to/session.jsonl | python3 -m json.tool
```

## Workflow

Follow these steps in order. Present findings to the user after each step.

### Step 1: Overview and Context

```bash
python3 {baseDir}/extract.py --summary
```

Read the project's `AGENTS.md` if it exists. Understand what guidance the
agent already has.

### Step 2: Find Recurring Patterns

Run the frequency analyses and check user corrections:

```bash
python3 {baseDir}/extract.py --commands --stats
python3 {baseDir}/extract.py --failures --stats
python3 {baseDir}/extract.py --reads --stats
python3 {baseDir}/extract.py --corrections
```

Look for:
- **High frequency, many sessions**: agent doing the same thing over and over
- **Recurring failures**: same errors across sessions
- **Repeated file reads**: agent can't find what it needs
- **Command variations**: same intent, many spellings (e.g. `make test | tail -5`,
  `make test | tail -10`, `make test | tail -20` — noisy output problem)
- **User corrections**: what the user aborted and redirected — these reveal
  cases where the agent technically succeeded but did the wrong thing

### Step 3: Understand the Stories

For the top patterns, use sequences to see *what happened*:

```bash
# See error narratives
python3 {baseDir}/extract.py --sequences --match "ERROR"

# Deep-dive into specific patterns
python3 {baseDir}/extract.py --commands --match "git add"
python3 {baseDir}/extract.py --failures --match "syntax|paren|not found"
```

The sequence view shows:
- `USER` messages — what the user asked for or complained about
- `BASH/EDIT/READ/WRITE` — what the agent did
- `!! ERROR` — where things went wrong (ground truth: non-zero exit / tool error)
- Context before and after failures reveals the root cause

Also check compaction summaries for session-level context:

```bash
python3 {baseDir}/extract.py --compactions
```

### Step 3a: Zoom Into Specific Moments

When a sweep surfaces something interesting at a specific line, use
`--context` to see the full untruncated picture — complete tool output,
full user messages, full assistant reasoning and thinking:

```bash
# The filepath is shown in every session header — copy it directly
python3 {baseDir}/extract.py --context 42 --session-file /path/to/session.jsonl

# Wider window for complex sequences
python3 {baseDir}/extract.py --context 42 --session-file /path/to/session.jsonl --window 10
```

This is the primary drill-down tool. Use it whenever a line number
catches your attention in the sweep output.

### Step 3b: Go Off-Script — Investigate the Raw JSONL

`--context` covers most drill-down needs, but sometimes you need to ask
questions it can't answer — correlating events far apart in a session,
counting patterns across the whole file, or extracting specific fields.
For those, go straight to the JSONL with jq, grep, or python one-liners.

**Mind the schema.** The recipes below are **pi-shaped**. Run them against a
Claude Code file and they return nothing — which reads like "no problems found"
and is the easiest way to draw a false conclusion here. `extract.py` hides this
difference; raw `jq` does not. Check which harness the file belongs to first
(`~/.pi/…` vs `~/.claude/projects/…`) and use the matching column:

| | pi (`~/.pi/agent/sessions/<mangled>/`) | Claude Code (`~/.claude/projects/<mangled>/`) |
|---|---|---|
| record | `.type == "message"` | `.type == "user"` / `"assistant"` |
| role | `.message.role` (incl. `"toolResult"`) | `.message.role` (no toolResult role) |
| tool call | `.type == "toolCall"`, `.arguments` | `.type == "tool_use"`, `.input` |
| tool result | role `toolResult`, `.message.isError` | `.type == "tool_result"` block **inside a user message**, `.is_error` |
| tool name on a result | `.message.toolName` | absent — join `.tool_use_id` → the `tool_use` `.id` |
| abort | `.message.stopReason == "aborted"` | text `[Request interrupted by user]` |

Claude Code file paths also appear under per-session UUID subdirs; `subagents/`
holds Task sidechains (a different agent's story — exclude unless that's the target).

Example investigations (pi schema):

```bash
# Get full context around a suspicious line
S=~/.pi/agent/sessions/<dir>/<file>.jsonl
sed -n '40,50p' "$S" | jq -r '.message.content[]?.text // empty' | head -40

# All user messages (complaints, corrections, instructions)
jq -r 'select(.type=="message") | select(.message.role=="user")
  | .message.content[]? | select(.type=="text") | .text' "$S"

# Full error output for a specific toolResult (not truncated)
sed -n '42p' "$S" | jq -r '.message.content[].text'

# All tool calls in order with their names (quick narrative)
jq -r 'select(.type=="message") | select(.message.role=="assistant")
  | .message.content[]? | select(.type=="toolCall")
  | "\(.name): \(.arguments | tostring | .[0:120])"' "$S"

# Count consecutive edits to the same file (struggle detector)
jq -r 'select(.type=="message") | select(.message.role=="assistant")
  | .message.content[]? | select(.type=="toolCall")
  | select(.name=="edit") | .arguments.path' "$S" \
  | uniq -c | sort -rn | head

# All toolResult errors with full output
jq -r 'select(.type=="message") | select(.message.role=="toolResult")
  | select(.message.isError==true)
  | "[\(.message.toolName)] \(.message.content[0].text[0:300])"' "$S"

# What did the assistant say right after an error? (reaction pattern)
# Use line numbers: if error is at L42, check L43
sed -n '43p' "$S" | jq -r '.message.content[]?
  | select(.type=="text") | .text[0:300]'

# Find retry/struggle loops: same command repeated within 10 lines
jq -r 'select(.type=="message") | select(.message.role=="assistant")
  | .message.content[]? | select(.type=="toolCall")
  | select(.name=="bash") | .arguments.command' "$S" \
  | uniq -c | sort -rn | head
```

The same investigations against a **Claude Code** session:

```bash
S=~/.claude/projects/<dir>/<uuid>.jsonl

# All tool calls in order (quick narrative)
jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")
  | "\(.name): \(.input | tostring | .[0:120])"' "$S"

# Failed tool results, full output. Add `| select(test("doesn.t want to
# proceed"))` to isolate permission denials — the user pressed No.
jq -r 'select(.type=="user") | .message.content[]?
  | select(.type=="tool_result" and .is_error==true)
  | (.content | if type=="array" then .[0].text else . end)' "$S"

# What the user actually says (drop injected context and tool results)
jq -r 'select(.type=="user" and (.isMeta|not)) | .message.content
  | if type=="string" then . else (.[]? | select(.type=="text") | .text) end' "$S"
```

Note `isMeta` records: local-command caveats and skill preambles injected into the
transcript. They are *not* the user talking, and they outnumber real user messages —
filter them out or your "what did the user complain about" query drowns.

Trust your judgment. If extract.py's output raises a question, answer it from the
data — the JSONL has full tool output, user messages, and assistant reasoning.
Don't stay at the summary level when the details matter.

### Step 3c: When the Complaint Is About *Tone*

Sometimes the operator reports a feeling, not a bug — the agent sounded
defeated, the collaboration felt heavy. `--says` is the only mode that shows
what the agent actually said, so start there. Then be careful: this analysis
misleads easily, and each rule below is here because it already went wrong once.

**Report scenes and rate separately.** A tone shift can be a handful of
sentences among thousands of turns, so a rate may stay flat while the operator
plainly met the thing several times. Neither number cancels the other, and
neither one alone is the answer:

- *Scenes*: the operator hit this 4 times today, 0 times last week.
- *Rate*: 0.35% of turns — present, but not a statistical outlier.

**Regex finds candidates, not findings.** In a real run `실수` matched *"이제
실수로 `git push`해도 구 저장소로 안 갑니다"* — a success report scored as
self-blame. Candidate sets here are small (a dozen, not a thousand): **read
every one in full context and label by hand.** Never ship a tone statistic
straight from a pattern match.

**Label the opening clause by what it does — descriptively.** Keyword position
("is there a self-blame word in line 1?") groups *"원인 정확히 나왔습니다 —
죄송합니다…"* (a diagnosis that apologizes in passing) with *"제 실수입니다."*
(a verdict). What differs is the speech act the reader gets first:

| Opening frame | The reader first learns… |
|---|---|
| State / result | what closed, what changed |
| Diagnosis / repair | the cause, and the fix going in |
| Incident disclosure | a risk they must know now, and who owns it |
| Verdict / self-assessment | who was right, and how wrong the agent was |

These are **descriptive labels, not a health scale.** Any of them can be right
or wrong for the moment: a verdict frame is exactly right in an audit, and a
diagnosis frame can be used to duck responsibility. Most messages carry more
than one frame — allow multiple labels rather than forcing a winner. What you
can report is the *distribution* and how it moved, not a diagnosis of the agent.

### Step 3d: Killed Hypotheses Are the Deliverable

Most of what you suspect will be wrong. That is the skill working. Keep the
negative results in the report — they are what stops everyone from acting on a
story the data won't carry. One real run ended with four dead hypotheses and a
single small surviving fact, and the small fact was worth more precisely because
the four had been ruled out.

Do not repair a dead hypothesis into a live one to hand the operator the answer
they expected. When the felt sense and the data disagree, report both and name
the axis each one measures. The operator's sense is a strong source of
hypotheses; it is not a verdict the data must be bent to confirm, and the data
is not a verdict on their experience either. Say what you measured, say what you
did not, and let the disagreement stand if it stands.

### Step 3e: Watch the Clock You Measure With

Comparing days? Then how a session gets its date is load-bearing. Both harnesses
store UTC; `extract.py` converts both to the **local start date** so that
`--source all` doesn't split one evening across two buckets. Note the limit: a
session running past midnight keeps its start day.

It used to use mtime, which was a real bug — any later touch walks a session's
mtime into the next day, silently moving it between `--before`/`--after` and
reshuffling which files `--last N` picks. Two runs an hour apart disagreed on
the day's session count, and every rate computed from them moved too. **If day
totals shift between runs, suspect the clock before you suspect the data.**

Pick baseline days with **comparable activity** (similar commits, repos,
sessions). A quiet day next to a heavy one manufactures a spike out of volume
alone.

### Step 4: Rank Issues by Impact

For each issue found, assess:
- **Frequency**: how many times it occurs
- **Sessions affected**: how many separate sessions
- **Cost per occurrence**: how many commands wasted recovering

Rank by `frequency × sessions`. Focus on the top issues.

### Step 5: Present and Resolve One by One

For each issue, present to the user:
1. **What**: the observable pattern with quantitative data
2. **Why**: root cause analysis
3. **Options**: 2-3 resolution approaches

#### Choosing the Right Resolution

Ask two questions:

**Is the tool/command/infrastructure itself broken or misleading?**
Fix it directly — Makefile target, helper script, git hook, config file,
whatever it takes. The agent shouldn't need guidance to work around
broken tooling.

**Is it knowledge the agent needs?**
Two options, depending on scope:

- **AGENTS.md entry** — for concise, project-specific guidance the agent
  needs every session. See "Writing Good AGENTS.md Entries" below.
- **New skill** — for rich, reusable workflows that span sessions or
  projects. See "Step 5b: Create a Skill" below.

Often the answer is both: fix the broken command AND document the correct
usage. Present options to the user, wait for them to pick, then implement.

Verify the change works:

```bash
# Test that the updated AGENTS.md is loaded and understood
# (pi -p; under Claude Code use: claude -p)
pi -p "Read AGENTS.md and confirm you see the new guidance about <topic>"

# Or test the specific behavior the new guidance should produce
pi -p "Show me how you would <thing the agent kept getting wrong>"
```

Verify against the harness whose sessions surfaced the issue — a Claude Code
finding (e.g. a Read-before-Edit stumble) proves nothing when replayed in pi.

Then commit and move to the next issue.

### Step 5b: Create a Skill

When analysis reveals a **recurring multi-step workflow** — the agent
writing the same helper scripts across sessions, following the same
complex sequence of commands, or needing the same domain knowledge
repeatedly — that's a skill, not an AGENTS.md entry.

**Recognizing skill opportunities:**
- The agent writes similar ad-hoc scripts in 3+ sessions
- A workflow requires 5+ steps that the agent reinvents each time
- Domain-specific knowledge (API patterns, tool quirks) keeps being
  rediscovered
- The pattern appears across multiple projects (use `--projects` to check)

**Creating the skill:**

1. **Extract intent from session data.** The sessions already show what
   the skill needs to do. Look at the successful command sequences,
   the scripts the agent wrote, and the user corrections that refined
   the approach.

2. **Scaffold the SKILL.md.** Use proper frontmatter:
   ```yaml
   ---
   name: my-skill
   description: What it does and when to trigger. Be specific about
     contexts — include phrases users would say. Err on the side of
     triggering too often rather than too rarely.
   ---
   ```

3. **Write the workflow.** Translate the successful patterns from session
   data into clear steps. Explain *why* each step matters — the agent is
   smart and responds better to reasoning than rigid instructions.

4. **Bundle repeated scripts.** If the agent kept writing the same helper
   script across sessions, write it once and put it in the skill directory.
   Reference it from SKILL.md with `{baseDir}/scripts/helper.py`.

5. **Test it.** Run a quick pi session to verify the skill triggers and
   the workflow produces good results:
   ```bash
   pi -p "<prompt that should trigger the skill>"
   ```

6. **Keep it lean.** SKILL.md under 500 lines. If it grows beyond that,
   split into a main SKILL.md and `references/` directory with detailed
   docs that get loaded on demand.

### Step 6: Verify Changes Worked

After implementing fixes, verify they had the intended effect in
subsequent sessions. Use `--before`/`--after` to compare windows:

```bash
# Check the pattern before the fix
python3 {baseDir}/extract.py --failures --match "the-pattern" --before 2026-03-01

# Check after the fix
python3 {baseDir}/extract.py --failures --match "the-pattern" --after 2026-03-01
```

If the pattern still appears at similar frequency, the fix didn't work.
Investigate why — the root cause may be different from what you assumed.

This step is optional during the initial analysis but valuable as a
follow-up in a later session.

## Multi-Project Analysis

When the user suspects patterns span multiple projects, or wants to
identify cross-cutting skill opportunities:

```bash
# Analyze failures across two projects
python3 {baseDir}/extract.py --failures --stats \
  --projects ~/co/project-a ~/co/project-b

# Check corrections across projects
python3 {baseDir}/extract.py --corrections \
  --projects ~/co/project-a ~/co/project-b --last 5
```

Each project directory gets resolved to its sessions directory for the selected
`--source` automatically. Output labels include the project name for context;
Claude Code sessions are prefixed `c:` so mixed `--source all` output stays
unambiguous.

A pattern that shows up in **both** harnesses is a fact about the work or the repo.
One that shows up in only one is usually a fact about that harness — fix it there
(harness config, hooks, that harness's skill surface), not in the shared AGENTS.md.

Cross-project patterns are strong signals for global skills (`~/.agents/skills/`) or global AGENTS.md entries.

## Writing Good AGENTS.md Entries

- **Concise**: 3-5 lines per topic. The agent reads this every session.
- **Actionable**: Commands to run, not explanations of why.
- **Specific**: Exact command syntax, not "use the right flags."
- **No hardcoded paths**: Use `$PWD`, environment variables, or discovery snippets.
- **Grouped**: Related guidance together (testing, git, reference code, etc.)
