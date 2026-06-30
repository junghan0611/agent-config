#!/usr/bin/env bash
# Shared scanner — called by pre-commit and pre-push.
# Scans ADDED lines in a diff for:
#   1. Secrets (gitleaks, if installed)
#   2. Identity terms (sensitive-terms.txt, strict mode only)
#
# Usage:
#   _scan.sh staged              # scan `git diff --cached`
#   _scan.sh range <SHA1> <SHA2> # scan `git diff SHA1..SHA2`
#
# Exits 0 on clean, 1 on violation, 2 on internal error.
# Honors AGENT_ALLOW_UNSAFE_COMMIT=1 (with WARN).

set -uo pipefail

# --- Resolve hook dir ---
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERMS_FILE="$HOOK_DIR/sensitive-terms.txt"
ALLOW_PATHS_FILE="$HOOK_DIR/allowlist-paths.txt"
GITLEAKS_CONFIG="$HOOK_DIR/gitleaks.toml"

# --- Bypass ---
if [ "${AGENT_ALLOW_UNSAFE_COMMIT:-}" = "1" ]; then
  echo "⚠ AGENT_ALLOW_UNSAFE_COMMIT=1 — scan bypassed (GLG override)" >&2
  exit 0
fi

# --- Colors (TTY only) ---
if [ -t 2 ]; then
  C_RED=$'\033[31m'; C_YEL=$'\033[33m'; C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'; C_OFF=$'\033[0m'
else
  C_RED=""; C_YEL=""; C_DIM=""; C_BOLD=""; C_OFF=""
fi

# --- Mode detection ---
# strict: scan secrets + identity terms (public repos)
# loose:  scan secrets only
# off:    skip entirely (warning printed)
detect_mode() {
  local repo_root override_file
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "loose"; return; }

  override_file="$repo_root/.git-hooks-mode"
  if [ -f "$override_file" ]; then
    head -1 "$override_file" | tr -d '[:space:]'
    return
  fi

  local remote
  remote=$(git remote get-url origin 2>/dev/null || true)
  case "$remote" in
    *github.com[:/]junghan0611/*|*github.com[:/]junghanacs/*)
      echo "strict" ;;
    *)
      echo "loose" ;;
  esac
}

MODE=$(detect_mode)
case "$MODE" in
  off)
    echo "⚠ git-hooks mode=off for this repo — scan skipped" >&2
    exit 0
    ;;
  strict|loose) ;;
  *)
    echo "${C_RED}✗${C_OFF} unknown .git-hooks-mode: '$MODE' (expected strict/loose/off)" >&2
    exit 2
    ;;
esac

# --- Args → produce diff to scan ---
SOURCE="${1:-staged}"

emit_diff() {
  case "$SOURCE" in
    staged)
      git diff --cached --no-color -U0 --diff-filter=ACMR
      ;;
    range)
      local sha1="${2:-}" sha2="${3:-}"
      [ -z "$sha1" ] || [ -z "$sha2" ] && { echo "_scan.sh range needs <sha1> <sha2>" >&2; exit 2; }
      # sha1 all-zero = new ref on the remote (new branch OR a tag push).
      # Do NOT diff from the empty tree — that re-scans the whole history and
      # re-flags grandfathered content (every CalVer tag push would block).
      # Instead scan only commits not already on ANY remote-tracking ref.
      if [ "$sha1" = "0000000000000000000000000000000000000000" ]; then
        local new_commits oldest
        new_commits=$(git rev-list "$sha2" --not --remotes 2>/dev/null)
        if [ -z "$new_commits" ]; then
          return 0  # nothing reachable from sha2 is new to the remote → clean
        fi
        oldest=$(printf '%s\n' "$new_commits" | tail -1)
        if git rev-parse -q --verify "${oldest}^" >/dev/null 2>&1; then
          sha1="${oldest}^"                      # parent of oldest new commit
        else
          sha1=$(git hash-object -t tree /dev/null)  # root commit → empty tree
        fi
      fi
      git diff --no-color -U0 --diff-filter=ACMR "$sha1..$sha2"
      ;;
    *)
      echo "_scan.sh: unknown source '$SOURCE' (use 'staged' or 'range')" >&2
      exit 2
      ;;
  esac
}

# --- Allowlist check ---
# Combine global + per-repo allowlist into a single ERE alt-list.
build_allow_regex() {
  local repo_root extra=""
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || repo_root="."
  if [ -f "$repo_root/.git-hooks-allow" ]; then
    extra=$(grep -vE '^\s*(#|$)' "$repo_root/.git-hooks-allow" || true)
  fi
  { grep -vE '^\s*(#|$)' "$ALLOW_PATHS_FILE" 2>/dev/null; echo "$extra"; } \
    | grep -vE '^\s*$' | paste -sd '|' -
}

# awk's ERE engine warns on `\.` (treats as plain `.`). Same semantics via `[.]`.
ALLOW_RE=$(build_allow_regex | sed 's/\\\./[.]/g')

# --- Parse diff → emit "path<TAB>lineno<TAB>added-content" for each + line ---
# Awk handles diff parsing once for the whole stream.
parse_added_lines() {
  awk -v allow_re="$ALLOW_RE" '
    function path_allowed(p,    re) {
      if (allow_re == "") return 0
      return (p ~ allow_re)
    }
    /^diff --git / {
      # diff --git a/<path> b/<path>
      # naive split; paths with spaces are rare and would fall back to scan-all
      n = split($0, parts, " ")
      file = parts[n]
      sub(/^b\//, "", file)
      skip = path_allowed(file)
      in_hunk = 0
      next
    }
    /^@@/ {
      if (skip) { in_hunk = 0; next }
      # @@ -old[,n] +newstart[,n] @@
      if (match($0, /\+[0-9]+/)) {
        lineno = substr($0, RSTART+1, RLENGTH-1) + 0
      } else {
        lineno = 0
      }
      in_hunk = 1
      next
    }
    /^\+\+\+/ || /^---/ { next }
    /^\+/ {
      if (!in_hunk || skip) next
      content = substr($0, 2)
      printf "%s\t%d\t%s\n", file, lineno, content
      lineno++
      next
    }
    # context/deleted lines in -U0 are rare; ignore safely
    { next }
  '
}

# --- Run terms scan on parsed added lines ---
# Returns lines: "<path>:<lineno>:<pattern>:<content>"
scan_terms() {
  local input="$1"
  [ "$MODE" != "strict" ] && return 0
  [ ! -s "$TERMS_FILE" ] && return 0
  [ ! -s "$input" ] && return 0

  # Build pattern list (skip comments/blanks)
  local patterns
  patterns=$(grep -vE '^\s*(#|$)' "$TERMS_FILE" || true)
  [ -z "$patterns" ] && return 0

  # For each added line, test against all patterns. Use grep -iE -f for speed.
  # We need to know which pattern matched → loop per pattern (cheap, small set).
  local tmp_violations
  tmp_violations=$(mktemp)
  trap 'rm -f "$tmp_violations"' RETURN

  while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    grep -iE "$pat" "$input" 2>/dev/null | while IFS=$'\t' read -r p ln content; do
      printf "%s\t%s\t%s\t%s\n" "$p" "$ln" "$pat" "$content"
    done >> "$tmp_violations"
  done <<< "$patterns"

  if [ -s "$tmp_violations" ]; then
    cat "$tmp_violations"
    return 1
  fi
  return 0
}

# --- Run gitleaks (if installed) on the diff stream ---
scan_secrets_gitleaks() {
  local diff_file="$1"
  if ! command -v gitleaks >/dev/null 2>&1; then
    return 99  # not installed → caller handles
  fi
  [ ! -s "$diff_file" ] && return 0

  local cfg_arg=""
  [ -f "$GITLEAKS_CONFIG" ] && cfg_arg="--config=$GITLEAKS_CONFIG"

  # Scan the diff stream from stdin.
  # NOTE: gitleaks 8.x removed `detect --source=-`; that form silently scans
  # 0 bytes (treats "-" as a missing file path) and always reports clean,
  # which left the secret net dead. The `stdin` subcommand is the correct
  # pipe interface. Exits 1 on findings, 0 on clean.
  if gitleaks stdin --no-banner --report-format=json --report-path="$diff_file.gitleaks.json" \
       $cfg_arg <"$diff_file" >/dev/null 2>&1; then
    return 0  # no findings
  else
    return 1  # findings
  fi
}

# --- Fallback secret scan (when gitleaks missing) — bare-minimum patterns ---
scan_secrets_fallback() {
  local added_lines="$1"
  [ ! -s "$added_lines" ] && return 0
  # Conservative patterns — only obvious key shapes
  local fb_patterns='sk-ant-[a-zA-Z0-9_-]{20,}|sk-proj-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|gsk_[a-zA-Z0-9]{20,}|hf_[a-zA-Z0-9]{20,}|r8_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|ghs_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{20,}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----'
  grep -E "$fb_patterns" "$added_lines" 2>/dev/null
}

# ============================================================
# Main
# ============================================================

DIFF_FILE=$(mktemp)
ADDED_FILE=$(mktemp)
trap 'rm -f "$DIFF_FILE" "$ADDED_FILE" "$DIFF_FILE.gitleaks.json"' EXIT

emit_diff "$@" > "$DIFF_FILE"
if [ ! -s "$DIFF_FILE" ]; then
  exit 0  # nothing to scan
fi

parse_added_lines < "$DIFF_FILE" > "$ADDED_FILE"

violations=0

# --- Identity terms (strict only) ---
TERM_HITS=$(mktemp); trap 'rm -f "$DIFF_FILE" "$ADDED_FILE" "$TERM_HITS" "$DIFF_FILE.gitleaks.json"' EXIT
if ! scan_terms "$ADDED_FILE" > "$TERM_HITS"; then
  violations=1
  echo "" >&2
  echo "${C_RED}${C_BOLD}✗ blocked: identity term(s) in added lines${C_OFF}" >&2
  echo "  ${C_DIM}repo:${C_OFF} $(git rev-parse --show-toplevel 2>/dev/null)" >&2
  echo "  ${C_DIM}mode:${C_OFF} $MODE" >&2
  echo "" >&2
  while IFS=$'\t' read -r p ln pat content; do
    [ -z "$p" ] && continue
    # Truncate long content
    [ ${#content} -gt 100 ] && content="${content:0:100}…"
    echo "  ${C_BOLD}${p}:${ln}${C_OFF}  match=${C_YEL}${pat}${C_OFF}" >&2
    echo "    ${C_DIM}${content}${C_OFF}" >&2
  done < "$TERM_HITS"
fi

# --- Secrets ---
if scan_secrets_gitleaks "$DIFF_FILE"; then
  : # clean
elif [ $? -eq 99 ]; then
  # gitleaks not installed → fallback
  FALLBACK_HITS=$(scan_secrets_fallback "$ADDED_FILE" || true)
  if [ -n "$FALLBACK_HITS" ]; then
    violations=1
    echo "" >&2
    echo "${C_RED}${C_BOLD}✗ blocked: secret-like value in added lines${C_OFF} ${C_DIM}(fallback patterns; gitleaks not installed)${C_OFF}" >&2
    echo "$FALLBACK_HITS" | while IFS=$'\t' read -r p ln content; do
      [ ${#content} -gt 120 ] && content="${content:0:120}…"
      echo "  ${C_BOLD}${p}:${ln}${C_OFF}" >&2
      echo "    ${C_DIM}${content}${C_OFF}" >&2
    done
  else
    echo "${C_DIM}ℹ gitleaks not installed — using fallback secret patterns. Install with: nix shell nixpkgs#gitleaks${C_OFF}" >&2
  fi
else
  violations=1
  echo "" >&2
  echo "${C_RED}${C_BOLD}✗ blocked: gitleaks found secret(s) in added lines${C_OFF}" >&2
  if [ -s "$DIFF_FILE.gitleaks.json" ]; then
    # Pretty-print key fields if jq available, else raw
    if command -v jq >/dev/null 2>&1; then
      jq -r '.[] | "  [1m\(.File):\(.StartLine)[0m  rule=[33m\(.RuleID)[0m\n    [2m\(.Secret[0:80])…[0m"' \
        "$DIFF_FILE.gitleaks.json" >&2 2>/dev/null || cat "$DIFF_FILE.gitleaks.json" >&2
    else
      cat "$DIFF_FILE.gitleaks.json" >&2
    fi
  fi
fi

if [ $violations -ne 0 ]; then
  cat >&2 <<EOF

${C_BOLD}How to fix:${C_OFF}
  1. Remove the offending value/term from your changes.
  2. For identity terms: use a generic placeholder or move detail to a
     private file (gitignored, e.g. PRIVATE.md, .env.local).
  3. For false positives (meta references, documentation), get GLG to
     approve, then commit with:
       ${C_DIM}AGENT_ALLOW_UNSAFE_COMMIT=1 git commit ...${C_OFF}
     ${C_YEL}Agents must NEVER set this env var themselves — GLG only.${C_OFF}

  Source: ~/repos/gh/agent-config/git-hooks/
EOF
  exit 1
fi

exit 0
