# NEXT — agent-config

> Volatile next-step anchor. Closures belong in commit history,
> persistent facts in `AGENTS.md` / `docs/`. This file lists only
> what is left to do. Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

## jiracli — Confluence ingestion follow-ups (2026-05-11)

First cut shipped: `scripts/confluence_ingest.py` + SKILL.md
`## Confluence URL → Markdown` section. Smoke against an internal
`<wiki-tinyURL>` passes (heading outline, idempotent overwrite, KST
frontmatter). Deferred:

- **Images / attachments** — pandoc emits placeholders pointing at
  auth-gated Confluence URLs. Decide: download / inline base64 / leave
  link with warning.
- **Macro residue** — `cleanup_storage()` strips four attribute classes;
  info/warning/status macros still appear as bare wrapper tags. Map to
  GFM admonitions or document the residue.
- **Multi-page** — accept parent pageId for descendants or `--label`
  query for tagged pages.
- **Regression harness** — promote the manual SKILL.md smoke into a
  runner under `skills/jiracli/scripts/`. Record heading outline +
  frontmatter shape only (no body — sensitive).

## pi-shell-acp v0.4.14 README review (sent 2026-05-11)

Three findings sent to pi-shell-acp 담당자 via `entwurf_send` — GLG
decides if/when to fold into upstream README:

- **P1** — `wants_reply` rename (was `reply_requested`) not mentioned in README.
- **P2** — Settings example (lines 118–138) shorter than canonical
  `pi/settings.reference.json` (missing `disallowedTools` /
  `codexDisabledFeatures`); note "minimal" or expand.
- **P3** — Line 327–328 compaction-guard bullet list missing Gemini
  "n/a" entry (the table at line 346 has it; bullet list is asymmetric).
