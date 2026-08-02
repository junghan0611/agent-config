---
name: bibcli
description: "로컬 BibTeX SSOT 검색/조회 + URL 원샷 캡처. 폰/브라우저 담근 직후 bib sync. URL만 있으면 zotero-config save→에이전트 스타일·KDC 키 판단→pin --sync 로 같은 세션에 인용 키 확정(시점 분리 금지). orphan #+print_bibliography: 금지."
---

# bibcli — local meta-bib SSOT + Zotero companion

Binary: `{baseDir}/bibcli`  
Agent default: explicit `--dir ~/org/resources`.  
Repo doctrine (book ritual, pin contract, dateAdded):  
`~/repos/gh/zotero-config/.claude/skills/zotero-config/SKILL.md`

**org 담당 에이전트 기본 스킬.** “서지 없다”로 멈추지 말고, URL이 있으면 아래 원샷으로 키를 만든다.

## 0) Doctrine

```text
Zotero Cloud  = capture vault
~/org/resources/*.bib  = meta bibliography SSOT  ← bibcli reads only this
```

- bibcli never talks to Zotero. Cloud-only items do not exist until pull/pin-sync.
- **External-capture reflex:** phone/browser just saved → `bib sync` without asking, then search.
- **URL in hand (org note needs cite now):** do **not** split capture and keying across sessions.
  Finish with a stable unique `citationKey` in SSOT before writing `#+reference:`.
- **Books:** agent judges style + approximate KDC key (API optional). Not bulk autopilot.
  `dateAdded` is sacred — only `pin` whitelist PATCH.
- Never hand-edit `*.bib`. Never leave orphan `#+print_bibliography:`.

## 1) Core bibcli (read-only, local)

| Need | Command |
|---|---|
| Search | `{baseDir}/bibcli search "words" [--type Book] --dir ~/org/resources --max 10` |
| Show | `{baseDir}/bibcli show "citation-key" --dir ~/org/resources` |
| List | `{baseDir}/bibcli list --type Book --dir ~/org/resources --max 20` |
| Stats | `{baseDir}/bibcli stats --dir ~/org/resources` |
| Lookup assist | `{baseDir}/bibcli lookup ISBN\|제목` — optional candidates only; may timeout |

## 2) URL → citeable key (one session)

Org agent path when the note has a URL and SSOT lacks the source.

### 2a) Web / video / blog (fallback key often enough)

```bash
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save --sync --json "URL"
# use resolved[].citationKey immediately
```

### 2b) Book / needs GLG-style fields + KDC key (default for yes24 etc.)

```bash
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save --json "URL"
# → saved[].zoteroKey , raw title/creators often dirty (yes24 pipes, 저/역)
```

Agent then **in the same turn**:

1. **Style** — clean title; fix creators (`name: 저자`, translator separate); date; ISBN; publisher; abstract; language; url.
2. **Classify** — choose `citationKey` with KDC-sense + author code.  
   Study neighbors: `{baseDir}/bibcli search "동저자|주제" --type Book --dir ~/org/resources`.  
   Examples: `001.3-김74ㅁ`, `843.5-조68ㅍ2`. Perfect library OPAC match not required.  
   **Uniqueness:** `{baseDir}/bibcli show "KEY"` must be *not found* (unless re-pinning same item).
3. **Pin + pull**

```bash
./run.sh pin --sync --json '{
  "zoteroKey": "FROM_SAVE",
  "citationKey": "UNIQUE-KEY",
  "title": "…",
  "creators": [{"creatorType":"author","name":"…"}],
  "date": "YYYY" ,
  "publisher": "…",
  "ISBN": "…",
  "language": "ko",
  "abstractNote": "…",
  "url": "URL"
}'
# → { citationKey, synced:true, dateAdded preserved }
```

4. **Verify + cite**

```bash
{baseDir}/bibcli show "UNIQUE-KEY" --dir ~/org/resources
# org:
# #+reference: UNIQUE-KEY
# #+print_bibliography:
```

### yes24 style cheatsheet

| Raw | Styled |
|---|---|
| `제목 \| 저자 \| 출판사 - 예스24` | `제목` |
| creators `lastName=저, firstName=김정운` | `{"creatorType":"author","name":"김정운"}` |
| empty date/ISBN | fill from page meta (`datePublished`, `books:isbn`) |
| no citationKey | agent KDC-sense key, never leave final as `book-…` for books |

### 2c) Already in vault, not in SSOT

```bash
cd ~/repos/gh/zotero-config && ./run.sh bib sync
{baseDir}/bibcli search "…" --dir ~/org/resources --max 10
```

## Decision rule

| Situation | Action |
|---|---|
| Have citation key | `show` |
| Existing local source | `search` (external capture → sync first) |
| URL, web/video | `save --sync --json` |
| URL, book / styled key needed | `save --json` → style+KDC → `pin --sync` |
| “서지 없어요” but URL in thread | **do 2a/2b now** — do not only report missing |

## Mutation boundary

| Action | Cloud | Notes |
|--------|-------|-------|
| `bib sync` / `bib full` | read-only | After external capture; network-free render |
| `save` | create item | Raw capture |
| `pin --sync` | whitelist PATCH | Style + citationKey; **never dateAdded**; uniqueness check |
| `bib writeback` | key PATCH batch | Legacy; prefer `pin` for single items |
| `enrich` | PATCH | Danger/legacy — not default |
| hand-edit `*.bib` | — | Forbidden |

## Practical bib-note pattern

```org
#+reference: citation-key
#+print_bibliography:
```

## Environment

| Variable | Used by |
|---|---|
| `BIBCLI_DIR` | bibcli default dir (still pass `--dir ~/org/resources`) |
| `ZOTERO_API_KEY` / `ZOTERO_USER_ID` | save, pin, bib |
| `ZOTERO_TRANSLATION_SERVER` | save (default `http://localhost:1969`) |
| `DATA4LIBRARY_API_KEY` | optional `lookup` only |

Translation server repo if start fails: `~/repos/3rd/translation-server`.

## Output

All bibcli output is JSON. `pin` / `save --json` also JSON on stdout.
