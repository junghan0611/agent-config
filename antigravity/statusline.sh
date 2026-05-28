#!/usr/bin/env bash
# Antigravity CLI statusline.
# Shows: device | cwd [branch] | model | context-usage

input=$(cat)

device=$(cat ~/.current-device 2>/dev/null || echo 'UNKNOWN')

cwd=$(echo "$input" | jq -r '.workspace.current_dir // "?"')
# Shorten $HOME to ~ so the path doesn't eat the status line width.
if [[ "$cwd" == "$HOME" ]]; then
  cwd="~"
elif [[ "$cwd" == "$HOME"/* ]]; then
  cwd="~${cwd#$HOME}"
fi

# Split cwd into base + final segment so the final segment can be highlighted.
if [[ "$cwd" == */* ]]; then
  cwd_dir="${cwd%/*}/"
  cwd_tail="${cwd##*/}"
else
  cwd_dir=""
  cwd_tail="$cwd"
fi

model_id=$(echo "$input" | jq -r '.model.display_name // .model.id // "?"')
# Example: "Gemini 3.1 Pro (Low)" -> "3.1 Pro (Low)"
if [[ "$model_id" =~ Gemini\ (.*) ]]; then
  model="${BASH_REMATCH[1]}"
else
  model="$model_id"
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

ctx_info=""
ctx_json=$(echo "$input" | jq -c '.context_window // empty')
if [[ -n "$ctx_json" ]]; then
  limit=$(echo "$ctx_json" | jq -r '.context_window_size')
  pct=$(echo "$ctx_json" | jq -r '.used_percentage')
  current=$(echo "$ctx_json" | jq -r '
    (.current_usage.input_tokens // 0)
    + (.current_usage.output_tokens // 0)
    + (.current_usage.cache_creation_input_tokens // 0)
    + (.current_usage.cache_read_input_tokens // 0)')

  if (( limit >= 1000000 )); then
    limit_label=$(awk -v n="$limit" 'BEGIN { printf "%.0fM", n/1000000 }')
  else
    limit_label=$(awk -v n="$limit" 'BEGIN { printf "%.0fK", n/1000 }')
  fi

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

printf "\033[2m%s %s\033[0m\033[1;36m%s\033[0m\033[2m%s | %s%s%b\033[0m" "$device" "$cwd_dir" "$cwd_tail" "$git_info" "$model" "$vterm" "$ctx_info"
