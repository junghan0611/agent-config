# HERDR — 검수 매트릭스

herdr(herdrdev/herdr)를 **에이전트가 사는 터미널 런타임**으로 재는 작업면.
비교 대상은 우리 밑바닥 **entwurf의 visible-first tmux** — garden-id · 배달 ·
살아 있음 — 이지, 기능 대결이 아니다.

설치·스킬 연결은 하지 않는다. 배울 게 있으면 배운다.

> 후보지 채택이 아니다. `nixos-config`에 선언하지 않고, 우리 스킬 SSOT를
> 그쪽에 연결하지 않는다. 라이브에 `curl | sh` / `brew install herdr` 를
> 들이지 않는다. 이 집은 이미 tmux를 운영 면으로 쓰고, 그 위에 entwurf가 앉는다.

GLG (2026-09-09): 벤치에 올린다. *"DHH님이 사용하는 거라고 하더라."*
DHH 사용은 **inherited — 이 자리에서 못 쟀다.** SPONSORS.md 앞부분과 README에
그 이름이 없다 (측정 `gh api` 2026-09-09). 인기(스타)로 올리는 것이지
유명인 보증으로 올리는 것이 아니다.

---

## 상태 — 2026-09-09

클론 없음. PATH에 `herdr` 없음 (측정 `command -v`). 핀 없음.

원격만 읽음 (`gh repo view` + README): ★36,898 · fork 2,705 · Apache-2.0 ·
기본 브랜치 `master` · 홈 `https://herdr.dev` · `updatedAt` 2026-09-09T08:56:14Z.

한 줄 주장 (README, 읽음): **"the runtime your coding agents live on."**
에이전트를 감싸지 않는다. 터미널을 소유한다. Claude Code · Codex · Cursor ·
OpenCode · Grok 등 이미 쓰는 것을 그 패인에 둔다.

---

## 보는 축 — 우리 tmux와 겹치는 자리

entwurf는 밑바닥이라 여기서 재지 않는다. 재는 것은 **패인이 막힘을 어떻게
말하는지, 끊겨도 일이 사는지**다.

### 장기실행 — detach vs 프로세스 생존

README (읽음): 클라이언트를 닫거나 SSH가 끊겨도 백그라운드 서버가 터미널을
유지한다. 서버/머신 재시작 뒤에는 **저장된 레이아웃을 복구하고 지원되는
에이전트 세션을 resume할 수 있다. 원래 프로세스는 살아남지 않는다.**

우리 쪽: tmux는 세션이 사는 한 프로세스가 산다. entwurf `resume_call`은
dormant pi를 같은 garden-id로 다시 연다. heartbeat는 그 세션을 깨운다.
herdr의 "재시작 후 레이아웃 복구, 프로세스는 죽음"은 **우리 resume과 같은
말인지 미측정**이다. 같아 보이면 안 쓴다.

### 막힘 — working / blocked / idle

README (읽음): 모든 패인이 working · blocked · idle 로 표시된다. 에이전트가
멈춰 답을 기다리면 herdr이 말한다. 에이전트는 CLI/소켓으로 패인을 띄우고
서로를 프롬프트하고, **다른 에이전트가 진짜 blocked일 때까지 기다릴 수 있다.**

우리 쪽: `entwurf_peers` 의 liveness, goal `blocked`, decision-gate consult.
층이 다를 가능성이 크다 — 그들은 **터미널 패인의 UX**, 우리는 **선언된
상태 전이**.  thrashing 해서 합치지 않는다.

### 기억축 — 해당 없음에 가깝다

과제의 Seed도, 삶의 andenken도 이 물건의 주장이 아니다. 세션 상태 문서는
레이아웃·재개다 (`herdr.dev/docs/session-state/`, 링크만 읽음, 본문 미측정).
기억축 비교의 본체가 되려면 그 문서를 연 뒤에야 한다.

---

## 매트릭스

상태: `측정됨` / `미측정` / `막힘` / `안 함`

### A. 설치·격리

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| A1 | 원격 메타 | 측정됨 | ★36898 fork 2705 Apache-2.0 (`gh repo view`) |
| A2 | 클론 | 안 함 | `~/repos/3rd/herdr` 없음 |
| A3 | PATH 바이너리 | 측정됨 | `herdr` 없음 |
| A4 | 라이브 설치 | **안 함** | 우리 tmux/entwurf 면과 겹침 |
| A5 | 격리 구동 한 판 | 미측정 | 클론·핀이 선 다음 |

### B. 장기실행

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| B1 | detach 후 패인이 사는가 | 미측정 | README 주장 |
| B2 | 머신 재시작 후 프로세스 vs 레이아웃 | 미측정 | README는 레이아웃만 산다고 함 |
| B3 | 우리 `entwurf_resume_call` / tmux와 나란히 | 미측정 | **이 문서의 본체** |

### C. 막힘 표시

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| C1 | working/blocked/idle 가 패인에 붙는가 | 미측정 | README 주장 |
| C2 | 에이전트가 남의 blocked를 기다릴 수 있는가 | 미측정 | socket API 문서 미읽음 |
| C3 | 우리 `goal blocked` / peers liveness와 같은 층인가 | 미측정 | 가설: UX vs 선언. 재서 다를 때만 배운다 |

### D. 배우지 않을 것

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| D1 | tmux를 herdr로 교체 | **안 함** | 밑바닥은 이미 있다 |
| D2 | DHH 사용을 근거로 쓰기 | **안 함** | inherited, 미측정 |

---

## 미해결

1. **클론·핀.** 지금은 원격 README만이다.
2. **session-state / socket-api 본문.** 링크만 알고 내용은 안 읽었다.
3. DHH 사용 여부. 필요하면 공개 근거가 생길 때만 날짜를 붙여 고친다.

## 명령

아직 없다. `run.sh setup:herdr`를 만들지 않았다.

---

## [2026-09-14] 벤치 밖에서 이미 들어왔다 — 격리 전제가 깨졌다

관측 자리: oracle, Claude Opus 5 (claudecode), entwurf 세션 `20260914T084325-14d357`.
**이 관측 세션 자체가 herdr 패인 안에서 돌았다.** 위 2026-09-09 절은 그대로 둔다 —
아래가 그 절의 A2/A3/A4를 뒤집는다.

### A. 설치 — "안 함"이 사실이 아니게 됐다

`[측정 env]` `HERDR_ENV=1` · `HERDR_PANE_ID=w2:p1` · `HERDR_TAB_ID=w2:t1` ·
`HERDR_WORKSPACE_ID=w2` · `HERDR_SOCKET_PATH=~/.config/herdr/herdr.sock` ·
`HERDR_BIN_PATH=~/.local/bin/herdr`.

`[측정 herdr status]` client 0.9.0 / channel **stable** / protocol 22,
server **running** 0.9.0, `endpoint_compatible: yes`, `restart_needed: no`.
`[측정 ps]` `herdr server` pid 1764235, TUI 클라이언트 pid 1764234.

`[측정 ls -la]` `~/.local/bin/herdr`, 22,697,240 bytes, mtime **2026-09-14 08:32**
— 서버 기동과 같은 분.

`[측정 grep -rn -i herdr ~/repos/gh/nixos-config/]` **0건.** 선언이 없다.
즉 이 바이너리는 **nixos-config 선언 밖의 자가업데이트 바이너리**다
(`herdr update` / `herdr channel set` 를 자기 CLI가 갖고 있다).
D1("tmux를 herdr로 교체")은 여전히 **안 함**이지만, A4("라이브 설치 안 함")는
그것과 별개로 이미 넘어갔다. 벤치의 격리 전제와 실제 HOME이 어긋나 있다는 사실을
먼저 기록한다.

`[inherited, 미측정]` 누가 언제 무슨 경로로 이 바이너리를 넣었는지.

### B. integration — 가장 큰 새 사실: entwurf가 공동소유하는 파일면에 이미 있다

`[측정 herdr integration status]`

| 설치됨 (`current`) | 경로 |
|---|---|
| pi (v8) | `~/.pi/agent/extensions/herdr-agent-state.ts` |
| omp (v9) | `~/.omp/agent/extensions/herdr-omp-agent-state.ts` |
| claude (v9) | `~/.claude/hooks/herdr-agent-state.sh` |
| codex (v8) | `~/.codex/herdr-agent-state.sh` |
| copilot (v3) | `~/.copilot/hooks/herdr-agent-state.sh` |
| antigravity-cli (v3) | `~/.gemini/config/hooks/herdr-agent-state.sh` |
| grok (v1) | `~/.grok/hooks/herdr-agent-state.sh` |

미설치: devin · droid · kimi · opencode · kilo · hermes · qodercli · qwen · cursor · mastracode.

**entwurf가 시민을 여는 하네스 대부분이 여기 겹친다.** 그리고 그 파일들은
entwurf 설치자가 쓰는 바로 그 디렉토리들이다.

`[읽음 ~/.claude/hooks/herdr-agent-state.sh 헤더]`
> `managed by herdr; reinstalling or updating the integration overwrites this file.`
> `add custom hooks beside this file instead of editing it.`

`[읽음 같은 파일 본문]` claude 훅은 `SessionStart`만 처리하고, `HERDR_ENV`/`HERDR_PANE_ID`/
`HERDR_SOCKET_PATH`가 없으면 조용히 exit 0 한다. hook payload에서 `session_id`와
`transcript_path`를 꺼내 소켓으로 `pane report-agent-session`을 쏜다. `agent_id`가 있으면
(subagent) 스킵하고, `CURSOR_VERSION`이 보이면 스킵한다.

`[측정 ~/.claude/settings.json]` `SessionStart`에 우리 `session-info.sh`(matcher `""`)와
herdr 훅(matcher `"*"`, timeout 10)이 **나란히 등록돼 공존 중**이다.

`[측정 디렉토리 존재]` entwurf 쪽도 같은 트리에 있다 —
`~/.claude/plugins/cache/meta-bridge-local`,
`~/.claude/plugins/data/entwurf-meta-receive-meta-bridge-local`.
**실제 간섭 여부는 미측정.**

### C. 렌즈 2 (delivery / 대칭 UX) — B3에 대한 답: 같은 층이 아니다

`[읽음 herdr --skill · herdr agent --help, 0.9.0]`

| 축 | herdr가 스스로 쓴 것 |
|---|---|
| 주소 | pane id `w1:p1` 또는 live agent name. **한 서버 스코프**. pane move 시 새 id, 에이전트 exit 시 name 해제 |
| 전송 | `agent prompt` = bracketed-paste 텍스트 + Enter **키 주입** |
| 전송 증거 | *"reports successful submission only after both have been written; that alone does not prove the agent started a turn."* |
| 회신 | `agent read` = 화면 스크랩. alt-screen 행은 scrollback에 안 들어가 **회수 불가**; 폴백은 *"에이전트에게 파일로 쓰라 하고 그 파일을 읽어라"* |
| 상태 | 바닥 버퍼 텍스트 탐지. `unknown`은 *"does not prove completion"* |
| 크로스머신 | id는 한 서버 스코프. `machine list`는 연결 프로파일이지 pane 인벤토리가 **아니다** |

**B3 판정 — 측정됨: herdr의 "재시작 후 레이아웃 복구, 프로세스는 안 삼"은 entwurf
`resume_call`과 같은 말이 아니다.** herdr에는 dormant identity 축이 없다. 패인이 닫히면
주소가 사라지고, 다시 여는 것은 배치의 복구이지 같은 이름의 되부름이 아니다.
`working/blocked/idle`(C1/C3)도 가설대로 **패인 UX 층**이고 선언된 상태 전이가 아니다.

이 목록은 우리 `entwurf/DELIVERY.md:22-26`이 qualifying delivery **자격 밖**으로 명시한
항목("tmux/pty keystroke injection or transcript scraping")과 그대로 겹친다.
이건 herdr의 결함이 아니라 **범용 도구의 합리적 선택**이다 — 하네스마다 다른 공식
수신면을 파는 대신 모두에게 통하는 키 주입을 쓴다.

### D. 렌즈 3 (peer 부르기) — 배울 것이 아니라 기록할 것

`[읽음 herdr --skill]` 예시가 `herdr agent start reviewer --kind codex`,
`agent prompt reviewer "Review the current diff…"` 다. 형제를 `reviewer` 같은
**내부 역할명으로 축약하는 것이 기본 UX**다. 관점 3(다른 학교 모델을 역할로 환원하지
않는다)과 정면으로 어긋난다. 채택하지 않는다.

다만 `agent start`가 레이아웃을 만들지 않고 **이미 있는 셸 패인만 점유**하는 분리
(`"never creates, splits, or moves layout"`)는 우리 mux의 launch/placement 분리와
같은 결이고, 배울 만하다.

### E. 새로 열린 이음매 — `nativeSessionId` 하나로 무손실 조인된다

`[측정 herdr pane report-agent-session --help]` 공개 플래그에
`--agent-session-id <ID>` 와 `--agent-session-path <PATH>` 가 있다.
`[측정 ~/.config/herdr/session.json]` 그 보고가 실제로 저장돼 있다:
`{"source":"herdr:claude","agent":"claude","kind":"id","value":"9706ccd4-…"}`.

이 관측 세션으로 조인을 실제로 재봤다 `[측정 2026-09-14, 새 코드 0줄]`:

| 축 | 값 |
|---|---|
| herdr 배치 | `w2:p1` (내부 pane `2` → public `1`) |
| herdr가 아는 native id | `9706ccd4-4cb5-4426-9d27-c4579a68c3dd` |
| entwurf 레코드 | `~/.pi/agent/meta-sessions/20260914T084325-14d357.meta.json` |
| entwurf `nativeSessionId` | 같은 값 |
| 유일성 | 레코드 **1117개 중 정확히 1건** |

**herdr는 `pane → nativeSessionId`를, entwurf는 `nativeSessionId → gardenId`를 이미 안다.**
양쪽이 협상 없이 같은 이음매를 팠다. 이 축의 처분은 벤치가 아니라 entwurf가 들고 갔다 —
`junghan0611/entwurf#116` (배치는 herdr에게 빌리고 신원·부름·퇴근만 entwurf가 파는
플러그인 형태의 research 이슈).

### 매트릭스 델타 — 이번 턴 증거만

| # | 항목 | 이전 | 지금 | 판정 |
|---|---|---|---|---|
| A2 | 클론 | 안 함 | 해당 없음 | 소스 클론 대신 **배포 바이너리**가 들어왔다 |
| A3 | PATH 바이너리 | 측정됨(없음) | **측정됨(있음)** | `~/.local/bin/herdr` 0.9.0 |
| A4 | 라이브 설치 | **안 함** | **측정됨(됨)** | nixos-config 선언 밖, 자가업데이트 |
| A5 | 격리 구동 한 판 | 미측정 | **해당 없음** | 격리가 아니라 주 HOME에서 돈다 |
| B1 | detach 후 패인 생존 | 미측정 | 미측정 | 아직 안 끊어봤다 |
| B2 | 재시작 후 프로세스 vs 레이아웃 | 미측정 | 미측정 | 아직 안 재웠다 |
| B3 | 우리 `resume_call`과 나란히 | 미측정 | **측정됨** | **다른 층.** dormant identity 축 없음 |
| C1 | working/blocked/idle | 미측정 | **읽음** | 텍스트 탐지 기반, `unknown ≠ 완료` |
| C2 | 남의 blocked 기다리기 | 미측정 | **읽음** | `agent wait --until blocked` 있음 |
| C3 | 우리 liveness와 같은 층인가 | 미측정 | **측정됨** | 가설대로 **UX vs 선언** |
| D1 | tmux를 herdr로 교체 | 안 함 | **안 함** | 유지 |
| D2 | DHH 근거로 쓰기 | 안 함 | **안 함** | 유지 |
| E1 | `nativeSessionId` 조인 | 없던 항목 | **측정됨** | 1117개 중 1건, 새 코드 0줄 |

### 미해결 — 갱신

1. **entwurf claude 레일과 herdr claude 훅의 공존.** 같은 `SessionStart`, 같은 트리,
   herdr 쪽은 "재설치하면 덮어쓴다" 선언. 다음 측정: `cd ~/repos/gh/entwurf && ./run.sh doctor-meta-bridge`.
2. **설치 출처.** `~/.local/bin/herdr`가 어떻게 들어왔는지 inherited. 선언 밖 자가업데이트
   바이너리를 이 HOME에 둘지는 GLG 판단이고 벤치의 몫이 아니다.
3. **session-state / socket-api 본문.** 여전히 미읽음. 다만 이제 로컬에 `herdr api schema`가
   있으므로 원격 문서 없이 읽을 수 있다.
4. B1/B2 (detach·재시작)는 여전히 미측정. B3이 먼저 답나온 것은 문서로 답이 나왔기 때문이다.
5. DHH 사용 여부 — 변동 없음.

### 명령

여전히 없다. `run.sh setup:herdr`를 만들지 않는다 — 이미 선언 밖에서 돌고 있어서
setup 타깃이 격리를 주지도 못한다.

---

## [2026-09-15] 상태바 설정은 저장하되 설치면은 열지 않는다

`~/.config/herdr/config.toml`의 현행 UI 설정을 `herdr/config.toml`에 **regular-file
snapshot**으로 보관했다 (`[측정]` Python `tomllib` 구조 비교: live와 동등). 이 파일은
심볼릭 링크도 `run.sh` 설치 대상도 아니다. Herdr Settings UI와 실제 config가 계속
`~/.config/herdr/config.toml`을 소유한다. 다음에 그 live 설정을 바꾸면 검토한 뒤 snapshot을
동기화한다.

snapshot에는 하단 tab row와 우측 `~/.current-device`(fallback hostname) · 서버-로컬
`%Y-%m-%d %H:%M` 시계가 들어 있다. 따라서 SSH/원격 client에서도 그 패인이 실제로 도는
서버의 위치와 시간이 보인다 (`herdr server reload-config` 적용 receipt: `status: applied`,
diagnostics 없음).
