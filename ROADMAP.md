# ROADMAP — agent-config

> Forward-looking work. Unlike `CHANGELOG.md`, this is not closed history.
> Unlike `NEXT.md`, this is not the volatile next-step scratchpad.

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
