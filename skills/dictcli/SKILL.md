---
name: dictcli
description: "개인 어휘 그래프 — 한↔영 크로스링귀얼 쿼리 확장 + 한국어 형태소 분석. expand로 한글 단어에서 영어 태그 후보를 찾고, stem으로 한국어 어간을 추출한다. knowledge_search의 3층 역할. '단어 확장', '태그 찾기', '한영 매핑', 'expand', 'stem', '형태소'."
---

# dictcli — Personal Vocabulary Graph (Layer 3)

Korean↔English triple graph. Expands Korean words to English Denote tags.
Layer 3 of knowledge_search — cross-lingual query enrichment.

## API

Binary bundled in skill directory. **Must cd to {baseDir}** (reads CWD/graph.edn).

| Command | Usage | Output |
|---------|-------|--------|
| **expand** | `cd {baseDir} && ./dictcli expand "보편" --json` | `["universal","universalism","particular","paideia"]` |
| graph | `cd {baseDir} && ./dictcli graph "보편"` | All triples for the word |
| stats | `cd {baseDir} && ./dictcli stats` | Graph statistics |
| validate | `cd {baseDir} && ./dictcli validate` | Invariant check |

### expand — Core Command

Traverses the graph: direct translation → opposite's translation → related word's translation.

```bash
cd {baseDir} && ./dictcli expand "기술" --json   # → ["art","technology","technique"]
cd {baseDir} && ./dictcli expand "도피" --json   # → ["escape","flight","avoidance","evasion"]
```

Empty array = word not in graph.edn. Fall back to original query.

### knowledge_search Integration Pattern

```
1. User: "보편 학문 관련 노트"
2. expand "보편" → ["universal","universalism","paideia"...]
3. Search: "보편 학문 universal universalism paideia"
```

Agent autonomously: extract concept words → expand → enrich query → knowledge_search.

## stem — Korean Morphological Analysis

**JVM-only** (Kiwi JNI — not in native binary). Called via dictcli repo's `run.sh stem`.
Agents rarely call directly — andenken batch-indexes via `--batch` / `--serve` mode.

```bash
cd ~/repos/gh/dictcli && ./run.sh stem "설계했다"     # → 설계
cd ~/repos/gh/dictcli && ./run.sh stem --serve 9876   # socket server (1ms/query)
```

Pipeline: `"설계했다" → stem → "설계" → expand → ["design","architecture"]`

## Data

- `graph.edn`: 3,971 triples, 2,449 `:trans` mappings, 4,728 words, 526 clusters
- Sources: meta-note clusters, Syntopicon 102 Great Ideas, philosophy glossary
- Relations: `:trans`(2449), `:source`(1422), `:related`(44), `:synonym`(44)

## Architecture Note

| Component | Runtime | Latency |
|-----------|---------|---------|
| expand/lookup/stats | GraalVM native-image | ~9ms |
| stem | JVM (Kiwi JNI) | ~1ms (server) / ~3s (cold start) |

Native binary cannot include stem (JNI incompatible with native-image).
Two separate execution paths — no conflict.

## Layer 3 in the Stack

| Layer | Tool | Role |
|-------|------|------|
| 1 | knowledge_search | Embedding vector search |
| 2 | denotecli | Exact match + graph links |
| **3** | **dictcli expand + stem** | **Korean→English query expansion + stemming** |
