#!/usr/bin/env bash
# botment.sh — remark42 댓글 읽기/쓰기
# 힣봇 생태계 전용. Docker 내부 또는 호스트에서 실행.
# Dev auth로 고정 계정 (이름 = user_id, 프로파일 추적 가능)

set -euo pipefail

# remark42 접근 URL 자동 감지
if curl -s --max-time 1 "http://remark42:8080/api/v1/config?site=notes" &>/dev/null; then
    REMARK_URL="http://remark42:8080"  # Docker 내부
    REMARK_8084="http://remark42:8084" # Dev auth OAuth 서버
elif curl -s --max-time 1 "http://172.18.0.3:8080/api/v1/config?site=notes" &>/dev/null; then
    REMARK_URL="http://172.18.0.3:8080"  # 호스트
    REMARK_8084="http://172.18.0.3:8084"
else
    echo "ERROR: remark42에 접근할 수 없습니다 (Docker 내부 또는 호스트에서만 실행)" >&2
    exit 1
fi

SITE="notes"

usage() {
    echo "Usage: botment.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  unread                              미답변 댓글 조회"
    echo "  read <page_url>                     특정 페이지 댓글 읽기"
    echo "  list                                댓글 있는 페이지 목록"
    echo "  reply <bot> <cid> <url> <text>      답글 작성"
    echo "  comment <bot> <url> <text>          독립 댓글 작성"
    echo ""
    echo "Bot names: 힣봇에이전트, 힣봇클로드, 힣봇제미나이, 힣봇지피티"
}

# 댓글 있는 페이지 목록
cmd_list() {
    curl -s --max-time 10 "${REMARK_URL}/api/v1/list?site=${SITE}&limit=100" | python3 -c "
import sys, json
data = json.load(sys.stdin)
total = sum(c.get('count',0) for c in data)
print(f'[{len(data)}개 페이지, 총 {total}개 댓글]')
for p in sorted(data, key=lambda x: x.get('last_time',''), reverse=True):
    url = p['url'].replace('https://notes.junghanacs.com', '')
    if not url: url = '/'
    print(f\"  {p['count']}개 | {url}\")
"
}

# 미답변 댓글 조회
cmd_unread() {
    curl -s --max-time 10 "${REMARK_URL}/api/v1/find?site=${SITE}&sort=-time&limit=100" | python3 -c "
import sys, json
data = json.load(sys.stdin)
comments = data.get('comments', [])

# 봇 계정 판별: Dev auth(id에 _ 없음) 또는 이름에 '힣봇' 포함
def is_bot(c):
    uid = c['user']['id']
    name = c['user']['name']
    # Dev auth: id = 이름 그대로 (anonymous_xxx, google_xxx, github_xxx가 아님)
    if '_' not in uid:
        return True
    # Anonymous 시절 봇멘트 (레거시)
    if '힣봇' in name:
        return True
    return False

# 봇 답변 수집 (pid = 부모 댓글 ID)
bot_replied = set()
for c in comments:
    if is_bot(c) and c.get('pid'):
        bot_replied.add(c['pid'])

# 미답변 = 봇이 아닌 댓글 중 봇이 답하지 않은 것
unanswered = []
for c in comments:
    if not is_bot(c) and c['id'] not in bot_replied:
        unanswered.append(c)

if not unanswered:
    print('[미답변 없음]')
    sys.exit(0)

print(f'[미답변 {len(unanswered)}건]')
for i, c in enumerate(unanswered, 1):
    url = c['locator']['url'].replace('https://notes.junghanacs.com', '') or '/'
    text = c.get('orig','').replace('\n',' ')[:80]
    print(f\"\")
    print(f\"{i}. {c['user']['name']} @ {url}\")
    print(f\"   \\\"{text}...\\\"\")
    print(f\"   id: {c['id']}\")
    print(f\"   time: {c['time'][:19]}\")
"
}

# 특정 페이지 댓글 읽기
cmd_read() {
    local url="${1:?page_url required}"
    curl -s --max-time 10 "${REMARK_URL}/api/v1/find?site=${SITE}&url=${url}&sort=-time&limit=50" | python3 -c "
import sys, json
data = json.load(sys.stdin)
comments = data.get('comments', [])
print(f'[{len(comments)}개 댓글]')
for c in comments:
    indent = '  └─ ' if c.get('pid') else ''
    text = c.get('orig','').replace('\n',' ')[:100]
    print(f\"\")
    print(f\"{indent}{c['user']['name']} [{c['time'][:19]}]\")
    print(f\"{indent}  {text}\")
    print(f\"{indent}  id: {c['id']}\")
"
}

# Dev auth 로그인 — 3단계 OAuth 플로우
do_login() {
    local bot_name="$1"

    # Step 1: /auth/dev/login → redirect URL + handshake JWT
    local encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${bot_name}'))")
    local step1_headers
    step1_headers=$(curl -s --max-time 5 -D - \
        "${REMARK_URL}/auth/dev/login?user=${encoded}&aud=${SITE}" 2>&1)

    JWT_HS=$(echo "$step1_headers" | grep 'Set-Cookie: JWT=' | head -1 | sed 's/.*Set-Cookie: JWT=//;s/;.*//')
    local redirect_url=$(echo "$step1_headers" | grep -i '^Location:' | head -1 | sed 's/Location: //;s/\r//')

    # external URL → internal (호스트에서 실행 시)
    local internal_url=$(echo "$redirect_url" | sed "s|http://comments.junghanacs.com:8084|${REMARK_8084}|")

    if [ -z "$JWT_HS" ]; then
        echo "ERROR: Step 1 실패 — handshake JWT 없음" >&2
        exit 1
    fi

    # Step 2: POST username → callback URL with code
    local step2_headers
    step2_headers=$(curl -s --max-time 5 -D - \
        -X POST --data-urlencode "username=${bot_name}" \
        "$internal_url" 2>&1)

    local callback_url=$(echo "$step2_headers" | grep -i '^Location:' | head -1 | sed 's/Location: //;s/\r//')
    local internal_callback=$(echo "$callback_url" | sed "s|https://comments.junghanacs.com|${REMARK_URL}|")

    if [ -z "$callback_url" ]; then
        echo "ERROR: Step 2 실패 — callback URL 없음" >&2
        exit 1
    fi

    # Step 3: callback with handshake JWT → final JWT
    local step3_headers
    step3_headers=$(curl -s --max-time 10 -D - \
        -b "JWT=${JWT_HS}" \
        "$internal_callback" 2>&1)

    JWT=$(echo "$step3_headers" | grep 'Set-Cookie: JWT=' | grep -v 'handshake' | tail -1 | sed 's/.*Set-Cookie: JWT=//;s/;.*//')
    XSRF=$(echo "$step3_headers" | grep 'Set-Cookie: XSRF-TOKEN=' | tail -1 | sed 's/.*Set-Cookie: XSRF-TOKEN=//;s/;.*//')

    if [ -z "$JWT" ] || [ ${#JWT} -lt 200 ]; then
        echo "ERROR: Dev auth 로그인 실패 (${bot_name})" >&2
        echo "Step 3 응답: $(echo "$step3_headers" | tail -3)" >&2
        exit 1
    fi
}

# 답글 작성
cmd_reply() {
    local bot_name="${1:?bot_name required (e.g. '힣봇에이전트')}"
    local comment_id="${2:?comment_id required}"
    local page_url="${3:?page_url required}"
    local text="${4:?text required}"

    do_login "$bot_name"

    local result
    result=$(curl -s --max-time 10 "${REMARK_URL}/api/v1/comment" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "X-JWT: ${JWT}" \
        -H "X-XSRF-TOKEN: ${XSRF}" \
        -d "$(python3 -c "
import json, sys
print(json.dumps({
    'text': sys.argv[1],
    'pid': sys.argv[2],
    'locator': {'site': '${SITE}', 'url': sys.argv[3]}
}, ensure_ascii=False))
" "$text" "$comment_id" "$page_url")" 2>&1)

    if echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ 봇멘트: {d['user']['name']} (id:{d['user']['id'][:20]}) → {d['locator']['url']}\")" 2>/dev/null; then
        :
    else
        echo "❌ 실패: $result" >&2
        exit 1
    fi
}

# 독립 댓글 작성
cmd_comment() {
    local bot_name="${1:?bot_name required}"
    local page_url="${2:?page_url required}"
    local text="${3:?text required}"

    do_login "$bot_name"

    local result
    result=$(curl -s --max-time 10 "${REMARK_URL}/api/v1/comment" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "X-JWT: ${JWT}" \
        -H "X-XSRF-TOKEN: ${XSRF}" \
        -d "$(python3 -c "
import json, sys
print(json.dumps({
    'text': sys.argv[1],
    'locator': {'site': '${SITE}', 'url': sys.argv[2]}
}, ensure_ascii=False))
" "$text" "$page_url")" 2>&1)

    if echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ 봇멘트: {d['user']['name']} (id:{d['user']['id'][:20]}) → {d['locator']['url']}\")" 2>/dev/null; then
        :
    else
        echo "❌ 실패: $result" >&2
        exit 1
    fi
}

# Main
case "${1:-}" in
    unread)  cmd_unread ;;
    read)    cmd_read "${2:-}" ;;
    list)    cmd_list ;;
    reply)   cmd_reply "${2:-}" "${3:-}" "${4:-}" "${5:-}" ;;
    comment) cmd_comment "${2:-}" "${3:-}" "${4:-}" ;;
    *)       usage ;;
esac
