---
name: slack-latest
description: Gather recent Slack messages, read threads, and send replies. Use when the user asks about Slack activity or wants to interact with Slack.
---

# Slack: gather recent messages, read threads, reply

`slack.py` is a self-contained Python script (no dependencies beyond
the standard library) at `{baseDir}/slack.py`.

## Authentication

**환경변수 방식** (권장 — `~/.env.local`에 설정):

```bash
export SLACK_WORKSPACE_URL="https://WORKSPACE.slack.com"
export SLACK_TOKEN="xoxc-..."
export SLACK_COOKIE="xoxd-..."
```

환경변수가 없으면 `~/.config/skills/slack-latest/credentials.json` 파일을 읽음.

### 토큰 발급 (브라우저 cURL 복사)

1. Slack **웹 브라우저**에서 F12 → Network 탭
2. 필터에 `api/` 입력 → `*.slack.com/api/` 요청 찾기
3. 우클릭 → **Copy as cURL**
4. 토큰 저장:

```bash
pbpaste | python3 {baseDir}/slack.py auth
```

**토큰 수명:** 브라우저 로그아웃 시 만료. 인증 에러 발생하면 재설정.

검증:

```bash
python3 {baseDir}/slack.py auth-test
```

## Gather recent messages

채널 메시지 수집. **기본적으로 `--no-dm`을 사용**하여 개인 DM을 제외한다.

```bash
# 채널만 (DM 제외) — 기본 사용법
python3 {baseDir}/slack.py gather --days 3 --no-dm --out ~/tmp/slack-recent.json

# DM 포함 (사용자가 명시적으로 요청한 경우만)
python3 {baseDir}/slack.py gather --days 3 --out ~/tmp/slack-recent.json
```

Output: JSON array grouped by channel (most recently active first).

### Options

| Flag | Description |
|------|-------------|
| `--days N` | time window (default: 3) |
| `--no-dm` | **DM/group DM 제외** (채널만) |
| `--max-text N` | truncate message text in chars (default: 500) |
| `--include-ids` | add `_id`, `_uid`, `_ts` for follow-up API calls |
| `--compact` | single-line JSON (saves ~25% size) |
| `--out PATH` | output file path (default: ~/tmp/slack-recent.json) |

### Output format

```json
[
  {
    "channel": "#general",
    "messages": [
      {
        "from": "홍길동", "at": "2026-03-07 12:18 KST",
        "text": "배포 완료했습니다",
        "replies": [
          {"from": "김영희", "at": "2026-03-07 12:20 KST", "text": "확인!"}
        ]
      }
    ]
  }
]
```

- Messages: oldest-first (narrative order)
- Thread replies expanded inline under `replies`
- `older_replies: N` when replies fall outside time window
- Timestamps in KST (UTC+9, suffix `KST`)

## Read a single thread

```bash
python3 {baseDir}/slack.py thread --channel C0123456789 --ts 1700000000.000001
```

## Send a message

```bash
# Send to a channel
python3 {baseDir}/slack.py send --channel C0123456789 --text "Hello"

# Reply in a thread
python3 {baseDir}/slack.py send --channel C0123456789 --thread-ts 1700000000.000001 --text "Got it"
```

## 에이전트 규칙

1. **DM은 기본 제외**: 항상 `--no-dm` 사용. 사용자가 명시적으로 DM 요청 시에만 생략
2. **메시지 전송 전 확인**: `send` 명령 실행 전 반드시 사용자 확인
3. **개인정보 주의**: 수집된 메시지를 외부에 노출하지 않음
