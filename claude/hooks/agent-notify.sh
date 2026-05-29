#!/usr/bin/env bash
# agent-notify: 에이전트가 "사용자 개입"을 필요로 할 때만 ntfy 로 알린다.
# (권한 승인 대기 / 입력 idle 등 — 매 턴 종료가 아니라 사람이 가야 하는 순간)
#
# 여러 하네스가 공유하는 단일 진입점. 하네스마다 호출 방식만 다르고 본문 규칙은 같다.
#   $1   = 하네스 이름 (claude / codex / gemini / pi). ntfy Title 로 쓰인다.
#   stdin= 하네스가 주는 JSON(있으면 `.message` 추출) 또는 평문. 본문으로 쓰인다.
#
# 머신 구분은 ntfy 토픽이 한다(oracle 호스트 / work 호스트 = 별도 토픽). 그래서
# 본문엔 profile/device 를 중복으로 싣지 않고 "어느 하네스가 무엇을 기다리는지"만 담는다.
# forge profile 이 비었거나 매칭 안 되면 조용히 종료(알림 없음).
set -u

harness="${1:-agent}"

raw="$(cat 2>/dev/null || true)"
msg=""
if [ -n "$raw" ]; then
  # JSON 이면 .message, 아니면 평문 그대로.
  msg="$(printf '%s' "$raw" | jq -r '.message // empty' 2>/dev/null || true)"
  [ -z "$msg" ] && msg="$raw"
fi
[ -z "$msg" ] && msg="needs your attention"

profile="$(tr -d '[:space:]' < "$HOME/.current-forge-profile" 2>/dev/null || true)"
case "$profile" in
  oracle) topic="junghanacs-oracle-cloud-20251017a" ;;
  work)   topic="junghanacs-work-20260529awkedk" ;;
  *)      exit 0 ;;
esac

curl -s -H "Title: ${harness}" -d "$msg" "ntfy.sh/${topic}" > /dev/null 2>&1 || true
