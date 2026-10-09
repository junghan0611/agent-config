# pi-durable — native env/hide and background-bash reference

**접점은 entwurf, 집의 정책은 agent-config.** Entwurf **0.34.0**의 `--native-module`과 native BG 배지를 소비하는 env-first 레퍼런스 구현이다. durable을 한 번 만들고 같은 대화를 계속 다시 여는 사용을 위한 것으로, 두 번째 하네스나 Pi 확장 호환층이 아니다.

## Launch and lifetime

Prerequisite for the env + background aggregate `index.mjs`: Entwurf **0.34.0+** on PATH, with its exact **Pi 1.1.0** SDK set. Entwurf owns the emitted app carrier, native footer and loader; agent-config installs none of them. The unchanged consumer was exercised through the actual installed candidate, whose four core files match the accepted and published 0.34.0 artifact. `env.mjs` alone still works on 0.32.0+; background-bash makes no claim about that release's SDK 1.0.4. Upgrading ordinary Pi alone does not supply this durable app. The old fixed-XDG source-runtime route has no fallback.

From the repository that will own the conversation:

```bash
# Create once. Thinking effort is the :high model suffix, not a separate flag.
entwurf pi-durable --provider openai-codex --model gpt-6.1-sol:high \
	--width task-wide --native-module "$HOME/repos/gh/agent-config/pi-durable/index.mjs"

# Reopen the newest saved conversation for this cwd; reattach env + the background task definition.
entwurf pi-durable --continue \
	--native-module "$HOME/repos/gh/agent-config/pi-durable/index.mjs"
```

`--continue` is **not** a garden-id selector. Return to the same project directory; it selects that cwd's newest session and reopens the saved model. Provider, model, width, and bootstrap inputs are fresh-only and are rejected with `--continue`; `--native-module` is allowed on both paths. This module is not remembered in the session or auto-discovered. The [root README shell helpers](../README.md#shell-aliases-bashrclocal) (`pdt` medium / `pds` high / `pdc` reopen) keep the one path in the shell; `run.sh setup` does not install them or alter shell configuration. Native-module propagation through `entwurf_fresh_call` is out of scope (Entwurf's fresh launch attaches no module).

## Interface and initialization

| File/export | Contract |
|---|---|
| `index.mjs` default | The documented aggregate for `--native-module` and the GLG-authorized `pdc` reopen: imports `env.mjs` **first**, then merges env and background-bash into `{ name: "agent-config", tools, sections, hooks, wraps, tasks }`. The original API-0 preview source is unchanged; current supply/integration status is recorded here |
| `background-bash.mjs` default | `{ name: "agent-config-background-bash", tools: [bash_background, bash_background_check], tasks: [agent-config.bash-background] }`; plain objects, no SDK import, nothing done at import |
| `env.mjs` default | Native extension object `{ name: "agent-config-env" }`; no hooks or SDK imports. Still usable alone, env-only |
| `env.mjs` top level | Delete hidden inherited keys, read the home file, inject eligible absent keys |
| `env.mjs` named `summary` | File path, read boolean, key-name arrays `hidden`, `injected`, `kept`, `skipped`; never values; nothing printed |
| `dotenv.mjs` `parseDotenv(text, home)` | Assignment extractor returning `Map<string, string>`; does not execute shell code |

Entwurf imports and awaits this ordinary ESM **before importing the TUI/runtime**. Pi's durable runtime creates its provider runtime before installing extension objects, so env preparation must happen during ESM evaluation, not in a hook. Entwurf installs the default object after its own contact and guards cwd and identity across initialization. Its module ingress is trusted operator code, **not a sandbox**.

### Optional explicit directory/filter ingress

Entwurf 0.34.0 also supports `--native-module-dir /absolute/directory`, exclusive with `--native-module`. It reads only that operator-named directory's top-level `*.extension.mjs`, byte-order sorted; helpers/nonmatching files and subdirectories are not discovered recursively. Duplicate extension/tool names and realpath targets are refused. This is not ambient/default/env/settings/watch loading, and trusted ESM initialization does not roll back earlier import side effects on failure.

Our existing `index.mjs`, `env.mjs`, `dotenv.mjs` and `background-bash.mjs` deliberately do not match that suffix. Do not replace the file flag with this repository directory and expect it to load. Directory adoption needs explicit opt-in exports, e.g. a `00-agent-config.extension.mjs` re-export of `index.mjs`; it is optional, not a workaround or an automatic setup step. The documented `pdc` uses the supported aggregate-file route.

## Environment policy

- Read **only** `~/.env.local`, never a project's file. No Bash `source`, `eval`, command substitution, branch evaluation, or new shell parser.
- Existing process keys win, including deliberate empty strings. File duplicates resolve in file order, last assignment wins.
- Never inject `HOME`, `PI_SESSION_ID`, `PI_CODING_AGENT_DIR`, or any `ENTWURF_*` identity carrier. Do not change cwd.
- Remove inherited `OPENROUTER_API_KEY`, `HF_TOKEN`, `GROQ_API_KEY`, `GEMINI_API_KEY`; never re-inject them from the file. This suppresses their automatic model-provider discovery, not skill capability. Skills needing them continue reading the home file directly.
- Missing file (`ENOENT`) is a normal read no-op **after hiding inherited keys**. Other read failures propagate; Entwurf reports `native-module-import-failed`. File content itself is not a parse-failure surface.
- Children inheriting this process's environment inherit the hiding. A child that explicitly reads/sources the home file can obtain the keys again. This module does not set or remove `BASH_ENV`; it is not a credential sandbox.

### Pi-compatible reading, not shell interpretation

Values follow the live `pi-extensions/env-loader.ts` parser: trim lines; skip blanks/comments/nonassignments; strip literal leading `export `; split at the first `=`; trim key/value; remove matching outer quotes; replace literal `$HOME` globally and expand leading `~/`; keep everything else literal, including `$OTHER`, inline `#` text, and unmatched quotes. The one deliberate parser difference is skipping nonidentifier keys (`[A-Za-z_][A-Za-z0-9_]*`).

A `case` or `if` is **not evaluated**. Assignments inside all branches are extracted in file order; later duplicates win. This reproduces Pi's reading policy, not correct host-specific routing. Every individual operational injection and branch-selection result remains unverified.

## Background bash — start, keep working, be woken once

**Native supply landed in Entwurf 0.34.0.** `index.mjs` adds the tools below while retaining env initialization first; Entwurf supplies the mandatory persistent badge. GLG authorized the local `pdc` function to attach this aggregate on 2026-10-09. No automatic session restart, runtime installation or other live-helper rewrite is performed. To opt out of the background tools, explicitly name `env.mjs` instead.

Every reopen must attach the same aggregate/task definition. A session opened with `env.mjs` alone cannot execute this task's phases; previously created work can remain pending until its definition is installed again.

The stock durable app does not itself supply these consumer tool names; the Pi extension `pi-extensions/background-bash.ts` cannot load there (ExtensionAPI factory, `setStatus`, `sendMessage`). `background-bash.mjs` gives the model the same two tool names on native primitives only: a durable task, its commits, and the owning conversation's inbox. There is no manager, watcher, queue, or ExtensionAPI layer.

| Tool | Contract |
|---|---|
| `bash_background { command, description?, cwd?, timeout? }` | Refuses a missing `cwd` and a `timeout` outside (0, 2147483] seconds (Node's timer range; past it a timer fires at once). In ONE commit: counts live tasks of this kind session-wide (cap **5**, refused with nothing created) and creates the task `{ ownership: conversation, background: true }`. Returns at once with `#id` and log path. `replay: "unsafe"` |
| `bash_background_check { id?, kill?, lines? }` | `lines` ≥ 1. No id: the 20 newest tasks. `id`: status + output tail (held in memory while running, from the result once ended). `kill`: terminates the process group **this app spawned and still holds** (SIGTERM, SIGKILL after 5 s; the report follows once the group is gone); an ended task, an interrupted one, or one this app holds no process for is named and nothing is signalled. A pgid recorded by an earlier run is never signalled |

The task `agent-config.bash-background` and its crash boundaries:

| Phase | Does | If the durable process dies here |
|---|---|---|
| `launch` | commits `{phase: "started"}` (the execution intent) **then** spawns `bash -c` detached; memo `pgid`; waits until the child has exited **and its stdout/stderr have closed** (timeout / kill / the invocation signal terminate the group first, joined); commits `{phase: "report", result}`; then writes the log's result mark | before the intent: nothing ran, it runs once on reopen. after it: `started` |
| `started` | reached only by recovery; **never spawns**; result `interrupted`, with the pgid if one was recorded | — |
| `report` | submits `[background task result] bash_background #id · status: … · automated report, not from the user` to the owning conversation, `whenBusy: "followUp"`, `requestId: bash-background-report:<id>`; then terminal | the same requestId returns the first submission: one report |
| `abort` | host abort mark only (`abort({ background: true })`): terminal aborted, **no report** | — |

- The Esc of an ordinary abort does not reach background work; the report then wakes the model. A report that arrives while the conversation is busy waits in its inbox as a follow-up. Esc while it waits there withdraws it with other queued input; the task's result stays readable through `bash_background_check`.
- A same-group descendant that still holds stdout/stderr keeps the task live (in the native graph) and its late output in the result. A descendant that detached its stdio is not followed once the leader has exited.
- Termination — stop, timeout, `abort({ background: true })`, closing the app — is one joined sequence per owned child: SIGTERM, SIGKILL after 5 s, then up to 2 s more for the group to be observed gone (`termination: terminated | killed | survived` in the result). Its timers are ref'ed, so a closing app waits for that bounded sequence instead of exiting before the SIGKILL (Harness close measured at ~5 s with a TERM-ignoring descendant). The bound is on the **wait**, not a guarantee of termination: a group still present after it is `survived` — the report header says `end unconfirmed`, a WARNING tells the model to check the system for that process group, and the log gets **no** result mark, so it is never pruned. Waiting for the child's stdio to close is a separate wait with no bound: a process that survives SIGKILL (uninterruptible sleep, for one) and holds the output keeps the task live, and nothing here can force it.
- Closing the app: the group is terminated, the closing Harness refuses the result commit, and the reopen reports `interrupted`. An orphan of a hard crash is reported, not killed: a pgid recorded by an earlier run is never signalled.
- `interrupted` is uncertainty, not failure: without a recorded pgid the command may never have started; with one it may have run partly, finished, or still be running. **An arbitrary shell command is not replay-safe**; this only guarantees recovery never runs it again.
- Bounds: report tail 120 lines and 12 000 UTF-8 bytes **including** the `<truncated>` marker, cut on a character boundary then at the next line start (a U+FFFD the command printed stays); ANSI stripped with the same expression as the Pi extension (compared by a test). The log `~/.pi/durable-background/<ms>-<rand>.log` — header line, output, and the two closing lines (dropped bytes, process end) — is at most 16 MiB as a whole file.
- Retention: `<log>.result` is written only **after** the result is durably committed, and not for a `survived` termination. A log is pruned after 7 days only by its result mark's age; a running command's log (in any session sharing the directory) and an interrupted one have no mark and stay. The log's closing `process ended` line is information, never retention authority — a command can print anything.
- The log is a disk boundary: a write failure (full disk, removed directory) stops the writing and is named in the result and the report — never thrown out of the child's event handler, never dropped silently.
- The environment is the process's own after `env.mjs` (spawned with `process.env`), the shell `/bin/bash` or `bash` on PATH.

### Persistent native BG badge — Entwurf owns the UI

Entwurf 0.34.0 observes the live task graph for the app's lifetime, independently of `/tasks` visibility. A protected dock status row displays `⏳ n tasks`; at small heights it wins over editor/details, and at widths too narrow for the glyph it uses an ASCII active marker. The count is kind-agnostic live native background tasks, including pending/waiting/completing/aborting — **not** a ledger or a promise that all OS processes ended successfully. Terminal `interrupted`/`survived` warnings remain in the consumer report rather than the count.

The installed consumer fixture measured hidden-panel visibility at 100×30, 28×6 and 12×2. Other tiny-layout receipts belong to the supplier, not this fixture. agent-config writes no terminal renderer and has no classic ExtensionAPI shim. A general extension-defined native footer-content API is outside this first bundle, not forbidden forever.

## Verification and the real-file incident

```bash
# Full API-0 suite: env units + bootstrap seams + offline real ModelRuntime + background-bash on the
# checkout's durable SDK (faux model, MemoryStorage / temp SQLite, SIGKILL crash windows).
./run.sh test:pi-durable          # old name test:pi-durable-env runs the same

# Unit-only, without an Entwurf checkout.
node --test pi-durable/tests/env.test.mjs

# Full suite against another already-built Entwurf checkout (no install/build here).
AGENT_CONFIG_ENTWURF_DIR=/absolute/path/to/entwurf ./run.sh test:pi-durable-env
```

The full suite requires a built Entwurf checkout (default `~/repos/gh/entwurf`); absence fails by name, `entwurf-checkout-missing`, with exit 1 — never a successful skip. It uses synthetic HOME/env values, an offline real `ModelRuntime`, and stubbed bootstrap storage/contact seams. It opens only test-owned conversations and uses no live operator bridge or vendor model call; the faux scenarios do run scripted SDK model rounds.

**Measured 2026-10-08:** 15/15 tests passed; intentionally missing checkout exited 1. A comparator extracts the current Pi parser from source and checks the same synthetic corpus rather than comparing two copied implementations. The first strict parser passed synthetic tests but refused the real home file's shell `case` line on restart. Returning to Pi-compatible reading repaired that launch; no shell interpreter was added.

**Measured 2026-10-08 (background-bash, oracle) — first bundle:** implementer runs of `./run.sh test:pi-durable` were 37/37 twice, then 38/38 once after the log-failure case was added (the reviewer's independent 38/38 is the reviewer's receipt, not this one). All against Entwurf checkout `fea9b3d` (package 0.33.0, durable SDK **1.1.0** — on oracle `entwurf` on PATH is that checkout; the released 0.32.0 / 1.0.4 set was not exercised). Cases: immediate start with the conversation idle and the task in the native graph; one report waking the faux model, idle and busy (queued follow-up) paths; exit 3, timeout escalating to SIGKILL past an ignored SIGTERM, refused spawn, missing cwd; stop and its refusals; cap 5; ordinary abort vs `abort({ background: true })`; close then two reopens (one `interrupted`, no re-run); pending-before-close runs once; 17 MB output capped; the log directory removed mid-run named in the report. SIGKILL of the durable process at four points — after the intent, after the spawn before the pgid memo, while running, after the report admission before the terminal commit — each gave exactly one report and no second execution (a marker file counts executions).

**Measured 2026-10-08 — amendment after review** (B1 settle at exit lost late output; B2 an unref'ed SIGKILL let a TERM-ignoring descendant outlive a closing app; D1 a genuine interrupted log was pruned on its pre-commit end line; D2 the UTF-8 tail cut mid-rune; the index-shape unit evaluated `env.mjs` against the real HOME): **43/43 three times** — twice under `env -i` with a synthetic outer HOME and an explicit `AGENT_CONFIG_ENTWURF_DIR` (the outer HOME stayed empty; the second run on the final file state), once through the normal entry. Without the explicit checkout a synthetic HOME fails both prerequisites by name. New regressions: late output of a same-group descendant (task still in the graph after the leader exited; tail and log carry it); stop of a TERM-ignoring `/dev/null` descendant reports only after SIGKILL took the group; a separate app process that closes and exits naturally leaves no descendant (close joined ~5 s); a real close → reopen `interrupted` log and a hard-crash log both survive aging while a real completed one is pruned; printed end-line text cannot authorize pruning; every UTF-8 cut position for 2/3/4-byte characters within the byte bound, marker included; whole log file ≤ 16 MiB; timeout and `lines` bounds. A missing checkout still fails `background.test.mjs` by name, with only its units passing (four then; five after the follow-up below).

**Follow-up in the same bundle (reviewer's contract gap):** `survived` was recorded but not reported. The report now carries `end unconfirmed` and a WARNING with the process group, and such a log gets no result mark — fixed by a synthetic-result unit (killed / timedOut × survived; terminated / killed / none) for the report text and `markEligible`; no group that survives SIGKILL was provoked. **At that API-0 checkpoint, not measured:** the durable TUI, vendor tool selection, live operator launch with `index.mjs`, or any SDK but 1.1.0. The later 0.34.0 installed fixture below adds scoped TUI/tool-dispatch evidence; it does not rewrite this earlier receipt.

A separate, value-free read-only import of the actual home file succeeded without changing identity, cwd, or file metadata. GLG then reopened garden `20261007T104525-12d0ca` with `--continue --native-module`: native argv, previous dialogue continuity, and all four hidden keys absent from the bash child were observed. **That is not proof of the bridge child's full environment, operational branch routing, crash survival, or exactly-once delivery.** Historical failures, repairs, mutation receipts, and exact evidence scopes: [PI-DURABLE.md](../PI-DURABLE.md).

### 2026-10-09 installed consumer and published bytes

- Supplier Opus measured one owned temporary 0.34.0 installation: hash-matched copies of the unchanged four consumer files; env first, then the installed SDK's **real ModelRuntime factory/public faux provider** test-only seam. No Harness/task graph/TUI/tool executor was replaced.
- Actual SDK `bash_background`/`bash_background_check`, native kind/background flag and parent idle; `/tasks` hidden while the badge remained visible, including 12×2. Completion produced one automated report and faux continuation. Normal close plus two same-id reopens produced `interrupted`, one stable report, marker unchanged — no arbitrary shell replay.
- There were **8 scripted faux rounds**, vendor model calls/billing0 by construction, not network sniffing or zero synthetic token counters. This is not vendor autonomous selection or GLG physical-TTY evidence; the latter was owner-deferred for this cut.
- This coordinator read the preserved screens, seam, allowlist and reports, checked all four original/copy hashes and marker counts. SQL report-id uniqueness and process cleanup are supplier measurements inherited through its coordinator, not a second probe here.
- Temporary candidate tgz `2a1cd9e1…` is **not** final M3. Final accepted/published tgz SHA256 is `e9d995ff3858ffca40fa12b4fce2a6db3802da3ee27c7b233142fc4c71f23450`, 13,576,954 bytes. This coordinator independently matched the preserved registry download to M3, and M3 runtime/TUI/bootstrap/resolver bytes to the actual P6 installation. Registry publication/latest0.34.0 and separate U3 installed smoke are supplier-coordinator receipts.
- The prior **14/14 focused + 2/2 missing-checkout** consumer review is separate evidence. No new whole consumer suite is implied by those numbers or this installed fixture. [Public supplier handoff](https://github.com/junghan0611/entwurf/issues/134#issuecomment-6071983472); full chronology: [PI-DURABLE.md](../PI-DURABLE.md).

Source contract: [Entwurf #130](https://github.com/junghan0611/entwurf/issues/130), [#134 published handoff](https://github.com/junghan0611/entwurf/issues/134#issuecomment-6071983472), [`docs/durable-native-support.md`](https://github.com/junghan0611/entwurf/blob/v0.34.0/docs/durable-native-support.md), and `pi/pi-durable/{bootstrap.mjs,overlay/upstream-pin.json,carrier/runtime.js,carrier/tui.js}` at `v0.34.0` (`ca1cded3554ba6e58a8991637a4d3c276e83288f`). Classic `pi-extensions/` remains unchanged and still belongs to ordinary Pi.
