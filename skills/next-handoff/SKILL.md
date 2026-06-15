---
name: next-handoff
description: "NEXT.md 핸드오프 정리 — 세션 종료/중단 전에 다음 한 걸음을 단단히 조인다. NOW/RECENT/LEDGER 또는 메타리포 대시보드 구조, stem/detour 복귀선, 완료 항목 제거, stale blocker 정정, 검증 기준/읽을 곳/금지사항 압축, 브랜치별 NEXT--<branch>.md 선택. tag-release와 분리: NEXT 습관용이며 CHANGELOG/tag는 명시 요청 때만 tag-release 스킬로 넘긴다. Use when: 'NEXT 조여줘', 'handoff', '세션 마무리', '다음 세션', '책갈피', 'NEXT.md 정리', 'detour', 'branch NEXT'."
---

# next-handoff — keep NEXT.md as the next-session boot sector

## API

| Task | Do | Stop when |
|---|---|---|
| Close a session | read repo `NEXT.md`; remove done/stale items; write the next concrete move + verification + blockers | top pointer is actionable in <3 minutes |
| Branch lane | use `NEXT--$(git branch --show-current | tr '/' '_').md` for non-main branch work | branch-only work is not leaked into main `NEXT.md` |
| Tighten a large NEXT | split current pointer from old ledger; move long rationale to linked docs/llmlog/botlog | NEXT is a signpost, not a wiki |
| Stem + detour | name the current stem, list only detours that block/serve it, and write a return condition | detours cannot silently become the stem |
| Tag handoff | if GLG explicitly asks for changelog/tag/release, read `tag-release` skill | before editing `CHANGELOG.md` or making a tag |

## Model

`NEXT.md` is a **boot sector / bookmark**, not a task database.
It answers one question: *what should the next agent do first?*

`AGENTS.md` is persistent baseline. `NEXT.md` is disposable next action.
`CHANGELOG.md` is closed history. `ROADMAP.md` is optional future direction.

## Choose the file

```bash
branch=$(git branch --show-current 2>/dev/null || true)
if [ -n "$branch" ] && [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
  f="NEXT--$(printf '%s' "$branch" | tr '/' '_').md"
else
  f="NEXT.md"
fi
```

Branch close rule: delete `NEXT--<branch>.md` before merging, after durable outcomes are promoted.
Main should not carry branch-lane NEXT files.

## Shapes

### Single repo: NOW / RECENT / LEDGER

Use when one repo has one main workstream.

```markdown
# NOW
- Current: <where we stand>
- Next: (1) <do> → (2) <verify> → (3) <decide>
- Blocker: <none / exact blocker>
- Read: <doc/path/heading>
- Do not touch: <guardrail>

# RECENT
- [YYYY-MM-DD] <latest closed/changed fact, 5-10 lines max>

# LEDGER
<old rationale only if it must stay here; prefer linked docs>
```

### Stem + detour mode

Use when one repo has one existential delivery track, but unavoidable detours keep appearing.
This is still a single-repo NEXT shape; it adds a **return line** so the agent does not lose the stem.

Principles:
- Name the **stem**: the repo's reason for existing right now.
- Anchor the stem to a **deadline or delivery gate** when one exists.
- Classify every detour by **stem impact**: blocks delivery / external dependency / quality improvement / record-only.
- Every active detour needs a **return condition**: what closes it and sends work back to the stem.
- A **blocks-delivery** detour still aims at a *ship-able state* (repro + scope + mitigation + known issue), not root-cause perfection.
- Detours do not become the stem unless GLG explicitly re-declares the stem.
- A **record-only** detour carries no next-action, owner, or checkbox; re-entry requires re-judging stem impact first.
- Keep one current `NOW`; move old NOW snapshots to RECENT/LEDGER.

Minimal shape:

```markdown
# NOW — <current stem>
- Stem: <delivery/release reason>
- Next: <one move>
- Detour: <none / active detour + stem impact>
- Return: <condition for returning to stem>
- Blocker: <none / permission / environment>
```

### Meta repo: NOW / ACTIVE / DORMANT

Use when the repo coordinates many repos, domains, or humans.
Group by domain, not by every workspace folder.

```markdown
# NOW
- Hot group: <domain>
- Next: <single next move>
- Blocker: <none / exact blocker>
- Read: <workspace SSOT>
- Do not touch: <guardrail>

# ACTIVE
## <domain group>
- Current: ...
- Next: ...
- Verify: ...
- Link: ...

# DORMANT
- [YYYY-MM-DD] <domain> — <one-line dormant state>
```

## Tightening checklist

1. Read `AGENTS.md` + the relevant NEXT file first.
2. Remove or rewrite stale “in progress” wording; NOW must never lie.
3. Remove done items from NEXT, unless they are needed as a short RECENT line.
4. Keep only the next concrete move; move long “why” to docs/llmlog/botlog.
5. Add verification criteria before coding or before handing off.
6. Separate blockers by kind: permission / environment / none.
7. Add `Do not touch` guardrails when a future agent could overreach.
8. Do not edit `CHANGELOG.md`, `ROADMAP.md`, or tag unless GLG explicitly asks.

## Promotion rules

Move content out of NEXT when:

- one item exceeds ~7 lines → docs/plan or llmlog/botlog
- checklist exceeds ~5 boxes → issue/beads/checklist doc
- same item survives 2+ sessions → backlog/issue/ROADMAP or delete decision
- rationale grows → botlog/llmlog
- repeated procedure appears → AGENTS.md / README / skill / command
- completed work needs history → CHANGELOG via `tag-release` only when requested

## Tag-release boundary

`next-handoff` is habitual session hygiene.
`tag-release` is an explicit ritual:

```text
closed NEXT + commits -> CHANGELOG -> CalVer tag -> push/stamp
```

Do **not** run that ritual merely because NEXT was cleaned.
If GLG says “태그 박자”, “릴리즈 컷”, “changelog 정리”, or “NEXT 비우자/갈무리”, read `tag-release`.
