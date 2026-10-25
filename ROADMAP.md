# ROADMAP — agent-config

> Forward-looking work. Unlike `CHANGELOG.md`, this is not closed history.
> Unlike `NEXT.md`, this is not the volatile next-step scratchpad.

## [2026-10-25] 기억축 — 생성·활용·평가와 가벼운 검색 데이터의 역할 분리

GLG의 직접 방향이다. 고정된 서버 용량과 계속 축적되는 기억을 고민하되, 출발점을 당장 삭제할 용량이나 특정 기술의 최적화로 좁히지 않는다.

| 맡은 자리 | 목적 | 미리 고정하지 않을 것 |
|---|---|---|
| **agent-config** | 전체 기억축을 생성하고, 에이전트가 잘 쓰게 돕고, 외부 기억 벤치마크를 가져와 평가한다 | 검색 엔진을 직접 중복 구현하거나 특정 제품의 점수를 전체 기억 품질로 삼지 않는다 |
| **Andenken** | GLG가 가진 기억자산을 **더 가볍고 검색 가능한 데이터로 변환**한다 | 임베딩이라는 기술을 목적이나 필수 전제로 두지 않는다 |

**목적은 검색 가능한 기억이고, 임베딩은 수단 후보 중 하나다.** 임베딩을 계속 쓰기로 고정하지도, 지금 버리기로 결정하지도 않았다. 어떤 표현·색인·처리가 맞는지는 목적과 실제 제약에 비추어 논의한다. 이 방향을 현행 운영 코드가 이미 바뀌었다는 사실로 쓰지 않는다.

이 집의 평가 역할은 [LETTA.md](LETTA.md)에 등록한 FrontierMemory뿐 아니라 기존 기억 평가를 함께 읽는 데서 이어진다. 원문 회수, 정정·갱신·보류, 기억의 실제 사용과 후속 행동, 같은 존재의 계보는 서로 다른 질문이다. 벤치마크를 가져온다는 말은 그 질문과 조건을 검토한다는 뜻이며, 곧바로 유료 실행·개인 기억 반출·새 평가 프레임워크 구현을 승인하는 말이 아니다.

Andenken #18은 이 논의를 시작하게 한 자원 제약의 알림이다. 인프라 담당은 서버 공간 확보를 보고, 기억 표현과 활용의 장기 선택은 Andenken과 이 집이 GLG와 함께 다룬다. 삭제량·보존정책·알고리즘·새 저장소는 아직 선택하지 않았다. 현행 수집/발행 절차도 별도 변경 결정 전에는 그대로 두며, 이 문단만으로 정리·재처리·설치·복제 변경을 실행하지 않는다.

### 같은 날 GLG가 더 조인 관심 — 판단의 궤적과 공진화

단순 사실 조회나 하루 재구성이 핵심 목적은 아니다. 가든·저널·생체 정보·시간축 등 기록의 바닥 위에서, **지금의 고민에 앞선 흔적을 찾고 원문 앞뒤로 돌아가, 어떤 조건과 고민 속에서 어떤 선택을 했는지 이어 읽는 기억**을 본다. 여기서 과정은 기록에 남긴 대화·근거·선택의 궤적이다.

“힣이라면 어떻게 판단할까”는 과거 성향을 그대로 모사하라는 말이 아니다. 더 좋은 답은 과거의 방식과 다를 수 있다. 다만 GLG가 근거를 이해하고 검토해 우리의 것으로 수용할 수 있어야 한다. **인간도 성장하는 과정 자체가 기억**이며, 3개월 전 판단과 지금 판단의 차이를 단순한 정답 교체나 과거의 오류로 축소하지 않는다.

벤치마크도 이 관심을 붙들고 함께 검토한다. 기존 벤치의 범위와 비교 가능성을 존중하면서, 필요하면 우리의 관심을 반영한 확장 과제·비교군을 논의할 수 있다. 원형 결과와 확장 결과는 구분해야 하며, 지금 수정·구축·실행을 승인한 것은 아니다. 단순 사실 회수는 비교의 바닥이 될 수 있지만 그것만 잘해 핵심 목적을 달성했다고 말하지 않는다. 현행 기억 처리에도 호출 비용이 있다는 점을 출발 조건으로 삼되, 새 유료 실행의 승인으로 확대하지 않는다.

다음은 **미결 연구 질문**이다. 판단 근거를 제대로 이어 읽었는지와 그럴듯한 사후 설명을 어떻게 구분할까? 과거를 존중하면서 현재와 달라질 수 있는 판단을 어떻게 평가할까? 새로운 제안을 사람이 이해·검토·수정·수용하는 과정을 무엇으로 관찰할까? 이를 과거 답 모방, 동의율, 모델 스스로의 수용 판정으로 대신하지 않는 평가를 탐색한다.

## [2026-06-30] purpose shift — skills home + 시험소 (incubator) for entwurf

Building on the 2026-06-06 boundary settlement, the division of labor sharpens
again. **entwurf is now the integrated place that configures every harness and
where agent integration is unified** — the strong, stable core (it ships v0.12+
as a garden-citizen dispatch substrate, not a pi adapter; `pi-shell-acp` is
retired). agent-config stops trying to be a co-equal half of a "pair" and settles
into two standing roles:

1. **Skills home.** `./skills/` is the SSOT for the capability surface. Managing,
   adding, and aligning skills across harnesses is agent-config's standing job.
2. **시험소 (proving ground / incubator).** Before any harness config, hook, or
   wiring is trusted by entwurf, it is hardened and soak-tested *here* first — on
   the operator's real day-to-day surface — and watched for at least a few weeks.
   Only config that stays clean over that window is handed to entwurf to absorb
   into the integrated core.

Why the soak gate matters: pushing unproven config straight into entwurf weakens
the very thing meant to be the stable core. agent-config absorbs the churn and the
risk so entwurf stays strong. Corollary: **agent-config quiet = pipeline healthy.**
A busy agent-config means something is still being proven, not that the repo is
growing — "거의 손댈 게 없어야 정상."

Forward implications:

- **agent-config should shrink, not grow.** The natural end state is a thin skills
  SSOT + a test bench. Resist re-accumulating harness-config ownership that belongs
  in entwurf once proven.
- **Promotion is explicit, not automatic.** Soak window → clean → hand to entwurf.
  Record what graduated and when, so the boundary stays legible.
- **Harness wiring still living here is incubator state, not the destination.** The
  pi / claude / codex / antigravity wiring tables in README/AGENTS describe what is
  currently being proven on the operator's surface; expect them to thin as entwurf
  absorbs the stable parts.

## [2026-06-06] boundary settlement — ownership ceded, essence kept (`v2026.6.6`)

The line between agent-config and entwurf got drawn clean. What used to be a
quietly-contested whole-file (`~/.claude/settings.json` symlinked into this repo) is
now **co-owned by disjoint keysets**: agent-config injects only its keyset
(`claude/settings.fragment.json` — hooks / language / 개인취향 / official-plugin flags)
via `merge_settings`, and entwurf owns the single-driver policy (permissions /
B-lite scalars / `statusLine` / meta wiring) and verifies it through its own
install/uninstall/doctor. Coexistence itself collapsed to one primitive — the
**garden id**, a single universal address above every backend (pi / ACP / Claude Code /
Codex / Gemini / Antigravity). No replyable/non-replyable distinction; no backend is
privileged.

Forward implications:

- **Never re-claim entwurf's keyset.** Before adding any `~/.claude/settings.json`
  key, check it against the SSOT (`~/.claude/entwurf.install-state.json`); the
  fragment must stay disjoint. agent-config touches Claude settings only for its own
  essence, not for driver policy.
- **New harnesses inherit coexistence for free.** Any future backend becomes a garden
  citizen through the meta-bridge `SessionStart` hook — addressable + wakeable by garden
  id with no per-backend reply wiring to add here.
- **Lean on entwurf's defense once it stabilizes.** When its doctor gains
  keyset-survival + overlap checks, agent-config can stop guarding the boundary by hand.
- The repo now concentrates on what it is: **skills, identity, alignment** spread across
  every harness. Important machinery went to entwurf on purpose, so the essence has
  room.

## [2026-05-29] multi-harness command surface

- Keep `commands/` as SSOT and use thin wrapper skills only where the host lacks a native command surface.
- Validate real usage/discoverability of:
  - `skills/command-recall/SKILL.md`
  - `skills/command-glgimage/SKILL.md`
- If the wrapper pattern feels right, extend selectively to commands such as `/boom` and `/pandoc-html`.
- Decide later whether command → wrapper generation should be automated or remain manual.

## [2026-05-29] entwurf-peek

- If the sync-spawn blind spot recurs, decide whether to expose a pre-`tool:done` signal (`tool:start` + fresh child-file correlation).
- Keep watching provider-specific JSONL shapes in 1–2 more live runs before hardening the heuristic.
- Revisit caller-misattribution scoring only after more real traces exist.

## [2026-05-29] pi-chat + resident 담당자 pattern (Track B)

- Goal: establish the resident-agent pattern through `pi-chat` before carrying it into `incidentcli v0.3`.
- Current blocker lives in `NEXT.md`: Telegram `Add group` setup TUI dies after account registration.
- After that blocker is cleared:
  1. Register a real channel and verify 3–5 message round-trips.
  2. Inspect `~/.pi/agent/chat/.../channel.jsonl` for inbound/outbound/job_completed flow and boundary feel (`/workspace`, `/shared`).
  3. Record operating failures in llmlog before tightening policy.
  4. Draft `skills/pi-chat/SKILL.md` only after one real 운영 cycle feels stable.
- Then reflect the validated resident pattern back into `incidentcli` as a concrete v0.3 entry condition.
