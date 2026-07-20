---
name: gogcli
description: "Google Workspace + Search Console all-in-one CLI (gog). Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs, Search Console, YouTube, Photos, Meet, and more. Single binary. Source: steipete/gogcli (upstream)."
---

# gogcli (gog)

All-in-one Google CLI. Single binary covering Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs, Search Console, YouTube, Photos, Meet, Maps, Analytics, and more.

Binary is a **global install on PATH** — `~/.local/bin/gog`, managed by
nixos-config (`scripts/external-packages.sh install gog`, upstream `go install`).
Invoke as `gog`. Do **not** bundle a copy in this skill directory (the SSOT is
nixos-config; a stale bundle was already arch-broken and is retired).

Tracks **upstream `steipete/gogcli`** — the `junghan0611` fork is retired (its
custom work is either merged upstream or superseded). Use the official release.

## Accounts

- **Personal**: `--account junghanacs@gmail.com` (client: personal, services: all)
- **Work**: `--account jhkim2@goqual.com` (client: work, services: calendar,gmail,drive,tasks,chat)

Tip: `GOG_ACCOUNT=junghanacs@gmail.com` env var sets the default account.

## Search Console

Command: `gog searchconsole`. Aliases: `gsc`, `search-console`, `webmasters`.
(Note: the old fork alias `sc` no longer exists — use `gsc`.)

OAuth scope: `webmasters` (read+write) or `webmasters.readonly`.

**Key difference from the old fork:** `siteUrl` is now a **positional argument**
(not `--site`), the query subcommand uses `--from/--to` (not `--days`), and there
is **no `inspect` (URL Inspection) subcommand** upstream.

### Sites

```bash
# List accessible properties (default subcommand)
gog gsc sites

# Get one property
gog gsc sites get https://notes.junghanacs.com/
```

### Search Analytics (query)

Query search traffic: clicks, impressions, CTR, position. `siteUrl` is positional.
Both `gog gsc query <siteUrl>` and `gog gsc searchanalytics query <siteUrl>` work.

```bash
# Top search queries (dimensions default to QUERY)
gog gsc query https://notes.junghanacs.com/ --from 2026-06-01 --to 2026-06-28 --max 30

# Top pages
gog gsc query https://notes.junghanacs.com/ --dimensions PAGE --from 2026-06-01 --to 2026-06-28

# Query-page matching
gog gsc query https://notes.junghanacs.com/ --dimensions QUERY,PAGE --from 2026-06-22 --to 2026-06-28

# Date breakdown
gog gsc query https://notes.junghanacs.com/ --dimensions DATE --from 2026-06-01 --to 2026-06-28

# Filter: dimension:operator:expression (colon-separated, repeatable)
gog gsc query https://notes.junghanacs.com/ --dimensions QUERY,PAGE --filter query:contains:emacs
gog gsc query https://notes.junghanacs.com/ --filter page:contains:bib --filter country:equals:kor

# JSON output for scripting
gog gsc query https://notes.junghanacs.com/ --dimensions QUERY --max 50 --json
```

**Flags:**

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `<siteUrl>` | — | (required, positional) | Site URL or `sc-domain:example.com` |
| `--from` | `--start` | — | Start date `YYYY-MM-DD` |
| `--to` | `--end` | — | End date `YYYY-MM-DD` |
| `--dimensions` | — | `QUERY` | Comma-separated: `DATE,QUERY,PAGE,COUNTRY,DEVICE,SEARCH_APPEARANCE,HOUR` |
| `--type` | — | `WEB` | `WEB,IMAGE,VIDEO,NEWS,DISCOVER,GOOGLE_NEWS` |
| `--aggregation` | — | — | `AUTO,BY_PROPERTY,BY_PAGE,BY_NEWS_SHOWCASE_PANEL` |
| `--data-state` | — | — | `FINAL,ALL,HOURLY_ALL` |
| `--max` | `--limit` | `1000` | Max rows (1–25,000) |
| `--offset` | `--start-row` | `0` | Row offset for pagination |
| `--filter` | — | — | `dimension:operator:expression`, repeatable |
| `--request` | — | — | Raw `SearchAnalyticsQueryRequest` JSON (`@file`, path, `-`, or inline) |
| `--fail-empty` | — | — | Exit code 3 if no rows |

**Filter operators** (in `dimension:operator:expression`): `contains`, `equals`,
`notContains`, `notEquals`, `includingRegex`, `excludingRegex`.

Note: there is no `--order-by`; rows come back in API order. Sort client-side
(e.g. pipe `--json` to `jq`) if you need a specific ordering.

### Sitemaps

`siteUrl` and `feedpath` are positional args.

```bash
# List submitted sitemaps
gog gsc sitemaps https://notes.junghanacs.com/

# Get one sitemap's status
gog gsc sitemaps get https://notes.junghanacs.com/ https://notes.junghanacs.com/sitemap.xml

# Submit a sitemap
gog gsc sitemaps submit https://notes.junghanacs.com/ https://notes.junghanacs.com/sitemap.xml

# Delete a sitemap (destructive — confirmation required)
gog gsc sitemaps delete https://notes.junghanacs.com/ https://notes.junghanacs.com/sitemap.xml
```

⚠️ `siteUrl` must match the property string exactly as registered in Search
Console, including trailing slash (e.g. `https://notes.junghanacs.com/`).

### Quotas

| API | Daily limit | Per-minute limit |
|-----|-------------|------------------|
| searchanalytics.query | 25,000 | 1,200 |
| Sitemaps | generous | — |

(URL Inspection is not exposed by the upstream CLI.)

## Calendar

**Note**: `create`, `get`, `update`, `delete` require `<calendarId>` positional arg.
In most cases, the account email is the calendarId (e.g. `jhkim2@goqual.com`).

```bash
# List events
gog calendar list --max 10
gog calendar list --from 2026-02-22T00:00:00+09:00 --to 2026-02-28T23:59:59+09:00
gog calendar list --today
gog calendar list --week
gog calendar list --days 3
gog calendar list --all                          # from all calendars

# Event detail
gog calendar get <calendarId> <eventId>

# Create event — calendarId required, use --from/--to (NOT --start/--end)
gog calendar create <calendarId> --summary "Meeting" --from 2026-03-01T10:00:00+09:00 --to 2026-03-01T11:00:00+09:00
gog calendar create <calendarId> --summary "All day" --from 2026-03-01 --to 2026-03-02 --all-day
gog calendar create <calendarId> --summary "Meeting" --from ... --to ... --description "Details" --location "Room A"
gog calendar create <calendarId> --summary "Meeting" --from ... --to ... --with-meet

# Update event — calendarId + eventId required
gog calendar update <calendarId> <eventId> --summary "New title"
gog calendar update <calendarId> <eventId> --from 2026-03-01T11:00:00+09:00 --to 2026-03-01T12:00:00+09:00

# Delete event — calendarId + eventId required
gog calendar delete <calendarId> <eventId>

# List calendars
gog calendar calendars
```

## Tasks

```bash
# Task lists
gog tasks lists

# List tasks in a task list
gog tasks list <tasklistId>
gog tasks list <tasklistId> --all

# Add task — --title required
gog tasks add <tasklistId> --title "Title"
gog tasks add <tasklistId> --title "Title" --notes "Description" --due 2026-03-01
gog tasks add <tasklistId> --title "Recurring" --due 2026-03-01 --repeat weekly --repeat-count 4

# Complete / uncomplete
gog tasks done <tasklistId> <taskId>
gog tasks undo <tasklistId> <taskId>

# Delete
gog tasks delete <tasklistId> <taskId>
gog tasks clear <tasklistId>                     # delete completed only
```

## Gmail

```bash
# Search — uses Gmail query syntax
gog gmail search "newer_than:7d" --max 10
gog gmail search "from:someone@example.com subject:report"
gog gmail search "is:unread" --all

# Get message
gog gmail get <messageId>

# Thread
gog gmail thread get <threadId>
gog gmail thread attachments <threadId>

# Send — --to, --subject, --body required
gog gmail send --to "a@b.com" --subject "Subject" --body "Body"
gog gmail send --to "a@b.com" --subject "With attachment" --body "Body" --attach /path/to/file
gog gmail send --to "a@b.com" --cc "cc@b.com" --subject "Subject" --body "Body"
gog gmail send --body-file /tmp/content.txt --to "a@b.com" --subject "Subject"

# Labels
gog gmail labels list
gog gmail labels get <labelIdOrName>
gog gmail labels modify <threadId> --add STARRED
gog gmail labels modify <threadId> --remove INBOX
```

## Drive

```bash
gog drive ls [--folder <folderId>] [--max 20]
gog drive search "query" --max 10
gog drive get <fileId>
gog drive download <fileId> --out /tmp/
gog drive upload /path/to/file [--folder <folderId>]
gog drive mkdir "FolderName" [--parent <folderId>]
gog drive share <fileId> --anyone --role reader
gog drive permissions <fileId>
gog drive delete <fileId>
gog drive move <fileId> --to <folderId>
gog drive rename <fileId> "NewName"
gog drive url <fileId>
```

## Contacts

```bash
gog contacts list --max 20
gog contacts search "name"
gog contacts get <resourceName>
# create — use --given (NOT --given-name)
gog contacts create --given "FirstName" --family "LastName" --email "a@b.com" --phone "010-1234-5678"
gog contacts update <resourceName> --given "NewName"
gog contacts delete <resourceName>
```

## Sheets

```bash
gog sheets get <spreadsheetId> "Sheet1!A1:D10" --json
gog sheets update <spreadsheetId> "Sheet1!A1:B2" '[["A","B"],["1","2"]]' --input USER_ENTERED
gog sheets append <spreadsheetId> "Sheet1!A:C" '[["x","y","z"]]'
gog sheets clear <spreadsheetId> "Sheet1!A2:Z"
gog sheets metadata <spreadsheetId>
gog sheets create "New Spreadsheet"
```

## Docs

```bash
gog docs cat <docId>                              # read text
gog docs info <docId>                             # document info
gog docs export <docId> --format txt --out /tmp/doc.txt
gog docs export <docId> --format pdf --out /tmp/doc.pdf
gog docs create "New Document"
gog docs write <docId> "content"                  # overwrite
gog docs insert <docId> "append content"          # append at end
gog docs find-replace <docId> "find" "replace"
```

## Chat (Google Workspace only)

**Note**: Google Chat API requires a Workspace account. Personal Gmail not supported.
Use `--account jhkim2@goqual.com` (or other Workspace account).

```bash
# List spaces/DMs
gog chat spaces list

# Read messages
gog chat messages list <spaceId> --max 20

# Send message
gog chat messages send <spaceId> --text "message"

# Send DM
gog chat dm send <userId> --text "DM message"
```

## Maps

**Auth model differs from the rest of gog**: Maps uses a **Google Maps Platform
API key**, NOT user OAuth. Set it once — no `--account` needed:

```bash
gog config set places_api_key <KEY>     # stored in ~/.config/gogcli/config.json
```

The key's Cloud project must have the relevant APIs enabled (Geocoding, Places,
Directions, Distance Matrix). `gog config keys` also lists `youtube_api_key` for
the YouTube Data API (same key-based model).

**Syntax gotcha**: `places` takes a **subcommand** (`search`); the others take
**flags**, not positional args (calling them positionally → `unexpected argument`).

```bash
# Geocode / reverse-geocode
gog maps geocode "강남역"
gog maps reverse-geocode --lat 37.497952 --lng 127.027619

# Places — subcommand form
gog maps places search "스타벅스 강남"

# Directions — --origin / --destination (mode: driving|walking|bicycling|transit)
gog maps directions --origin "강남역" --destination "서울역" --mode transit

# Distance matrix — --origins / --destinations (comma-separated)
gog maps distance --origins "강남역" --destinations "서울역" --mode transit
```

⚠️ A vague query like `"강남역"` geocodes to the **"강남" area centroid**
(`GEOMETRIC_CENTER`), which can return `ZERO_RESULTS` for `--mode driving`. Use a
precise address or a `place_id` for driving routes; `transit` is more forgiving.

## YouTube

Uses the **`youtube` OAuth scope** (add via `gog login <email> --services …,youtube`).
User-context reads work on the OAuth token alone — no `youtube_api_key` needed for
the calls below (that config key is only for API-key-only / higher-quota paths).

Every service is a **command group → leaf subcommand** (alias `yt`). Groups:
`activities`, `videos`, `playlists`, `comments`, `channels`, `search`,
`subscriptions`.

```bash
# My subscriptions / my channel (--mine requires -a <account>)
gog youtube subscriptions list -a junghanacs@gmail.com --max 20
gog youtube channels list --mine -a junghanacs@gmail.com
gog youtube channels list --id UCpXfS8bu7ILGCuOtsnJMtxQ   # by channel id

# Search — query is POSITIONAL (not --query)
gog youtube search list "lofi hip hop" --max 5

# Videos / playlists / comments (same group→subcommand shape)
gog youtube videos list --id <videoId>
gog youtube playlists list --mine -a junghanacs@gmail.com
```

## Shortcuts

```bash
gog send          # gmail send
gog ls            # drive ls
gog search        # drive search
gog download      # drive download
gog upload        # drive upload
gog whoami        # people me
```

## Output Formats

```bash
gog --json <command>                              # JSON output
gog --plain <command>                             # TSV output (scripting)
gog <command> --json --results-only               # strip envelope
gog <command> --json --select "id,summary,start"  # field selection
```

## Auth Management

```bash
gog auth status
gog auth list
gog auth credentials set <json> --client <name>
gog auth add <email> --client <name> --services <list> --manual
gog auth alias set <alias> <email>

# Re-login to add new scopes (e.g. after adding searchconsole)
gog login <email> --client <name>
# --services default is "user" (all user services including searchconsole)
```

## Blogger (no native subcommand — use `gog api`)

⚠️ **There is no `gog blogger` command.** `gog blogger …` fails with
`unexpected argument blogger`. Blogger is reachable only through the generic
Discovery caller, `gog api call`.

OAuth scope: `https://www.googleapis.com/auth/blogger` — not a named gog
service, so it must be requested via `--extra-scopes` (see ENV-SETUP.md).

```bash
# My blogs
gog api call blogger v3 blogs.listByUser --params '{"userId":"self"}' -a junghanacs@gmail.com

# Blog by URL
gog api call blogger v3 blogs.getByUrl --params '{"url":"https://junghanacs.blogspot.com/"}' -a junghanacs@gmail.com

# Posts
gog api call blogger v3 posts.list --params '{"blogId":"5636690999249333744"}' -a junghanacs@gmail.com

# Discover available methods
gog api describe blogger v3
```

**`--params` takes a JSON object**, not `key=value`. `--params userId=self`
fails with `invalid --params JSON: invalid character 'u'`.

Method names work with or without the API prefix — `blogs.getByUrl` and
`blogger.blogs.getByUrl` both resolve.

Known blog: `힣(GLG) Digital Garden Core` — `https://junghanacs.blogspot.com/`,
blogId `5636690999249333744`.

## Common Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--account <email>` | `-a` | Account selection (email, alias, or `auto`) |
| `--json` | `-j` | JSON output |
| `--plain` | `-p` | TSV output |
| `--dry-run` | `-n` | Preview without executing |
| `--force` | `-y` | Skip confirmations |
| `--no-input` | — | Fail instead of prompting (CI) |
| `--verbose` | `-v` | Verbose logging |

### Agent-safety flags (upstream additions)

| Flag | Description |
|------|-------------|
| `--readonly` | Block all mutating API requests at runtime; `auth add` also requests read-only OAuth scopes |
| `--gmail-no-send` | Block Gmail send operations |
| `--disable-commands <list>` | Comma-separated commands to disable (dot paths allowed) |
| `--enable-commands <list>` | Restrict CLI to these command prefixes |
| `--wrap-untrusted` | In JSON/raw output, wrap fetched text in untrusted-content markers |
| `--home <dir>` | Override config/data/state/cache root (= `GOG_HOME`) |

## Notes

- **Confirmation required**: before sending email, creating/deleting events
- **calendarId**: required for calendar create/get/update/delete — usually the account email
- **--from/--to**: both calendar time flags AND searchconsole date range (upstream unified these)
- **--given/--family**: contacts name flags (NOT --given-name/--family-name)
- `gog schema` for machine-readable command schema
- `gog <command> --help` for latest flags
- Source repo: `steipete/gogcli` (upstream — the `junghan0611` fork is retired)

## Other services (upstream)

Beyond the sections above, upstream also ships: `youtube` (`yt`), `photos`,
`meet`, `analytics` (`ga`), `sites`, `zoom`, `keep`, `forms`, `slides`,
`classroom`, `groups`, `admin`, `backup` (encrypted account backups), and
`api` (generic Google Discovery method calls). Run `gog <service> --help`.

`gog mcp` runs a typed, allowlisted MCP server over stdio — useful for wiring
gog into an agent as an MCP tool instead of shelling out.
