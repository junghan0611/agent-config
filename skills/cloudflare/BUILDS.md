# Workers Builds — questions, existing tools, reading limits

Use this when a build/deployment failed and the question is **where, what is still serving, and what evidence can support a next decision**. This is not a retry, deployment or permission-expansion procedure. Commands below are templates; replace placeholders with operator-supplied values.

## Authentication and private workspace

Required inputs: an **operator-provided, approved account ID** and build UUID or Worker name; zone tag/host/time window are needed only for the optional HTTP query. This guide certifies no account-ID discovery route. If an input is missing, ask the operator; do not invent it or switch to OAuth.

Use Bash, a disposable directory and the existing scoped token. No missing/empty-token fallback to stored OAuth. The helper supplies authentication only: it does **not** enforce read-only behavior; use only the reviewed reads below.

```bash
umask 077
PRIVATE=$(mktemp -d)
cd "$PRIVATE"                         # isolate any CLI cache/output
export CF_SEND_TELEMETRY=false
export CLOUDFLARE_ACCOUNT_ID='<approved-account-id>'
cf_read() {
	local token
	token=$(<"$HOME/.cf-token-glg") || return
	if [[ -z "$token" ]]; then
		printf '%s\n' 'Missing scoped token; stop.' >&2
		return 2
	fi
	CLOUDFLARE_API_TOKEN="$token" cf "$@"
}
```

Capture raw responses in this owner-only workspace, e.g. `cf_read builds get '<build-uuid>' > "$PRIVATE/build.json"`. Logs can include account URLs; audit records include actors/IPs; some account/Access responses contain credentials. Share only necessary redacted excerpts. `jq` projection and `--quiet` are not secret scanners. Do not place raw responses in git, chat or a public report.

## Pick the question before the command

| Question | Existing command | Read / boundary |
|---|---|---|
| Which build and Worker? | `cf_read builds get <build-uuid>` | Record outcome, source revision, trigger and timestamps. `.trigger.external_script_id` is a **Worker tag**, not the Worker name. |
| Only a Worker name is known? | `cf_read workers scripts search --name <worker-name>` | Resolve its `.id` tag; do not substitute a name for a tag or confuse it with a version UUID. |
| What is the build lineage? | `cf_read builds list --external-script-id <worker-tag> --page <n> --per-page <n>` | Beta.24 returns a flat array. With explicit page size, a shorter page ends the observed sequence; if exactly full, read the next page, including an empty final page for exact multiples. Record UUIDs/capture time and duplicates; changing history is not a snapshot census. |
| Did compilation or publication fail? | `cf_read builds logs get <build-uuid>` | Read `.lines` timestamps/text and build terminal state. `truncated=false` marks the captured tail even when a cursor exists; advance `--cursor` only when truncation requires it. A follow-up returning zero lines and the same cursor is a stop, not a poll loop. Preserve version/stage/code/timing; build success is not deployment success. |
| Which configured inputs ran? | `cf_read builds triggers list --external-script-id <worker-tag>` | Read build/deploy commands, watch exclusions and cache settings. These are reads, **not** permission to edit a trigger or change a pin. |
| What is serving now? | `cf_read workers deployments list --worker <worker-name>` | The observed default returned the latest 10 deployments: not necessarily the incident window. Read version/traffic percentages. Help exposes `--since`/`--until` (both inclusive), `--page`/`--per-page`; their historical-window use was not live-tested here. Keep current serving state separate from incident-window coverage and content delay. |
| Which control-plane request failed? | `cf_read accounts logs audit list --since <utc-iso> --before <utc-iso> --limit 100` | Join time/method/path/status/Ray/client version with build logs. **Beta.24 live output was a flat array without `result_info` or cursor**, despite schema support: follow the narrow-window procedure below, not an invented cursor. `n==limit` means saturation/unknown coverage, not proved loss; `n<limit` does not certify completeness. The exact enabling scoped-token grant remains unestablished. |
| Was there a relevant public incident? | `curl -fsS https://www.cloudflarestatus.com/api/v2/incidents.json` | Match affected component and interval. No matching announcement does not prove platform health. Public SDK issues are corroboration, not diagnosis. |
| What limits apply? | `cf_read builds limits get` | `{}` does not prove Free, Paid, unlimited capacity or missing permission. Registrar/DNS, zone plan and Workers subscription are distinct. See official [Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) and [support](https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/contacting-cloudflare-support/); Workers Paid technical-support eligibility needs separate confirmation. |
| Was visitor HTTP traffic affected? | A reviewed, zone-bound, finite-window GraphQL read query; see below | Adaptive HTTP samples are approximate, not a census. No sampled 5xx does not prove no visitor impact, identify the serving generation or negate delayed content. Optional: the query shape below is inherited from one successful owner-run query, not a fresh live test here. |
| Are runtime logs available? | `cf_read o11y telemetry keys --help` / `values --help`, then reviewed read arguments including `--datasets` | Runtime observability is not Builds. `values` requires `datasets`; this guide certifies no dataset-discovery route. Without an operator-provided/independently established dataset, stop this optional branch and report live scope unverified; do not guess or enable logging. Enabling observability is a separate configuration write. |

## Audit coverage when the CLI strips pagination metadata

1. The operator approves the investigation's account/resources/time scope; the coordinator may select a smaller interval **within** that scope, not create new authority. Read the failed build's log first. Derive a small UTC window spanning the relevant request/start and error lines, accounting for their timestamp resolution; save those bounds. The peer review recovered one event in one 30-second window. That observation is not a universal window size or recovery guarantee.
2. Run the table's audit command in that narrow window. If output is a flat array with no cursor/envelope, do not fabricate `result_info`, increment an opaque cursor, or treat `--limit` as proof of complete history. A broad window can return only its newest records and miss the failure time.
3. Record requested bounds/limit, returned count and earliest/latest timestamps, event matches and coverage uncertainty. At `n==limit`, split the window if within the approved read scope/budget, or stop with coverage unresolved. Fewer than the limit, or zero, proves only what this call returned—not all events or no incident.
4. A matching request/Ray supports that event's location; it does not establish coverage of the remaining failures or the root cause. Keep unqueried windows explicit. New diagnostic windows are scoped reads, not authorization for operational retries or an unbounded watcher.

## Optional GraphQL: bounded query and stdin headers

Save this JSON as `$PRIVATE/query.json`, replacing placeholders with an approved zone tag, host and RFC3339 UTC interval. The owner investigation executed this query shape once with `errors: null`; this editor has not repeated that live query. `z` is `String!` (32-hex zone tag), `a`/`b` are `Time!` (inclusive/exclusive). Host is a literal inside the query: a host-variable variant was not tested.

```json
{
  "query": "query($z:String!,$a:Time!,$b:Time!){viewer{zones(filter:{zoneTag:$z}){httpRequestsAdaptiveGroups(limit:50,filter:{datetime_geq:$a,datetime_lt:$b,clientRequestHTTPHost:\"<HOST>\"},orderBy:[count_DESC]){count dimensions{edgeResponseStatus}}}}}",
  "variables": {"z":"<ZONE_TAG>","a":"<FROM_RFC3339_UTC>","b":"<TO_RFC3339_UTC>"}
}
```

Transport below keeps the token out of argv; it does not validate the query's approved scope. Other dimensions/filters, limits above 50, retention and maximum interval are untested. `limit:50` bounds returned groups, not traffic; a capped result is not complete coverage. Do not improvise a mutation or broaden permissions after an error. This optional surface is not a prerequisite for basic Builds triage.

```bash
(
	test -s "$HOME/.cf-token-glg" || exit 2
	printf 'Authorization: Bearer %s\nContent-Type: application/json\n' \
		"$(<"$HOME/.cf-token-glg")" \
		| curl --fail-with-body -sS -H @- --data-binary @"$PRIVATE/query.json" \
			https://api.cloudflare.com/client/v4/graphql > "$PRIVATE/http-graphql.json"
)
```

`exit 2` is confined to the subshell, not an explicit exit of the caller's interactive/source shell. Check its returned status; if the caller enables `errexit`, use an `if` context to handle failure. A surviving shell is not query success.

Inspect both HTTP outcome and GraphQL `errors`; HTTP 200 alone is not query success. Do not paste the raw response into a public handoff.

## What the evidence allows

- HTTP 500 locates a failed response, **not** its root cause or proof that input could not trigger it. A later success at the same revision does not establish identical generated assets/manifests or infrastructure conditions.
- Builds, audit, deployments and HTTP samples answer different questions. Join them by explicit UTC intervals and identifiers; keep observed availability, content freshness and unobserved impact separate.
- Search returning no command is not proof an API is absent. Check the exact leaf heading/options in `--help` and the endpoint in `cf schema <command>`: beta.24 returns exit 0 plus root help for the old `observability telemetry` path; the current path is `o11y telemetry`. Do not directly manipulate Wrangler-internal asset-upload endpoints just because an audit log exposes them.
- Stop on `10429`; do not turn an error into automatic retry. Read-only inspection grants neither operational retry/cancel/deploy, trigger/config changes, new permissions, billing/support entitlement nor periodic monitoring. No global retry policy is established here.
- A diagnostic handoff names observed stage, serving state, bounded impact, redacted evidence and unknowns. Operator review decides any next action. The existing write rule remains `--dry-run` preview → show → explicit approval → run; preview is not auth/permission proof.

## Version ownership and wider Worker work

- A global CLI update does not change an exact `npx wrangler@<version>` in a Workers Builds trigger. The trigger can live outside the repo; inspect its actual `deploy_command`, repo dependencies/wrapper and documentation separately. An unpinned `npx wrangler` follows upstream, whereas a manual bare `wrangler deploy` uses the installed global binary. None is an automatic upgrade policy for the others.
- Keep site deployment pins reproducible. A pin change is a separate approved operation with command/documentation updated together; neither retaining nor upgrading a pin establishes an incident's root cause or fix. Do not change a pin merely because the local CLI was updated.
- Builds triage is one common entry point, not the whole Cloudflare capability map. External stateful harnesses also have Durable Object, Access, credential-refresh ownership and compiled deployment gates. Those remain the [pi-siwc project's contracts](https://github.com/junghan0611/cloudflare-agents/blob/bb65c3c03eeafcc27a1b2f9e6ed20b47cdcbbeef/examples/next/harnesses/pi-siwc/AGENTS.md), not permissions granted by this guide. A Workers subscription does not by itself establish billing/support entitlement, model-hosting eligibility or approval for a new operation.

## Verification scope

On 2026-10-28 this editor updated the local CLIs to `cf 1.0.0-beta.24` / `wrangler 4.154.0`. The new command paths are checked using help/schema with a synthetic HOME and network denied; this is not a live-account or deployment test. In particular beta.5's `observability telemetry` namespace is `o11y telemetry` in beta.24.

A separate 2026-10-28 peer followed this guide on beta.24 against two approved Workers. Builds/trigger/deployment/status/limits reads and one GraphQL template request (`errors: null`) succeeded. The initial audit check was BLOCKED because flat CLI output hid the expected cursor. After the guide was amended, an affected-only recheck of one build-log/narrow audit window recovered one matching event without claiming complete coverage. GraphQL subshell handling passed synthetic/network-denied rechecks; no extra live GraphQL was run then. Telemetry live use and historical deployment-window flags remain unverified. This editor read the peer's shared summary, not raw private responses, and did not independently repeat those live calls. The first BLOCKED observation remains part of the receipt.

The 2026-10-28 owner investigation reported successful scoped-token reads of Builds, audit v2, deployments, triggers, limits and telemetry on `cf 1.0.0-beta.5`. Those are inherited live receipts, not account operations repeated by this guide's editor. Incident build/Ray IDs, account records, generator nondeterminism and site-specific Wrangler pins belong to their site owners, not this common procedure. Installed CLI version, a site's build-command pin and the version used for a receipt are separate facts; recheck help/schema when versions differ.
