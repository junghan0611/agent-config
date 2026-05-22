---
name: exa-search
description: Semantic web search, content extraction, and code-context retrieval via Exa AI. Use for intent-based search ("Python async job queue libraries"), fetching clean page content from URLs, or pulling GitHub / Stack Overflow / docs as a single LLM-ready code block. Stronger than keyword search for agent workflows.
---

# Exa Search

Three subcommands wrapping the [Exa AI](https://exa.ai) API:

- `search.js` — neural web search (`/search`, via official `exa-js` SDK)
- `contents.js` — extract clean text from known URLs (`/contents`, via `exa-js`)
- `code.js` — token-efficient code context aggregated from GitHub + Stack Overflow + docs (`/context`, direct `fetch` — not yet in SDK)

## Setup

1. Create an account at https://dashboard.exa.ai and copy an API key.
2. Add to your environment (e.g. `~/.env.local` if you source it, or `~/.profile`):
   ```bash
   export EXA_API_KEY="your-key-here"
   ```
3. Install dependencies (run once):
   ```bash
   cd {baseDir}
   pnpm install
   ```

## Choose the right command

| Goal | Command |
|------|---------|
| Find pages by meaning (not exact keywords) | `search.js` |
| Pull specific code patterns / API usage into context | `code.js` |
| You already have a URL and want clean text | `contents.js` |
| Get a structured JSON answer with citations | `search.js --output-schema` |

`code.js` is usually right when the user wants to *write code* against a library or pattern: it returns one merged block with snippets and explanations, ready to paste into an LLM context. `search.js` returns URL-keyed result objects and is right for "what's the latest news / paper / discussion on X".

## search.js — semantic web search

```bash
{baseDir}/search.js "intent-based query" [options]
```

By default returns **highlights only** (token-efficient per Exa's guide for coding agents). Combine flags to add content modes — they are not mutually exclusive.

### Options

| Flag | Purpose |
|------|---------|
| `-n, --num-results <n>` | Default 10 |
| `--type <type>` | `auto` (default) \| `fast` (~450ms) \| `instant` (~250ms) \| `deep-lite` \| `deep` (multi-step) \| `deep-reasoning` (hardest synthesis) |
| `--text` | Include full text (capped by `--max-chars`) |
| `--highlights` | Include query-relevant excerpts (default if no content flag set) |
| `--summary` | Include AI-written summary |
| `--max-chars <n>` | Cap text length, default 20000 |
| `--category <cat>` | `company` \| `research paper` \| `news` \| `pdf` \| `tweet` \| `personal site` \| `financial report` \| `people` |
| `--include-domains <list>` | Comma-separated |
| `--exclude-domains <list>` | Comma-separated |
| `--start-date <iso>` / `--end-date <iso>` | Filter by published date |
| `--output-schema <file>` | Path to JSON schema → structured grounded output |
| `--json` | Raw JSON instead of formatted markdown |

### Examples

```bash
# Default: 10 results with highlights
search.js "Python async job queue libraries"

# Deep research with full text
search.js "transformer scaling laws" --type deep --text

# Filter by source + date
search.js "AI safety policy" --category news --start-date 2026-01-01

# Domain-scoped
search.js "vector index benchmarks" --include-domains "arxiv.org,papers.nips.cc"

# Structured output (grounded JSON with citations)
search.js "top open source vector DBs" --output-schema ./vectordb.schema.json
```

### `--output-schema` (structured output)

Pass a JSON schema; Exa returns `output.content` matching the schema plus `output.grounding` with field-level citations. Max nesting depth 2, max 10 total properties. Do **not** add citation/confidence fields to the schema — they come back automatically.

Schema example:

```json
{
	"type": "object",
	"required": ["companies"],
	"properties": {
		"companies": {
			"type": "array",
			"items": {
				"type": "object",
				"required": ["name"],
				"properties": {
					"name": { "type": "string" },
					"description": { "type": "string" }
				}
			}
		}
	}
}
```

Works on every search `--type`; `deep` / `deep-reasoning` gives higher-quality synthesis for complex queries.

## contents.js — extract content from known URLs

```bash
{baseDir}/contents.js <url> [<url> ...] [options]
```

Use when you already have URLs (from another search, a database, user input, RSS). Defaults to `--text` since `/contents` has no useful default.

### Options

| Flag | Purpose |
|------|---------|
| `--text` | Full text (default if no content flag) |
| `--highlights` | Excerpts only |
| `--summary` | AI summary |
| `--max-chars <n>` | Default 20000 |
| `--max-age-hours <n>` | Cache freshness: `0` = always livecrawl, `-1` = cache only, `24` = livecrawl if older than 1 day, omit = default |
| `--json` | Raw JSON |

### Examples

```bash
contents.js https://example.com/article
contents.js https://a.com/1 https://a.com/2 --highlights
contents.js https://example.com --text --max-chars 5000 --max-age-hours 0
```

## code.js — Exa Context (code-context API)

```bash
{baseDir}/code.js "what you want to learn" [--tokens-num <n|dynamic>] [--json]
```

Returns a single merged block of code snippets + explanations from GitHub, Stack Overflow, and official docs. Designed for direct pasting into an LLM context window.

### Options

| Flag | Purpose |
|------|---------|
| `--tokens-num <n\|dynamic>` | Token budget: `dynamic` (default) or `50`–`100000`. `5000` recommended, `10000` for extensive context |
| `--json` | Raw JSON (default prints just the response text) |

### Examples

```bash
code.js "how to use cobra CLI in Go"
code.js "React useEffect cleanup pattern" --tokens-num 5000
code.js "postgres connection pooling in Go"
```

The default output is just the merged response text (no metadata), so it pipes cleanly into other tools or directly into a prompt.

## Output

All three commands print to stdout. Cost / token metadata goes to stderr, so it stays visible without polluting piped output:

```bash
search.js "query" > results.md       # results only
search.js "query" 2>&1 | tee log     # results + cost line
```

## Common pitfalls (Exa API)

From the [Exa coding-agents guide](https://docs.exa.ai/reference/search-api-guide-for-coding-agents):

- `useAutoprompt` is **deprecated** — do not pass it
- `includeUrls` / `excludeUrls` do **not** exist — use `--include-domains` / `--exclude-domains`
- `tokensNum` is **only for `code.js`** (`/context` endpoint), not for `/search`
- `livecrawl: "always"` is deprecated — use `--max-age-hours 0` on `contents.js`
- `category: "company" | "people"` does **not** support `--exclude-domains` or any date filter
- Prefer `search.js --output-schema` over the legacy `/answer` endpoint for grounded answers

## When to prefer this over `brave-search`

- Intent-based query that doesn't translate cleanly to keywords
- Need code examples for an unfamiliar library or API (`code.js`)
- Need structured / grounded output with citations (`search.js --output-schema`)
- Want neural ranking over GitHub / arxiv / docs

Brave is still right for: cheap broad-keyword lookups, country-scoped results, freshness windows (`pd`/`pw`/`pm`).

## References

- [Exa docs](https://docs.exa.ai)
- [Coding-agents guide](https://docs.exa.ai/reference/search-api-guide-for-coding-agents) — canonical source of truth for API parameters
- [`exa-js` SDK](https://github.com/exa-labs/exa-js) — official, MIT, actively maintained
- [Context API reference](https://exa.ai/docs/reference/context)
