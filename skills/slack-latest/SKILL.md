---
name: slack-latest
description: Gather recent Slack messages, read threads, send replies, and upload/download files. Use when the user asks about Slack activity or wants to interact with Slack.
---

# Slack: gather, read, send, file upload/download

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

## Send (text, file, or both)

`send` 는 텍스트만 / 파일만 / 텍스트+파일 첨부 모두 지원. 스레드 답글도 가능.

```bash
# 텍스트만 (chat.postMessage)
python3 {baseDir}/slack.py send --channel C0123456789 --text "Hello"

# 스레드 답글
python3 {baseDir}/slack.py send --channel C0123456789 \
  --thread-ts 1700000000.000001 --text "Got it"

# 파일만 업로드 (files.upload v2 — getUploadURLExternal + complete)
python3 {baseDir}/slack.py send --channel D09336BAYF7 \
  --file ~/Documents/report.pdf

# 파일 + 메시지 (--text 가 initial_comment 로 들어감)
python3 {baseDir}/slack.py send --channel D09336BAYF7 \
  --file ~/report.pdf \
  --text "이사님, 검토 요청드립니다."

# 스레드 안에 파일 첨부
python3 {baseDir}/slack.py send --channel C0123456789 \
  --thread-ts 1700000000.000001 \
  --file ~/snapshot.png --text "방금 캡쳐"
```

옵션:

| Flag | Description |
|------|-------------|
| `--channel` | Channel/DM ID (required) |
| `--text` | 메시지 본문. `--file` 과 함께 쓰면 첨부 코멘트로 들어감 |
| `--file` | 업로드할 파일 경로 |
| `--title` | 파일 제목 (기본: 파일명). `--file` 없으면 무시 |
| `--thread-ts` | 스레드 답글 timestamp |

`--text` 와 `--file` 둘 다 비어 있으면 에러.

## Download a file

```bash
# 파일 ID 로 다운로드 (현재 디렉토리에 원본 파일명으로 저장)
python3 {baseDir}/slack.py get-file --file-id F0B529622S3

# Permalink URL 로도 가능 (URL 안에서 F<ID> 자동 추출)
python3 {baseDir}/slack.py get-file \
  --url "https://team.slack.com/files/U092.../F0B5.../report.doc"

# 출력 경로/디렉토리 지정
python3 {baseDir}/slack.py get-file --file-id F0B529622S3 --out /tmp/report.doc
python3 {baseDir}/slack.py get-file --file-id F0B529622S3 --out ~/Downloads/
```

파일 ID 는 `gather --include-ids` 결과의 메시지에 보이는 `files[].id`, 또는
업로드 후 응답의 `permalink` URL 에서 얻을 수 있다.

## 에이전트 규칙

1. **DM은 기본 제외**: gather 시 항상 `--no-dm` 사용. 사용자가 명시적으로 DM 요청 시에만 생략
2. **메시지/파일 전송 전 확인**: `send` 실행 전 반드시 사용자 확인 (파일 첨부도 동일)
3. **다운로드 파일 위치 보고**: `get-file` 결과의 `saved` 경로를 사용자에게 알림
4. **개인정보 주의**: 수집된 메시지와 다운로드한 파일을 외부에 노출하지 않음
