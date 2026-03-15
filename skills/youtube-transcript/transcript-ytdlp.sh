#!/usr/bin/env bash
# yt-dlp 기반 YouTube 자막 추출
# transcript.js가 실패할 때 폴백으로 사용

set -uo pipefail

usage() {
  cat <<'EOF'
Usage: transcript-ytdlp.sh <video-url-or-id> [--lang en] [--list] [--cookies FILE]

Options:
  --lang <code>    Subtitle language (default: en)
  --list           List available subtitles
  --cookies FILE   Cookie file path (default: try without cookies first)

Examples:
  transcript-ytdlp.sh dQw4w9WgXcQ
  transcript-ytdlp.sh dQw4w9WgXcQ --list
  transcript-ytdlp.sh https://www.youtube.com/watch?v=VIDEO_ID --lang en
EOF
  exit 1
}

VIDEO=""
LANG_CODE="en"
LIST_ONLY=false
COOKIES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang)   LANG_CODE="$2"; shift 2 ;;
    --list)   LIST_ONLY=true; shift ;;
    --cookies) COOKIES="$2"; shift 2 ;;
    --help|-h) usage ;;
    -*) echo "Unknown option: $1"; usage ;;
    *)  VIDEO="$1"; shift ;;
  esac
done

[[ -z "$VIDEO" ]] && usage

# Normalize video URL
if [[ ! "$VIDEO" =~ ^https?:// ]]; then
  VIDEO="https://www.youtube.com/watch?v=${VIDEO}"
fi

# Auto-detect cookies (only used as fallback or when explicitly given)
find_cookies() {
  if [[ -n "$COOKIES" && -f "$COOKIES" ]]; then
    echo "$COOKIES"
  elif [[ -f "$HOME/cookies.txt" ]]; then
    echo "$HOME/cookies.txt"
  elif [[ -f "$HOME/cookies.txt.bak" ]]; then
    echo "$HOME/cookies.txt.bak"
  elif [[ -f "$HOME/Downloads/www.youtube.com_cookies.txt" ]]; then
    echo "$HOME/Downloads/www.youtube.com_cookies.txt"
  fi
}

# List subtitles
if $LIST_ONLY; then
  COOKIE_FILE=$(find_cookies)
  COOKIE_ARGS=()
  if [[ -n "$COOKIE_FILE" ]]; then
    COOKIE_TMP=$(mktemp)
    cp "$COOKIE_FILE" "$COOKIE_TMP"
    COOKIE_ARGS=(--cookies "$COOKIE_TMP")
  fi
  yt-dlp "${COOKIE_ARGS[@]}" --list-subs --skip-download "$VIDEO" 2>/dev/null \
    | grep -E "^(Language|[a-z]{2})" || true
  [[ -n "${COOKIE_TMP:-}" ]] && rm -f "$COOKIE_TMP"
  exit 0
fi

# Download subtitles to temp dir
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Try without cookies first (avoids "format not available" error from cookie auth)
yt-dlp \
  --js-runtimes node \
  --write-auto-subs --write-subs \
  --sub-langs "$LANG_CODE" \
  --sub-format vtt \
  --skip-download \
  -o "$TMPDIR/sub" \
  "$VIDEO" >/dev/null 2>&1 || true

# If no subtitle found, retry with cookies
SUB_FILE=$(find "$TMPDIR" -name "*.vtt" | head -1)
if [[ -z "$SUB_FILE" ]]; then
  COOKIE_FILE=$(find_cookies)
  if [[ -n "$COOKIE_FILE" ]]; then
    # Use read-only copy to prevent yt-dlp from overwriting original cookies
    COOKIE_COPY="$TMPDIR/cookies.txt"
    cp "$COOKIE_FILE" "$COOKIE_COPY"
    yt-dlp --cookies "$COOKIE_COPY" \
      --js-runtimes node \
      --write-auto-subs --write-subs \
      --sub-langs "$LANG_CODE" \
      --sub-format vtt \
      --skip-download \
      -o "$TMPDIR/sub" \
      "$VIDEO" >/dev/null 2>&1 || true
    SUB_FILE=$(find "$TMPDIR" -name "*.vtt" | head -1)
  fi
fi

if [[ -z "$SUB_FILE" ]]; then
  echo "Error: No subtitles found for language '$LANG_CODE'" >&2
  echo "Try: $(basename "$0") \"$VIDEO\" --list" >&2
  exit 1
fi

# Parse VTT → clean timestamped text
awk '
BEGIN { prev = "" }
/^WEBVTT/ || /^Kind:/ || /^Language:/ || /^$/ || /^NOTE/ { next }
/^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+ -->/ {
  split($1, t, /[:.]/);
  h = t[1]+0; m = t[2]+0; s = t[3]+0;
  if (h > 0) ts = sprintf("%d:%02d:%02d", h, m, s);
  else ts = sprintf("%d:%02d", m, s);
  next
}
{
  gsub(/<[^>]+>/, "")
  gsub(/&amp;/, "\\&"); gsub(/&#39;/, "\x27"); gsub(/&lt;/, "<"); gsub(/&gt;/, ">"); gsub(/&quot;/, "\"")
  gsub(/^[ \t]+|[ \t]+$/, "")
  if ($0 == "" || $0 == prev) next
  if (ts != "") { printf "[%s] %s\n", ts, $0; prev = $0 }
}
' "$SUB_FILE"
