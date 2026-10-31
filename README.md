# agent-config

**Skills, identity and alignment across AI harnesses.** agent-config is the skills source of truth and lived proving ground behind GLG's working environment. It keeps a shared profile, capability doors and ways of returning to evidence across sessions and models — without becoming another harness or taking over their memories.

> **도구가 바뀌어도 같은 사람의 맥락과 작업의 자세로 돌아오도록.** 이 집은 스킬의 개수보다 함께 일하는 방식을 붙든다. 정체성·스킬 정본·연속성의 실사용 시험소이며, 조용해지는 쪽이 건강한 방향이다.

## How to Read This

This is a front door, not a manual. It is written for someone who wants to see **what one operator actually runs day to day** — not for someone about to install a framework. Four things to hold before the first table.

**1. This repo is not a harness.** Pi and the native harnesses own execution; [`entwurf`](https://github.com/junghan0611/entwurf) is their narrow screwdriver — the dispatch substrate through which independent harnesses address one another by **garden id**. Its [releases](https://github.com/junghan0611/entwurf/releases) and installation contract live there; the versioned observations in [`docs/`](docs/) are dated evidence, not an install pin owned here. agent-config is the resident side: the **skills SSOT** plus the **시험소 (proving ground)** where config is hardened on a real daily surface before promotion to its proper owner. Tables here and in [`docs/`](docs/) describe consumer responsibilities and observed working surfaces, not a new universal harness contract.

**2. A quiet repo is a healthy one.** The end state is a thin skills SSOT plus a test bench. The volume of change alone does not show health or progress; CHANGELOG records closed work, not how much remains unproven. Do not read the skill count as a feature list; the identity is the working method, not the tool count.

**3. Read one of three passes, depending on why you came:**

| You came for | Read |
|---|---|
| *What can these agents actually do?* | [§ Skills](#skills-skills) · [§ Semantic Memory](#semantic-memory--andenken) |
| *How does context survive a new session?* | [§ Why This Exists](#why-this-exists) · [§ Session Management](docs/memory-and-sessions.md#session-management--new--recall) |
| *Is any of this measured, or just asserted?* | [§ Agent Runtime Bench](docs/runtime-bench.md#agent-runtime-bench) · [OMP.md](OMP.md) · [MODELS.md](MODELS.md) |

**4. Sentences here try to carry their evidence.** Where a claim was measured, the receipt is named — a date, a host, a file, a version. Where it is inherited or still open, it says so. A sentence that cannot name one of those is a hypothesis, including in this document. This is the same rule the agents working in this repo are held to.

> **What this is NOT:** not a prompt collection, not a LangChain-style automation layer, not a generic multi-agent framework. It is the resident's skills source, alignment home and proving ground — with explicit doors back to memory and knowledge owned elsewhere.

## What This Is

**Official reference consumer and proving ground for [`entwurf`](https://github.com/junghan0611/entwurf).**

`entwurf` owns garden-id addressing, visible lifecycle and delivery, plus the runtime supply and configuration adapters it explicitly supports — a narrow integration core, not an installer for every product. Kiro and OpenClaw do not become Entwurf-owned just because they receive skills here. agent-config supplies the **skills SSOT** (`skills/`) and a **시험소 (proving ground)** where candidate harness config, hooks and wiring are hardened on the operator's real surface before any explicit ownership handoff. Pushing unproven integration into entwurf would weaken that core, so agent-config absorbs the churn first.

They are not competing harnesses: entwurf is the destination for proven integration within its ownership boundary; skills and the operator's profile retain their own home here.

- **entwurf** → garden addresses, visible lifecycle, delivery, owned harness adapters/runtime supply and bridge verification
- **agent-config** → skills SSOT, real consumer profile, day-to-day operating surface, and the incubator that hardens config before promotion

> The natural end state is a thin skills SSOT plus a test bench: **agent-config quiet means the pipeline is healthy.** See [ROADMAP § purpose shift](ROADMAP.md).

**The resident's report and its archive:** [§agent-config: 스킬 SSOT와 시험소 — 멀티하네스 이후](https://notes.junghanacs.com/botlog/20260312T174622) is this repo's 담당자 문서 (resident's note) in the digital garden. Its current report leads with the role, neighboring ownership boundaries and judgments that guide the work; the earlier chronology is preserved under **ARCHIVE**. This README is the consumer-facing front door, while that note explains the resident's present stance without making the reader traverse the whole history first.

The consumer-side surface table, the durable native module and dated supplier checkpoints: [docs/entwurf-consumer.md](docs/entwurf-consumer.md).

## Why This Exists

The hard problem is continuity, not just code generation. A harness can preserve its own conversation without making that context available to another harness, model or device. A long-lived durable conversation and cross-session semantic recall are different capabilities. This repo builds a legible way to return to the same person's work, rather than claiming every new session automatically inherits it.

agent-config attacks this with three layers:

1. **Shared memory door, separate memory owner** ([andenken](https://github.com/junghan0611/andenken)) — admitted session records and the exported public garden are searchable; private OpenClaw bot memory is a separate, labeled axis. agent-config owns the consumer doors, practical use and external memory-evaluation questions; Andenken turns GLG's memory assets into lighter searchable data and owns the engine, indexing and source-aware original reader. The aim is to revisit the conditions and choices behind earlier judgments and use them in present work, including human growth and changed judgments — not merely imitate a past answer. Embedding is the current production means, not a permanent requirement or a decision to abandon it. See [ROADMAP § memory direction](ROADMAP.md#2026-10-25-기억축--생성활용평가와-가벼운-검색-데이터의-역할-분리). No automatic collector of every live conversation is implied.

2. **Shared skill set** — common doors for notes, bibliography, git history, journals and other capabilities across the directly installed pi, Claude Code, Codex, Antigravity, Copilot CLI, Kiro and OpenClaw surfaces. Installation, local CLIs, permissions and native shortcuts retain their own contracts; identical skills do not erase those boundaries. OMP deliberately receives no shared skills from here: a subject you have already furnished is no longer the same comparison.

3. **Session continuity protocol** — leave a concrete next move in NEXT, preserve durable judgments in the resident's note, and use recap plus semantic/source recall when crossing sessions. `/new` is an explicit boundary; normal in-session compaction and a durable conversation's own lifecycle remain the harness's.

Claude, GPT, and Gemini are "graduates from different schools" — trained on different data with different philosophies. Trying to control them means writing hundreds of lines of system prompts per model. Instead, **throw one being-profile at all of them equally.** They keep their unique lenses while aligning around a single universe — this is the [Profile Harness](https://notes.junghanacs.com/botlog/20260228T075300/). Multi-harness support is a means, not the goal. The goal is **a single 1KB being-profile that exerts the same gravitational pull across any harness**.

The result is a reproducible route back to context: a shared stance, tools with named owners, and evidence that can be found again. Coverage depends on what was admitted, which sources remain available and what was actually verified — not on a promise of universal memory.

> Part of the [-config ecosystem](#the--config-ecosystem) by [glg @junghan0611](https://github.com/junghan0611)

## Where the Detail Lives

This page is the front door. The longer operating notes, ownership boundaries and dated observations live under [`docs/`](docs/), moved there without rewriting and with their original headings so existing anchors keep their names.

| Document | What it holds |
|---|---|
| [docs/entwurf-consumer.md](docs/entwurf-consumer.md) | The consumer-side reference for `entwurf`: who owns which surface, the durable native module, the bridge verbs this repo consumes, and dated supplier checkpoints (0.45.0, 0.35.0) |
| [docs/harness-surfaces.md](docs/harness-surfaces.md) | Per-harness memory/skill/ownership table, Claude Code as a native Pi surface (settings co-ownership, `bypassPermissions` boundary), the local entwurf skill-plugin layout, Codex/Antigravity/Copilot splits, and `pi/` settings |
| [docs/pi-extensions.md](docs/pi-extensions.md) | Every Pi extension, the skill-vs-extension boundary, third-party Pi packages, and the reasoning behind `heartbeat`, `autopilot` and `background-bash` |
| [docs/skills.md](docs/skills.md) | Linked skills, binary skills and their provenance gate, web-search and code-surface notes, and the LSP-style skill doc principle |
| [docs/memory-and-sessions.md](docs/memory-and-sessions.md) | The andenken memory axes, `/new` + `/recall` session continuity, compaction surfaces, and the public-verification policy for session evidence |
| [docs/runtime-bench.md](docs/runtime-bench.md) | Why the bench is self-sufficient and the ten bench subjects, with links to each root `NAME.md` matrix |
| [docs/setup.md](docs/setup.md) | What `./run.sh setup` does and deliberately does not do, and the shell helper examples (`pia`, `pit`, `pdt`, `pdc`, …) |

Former README sections keep their anchor names here, so an old `README.md#…` link still lands on a pointer:

| Former README section | Now in |
|---|---|
| <a id="official-reference-surface-for-entwurf"></a>Official Reference Surface for entwurf | [docs/entwurf-consumer.md](docs/entwurf-consumer.md#official-reference-surface-for-entwurf) |
| <a id="durable-native-module--env-first-background-tools-and-native-badge-entwurf-0340"></a>Durable Native Module — env first, background tools and native badge (Entwurf 0.34.0+) | [docs/entwurf-consumer.md](docs/entwurf-consumer.md#durable-native-module--env-first-background-tools-and-native-badge-entwurf-0340) |
| <a id="entwurf-surface-reference"></a>entwurf Surface Reference | [docs/entwurf-consumer.md](docs/entwurf-consumer.md#entwurf-surface-reference) |
| <a id="supplier-source-checkpoint--0450-read-2026-10-27"></a>Supplier source checkpoint — 0.45.0 (read 2026-10-27) | [docs/entwurf-consumer.md](docs/entwurf-consumer.md#supplier-source-checkpoint--0450-read-2026-10-27) |
| <a id="dated-supplier-observation--0350-a-visible-screwdriver-not-a-new-hierarchy"></a>Dated supplier observation — 0.35.0, a visible screwdriver, not a new hierarchy | [docs/entwurf-consumer.md](docs/entwurf-consumer.md#dated-supplier-observation--0350-a-visible-screwdriver-not-a-new-hierarchy) |
| <a id="harness-support"></a>Harness Support | [docs/harness-surfaces.md](docs/harness-surfaces.md#harness-support) |
| <a id="claude-code-as-native-pi-surface"></a>Claude Code as Native Pi Surface | [docs/harness-surfaces.md](docs/harness-surfaces.md#claude-code-as-native-pi-surface) |
| <a id="pi-config-pi"></a>Pi Config (`pi/`) | [docs/harness-surfaces.md](docs/harness-surfaces.md#pi-config-pi) |
| <a id="entwurf-skill-plugin-agent-config-local-layout"></a>entwurf Skill Plugin (agent-config local layout) | [docs/harness-surfaces.md](docs/harness-surfaces.md#entwurf-skill-plugin-agent-config-local-layout) |
| <a id="heartbeat--the-clock-is-the-cheap-half"></a>`heartbeat` — the clock is the cheap half | [docs/pi-extensions.md](docs/pi-extensions.md#heartbeat--the-clock-is-the-cheap-half) |
| <a id="autopilot--silence-is-a-trigger-never-a-grant"></a>`autopilot` — silence is a trigger, never a grant | [docs/pi-extensions.md](docs/pi-extensions.md#autopilot--silence-is-a-trigger-never-a-grant) |
| <a id="background-bash--why-it-exists"></a>`background-bash` — why it exists | [docs/pi-extensions.md](docs/pi-extensions.md#background-bash--why-it-exists) |
| <a id="session-management--new--recall"></a>Session Management — `/new` + recall | [docs/memory-and-sessions.md](docs/memory-and-sessions.md#session-management--new--recall) |
| <a id="public-verification--sessions-as-evidence"></a>Public Verification — Sessions as Evidence | [docs/memory-and-sessions.md](docs/memory-and-sessions.md#public-verification--sessions-as-evidence) |
| <a id="the-bench-is-self-sufficient"></a>The bench is self-sufficient | [docs/runtime-bench.md](docs/runtime-bench.md#the-bench-is-self-sufficient) |
| <a id="agent-runtime-bench"></a>Agent Runtime Bench | [docs/runtime-bench.md](docs/runtime-bench.md#agent-runtime-bench) |
| <a id="the-third-subject-is-one-glg-is-building"></a>The third subject is one GLG is building | [docs/runtime-bench.md](docs/runtime-bench.md#the-third-subject-is-one-glg-is-building) |
| <a id="shell-aliases-bashrclocal"></a>Shell Aliases (`~/.bashrc.local`) | [docs/setup.md](docs/setup.md#shell-aliases-bashrclocal) |

Root `NAME.md` bench files ([OMP.md](OMP.md), [PI-DURABLE.md](PI-DURABLE.md), [HERDR.md](HERDR.md), …), [MODELS.md](MODELS.md) and [pi-durable/README.md](pi-durable/README.md) stay where they are.

## What's Here

### Harnesses

The same `skills/` SSOT reaches pi (+ entwurf), Claude Code, Codex CLI, Antigravity CLI, Copilot CLI, Kiro CLI (optional) and OpenClaw; pi-durable reads it through Pi's own skill loader; OMP deliberately receives no shared skills. OpenCode is not used. Memory, skills and ownership per harness: [docs/harness-surfaces.md § Harness Support](docs/harness-surfaces.md#harness-support).

### Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Sessions, the public garden export and private OpenClaw bot memory are three separately labeled axes owned by andenken; agent-config owns the consumer doors (`semantic-memory`, `session-recap`, `memory-sync`). Details: [docs/memory-and-sessions.md](docs/memory-and-sessions.md#semantic-memory--andenken).

### Pi Extensions ([`pi-extensions/`](pi-extensions/))

Local Pi lifecycle, provider and TUI hands — `background-bash`, `review`, `goal`, `decision-gate`, `heartbeat`, `autopilot`, `raw-paste` and others. A skill is the cross-harness door; a Pi extension is the local lifecycle/provider/TUI hand. Table and reasoning: [docs/pi-extensions.md](docs/pi-extensions.md).

### Skills ([`skills/`](skills/))

47 skills (tracked directory and named-set equality rechecked 2026-10-27, both 47, both set differences empty; the list below names all 47). A machine may also carry an untracked local symlink — `butlercli` does on the workstation — which the `*/` glob counts but this number does not. Categories: data access (denotecli, bibcli, gitcli, lifetract, gogcli, ghcli, day-query, timeline), agent memory (session-recap, dictcli, semantic-memory, memory-sync, improve-agent), writing (botlog, botment, agenda, punchout, autholog-mend), communication (dm, slack-latest, jiracli, telegram), code surface (forge — linked, owned by sorge-config), work workbench (plane), web/media (brave-search, exa-search, browser-tools, youtube-transcript, medium-extractor, summarize, transcribe), release hygiene (commit, tag-release, next-handoff), reasoning (logickocli, subtract, evidence-closure), entwurf (entwurf-peek), cross-repo care (sorge — linked, owned by its own repo), harness wrappers (command-recall, command-glgimage — for harnesses with no custom-command surface), harness bench (harness-bench), tools (emacs, tmux, diskspace, cloudflare — drives the installed official `cf` and `wrangler`, keeps only `cf-doctor` for token coverage, quota).

Linked skills (`sorge`, `forge`), binary skills and their provenance gate, and the skill doc principle: [docs/skills.md](docs/skills.md).

### Themes ([`pi-themes/`](pi-themes/))

`glg-dark` (custom, Ghostty Dracula compatible).

### Commands ([`commands/`](commands/))

| Command | Purpose |
|---------|---------|
| `/recall` | Multi-axis context hydration without compact — daily memory-axis ritual |
| `/discuss` | Planning interviewer — turns a rough idea into a plan by asking at most three questions a round, each with a recommended default. Does not implement |
| `/boom` | Capture a crashed entwurf session into `.agent-reports/` for later triage |
| `/pandoc-html` | Markdown/Org → Google Docs HTML/DOCX |
| `/glg-image` | Image generation entry |
| `/metaplay` | Meta agent play |
| `/docplay` | Random document polish play (front matter/title/tags/links/rename) |
| `/authologplay` | Mend one raw autholog piece into garden core text + links + a GLGMAN Universe image |
| `/scaleplay` | Take a scene whose scale won't sit still: commit the first intuition, measure it, accumulate in `studies/` |

## One-Command Setup

```bash
git clone https://github.com/junghan0611/agent-config.git
cd agent-config
./run.sh setup    # provision CLIs + links + owned settings merges + dependencies
./run.sh env      # verify: system, API keys, links, binaries, memory index
```

This provisions **one operator's working environment**, including user-wide links, settings and hooks. Read [AGENTS.md](AGENTS.md) and the ownership notes first; it is not a sandboxed generic installer, a credential bundle or a way to install entwurf implicitly.

What `setup` performs step by step, what it deliberately leaves to entwurf and the bench, and the shell helper examples: [docs/setup.md](docs/setup.md).

## The -config Ecosystem

| Repo | Layer | Description |
|------|-------|-------------|
| [nixos-config](https://github.com/junghan0611/nixos-config) | OS | NixOS flakes, hardware, services |
| [doomemacs-config](https://github.com/junghan0611/doomemacs-config) | Editor | Doom Emacs, org-mode, denote |
| [zotero-config](https://github.com/junghan0611/zotero-config) | Bibliography | 8,000+ references, bibcli |
| **[agent-config](https://github.com/junghan0611/agent-config)** | **Agent infra** | **Extensions, skills, themes, settings — this repo** |
| **[entwurf](https://github.com/junghan0611/entwurf)** | **Garden-citizen dispatch** | **Addressing, native contacts, visible lifecycle, ACP provider, and the packaged durable carrier — not a second harness** |
| **[andenken](https://github.com/junghan0611/andenken)** | **Memory** | **Semantic memory — sessions + md public garden knowledge** |
| [memex-kb](https://github.com/junghan0611/memex-kb) | Knowledge | Legacy document conversion pipeline |
| [GLG-Mono](https://github.com/junghan0611/GLG-Mono) | Font | Custom monospace programming font |
| [geworfen](https://github.com/junghan0611/geworfen) | Being | Existence data viewer — WebTUI agenda |
| [prime-agent](https://github.com/junghan0611/prime-agent) | Runtime (fork) | RLM harness fork whose persistent workspace is Clojure/SCI on GraalVM instead of Python — the bench subject GLG builds rather than installs |
| **[sorge](https://github.com/junghan0611/sorge)** | **Care** | **Sorge — the cross-repo view no single repository can hold. Owns the `sorge` skill this repo only links to** |

### Skill Source Repos

| CLI | Repo | Language | Purpose |
|-----|------|----------|---------|
| denotecli | [junghan0611/denotecli](https://github.com/junghan0611/denotecli) | Go | Denote knowledge base search (3,000+ notes) |
| gitcli | [junghan0611/gitcli](https://github.com/junghan0611/gitcli) | Go | Local git commit timeline (50+ repos) |
| lifetract | [junghan0611/lifetract](https://github.com/junghan0611/lifetract) | Go | Samsung Health + aTimeLogger tracking |
| dictcli | [junghan0611/dictcli](https://github.com/junghan0611/dictcli) | Clojure/GraalVM | Personal vocabulary graph (3,971 triples) |
| bibcli | [junghan0611/zotero-config](https://github.com/junghan0611/zotero-config) | Go | BibTeX search (8,000+ entries) |

## Planning Files

- [NEXT.md](NEXT.md) — volatile next-step anchor for the next session
- [ROADMAP.md](ROADMAP.md) — medium-horizon tracks and direction
- [CHANGELOG.md](CHANGELOG.md) — closed history
- [MODELS.md](MODELS.md) — the manually curated sibling-launch roster: active rails, spending order, and exact model selectors (`./run.sh models` checks it against pi's live catalog)

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
