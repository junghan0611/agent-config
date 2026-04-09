#!/usr/bin/env bash
# pi-entwurf — persistent pi session with auto-restart
# Usage: ./pi-entwurf.sh [start|stop|status|attach]
set -euo pipefail

SESSION="pi-entwurf"
MODEL="claude-agent-sdk/claude-opus-4-6"
LOGFILE="$HOME/.pi/agent/pi-entwurf.log"

start_pi() {
  while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] pi starting..." >> "$LOGFILE"

    # --continue: 이전 세션 이어받기
    pi --model "$MODEL" --continue 2>&1

    EXIT_CODE=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] pi exited with code $EXIT_CODE" >> "$LOGFILE"

    # 의도적 종료 (/exit 등)면 중단
    if [ $EXIT_CODE -eq 0 ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] clean exit — not restarting" >> "$LOGFILE"
      break
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] restarting in 5s..." >> "$LOGFILE"
    sleep 5
  done
}

case "${1:-start}" in
  start)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "⚠ $SESSION already running. Use: $0 attach"
      exit 1
    fi
    tmux new-session -d -s "$SESSION" -x 200 -y 50
    # 셸 안에서 함수 실행 — pi가 죽어도 셸은 살아있음
    tmux send-keys -t "$SESSION" "cd ~ && while true; do echo '[pi-entwurf] starting...'; pi --model $MODEL --continue; EC=\$?; echo '[pi-entwurf] exited (\$EC)'; [ \$EC -eq 0 ] && break; echo '[pi-entwurf] restarting in 5s...'; sleep 5; done" Enter
    echo "💡 특정 세션 resume: tmux send-keys -t $SESSION 'pi --model $MODEL --session <파일경로>' Enter"
    echo "✅ $SESSION started. Use: $0 attach"
    ;;
  stop)
    tmux kill-session -t "$SESSION" 2>/dev/null && echo "✅ $SESSION stopped" || echo "⚠ $SESSION not running"
    ;;
  status)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "✅ $SESSION running"
      tmux capture-pane -t "$SESSION" -p | tail -3
    else
      echo "❌ $SESSION not running"
    fi
    ;;
  attach)
    tmux attach -t "$SESSION"
    ;;
  *)
    echo "Usage: $0 [start|stop|status|attach]"
    ;;
esac
