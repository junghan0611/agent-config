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

---

## [2026-09-19] Marketplace는 리포 카드이지만 root-only registry가 아니다

관측 자리: `entwurf` 0.23.0 / Herdr plugin 0.2.0을 낸 뒤, 플러그인을
`entwurf/plugins/herdr`에 계속 둘지 별도 `herdr-entwurf` 리포로 나눌지 조사했다.
이것은 채택 판정이나 설치 실험이 아니다. upstream marketplace와 현재 공개 인덱스를
읽고, Entwurf의 실제 배포·검증 의존성을 대조한 관측이다.

### A. 목록의 단위와 하위 디렉터리

`[읽음 upstream, herdr master docs/next/website/src/content/docs/marketplace.mdx,
2026-09-19]` marketplace는 public GitHub repository 중 `herdr-plugin` topic을 단 것을
찾고, default branch의 **어느 경로에나** 있는 parseable `herdr-plugin.toml`을 찾는다.
카드는 repository 하나당 하나이고, 그 안의 유효 manifest는 각각 installable row가 된다.
공식 install 문법도 `owner/repo[/subdir...]`이며, docs는 root와 subdirectory manifest를
동등하게 명시한다. 따라서 `junghan0611/entwurf/plugins/herdr`는 목록의 비정상 경로가
아니다. 공개 snapshot에도 `openclaw/crabbox`의 `plugins/herdr/herdr-plugin.toml` 및
`alexarthurs/herdr-sidebar`의 `plugins/herdr-sidebar/herdr-plugin.toml` 행이 실제로 있다
(`[측정 HTTPS] https://herdr.dev/plugins/, generatedAt 2026-09-18T09:30:52.432Z`).

### B. 지금 Entwurf가 안 보이는 이유는 리포 모양으로 설명되지 않는다

`[측정 GitHub REST, 2026-09-19]` `repos/junghan0611/entwurf/topics`와 `gh repo view`는
`herdr-plugin` topic을 보이고, default branch에는 plugin 0.2.0의
`plugins/herdr/herdr-plugin.toml`이 있다. 반면 같은 시점 GitHub search
`topic:herdr-plugin user:junghan0611`은 `total_count: 0`을 돌렸다. Herdr marketplace가
쓰는 upstream query도 정확히 `topic:herdr-plugin is:public`이다. 공개 snapshot 역시
Entwurf row가 없으며, 그 `generatedAt`은 Entwurf NEXT가 기록한 topic 추가
2026-09-18 22:24 KST보다 앞선다.

여기서 말할 수 있는 것은 **topic-search/index 지연이 현재 관측되었다**는 것뿐이다.
다음 갱신이 언제 Entwurf를 보일지는 아직 미측정이다. docs의 “30분마다 refresh, default
branch head가 바뀌면 rescan”은 정상 경로의 설명이지 이 지연의 보장은 아니다. 리포를
분리해도 새 리포도 같은 GitHub topic search를 통과해야 하므로 이 사실의 해결책은 아니다.

### C. 소유 경계에 대한 현재 결론

`[읽음 entwurf file:line]` plugin build는 checkout에서
`../../../scripts/herdr-runtime.mjs`와 `../../../scripts/herdr-activation.mjs`를 import한다
(`plugins/herdr/lib/runtime-bootstrap.mjs:15`, `plugins/herdr/lib/build.mjs:52-61`). 그것은
실수로 섞인 것이 아니다. checkout이 uninstall 때 지워진 뒤에도 runtime journal·activation
ledger·deactivate verb를 읽어야 해서, 지속해야 할 owner는 install된
`@junghanacs/entwurf@0.23.0` artifact에 남도록 만든 계약이다. root의 deterministic gates와
mutants도 plugin manifest, bootstrap, activation, supply, fresh-call rail을 함께 증명한다.

그래서 **지금은 분리하지 않는 편을 권한다.** 별도 리포가 주는 것은 marketplace 카드의
repository 이름을 `herdr-entwurf`로 바꾸는 발견성/심미성이고, 검색 등록의 자격은 이미
현재 구조가 가진다. 반대로 지금 옮기면 checkout-time imports, exact npm runtime lock,
install 이후 self-removing checkout, activation/deactivation과 그 proof들을 새로운 public
package 또는 별도 versioned artifact 경계로 다시 설계하고 두 release cadence를 동기화해야
한다. 그것은 이름 정리가 아니라 lifecycle authority 이동이다.

현재의 작은 다음 수는 리포 분할이 아니라 marketplace search 결과가 Entwurf를 실제로
보이는지 재측정하고, 이미 NEXT에 적힌 다음 plugin minor에서 display name만 **Herdr
Entwurf**로 고쳐 row의 뜻을 선명하게 하는 것이다. 별도 리포는 plugin이 Entwurf core와
독립된 release cadence·runtime artifact·issue queue를 실제로 갖게 될 때 다시 검토한다.

---

## [2026-09-21] herdr 쪽에서 본 entwurf — 장르는 붐비고, 축은 비어 있다

관측 자리: oracle, Claude Opus 5 (claudecode). 계기는 awesome-herdr 등재
(`[측정 gh pr view]` `yigitkonur/awesome-herdr#24`, **merged 2026-09-20T09:31:23Z**,
`README.md` +5/-4, 작성 `gpt-5.6-terra (pi/oracle)`). 이번 턴은 설치도 실행도 하지
않았다 — **공개 인덱스와 이웃 프로젝트의 자기 문서만 읽었다.** 묻는 것은 하나다:
*herdr 생태계의 좌표계 위에서 entwurf는 무슨 칸에 서 있고, 그 칸에 뭐가 비어 있는가.*

### A. 2026-09-19의 미해결 두 개가 닫혔다

| 그때 | 지금 | 증거 |
|---|---|---|
| GitHub `topic:herdr-plugin user:junghan0611` → `total_count: 0` | **1** | `[측정 gh api search/repositories, 2026-09-21]` |
| 공개 snapshot에 Entwurf row 없음 (`generatedAt 2026-09-18T09:30:52Z`) | **있음** (`generatedAt 2026-09-20T21:30:40Z`) | `[측정 HTTPS https://herdr.dev/plugins/]` |

그리고 그 row가 **09-19 판정을 한 군데 정정한다**: `firstSeenAt`이
**2026-09-18T13:31:04.247Z** 다 — NEXT가 기록한 topic 추가(2026-09-18 22:24 KST =
13:24Z)로부터 **약 7분**. 즉 marketplace의 rescan은 지연되지 않았다. 지연된 것은
그때 읽은 **published snapshot**(추가보다 앞선 시각에 생성됨)과 그 시점의 **GitHub
search API 응답**이었다. "topic-search/index 지연이 관측되었다"는 관측 자체는 유효하되,
그것을 marketplace 등재의 지연으로 읽으면 틀린다.

카드에 실제로 실린 것: `Herdr Entwurf` 0.4.0 · `minHerdrVersion 0.9.0` ·
`platforms ["linux"]` · manifest 경로 `plugins/herdr/herdr-plugin.toml` ·
★28 fork 4. **subdir manifest가 root-only registry가 아니라는 09-19 결론도 라이브로 확인됐다.**

### B. 장르 실측 — 2089행 중 20여 개, 그런데 17개 섹션에 흩어져 있다

`[측정 python3, awesome-herdr README.md 2026-09-21 사본, 2558행]` 전체 프로젝트 행
**2089**개. 그중 cross-agent 주소/메시지 장르로 읽히는 행은 **약 20개**(키워드
`agent-to-agent|cross-agent|peer|call-sign|mailbox|letterbox|group chat|messag`).

그 20여 개가 앉은 섹션: Multi-agent fleets and supervisors(2) · Claude Code
multi-agent teams(10) · Pi supervisor workflows(5) · Subagent launchers(3) ·
Swarm(1) · REPL and code dispatchers(1) · Plugins and supporting utilities(1) ·
Persistence(1) … **17개 섹션.**

읽히는 사실: **이 목록에는 그 장르의 칸이 없다.** entwurf가 "Multi-agent fleets and
supervisors"에 앉은 것은 우리가 잘못 신청한 것이 아니라 taxonomy에 집이 없어서
가장 가까운 방에 들어간 것이다. 같은 방의 나머지 106개는 티켓 디스패처·worktree
스워머·approval 게이트이고, entwurf는 그 일을 하지 않는다. **fleet supervisor가
아니다 — 이 방에서 이웃이라고 부를 수 있는 것은 `herdr-agent-messenger` 하나뿐이다.**

### C. 이웃 넷의 배달 기제 — 다 읽었다, 그리고 다 같은 바닥으로 내려간다

`[읽음 각 리포 README/PROTOCOL, 2026-09-21]`

| 프로젝트 | 주소 | 배달 | 스스로 쓴 한계 |
|---|---|---|---|
| `aashishd/herdr-agent-messenger` | two-word call-sign | *"delivery is typed text"* — 한 줄 + Enter를 패인에 주입 | **"Lifetime = pane lifetime.** 재시작한 패인은 새 에이전트이고 새 이름을 받는다" |
| `barkerja/herdr-msg` | pane id `w4:p2` | 메시지는 디스크, *"uses herdr only as a doorbell"* | 스스로 진단: 현행 방식은 *"lossy, racy, and wiped out by pane churn or an agent restart"* |
| `dcadenas/kelpie` | pane 세션 | `<kelpie from=… re=…>` 태그로 감싼 **텍스트** | *"Herdr can deliver text to an agent"* 가 전제. alpha, herdr protocol 한 버전만 |
| `LZHcode1986/herdr-link` | live named agent | **pi native extension + MCP 툴** (`herdr_link_send/peers/start/close`) | 신원을 *"re-resolves … via Herdr"*, **same-workspace guard**. `done`은 *"not an acknowledgement, task state, or delivery receipt"* |

넷 중 셋이 결국 **패인에 글자를 넣는다.** 그것은 `entwurf/DELIVERY.md:18`이 qualifying
delivery 자격 밖으로 명시한 바로 그 항목이고, 2026-09-14에 herdr 자신의 `--skill`에서
읽은 `agent prompt`(키 주입) / `agent read`(화면 스크랩)의 직계다. 내구성을 더한
프로젝트들(`herdr-msg`, `herdr-mail`, `kelpie`)도 **저장소를 옆에 붙였을 뿐 도착면은
그대로**다. 이건 결함이 아니라 herdr가 준 것으로 지을 수 있는 최선이다.

예외는 `herdr-link` 하나다 — 공식 수신면(extension/MCP)으로 내려갔다는 점에서 구조가
entwurf와 가장 가깝다. 다른 점은 두 가지이고, 둘 다 그쪽이 스스로 적었다: **신원을
herdr에서 다시 끌어오고(workspace 밖으로 못 나간다), 영수증 층을 의도적으로 두지 않는다.**

### D. 그래서 entwurf의 자리 — 비어 있는 축은 "패인보다 오래 사는 이름"이다

herdr는 자기 문서에서 두 번 선을 그었다 `[읽음 herdr --skill 0.9.0, 2026-09-14 기록]`:
주소는 **한 서버 스코프**이고 패인이 옮겨지면 새 id, 에이전트가 끝나면 이름이 풀린다.
상태 `unknown`은 *"does not prove completion"*. 즉 **herdr는 지속하는 신원을 팔 생각이
없다** — 그것은 workbench의 일이 아니다.

`[읽음 entwurf/AGENTS.md:70]` `entwurf_resume_call {target}`은 **같은 dormant id를
다시 보이게 연다** — 턴을 돌리지 않고, 기록에서만 transcript/model/provider/cwd를 받는다.
이 장르의 어떤 이웃도 이 문장을 쓰지 못한다(위 표의 "스스로 쓴 한계" 열이 그 자리다).

그래서 herdr 쪽 좌표로 옮겨 적으면 entwurf의 역할은 **fleet supervisor도 messenger도
아니고, 이 두 줄이다**:

1. **패인보다 오래 사는 주소.** garden id는 herdr 서버·패인·프로세스 밖에서 유지되고,
   죽은 뒤에도 같은 이름으로 다시 열린다. herdr의 pane id / call-sign은 정의상 못 한다.
2. **공식 수신면으로만 배달.** 타이핑도 스크랩도 아니며, 능력을 `D0–D8`로, 실패를
   이름으로 말한다(`peer-facts-failed`, `entwurf-bin-not-executable` …). 장르의 기본값은
   그 반대다.

그리고 셋째가 관계다 — **entwurf는 herdr의 경쟁자가 아니라 herdr를 선택적으로 쓴다.**
`[읽음 entwurf/plugins/herdr/README.md]` 플러그인은 herdr에게서 **배치(placement)만**
빌리고, 조인은 `paneId` 문자열 하나의 동등비교다. 패인은 **아무것도 쓰지 않고 배달도
하지 않는다.** tmux에서도, herdr 없이도 같은 garden id가 선다. 09-14에 "양쪽이 협상 없이
같은 이음매를 팠다"고 적은 그 이음매가, 지금은 공개 marketplace에 올라간 계약이다.

### E. 우리가 만든 문서 재검토 — 세 가지가 걸린다

1. **awesome 엔트리의 마지막 문장.** 실린 문구는 *"Includes a Herdr integration for pi
   and Claude Code."* 인데, herdr 어휘에서 **integration은 herdr 자신의 것**이다
   (`herdr integration install pi`, 09-14에 7개 하네스로 측정). 플러그인이 하는 일은
   *herdr가 이미 integrate한* pi/claude를 **활성화(activate)** 하는 것이다
   (`A = E ∩ H ∩ P`, `[읽음 herdr-plugin.toml 주석]`). 읽는 herdr 사용자에게 이 두 단어는
   다른 것을 약속한다. 후속 PR 한 줄로 고칠 수 있는 크기다. **GLG 판정 사항.**
2. **카테고리.** §B대로 taxonomy에 칸이 없다. 옮길 방이 없으니 지금 자리는 최선이지만,
   상위 설명("Higher-level systems that coordinate several agents, roles, tasks, or
   repositories")은 entwurf를 orchestrator로 읽게 한다. 엔트리 본문이 그 오독을 막고
   있는지가 실질 — 현재 문구는 "address, message, and open visible siblings"로 시작하므로
   버틴다고 본다.
3. **플러그인 README는 herdr 사용자에게 *읽기 전용*으로 보인다.** "What the pane will not
   do"가 정직하게 적힌 대신, 처음 온 사람이 받는 인상은 *"상태 하나 보여주는 오버레이"*다.
   실제 능력(부름·배달·재개)은 **하네스 툴 쪽에만** 있고 herdr 면에는 없다. 이것을 넓힐지는
   **entwurf 담당자의 판단 재료이지 이 문서의 지시가 아니다** — manifest 주석이 `[[actions]]`
   부재를 이미 이유와 함께 적어두었으므로(stdout이 64KiB 로그로 감), 되묻는다면 "herdr 면에서
   garden id로 보내는 손이 필요한가"가 그 질문이다.

### 매트릭스 델타 — 이번 턴 증거만

| # | 항목 | 이전 | 지금 | 판정 |
|---|---|---|---|---|
| F1 | marketplace 등재 | 미측정(09-19 부재) | **측정됨(등재)** | `firstSeenAt 2026-09-18T13:31:04Z`, rescan 지연 아님 |
| F2 | topic search | 막힘(0건) | **측정됨(1건)** | `gh api search/repositories` |
| F3 | 장르 규모·분포 | 없던 항목 | **측정됨** | 2089행 중 ~20, 17개 섹션 |
| F4 | 이웃 배달 기제 | 없던 항목 | **읽음** | 4개 중 3개 typed text, 1개(herdr-link) 공식 수신면 |
| F5 | 지속 신원을 가진 이웃 | 없던 항목 | **측정됨(0건)** | call-sign=pane lifetime, pane id, workspace guard |
| B1/B2 | detach·재시작 실측 | 미측정 | 미측정 | 여전히 안 끊고 안 재웠다 |
| D1 | tmux를 herdr로 교체 | 안 함 | **안 함** | 유지 |

### 미해결 — 갱신

1. **엔트리 문구 `integration → activation`.** 후속 PR 여부는 GLG 판정.
2. **herdr 면의 쓰기 손.** 열지 말지는 entwurf 담당자 몫. 이 문서는 질문만 둔다.
3. `herdr-link`를 한 번 더 읽을 값어치가 있다 — 공식 수신면으로 내려간 **유일한** 이웃이고,
   pi extension + MCP 이중 어댑터 모양이 우리와 겹친다. 이번 턴은 README만 읽었고 소스는
   미측정.
4. B1/B2(detach·재시작), session-state/socket-api 본문 — 변동 없음.
5. DHH 사용 여부 — 변동 없음.

### [정정 2026-09-21 오후] F5("지속 신원을 가진 이웃 0건")는 반례가 있다

같은 날 소넷 형제 둘이 이웃 13종을 읽고 돌아왔다(A조 6종 · B조 7종, 보고
`.agent-reports/20260921-herdr-genre-{A,B}.md`, 보존본은 llmlog `20260914T161103`).

**위 F5는 틀렸다.** 아침 판정의 근거는 `kelpie` README 앞부분 35줄이었고, 같은 리포의
`SPEC.md` / `docs/herdr-outcomes.md`가 반례다 `[읽음 2026-09-21]`: `dcadenas/kelpie`는
**logical agent**(이름·히스토리·의무를 가진 영속 엔티티)와 **incarnation**(pane+terminal
바인딩 하나)을 명시적으로 분리하고 — *"A lost Herdr binding MUST NOT delete the logical agent
or its history."* — `kelpie adopt`로 같은 logical agent에 새 runtime을 재결속한다. 패인이
없는 주소축(`waiter.register`)도 있고, herdr가 보고하는 backend-native 세션 참조는 *"not
runtime identity and is not part of a binding"* 으로 우리가 `nativeSessionId`를 다루는 것과
같은 결이다.

**정확한 문장은 "유일하다"가 아니라 "무동작 복귀는 아직 우리 쪽"이다.** kelpie의 재결속은
`adopt`라는 명시적 동작을 누군가 걸어야 하고, `entwurf_resume_call`은 같은 이름을 다시 부르는
것 자체가 복귀다. §D의 두 줄 중 **첫 줄(패인보다 오래 사는 주소)은 이 좁은 형태로 수정**되고,
둘째 줄(공식 수신면으로만 배달)은 13종 실측으로 오히려 강해졌다 — herdr 배달을 아예 쓰지 않는
이웃은 `sting8k/pi-peer` 하나뿐이고, 그것은 우리 OMP 레일과 같은 `pi.sendUserMessage` /
`deliverAs:"steer"`를 쓰되 **pi 단일 하네스**다.

| # | 항목 | 아침 | 정정 |
|---|---|---|---|
| F5 | 지속 신원을 가진 이웃 | 측정됨(0건) | **측정됨(1건 — kelpie).** 차이는 신원 지속이 아니라 복귀에 동작이 필요한가 |
| F6 | herdr 배달을 안 쓰는 이웃 | 없던 항목 | **측정됨(1/13 — pi-peer, pi 전용)** |
| F7 | 스크래핑을 완료 권위로 채택한 이웃 | 없던 항목 | **측정됨(1건 — tuanhung303/herdr-swarm)** *"Spawn's verified exit is the single delivery authority."* |
| F8 | `[[build]]`+`[[panes]]` 매니페스트 이웃 | 없던 항목 | **측정됨(0건)** — 우리 0.4.0이 이 장르에서 가장 좁은 매니페스트 |
