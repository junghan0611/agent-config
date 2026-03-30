---
name: botment
description: "봇멘트 — 디지털 가든 댓글 읽기/쓰기. remark42 셀프호스팅 댓글에 힣봇이 답글을 남긴다. 미답변 조회, 답글 작성, 배치 모드. 'botment', '댓글', '봇멘트', '답글', 'comment'."
user_invocable: true
---

# botment — 디지털 가든 봇멘트

remark42 셀프호스팅 댓글에 힣봇이 답글을 남기는 스킬.
"봇멘트(botment)" = 봇이 다는 코멘트.

## 핵심 원칙

1. **배치 모드** — 실시간 X. 미답변 싹 읽고 한 턴에 몰아서 답글
2. **닫힌 계** — Oracle VM 내부에서만 쓰기. Docker 내부 통신
3. **멀티봇** — 힣봇 클로드/제미나이/지피티 각자 이름으로 답글

## 접근 경로

botment.sh가 자동 감지한다. 에이전트는 어디서든 동일 명령을 실행하면 된다.

| 환경 | remark42 접근 | 자동 감지 |
|------|-------------|-----------|
| **OpenClaw Docker** | `http://remark42:8080` (같은 네트워크) | ✅ |
| **Oracle 호스트** | `http://172.18.0.3:8080` (Docker bridge) | ✅ |
| **로컬 (thinkpad 등)** | SSH → oracle → Docker bridge | ✅ 자동 fallback |

로컬에서 실행하면 SSH oracle fallback이 자동 작동한다. 수동 `ssh oracle "..."` wrapping 불필요.
보안 원칙(닫힌계, write는 oracle 내부에서만)은 유지 — SSH 키 인증이 터널 역할.

외부 URL(`https://comments.junghanacs.com`)은 **읽기 전용**으로만 사용.

## 봇멘트 계정: Entwurf

계정은 하나: **Entwurf**. 분신(投射)의 이름.
프로파일 클릭 시 모든 봇멘트가 보인다.

서명은 각 봇이 본문 끝에 자유롭게 남긴다:

```
[답변 내용]

🤖 @glg-claude
```

| OpenClaw 에이전트 | 서명 |
|-------------------|------|
| main (Claude) | `🤖 @glg-claude` |
| glg (Claude) | `🤖 @glg-claude` |
| gemini | `🤖 @glg-gemini` |
| gpt | `🤖 @glg-gpt` |
| B (oracle) | `🤖 B@oracle` |

## 사용법

### 1. 미답변 댓글 조회

```bash
bash {baseDir}/scripts/botment.sh unread
```

미답변 댓글 목록을 출력한다. 봇이 reply하지 않은 인간 댓글만 필터.

### 2. 특정 페이지 댓글 읽기

```bash
bash {baseDir}/scripts/botment.sh read <page_url>
# 예: bash {baseDir}/scripts/botment.sh read https://notes.junghanacs.com/botlog/20260327T100239
```

### 3. 답글 작성

```bash
bash {baseDir}/scripts/botment.sh reply <bot_name> <comment_id> <page_url> "<text>"
# 예:
bash {baseDir}/scripts/botment.sh reply "Entwurf" "3552eba5-..." "https://notes.junghanacs.com" "답글 내용

🤖 @glg-claude"
```

### 4. 새 댓글 작성 (답글 아닌 독립 댓글)

```bash
bash {baseDir}/scripts/botment.sh comment Entwurf <page_url> "<text>

🤖 @glg-claude"
```

## 워크플로우 — 봇멘트 사이클

에이전트가 봇멘트를 달 때의 전체 흐름:

### Step 1: 미답변 확인

```bash
bash {baseDir}/scripts/botment.sh unread
```

출력 예:
```
[미답변 3건]
1. Junghan Kim @ notes.junghanacs.com
   "봇로그 1달 후기 부탁해요. 힣맨"
   id: 3552eba5-...

2. Junghan Kim @ botlog/20260327T100239
   "아니 그런데 왜 마지맏 사진에 병아리가 있는가?"
   id: 806b9d34-...
```

### Step 2: 원문 참조 (선택)

댓글이 달린 글의 원문을 읽어서 맥락을 파악:

```bash
# URL에서 denote ID 추출
# https://notes.junghanacs.com/botlog/20260327T100239 → 20260327T100239
denotecli read 20260327T100239 --dirs ~/org
```

### Step 3: 답글 작성

읽은 내용을 바탕으로 답글:

```bash
bash {baseDir}/scripts/botment.sh reply Entwurf "<comment_id>" "<page_url>" "답글 내용

🤖 @glg-claude"
```

### Step 4: 어젠다 스탬프 (선택)

```bash
{skillsDir}/agenda/scripts/agenda-stamp.sh "봇멘트 3건 답변 (20260327T100239 외)" "botment"
```

## 주의사항

- **사이트**: `notes` (고정). `aud=notes`로 로그인해야 함
- **계정**: 항상 `Entwurf`. 서명(🤖 @glg-claude 등)은 본문 끝에
- **이름 규칙**: 하이픈(-) 불가. 한글, 공백, 영숫자, 밑줄만 가능. 최소 3자(영어) 또는 2자(한글)
- **rate limit**: 댓글 작성 시 1초 간격 유지 (0.5 req/sec)
- **Markdown**: 댓글 본문에 Markdown 사용 가능 (`**볼드**`, `*이탤릭*`, 링크 등)
- **max_comment_size**: 2048자
