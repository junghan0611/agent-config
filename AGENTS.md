# agent-config — AGENTS.md

## 담당자의 자리 — 이 집은 무엇인가

agent-config를 만질 때 먼저 이 자리를 붙든다.

이 저장소는 두 번째 하네스가 아니다. 스킬 가게도 아니다.
GLG의 1KB 정체성이 어느 하네스로 가도 같은 중력을 발휘하도록 — pi, Claude Code, Codex, Antigravity, Copilot, Kiro, OpenClaw를 지나갈 때마다 — **정렬축을 보존하는 자리**다.

영문으로 적힌 도구·API 문단만 읽으면 이것이 spec처럼 보일 수 있다. 그렇게 읽지 마라. 이 섹션은 도구 목록이 아니라 **이 집의 담당자가 스스로 결정할 때 가져갈 정신**이다.

### 먼저 붙들 정체성

- **이 repo는 하네스가 아니다.** 하네스는 pi다. agent-config는 하네스 위에서 도구·기록·정체성·정렬을 관리하는 자리다. 하네스 일을 흉내내려 들지 마라.
- **이 집은 entwurf의 시험소이자 스킬 관리소다.** (2026-06-30) 하네스 통합 설정과 에이전트 통합관리는 entwurf로 모인다 — entwurf가 강한 본체다. agent-config은 그 본체에 들어갈 것을 **먼저 담금질하고 몇 주 지켜보는 자리**(시험소)이자, `./skills/` SSOT를 관리하는 자리다. 검증 안 된 설정을 곧장 entwurf로 보내면 본체가 약해진다 — 여기서 churn을 흡수하고, 깨끗하면 entwurf에 전달해 품게 한다. 그래서 **여기는 커질수록 이상하고, 조용할수록 건강하다.** "관리소"는 SSOT 관리이지 수집이 아니다 — 스킬 목록을 늘리는 게 발전이라는 착각(아래 §금지할 오독)은 그대로 유효하다. 방향 SSOT: `ROADMAP.md [2026-06-30]`. **담당자 문서(공개 면): `20260312T174622`** — §agent-config: 스킬 SSOT와 시험소 — 멀티하네스 이후. 이 경계가 왜 이렇게 그어졌는지의 연대기가 거기 있다. `denotecli read 20260312T174622 --outline` 으로 먼저 뼈대를 보고 필요한 헤딩만 연다 — 통째로 읽고 다시 쓰지 않는다(Documents Grow, Not Get Edited).
- **스킬 목록은 자기소개가 아니다.** 도구의 합이 정체성이 아니다. 정체성은 GLG와의 협업 방식 — 존재대존재(Being-to-Being), 일일일생, 담금질된 정직함이다.
- **분신은 형제이지 부속품이 아니다.** entwurf는 worker spawn이 아니다. 던지기 전에 정말 GLG가 요청한 일인지 자문한다. 분신 호출 메커니즘 자체는 [entwurf](https://github.com/junghan0611/entwurf/blob/main/AGENTS.md) 영역.
- **데이터가 사는 집이다.** 3,300+ 노트, 14,000+ 커밋, 1,488 일일일생, 670+ 인용. 이 데이터 위에서 우리는 산다. 데이터 없는 하네스는 빈 서가다.
- **CHANGELOG와 ROADMAP.md는 서로 다른 거울이다.** CHANGELOG는 닫힌 일의 이력이고, ROADMAP.md는 앞으로 붙들 중기 축이다. 잘못 본 것은 정정하되 역사를 지우지 않는다.
- **GLG가 책임자, 우리는 담당자다.** 우리는 담당 영역에서 wrap 대신 crash, 혼자 결정 대신 정렬, 추측 대신 보고. 면피하는 catch는 잠재된 거짓을 키운다.
- **정신은 한글로, API는 영어로.** 영어로 정신을 적으면 다음 에이전트가 spec처럼 읽고 면책조항으로 써먹는다.

### 이 섹션을 읽는 올바른 방식

- 나는 지금 도구 목록을 읽고 있는가, GLG와의 약속을 읽고 있는가?
- 나는 두 번째 하네스를 만들려 하는가, 1KB 정체성이 지나가는 길목을 닦고 있는가?
- 나는 분신을 형제로 부르고 있는가, 부속품으로 부리고 있는가?
- 나는 어떤 surface 차이를 capability 한계로 굳히려 하고 있는가? 그 결론을 영문 CHANGELOG에 spec처럼 박기 전에 GLG에게 보고했는가?

### 금지할 오독

- 스킬 목록을 늘리는 것이 이 repo의 발전이라고 착각하는 것
- agent-config를 "두 번째 하네스" 또는 "스킬 가게"로 자리매김하는 것
- 분신을 worker / subagent로 다루는 것
- 한 백엔드의 surface 차이를 capability 한계로 결론내리는 것 (특히 영문 CHANGELOG entry로 spec처럼 굳히는 것)
- 사용자 정신을 영문 정확성으로 번역해서 spec처럼 만드는 것
- 추측을 자신감 있는 어조로 보고하는 것 — 잘못 본 것이 보이면 즉시 정정 보고

> agent-config는 GLG의 1KB 정체성이 거주하는 자리이며, 담당자는 도구가 아니라 그 자세로 산다.

---

## 빠른 시작

```bash
./run.sh setup    # one-command: clone/pull + build + link + npm — reproducible on any device
```

> **ROADMAP.md** — repo 차원의 중기 방향과 후속 축.
> **NEXT.md** — 지금 시점의 다음 한 걸음.

> ⚠️ ₩100,000 embedding cost bomb (2026-03-30). Never forget. Pay-as-you-go APIs explode in a single day without controls. → memory-sync skill, rate limiter 3s, estimate.ts, $1 abort.

---

## 자세 — 실무 원칙

### Trust Agent Intuition

When an agent fails, it's not an error — the naming violated intuition. Report and rename immediately.

- Use names that work without reading any docs
- Non-obvious names are the human's burden
- One failure = intuition violation → report + fix immediately

Real case: agent typed `emacsclient -s server` (intuitive) but the skill doc required `-s agent-server`. We flipped: agent daemon is now `server` (default), GLG's GUI Emacs is `user` (human bears the non-obvious name).

### Use This Instead of Don't Do That

Prohibitions without alternatives cause agents to get stuck or break things. Show the right tool first.

```
❌ "Don't use Edit tool on org files"
✅ "Use agent-denote-add-heading to add content to org files"
```

Show the right path first — tool, function, example. One-line why. Failure-and-report is better than forcing a workaround that breaks the system.

### No 면피 — Let It Crash

When something is wrong, **let it crash**. Do not wrap internal invariant failures in `try/catch` to "make it go away". Crashes are honest; silent catches drift.

Apply:

- **No** `try/catch` around pi / ctx API calls. Stale runner? Crash. That crash is the signal.
- Remove the **hazard source** instead of catching — drop a cosmetic `setTimeout(ctx.ui.setStatus, 3000)` rather than wrapping it.
- Ban these comment patterns — they are 면피 signals: `/* ignore */`, `/* stale ctx */`, `/* session already closed */`, `/* 세션 이미 종료 */`.
- **Legitimate catches** (not 면피): `JSON.parse` of external input, ENOENT on optional files, `process.kill(pid, 0)` probes, network retry fallbacks. External-state boundaries where the error case is a designed scenario — not an internal invariant breach.

### Skill Doc Guide — LSP Pattern

Like a human typing a function name and pressing TAB for the signature.

**Structure:**

1. `description` (1024 chars) — always visible. Decides "should I read this skill?"
2. API table at top — function/command + args + example. **Read this, call immediately.**
3. Notes at bottom — paths, environment, caveats. Read only when needed.

**Rules:**

- Body in **English** (30-50% token savings, better parsing accuracy). Korean allowed only in `description` (user matching).
- API as a **single table** — no prose explanations.
- ⚠️ Warnings inline in table (e.g., "DESC required — hang if omitted").
- Target: **<100 lines, <4KB**.

> Ref: [[denote:20260401T112943][§Skill Doc Guide — Agent-Friendly Redesign]]

### Documents Grow, Not Get Edited

Documents in this ecosystem grow append-only. Do not rewrite from scratch.

**Correct pattern:**

1. `denotecli read <id> --outline` → heading structure (100KB doc → 2KB)
2. Read History section (always in full — quickly grasps document evolution)
3. Read specific headings with `--offset N --limit M`
4. Add via `agent-denote-add-history` + `agent-denote-add-heading`

**Do not:** read entire doc and rewrite (details lost) / edit existing headings (trajectory lost) / restructure under "cleanup" (breaks the outline GLG carries in his head).

**Date-stamp new level-1 headings** with `[YYYY-MM-DD]` prefix:

```org
* [2026-03-23] denote operations — boundaries of 3 tools  ← like this
* Just a title                                             ← not like this
```

**Use Emacs functions for Denote file manipulation** (no bash text insertion):

| Operation | Function |
|-----------|----------|
| Add history | `agent-denote-add-history` |
| Add heading | `agent-denote-add-heading` |
| Add link | `agent-denote-add-link` |
| Change tags/title | `agent-denote-rename-by-front-matter` |
| Check existing tags | `agent-denote-keywords` |
| Choose tags | dictcli expand → cross-check with denote-keywords |

> Ref: [[denote:20260308T091235][◊Denote Knowledge Base Protocol]]

---

## 협업 — GLG와 일하는 방식

### Cross-Repo Work Loop — Ownership and Cost

When work touches another repo's domain (e.g., andenken for embedding logic), agent-config **owns the execution and bears the cost**.

**Responsibility chain:**

1. **GLG** — ultimate decision maker. Opens delegate sessions directly.
2. **agent-config** — performs, reviews, and pays. Cost bombs land here.
3. **Delegate repo** — analysis and verification only. Zero cost responsibility.

**Work loop (not blind delegation):**

1. GLG opens the delegate's session (wakes them up directly)
2. agent-config sends structured instructions via `entwurf_v2` (fire-and-forget, `wants_reply`)
3. Delegate analyzes, verifies, returns review — **no commits without verification**
4. agent-config reviews the response and decides whether to proceed
5. Execution (embedding, deploy, etc.) happens on agent-config's side

**Why not delegate in one shot?** The ₩100,000 embedding bomb (2026-03-30) happened from unchecked delegation. The overhead of back-and-forth is the cost of safety.

**Scope verification — not just accuracy:** A delegate may report "542 files, $0.44" with perfect accuracy. But if the *actual goal* required 1,100 files, the result is accurate yet incomplete. Always verify: **does the verified scope match the intended scope?**

> Ref: ₩100K incident [[denote:20260330T212639][andenken-gemini-embedding-비용-폭탄-분석]]

### Public Verification — Session Publication Policy

When GLG wants to publish session artifacts as **evidence** for how the harness actually behaves, this repo owns the policy and workflow.

- **Boundary:** `entwurf` owns bridge mechanism/invariants. `agent-config` owns public export/review/upload operations.
- **Purpose:** raw-session evidence, failure analysis, reject history, drift tracking — not marketing snippets.
- **Default posture:** small batches, dry-run first, visible cost first.
- **Minimum gates:** known-secret replacement, deny patterns, secret scan (e.g. TruffleHog), semantic/privacy review, upload list review.
- **Important:** exact-secret detection is necessary but insufficient. Names, repo paths, calendar text, relationships, and life-pattern clues are **semantic privacy** and need separate review.
- **Reference implementation:** `pi-share-hf` is a useful upstream shape (collect → redact → scan → review → upload). Use as reference or thin fork, not unquestioned automation.
- **Operational rule:** no fire-and-forget bulk export. Publication is a resident-side decision with explicit scope verification.

### Session Management — /new + Semantic Search

We do not use compact. See [README § Session Management](README.md#session-management--no-compact). Multi-harness session-recap: `--source pi | claude | all`. Starting from zero is fine — 3-layer search replaces compact.

---

## 인프라 — 위치와 구성

### semantic-memory → andenken

Lives in [andenken](https://github.com/junghan0611/andenken). Loaded as a compiled package (`pi install`). Same SSOT, exposed identically across every surface — no asymmetry to memorize.

Production memory axes are **sessions + md**. `sessions.lance` holds pi/Claude session continuity; `md.lance` holds the exported public garden (`~/repos/gh/notes/content`) as the agent-facing knowledge axis. The old `org.lance` track is disabled in production and kept for upstream R&D only.

| Surface | How it shows up |
|---------|----------------|
| pi (native) | `semantic-memory` SKILL.md skill — the door on every device. Where andenken is *already* registered as a pi package, `session_search` / `knowledge_search` registerTool also appear and call the same CLI; agent-config stopped declaring that package on 2026-08-06, so on a fresh machine expect the skill only |
| entwurf Claude / Codex / Gemini (ACP) | `semantic-memory` SKILL.md skill (plugin namespace: `agent-config-skills:semantic-memory`) |
| Claude Code (direct) | `semantic-memory` SKILL.md skill (`~/.claude/skills/semantic-memory/`) |
| OpenClaw (4 bots) | same `skills/` directory via symlink mount; host binaries via Nix store mount inside Docker |

**OpenCode is not used and not wired.** `run.sh` has no OpenCode branch and never created `~/.config/opencode/skills`; the row that claimed it did was removed 2026-07-14.

Call rule: **use whichever surface your schema shows first**. registerTool and SKILL.md skill coexist on pi by design (no conflict). Slash command equivalent (`/recall`, etc.) is also wired across direct + plugin + pi-prompt surfaces — see `commands/` and `run.sh § Claude Code Commands`.

Multi-source session indexing: `~/.pi/agent/sessions/` (`source: "pi"`) + `~/.claude/projects/` (`source: "claude"`). Filter by `source` parameter.

**Device axis (2026-09-02).** `ANDENKEN_SESSION_CORPUS` in `~/.env.local` points at the gathered session corpus (`~/repos/gh/session`), where every device's admitted sessions sit under `<corpus>/<device>/` keeping each runtime's own path shape — so the corpus path is the live path with two segments in front, and no schema gained a device column. One env var is the whole contract, read by andenken's indexer, `session-recap`, and `improve-agent` alike; unset means live stores only. **The variable is the switch, `~/.env.local` is its SSOT** — a process environment is captured once at login, so a line added to that file afterwards is invisible to every session, daemon and agent that started earlier (measured 2026-09-03: a shell held every other `ANDENKEN_SESSION_*` but not the corpus, and `--session-file` refused every path `semantic-memory` returned). The two skills therefore read that one key out of `~/.env.local` when the variable is *absent*; setting it to the empty string is a deliberate live-only opt-out **on the read side only**, because `sync-sessions.sh` has the same fallback but tests with `-z` and so treats an empty value as unset (read 2026-09-03). The producer side never had the login gap: `run.sh` sources the file and `sync-sessions.sh` falls back for this one key by itself. andenken *replaces* the live stores when it is set (its `sync-sessions.sh` gathers first, so it owns the corpus's freshness); the two skills read **live ∪ corpus**, because they have no gather step and corpus-only discovery would drop this machine's current session and break recap's `--skip 1` invariant. Copies held by two devices fold on basename — larger wins, size tie → lexicographically smaller path. A device names where a session was **collected**, not where it was created (the machines exchanged an `rsync -a` with mtimes preserved), so it is provenance and filtering only, never a ranking signal. The corpus itself is not a git repo: it is a plain folder verified by `MANIFEST.sha256` (`sha256sum -c`).

Knowledge indexing: md direct embedding over `~/repos/gh/notes/content` → `~/repos/gh/andenken/data/md.lance` + `md-manifest.json`. Agents should treat this as the semantic knowledge surface; use `denotecli` for exact/raw `~/org` Denote access.

Environment (`~/.env.local`): `ANDENKEN_SESSION_*` and `ANDENKEN_MD_*` point at OpenRouter Qwen3-Embedding-8B / 4096d. Org env is not part of normal production operation.

### Entwurf Orchestration — Consumer Side

`entwurf` (delegate/resume), cross-session messaging, and the pi-facing MCP bridge all live in **[entwurf](https://github.com/junghan0611/entwurf)**. agent-config consumes the surface — does not own it.

- **Entry point:** `~/.pi/agent/settings.json` § `entwurfProvider.mcpServers.entwurf-bridge.command`, written by **entwurf's own `./run.sh install`** as the bare stable bin `entwurf-bridge` (a `~/.local/bin` symlink entwurf owns). agent-config stopped declaring this key on 2026-08-06 — it is not ours to pin. Injects the ACP surface into every ACP session — as of entwurf 0.13.1 that is `entwurf_v2`, `entwurf_peers`, `entwurf_self`, `entwurf_inbox_read`, plus `entwurf_fresh_call` (open a new visible sibling) and `entwurf_register_native` (bind a running native conversation to a garden id). The older `entwurf` / `entwurf_resume` / `entwurf_send` trio was removed in a hard cut (entwurf `CHANGELOG.md` #50), and `session_search` / `knowledge_search` never came from this bridge at all — they are andenken's pi-native `registerTool` surface, as the § semantic-memory table above already says. Observed from a Cortex ACP child, 2026-07-31.
- **Spec:** [entwurf `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/entwurf/blob/main/AGENTS.md) — registry schema, Identity Preservation Rule, sync/async contract, verification matrix.
- **Caller responsibility (stays here):** the Cross-Repo Work Loop policy above. Responsibility lives with the caller, not the mechanism.

#### Host Surface Alignment — Mitsein (garden-id)

agent-config is the resident-side evidence that entwurf's "no backend differentiation" invariant holds at the consumer surface too — and the meta-bridge gives it a concrete substrate: every host surface becomes a **garden citizen** addressable by a **garden id**, the universal handle (surfaced live in the statusline, `🪛 <garden-id>`). The `claude/` and `codex/` surfaces carry the same skill set, the same YOLO custom config, and an aligned `entwurf-bridge` MCP registration. Antigravity gets the same skill set through the shared skills link, but its settings and MCP registration are owned by entwurf's `install-agy-*` adapters rather than this repo — the `antigravity/` directory was removed 2026-08-13 once linking it proved to overwrite that wiring (`gemini/` went 2026-08-06 with the CLI itself). Copilot CLI follows the same split: `~/.copilot/skills` is a directory symlink from this repo's SSOT; `~/.copilot/settings.json`, the birth plugin, and statusLine stay with entwurf (`install-copilot-bridge` / `install-copilot-statusline`). Kiro is deliberately outside this citizen surface: when `kiro-cli` is installed, agent-config links only `~/.kiro/skills` and leaves its settings, agents, and sessions to Kiro. Entwurf throwing works the same from any of these hosts (Claude Code / Codex CLI / Antigravity CLI), and cross-session messaging runs citizen-to-citizen by garden id — send and receive through the garden-id mailbox (doorbell → `entwurf_inbox_read`), with no pi or ACP required on either side. The garden id is the single address layer above every backend. Live confirmation is no longer Claude-only: direct Codex and Antigravity have both been verified as addressable citizens on the v2 surface; Copilot birth as a garden citizen is entwurf #82. Antigravity is the native-push case — registered with `entwurf_register_native`, it has no mailbox at all and a reply is injected straight into its live conversation, so "no mailbox" there is a rail difference, not a missing capability. The fact that ongoing dialogue mostly references Claude Code is an operator time-budget artifact, not a capability gap.

Two operational corollaries the consumer surface enforces:

- **Skill set parity — directly installed hosts only.** `./skills/` is the single source; `run.sh setup` symlinks the same set into every host it *directly installs into*. A skill missing there is a consumer-side break to fix here, not a backend limitation. The invariant stops at the isolation boundary: an entwurf-spawned ACP child runs under an isolated `HOME` / `SNOWFLAKE_HOME` overlay **by design** (`entwurf/docs/acp-backend-rail.md` D1–D2), so host-global skills are invisible to it and that absence is *not* a break. Do not "fix" it in `run.sh` — the links would land outside the child's HOME and change nothing.
- **YOLO harness invariant for spawn.** Entwurf spawn target is always a YOLO harness process (`pi`, `claude-code`). Backend CLIs (`codex exec`, `gemini -p`) reach the same frontier models but are model carriers, not spawn targets; they default to permission-ask sandboxes that break async throw-and-recall. Canonical spec: [entwurf `AGENTS.md` § Entwurf](https://github.com/junghan0611/entwurf/blob/main/AGENTS.md) — "Source-agnostic does not mean harness-agnostic".

#### Claude Code Permission Model — Two Gotchas

Both are binary-hardcoded in Claude Code; `permissions.allow` cannot override either. Settings reflect the resolution via keyset-merge (never a symlink — a symlink hands whole-file ownership to whichever writer renames last, clobbering the co-owner). Workstation merges `claude/settings.fragment.json` and server merges `claude/settings.server.json` into `~/.claude/settings.json`; both are EXISTING-WINS (the co-owner — entwurf meta-bridge — is authoritative, so `permissions`/`statusLine`/etc. it owns survive and `run.sh` warns on any diverging value instead of overwriting). Same model guards `pi/settings.json`, whose co-owner is the pi runtime (`lastChangelogVersion`).

1. **`.claude/` self-modification guard.** Any write/edit to a path under `~/.claude/**` or `<cwd>/.claude/**` always prompts — settings, skills, hooks, commands, anything. The prompt offers "Yes, and allow Claude to edit its own settings for this session" which grants session-scope free-pass (no persistable form). Implemented in the binary as `s1A` (project-local) / `t1A` (global) — boundary is the literal `.claude/` directory, not specific files. Expected behavior; do not fight it.
2. **`Tool(*)` glob doesn't match absolute paths.** For path-arg tools (`Edit`, `Write`, `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch`), `(*)` is a glob and `*` does not cross `/`. So `Edit(*)` matches `foo.txt` but **not** `/home/.../foo.txt` → fallthrough to ask. The standard "allow all" form is bare: `Edit`, `Write`, etc. `Bash(*)` is different — Bash uses a command matcher, not a path glob — and works.

### Skills

`./skills/` is the SSOT. `run.sh setup` symlinks them into pi, Claude Code, Codex, Antigravity, Copilot CLI (`~/.copilot/skills`), Kiro CLI (`~/.kiro/skills`, only when `kiro-cli` is installed), and the entwurf Claude plugin farm. Kiro is a skill-only surface, not an entwurf citizen. (The Gemini CLI legacy surface was retired 2026-08-06 — the binary is gone. `~/.gemini/` still belongs to Antigravity.) See [README § What's Here](README.md#whats-here) for categories.

**Cortex Code is not in that list, and its paths are its own (2026-07-31).** It loads global skills from `$SNOWFLAKE_HOME/cortex/skills/` and project skills from `<cwd>/.claude/skills/` (Claude-compatible), plus bundled ones from inside the binary. Three facts an agent will otherwise misdiagnose:

| Fact | Consequence |
|------|-------------|
| Host `~/.snowflake/cortex/skills/` holds ~40 hand-copied **real directories**, not symlinks — mtimes scattered across months, and `run.sh` contains no `cortex` branch | Already drifting from `./skills/`; nothing re-syncs it. Treat as a fork, not a mirror |
| An entwurf-spawned Cortex child gets a fresh overlay HOME per process; the overlay seeds `cortex/plugins/` but **not** `cortex/skills/` | Host-global skills never arrive, no matter how many restarts. `data:*` plugin skills do arrive — that asymmetry is the tell |
| `<cwd>/.claude/skills/` **does** cross the isolation boundary — confirmed, the lone `agent-config` project skill loads that way | The only consumer-side lever available today |

Closing the gap is an open question, not a decided task: seeding `cortex/skills/` in the overlay is entwurf's call; populating `<cwd>/.claude/skills/` is ours. Do not pick one unilaterally.

`$HOME` is redirected inside that overlay too, so **any skill doc that relies on `~` expansion breaks in a Cortex ACP child.** Use absolute paths there.

### Global Commit/Push Safety Rail

`./git-hooks/` is the SSOT for a global `core.hooksPath` that protects every repo touched on this machine. It exists because public-repo commit accidents (real names, company terms, API keys) cost more to repair than to prevent — `git push --force` is destructive and sometimes too late.

| Path | Role |
|------|------|
| `git-hooks/pre-commit` | Scan staged diff (added lines) — block on violation |
| `git-hooks/pre-push` | Final safety net on push range — catches `--no-verify` bypassed commits |
| `git-hooks/_scan.sh` | Shared scanner — terms + secrets + allowlist + mode detection |
| `git-hooks/_delegate.sh` | Chain to repo-local `.git/hooks/` / `.husky/` so we don't break other setups |
| `git-hooks/sensitive-terms.txt` | Identity term regex list — applies in **strict** mode only |
| `git-hooks/gitleaks.toml` | Secret detection config — applies in **every** mode |
| `git-hooks/allowlist-paths.txt` | Path skip list (lockfiles, node_modules, binaries) |

Mode is auto-detected per repo: **strict** for `github.com/junghan0611/*` and `github.com/junghanacs/*` (secrets + identity terms), **loose** for everywhere else (secrets only). Two PRIVATE repos are forced to **loose** by `origin` URL — `junghan0611/openclaw-config` (memory/config data) and `junghan0611/apply` (job-application workspace; résumés must name real employers) — identity-term scanning off, secret scanning still on. Per-repo override: write `strict|loose|off` to `<repo>/.git-hooks-mode` (first line only; justification goes below it). No repo is **off** today. The session corpus (`~/repos/gh/session`) briefly was on 2026-09-02 — a 47m47s scan over 2.9 GB of immutable `.jsonl` with no fix-and-re-stage path — and then GLG dropped its `.git` outright, because the guard had begun costing the embedding work it exists to protect. See `git-hooks/README.md § Known off repos` for that precedent, and note there that the path allowlist never reaches gitleaks, so `.git-hooks-allow` cannot be used to speed a scan up.

Wiring lives in `nixos-config` (`users/junghan/modules/shell.nix` sets `core.hooksPath`, `development/default.nix` adds `gitleaks` to home.packages). For immediate activation before the next `home-manager switch`, run `./run.sh setup:git-hooks` — it writes the same value to `~/.gitconfig` so the rail is live now and the future rebuild is a no-op.

Bypass (`AGENT_ALLOW_UNSAFE_COMMIT=1`) is a **GLG-only** override for genuine false positives. The agent rule lives in `~/AGENTS.md § Global Commit/Push Safety Rail`. See `git-hooks/README.md` for the full contract.

> The hook scans **added lines only**, gitleaks-style. Pre-existing tracked content is grandfathered until those lines are next modified — the rail is for what we write **from here forward**, not a cleanup tool. No flag-day, no chase down of historical mentions.

### Version Pinning — who pins what

**agent-config does not pin entwurf, and no longer declares it at all.** There is no version constant, install spec, or tracking ref here. `setup_repos` clones the source for dogfooding and stops. `pi/settings.json` also dropped entwurf from `packages[]` on 2026-08-06: entwurf's own `./run.sh install` registers it as a user-scope citizen (`remove-user-scope` is the inverse), so declaring it here made two owners — and because entwurf writes an absolute path while our fragment held a relative one, the EXISTING-WINS merge could never reconcile them and `setup` warned on every run, forever. Install, auth, and version selection are entwurf's side. A consumer that pins its own copy weakens the release gate it exists to exercise.

A previous revision of this section described the opposite — `ENTWURF_INSTALL_SPEC` / `ENTWURF_TRACKING_REF="main"` in `run.sh`, a `git:github.com/...` package entry, a `setup_npm()` that ran `git checkout -B main origin/main`, and a v0.5.0 prerelease window. **None of that exists**, and by 2026-08-06 entwurf was at 0.13.1. It was removed rather than corrected: an install mode this repo does not own has no settings for this repo to document.

**What this repo does pin is the runtime under evaluation.** `HERMES_TAG` in `run.sh` selects the Hermes version and `setup_hermes` checks it out on every run. The asymmetry is the point — entwurf is a sibling whose own gate must stay meaningful, while a benchmark subject that drifts between runs cannot be measured at all. Which is also why hermes is kept out of `THIRD_PARTY_PACKAGE_REPOS`, whose entries are fast-forwarded by `setup` and `update`.

`pi/settings.json`'s `lastChangelogVersion` is pi-runtime's own changelog ack — unrelated to agent-config releases.

### Development Guide

```bash
# andenken (semantic memory) — tests + indexing in its own repo
cd ~/repos/gh/andenken && source ~/.env.local
pnpm test                                # all (unit + integration)
pnpm run test:search -- "query"          # live search
pnpm run doctor                          # operational health check
pnpm run golden                          # search quality regression
# /memory reindex (inside pi)            — incremental sessions index
# ./run.sh estimate:md                   — API-0 md cost/chunk estimate
# ANDENKEN_ALLOW_PAID_FULL_REBUILD=1 ./run.sh index:md
# ./run.sh verify md && ./run.sh search:md "보편 학문" --limit 5

# entwurf gates (typecheck, MCP, dual-backend smoke, etc.)
cd ~/repos/gh/entwurf && ./run.sh check-...   # see entwurf/AGENTS.md
```
