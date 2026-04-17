#!/usr/bin/env bash
# Claude Code statusline script
# Shows: device | cwd [branch] | style | model | context-usage

input=$(cat)

device=$(cat ~/.current-device 2>/dev/null || echo 'UNKNOWN')

cwd=$(echo "$input" | jq -r '.workspace.current_dir // "?"')
style=$(echo "$input" | jq -r '.output_style.name // "?"')
model_id=$(echo "$input" | jq -r '.model.id // "?"')
transcript=$(echo "$input" | jq -r '.transcript_path // ""')
exceeds_200k=$(echo "$input" | jq -r '.exceeds_200k_tokens // false')

if [[ "$model_id" == *opus* ]]; then
  model="o"
elif [[ "$model_id" == *sonnet* ]]; then
  model="s"
elif [[ "$model_id" == *haiku* ]]; then
  model="h"
else
  model="?"
fi

vterm=""
if [[ "$INSIDE_EMACS" == "vterm" ]]; then
  vterm="v"
fi

git_info=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null)
  if [[ -n "$branch" ]]; then
    git_info=" [$branch]"
  fi
fi

# Context usage from transcript. Claude Code's input JSON carries no token
# field, so we read only the last assistant usage line (not a full scan).
ctx_info=""
if [[ -n "$transcript" && -f "$transcript" ]]; then
  last_usage=$(tac "$transcript" 2>/dev/null | \
    jq -c 'select(.type == "assistant" and .message.usage) | .message.usage' 2>/dev/null | \
    head -1)

  if [[ -n "$last_usage" ]]; then
    current=$(echo "$last_usage" | jq -r '(.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)')

    # 1M mode detection: flag from harness, or current usage already past 200K.
    if [[ "$exceeds_200k" == "true" ]] || (( current > 200000 )); then
      limit=1000000
      limit_label="1M"
    else
      limit=200000
      limit_label="200K"
    fi

    pct=$(( current * 100 / limit ))

    if (( current >= 1000 )); then
      human=$(awk -v n="$current" 'BEGIN { printf "%.1fK", n/1000 }')
    else
      human="${current}"
    fi

    if (( pct >= 85 )); then
      color="\033[31;1m"
    elif (( pct >= 70 )); then
      color="\033[33m"
    else
      color="\033[32m"
    fi

    ctx_info=$(printf " | %b%s/%s %d%%\033[0m\033[2m" "$color" "$human" "$limit_label" "$pct")
  fi
fi

printf "\033[2m%s %s%s | %s | %s%s%b\033[0m" "$device" "$cwd" "$git_info" "$style" "$model" "$vterm" "$ctx_info"
