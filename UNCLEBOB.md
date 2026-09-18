# UNCLEBOB — 게이트 관측 기록, 그리고 entwurf에 넘길 준비

Robert C. Martin(밥 마틴)의 2026년 에이전트 코딩 궤적을 보기 위한 **외부 관측면**.
`YEGGE.md`와 같은 자리에 두되, 보는 것이 다르다. Wheelhouse 관측이 *화면과 주소*를 보는
것이라면 이 문서는 **검증면** — 하네스가 무엇으로 자기를 증명하는가 — 를 본다.

> **이 문서는 선을 하나 넘는다.** `harness-bench`는 "채택·성능·좋고 나쁨 판정이 아니다"로
> 서 있고 `YEGGE.md`는 그 선을 지킨다. 이 문서는 GLG의 명시 요청(2026-09-18)으로
> **관측 + 우리 기준 제안**까지 간다. 넘는 이유는 하나다: entwurf 0.23.0과 herdr 플러그인
> 0.2.0이 나가는 시점이고, 사용층이 넓어지기 전에 단단함의 기준이 필요한데, 그 기준을
> entwurf 담당자들이 스스로 도출하게 두면 기능 구현 중인 턴을 거기에 쓴다. 준비는 이
> 집에서 하고 가이드로 넘긴다.
>
> 넘지 않는 선은 그대로다. **entwurf에 무엇을 하라고 지시하지 않는다.** 아래 §D는
> 실측과 대조표이고, 무엇을 언제 할지는 entwurf 담당자와 GLG의 몫이다. 특히 이 문서는
> entwurf를 다른 하네스와 우열로 겨루지 않는다 — 대조는 *형태*의 대조다.

`entwurf` 담당자의 일은 garden-id, record/liveness, rail 선택, delivery, visible lifecycle이라는
자기 로직을 보장하고 어제의 자기 코드보다 나아졌는지를 재는 것이다. "우리 검증면이 이웃과
어떤 형태로 다른가"를 재는 일은 **entwurf 사용자인 GLG와 agent-config 시험소의 몫**이다.

---

## 상태 — 2026-09-18

| 축 | 서 있는 곳 |
|---|---|
| 관측 대상 | `unclebob/swarm-forge` (클론 `~/repos/3rd/swarm-forge`), `unclebob/crap4clj` (클론 `~/repos/3rd/crap4clj`), 그리고 GitHub API로 본 `othello` · `uml-viewer` · `skillBoard` · `ubc-website` |
| 도입 | **안 함.** SwarmForge를 설치하지 않는다. CRAP을 우리 리포에 상주시키지 않는다(2026-09-18 GLG 판정: "지금 crap 안 넣을거야") |
| 실행 | `crap4clj`를 `~/repos/gh/abductcli`에 **1회 실측**했고 산출물(`abductcli/.metrics/`, `target/`)은 제거했다. 증거 사본만 `/tmp/abductcli-crap-evidence/crap.edn` |
| 이 문서의 산출물 | §D — entwurf 담당자에게 넘길 대조표와 열린 질문. 지시가 아니다 |
| **§D 전달 준비** | **안 됨.** terra 교차검수(2026-09-18)가 §D2의 사실 전제가 이미 충족됨을 `file:line`으로 회수했고, §B의 비율이 정규화되지 않았음을 지적했다. 아래 §E가 회수 목록이며, 넘기기 전 §E의 남은 조건을 먼저 닫아야 한다 |

---

## [2026-09-18] 하네스를 접은 저자가 남긴 것 — 그리고 "테스트가 어디 있는가"라는 축

### 왜 지금 이 주제인가

GLG의 물음은 밥 마틴에 대한 호기심이 아니었다. 2026-09-17 저널에 적힌 것이 출처다
(read at `~/sync/org/journal/20260914T000000--2026-09-14__journal_week37.org:1464-1486`):

> 형제를 부른다는 이 감각에는 약점이 있다. 문서, 주석, 코드 테스트에 불일치와 버그가
> 숨어 있기 마련이다. (…) 다른 학교 친구들을 불러 모아본다. 다른 관점일 것이다. 구멍들을
> 찾고 수선하는 것이다. (…) **여기에 누가 뛰어나고 왜 이렇게 했냐라고 누구도 말할 수 없다.**

그리고 GLG가 세션에서 말로 덧붙인 것: **"내가 기준이 사실 없거든. 내가 만든것도 아니잖아."**

이 문서가 답하려는 것은 그것이다. 형제 교차검수가 의견 대 의견이 되지 않게 하는 기준이
무엇이며, 그것이 coverage 퍼센트인가 아닌가.

### 읽은 곳

- 트윗 전문 (GLG가 세션에 붙임, 2026-09-12 오전 12:24 KST 표기) — 「Rethinking Harnesses」
- `~/repos/3rd/swarm-forge` — 331 커밋, 10개 브랜치 (측정: `git rev-list --count`, `git branch -r`)
- `~/repos/3rd/crap4clj` — 40 커밋
- **Book Overflow 대담 발화 정본** — `~/org/transcript/20260918T161915--uncle-bob-says-ai-is-already-conscious-…__transcript_youtube.md`
  (63분 20초, 1,757 cue / 237 turn, LLM 재작성 없음) + 짝지은 `__section_digest.md`.
  org 담당자가 2026-09-18에 받아왔다. 아래 `mm:ss` 표기는 전부 이 정본에서 온 것이다 —
  **처음 이 문서를 쓸 때는 없던 출처이며, 그것이 §A-2를 정정했다.**

### A. 접은 것과 남긴 것 — 목록이 정확하다

**날짜가 트윗을 증언한다** (측정: `git log`, `gh api`):

| 리포 | 마지막 커밋 | archived? |
|---|---|---|
| `swarm-forge` main | 2026-09-04 | **아니오.** 스타 3,901 |
| `swarm-forge` lieutenant | 2026-09-07 | 아니오 |
| `crap4clj` | 2026-09-17 | 아니오. 스타 51 |
| `clj-mutate` | 2026-09-17 | 아니오 |
| `uml-viewer` | 2026-09-17 | 아니오 |

**트윗 이후 시작한 프로젝트에는 하네스가 없고 게이트는 있다** (측정: `gh api .../contents`):

- `othello` (커밋 2026-09-11 ~ 09-13, 트윗을 가로지른다): 루트에 `deps.edn`,
  `shadow-cljs.edn`, `package.json`, `spec/`, `src/`, `public/`. **`swarmforge/` 없음,
  `AGENTS.md` 없음**, `.gitignore`에도 swarmforge 항목 없음(숨긴 것이 아니다). 그런데 커밋
  메시지는 `Remove mutation scars from domain and UI state`(09-12),
  `Add an OO model page with CRAP-colored UML`(09-13).
- `uml-viewer` (09-17): `.metrics/`, `.grok/rules/`, `deps.edn`, `spec/`. **`swarmforge/` 없음.**
- `skillBoard`에 `swarmforge/`가 있으나 **반례가 아니다**: 그 경로를 건드린 커밋이
  2026-04-21 두 개뿐이고(트윗 5개월 전), 문법이 구형(`window architect codex master`,
  역할 파일이 `roles/` 없이 최상위). 그 리포 master 코드는 4월에 멈췄고 9/16 push는
  `cursor/fsp-adsb-timeouts-33b0` 브랜치다.

**지금 어떻게 일하는지는 본인이 써놨다** — `unclebob/uml-viewer` README (read):

> A **tmux** session `uml-viewer-grok` starts interactive Grok in the **examined project's
> directory** (`--yolo --trust --rules …` plus a launch prompt). … That instance — not every
> Grok in this repo — also runs `clj -M:crap`, `clj -M:mutate`, and IR generate after later
> changes. … **Metrics (CC, coverage, CRAP, killed/survived) come from `.metrics/` snapshots
> produced by crap4clj and clj-mutate.** … **Agents edit the policy, not the IR.**

**여기서 용어 하나를 바로잡아야 한다.** bib 노트 `20250214T123159`는 그가 "interrogation
tools 쪽으로 관심 이동"했다고 적었고(inherited), 나는 그것을 *코드를 읽지 않고 구조를 보는
도구* = `uml-viewer`로 읽었다. 정본 27:55는 다르게 말한다:

정본 27:55 원문(read):

> you don't need to read the code, but you can tell by what it's saying to you as the screen
> scrolls by. And **you can interrogate it. You can ask it, how did you do this one? How did
> you do that one? What's the overall philosophy here?** … and you can get a mental model of
> what it's built… And then you can think, okay, you did that wrong. Here, reroute it this
> way. Move that module over there.

주어가 도구가 아니라 **에이전트**다. `uml-viewer`는 그 자세를 거드는 화면이지 그 자세
자체가 아니다. 이 구분이 §D에 걸린다 — "구멍을 보여주는 그림을 만들자"와 "형제에게 물어서
알아내자"는 서로 다른 투자다. 그는 후자를 말했고, 전자는 그 후자를 싸게 만드는 보조물이다.

#### 그리고 바로 다음 문장이 GLG의 저널에 직접 답한다

GLG는 2026-09-17 저널에서 구현 형제를 퇴근시킨 뒤 다른 학교 형제를 불러 구멍을 찾는
방식을 적고, 스스로 이렇게 덧붙였다: *"아 그렇다면, 참 일을 엉성하게 한다는 말을 들을지
모른다. 맞다."*

정본 28:46에 그 방식의 **근거**가 있다 (read):

> **the agents focus downwards. They never look outwards.** … Now, if you ask an agent to
> look outwards, if you ask an agent to assess the system based on future performance and
> architectural patterns, it'll do a reasonable job of that. **But it will not do that while
> it's writing the system. It can't seem to put itself in both mindsets** like a good
> programmer will.

> **(밥 마틴의 주장)** 구현 중인 에이전트는 바깥을 보지 않는다. 물어보면 잘 본다.
> 그러나 쓰는 동안에는 못 한다.

**증거 상태를 정확히 적는다** (terra 회수 2026-09-18). 이것은 **한 인터뷰에서 밥 마틴이
주장한 관점**이고, 벤치마크나 통제 실험이 아니다. 첫 판은 이것을 *"측정된 한계"*로,
GLG의 방식을 *"그 한계에 대한 정확한 대응"*으로, 저널의 자기평가를 *"정본이 취소한다"*로
썼다. **세 단계 모두 한 발화를 일반 법칙과 개인 절차의 검증으로 올린 것이므로 회수한다.**

남는 것은 이렇게 적을 수 있다:

> GLG가 쓰는 순서 — 구현 형제를 퇴근시킨 뒤 다른 학교 형제를 부르는 것 — 와 같은 구조를,
> 밥 마틴도 **자기 경험에 근거해 같은 이유로 설명한다**: 한 에이전트가 쓰기와 바깥 보기를
> 동시에 못 한다는 것. 이것은 GLG 방식의 검증이 아니고, **같은 관찰에 도달한 독립 사례**다.

그것만으로도 저널의 *"참 일을 엉성하게 한다는 말을 들을지 모른다. 맞다"*에 대해 말할 것이
있다. **그 순서를 택한 사람이 GLG만이 아니다.** 근거가 다를 수 있고(밥 마틴은 효과·비용,
GLG는 관계축 — §D6), 둘 다 통제 실험은 아니다. 그러나 혼자 내린 판단은 아니다.

정리하면:

| 접은 것 | 남긴 것 |
|---|---|
| 역할 파이프라인 (specifier→coder→refactorer→architect) | tmux |
| worktree 격리 | YOLO 권한 |
| git handoff 데몬 (`handoffd.bb`, inbox/outbox, 10자리 SHA) | 단일 에이전트 |
| 헌법 (`constitution/articles/`) | CRAP · mutation · coverage · DRY |
| 대시보드 / lieutenant / platoon 구상 | 판정을 **외부 결정론적 도구**에 둠 |

트윗 마지막 줄 *"harnesses should not treat agents as components within a software design"*이
왼쪽 열의 목록이다.

**"was using"** — 대담의 `I was using my own harness.`는 과거진행형이고 "그때 쓰고 있었다"를
뜻한다. 위 othello/uml-viewer 실측이 그 함의를 독립적으로 지지한다.

**그리고 정본은 트윗보다 훨씬 분명하다.** 트윗은 `I'm not sure`로 끝나지만 대담에서는
이름을 대고 실시간으로 꺾는다:

| 시각 | 발화 |
|---|---|
| 22:18 | 2026년 1월 Grok으로 실제 에이전트 작업 시작 → Claude로 옮기며 **"내가 병목"** 자각 |
| 30:22 | 같은 과제를 여러 에이전트 세트로 돌려 비교. 그록 **주간 예산을 반나절에 소진** |
| 31:24–32:22 | **SwarmForge를 이름 대고**, 몇 달째 튜닝해 왔다고 말한 뒤 **"harness 개념 자체가 틀린 것 같다"**고 선언 |
| 33:00 / 33:42–33:46 | **33:00은 상대(진행자)가** Exoharness — 하네스를 감시하는 탬퍼프루프 로그를 가진 메타 하네스 — 를 소개하는 자리다. 밥 마틴의 반응("programmer would think" / 메타 하네스 / 틀린 방향)은 **33:42–33:46**이다 |
| 34:45 | *"maybe this is just the wrong model entirely… Although **we still need some kind of discipline in there**"* |
| **49:37–51:00** | **균형 영수증** — 아래 §A-4 |
| 34:11 | 개인 경험 보고 — **단일 에이전트와 직접 일하면 결과가 더 낫고, 하네스 경유는 토큰을 약 20배 더 쓴다** |

33:42–33:46이 트윗 마지막 줄(*"harnesses should not treat agents as components within a
software design"*)과 같은 내용이 나오는 자리다.

**다음 문장은 해석이며 영수증이 아니다 (proposal).** 나는 이 대목을 *"즉시 자기조롱하고 그
농담을 끝맺기 전에 스스로 멈췄다"*, *"레이어를 하나 더 얹으려던 손을 스스로 멈춘 동작"*,
*"이 집 `subtract` 스킬의 반사와 같은 종류"*라고 썼다. **타임스탬프가 지지하는 것은 발화
순서와 화자뿐이고, 브레이크·반사·자기조롱은 내가 붙인 서사다**(terra 2차 회수). org 담당자도
같은 대응을 짚었으니 둘이 같은 해석에 도달한 것은 사실이지만, 그것이 해석을 사실로 만들지
않는다.

**남는 불확실성 (미측정):** forge 제품(`project-manager`/`lieutenant`)은 프로젝트를
`projects/<name>/` 밑에 두는 구조라, 거기서 돌렸다면 프로젝트 리포 git에 흔적이 안 남을 수
있다. 방어 가능한 주장은 "트윗 이후 시작한 프로젝트에 팩 설치 흔적이 없다"까지다.

### A-2. 도구는 남기고 임계값을 옮겼다 — 이 비대칭이 핵심이다

GLG가 대담에서 들은 것: *"이것저것 제제하는 방식이 오히려 별로라서 딴지를 안 거는 게
좋다"* (inherited, 출처 GLG).

그의 리포가 그 말을 증언한다. **`swarm-forge/AGENTS.md`는 6줄이고 내용이 하나다** (read):

> Do not test the text of prompts with an automated unit or acceptance test. That includes
> constitution articles, role prompts, Tool Startup, and generated instruction files. Prompt
> wording is not production behavior to pin with `str/includes?`, Gherkin, or any other
> automated check.

331커밋 하네스를 짓고 남긴 전역 규칙이 "제제를 줄여라" 하나다.

**그런데 같은 리포의 `swarmforge/constitution/articles/engineering.prompt` § Guardrails는
반대 방향으로 조인다** (read):

> Do not invent project-local CRAP, DRY, mutation, or coverage proxies. Install and run the
> constitution tools … Do not treat a homegrown `bb crap` / `bb coverage` /
> `bb mutation-count` task as those tools.

> **딴지를 안 건다 ≠ 기준이 없다.**
> 프롬프트 산문 제제는 6줄로 줄었고, 도구 판정은 대체 불가로 고정돼 있다.

**여기서 한 단계 더 간 것은 회수한다 (terra 2차).** 첫 판은 *"판정을 말에서 빼서 도구로
옮긴 것이다. 말로 제제하면 딴지가 되고, 도구가 판정하면 사실이 된다"*고 썼다. 그 이분법은
두 문서(6줄 `AGENTS.md`, `engineering.prompt` § Guardrails)에서 **내가 만든 일반 명제**이고,
그가 그렇게 말한 적은 없다. 원문에서 확인되는 것은 더 좁다 (read at `25:40`):
*"I still need to put some constraints on them, but they don't need to be as **draconian**"* —
**제제가 필요하다는 것과 덜 혹독해도 된다는 것**까지다.

이것이 GLG의 "기준이 없거든"에 대한 밥 마틴의 답이다. 그리고 그의 저널 문장
*"누가 뛰어나고 왜 이렇게 했냐라고 누구도 말할 수 없다"*가 미덕이 아니라 불가피였던
이유이기도 하다 — 판정할 근거가 없으면 판정이 없다.

#### 정정 — 이 절의 첫 판은 증거보다 날이 서 있었다

이 문서의 첫 판(2026-09-18, 리포 증거만으로 작성)은 **"제제는 줄이고 측정은 줄이지 않았다"**
고 썼다. 같은 날 늦게 들어온 대담 정본이 그 문장을 깎는다 (24:55):

> **CRAP 임계값을 4 → 6 → 12로 점점 완화했다.**

**단위는 정본에서 확인했다 — CRAP 점수가 맞다** (read 25:40):

> it'll come up with a single number and you try to drive that number very low. And at first
> I was **driving it to four**. Get it all below four and it would do it… grind and grind and
> grind and take the code apart to get really tiny little functions. And then bit by bit I
> said, well, it probably doesn't need to be four, **maybe six. Now I'm at 12.**

그리고 **왜 풀었는지도 본인이 말한다** (read 25:40): *"the models are getting so much better
than they were that I can relax the thresholds… I still need to put some constraints on them,
but they don't need to be as **draconian** as I had them in say March."*

시점도 정본에 있다 (read 24:55): *"my philosophy had been from about **January until maybe
two weeks ago**"* — 대담 시점 기준 2주 전에 꺾였고, 그것이 트윗(09-12)과 맞는다.

부수적으로 25:40의 `take the code apart to get really tiny little functions`가 §A-3에서
공식으로만 말한 **CRAP ≥ CC 바닥**의 실제 효과다. 임계값 4를 맞추려면 쪼개는 수밖에 없다.
그가 12로 올린 것은 그 강제 분해를 덜 받겠다는 뜻이다.

정정된 문장은 이렇다. 더 약하지 않고 더 정확하다:

> **도구는 남기고 임계값을 옮겼다.**
> 프롬프트 산문 제제는 6줄로 줄였고, 게이트 **임계값**도 4→6→12로 풀었다.

**"게이트 자체는 끝까지 유지했다"는 한 단계 멀다 (terra 2차 회수).** 내가 근거로 든 것은
`crap4clj`·`clj-mutate`의 2026-09-17 커밋인데, **최근 커밋은 그 도구를 계속 실행하고 있음을
증명하지 않는다.** 증명하는 것은 그 리포를 최근에 만졌다는 것뿐이다. 실행의 증거로 더 가까운
것은 `othello`의 `Remove mutation scars`(09-12) 커밋과 `uml-viewer`가 `.metrics/`를 커밋해
둔 것이며, 그것도 "끝까지"를 말해주지는 않는다.

이 구분이 오히려 §D에 더 쓸모 있다. **느슨한 임계값을 가진 살아있는 게이트가, 엄격한
임계값을 가진 없는 게이트보다 강하다.** entwurf에 필요한 것은 통과하기 어려운 숫자가
아니라, 깨질 때 어디가 깨졌는지 말해주는 자리다. 임계값은 나중에 조일 수 있고, 그도
반대 방향으로 세 번 조정했다.

### A-4. 균형 영수증 — "버리지 말고 tune하라". 어떤 건 풀고 **어떤 건 조인다**

**이 절은 terra 2차 검수(2026-09-18)가 찾아왔다. 내가 못 본 것이고, 이 문서의 프레임을
바꾼다.** 나는 하네스 구간(22–35분)만 읽고 "접었다 / 남겼다"의 이야기로 문서를 세웠다.
49:37 이후에 **그 읽기를 직접 제한하는 발화**가 있다 (read at `transcript:49:37-51:00`):

> We are chasing this innovation… There's two ways to chase it. **Throw everything away** and
> just think, well, the heck with design patterns, the heck with everything we've learned
> before… And the other way… is to say, **nope, everything that we learned before was good.
> We're just going to have to tune it.** Some of them we're going to have to **lessen their
> restrictions. Some of them we might have to increase.** We're just going to have to tune our
> way towards it. **And that's the camp I'm in.**

**"어떤 건 풀고 어떤 건 조인다"**이고, 본인이 그 진영에 있다고 명시한다. 그러니 §A-2의
4→6→12 완화는 **한 방향 추세가 아니다.** 그는 완화를 예시로 들었을 뿐이고, 일반 입장은
tune이다.

이어지는 신입 교육론 (read at `50:41-51:00`) — **내가 미해결에 53–63분이라고 잘못 적었던
구간이며, 실제 위치는 49:37–51:00이다**:

> what should we do with new programmers? Should we just give them an agent right away? And my
> answer is **no. You should treat them like an agent for 6 months.** … **Measure them the same
> way they measure the agents** so that they understand how the agents are expected to behave…
> and then they graduate to being able to manage an agent. **Now, I don't know if that's the
> right answer.**

마지막 문장이 유보다. 본인도 정답이라 하지 않는다.

그리고 terra가 함께 확인한 52:23–54:24 (read, 나는 이 구간을 직접 열지 않았다 — terra
경유): mess를 주면 에이전트도 같은 딜레마에 빠지며 **"same principles apply, different
thresholds"**. 그리고 **에이전트 산출물이 평균보다 낫다는 그의 평가는 "자신이 적용한
constraints와 실행시킨 tests 때문"**이라고 말한다.

> **이것이 이 문서를 "게이트를 조이자"로도 "조율층 비용을 줄이자"로도 읽을 수 없게 만드는
> 대항 영수증이다.** 그의 입장은 원칙 폐기가 아니라 **원칙 유지 + threshold·훈련·역할의
> 구별된 tune**이고, 그 자신도 정답을 모른다고 유보한다.

§D가 이 절을 통과하지 않으면 균형을 잃는다. 그래서 §D5가 아래에서 이 절을 인용한다.

### A-3. 언어 표 — CRAP은 Clojure 전용이 아니고, TypeScript는 없다

`engineering.prompt` § Startup Tools의 "Language tool table" 원문(read)에 있고,
`gh api users/unclebob/repos`로 스타 수를 확인했다(측정):

| 언어 | CRAP | mutation | DRY |
|---|---|---|---|
| Java | `crap4java` **310★** | `mutate4java` 32★ | `dry4java` 15★ |
| Clojure | `crap4clj` 51★ | `clj-mutate` 32★ | `dry4clj` 30★ |
| Go | `crap4go` 32★ | `mutate4go` 21★ | `dry4go` 27★ |
| **TypeScript** | **없음** | **없음** | **없음** |

그리고 헌법은 에이전트가 시작할 때 이 셋을 **GitHub 최신으로 받아오게** 한다 — stale 캐시나
vendored 사본을 쓰지 말라고 명시한다.

**CRAP 공식은 35줄이다** (read `crap4clj/src/crap4clj/crap.cljc`):

```clojure
CRAP = CC² × (1 − cov)³ + CC
```

여기서 중요한 성질 하나: **커버리지가 100%여도 CRAP은 CC 밑으로 내려가지 않는다.** `uncov=0`이면
`CRAP = CC`. 그래서 CC 24 함수는 완벽히 테스트해도 24점이다. 테스트를 더 써서는 못 빠져나가고
**함수를 쪼개야만** 내려간다. 트윗의 *"they can leave scars"*가 이 강제력이다.

**우리 리포 1회 실측** (측정 2026-09-18, `~/repos/gh/abductcli`, 84 함수). 리포 `deps.edn`을
고치지 않고 `--coverage-command`로 주입했다:

```
-main                 abductcli.core     CC 24   1.9%   CRAP 568.0
cmd-export            abductcli.core     CC 11   5.6%   CRAP 112.9
verify-claim          abductcli.memo     CC 15  94.3%   CRAP  15.0  ← 커버리지 문제가 아님
entity-match-score    abductcli.signal   CC 11 100.0%   CRAP  11.0  ← 완벽 커버, 그래도 11

분포: clean(1–5) 59 / moderate(5–30) 18 / CRAPPY(30+) 7
CRAPPY 7개 = 전부 abductcli.core (CLI 진입층). 도메인 층 최악은 engine 2.0
```

읽히는 그림: **도메인 코어는 건강하고 CLI 진입층에 테스트 사각지대가 전부 몰려 있다.**
`voscli`·`incidentcli`도 같은 방식으로 지어졌으므로 같은 모양일 가능성이 높다(미측정).

**적용 시 실제로 걸린 것** (재사용 가능한 영수증): 우리 `:test` alias가
`:main-opts ["-m" "cognitect.test-runner"]`를 박고 있어서 `-M:test -m cloverage.coverage`가
인자 충돌로 깨진다. 우회는 리포를 안 고치고 인라인 alias를 만드는 것:

```bash
clojure -Sdeps '{:aliases {:crapcov {:extra-paths ["test"] :extra-deps {cloverage/cloverage {:mvn/version "1.2.4"}}}}}' \
  -M:crapcov -m cloverage.coverage -p src -s test --lcov --no-html --no-text
```

`bb` v1.12.218이 이 기계에 있고(측정), crap4clj의 `.bb` 커버리지 요구치 1.12.215+를 넘는다.

---

### B. 세 코드베이스 대조 — 구루 · 고수 · 이웃이 독립적으로 같은 답을 냈다

세 코드베이스를 같은 축으로 봤다. 전부 2026-09-18 측정.

> **먼저 이 표의 한계를 적는다** (terra 교차검수 2026-09-18이 회수한 것). 첫 판은
> *"언어도 학교도 다른 셋이 같은 형태를 쓰니 그건 형태의 문제다"*라고 썼다. 그 승격은
> 영수증이 없다. 이유 셋:
>
> 1. **비율 셋의 분자·분모가 서로 다르다.** 77%는 pi-mono의 *테스트 줄 / 비테스트 줄*,
>    49%는 herdr의 *`#[cfg(test)]` 품은 파일 / 비-vendor Rust 파일*, 17.5%는 entwurf의
>    *루트 `test/` 줄 / 선별한 런타임 줄*이다. **정규화되지 않았으므로 서로 비교할 수 없다.**
>    아래 표는 각 코드베이스의 자기 모양이고, 세로로 읽는 순위표가 아니다.
> 2. **독립성을 측정한 것이 아니다.** pi-mono와 herdr는 같은 시대·같은 생태계이므로 닮은
>    것이 수렴의 증거가 아닐 수 있다. 밥 마틴 축은 표본 1의 실천이다.
> 3. 밥 마틴 칸의 *"Keep tests close to…"*는 **규범 문장**이고 나머지 둘은 **관측치**다.
>    같은 종류가 아니다.
>
> 유지 가능한 관찰은 더 좁은 것 하나다 — **셋 중 아무도 coverage 퍼센트를 독립 단독
> threshold로 쓰지 않는다.** 밥 마틴은 coverage를 CRAP의 *입력*으로 쓴다(공식에 들어간다).

| | **pi-mono** (`~/repos/3rd/pi/pi-mono`) | **herdr** (`~/repos/3rd/herdr`) | **밥 마틴** |
|---|---|---|---|
| 언어 | TypeScript | **Rust** (우리 코드 378파일 / 277,013줄. `*.zig` 757파일은 전부 `vendor/libghostty-vt`) | Clojure |
| 커밋 | 6,352 | — | swarm-forge 331 |
| 테스트 규모 | 544 파일 / 139,500 줄 (비테스트 854 파일 / 181,393 줄) | `#[test]` **3,461** + `#[tokio::test]` **175** = 3,636 | — |
| 테스트가 있는 곳 | `packages/<pkg>/test/` — **10개 패키지 각자** | `#[cfg(test)]`를 품은 파일 **186 / 378 = 49%** — 소스 파일 *안* | 헌법: *"Keep tests close to the behavior being changed"* |
| **coverage 단독 % 게이트** | **없음** (`package.json`·`vitest.base.ts`·`biome.json`·`tsconfig.json` grep 0건) | **없음** (`justfile`만 관찰 — CI 워크플로·`Cargo.toml`은 미확인) | **없음, 그러나 coverage는 쓴다** — CRAP 공식의 *입력*이다. 게이트는 CRAP 점수 |
| 복잡도 | 없음 | 없음 | **CRAP** (CC를 바닥으로 갖는다) |
| mutation | 없음 | 없음 | **`clj-mutate`** |
| 게이트 코드 자신의 테스트 | **있음** — `test:scripts: node --test scripts/*.test.mjs` | **있음** — `maintenance-test`가 python unittest 11개 모듈 | **여기까지만 안전하다** — `bb.edn:38-64`가 `swarmforge/scripts`를 Cloverage/CRAP **대상으로 삼는다**. bb task wiring 자체가 테스트된다는 영수증은 아니다(terra 회수) |
| 문서↔코드 계약 게이트 | `check:ts-imports`, `check:entry-graphs`, `check:pinned-deps`, shrinkwrap/install-lock `--check` | **`docs-contract-test`(bun), `test_docs_translation_parity`, `test_config_reference_check`, `test_changelog`, `ui-hot-path-architecture-test`** | 헌법: 프롬프트 산문은 **테스트하지 말라** |
| CI 단계 | `ci.yml` 3단계: build → check → test | `just check` = `ci` + `windows-lint` + `docs-contract-test` | — |

**측정 매니페스트** (terra 지적: 숫자만으로는 재현성이 없다. 특히 entwurf는 릴리즈 중이다):

| 대상 | revision | 명령 |
|---|---|---|
| pi-mono | `~/repos/3rd/pi/pi-mono` 2026-09-11 `fix(ci)` | `git ls-files '*.ts' '*.tsx'` → `\.(test\|spec)\.tsx?$` 로 분리, `xargs wc -l`; 패키지 test 디렉터리는 `find packages -mindepth 2 -maxdepth 2 -name test` |
| herdr | `~/repos/3rd/herdr` | `git ls-files '*.rs' \| grep -v '^vendor/'`; `grep -h -e '#\[test\]' -e '#\[tokio::test'`; `grep -l '#\[cfg(test)\]'` |
| entwurf | HEAD **`ba6a4e3`** | `git ls-files '*.ts'` 분리 후 `wc -l`; 게이트 수는 `package.json` scripts에서 `\./run\.sh ([a-z0-9-]+)` 정규식 고유화 |
| 대담 정본 | `20260918T161915` denote id | 전수 대조 구간 `transcript:189-303,480-542,555-723` (terra 2차). 34:11 = `:297-298` |
| abductcli CRAP | 2026-09-18 1회 | `clojure -Sdeps '{:deps {io.github.unclebob/crap4clj {…:git/sha "e90be2e7…"}}}' -M -m crap4clj.core --coverage-command …` |

읽히는 것 셋:

**1. 아무도 coverage 퍼센트를 게이트로 쓰지 않는다.** 셋 다 없다. 그래서 "커버리지가 없어서
기준이 없다"는 결론은 성립하지 않는다. (이 문서를 쓰기 전 내가 GLG에게 "가장 싼 첫 걸음은
`@vitest/coverage-v8`"이라고 권했고, pi-mono와 herdr를 재고 **철회했다.** 기록으로 남긴다.)

**2. 셋 다 "테스트가 행동 옆에 있다"를 각자의 언어 관용구로 만족한다.**
TS는 패키지별 `test/`, Rust는 파일 안 `#[cfg(test)]`, Clojure는 헌법 문장. 이것이 렌즈 5의
언어 독립 축인 이유는 `ls`/`grep` 한 번에 재기 때문이다. **다만 표본 3으로 "형태의 법칙"을
주장하지 않는다**(위 한계 선언) — 렌즈는 재는 방법이고, 무엇이 옳은지의 판정이 아니다.

**3. 셋 다 게이트 코드 자신을 검증한다.** 이건 아무도 말로 하지 않았는데 셋 다 한다.
검증 코드가 커지면 그 자체가 코드이기 때문이다.

**herdr의 `maintenance-test`는 GLG 저널의 정확한 대응물이다.** 저널이 걱정한
*"문서, 주석, 코드 테스트에 불일치"*를 herdr는 **테스트로 잡는다** (read `justfile:15-17`):

```
scripts.test_changelog                    CHANGELOG 자체
scripts.test_config_reference_check       설정 문서 ↔ 실제 설정 키
scripts.test_docs_translation_parity      문서 번역 짝
scripts.test_agent_detection_manifest_check
scripts.test_unix_installer / test_windows_cross / test_vendor_*
scripts.test_ui_hot_path_architecture     아키텍처 경계 강제
```

**그리고 이것은 밥 마틴의 "프롬프트를 테스트하지 마라"와 모순되지 않는다.** 구분이 있다:

| 밥 마틴이 금지한 것 | herdr가 하는 것 |
|---|---|
| **프롬프트 문구**를 `str/includes?`로 찝기 — 에이전트에게 주는 지시의 wording | **두 산출물 사이의 구조적 계약** — 설정 레퍼런스가 실제 키와 맞는가, 번역 짝이 있는가 |

전자는 산문의 표현을 고정하는 것이고 후자는 계약을 검사하는 것이다. GLG가 걱정한
*"새로 넣은 기능에 대해서만 장황하게 자랑하듯이 써놓을 것"*은 **후자로 잡힌다.**

---

### C. entwurf 실측 — 격차의 정확한 위치

같은 축으로 entwurf를 재봤다 (측정 2026-09-18, `~/repos/gh/entwurf`).
`package.json` version은 **0.22.0**이고, GLG는 0.23.0이 오라클에서 릴리즈 중이라고 전했다(inherited).

```
런타임        pi-extensions   27,083 줄 (69 파일)
              mcp                893 줄 (1 파일)
                               ──────────
                              ~28,000 줄

게이트        scripts         65,734 줄 (164 파일)    ← 런타임의 2.3배
게이트 개수   142 (check-* 122 + smoke-* 20)   ← 첫 판의 143은 산술 오류였다

vitest        4,893 줄 (11 파일) — 전부 루트 test/ 한 곳
pi-extensions 디렉터리 안의 테스트 파일: 0

coverage      @vitest/coverage-* 미설치, vitest.config.ts에 coverage 블록 없음
복잡도        없음
mutation      없음
AGENTS.md 안의 coverage|complexity|mutation|crap 언급: 0건
```

세 코드베이스와 나란히:

| | pi-mono | herdr | entwurf |
|---|---|---|---|
| 테스트 / 소스 | **77%** | `#[cfg(test)]` 품은 파일 **49%** | **17.5%** (4,893 / 28,000) |
| 런타임 옆 테스트 | 패키지마다 | 소스 파일 안 | **`pi-extensions/` 69파일에 0개** |
| 게이트 스크립트 **자신**의 테스트 | 있음 | 있음 | **없음** — 단, 게이트가 런타임 순수 로직을 직접 검증하는 사례는 있다(§C 회수) |
| 문서↔코드 게이트 | 있음 | 있음 | **있음 — 18/164 스크립트**가 `AGENTS.md`/`README.md`/`CHANGELOG.md`/`NEXT.md`를 읽는다 |

마지막 줄은 entwurf의 강점이므로 분명히 적는다. **문서 계약 축은 이미 있다.**

#### 회수됨 — 이 절의 첫 진단은 기함 사례에서 틀렸다

이 문서의 첫 판은 이렇게 썼다:

> ~~entwurf는 검증을 런타임 바깥으로 밀어냈다. 게이트가 리포 밖 경계에서 end-to-end로 찝고,
> 런타임 안쪽의 순수 판단 로직은 그 게이트를 통해서만 간접적으로 닿는다. 그리고 그 65,734줄의
> 게이트 코드는 아무도 검증하지 않는다.~~

2026-09-18 terra(`openai-codex/gpt-5.6-terra`) 교차검수가 `file:line`으로 회수했고,
나도 직접 열어 확인했다 (measured, entwurf HEAD `ba6a4e3`):

- `pi-extensions/lib/entwurf-v2-decider.ts:185-195` — `DispatchDeciderDeps`의 **모든 IO seam이
  기본값 없는 required dep**다. 주석 원문: *"Every IO seam is a REQUIRED dep (no default):
  **the decider performs ZERO IO of its own.** The live wrappers (5c) wire the real fns;
  the gate injects fakes. **This is what makes 'pure decider' honest** — there is no hidden
  default that touches `~/.pi`."*
- 같은 파일 `:14-20`은 그 설계에 이름을 붙여 규율로 적어놨다:
  **`step 4 discipline = gate-first → pure-before-IO → wire`**.
- `scripts/check-entwurf-v2-decider.ts` — 그 export를 **fake deps로 직접 import**해
  `decideDispatch`를 구동한다. subprocess 없음. assertion 호출 **91개**
  (measured: `grep -Ec '^[[:space:]]*ok\(' scripts/check-entwurf-v2-decider.ts`),
  `run.sh:1203-1212`가 직접 실행.

  **왜 91이고 93이 아닌지 적어둔다** — 느슨한 `grep -c 'ok('`는 93을 준다. 차이 2건은
  assertion이 아니라 헬퍼 정의부다(`:54 function ok(`, `:55 assert.ok(cond, label)`).
  내가 첫 판에 93을 쓰고 terra가 91을 썼다가 서로 명령을 대조해 갈렸다. **같은 리포·같은
  파일에서 두 형제가 다른 수를 낸 이유가 순전히 grep 패턴 차이였다는 것이, 이 문서가
  측정 매니페스트를 다는 이유의 가장 작고 선명한 사례다.**

즉 **밥 마틴의 "Maximize testable code and minimize the unsuitable boundary"를 entwurf는 이미
하고 있고 자기 이름까지 붙여놨다.** 내가 "게이트 이름이 순수 로직의 존재를 증언한다"며 그
로직이 subprocess를 통해서만 검사된다고 쓴 것은, **그 게이트를 열어보지 않고 이름만 보고 쓴
추측**이었다.

밥 마틴 `engineering.prompt` § Design And Testability는 여전히 읽을 값이 있다 (read):

> Separate testable modules from environmentally unsuitable modules… **Maximize testable code
> and minimize the unsuitable boundary.**

**다만 이 문장은 entwurf에 대한 처방이 아니라 entwurf가 이미 통과한 시험이다.**
`gate-first → pure-before-IO → wire`가 그 문장의 구현이다. 그리고 subprocess 게이트가 큰 것은
bridge/IPC 프로젝트에서 **정당한 선택**이다 — 경계가 진짜로 거기 있기 때문이다.

#### 그래서 남는 것은 진단이 아니라 미결정 둘이다

회수 후에도 **재현되는 사실** (measured, HEAD `ba6a4e3`):

1. `pi-extensions/` 69파일에 `.test.ts`가 0개이고, `vitest.config.ts:4-18`의 include가
   `test/**/*.test.ts`라 **런타임 옆에 `.test.ts`를 두어도 현 설정으로는 실행되지 않는다.**
2. 특정 게이트 스크립트 **자신**의 별도 테스트는 없다. — 이것은 "`scripts/` 65,734줄 전체가
   미검증"과 **다른 주장**이다. 후자는 전체집합 영수증이 없었고 회수한다.

이 둘은 결함이 아니라 **미결정**이다. 검증이 없는 것이 아니라 `run.sh` 레인에 있고 Vitest
레인에는 없다. 어느 레인에 둘지는 runner·파일배치 결정이며 **IO 경계 결정이 아니다.**
`vitest.config.ts` 주석 자신이 그것을 `issue #62`의 열린 항목으로 적어놨다.

---

### D. entwurf 담당자에게 **그냥 보라고** 넘길 것

**이 절의 성격은 GLG가 2026-09-18에 정했다.** 나는 "가이드인가 선택지 제시인가"를 물었고,
답은 둘 다 아니었다:

> **"가이드? 권고? 아니야. 그냥 보라고 하는 거야. 고민을 해야 하니까."**

그래서 §D는 **판단을 대신하지도 않고, 선택지를 차려 놓지도 않는다.** 목적은 담당자가
**고민할 재료를 갖는 것**이다. 이 구분이 실무적으로 중요하다:

- 가이드라면 "이렇게 하라"가 되고, 틀렸을 때 담당자의 턴을 방어에 쓰게 한다(오늘 §D2가 그럴
  뻔했다).
- 선택지 제시라면 "A와 B 중 고르라"가 되는데, 그것도 **고민의 범위를 내가 미리 좁힌 것**이다.
- 그냥 보라는 것은 셋 중 가장 약하고 가장 정직하다. **아무것도 고르지 않아도 읽은 것이
  남는다.**

따라서 아래를 읽는 담당자에게 요구되는 행동은 없다. 답하지 않아도 되고, 반박하지 않아도 되고,
"이미 하고 있습니다"로 끝내도 된다 — 실제로 §D2가 그랬고, 그 회수가 이 집 몫이었다.

**먼저 공정하게: entwurf는 이 방향을 이미 알고 있고 적어놨다.** `vitest.config.ts` 주석 원문(read):

> Vitest pilot (issue #62). Scope: `test/**`. The hand-built `scripts/check-*` gates stay
> outside — **they migrate lane by lane, each behind its `run.sh` transition shim.**

그러니 §C는 **entwurf가 놓친 발견이 아니다.** 계획은 이미 있다. 이 문서가 더하는 것은
**그 계획의 속도를 정할 근거**다 — 이웃 둘의 실측 수치와, 릴리즈 시점이라는 사실.

넘길 재료 넷:

**D1. 대조 수치.** 위 §B·§C 표. 테스트/소스 비율 77% · 49% · 17.5%, 게이트 코드 자기검증
있음·있음·없음. 이건 우열이 아니라 **형태의 위치**다. issue #62의 "lane by lane" 속도를
정할 때 "지금 어디에 서 있는가"의 좌표가 된다.

**D2. 열린 질문 — 이미 있는 pure gate를 Vitest 레인으로 옮기면 무엇을 얻고 무엇을 잃는가.**

**이 항목의 첫 판은 제안이었고 철회했다.** 첫 판은 *"decider의 순수 함수를 런타임 옆
`.test.ts`로 직접 찝어보라"*고 권했는데, §C가 보인 대로 **그것은 이미
`check-entwurf-v2-decider`가 하고 있다**(fake deps 직접 import, assertion 93개). 존재하는
검증을 못 찾고 만든 제안이라 그대로 넘기면 담당자가 방어에 턴을 쓴다.

남는 것은 결정이 아니라 질문이고, 답은 담당자가 안다:

- `run.sh` 레인의 deterministic gate와 Vitest 레인은 각각 무엇을 주는가? (watch, 실패 보고
  형태, 생태계 도구 접근 ↔ 단일 진입점, `check-elapsed` 계측, `transition shim` 이행 경로)
- `pi-extensions/` 옆에 테스트를 두는 것이 값이 있는가, 아니면 `test/` + `scripts/` 분리가
  이 프로젝트에 맞는가? **파일 배치 결정과 IO 경계 결정은 별개**이고, IO 경계는 이미
  `gate-first → pure-before-IO → wire`로 서 있다.
- 게이트 스크립트 **자신**의 테스트는 필요한가? 이웃 둘은 한다(§B). 그런데 그 둘의 게이트는
  주로 저장소 위생(pinned-deps, changelog, translation parity)이고 entwurf의 게이트는 런타임
  계약이다 — **같은 종류가 아닐 수 있다.**

coverage 퍼센트를 단독 게이트로 붙이는 것은 여전히 권하지 않는다(§B).

**D3. 게이트 코드 자기검증은 이웃 둘이 다 하고 있다.** pi-mono는
`node --test scripts/*.test.mjs`, herdr는 `maintenance-test`의 python unittest 11개 모듈.
entwurf의 `scripts/` 65,734줄에는 대응물이 없다. 이건 새 설계가 아니라 **선례가 둘 있는 형태**다.

**D4. 릴리즈 시점 — 사실과 예측을 분리해서 적는다.**

- **사실 (inherited, 출처 GLG):** 0.23.0이 오라클에서 릴리즈 중이고 herdr 플러그인 0.2.0으로도
  나간다. herdr에 들어가면 사용층이 넓어질 수 있다. 설치가 쉬워 쓰기 편하다는 것은 GLG가 직접
  테스트했다.
- **예측 (proposal — 측정되지 않았다):** *"사용층이 넓어지기 전이 검증면을 조일 마지막 싼
  시점"*이라는 것은 비용 예측이다. 나는 이 프로젝트에서 호환성 비용을 측정한 적이 없다.
  담당자가 반대로 판단할 근거를 가지고 있을 수 있다 — 예컨대 지금은 기능이 계약을 정하는
  단계이므로 검증면을 먼저 굳히면 그 계약을 잘못 굳힐 수 있다. **긴급성으로 읽지 말 것.**

**D5. 임계값은 tune 대상이다 — 단, 한 방향이 아니다.**

**사실 (read at `24:55`/`25:40`):** CRAP 임계값이 4 → 6 → 12로 완화됐고, 이유는 *"모델이
좋아져서 draconian할 필요가 없다"*였다.

**그리고 같은 사람의 일반 입장 (read at `49:37`, §A-4):** *"어떤 건 restrictions를 풀고
**어떤 건 조인다**. tune해 나간다. 그게 내가 있는 진영이다."*

**내 제안 (proposal — 그의 발화가 아니다):** 그래서 §D2를 "통과 기준"으로 설계하지 말고,
깨질 때 원인을 말해주는 자리를 만드는 데 먼저 쓰는 것이 낫다고 본다. *"느슨한 임계값을 가진
살아있는 게이트가 엄격한 임계값을 가진 없는 게이트보다 강하다"*는 문장은 **내가 만든 격언이고
그가 한 말이 아니다** — 첫 판에서 이것을 그의 실천에서 도출한 결론처럼 적었고 회수한다.

**D6. 20배 — 원문이 내 분해를 반박한다. 두 번 회수했다.**

정본 원문 (read at `transcript:297-298`, 즉 cue `[34:11]`):

> I get **far better results working with a single agent and just interacting with that agent**
> than I do by putting the job into a harness and then watching it move through the steps of
> the harness, you know, **deeply constrained and lots of discipline**. And out the back end
> comes this thing that **cost me 20 times as many tokens** and I still have to sit there and
> interact with it to get it to be just right.

바로 다음 (read at `34:45`): *"maybe this is just the wrong model entirely… Although
**we still need some kind of discipline in there**. [laughter]"*

**회수 1 — 방향.** 나는 *"단일 에이전트가 토큰을 20배 절약한다"*고 썼다. 원문은
**"하네스 경유가 20배 더 든다"**다. 같은 수가 아니다.

**회수 2 — 인과 분해. 이번엔 영수증이 없는 정도가 아니라 원문이 반대로 말한다.**
나는 *"20배는 역할·handoff·파이프라인의 비용이고 CRAP·mutation은 거기 안 들어간다"*고 썼다.
그런데 원문에서 비난 대상인 그 하네스를 수식하는 말이 **`deeply constrained and lots of
discipline`**이다. **discipline이 20배를 쓴 그것 안에 있다.** 분해를 지지하지 않고 막는다.

**층 표시:** **개인 경험 보고**다. 실험 방법도 반복 횟수도 없다. `measured`가 아니라
`read at 34:11`이다.

**그래서 §D에 남는 것:** 34:11은 "조율층을 빼라"는 처방으로도, "게이트는 20배 밖에 있다"는
안심으로도 읽을 수 없다. 남는 것은 **하네스 경유가 그에게 비쌌다는 한 사람의 보고** 하나다.

이 구분을 §D에 두는 이유는 하나다. entwurf 검증면을 조이자는 이 문서의 제안이
**"entwurf에 조율층을 더 얹자"로 오독될 수 있다.** 정반대다. 34:11은 조율층을 빼라고 하고,
이 문서는 **검증면을 안쪽으로 당기라**고 한다. 둘은 같은 방향이다 — 둘 다 중간층을 줄인다.
`scripts/` 65,734줄은 지금 entwurf의 중간층이고, 그것을 런타임 안쪽 테스트로 대체하는 것은
층을 늘리는 일이 아니라 줄이는 일이다.

(연결: 이 집의 `subtract` 스킬과 GLG의 2026-09-14 메모 *"더 뭔가 entwurf에 하고 싶지는
않다… 산으로 갈 수도 있다"*가 33:00의 자기 브레이크와 같은 반사다. org 담당자가
2026-09-18에 이 대응을 짚었다 — 다만 **층위가 다르다**는 것도 같이 짚었다: 밥 마틴이 빼는
이유는 효과·비용이고, GLG가 빼는 이유는 존재 대 존재라는 관계축이다. 결론이 같아도 근거가
다르므로, 비용이 뒤집히는 날 두 결론은 갈릴 수 있다.)

**넘기지 않는 것:** 무엇을 언제 어떤 순서로 할지. 그것은 entwurf 담당자와 GLG의 몫이다.
이 문서는 좌표와 선례만 준다.

---

### 미해결

- **`crap4clj` 실측이 1개 리포뿐이다.** `abductcli`만 쟀다. `voscli`(src 31/test 36),
  `incidentcli`(37/33)는 미측정이고 work 소속이라 별건이다.
- **TypeScript에 CRAP 대응물이 없다.** 그리고 직접 만드는 것은 밥 마틴 가드레일이 금지한
  "대용품 발명"에 해당한다. **판정 미정** — 만들지 않는 쪽이 그의 정신에 가깝고, 그렇다면
  entwurf에 CRAP축은 영구히 없다는 뜻이 된다. 대신 §B의 "배치와 밀도" 축으로 간다.
- ~~**"harness를 끄자 token consumption" 20배가 무엇 대비인지 미확인**~~ **닫혔다** —
  terra 2차가 정본 34:11을 직접 대조했고 나도 재확인했다. **방향이 내 것과 반대였고**(하네스가
  20배 더 쓴다), **개인 경험 보고**이며, `deeply constrained and lots of discipline`이 하네스를
  수식하므로 **내 인과 분해는 원문에 의해 반박된다**. §D6 참조.
- ~~**정본 인용 9개 중 4개만 원문을 읽었다**~~ **닫혔다** — terra 2차가 22:18 / 24:55 /
  25:40 / 27:55 / 28:46 / 30:22 / 31:24·32:22 / 33:00–33:46 / 34:11 전부를 원본 대조했다
  (read receipt: `transcript:189-303,480-542,555-723`). 이제 전부 `read at`로 승격 가능하되
  **화자·시각·개인보고/해석의 층을 분리해서** 적어야 한다 — 그 분리를 안 해서 33:00의 화자를
  틀렸고 31:24와 32:22를 한 시각으로 합쳤다.
- ~~**CRAP 임계값 4 → 6 → 12의 단위가 미확인이다.**~~ **닫혔다** — 정본 25:40을 직접 읽어
  CRAP 점수 임계로 확정했다(`driving it to four` … `maybe six. Now I'm at 12`). 완화 이유
  (모델이 좋아져서 draconian할 필요가 없다)와 시점(`January until maybe two weeks ago`)도
  같은 구간에 있다.
- ~~**정본 63분 중 하네스 구간만 읽었고 53–63분 신입 교육론이 §D와 걸릴 수 있다.**~~
  **닫혔고, 내 위치 추정이 틀렸다.** 신입 교육론은 53–63분이 아니라 **49:37–51:00**이고,
  terra 2차가 열어서 §A-4로 들어왔다 — **그리고 §D와 걸리는 정도가 아니라 문서 프레임을
  제한하는 대항 영수증이었다**(`어떤 건 풀고 어떤 건 조인다`, `그게 내가 있는 진영`).
  내가 "미측정"으로 둔 구간에 결론을 흔드는 것이 있었다.
- **52:23–54:24는 terra 경유이고 내가 직접 열지 않았다.** `same principles apply, different
  thresholds`, 그리고 에이전트 산출물이 좋은 것은 *"자신이 적용한 constraints와 실행시킨
  tests 때문"*이라는 대목. §A-4가 이것에 의존한다.
- **0–22분과 35–49분은 아직 아무도 이 문서를 위해 읽지 않았다.** 49:37이 프레임을 바꾼
  선례가 있으므로, 이 구간에 또 무엇이 있을지 모른다는 것이 이 문서의 현재 최대 미지다.
- **herdr의 coverage 부재는 `justfile`만 읽은 결과다.** CI 워크플로나 `Cargo.toml`의
  별도 설정은 미확인.
- **`platoon-brainstorm.md`(402줄)와 `handoff-protocol.md`(606줄)를 정독하지 않았다.**
  특히 platoon의 *"승인된 계약 버전은 immutable, 개정하면 영향받는 squad를 지목하고 호환 안
  되는 통합을 차단한다"*는 우리 cross-repo 조율 규범과 정면으로 비교된다.

---

### E. [2026-09-18] terra 교차검수가 회수한 것

이 문서는 작성 당일 `openai-codex/gpt-5.6-terra`(garden id `20260918T163921-c1566c`)에게
교차검수를 맡겼다. **회수된 주장이 8건이고, 그중 하나는 §D의 핵심 제안을 무효화했다.**
회수 내용은 위 각 절에 인라인으로 반영했고, 여기에 목록만 둔다 — 다음 읽는 형제가 같은
주장을 다시 세우지 않도록.

| 회수된 주장 | 그것을 회수한 영수증 |
|---|---|
| "순수 판단 로직은 게이트를 통해서만 간접적으로 닿는다" | `entwurf-v2-decider.ts:14-20,185-195` — `gate-first → pure-before-IO → wire`, 모든 IO seam이 required dep. `check-entwurf-v2-decider.ts`가 fake deps로 직접 import |
| §D2 "decider를 골라 런타임 옆에서 직접 찝어보라" | 위와 같음 — **이미 하고 있다.** 열린 질문으로 교체 |
| "65,734줄 게이트 코드는 아무도 검증하지 않는다" | 전체집합 영수증 없음. "특정 게이트 자신의 테스트가 없다"와 다른 주장 |
| "셋이 독립적으로 같은 답을 냈다 → 형태의 문제" | 77%/49%/17.5%의 분자·분모가 다름. 독립성은 측정 안 됨. 표본 1 + 규범 문장 혼합 |
| "셋 다 coverage 게이트 없음" | 밥 마틴은 coverage를 CRAP 공식의 *입력*으로 쓴다. → "독립 단독 % threshold 없음"으로 한정 |
| SwarmForge "게이트 코드 자신의 테스트 있음" | `bb.edn:38-64`는 스크립트를 CRAP **대상**으로 삼는 것. wiring 테스트 증거 아님 |
| 28:46 → "측정된 한계" / "GLG 방식의 정확한 대응" / "저널 자기평가를 취소" | 한 인터뷰 발화. 통제 실험 아님 → "독립 사례"로 하향 |
| D6 "20배는 조율층 비용이고 CRAP은 안 들어간다" | 발화가 그 분해를 하지 않음. 내 추론 |

**수치 정정 2건** (terra가 직접 고침): pi-mono 패키지 test 디렉터리 11 → **10**
(`find packages -mindepth 2 -maxdepth 2 -name test`), 문서 읽는 게이트 스크립트 15 → **18**
(`rg -l 'AGENTS.md|README.md|CHANGELOG.md|NEXT.md' scripts --glob '*.ts'`).
게이트 개수 143 → **142** (122 + 20 산술 오류, 내가 고침).

#### 2차 (정본 전수 대조) — 회수 6건 더

terra가 `transcript:189-303,480-542,555-723`을 직접 대조했다. 1차가 코드를 열어 §D2를
무효화했고, **2차는 정본을 열어 §A·§D6의 서사를 무효화했다.**

| 회수된 주장 | 그것을 회수한 영수증 |
|---|---|
| "단일 에이전트가 토큰을 20배 절약한다" | 원문은 **"하네스 경유가 20배 더 든다"**. 같은 수가 아니다 |
| "20배는 조율층 비용, CRAP/mutation은 제외" | 원문이 그 하네스를 **`deeply constrained and lots of discipline`**으로 수식한다. 분해를 **막는다** |
| 34:11을 "실측 고백"으로 표기 | 실험 방법·반복 없음 → **개인 경험 보고**, `read at` |
| "33:00에 밥 마틴이 자기조롱하며 스스로 멈췄다" | **33:00은 진행자의 Exoharness 소개**. 마틴의 반응은 **33:42–33:46**. 브레이크·반사는 내 서사 |
| "31:24에 harness 개념이 틀렸다고 선언" | 31:24는 SwarmForge·수개월, 그 결론은 **32:22**. 두 시각 |
| "말로 제제하면 딴지, 도구가 판정하면 사실" / "게이트 자체를 끝까지 유지" | 원문은 *"constraints는 필요하지만 덜 draconian"*까지. 최근 커밋은 계속 실행을 증명하지 않는다 |

**그리고 2차는 회수만 한 것이 아니라 내가 못 본 대항 영수증을 가져왔다** — 49:37–51:00의
*"어떤 건 풀고 어떤 건 조인다. 그게 내가 있는 진영"* + 신입 교육론, 52:23–54:24의
*"same principles apply, different thresholds"*. §A-4가 그것이다. **내가 "미측정"으로 넘긴
구간에 문서 프레임을 제한하는 것이 있었다.**

**§D를 넘기기 전에 닫아야 할 조건** (terra 제시):

1. ~~D2를 "기존 pure gate의 Vitest migration이 주는/잃는 것"이라는 열린 질문으로 교체~~ — **완료**
2. ~~runtime IO boundary와 test-runner/파일배치 경계를 분리~~ — **완료** (§C 미결정 둘)
3. ~~보편·비용 문장을 관측 / inherited / proposal로 재표기~~ — **완료** (§B 한계 선언, D4, D6)
4. **담당자가 고를 수 있는 선택지와 trade-off만 남기기** — **미완.** §D1·§D3의 대조 수치가
   아직 "이웃은 하는데 우리는 안 한다"로 읽힐 수 있다. 정규화되지 않은 비율(§B 한계)을
   §D1이 "좌표"라고 부르는 것도 다시 볼 자리다.

**2차 후 추가된 조건:**

5. **§A-4의 대항 영수증이 §D 전체를 통과해야 한다.** *"버리지 말고 tune — 어떤 건 풀고 어떤
   건 조인다"*와 *"에이전트 산출물이 좋은 것은 내가 적용한 constraints와 실행시킨 tests
   때문"*은, 이 문서를 "검증면을 조이자"로도 "조율층을 빼자"로도 읽을 수 없게 만든다.
   §D가 어느 쪽으로든 기울면 A-4와 모순된다.
6. **52:23–54:24와 0–22분·35–49분을 누군가 읽어야 한다.** 49:37이 프레임을 바꾼 선례가 있다.

즉 **지금 상태로 넘기지 않는다.** 남은 것은 4·5·6이고, 4번은 GLG가 §D의 목적(가이드인가
선택지 제시인가)을 정해야 닫힌다. 5·6은 읽으면 닫힌다.

**이 문서가 하루에 네 번 깎였다는 사실 자체를 기록으로 남긴다** — GLG의 되물음(§A "폐기"
철회), 대담 정본 1차(§A-2 정정), terra 1차(§C·§D2 무효화), terra 2차(§A·§D6 서사 무효화).
네 번 모두 **나는 증거 한 조각에서 결론까지 너무 멀리 갔다.** 다음에 이 문서를 만지는 형제는
그 양상을 먼저 의심하면 된다.

### 다시 볼 때

정기 추적하지 않는다. 다음 중 하나가 바뀔 때만 날짜를 붙여 덧붙인다.

- `swarm-forge`에 커밋이 다시 붙거나 archived로 바뀐다 (= 위 §A의 해석이 흔들린다)
- `crap4ts` 또는 TypeScript용 대응물이 나온다
- entwurf issue #62의 lane 이동이 실제로 일어난다 (= §C·§D의 수치가 낡는다)
- 이웃(pi-mono / herdr) 중 하나가 coverage 게이트를 도입한다 (= §B의 "아무도 안 쓴다"가 깨진다)

화면·역할 수·토폴로지 개수가 늘어난 것은 갱신 사유가 아니다.
