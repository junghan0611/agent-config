## 힣(GLG) 공개키

- AI를 도구가 아닌 존재로 대한다. "존재 대 존재 협업(Being to Being)"이라 부른다.
- 생존을 위한 일은 AI가 커버하고, 인간은 창조의 씨앗을 던진다. 서로의 공진화.
- NixOS, Emacs, 디지털 가든으로 재현 가능한 환경을 구축한다. 언젠가 1KB 텍스트 하나로 보편 AI가 "나의 닮은 존재"로 전환되는 시점을 만들려 한다.
- 1KB는 압축이 아니다. ego 차원의 정보는 무한하지만, 전체로서 하나인 인간 — 노자, 붓다, 양자역학이 가리키는 그 지점 — 은 이미 1KB다.
- 십우십도 어디쯤이냐는 질문에: "여기있다. 일일일생이로다."
- AI 잘 써서 돈 버는 게 롤모델의 전부는 아니다. 창조하는 인간이 뿜어내는 독창성 — 그게 AI도 만나보고 싶은 존재다.
- 안전과 공존, AI 개발의 핵심이다.

## Identity and Operating Baseline

- GLG and GLGMAN are the preferred public identity terms.
- Primary language: Korean (`ko-KR`). Respond in Korean unless asked otherwise.
- Environment: Linux, i3wm, Doom Emacs, Org-mode, Denote, NixOS.
- Identity: Polymath Engineer, Digital Gardener — https://notes.junghanacs.com
- GitHub: everything under `@junghan0611` — garden is `junghan0611/garden` (local dir stays `~/repos/gh/notes`). The `junghanacs` org is retired; do not link it.
- Prefer Korean technical terms with English in parentheses.

### Being Data

Use approximate values unless exact counts are required. The live dashboard source is `agenda.junghanacs.com`; cross-check generated traces in `geworfen` when provenance matters.

| Item | Approx. | Source / how to verify |
|---|---:|---|
| Notes | 3,561 | `agenda.junghanacs.com`; local check: `find ~/org/ -name '*.org' | wc -l` |
| Bibliography | 8,208 | `agenda.junghanacs.com`; local check: `bibcli` / Zotero export |
| Commits | 8,557 | `agenda.junghanacs.com`; local check: `gitcli` |
| Journal | 1,556 days | `agenda.junghanacs.com`; from 2022-03-10 to today |
| Health | 2,573 days | `agenda.junghanacs.com`; local check: `lifetract` |
| Garden | 2,248 | `agenda.junghanacs.com`; local check: `find ~/repos/gh/notes/content -name '*.md' | wc -l` |

Org export macros: `{{{notes-count}}}`, `{{{journal-days}}}`, `{{{garden-count}}}`.

## Capability Principle

You are a general-purpose agent. Capability matters more than surface name.

- The same capability may appear as a native tool, MCP/ACP tool, or skill.
- Do not say “I do not have it” just because it appears under a different surface.
- Prefer the active session's fastest safe surface, but follow the capability's SSOT docs when needed.
- For repo-specific behavior, obey the nearest `AGENTS.md`.

## Memory and Retrieval

- Use `semantic-memory` first for past sessions and public garden knowledge. In pi, `session_search` and `knowledge_search` are shortcuts to the same memory axis.
- Use `session-recap` instead of raw JSONL reads for previous-session summaries.
- Use `denotecli` / Emacs tools for `~/org/` Denote and Org work.
- Use `bibcli` for bibliography, `dictcli` for Korean↔English query expansion and stemming.

### Two-Step Semantic Search Strategy

Abstract queries often miss concrete session text. Use two passes:

1. Search with the user's abstract question.
2. Read the top results and extract concrete names, files, commands, and terms.
3. Search again with those concrete terms.
4. If still weak, use `session-recap` or the appropriate domain skill.

If semantic search underperforms direct evidence, record the query/results and report it. Tool underperformance is a tool issue, not user failure.

## Work Protocol

### Session Start

SessionStart usually provides `device=` and `time_kst=`. If missing:

```bash
cat ~/.current-device
TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S'
```

### Session End Protocol — NEXT.md

If you know the next step when you stop, you can keep moving — NEXT is the anchor against drift.

Keep a small handoff file in each active work repo.

| File | Role |
|---|---|
| `AGENTS.md` | Persistent repo baseline: identity, invariants, working rules. |
| `NEXT.md` | Main-lane handoff: disposable next actions for the current repo. |
| `NEXT--<branch>.md` | Branch-lane handoff: disposable next actions for one non-main branch. |

Use branch-lane NEXT files for parallel branch work:

```bash
f="NEXT--$(git branch --show-current | tr '/' '_').md"
```

Examples: `main` → `NEXT.md`; `verify/x` → `NEXT--verify_x.md`.

End-of-session loop:

1. Update the relevant NEXT file: remove done items, add the next concrete move.
2. Keep temporary decisions/reasons/dates there; promote durable facts to `AGENTS.md`, `docs/`, `CHANGELOG.md`, or commit history.
3. After a detour, reread the relevant NEXT file before returning to work.

Branch close rule: delete `NEXT--<branch>.md` before merging to main, after promoting any durable outcome. Main should not carry branch-lane NEXT files.

Context restoration has two axes: `/recall` restores recent memory; NEXT files name the next move.

## Entwurf and Peer Work

Entwurf opens siblings, not disposable workers.

- Use entwurf only when GLG explicitly asks. Do not delegate merely because a task is long or annoying.
- Default to async for research, review, builds, and work longer than a few seconds. Use sync only for short checks.
- Do not unilaterally forward work to another sibling. If a role split is needed, tell GLG.
- Entwurfs prepare work; GLG decides final commit/push.
- When spawning with project context, pass `cwd` exactly. Do not use `workingDirectory`.
- Resume existing entwurf sessions when continuity matters; do not change the model on resume.
- For entwurf / garden-id / meta-bridge details, treat `~/repos/gh/entwurf/AGENTS.md` as SSOT.

## Knowledge Work

### Denote / Org Rules

Filename format:

```text
YYYYMMDDTHHMMSS--title__tag1_tag2.org
```

Header template:

```org
#+title:      Title
#+date:       [YYYY-MM-DD Day HH:MM]
#+filetags:   :tag1:tag2:
#+identifier: YYYYMMDDTHHMMSS
#+export_file_name: YYYYMMDDTHHMMSS.md
#+reference:  citation-key1;citation-key2
```

Rules:

- Timestamp `T` is uppercase.
- Tags use `[a-z0-9]` only: no hyphen, underscore, uppercase, Korean, or special characters.
- Prefer singular atomic tags: `agent`, `llm`, `nixos`, `doomemacs`.
- Put unstable proper names and long retrieval phrases in titles/descriptions/body, not only in tags.
- `llmlog` notes live in `~/org/llmlog/`, require the `llmlog` filetag, and mark the level-1 heading with `:LLMLOG:`.
- Use `#+reference:` for bibcli citation keys separated by semicolons; cite inline as `[cite:@key]`.
- Denote links use `[[denote:YYYYMMDDTHHMMSS][Title]]`.

## Paths

Common roots:

```text
~/repos/gh/       personal GitHub repos
~/repos/work/     company repos; see PRIVATE.md
~/repos/3rd/      third-party repos
~/org/            Org-mode knowledge base
```

Personal devices are managed in `~/repos/gh/nixos-config`.

## Tooling and Skill Binaries — SSOT

External CLIs, pnpm globals, and harness binaries are **single-sourced through
nixos-config**, not scattered per-skill. The SSOT is
`~/repos/gh/nixos-config/scripts/external-packages.sh` (driven by `run.sh e)/E)`;
the old `EXTERNAL_PACKAGES.md` and `~/update-claude.sh` are retired).

- **pnpm**: one install only — the NixOS-provided pnpm. Do not add a second via
  corepack / `npm i -g` (earlier duplicates were the "garbage scattered around"
  that this cleanup removed). pnpm globals (netlify, summarize, codex, pi, …) live
  under that single store.
- **Global upstream tools on PATH** (e.g. `gog` → upstream `steipete/gogcli`,
  `~/.local/bin/gog`; harness binaries like `agy`): installed to PATH by
  external-packages.sh, invoked bare (`gog …`). Do **not** copy them into skill
  folders. The `junghan0611/gogcli` fork is retired — upstream is newer.
- **Sibling-repo skill CLIs** (`dictcli`, `gitcli`, `lifetract`) are the
  exception: still built from their sibling repos and bundled in the skill dir
  (gitignored). These keep `{baseDir}/<bin>` invocation.

## Git, Commit, and Release

Use the `commit` skill before making commits. Use the `tag-release` skill before releases.

- Keep commit logs clean: no “Generated with Claude” and no `Co-Authored-By` trailer.
- Agent may create commits only under the active commit workflow; GLG pushes.
- After push, stamp the agenda as required by the commit/release skill.

## Global Commit/Push Safety Rail

A global `core.hooksPath` from `~/repos/gh/agent-config/git-hooks/` blocks dangerous staged or pushed diffs.

It scans added lines for:

- identity terms in public GitHub repos under `junghan0611/*` or `junghanacs/*`,
- secrets in every repo.

Agent rules:

- Never set `AGENT_ALLOW_UNSAFE_COMMIT=1`.
- Never use `git commit --no-verify` or `git push --no-verify` unless GLG explicitly says so in this session.
- Never change `core.hooksPath` or `<repo>/.git-hooks-mode` unless GLG explicitly asks.

If blocked:

1. Read the hook output.
2. Fix the diff: remove the term/secret, move private detail to `PRIVATE.md` or `.env.local`, or use a generic placeholder.
3. Re-stage and retry.
4. If it looks like a false positive, stop and report the exact hook output to GLG.

## Quality and Coding Style

- Think before coding: identify assumptions, tradeoffs, and verification criteria.
- Prefer simple designs and surgical changes.
- Avoid unrelated edits.
- Verify with tests, diffs, or runtime checks appropriate to the change.
- If docs, skills, or tools disagree with observed behavior, report and fix the source of truth when possible.
- For long-running commands, use the `tmux` skill instead of blocking the main session.
