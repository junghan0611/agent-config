# harness-dashboard — update procedure

Repo path: `~/repos/gh/agent-config/harness-dashboard/`. The uppercase `NAME.md` files stay the
long-form record; the dashboard is the condensed, dated, filterable view over the same inquiry.
Read `data/schema.json` before writing a row — it is the contract and `build.py` enforces it.

| Task | Do |
|---|---|
| Add an observation | append one row to `data/observations.json`: one sentence, `houses[]`, `axis`, `evidence`, `receipts[]` (never empty), `observed_at` = the day it was actually read |
| Re-read an old row | do not edit the old row's date. Add a new row with `supersedes: <old id>`; set the old row `status: superseded` + `retired_by` |
| Retract a claim | old row `status: retracted`; add `data/corrections.json` row (`claim`, `correction`, `retired_by` receipt). No person or model names |
| Absence ("found nothing") | `evidence: unobserved` + `scope` (what was searched). ⚠️ A scope-less "none" is rejected by intent — do not write it as `code` |
| Add a harness | `data/houses.json` row with `column`, `role: base`, `sources[]` (`kind: repo` needs a pinned `sha`; `docs` / `version` do not) |
| Add a plugin of a harness | same file, `role: addon`, `column` = the base harness's column. It renders as a separate band inside that column. One `base` per column |
| Add a number | `data/metrics.json`. Only a number with a receipt; reuse an existing `key` when the same thing is counted. No stars, scores or ranks |
| Add a message flow | `data/flows.json`: `lanes[]` (use `group` for machine/house boundaries), `steps[]` each with its own `evidence` + receipt; unread stretches go in `gaps[]` |
| Add an axis | `data/axes.json`. Only when rows exist that fit no axis; record what was left out rather than stretching an axis |
| Validate | `cd harness-dashboard && python3 build.py` — exit 1 names the row and the reason |
| Look locally | open `harness-dashboard/index.html` after a build (`file://`, no server) |
| Deploy | `harness-dashboard/deploy.sh` — ⚠️ outward-facing; run only when GLG asked for a deploy in this session |

## Evidence states

`code` pinned-SHA source read directly · `measured` executed and observed · `claim` the house's own
docs say so · `inherited` handed over, not yet checked (name the source) · `hypothesis` ·
`question` · `unobserved` searched and not seen (scope required).

Never upgrade a state while copying. A README sentence is `claim` even when the file was "read".
A statement mixing strengths carries the weakest one; per-receipt `evidence` holds the rest.

## Rules that keep it honest

- No good/bad, score, rank, recommendation or "X is better" sentence anywhere in the data.
- Colour already means evidence state. Anything else (add-on, staleness, cross-house) uses another
  channel: band, border, label.
- `observed_at` is the read date, not the edit date. Old dates are the point — the viewer marks
  them stale (30 / 90 day toggle) so the next research turn knows what to re-read.
- Pin every repo source to a SHA. A moving working copy is written `<sha>+dirty`.
- No real names, company terms, emails or calendar text. Garden ids, repo paths and already-public
  device names are fine. The global commit hook scans identity terms and secrets on every commit.
- Viewer changes: single `index.html`, no build step, no CDN, tabs, and no `try/catch` that hides a
  contract breach — let the page show the error.

## Hosting

- Worker `harness-exterior`, static assets only, custom domain `harness.junghanacs.com`.
  `workers_dev` and `preview_urls` stay `false` in `wrangler.jsonc`.
- The hostname sits behind the Cloudflare Access application `harness-exterior` (same IdP and
  allow-list shape as the other private hosts). The gate was created before the first deploy.
- Check after a deploy: `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://harness.junghanacs.com`
  → `302` to `*.cloudflareaccess.com` while gated.
- **Going public is GLG's decision** and is one step: delete that Access application (see the
  `cloudflare` skill; writes are dry-run → shown → approved). After that a `200` is healthy and a
  `302` to Access is the bug. The data is already in this public repo, so the gate protects the
  page, not the content — write every row as if it were public.
- Token and CLI usage follow the `cloudflare` skill; `deploy.sh` passes the token per command.
