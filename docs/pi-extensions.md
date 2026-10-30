# Pi extensions

Moved from the root README at `f05f103` (2026-10-30) without rewriting; only links and positional words were adjusted for the new location. The front door is [README.md](../README.md).

## Pi Extensions ([`pi-extensions/`](../pi-extensions/))

| Extension | Purpose |
|-----------|---------|
| `background-bash.ts` | `bash_background` — run a slow command without blocking; the agent is re-invoked with its exit code and output when it finishes |
| `@ogulcancelik/pi-session-recall` | Pi-local past-session literal search + focused session question; its raw extension is filtered because `session_search` belongs to andenken |
| `review.ts` | `/review` — review a PR, base branch, commit, uncommitted changes, or a folder |
| `goal.ts` | `/goal` — long-running objective mode; keeps continuing itself until the objective is met or a budget is hit |
| `decision-gate.ts` | When a `goal` turn declares itself `blocked`, run **one isolated consult turn** to dig without continuing the resident (Sol may share its subscription), and leave the result as a single custom JSONL entry — not conversation inflow. The entry carries which axes were searched, which hits came back, and which the sibling actually cited, so "did this help?" stays answerable later ([#24](https://github.com/junghan0611/agent-config/issues/24)). Which model digs is the operator's call — `/decision-gate model <provider/id>` for the goal path in this session, `DECISION_GATE_MODELS` in `~/.env.local` for both goal and autopilot; default consult is `openai-codex/gpt-6.1-sol` at medium, including when Sol is resident; Copilot is excluded. It digs; it does not open the gate |
| `heartbeat.ts` | `/heartbeat 10m` — wake this session on a timer; the tick instruction makes it look up grounds and leave them where a reader can find them before taking one step. Off until a human types it, dies with the session |
| `autopilot.ts` | `/autopilot on [10m 20m]` — in an armed coordinator session, a turn that ends with `waiting_for(kind:"glg", question)` starts a clock: GLG silent 10m → one DM; 20m more → one decision-gate consult, then a second DM and a provisional-verdict panel. Advisory only — no continuation, no tool authority. Off hides `waiting_for` from model tools until a human arms it; dies with the session |
| `continue.ts` | `shift+alt+enter` — send "continue" when the agent has stopped |
| `raw-paste.ts` | Keep an unmarked multi-line paste from being submitted line by line. pi accepts a paste only with bracketed-paste markers, and Termux over tmux does not always send them; this coalesces an ESC-free burst of two or more line breaks into one paste, and restores tmux's re-encoded control bytes inside a marked one. `/rawpaste` reports which of the two fired |
| `env-loader.ts` | Load `~/.env.local` at session start |
| `hide-providers.ts` | Keep skill-only keys (OpenRouter, HF, Google, Groq) out of pi so their 440 models stay out of the picker — see [MODELS.md](../MODELS.md) |
| `upstage-provider.ts` | Register Upstage Solar as an OpenAI-compatible provider |
| `context.ts` | `/context` — show loaded extensions, skills, context usage |
| `glg-footer.ts` | Footer signature — device + cwd + branch + **model id** on line 1, which degrades from the left so a narrow i3wm tile keeps the model name |
| ~~`go-to-bed.ts`~~ | **Disabled 2026-09-08** — blocked every tool 00:00-04:59, so autonomous sessions and entwurf's overnight tests stalled. Kept as `go-to-bed.ts.disabled` |
| `peon-ping.ts` | Sound notifications |
| `gemini-image-gen.ts` | Gemini image generation (nanobanana) |
| `session-breakdown.ts` | Session cost breakdown |
| `whimsical.ts` | Personality touches |

**Boundary, not shrinkage.** A skill is the cross-harness door; a Pi extension is the local lifecycle/provider/TUI hand. Do not duplicate ordinary capability into a Pi-only extension when the skill can travel, but do support an extension when it can touch a Pi turn in a way a CLI cannot. `semantic-memory` remains the canonical example of the former: its skill works everywhere, while Pi-native `session_search` / `knowledge_search` are convenience. Pi-local session recall is the latter: its value is precisely inside Pi's session lifecycle. Compaction itself is left to Pi's built-in text summarization.

Supported third-party Pi packages are tracked in [`pi/packages.json`](../pi/packages.json). `./run.sh setup` — therefore a fresh oracle too — runs `setup:pi-packages`: it installs a missing package or runs Pi's extension-only update for an installed one. Sources are intentionally unpinned, so setup receives upstream extension releases; package code is not silently copied into this repo. It deliberately does not merge a `packages[]` array into settings because Pi and entwurf co-own that live surface.

One package filter is deliberate: andenken owns semantic `session_search`, while upstream session-recall also names its literal `rg` tool `session_search`. The manifest loads its package code but filters that raw extension; [`session-recall-compat.ts`](../pi-extensions/session-recall-compat.ts) loads it as `session_literal_search` and preserves `session_query`. [`./run.sh test:pi-packages`](../run.sh) is the install seam: it loads Pi without an LLM call, proves those three recall tools retain their owners, and asserts that the retired Codex-native package is absent and `session_before_compact` is unique to entwurf's lifecycle observer. This prevents an accidental local or package compaction override from displacing Pi's built-in summary. Local extensions follow the same boundary: `review`, `goal`, and `continue` hook Pi's turn loop; `background-bash` receives process completion; `heartbeat` and `autopilot` own in-process timers; `raw-paste` owns stdin parsing.

### `heartbeat` — the clock is the cheap half

이 시계는 게이트(`decision-gate`)·`dm`과 한 세트다. 목적: **판단 근거를 찍지 말고 뒤져보게 하는 것.** 깨어난 턴이 기억축·시간축을 본인이 찾든 형제를 부르든 뒤지고, 근거가 있으면 한 걸음, 없으면 DM 한 통. 그게 힣의 자율주행 루프다.

`/heartbeat 10m` arms a timer that wakes this session and runs one turn. Every harness has that much; Claude Code and Copilot ship it as "proceed if no answer" / autopilot, and GLG keeps those off for one reason — proceeding with no grounds. The refusal is not of the clock but of the blank: *"왜 내 기억도 안쳐다보고 무슨 근거로 진행을 하냐는거야"* (2026-09-09). We have the memory and time axes, so a woken turn can look, record what it found, and then move.

So the tick prompt is the product, not the timer. Its step order is the contract: look up grounds → leave them where a reader who never opens the session can find them → take exactly one step → if there were no grounds, stop and say where you looked → and only then, if nothing needs attention, `HEARTBEAT_OK`. The silence token comes last on purpose. openclaw measured the inverse: 1330 heartbeats, 529 consecutive `NO_REPLY`, 6-8 tokens a turn — the prompt's own right answer arrived before any judgement did, and designed silence became indistinguishable from reflex silence from outside.

What it deliberately is not: no job store, no scheduler class, no daemon, no residency. prime-agent's heartbeat is daemon-only by construction (`in-process-agent-connection.ts:264` throws `"Heartbeats require daemon mode"`), and its `scheduled-jobs.json` is state whose loss would erase registered work — the shackle test this repo applies elsewhere. We took the syntax (`/heartbeat [--every <interval>] [--steer|--follow-up] [instruction]`, 10s floor) and two policies (busy means **drop** the tick, never stack it; `steer`/`follow_up` as a field), and none of the code.

Two consequences worth knowing before using it. **It is off until a human types it and it dies with the session** — `session_start` disarms on every reason including `resume`, which is the only thing standing between "every pi session on this machine loads this file" and "sessions that wake themselves with nobody asking". And **`--steer` cannot actually interrupt a running turn here**: pi's extension surface exposes `isIdle()` alone, whose expression is `!_isAgentRunActive && !isCompacting` — two states behind one boolean — and steering into a compaction is the unsafe case prime-agent names, so both modes wait for a plainly idle session.

`/heartbeat status` states both in one line each, and this section is where their reasoning lives. That split is deliberate: the panel is four lines total (state, instruction, the two facts) because a status view that wraps to ten rows stops being read, which would lose the very facts it was widened to carry.

Who digs is closed (2026-09-09): this turn *or* a sibling — both allowed. The tick prompt names three hands: `semantic-memory` (memory), `timeline` (time), `entwurf_fresh_call` / `entwurf_v2` (sibling). How to narrow each axis lives in that skill's own doc. A miss pages GLG once via skill `dm` for this armed heartbeat, not every tick. That one-DM budget assumes earlier ticks (and that DM) are still in the session context; if compaction drops that span, the same miss can fire twice. Still open, and still not decided in the code: where the record lands ([#24](https://github.com/junghan0611/agent-config/issues/24) 열린 결정 2). The prompt requires the property, not the path.

### `autopilot` — silence is a trigger, never a grant

GLG 2026-09-28 (journal week39): *"욜로로 가다가 glg가 판단좀해줘라고 남겼는데? 답이 없으면 dm으로 보내고, 그래도 답이 없으면 decision-gate가 열려서 기억축으로 내가 판단했음직한 것을 찾고 … dm으로 메시지를 보내줘야지."* The pilot implements the first three steps of that sentence and deliberately not the fourth ("proceed").

| Step | What fires it | What it does |
|---|---|---|
| arm | a human types `/autopilot on [<ask> <gate>]` | enables the `waiting_for` model tool and adds one system-prompt paragraph asking the coordinator to declare it when it stops; `/autopilot off` hides the tool again |
| clock | the **latest settled turn** declared `waiting_for(kind:"glg", question)` | starts `ask` (default 10m). A question-shaped reply with no declaration only shows a status hint — a settled turn is not by itself a GLG question; the coordinator may be waiting on a sibling (`peer`) or a background task (`local`), which it checks through `entwurf_peers` / `bash_background_check` itself |
| DM #1 | `ask` of silence, session idle | one DM via skill `dm` (`dm.sh --as pi/<model> --stdin`). If it fails, the cycle **holds** — an unasked silence never opens the gate |
| gate | `gate` (default 20m) more silence | one `runConsult` from `decision-gate.ts` (env/default candidate, shared dig budget and receipt; `/decision-gate model` session override is goal-only), then DM #2 and a verdict panel. A verdict needs `outcome:ok`, a `PROVISIONAL:` line and ≥1 resolved cited hit; otherwise it is a *hold* ("no grounds — waiting") |

Cancellation: GLG's **interactive** input (rpc steers and extension input are not GLG); a later settled turn that declares `none`/`peer`/`local` or declares nothing; `/autopilot off`/re-arm; any session boundary or tree navigation (the latter also hides transcript-restored tools). In-flight DM/consult results that return after a cancellation are recorded as stale and publish nothing — no DM #2, no panel; a running consult is aborted. A verdict panel already left is not deleted — it is what the resident reads when GLG answers "그대로 해/아니" — but once GLG has spoken after it (or the cycle was withdrawn) it reaches the model under a `HISTORICAL` header.

Budgets are the **session's**, not the arm's: 4 DMs (two cycles) and the consult cap of 3 shared with decision-gate's goal path. They are counted from session entries, so `/autopilot off` → `on`, reload and resume do not refill them. Every step leaves an `autopilot` custom entry; the consult leaves its usual `decision-gate-consult` receipt with `trigger.kind:"autopilot"`.

**Why there is no "proceed" (the boundary question stays GLG's).** The file has no `tool_call` hook and every `sendMessage` is `triggerTurn:false`: nothing is executed on a verdict, so the boundary of provisional authority does not exist yet. Adding it needs GLG to choose a boundary model — zero execution vs an allowlist of active tools with bash fully blocked and unknown tools failing closed. A regex deny list is not a boundary (cross-review 2026-09-28, `openai-codex/gpt-6-sol`): it misses indirection, scripts written to disk, and arbitrary custom tools. Silence never grants push, public dispatch or destructive acts.

Runtime shape: `autopilot.ts` imports `./decision-gate.ts`; pi resolves that from the **symlink's** directory, so both files must be linked side by side (the `pi-extensions/*.ts` glob in `run.sh setup` does that). `./run.sh test:autopilot` runs the stub regression (timers, races, budgets, session boundary, one real `runConsult` on a stub side session — no DM, no model call) and a load smoke against the installed pi. A live DM or paid consult test needs GLG's separate approval.

**See it run: `./run.sh demo:autopilot`** (2026-09-28, GLG asked for a visible dummy call so the scenario does not read as abandoned). Two receipts, kept apart on purpose. (1) `tests/autopilot.demo.ts` — the real `autopilot.ts` state machine and the real `decision-gate` `runConsult` over a stub side session: DM #1/#2 go through the real `dm.sh --dry-run` (zero Telegram), the consult receipt says `trigger:autopilot · model:demo/stub-sibling`, its one dig fails closed on a missing skills dir (zero embedding calls), and the outcome is an honest **hold** — a verdict would need a real cited hit, and faking one would stage authority. Everything is `[DEMO]`-labeled and stays in memory: no session file, nothing for andenken to harvest as real consult evidence. (2) `tests/autopilot.rpc.test.ts` — the installed `pi` binary in an isolated `PI_CODING_AGENT_DIR` with both files symlinked as in production: `/autopilot` and `/decision-gate` register, `/autopilot on|status|off` run, no assistant turn. It also proves that linking `autopilot.ts` alone fails. Both are measured evidence that the bridge and the loader work; neither is evidence of GLG's judgment, a real DM, or a paid consult.

Installed narrowly on thinkpad (2026-09-28): one symlink `~/.pi/agent/extensions/autopilot.ts` → this repo, beside the existing `decision-gate.ts` link — the same shape `run.sh setup` produces on other machines. It loads in pi processes started after that, disarmed; revert with `rm ~/.pi/agent/extensions/autopilot.ts`.

One gap Fable's review named: `/decision-gate model …` is a per-session selector held inside `decision-gate.ts`, and autopilot calls `resolveCandidateSource(null)` — so an autopilot consult uses `DECISION_GATE_MODELS` or the built-in order, not a model chosen with `/decision-gate model`.

### `background-bash` — why it exists

pi's built-in bash tool is synchronous only. A slow `pnpm check` therefore either blocks the whole turn or gets parked in tmux, and parked work needs a human to come back and look at it. The observed failure mode is the agent announcing "I'll run pnpm check" and then ending the turn, waiting on a keystroke. Claude Code does not have this problem: `run_in_background` plus a completion notification re-invokes the model.

pi has no completion hook — but it does not need one. `pi.sendMessage(..., { triggerTurn: true })` may be called from **any** async callback, and `agent-session.ts` explicitly runs a continuation for messages queued after a turn ends ("queued by agent_end extension handlers"). So the child process's `exit` handler queues the result and triggers a turn; if a turn is already running it is delivered as a follow-up. `goal.ts` uses the same mechanism from `agent_end`. The footer shows `⏳ n tasks` while anything is pending.

Two things learned the hard way, recorded so they are not re-derived: spawn through pi's own `getShellConfig()` (it returns `bash -c`, and a login shell sources a profile that injects OSC escape bytes into model context), and `detached: true` + `process.kill(-pgid, …)` (signalling only the bash pid leaves a pipeline's descendants running).

External Pi packages have two ownership paths: andenken remains the cross-harness `semantic-memory` skill and entwurf self-registers its citizen surface; supported Pi-only packages are tracked in [`pi/packages.json`](../pi/packages.json), installed or updated through `setup:pi-packages`. None are merged directly into this repo's settings reference.
