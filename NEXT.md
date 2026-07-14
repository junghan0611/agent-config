# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

> NOW: active ① **검수 보고 규범을 홈 AGENTS.md에 박기** (아래 [2026-07-14]),
> ② **설치면 소유 경계 — entwurf 이관의 옛 소유자 cleanup** (issue #46),
> ③ bibcli 도구-내장 스킬 owning-repo 환원(구조),
> ④ pi-chat Add-group blocker, ⑤ gogcli 재인증 마무리(선택 — 아래 [2026-07-02]).
> 방향(시험소·승격 파이프라인)은 `ROADMAP.md [2026-06-30]`. 닫힌 일은 `CHANGELOG.md`.

## [2026-07-14] 검수 보고 규범 — improve-agent 관측 결과의 착지

관측 도구는 커밋됐다(`improve-agent`: `--says`, Claude Code 어댑터, 단일 시계,
회귀 테스트 8개). 남은 건 **관측에서 나온 규범을 어디에 박느냐**다.

**배경(사건):** 7/13(61커밋·8리포) 오푸스 세션에서 GLG가 자기비판 워딩을 감지해
출근길 글을 남겼다. 7/8(63커밋)·7/9(42커밋)을 기준선으로 재보니 **오푸스가 통계적으로
무너진 날은 아니었다** — 자책률·ESC·피어 서사 점유 모두 기준선 이하거나 동등. 남은 정직한
사실은 하나: 검수자 정당성과 자기 책임을 전면에 둔 문장이 몇 번 나타났고, 그중 **한 건은
명백히 판결형**(`notes:L299` "GPT가 1번과 2번 모두 맞습니다. 제 잘못이 둘입니다")이었다.
GLG가 그 배열을 협업에 맞지 않는 것으로 느꼈다. 그 이상은 데이터가 증명하지 않는다.

**다음 한 걸음 — 홈 `AGENTS.md`(`home/AGENTS.md`)에 넣을 규범 초안:**
> 검수 보고는 승패나 자기평가가 아니라 **상태 변화·진단·조치**로 시작한다. 실제 사고는
> **영향과 복구를 먼저** 알리고 책임은 사실만 짧게 기록한다. 교차검수는 누가 옳았는지가
> 아니라 **무엇을 함께 찾아 메웠는지**로 기술한다.

핵심은 새로 가르치는 게 아니라 **되찾는 것**이다 — 7/9 오푸스는 이미 이 배열을 지켰다
("닫았습니다", "M3-1이 실기로 닫혔습니다"). 문안 확정 후 `home/AGENTS.md`에 반영한다.

**연결:** 원석(출근길 글)과 이 근거는 **어쏠로그 수선 때 별도 축으로** 다룬다. org 근거표는
그때 만든다(지금 만들지 않는다). 대화 자체가 오늘의 원자료다.

## [2026-07-13] issue #46 마지막 단계 — 옛 소유자가 놓기

트래킹: https://github.com/junghan0611/entwurf/issues/46

entwurf 쪽 새 소유자는 이미 섰다: user/project `packages[]` +
`entwurfProvider.mcpServers.entwurf-bridge` writer/doctor/smoke, agy MCP·exact permission,
statusline, PreInvocation birth hook까지 모두 state-backed install/doctor/inverse로 닫혔다.
최종 감사에서 **agent-config의 옛 배선이 아직 남아 재실행 시 되돌릴 수 있음**을 확인했다.

**현재 남은 실제 파일:**
- `pi/settings.json`, `pi/settings.server.json`: entwurf package + repo-path
  `entwurfProvider.mcpServers.entwurf-bridge` 잔존.
- `antigravity/settings.json`: agent-config 절대경로 `statusLine` 잔존.
- `run.sh setup`: 위 agy settings 전체를 symlink로 다시 소유함. entwurf adapter는 symlink를
  정직하게 refuse하므로 다음 agent-config setup이 #46 배선을 다시 깨뜨릴 수 있다.
- `antigravity/statusline.sh`: 이관 완료 뒤 retired 후보.

**닫는 순서(반드시 새 소유자 먼저):**
1. entwurf repo에서 `./run.sh setup <project>`을 실행해 live user/project provider를 bare
   `entwurf-bridge`로 normalize. `doctor-pi-provider`가 EFFECTIVE bare + state-owned인지 확인.
2. 이 repo의 두 pi settings fragment에서 entwurf package와
   `entwurfProvider.mcpServers`를 제거한다. issue 원칙대로 최종적으로
   `entwurfProvider` 블록 전체를 template에서 놓되, live operator의 기존 sibling 설정을
   삭제하지 않도록 merge/inverse 순서를 검증한다.
3. `antigravity/settings.json`에서 `statusLine`을 제거하고, setup을 whole-file symlink에서
   **disjoint-key merge**로 바꾼다. permissions/model/trustedWorkspaces는 agent-config가,
   statusLine + exact entwurf permission은 entwurf가 같은 regular file에서 원소별 소유한다.
4. `antigravity/statusline.sh` 참조 0 확인 후 제거한다.
5. agent-config setup을 두 번 재실행하고 다음을 확인한다:
   - `doctor-pi-provider` EFFECTIVE bare, provider load 유지
   - `doctor-agy-bridge` / `doctor-agy-statusline` / `doctor-agy-hooks` green
   - `~/.gemini/antigravity-cli/settings.json` regular file 유지
   - agent-config repo path 재유입 0, unrelated operator 설정 보존
6. agent-config NEXT/CHANGELOG에서 #46 항목을 닫고 entwurf issue에 최종 증거를 남긴다.

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
