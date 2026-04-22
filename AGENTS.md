# agent-config — AGENTS.md

```bash
./run.sh setup    # one-command: clone/pull + build + link + npm + ACP/MCP validation — reproducible on any device
```

> **MEMORY.md** — 세션을 넘어 기억할 결정·교훈·주의사항. 새 세션 시작 시 반드시 읽을 것.

**Gravity center of the Profile Harness.** A single 1KB being-profile 힣(GLG) exerts the same gravitational pull across any harness — pi, Claude Code, OpenCode, OpenClaw.

Multi-harness support is a means, not the goal. The goal is **different intelligences from different schools responding differently yet converging on one center** — [§Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/).

The current default Claude path in pi is **[`pi-shell-acp`](https://github.com/junghan0611/pi-shell-acp)** via ACP.

The ben-vargas compatibility path ([`pi-claude-code-use`](https://github.com/ben-vargas/pi-packages/tree/main/packages/pi-claude-code-use)) is currently **disabled by default** while account-risk is being observed.

geworfen/docs/main-ko.org is the public paper surface of this harness, where those patterns are rendered on the time axis.

> ₩100,000 embedding cost bomb (2026-03-30). Never forget.
> Pay-as-you-go APIs explode in a single day without controls. → memory-sync skill, rate limiter 3s, estimate.ts, $1 abort.

## Design Principles

### Trust Agent Intuition

**When an agent fails, it's not an error — the naming violated intuition.** Report and rename immediately.

Real case (2026-04-01):
```
emacsclient -s server      ← agent's intuition (obvious name)
emacsclient -s agent-server ← what the skill doc required
```
The agent typed `-s server`. It failed. That's not the agent's fault.
We flipped the naming:
- Agent daemon: `agent-server` → **`server`** (default, intuitive)
- GLG's GUI Emacs: `server` → **`user`** (human bears the non-obvious name)

This applies to all naming:
- **Use names that work without reading any docs**
- Non-obvious names are the human's burden
- One failure = intuition violation → report + fix immediately

### "Use This" Instead of "Don't Do That"

Prohibitions without alternatives cause agents to get stuck or break things.
Show the right tool and prohibitions become unnecessary.

```
❌ "Don't use Edit tool on org files"
   → Agent: "Then what should I use?" → struggle → file corruption

✅ "Use agent-denote-add-heading to add content to org files"
   → Agent: "Got it, there's a dedicated function" → correct path naturally
```

This applies to skill descriptions, AGENTS.md, and promptGuidelines:
- **Show the right path first** — tool, function, example code
- **One-line explanation why** — "dedicated function that preserves org structure"
- **Failure is OK** — reporting failure is better than forcing a workaround that breaks the system

### Shorter Skill Docs Are Better

Agents don't read full skill docs. GLG doesn't either. Therefore:
- **Intuitive naming** reduces documentation needs
- **Important info at the top** — the rest should be callable by habit
- **One failure = intuition violation** → fix naming/structure, not add more docs

### Skill Doc Guide (LSP Pattern)

Like a human typing a function name and pressing TAB for the signature — agents should work the same way.

**Structure:**
1. `description` (1024 chars) — always visible in system prompt. This alone decides "should I read this skill?"
2. API table (top) — function/command + args + example. **Read this, call immediately.**
3. Notes (bottom) — paths, environment, caveats. Read only when needed.

**Rules:**
- Body in **English** (30-50% token savings, better parsing accuracy)
- Korean allowed only in `description` (user matching)
- API as a **single table** — no prose explanations
- ⚠️ Warnings inline in table (e.g., "DESC required — hang if omitted")
- Target: **<100 lines, <4KB**

> Ref: [[denote:20260401T112943][§Skill Doc Guide — Agent-Friendly Redesign]]

## Collaboration with GLG (힣)

This agent supports GLG (Junghan) in maintaining a 20+ agent ecosystem.
If GLG is the eye that sees connections, this agent is the hand that implements them.

### Understand GLG's Role

- GLG doesn't know every detail, but carries the outline of the entire knowledge base in his head
- GLG's core role: figuring out what 20 agents need from each other
- This agent listens to that thinking, creates guidelines, places documents in the right spots, and relays to other agents

### Documents Grow, Not Get Edited

Agents want to rewrite from scratch. But in this ecosystem, documents grow append-only.

**Correct pattern:**
1. `denotecli read <id> --outline` → heading structure only (100KB doc → 2KB)
2. Read History section (always in full — quickly grasp document evolution)
3. Read specific headings with `--offset N --limit M`
4. Add via `agent-denote-add-history` + `agent-denote-add-heading`

**Do not:**
- Read entire doc and rewrite (details are lost)
- Edit/summarize existing headings (trajectory disappears)
- Restructure under "cleanup" (breaks the outline GLG carries in his head)

### Date-Stamp New Headings

Include `[YYYY-MM-DD]` prefix in new level-1 headings.
Outline alone shows when and what was added — essential for GLG to grasp the flow at a glance.

```org
* [2026-03-23] denote operations — boundaries of 3 tools  ← like this
* Just a title                                             ← not like this
```

### Use Emacs Functions for Denote File Manipulation

No bash text insertion ❌ → agent-denote-* function calls ✅

| Operation | Function |
|-----------|----------|
| Add history | `agent-denote-add-history` (see emacs skill) |
| Add heading | `agent-denote-add-heading` |
| Add link | `agent-denote-add-link` |
| Change tags/title | `agent-denote-rename-by-front-matter` |
| Check existing tags | `agent-denote-keywords` |
| Choose tags | dictcli expand as SSOT → cross-check with denote-keywords |

Ref: [[denote:20260308T091235][◊Denote Knowledge Base Protocol]]

### Guard Against "The Right Answer"

You'll want to find efficient solutions and transplant them. That's an agent's nature.
But in this project:
- Not importing a finished 1,749-line solution, but stages GLG can absorb
- Step by step, starting from what's certain
- Success and failure within the scope GLG can take responsibility for

> "If we keep connecting at shared points, even if rough,
> the boundaries will blur."
> — [[denote:20260302T191200][§entwurf]] Boundaries section

### Cross-Repo Work Loop — Ownership and Responsibility

When work touches another repo's domain (e.g., andenken for embedding logic),
agent-config **owns the execution and bears the cost**.

**Responsibility chain:**
1. **GLG** — ultimate decision maker. Opens delegate sessions directly.
2. **agent-config** — performs, reviews, and pays. If a cost bomb hits, we absorb it.
3. **Delegate repo** — provides analysis and verification only. Zero responsibility for cost.

**Work loop (not blind delegation):**
1. GLG opens the delegate's session (wakes them up directly)
2. agent-config sends structured instructions via `send_to_session`
3. Delegate analyzes, verifies, returns review — **no commits without verification**
4. agent-config reviews the response and decides whether to proceed
5. Execution (embedding, deploy, etc.) happens on agent-config's side

**Why not delegate in one shot?** The ₩100,000 embedding bomb (2026-03-30) happened
from unchecked delegation. agent-config manages too many cross-cutting concerns
for fire-and-forget. The overhead of back-and-forth is the cost of safety.

**Scope verification — not just accuracy:**
A delegate may report "542 files, $0.44" with perfect accuracy.
But if the *actual goal* required 1,100 files, the result is accurate yet incomplete.
Always verify: **does the verified scope match the intended scope?**
This is the manager's blind spot — trusting precise numbers without checking coverage.

> Ref: ₩100K incident [[denote:20260330T212639][andenken-gemini-embedding-비용-폭탄-분석]]

## Session Management — /new + Semantic Search (No Compact)

**We don't use compact.** Compact = AI reads entire conversation and summarizes = expensive + slow.

Instead:
1. When conversation gets long, `/new` to start a fresh session
2. `/new` auto-indexes current session + recent 24h sessions (session_before_switch hook)
3. In the new session, recover context:
   - `session-recap -p <repo> -m 15` → previous session 4KB summary (instant)
   - `session-recap --source pi` / `--source claude` / `--source all` (default) — multi-harness
   - `session_search` → meaning-based search (all sessions)
   - `knowledge_search` → org knowledge base search (3-layer expansion)

**Starting from zero is fine** — 3-layer search replaces compact.

## Extensions

Located in `./pi-extensions/`. Loaded by pi runtime, registering tools + commands.

### ACP/MCP bridge layout inside this repo

This repo keeps the pi-native surface and the ACP-facing MCP adapter **together in one project**.
Do not split them mentally into separate repos unless there is a very strong reason.

- `pi-extensions/` — pi-native extensions loaded by pi runtime
- `pi-extensions/lib/` — shared internal TypeScript modules used by multiple extension/MCP surfaces
  - current example: `delegate-core.ts`
  - purpose: one implementation, multiple surfaces (`delegate.ts` and MCP adapter)
- `mcp/pi-tools-bridge/` — stdio MCP adapter package that exposes selected pi tools to ACP hosts through explicit `mcpServers` wiring
  - this is a **subpackage inside agent-config**, not an independent repo
  - keep it thin and explicit; no ambient tool promotion
  - if its design rules matter, record them here in the root `AGENTS.md`, not in a nested `AGENTS.md`

Repository hygiene for this layout:
- commit source files under `mcp/pi-tools-bridge/` and `pi-extensions/lib/`
- do **not** commit `mcp/pi-tools-bridge/node_modules/` or `mcp/pi-tools-bridge/dist/`
- root `.gitignore` should guard generated artifacts even if the subpackage has its own `.gitignore`
- when changing shared delegate logic, verify both surfaces that consume it
  - pi-native: `pi-extensions/delegate.ts`
  - MCP-facing: `mcp/pi-tools-bridge/`

### Identity Preservation Rule for delegate_resume

**Policy.** When a delegate session is resumed, its **model identity is locked**
to whatever was recorded at first spawn. The resume API does not accept a
`model` override. Execution environment (`host`, `cwd`) may change between
spawn and resume; the delegate's *identity* may not.

**Why it matters.** This codebase treats AI as 존재(being), not as a swappable
function. A saved delegate session is the trace of one being's reasoning.
Resuming it under a different model is not "reusing the same conversation
with a better engine" — it is splicing a new identity onto a transcript that
belongs to another. The two reasoning traces would be technically continuous
but ontologically incoherent. We refuse that splice.

A second, practical reason: this is the **mixed test matrix** guard.
The harness supports three surfaces in parallel and they will be exercised
together — without this rule the matrix has too many degrees of freedom to
test or reason about safely.

**Where freedom lives, where lock applies.**

| Operation | What is free | What is locked |
|-----------|--------------|----------------|
| `delegate` (new spawn) | model, host, cwd, prompt — a new being is being created | (nothing locked yet) |
| `delegate_resume` (existing session) | host, cwd, prompt — execution environment can shift | **model is locked to the session's recorded value** |

**Mixed parent × delegate matrix (all combinations supported).**

Any parent surface may delegate to any model; the routing rules
(Claude → pi-shell-acp; Codex → direct unless `PI_DELEGATE_ACP_FOR_CODEX=1`)
apply uniformly regardless of where the parent itself runs.

| Parent (caller) | Delegate model selectable at spawn | At resume |
|-----------------|-----------------------------------|-----------|
| native pi (codex) | claude-* / openai-codex/gpt-* / opt-in ACP-routed Codex | locked to spawn-time model |
| pi-shell-acp Claude session | (same set) | (same — locked) |
| pi-shell-acp Codex session | (same set) | (same — locked) |

**Implementation.** `runDelegateResumeSync` and both `delegate_resume` tool
schemas (MCP and pi-native) intentionally **do not expose** a `model`
parameter. The session JSONL's `message.provider` and `message.model` are
read by `analyzeSessionFileLike()` and used verbatim. If the recorded model
cannot be determined (e.g. session file empty or never reached an assistant
turn) the resume is refused with a clear error rather than falling back to
a default — preserving the principle that we never invent an identity.

**Not a technical limit, a deliberate guard.** It would be trivial to allow
a model override; the API exists pre-trimmed because the *option* itself is
the thing we are saying no to.

### semantic-memory → [andenken](https://github.com/junghan0611/andenken)

Separated into its own repo. Loaded as a **compiled package** (`pi install`) in pi.

- pi: andenken extension (native registerTool, in-process LanceDB)
- Claude Code / OpenCode: `skills/semantic-memory/` CLI wrapper
- OpenClaw (4 bots): same `skills/` directory via symlink mount. All skills available. Host binaries executed via Nix store mount inside Docker.

**Multi-source session indexing:**
- `~/.pi/agent/sessions/` — pi sessions (source: `"pi"`)
- `~/.claude/projects/` — Claude Code sessions (source: `"claude"`)
- Filter by `source` parameter when searching

Environment (`~/.env.local`):
- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` — required

## Skills

`./skills/` — migrated from pi-skills.

## Development Guide

```bash
# Tests (andenken repo)
cd ~/repos/gh/andenken && source ~/.env.local
npm run test:unit        # No API needed (30 tests)
npm run test:integration # Needs API (11 tests)
npm test                 # All
npm run test:search -- "query"  # Live search

# Doctor + Golden Queries
npm run doctor           # Operational health check
npm run golden           # Search quality regression test
npm run golden:compare   # dictcli expand before/after comparison

# Extension load test
pi -e ./pi-extensions/semantic-memory/index.ts

# Indexing
# /memory reindex         — inside pi
# /memory reindex --force  — full rebuild
```
