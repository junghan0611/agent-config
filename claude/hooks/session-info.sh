#!/usr/bin/env bash
# session-info: SessionStart 훅 — 디바이스/시간 정보를 에이전트에게 자동 전달
# stdout으로 출력하면 Claude Code가 "additional context"로 에이전트에게 보여줌
INPUT=$(cat)  # stdin 소비 (훅 프로토콜 — JSON, .cwd 사용)
DEVICE=$(cat ~/.current-device 2>/dev/null || echo "unknown")
TIME=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
echo "Session: device=${DEVICE} time_kst=${TIME}"

# direnv 브리지 — 에이전트 Bash 는 대화형 셸이 아니라 direnv prompt hook 을 타지 않는다.
# opt-in: 세션 cwd 의 허용된 .envrc 에 `# agent-env: direnv` 줄이 있을 때만,
# 매 Bash 명령 전에 direnv 를 평가하는 한 줄을 CLAUDE_ENV_FILE 에 넣는다.
# 값이 아니라 eval 을 넣으므로 토큰 같은 비밀이 env 파일에 남지 않는다.
# (use flake 리포에 자동 적용하면 명령마다 flake 환경이 주입되므로 표식 없이는 하지 않는다.)
if [ -n "${CLAUDE_ENV_FILE:-}" ] && command -v direnv >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
	CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
	STATUS=$(cd "${CWD:-$PWD}" 2>/dev/null && direnv status --json 2>/dev/null)
	RC=$(printf '%s' "$STATUS" | jq -r 'select(.state.foundRC.allowed == 0) | .state.foundRC.path // empty' 2>/dev/null)
	if [ -n "$RC" ] && grep -q '^# agent-env: direnv' "$RC" 2>/dev/null; then
		echo 'eval "$(direnv export bash 2>/dev/null)"' >> "$CLAUDE_ENV_FILE"
		echo "direnv: agent-env bridged (${RC})"
	fi
fi
