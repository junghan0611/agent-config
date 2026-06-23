# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

## [2026-06-11] 도구-내장 스킬을 owning repo로 환원 (구조 결함)

**문제:** `bibcli` 스킬이 잘못된 곳에 산다. 소스(`zotero-config/bibcli/*.go`)와
스킬 런타임(`agent-config/skills/bibcli/{SKILL.md,bibcli}`)이 갈라져 있고,
`~/.local/bin/bibcli`·`~/.claude/skills`가 전부 agent-config를 가리킨다. 개발 repo에서
스킬을 소비하려면 거리가 멀어 **문서 동기화가 느리고**(SKILL.md가 zotero-config 워크플로
변화를 늦게 반영 — 예: `save --sync --json` 한방 경로가 한참 문서에 안 들어가 있었음),
openclaw 6개 사본까지 드리프트한다.

**목표 구조 (voscli 패턴):** 도구를 품은 repo가 스킬도 품는다.
```
<repo>/.claude/skills/<name>/SKILL.md   # + 바이너리 동거
<repo>/.pi/settings.json                # {"skills": ["../.claude/skills"]}  → pi 인식
```
예: `~/repos/work/voscli/.claude/skills/voscli/SKILL.md` (+ `.pi/settings.json`).
개발하는 에이전트가 **그 repo 안에서 바로 소비**한다.

**bibcli 이주 시 닫아야 할 plumbing (단독 rm 금지 — 연결점 많음):**
- `~/.claude/skills` → `agent-config/skills` 통째 심링크: bibcli만 빼면 Claude Code가
  못 보게 됨. project-scoped 소비로 전환하거나 심링크 전략 재설계 필요.
- `~/.local/bin/bibcli` → `agent-config/skills/bibcli/bibcli` 심링크 재지정.
- `./run.sh build`가 바이너리를 떨구는 목적지(agent-config) → zotero-config 내부로.
- openclaw-config 6개 사본(gpt/gemini/bbot/glg/claude-skills/workspace) 배포 경로 갱신.
- nixos-config home-manager가 위 심링크를 만드는지 확인.

**범위:** agent-config에서 도구-내장 스킬(bibcli 외에도 incidentcli는 이미 work repo
심링크 패턴)을 식별 → owning repo로 환원하는 일반 정책. 이번 세션엔 zotero-config
README/AGENTS.md/SKILL.md 내용만 바로잡았고(= save --sync --json 전면화, beads 제거),
**구조 이주는 이 NEXT 항목으로 보류**.

## [2026-06-06] claude/settings.json — 키셋-owner merge 전환 (워크스테이션 경로 LANDED)

**불변식: 워크스테이션에서 `~/.claude/settings.json`을 심링크하지 않는다.**
entwurf meta-bridge가 같은 파일을 공동 소유하므로, 심링크(=파일 통째 소유)는
다음 writer의 atomic rename에 조용히 덮인다. entwurf 쪽은 1.0.0에서
state 기반 키셋 in/out(`scripts/meta-bridge-state.py`, `entwurf.install-state.json`)으로
이미 완성됨 — 이 항목은 **agent-config 쪽 미이주 절반**을 닫는 작업이었다.

### LANDED (이번 세션)

- `claude/settings.json` → `claude/settings.fragment.json` (git mv). **agent-config 키셋만** 남김:
  hooks / language / effortLevel / editorMode / preferredNotifChannel /
  agentPushNotifEnabled / voiceEnabled / autoUpdates / enabledPlugins(official toggles).
  **permissions.allow/deny/defaultMode 제거 → entwurf 단독 소유**(아래 결정). 결과:
  fragment ∩ pi 키셋 = **완전 무중첩**(install-state SSOT 대조로 검증). merge가 permissions를
  아예 안 건드려 pi의 doctor가 단일 권위로 소유·검증 가능.
  양도(제거): statusLine, B-lite 스칼라(cleanupPeriodDays·env.DISABLE_AUTOCOMPACT·
  promptSuggestionEnabled·awaySummaryEnabled·autoMemoryEnabled·skipDangerousModePermissionPrompt·
  verbose·autoCompactEnabled·showTurnDuration·terminalProgressBarEnabled·useAutoModeDuringPlan),
  enabledPlugins.entwurf-meta-receive, extraKnownMarketplaces → **전부 entwurf 소유**.
- `run.sh`: `merge_settings()` 헬퍼 추가(`jq -s '.[0]*.[1]'` = existing*fragment, 객체 재귀 merge·
  배열 replace·co-owner 키 보존·legacy 심링크 자동 de-reference·atomic write). setup_links 분기:
  **서버 = full `settings.server.json` 심링크(단일 owner)**, **워크스테이션 = fragment merge**.
- status/doctor 라인: settings.json이 심링크 아니어도 `merged (keyset)`로 정직 표기.
- `claude/settings.local.json`: stale `enabledMcpjsonServers:["entwurf-bridge"]` 제거
  (애초 "New MCP server" 프롬프트 원인 — entwurf-bridge는 user-scope라 불필요).
- 검증: 라이브 파일 dry-run merge → entwurf 키(statusLine/meta/B-lite) 전부 보존 +
  agent-config 키 주입 + idempotent 확인.

### 분담선 SSOT

entwurf `~/.claude/entwurf.install-state.json`의 `files.settings.keys`가
"entwurf 소유 키"의 권위. agent-config 키셋 = 그 여집합. 새 키 추가 시 양쪽이
같은 키를 잡지 않는지 이 state로 교차 확인.

**[2026-06-06 결정] permissions.allow/deny → entwurf 단독 소유.** single-driver 도구
제한은 ACP 백엔드와 동일한 pi의 근본 책임. 이전엔 양 repo가 같은 permissions 배열을
소유하고 값이 우연히 같아 증상이 가려진 "조용한 시한폭탄"(한쪽이 항목 추가 시 다른 쪽
setup이 옛 배열로 replace)이었다. agent-config가 permissions를 손에서 놓아 폭탄 제거.
→ **원칙: entwurf의 install/uninstall/doctor가 안정화될 때까지 agent-config는 Claude
settings에서 pi 영역을 일절 세팅하지 않는다. 우리가 세팅하는 건 스킬·커맨드 경로 + 순수
agent-config 키(hooks/언어/개인취향)뿐.** pi 쪽 방어막(doctor keyset-survival 체크,
check-keyset-overlap 진단)은 entwurf 트랙.

### 남은 follow-up (이번 범위 밖, 의도적 보류)

- **서버 디바이스**: 현재 full 심링크 유지 = B-lite 스칼라가 서버에도 박힘. entwurf가
  서버까지 확장되면 그때 서버도 fragment merge로. 지금은 서버에 meta-bridge 없어 충돌 없음.
- **같은 심링크 함정 점검**: `settings.local.json`은 단일 owner라 심링크 유지(안전). 단
  `pi/settings.json`·`gemini/settings.json`·`antigravity/settings.json`·`mcp_config.json`은
  앱/다른 installer가 쓰면 동일 위험 — 공동 소유 발생 시 같은 merge 모델로.
- **statusLine 테마 환원**: entwurf Phase 3가 statusLine을 통째 소유 중. 풀기능에서
  색/테마만 agent-config로 일부 이관 합의(entwurf NEXT.md). 그 시점 키 분리.

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
