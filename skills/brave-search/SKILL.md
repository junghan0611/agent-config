---
name: brave-search
description: Fallback keyword web search via the Brave Search API. Use exa-search for general web search instead; reach for Brave only when you specifically need its 2000 free requests/month for high-volume lookups, country-scoped results (--country), or a freshness window (--freshness pd/pw/pm/py). The free plan caps at 1 request/second, so never run calls in parallel.
---

# Brave Search

Keyword web search and content extraction using the official Brave Search API. No browser required.

**`exa-search` is the default search surface — this skill is the fallback.** Brave earns the call
only for what Exa does not give you cheaply:

- high-volume keyword lookups you want on a free quota (2000 requests/month)
- country-scoped results (`--country`)
- a freshness window (`--freshness pd|pw|pm|py`)

For anything else — one general question, several queries at once, intent-based phrasing, domain-scoped
research, or a URL whose text you need — use `exa-search`.

## Setup

Requires a Brave Search API account with a free subscription. A credit card is required to create the free subscription (you won't be charged).

1. Create an account at https://api-dashboard.search.brave.com/register
2. Create a "Free AI" subscription
3. Create an API key for the subscription
4. Add to your shell profile (`~/.profile` or `~/.zprofile` for zsh):
   ```bash
   export BRAVE_API_KEY="your-api-key-here"
   ```
5. Install dependencies (run once):
   ```bash
   cd {baseDir}
   npm install
   ```

## Rate limits — read before issuing calls

The free plan is **1 request/second** and **2000 requests/month**.

- **Never launch `search.js` calls in parallel.** One query at a time; refine from the result.
- `search.js` paces its own requests through a cross-process lock and retries 429 with backoff, so
  three concurrent invocations now succeed — they just take ~1.1s apiece. Do not defeat this by
  assuming a failure means the quota is gone.
- Every run prints the remaining monthly quota to stderr:
  `[brave] monthly quota remaining: 1965/2000`. Read that line before concluding the key is exhausted.
- If 429 still survives the retries, switch to the `exa-search` skill rather than retrying by hand.

## Search

```bash
{baseDir}/search.js "query"                         # Basic search (5 results)
{baseDir}/search.js "query" -n 10                   # More results (max 20)
{baseDir}/search.js "query" --content               # Include page content as markdown
{baseDir}/search.js "query" --freshness pw          # Results from last week
{baseDir}/search.js "query" --freshness 2024-01-01to2024-06-30  # Date range
{baseDir}/search.js "query" --country DE            # Results from Germany
{baseDir}/search.js "query" -n 3 --content          # Combined options
```

### Options

- `-n <num>` - Number of results (default: 5, max: 20)
- `--content` - Fetch and include page content as markdown
- `--country <code>` - Two-letter country code (default: US)
- `--freshness <period>` - Filter by time:
  - `pd` - Past day (24 hours)
  - `pw` - Past week
  - `pm` - Past month
  - `py` - Past year
  - `YYYY-MM-DDtoYYYY-MM-DD` - Custom date range

## Extract Page Content

```bash
{baseDir}/content.js https://example.com/article
```

Fetches a URL and extracts readable content as markdown. Transient network failures are retried
up to 3 times. If it still fails, or the site blocks direct fetches, use the `exa-search` skill's
`contents.js` — it goes through Exa's crawler instead of a direct request.

## Output Format

```
--- Result 1 ---
Title: Page Title
Link: https://example.com/page
Age: 2 days ago
Snippet: Description from search results
Content: (if --content flag used)
  Markdown content extracted from the page...

--- Result 2 ---
...
```

## When to Use

- Broad keyword lookups where the exact words matter
- Country-scoped results (`--country`) or freshness windows (`--freshness pd|pw|pm|py`)
- Fetching content from a specific URL that answers to a plain request

## When to use `exa-search` instead

- More than one query at once — Brave's 1 req/s makes parallel search a dead end
- Intent-based questions that do not translate into keywords
- Code examples for an unfamiliar library (`exa-search/code.js`)
- A URL that Brave's `content.js` cannot fetch
- Narrow `site:` queries with long keyword lists — these frequently return nothing on Brave;
  Exa's `--include-domains` is the better tool for domain-scoped research
