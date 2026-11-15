#!/usr/bin/env bash
# 검증 → public/ 조립 → 배포. 토큰은 명령마다 넘기고 export 하지 않는다.
set -euo pipefail
cd "$(dirname "$0")"
python3 build.py
rm -rf public && mkdir public
cp index.html data.js public/
CLOUDFLARE_API_TOKEN=$(<~/.cf-token-glg) wrangler deploy "$@"
