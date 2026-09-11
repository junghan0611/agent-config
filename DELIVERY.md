# Sibling invocation: how other systems deliver to a peer

This is an agent-config research note, not an entwurf design document. It compares how
other harnesses/frameworks get a message into a sibling/peer agent's model-visible
context — DELIVERY in [entwurf's D0–D8 sense](https://github.com/junghan0611/entwurf/blob/main/DELIVERY.md),
not general multi-agent orchestration (planning, task delegation semantics, or memory
sharing). It is an external comparison point for entwurf delivery work, but makes no
product decision and does not modify entwurf's `DELIVERY.md`.

Every claim below is labeled **official** (vendor spec/docs), **third-party**
(an independent OSS bridge measured or read from its own source), or **upstream
proposal** (an open issue/PR describing wanted, not-yet-shipped behavior). Primary
URLs/paths are cited inline. None of this was measured live against a running
process in this session — it is read from primary sources, at the evidence tier
DELIVERY.md's own scale calls a citation rather than an L-level receipt.

## Method: the seven axes, taken from D0–D8

For each path, the same seven questions are asked, because they are exactly what
D0–D8 already separates:

1. **Address/identity** — what names the target (D0).
2. **Durable enqueue** — is the message stored before/independent of delivery (the
   `queued` state)?
3. **Wake** — does an idle session start a turn without user typing (D4)?
4. **Model-visible injection** — does the payload reach context the model reads, vs.
   a side channel the model never sees (D5)?
5. **Continuity** — same native session/transcript/model path continues (D6), vs. a
   fresh process/thread substituting for it.
6. **Completion/reply receipt** — can the sender observe completion without
   transcript scraping (D7)?
7. **Ownership boundary** — what the bridge/framework owns vs. what stays inside the
   vendor's own process (mirrors DELIVERY.md's closing "what remains outside entwurf
   ownership").

## Fresh agent vs. addressing an already-running session

This distinction is load-bearing across every path below and is worth stating once,
not per-row. **Creating** a new agent/thread/subagent is a different capability than
**addressing** one that is already running:

- A2A's `SendMessage` on a task with no prior `taskId` **creates** a task; addressing
  an existing task is `taskId` continuation, `GetTask`/`SubscribeToTask`, or a
  follow-up `SendMessage` naming the same `contextId`/`taskId`. [official —
  `docs/specification.md` §7 “Task ID Generation”, a2aproject/A2A]
- Codex app-server's `thread/start` **creates**; `turn/start` against an existing
  `threadId` **addresses** a live thread; `thread/resume` reopens a persisted-but-not
  in-memory thread. [official — `codex_mcp_interface.md`, openai/codex]
- Claude Code subagents (`SubagentStart`/`SubagentStop` hooks) are always a **fresh**
  isolated context spawned by the orchestrating session — there is no "address an
  existing subagent" verb; a subagent is disposable by construction. [official —
  Claude Code hooks reference, code.claude.com/docs/en/hooks]
- OpenCode's `session.prompt` addresses an existing `sessionID`; `session.create`
  (or `session.fork`) makes a new one. The plugin-visible `session.idle` event fires
  on the existing session, not a new one. [official — opencode.ai/docs/sdk;
  opencode.ai/v2/docs/api/session/v2-session-prompt]
- entwurf's own split names this precisely: `entwurf_v2` addresses an existing
  garden id; `entwurf_fresh_call` is the separate creation verb; `entwurf_resume_call`
  reopens a dormant one under the same id. [this repo, AGENTS.md "One delivery verb"]

DELIVERY.md's scope note — "a fresh prompt/process/thread presented as continuation"
is explicitly excluded — is the same line every ecosystem below has to draw somewhere,
and each one draws it in a different place (task ID reuse for A2A, `threadId` reuse
for Codex, session ID reuse for OpenCode, garden id reuse for entwurf).

## A2A (Agent2Agent Protocol)

**Official.** Linux Foundation project, JSON-RPC 2.0 over HTTP with SSE and an
optional gRPC/REST binding; canonical source is the protobuf model
(`specification/a2a.proto`). [a2a-protocol.org/v1.0.0/specification;
github.com/a2aproject/A2A `docs/specification.md`, `docs/topics/streaming-and-async.md`]

- **Address/identity.** An `AgentCard` (fetched via discovery) names a server agent;
  a `Task` has a server-generated `taskId` plus a `contextId` that threads multiple
  tasks into one logical conversation. Clients must not invent task IDs at creation.
  [official — `core/specification.md` §"Layer 1", agent2agent.info/specification/core/]
- **Durable enqueue.** Not a separate primitive from the RPC call itself — `SendMessage`
  is the admission point, and the spec models `Task` as the durable work unit from
  there. Whether that durability survives a server restart/crash is a server-owned
  storage decision the spec does not mandate; the protocol guarantees the task's
  existence and retrievability (`GetTask`) once admitted, not a persistence backend.
- **Wake.** Out of scope by design. A2A addresses a server that is already "up" as a
  service; it does not model waking an idle interactive terminal session. The two
  async mechanisms are SSE streaming (client stays connected) and **push notifications**
  — a client registers a `PushNotificationConfig` (a webhook URL + auth) via
  `CreateTaskPushNotificationConfig`/`set` operations, and the server calls that
  webhook on significant task updates so a disconnected client (mobile, serverless)
  learns the task moved. This is the framework notifying the *client*, not injecting
  into a peer's own context — it is the closest A2A analogue to a "wake," and it wakes
  the caller, not the callee. [official — `docs/topics/streaming-and-async.md`
  "Push Notifications for Disconnected Scenarios"; `docs.rs/a2a-protocol-types`
  `push` module]
- **Model-visible injection.** A2A's `Message`/`Part` payload IS the model-visible
  turn input on the server side — there is no separate "announce vs. inject" split
  because A2A treats the whole exchange as the turn.
  `TaskStatusUpdateEvent`/`TaskArtifactUpdateEvent` stream partial results back, not
  additional context in.
  [official — spec §4.2 Task events]
- **Continuity.** `contextId` is the durable continuation handle across multiple
  tasks; a task itself is server-owned and can be polled (`GetTask`) or resubscribed
  to (`SubscribeToTask`) after a dropped SSE connection, without re-sending the
  message. [official]
- **Completion/reply receipt.** `Task.status` (`completed`/`failed`/`canceled`/
  `input-required`) is an explicit terminal-state enum, observed either by polling
  `GetTask`, by the still-open SSE stream, or by the push-notification webhook — never
  by scraping a transcript. This is the strongest explicit completion taxonomy of any
  path surveyed here.
- **Ownership boundary.** A2A deliberately specifies nothing about how the server
  agent internally turns a `Message` into model context, memory, or tool calls
  ("Opaque Execution" is a named guiding principle) — that boundary is the whole
  point of the protocol, and it is why A2A reads as pure "delivery to a black box,"
  never as harness emulation.

A2A is the only path in this survey with a first-class, spec-level completion/failure
taxonomy and a first-class disconnected-notification primitive; it buys that by
not addressing an interactive terminal session at all — every A2A "agent" is a
service endpoint, so D4 (idle wake without typing) and D6 (same native
session/transcript) are outside what the protocol talks about, not answered by it.

## OpenAI Codex app-server (JSON-RPC over stdio/WS/UDS)

**Official**, vendor source `openai/codex`, `codex-rs/app-server*`. This is also what
DELIVERY.md's own Codex row already measured against — this section adds the primary
citations for that row's claims and the vocabulary to compare it against A2A/OpenCode.

- **Address/identity.** `threadId` (from `thread/start`, `thread/resume`, or
  `thread/list`). At 0.153.4 every MCP `tools/call` also carries `_meta.threadId`
  plus an `x-codex-turn-metadata.{session_id,thread_id,turn_id}` block — the caller
  names itself on each call, byte-identical to the hook's `session_id`. [official —
  `codex-rs/app-server-protocol/src/protocol/v2/{thread,turn}.rs`;
  `core/src/mcp_tool_call.rs:1184,1238-1263,1328-1349`, openai/codex — already the
  primary source DELIVERY.md's Codex rail-notes section cites]
- **Durable enqueue.** `turn/start` against a live `threadId` is itself the enqueue —
  there is no separate durable mailbox primitive comparable to A2A's task record or
  Claude Code's `*.msg` files. `thread/read`/`thread/list` persist history to disk,
  but a not-yet-delivered message has no standing artifact of its own.
- **Wake.** Transport-dependent, and this is the axis DELIVERY.md's Codex row already
  measured directly: over the app-server-attached listener (`--listen ws://` or
  `unix://`), `turn/start` on an idle thread woke a live TUI with zero typing
  (measured 2026-09-08, codex-cli 0.153.4, per this repo's DELIVERY.md matrix row).
  The standalone embedded TUI exposes no equivalent receive route — hooks grew to 12
  events but still have no `FileChanged`/`asyncRewake` analogue. [official transport
  docs — `codex-rs/app-server/README.md` "Protocol"/"Supported transports"; measured
  claim already lives in this repo's DELIVERY.md, cited here only for the transport
  vocabulary]
- **Model-visible injection.** `turn/start`'s `input` field is literally the next
  user-turn content; there is no announce-only variant — Codex has one turn-start
  shape, and it is always full injection, unlike the announce-vs-body split several
  self-fetch rails below use.
- **Continuity.** Same `threadId` continuation is exactly what `turn/start` re-uses;
  `thread/resume` reopens a persisted thread when the process is gone but the record
  still exists — the fresh-vs-addressed line runs exactly at "same `threadId` or not."
- **Completion/reply receipt.** v2 typed notifications (`turn/completed`) and a
  `TurnStatus` enum (`Completed`/`Interrupted`/`Failed`/`InProgress`) give an explicit
  completion signal without transcript scraping. [official —
  `codex-rs/app-server-protocol/src/protocol/v2/turn.rs`]
- **Ownership boundary — the gap named in this task.** The app-server itself has no
  trouble creating and driving a bare thread with no TUI attached at all — `thread/start`
  plus `turn/start` over the listener works headless. The gap is the opposite
  direction: there is no documented contract for *discovering an already-open,
  human-visible TUI seat* (embedded terminal or Desktop app) and *proving* that a
  given `threadId` names that specific visible window rather than some other bare
  thread the same app-server happens to be holding. DELIVERY.md's own measured claim
  is exactly this shape — one live app-server, one attached TUI, one thread the
  operator can see get woken — and nothing here demonstrates the general case of
  addressing an arbitrary visible seat sight-unseen. That is a different, narrower
  claim than "no headless-thread primitive exists," and this doc had it backwards.
  The contrast is not another vendor's documented visible-seat contract — Claude
  Code's own hooks have no vendor cross-session address either, and its `*.msg`
  mailbox is bridge-built (see the Claude Code section below), not a vendor
  primitive. The contrast is that entwurf's own shipped, record-backed rails
  (Claude Code interactive, Antigravity native-push) already carry DELIVERY.md
  evidence for addressing a specific visible/native session by record, while no
  source surveyed here shows an equivalent Codex contract — the
  gap this repo's DELIVERY.md rail-notes section already names as unstarted ("Consuming
  `_meta` is new bridge code and is step 6, unstarted"). Nothing surveyed here closes
  that gap; A2A and OpenCode's HTTP session server both sidestep it by not depending
  on an attached interactive terminal at all.

## Claude Code: hooks as the receive-side channel

**Official**, code.claude.com/docs/en/hooks and hooks-guide. This is the fullest
public hook vocabulary surveyed (30+ events) but it is a *local lifecycle* mechanism,
not a network delivery protocol — the "channel" is whatever the hook script/HTTP
endpoint chooses to do.

- **Address/identity.** A `SessionStart`-armed watch is scoped to that one session;
  there is no cross-session addressing primitive in Claude Code itself — a bridge has
  to build that on top (see Repowire below).
- **Durable enqueue.** Not built in. `FileChanged`'s own doc line is narrow and exact:
  "When a watched file changes on disk. The `matcher` field specifies which
  filenames to watch." [official — code.claude.com/docs/en/hooks, Hook events table]
  Durability is whatever the sender wrote to that watched file before triggering the
  change — the hook mechanism only reacts to the filesystem edge, it does not itself
  persist anything. This is exactly the shape DELIVERY.md's own rail-notes section
  describes for the shipped adapter: "the sender writes durable `*.msg` bodies before
  poking the signal."
- **Wake.** `asyncRewake` (named directly in this repo's DELIVERY.md Claude Code row)
  is the wake half of the same edge-triggered contract: `FileChanged` fires the
  doorbell, `asyncRewake` starts a turn on the idle session. Both are official hook
  vocabulary, not a bridge invention.
- **Model-visible injection.** The hook itself carries no body — it is a signal.
  Getting the actual message into context requires a tool the model calls in response
  (entwurf's `entwurf_inbox_read`; Repowire's `ask`/injected `<repowire_ask>` context,
  below). Claude Code's own hook JSON output can also directly return
  `hookSpecificOutput`/`decision` to steer the *current* tool call, but that is a
  synchronous in-turn control channel, not an async peer-delivery one.
- **Continuity.** A hook is scoped to the session lifecycle it fired in; nothing about
  the hook mechanism changes which native session/transcript continues — continuity
  is a property of not spawning a new process, which the hook contract doesn't force
  either way (a bridge could shell out to a new process from a hook; the vendor
  contract just doesn't prevent it).
- **Completion/reply receipt.** `Stop`/`StopFailure` fire when a turn completes,
  carrying `last_assistant_message`, which is the official completion signal a bridge
  reads instead of scraping the transcript file.
- **Ownership boundary.** The vendor owns hook firing, JSON input/output contract, and
  exit-code semantics; a bridge owns everything about what the hook script does,
  including whatever addressing/durability/wake-fan-out logic it wants layered on top.
  This is why the two third-party bridges below (Repowire, and this repo's own
  `Claude Code interactive` rail) both had to build the mailbox/marker layer
  themselves — Claude Code's hooks are necessary but not sufficient for delivery.

## OpenCode: HTTP session server + plugin event bus

**Official**, opencode.ai (project `sst/opencode` / `anomalyco/opencode`). OpenCode
runs as a local HTTP server (`opencode serve`) with a typed SDK client and an
in-process plugin event bus; this is architecturally closer to Codex's app-server
than to Claude Code's hook-file contract.

- **Address/identity.** `sessionID`, returned from `session.create`/`session.list`.
  [official — opencode.ai/docs/sdk/, `sdk.session.*` namespace]
- **Durable enqueue.** `POST /api/session/{sessionID}/prompt` — the endpoint's own
  one-line description is explicit about the contract: "Durably admit one session
  input and schedule agent-loop execution unless resume is false." [official —
  opencode.ai/v2/docs/api/session/v2-session-prompt] This is the cleanest explicit
  `queued`-state guarantee of any path surveyed — durability is decoupled from wake
  by the `resume` flag itself.
- **Wake.** `resume` (default true) is what turns durable admission into a scheduled
  turn; `resume: false` would admit the input without starting the agent loop — the
  wake/enqueue split DELIVERY.md's state vocabulary keeps as `queued` vs `triggered`
  is a literal request-body flag here, not an inferred distinction.
- **Model-visible injection.** `session.prompt`'s `parts` are the next user turn's
  content directly — same "no announce-only tier" shape as Codex's `turn/start`.
- **Wake for plugins, not just clients.** The plugin SDK exposes a `session.idle`
  bus event a plugin can subscribe to (`hook["event"]`) and react to by calling
  `client.session.promptAsync` — this is how a *third-party* plugin builds its own
  wake-on-idle logic on top of the official bus, not a vendor delivery API in itself.
  [third-party, but reading the official bus — `desendoo/opencode-wake-plugin`
  README, working around an upstream `oh-my-openagent` bug in a *different* project
  that layers a deferred-wake cascade on top of OpenCode; `sst/opencode`
  `packages/opencode/src/bus/index.ts` and
  `packages/opencode/src/plugin/index.ts:138` are the official bus/plugin dispatch
  the wake-plugin rides on]
- **Note on plugin event ordering — upstream proposal, not shipped.** Plugin
  `event` handlers are currently fire-and-forget (the promise is dropped at
  `plugin/index.ts:138`), so a plugin that must finish work before `session.idle`
  is considered "settled" cannot block that transition today; an open feature
  request proposes an awaited `event.sync` hook precisely for this gap. [upstream
  proposal — `anomalyco/opencode` issue #16879, open as of this writing] This matters
  for delivery specifically because a bridge relying on `session.idle` to decide
  "safe to inject now" inherits that same unawaited-handler race.
- **Continuity.** Same `sessionID` across repeated `session.prompt` calls; `fork`
  makes a new one.
- **Completion/reply receipt.** `session.error` and status-oriented bus events
  (`session.updated`, etc.) are the official completion signals; `message.list`
  gives the transcript, but the bus events are the non-scraping path. [official —
  `packages/opencode/src/session/index.ts` Event map, cited via OpenCode-Book's event
  catalogue, `opencodebook.xyz` — third-party documentation of official source, not
  itself a vendor doc]
- **Ownership boundary.** The HTTP server and bus are fully vendor-owned and are
  designed to be driven externally — this is architecturally the most "delivery-ready"
  official surface surveyed, because address/durable-enqueue/wake/injection all
  collapse into one documented HTTP call plus one documented event, with no bridge
  layer required to invent a mailbox or marker file the way Claude Code's rail needs.

## Repowire: third-party cross-harness bridge, two transports

**Third-party**, `prassanna-ravishankar/repowire` (docs.repowire.io,
github.com/prassanna-ravishankar/repowire). Chosen because it is the best-evidenced
independent bridge that explicitly targets several of the same harnesses entwurf
does (Claude Code, OpenCode, Codex, Antigravity) and — unusually for a third-party
project — documents a **deliberate migration away from** PTY/tmux injection toward a
native channel, which makes it a direct before/after case study for the
rejected-contrast section below.

- **Legacy transport (tmux-based, being phased out).** `SessionStart` registers the
  peer with a daemon and derives a `display_name` from the first 8 chars of the
  native session id; delivery is `tmux send-keys` into the pane — literal keystroke
  injection with a 500ms debounce, then `Escape`, then `Enter`, explicitly citing a
  "Gastown NudgeSession pattern." [third-party, source-verified —
  `repowire/hooks/websocket_hook.py` `_tmux_send_keys`, `repowire/hooks/session_handler.py`,
  as summarized in `docs.repowire.io/use/features/connect-claude-code/` "Hooks" table
  and confirmed against the source function above]
  - **Address/identity.** Derived from tmux pane id + a hash of the native session
    id — an identity built entirely outside the vendor's own contract.
  - **Durable enqueue.** A per-pane pending-correlation-id file, `flock`-guarded.
  - **Wake / injection.** Simultaneous and indistinguishable — keystrokes typed into
    a live pane are both the wake signal and the payload at once, which is exactly
    why PTY/tmux injection collapses D4 and D5 into one unverifiable step (see next
    section).
  - **Completion/reply receipt.** `Stop` hook parses the session transcript to
    extract the response — this is the one place in this whole survey that is
    explicitly transcript scraping, the exact technique DELIVERY.md's scope
    excludes as a *sender-side identification* method (it is Repowire's own
    completion detector here, not entwurf's).
  - **Safety check.** `_is_pane_safe` checks the pane's current foreground command
    still matches what was expected before injecting — an explicit acknowledgment
    that a tmux pane can be silently repurposed underneath a stale identity, which is
    the same class of risk this repo's Hard Rule 16 names ("a tmux window/pane handle
    is an ephemeral operator view, not an address").
- **Channel transport (current, MCP-native — "replaces tmux-injection delivery with
  direct MCP-channel delivery").** [third-party — docs.repowire.io, same page, "Channel
  transport (experimental)" section, quoting the vendor's own framing verbatim]
  - A TypeScript server runs as an MCP stdio subprocess of Claude Code and holds a
    WebSocket connection to the Repowire daemon; incoming mesh messages are delivered
    as an announce-only `<repowire_ask>` (or similar) XML tag in context, and the
    agent must call a `reply` tool to answer, which the transport routes back with a
    `correlation_id`. [third-party — `repowire/channel/server.ts:31-91,213-244` per
    DeepWiki's source-cited summary of that file, `deepwiki.com/.../3-transport-layer-and-agent-integration`]
  - This is the same announce-then-drain shape as this repo's own self-fetch rail
    (doorbell → `entwurf_inbox_read`), independently arrived at by a different
    third-party project.
  - **Ownership boundary.** Repowire explicitly documents that it does not ship a
    Claude Code marketplace plugin and that its Claude Code integration is "the hooks
    + MCP transport described above" — i.e., it owns the daemon, the hook scripts,
    and the MCP subprocess, but nothing about Claude Code's own transcript, auth, or
    turn loop. [official-adjacent, vendor's own docs page, same URL as above]

Repowire is useful evidence for exactly one point beyond its own feature set: an
independent, actively maintained, multi-harness bridge measured the tmux-injection
approach in production and is *retiring* it in favor of a native channel per harness,
for reasons (pane-repurposing risk, transcript-scraping-only completion, keystroke
timing fragility) that match this repo's own Hard Rule 16 almost exactly.

## PTY/tmux injection — rejected contrast, not a route

Every rail surveyed above that has a **shipped, non-legacy** delivery path avoids
raw keystroke/PTY injection. This is deliberate and consistent across ecosystems, not
particular to this repo:

- Repowire's own vendor docs describe the channel transport as **replacing**
  tmux-injection delivery, not complementing it, and keep the tmux path only as a
  documented legacy fallback for older Claude Code versions. [third-party, cited
  above]
- DELIVERY.md's own scope section excludes it outright ("tmux/pty keystroke injection
  or transcript scraping"), and this repo's AGENTS.md Hard Rule 16 states the reason
  in general form: a tmux handle "mints no garden id, stores no record, and reports
  no liveness" — it is a view, not an address.
- Structurally, keystroke injection collapses the D4 (wake)/D5 (injection) distinction
  into one unverifiable step (typing *is* both signal and payload at once, as seen in
  Repowire's legacy path), and its only completion signal is transcript text —
  exactly the scraping DELIVERY.md excludes. None of A2A, Codex's app-server, Claude
  Code's hooks, or OpenCode's HTTP/bus surface need it, because each of them ships an
  official non-PTY channel this doc already covers above.

This section exists only so the taxonomy below has a labeled rejected cell; it is not
a recommendation to reconsider it.

## Delivery taxonomy (external reference for entwurf's DELIVERY.md)

A compact cross-ecosystem table, in the same D-axis order DELIVERY.md already uses.
Cells marked "—" mean the axis is out of scope for that path's own design, not that
it failed a test.

| Path | Address/identity | Durable enqueue | Wake (idle→turn, no typing) | Model-visible injection | Continuity (same session) | Completion/reply w/o scraping | Fresh vs. addressed split |
|---|---|---|---|---|---|---|---|
| A2A `SendMessage`/push | `taskId`+`contextId` | task record (server-owned) | — (service, not idle terminal) | direct (message is the turn) | `contextId` reuse | yes — `Task.status` enum + webhook | `taskId` absent = create; present = address |
| Codex app-server `turn/start` | `threadId` (+ `_meta.threadId` self-naming) | — (no separate mailbox; call is admission) | yes — headless: `turn/start` wakes/schedules any live app-server thread; same-visible-TUI continuity only measured for an attached-TUI transport | direct (no announce-only tier) | same `threadId` | yes — `turn/completed` + `TurnStatus` | `thread/start` creates; `turn/start` on existing id addresses; `thread/resume` reopens |
| Claude Code hooks + bridge mailbox | session-scoped watch path | yes — durable `*.msg` body before signal, but the `*.msg` file itself is bridge construction, not a vendor primitive | yes — `FileChanged`→`asyncRewake` (both vendor-native) | announce-then-drain (bridge-built tool call) | hook scoped to the firing session | yes — `Stop`/`StopFailure` + `last_assistant_message` | no native cross-session verb; bridge-built (see Repowire) |
| OpenCode `session.prompt` | `sessionID` | yes — explicit vendor contract ("durably admit … unless resume is false") | yes — `resume` flag (default true) | direct (no announce-only tier) | same `sessionID` | yes — bus events (`session.error`, etc.) | `session.create`/`fork` creates; `sessionID` reuse addresses |
| Repowire legacy (tmux) | pane id + native-session hash (bridge-derived) | per-pane pending-id file | keystrokes = wake+payload at once | keystrokes into pane (not a model-context API) | pane-scoped, checked against a foreground-command guard | no — transcript scraping only | bridge-built; no vendor concept |
| Repowire channel (MCP) | daemon peer id | daemon-owned queue | not established by the cited source — the vendor docs/DeepWiki summary describe the announce+reply shape but not what wakes an idle session underneath the MCP subprocess | announce-only tag + `reply` tool | same MCP subprocess/session | yes — `correlation_id` round trip | bridge-built on top of Claude Code's own split |
| PTY/tmux injection (general) | — (not an identity primitive) | no | conflated with injection | keystrokes, not context API | unverifiable without other evidence | no — scraping only | not applicable; rejected |

The taxonomy's throughline is narrower than "every path separates the three axes" —
Codex's own `turn/start` is a counterexample, combining admission and injection in
one call with no separate durable mailbox. What is actually true across every
shipped, non-rejected path: **wherever an axis is separated in the API, it is named
and independently observable**, not inferred from timing or side effects (A2A's
task record / webhook / status enum; Claude Code's `*.msg` body /
`FileChanged`+`asyncRewake` / inbox-read tool call; OpenCode's `resume` flag /
bus event / `parts`; Codex's own case just collapses enqueue into injection while
still keeping wake and completion as separately named signals). The one path that
collapses ALL of them, including completion, into one unverifiable step — PTY/tmux
keystroke injection — is also the one every ecosystem surveyed here is moving away
from, for the same structural reason DELIVERY.md already excludes it.
