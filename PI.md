# PI — 검수 매트릭스

pi 1.0(coding agent)과 **pi-durable**(`@earendil-works/pi-durable`, 같은 날 실험 패키지로 출하)을
**오래 사는 실무자의 바닥**으로 재는 작업면. 비교 대상은 우리 밑바닥 **entwurf** — garden-id ·
배달 · 살아 있음 — 이고, entwurf를 순위에 올리지 않는다. 기능 대결이 아니다.

설치·스킬 연결은 하지 않는다. 라이브 HOME에 `pi install` / `npm install`을 들이지 않고, 우리
`skills/`를 그쪽에 심링크하지 않는다. 읽기는 `/tmp/pi-v1` worktree(`v1.0.0` 태그)에서만 했다.

> pi는 이 집의 하네스 그 자체다(AGENTS.md § 담당자의 자리). 그래서 이 문서의 대상은 「다른 하네스」가
> 아니라 **우리가 서 있는 바닥의 다음 판**이다. 다른 대문자 문서와 다르게 읽어라 — 채택 여부가 아니라
> 「같은 바닥이 어디로 자라는가, 그 자람이 우리 확장·기억축·시민 주소의 어디에 닿는가」를 본다.

계기 `[inherited — entwurf 코디네이터 메시지, 2026-10-02 10:15 KST]` GLG가 entwurf 레인에서:
*"pi-durable 이슈는 리서치 껀이야. 그쪽으로 전달해. … acp까지 커버하는 기본기에 집중한 릴리즈가
0.30.0이고 고도화는 agent-config 리서치 결과랑 합쳐서 내가 방향을 더 잡아볼게"*.
`[inherited — 이 레인 코디네이터 브리프]` GLG: *"pi-durable 주제는 autopilot·decision-gate와 다 연결될
것 같다"*. 둘 다 이 자리에서 GLG에게 직접 들은 말이 아니다.

---

## 상태 — 2026-10-02

관측 자리: oracle, Claude Opus 5.5 (claudecode), garden `20261002T102226-3f654d`.

| 사실 | 값 | 증거 |
|---|---|---|
| live pi | **0.99.2** | `[측정 pi --version]` |
| npm 최신 | `@earendil-works/pi-durable` 1.0.0 (latest, 수정 2026-10-01T19:11Z) · `@earendil-works/pi-coding-agent` 1.0.0 | `[측정 pnpm view]` |
| 소스 핀 | 태그 `v1.0.0` = `a13d35a7` (2026-10-01 20:52 +0200), `/tmp/pi-v1` worktree, 원 클론은 `v0.99.1`에 그대로 | `[측정 git]` |
| durable 나이 | `v1.0.0`에서 닿는 가장 이른 커밋 **2026-09-18**. `v0.99.1..v1.0.0` 88커밋 중 31커밋이 durable | `[측정 git log]` |
| durable 크기 | 153파일. `src` 17,662줄(그중 `src/testing` 제외 **15,483**, `src/storage` 2,926) · `test` 27,709줄 · `docs/spec.md` 4,601줄 | `[측정 wc]` — 발표의 「테스트 빼고 약 15,000줄, 저장소만 3,000줄」과 맞는다 |
| 테스트 배치 | `test/*.test.ts` **42개** · `it(`/`test(` 호출 약 696 · `test/examples/*.ts` **32개** · vitest 4.1.11 | `[측정 ls/grep]` |
| spec 이름 | `docs/spec.md` 제목은 **"Pico5 specification"**, 스스로 *"normative"* | `[읽음 spec.md:1-3]` |
| coding agent 의존 | `pi-coding-agent` 1.0.0 `dependencies`에 pi-durable **없음** | `[측정 package.json]` |
| 그러나 트리 안에는 있다 | `packages/coding-agent/src/experimental/durable/` — durable 위의 작은 coding agent. build `exclude`·npm `files`에서 **빠져 있다** | `[읽음 tsconfig.build.json:19, package.json files]` |
| coding agent 세션 형식 | `CURRENT_SESSION_VERSION = 3` — 0.99.1과 같다 | `[측정 git show 두 태그]` |
| coding agent 압축 설정 | `CompactionSettings` = `enabled`/`reserveTokens`/`keepRecentTokens`/`modelOverrides` 그대로. `backgroundTokens`는 coding-agent `src`에 **0건** | `[측정 git grep v1.0.0]` |
| 이 HOME의 durable 흔적 | `~/.pi/agent/experimental` **없음** | `[측정 ls]` |
| durable 테스트 실행 | **안 돌렸다** | 모노레포 `npm ci`가 `/tmp`에 필요. 싸지 않아 미측정으로 둔다 |

한 줄 주장 (발표, 외부): *"It does not replace the Pi coding agent. It is a framework for building any
agentic application, coding agents included."* 그리고 *"Lessons we learn building agentic applications
on Pi Durable will flow back into Pi the coding agent as they prove themselves valuable."*
`[외부 earendil.com/posts/pi-durable, 2026-10-01]`. pi 1.0 발표는 durable을 *"a new experimental
package"*로 부르고, 1.0에 넣은 것은 Codemode·가상 모델·지연 도구 로딩·캐시 워밍·대화 중 system
메시지·풀스크린 TUI다 `[외부 earendil.com/posts/pi-1-0]`. README 첫 줄: *"**Experimental.** The API
changes without notice between releases."* `[읽음 durable/README.md:3]`.

---

## 무엇인가 — 우리 어휘로 옮긴 다섯 줄

전부 `[읽음 durable/README.md, docs/spec.md @ v1.0.0]`. 돌려서 확인한 것은 하나도 없다.

1. **한 storage = 한 Session = 한 프로세스.** *"One process owns a storage at a time; there is no
   cross-process locking."* (README:527). 그 안에 conversation이 여럿 산다. 주소는 `ConversationId`이고
   **그 storage 밖으로 나가지 않는다.**
2. **모든 것이 commit이다.** entry(불변 transcript 기록)·document(타입 있는 JSON 상태)·task(체크포인트
   상태기계)가 한 원자 commit으로 쓰이고, *"Only committed state is observable."* (spec.md:43-44).
3. **복구는 task 체크포인트에서.** 모델 요청은 다시 보내고, 도구는 `replay: "safe"`일 때만 다시 돌리며
   아니면 모델에게 `interrupted`를 준다 (README:166). 같은 `requestId` 제출은 같은 submission을 돌려준다
   (README:113) — 단 **범위는 한 conversation 안**이다 (spec.md:2175).
4. **steer/follow-up 대기열이 영속이다.** inbox가 `pi.inbox` 문서라 commit된다 (README:289-306).
5. **압축은 task 하나.** 배경 압축은 대화를 막지 않고 다음 턴 경계에 요약을 놓는다 (README:332, 342).
   요약 모델은 **대화의 agent 모델·thinking 그대로**다 (spec.md:3670). `beforeCompact` 훅이 거절하거나
   요약을 직접 줄 수 있다 (README:347).

---

## 매트릭스

상태: `측정됨` / `읽음` / `미측정` / `막힘` / `안 함`. `읽음`은 소스·문서를 직접 읽었으나 돌리지 않은 칸이다.

### A. 설치·격리

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| A1 | npm 메타 | 측정됨 | durable 1.0.0 latest, coding-agent 1.0.0 |
| A2 | 소스 핀 | 측정됨 | `v1.0.0` `a13d35a7`, `/tmp/pi-v1` worktree (원 클론 HEAD 불변) |
| A3 | live pi 버전 | 측정됨 | 0.99.2. 1.0 수용은 entwurf 0.30.0 레인의 몫이다 |
| A4 | 라이브 설치 | **안 함** | 브리프 경계 |
| A5 | `/tmp` 격리 구동 한 판 | 미측정 | 필요한 핀: `/tmp/pi-v1`에서 `npm ci` + faux provider 예제. API 비용 0이지만 설치가 무겁다 |

### B. 렌즈 1 — RLM / 오래 사는 기억

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| B1 | 원본 보존 | 읽음 | 압축·reset 뒤에도 옛 entry는 storage에 남는다 (README:310, 321) |
| B2 | 배경 압축 | 읽음 | 문턱 `contextWindow − reserveTokens − backgroundTokens`에서 배경 시작, 막는 것은 다음 요청이 안 들어갈 때만 (README:340-342) |
| B3 | 압축 모델 지정 | 읽음 | **없다.** agent 모델·thinking을 고정해 쓴다 (spec.md:3670). coding agent 1.0도 같다(상태 표) |
| B4 | 요약의 요약 | 읽음 | *"an earlier summary is summarized again together with the history after it"* (spec.md:3650) — 드리프트 구조가 coding agent와 같다 |
| B5 | reset + handoff 노트 | 읽음 | `reset(note)`, 도구가 `control: { handoff }`로 요청 (README:308-317). 발표 예제는 handoff 뒤에도 `search_history` 도구로 옛 entry를 찾는다 `[외부]` |
| B6 | 작업집합만 메모리에 | 외부 | SQLite에서 *"only keeps the working set in memory"* — 소스로 확인 안 함 |
| B7 | 실제 장기 대화 한 판 | 미측정 | A5가 선 뒤 |

### C. 렌즈 2 — 배달과 대칭 UX

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| C1 | 다중 클라이언트 관찰 | 읽음 | `viewState()`/`watch()`/`watchEvents()` — commit에서 파생, 늦게 붙으면 현재 view부터, *"nothing is replayed"* (README:285) |
| C2 | 어느 클라이언트든 steer | 읽음 | `submit({ whenBusy: "steer" })` (README:295, 300) |
| C3 | 프로세스 밖 전송 | 읽음 | `watch()`는 op를 넘길 뿐, 소켓은 앱의 몫 (README:277-282). *"other clients attach to that process"* `[외부]` |
| C4 | 이미 태어난 native 형제를 주소로 부르기 | 읽음 — **해당 축 없음** | 주소는 storage 안의 `ConversationId`. 프로세스·하네스를 건너는 이름은 없다. entwurf garden-id와 **다른 층** |
| C5 | `pi-server`/`pi-client`/`pi-protocol` 패키지 | 미측정 | `packages/`에 있다(측정 ls). coding agent `src/experimental/services`도 durable을 import한다(측정 grep). 본문 미읽음 |

### D. 렌즈 3 — peer 부르기

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| D1 | 내장 subagent | 읽음 | *"Pi Durable has no built-in subagents"* `[외부]`. 도구가 task 소유 conversation을 만드는 패턴만 준다 (README:401-430) |
| D2 | 다른 모델 = 다른 학교 | 읽음 | conversation마다 모델·도구·cwd를 따로 저장 (README:188-206). 다만 예시 어휘는 *"a cheaper model"*·`haiku` — **비용 축으로 부른다**, 학교 축이 아니다 |
| D3 | 역할명 환원 | 읽음 | 예제 `28-reviewer` (README:579). herdr `agent start reviewer`와 같은 결(HERDR.md 09-14 §D). 채택 판정 아님, 기록만 |
| D4 | 형제가 부른 쪽에 돌려주기 | 읽음 | `23-subagent-background`: 배경 reporter task가 답을 부모에 follow-up input으로 올리고 request ID로 재시작 중복을 막는다 (README:442) |

### E. 렌즈 4 — 스펙 전 탐색 대화

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| E1 | 대화 형태를 규정하는가 | **안 함** | 프레임워크라 GLG와의 대화 모양을 정하지 않는다. 잴 칸이 없다 |

### F. 렌즈 5 — 검증면

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| F1 | (a) 테스트가 행동 옆에 있는가 | 측정됨 | `packages/durable/test/` 42 `*.test.ts`, 이름이 모듈과 짝(`harness-compaction`, `jsonl-storage`, `session-forks` …) |
| F2 | 예제가 게이트인가 | 측정됨 — **아니다** | `test/examples/` 32개는 vitest 기본 include에 안 걸리고, 어떤 `*.test.ts`·`scripts`·`.github`도 import하지 않는다 (grep) |
| F3 | (b) 게이트 코드 자신의 검증 — 저장소 | 측정됨 | `src/testing/storage-conformance.ts`(1,583줄)를 Memory·JSONL·JSONL reopen·SQLite·SQLite reopen 다섯 번 건다. **일부러 깨진 백엔드로 이 suite가 빨개지는지 보는 테스트는 찾지 못했다** (grep) |
| F4 | (b) 게이트 코드 자신의 검증 — 모노레포 | 측정됨 | `check:*` 스크립트 7개 중 테스트가 있는 것은 `check-runtime-deps` 하나. durable을 직접 재는 `check-entry-graphs`(`maxFiles: 60`, forbid 목록)는 테스트 없음 |
| F5 | 구조 게이트 | 측정됨 | `storage-runtime-boundary.test.ts` — 이식 코어가 `node:` 내장을 import하면 빨개진다. 패키지 안에서 자기를 잰다 |
| F6 | (c) 문서↔코드 계약 | 측정됨 — **복사 규약** | `spec-usage.test.ts`가 spec 예제를 컴파일 검사하고 `chord-guide.test.ts`가 가이드 코드를 실제로 돌린다. 둘 다 블록을 **손으로 복사**하고 *"Keep the two in sync"*라 적는다. 문서를 읽어 대조하는 기계 게이트는 없다(`readFile` 0건). README의 typescript 블록 27개에는 대응 테스트가 없다 |
| F7 | 테스트 실제 green | 미측정 | A5와 같은 핀 |

### G. 코디네이터 질문 넷

브리프의 원 질문은 entwurf 코디네이터 메시지(위 계기)에 있다. 판정이 아니라 **경계가 어디서 갈리는가**를 적는다.

| # | 질문 | 상태 | 지금 말할 수 있는 것 |
|---|---|---|---|
| G1 | durable이 가질 대화·실행 복구 vs entwurf가 가질 독립 시민 주소·전달 | 읽음 | durable의 주소·복구는 **한 storage 안**에서 끝난다 (README:527, spec.md:2175). 프로세스·하네스·기계를 건너는 이름은 durable에 없다. 경계 후보: **storage 안 = durable, storage 사이 = entwurf.** 제안이다 |
| G2 | 내부 conversation/subagent ≠ 자동 garden citizen | 읽음 | subagent는 task 소유 conversation이고 주인이 abort되면 같이 죽는다(배경 task가 아닐 때, README:437). entwurf에는 이미 선례가 있다 — omp 시민은 *"birth mints the `mode === "tui"` host (subagents mint nothing)"* (`entwurf/DELIVERY.md:118`). 같은 선을 durable에 그으면 **storage를 연 프로세스 하나만 시민 후보**다. 제안이다 |
| G3 | 끊긴 배달의 replay/idempotency 경계 | 읽음 | 아래 「이 집과의 접점」 (d) 표. 요점: durable의 exactly-once는 **수신 conversation 입장(admission)**이고 범위가 한 conversation이다. 송신 쪽 영수증·재시도는 여전히 entwurf 몫이다 |
| G4 | 기억축/봇/접속면에 유효한 작은 실험 | 미측정 | 후보만 「미해결」에 둔다. 전부 `/tmp`·faux provider·API 0으로 설계 가능하나 A5 설치가 먼저다 |

---

## 이 집과의 접점

각 줄은 **측정/읽음**인지 **단서(lead)**인지 붙어 있다. 단서는 사실이 아니라 다음 측정의 자리다.

### (a) 좌표 18 — codex native → 빌트인 압축 전환

| 무엇 | 증거 | 성격 |
|---|---|---|
| coding agent 1.0의 빌트인 압축은 여전히 **막는다**. `backgroundTokens`는 durable에만 있다 | `[측정 git grep v1.0.0 coding-agent/src]` 0건 · `[읽음 durable/README.md:342]` | 측정 |
| 그러니 llmlog `20261001T075945` §2의 「5분 멈춤」은 **pi 1.0 빌트인으로 가도 구조상 남는다**. 1.0으로 올리는 것이 이 문제의 답이 아니다 | 위 줄 + llmlog §3 기대치 | 측정에서 끌어낸 추론 |
| 압축 전용 모델 설정은 durable에도 없다 — agent 모델·thinking 고정 | `[읽음 spec.md:3670]` | 읽음 |
| llmlog §6(d)의 「빠른 모델로 요약하는 작은 확장」은 durable에서 `beforeCompact { summary }` 훅과 같은 자리다. coding agent 쪽은 `session_before_compact` | `[읽음 README:347]` · llmlog §6(d) | 단서 — 두 API는 다른 것이다 |
| §6(b) 「압축의 압축」 드리프트는 durable도 같은 구조 | `[읽음 spec.md:3650, 3697]` | 읽음 |
| §6(f) `/new`+`/recall`과 긴 실무자의 경계는 durable에서 `reset(handoff 노트)`와 같은 자리다. 차이는 **reset 뒤 옛 entry가 같은 storage에 남아 도구로 검색된다**는 것 | `[읽음 README:308-317]` · `[외부 search_history 예제]` | 단서 |

### (b) autopilot / decision-gate / goal 확장

**durable 확장은 coding agent 확장이 아니다.** `defineExtension`/`hook(GenerationTask, …)`은 durable
API이고, 우리 확장은 `pi.on(…)` coding-agent API다. 그리고 coding agent 1.0에서 확장 타입 diff는
도구 그룹 `instructions` 한 필드뿐이다 `[측정 git diff v0.99.1 v1.0.0 extensions/types.ts]` —
**우리 확장이 1.0에서 깨질 이유는 소스상 보이지 않는다(실행은 미측정).** 아래 대응은 「같은 문제를
durable은 어느 층에서 푸는가」이지 포팅 계획이 아니다.

| 우리 쪽 (읽음) | durable 쪽 (읽음) | 성격 |
|---|---|---|
| goal 이어가기 = `agent_end`에서 `pi.sendMessage(…, { triggerTurn: true })` (`goal.ts:577-586`) | `hook(GenerationTask, { onYield → { continue } })` — 같은 run을 이어간다 (README:378, 383) | 단서: 같은 모양, durable은 run 안에서 |
| goal 상태 = custom entry를 `session_start`/`session_tree`에서 다시 셈 (`goal.ts:605-616`). 트리 이동 수선이 2026-09-29에 필요했다(NEXT) | `defineDoc({ fork: "initial" \| "current" \| "asOf" })` — fork가 무엇을 물려받는지 문서 정의에 적는다 (README:499) | 단서: 우리가 손으로 맞춘 자리를 durable은 선언으로 둔다 |
| autopilot 질문 시계 = `setTimeout` (`autopilot.ts:382, 471`). *"reload 시 시계가 죽는다"*(NEXT) | task `sleep(until)` — `until`이 체크포인트에 있고 재개 시 다시 잰다 (`src/types.ts:228-229`, `scheduler.ts:1215`). 발표: *"timers that survive restarts"* `[외부]` | 단서: 우리 공백이 정확히 durable이 판 자리다 |
| decision-gate consult = in-memory, 사이드 entry만 남김 (`decision-gate.ts:31, 1043`) | 훅 결정은 task **memo**에 — *"first write wins"*, 재시작 뒤 다시 묻지 않는다 (`src/harness/types.ts:582-587`, 발표) | 단서 |
| autopilot·goal의 도구 숨김 = `setActiveTools` 전역 교체 (`autopilot.ts:534`, `goal.ts:437`). NEXT: *"숨김은 UX이지 권한 경계가 아니다"* | 도구 집합이 conversation `pi.agent` 문서에 저장되고 `beforeTool { block }`이 막는다 (README:188-206, 135) | 단서 |
| autopilot `triggerTurn:false` — 판정은 패널만, 실행 0 (`autopilot.ts:28`) | `submit({ type: "write" })` — 모델에게 묻지 않고 entry만 남긴다 (README:297) | 단서: 같은 「쓰되 깨우지 않는다」 |

**GLG의 직관(inherited)을 이 표로 다시 읽으면:** 세 확장이 각각 손으로 지어 온 것 — 이어가기,
fork를 건너는 상태, 재시작을 건너는 시계, 한 번 내린 결정 — 이 durable에서는 커널 원시(primitive)다.
연결된다는 말은 맞아 보인다. **다만 그것은 「durable 위로 옮기자」가 아니라 「우리가 그 네 가지를 지금
coding agent 위에서 어디까지 지고 있는가」를 재는 거울**이다. 판정은 GLG 몫.

### (c) andenken 세션축 + session-recap

| 무엇 | 증거 | 성격 |
|---|---|---|
| andenken은 `~/.pi/agent/sessions/--project--/*_<UUIDv7>.jsonl`만 들이고, 200KB 이하는 뺀다 | `[읽음 andenken/session-indexer.ts:7, 19, 286]` | 읽음 |
| session-recap도 알려진 루트 아래 `.jsonl`만 연다 | `[읽음 session-recap.py:339-345, 361]` | 읽음 |
| durable 실험 coding agent의 세션은 `~/.pi/agent/experimental/durable-sessions/<cwd-hash>/<session>/session.sqlite` | `[읽음 coding-agent/src/experimental/durable/README.md:13-15]` | 읽음 |
| durable JSONL 백엔드는 **storage 디렉터리 하나에 `main.jsonl` 하나**(모든 conversation의 commit marker) + `doc-<id>.jsonl`/`task-<id>.jsonl` sidecar | `[읽음 spec.md:4398-4412, jsonl/storage.ts:29, 42-47]` | 읽음 |
| sidecar는 **append-only가 아니다** — reclamation이 임시 파일로 바꿔 쓰고 rename하거나 지운다. `main.jsonl`만 compact되지 않는다 | `[읽음 spec.md:4443-4449]` | 읽음 |
| 따라서 durable 세션은 지금 기억축에 **깨지는 게 아니라 안 보인다.** 파일명 규칙(UUIDv7 접미사)과 루트 둘 다에서 걸러진다 | 위 줄들 | 추론 |
| 오늘 잃는 것은 0이다 | `[측정 ls ~/.pi/agent/experimental]` 없음 | 측정 |
| 「크면 이긴다」 basename 접기(`session-indexer.ts:230-241`)는 append-only 성장을 전제한다. durable `main.jsonl`은 이름이 **모든 storage에서 같다** — 언젠가 들이면 접기 키부터 다시 정해야 한다 | `[읽음]` | 단서 |
| llmlog §6(e) 「압축 요약이 좋은 청크가 될 수 있다」 — durable `pi.compaction` entry도 평문 요약을 든다 | `[읽음 spec.md §8.7 Placement]` | 단서 |

### (d) entwurf garden-id / mailbox / delivery

| 축 | entwurf (읽음) | durable (읽음) |
|---|---|---|
| 주소 | garden-id — 프로세스·하네스·기계 밖에서 유지, dormant도 같은 이름 | `ConversationId` — 한 storage 안 |
| 대기열 내구성 | control-socket `queued-steer`/`queued-follow-up`은 **휘발성 프로세스 메모리, abort하면 사라진다**; mailbox는 파일 영수증 (`entwurf/DELIVERY.md:39-59`) | inbox가 commit된 문서 — 크래시를 건넌다 (README:289-306) |
| 중복 제거 | DELIVERY D8 「Dedupe, ordering, stale handling … tested」가 레일마다 부분 (`DELIVERY.md:77, 118`); Codex native-push는 **재시도 0** (`DELIVERY.md:271`) | `requestId` — **한 conversation 안**, 어떤 쓰기보다 먼저 (spec.md:2175) |
| stale | 레일별 stale 처리 | head write(reset·압축 요약)가 활성 범위 앞을 가리키면 `stale`로 정리 (spec.md §6) |

- **측정:** pi coding agent 1.0의 대기열은 여전히 `pi-agent-core`의 메모리 대기열이다 —
  `PendingMessageQueue`, `steeringQueue`/`followUpQueue` (`packages/agent/src/agent.ts:143, 191-192,
  299-304` @ v1.0.0, 패키지 1.0.0). **durable의 영속 inbox는 entwurf가 오늘 부르는 pi 시민에게 닿지
  않는다.** `DELIVERY.md`의 「queued는 휘발성」 서술은 pi 1.0에서도 그대로 유효하다(소스상; 실행 미측정).
- **단서:** 수신자가 durable 앱이라면, entwurf 메시지의 안정 id(예: mailbox 파일명)를 `requestId`로
  넣는 것만으로 **수신 쪽 exactly-once 입장**이 생긴다. 송신 영수증·재시도 정책은 여전히 entwurf의 것.
  이 경계가 G3의 답 후보다. 설계는 entwurf 담당자의 판단 재료이지 이 문서의 지시가 아니다.
- **단서:** durable 앱 하나를 시민 하나로 세우는 모양이 자연스럽다(G2). 그 앱 안의 conversation들은
  시민이 아니라 그 시민의 **내부**다 — herdr에서 「pane ↔ nativeSessionId ↔ gardenId」 조인을 판 것처럼
  (HERDR.md 09-14 §E), 여기서는 「storage ↔ gardenId」가 조인 후보다. 미측정.

---

## 오독 — 이렇게 읽지 말 것

1. **「pi 1.0 = durable」.** 아니다. coding agent 1.0은 durable에 의존하지 않고(측정), durable coding
   agent는 build·npm에서 빠진 실험 트리다(읽음). 1.0 수용과 durable 연구는 다른 레인이다.
2. **「1.0으로 올리면 배경 압축이 생긴다」.** coding agent에는 없다(측정). 좌표 18의 기대치는 llmlog §3
   그대로다.
3. **「durable이 exactly-once 배달을 준다」.** 주는 것은 한 conversation 안의 제출 중복 제거다
   (spec.md:2175). 하네스 사이 배달이 아니다.
4. **「durable subagent = 형제」.** task가 소유한 내부 conversation이다. 형제(garden citizen)로 세우는
   것은 별도 결정이고, entwurf 선례는 「subagents mint nothing」이다.
5. **「발표의 문장 = 측정된 사실」.** B6·C3 일부·D1은 발표에서 왔다. 이 판에서 돌린 것은 없다.

## 미해결

1. **A5 격리 한 판.** `/tmp/pi-v1`에서 `npm ci` 후 faux provider 예제 셋 — `25-compaction`(배경 압축·stale),
   `13-recovery`/`31-reload-and-restart`(크래시·재설치), `23-subagent-background`(reporter의 requestId).
   API 0, 설치만 무겁다. 이것이 F7·B7과 G4의 첫 칸이다.
2. **JSONL storage 실물.** A5에서 생긴 `main.jsonl`을 열어 andenken이 들인다면 무엇을 청크로 볼지 (c)의
   단서를 측정으로 바꾼다.
3. **`pi-server`/`pi-client`/`pi-protocol`, coding agent `src/experimental/services`.** durable을 import하는
   다중 접속면 후보. 렌즈 2의 본체가 거기 있을 수 있다. 미읽음.
4. **`protocol.md` 행.** 이 대상의 「장점 하나」는 아직 고르지 않았다. 후보: *영속 inbox + 체크포인트 복구*.
   표에 올릴지는 코디네이터/GLG 몫이라 손대지 않았다.
5. **live 0.99.2 → 1.0 확장 호환.** 소스 diff로는 깨질 곳이 안 보인다(측정). 실제 로드는 entwurf 0.30.0
   Pi1.0 수용 레인에서 잴 일이다.

## 명령

없다. `run.sh setup:pi-durable`을 만들지 않는다. 읽기 핀은 `git -C ~/repos/3rd/pi/pi-mono worktree add
--detach /tmp/pi-v1 v1.0.0` (이 판에서 만들었다; 지우려면 `git -C ~/repos/3rd/pi/pi-mono worktree remove
/tmp/pi-v1`).

---

## [2026-10-02] 한 통 — #88 방향타 form · prime-agent · durable이 같은 지도의 어디인가

GLG (2026-10-02, 이 레인 코디네이터 세션): *"entwurf#88 이슈도 봐봐. prime-agent에서 끄적이던 것과
관련해서 lisp 연결하는 것 목표에 대해서, 그게 한 통으로 정리돼야 해."* 그래서 이 절은 durable을 따로
재는 것이 아니라, **이미 열려 있는 세 줄기를 한 지도에 올린다.** 결정이 아니다. 지도다.

세 줄기 (전부 읽음):
- **entwurf#88** (2026-08-27~, `state:parked`, `ball:glg`) — 형제 사이에 자연어만 오가며 희석된다. 그 아래
  사람이 읽고 고칠 수 있는 **방향타 form** `(:goal :assumptions :questions :hypotheses :evidence :next)`을
  둘 수 있는가. 세 축이 섞이지 않는다: ① REPL 언어(Python→Lisp 번역) ② coordination 표현(eval 없는
  form) ③ 공유 작업대(Emacs `agent-server.el`). Phase A 번역 → B 작업대 동화 → C 연합 steering form.
  `Entwurf = 누구에게 어떻게 / Lisp = 무엇을 어떤 구조로 / REPL = 그 구조를 어떻게 살아 있게`.
- **prime-agent** (`PRIME.md` 09-09, agent-config#20) — 축 ①의 실험장. SCI(Clojure) 프로세스 수명 이미지,
  재시작에 죽는다 [읽음 llmlog `20261001T070752` §3]. 09-15 upstream 동기화 대기로 정지. B1 「form이
  행동의 장부인가」 미측정.
- **llmlog `20261001T070752`** (10-01 Opus, #88 댓글 `5920592842`) — 층 R0–R4 제안. 가로지르는 발견:
  **이미 구조로 있던 것이 경계에서 텍스트로 눌린다**(decision-gate dig, entwurf 조회 verb, 정정이 산문으로).
  실험 하나: 비-eval form 한 장 왕복, 측정 단위는 **GLG의 개입 홉**. 그 노트의 미측정 6번이 바로 durable이었다
  — *"typed JSON Document + 원자 커밋 + hook — steering state 기질과 닮았으나 관련성은 추측."*

### 한 지도 — 다섯 자리, 각각 누가 채우나

| 자리 | 질문 | 오늘 채우는 것 | durable이 닿는가 |
|---|---|---|---|
| **표현** | 방향타를 무엇으로 적는가 | #88: Lisp/EDN form. R0: 산문 속 증거 태그(이미 있음) | **안 닿는다.** durable document는 JSON이고 form의 모양을 정하지 않는다. 문자열 S-exp를 담을 수는 있다 |
| **거처** | 한 시민 안에서 그 상태가 어디 사는가 | goal: custom entry를 트리 이동마다 다시 셈(`goal.ts:605-616`) · codemode: transcript의 `codemode-store` JSON 값 · prime: SCI ctx(재시작에 죽음) | **여기가 durable의 자리다.** `defineDoc({ fork })` 타입 문서, 원자 commit, task memo, 체크포인트 `sleep(until)` — 재시작·fork를 건너는 steering state의 기질 [읽음 README:499, spec.md:43-44; §(b) 표]. **2차 [측정, 모델 0]:** S-exp 문자열이 `fork` 세 종류(`initial`=문서 없음 · `current`=부모 현재값 · `asOf`=fork 시점값) 그대로 JSONL·SQLite close/reopen을 건넜고 사람이 읽힌다. 그리고 **pi 1.0 codemode store도 같은 결의 거처를 이미 준다** — 재개 생존·가지 범위 (아래 2차 절 H·J) |
| **계산** | 그 구조를 누가 살아 있게 고치는가 | prime SCI REPL(축 ①, R2) · Pi codemode(호출마다 새 VM) | 부분. durable은 task/hook으로 계산을 **돌리지만** 사람이 들어가는 REPL이 아니다. R2(prime)와 독립 |
| **전달** | 시민 사이에 무엇이 건너는가 | entwurf `entwurf_v2` 문자열 ≤16000, mailbox 파일 영수증 | **안 닿는다.** durable 주소는 storage 안 `ConversationId`(§G1). 수신 측 `requestId` admission만 접점(§(d)) |
| **사람 admission** | GLG가 판정을 값으로 되돌리는 칸 | 없다 — R3가 비어 있다 [읽음 llmlog §3 「사람 admission 칸 없음」]. 후보는 Emacs | 간접. 거처가 commit·fork-aware라면 GLG가 고친 form이 **다음 판단에 먹히는 자리**가 생긴다. 미측정 |

읽기 [제안]:
1. **durable은 R3(사람 admission)의 기질 후보이지 #88의 답이 아니다.** #88이 묻는 것은 표현과 사람 쪽
   비용(개입 홉)이고, durable은 거처만 준다. 10-01 노트의 「관련성은 추측」은 이제 **「거처 층에서 읽음, 표현·
   전달 층에서는 무관」**으로 좁혀진다.
2. **세 줄기가 섞이지 않는 이유가 지도에서 보인다.** prime = 계산(REPL 언어), #88 = 표현+전달, durable = 거처.
   09-30 「entwurf 뺄셈」·R 층 「합치지 않는다」와 같은 선. 한 통이란 하나로 합친다는 뜻이 아니라 **한 장에서
   자리가 보인다**는 뜻이다.
3. **순서는 바뀌지 않는다.** 10-01 §8 실험(비-eval form 한 장 왕복)은 durable 없이 지금 가능하고, 가장 싸다.
   durable은 그 실험이 「form이 개입 홉을 줄인다」로 나온 **뒤에** 거처로 재는 것이 맞다 — A5 격리 한 판
   (`25-compaction`·`13-recovery`)에 **`defineDoc fork` 문서에 S-exp 문자열 하나를 넣고 fork·재시작 뒤 살아
   있는지** 한 줄을 더하면 R3 기질 측정이 된다. 미측정.
4. **autopilot·decision-gate·goal은 세 줄기 모두의 표본이다.** `waiting_for`는 가장 작은 steering 선언(#88 §10의
   한 슬롯), 그 상태의 거처는 손으로 다시 세는 custom entry(§(b)), 그 판정은 산문으로 빠진다(R3 공백).
   GLG의 「다 연결된다」는 이 표본이 지도의 세 자리에 동시에 서 있기 때문이다.

틀릴 수 있는 곳: R0 실험에서 산문 태그로 충분하면 표현 층은 Org 관례로 좁아지고, 거처 층도 지금의
custom entry로 충분할 수 있다. 그때 durable은 이 집에서 압축(§(a))과 재시작 시계(§(b)) 둘만 남는다.

판정 보류 (GLG): #88 Phase 순서 유지 여부 · prime upstream 동기화 착수 · R3를 Emacs에서 열지 · 이 지도를
#88 본문에 올릴지(올린다면 entwurf 0.30.0 뒤).

---

## [2026-10-02] 2차 — 자동화 검수

관측 자리: oracle, Claude Opus 5.5 (claudecode), garden `20261002T102226-3f654d`. 코디네이터
`20261002T101136-7a9b03`의 2차 과제(A–E)를 받았다. GLG 방향 `[inherited — 코디네이터 전달]`: *"prime agent
보다 pi 버전업과 durable, codemode 등을 따라가야 하는 게 더 급해졌어."* 이 절은 **측정까지**만 한다.

### 격리 — `/tmp`가 아니라 `/dev/shm`에서 돌았다

`[측정 df]` `/tmp`는 루트 디스크(98%, 여유 2.7G)에 있다. 모노레포 설치가 그 디스크를 채우면 기기 전체가
멈출 수 있어서, **설치가 무거운 것은 전부 RAM tmpfs `/dev/shm`**(12G)으로 옮겼다. `/tmp/pi-v1`은 읽기 핀으로
그대로 두고 그 사본을 `/dev/shm/pi-v1`에 만들었다. 격리 원칙은 같다:

- 모든 실행은 `env -i` + `HOME=/dev/shm/iso-home` + npm/pnpm 캐시·store를 `/dev/shm`에 두었다. pi는
  `PI_CODING_AGENT_DIR=<tmpfs>`, `PI_OFFLINE=1`, `PI_SKIP_VERSION_CHECK=1`, `PI_TELEMETRY=0`로 띄웠다.
- `npm ci --ignore-scripts` — 모노레포 루트 `prepare`가 `husky`라서, 그대로 두면 worktree가 공유하는 원 클론
  `.git/config`에 **로컬 `core.hooksPath`를 써서 우리 전역 안전벽을 그 클론에서 끈다.** 실행 뒤
  `git config --local --get core.hooksPath` → unset `[측정]`.
- pi-ai 모델 카탈로그 hydrate는 공개 카탈로그 GET뿐이라 인증 헤더가 없고(`generate-models.ts:1280-2677`
  `fetch` 5곳 `[읽음]`), 그래도 키가 새지 않게 `env -i`로 돌렸다.
- **live 쪽 무변경 [측정]:** `~/.pi/agent/settings.json` mtime 09:13, `~/.claude/settings.json` 06:46(둘 다 이
  판 이전), live npm global(`~/.npm-global`)은 `@openai` 하나뿐, 원 클론 `git status` 깨끗.
- live pnpm store에 10:56:20 쓰기가 보였는데, 그 `projects/` 링크는 `~/tmp/e125-tmp/entwurf-install-smoke.*` —
  **다른 레인**(entwurf #125)의 것이다 `[측정 readlink]`. 이 판의 pnpm 호출은 PATH 검사에서 먼저 실패했고, 재시도는
  `--store-dir /dev/shm/pnpm-store`로 갔다.
- `/dev/shm` 점유 1.3G. 지우는 법은 이 절 끝 「명령」.

### A. durable 격리 한 판 — 설치·테스트·예제

| 단계 | 결과 | 증거 |
|---|---|---|
| `npm ci --ignore-scripts` | rc=0, **11초**, 322 패키지, `node_modules` 344M | `[측정]` |
| durable `vitest --run` (첫 시도) | 32파일 실패 — `@earendil-works/pi-ai`에 `source` 조건이 없어 `dist`가 필요 | `[측정]` pi-ai `exports["."]` = `types`/`import`뿐 |
| 빌드 | chord·telemetry `build` + pi-ai `hydrate-model-data`(2초) + `build:offline`(3초), 모두 rc=0 | `[측정]` — `check:model-data`는 hydrate 전엔 실패한다(데이터가 git에 없다) |
| durable `vitest --run` | **851 통과 · 2 실패 · 1 스킵 (854), 42파일 중 41 통과, 23.3초** | `[측정]` |
| 실패 2건의 원인 | 둘 다 테스트가 `shellPath: "/bin/bash"`를 하드코딩한다 — NixOS에는 `/bin/bash`가 없다 (`ls` 측정) | `[읽음 env-node.test.ts:844]` + 실패 메시지 `/bin/bash: No such file or directory`. durable 로직 실패가 아니라 **호스트 가정** |

예제 넷 (`node --conditions=source --experimental-strip-types`, faux provider, API 0):

| 예제 | rc | 시간 | 무엇을 보였나 `[측정 출력 판독]` |
|---|---|---|---|
| `25-compaction` | 0 | 0.71s | 문턱·수동·overflow 압축 세 경로가 모두 요약을 놓는다. 마지막에 **문맥 5 메시지 / 저장 23 entry** — 원본은 남는다 |
| `13-recovery` | 0 | 0.85s | `tick 2`에서 close → 저장된 체크포인트 `{phase:"tick", n:2}` + memo `printed-1/2` → reopen 뒤 `tick 3–5`, `completed` |
| `31-reload-and-restart` | 0 | 0.70s | 재설치 중 돌던 호출은 `v1`, 다음 호출은 `v2`. 재시작 뒤 설치 전 `[]` → 설치 후 `['version']` |
| `23-subagent-background` | 0 | 3.23s | `(process restarts)` 뒤에도 `reader: Moby Dick.`가 **한 번** 돌아온다 — reporter의 requestId 중복 방지 |

**주의 [측정 grep]:** 네 예제 모두 `assert`/`throw new Error`가 **0개**다. rc=0은 「던지지 않았다」일 뿐이고,
위 판정은 출력을 사람이 읽은 것이다. 2026-10-02 1차 F2(「예제는 게이트가 아니다」)와 같은 사실의 다른 면이다.

### B. 거처 측정 (R3 기질) — `defineDoc fork` × 백엔드 × 재시작

프로브: `/dev/shm/pi-v1/packages/durable/probe/residence.ts` (Session 층 API만, **모델 호출 0**). 문서 셋
(`fork: "initial" | "current" | "asOf"`, 셋 다 `history: "rewindable"` — `asOf`는 rewindable에서만 허용된다
`[읽음 src/types.ts:42-53]`)에 S-exp를 넣는다. commit 1 = entry `e1` + V1, commit 2 = entry `e2` + V2(`:next (measure fork)` 추가),
`e1`에서 fork, close → reopen.

```
V1 = (peer-state :goal (verify delivery boundary) :evidence ((claim :speaker glg :source "#27" :date "2026-10-02")))
```

| 백엔드 | 부모 (전·후) | fork `initial` | fork `current` | fork `asOf` | reopen 생존 |
|---|---|---|---|---|---|
| JSONL | V2 / V2 | **문서 없음**(`snapshot` → `undefined`) | V2 | **V1** | **같다** |
| SQLite | V2 / V2 | 문서 없음 | V2 | V1 | **같다** |

`[측정]` 둘 다 `survivesReopen: true`. `initial`은 「초기값으로 채운 문서」가 아니라 **문서가 아직 없다** —
읽는 쪽이 기본값을 대야 한다(README:509의 *"treat an absent one as its default"*와 맞다).

**가독성 [측정]:**
- JSONL: 값은 `main.jsonl`이 아니라 **`doc-<id>.jsonl` sidecar**에 있다(`main.jsonl` 4줄에 `peer-state` 0건; entry·문서 생성
  레코드·commit marker만). 첫 쓰기는 `{"kind":"base","value":{"form":"(peer-state … :source \"#27\" …)"}}`, 다음 쓰기는
  Chord op `{"kind":"delta","ops":[["s",["form"],"(peer-state …)"]]}`. **사람이 그대로 읽는다** — 이스케이프는 `"` → `\"` 하나.
- SQLite: `document_revisions.content TEXT`에 같은 JSON(`base` 값 또는 delta op 배열). 아무 sqlite 리더로 읽힌다.
- 즉 사람이 form을 **읽는** 것은 된다. **고치는** 것은 별개다 — sidecar를 손으로 고치면 commit marker 계약
  (spec.md §11.3)을 깬다. 사람 admission(R3)이 durable 위에 선다면 그 손은 Harness commit을 거쳐야 한다(추론).

### C. pi 1.0 coding agent 격리 설치 + 우리 확장 로드

**pi 바이너리 핀 [측정]:** `run.sh`에는 **없다.** 하우스 테스트는 `Bun.which("pi", cleanPath)`로 PATH에서 찾고
`*/node_modules/.bin`을 걸러 낸다(`pi-extensions/tests/goal.rpc.test.ts:29-30`, 나머지 RPC·load 테스트 동일). 그래서
**PATH 앞자리가 곧 핀**이다 — 테스트 수정 없이 바이너리를 바꿔 끼울 수 있었다.

설치 두 모양:

| 모양 | 명령 | 결과 |
|---|---|---|
| npm 전역 prefix | `npm install -g --prefix /dev/shm/pi1 …@1.0.0` | 10초, 431M, `pi --version` → 1.0.0. npm 11 `allow-scripts`가 `protobufjs` postinstall을 보류 |
| pnpm 전역(=live와 같은 배치) | `PNPM_HOME=/dev/shm/pnpm1 pnpm add -g --store-dir /dev/shm/pnpm-store …@1.0.0` | 5초, store 170M, 1.0.0 |

하우스 테스트 (`run.sh test:goal`·`test:decision-gate`·`test:autopilot`·`demo:autopilot`가 부르는 bun 파일 8개를 그대로):

| 파일 | live 0.99.2 | 1.0.0 npm 배치 | 1.0.0 pnpm 배치 |
|---|---|---|---|
| `goal.test` | ok 29 | ok 29 | ok 29 |
| `goal.rpc` (격리 실물 RPC) | ok 13 | ok 13 | ok 13 |
| `decision-gate.test` | ok 135 | ok 135 | ok 135 |
| `decision-gate.load` | ok 13 | **skip, rc=0** | ok 13 |
| `autopilot.test` | ok 110 | ok 110 | ok 110 |
| `autopilot.load` | ok 8 | **skip, rc=0** | ok 8 |
| `autopilot.demo --quiet` | rc 0 | rc 0 | rc 0 |
| `autopilot.rpc` (격리 실물 RPC) | ok 11 | ok 11 | ok 11 |
| 합계 | **319 ok, FAIL 0** | 298 ok + skip 2 | **319 ok, FAIL 0** |

`[측정]` **1.0은 live와 같은 수로 green이다.** 그런데 npm 배치의 두 skip은 이 집 검증면 결함이다: load 스모크가
`@earendil-works/pi-ai`를 pi 패키지 **형제 디렉터리**에서만 찾아서(`decision-gate.load.test.ts:49-53`, pnpm 배치 가정)
npm 배치에서는 *"no @earendil-works/pi-ai next to the running pi"*를 찍고 **rc=0으로 끝난다.** `run.sh` 체인
(`&&`)에서 통과로 읽힌다. 2026-09-10 판보기에서 본 「모르는 것과 없는 것이 같은 값으로 렌더된다」와 같은 모양이다.
고칠지는 GLG 판정 — 이 판은 측정만.

**21개 동시 로드 [측정]:** 격리 agentDir에 로컬 TS 19개(심링크) + `pi install`로 npm 2개
(`pi-codex-compaction`, `pi-session-recall` — live처럼 `extensions: []`)를 올리고 RPC로 띄웠다.

| 항목 | live 0.99.2 | 1.0.0 |
|---|---|---|
| 준비까지 | 1,877ms | 1,810ms |
| 확장 명령 | 12개 — `autopilot bg context decision-gate end-review goal heartbeat llama mcp rawpaste review session-breakdown` | **같은 12개** |
| `extension_ui_request` 이벤트 | 6 | 6 |
| stderr | 0줄 | 0줄 |
| 활성 도구 | 9 — `bash bash_background bash_background_check edit generate_image read session_literal_search session_query write` | **같은 9** |
| 전체 도구 | 18 | **같은 18** (`diff` 0) |

1차의 미해결 5(「live 0.99.2 → 1.0 확장 호환」)는 이것으로 **측정됨**이다. 소스 판독으로 덧붙인 것 `[읽음
coding-agent/src/core/extensions/loader.ts @ v1.0.0]`: 1.0 로더는 `@mariozechner/*`·`@sinclair/typebox` 별칭을 **유지한다**
(:108-120) — 우리 확장은 아직 옛 이름을 17곳 import한다(측정 grep). 새로 생긴 것은 `registerCommand`가 빈 이름과
`handler` 없는 등록을 **던진다**는 검증이다 — 우리 12개 명령은 통과했다.

### D. codemode / structuredContent — 모델 0 범위

RPC에는 도구를 직접 부르는 명령이 없고(`docs/rpc-commands.md` 목차 `[읽음]`), `ctx.executeTool()`은 **도구 실행 문맥에만**
있다(`dist/core/extensions/types.d.ts:262-280`, 명령 문맥 `:286`에는 없음 `[읽음]`). 그래서 1.0의 pi-ai가 공개 export하는
**faux provider**(`@earendil-works/pi-ai/providers/faux` `fauxProvider`, 대본대로만 답한다)를 확장 하나로
`pi.registerProvider(handle.provider)`에 올려 **실제 모델·API 0으로 도구 턴 넷**을 만들었다. 대본: ① codemode
`store("peer", {form: V1})` + 스크립트 안에서 `tools.probe_struct({n:2})` ② codemode `load("peer")` ③ `probe_struct` 직접
호출 ④ `"done"`. `probe_struct`는 `outputSchema` + `structuredContent: {n, sexp}`를 돌려준다.

| # | 질문 | 결과 `[측정]` |
|---|---|---|
| D1 | codemode store가 호출 사이에 남는가 | **남는다.** ②가 V1을 돌려줬다 |
| D2 | 무엇으로 남는가 | 세션 JSONL에 `{"type":"custom","customType":"codemode-store","data":{"set":{"peer":{…}},"delete":[]}}` 한 줄 — 스크립트별 **델타**. tool call과 tool result 사이에 끼인다 |
| D3 | 새 프로세스에서 재개해도 남는가 | **남는다.** `--session <file>`로 다시 열고 `load("peer")` → V1 |
| D4 | 가지(fork) 범위인가 | **그렇다.** RPC `fork`로 store 이전 user 메시지에서 가지를 치자 새 세션 파일에서 `load("peer")` → `null` |
| D5 | `structuredContent`가 스크립트에 어떻게 오나 | 텍스트(`probe n=2`)가 아니라 **구조 값** `{n:2, sexp:…}` |
| D6 | 확장 `tool_result` 핸들러에 어떻게 오나 | 직접 호출·중첩 호출 둘 다 `structuredContent` 키로 온다. 중첩 호출에는 `parentToolCallId`가 더 붙는다. 키 목록 `content details input isError [parentToolCallId] structuredContent toolCallId toolName type usage` |
| D7 | 세션 JSONL에 남는가 | **안 남는다 — `"structuredContent"` 0건.** 모델이 보는 것은 `content` 텍스트뿐이고, 중첩 호출은 codemode 결과의 `nestedCalls`에 이름·인자·상태·시간만 (`{"name":"probe_struct","status":"ok","arguments":{"n":2},"durationMs":2}`, 결과 없음 — docs/extensions.md:148과 맞다) |
| D8 | codemode 기본값 | `defaultTools` 없는 격리 21개 판에서 활성 도구에 **없다**(전체 목록에만 있다). 켜는 손은 `defaultTools: ["+codemode"]` |
| D9 | 세션 파일 이름 | 1.0도 `<created-at>_<UUIDv7>.jsonl` (`…_01a0fa5c-ec8c-7280-…`) — andenken 입장 정규식(`session-indexer.ts:286`)에 그대로 맞는다 |

한계 한 줄: faux 확장은 pi-ai `providers/faux` 하위 경로를 **절대 경로로** import해야 했다 — 1.0 로더 별칭은 pi-ai 루트·
`compat`·`oauth`·`providers/all`만 매핑한다(`loader.ts:108-114` `[읽음]`, 첫 시도 *"Cannot find module"* `[측정]`).

### E. coding-agent CHANGELOG `0.99.2 → 1.0.0` — 우리에게 걸리는 것

`[읽음 packages/coding-agent/CHANGELOG.md @ v1.0.0 §1.0.0]`. live가 0.99.2라 차이는 이 한 절이다. 「Breaking」 절은 없다.

| 변경 | 우리 쪽 | 상태 |
|---|---|---|
| TUI 기본 **fullscreen** (`tuiMode: "regular"`로 되돌림) | live `settings.json`·`pi/settings.json`에 `tuiMode` **없음** `[측정 jq]` → 올리면 기본이 바뀐다. herdr 09-14 실측이 *"alt-screen 행은 scrollback에 안 들어가 회수 불가"*라 적은 자리와 닿는다 | 단서 — 실 TTY 필요 |
| `quietStartup: "header"` 추가 | 영향 없음(선택) | 읽음 |
| codemode 프롬프트 약 40% 감소, 오류 메시지 개선, **`typeof tools.name` → `"name" in tools`** | 이 집 확장·스킬에 `typeof tools.` 0건 `[측정 grep]` | 영향 없음 |
| codemode `models.generateImages()` — *"with the session's credentials"*, 예시가 OpenRouter | `~/.env.local`에 `OPENROUTER` 줄 6개 `[측정 grep -c]`, `env-loader.ts:86`이 그 파일을 프로세스 env로 올리고 pi-ai는 `OPENROUTER_API_KEY`를 읽는다(`env-api-keys.ts:100`) → **codemode를 켜면 스크립트가 OpenRouter 레일을 쓸 수 있는 길이 생긴다.** codemode는 지금 꺼져 있다(D8) | 단서 — 정책 판정 대상 |
| `--provider`만 주고 `--model` 없으면 오류 | entwurf 스크립트 표본 8곳은 전부 둘을 같이 준다 `[측정 grep]` | 영향 없음(표본) |
| MCP OAuth 자격을 서버 이름+URL별로 저장, URL만으로 저장된 것은 이주 | entwurf-bridge는 stdio MCP | 단서 — entwurf 0.30.0 레인 |
| 확장 타입: 도구 그룹 `instructions` 필드 | 쓰지 않는다 | 영향 없음 |
| `registerCommand` 검증(위 C) | 12개 명령 통과 | 측정됨 |
| 세션 포맷 | `CURRENT_SESSION_VERSION = 3` 그대로 (1차 측정) | 영향 없음 |
| 압축 설정 | 키 4개 그대로, `backgroundTokens` 없음 (1차 측정) | 좌표 18 기대치 불변 |

### 매트릭스 델타 — 이번 판 증거만

| # | 항목 | 이전 | 지금 | 판정 |
|---|---|---|---|---|
| A5 | 격리 구동 한 판 | 미측정 | **측정됨** | `/dev/shm` 사본, `npm ci` 11초 |
| B2 | 배경 압축 | 읽음 | 읽음 | `25-compaction`이 문턱 경로를 실행했으나 **비차단**은 faux로 재지 않았다 |
| B7 | 장기 대화 한 판 | 미측정 | **측정됨(faux)** | 9턴, 압축 3경로, 문맥 5 / 저장 23 |
| F2 | 예제가 게이트인가 | 측정됨(아니다) | 측정됨(아니다) | 단언 0개 — rc는 판정이 아니다 |
| F7 | 테스트 실제 green | 미측정 | **측정됨** | 851/2/1, 실패 2 = `/bin/bash` 하드코딩 (NixOS) |
| G4 | 작은 실험 | 미측정 | **측정됨** | 예제 4 + 거처 프로브 + codemode 프로브, 전부 API 0 |
| H1 | 거처 — fork 3종 × JSONL/SQLite × reopen | 없던 항목 | **측정됨** | `initial`=없음, `current`=부모 현재, `asOf`=fork 시점, 재시작 생존 |
| H2 | 거처 가독성 | 없던 항목 | **측정됨** | sidecar/`document_revisions`에 JSON 문자열, `\"`만 이스케이프 |
| I1 | pi 1.0 격리 설치 | 없던 항목 | **측정됨** | npm prefix·pnpm 둘 다 |
| I2 | 하우스 테스트 on 1.0 | 없던 항목 | **측정됨** | 319 ok = live |
| I3 | 21개 동시 로드 on 1.0 | 1차 미해결 5 | **측정됨** | 명령·도구·stderr 동일 |
| I4 | `run.sh` pi 핀 | 없던 항목 | **측정됨(없음)** | PATH 앞자리가 핀. npm 배치에서 load 스모크 rc=0 skip |
| J1–J4 | codemode store: 호출 사이·재개·가지 | 없던 항목 | **측정됨** | D1–D4 |
| J5 | `structuredContent` → 스크립트·확장 | 없던 항목 | **측정됨** | D5–D6 |
| J6 | `structuredContent` → 세션 JSONL | 없던 항목 | **측정됨(0건)** | D7 |
| J7 | codemode 기본값 | 없던 항목 | **측정됨(꺼짐)** | D8 |

### 이 집과의 접점 — 갱신

- **(a) 좌표 18:** 변동 없음. 1.0도 차단 압축이고 압축 모델 지정이 없다(1차). 이번 판은 실제 모델이 없어 시간을
  재지 못했다.
- **(b) 확장:** 1.0 수용의 확장 쪽 위험은 소스와 실행 둘 다에서 보이지 않는다(I2·I3). 남는 차이는 기본값
  (fullscreen, E 표)이다.
- **(c) 기억축 [측정→추론]:** 1.0 세션 파일명은 andenken 입장 규칙에 맞는다(D9). 그러나 **구조 결과는 JSONL에
  오지 않는다**(D7) — andenken·session-recap이 보는 것은 언제나 `content` 텍스트다. codemode store는 `custom`
  entry로 남는데, andenken 인덱서가 `custom` entry를 청크로 넣는지는 **미측정**(단서).
- **거처 층에 대한 새 사실 [측정]:** 「한 통」 지도의 거처 칸 후보가 **durable 하나가 아니다.** pi 1.0 coding agent의
  codemode store가 이미 「작은 JSON · 재개 생존 · 가지 범위」를 준다(D1–D4). durable은 그 위에 **타입 문서 ·
  fork 정책 선택 · 원자 commit · 다중 conversation**을 더한다(H1). 어느 쪽이 R3의 기질인지는 판정이 아니라 다음
  실험의 갈림길이다(제안).

### 자동화로는 더 못 재는 것

| 무엇 | 왜 | 필요한 것 |
|---|---|---|
| 1.0 빌트인 압축 시간 (좌표 18) | 실제 모델 요청 시간이 측정 대상 | 실제 모델 턴 — 압축 1회 = 세션 하나를 ~22만 토큰까지 채우는 비용. 구독 레일, GLG 판정 |
| 요약 품질·「압축의 압축」 드리프트 (llmlog §6(b)) | 모델 출력의 의미 판정 | 모델 + 사람(GLG) 대조 |
| autopilot/decision-gate consult의 판단 적합성 (좌표 17) | 「인용 ID 해소 ≠ 질문을 지지함」은 의미 판정 | 모델 + GLG |
| fullscreen TUI가 herdr/tmux 화면 읽기에 주는 영향 | RPC는 TUI를 쓰지 않는다 | 실제 TTY/패인 하나 |
| durable 배경 압축이 **실제 지연에서** 대화를 막지 않는가 | faux는 즉답이다 | faux `tokensPerSecond`로 부분 모사 가능(자동화 여지 있음), 실제는 모델 |
| pi 1.0 시민의 entwurf 경로 (control socket, meta-bridge, ACP) | live 설치와 entwurf 설치자가 필요 | entwurf 0.30.0 레인 |
| GLG 개입 홉 (#88 측정 단위) | 사람이 단위다 | GLG |
| codemode → OpenRouter 이미지 경로 | 실제 과금 레일 — 돌리면 안 된다 | 정책 판정만 |

### 명령 (재현)

```bash
# 격리 판 전체가 /dev/shm 에 있다 (1.3G, RAM). 재현:
cd /dev/shm/pi-v1/packages/durable && env -i PATH=$PATH HOME=/dev/shm/iso-home npx vitest --run
env -i PATH=$PATH HOME=/dev/shm/iso-home TMPDIR=/dev/shm node --conditions=source --experimental-strip-types probe/residence.ts
/dev/shm/run-house-tests.sh v1pnpm /dev/shm/pnpm1/bin        # 하우스 테스트 8개, 1.0 pnpm 배치
node /dev/shm/rpc21.mjs /dev/shm/pnpm1/bin/pi /dev/shm/agent21-v1   # 21개 동시 로드
PROBE_MODE=first node /dev/shm/rpcD.mjs /dev/shm/pnpm1/bin/pi /dev/shm/agentD-v1   # codemode/structuredContent (agentD 재생성 후)
# 치우기 (재부팅해도 사라진다):
rm -rf /dev/shm/{pi-v1,pi1,pnpm1,pnpm-store,npm-cache,iso-home,agent21-*,agentD-v1,pi-durable-residence-*,jiti,node-compile-cache,autopilot-load-*} /dev/shm/*.log /dev/shm/*.mjs /dev/shm/*.json /dev/shm/run-house-tests.sh
```

`/tmp/pi-v1` worktree는 1차 그대로 둔다(읽기 핀). `run.sh setup:pi-durable`·pi 바이너리 핀 타깃은 만들지 않았다.
