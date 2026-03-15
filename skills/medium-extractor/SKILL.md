---
name: medium-extractor
description: Extract readable markdown from Medium article URLs using Freedium/Scribe fallbacks.
---

# Medium Extractor

Extract full readable content from Medium article URLs without browser automation.

## Setup

From the skill directory, run:

```bash
npm install
```

## Usage

```bash
./extract.js <medium-or-mirror-url>
./extract.js <medium-or-mirror-url> --source
./extract.js <medium-or-mirror-url> --debug
```

## Fallback order

For Medium URLs, this skill tries these sources in order:

1. `freedium.cfd`
2. `freedium-mirror.cfd`
3. `scribe.rip`
4. original URL (last resort)

For Freedium/Scribe URLs, it extracts directly from the provided URL.

## Output

Markdown text suitable for summarization, note-taking, or archival.

Use `--source` to print which source URL succeeded.
