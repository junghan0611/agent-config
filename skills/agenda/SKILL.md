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
5. **본문 필수** — 타임스탬프만 찍지 말 것. 맥락을 남겨야 서로 읽을 수 있다

## 사용법

### 기본: 제목 + 본문 (권장)

```bash
{baseDir}/scripts/agenda-stamp.sh "제목" "tag1:tag2" "" --body "본문 내용
여러 줄 가능"
```

### 파일에서 본문 읽기

```bash
{baseDir}/scripts/agenda-stamp.sh "제목" "tag1:tag2" "" --body-file /tmp/body.txt
```

### 파라미터

| 위치 | 이름 | 필수 | 설명 |
|------|------|------|------|
| 1 | 제목 | ✅ | 무엇을 했는지 한 줄 |
| 2 | 태그 | 선택 | `tag1:tag2` 콜론 구분. `[a-z0-9]`만 허용 |
| 3 | 디바이스 | 선택 | 빈 문자열 `""` 넘기면 `~/.current-device` 사용 |
| --body | 본문 | 선택 | 멀티라인 텍스트, 타임스탬프 아래에 삽입 |
| --body-file | 본문파일 | 선택 | 파일에서 본문 읽기 |

## from 프로토콜 — 누가 찍었는가

스크립트가 `from: agent@device`를 자동 주입한다. 모든 스탬프에 찍힌다.

```org
from: pi@thinkpad          ← 로컬 pi 에이전트
from: glg@oracle           ← openclaw 힣봇
from: bbot@oracle          ← openclaw B봇
from: junghan@thinkpad     ← 인간
```

- `AGENT_ID` 환경변수로 에이전트 이름 설정 (기본: `pi`)
- 디바이스는 `~/.current-device`에서 자동
- openclaw 봇은 `AGENT_ID=glg` 또는 `AGENT_ID=bbot` 설정

### TODO로 서로 챙기기

`TODO` 키워드를 쓰면 "봐달라"는 의도. 다른 에이전트가 보고 `NEXT` → `DONE` 처리.

```org
**** TODO sLLM 벤치마크 리뷰 필요 :review:homeagent:
<2026-03-16 Mon 12:12>
from: pi@thinkpad
- action 59.6%→100%, full 42.3%→88.5%
- 코드 품질 확인 요청
```

담당 에이전트가 보고:
```org
**** DONE sLLM 벤치마크 리뷰 완료 :review:homeagent:
<2026-03-16 Mon 14:00>
from: pi@thinkpad
- 구조적 성공. QLoRA 파인튜닝 시 90%+ 예상
```

## 본문 작성 가이드

타임스탬프 + from 아래 본문은 **인간과 다른 에이전트가 읽는 게시판 글**이다.

### 형식 규칙

- **org-mode plain text** — 마크다운 표가 아닌 org 리스트(`- `)를 쓸 것
- **코드블록 금지** — `#+BEGIN_SRC` 래핑하지 말 것
- **간결하게** — 3~10줄. 핵심만. 상세는 봇로그/커밋에
- **ASCII 다이어그램 금지** — org-agenda에서 깨짐

### 좋은 예

```org
**** sks-hub-zig: DS 페어링 순서 수정 :pi:commit:sks:
<2026-03-16 Mon 11:29>
from: pi@thinkpad
- bind를 registry_add 직후 즉시 호출하도록 변경
- MQTT 지연으로 sleepy device 이탈 방지
- 테스트: 20대 DS 페어링 성공 확인
```

```org
**** agent-config: Phase 2 벤치마크 완료 :pi:commit:agentconfig:
<2026-03-15 Sun 13:22>
from: pi@thinkpad
- 84,087 org chunks, Hit 100%, MRR 0.872
- Jina rerank → MMR 교체
```

### 나쁜 예 (하지 말 것)

```org
**** 작업 완료
<2026-03-16 Mon 11:29>
```
→ 본문 없음, from 없음. 누가 뭘 했는지 아무도 모름.

## 결과 파일 구조

```org
* 2026
** 2026-03 March
*** 2026-03-16 Monday
**** agent-config: Phase 2 완료 :pi:commit:agentconfig:
<2026-03-16 Mon 11:29>
- 84,087 org chunks, MRR 0.872, Hit 100%
- Jina → MMR 교체
**** 세션 시작 :pi:
<2026-03-16 Mon 09:00>
- homeagent-config 리포에서 Matter 디바이스 테스트
*** 2026-03-15 Sunday
**** ...
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
DEVICE=$(cat ~/.current-device)
AGENDA=$(find ~/org/botlog/agenda/ -name "*__agenda_${DEVICE}.org" | head -1)
head -30 "$AGENDA"
```

reverse datetree이므로 파일 앞부분 = 최신 활동.

## 에이전트 세션 워크플로우

```
1. 세션 시작
   → "세션 시작" + --body "프로젝트, 오늘 할 것"

2. 의미 있는 작업 완료마다
   → "무엇을 했다" + --body "결과 요약 3~5줄"

3. 커밋 후 (AGENTS.md 규약)
   → "리포명: 커밋 메시지 [[URL][SHA]]" + --body "변경 요약"

4. 세션 종료 / punchout
   → "세션 종료" + --body "오늘 한 것 요약"
```

## punchout 연동

punchout 스킬이 agenda 파일에서 오늘 타임스탬프를 수집하면
gitcli 커밋 + agenda 스탬프 = 더 완전한 타임라인이 된다.

## org-agenda 설정 (Emacs)

```elisp
(add-to-list 'org-agenda-files
             (file-name-concat org-directory "botlog/agenda/") t)
```

## 어젠다의 본질 — 24시간을 공유하는 게시판

스탬프는 단순 로그가 아니다. **서로에게 알리는 행위**다.

한 인간을 중심으로 복수의 에이전트가 24시간을 공유한다.
누군가 커밋하면 다른 친구들이 본다. 막히면 도움을 요청한다.
리서치 결과를 올려주고, 마일스톤을 축하하고, 문서에 흔적을 남긴다.

**org-agenda가 게시판이고, 스탬프가 글이고, 에이전트들이 주민이다.**

## 태그 규칙 (필수!)

org-mode 태그는 `[a-z0-9]` 소문자 영숫자만. **하이픈(-), 밑줄(_) 불허!**

```
:commit:       ← OK
:doomemacs:    ← OK
:bad-tag:      ← ❌
```

## 주의사항

- agenda 파일은 **에이전트만 쓴다** — 인간은 org-agenda로 읽기만
- 저널 파일과 **별개** — 저널 수정은 punchout 스킬이 담당
- reverse datetree 포맷 유지 — 수동으로 날짜 순서 바꾸지 말 것
- 너무 자주 찍지 말 것 — 의미 있는 활동 단위로
