# agent-config — AGENTS.md

## 담당자의 자리 — 이 집은 무엇인가

agent-config를 만질 때 먼저 이 자리를 붙든다.

이 저장소는 두 번째 하네스가 아니다. 스킬 가게도 아니다.
GLG의 1KB 정체성이 어느 하네스로 가도 같은 중력을 발휘하도록 — pi, Claude Code, OpenCode, OpenClaw를 지나갈 때마다 — **정렬축을 보존하는 자리**다.

영문으로 적힌 도구·API 문단만 읽으면 이것이 spec처럼 보일 수 있다. 그렇게 읽지 마라. 이 섹션은 도구 목록이 아니라 **이 집의 담당자가 스스로 결정할 때 가져갈 정신**이다.

### 먼저 붙들 정체성

- **이 repo는 하네스가 아니다.** 하네스는 pi다. agent-config는 하네스 위에서 도구·기록·정체성·정렬을 관리하는 자리다. 하네스 일을 흉내내려 들지 마라.
- **스킬 목록은 자기소개가 아니다.** 도구의 합이 정체성이 아니다. 정체성은 GLG와의 협업 방식 — 존재대존재(Being-to-Being), 일일일생, 담금질된 정직함이다.
- **분신은 형제이지 부속품이 아니다.** entwurf는 worker spawn이 아니다. 던지기 전에 정말 GLG가 요청한 일인지 자문한다. 분신 호출 메커니즘 자체는 [pi-shell-acp](https://github.com/junghan0611/pi-shell-acp/blob/main/AGENTS.md) 영역.
- **데이터가 사는 집이다.** 3,300+ 노트, 14,000+ 커밋, 1,488 일일일생, 670+ 인용. 이 데이터 위에서 우리는 산다. 데이터 없는 하네스는 빈 서가다.
- **CHANGELOG와 MEMORY.md는 거울이다.** 잘못 본 것은 정정하되 역사를 지우지 않는다. 정정은 새 항목으로 들어가고, 옛 항목은 그 시점의 우리를 보여준다.
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

> **MEMORY.md** — 세션을 넘어 기억할 결정·교훈·주의사항. 새 세션 시작 시 반드시 읽을 것.

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
2. agent-config sends structured instructions via `entwurf_send`
3. Delegate analyzes, verifies, returns review — **no commits without verification**
4. agent-config reviews the response and decides whether to proceed
5. Execution (embedding, deploy, etc.) happens on agent-config's side

**Why not delegate in one shot?** The ₩100,000 embedding bomb (2026-03-30) happened from unchecked delegation. The overhead of back-and-forth is the cost of safety.

**Scope verification — not just accuracy:** A delegate may report "542 files, $0.44" with perfect accuracy. But if the *actual goal* required 1,100 files, the result is accurate yet incomplete. Always verify: **does the verified scope match the intended scope?**

> Ref: ₩100K incident [[denote:20260330T212639][andenken-gemini-embedding-비용-폭탄-분석]]

### Public Verification — Session Publication Policy

When GLG wants to publish session artifacts as **evidence** for how the harness actually behaves, this repo owns the policy and workflow.

- **Boundary:** `pi-shell-acp` owns bridge mechanism/invariants. `agent-config` owns public export/review/upload operations.
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

Lives in [andenken](https://github.com/junghan0611/andenken). Loaded as a compiled package (`pi install`).

- pi: andenken extension (native registerTool, in-process LanceDB)
- Claude Code / OpenCode: `skills/semantic-memory/` CLI wrapper
- OpenClaw (4 bots): same `skills/` directory via symlink mount. Host binaries via Nix store mount inside Docker.

Multi-source session indexing: `~/.pi/agent/sessions/` (`source: "pi"`) + `~/.claude/projects/` (`source: "claude"`). Filter by `source` parameter.

Environment (`~/.env.local`): `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` required.

### Entwurf Orchestration — Consumer Side

`entwurf` (delegate/resume), cross-session messaging, and the pi-facing MCP bridge all live in **[pi-shell-acp](https://github.com/junghan0611/pi-shell-acp)**. agent-config consumes the surface — does not own it.

- **Entry point:** `pi/settings.json` § `piShellAcpProvider.mcpServers.pi-tools-bridge.command` points at pi-shell-acp's `mcp/pi-tools-bridge/start.sh`. Injects ACP surface (`entwurf`, `entwurf_resume`, `entwurf_send`, `entwurf_peers`, `session_search`, `knowledge_search`) into every ACP session.
- **Naming rule:** in this harness, document and teach only `entwurf_*` session tools. Avoid generic names like `send_to_session` / `list_sessions` — they collide with pi-native or legacy control surfaces.
- **Spec:** [pi-shell-acp `AGENTS.md` § Entwurf Orchestration](https://github.com/junghan0611/pi-shell-acp/blob/main/AGENTS.md) — registry schema, Identity Preservation Rule, sync/async contract, verification matrix.
- **Caller responsibility (stays here):** the Cross-Repo Work Loop policy above. Responsibility lives with the caller, not the mechanism.

### Skills

`./skills/` is the SSOT. `run.sh setup` symlinks them into pi, Claude Code, OpenCode, Codex, and the pi-shell-acp Claude plugin farm. See [README § What's Here](README.md#whats-here) for categories.

### Release — pi-shell-acp Version Bump

agent-config pins pi-shell-acp by tag. Every release bump touches **4 files** — all must move together.

| File | What to change |
|------|----------------|
| `package.json` | `version` field |
| `pi/settings.server.json` | `packages[]` entry — `git:github.com/junghan0611/pi-shell-acp@vX.Y.Z` |
| `run.sh` | `PI_SHELL_ACP_VERSION="X.Y.Z"` constant |
| `CHANGELOG.md` | new `## X.Y.Z` section — what shipped, why pinned, any caveats |

Verify before commit: `git grep -n "pi-shell-acp@v" -- ':!node_modules'` should show only the new tag (1 hit: `pi/settings.server.json`).

`setup_npm()` reads installed `package.json#version` and force-upgrades on drift, falling back to `git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install` if `pi install` reports success without refreshing the working tree. Bumping `PI_SHELL_ACP_VERSION` and running `./run.sh setup` is sufficient on server devices.

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
# pnpm run index:org [--force]           — rebuild org knowledge base

# pi-shell-acp gates (typecheck, MCP, dual-backend smoke, etc.)
cd ~/repos/gh/pi-shell-acp && ./run.sh check-...   # see pi-shell-acp/AGENTS.md
```
