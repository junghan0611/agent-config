#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: find-sessions.sh [-L socket-name|-S socket-path|-A] [-q pattern]

List tmux sessions on a socket (default tmux socket if none provided).

Options:
  -L, --socket       tmux socket name (passed to tmux -L)
  -S, --socket-path  tmux socket path (passed to tmux -S)
  -A, --all          scan every tmux socket, not just the default one
  -q, --query        case-insensitive substring to filter session names
  -h, --help         show this help

--all scans the standard tmux socket directory (${TMUX_TMPDIR:-/tmp}/tmux-$UID),
which is where sockets actually live regardless of which agent or harness
created them. If CLAUDE_TMUX_SOCKET_DIR is set, that directory is scanned in
addition. Use this to find sessions that an agent hid on a private socket --
those never show up in a plain `tmux ls`.
USAGE
}

socket_name=""
socket_path=""
query=""
scan_all=false
socket_dirs=("${TMUX_TMPDIR:-/tmp}/tmux-$(id -u)")
if [[ -n "${CLAUDE_TMUX_SOCKET_DIR:-}" ]]; then
  socket_dirs+=("$CLAUDE_TMUX_SOCKET_DIR")
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -L|--socket)      socket_name="${2-}"; shift 2 ;;
    -S|--socket-path) socket_path="${2-}"; shift 2 ;;
    -A|--all)         scan_all=true; shift ;;
    -q|--query)       query="${2-}"; shift 2 ;;
    -h|--help)        usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ "$scan_all" == true && ( -n "$socket_name" || -n "$socket_path" ) ]]; then
  echo "Cannot combine --all with -L or -S" >&2
  exit 1
fi

if [[ -n "$socket_name" && -n "$socket_path" ]]; then
  echo "Use either -L or -S, not both" >&2
  exit 1
fi

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux not found in PATH" >&2
  exit 1
fi

list_sessions() {
  local label="$1"; shift
  local tmux_cmd=(tmux "$@")

  # tmux -F takes the format string literally, so the separator must be a real
  # tab, not the two characters \t. And session_created_string is empty on
  # tmux 3.x -- #{t:session_created} is the portable way to format the time.
  local fmt=$'#{session_name}\t#{session_attached}\t#{t:session_created}'

  if ! sessions="$("${tmux_cmd[@]}" list-sessions -F "$fmt" 2>/dev/null)"; then
    echo "No tmux server found on $label" >&2
    return 1
  fi

  if [[ -n "$query" ]]; then
    sessions="$(printf '%s\n' "$sessions" | grep -i -- "$query" || true)"
  fi

  if [[ -z "$sessions" ]]; then
    echo "No sessions found on $label"
    return 0
  fi

  echo "Sessions on $label:"
  printf '%s\n' "$sessions" | while IFS=$'\t' read -r name attached created; do
    attached_label=$([[ "$attached" == "1" ]] && echo "attached" || echo "detached")
    printf '  - %s (%s, started %s)\n' "$name" "$attached_label" "$created"
  done
}

if [[ "$scan_all" == true ]]; then
  sockets=()
  for dir in "${socket_dirs[@]}"; do
    [[ -d "$dir" ]] || continue
    shopt -s nullglob
    for sock in "$dir"/*; do
      [[ -S "$sock" ]] && sockets+=("$sock")
    done
    shopt -u nullglob
  done

  if [[ "${#sockets[@]}" -eq 0 ]]; then
    echo "No tmux sockets found under: ${socket_dirs[*]}" >&2
    exit 1
  fi

  # A socket file outlives its server, so dead sockets are normal here and are
  # skipped quietly. Only report failure when no socket had a live server.
  found=false
  for sock in "${sockets[@]}"; do
    label="socket path '$sock'"
    [[ "$sock" == */default ]] && label="default socket"
    if list_sessions "$label" -S "$sock" 2>/dev/null; then
      found=true
    fi
  done

  if [[ "$found" != true ]]; then
    echo "No live tmux server on any of ${#sockets[@]} socket(s)" >&2
    exit 1
  fi
  exit 0
fi

tmux_cmd=(tmux)
socket_label="default socket"

if [[ -n "$socket_name" ]]; then
  tmux_cmd+=(-L "$socket_name")
  socket_label="socket name '$socket_name'"
elif [[ -n "$socket_path" ]]; then
  tmux_cmd+=(-S "$socket_path")
  socket_label="socket path '$socket_path'"
fi

list_sessions "$socket_label" "${tmux_cmd[@]:1}"
