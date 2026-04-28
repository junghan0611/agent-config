# agent-config — AGENTS.md

```bash
./run.sh setup    # one-command: clone/pull + build + link + npm — reproducible on any device
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

### No 면피 — Never Silently Catch Invariant Failures

Invariant rule. When something is wrong, **let it crash**. Do not wrap internal invariant failures in `try/catch` to "make it go away".

Why: agents reading their own code see a silent catch and assume the operation succeeded. Downstream logic then proceeds on a false premise, burying the real bug. Especially for pi/ctx API errors (`ctx.ui.*`, `ctx.sessionManager.*`, `pi.sendMessage`, …) that throw from `ExtensionRunner.assertActive()` after session replacement — swallowing those teaches the agent "it's probably my fault, work around it", which is exactly the wrong reflex.

Apply:
- **No** `try/catch` around pi / ctx API calls. Stale runner? Crash. That crash is the signal.
- Remove the **hazard source** instead of catching — e.g., drop a cosmetic `setTimeout(ctx.ui.setStatus, 3000)` rather than wrapping it in try/catch. No defer, no stale window.
- Ban these comment patterns — they are 면피 signals: `/* ignore */`, `/* stale ctx */`, `/* session already closed */`, `/* 세션 이미 종료 */`.
- **Legitimate catches** (not 면피): `JSON.parse` of external input, ENOENT on optional files, `process.kill(pid, 0)` probes, network retry fallbacks. These are external-state boundaries where the error case is a designed scenario — not an internal invariant breach.

> Agent logic with silent catches drifts. Crashes are honest.

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

We do not use compact. See [README § Session Management](README.md#session-management--no-compact). Multi-harness session-recap: `--source pi | claude | all`. Starting from zero is fine — 3-layer search replaces compact.

## Extensions

Located in `./pi-extensions/`. Loaded by pi runtime, registering tools + commands.

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

## Entwurf Orchestration (consumer side)

`entwurf` (delegate/resume), cross-session messaging, and the pi-facing MCP bridge all live in **[pi-shell-acp](https://github.com/junghan0611/pi-shell-acp)**. agent-config consumes the surface — it does not own it.

- **Entry point:** `pi/settings.json` § `piShellAcpProvider.mcpServers.pi-tools-bridge.command` points at pi-shell-acp's `mcp/pi-tools-bridge/start.sh`. This is what injects the MCP surface (entwurf/delegate, resume, session_search, knowledge_search, send_to_session, list_sessions) into every ACP session.
- **Spec:** [pi-shell-acp `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/pi-shell-acp/blob/main/AGENTS.md) — registry schema, Identity Preservation Rule, sync/async contract, verification matrix.
- **Caller responsibility (stays here):** the Cross-Repo Work Loop policy under `## Collaboration with GLG` above. Responsibility lives with the caller, not the mechanism.

## Skills

`./skills/` is the SSOT. `run.sh setup` symlinks them into pi, Claude Code, OpenCode, Codex, and the pi-shell-acp Claude plugin farm. See [README § What's Here](README.md#whats-here) for categories and the LSP-pattern doc principle.

## Release — pi-shell-acp Version Bump

agent-config pins pi-shell-acp by tag. Every release bump touches **4 files**, all must move together. Miss one and consumer-mode installs (server devices) drift from dev clones.

| File | What to change |
|------|----------------|
| `package.json` | `version` field |
| `pi/settings.server.json` | `packages[]` entry — `git:github.com/junghan0611/pi-shell-acp@vX.Y.Z` |
| `run.sh` § `setup_npm()` | **two** occurrences: log line + `pi install` command |
| `CHANGELOG.md` | new `## X.Y.Z` section — what shipped, why pinned, any caveats |

Verify before commit: `git grep -n "pi-shell-acp@v" -- ':!node_modules'` should show only the new tag (3 hits: settings.server.json, run.sh log, run.sh install).

`pi/settings.json` `lastChangelogVersion` is pi-runtime's own changelog ack — unrelated to agent-config releases.

## Development Guide

```bash
# andenken (semantic memory) — tests + indexing live in its own repo
cd ~/repos/gh/andenken && source ~/.env.local
pnpm test                                # all (unit + integration)
pnpm run test:search -- "query"          # live search
pnpm run doctor                          # operational health check
pnpm run golden                          # search quality regression
# /memory reindex (inside pi) — incremental sessions index
# pnpm run index:org [--force]           — rebuild org knowledge base

# pi-shell-acp gates (typecheck, MCP, dual-backend smoke, etc.)
cd ~/repos/gh/pi-shell-acp && ./run.sh check-...   # see pi-shell-acp/AGENTS.md
```
