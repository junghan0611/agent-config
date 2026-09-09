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
