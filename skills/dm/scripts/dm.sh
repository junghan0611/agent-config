#!/usr/bin/env bash
# dm — 에이전트가 GLG에게 텔레그램 DM 한 줄을 보낸다.
#
# 경로: OpenClaw 게이트웨이의 cron command payload + announce 배달.
# 모델 턴이 아니라 출력 배관이라 어느 봇 세션에도 쌓이지 않는다(측정 근거는 SKILL.md).
set -euo pipefail

CONTAINER="${OPENCLAW_CONTAINER:-openclaw-gateway}"
ACCOUNT="${DM_ACCOUNT:-mini}"
AS="${DM_AS:-}"

# 수신자 id는 개인정보다 — 공개 리포에 박지 않는다. SSOT 는 ~/.env.local.
# 로그인 이후 추가된 줄은 실행 중인 세션 환경에 없으므로, 변수가 비면 파일에서 직접 읽는다.
CHAT_ID="${DM_CHAT_ID:-${PI_TELEGRAM_CHAT_ID:-}}"
if [ -z "$CHAT_ID" ] && [ -r "$HOME/.env.local" ]; then
	CHAT_ID="$(sed -n 's/^export PI_TELEGRAM_CHAT_ID=//p' "$HOME/.env.local" | tail -1 | tr -d "\"' \t\r")"
fi
MACHINE=""
REPO=""
TEXT=""

usage() {
	cat <<'USAGE'
Usage: dm.sh [options] <할 말...>

Options:
  --as <harness/model>   보내는 쪽 정체 (예: claudecode/opus, pi/gpt-5.6, openclaw/bbot)
                         생략하면 $DM_AS. 둘 다 없으면 실패한다 — 누가 보냈는지가 이 양식의 핵심이다.
  --machine <name>       기본: ~/.current-device → hostname -s
  --repo <name>          기본: git toplevel basename → 현재 디렉토리 basename
  --account <id>         배달에 쓸 텔레그램 봇 계정 (기본 mini)
  --stdin                본문을 stdin에서 읽는다 (긴 글/여러 줄)
  --dry-run              보내지 않고 완성된 메시지만 출력
  -h, --help

Examples:
  dm.sh --as claudecode/opus "14:41 하트비트 전송면 확인 완료 — accountId=bbot"
  echo "$LONG" | dm.sh --as pi/gpt-5.6 --stdin
USAGE
}

USE_STDIN=0
DRY_RUN=0
while [ $# -gt 0 ]; do
	case "$1" in
		--as) AS="$2"; shift 2 ;;
		--machine) MACHINE="$2"; shift 2 ;;
		--repo) REPO="$2"; shift 2 ;;
		--account) ACCOUNT="$2"; shift 2 ;;
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
if [ -z "$CHAT_ID" ]; then
	echo "dm: 수신자 id 를 못 찾았다 — ~/.env.local 의 PI_TELEGRAM_CHAT_ID 또는 \$DM_CHAT_ID 가 필요하다." >&2
	exit 2
fi
if [ -z "$AS" ]; then
	echo "dm: --as <harness/model> 가 필요하다 (또는 DM_AS 환경변수)." >&2
	echo "    GLG는 어느 하네스의 누가 말하는지로 맥락을 잡는다 — 비워두면 그 정보가 사라진다." >&2
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

oc() { docker exec "$CONTAINER" openclaw "$@"; }

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1; then
	echo "dm: 컨테이너 '$CONTAINER' 가 이 기기에 없다." >&2
	echo "    이 스킬은 OpenClaw 게이트웨이가 사는 기기(현재 oracle)에서만 동작한다. SKILL.md § 경계 참고." >&2
	exit 3
fi

NAME="dm-$(date +%s)-$$"
# --at 은 멀리 잡아두고 곧바로 수동 실행한다. 자동 발화와 경주하지 않기 위해서다.
CREATE="$(oc cron add \
	--name "$NAME" \
	--display-name "DM (${MACHINE}/${REPO})" \
	--at 6h --tz Asia/Seoul \
	--agent "$ACCOUNT" \
	--command "printf '%s' \"\$DM_BODY\"" \
	--command-env "DM_BODY=${MSG}" \
	--announce --channel telegram --account "$ACCOUNT" --to "$CHAT_ID" \
	--delete-after-run --best-effort-deliver \
	--json 2>&1)" || { echo "dm: cron add 실패"; printf '%s\n' "$CREATE" >&2; exit 4; }

JOB_ID="$(printf '%s' "$CREATE" | python3 -c 'import json,sys; t=sys.stdin.read(); print(json.loads(t[t.find("{"):])["id"])' 2>/dev/null || true)"
[ -n "$JOB_ID" ] || { echo "dm: 잡 id를 못 읽었다"; printf '%s\n' "$CREATE" >&2; exit 4; }

cleanup() { oc cron rm "$JOB_ID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

RUN="$(oc cron run "$JOB_ID" --wait --wait-timeout 2m 2>&1)" || true
printf '%s' "$RUN" | python3 -c '
import json, sys

raw = sys.stdin.read()
start = raw.find("{")
if start < 0:
    sys.stderr.write("dm: 게이트웨이 응답을 못 읽었다\n" + raw[:400] + "\n")
    sys.exit(5)
d = json.loads(raw[start:])
run = d.get("run", {})
delivery = run.get("deliveryStatus")
if delivery == "delivered":
    print("dm: 전달됨")
    sys.exit(0)
sys.stderr.write(
    "dm: 전달 실패 — completion=%s delivery=%s\n"
    % (d.get("completionStatus"), delivery)
)
sys.exit(5)
'
