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

# Setup path: just verify the repo is present. Never pull during setup.
# If someone is mid-edit in an external repo, setup stays out of their way.
# Use `./run.sh update` to pull everything explicitly.
ensure_repo_present() {
  local dir=$1 name=$2
  if [ ! -d "$dir/.git" ]; then
    fail "$name: expected git repo at $dir"
    return 1
  fi
  ok "$name: present"
}

# Update path: fetch + fast-forward pull. Skips repos with dirty tree (warns,
# never fails the whole update). Only invoked from `./run.sh update`.
pull_repo_if_clean() {
  local dir=$1 name=$2
  if [ ! -d "$dir/.git" ]; then
    fail "$name: expected git repo at $dir"
    return 1
  fi
  log "$name: pulling..."
  (
    cd "$dir"
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "  ⚠ $name: working tree dirty, skipping pull" >&2
      exit 0
    fi
    git fetch --all --prune --quiet
    local upstream
    upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
    if [ -z "$upstream" ]; then
      echo "  ⚠ $name: no upstream, skipping pull" >&2
      exit 0
    fi
    git pull --ff-only --quiet
  )
  ok "$name: up to date"
}

ensure_repo() {
  local name=$1 url=$2
  local dir="$REPOS/$name"
  if [ -d "$dir" ]; then
    ensure_repo_present "$dir" "$name"
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
    ensure_repo_present "$dir" "$name"
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

# Local provider/package repos used by the harness (developer mode only).
# pi-shell-acp is the current Claude path in pi via ACP. On server devices we
# install it via `pi install git:...` instead — see is_server_device + setup_npm.
declare -A PACKAGE_REPOS=(
  [pi-shell-acp]="https://github.com/junghan0611/pi-shell-acp.git"
)

# Pinned pi-shell-acp version — single source of truth for setup_npm.
# Must match `pi/settings.server.json` packages[] tag and CHANGELOG.md.
# See AGENTS.md § Release — pi-shell-acp Version Bump.
PI_SHELL_ACP_VERSION="0.4.13"

# Server devices use the consumer install path (pi-managed) instead of cloning
# pi-shell-acp into ~/repos/gh/. Add device names here as they come online.
SERVER_DEVICES="oracle"

# True when ~/.current-device matches a server device.
is_server_device() {
  local device
  device="$(cat "$HOME/.current-device" 2>/dev/null || echo unknown)"
  echo "$SERVER_DEVICES" | grep -qw "$device"
}

# Resolve pi-shell-acp install path for the current device.
# - server: pi-managed ~/.pi/agent/git/github.com/junghan0611/pi-shell-acp
# - dev:    ~/repos/gh/pi-shell-acp
pi_shell_acp_dir() {
  if is_server_device; then
    echo "$HOME/.pi/agent/git/github.com/junghan0611/pi-shell-acp"
  else
    echo "$REPOS/pi-shell-acp"
  fi
}

# Go src subdirectory within each repo
declare -A CLI_GO_SRC=(
  [denotecli]="denotecli"
  [gitcli]="gitcli"
  [lifetract]="lifetract"
  [bibcli]="bibcli"   # inside zotero-config
)

# --- setup:repos — Clone missing repos ---

setup_preflight() {
  section "Preflight"

  # Node >= 22.6 — pi-shell-acp's MCP launchers run TS via --experimental-strip-types.
  local node_v
  node_v="$(node --version 2>/dev/null | sed 's/^v//')"
  if [ -z "$node_v" ]; then
    fail "node not found in PATH"
    return 1
  fi
  local node_major="${node_v%%.*}"
  if [ "$node_major" -lt 22 ]; then
    fail "node >= 22.6 required (found $node_v) — pi-shell-acp uses --experimental-strip-types"
    return 1
  fi
  ok "node $node_v"

  # pi binary on PATH
  if command -v pi &>/dev/null; then
    ok "pi $(pi --version 2>/dev/null | head -1 || echo 'present')"
  else
    warn "pi not in PATH — install pi-mono before launching sessions"
  fi

  # ~/.current-device — drives device-specific Claude + pi settings selection
  if [ -f "$HOME/.current-device" ]; then
    if is_server_device; then
      ok "device: $(cat "$HOME/.current-device") (server / consumer install of pi-shell-acp)"
    else
      ok "device: $(cat "$HOME/.current-device") (developer / local clone of pi-shell-acp)"
    fi
  else
    warn "~/.current-device not set — server-mode hooks/settings won't activate"
  fi

  # Anthropic auth — pi-shell-acp's sync-auth alias copies from here.
  if [ -f "$HOME/.pi/agent/auth.json" ] || [ -f "$HOME/.claude.json" ]; then
    ok "claude auth detected"
  else
    warn "no claude auth — run 'claude' once or seed ~/.pi/agent/auth.json before launching sessions"
  fi

  return 0
}

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
  if is_server_device; then
    log "device=$(cat "$HOME/.current-device" 2>/dev/null) → consumer mode, skipping pi-shell-acp dev clone"
    log "  (pi will install it at $HOME/.pi/agent/git/github.com/junghan0611/pi-shell-acp via setup_npm)"
  else
    for name in "${!PACKAGE_REPOS[@]}"; do
      ensure_repo "$name" "${PACKAGE_REPOS[$name]}"
    done
  fi

  return 0
}

# --- update — pull every known repo that's clean; warn-and-skip on dirty ---

update_repos() {
  section "Pulling agent-config's tracked repos"
  for name in "${!CLI_REPOS[@]}"; do
    pull_repo_if_clean "$REPOS/$name" "$name"
  done
  for name in "${!THIRD_PARTY_PACKAGE_REPOS[@]}"; do
    pull_repo_if_clean "$THIRD_REPOS/$name" "$name"
  done
  if is_server_device; then
    log "device=$(cat "$HOME/.current-device" 2>/dev/null) → consumer mode, skipping pi-shell-acp dev pull"
    log "  (re-run \`pi install git:github.com/junghan0611/pi-shell-acp\` to refresh)"
  else
    for name in "${!PACKAGE_REPOS[@]}"; do
      pull_repo_if_clean "$REPOS/$name" "$name"
    done
  fi
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
  # gogcli는 로컬 수정본 + feature 브랜치(feat/searchconsole) 워크플로우.
  # upstream sync는 사용자가 직접 수행 — setup에서는 클론 유무만 확인하고 빌드만 한다.
  if [ ! -d "$REPOS/gogcli/.git" ]; then
    log "gogcli: cloning (first time only)..."
    git clone https://github.com/junghan0611/gogcli.git "$REPOS/gogcli"
  else
    log "gogcli: skip auto-sync (local fork — run pull manually in $REPOS/gogcli)"
  fi
  if [ -d "$REPOS/gogcli" ]; then
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

  # Phase 4 migration cleanup — entwurf surface moved to pi-shell-acp.
  # Old machines (Oracle etc.) may still have these from pre-migration setups.
  for legacy in delegate.ts delegate-targets.json lib semantic-memory; do
    if [ -e "$HOME/.pi/agent/extensions/$legacy" ] || [ -L "$HOME/.pi/agent/extensions/$legacy" ]; then
      rm -rf "$HOME/.pi/agent/extensions/$legacy"
      log "extensions/$legacy: removed legacy entry (now owned by pi-shell-acp / andenken)"
    fi
  done
  if [ -e "$HOME/.pi/agent/delegate-targets.json" ] || [ -L "$HOME/.pi/agent/delegate-targets.json" ]; then
    rm -f "$HOME/.pi/agent/delegate-targets.json"
    log "delegate-targets.json: removed (entwurf-targets.json now owned by pi-shell-acp)"
  fi

  # Settings + Keybindings — server devices use consumer install paths
  local PI_SETTINGS_FILE="$SCRIPT_DIR/pi/settings.json"
  if is_server_device; then
    PI_SETTINGS_FILE="$SCRIPT_DIR/pi/settings.server.json"
    log "device=$(cat "$HOME/.current-device") → server pi settings (consumer install paths)"
  fi
  ensure_link "$PI_SETTINGS_FILE" "$HOME/.pi/agent/settings.json"
  ensure_link "$SCRIPT_DIR/pi/keybindings.json" "$HOME/.pi/agent/keybindings.json"

  # Skills (pi) — 개별 링크.
  mkdir -p "$HOME/.pi/agent/skills/pi-skills"
  # 기존 디렉토리 심링크가 있으면 제거 (개별 링크로 전환)
  [ -L "$HOME/.pi/agent/skills/pi-skills" ] && rm "$HOME/.pi/agent/skills/pi-skills" && mkdir -p "$HOME/.pi/agent/skills/pi-skills"
  # PI_SKIP_SKILLS — 일부러 비워둔다. semantic-memory는 pi 네이티브에서도 SKILL.md 스킬로 노출한다.
  # andenken extension이 session_search / knowledge_search registerTool을 별도 제공하지만,
  # 같은 capability를 두 surface로 부를 수 있는 것이 정책상 중립이다(SSOT는 하나, 호출 표면이 둘).
  # registerTool과 스킬은 충돌하지 않고, 모든 백엔드(pi/ACP Claude/Codex/Gemini)가 동일한
  # `semantic-memory` 스킬 이름을 알게 되어 surface 비대칭이 줄어든다.
  local PI_SKIP_SKILLS=""
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

  section "Pi-Shell-ACP Claude Plugin"
  # pi-shell-acp는 SDK 격리 모드(settingSources: [])라 ~/.claude/skills/를 자동 발견하지 않음.
  # 그래서 agent-config는 SDK plugins:[{type:"local", path}]가 읽을 local plugin root 한 벌을 구성한다.
  # 이 디렉토리(~/.pi/agent/claude-plugin/)는 agent-config의 운영 경로일 뿐, pi-shell-acp 자체 계약은 아님.
  # semantic-memory 포함: pi-shell-acp Claude 세션은 andenken 네이티브 tool이 없음 → 스킬로 제공.
  mkdir -p "$HOME/.pi/agent/claude-plugin/.claude-plugin"
  mkdir -p "$HOME/.pi/agent/claude-plugin/skills"
  ensure_link "$SCRIPT_DIR/pi/claude-plugin.json" \
              "$HOME/.pi/agent/claude-plugin/.claude-plugin/plugin.json"
  for skill_dir in "$SKILLS_DIR"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    local sname
    sname=$(basename "$skill_dir")
    ensure_link "$skill_dir" "$HOME/.pi/agent/claude-plugin/skills/$sname"
  done
  # .bak.* 정리 — SDK가 백업 디렉토리를 스킬로 스캔하면 충돌
  for bak_dir in "$HOME/.pi/agent/claude-plugin/skills"/*.bak.*; do
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

  section "Home AGENTS.md / CLAUDE.md"
  ensure_link "$SCRIPT_DIR/home/AGENTS.md" "$HOME/AGENTS.md"
  ensure_link "$SCRIPT_DIR/home/CLAUDE.md" "$HOME/CLAUDE.md"
  # Clean up legacy MITSEIN.md / ENTWURF.md symlinks — Mitsein moved to ~/sync/org/MITSEIN.md
  [ -L "$HOME/MITSEIN.md" ] && rm "$HOME/MITSEIN.md" && log "MITSEIN.md (removed — moved to ~/sync/org/)"
  [ -L "$HOME/ENTWURF.md" ] && rm "$HOME/ENTWURF.md" && log "ENTWURF.md (removed legacy symlink)"

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

  section "Claude Code Commands"
  # 백엔드 직접 사용 모드 슬래시 자리 (~/.claude/commands/<name>.md).
  # pi-shell-acp 경유 모드는 ~/.pi/agent/prompts/가 이미 처리하므로 충돌 없음 — 모드별 분리.
  # plugin namespace 측(~/.pi/agent/claude-plugin/commands/)도 같은 SSOT를 가리키게 둔다.
  # Codex / Gemini는 surface 비대칭(Codex: 사용자 슬래시 surface 자체 없음 / Gemini: .toml 변환 magic
  # 필요)이라 박지 않는다 — North Star "thin bridge / no magic".
  ensure_link "$SCRIPT_DIR/commands" "$HOME/.claude/commands"
  mkdir -p "$HOME/.pi/agent/claude-plugin/commands"
  for cmd_file in "$SCRIPT_DIR"/commands/*.md; do
    [ -f "$cmd_file" ] || continue
    ensure_link "$cmd_file" "$HOME/.pi/agent/claude-plugin/commands/$(basename "$cmd_file")"
  done

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

  section "Gemini CLI Skills"
  # ~/.gemini/skills → skills/ (단일 디렉토리 링크, Agent Skills open standard)
  # Gemini CLI v0.40+ discovers SKILL.md from ~/.gemini/skills/<sname>/ — same SSOT
  mkdir -p "$HOME/.gemini"
  ensure_link "$SKILLS_DIR" "$HOME/.gemini/skills"

  return 0
}


# --- setup:npm — pnpm install for extensions/skills ---

setup_npm() {
  section "pnpm install"

  # andenken
  if [ -f "$SM_DIR/run.sh" ]; then
    "$SM_DIR/run.sh" setup
    ok "andenken"
  else
    warn "andenken: repo not found at $SM_DIR"
  fi

  # entwurf (self-built telegram bridge) — deprecated 2026-05-03 in favor of
  # pi-telegram (badlogic). The "entwurf" name now belongs to pi-shell-acp's
  # sibling-spawn surface only. Repo at ~/repos/gh/entwurf/ is preserved for
  # history; not loaded as a pi package and not built here.

  # pi-packages (ben-vargas) intentionally disabled for now.
  log "pi-packages: disabled (skipping pi-claude-code-use install)"

  # pi-shell-acp (ACP bridge provider) — install + auth + light verification.
  # Server devices use the consumer install path (pi-managed clone via
  # `pi install git:...`); dev machines use the local clone in ~/repos/gh/.
  # Either way the post-install steps (sync-auth + check-mcp) run from the
  # resolved directory.
  local PI_SHELL_ACP_DIR
  PI_SHELL_ACP_DIR="$(pi_shell_acp_dir)"

  # Read installed version (empty if no install yet). Used for drift detection
  # on server (force upgrade) and dev (warn-only, since dev clones may carry
  # uncommitted work that intentionally diverges from the pinned tag).
  local installed_version=""
  if [ -f "$PI_SHELL_ACP_DIR/package.json" ]; then
    installed_version="$(node -p "require('$PI_SHELL_ACP_DIR/package.json').version" 2>/dev/null || echo "")"
  fi

  if is_server_device; then
    local target_tag="v$PI_SHELL_ACP_VERSION"
    if [ ! -f "$PI_SHELL_ACP_DIR/package.json" ]; then
      log "pi-shell-acp: pi install git:github.com/junghan0611/pi-shell-acp@$target_tag (fresh)"
      if ! pi install "git:github.com/junghan0611/pi-shell-acp@$target_tag"; then
        fail "pi-shell-acp: pi install failed"
        return 1
      fi
    elif [ "$installed_version" != "$PI_SHELL_ACP_VERSION" ]; then
      # pi's git package manager treats git@ref as pinned and skips refresh when
      # the checkout directory already exists. On server devices this means
      # `pi install git:...@vX.Y.Z` can print success while leaving the previous
      # tag checked out. Upgrade pinned git packages directly.
      log "pi-shell-acp: direct git upgrade $installed_version → $PI_SHELL_ACP_VERSION"
      if ! (cd "$PI_SHELL_ACP_DIR" && git fetch --tags origin >/dev/null 2>&1 && git checkout "$target_tag" >/dev/null 2>&1 && pnpm install --silent --frozen-lockfile); then
        fail "pi-shell-acp: direct git upgrade to $target_tag failed"
        return 1
      fi
    fi
    installed_version="$(node -p "require('$PI_SHELL_ACP_DIR/package.json').version" 2>/dev/null || echo "")"
    if [ "$installed_version" != "$PI_SHELL_ACP_VERSION" ]; then
      fail "pi-shell-acp: still at '$installed_version' (expected $PI_SHELL_ACP_VERSION)"
      return 1
    fi
    if [ ! -f "$PI_SHELL_ACP_DIR/package.json" ]; then
      fail "pi-shell-acp: expected install at $PI_SHELL_ACP_DIR (pi install did not produce it)"
      return 1
    fi
    ok "pi-shell-acp consumer install ($PI_SHELL_ACP_DIR @ v$installed_version)"
    # `pi install` already runs npm/pnpm install for the package. Skip a second pass.
  else
    if [ ! -f "$PI_SHELL_ACP_DIR/package.json" ]; then
      fail "pi-shell-acp: repo not found at $PI_SHELL_ACP_DIR"
      return 1
    fi
    if [ -n "$installed_version" ] && [ "$installed_version" != "$PI_SHELL_ACP_VERSION" ]; then
      warn "pi-shell-acp dev clone at v$installed_version, run.sh pinned v$PI_SHELL_ACP_VERSION — dev branch may diverge from settings.server.json tag"
    fi
    log "pi-shell-acp: install + auth..."
    if ! (cd "$PI_SHELL_ACP_DIR" && pnpm install --silent --frozen-lockfile); then
      fail "pi-shell-acp: pnpm install failed"
      return 1
    fi
    ok "pi-shell-acp pnpm install (v$installed_version)"
  fi

  # Entwurf target registry — consumer install path must expose the canonical
  # pi-shell-acp registry at ~/.pi/agent/entwurf-targets.json. In practice,
  # `pi install` can leave this missing on server devices, and a manual copy can
  # silently drift from the installed tag. Re-point it to the installed package.
  local ENTWURF_TARGETS_TARGET="$PI_SHELL_ACP_DIR/pi/entwurf-targets.json"
  if [ -f "$ENTWURF_TARGETS_TARGET" ]; then
    ensure_link "$ENTWURF_TARGETS_TARGET" "$HOME/.pi/agent/entwurf-targets.json"
  else
    warn "pi-shell-acp: entwurf target registry missing at $ENTWURF_TARGETS_TARGET"
  fi

  if ! (cd "$PI_SHELL_ACP_DIR" && ./run.sh sync-auth); then
    fail "pi-shell-acp: auth sync failed"
    return 1
  fi
  ok "pi-shell-acp auth alias"

  # Light verification — deterministic, no auth, no subprocess.
  # Catches MCP wiring drift if pi-shell-acp's bundle changes between releases.
  if (cd "$PI_SHELL_ACP_DIR" && ./run.sh check-mcp >/dev/null 2>&1); then
    ok "pi-shell-acp check-mcp"
  else
    warn "pi-shell-acp: check-mcp failed — MCP wiring may be misconfigured"
  fi

  # Stale project-local .pi/settings.json detection.
  # Pre-migration leftovers (e.g. claude-agent-sdk-pi) override the global SSOT
  # silently. Project-local file is gitignored, so it never gets fixed by pull.
  local PROJECT_PI_SETTINGS="$SCRIPT_DIR/.pi/settings.json"
  if [ -f "$PROJECT_PI_SETTINGS" ]; then
    if grep -q "claude-agent-sdk-pi" "$PROJECT_PI_SETTINGS" 2>/dev/null; then
      warn "stale $PROJECT_PI_SETTINGS references claude-agent-sdk-pi (pre-migration). Recommend: rm $PROJECT_PI_SETTINGS"
    fi
  fi

  # pi-tools-bridge + native async delegate validations moved to pi-shell-acp's
  # own run.sh after the Entwurf Orchestration migration — their code now lives
  # there, and owning validation belongs with owning code.

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

  # pi-extensions (grammy 등) — pnpm
  local ext_dir="$SCRIPT_DIR/pi-extensions"
  if [ -f "$ext_dir/package.json" ]; then
    log "pi-extensions: installing..."
    if (cd "$ext_dir" && pnpm install --silent --frozen-lockfile); then
      ok "pi-extensions"
    else
      fail "pi-extensions: pnpm install failed"
    fi
  fi

  # Skills with package.json — pnpm
  for pkg_dir in "$SKILLS_DIR"/*/; do
    if [ -f "$pkg_dir/package.json" ] && [ ! -d "$pkg_dir/node_modules" ]; then
      local sname
      sname=$(basename "$pkg_dir")
      log "$sname: installing..."
      if (cd "$pkg_dir" && pnpm install --silent --frozen-lockfile); then
        ok "$sname"
      else
        fail "$sname: pnpm install failed"
      fi
    fi
  done

  return 0
}

# --- setup — 원커맨드: clone + build + link + pnpm ---

setup_all() {
  echo "🔧 agent-config setup ($ARCH)"
  echo "   SSOT: $SKILLS_DIR"

  setup_preflight || return 1
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
  echo "  Claude in pi (default): pi-shell-acp via ACP"
  echo "  Pi ext:   $(readlink "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo 'not linked')"
  echo "  Pi skill: $(readlink "$HOME/.pi/agent/skills/pi-skills" 2>/dev/null || echo 'not linked')"
  echo "  Claude:   $(readlink "$HOME/.claude/settings.json" 2>/dev/null && echo ' + skills' || echo 'not linked')"
  echo "  OpenCode: $(readlink "$HOME/.config/opencode/skills" 2>/dev/null || echo 'not linked')"
  echo "  Gemini:   $(readlink "$HOME/.gemini/skills" 2>/dev/null || echo 'not linked')"

  # Sentinel (delegate matrix) moved to pi-shell-acp with the rest of the
  # Entwurf Orchestration surface — run it from there when exercising the
  # delegate paths.

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
                              → clone + build + link + pnpm 전부 수행
                              → 어떤 디바이스든 이것 하나로 재현

  setup:preflight|repos|build|links|pnpm 개별 단계 (디버깅용, 보통 불필요)
  update                      추적 리포 일괄 pull (dirty면 skip) — setup은 pull 안 함

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
  setup:preflight)
    setup_preflight ;;
  setup:repos)
    setup_repos ;;
  setup:build)
    setup_build ;;
  setup:links)
    setup_links ;;
  setup:pnpm|setup:npm)
    setup_npm ;;
  update)
    update_repos ;;

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
    echo "  Gemini:       $(readlink "$HOME/.gemini/skills" 2>/dev/null || echo '❌ not linked')"

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
