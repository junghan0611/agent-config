# ROADMAP — agent-config

> Forward-looking work. Unlike `CHANGELOG.md`, this is not closed history.
> Unlike `NEXT.md`, this is not the volatile next-step scratchpad.

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
