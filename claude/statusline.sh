#!/usr/bin/env bash
# Claude Code statusline script

input=$(cat)

# 디바이스명
device=$(cat ~/.current-device 2>/dev/null || echo 'UNKNOWN')

# JSON 파싱
cwd=$(echo "$input" | jq -r '.workspace.current_dir // "?"')
style=$(echo "$input" | jq -r '.output_style.name // "?"')
model_id=$(echo "$input" | jq -r '.model.id // "?"')

# 모델 표시
if [[ "$model_id" == *opus* ]]; then
  model="o"
elif [[ "$model_id" == *sonnet* ]]; then
  model="s"
else
  model="?"
fi

# Vterm 표시
vterm=""
if [[ "$INSIDE_EMACS" == "vterm" ]]; then
  vterm="v"
fi

# Git 브랜치
git_info=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null)
  if [[ -n "$branch" ]]; then
    git_info=" [$branch]"
  fi
fi

# 출력 (dim 스타일)
printf "\033[2m%s %s%s | %s | %s%s\033[0m" "$device" "$cwd" "$git_info" "$style" "$model" "$vterm"
