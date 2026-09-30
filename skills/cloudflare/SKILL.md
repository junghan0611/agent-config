---
name: cloudflare
description: "GLG 개인 Cloudflare 계정(aionsclubs.org · junghanacs.com) 조작 — 설치된 공식 cf CLI(전체 API)와 wrangler(Workers 배포)를 개인 토큰으로 직접 쓴다. 토큰 권한 커버리지는 cf-doctor. 오라클 터널 스택과 웹 퍼블리시(nixos-config#11)의 조작면. 'cloudflare', '클라우드플레어', 'cf', 'wrangler', 'workers', '정적 호스팅', '터널', 'tunnel', 'DNS', 'DNSSEC', 'redirect', '301', 'custom domain', 'aionsclubs', 'junghanacs', '도메인', '토큰 권한'."
user_invocable: true
---

# cloudflare — GLG personal account

Use the installed tools: **`cf`** (official CLI, full API) and **`wrangler`** (Workers) — pnpm
globals from nixos-config `scripts/external-packages.sh`. Pass the token per command; never export it.
On ThinkPad a bare `cf` (no token in env) runs as GLG's `cf auth login` — full user rights, not the scoped
token. Keep the prefix; the login is for reading the token's own policy (`cf-doctor` does that).

```bash
CLOUDFLARE_API_TOKEN=$(<~/.cf-token-glg) cf <cmd>
CLOUDFLARE_API_TOKEN=$(<~/.cf-token-glg) wrangler <cmd>
{baseDir}/bin/cf-doctor     # token coverage per account/zone — start here when blocked
CLOUDFLARE_API_TOKEN=$(<~/.cf-token-glg) cf zones list \
  | jq -r '.[] | "\(.name) \(.id) \(.permissions|join(" "))"'   # zone IDs + effective perms
```

| Task | Command |
|---|---|
| Find a command | `cf cli search "<task>"` → `<cmd> --help` → `cf schema <cmd>` |
| DNS | `cf dns records list -z <zone>` |
| Tunnels | `cf tunnels list` |
| Redirects | `cf rulesets account-rulesets phases get http_request_dynamic_redirect -z <zone>` |
| Add a redirect | `cf rulesets account-rulesets rules create <ruleset-id> -z <zone-id> --body '<rule>'` |
| Deploy | `wrangler deploy` inside a repo with `wrangler.jsonc` |
| Public check | `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://<host>` |

`cf cli search` can rank a wrong answer first (a redirect query returns `cf rules lists`); the table is measured.

## Rules

1. **Writes: `--dry-run` → show GLG → run.** Reads are free.
2. **Never `phases update` an existing entrypoint** — it replaces every rule. Append with `rules create`;
   `phases update` only when `phases get` returns 404. www→apex rule: `(http.host eq "www.<apex>")` →
   `concat("https://<apex>", http.request.uri.path)`, 301, `preserve_query_string`.
3. **Pass the zone ID for writes.** `--dry-run` prints the zone name unresolved in the URL.
4. **Keep `cf cli search` queries anonymous** — action + resource type; no names, domains, IDs, tokens.
5. **`cf` writes `.cloudflare/cache/` into the cwd** (account ID + name). Gitignore it in site repos;
   run ad-hoc commands outside git trees.
6. **Tunnels are locally-managed.** Ingress SSOT is `config.yml` in git; create with
   `cloudflared tunnel create` / `route dns`. `~/.cloudflared/cert.pem` stays on ThinkPad; oracle holds
   tunnel credentials JSON + the API token (#11 decision 4).
7. **No Access on public sites.** 200 is healthy; a 302 to `*.cloudflareaccess.com` is a bug. Access only
   on named hosts (claw).
8. **`10429` → stop.** Retrying extends the lockout.
9. Don't install Cloudflare's agent-setup (plugin, `npx skills add --global`, CLAUDE.md line). This skill is that surface.

## Token `glg-cloudflare` — policy (read 2026-09-30 via `cf user tokens get`)

Issued by nixos-config (#11 decision 6). No IP condition. No other Cloudflare account on ThinkPad/oracle (decision 4).
`cf-doctor` prints the live policy when a `cf auth login` exists; per-call requirements are the OpenAPI
`x-api-token-group` in `cloudflare/api-schemas`.

| Scope | Granted |
|---|---|
| Zone (all) | Write: DNS · Dynamic URL Redirects · Workers Routes · Email Routing Rules — Read: Analytics |
| Account | Write: Workers Scripts · Workers CI · Workers KV · Workers Observability · Pages · Cloudflare Tunnel · Access Apps and Policies · Access Orgs/IdPs/Groups · Email Routing Addresses — Read: Account Settings · Workers Tail |
| User | Read: User Details · Memberships |

Covers every #11 need: DNS + DNSSEC, www 301, Worker deploy / custom domain / routes / Builds / logs,
Access for claw (Access itself is not enabled yet — 9999), analytics. Not granted: Cache Purge, API Tokens.

`10000` = permission missing. `9109` = "Unauthorized to access requested resource": IP filtering, or a
user-scope endpoint the token lacks (`/user/tokens/<id>` needs API Tokens Read).
Empty `/accounts` = no Account Settings:Read; cf and wrangler then cannot find the account.

## Notes

- Telemetry is off machine-wide via nixos-config `shell.nix` (`CF_SEND_TELEMETRY`, `WRANGLER_SEND_METRICS`);
  a shell started before that rebuild still sends — check `cf cli telemetry status`.
- Email Routing: use the dashboard ("Add missing records" locks MX/SPF/DKIM).
- Design: denote `20260812T142016` (aionsclubs tunnel) · nixos-config#11 (web publish).
