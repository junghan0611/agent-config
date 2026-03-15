#!/usr/bin/env bash
# diskspace — agent-friendly disk space analyzer
# Wraps gdu + duf + fd + nix commands
set -euo pipefail

SCRIPT_NAME="diskspace"
VERSION="0.1.0"

usage() {
  cat <<EOF
$SCRIPT_NAME v$VERSION — Agent-friendly disk space analyzer

Usage: $SCRIPT_NAME <command> [options]

Commands:
  overview                       Mount point summary (instant)
  top <path> [--depth N]         Largest subdirectories (10-15s)
  bigfiles [path] [--min SIZE]   Find large files (fast, <1s)
  nix                            NixOS store/generation analysis (1-15s)
  clean                          Suggest cleanup actions

Examples:
  $SCRIPT_NAME overview
  $SCRIPT_NAME top ~
  $SCRIPT_NAME top ~/repos --depth 2
  $SCRIPT_NAME bigfiles ~ --min 500M
  $SCRIPT_NAME nix
  $SCRIPT_NAME clean
EOF
}

cmd_overview() {
  echo "=== Disk Overview ==="
  echo ""

  # duf JSON → parsed summary
  if command -v duf &>/dev/null; then
    duf --json 2>/dev/null | jq -r '
      .[] | select(.device_type == "local" and .total > 0) |
      "\(.mount_point)\t\(.total / 1073741824 | floor)G total\t\(.used / 1073741824 * 10 | floor / 10)G used\t\(.free / 1073741824 * 10 | floor / 10)G free\t\(.used * 100 / .total | floor)%"
    ' | column -t -s $'\t'
  else
    df -h --type=ext4 --type=btrfs --type=xfs --type=vfat 2>/dev/null || df -h /
  fi

  echo ""
  echo "=== Inode Usage ==="
  df -i / 2>/dev/null | tail -1 | awk '{printf "%s: %s used / %s total (%s)\n", $1, $3, $2, $5}'
}

cmd_top() {
  local target="${1:-$HOME}"
  local depth=1
  shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --depth) depth="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  echo "=== Top directories: $target (depth=$depth) ==="
  echo ""

  if command -v gdu &>/dev/null; then
    if [[ "$target" == "/" ]]; then
      gdu -n -p -c -i /nix/store,/proc,/dev,/sys,/run "$target" 2>/dev/null
      echo ""
      echo "(note: /nix/store excluded — use '$SCRIPT_NAME nix' for store analysis)"
    else
      gdu -n -p -c "$target" 2>/dev/null
    fi
  else
    echo "(gdu not found, falling back to du — this may be slow)"
    du -h --max-depth="$depth" "$target" 2>/dev/null | sort -rh | head -25
  fi
}

cmd_bigfiles() {
  local target="${1:-$HOME}"
  local min_size="100M"
  shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --min) min_size="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  echo "=== Files >= $min_size in $target ==="
  echo ""

  if command -v fd &>/dev/null; then
    fd --type f --size "+${min_size}" . "$target" --exclude /nix/store --exclude /proc --exclude /sys 2>/dev/null \
      | while IFS= read -r f; do
          stat --printf="%s\t%n\n" "$f" 2>/dev/null
        done \
      | sort -rn \
      | awk -F'\t' '{
          size=$1;
          if (size >= 1073741824) printf "%6.1f GiB  %s\n", size/1073741824, $2;
          else printf "%6.0f MiB  %s\n", size/1048576, $2;
        }' \
      | head -30
  else
    find "$target" -type f -size "+${min_size}" -exec ls -lhS {} + 2>/dev/null | head -30
  fi
}

cmd_nix() {
  echo "=== NixOS Disk Analysis ==="
  echo ""

  echo "--- Filesystem ---"
  df -h / 2>/dev/null | tail -1 | awk '{printf "Total: %s  Used: %s  Free: %s  Use%%: %s\n", $2, $3, $4, $5}'

  echo ""
  echo "--- Current System Closure ---"
  nix path-info -Sh /run/current-system 2>/dev/null | awk '{printf "Size: %s %s\n", $2, $3}'

  echo ""
  echo "--- Nix Store ---"
  local store_count
  store_count=$(ls /nix/store 2>/dev/null | wc -l)
  echo "Paths: $store_count"

  echo ""
  echo "--- GC Roots ---"
  local gc_roots
  gc_roots=$(nix-store --gc --print-roots 2>/dev/null | grep -v '/proc/' | wc -l)
  echo "Active roots: $gc_roots"

  echo ""
  echo "--- System Generations ---"
  sudo nix-env --list-generations --profile /nix/var/nix/profiles/system 2>/dev/null | tail -10

  echo ""
  echo "--- Home-Manager Generations ---"
  local hm_count
  hm_count=$(find ~/.local/state/nix/profiles/ -name 'home-manager-*-link' -maxdepth 1 2>/dev/null | wc -l)
  echo "Count: $hm_count"

  echo ""
  echo "--- Result Symlinks (reclaimable) ---"
  local result_links
  result_links=$(find ~/repos -maxdepth 3 -name "result" -type l 2>/dev/null | wc -l)
  echo "Found: $result_links"
}

cmd_clean() {
  echo "=== Cleanup Suggestions ==="
  echo ""

  # 1. Disk usage
  local use_pct
  use_pct=$(df / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
  if [[ "$use_pct" -ge 90 ]]; then
    echo "⚠️  Disk usage: ${use_pct}% — CRITICAL"
  elif [[ "$use_pct" -ge 80 ]]; then
    echo "⚡ Disk usage: ${use_pct}% — getting tight"
  else
    echo "✅ Disk usage: ${use_pct}% — OK"
  fi
  echo ""

  # 2. Nix GC
  local gc_roots
  gc_roots=$(nix-store --gc --print-roots 2>/dev/null | grep -v '/proc/' | wc -l)
  echo "--- Nix ---"
  echo "GC roots: $gc_roots"
  local sys_gens
  sys_gens=$(sudo nix-env --list-generations --profile /nix/var/nix/profiles/system 2>/dev/null | wc -l)
  echo "System generations: $sys_gens"
  if [[ "$sys_gens" -gt 5 ]]; then
    echo "→ sudo nix-collect-garbage --delete-older-than 7d"
  fi

  echo ""
  echo "--- Caches ---"
  local cache_size npm_size gradle_size
  cache_size=$(du -sh ~/.cache 2>/dev/null | cut -f1)
  npm_size=$(du -sh ~/.npm 2>/dev/null | cut -f1)
  gradle_size=$(du -sh ~/.gradle 2>/dev/null | cut -f1)
  echo "~/.cache:  ${cache_size:-N/A}"
  echo "~/.npm:    ${npm_size:-N/A}"
  echo "~/.gradle: ${gradle_size:-N/A}"

  echo ""
  echo "--- Result Symlinks ---"
  local result_links
  result_links=$(find ~/repos -maxdepth 3 -name "result" -type l 2>/dev/null | wc -l)
  echo "result symlinks in ~/repos: $result_links"
  if [[ "$result_links" -gt 0 ]]; then
    echo "→ find ~/repos -maxdepth 3 -name result -type l -delete"
  fi

  echo ""
  echo "--- Downloads ---"
  local dl_size
  dl_size=$(du -sh ~/Downloads 2>/dev/null | cut -f1)
  echo "~/Downloads: ${dl_size:-N/A}"

  echo ""
  echo "--- Large Files (>500M in ~) ---"
  if command -v fd &>/dev/null; then
    local big_count
    big_count=$(fd --type f --size +500M . ~ --exclude /nix/store 2>/dev/null | wc -l)
    echo "Files >500M: $big_count"
    if [[ "$big_count" -gt 0 ]]; then
      echo "→ $SCRIPT_NAME bigfiles ~ --min 500M"
    fi
  fi
}

# --- Main ---
case "${1:-}" in
  overview)  shift; cmd_overview "$@" ;;
  top)       shift; cmd_top "$@" ;;
  bigfiles)  shift; cmd_bigfiles "$@" ;;
  nix)       shift; cmd_nix "$@" ;;
  clean)     shift; cmd_clean "$@" ;;
  -h|--help) usage ;;
  -v|--version) echo "$SCRIPT_NAME v$VERSION" ;;
  *)         usage; exit 1 ;;
esac
