# gog auth — keep the grant alive without touching its scope

Read this only when a token expires (`invalid_grant`, exit 4), on the work
reminder, or when Oracle needs the token. The goal is continuity, not scope
change. Measured 2026-10-17 on v0.45.0. Scripts: `scripts/` beside this file
(`~/repos/gh/agent-config/skills/gogcli/scripts/`).

## Procedure

| Step | Command | Notes |
|------|---------|-------|
| Health | `gog auth list --check --json --no-input` | `valid` per account = refresh-token exchange works |
| Diagnose | `gog auth doctor --check --json --no-input` | keyring, password, client creds, per-token refresh |
| 1. Consent URL | `scripts/reauth.sh <email> start` | Snapshots the grant; reads client + **recorded** services; prints URL with `login_hint` |
| 2. Browser | person opens the URL in the profile signed in as `<email>` | "Google hasn't verified this app" → the small **Continue** link, not "Back to safety". Ends on a failed `http://127.0.0.1:<port>/oauth2/callback?...` page — copy that whole URL |
| 3. Exchange | `! ~/repos/gh/agent-config/skills/gogcli/scripts/reauth.sh <email> finish '<full redirect URL>'` | The **person** runs it (`!` as the very first character in Claude Code; a leading space sends it as chat). Keep the URL whole: its `scope` param is the grant receipt |
| 4. Verify | `scripts/reauth.sh <email> verify` | `REAUTH OK` = valid, `created_at` moved, services kept, no granted scope lost |
| 5. Oracle | `scripts/push-token.sh <email> oracle` | Backs up the remote keyring, imports, checks host gog **and** `~/openclaw/bin/gog`; temp files deleted both sides |
| 6. Reminder | move the work reminder to renewal + 11 weeks | `gog calendar update <cal> <eventId> --scope all --from … --to …`. Not `--scope future`: in v0.45.0 it only ended the old series (exit 0, no new one) |

## Why each piece is there

- **Never let `--services` default.** Its default `user` is 22 services in v0.45.0; on the work account that adds 9 scopes (adwords, youtube, photos, meet…) and can make consent fail. `reauth.sh` passes the account's recorded list.
- **`--force-consent` is required** to renew a still-valid grant. Without `prompt=consent` Google may skip consent and return no refresh token (`no refresh token received`).
- **Two-step `--remote`**: step 1 saves PKCE state keyed on client + scopes + force-consent, so step 2 must repeat the same flags — the script does.
- **`include_granted_scopes=true`** is sent by default (full drive/gmail modes), so scopes granted earlier but not requested now survive. Google's redirect `scope` list shows the real grant; `gog auth list` shows only the **requested** set right after login and catches up after the next use.
- The agent does not type the authorization code; the person pastes it into `finish`.

## Accounts

**Work expires on a cycle**: observed 2026-02-25 → 2026-05-24 (88 days) `invalid_grant`. The next grant (reminder created 05-24) was replaced on 08-07 after 75 days — whether it had expired is not recorded. Renewed 2026-10-17 → 88 days is 2027-01-13; the reminder is set for 2027-01-02 (11-week cadence, email 7 days ahead).

**Personal cannot be reauthorized this way** (measured 2026-10-17): Google returns `400 invalid_request — scopes that cannot be requested together: [drive.file, youtube.readonly]`. Both were granted in separate past requests, and `include_granted_scopes` folds them into one request. Nothing changes locally on that error. While `valid` is true, leave personal alone — no expiry has been observed (granted 2026-07-20, still valid at 89 days). If it must be redone, choose an explicit scope set with GLG first (candidates: calendar, gmail, searchconsole + `--extra-scopes` blogger, youtube.readonly, analytics.readonly). That drops the unused chat/classroom/forms/script/drive scopes, and v0.45.0 has no direct switch for `include_granted_scopes` — `--drive-scope readonly` turns it off indirectly; `--dry-run` it before consenting.

**Oracle** shares one `~/.config/gogcli` between the host and the bot containers (rw mount, `nixos-config/ORACLE.md`), so one import serves both. Its keyring password is the host's own `GOG_KEYRING_PASSWORD` in `~/.env.local`; export/import re-encrypts, so the two hosts' passwords need not match. Oracle's personal token is a separate grant (2026-07-20, 4 services) — do not overwrite it from here.

## Other auth commands

```bash
gog auth status                          # config path, keyring backend, default account
gog auth services                        # services → scopes table of this binary
gog auth credentials list                # OAuth clients (personal, work)
gog auth tokens export <email> --out F   # secret file — prefer push-token.sh
```
