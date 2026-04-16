#!/usr/bin/env bash
# agent-config — 에이전트 인프라 원커맨드 CLI
# Usage: ./run.sh <command> [args]
#
# SSOT: skills/<스킬>/<바이너리> + skills/<스킬>/SKILL.md
# 머신별 네이티브 빌드, NixOS 환경 전용
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SM_DIR="$HOME/repos/gh/andenken"
SKILLS_DIR="$SCRIPT_DIR/skills"
ENV_FILE="$HOME/.env.local"
REPOS="$HOME/repos/gh"
THIRD_REPOS="$HOME/repos/3rd"
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

ensure_repo_at() {
  local base_dir=$1 name=$2 url=$3
  local dir="$base_dir/$name"
  mkdir -p "$base_dir"
  if [ -d "$dir" ]; then
    log "$name: exists"
  else
    log "$name: cloning..."
    git clone "$url" "$dir"
    ok "$name: cloned"
  fi
}

# Create symlink — remove old/broken, backup regular files
ensure_link() {
  local target=$1 link=$2
  if [ -L "$link" ]; then
    local current
    current=$(readlink "$link")
    if [ "$current" = "$target" ]; then
      return
    fi
    rm "$link"
  elif [ -e "$link" ]; then
    # Regular file/dir exists — back up and replace
    mv "$link" "${link}.bak.$(date +%Y%m%d)"
    log "$(basename "$link"): backed up existing → $(basename "${link}.bak.$(date +%Y%m%d)")"
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

# Third-party packages used by the harness
# pi-packages (ben-vargas/pi-claude-code-use) is intentionally disabled for now.
# Reason: pause the Claude Code-style compatibility patch path until account-risk is clearer.
declare -A THIRD_PARTY_PACKAGE_REPOS=()

# Local provider/package repos used by the harness
# pi-shell-acp is the current Claude path in pi via ACP.
declare -A PACKAGE_REPOS=(
  [pi-shell-acp]="https://github.com/junghan0611/claude-agent-sdk-pi.git"
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

  section "Third-Party Package Repositories"
  for name in "${!THIRD_PARTY_PACKAGE_REPOS[@]}"; do
    ensure_repo_at "$THIRD_REPOS" "$name" "${THIRD_PARTY_PACKAGE_REPOS[$name]}"
  done

  section "Provider Package Repositories"
  for name in "${!PACKAGE_REPOS[@]}"; do
    ensure_repo "$name" "${PACKAGE_REPOS[$name]}"
  done

  return 0
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

  log "--- gog (junghan0611/gogcli fork) ---"
  ensure_repo gogcli https://github.com/junghan0611/gogcli.git
  if [ -d "$REPOS/gogcli" ]; then
    (cd "$REPOS/gogcli" && git checkout feat/searchconsole 2>/dev/null || true)
    go_build "$REPOS/gogcli/cmd/gog" "$SKILLS_DIR/gogcli/gog"
    ok "gog $(du -h "$SKILLS_DIR/gogcli/gog" | cut -f1)"
  else
    warn "gog: repo not found"
  fi

  log "--- dictcli (GraalVM native-image + Kiwi stem) ---"
  if [ -d "$REPOS/dictcli" ]; then
    # Kiwi jar + 모델 다운로드 (stem용 — JVM 모드)
    (cd "$REPOS/dictcli" && ./run.sh stem-setup) || true
    # binary + graph.edn 세트 복사 (SSOT: dictcli 리포)
    if ! (cd "$REPOS/dictcli" && ./run.sh build --output "$SKILLS_DIR/dictcli/dictcli"); then
      warn "dictcli: build failed (기존 바이너리 유지)"
    fi
    if [ -f "$SKILLS_DIR/dictcli/dictcli" ]; then
      ok "dictcli $(du -h "$SKILLS_DIR/dictcli/dictcli" | cut -f1)"
    else
      fail "dictcli: binary missing"
    fi
  else
    warn "dictcli: repo not found at $REPOS/dictcli"
  fi

  return 0
}

# --- setup:links — Symlinks for pi, claude, opencode ---

setup_links() {
  section "Pi Agent Links"

  # Extensions — 폴더 심볼릭 링크면 실제 디렉토리로 교체
  if [ -L "$HOME/.pi/agent/extensions" ]; then
    rm "$HOME/.pi/agent/extensions"
    log "extensions: removed legacy folder symlink"
  fi
  mkdir -p "$HOME/.pi/agent/extensions"
  # pi-extensions/ 내 .ts 파일만 (semantic-memory는 스킬로 사용)
  # Remove legacy semantic-memory extension link if present
  [ -L "$HOME/.pi/agent/extensions/semantic-memory" ] && rm "$HOME/.pi/agent/extensions/semantic-memory"
  for ext_file in "$SCRIPT_DIR"/pi-extensions/*.ts; do
    [ -f "$ext_file" ] || continue
    ensure_link "$ext_file" "$HOME/.pi/agent/extensions/$(basename "$ext_file")"
  done

  # control.ts: formerly from 3rd-party agent-stuff, now managed in agent-config/pi-extensions/
  # (2026-04-13: forked with targetSessionId fallback + gcStaleSockets)

  # Settings + Keybindings
  ensure_link "$SCRIPT_DIR/pi/settings.json" "$HOME/.pi/agent/settings.json"
  ensure_link "$SCRIPT_DIR/pi/keybindings.json" "$HOME/.pi/agent/keybindings.json"

  # Skills (pi) — 개별 링크. semantic-memory는 extension(andenken 패키지)이 대체하므로 제외
  mkdir -p "$HOME/.pi/agent/skills/pi-skills"
  # 기존 디렉토리 심링크가 있으면 제거 (개별 링크로 전환)
  [ -L "$HOME/.pi/agent/skills/pi-skills" ] && rm "$HOME/.pi/agent/skills/pi-skills" && mkdir -p "$HOME/.pi/agent/skills/pi-skills"
  local PI_SKIP_SKILLS="semantic-memory"  # andenken pi 패키지가 네이티브 tool로 제공
  for skill_dir in "$SKILLS_DIR"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    local sname
    sname=$(basename "$skill_dir")
    # 제외 목록에 있으면 건너뛰기
    if echo "$PI_SKIP_SKILLS" | grep -qw "$sname"; then
      [ -L "$HOME/.pi/agent/skills/pi-skills/$sname" ] && rm "$HOME/.pi/agent/skills/pi-skills/$sname"
      continue
    fi
    ensure_link "$skill_dir" "$HOME/.pi/agent/skills/pi-skills/$sname"
  done

  # .bak.* 정리 — ensure_link가 만든 백업이 pi 스킬 스캔에 잡히지 않도록
  for bak_dir in "$HOME/.pi/agent/skills/pi-skills"/*.bak.*; do
    [ -d "$bak_dir" ] || continue
    rm -rf "$bak_dir"
    log "cleaned up: $(basename "$bak_dir")"
  done

  section "PATH Binaries (~/.local/bin)"
  mkdir -p "$HOME/.local/bin"
  # dictcli 제외 — CWD에 graph.edn 필요하므로 PATH 심링크 불가. 스킬 디렉토리에서만 실행.
  for cli in denotecli bibcli gitcli lifetract; do
    local src="$SKILLS_DIR/$cli/$cli"
    local dst="$HOME/.local/bin/$cli"
    if [ -f "$src" ]; then
      ensure_link "$src" "$dst"
    fi
  done
  # dictcli PATH 심링크가 남아있으면 제거 (심링크에 write하면 바이너리 파괴)
  [ -e "$HOME/.local/bin/dictcli" ] && rm -f "$HOME/.local/bin/dictcli" && log "dictcli: removed from PATH (skill-only)"
  # gog
  if [ -f "$SKILLS_DIR/gogcli/gog" ]; then
    ensure_link "$SKILLS_DIR/gogcli/gog" "$HOME/.local/bin/gog"
  fi

  section "Pi Themes"
  mkdir -p "$HOME/.pi/agent/themes"
  for theme_file in "$SCRIPT_DIR"/pi-themes/*.json; do
    [ -f "$theme_file" ] || continue
    local tname
    tname=$(basename "$theme_file")
    ensure_link "$theme_file" "$HOME/.pi/agent/themes/$tname"
  done

  section "Pi Prompts (Commands)"
  mkdir -p "$HOME/.pi/agent/prompts"
  for cmd_file in "$SCRIPT_DIR"/commands/*.md; do
    [ -f "$cmd_file" ] || continue
    ensure_link "$cmd_file" "$HOME/.pi/agent/prompts/$(basename "$cmd_file")"
  done

  section "Pi Telegram (pi-telegram bridge config)"
  # PI_ENTWURF_BOT_TOKEN이 있으면 telegram.json 자동 생성
  load_env
  if [ -n "${PI_ENTWURF_BOT_TOKEN:-}" ]; then
    local tg_json="$HOME/.pi/agent/telegram.json"
    local bot_id
    bot_id=$(echo "$PI_ENTWURF_BOT_TOKEN" | cut -d: -f1)
    local chat_id="${PI_TELEGRAM_CHAT_ID:-0}"
    cat > "$tg_json" << TGJSON
{
	"botToken": "$PI_ENTWURF_BOT_TOKEN",
	"botId": $bot_id,
	"allowedUserId": $chat_id
}
TGJSON
    ok "telegram.json (@glg_entwurf_bot, chatId=$chat_id)"
  else
    log "PI_ENTWURF_BOT_TOKEN not set — skipping telegram.json"
  fi

  section "Home AGENTS.md / CLAUDE.md / ENTWURF.md"
  ensure_link "$SCRIPT_DIR/home/AGENTS.md" "$HOME/AGENTS.md"
  ensure_link "$SCRIPT_DIR/home/CLAUDE.md" "$HOME/CLAUDE.md"
  ensure_link "$SCRIPT_DIR/home/ENTWURF.md" "$HOME/ENTWURF.md"

  section "Claude Code Config"
  mkdir -p "$HOME/.claude/hooks"
  # CLAUDE.md — Claude Code가 non-append 모드에서 읽는 진입점 (@AGENTS.md include)
  ensure_link "$SCRIPT_DIR/home/CLAUDE.md"              "$HOME/.claude/CLAUDE.md"
  # 디바이스별 설정: 서버(oracle 등)는 hooks/소리 없는 server 버전 사용
  local DEVICE
  DEVICE=$(cat "$HOME/.current-device" 2>/dev/null || echo "unknown")
  local SERVER_DEVICES="oracle"  # 서버 디바이스 목록 (공백 구분)
  local SETTINGS_FILE="$SCRIPT_DIR/claude/settings.json"
  if echo "$SERVER_DEVICES" | grep -qw "$DEVICE"; then
    SETTINGS_FILE="$SCRIPT_DIR/claude/settings.server.json"
    log "device=$DEVICE → server settings (no hooks/sound)"
  fi
  ensure_link "$SETTINGS_FILE"                          "$HOME/.claude/settings.json"
  ensure_link "$SCRIPT_DIR/claude/settings.local.json"  "$HOME/.claude/settings.local.json"
  ensure_link "$SCRIPT_DIR/claude/keybindings.json"     "$HOME/.claude/keybindings.json"
  ensure_link "$SCRIPT_DIR/claude/statusline.sh"        "$HOME/.claude/statusline.sh"
  ensure_link "$SCRIPT_DIR/claude/hooks/session-info.sh" "$HOME/.claude/hooks/session-info.sh"

  section "Claude Code Skills"
  # ~/.claude/skills → skills/ (단일 디렉토리 링크)
  ensure_link "$SKILLS_DIR" "$HOME/.claude/skills"

  section "OpenCode Skills"
  # ~/.config/opencode/skills → skills/ (단일 디렉토리 링크)
  mkdir -p "$HOME/.config/opencode"
  ensure_link "$SKILLS_DIR" "$HOME/.config/opencode/skills"

  section "Codex Skills"
  # ~/.codex/skills/ has .system/ (built-in) — individual skill links, not directory replace
  mkdir -p "$HOME/.codex/skills"
  for skill_dir in "$SKILLS_DIR"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    local sname
    sname=$(basename "$skill_dir")
    ensure_link "$skill_dir" "$HOME/.codex/skills/$sname"
  done
  # Clean up old skills not in our set
  for old in bd-to-br-migration pi-agent-rust; do
    [ -L "$HOME/.codex/skills/$old" ] && rm "$HOME/.codex/skills/$old"
    [ -d "$HOME/.codex/skills/$old" ] && rm -rf "$HOME/.codex/skills/$old"
  done

  return 0
}

# --- setup:npm — npm install for extensions/skills ---

setup_npm() {
  section "npm install"

  # andenken
  if [ -f "$SM_DIR/run.sh" ]; then
    "$SM_DIR/run.sh" setup
    ok "andenken"
  else
    warn "andenken: repo not found at $SM_DIR"
  fi

  # entwurf (pi package — Telegram delegate)
  local ENTWURF_DIR="$REPOS/entwurf"
  if [ -f "$ENTWURF_DIR/package.json" ]; then
    log "entwurf: installing + building..."
    (cd "$ENTWURF_DIR" && npm install --silent && npm run build --silent)
    if [ -f "$ENTWURF_DIR/dist/index.js" ]; then
      ok "entwurf (dist/index.js)"
    else
      fail "entwurf: build failed (dist/index.js missing)"
    fi
  else
    warn "entwurf: repo not found at $ENTWURF_DIR"
  fi

  # pi-packages (ben-vargas) intentionally disabled for now.
  log "pi-packages: disabled (skipping pi-claude-code-use install)"

  # pi-shell-acp (ACP bridge provider)
  local PI_SHELL_ACP_DIR="$REPOS/pi-shell-acp"
  if [ -f "$PI_SHELL_ACP_DIR/package.json" ]; then
    log "pi-shell-acp: installing..."
    if (cd "$PI_SHELL_ACP_DIR" && npm install --silent); then
      ok "pi-shell-acp"
      if (cd "$PI_SHELL_ACP_DIR" && ./run.sh sync-auth); then
        ok "pi-shell-acp auth alias"
      else
        warn "pi-shell-acp: auth sync skipped/failed"
      fi
    else
      fail "pi-shell-acp: npm install failed"
    fi
  else
    warn "pi-shell-acp: repo not found at $PI_SHELL_ACP_DIR"
  fi

  # pi-telegram (production Telegram bridge by pi author)
  # Installed as pi package — no local clone needed
  if command -v pi &>/dev/null; then
    if pi list 2>/dev/null | grep -q "pi-telegram"; then
      ok "pi-telegram (already installed)"
    else
      log "pi-telegram: installing..."
      pi install git:github.com/badlogic/pi-telegram 2>/dev/null && ok "pi-telegram" || warn "pi-telegram: install failed"
    fi
  else
    warn "pi-telegram: pi not found in PATH"
  fi

  # pi-extensions (grammy 등)
  local ext_dir="$SCRIPT_DIR/pi-extensions"
  if [ -f "$ext_dir/package.json" ]; then
    log "pi-extensions: installing..."
    if (cd "$ext_dir" && npm install --silent); then
      ok "pi-extensions"
    else
      fail "pi-extensions: npm install failed"
    fi
  fi

  # Skills with package.json
  for pkg_dir in "$SKILLS_DIR"/*/; do
    if [ -f "$pkg_dir/package.json" ] && [ ! -d "$pkg_dir/node_modules" ]; then
      local sname
      sname=$(basename "$pkg_dir")
      log "$sname: installing..."
      if (cd "$pkg_dir" && npm install --silent); then
        ok "$sname"
      else
        fail "$sname: npm install failed"
      fi
    fi
  done

  return 0
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
  echo "  Claude in pi (default): pi-shell-acp via ACP (pi-claude-code-use disabled)"
  echo "  Pi ext:   $(readlink "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo 'not linked')"
  echo "  Pi skill: $(readlink "$HOME/.pi/agent/skills/pi-skills" 2>/dev/null || echo 'not linked')"
  echo "  Claude:   $(readlink "$HOME/.claude/settings.json" 2>/dev/null && echo ' + skills' || echo 'not linked')"
  echo "  OpenCode: $(readlink "$HOME/.config/opencode/skills" 2>/dev/null || echo 'not linked')"
  echo ""
  echo "DONE: agent-config setup complete"
}

# --- help ---

help() {
  cat << 'EOF'
agent-config — 에이전트 인프라 원커맨드 CLI

Usage: ./run.sh <command> [args]

=== 설치 ===
  setup                       원커맨드 전체 설치 (이것만 기억하면 됨)
                              → clone + build + link + npm 전부 수행
                              → 어떤 디바이스든 이것 하나로 재현

  setup:repos|build|links|npm 개별 단계 (디버깅용, 보통 불필요)

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

  # === andenken (delegated) ===
  test|test:unit|test:integration|test:search)
    exec "$SM_DIR/run.sh" "$@" ;;
  index:sessions|index:org)
    exec "$SM_DIR/run.sh" "$@" ;;
  compact)
    exec "$SM_DIR/run.sh" "$@" ;;
  status)
    exec "$SM_DIR/run.sh" status ;;
  bench|bench:dry)
    exec "$SM_DIR/run.sh" "$@" ;;

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
    section "System"
    echo "  Arch:    $ARCH"
    echo "  Device:  $(cat "$HOME/.current-device" 2>/dev/null || echo 'unknown')"
    echo "  Go:      $(go version 2>/dev/null | grep -oP 'go\d+\.\d+\.\d+' || echo 'not found')"
    echo "  Node:    $(node --version 2>/dev/null || echo 'not found')"
    echo "  GraalVM: $(native-image --version 2>/dev/null || echo 'not found')"

    section "API Keys"
    echo "  GEMINI_API_KEY: ${GEMINI_API_KEY:+SET (${#GEMINI_API_KEY}ch)}"
    echo "  JINA_API_KEY:   ${JINA_API_KEY:+SET (${#JINA_API_KEY}ch)}"

    section "Links"
    echo "  Pi extension: $(readlink "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo '❌ not linked')"
    echo "  Pi skills:    $(readlink "$HOME/.pi/agent/skills/pi-skills" 2>/dev/null || echo '❌ not linked')"
    echo "  Pi theme:     $(cat "$HOME/.pi/agent/settings.json" 2>/dev/null | grep -oP '"defaultTheme":\s*"\K[^"]+' || echo 'default')"
    echo "  Claude conf:  $(readlink "$HOME/.claude/settings.json" 2>/dev/null || echo '❌ not linked')"
    echo "  Claude skills:$(readlink "$HOME/.claude/skills" 2>/dev/null || echo '❌ not linked')"
    echo "  OpenCode:     $(readlink "$HOME/.config/opencode/skills" 2>/dev/null || echo '❌ not linked')"
    echo "  Codex:        $(ls -d "$HOME/.codex/skills"/*/SKILL.md 2>/dev/null | wc -l) skills linked"

    section "CLI Binaries"
    for cli in denotecli bibcli gitcli lifetract dictcli; do
      _bin="$SKILLS_DIR/$cli/$cli"
      if [ -f "$_bin" ]; then
        _arch=$(file "$_bin" | grep -oP 'ARM aarch64|x86-64' | head -1)
        echo "  ✅ $cli: $_arch $(du -h "$_bin" | cut -f1)"
      else
        echo "  ❌ $cli: not built"
      fi
    done
    _gog="$SKILLS_DIR/gogcli/gog"
    if [ -f "$_gog" ]; then
      echo "  ✅ gog: $(du -h "$_gog" | cut -f1)"
    else
      echo "  ❌ gog: not built"
    fi

    section "Memory Index"
    "$SM_DIR/run.sh" status 2>/dev/null || echo "  (andenken not available)"
    ;;

  *)
    echo "Unknown: $1"; help; exit 1 ;;
esac
