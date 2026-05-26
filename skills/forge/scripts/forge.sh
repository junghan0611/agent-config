#!/usr/bin/env bash
# forge.sh — Forgejo 이슈/PR/코멘트/라벨 작업면 (skills/forge)
# botment.sh의 forge 자식: remark42 → Forgejo API endpoint swap
#
# v1 stub: env vars + 동사 6개 골격. 실 API는 caddy + Forgejo 배포 후 채움.
# 부모: ../../botment/scripts/botment.sh (277라인) — fork 대상

set -euo pipefail

# .env.local fallback (botment과 동일 패턴)
if [ -f "$HOME/.env.local" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$HOME/.env.local"
    set +a
fi

FORGE_BASE_URL="${FORGE_BASE_URL:-}"
FORGE_TOKEN="${FORGE_TOKEN:-}"

usage() {
    cat <<'EOF'
Usage: forge.sh <command> [args]

Commands (v1):
  unread                                할당/멘션된 미응답 이슈+PR
  list [open|closed]                    열린 이슈/PR 목록
  read <repo> <number>                  이슈/PR 본문 + 코멘트 + 라벨 + CI 상태
  comment <repo> <number> <text>        코멘트 작성 (footer 서명 자동)
  label <add|remove> <repo> <number> <label>
                                        라벨 부착/제거
  issue create <repo> <title> <body>    이슈 생성

v1 라벨 5개:
  agent:ready / agent:running / agent:done / human:needs-review / ci:failed

Status: v1 stub — implementation pending caddy + Forgejo deploy.
        Set FORGE_BASE_URL + FORGE_TOKEN in ~/.env.local once available.
EOF
}

check_env() {
    if [ -z "$FORGE_BASE_URL" ] || [ -z "$FORGE_TOKEN" ]; then
        echo "ERROR: FORGE_BASE_URL or FORGE_TOKEN not set" >&2
        echo "  Forge not yet wired — caddy + Forgejo deploy pending." >&2
        echo "  Expected in ~/.env.local:" >&2
        echo "    FORGE_BASE_URL=https://forge.junghanacs.com" >&2
        echo "    FORGE_TOKEN=<glg-bot token>" >&2
        exit 2
    fi
}

# TODO: implement against Forgejo API once URL/token wired.
# Reference parent: ../../botment/scripts/botment.sh (cmd_unread, cmd_read, cmd_reply 등)
# Forgejo API root: ${FORGE_BASE_URL}/api/v1
# Auth header: -H "Authorization: token ${FORGE_TOKEN}"
cmd_stub() {
    check_env
    echo "TODO: implement '${1:-?}' against Forgejo API at ${FORGE_BASE_URL}/api/v1" >&2
    exit 64
}

case "${1:-}" in
    unread)  cmd_stub unread ;;
    list)    cmd_stub list ;;
    read)    cmd_stub read ;;
    comment) cmd_stub comment ;;
    label)   cmd_stub label ;;
    issue)   cmd_stub issue ;;
    -h|--help|help|"") usage ;;
    *)
        echo "ERROR: unknown command '$1'" >&2
        usage >&2
        exit 1
        ;;
esac
