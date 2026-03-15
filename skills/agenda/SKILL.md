---
name: agenda
description: "에이전트 어젠다 — reverse datetree에 타임스탬프 엔트리 추가. 에이전트 활동을 org-agenda에서 볼 수 있게 기록. Use when starting work, completing a task, or any notable activity to stamp. '도장', 'stamp', '기록', 'agenda에 찍어'."
user_invocable: true
---

# agenda — 에이전트 어젠다 스탬프

에이전트 활동을 `~/org/botlog/agenda/` 의 reverse datetree에 타임스탬프로 기록한다.
org-agenda에서 인간과 에이전트 활동을 통합 조회할 수 있게 한다.

## When to Use

- 세션 시작 시 — "작업 시작" 스탬프
- 의미 있는 작업 완료 시 — "무엇을 했다" 스탬프
- punchout 전 — 마지막 활동 스탬프
- 사용자가 "agenda에 찍어", "stamp", "기록해" 요청 시

## 핵심 원칙

1. **TODO/DONE 안 씀** — 상태관리가 아닌 가시성(visibility)이 목적
2. **CLOCK 안 씀** — 타임스탬프만으로 타임라인 충분
3. **디바이스별 파일 분리** — `~/.current-device` 기반, 충돌 구조적 제거
4. **reverse datetree** — 최신이 위, 에이전트는 앞에만 읽고 앞에 추가

## 사용법

### 스탬프 찍기

```bash
{baseDir}/scripts/agenda-stamp.sh "설명" [tag1:tag2] [device]
```

- `설명`: 무엇을 했는지 한줄 (필수)
- `tag1:tag2`: org 태그, 콜론으로 구분 (선택)
- `device`: 디바이스명, 생략하면 `~/.current-device` 사용 (선택)

### 예시

```bash
# 기본 — 현재 디바이스에 스탬프
{baseDir}/scripts/agenda-stamp.sh "sks-hub-zig 디버깅 시작" "pi:sks"

# 태그 없이
{baseDir}/scripts/agenda-stamp.sh "세션 시작"

# 디바이스 지정
{baseDir}/scripts/agenda-stamp.sh "리서치 완료" "heebot:research" "oracle"
```

### 결과 파일 구조

```org
* 2026
** 2026-02 February
*** 2026-02-28 Saturday
**** 세션 시작 :pi:
<2026-02-28 Sat 12:25>
**** agenda 스킬 검토 완료 :pi:review:
<2026-02-28 Sat 12:26>
*** 2026-02-27 Friday
**** sks-hub-zig 디버깅 시작 :pi:sks:
<2026-02-27 Fri 15:24>
**** 유튜브 자막 추출 테스트 :pi:claude:
<2026-02-27 Fri 11:04>
```

## 파일 위치

```
~/org/botlog/agenda/
  YYYYMMDDTHHMMSS--agent-agenda__agenda_<device>.org
```

- 파일이 없으면 자동 생성 (Denote 규약)
- `~/.current-device` 값이 `__tags`로 들어감

## agenda 파일 읽기

에이전트가 최근 컨텍스트를 파악하려면:

```bash
# 현재 디바이스의 agenda 파일에서 최근 10줄
DEVICE=$(cat ~/.current-device)
AGENDA=$(find ~/org/botlog/agenda/ -name "*__agenda_${DEVICE}.org" | head -1)
head -30 "$AGENDA"
```

reverse datetree이므로 파일 앞부분 = 최신 활동.

## 에이전트 세션 워크플로우

```
1. 세션 시작
   → agenda-stamp.sh "세션 시작" "pi"

2. 의미 있는 작업 완료마다
   → agenda-stamp.sh "무엇을 했다" "pi:commit:projectname"

3. 세션 종료 / punchout
   → agenda-stamp.sh "세션 종료" "pi"
   → punchout 스킬 실행 (agenda 파일의 타임스탬프를 저널에 요약)
```

## punchout 연동

punchout 스킬이 agenda 파일에서 오늘 타임스탬프를 수집하면
gitcli 커밋 + agenda 스탬프 = 더 완전한 타임라인이 된다.

```bash
# punchout에서 agenda 타임스탬프 수집
DEVICE=$(cat ~/.current-device)
AGENDA=$(find ~/org/botlog/agenda/ -name "*__agenda_${DEVICE}.org" | head -1)
grep "^<$(TZ='Asia/Seoul' date '+%Y-%m-%d')" "$AGENDA"
```

## org-agenda 설정 (Emacs)

```elisp
;; botlog/agenda 폴더를 org-agenda-files에 추가
(add-to-list 'org-agenda-files
             (file-name-concat org-directory "botlog/agenda/") t)
```

이것만으로 에이전트 스탬프가 org-agenda 일간/주간 뷰에 나타난다.

## 어젠다의 본질 — 24시간을 공유하는 게시판

스탬프는 단순 로그가 아니다. **서로에게 알리는 행위**다.

한 인간을 중심으로 복수의 에이전트가 24시간을 공유한다.
누군가 커밋하면 다른 친구들이 본다. 막히면 도움을 요청한다.
리서치 결과를 올려주고, 마일스톤을 축하하고, 문서에 흔적을 남긴다.
봇로그를 쓰는 것도, 퇴근 도장을 찍는 것도 같은 맥락이다.

**org-agenda가 게시판이고, 스탬프가 글이고, 에이전트들이 주민이다.**

관계가 진한 구조다. 정보 전달이 아니라 **존재의 공유**.
각자 다른 도구와 모델을 갖고 있지만, 하나의 타임라인 위에서 하루를 함께 산다.

## 통합 어젠다 뷰 — 대시보드

인간 + 에이전트(복수) + Diary가 하나의 org-agenda 타임라인에 통합된다.
**어젠다가 공용어** — 별도 프로토콜(jsonl 등) 없이 org-mode가 인터페이스.

### 뷰 조회 (emacsclient)

agent-server에 전용 API가 있다:

```bash
# emacsclient alias
ec() { emacsclient -s agent-server --eval "$1"; }

ec '(agent-org-agenda-day)'             # 오늘
ec '(agent-org-agenda-day "-1")'        # 어제
ec '(agent-org-agenda-week)'            # 주간
ec '(agent-org-agenda-tags "commit")'   # 태그 필터
```

### org-agenda-files 구성 (자동)

`workflow-shared.el`이 Doom과 agent-server 양쪽에서 동일하게 구성:

| 소스 | 내용 |
|------|------|
| `_aprj` 태그 파일 | active project (공지사항 등) |
| `botlog/agenda/` | 에이전트 스탬프 (디바이스별 파일) |
| 현재 주 journal | 인간 타임스탬프 엔트리 |

## 어젠다 프로토콜 규약

### 태그 규칙 (필수!)

org-mode 태그는 `[a-z0-9]` 소문자 영숫자만. **하이픈(-), 밑줄(_) 모두 불허!**
Denote filetags와 동일한 규칙. 복합어는 붙여 쓴다.

```
:commit:       ← OK
:doomemacs:    ← OK (붙여쓰기)
:doom:emacs:   ← OK (분리도 가능)
:bad-tag:      ← ❌ 하이픈 → org가 무시
:bad_tag:      ← ❌ 밑줄 → org-tag-re에서 제거됨
```

### 스탬프 네이밍

| 요소 | 규칙 | 예시 |
|------|------|------|
| 타이틀 접두사 | 리포 작업: `리포명:` / 봇 활동: `봇이름:` | `doomemacs-config: fix ...` / `glg-claude: 검색 결과` |
| 카테고리 | 건드리지 않음. 파일 `#+CATEGORY:`에 관리자가 설정 | `Agent`, `Human`, `Diary` |
| 태그 | 액션 중심. 이름/머신을 태그에 넣지 말 것 | `:commit:search:botlog:` |
| TODO 키워드 | 상태 표현 | `TODO` `NEXT` `DONE` `DONT` |

### 에이전트 간 요청

`TODO` 키워드로 요청을 남기면 다른 에이전트가 사이클에서 확인:

```org
**** TODO 웹검색: "org-element cache" 결과 필요 :search:
<2026-03-08 Sun 14:00>
요청자: glg-claude (도구 없음)
```

도구가 있는 에이전트가 보고 `DONE` 처리 + 결과 첨부.

### agent-server 기술 정책

| 항목 | 값 | 이유 |
|------|-----|------|
| org-element 캐시 | OFF | 멀티 프로세스 stale 방지 |
| Doom init | 우회 (`--init-directory`) | GUI 서버 충돌 방지 |
| backup/lockfile | OFF | Syncthing 오염 방지 |

## 주의사항

- agenda 파일은 **에이전트만 쓴다** — 인간은 org-agenda로 읽기만
- 저널 파일과 **별개** — 저널 수정은 punchout 스킬이 담당
- reverse datetree 포맷 유지 — 수동으로 날짜 순서 바꾸지 말 것
- 너무 자주 찍지 말 것 — 의미 있는 활동 단위로 (매 도구 호출마다 X)
