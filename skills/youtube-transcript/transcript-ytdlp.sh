#!/usr/bin/env bash
# yt-dlp fallback — same discourse contract as transcript.js
# merge on YouTube ">>" boundary, YAML md header, <!-- [m:ss] --> per turn

set -uo pipefail

usage() {
  cat <<'EOF'
Usage: transcript-ytdlp.sh <video-url-or-id> [--lang en] [--list] [--cookies FILE] [--no-save] [--outdir DIR]

Same contract as transcript.js:
  - merge cues on ">>" only (no LLM)
  - turn start as <!-- [m:ss] -->
  - denote md under ~/org/md/transcript (unless --no-save)
EOF
  exit 1
}

VIDEO=""
LANG_CODE="en"
LIST_ONLY=false
COOKIES=""
NO_SAVE=false
OUTDIR="${HOME}/org/md/transcript"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang)    LANG_CODE="$2"; shift 2 ;;
    --list)    LIST_ONLY=true; shift ;;
    --cookies) COOKIES="$2"; shift 2 ;;
    --no-save) NO_SAVE=true; shift ;;
    --outdir)  OUTDIR="$2"; shift 2 ;;
    --help|-h) usage ;;
    -*) echo "Unknown option: $1"; usage ;;
    *)  VIDEO="$1"; shift ;;
  esac
done

[[ -z "$VIDEO" ]] && usage

VIDEO_ID=""
if [[ "$VIDEO" =~ ^[a-zA-Z0-9_-]{11}$ ]]; then
  VIDEO_ID="$VIDEO"
  VIDEO="https://www.youtube.com/watch?v=${VIDEO}"
elif [[ "$VIDEO" =~ (?:v=|youtu\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11}) ]]; then
  VIDEO_ID="${BASH_REMATCH[1]}"
  if [[ ! "$VIDEO" =~ ^https?:// ]]; then
    VIDEO="https://www.youtube.com/watch?v=${VIDEO_ID}"
  fi
else
  if [[ ! "$VIDEO" =~ ^https?:// ]]; then
    VIDEO="https://www.youtube.com/watch?v=${VIDEO}"
  fi
fi

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

# yt-dlp 2026.08+ needs the EJS challenge solver on locked-down IPs
# (oracle/datacenter). Without it: "The page needs to be reloaded."
YTDLP_COMMON=(--js-runtimes node --remote-components ejs:github)

if $LIST_ONLY; then
  COOKIE_FILE=$(find_cookies)
  COOKIE_ARGS=()
  if [[ -n "$COOKIE_FILE" ]]; then
    COOKIE_TMP=$(mktemp)
    cp "$COOKIE_FILE" "$COOKIE_TMP"
    COOKIE_ARGS=(--cookies "$COOKIE_TMP")
  fi
  yt-dlp "${COOKIE_ARGS[@]}" "${YTDLP_COMMON[@]}" --list-subs --skip-download "$VIDEO" 2>/dev/null \
    | grep -E "^(Language|[a-z]{2})" || true
  [[ -n "${COOKIE_TMP:-}" ]] && rm -f "$COOKIE_TMP"
  exit 0
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

yt-dlp \
  "${YTDLP_COMMON[@]}" \
  --write-auto-subs --write-subs \
  --sub-langs "$LANG_CODE" \
  --sub-format vtt \
  --skip-download \
  -o "$TMPDIR/sub" \
  "$VIDEO" >/dev/null 2>&1 || true

SUB_FILE=$(find "$TMPDIR" -name "*.vtt" | head -1)
if [[ -z "$SUB_FILE" ]]; then
  COOKIE_FILE=$(find_cookies)
  if [[ -n "$COOKIE_FILE" ]]; then
    COOKIE_COPY="$TMPDIR/cookies.txt"
    cp "$COOKIE_FILE" "$COOKIE_COPY"
    yt-dlp --cookies "$COOKIE_COPY" \
      "${YTDLP_COMMON[@]}" \
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

TITLE=""
CHANNEL=""
DURATION_SEC="0"
META_JSON="$TMPDIR/meta.json"
if yt-dlp --skip-download --print-json "$VIDEO" >"$META_JSON" 2>/dev/null; then
  TITLE=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("title") or "")' "$META_JSON" 2>/dev/null || true)
  CHANNEL=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("channel") or d.get("uploader") or "")' "$META_JSON" 2>/dev/null || true)
  DURATION_SEC=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(int(d.get("duration") or 0))' "$META_JSON" 2>/dev/null || echo 0)
  if [[ -z "$VIDEO_ID" ]]; then
    VIDEO_ID=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("id") or "")' "$META_JSON" 2>/dev/null || true)
  fi
fi
[[ -z "$TITLE" ]] && TITLE="YouTube ${VIDEO_ID:-unknown}"
[[ -z "$VIDEO_ID" ]] && VIDEO_ID="unknown"

# VTT → "START_SEC\tTEXT" (drop consecutive duplicate texts)
CUES_FILE="$TMPDIR/cues.tsv"
awk '
BEGIN { prev = "" }
/^WEBVTT/ || /^Kind:/ || /^Language:/ || /^$/ || /^NOTE/ { next }
/^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+ -->/ {
  split($1, t, /[:.]/)
  start = t[1]*3600 + t[2]*60 + t[3] + t[4]/1000
  next
}
{
  gsub(/<[^>]+>/, "")
  gsub(/&amp;/, "\\&"); gsub(/&#39;/, "\x27"); gsub(/&lt;/, "<"); gsub(/&gt;/, ">"); gsub(/&quot;/, "\"")
  gsub(/^[ \t]+|[ \t]+$/, "")
  gsub(/[ \t]+/, " ")
  if ($0 == "" || $0 == prev) next
  printf "%.3f\t%s\n", start, $0
  prev = $0
}
' "$SUB_FILE" > "$CUES_FILE"

CUE_COUNT=$(wc -l < "$CUES_FILE" | tr -d ' ')

# Merge on leading >> ; emit "START_SEC\tTURN_TEXT"
TURNS_FILE="$TMPDIR/turns.tsv"
awk -F'\t' '
function flush() {
  if (n == 0) return
  out = parts[1]
  for (i = 2; i <= n; i++) out = out " " parts[i]
  gsub(/[ \t]+/, " ", out)
  gsub(/^[ \t]+|[ \t]+$/, "", out)
  if (out != "") printf "%.3f\t%s\n", tstart, out
  n = 0
}
{
  sec = $1 + 0
  line = $2
  is_b = 0
  if (line ~ /^>>/) {
    is_b = 1
    sub(/^>>[ \t]*/, "", line)
  }
  if (is_b) flush()
  if (line == "") next
  if (n == 0) tstart = sec
  parts[++n] = line
}
END { flush() }
' "$CUES_FILE" > "$TURNS_FILE"

TURN_COUNT=$(wc -l < "$TURNS_FILE" | tr -d ' ')

fmt_ts() {
  local s=${1%.*}
  s=${s:-0}
  local h=$((s / 3600)) m=$(((s % 3600) / 60)) sec=$((s % 60))
  if [[ "$h" -gt 0 ]]; then
    printf '%d:%02d:%02d' "$h" "$m" "$sec"
  else
    printf '%d:%02d' "$m" "$sec"
  fi
}

if [[ "$DURATION_SEC" -gt 0 ]]; then
  DURATION_FMT=$(fmt_ts "$DURATION_SEC")
else
  DURATION_FMT="unknown"
fi

ID=$(TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S')
DATE_KST=$(TZ='Asia/Seoul' date '+%Y-%m-%dT%H:%M:%S+09:00')
SOURCE="https://youtu.be/${VIDEO_ID}"

SLUG=$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9가-힣]+/-/g; s/^-+//; s/-+$//; s/^(.{80}).*/\1/')
[[ -z "$SLUG" ]] && SLUG=$(printf '%s' "$VIDEO_ID" | tr '[:upper:]' '[:lower:]')

# YAML-escape helper via python
yaml_esc() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1], ensure_ascii=False))' "$1"
}

TITLE_Y=$(yaml_esc "$TITLE")
ID_Y=$(yaml_esc "$ID")
SOURCE_Y=$(yaml_esc "$SOURCE")
VID_Y=$(yaml_esc "$VIDEO_ID")
CH_Y=$(yaml_esc "$CHANNEL")
LANG_Y=$(yaml_esc "$LANG_CODE")
DUR_Y=$(yaml_esc "$DURATION_FMT")

BODY_FILE="$TMPDIR/body.md"
: > "$BODY_FILE"
while IFS=$'\t' read -r sec text; do
  ts=$(fmt_ts "$sec")
  printf '<!-- [%s] -->\n%s\n\n' "$ts" "$text" >> "$BODY_FILE"
done < "$TURNS_FILE"

DOC_FILE="$TMPDIR/doc.md"
{
  echo '---'
  printf 'title:       %s\n' "$TITLE_Y"
  printf 'date:        %s\n' "$DATE_KST"
  echo 'tags:        ["transcript", "youtube"]'
  printf 'identifier:  %s\n' "$ID_Y"
  printf 'source:      %s\n' "$SOURCE_Y"
  printf 'video_id:    %s\n' "$VID_Y"
  printf 'channel:     %s\n' "$CH_Y"
  printf 'lang:        %s\n' "$LANG_Y"
  printf 'duration:    %s\n' "$DUR_Y"
  printf 'cues:        %s\n' "$CUE_COUNT"
  printf 'turns:       %s\n' "$TURN_COUNT"
  echo '---'
  echo
  cat "$BODY_FILE"
} > "$DOC_FILE"

if ! $NO_SAVE; then
  mkdir -p "$OUTDIR"
  OUT_PATH="${OUTDIR}/${ID}--${SLUG}__transcript_youtube.md"
  if [[ -e "$OUT_PATH" ]]; then
    echo "Error: file already exists: $OUT_PATH" >&2
    exit 1
  fi
  cp "$DOC_FILE" "$OUT_PATH"
  echo "Saved: $OUT_PATH" >&2
fi

cat "$DOC_FILE"
