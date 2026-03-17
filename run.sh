#!/usr/bin/env bash
# agent-config — 에이전트 인프라 원커맨드 CLI
# Usage: ./run.sh <command> [args]
#
# SSOT: skills/<스킬>/<바이너리> + skills/<스킬>/SKILL.md
# 머신별 네이티브 빌드, NixOS 환경 전용
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SM_DIR="$SCRIPT_DIR/pi-extensions/semantic-memory"
SKILLS_DIR="$SCRIPT_DIR/skills"
ENV_FILE="$HOME/.env.local"
REPOS="$HOME/repos/gh"
ARCH="$(uname -m)"  # aarch64 / x86_64

# --- Helpers ---

load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a; source "$ENV_FILE"; set +a
  else
    echo "⚠ $ENV_FILE not found"
  fi
}

log()  { echo "  $*"; }
ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠ $*"; }
fail() { echo "  ❌ $*"; }
section() { echo ""; echo "=== $* ==="; }

# Ensure git repo exists — clone if missing
ensure_repo() {
  local name=$1 url=$2
  local dir="$REPOS/$name"
  if [ -d "$dir" ]; then
    log "$name: exists"
  else
    log "$name: cloning..."
    git clone "$url" "$dir"
    ok "$name: cloned"
  fi
}

# Create symlink — remove old/broken first
ensure_link() {
  local target=$1 link=$2
  if [ -L "$link" ]; then
    local current
    current=$(readlink "$link")
    if [ "$current" = "$target" ]; then
      ok "$(basename "$link") → (already correct)"
      return
    fi
    rm "$link"
  elif [ -e "$link" ]; then
    warn "$(basename "$link"): not a symlink, skipping"
    return
  fi
  local parent
  parent=$(dirname "$link")
  mkdir -p "$parent"
  ln -s "$target" "$link"
  ok "$(basename "$link") → $target"
}

# Build Go binary — CGO_ENABLED=0, static, stripped
go_build() {
  local src_dir=$1 output=$2
  (cd "$src_dir" && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$output" .)
}

# --- CLI Repo Definitions ---
# name, git_url, go_src_subdir, build_type
#   build_type: go | go-version | graalvm | go-install

declare -A CLI_REPOS=(
  [denotecli]="https://github.com/junghan0611/denotecli.git"
  [gitcli]="https://github.com/junghan0611/gitcli.git"
  [lifetract]="https://github.com/junghan0611/lifetract.git"
  [zotero-config]="https://github.com/junghan0611/zotero-config.git"
  [dictcli]="https://github.com/junghan0611/dictcli.git"
)

# Go src subdirectory within each repo
declare -A CLI_GO_SRC=(
  [denotecli]="denotecli"
  [gitcli]="gitcli"
  [lifetract]="lifetract"
  [bibcli]="bibcli"   # inside zotero-config
)

# --- setup:repos — Clone missing repos ---

setup_repos() {
  section "Git Repositories"
  for name in "${!CLI_REPOS[@]}"; do
    ensure_repo "$name" "${CLI_REPOS[$name]}"
  done
}

# --- setup:build — Build all CLI binaries ---

setup_build() {
  section "Build CLI Binaries ($ARCH)"

  # Go-based CLIs
  log "--- denotecli ---"
  go_build "$REPOS/denotecli/denotecli" "$SKILLS_DIR/denotecli/denotecli"
  ok "denotecli $(du -h "$SKILLS_DIR/denotecli/denotecli" | cut -f1)"

  log "--- bibcli ---"
  local BIBCLI_VERSION
  BIBCLI_VERSION="$(git -C "$REPOS/zotero-config" describe --tags --always --dirty 2>/dev/null || echo dev)"
  (cd "$REPOS/zotero-config/bibcli" && CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=$BIBCLI_VERSION" -o "$SKILLS_DIR/bibcli/bibcli" .)
  ok "bibcli $(du -h "$SKILLS_DIR/bibcli/bibcli" | cut -f1)"

  log "--- gitcli ---"
  go_build "$REPOS/gitcli/gitcli" "$SKILLS_DIR/gitcli/gitcli"
  ok "gitcli $(du -h "$SKILLS_DIR/gitcli/gitcli" | cut -f1)"

  log "--- lifetract ---"
  go_build "$REPOS/lifetract/lifetract" "$SKILLS_DIR/lifetract/lifetract"
  ok "lifetract $(du -h "$SKILLS_DIR/lifetract/lifetract" | cut -f1)"

  log "--- gog (go install) ---"
  CGO_ENABLED=0 go install github.com/steipete/gogcli/cmd/gog@latest 2>&1 || true
  if [ -f "$HOME/go/bin/gog" ]; then
    cp "$HOME/go/bin/gog" "$SKILLS_DIR/gogcli/gog"
    ok "gog $(du -h "$SKILLS_DIR/gogcli/gog" | cut -f1)"
  else
    warn "gog: go install failed"
  fi

  log "--- dictcli (GraalVM native-image) ---"
  local dictcli_bin="$REPOS/dictcli/target/dictcli-${ARCH}"
  if [ -f "$dictcli_bin" ]; then
    cp "$dictcli_bin" "$SKILLS_DIR/dictcli/dictcli"
    chmod +x "$SKILLS_DIR/dictcli/dictcli"
    ok "dictcli $(du -h "$SKILLS_DIR/dictcli/dictcli" | cut -f1) (pre-built)"
  elif command -v native-image &>/dev/null; then
    log "Building dictcli with GraalVM..."
    (cd "$REPOS/dictcli" && ./run.sh native-build)
    cp "$dictcli_bin" "$SKILLS_DIR/dictcli/dictcli"
    chmod +x "$SKILLS_DIR/dictcli/dictcli"
    ok "dictcli $(du -h "$SKILLS_DIR/dictcli/dictcli" | cut -f1)"
  else
    warn "dictcli: no pre-built binary and native-image not available"
    warn "  Build manually: cd $REPOS/dictcli && ./run.sh native-build"
  fi

  # dictcli graph.edn (데이터 파일)
  if [ -f "$REPOS/dictcli/graph.edn" ]; then
    cp "$REPOS/dictcli/graph.edn" "$SKILLS_DIR/dictcli/graph.edn"
    ok "graph.edn $(du -h "$SKILLS_DIR/dictcli/graph.edn" | cut -f1)"
  fi
}

# --- setup:links — Symlinks for pi, claude, opencode ---

setup_links() {
  section "Pi Agent Links"

  # Extension
  mkdir -p "$HOME/.pi/agent/extensions"
  ensure_link "$SM_DIR" "$HOME/.pi/agent/extensions/semantic-memory"

  # Skills (pi)
  mkdir -p "$HOME/.pi/agent/skills"
  ensure_link "$SKILLS_DIR" "$HOME/.pi/agent/skills/pi-skills"

  section "Claude Code Skills"
  # ~/.claude/skills/<name> → skills/<name> (SKILL.md가 있는 폴더)
  mkdir -p "$HOME/.claude/skills"
  # 레거시 깨진 링크 정리
  for link in "$HOME/.claude/skills/"*; do
    if [ -L "$link" ] && [ ! -e "$link" ]; then
      rm "$link"
      log "removed broken link: $(basename "$link")"
    fi
  done
  for skill_dir in "$SKILLS_DIR"/*/; do
    local name
    name=$(basename "$skill_dir")
    [ -f "$skill_dir/SKILL.md" ] || continue
    ensure_link "$skill_dir" "$HOME/.claude/skills/$name"
  done

  section "OpenCode Skills"
  # ~/.config/opencode/skills/<name>/SKILL.md
  mkdir -p "$HOME/.config/opencode/skills"
  for link in "$HOME/.config/opencode/skills/"*; do
    if [ -L "$link" ] && [ ! -e "$link" ]; then
      rm "$link"
      log "removed broken link: $(basename "$link")"
    fi
  done
  for skill_dir in "$SKILLS_DIR"/*/; do
    local name
    name=$(basename "$skill_dir")
    [ -f "$skill_dir/SKILL.md" ] || continue
    ensure_link "$skill_dir" "$HOME/.config/opencode/skills/$name"
  done
}

# --- setup:npm — npm install for extensions/skills ---

setup_npm() {
  section "npm install"

  # semantic-memory extension
  if [ ! -d "$SM_DIR/node_modules" ]; then
    log "semantic-memory: installing..."
    (cd "$SM_DIR" && npm install --silent 2>&1)
    ok "semantic-memory"
  else
    ok "semantic-memory (already installed)"
  fi

  # Skills with package.json
  for pkg_dir in "$SKILLS_DIR"/*/; do
    if [ -f "$pkg_dir/package.json" ] && [ ! -d "$pkg_dir/node_modules" ]; then
      log "$(basename "$pkg_dir"): installing..."
      (cd "$pkg_dir" && npm install --silent 2>/dev/null)
      ok "$(basename "$pkg_dir")"
    fi
  done
}

# --- setup — 원커맨드: clone + build + link + npm ---

setup_all() {
  echo "🔧 agent-config setup ($ARCH)"
  echo "   SSOT: $SKILLS_DIR"

  setup_repos
  setup_build
  setup_links
  setup_npm

  section "Verification"
  local total=0 pass=0
  for cli in denotecli bibcli gitcli lifetract dictcli; do
    local bin="$SKILLS_DIR/$cli/$cli"
    if [ -f "$bin" ] && [ -x "$bin" ]; then
      local arch
      arch=$(file "$bin" | grep -oP 'ARM aarch64|x86-64' || echo "unknown")
      ok "$cli ($arch, $(du -h "$bin" | cut -f1))"
      pass=$((pass + 1))
    else
      fail "$cli: missing or not executable"
    fi
    total=$((total + 1))
  done
  # gog
  local gog_bin="$SKILLS_DIR/gogcli/gog"
  if [ -f "$gog_bin" ] && [ -x "$gog_bin" ]; then
    ok "gog ($(du -h "$gog_bin" | cut -f1))"
    pass=$((pass + 1))
  else
    fail "gog: missing"
  fi
  total=$((total + 1))

  section "Summary"
  echo "  Binaries: $pass/$total"
  echo "  Skills:   $(find "$SKILLS_DIR" -name "SKILL.md" | wc -l)"
  echo "  Arch:     $ARCH"
  echo "  Pi ext:   $(readlink "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo 'not linked')"
  echo "  Pi skill: $(readlink "$HOME/.pi/agent/skills/pi-skills" 2>/dev/null || echo 'not linked')"
  echo "  Claude:   $(ls "$HOME/.claude/skills/" 2>/dev/null | wc -l) skills"
  echo "  OpenCode: $(ls "$HOME/.config/opencode/skills/" 2>/dev/null | wc -l) skills"
}

# --- help ---

help() {
  cat << 'EOF'
agent-config — 에이전트 인프라 원커맨드 CLI

Usage: ./run.sh <command> [args]

=== 설치/빌드 ===
  setup                       원커맨드 전체 설치 (clone + build + link + npm)
  setup:repos                 Git 리포 clone (없는 것만)
  setup:build                 CLI 바이너리 빌드 (네이티브)
  setup:links                 심볼릭 링크 (pi + claude + opencode)
  setup:npm                   npm install (extension + skills)

=== 테스트 ===
  test                        모든 테스트 (unit + integration)
  test:unit                   유닛 테스트 (API 불필요)
  test:integration            통합 테스트 (API 필요)
  test:search "q"             라이브 검색 테스트

=== 인덱싱 ===
  index:sessions [--force]    세션 인덱싱 (3072d)
  index:org [--force]         Org 인덱싱 (768d)
  compact [sessions|org]      DB 조각 모음
  status                      인덱스 상태

=== 벤치마크 ===
  bench                       전체 벤치마크 (API 필요)
  bench:dry                   드라이런

=== 유틸 ===
  chunk:org [--sample]        청킹 통계
  env                         환경변수 상태
EOF
}

# --- Dispatch ---

case "${1:-help}" in
  help|-h|--help)
    help ;;

  # === Setup ===
  setup)
    setup_all ;;
  setup:repos)
    setup_repos ;;
  setup:build)
    setup_build ;;
  setup:links)
    setup_links ;;
  setup:npm)
    setup_npm ;;

  # === Test ===
  test)
    shift; load_env; cd "$SM_DIR" && npx tsx test.ts "${@:-}" ;;
  test:unit)
    cd "$SM_DIR" && npx tsx test.ts unit ;;
  test:integration)
    load_env; cd "$SM_DIR" && npx tsx test.ts integration ;;
  test:search)
    shift; load_env; cd "$SM_DIR" && npx tsx test.ts search "$@" ;;

  # === Index ===
  index:sessions)
    shift; load_env; cd "$SM_DIR" && npx tsx indexer.ts sessions "$@" ;;
  index:org)
    shift; load_env; cd "$SM_DIR" && npx tsx indexer.ts org "$@" ;;
  compact)
    shift; cd "$SM_DIR" && npx tsx indexer.ts compact "${1:-all}" ;;
  status)
    cd "$SM_DIR" && npx tsx indexer.ts status ;;

  # === Bench ===
  bench)
    shift; load_env; cd "$SM_DIR" && npx tsx benchmark.ts "${@:-}" ;;
  bench:dry)
    cd "$SM_DIR" && npx tsx benchmark.ts dry ;;

  # === Util ===
  chunk:org)
    shift; cd "$SM_DIR" && node --input-type=module -e "
import { findOrgFiles, chunkOrgFile } from './org-chunker.ts';
import * as fs from 'node:fs';
const INCLUDE = new Set('meta,bib,notes,journal,botlog'.split(','));
const files = findOrgFiles().filter(f => {
  const parts = f.split('/');
  const orgIdx = parts.findIndex(p => p === 'org');
  return INCLUDE.has(parts[orgIdx + 1] || '');
});
const sample = '${1:-}' === '--sample';
let total = { files: 0, chunks: 0, h: 0, c: 0 };
const fStats = {};
for (const file of files) {
  try {
    const chunks = chunkOrgFile(fs.readFileSync(file, 'utf-8'), file);
    const folder = chunks[0]?.folder ?? 'unknown';
    if (!fStats[folder]) fStats[folder] = { f: 0, ch: 0, h: 0, c: 0 };
    fStats[folder].f++; fStats[folder].ch += chunks.length;
    fStats[folder].h += chunks.filter(c => c.chunkType === 'heading').length;
    fStats[folder].c += chunks.filter(c => c.chunkType === 'content').length;
    total.files++; total.chunks += chunks.length;
    total.h += chunks.filter(c => c.chunkType === 'heading').length;
    total.c += chunks.filter(c => c.chunkType === 'content').length;
    if (sample && total.files <= 3) {
      console.log('--- ' + file.split('/').pop());
      for (const ch of chunks.slice(0, 2)) console.log('  [' + ch.chunkType + '] ' + ch.text.slice(0, 120));
    }
  } catch {}
}
console.log('📊 Org Chunking Stats');
console.log(total.files + ' files → ' + total.chunks + ' chunks (h:' + total.h + ' c:' + total.c + ')');
console.log();
for (const [f, s] of Object.entries(fStats).sort((a,b) => b[1].ch - a[1].ch))
  console.log('  ' + f.padEnd(10) + s.f.toString().padStart(5) + ' files → ' + s.ch.toString().padStart(6) + ' chunks');
const est = Math.round(total.chunks * 100);
console.log('\n💰 Est: ~' + (est/1000).toFixed(0) + 'K tokens, ~\$' + (est/1e6*0.006).toFixed(3) + ', ~' + Math.round(total.chunks*768*4/1024/1024) + 'MB');
" ;;

  env)
    load_env 2>/dev/null || true
    echo "Arch:           $ARCH"
    echo "GEMINI_API_KEY: ${GEMINI_API_KEY:+SET (${#GEMINI_API_KEY}ch)}"
    echo "JINA_API_KEY:   ${JINA_API_KEY:+SET (${#JINA_API_KEY}ch)}"
    echo "Go:             $(go version 2>/dev/null | grep -oP 'go\d+\.\d+\.\d+' || echo 'not found')"
    echo "Node:           $(node --version 2>/dev/null || echo 'not found')"
    echo "GraalVM:        $(native-image --version 2>/dev/null || echo 'not found')"
    echo "Pi ext:         $(readlink "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo 'not linked')"
    echo "Pi skill:       $(readlink "$HOME/.pi/agent/skills/pi-skills" 2>/dev/null || echo 'not linked')"
    for cli in denotecli bibcli gitcli lifetract dictcli; do
      _bin="$SKILLS_DIR/$cli/$cli"
      if [ -f "$_bin" ]; then
        echo "  $cli: $(file "$_bin" | grep -oP 'ARM aarch64|x86-64') $(du -h "$_bin" | cut -f1)"
      else
        echo "  $cli: not built"
      fi
    done
    _gog="$SKILLS_DIR/gogcli/gog"
    if [ -f "$_gog" ]; then
      echo "  gog: $(file "$_gog" | grep -oP 'ARM aarch64|x86-64') $(du -h "$_gog" | cut -f1)"
    else
      echo "  gog: not built"
    fi
    ;;

  *)
    echo "Unknown: $1"; help; exit 1 ;;
esac
