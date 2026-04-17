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
| Search existing entries | `{baseDir}/bibcli search "query words" --dir ~/org/resources --max 10` | AND search over citation key, title, author, keywords, date, abstract |
| Show one entry | `{baseDir}/bibcli show "citation-key" --dir ~/org/resources` | Full JSON incl. url / isbn / abstract / keywords |
| List by type | `{baseDir}/bibcli list --type Book --dir ~/org/resources --max 20` | Types: `Book`, `Online`, `Software`, `Reference`, `Video`, `Article`, `Misc` |
| Library stats | `{baseDir}/bibcli stats --dir ~/org/resources` | Sanity check local bib files |
| Lookup book metadata | `{baseDir}/bibcli lookup 9791192300283` | data4library only; needs `DATA4LIBRARY_API_KEY` |

## 2) zotero-config companion workflow (writes to Zotero)

Use this path when the note has a source URL but no citation key yet.

| Step | Command | Why |
|---|---|---|
| Check server | `cd ~/repos/gh/zotero-config && ./run.sh server status` | Reuse Translation Server if already running |
| Start server | `cd ~/repos/gh/zotero-config && ./run.sh server start` | Starts `http://localhost:1969` |
| Save URL | `cd ~/repos/gh/zotero-config && ./run.sh save "https://example.com/article"` | Extract metadata and upload to Zotero Cloud |
| Sync BibTeX | `cd ~/repos/gh/zotero-config && ./run.sh bib sync` | Refresh `output/*.bib` and copy to `~/org/resources/` |
| Recover citation key | `{baseDir}/bibcli search "distinctive title author words" --dir ~/org/resources --max 5` | Find the newly saved entry; add `--type Online|Article|Book` only when confident |
| Verify details | `{baseDir}/bibcli show "citation-key" --dir ~/org/resources` | Confirm title/url, then use the key in `#+reference:` |

## Decision rule

- Have citation key → `show`
- Need an existing local source → `search`
- Only have URL and the source should enter Zotero → run the companion workflow first
- Do not leave `#+print_bibliography:` orphaned when `save` + `bib sync` can fix it

## Practical bib-note pattern

```bash
URL="https://example.com/article"
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save "$URL"
./run.sh bib sync

{baseDir}/bibcli search "author topic words" --dir ~/org/resources --max 5
{baseDir}/bibcli show "citation-key" --dir ~/org/resources
```

Then add:

```org
#+reference: citation-key
#+print_bibliography:
```

## Important notes

- `save` mutates Zotero Cloud. Use it only when the source belongs in the library.
- `save` returns Zotero item keys, not citation keys. Recover the citation key after `bib sync`.
- `bibcli search` does **not** currently match raw `url`; search by title / author / keywords after sync.
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
