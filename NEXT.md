# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

## [2026-06-06] claude/settings.json — 키셋-owner merge 전환 (워크스테이션 경로 LANDED)

**불변식: 워크스테이션에서 `~/.claude/settings.json`을 심링크하지 않는다.**
pi-shell-acp meta-bridge가 같은 파일을 공동 소유하므로, 심링크(=파일 통째 소유)는
다음 writer의 atomic rename에 조용히 덮인다. pi-shell-acp 쪽은 1.0.0에서
state 기반 키셋 in/out(`scripts/meta-bridge-state.py`, `pi-shell-acp.install-state.json`)으로
이미 완성됨 — 이 항목은 **agent-config 쪽 미이주 절반**을 닫는 작업이었다.

### LANDED (이번 세션)

- `claude/settings.json` → `claude/settings.fragment.json` (git mv). **agent-config 키셋만** 남김:
  hooks / permissions / language / effortLevel / editorMode / preferredNotifChannel /
  agentPushNotifEnabled / voiceEnabled / autoUpdates / enabledPlugins(official toggles).
  양도(제거): statusLine, B-lite 스칼라(cleanupPeriodDays·env.DISABLE_AUTOCOMPACT·
  promptSuggestionEnabled·awaySummaryEnabled·autoMemoryEnabled·skipDangerousModePermissionPrompt·
  verbose·autoCompactEnabled·showTurnDuration·terminalProgressBarEnabled·useAutoModeDuringPlan),
  enabledPlugins.entwurf-meta-receive, extraKnownMarketplaces → **전부 pi-shell-acp 소유**.
- `run.sh`: `merge_settings()` 헬퍼 추가(`jq -s '.[0]*.[1]'` = existing*fragment, 객체 재귀 merge·
  배열 replace·co-owner 키 보존·legacy 심링크 자동 de-reference·atomic write). setup_links 분기:
  **서버 = full `settings.server.json` 심링크(단일 owner)**, **워크스테이션 = fragment merge**.
- status/doctor 라인: settings.json이 심링크 아니어도 `merged (keyset)`로 정직 표기.
- `claude/settings.local.json`: stale `enabledMcpjsonServers:["pi-tools-bridge"]` 제거
  (애초 "New MCP server" 프롬프트 원인 — pi-tools-bridge는 user-scope라 불필요).
- 검증: 라이브 파일 dry-run merge → pi-shell-acp 키(statusLine/meta/B-lite) 전부 보존 +
  agent-config 키 주입 + idempotent 확인.

### 분담선 SSOT

pi-shell-acp `~/.claude/pi-shell-acp.install-state.json`의 `files.settings.keys`가
"pi-shell-acp 소유 키"의 권위. agent-config 키셋 = 그 여집합. 새 키 추가 시 양쪽이
같은 키를 잡지 않는지 이 state로 교차 확인.

### 남은 follow-up (이번 범위 밖, 의도적 보류)

- **서버 디바이스**: 현재 full 심링크 유지 = B-lite 스칼라가 서버에도 박힘. pi-shell-acp가
  서버까지 확장되면 그때 서버도 fragment merge로. 지금은 서버에 meta-bridge 없어 충돌 없음.
- **같은 심링크 함정 점검**: `settings.local.json`은 단일 owner라 심링크 유지(안전). 단
  `pi/settings.json`·`gemini/settings.json`·`antigravity/settings.json`·`mcp_config.json`은
  앱/다른 installer가 쓰면 동일 위험 — 공동 소유 발생 시 같은 merge 모델로.
- **statusLine 테마 환원**: pi-shell-acp Phase 3가 statusLine을 통째 소유 중. 풀기능에서
  색/테마만 agent-config로 일부 이관 합의(pi-shell-acp NEXT.md). 그 시점 키 분리.

## [2026-05-29] pi-chat Add group blocker — 다음 세션 첫 한 점

오전 결정 받아 본 시작했다. **막힌 자리:** `/chat-config` → `telegram-glg-entwurf-bot` → **Add group** 선택 시 setup TUI가 즉시 닫힌다.
Telegram account 등록은 끝났고, 지금은 채널 등록만 막혀 있다.

### 준비 상태

- `~/.env.local`에 `PI_ENTWURF_BOT_TOKEN` 동기화 완료
- `~/repos/3rd/pi/pi-chat/node_modules` 설치 완료
- thinkpad IPv6 outbound 부재 + Node 24 fetch IPv4 fallback 문제 확인
- `~/.pi/agent/patches/ipv4-only.mjs` 준비 완료
- `pi-chat` 로컬 진단 patch 2개 유지 중
  - global dispatcher IPv4 강제
  - `observeTelegramTarget` catch stderr 로깅

### 다음 실행

```bash
NODE_OPTIONS="--import=$HOME/.pi/agent/patches/ipv4-only.mjs" pi -e ~/repos/3rd/pi/pi-chat/
```

1. `/chat-config` → `telegram-glg-entwurf-bot` → **Add group** 재시도
2. stderr에 `[pi-chat] observeTelegramTarget error: ...`가 보이면 그 메시지로 분기
   - `fetch failed ETIMEDOUT/ENETUNREACH` → IPv4 dispatcher 추가 fix 필요
   - `401 Unauthorized` → token / webhook 충돌 확인
   - 그 외 → 케이스별 분석
3. **DM 모드도 1회 통과**시켜 자동 등록 경로 비교
4. 채널 등록이 되면 그룹 mention 첫 왕복까지 확인

### 메모

- Track B의 중기 방향과 resident 담당자 패턴 축은 `ROADMAP.md`로 이동했다.
- 이 항목이 닫히면 `NEXT.md`를 비우거나 다음 한 걸음만 다시 적는다.
