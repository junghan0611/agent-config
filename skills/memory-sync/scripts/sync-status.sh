#!/usr/bin/env bash
# memory-sync status — 양쪽 상태 + 증분 대상 + 비용 추정
set -euo pipefail

ANDENKEN_DIR="$HOME/repos/gh/andenken"
ENV_FILE="$HOME/.env.local"
ORACLE_HOST="oracle"

# Load env
[ -f "$ENV_FILE" ] && { set -a; source "$ENV_FILE"; set +a; }

# Single call — parse + display from same output
LOCAL_STATUS=$(cd "$ANDENKEN_DIR" && npx tsx indexer.ts status 2>&1)
echo "=== LOCAL STATUS ==="
echo "$LOCAL_STATUS"
echo ""
LOCAL_S_INDEXED=$(echo "$LOCAL_STATUS" | grep Sessions | grep -oP '\d+/\d+ files' | cut -d/ -f1)
LOCAL_S_TOTAL=$(echo "$LOCAL_STATUS" | grep Sessions | grep -oP '\d+/\d+ files' | cut -d/ -f2 | cut -d' ' -f1)

# Org: use manifest-based stale detection (new + stale = to-index)
# The "to-index" field from status includes both new and stale files
LOCAL_O_TO_INDEX=$(echo "$LOCAL_STATUS" | grep 'to-index' | grep -oP 'to-index: \d+' | grep -oP '\d+')
LOCAL_O_NEW_ONLY=$(echo "$LOCAL_STATUS" | grep 'to-index' | grep -oP 'new: \d+' | grep -oP '\d+')
LOCAL_O_STALE=$(echo "$LOCAL_STATUS" | grep 'to-index' | grep -oP 'stale: \d+' | grep -oP '\d+')

# Fallback if manifest line not found (old indexer version)
if [ -z "$LOCAL_O_TO_INDEX" ]; then
  LOCAL_O_INDEXED=$(echo "$LOCAL_STATUS" | grep 'Org' | grep -oP '\d+/\d+ files' | cut -d/ -f1)
  LOCAL_O_TOTAL=$(echo "$LOCAL_STATUS" | grep 'Org' | grep -oP '\d+/\d+ files' | cut -d/ -f2 | cut -d' ' -f1)
  LOCAL_O_TO_INDEX=$(( LOCAL_O_TOTAL - LOCAL_O_INDEXED ))
  LOCAL_O_NEW_ONLY=$LOCAL_O_TO_INDEX
  LOCAL_O_STALE=0
  echo "  ⚠ Org stale detection unavailable (update indexer)"
fi

LOCAL_S_NEW=$(( LOCAL_S_TOTAL - LOCAL_S_INDEXED ))

# Single call — parse + display from same output
ORACLE_STATUS=$(ssh "$ORACLE_HOST" "cd $ANDENKEN_DIR && npx tsx indexer.ts status" 2>&1)
echo "=== ORACLE STATUS ==="
echo "$ORACLE_STATUS"
echo ""
ORACLE_S_INDEXED=$(echo "$ORACLE_STATUS" | grep Sessions | grep -oP '\d+/\d+ files' | cut -d/ -f1)
ORACLE_S_TOTAL=$(echo "$ORACLE_STATUS" | grep Sessions | grep -oP '\d+/\d+ files' | cut -d/ -f2 | cut -d' ' -f1)

ORACLE_S_NEW=$(( ORACLE_S_TOTAL - ORACLE_S_INDEXED ))

echo "=== 증분 대상 ==="
echo "  Local  sessions: ${LOCAL_S_NEW}개 미인덱싱"
echo "  Local  org:      ${LOCAL_O_TO_INDEX}개 (new: ${LOCAL_O_NEW_ONLY}, stale: ${LOCAL_O_STALE})"
echo "  Oracle sessions: ${ORACLE_S_NEW}개 미인덱싱"
echo "  Oracle org:      rsync (API 비용 \$0)"
echo ""

# Cost estimate (rough: 34 chunks/file avg org, 30 chunks/file avg session)
S_CHUNKS=$(( LOCAL_S_NEW * 30 + ORACLE_S_NEW * 27 ))
O_CHUNKS=$(( LOCAL_O_TO_INDEX * 34 ))
TOTAL_CHUNKS=$(( S_CHUNKS + O_CHUNKS ))
API_CALLS=$(( (TOTAL_CHUNKS + 99) / 100 ))
# $0.20/1M tokens, ~470 chars/chunk, ~2.5 chars/token
EST_TOKENS=$(( TOTAL_CHUNKS * 188 ))
# Cost in millicents for integer math
EST_COST_USD=$(python3 -c "print(f'{$EST_TOKENS / 1000000 * 0.20:.4f}')")
EST_COST_KRW=$(python3 -c "print(f'{$EST_TOKENS / 1000000 * 0.20 * 1450:.0f}')")
EST_TIME=$(( API_CALLS * 3 ))

echo "=== 비용 추정 ==="
echo "  총 chunks:    ~${TOTAL_CHUNKS}"
echo "  API calls:    ~${API_CALLS}"
echo "  예상 토큰:    ~${EST_TOKENS}"
echo "  예상 비용:    ~\$${EST_COST_USD} (₩${EST_COST_KRW})"
echo "  예상 소요:    ~${EST_TIME}초"
echo ""

# API health check
API_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -d '{"content":{"parts":[{"text":"health"}]},"taskType":"RETRIEVAL_QUERY","outputDimensionality":768}')
echo "=== API 상태 ==="
echo "  Local key:  HTTP ${API_CODE}"
