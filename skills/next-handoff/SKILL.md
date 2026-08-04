---
name: next-handoff
description: "NEXT.md 핸드오프 정리 — 문서 맨 위 RAIL 좌표로 전체 단계와 현재 위치를 먼저 보이고, 세션 종료/중단 전에 다음 한 걸음을 단단히 조인다. RAIL/NOW/RECENT/LEDGER 또는 메타리포 대시보드 구조, stem/detour 복귀선, 완료 항목 제거, stale blocker 정정, 검증 기준/읽을 곳/금지사항 압축, 브랜치별 NEXT--<branch>.md 선택. tag-release와 분리: NEXT 습관용이며 CHANGELOG/tag는 명시 요청 때만 tag-release 스킬로 넘긴다. Use when: 'NEXT 조여줘', 'handoff', '세션 마무리', '다음 세션', '책갈피', 'NEXT.md 정리', 'detour', 'branch NEXT'."
---

# next-handoff — keep NEXT.md as the next-session boot sector

## API

| Task | Do | Stop when |
|---|---|---|
| Close a session | read repo `NEXT.md`; put/update `# RAIL — 현재 좌표` before NOW; remove done/stale items; write the next concrete move + verification + blockers | the stage and current coordinate are visible in 10 seconds; top pointer is actionable in <3 minutes |
| Branch lane | use `NEXT--$(git branch --show-current | tr '/' '_').md` for non-main branch work | branch-only work is not leaked into main `NEXT.md` |
| Tighten a large NEXT | split current pointer from old ledger; move long rationale to linked docs/llmlog/botlog | NEXT is a signpost, not a wiki |
| Stem + detour | name the current stem, list only detours that block/serve it, and write a return condition | detours cannot silently become the stem |
| Tag handoff | if GLG explicitly asks for changelog/tag/release, read `tag-release` skill | before editing `CHANGELOG.md` or making a tag |

## Model

`NEXT.md` is a **boot sector / bookmark**, not a task database.
It answers two questions in this order:

1. **RAIL:** *전체 몇 단계 중 지금 어디인가?*
2. **NOW:** *다음 agent가 무엇을 먼저 하는가?*

`RAIL`은 투두 목록이 아니라 **현재 좌표를 한눈에 보여주는 고정 목차**다. 모든 NEXT 문서에서 `# NOW`보다 먼저 둔다.

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

## Standard RAIL — every NEXT, before NOW

모든 `NEXT.md`와 `NEXT--<branch>.md`는 제목/짧은 안내문 다음, `# NOW` 전에 아래 블록을 둔다. 헤딩 이름은 검색과 습관을 위해 **`# RAIL — 현재 좌표`로 고정**한다.

```markdown
# RAIL — 현재 좌표

- [x] **1. <닫힌 checkpoint>**
- [x] **2. <닫힌 checkpoint>**
- [ ] **3. <현재 checkpoint>** ← CURRENT: <다음 행동/승인 대기>
- [ ] **4. <뒤 checkpoint>** ← PAUSED: <막힌 이유>  # 막혔을 때만

현재 좌표: 2 완료 → 3 진행/승인 대기 → 4 보류
```

RAIL 계약:

- checkpoint는 보통 **2–5개**, 한 줄씩 쓴다. 5개를 넘으면 의미 단위로 묶고 상세 목록은 issue/docs로 보낸다.
- 번호는 현재 workstream의 안정된 순서다. 완료됐다고 지우지 않는다. rail 자체가 “어디까지 왔는가”를 보여줘야 한다.
- 정확히 한 항목만 `← CURRENT`로 표시한다. 아직 시작 승인을 기다리면 `CURRENT: 승인 대기`라고 쓴다.
- 보류 항목은 `← PAUSED: <정확한 이유>`로 표시한다. 보류와 현재를 섞지 않는다.
- `NOW`의 Next는 CURRENT 항목을 실행 가능한 한 걸음으로 풀어 쓴다. RAIL과 NOW가 다른 방향을 가리키면 둘 중 하나가 stale이다.
- detour는 stem 좌표를 바꾸는 경우에만 RAIL에 넣는다. 사소한 발견을 rail checkpoint로 늘리지 않는다.
- 완료 이력 전체를 쌓는 ledger가 아니다. **현재 workstream의 좌표계**만 남긴다.

### Single repo: RAIL / NOW / RECENT / LEDGER

Use when one repo has one main workstream.

```markdown
# RAIL — 현재 좌표
- [x] **1. <closed>**
- [ ] **2. <current>** ← CURRENT: <next move>
- [ ] **3. <later>**

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
# RAIL — 현재 좌표
- [x] **1. <stem checkpoint already closed>**
- [ ] **2. <current stem checkpoint>** ← CURRENT: <next move>
- [ ] **3. <later stem checkpoint>**

# NOW — <current stem>
- Stem: <delivery/release reason>
- Next: <one move>
- Detour: <none / active detour + stem impact>
- Return: <condition for returning to stem>
- Blocker: <none / permission / environment>
```

### Meta repo: RAIL / NOW / ACTIVE / DORMANT

Use when the repo coordinates many repos, domains, or humans.
Group by domain, not by every workspace folder.

```markdown
# RAIL — 현재 좌표
- [x] **1. <meta initiative checkpoint closed>**
- [ ] **2. <hot checkpoint>** ← CURRENT: <hot group + next move>
- [ ] **3. <later checkpoint>**

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
2. Put `# RAIL — 현재 좌표` before NOW; verify the whole stage and CURRENT coordinate are visible in 10 seconds.
3. Make RAIL and NOW point to the same next move; remove or rewrite stale “in progress” wording.
4. Remove done action items from NOW, unless needed as a short RECENT line. Keep only the few completed checkpoints needed to preserve the RAIL coordinate.
5. Keep only the next concrete move; move long “why” to docs/llmlog/botlog.
6. Add verification criteria before coding or before handing off.
7. Separate blockers by kind: permission / environment / none. Mark future rail checkpoints `PAUSED` when applicable.
8. Add `Do not touch` guardrails when a future agent could overreach.
9. Do not edit `CHANGELOG.md`, `ROADMAP.md`, or tag unless GLG explicitly asks.

## Promotion rules

Move content out of NEXT when:

- one item exceeds ~7 lines → docs/plan or llmlog/botlog
- action checklist exceeds ~5 boxes → issue/beads/checklist doc; RAIL itself also stays at 2–5 grouped checkpoints
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
