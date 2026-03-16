#!/usr/bin/env bash
# agenda-stamp.sh — reverse datetree에 타임스탬프 엔트리 추가
#
# Usage:
#   agenda-stamp.sh "제목" [tag1:tag2] [device]
#   agenda-stamp.sh "제목" [tag1:tag2] [device] --body "본문 내용"
#   agenda-stamp.sh "제목" [tag1:tag2] [device] --body-file /tmp/body.txt
#
# 본문은 타임스탬프 아래에 들어감:
#   **** 제목 :tag1:tag2:
#   <2026-03-16 Mon 11:29>
#   본문 내용 (여러 줄 가능)
set -euo pipefail

DESC="${1:?Usage: agenda-stamp.sh \"제목\" [tag1:tag2] [device] [--body \"...\"|--body-file path]}"
TAGS="${2:-}"
DEVICE="${3:-$(cat ~/.current-device 2>/dev/null || echo 'unknown')}"

# --body or --body-file 파싱
BODY=""
shift 3 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --body) BODY="$2"; shift 2 ;;
    --body-file) BODY="$(cat "$2")"; shift 2 ;;
    *) shift ;;
  esac
done

ORG_DIR="${HOME}/org/botlog/agenda"
TIMESTAMP=$(TZ='Asia/Seoul' date '+%Y-%m-%d %a %H:%M')
YEAR=$(TZ='Asia/Seoul' date '+%Y')
MONTH_NUM=$(TZ='Asia/Seoul' date '+%m')
MONTH_NAME=$(TZ='Asia/Seoul' date '+%B')
DAY_ENTRY=$(TZ='Asia/Seoul' date '+%Y-%m-%d %A')

# agenda 파일 찾기
AGENDA_FILE=$(find "$ORG_DIR" -name "*__agenda_${DEVICE}.org" -type f 2>/dev/null | head -1)

if [ -z "$AGENDA_FILE" ]; then
  ID=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
  AGENDA_FILE="${ORG_DIR}/${ID}--agent-agenda__agenda_${DEVICE}.org"
  cat > "$AGENDA_FILE" << EOF
#+title:      agent-agenda
#+date:       [${TIMESTAMP}]
#+filetags:   :${DEVICE}:agenda:
#+identifier: ${ID}
#+export_file_name: ${ID}.md
#+category:   Agent

EOF
  echo "Created: ${AGENDA_FILE}" >&2
fi

# 태그 검증
ORG_TAGS=""
if [ -n "$TAGS" ]; then
  VALIDATED=""
  IFS=':' read -ra TAG_ARRAY <<< "$TAGS"
  for tag in "${TAG_ARRAY[@]}"; do
    [ -z "$tag" ] && continue
    if echo "$tag" | grep -qP '[^a-z0-9]'; then
      echo "WARNING: invalid tag '$tag'. Skipping." >&2
      continue
    fi
    [ -n "$VALIDATED" ] && VALIDATED="${VALIDATED}:${tag}" || VALIDATED="$tag"
  done
  [ -n "$VALIDATED" ] && ORG_TAGS=" :${VALIDATED}:"
fi

# from 식별자 자동 생성 — agent@device
AGENT="${AGENT_ID:-pi}"
FROM="${AGENT}@${DEVICE}"

# 엔트리를 임시 파일로 (멀티라인 안전)
ENTRY_FILE=$(mktemp)
echo "**** ${DESC}${ORG_TAGS}" > "$ENTRY_FILE"
echo "<${TIMESTAMP}>" >> "$ENTRY_FILE"
echo "from: ${FROM}" >> "$ENTRY_FILE"
if [ -n "$BODY" ]; then
  echo "$BODY" >> "$ENTRY_FILE"
fi

# python으로 reverse datetree 삽입
export _AG_FILE="$AGENDA_FILE" _AG_YEAR="$YEAR" _AG_MNUM="$MONTH_NUM" _AG_MNAME="$MONTH_NAME" _AG_DAY="$DAY_ENTRY" _AG_ENTRY="$ENTRY_FILE"
python3 << 'PYEOF'
import os

agenda_file = os.environ['_AG_FILE']
year = os.environ['_AG_YEAR']
month_num = os.environ['_AG_MNUM']
month_name = os.environ['_AG_MNAME']
day_entry = os.environ['_AG_DAY']
entry_file = os.environ['_AG_ENTRY']

with open(entry_file, 'r') as f:
    entry_lines = f.read().rstrip('\n').split('\n')

with open(agenda_file, 'r') as f:
    content = f.read()

lines = content.split('\n')

# 헤더 끝 찾기
header_end = 0
for i, line in enumerate(lines):
    if line.startswith('#+') or line.strip() == '':
        header_end = i + 1
    else:
        break

body = lines[header_end:]
header = lines[:header_end]

year_heading = f"* {year}"
month_heading = f"** {year}-{month_num} {month_name}"
day_heading = f"*** {day_entry}"

# 연도 찾기/생성
year_idx = None
for i, line in enumerate(body):
    if line.strip() == year_heading:
        year_idx = i
        break
if year_idx is None:
    body.insert(0, year_heading)
    year_idx = 0

# 월 찾기/생성
month_idx = None
for i in range(year_idx + 1, len(body)):
    if body[i].startswith('* ') and body[i] != year_heading:
        break
    if body[i].strip() == month_heading:
        month_idx = i
        break
if month_idx is None:
    body.insert(year_idx + 1, month_heading)
    month_idx = year_idx + 1

# 일 찾기/생성
day_idx = None
for i in range(month_idx + 1, len(body)):
    if body[i].startswith('* ') or body[i].startswith('** '):
        break
    if body[i].strip() == day_heading:
        day_idx = i
        break
if day_idx is None:
    body.insert(month_idx + 1, day_heading)
    day_idx = month_idx + 1

# 엔트리 삽입 (일 헤딩 바로 다음)
for j, eline in enumerate(entry_lines):
    body.insert(day_idx + 1 + j, eline)

result = '\n'.join(header + body)
with open(agenda_file, 'w') as f:
    f.write(result)

# 첫 줄만 출력
print(f"Stamped: {entry_lines[0]}")
print(entry_lines[1])

os.unlink(entry_file)
PYEOF
