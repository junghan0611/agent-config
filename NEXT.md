# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

> NOW: active ① **설치면 소유 경계 — entwurf 이관** (issue #46: agy statusline + pi
> provider/entwurfProvider), ② bibcli 도구-내장 스킬 owning-repo 환원(구조),
> ③ pi-chat Add-group blocker, ④ gogcli 재인증 마무리(선택 — 아래 [2026-07-02]).
> 방향(시험소·승격 파이프라인)은 `ROADMAP.md [2026-06-30]`. 닫힌 일은 `CHANGELOG.md`.

## [2026-07-04] 설치면 소유 경계 — entwurf 이관 (issue #46)

트래킹: https://github.com/junghan0611/entwurf/issues/46 — 같이 묶어 수정.

**원칙:** 소유는 파일 위치가 아니라 **배선 대상**으로 결정한다. `entwurf-bridge`/
`entwurfProvider`/statusline driver+gid를 가리키면 pi 설정 파일 *안*이라도 entwurf
`setup`이 멱등 소유한다. pi = 4번째 하네스일 뿐. 이관 순서: **새 소유자가 먼저 잡고 →
옛 소유자가 놓는다** (반대면 무소유 공백 = 기능 깨짐).

**완료 (이 세션):**
- agy MCP config → entwurf `install-agy-bridge` adapter 이관. LIVE ⑨ 13 checks green,
  DELIVERY shipped. (`bba0dcf`)
- `run.sh`에서 entwurf consumer install 설치면 제거 — pi install/pnpm/sync-auth/
  check-mcp/entwurf-targets 링크 + server=consumer 분기 전부. 소스 clone/pull만 유지
  (dev dogfooding). (`208b8d2`)

**남은 것 (issue #46, 테스트 밀도 높음):**
1. **agy statusline 이관** — `install-agy-bridge`가 agy `settings.json`의
   `statusLine.command`를 entwurf 소유 안정-bin 렌더러(driver+gid)로 세팅 + install-state +
   honest uninstall. 설계 변수: **agy 세션 → garden-id 조회 권위**(SessionStart 훅?
   `conversationId → gid` 역조회?). tripwire: statusLine.command는 안정 bin만(repo/
   agent-config 경로 금지 — 오라클 dangling 교훈).
2. **pi provider(entwurfProvider) 이관** — 순서 필수(라이브 provider, 공백 나면 깨짐):
   - `pi/settings.server.json` `packages[]`의 entwurf 줄 제거 (⚠️ **선행: 스코프 커버 확인**
     — entwurf user-scope citizen 등록 `register-pi-package.py`와 이 `settings.server.json`을
     같은 pi 인스턴스가 읽는지).
   - entwurf `install`이 `entwurfProvider` mcpServer 등록(안정 bin `entwurf-bridge`
     command, repo start.sh 절대경로 금지)을 멱등 소유하도록 확장 (**선행**).
   - 그 후 agent-config에서 `entwurfProvider` 블록 제거 = 완성. 옵션 (a)유지·(b)command만
     안정bin = 탈락(소유가 agent-config 잔존), **(c)블록 제거가 정답**.

## [2026-07-02] gogcli 재인증 — 이어서 (구조/문서는 v2026.7.2로 릴리즈됨)

> 코드(fork→글로벌 gog)·문서(SKILL.md upstream/Maps/YouTube, AGENTS.md SSOT)는
> `CHANGELOG.md v2026.7.2`로 닫힘. 여기 남는 건 **인증 상태 + 남은 선택 커맨드**뿐.

### 현재 auth 상태 (state)
- **personal `junghanacs@gmail.com`** (토큰 2026-07-02T06:35): analytics, appscript, calendar,
  chat, classroom, contacts, docs, drive, forms, gmail, people, searchconsole, sheets, slides,
  tasks, youtube. `ads` 제외(developer token 없으면 `unknownerror`로 전체 실패). ⚠️ 개인 gmail은 Chat API 불가.
- **work `<work-email>`** (jhkim2@회사도메인, 토큰 2026-05-24): 기존 14종. Chat 동작(알림용) — 재인증 불필요.
- **Maps**: `places_api_key` 설정됨. geocode/places search/directions/reverse 검증 OK.
  `distance --mode driving`은 광역지오코딩 시 ZERO_RESULTS(transit OK / place_id 쓰면 driving도 OK).

### 남은 선택 커맨드 (next, 전부 optional)
1. 개인계정에 photos/meet 더 얹기(테스트모드라 통과할 것):
   `gog login junghanacs@gmail.com --client personal --force-consent --services <위 personal 목록>,photos,meet`
2. 회사계정 넓히기(Chat엔 불필요):
   `gog login <work-email> --client work --force-consent --services appscript,calendar,chat,classroom,contacts,docs,drive,forms,gmail,people,searchconsole,sheets,slides,tasks,analytics,youtube`
3. commit 스킬 Chat 알림 발송 검증: work 계정 `gog chat messages send "$GOG_CHAT_SPACE_ID" ...`.
4. oracle 봇: nixos-config가 oracle(aarch64)에 글로벌 gog 설치(봇 필수). GLG가 nixos-config쪽 전달 완료.

### 재인증 명령 템플릿
```bash
gog login <email> --client <personal|work> --force-consent --services <a,b,c,...>
gog auth list
```

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
