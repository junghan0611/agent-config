#!/usr/bin/env bash
# agent-config — 프로젝트 CLI
# Usage: ./run.sh <command> [args]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SM_DIR="$SCRIPT_DIR/pi-extensions/semantic-memory"
ENV_FILE="$HOME/.env.local"

# 환경변수 로드
load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a; source "$ENV_FILE"; set +a
  else
    echo "⚠ $ENV_FILE not found — API keys may be missing"
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

=== 세션 인덱싱 (Phase 1 — 3072d) ===
  index:sessions              증분 인덱싱 (새 세션만)
  index:sessions --force      전체 재인덱싱
  status:sessions             세션 인덱스 상태

=== Org 인덱싱 (Phase 2 — 768d) ===
  index:org                   증분 인덱싱 (디지털 가든 폴더)
  index:org --force           전체 재인덱싱
  status:org                  Org 인덱스 상태
  chunk:org                   청킹 통계 (인덱싱 없이)
  chunk:org --sample          샘플 청크 출력

=== 벤치마크 ===
  bench                       전체 벤치마크 (API 필요)
  bench:dry                   드라이런 (쿼리 + expected 확인)

=== 유틸 ===
  install                     extension 심볼릭 링크 설치
  env                         환경변수 상태 확인
EOF
}

# --- 테스트 ---

cmd_test() {
  load_env
  cd "$SM_DIR" && npx tsx test.ts "${@:-}"
}

cmd_test_unit() {
  cd "$SM_DIR" && npx tsx test.ts unit
}

cmd_test_integration() {
  load_env
  cd "$SM_DIR" && npx tsx test.ts integration
}

cmd_test_search() {
  load_env
  cd "$SM_DIR" && npx tsx test.ts search "$@"
}

# --- 세션 인덱싱 (Phase 1 — 3072d) ---

cmd_index_sessions() {
  load_env
  local FORCE=""
  [[ "${1:-}" == "--force" ]] && FORCE="true"

  cd "$SM_DIR"
  node --input-type=module -e "
import { findSessionFiles, extractSessionChunks } from './session-indexer.ts';
import { embedDocumentBatch } from './gemini-embeddings.ts';
import { VectorStore } from './store.ts';

const config = { apiKey: process.env.GEMINI_API_KEY, model: 'gemini-embedding-2-preview' };
const store = new VectorStore(undefined, 3072);
await store.init();

const force = ${FORCE:-false};
if (force) { await store.reset(); }
await store.ensureTable();

const files = findSessionFiles();
const indexed = force ? new Set() : await store.getIndexedSessionFiles();
const toIndex = files.filter(f => !indexed.has(f));

console.log('Sessions:', files.length, '| Already indexed:', indexed.size, '| To index:', toIndex.length);
if (toIndex.length === 0) { console.log('✅ All sessions indexed.'); process.exit(0); }

let added = 0, errors = 0;
const t0 = Date.now();

for (let i = 0; i < toIndex.length; i++) {
  const file = toIndex[i];
  const chunks = await extractSessionChunks(file);
  if (chunks.length === 0) continue;
  try {
    const vectors = await embedDocumentBatch(chunks.map(c => c.text), config);
    await store.addChunks(chunks.map((c, j) => ({...c, vector: vectors[j]})));
    added += chunks.length;
  } catch(e) {
    errors++;
    console.error('ERR [' + (i+1) + ']', file.split('/').pop()?.slice(0,40), e.message?.slice(0,80));
  }
  if ((i+1) % 10 === 0 || i === toIndex.length - 1)
    console.log((i+1) + '/' + toIndex.length + ' sessions, ' + added + ' chunks, ' + ((Date.now()-t0)/1000).toFixed(1) + 's');
}

try { await store.createFtsIndex(); } catch {}
const total = await store.getCount();
console.log('✅ Done:', total, 'total chunks |', added, 'added |', errors, 'errors');
await store.close();
"
}

cmd_status_sessions() {
  cd "$SM_DIR"
  node --input-type=module -e "
import { findSessionFiles } from './session-indexer.ts';
import { VectorStore } from './store.ts';
const store = new VectorStore(undefined, 3072);
await store.init();
const count = await store.getCount();
const indexed = await store.getIndexedSessionFiles();
const files = findSessionFiles();
console.log('🧠 Session Index (3072d)');
console.log('  Chunks:', count);
console.log('  Sessions:', indexed.size, '/', files.length);
const dbPath = (process.env.HOME ?? '') + '/.pi/agent/memory/sessions.lance';
try { const { execSync } = await import('node:child_process'); const size = execSync('du -sh ' + dbPath).toString().split('\t')[0]; console.log('  DB size:', size); } catch {}
await store.close();
"
}

# --- Org 인덱싱 (Phase 2 — 768d) ---

# 디지털 가든 export 대상 폴더 (llmlog, configs, posts, talks 제외)
ORG_FOLDERS="meta,bib,notes,journal,botlog"

cmd_index_org() {
  load_env
  local FORCE=""
  [[ "${1:-}" == "--force" ]] && FORCE="true"

  cd "$SM_DIR"
  node --input-type=module -e "
import { findOrgFiles, chunkOrgFile } from './org-chunker.ts';
import { embedDocumentBatch } from './gemini-embeddings.ts';
import { VectorStore } from './store.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

const INCLUDE_FOLDERS = new Set('${ORG_FOLDERS}'.split(','));
const config = { apiKey: process.env.GEMINI_API_KEY, model: 'gemini-embedding-2-preview', dimensions: 768 };
const dbPath = path.join(process.env.HOME ?? '', '.pi', 'agent', 'memory', 'org.lance');
const store = new VectorStore(dbPath, 768);
await store.init();

const force = ${FORCE:-false};
if (force) { await store.reset(); }
await store.ensureTable();

// Find and filter org files
const allFiles = findOrgFiles();
const files = allFiles.filter(f => {
  const parts = f.split('/');
  const orgIdx = parts.findIndex(p => p === 'org');
  const folder = orgIdx >= 0 && orgIdx + 1 < parts.length ? parts[orgIdx + 1] : '';
  return INCLUDE_FOLDERS.has(folder);
});

const indexed = force ? new Set() : await store.getIndexedSessionFiles();
const toIndex = files.filter(f => !indexed.has(f));

console.log('Org files:', files.length, '(of', allFiles.length, 'total)');
console.log('Already indexed:', indexed.size, '| To index:', toIndex.length);
if (toIndex.length === 0) { console.log('✅ All org files indexed.'); await store.close(); process.exit(0); }

let totalChunks = 0, errors = 0, skipped = 0;
const t0 = Date.now();
const BATCH_SIZE = 100; // Gemini batchEmbedContents limit

for (let i = 0; i < toIndex.length; i++) {
  const file = toIndex[i];
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const chunks = chunkOrgFile(content, file);
    if (chunks.length === 0) { skipped++; continue; }

    // Batch in groups of BATCH_SIZE
    for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
      const batch = chunks.slice(b, b + BATCH_SIZE);
      const vectors = await embedDocumentBatch(batch.map(c => c.text), config);

      const records = batch.map((c, j) => ({
        id: c.id,
        text: c.text,
        vector: vectors[j],
        sessionFile: c.filePath,  // reuse field for file path
        project: c.folder,
        lineNumber: c.lineNumber,
        timestamp: c.metadata.date || c.metadata.identifier || '',
        role: c.chunkType,  // 'heading' or 'content'
        metadata: {
          title: c.metadata.title,
          tags: c.metadata.filetags.join(','),
          hierarchy: c.hierarchy,
          prefix: c.metadata.titlePrefix,
          identifier: c.metadata.identifier,
        },
      }));

      await store.addChunks(records);
      totalChunks += batch.length;
    }
  } catch(e) {
    errors++;
    console.error('ERR [' + (i+1) + ']', path.basename(file).slice(0,50), e.message?.slice(0,80));
  }

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  const fname = path.basename(file).slice(0, 60);
  if ((i+1) % 5 === 0 || i === toIndex.length - 1) {
    console.log((i+1) + '/' + toIndex.length + ' [' + totalChunks + ' ch] ' + elapsed + 's ' + fname);
  }
}

try { await store.createFtsIndex(); } catch {}
const total = await store.getCount();
const elapsed = ((Date.now()-t0)/1000).toFixed(1);
console.log('✅ Done:', total, 'total chunks |', totalChunks, 'added |', skipped, 'skipped |', errors, 'errors |', elapsed + 's');
await store.close();
"
}

cmd_status_org() {
  cd "$SM_DIR"
  node --input-type=module -e "
import { findOrgFiles } from './org-chunker.ts';
import { VectorStore } from './store.ts';
import * as path from 'node:path';
const dbPath = path.join(process.env.HOME ?? '', '.pi', 'agent', 'memory', 'org.lance');
const store = new VectorStore(dbPath, 768);
await store.init();
const count = await store.getCount();
const indexed = await store.getIndexedSessionFiles();
const files = findOrgFiles();
console.log('📚 Org Index (768d Matryoshka)');
console.log('  Chunks:', count);
console.log('  Files indexed:', indexed.size, '/', files.length);
console.log('  Folders: ${ORG_FOLDERS}');
try { const { execSync } = await import('node:child_process'); const size = execSync('du -sh ' + dbPath + ' 2>/dev/null').toString().split('\t')[0]; console.log('  DB size:', size); } catch { console.log('  DB: not created yet'); }
await store.close();
"
}

cmd_chunk_org() {
  cd "$SM_DIR"
  local SAMPLE=""
  [[ "${1:-}" == "--sample" ]] && SAMPLE="true"

  node --input-type=module -e "
import { findOrgFiles, chunkOrgFile } from './org-chunker.ts';
import * as fs from 'node:fs';

const INCLUDE = new Set('${ORG_FOLDERS}'.split(','));
const allFiles = findOrgFiles();
const files = allFiles.filter(f => {
  const parts = f.split('/');
  const orgIdx = parts.findIndex(p => p === 'org');
  const folder = orgIdx >= 0 && orgIdx + 1 < parts.length ? parts[orgIdx + 1] : '';
  return INCLUDE.has(folder);
});

const sample = ${SAMPLE:-false};
let total = { files: 0, chunks: 0, h: 0, c: 0 };
const fStats = {};

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const chunks = chunkOrgFile(content, file);
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
      for (const ch of chunks.slice(0, 2)) {
        console.log('  [' + ch.chunkType + '] ' + ch.text.slice(0, 120));
      }
    }
  } catch {}
}

console.log('📊 Org Chunking Stats (garden folders only)');
console.log(total.files + ' files → ' + total.chunks + ' chunks (h:' + total.h + ' c:' + total.c + ')');
console.log();
for (const [f, s] of Object.entries(fStats).sort((a,b) => b[1].ch - a[1].ch)) {
  console.log('  ' + f.padEnd(10) + s.f.toString().padStart(5) + ' files → ' + s.ch.toString().padStart(6) + ' chunks (h:' + s.h.toString().padStart(5) + ' c:' + s.c.toString().padStart(5) + ')');
}

// 임베딩 비용 추산
const estTokens = Math.round(total.chunks * 100); // ~100 tokens/chunk avg
const cost768 = (estTokens / 1_000_000 * 0.006).toFixed(3);
const size768 = Math.round(total.chunks * 768 * 4 / 1024 / 1024);
console.log();
console.log('💰 Estimated (768d):');
console.log('  Tokens: ~' + (estTokens/1000).toFixed(0) + 'K');
console.log('  Embed cost: ~\$' + cost768);
console.log('  DB size: ~' + size768 + 'MB');
"
}

# --- 벤치마크 ---

cmd_bench() {
  load_env
  cd "$SM_DIR" && npx tsx benchmark.ts "${@:-}"
}

cmd_bench_dry() {
  cd "$SM_DIR" && npx tsx benchmark.ts dry
}

# --- 유틸 ---

cmd_install() {
  local target="$HOME/.pi/agent/extensions/semantic-memory"
  if [ -L "$target" ]; then
    echo "✅ Symlink exists: $target → $(readlink "$target")"
  else
    ln -s "$SM_DIR" "$target"
    echo "✅ Installed: $target → $SM_DIR"
  fi

  # npm install if needed
  if [ ! -d "$SM_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    cd "$SM_DIR" && npm install
  fi
}

cmd_env() {
  load_env 2>/dev/null || true
  echo "=== Environment ==="
  echo "GEMINI_API_KEY: ${GEMINI_API_KEY:+SET (${#GEMINI_API_KEY} chars)}"
  echo "JINA_API_KEY:   ${JINA_API_KEY:+SET (${#JINA_API_KEY} chars)}"
  echo "NODE:           $(node --version 2>/dev/null || echo 'not found')"
  echo "TSX:            $(npx tsx --version 2>/dev/null || echo 'not found')"
  echo "Extension:      $(ls -la "$HOME/.pi/agent/extensions/semantic-memory" 2>/dev/null || echo 'not installed')"
}

# --- Dispatch ---

case "${1:-help}" in
  help|-h|--help)     help ;;
  test)               shift; cmd_test "$@" ;;
  test:unit)          cmd_test_unit ;;
  test:integration)   cmd_test_integration ;;
  test:search)        shift; cmd_test_search "$@" ;;
  index:sessions)     shift; cmd_index_sessions "$@" ;;
  status:sessions)    cmd_status_sessions ;;
  index:org)          shift; cmd_index_org "$@" ;;
  status:org)         cmd_status_org ;;
  chunk:org)          shift; cmd_chunk_org "$@" ;;
  bench)              shift; cmd_bench "$@" ;;
  bench:dry)          cmd_bench_dry ;;
  install)            cmd_install ;;
  env)                cmd_env ;;
  *)                  echo "Unknown command: $1"; help; exit 1 ;;
esac
