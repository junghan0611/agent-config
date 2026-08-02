---
name: bibcli
description: "로컬 BibTeX SSOT 검색/조회 + URL 원샷 입수. 유튜브·책·블로그·웹 URL을 에이전트에게 주면 save→스타일·키 판단→pin --sync 로 같은 세션에 Zotero 적소 분류 + 인용 키 확정(시점 분리 금지). 폰 캡처 후엔 bib sync. orphan #+print_bibliography: 금지."
---

# bibcli — meta-bib SSOT + URL 입수 (org 에이전트 기본)

Binary: `{baseDir}/bibcli`  
Agent default: `--dir ~/org/resources`  
리포 오퍼레이터 상세: `~/repos/gh/zotero-config/.claude/skills/zotero-config/SKILL.md`  
공개 담당자 문서: `denote:20260304T105300` (§zotero-config) — 교리·경계가 바뀌면 그 방 갱신 (새 llmlog 금지)

**역할:** GLG가 유튜브·책(yes24)·블로그·웹 URL만 넘기면, 이 스킬 하나로  
Zotero 적소에 담고 → 로컬 SSOT에 키를 확정해 → org 글에 바로 쓴다.  
“서지 없어요”로 멈추지 않는다.

## 0) Doctrine

```text
Zotero Cloud     = 캡처 금고 + 컬렉션 분류 (Book/N00, Category/@Web|Video|…)
~/org/resources  = 메타 서지 SSOT  ← bibcli가 읽는 유일한 면
org note         = #+reference: KEY 로 소비
```

| 규칙 | 내용 |
|---|---|
| 한 세션 | URL 입수와 인용 키 확정을 **나누지 않는다** |
| SSOT | `bibcli show` 되는 키만 서지로 인정 |
| dateAdded | 성스러움 — `pin` whitelist만, 일괄 enrich 금지 |
| 손편집 `*.bib` | 금지 (다음 sync에 덮임) |
| 별표 스크랩 | 경계 밖 (YouTube 별표 목록 등 직접 수집 금지) |

## 1) 읽기 (로컬 only)

```bash
{baseDir}/bibcli search "words" [--type Book|Online|Video|…] --dir ~/org/resources --max 10
{baseDir}/bibcli show "citation-key" --dir ~/org/resources
{baseDir}/bibcli list --type Book --dir ~/org/resources --max 20
{baseDir}/bibcli stats --dir ~/org/resources
{baseDir}/bibcli lookup ISBN|제목   # 선택 보조, 타임아웃 가능, 필수 아님
```

## 2) URL → 글에 쓸 키 (모든 유형 공통 원샷)

```text
[1] save --json URL     Translation Server → Cloud (날것, zoteroKey)
[2] style + key         에이전트 판단 (유형별 아래)
[3] pin --sync          스타일·키 PATCH + 컬렉션 분류 + bib sync
[4] show + cite         bibcli show → #+reference: KEY
```

```bash
cd ~/repos/gh/zotero-config
./run.sh server status || ./run.sh server start
./run.sh save --json "URL"
# → { saved:[{zoteroKey, title}], … }

# 같은 턴에서 스타일·유일 키 결정 후:
./run.sh pin --sync --json '{
  "zoteroKey": "FROM_SAVE",
  "citationKey": "UNIQUE-KEY",
  "title": "…",
  "creators": [{"creatorType":"author","name":"…"}],
  "date": "YYYY",
  "url": "URL",
  "abstractNote": "…",
  "language": "ko"
}'
# → { citationKey, collections:[…], synced:true, dateAdded preserved }

{baseDir}/bibcli show "UNIQUE-KEY" --dir ~/org/resources
```

**금지:** `save`만 하고 키·분류를 다음 세션으로 미루기.  
**금지:** 책 최종 키를 `book-…` 폴백으로 남기기.

### 2a) 유형별 라우팅

| URL / 유형 | 스타일 포인트 | citationKey | pin 자동 컬렉션 (Unfiled 탈출) | 로컬 bib |
|---|---|---|---|---|
| **책** yes24 등 | 제목 파이프 제거, `저`/`역` creators, date·ISBN·publisher·abstract | KDC 감각 `001.3-김74ㅁ` (동저자 `search` 참고, **유일**) | `Book` + `000-정보`…`900-역사` (키 앞자리) | `Book.bib` |
| **유튜브 / 영상** | 제목 정리, 채널→author, date | `…` 기존 영상 패턴 또는 save 직후 키 개선 | `Category → Video` (itemType) | `Video.bib` |
| **블로그** | 제목·author·date | `blog-…` 또는 개선 키 | `Category → BlogPost` | `Online.bib` |
| **일반 웹** | 제목 정리 (사이트 접미 제거) | `web-…` 또는 개선 키 | `Category → @Web` | `Online.bib` |
| **위키** | 표제어 정리 | `wiki-…` | `Category → Wikipedia` | `Reference.bib` |
| **소프트웨어/레포** | name·url | 관례 키 | `Category → Software` | `Software.bib` |

컬렉션은 `pin`이 **자동**으로 넣는다 (로컬 type-split bib의 역방향).

- 책: citationKey가 `0`–`9`로 시작 → Book + N00  
- 비책: Cloud `itemType` → Category 리프  
- 덮어쓰기: `fileUnder: "Video"` / `collections: ["…"]` / `noCollections: true`

### 2b) 책 스타일 (yes24)

| Raw | Styled |
|---|---|
| `제목 \| 저자 \| 출판사 - 예스24` | `제목` |
| `lastName=저, firstName=김정운` | `{"creatorType":"author","name":"김정운"}` |
| date/ISBN 공백 | 페이지 meta (`datePublished`, `books:isbn`)에서 채움 |
| citationKey 없음 | 에이전트 KDC 판단 — `bibcli show`로 중복 확인 |

KDC는 **완벽할 필요 없음**. 분류 축 + SSOT 유일성이 핵심.  
`lookup`/도서관 API는 선택; 실패해도 판단으로 진행.

### 2c) 키 유일성

```bash
{baseDir}/bibcli show "후보키" --dir ~/org/resources
# entry not found 여야 신규 핀 가능 (같은 항목 재핀은 예외)
```

### 2d) 이미 금고에만 있음 (폰/브라우저 Connector)

```bash
cd ~/repos/gh/zotero-config && ./run.sh bib sync
{baseDir}/bibcli search "제목|url조각" --dir ~/org/resources --max 10
```

미분류·키 부실이면 `zoteroKey` 확보 후 **2) pin --sync**로 수선 (같은 세션).

### 2e) 빠른 웹만 (예외)

메타가 깨끗하고 Unfiled여도 당장은 키만 필요할 때:

```bash
./run.sh save --sync --json "URL"   # resolved[].citationKey
```

가능하면 그래도 **pin**으로 컬렉션까지 닫는 쪽을 기본으로 한다.

## 3) Decision table

| 상황 | 행동 |
|---|---|
| 키 있음 | `show` |
| 로컬에 있을 듯 | `search` (방금 폰 저장 → 먼저 `bib sync`) |
| URL = 책/yes24 | save → style+KDC → **pin --sync** |
| URL = 유튜브·블로그·웹 | save → 가벼운 스타일+키 → **pin --sync** |
| “서지 없어요” + 스레드에 URL | **지금 2)** — 보고만 하고 끝 금지 |
| org 노트 인용 | `#+reference:` + `#+print_bibliography:` (orphan 금지) |

## 4) Mutation boundary

| 명령 | Cloud | 메모 |
|---|---|---|
| `bib sync` / `full` | 읽기 only | 렌더 네트워크 없음; KDC API 없음 |
| `save --json` | 항목 생성 | 날것 캡처 |
| **`pin --sync`** | whitelist PATCH | 스타일+키+**컬렉션**; dateAdded 불변; 유일 키 |
| `writeback` / `enrich` | PATCH | 레거시·위험 — 기본 경로 아님 |
| `*.bib` 손편집 | — | 금지 |

## 5) org 패턴

```org
#+reference: citation-key
#+print_bibliography:
```

## 6) Environment

| 변수 | 용도 |
|---|---|
| `ZOTERO_API_KEY` / `ZOTERO_USER_ID` | save, pin, bib |
| `ZOTERO_TRANSLATION_SERVER` | 기본 `http://localhost:1969` |
| `DATA4LIBRARY_API_KEY` | 선택 `lookup` only |
| `BIBCLI_DIR` | 있어도 에이전트는 `--dir ~/org/resources` 명시 |

Translation Server 실패 시 클론 위치: `~/repos/3rd/translation-server`.

## 7) 한 줄 요약

```text
URL 전달 → save → (에이전트 스타일·키) → pin --sync → bibcli show → 글에 인용
책이면 Book/N00, 유튜브면 Video, 블로그면 BlogPost, 웹이면 @Web.
시점을 나누지 않는다.
```
