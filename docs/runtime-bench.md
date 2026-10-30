# Agent runtime bench

Moved from the root README at `f05f103` (2026-10-30) without rewriting; only links and positional words were adjusted for the new location. The front door is [README.md](../README.md).

## The bench is self-sufficient

A proving ground that can only install what it already believes in is not a proving ground. This repo's `run.sh` stands up, pins, and tears down the things it evaluates **on its own** — including whole agent runtimes that compete with the stack it currently runs. Nothing about that path routes through entwurf, pi, or any harness under test.

That self-sufficiency is what lets the subject matter widen. The bench started at "does this skill load in five harnesses"; it now asks whether a runtime that writes its own skills beats a human-authored set, whether one sibling with an internal team costs the operator fewer inspection points than three visible ones, and — on the arm being built here rather than installed — whether a Lisp workspace can stand up an RLM loop that a Python REPL currently carries. See [§ Agent Runtime Bench](#agent-runtime-bench). The rule that makes those answers worth anything is boring and strict: **the subject is version-pinned and installed small**, so a re-run means the same thing twice.

## Agent Runtime Bench

Some questions cannot be answered by reading a project's README. *Does a runtime that generates its own skills from experience beat a human-authored skill set?* You only find out by standing both up on the same machine, giving them the same repeated task, and looking at what each wrote down afterwards.

Ten subjects sit on this bench, and they ask different questions:

| Subject | Question | Standing |
|---|---|---|
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Does a self-learning runtime out-write a hand-authored skill set? | candidate, pinned, not adopted |
| [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) | Can one visible parent call an in-process team while reducing GLG's inspection hops? | **Under observation (2026-10-14)** — addressed message round trip confirmed; operator visibility and token burden remain concerns ([OMP.md](../OMP.md)) |
| [prime-agent](https://github.com/junghan0611/prime-agent) (fork) | Can a Lisp workspace stand up the RLM loop a Python REPL carries today? | **built here**, not installed — matrix in [PRIME.md](../PRIME.md) |
| [Ouroboros](https://github.com/Q00/ouroboros) | Besides entwurf, how does a popular Agent OS carry task-memory across harnesses, and how does it run long? | candidate, **not pinned, not installed** — matrix in [OUROBOROS.md](../OUROBOROS.md) |
| [herdr](https://github.com/herdrdev/herdr) | Besides our tmux/entwurf floor, how does an agent-terminal runtime show stuck panes and survive detach? | **last local runtime observation: 0.9.1 on 2026-09-21; not re-measured here.** Later Entwurf plugin/release receipts are supplier evidence, not a local runtime re-test; the reviewed 0.45.0 supplier contract keeps Herdr's separately owned runtime lock and Pi/Claude Code-only launch boundary. The earlier public demo is Pi ↔ native Claude Code, not durable fresh-target support — matrix in [HERDR.md](../HERDR.md) |
| [Xirp](https://backstage.spotify.com/docs/xirp) (Spotify) | When one product owns the whole factory — sessions, worktrees, workflow status, institutional memory — what does it get that a three-part workshop does not? | **cannot be installed: macOS-only** — observation in [XIRP.md](../XIRP.md) |
| [pi 1.0](https://github.com/earendil-works/pi) | Our own floor reached 1.0. Where does it meet our compaction switch, autopilot/goal/decision-gate, codemode, and the extensions this repo loads? | **v1.0.0 source plus 2026-10-02 isolated API-0 checks**: ordinary Pi house tests 319 passed; durable library 851 passed / 2 host-assumption failures. Entwurf 0.45.0 supplies a separate Pi 1.4.0 durable SDK set; the older house-test counts are not a 1.4 re-test, and this documentation cut performs no live install — matrix in [PI.md](../PI.md) |
| [pi-durable](https://github.com/earendil-works/pi/tree/main/packages/durable) | A sibling whose garden id can hold one conversation for a month: what does a *resident* harness change about addressing, skill surface, supply, and what we can honestly observe? | **a separate harness, not a pi feature** — Entwurf 0.45.0 carrier + Pi 1.4.0 SDK source contract; static capability-map D2, with dated delivery evidence kept separate; env-first BG tools/native badge and same-id resident use. Installed integration measured 2026-10-09 on 1.1; the 1.2 `output` consumer passed API-0 44/44 on the 0.36.0 checkout 2026-10-14 — [reference](../pi-durable/README.md), [matrix](../PI-DURABLE.md) |
| [OpenRig](https://github.com/mvschwarz/openrig) | A rig that wraps Claude Code, Codex, Pi and OMP above Herdr — addressing a *position* (`<seat>@<rig>`) rather than an occupant, and carrying Pi headless over RPC: what does a total solution teach a narrow screwdriver? | **observation only, not installed** — `rig setup`/daemon write skill roots, statusLine and Codex hooks this repo co-owns with entwurf; v0.6.10 source read 2026-10-14 — [OPENRIG.md](../OPENRIG.md) |
| [Letta Code](https://github.com/letta-ai/letta-code) + [FrontierMemory](https://github.com/letta-ai/frontiermemory) | From MemGPT to persistent agents: does experience change later behavior, and how does that differ from source retrieval, native durability and one citizen's session lineage? | **source observation only (2026-10-24)** — product and benchmark kept distinct; publication experiment vs current public protocol tracked separately; no installation or benchmark run — [LETTA.md](../LETTA.md), connected to [entwurf#151](https://github.com/junghan0611/entwurf/issues/151) |


This comparison belongs here, not in entwurf. **entwurf guarantees its own garden-id,
delivery, and visible-lifecycle logic and compares today's code with yesterday's; it does
not rank other harnesses.** agent-config is the operator-side proving ground, so it asks
whether an external runtime actually reduces GLG's inspection points without weakening
identity, memory, or alignment. This is not a tournament and it is not a reason to grow
entwurf into a planner.

The fifth subject is [herdr](https://github.com/herdrdev/herdr) — "the runtime your coding agents live on." It does not wrap agents; it owns their terminals. The bench asks how pane working/blocked/idle and detach-without-dying compare with entwurf liveness and tmux, not whether to replace tmux. **The isolation premise broke on 2026-09-14**: herdr is installed at `~/.local/bin/herdr` with a running server (0.9.1 as of 2026-09-21), it is absent from `nixos-config`, and its agent-state integrations are already installed into the pi, omp, claude, codex, copilot, antigravity-cli, and grok trees that entwurf co-owns. Replacing tmux is still **안 함**. Matrix and the measured delta: [HERDR.md](../HERDR.md). DHH-uses-it is inherited from GLG and unverified here.

The fourth subject is [Ouroboros](https://github.com/Q00/ouroboros) — a popular Agent OS
(Seed · Ledger · multi-runtime adapters). entwurf stays the floor; this bench asks how
they carry a *task* ledger across harnesses and how they run long, against our *life*
memory axis and `/goal`·`/heartbeat`. It is **not adopted and not installed**: no
`setup:ouroboros`, no skill link, no live `ouroboros setup` (that command writes MCP into
host settings this repo co-owns with entwurf). The matrix is [OUROBOROS.md](../OUROBOROS.md).

The first subject is [Hermes Agent](https://github.com/NousResearch/hermes-agent) — an independent runtime with its own gateway, state tree, cron, memory and skill generation. It is a **candidate under evaluation, not adopted infrastructure**: nothing about it is declared in `nixos-config`, and `setup:hermes` is not part of `setup`.

```bash
./run.sh setup:hermes    # pinned tag, minimal closure, explicit call only
```

Two constraints carry the whole thing, and both are one careless edit from being lost:

**Pinned, never fast-forwarded.** `THIRD_PARTY_PACKAGE_REPOS` is the obvious home for the clone, but every entry there is pulled to latest on `setup` and `update`. A subject that moves between runs cannot be re-measured, so hermes is kept out of that map on purpose and `HERMES_TAG` selects the version.

**Installed small, not merely configured small.** Upstream's default build adds 18 optional groups — messaging (Telegram/Discord/Slack), voice, web-search backends. Built that way, "integrations stay off" is a promise about configuration. Built from `.#minimal` they are absent from the closure and cannot be switched on by mistake. The single group added back is `anthropic`, without which `hermes auth add anthropic --type oauth` logs in successfully and only fails later at inference — the auth layer and the SDK are separate, so a successful login proves nothing about reachability.

What that leaves is a runtime that reaches Claude, GPT (`openai-codex` OAuth) and Solar (auto-discovered `UPSTAGE_API_KEY`) while being structurally unable to talk to a messaging platform. State lives in `~/.hermes`; deleting it resets the baseline, and the first run after that is t=0 for anything the runtime claims to have learned.

The comparison target is not another product. It is this repo's own loop — `AGENTS.md` + `skills/` + semantic memory + `botlog`/`NEXT` — and the honest question is whether a machine-written skill trail is more transparent and reproducible than the hand-written one.

The second runtime is [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) — a fork of the harness this repo already runs, tuned as a coding-first surface and evaluated as a **working-submarine candidate**, not an established operating role (GLG, 2026-10-14). One visible OMP parent receives one garden id and calls its internal agents in process for the work it is given. The parent, not the agent profiles, chooses which models to call from the task and the quota currently available. Each profile binds only a name to its model and says “Assist the GLG-requested sibling”; it does not assign rank, speed, cost, context, or a fixed role. The question is **whether the operator can follow and steer the work with less burden**. Fewer inspection boundaries alone do not establish that; GLG's 2026-10-14 experience also raises token-use concerns, without a quantitative comparison.

**OMP is an admitted sibling; its working-submarine benefit remains under observation.** entwurf 0.16.0 (2026-08-31) admitted OMP as the **fifth garden backend**: birth hook, an OMP-native MCP hand, an addressed-receive extension, and `entwurf_fresh_call` on all three public surfaces. It is live on this host with `entwurf-meta-omp` and `entwurf-receive-omp` under `~/.omp/agent/extensions/` plus a native `entwurf-bridge` entry in `~/.omp/agent/mcp.json` (measured on oracle, 2026-09-04).

The two responsibility boundaries remain distinct:

| | Owner | Standing |
|---|---|---|
| *Is omp addressable as one garden citizen?* | `entwurf` | **Yes** — one process = one garden id. In-process agents are not citizens and do not widen the contract. |
| *Does the working submarine reduce GLG's inspection hops?* | `agent-config` | **Not established** — GLG reports opaque, verbose delegation and token burden (2026-10-14, subjective); the D-axis is not a measured benefit. |

This repo wires the OMP **task-agent catalog only**: `omp/agents/*.md` is linked by `./run.sh setup:links` into `~/.omp/agent/agents/`. OMP installation remains outside `run.sh` and `nixos-config`, and the shared skills SSOT is still not injected into `~/.omp`; the operational team stays reproducible without turning the measurement surface into a furnished copy. The provider seal, bridge ownership, operator boundary, and reproduce block live in [OMP.md](../OMP.md).

### The third subject is one GLG is building

[prime-agent](https://github.com/junghan0611/prime-agent) is a fork of [PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent), and it is where the bench stops measuring other people's runtimes and grows an arm of its own.

Upstream's core abstraction is the **Recursive Language Model** — context as variables, subagents as function calls, all of it inside a *persistent Python REPL* that survives across turns. This fork replaces that language. `prime-agent-runtime-clj/` stands a **Clojure/SCI workspace on a GraalVM native image** beside the Python one, and since checkpoint `edc3a3e8` (H8) **Clojure is the default kernel with no fallback** — a missing binary raises a teaching error instead of quietly reverting to Python (`PRIME_AGENT_KERNEL_RUNTIME`, branch `feat/clojure-runtime`).

The reason is not language preference. It is what a Lisp workspace makes *legible*:

> Natural language is exploration; Lisp is the public state, the contract, and the form. What the model did has to survive as a form in the workspace, not as a paragraph claiming it did. — the fork's `AGENTS.md`

Which makes the success condition unusual for an agent project: not a benchmark score, but **whether GLG can read the workspace forms and decide the next design from them.** Three rules keep that honest, and they are the same rules this repo's bench runs on:

- **The Python oracle is never deleted.** Two arms have to stand side by side or there is no comparison — only an assertion.
- **Coverage is standing, not procedure.** *"When coverage is there and the possibility is real, the possibility becomes real. Get it wrong and it is just fraud."* (GLG) No claim of performance or advantage is made before the contract coverage exists to back it.
- **A failure is an observation to classify, not a verdict.** A red on the Clojure arm is recorded as `semantics-gap`, `model-fumble`, or `harness-gap` — whichever the receipt supports. A prose-only pass or a Python fallback is not a Lisp success.

Scope boundary, stated once so it is not re-derived: this is an experiment in **computation inside one citizen**. It does not touch entwurf's address, delivery, or receipt layer, and it never promotes a message between siblings into an executable form. Coordination and computation stay apart ([entwurf#88](https://github.com/junghan0611/entwurf/issues/88)). Current position and the open board live in the fork's `NEXT.md` and [issue #1](https://github.com/junghan0611/prime-agent/issues/1).

[YEGGE.md](../YEGGE.md) is the lighter observation log. Wheelhouse is neither installed nor a
candidate: it is an occasional external sighting used to separate durable runtime facts
from cockpit fashion. Its current entry records one useful confirmation only — tmux can
own session lifetime while Emacs remains a replaceable projection — and explicitly opens
no implementation lane.

[XIRP.md](../XIRP.md) is the sixth subject and the only one this machine **cannot** run: Xirp is
macOS-only, so the question is never whether to adopt it but how far a product that owns the
*whole* factory has actually gone. Spotify calls it a **vendor-neutral agentic development
environment** and states that as an architectural requirement — *context is decoupled from any
single agent or harness; switch tools mid-project, and the full working state carries over* —
built to coordinate 50+ parallel sessions, each in its own worktree. That last phrase names the
same problem garden-id solves, with the opposite answer: **Xirp holds the context and swaps the
harness; entwurf holds only the address and leaves context with each citizen.** The memory axis
diverges further — Portal accumulates institutional memory as a substrate it owns, while
`/recall` deliberately refuses to become a memory emperor. One caution is written large in that
file: the claim that **Pi became a first-class Xirp harness is inherited from a ChatGPT analysis
and could not be confirmed here** — Spotify's own docs still list Claude Code, Codex and Gemini,
and the changelog names Cursor but not Pi. Verifying or retiring that one sentence is the file's
first open item.

[PI-DURABLE.md](../PI-DURABLE.md) is the eighth subject and the only one that is **our own floor
wearing a different lifetime.** `pi-durable` shares pi's upstream source, and that shared source
merges none of their runtime, storage, authentication or admission contracts — entwurf states that
boundary in its own words (*"Treat `pi-durable` as a separate native harness, not an enhancement to
ordinary Pi"*) and registers it as a separate backend. What makes it a bench subject rather than a
version note is **time**: one garden id can hold one conversation for a month, a core durable is
meant to be resident per main repository, and dormancy is not its normal state. That single change
breaks assumptions written for session-shaped citizens — it already produced a measured defect in
this repo, where `entwurf-peek` dropped every durable record as schema-invalid and would then have
reported a month-old resident as *"before its first turn"* (fixed 2026-10-06, 81 checks green).
The 2026-10-06 D0/source-only snapshot remains history in that document; current Entwurf 0.45.0 supplies the app carrier, while its static capability map still records **D2** and its delivery matrix preserves separately scoped live evidence. The 10-08 env restart and 10-09 aggregate reload/actual BG query are dated observations, not crash recovery, exactly-once delivery or a memory-quality benchmark. Skills share Pi's `loadSkills` door; classic Pi extensions still do not load. This repo's separate native module is the measured alternative, not a claim to reproduce the Pi extension ecosystem. The memory-axis implementation [andenken#15](https://github.com/junghan0611/andenken/issues/15) is now completed for explicitly admitted closed snapshots; this does not collect every live conversation or turn the JSONL recap into a SQLite reader. Runtime supply, addressing and native-module ingress belong to entwurf. Consumer policy and its reference implementation belong here.

[OPENRIG.md](../OPENRIG.md) is the ninth subject, an observation log like XIRP.md. OpenRig calls itself the layer above harnesses — *"A harness wraps a model. A rig wraps your harnesses"* — and sits on Herdr. It is the clearest outside contrast to this repo's floor on two axes: its address names the seat **position**, never the occupant, where a garden id names the citizen; and it runs Pi through its own runner over `pi --mode rpc`, with TUI-native Pi deferred to a separate future contract, where GLG's rule is that Pi stays visible as its own TUI. It does not carry pi-durable. GLG's 2026-10-14 reason for adding it is learning, not adoption: resume honesty as a named layer, re-derivation `grep`s inside its as-built docs, `compaction_strategy` as a declared seat property, and gate scripts paired with tests. Nothing is installed; its setup writes into files entwurf co-owns.

[LETTA.md](../LETTA.md) is the tenth subject: a memory-centered product paired with an evaluation surface, not a single memory engine. Letta grew from UC Berkeley's MemGPT research into a persistent-agent platform; FrontierMemory asks whether memory learned from earlier trajectories improves later task performance. The inquiry keeps retrieval, memory refinement, native runtime durability, and [one garden birthday across native generations](https://github.com/junghan0611/entwurf/issues/151) distinct. The initial 2026-10-24 observation reads pinned Letta Code and FrontierMemory sources and the launch post; it does not reproduce the rankings or install anything. Existing LoCoMo/LongMemEval questions and publisher-favorable evaluation choices remain part of the review, not reasons to adopt or dismiss the product. This is material for GLG and Andenken to discuss, not permission to add a memory engine to Entwurf.

[UNCLEBOB.md](../UNCLEBOB.md) sits beside it but looks at a different surface: **what a harness
uses to prove itself.** Robert C. Martin spent 2026 building SwarmForge — 331 commits, git
worktrees, a babashka handoff daemon, a constitution, nine pack/forge branches — and then on
2026-09-12 wrote that the need for it was obviated. What he *kept* is the finding: CRAP,
mutation, coverage, DRY, all as external deterministic tools, with a 6-line `AGENTS.md` whose
only rule is *do not pin prompt prose with automated tests*. Constraint by prose went down;
judgement by measurement did not. Measured the same day, `pi-mono` (TS, tests at 77% of
source, per-package `test/`) and `herdr` (Rust, `#[cfg(test)]` in 186 of 378 files, plus
python `maintenance-test` modules that gate CHANGELOG, config-reference and docs-translation
parity) reach the same shape in different languages — and **none of the three gates on a
coverage percentage.** That convergence is now lens 5 of `harness-bench`.

This file is the one bench document that **deliberately crosses the no-verdict line**, at
GLG's explicit request, because entwurf 0.23.0 and the herdr plugin 0.2.0 were shipping and
the standard had to exist before the user base widened. Its §D is material prepared for
entwurf 담당자 — coordinates and precedent, never an instruction — and it opens by naming the
line it crosses. No other `NAME.md` inherits that license.
