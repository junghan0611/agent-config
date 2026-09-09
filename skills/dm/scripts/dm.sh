#!/usr/bin/env bash
# dm — 에이전트가 GLG에게 텔레그램 DM 한 줄을 보낸다.
#
# 텔레그램 Bot API 로 직접 쏜다. OpenClaw 게이트웨이도, 봇 군단의 어느 방도 거치지 않는다.
# 그래서 어느 기기에서든 돌고, 어떤 봇의 타임라인도 더럽히지 않는다.
set -euo pipefail

AS="${DM_AS:-}"
MACHINE=""
REPO=""
TEXT=""

usage() {
	cat <<'USAGE'
Usage: dm.sh [options] <할 말...>

Options:
  --as <하네스/모델>   보내는 쪽 정체 (예: claudecode/opus, pi/gpt-5.6, codex/gpt-5.6)
                       생략하면 $DM_AS. 둘 다 없으면 실패한다 — 누가 보냈는지가 이 양식의 핵심이다.
  --machine <name>     기본: ~/.current-device → hostname -s
  --repo <name>        기본: git toplevel basename → 현재 디렉토리 basename
  --bot <entwurf>      발신 봇 전환 (기본: channels 봇)
  --stdin              본문을 stdin 에서 읽는다 (긴 글/여러 줄)
  --dry-run            보내지 않고 완성된 메시지만 출력
  -h, --help

Examples:
  dm.sh --as claudecode/opus "14:41 하트비트 전송면 확인 완료 — accountId=bbot"
  printf '%s\n' "빌드 실패" "$(tail -5 build.log)" | dm.sh --as pi/gpt-5.6 --stdin
USAGE
}

USE_STDIN=0
DRY_RUN=0
BOT="channels"
while [ $# -gt 0 ]; do
	case "$1" in
		--as) AS="$2"; shift 2 ;;
		--machine) MACHINE="$2"; shift 2 ;;
		--repo) REPO="$2"; shift 2 ;;
		--bot) BOT="$2"; shift 2 ;;
		--stdin) USE_STDIN=1; shift ;;
		--dry-run) DRY_RUN=1; shift ;;
		-h|--help) usage; exit 0 ;;
		--) shift; break ;;
		-*) echo "dm: unknown option $1" >&2; usage >&2; exit 2 ;;
		*) break ;;
	esac
done

if [ "$USE_STDIN" -eq 1 ]; then
	TEXT="$(cat)"
else
	TEXT="$*"
fi

[ -n "$TEXT" ] || { echo "dm: 보낼 말이 없다" >&2; exit 2; }
if [ -z "$AS" ]; then
	echo "dm: --as <하네스/모델> 가 필요하다 (또는 DM_AS 환경변수)." >&2
	echo "    GLG 는 어느 하네스의 누가 말하는지로 맥락을 잡는다 — 비워두면 그 정보가 사라진다." >&2
	exit 2
fi

if [ -z "$MACHINE" ]; then
	MACHINE="$(cat "$HOME/.current-device" 2>/dev/null || true)"
	MACHINE="${MACHINE:-$(hostname -s)}"
	MACHINE="${MACHINE%%-*}"
fi

if [ -z "$REPO" ]; then
	if TOP="$(git rev-parse --show-toplevel 2>/dev/null)"; then
		REPO="$(basename "$TOP")"
	else
		REPO="$(basename "$PWD")"
	fi
fi

MSG="DM ${MACHINE} ${REPO} ${AS}
${TEXT}"

if [ "$DRY_RUN" -eq 1 ]; then
	printf '%s\n' "$MSG"
	exit 0
fi

# 토큰과 수신자 id 는 개인정보다 — 공개 리포에 박지 않는다. SSOT 는 ~/.env.local.
# 로그인 이후 추가된 줄은 실행 중인 세션 환경에 없으므로, 파일을 직접 읽어 보강한다.
if [ -r "$HOME/.env.local" ]; then
	set -a
	# shellcheck disable=SC1090
	. "$HOME/.env.local"
	set +a
fi

case "$BOT" in
	channels) TOKEN="${PI_TELEGRAM_BOT_TOKEN:-}"; TOKEN_KEY="PI_TELEGRAM_BOT_TOKEN" ;;
	entwurf)  TOKEN="${PI_ENTWURF_BOT_TOKEN:-}";  TOKEN_KEY="PI_ENTWURF_BOT_TOKEN" ;;
	*) echo "dm: --bot 은 channels | entwurf 만 받는다 (받은 값: $BOT)" >&2; exit 2 ;;
esac

CHAT_ID="${DM_CHAT_ID:-${PI_TELEGRAM_CHAT_ID:-}}"

[ -n "$TOKEN" ]   || { echo "dm: ${TOKEN_KEY} 가 없다 (~/.env.local)." >&2; exit 2; }
[ -n "$CHAT_ID" ] || { echo "dm: PI_TELEGRAM_CHAT_ID 가 없다 (~/.env.local)." >&2; exit 2; }

# 토큰은 URL 에만 들어가고 stdout/stderr 로 새지 않는다. 실패 응답도 description 만 인쇄한다.
RESP="$(curl -sS --max-time 20 -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
	-d "chat_id=${CHAT_ID}" \
	--data-urlencode "text=${MSG}" 2>&1)" || {
	echo "dm: 전송 실패 (네트워크)" >&2
	exit 5
}

printf '%s' "$RESP" | python3 -c '
import json, sys

raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    sys.stderr.write("dm: 텔레그램 응답을 못 읽었다\n")
    sys.exit(5)
if d.get("ok"):
    print("dm: 전달됨 (messageId=%s)" % (d.get("result") or {}).get("message_id"))
    sys.exit(0)
sys.stderr.write("dm: 전달 실패 — %s\n" % d.get("description"))
sys.exit(5)
'
