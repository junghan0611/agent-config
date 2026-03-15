#!/usr/bin/env bash
# agenda-stamp.sh — reverse datetree에 타임스탬프 엔트리 추가
# Usage: agenda-stamp.sh "설명" [tag1:tag2] [device]
set -euo pipefail

DESC="${1:?Usage: agenda-stamp.sh \"설명\" [tag1:tag2] [device]}"
TAGS="${2:-}"
DEVICE="${3:-$(cat ~/.current-device 2>/dev/null || echo 'unknown')}"

ORG_DIR="${HOME}/org/botlog/agenda"
TIMESTAMP=$(TZ='Asia/Seoul' date '+%Y-%m-%d %a %H:%M')
YEAR=$(TZ='Asia/Seoul' date '+%Y')
MONTH_NUM=$(TZ='Asia/Seoul' date '+%m')
MONTH_NAME=$(TZ='Asia/Seoul' date '+%B')
DAY_ENTRY=$(TZ='Asia/Seoul' date '+%Y-%m-%d %A')

# agenda 파일 찾기: __<device>_agenda.org
AGENDA_FILE=$(find "$ORG_DIR" -name "*__agenda_${DEVICE}.org" -type f 2>/dev/null | head -1)

if [ -z "$AGENDA_FILE" ]; then
  # 파일 없으면 생성
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

# 태그 검증: [a-z0-9]만 허용, 하이픈/밑줄 불허
ORG_TAGS=""
if [ -n "$TAGS" ]; then
  VALIDATED=""
  IFS=':' read -ra TAG_ARRAY <<< "$TAGS"
  for tag in "${TAG_ARRAY[@]}"; do
    [ -z "$tag" ] && continue
    if echo "$tag" | grep -qP '[^a-z0-9]'; then
      echo "WARNING: invalid tag '$tag' (only [a-z0-9] allowed, no - or _). Skipping." >&2
      continue
    fi
    [ -n "$VALIDATED" ] && VALIDATED="${VALIDATED}:${tag}" || VALIDATED="$tag"
  done
  [ -n "$VALIDATED" ] && ORG_TAGS=" :${VALIDATED}:"
fi

# 삽입할 엔트리: 헤딩 + 본문 타임스탬프 (org 표준)
ENTRY="**** ${DESC}${ORG_TAGS}\n<${TIMESTAMP}>"

# reverse datetree: 연도 > 월 > 일 헤딩 찾기/생성 후 삽입
# python으로 처리 (org 파싱이 복잡하므로)
python3 << PYEOF
import re, sys

agenda_file = "${AGENDA_FILE}"
year = "${YEAR}"
month = "${YEAR}-${MONTH_NUM} ${MONTH_NAME}"
day = "${DAY_ENTRY}"
entry = "${ENTRY}"

with open(agenda_file, 'r') as f:
    content = f.read()

lines = content.split('\n')

# 헤더(#+로 시작하는 줄) 끝 찾기
header_end = 0
for i, line in enumerate(lines):
    if line.startswith('#+') or line.strip() == '':
        header_end = i + 1
    else:
        break

body = lines[header_end:]
header = lines[:header_end]

# 연도 헤딩 찾기
year_heading = f"* {year}"
year_idx = None
for i, line in enumerate(body):
    if line.strip() == year_heading:
        year_idx = i
        break

if year_idx is None:
    # reverse: 연도를 맨 앞에 추가
    body.insert(0, year_heading)
    year_idx = 0

# 월 헤딩 찾기 (연도 아래)
month_heading = f"** {month}"
month_idx = None
search_start = year_idx + 1
for i in range(search_start, len(body)):
    if body[i].startswith('* ') and body[i] != year_heading:
        break  # 다른 연도
    if body[i].strip() == month_heading:
        month_idx = i
        break

if month_idx is None:
    # reverse: 연도 바로 다음에 월 추가
    body.insert(year_idx + 1, month_heading)
    month_idx = year_idx + 1

# 일 헤딩 찾기 (월 아래)
day_heading = f"*** {day}"
day_idx = None
search_start = month_idx + 1
for i in range(search_start, len(body)):
    if body[i].startswith('* ') or body[i].startswith('** '):
        break  # 다른 월/연도
    if body[i].strip() == day_heading:
        day_idx = i
        break

if day_idx is None:
    # reverse: 월 바로 다음에 일 추가
    body.insert(month_idx + 1, day_heading)
    day_idx = month_idx + 1

# 엔트리 삽입: 일 헤딩 바로 다음 (여러 줄 지원)
for j, eline in enumerate(entry.split('\\n')):
    body.insert(day_idx + 1 + j, eline)

# 재조립
result = '\n'.join(header + body)
with open(agenda_file, 'w') as f:
    f.write(result)

print(f"Stamped: {entry}")
PYEOF
