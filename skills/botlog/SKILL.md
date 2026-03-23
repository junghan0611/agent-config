---
name: botlog
description: "봇 노트 생성 — 에이전트가 리서치/분석/대화 결과를 org-mode denote 형식으로 기록. botlog(공개)과 llmlog(비공개 작업기록) 두 모드 지원. Use when user says 'botlog', 'llmlog', '노트 만들어', '기록해', '지침 남겨', '전달해', '작업기록', 'write a note', or wants agent work saved as a denote note."
user_invocable: true
---

# botlog / llmlog — 봇 노트 생성

에이전트의 작업 결과를 **denote 형식 org-mode 파일**로 기록한다.

## botlog vs llmlog — 두 모드

| | **botlog** (`~/org/botlog/`) | **llmlog** (`~/org/llmlog/`) |
|---|---|---|
| **공개** | 디지털 가든에 공개 | 비공개 (에이전트 간 작업 기록) |
| **용도** | 리서치/분석 결과 정리 | 작업 지침 전달, 결과 공유, 반복 구체화 |
| **성격** | 완성된 글 | 작업 진행 문서 (br보다 편한 작업 로그) |
| **태그** | `:botlog:` 필수 | `:llmlog:` 필수 |
| **헤딩 태그** | `:LLMLOG:` | `:LLMLOG:` (동일) |
| **흐름** | llmlog에서 정리 → botlog로 승격 가능 | 에이전트끼리 주고받는 문서 |

**판단 기준:**
- "기록해", "노트 만들어", "정리해" → **botlog** (기본)
- "지침 남겨", "전달해", "llmlog", "작업기록", "이거 적어놔" → **llmlog**
- 힣이 명시적으로 "llmlog로" 또는 "llmlog에" 라고 하면 → **llmlog**

**llmlog 전용 규칙:**
- 폴더: `~/org/llmlog/` (botlog와 다름!)
- 태그: `:llmlog:` 필수 (`:botlog:` 아님)
- 레벨1 헤딩에 `:LLMLOG:` 태그는 동일
- 담당 에이전트에게 전달하는 문서일 경우, 제목에 대상 리포명이나 역할 포함 권장

아래 규칙은 botlog/llmlog 공통이다. 폴더와 태그만 다르다.

## When to Use

- `/botlog <제목>` — 명시적 생성
- "이거 노트로 남겨", "기록해줘", "botlog로 정리해"
- 리서치 결과를 디지털 가든에 남길 때
- 대화에서 의미 있는 분석이 나왔을 때

## 실행 순서

### 1단계: 메타데이터 결정

**타임스탬프 생성** (KST 기준):

```bash
TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S'
```

→ 예: `20260227T143500`

**제목 결정:**
- 사용자가 지정하면 그대로
- 없으면 내용에서 핵심 키워드로 생성
- 한글 사용 가능, 공백은 `-`로 치환

**태그 결정:**
- `:botlog:` 필수 포함
- 내용에 맞는 태그 3~7개 추가
- 기존 botlog 노트의 태그 참고:
  - 주제: `ai`, `agent`, `emacs`, `philosophy`, `iot` 등
  - 유형: `guru` (인물 리서치), `safety`, `society` 등

### 2단계: 저널 파일 찾기

denotecli로 해당 날짜의 저널 파일을 조회한다:

```bash
{skillsDir}/denotecli/denotecli day <YYYY-MM-DD> --dirs ~/org 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); j=d.get('journal',{}); print(j.get('identifier',''), j.get('title',''))"
```

→ 예: `20260223T000000 2026-02-23`

저널을 찾지 못하면 backlink 없이 생성하되, 히스토리에 "저널 미발견" 기록.

### 3단계: 파일명 생성

Denote 파일명 규칙:

```
<IDENTIFIER>--<TITLE>__<TAG1>_<TAG2>_<TAG3>.org
```

- IDENTIFIER: `20260227T143500`
- TITLE: 한글/영어 혼용 가능, 공백→`-`, 특수문자 제거
- TAGS: `_`로 구분, 알파벳순, `:botlog:` 반드시 포함

예: `20260227T143500--다리오-아모데이-대담-요약__ai_anthropic_botlog_guru.org`

### 4단계: org 파일 작성

**헤더 (필수):**

```org
#+title:      <제목>
#+date:       [YYYY-MM-DD Day HH:MM]
#+filetags:   :<tag1>:<tag2>:<botlog>:<tag3>:
#+identifier: <IDENTIFIER>
#+export_file_name: <IDENTIFIER>.md
#+OPTIONS: toc:1
```

**선택 헤더:**
- `#+reference:` — 관련 bib 키가 있으면 추가
- `#+hugo_tags:` — 공개 발행용 태그

**본문 구조:**

```org
* 히스토리
- [YYYY-MM-DD Day HH:MM] 생성 — <생성 경위 한줄>

* <본문 제목> :LLMLOG:

<본문 내용>

** 관련 노트

- [[denote:<저널ID>][<저널제목>]] — 주간 저널
- [[denote:<관련노트ID>][<관련노트제목>]] — 설명
```

### 5단계: 파일 저장

**중요**: OpenClaw의 `write` 도구는 workspace sandbox 안에서만 동작한다.
`~/org/botlog/`는 workspace 밖이므로 반드시 **bash의 cat heredoc**으로 저장한다.

```bash
cat <<'DENOTE_EOF' > ~/org/botlog/<파일명>
<org 내용 전체>
DENOTE_EOF
```

### 6단계: 확인

```bash
ls -la ~/org/botlog/<파일명>
```

## 양식 규칙

1. **히스토리 섹션**: 항상 첫 번째 헤딩. 생성/수정 이력을 역시간순 기록
2. **:LLMLOG: 태그**: 본문 헤딩에 반드시 붙임 — 에이전트가 작성한 콘텐츠 표시
3. **관련 노트**: 마지막 섹션. 저널 backlink 필수, 관련 denote 노트 추가
4. **저널 backlink**: `- [[denote:<저널ID>][<저널제목>]] — 주간 저널` 형식, 관련 노트 첫 줄
5. **org 문법만**: 마크다운 표 금지, `#+BEGIN_QUOTE` / org 리스트 사용
6. **인용**: 직접 인용은 `#+begin_quote ... #+end_quote`
7. **외부 링크**: `[[URL][제목]]` 형식

## 관련 노트 찾기 (선택)

기존 노트에서 관련 항목을 찾으려면:

```bash
{skillsDir}/bibcli/bibcli search "<키워드>" --dir ~/org/bib --limit 5
{skillsDir}/denotecli/denotecli search "<키워드>" --dirs ~/org --limit 5
```

검색 결과의 identifier로 `[[denote:<ID>][<제목>]]` 링크 생성.

## 먼저 찾고, 없으면 생성 (필수!)

**botlog 요청 시 무조건 생성하지 않는다.** 아래 순서를 반드시 따른다:

### Step 1: 기존 노트 검색

```bash
# 제목/태그로 검색
{skillsDir}/denotecli/denotecli search --title "<키워드>" --dirs ~/org/botlog
{skillsDir}/denotecli/denotecli search --tag "<태그>" --dirs ~/org/botlog

# 파일명으로 빠른 확인
ls ~/org/botlog/ | grep -i "<키워드>"
```

### Step 2: 판단

| 상황 | 행동 |
|------|------|
| **관련 노트 있음** | 기존 노트에 히스토리 추가 + 새 헤딩(레벨1)으로 내용 추가 |
| **비슷하지만 다른 주제** | 새 노트 생성 + 기존 노트 링크 |
| **관련 노트 없음** | 새 노트 생성 |

### Step 3: 기존 노트 업데이트 시

1. **히스토리에 엔트리 추가** (역시간순, 맨 위에):
   ```org
   * 히스토리
   - [2026-03-09 Mon 11:40] @pi-claude — <무엇을 추가했는지 한줄>
   - [2026-03-08 Sun 09:12] 생성 — <원래 생성 경위>
   ```

2. **새 헤딩(레벨1)으로 내용 추가** (파일 끝에):
   ```org
   * 새 주제 제목 :LLMLOG:

   <본문>
   ```

3. **filetags 확장** (필요 시): 새 태그 추가, 파일명도 동기화

이 규칙의 목적: **하나의 주제가 여러 노트에 분산되지 않고, 하나의 노트에서 시간순으로 성장한다.**

## 출력 예시

```org
#+title:      다리오-아모데이-니킬-카마스-대담-AI-사회-준비
#+date:       [2026-02-27 Fri 03:18]
#+filetags:   :ai:anthropic:botlog:guru:safety:society:
#+identifier: 20260227T031800
#+export_file_name: 20260227T031800.md
#+OPTIONS: toc:1

* 히스토리
- [2026-02-27 Fri 03:18] 생성 — Amodei x Kamath 유튜브 대담 요약

* 다리오 아모데이 × 니킬 카마스 대담 :LLMLOG:

"The AI Tsunami is Here & Society Isn't Ready" — People by WTF 팟캐스트.

** 핵심 주제

...본문...

** 관련 노트

- [[denote:20260223T000000][2026-02-23]] — 주간 저널
- [[denote:20241208T120006][다리오아모데이 앤트로픽 인공지능미래]]
```

## 어젠다 스탬프 (필수)

botlog 작성 후 반드시 agenda 스킬로 스탬프를 찍는다:

```bash
{skillsDir}/agenda/scripts/agenda-stamp.sh "botlog 작성: <제목 요약>" "botlog:<주요태그>"
```

이것을 빠뜨리면 org-agenda에서 에이전트 활동이 보이지 않는다.

## 주의사항

- **~/org/botlog/** 경로에만 저장 (다른 org 디렉토리 건드리지 않음)
- 저널 파일은 **읽기만** — 저널 수정은 punchout 스킬 또는 사용자가 직접
- org 파일이므로 **plain text + org 문법만** 사용
- 에이전트 응답: "노트 생성 완료" + 파일명 + 한줄 요약
- 기존 노트 수정 시 히스토리에 수정 이력 추가
