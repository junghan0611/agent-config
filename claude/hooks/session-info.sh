#!/usr/bin/env bash
# session-info: SessionStart 훅 — 디바이스/시간 정보를 에이전트에게 자동 전달
# stdout으로 출력하면 Claude Code가 "additional context"로 에이전트에게 보여줌
cat <<< "$(cat)" > /dev/null  # stdin 소비 (훅 프로토콜)
DEVICE=$(cat ~/.current-device 2>/dev/null || echo "unknown")
TIME=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
echo "Session: device=${DEVICE} time_kst=${TIME}"
