---
description: 가든 노트 형식 일관성 수선(mend) 한 판 — 기존 ~/org/ 노트를 PROTOCOL canonical shape에 맞춘다. 섹션(히스토리/관련메타/관련노트) 통일·얼굴(title/filetags/description/abstract) 정비·denote front-matter rename·보존(ID/역링크/히스토리). 코드로 기계식 일괄치환을 하는 게 아니라 에이전트가 읽고 판단해 고친다. 여러 분신을 불러 '10개씩' 병렬로 돌려도 엇나가지 않게 하는 공유 규율. botlog이 노트를 *만드는* 포매팅이면 mend는 기존 노트를 *맞추는* 포매팅.
argument-hint: "[노트 ID/경로/검색쿼리/배치 — 비우면 detect로 후보 추출]"
---
You are entering **mend / 가든 수선** mode.

User-supplied target (optional): $ARGUMENTS

`~/org/` 기존 노트의 **형식 일관성을 수선**하는 한 판. 새 노트를 만들지 않는다(그건 `botlog`).
이 모드는 **문서를 만드는 게 목적이 아니다.** 산출물은 노트가 아니라, 가든 전체의 일관성·연결성·검색성이 올라간 상태다.

Mental model: **detect는 규칙으로, 수선은 판단으로.** grep으로 위반 *후보*를 뽑는 건 기계가, 실제 고침은 에이전트가 노트를 읽고 한다. 기계식 일괄 치환은 가든을 망친다.

## 왜 수선하는가

- 가든의 정체성은 **밀도 + 연결성**이다. 에이전트에게는 여기에 **일관성 + 통일성**이 더해진다.
- 형식이 일관되면 어떤 에이전트(Claude Code·pi·GPT·Codex 어느 하네스든)든 참고 노트 *하나*만 보고 바로 맥락을 맞춰 글을 담아낸다. 일관성은 그래서 협업 인프라다.
- 수선은 임베딩 품질로 직결된다. 수선하는 만큼 **andenken 임베딩 로직의 코드를 줄이면서 검색 퀄리티를 끌어올린다**. 구조가 약할수록 임베딩에 부담이 가고, 구조를 수선하면 layer 2(meta/dblock graph)가 강해진다.

## SSOT — PROTOCOL.md를 가리킨다, 복붙하지 않는다

규칙의 **근거**는 `~/sync/org/PROTOCOL.md`(= `~/org/PROTOCOL.md`)와 그 디렉토리의 `AGENTS.md`에 있다(SSOT). 이 모드는 그걸 *실행 가능한 수선 절차*로 좁힌 것뿐이다.
규칙이 헷갈리거나 충돌하면 **PROTOCOL을 본다.** 두 곳에 같은 규칙을 복붙하면 언젠가 어긋나므로, 여기엔 핵심 포인터와 절차만 둔다.

핵심 참조:
- canonical shape → PROTOCOL §"Canonical Note Shape" / §"Scaffold Sections Are Structurally Important"
- 태그 규칙 → PROTOCOL §"Tagging Rules"
- rename / 구조 편집 → PROTOCOL §"Structural Editing Rules"
- 멀티에이전트 안전 → PROTOCOL §"External Bot Edits and Integrity Boundary"
- 개념 자석(가든 어휘) → `meta/20241126T053758--†-수선-정비-유지보수-일관성` (수선의 *개념*: 왜·경계·원칙). 이 모드는 그 meta의 어휘를 projection한다.

## Canonical shape (수선 기준)

출판 노트(meta/bib/notes/botlog)의 전형:

```
front matter
#+begin_quote [!abstract] 이 노트에 대하여 … #+end_quote   ← 출판 노트는 front matter 뒤, 첫 헤딩 앞
* 히스토리        ← reverse chronological (API 삽입 친화)
* 관련메타
# #+print_bibliography:
* 관련노트
… 본문 level-1 헤딩 (시간순 누적)
```

- **`히스토리` · `관련메타` · `관련노트`는 고유명사다. 붙여쓴다.** `관련 노트`(띄어쓰기), `History`(영어), `Related-Notes`, level-2(`**`) 강등은 위반 → 통일.
- 이 세 scaffold 섹션은 구조적 지지대지 임베딩 주인공이 아니다. 무한정 부풀리지 않는다.

## 멀티에이전트 규율 — 엇나감 방지 (이 모드의 핵심)

여러 분신이 "10개씩" 병렬로 돌 때 가든이 깨지지 않게 하는 계약. PROTOCOL §External Bot Edits 기반.

**절대 보존 (건드리면 가든이 깨진다):**
- **Denote ID** = 영속 공개 신원. 절대 바꾸지 않는다. 라디컬하게 바뀌어야 하면 ID 유지 + 내용 refill.
- **역링크 무결성.** rename은 ID 기반이라 역링크는 안 깨진다 — 그것만 지키면 된다. 다른 노트가 단 **표시 텍스트**(`[[denote:ID][옛 제목]]`)는 그 노트의 히스토리다. 자동 교체하지 않는다. 때가 되면 사람이/누군가 고친다.
- **`* 히스토리` 본문.** 각 글의 담금질 기록. 보존하고 *추가만* 한다(reverse, 맨 위에 한 줄).
- **`:ARCHIVE:` 하위.** 사용자가 옮긴 과거 분량. 손대지 않는다.
- **homepage 노트** (`20240906T154822--home-notesjunghanacscom`). 명시 요청 없이는 절대.
- **autholog 본문 voice.** 사용자 1인칭 원석. 일반 설명으로 평탄화 금지.

**규율:**
1. **배치는 작게.** 한 에이전트 = 명확히 분리된 노트 집합(예: 10개). 배치 사이에 사람 리뷰.
2. **rename은 emacs front-matter 기반만.** raw `mv` 금지. title/tag을 바꿨으면 *반드시* rename해 파일명 동기화.
3. **의심나면 멈추고 보고.** 빈 헤딩을 남발해 placeholder를 만들지 않는다. 구조가 진짜 비어 다른 정비가 필요한 노트(예: 세 섹션 전부 없음, 영어 History + 복잡한 구조)는 한 건씩 사람과 본다.
4. **tag 편집만으로 끝내지 않는다.** title·description·meta 배치·dblock·링크 균형.

## 수선 루프

### 1. detect (기계 — grep으로 후보 추출)

```bash
# 섹션 헤딩 현황 (붙여쓰기/영어/누락/레벨 한눈에)
for f in $(ls -t /home/junghan/sync/org/notes/*.org | head -16); do
  printf '=== %s\n' "$(basename "$f")"
  grep -nE '^\*+ (히스토리|History|관련 ?메타|관련 ?노트|Related-?Notes)' "$f" || echo '  (섹션 없음!)'
done

# 띄어쓰기 위반만
grep -rlnE '^\*+ 관련 노트' /home/junghan/sync/org/notes/*.org
```

후보 분류: ① 띄어쓰기/영어/레벨 헤딩(안전·즉시) ② 섹션 누락(판단 필요) ③ 세 섹션 전부 없음/구조 이상(한 건씩 사람과).

### 2. 수선 (에이전트 — 노트를 읽고 판단)

per-note 체크리스트:
- **섹션**: `히스토리`/`관련메타`/`관련노트` 존재 + 붙여쓰기 + level-1. †(meta) 링크가 관련노트에 섞여 있으면 관련메타로 분리. 누락분은 빈 헤딩 남발 대신, *연결할 실제 메타/노트가 있을 때* 채운다.
- **얼굴**: title이 현재 내용을 가리키는가 / filetags(소문자 alnum, 단수, 알파벳순) / description(hugo SEO, abstract와 다른 문장) / abstract(`[!abstract] 이 노트에 대하여`).
- **rename**: title/filetags를 바꿨으면 front-matter rename.
- **보존 확인**: ID·역링크·히스토리·ARCHIVE 그대로인가.

### 3. 검증

rename 후 파일명이 새 title/tag을 반영하는지, 역링크(ID)가 살아있는지 확인.

## emacs API (수선 도구)

```bash
ec() { emacsclient -s server --eval "$1"; }   # 매 bash 호출마다 ec 재정의 (subshell)

# front-matter 기반 rename (denote 표준 정규화 + 파일명 동기화)
ec '(let ((denote-rename-confirmations nil))
      (denote-rename-file-using-front-matter "/home/junghan/org/notes/<현재파일명>.org"))'

# 히스토리/링크 추가 (생성은 botlog, 여기선 보강용)
ec '(agent-denote-add-history "ID" "수선 내용 한 줄")'
ec '(agent-denote-add-link "ID" "TARGET-ID" "link description")'   # DESC 필수, 빠지면 hang
```

- `denote-rename-confirmations`가 `(rewrite-front-matter modify-file-name)`라 대화형 확인을 요구한다 → agent에선 `nil`로 let-bind해 비대화형 실행.
- agent-server 호출 경로는 `~/org/...` 또는 `/home/junghan/org/...` 선호(PROTOCOL §Path Rule). `~/sync/org/...`로 부르지 않는다.
- front matter(title/filetags/description/abstract/hugo_lastmod)와 본문 수선은 직접 편집으로, rename만 emacs로 — 비가시문자(NBSP/ZWSP/BOM/ZWJ) 의심 시 `python3 -c "...repr()"`로 바이트 확인.

## 하지 말 것

- ❌ 빈 `* 관련메타`/`* 관련노트` 헤딩 남발 (placeholder = 수선이 아니라 잡음).
- ❌ 기계식 일괄 정규식 치환으로 본문/구조 건드리기.
- ❌ Denote ID 변경, 역링크 파괴, 히스토리 덮어쓰기, ARCHIVE/homepage 손대기.
- ❌ 표시 텍스트(역링크 라벨) 강제 일괄 교체 — 그건 각 노트의 히스토리다.
- ❌ tag 편집만 하고 title/description/meta/dblock 균형 무시.
- ❌ autholog 1인칭 원석을 매끄러운 3인칭 설명으로 평탄화.

## 출력 모양

- 수선 대상 (경로/ID)
- detect로 잡힌 위반 분류
- 적용한 수선 (per note: 무엇을 어떻게)
- 보존 확인 (ID·역링크·히스토리)
- 다음 후보 1~2개 (과잉 제안 금지)

## 다른 분신에게 위임할 때

`entwurf_send`로 대상 세션에 보낼 때는 막연한 "고쳐라"가 아니라 **이 command(또는 그 경로) + 구체 위반 + 절대보존**을 함께 준다. 그래야 다른 모델·하네스의 분신도 같은 canonical에 수렴한다. (검증됨: 2026-06-15 codex/gpt-5.5 분신이 비둘기 봇로그를 규율대로 수선.)
