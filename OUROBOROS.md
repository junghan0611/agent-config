# OUROBOROS — 검수 매트릭스

Ouroboros(Q00/ouroboros)를 **배포면·장기실행·검증면**으로 재는 작업면.
비교 대상은 우리 축 — **entwurf가 밑바닥**(garden-id · 배달 · visible-first)이고,
그 위에 agent-config의 기억축(andenken)과 장기실행(heartbeat · goal · decision-gate).

설치·스킬 연결은 하지 않는다. 배울 게 있으면 배운다.

> 후보지 채택이 아니다. `nixos-config`에 선언하지 않고, 우리 스킬 SSOT를
> 그쪽에 연결하지 않는다 — 주입하면 측정 대상이 사라진다. 라이브 HOME에
> `ouroboros setup`을 들이지 않는다. 그 명령은 있는 호스트에 MCP/rules/skills를
> 심고, 이 집의 그 파일들은 entwurf와 **EXISTING-WINS**로 공저한다.

GLG (2026-09-09): *"prime-agent, 옴브로스 이런 것들 다 학교 연구실 기반의
프로젝트다. 나는 그게 아니니까 일단 아무도 안 본다. 그래서 검증면에서 다른
지형을 보이는 게 목적이다."* 인기 있는 쪽이 **하네스를 건너 기억을 어떻게
가져가는지, 장기실행을 어떻게 하는지** 본다. 기능 대결이 아니다.

---

## 상태 — 2026-09-09

클론만 있다. 태그 고정 없음. PATH에 `ooo` / `ouroboros` 없음 (측정 `command -v`).

`~/repos/3rd/ouroboros` HEAD `398f588c` · `origin/main` · 메시지
`feat(telemetry): record CLI workflow outcomes` (측정 `git log -1`).
`THIRD_PARTY_PACKAGE_REPOS`에 넣지 않는다 — 넣으면 `setup`/`update`가
fast-forward해서 측정 대상이 움직인다. 헤르메스와 같은 이유. 핀은 아직 없다.

3-repo 스택은 README가 주장한다 (읽음 README.md § The Ouroboros Agent OS Stack).
이 기계에 있는 것은 core 클론 하나. `ourocode` · `ouroboros-plugins` 클론 없음
(측정 `ls ~/repos/3rd`).

---

## 보는 두 축 — 기능 목록이 아니다

entwurf는 밑바닥이라 여기서 재지 않는다. 재는 것은 그 **이외**다.

### 기억축 — 과제의 장부 vs 삶의 장부

그들의 문장 (README, 읽음): *"Separate runs, separate hosts. Different tasks
on purpose — the engine is what is shared, not the prompt."*

공유하는 엔진은 **Seed(불변 YAML) + SQLite EventStore**다.
`Seed remains the frozen source of truth` (`core/seed_contract.py:1-6`, 읽음).
EventStore는 SQLite-only (`persistence/backend_contract.py:10`, 읽음).
런타임이 Claude든 Pi든 같은 Seed를 실행하고 같은 원장에 이벤트를 남긴다.

그건 **이 과제가 무엇이었는가**의 기억이다. 힣이 언제 무엇을 말했는가의
기억이 아니다. 우리 기억축(sessions · garden · openclaw · timeline)은
사람 궤적이고, garden-id가 하네스를 건넌다. 그들은 스펙이 하네스를 건넌다.

배울 후보가 있다면 "엔진을 공유하고 프롬프트를 공유하지 않는다"는 분리이지,
Seed를 andenken 자리에 놓는 일이 아니다. 그 분리가 우리 영수증 규율과
같은 말인지는 **미측정** — 돌려 보기 전에는 같은 지형이라고 쓰지 않는다.

### 장기실행 — 세대 루프

본체는 `evolution/loop.py` 의 EvolutionaryLoop: Seed → Execute → Evaluate
다음에 Wonder → Reflect 로 수렴할 때까지 (`loop.py:1-4`, 읽음).
MCP가 소유하는 Ralph 루프가 그 위를 `evolve_step` 반복으로 돌린다
(`ralph_loop.py:1-6`, 읽음). watchdog · stagnation · rewind 가 옆에 있다.

우리 장기실행은 `/goal` 의 `agent_end` continuation 한 자리와
`/heartbeat` 의 틱이다. 시계는 존재이 아니고, 근거 없이 진행하지 않는다.
그들의 루프는 **스펙이 잠긴 뒤의 세대 반복**이다. 잠기기 전(인터뷰)과
잠긴 후(evolve)가 갈려 있다.

배울 후보: 수렴·정체·재감기를 **이벤트 원장에 남기는 것**.
배우지 않을 것: 근거 파일을 숫자 점수로 대체하는 것.

### 검증면 — 숫자 봉인 vs 출처를 열어둠

Stage 2 승인 하한은 `SEMANTIC_APPROVAL_SCORE = 0.8`
(`evaluation/models.py:37-38`, 읽음). Stage 3는 다중 모델 consensus.
통과하면 게이트가 닫힌다.

우리는 출처를 닫지 않는다 — measured / read at / inherited. 0.8은
"충분하다"를 봉인하고, 영수증은 "아직 확인할 수 있다"를 남긴다.
GLG가 보라는 다른 지형이 여기다.

### 배포면 — 어댑터가 하는 일

README는 macOS / Linux / WSL 2 원커맨드, 네이티브 Windows experimental,
런타임 Claude Code · Codex · OpenCode · Hermes · Gemini · Kiro · Copilot ·
Pi · OMP · Zcode · Goose · GJC · Antigravity · Grok 을 주장한다
(읽음 README.md, `docs/platform-support.md`). **이 기계에서 13개를
돌린 적이 없다.**

실재하는 코드: `AgentRuntime` 프로토콜 + `runtime_factory.py` +
`backends/factory_registry.py` (읽음). `setup`은 있는 호스트만 골라
그 호스트가 기대하는 모양으로 쓴다 — Codex는 rules/skills, Hermes는
skills, OpenCode는 plugin+AGENTS.md, Pi/GJC는 bridge
(README `ouroboros setup refresh` 캡션, 읽음).

관리 구간은 HTML 주석으로 upsert 해서 사용자 텍스트를 안 지운다
(`runtime_instruction_artifacts.py:31-67`, 읽음).
우리 `run.sh`의 EXISTING-WINS와 **다른 해법**이다 — 그들은 표시된
구간만 갈아끼우고, 우리는 공저 키를 안 덮는다. 둘 다 "호스트 설정을
통째로 소유하지 않으려는" 몸짓이다. 라이브에 들이면 충돌하는 이유이기도
하다.

런타임이 파라미터를 못 지키면 `param_degraded`를 한 번 알린다
(`docs/runtime-capability-matrix.md`, 읽음). 조용히 버리지 않는다.
이건 정직한 관측이고, 배울 후보다.

우리 `entwurf_fresh_call` backend는 4 (pi / claude-code / copilot / omp).
OS 면은 entwurf#78. 숫자를 따라가려 하지 않는다.

---

## 매트릭스

상태: `측정됨` / `미측정` / `막힘` / `안 함`

### A. 설치·격리

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| A1 | 클론 | 측정됨 | `~/repos/3rd/ouroboros` `398f588c` |
| A2 | PATH 바이너리 | 측정됨 | `ooo` / `ouroboros` 없음 |
| A3 | 태그 핀 | 안 함 | 헤르메스의 `HERMES_TAG`에 해당하는 값 없음. 달기 전에 고른다 |
| A4 | 라이브 `ouroboros setup` | **안 함** | 공저 설정에 MCP를 심음. 격리 HOME이 아니면 측정이 아니라 배선 충돌 |
| A5 | 격리 구동 한 판 | 미측정 | throwaway HOME 또는 전용 프로파일. Claude 작업면과 겹치지 말 것 |

### B. 기억축 (과제 장부)

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| B1 | Seed가 런타임 사이에 같은가 | 미측정 | 문서·코드는 그렇다고 함. 두 런타임에 같은 Seed를 넣고 EventStore를 대조해야 함 |
| B2 | EventStore가 사람 궤적을 담는가 | 미측정 | 가설: 담지 않는다. 과제 이벤트다. 우리 sessions/garden과 층을 갈라야 함 |
| B3 | "엔진 공유, 프롬프트 비공유"가 우리 garden-id와 같은 말인가 | 미측정 | 같아 보이면 안 쓴다. 재서 다를 때만 배운다 |

### C. 장기실행

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| C1 | EvolutionaryLoop 한 세대 | 미측정 | 격리 구동 후 |
| C2 | Ralph `evolve_step` 반복 | 미측정 | MCP 서버를 우리 라이브에 등록하지 않은 채 |
| C3 | 정체/워치독이 원장에 남는가 | 미측정 | 코드는 이벤트를 emit 함. 실측 전 |
| C4 | 우리 `/goal`·`/heartbeat`와 나란히 | 미측정 | **이 문서의 본체 중 하나.** 스펙-잠금 루프 vs 근거-먼저 틱 |

### D. 검증면

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| D1 | 0.8 봉인이 출처를 지우는가 | 미측정 | 코드 상수는 읽음. 통과 전후 원장에 인용이 남는지가 질문 |
| D2 | consensus 배심이 우리 교차검수와 같은가 | 미측정 | 그들은 점수, 우리는 다른 학교의 읽기. 층이 다를 가능성이 큼 |
| D3 | **비교 판정** | 미측정 | D1–D2를 우리 영수증 규율과 나란히. 기능 승부가 아님 |

### E. 배포 패턴 — 배울지도 모르는 것

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| E1 | 있는 호스트만 감지 | 미측정 | `install.sh`가 PATH를 본다 (읽음). 우리 `setup:links`와 같은 몸짓 |
| E2 | 호스트가 기대하는 모양으로 쓰기 | 미측정 | 캡션 수준으로 읽음. 어댑터 파일이 진짜 그렇게 쓰는지는 A5 뒤에 |
| E3 | 표시 구간 upsert | 코드만 | `runtime_instruction_artifacts.py` 읽음. EXISTING-WINS의 다른 해법 |
| E4 | `param_degraded` | 코드만 | 조용한 드롭을 관측으로 바꿈. 정직함의 후보 |
| E5 | 13 런타임을 따라가기 | **안 함** | 밑바닥은 entwurf. 숫자는 인기지 배움이 아님 |

---

## 미해결

1. **핀할 태그.** 지금 HEAD는 움직이는 `main`이다. 재려면 헤르메스처럼 고른다.
2. **격리 자리.** throwaway HOME이면 이 기기에서 재도 Claude 작업면과 안 겹친다.
3. **B3.** 엔진 공유가 garden-id와 같은 말인지. 같다고 쓰는 순간 이 문서는 필요 없다.
4. 어느 기기에서 재는가. 지금은 thinkpad 문서만.

## 명령

아직 없다. `run.sh setup:ouroboros`를 만들지 않았다.
만들 때는 헤르메스처럼 **명시 호출 · setup_all 밖 · 태그 고정 · 라이브 setup 금지**.

```bash
# 읽기만
git -C ~/repos/3rd/ouroboros log -1 --oneline
# 구동은 격리 HOME이 선 다음. 그 전엔 이 칸이 비어 있는 게 맞다.
```
