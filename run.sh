#!/usr/bin/env bash
# agent-config — 프로젝트 CLI
# Usage: ./run.sh <command> [args]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SM_DIR="$SCRIPT_DIR/pi-extensions/semantic-memory"
ENV_FILE="$HOME/.env.local"

load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a; source "$ENV_FILE"; set +a
  else
    echo "⚠ $ENV_FILE not found"
  fi
}

help() {
  cat << 'EOF'
agent-config — Contextual continuity infrastructure

Usage: ./run.sh <command> [args]

=== 테스트 ===
  test              모든 테스트 (unit + integration)
  test:unit         유닛 테스트 (API 불필요)
  test:integration  통합 테스트 (API 필요)
  test:search "q"   라이브 검색 테스트

=== 인덱싱 ===
  index:sessions              세션 증분 인덱싱 (3072d)
  index:sessions --force      세션 전체 재인덱싱
  index:org                   Org 증분 인덱싱 (768d)
  index:org --force           Org 전체 재인덱싱
  compact [sessions|org]      DB 조각 모음 (fragment 정리)
  status                      전체 인덱스 상태 + fragment 수 + 사이즈

  환경변수: INDEX_CONCURRENCY=2 ./run.sh index:org (기본 2)

=== 벤치마크 ===
  bench                       전체 벤치마크 (API 필요)
  bench:dry                   드라이런 (쿼리 + expected 확인)

=== 청킹 분석 ===
  chunk:org                   청킹 통계 (인덱싱 없이)
  chunk:org --sample          샘플 청크 출력

=== 유틸 ===
  install                     extension 심볼릭 링크 설치
  env                         환경변수 상태 확인
EOF
}

# --- Dispatch ---

case "${1:-help}" in
  help|-h|--help)
    help ;;

  test)
    shift; load_env; cd "$SM_DIR" && npx tsx test.ts "${@:-}" ;;
  test:unit)
    cd "$SM_DIR" && npx tsx test.ts unit ;;
  test:integration)
    load_env; cd "$SM_DIR" && npx tsx test.ts integration ;;
  test:search)
    shift; load_env; cd "$SM_DIR" && npx tsx test.ts search "$@" ;;

  index:sessions)
    shift; load_env; cd "$SM_DIR" && npx tsx indexer.ts sessions "$@" ;;
  index:org)
    shift; load_env; cd "$SM_DIR" && npx tsx indexer.ts org "$@" ;;
  compact)
    shift; cd "$SM_DIR" && npx tsx indexer.ts compact "${1:-all}" ;;
  status)
    cd "$SM_DIR" && npx tsx indexer.ts status ;;

  bench)
    shift; load_env; cd "$SM_DIR" && npx tsx benchmark.ts "${@:-}" ;;
  bench:dry)
    cd "$SM_DIR" && npx tsx benchmark.ts dry ;;

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

  install)
    target="$HOME/.pi/agent/extensions/semantic-memory"
    if [ -L "$target" ]; then echo "✅ Symlink exists: $target"; else ln -s "$SM_DIR" "$target" && echo "✅ Installed"; fi
    [ -d "$SM_DIR/node_modules" ] || (cd "$SM_DIR" && npm install) ;;

  env)
    load_env 2>/dev/null || true
    echo "GEMINI_API_KEY: ${GEMINI_API_KEY:+SET (${#GEMINI_API_KEY}ch)}"
    echo "JINA_API_KEY:   ${JINA_API_KEY:+SET (${#JINA_API_KEY}ch)}"
    echo "NODE: $(node --version 2>/dev/null)"
    echo "Extension: $(readlink "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo 'not installed')" ;;

  *)
    echo "Unknown: $1"; help; exit 1 ;;
esac
