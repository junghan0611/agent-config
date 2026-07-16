---
name: bibcli
description: Search/view local BibTeX entries. If only a source URL exists, use zotero-config (`server start` → `save` → `bib sync` → `bibcli search/show`) to recover a citation key before leaving orphan `#+print_bibliography:`.
---

# bibcli — local search + Zotero companion workflow

Binary: `{baseDir}/bibcli`  
Agent default: use explicit `--dir ~/org/resources`.

## 1) Core bibcli (read-only, local BibTeX)

| Need | Command | Notes |
|---|---|---|
| Search existing entries | `{baseDir}/bibcli search "query words" [--type Online] --dir ~/org/resources --max 10` | AND search over citation key, title, author, keywords, date, abstract, **url** |
| Show one entry | `{baseDir}/bibcli show "citation-key" --dir ~/org/resources` | Full JSON incl. url / isbn / abstract / keywords |
| List by type | `{baseDir}/bibcli list --type Book --dir ~/org/resources --max 20` | Types: `Book`, `Online`, `Software`, `Reference`, `Video`, `Article`, `Misc` |
| Library stats | `{baseDir}/bibcli stats --dir ~/org/resources` | Sanity check local bib files |
| Lookup book metadata | `{baseDir}/bibcli lookup 9791192300283` | data4library only; needs `DATA4LIBRARY_API_KEY` |

## 2) zotero-config companion workflow (writes to Zotero)

Use this path when the note has a source URL but no citation key yet.
**Preferred: one shot with `save --sync --json`** — it saves, runs `bib sync`,
and returns the resolved `citationKey` deterministically. No title-grepping.

```bash
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save --sync --json "https://example.com/article"
# => { saved:[...], resolved:[{zoteroKey, citationKey, title, url, ...}] }
```

Take `resolved[].citationKey` and drop it straight into the note. Optionally
verify: `{baseDir}/bibcli show "citation-key" --dir ~/org/resources`.

### Fallback (when `--sync --json` is unavailable)

| Step | Command |
|---|---|
| Save URL | `cd ~/repos/gh/zotero-config && ./run.sh save "https://example.com/article"` |
| Sync BibTeX | `cd ~/repos/gh/zotero-config && ./run.sh bib sync` (read-only) |
| Recover key | `{baseDir}/bibcli search "example.com/article" --dir ~/org/resources --max 5` — search the **URL** (exact); or distinctive title/author words |
| Verify | `{baseDir}/bibcli show "citation-key" --dir ~/org/resources` |

## Decision rule

- Have citation key → `show`
- Need an existing local source → `search`
- Only have URL and the source should enter Zotero → `save --sync --json`, then use `resolved[].citationKey`
- Do not leave `#+print_bibliography:` orphaned when one `save --sync --json` can fix it

## Practical bib-note pattern

```bash
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save --sync --json "https://example.com/article"
# read resolved[].citationKey from the JSON output
```

Then add:

```org
#+reference: citation-key
#+print_bibliography:
```

## Important notes

- **Mutation boundary:** `save` is the *only* step that writes to Zotero Cloud
  (it creates the item). `bib sync` / `bib full` are **read-only** — they pull the
  Cloud down and regenerate `output/*.bib`, never PATCH back. Pinning generated
  keys onto Cloud items is a separate, explicit `./run.sh bib writeback`.
- Plain `save` returns Zotero item keys, not citation keys — prefer `save --sync --json`, which resolves the citation key for you (from the generated `.bib` / `.sync/new-keys.json`; no Cloud write needed).
- `bibcli search` **does** match raw `url` — recovering a key by a distinctive URL fragment is exact and beats guessing title words.
- Never hand-edit `output/*.bib` or `~/org/resources/*.bib`: they are generated and clobbered on the next `bib full`. To add a source, create a Zotero item (`save` / browser Connector), then sync — one renderer keeps every entry consistent.
- `lookup` helps book / ISBN workflows, but writes nothing to Zotero.
- If `server start` fails, expected repo: `~/repos/3rd/translation-server`.

## Environment

| Variable | Used by | Purpose |
|---|---|---|
| `BIBCLI_DIR` | bibcli | Default BibTeX directory |
| `DATA4LIBRARY_API_KEY` | `lookup` | Book metadata / KDC lookup |
| `ZOTERO_API_KEY` | `./run.sh save`, `./run.sh bib *` | Zotero Web API |
| `ZOTERO_USER_ID` | `./run.sh save`, `./run.sh bib *` | Zotero user/library |
| `ZOTERO_TRANSLATION_SERVER` | `./run.sh save` | Default: `http://localhost:1969` |

## Output

All bibcli output is JSON.
- `search` / `list`: brief entries
- `show`: full flattened entry
- `stats`: counts per bib file
- `lookup`: data4library candidates
