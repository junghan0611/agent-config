---
name: telegram
description: "텔레그램 대화 읽기/쓰기 — 힣봇군단(OpenClaw)과의 대화를 사용자 계정으로 직접 접근. 봇 API와 달리 힣이 보낸 메시지도 읽을 수 있다. tdlib 기반. 'telegram', '텔레그램', '힣봇', '대화 읽어', '메시지 보내'."
---

# telegram — 힣봇군단 대화 읽기/쓰기

tdlib(libtdjson.so)로 사용자 계정에 직접 접근한다.
봇 API는 힣이 보낸 메시지를 못 읽는다. 이 스킬은 읽을 수 있다.

스크립트: `{baseDir}/scripts/tg.py`

## 최초 설정 (1회)

```bash
python3 {baseDir}/scripts/tg.py auth
```

전화번호 → 인증코드 → 2FA 순서. 세션은 `~/.tg-agent/`에 저장.
telega(Emacs)와 별도 세션이라 충돌 없음.

## 사용법

```bash
# 봇 채팅 목록
python3 {baseDir}/scripts/tg.py list

# 힣봇클로드 최근 대화 읽기
python3 {baseDir}/scripts/tg.py read glg-claude-bot -n 10

# 힣봇GPT에게 메시지 보내기
python3 {baseDir}/scripts/tg.py send glg_gpt_bot "이 코드 리뷰해줘"

# chat ID로 직접 접근
python3 {baseDir}/scripts/tg.py read 123456789 -n 5
```

## 힣봇군단 봇 목록

| 봇 | Username | 모델 |
|---|---|---|
| 힣봇클로드 (glg) | @glg_junghanacs_bot | Claude Opus 4.6 |
| 힣봇GPT | @glg_gpt_bot | GPT-5.4 |
| 힣봇제미나이 | @glg_gemini_bot | Gemini 3.1 Pro |
| 힣봇(기본) | @junghan_openclaw_bot | Claude Opus 4.6 |

## When to Use

- "힣봇클로드한테 뭐라고 했지?" → `tg.py read glg-claude-bot -n 20`
- "힣봇GPT에게 이거 물어봐" → `tg.py send glg_gpt_bot "질문"`
- "어제 텔레그램 대화 확인" → `tg.py read <bot> -n 50`

## 의존성

- `libtdjson.so`: NixOS tdlib 패키지 (telega와 동일, 이미 설치됨)
- Python 3: 표준 라이브러리만 (ctypes, json, argparse)
- 세션: `~/.tg-agent/` (telega `~/.telega/`와 별도)

## 제한

- 최초 1회 대화형 인증 필요 (`tg.py auth`)
- 메시지 전송 시 OpenClaw이 봇으로 응답 (실시간 응답 대기 없음)
- 읽기/쓰기만 지원 (미디어 업로드 미지원)
