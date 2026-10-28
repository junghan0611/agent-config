---
name: cloudflare
description: "GLG 개인 Cloudflare 계정(aionsclubs.org · junghanacs.com) 조작 — 설치된 공식 cf CLI(전체 API)와 wrangler(Workers 배포)를 개인 토큰으로 직접 쓴다. 토큰 권한 커버리지는 cf-doctor. Workers Builds 실패의 위치·서비스 영향·판독한계는 BUILDS.md. 오라클 터널 스택과 웹 퍼블리시(nixos-config#11)의 조작면. 'cloudflare', '클라우드플레어', 'cf', 'wrangler', 'workers', '정적 호스팅', '터널', 'tunnel', 'DNS', 'DNSSEC', 'redirect', '301', 'custom domain', 'aionsclubs', 'junghanacs', '도메인', '토큰 권한'."
user_invocable: true
---

# cloudflare — GLG personal account

Use the installed tools: **`cf`** (official CLI, full API) and **`wrangler`** (Workers) — pnpm
globals from nixos-config `scripts/external-packages.sh`. Pass the token per command; never export it.
A bare `cf` or `wrangler` (no token in env) runs as GLG's OAuth login (`cf auth login` / `wrangler login`) —
full user rights, not the scoped token. Keep the prefix; the cf login is for reading the token's own policy
(`cf-doctor` does that), and the wrangler login is not the deploy path. Refuse a missing/empty
scoped token; never fall back to OAuth for an account query. Use a private cwd and capture/redact
sensitive responses, even for reads. Check `cf --version` / `wrangler --version`; installed versions,
site build-command pins and dated verification versions are different. Recheck help/schema after upgrades.
Local check (2026-10-28): `cf 1.0.0-beta.24`, `wrangler 4.154.0`; inherited Builds live receipts
were beta.5. Only Builds/audit/telemetry help/schema were rechecked here, not live API or writes.

```bash
CLOUDFLARE_API_TOKEN=$(<~/.cf-token-glg) cf <cmd>
CLOUDFLARE_API_TOKEN=$(<~/.cf-token-glg) wrangler <cmd>
{baseDir}/bin/cf-doctor     # optional OAuth policy readback only; SKIP in scoped-token-only runs
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
| Build/deploy failure: where, serving state, impact? | [BUILDS.md](BUILDS.md): question → existing command → reading limit; scoped reads only, not retry/deploy approval |

`cf cli search` can rank a wrong answer first. Match the leaf help heading/options and schema endpoint,
not exit status alone: beta.24's old `observability telemetry` path returns root help with exit 0;
use `o11y telemetry`. Dated live receipts and new offline contract checks are distinct.

## Rules

1. **Writes: `--dry-run` → show GLG → explicit approval → run.** Preview is not auth/permission proof. Reads retain scope/privacy limits and grant no retry, config, billing or permission change. No automatic retry policy is established.
2. **Never `phases update` an existing entrypoint** — it replaces every rule. Append with `rules create`;
   `phases update` only when `phases get` returns 404. www→apex rule: `(http.host eq "www.<apex>")` →
   `concat("https://<apex>", http.request.uri.path)`, 301, `preserve_query_string`.
3. **Pass the zone ID for writes.** `--dry-run` prints the zone name unresolved in the URL.
4. **Keep `cf cli search` queries anonymous** — action + resource type; no names, domains, IDs, tokens.
5. **`cf` may write `.cloudflare/cache/` into the cwd** (account ID + name). Gitignore it in site repos;
   run ad-hoc commands outside git trees.
6. **Tunnels are locally-managed.** Ingress SSOT is `config.yml` in git; create with
   `cloudflared tunnel create` / `route dns`. `~/.cloudflared/cert.pem` stays on ThinkPad; oracle holds
   tunnel credentials JSON + the API token (#11 decision 4).
7. **No Access on public sites.** 200 is healthy; a 302 to `*.cloudflareaccess.com` is a bug. Access only
   on named hosts (claw).
8. **`10429` → stop.** Retrying extends the lockout.
9. Don't install Cloudflare's agent-setup (plugin, `npx skills add --global`, CLAUDE.md line). This skill is that surface.

## Token `glg-cloudflare` — dated policy, not a permission promise

Issued by nixos-config (#11 decision 6). No IP condition. No other Cloudflare account on ThinkPad/oracle (decision 4).
`cf-doctor` prints the live policy when a `cf auth login` exists; per-call requirements are the OpenAPI
`x-api-token-group` in `cloudflare/api-schemas`. The baseline below was read 2026-09-30;
Artifacts Read/Write was additionally reported by the 2026-10-28 owner's policy readback, not
independently re-read by this guide's editor. Audit v2 worked with the scoped token in that
investigation; its exact enabling permission group remains unestablished. `cf-doctor`'s existing-OAuth
exception is policy readback only, not fallback account access or a required step in scoped-only triage.

| Scope | Granted |
|---|---|
| Zone (all) | Write: DNS · Dynamic URL Redirects · Workers Routes · Email Routing Rules — Read: Analytics |
| Account | Write: Workers Scripts · Workers CI · Workers KV · Workers Observability · Pages · Cloudflare Tunnel · Access Apps and Policies · Access Orgs/IdPs/Groups · Email Routing Addresses — Read: Account Settings · Workers Tail |
| Account (2026-10-28 reported addition) | Read/Write: Artifacts |
| User | Read: User Details · Memberships |

Covers every #11 need: DNS + DNSSEC, www 301, Worker deploy / custom domain / routes / Builds / logs,
Access for approved private hosts, analytics. The older `9999` observation is not current Access
enablement evidence. Not granted in this dated snapshot: Cache Purge, API Tokens; do not request
new grants automatically after a read fails.

`10000` = permission missing. `9109` = "Unauthorized to access requested resource": IP filtering, or a
user-scope endpoint the token lacks (`/user/tokens/<id>` needs API Tokens Read).
Empty `/accounts` = no Account Settings:Read; cf and wrangler then cannot find the account.

## Notes

- Telemetry is off machine-wide via nixos-config `shell.nix` (`CF_SEND_TELEMETRY`, `WRANGLER_SEND_METRICS`);
  a shell started before that rebuild still sends — check `cf cli telemetry status`.
- Email Routing: use the dashboard ("Add missing records" locks MX/SPF/DKIM).
- [Zero Trust CLI precedent](https://github.com/junghan0611/cloudflare-agents/blob/bb65c3c03eeafcc27a1b2f9e6ed20b47cdcbbeef/examples/next/harnesses/pi-siwc/.claude/skills/pi-siwc-cloudflare/SKILL.md): project-scoped pi-siwc lab evidence, not approval to repeat setup or proof every command remains current. Keep its measured/unmeasured labels; recheck current help/schema.
- Design: denote `20260812T142016` (aionsclubs tunnel) · nixos-config#11 (web publish).
