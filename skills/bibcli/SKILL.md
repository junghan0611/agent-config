---
name: bibcli
description: "로컬 BibTeX(메타 서지 SSOT) 검색/조회. Zotero Cloud는 캡처 금고일 뿐 — 폰·브라우저로 담근 직후면 bib sync를 먼저 한다. URL만 있으면 zotero-config save --sync --json. 책 KDC는 신중, 웹·영상은 pull. orphan #+print_bibliography: 금지."
---

# bibcli — local meta-bib SSOT + Zotero companion

Binary: `{baseDir}/bibcli`  
Agent default: explicit `--dir ~/org/resources`.  
Repo doctrine (boundaries, book vs web, mutation):  
`~/repos/gh/zotero-config/.claude/skills/zotero-config/SKILL.md`

## 0) Doctrine (read before searching)

```text
Zotero Cloud  = capture vault (phone / browser / save)
~/org/resources/*.bib  = meta bibliography SSOT  ← bibcli reads only this
```

- bibcli never talks to Zotero. If the item is only in Cloud, **it does not exist
  for bibcli** until pull.
- **External-capture reflex:** GLG says they just saved on phone/browser, or
  asks for a “just added” YouTube/blog/web item → run sync **without being asked**:

```bash
cd ~/repos/gh/zotero-config && ./run.sh bib sync
```

  then `bibcli search` / `show`. `bib sync` is **read-only** on Cloud.
- **Books** = human ritual (hand KDC-sense keys in Zotero). Do not bulk-automate.
  `lookup` is candidate assist only — **never part of `bib sync`**. Full ritual:
  `zotero-config` skill §1b. `dateAdded`/`dateModified` are sacred.
  **Online/Video/web** = capture freely, pull with sync.
- Out of scope: YouTube starred lists, random scrapers, MCP, PDF pipelines.
  Only what entered Zotero may become SSOT.
- Never hand-edit `*.bib`. Never leave orphan `#+print_bibliography:`.

## 1) Core bibcli (read-only, local BibTeX)

| Need | Command | Notes |
|---|---|---|
| Search existing entries | `{baseDir}/bibcli search "query words" [--type Online] --dir ~/org/resources --max 10` | AND over key, title, author, keywords, date, abstract, **url** |
| Show one entry | `{baseDir}/bibcli show "citation-key" --dir ~/org/resources` | Full JSON incl. url / isbn / abstract / keywords |
| List by type | `{baseDir}/bibcli list --type Book --dir ~/org/resources --max 20` | `Book`, `Online`, `Software`, `Reference`, `Video`, `Article`, `Misc` |
| Library stats | `{baseDir}/bibcli stats --dir ~/org/resources` | Sanity check local bib files |
| Lookup book metadata | `{baseDir}/bibcli lookup 9791192300283` | data4library **candidate** only; needs `DATA4LIBRARY_API_KEY`; writes nothing; human confirms key in Zotero |

## 2) Companion — pull vault or save URL

### 2a) Phone/browser already saved → pull SSOT

```bash
cd ~/repos/gh/zotero-config && ./run.sh bib sync
bibcli search "distinctive words or url fragment" --dir ~/org/resources --max 10
```

### 2b) New URL, need citation key now (one shot)

```bash
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save --sync --json "https://example.com/article"
# => { saved:[...], resolved:[{zoteroKey, citationKey, title, ...}] }
```

Use `resolved[].citationKey` in the note. Optional verify:
`{baseDir}/bibcli show "citation-key" --dir ~/org/resources`.

### Fallback (no `--sync --json`)

| Step | Command |
|---|---|
| Save URL | `cd ~/repos/gh/zotero-config && ./run.sh save "URL"` |
| Sync | `./run.sh bib sync` |
| Recover key | `bibcli search` by **URL** fragment or title words |
| Verify | `bibcli show "key"` |

## Decision rule

- Have citation key → `show`
- Need existing local source → `search` (if just captured outside → **sync first**)
- Only have URL and it should enter the vault → `save --sync --json`
- Do not leave `#+print_bibliography:` orphaned when one save/sync can fix it

## Practical bib-note pattern

```org
#+reference: citation-key
#+print_bibliography:
```

## Mutation boundary

| Action | Cloud | Notes |
|--------|-------|-------|
| `bib sync` / `bib full` | read-only pull | Everyday reflex after external capture |
| `save` / browser Connector | creates item | Only routine write path |
| `bib writeback` | PATCH keys | Explicit only (e.g. curated book KDC). Never side-effect of sync |
| hand-edit `*.bib` | — | Forbidden — clobbered on next full |

Plain `save` returns Zotero item keys, not citation keys — prefer
`save --sync --json`. `bibcli search` matches raw `url`.

If `server start` fails, expected repo: `~/repos/3rd/translation-server`.

## Environment

| Variable | Used by | Purpose |
|---|---|---|
| `BIBCLI_DIR` | bibcli | Default BibTeX directory |
| `DATA4LIBRARY_API_KEY` | `lookup` | Book metadata / KDC **assist** (not full autopilot) |
| `ZOTERO_API_KEY` | `./run.sh save`, `./run.sh bib *` | Zotero Web API |
| `ZOTERO_USER_ID` | `./run.sh save`, `./run.sh bib *` | Zotero user/library |
| `ZOTERO_TRANSLATION_SERVER` | `./run.sh save` | Default: `http://localhost:1969` |

## Output

All bibcli output is JSON.
- `search` / `list`: brief entries
- `show`: full flattened entry
- `stats`: counts per bib file
- `lookup`: data4library candidates
