---
name: gogcli
description: "Google Workspace + Search Console all-in-one CLI (gog). Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs, Search Console. Single binary. Source: junghan0611/gogcli (fork of steipete/gogcli)."
---

# gogcli (gog)

All-in-one Google CLI. Single binary covering Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs, Search Console, and more.

Binary is bundled in the skill directory. Invoke via `{baseDir}/gog`.

## Accounts

- **Personal**: `--account junghanacs@gmail.com` (client: personal, services: all)
- **Work**: `--account jhkim2@goqual.com` (client: work, services: calendar,gmail,drive,tasks,chat)

Tip: `GOG_ACCOUNT=junghanacs@gmail.com` env var sets the default account.

## Search Console

Aliases: `sc`, `search-console`.

Source: `junghan0611/gogcli` fork, branch `feat/searchconsole`.
OAuth scope: `webmasters` (read+write) or `webmasters.readonly`.

### Sites

```bash
# List verified properties
gog sc sites
```

### Analytics

Query search traffic data: clicks, impressions, CTR, position.

```bash
# Top search queries (last 28 days, default)
gog sc analytics --site https://notes.junghanacs.com --dim query --limit 30

# Top pages by impressions
gog sc analytics --site https://notes.junghanacs.com --dim page --order-by impressions

# Query-page matching (which query lands on which page)
gog sc analytics --site https://notes.junghanacs.com --dim query,page --days 7

# Date breakdown
gog sc analytics --site https://notes.junghanacs.com --dim date --days 14

# Specific date range
gog sc analytics --site https://notes.junghanacs.com --dim query --start 2026-04-01 --end 2026-04-13

# Filter: only queries containing a term
gog sc analytics --site https://notes.junghanacs.com --dim query,page --filter query=contains=emacs

# Filter: only a specific page path
gog sc analytics --site https://notes.junghanacs.com --dim query --filter page=contains=bib

# JSON output for scripting
gog sc analytics --site https://notes.junghanacs.com --dim query --limit 50 --json
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--site` | (required) | Site URL or `sc-domain:example.com` |
| `--dim` | `query` | Comma-separated: `query`, `page`, `date`, `country`, `device` |
| `--days` | `28` | Lookback days from today |
| `--start` | — | Start date `YYYY-MM-DD`, overrides `--days` |
| `--end` | — | End date `YYYY-MM-DD`, defaults to today |
| `--limit` | `25` | Max rows (API max: 25,000) |
| `--type` | `web` | Search type: `web`, `image`, `video`, `news`, `discover` |
| `--filter` | — | `dim=operator=value` (e.g. `query=contains=emacs`, `country=equals=KOR`) |
| `--order-by` | `clicks` | Sort: `clicks`, `impressions`, `ctr`, `position` |

**Filter operators:** `CONTAINS`, `EQUALS`, `NOT_CONTAINS`, `NOT_EQUALS`, `INCLUDING_REGEX`, `EXCLUDING_REGEX`.

### Inspect

Check a URL's index status, crawl info, mobile usability, canonical.

⚠️ Quota: 2,000/day, 600/min. Use for single-URL checks, not batch loops.
⚠️ `--site` must match the property string exactly as registered in Search Console, including trailing slash (e.g. `https://notes.junghanacs.com/` not `https://notes.junghanacs.com`).

```bash
gog sc inspect --site https://notes.junghanacs.com https://notes.junghanacs.com/notes/20231120t065213

# JSON output (full inspection result)
gog sc inspect --site https://notes.junghanacs.com https://notes.junghanacs.com/notes/20231120t065213 --json
```

Output fields: `coverage_state`, `indexing_state`, `last_crawl`, `crawled_as`, `robots_txt`, `page_fetch`, `google_canonical`, `user_canonical`, `mobile_usability`.

### Sitemap

```bash
# List submitted sitemaps
gog sc sitemap --site https://notes.junghanacs.com

# Submit (ping) a sitemap
gog sc sitemap submit --site https://notes.junghanacs.com https://notes.junghanacs.com/sitemap.xml

# Delete a sitemap
gog sc sitemap delete --site https://notes.junghanacs.com https://notes.junghanacs.com/sitemap.xml
```

### Quotas

| API | Daily limit | Per-minute limit |
|-----|-------------|------------------|
| searchanalytics.query | 25,000 | 1,200 |
| URL Inspection | 2,000 | 600 |
| Sitemaps | generous | — |

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

## Common Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--account <email>` | `-a` | Account selection |
| `--json` | `-j` | JSON output |
| `--plain` | `-p` | TSV output |
| `--dry-run` | `-n` | Preview without executing |
| `--force` | `-y` | Skip confirmations |
| `--no-input` | — | Fail instead of prompting (CI) |
| `--verbose` | `-v` | Verbose logging |

## Notes

- **Confirmation required**: before sending email, creating/deleting events
- **calendarId**: required for calendar create/get/update/delete — usually the account email
- **--from/--to**: calendar time flags (NOT --start/--end)
- **--start/--end**: searchconsole date range flags
- **--given/--family**: contacts name flags (NOT --given-name/--family-name)
- `gog schema` for machine-readable command schema
- `gog <command> --help` for latest flags
- Source repo: `junghan0611/gogcli` (fork of `steipete/gogcli`, branch `feat/searchconsole`)
