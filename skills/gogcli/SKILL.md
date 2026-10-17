---
name: gogcli
description: "Google Workspace + Search Console all-in-one CLI (gog). Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs, Search Console, YouTube, Photos, Meet, and more. Single binary. OAuth 재인증(reauth)·토큰 만료(invalid_grant)·오라클 토큰 복사 절차는 AUTH.md. Source: openclaw/gogcli (upstream)."
---

# gogcli (gog)

Binary `~/.local/bin/gog` comes from nixos-config (`scripts/external-packages.sh install gog`,
official static tarball) — never bundle a copy here. Upstream `openclaw/gogcli` (ex-`steipete`),
checked at **v0.45.0** (2026-10-17). Upstream also ships full agent skills (`.agents/skills/gog`,
`gog-*`); this page keeps only what is specific to this house. Trust the binary for exact flags:
`gog schema <cmd> --json`, `gog <cmd> --help`.

**Auth** — reauth, `invalid_grant` / exit 4, Oracle token copy: **[AUTH.md](AUTH.md)**.
Health check: `gog auth list --check --json --no-input`.

## Accounts

| Account | `-a` | Client | Use |
|---------|------|--------|-----|
| Personal | `junghanacs@gmail.com` | `personal` | Search Console, Blogger, YouTube reads, personal calendar |
| Work | the `work` row of `gog auth list` (Workspace) | `work` | Chat (Workspace only), work calendar/drive/gmail |

`GOG_ACCOUNT=<email>` sets the default. The calendarId is usually the account email.

## Commands

| Service | Command | ⚠️ |
|---------|---------|----|
| Calendar | `gog calendar list --today` · `--week` · `--days 3` · `--from T --to T --all` | |
| | `gog calendar create <calendarId> --summary S --from T --to T` | calendarId positional; `--from/--to`, not `--start/--end`; `--all-day`, `--with-meet` |
| | `gog calendar update <calendarId> <eventId> --summary S` | recurring: `--scope single/future/all`; `future` only ended the series in v0.45.0 |
| Tasks | `gog tasks lists` · `gog tasks list <listId>` · `gog tasks add <listId> --title T --due D` | `done` / `undo` / `delete <listId> <taskId>` |
| Gmail | `gog gmail search "newer_than:7d" --max 10` · `gog gmail get <msgId>` · `gog gmail thread get <threadId>` | Gmail query syntax |
| | `gog gmail send --to A --subject S --body-file F` | `--attach F`, `--cc`; prefer `gmail reply <msgId>` for replies |
| | `gog gmail labels modify <threadId> --add STARRED --remove INBOX` | |
| Drive | `gog drive ls --parent <folderId>` · `gog drive search Q` · `gog drive download <fileId> --out /tmp/` | `--parent`, not `--folder` |
| | `gog drive upload <path> --parent <folderId>` · `gog drive move <fileId> --parent <folderId>` | |
| | `gog drive share <fileId> --to anyone --role reader` | `--to anyone/user/domain` |
| Contacts | `gog contacts search Q` · `gog contacts create --given G --family F --email E` | `--given`, not `--given-name` |
| Sheets | `gog sheets get <id> "Sheet1!A1:D10"` · `gog sheets update <id> "Sheet1!A1" '[["a"]]' --input USER_ENTERED` | `append`, `clear`, `metadata` |
| Docs | `gog docs cat <docId>` · `gog docs export <docId> --format pdf --out F` | `write` overwrites, `insert` appends |
| Chat | `gog chat spaces list` · `gog chat messages list <spaceId>` · `gog chat messages send <spaceId> --text T` | Workspace only → work account |
| Search Console | `gog gsc sites` · `gog gsc query <siteUrl> --from D --to D --dimensions QUERY,PAGE --max 50` | siteUrl positional, exactly as registered incl. trailing `/` |
| | `gog gsc query <siteUrl> --filter page:contains:bib --filter country:equals:kor` | `dimension:operator:expr`; ops `contains equals notContains notEquals includingRegex excludingRegex`; no `--order-by` — sort `--json` with jq |
| | `gog gsc inspect <siteUrl> <url>` · `gog gsc sitemaps <siteUrl>` · `gog gsc sitemaps submit <siteUrl> <feedUrl>` | inspect = URL Inspection (v0.41+) |
| YouTube | `gog yt subscriptions list --max 20` · `gog yt channels list --mine` · `gog yt search list "q" --max 5` | personal `-a`; query positional; grant is `youtube.readonly` — never reauth to add YouTube (AUTH.md) |
| Maps | `gog maps geocode "강남역"` · `gog maps places search "q"` · `gog maps directions --origin A --destination B --mode transit` | API key (`gog config set places_api_key`), not OAuth; flags, not positionals; a vague name geocodes to an area centroid → `ZERO_RESULTS` for driving |
| Blogger | `gog api call blogger v3 posts.list --params '{"blogId":"5636690999249333744"}'` | personal `-a`; no `gog blogger`; `--params` is JSON; `gog api describe blogger v3` |

Shortcuts: `gog send` · `gog ls` · `gog search` · `gog download` · `gog upload` · `gog whoami`.
Blog: `힣(GLG) Digital Garden Core` — `https://junghanacs.blogspot.com/`. Site: `https://notes.junghanacs.com/`.

## Flags

| Output | Safety |
|--------|--------|
| `--json` · `--results-only` · `--select id,summary` · `--plain` (TSV) | `--readonly` · `--gmail-no-send` · `--dry-run` · `--no-input` · `--enable-commands a.b` · `--wrap-untrusted` |

Exit codes: 0 ok, 2 usage, 3 empty, **4 auth → AUTH.md**, 5 not found, 6 denied, 7 rate limited.

## Notes

- Confirm with the person before sending mail or creating/updating/deleting events; `--force` skips gog's own confirmation, not that.
- Other services (`photos`, `meet`, `analytics`, `forms`, `slides`, `keep`, `sites`, `backup`, …): `gog <service> --help`. `gog mcp` serves an allowlisted stdio MCP server.
