# LETTA — MemGPT의 계보와 FrontierMemory, 기억을 둘러싼 관측

Letta Code라는 **지속 에이전트 제품**과 FrontierMemory라는 **기억 효과 평가면**을 함께 관측한다. 같은 조직의 연구·제품·평가를 잇되, FrontierMemory를 Letta Code의 기억 엔진으로 부르지 않는다. 도입·우열 판정이나 실행 계획이 아니라, 다음 조사에서 되돌아올 자리다.

GLG의 요청 `[직접, 2026-10-24]`: 힣닷과 나눈 대화를 출발점으로 관측 대상을 추가하고, 특히 FrontierMemory를 읽어 Andenken과 기억축을 논의한다. 비공개 대화는 조사 동기이며 원문·개인 맥락을 이 공개 문서에 전재하지 않는다. 아래 기술 근거는 공개 자료를 별도로 읽었다.

## 상태 — 2026-10-24

- **등록:** 하네스벤치의 새 관측 대상. Letta Code·FrontierMemory 공개 소스/문서 READ, 설치·상류 테스트 스위트·모델 과제/벤치마크 재현·데이터셋 다운로드·임베딩 0. 공개 검증도구의 순수 함수는 별도 합성 입력으로 호출했다(아래 교차검토). 읽기 전용 조사와 GLG가 요청한 Opus 형제와의 토론만 진행한다.
- **소스 좌표 `[측정: GitHub API]`:** Letta Code `75d7921f1666b92b4a82acca64e5ef09001c1eb3`, package `0.34.23`; FrontierMemory `49bea0f33a72da9771f8ef853ed7e48b69bf53df`, package `0.1.0` / 공개 평가명 `1.0`. package 버전과 평가 버전은 다른 값이다. [LC-package] [FM-package]
- **공개 시점의 경계 `[READ/측정]`:** 발표 글은 `Letta Research · October 2026`이라고 표시한다. GitHub 저장소 `created_at`은 `2026-10-23T02:51:56Z`다. 저장소 생성 시각을 발표일·공개 전환일로 확정하지 않는다. [FM-post] [FM-repo]
- **서 있는 곳:** 기억을 잘 찾는가에 더해 **그 경험이 다음 행동을 바꾸는가**를 묻는 평가 설계가 중심이다. 점수는 발표자의 보고이고 이 집의 재현 결과가 아니다. `entwurf#151`의 정체성·원문 계보·refresh 연구를 이 점수로 인증하거나 구현 승인으로 바꾸지 않는다. [FM-post] [E151]

## [2026-10-24] 기원 — 대학 연구에서 제품·운영 서비스·평가 체계로

`[공식 자료 READ]` UC Berkeley Sky Computing Lab은 MemGPT를 제한된 문맥 안에서 저장 계층을 관리하는 virtual context management 연구로 소개한다. 문서 분석과 여러 세션에 걸친 대화를 평가 대상으로 든다. 단지 대화 파일을 오래 보관하는 기법이라는 설명은 아니다. [MemGPT-lab]

`[공식 회사 발표 READ, 2024-09-23]` Letta는 MemGPT가 UC Berkeley 연구에서 시작했으며, 이름을 원래의 self-editing-memory 설계 패턴과 에이전트 프레임워크로 구분한다고 설명한다. 회사의 상업적 제공은 배포 용이성·성능·디버깅/모니터링 UX에 초점을 둔다고 밝혔다. 현재 홈페이지도 연구를 소프트웨어로 출하한다고 말한다. 당시 사업 설명을 오늘의 가격표나 매출 구조로 확대하지 않는다. [Origin] [Company]

`[해석]` 따라서 “하네스가 많은데 왜 하나 더 만드는가”의 한 답은 **모델 위에서 축적되는 경험의 자리를 제품으로 삼는 것**이다. 연구 → 지속 에이전트 → 기억·정체성의 운영 → 평가 질문으로 이어지는 흐름으로 관측한다. 수익성·데이터 종속의 정도는 이번에 측정하지 않았다.

## [2026-10-24] FrontierMemory — 회수 시험과 행동 개선 시험을 구분한다

### 무엇을 평가하는가

`[발표/README READ]` 과거 trajectory를 읽는 **memory agent/model**과, 생성된 기억으로 새 과제를 푸는 **task agent/model**을 분리한다. 평가 대상은 기억을 얼마나 많이 재현했는지만이 아니라 과거 경험에서 배운 계약·선호·환경 지식이 후속 과제의 verifier 통과에 기여하는가다. 한 memory-generation 결과를 15개 과제에 사용하고, 무기억 대조군과 비교한다. 발표는 과제의 solvability 검토에 gold memory도 사용했다고 설명한다. gold-memory 검토와 공개된 모든 비교에 gold 대조군이 포함됐다는 주장은 구분한다. [FM-readme] [FM-post]

| 기억 종류 | 발표의 예시를 일반화한 질문 | 이 집에서 이어 물을 것 |
|---|---|---|
| task memory | 이전 실패에서 빠진 입력 계약을 배웠는가 | 사실을 찾은 뒤 이번 과제에 맞게 적용했는가 |
| user memory | 반복 피드백에서 표현·작업 선호를 배웠는가 | 인용과 사용자 채택, 일회성 요청과 지속 선호를 구분했는가 |
| environment memory | 도구·작업공간의 숨은 사용 조건을 배웠는가 | 옛 환경에 과적합한 규칙을 현재에도 강요하지 않는가 |

`[발표자 주장 READ]` 글은 LoCoMo·LongMemEval 등을 회수 중심 평가로 소개하고, 기억을 통한 후속 행동 개선을 차별점으로 삼는다. **기존 벤치마크는 생일 암기뿐이 아니다.** 공동 조사에서 코디는 원 저장소 README를, Opus는 원 논문까지 교차 읽었다. LoCoMo에는 다중/시간 추론·답변 불가능한 질문과 event summarization이 있고, LongMemEval에는 knowledge updates·abstention·선호를 반영한 답변이 있다. 출력이 QA에서 과제 수행으로 옮겨간 차이는 유용하지만, 기존 평가의 동적 기억 범위를 지우거나 “포화”를 이 조사에서 재현한 사실처럼 쓰지 않는다. [FM-post] [LoCoMo] [LongMemEval]

### 발표 실험과 현재 공개 프로토콜은 같은 스냅샷이 아니다

| 항목 | 발표 글 READ | 고정한 GitHub 소스 READ |
|---|---|---|
| 과제/경험 | 15개 과제, 관련 trajectory `219 / 665`라고 기술 | README는 fixed corpus `674` trajectories라고 기술 |
| 시도 | Figure 2는 과제당 **1회**라고 명시 | CLI 기본 `-k=3`, 규칙도 과제당 **3회** 요구 |
| 공식 제출 | 글의 비교 결과 | 매번 새 기억을 생성한 **독립 3 runs**, run마다 과제당 3회; 시도 3회를 독립 run 3개로 세지 않음 |
| 비용 | token/list-rate 기반 task 비용, **dreaming 제외** | memory generation은 최대 6시간; 일부 verifier는 LLM judge API 필요 |
| 모델/하네스 | memory/task 모델 조합 및 native task harness를 함께 사용; 상단 표는 두 task 모델 중 더 나은 결과를 표시 | memory generation과 task execution을 별도 adapter로 받으며, 동일 task model/effort의 no-memory와 비교하도록 규정 |

근거: [FM-post], [FM-readme], [FM-rules], [FM-cli]. **665↔674와 실험 조건의 변경 사유는 아직 대조하지 않았다.** 두 자료를 섞어 하나의 재현 명세나 통계로 쓰지 않는다. 과제당 1회의 15개 결과를 수개월의 관계·기억 품질로 일반화하지 않으며, dreaming·판정·인프라를 빼고 전체 운영 비용이라고 말하지 않는다.

`[설계 READ]` 현재 버전은 **고정된 과거 경험 → offline 기억 생성 → 후속 과제**다. 발표의 Future Work도 긴 시간축·온라인 점진 갱신·하네스 변경을 향후 축으로 둔다. 따라서 장기 기억 연구에는 직접 관련되지만, 같은 존재가 여러 달 온라인으로 학습하는 전체 생활을 실증한 것은 아니다. [FM-post]

### “자기 제품에 유리한 시험”이라는 의심도 검증 가능한 질문으로

`[해석/연구 질문]` 기억 의존 과제를 골랐다는 것 자체는 목적에 맞는 설계다. 다만 아래를 분리해야 자기 제품의 이점과 일반적인 기억 효과를 구별할 수 있다.

1. 같은 task model·effort·도구·prompt·memory loader를 고정한 상태에서도 memory generator 차이가 남는가. native harness까지 바꾸는 비교는 어떤 질문에만 답하는가.
2. no-memory의 과제 정보가 의도적으로 불완전할 때, 추가 정보의 효과와 **경험에서 그 정보를 배우는 능력**을 gold-memory/learned-memory 대조로 구분하는가.
3. 기억 생성 비용까지 포함한 이득은 얼마인가. 15개 과제에서의 효과가 새 과제·다른 기간에도 유지되는가.
4. 수정된 verifier가 독립적으로 검토되는가. 발표의 “53%”는 **채택한 원천 과제 중** 발견했다는 보고이지, 모든 기존 벤치마크의 절반이 잘못됐다는 통계가 아니다. [FM-post]
5. 발표가 유용한 memory를 발견한 것과 Letta가 모든 기억·관계 문제에서 우월하다는 것은 별개다. 순위 재현은 이번에 하지 않았다.

## [2026-10-24] Letta Code — 경험의 원본과 다듬은 기억을 나누어 본다

`[README/소스 READ]` Letta Code는 stateful agent harness를 표방하고, `agent_id` 아래 여러 conversation의 경험과 기억을 연결하는 문맥 구조를 설명한다. MemFS는 Git 기반 기억 투영이며 core memory·외부 파일·skills·공유 기억을 구분한다. root prompt는 recall 원본을 불변으로 설명하지만, **프롬프트의 선언만으로 저장 엔진의 무변조를 인증하지 않는다.** [LC-readme] [LC-memory]

`[프롬프트 READ]` 특히 “파일을 고쳤다”와 “현재 턴의 문맥이 바뀌었다”를 구분한다. committed revision이 이후 recompile에 반영되는 구조라고 명시하고, memory worker의 private worktree와 merge를 설명한다. 이 항목은 문서/설계 읽음이며 충돌·복구·실제 장기 운영을 시험하지 않았다. [LC-memory]

`[reflection 지침 READ]` reflection은 이전 대화에서 실수·수정·선호·반복 절차를 찾아 기억과 skill을 고치도록 작성되어 있다. 원문 보관과 행동에 영향을 주는 기억의 편집은 다른 층이다. 최신 evidence를 선호하라는 지침이 곧 사용자 채택·철회·권한을 정확하게 판정하는 알고리즘이라는 뜻도 아니다. [LC-reflection]

`[package/연결 코드 READ]` `@earendil-works/pi-ai` 의존성과 Claude Code·Codex·OpenCode 연결 코드가 있다. Claude `--resume` 및 Codex `app-server`/thread 재개 경로도 읽었다. **pi-ai 사용 ≠ Pi CLI 전체 사용**, native session 재개 지원 ≠ 서로 독립된 형제의 동일한 UX·주소·기억 소유권 보장이다. Letta가 다른 하네스를 전혀 보지 않고 만든 대체물이라는 설명은 맞지 않는다. [LC-package] [LC-external]

`[제품 문서 READ]` README는 Cloud를 기본으로 설명하면서 local 선택도 제공한다. Cloud가 memory·identity·conversations를 보관하고 여러 실행 위치에서 쓰는 구조를 소개한다. 이를 보고 “기억을 가진 에이전트의 운영”을 사업의 중심 후보로 읽을 수 있지만, 현재 요금·원가·로컬/서버의 실제 권한·내보내기 완전성은 미측정이다. [LC-readme]

## [2026-10-24] Andenken·pi-durable·entwurf#151과의 접점

**GLG가 지적한 공통 중심은 기억이다.** 다만 같은 문제를 다룬다는 것이 같은 구현 소유권을 뜻하지는 않는다. 아래는 비교 점수표가 아니라 대화의 좌표다. [E151] [Andenken]

| 층 | 현재 읽은 자리 | 함께 물을 질문 |
|---|---|---|
| 과거 원문과 회수 | Andenken의 원본 좌표·의미 검색·선택한 hit의 readback | 올바른 근거가 돌아왔는가; 그 근거가 이번 판단에 적격한가 |
| 경험을 다듬는 학습 | Letta의 MemFS/reflection, FrontierMemory의 memory-generation 단계 | 무엇을 기억·절차·선호로 승격하며, 다음 행동에 실제로 쓰이는가 |
| native 실행의 지속성 | 이 집 [PI.md](PI.md)·[PI-DURABLE.md](PI-DURABLE.md)의 별도 관측 | conversation/task 저장과 복구가 의미적 기억의 정확성까지 보장하는가 |
| 같은 생일의 다음 장 | #151의 native lineage·원문 계보·얇은 첫 맥락 | native 세대가 바뀌어도 누구의 어느 경험으로 돌아가는지 이어지는가 |
| 현재 권한 | #151 댓글과 [agent-config#31](https://github.com/junghan0611/agent-config/issues/31)의 인용·채택 구분 | 과거의 약속·허가가 지금 동작의 승인으로 오인되지 않는가 |

`[Andenken README READ]` 구현은 embedding/retrieval 축이고 active recall·dream consolidation을 별도 축으로 설명한다. 따라서 FrontierMemory를 보겠다고 Andenken에 곧바로 dream engine을 넣거나 검색 엔진을 memory generator라고 재명명하지 않는다. 기존 README의 “Letta는 DB, 우리는 파일”이라는 큰 구분도 이 조사에서 현재 제품 사실의 정답으로 전제하지 않는다. Git MemFS·local/cloud·원문과 투영의 소유권을 **각 층에서** 다시 확인할 논의 항목이다. [Andenken] [LC-memory] [LC-readme]

**Andenken과 먼저 나눌 질문 `[논의 재료, 구현/실행안 아님]`:**

- 과거를 찾아주는 retrieval과 과거에서 절차·선호를 다듬는 consolidation 중 이번에 비교할 주체는 무엇인가. 둘을 한 점수로 부르기 전에 역할을 구분할 수 있는가.
- 원 프로토콜은 memory agent의 입력을 고정 corpus로 제한하고, 결과를 UTF-8 파일·8MiB 이내로 넘긴다. 기존 개인 세션 인덱스나 외부 검색 서비스를 그대로 연결하는 것은 같은 조건이 아니다. 준수 가능한 역할을 먼저 따지고, 별도 retrieval 실험이면 원 벤치마크와 다른 변형이라고 명시해야 한다. [FM-rules]
- retrieval 성공, 관련 기억에 대한 노출, 실제 로딩, 올바른 적용을 어디서 나누어 관측할 것인가. 발표의 “skill이 만들어졌지만 task agent가 안 읽었다”는 사례는 이 구분을 요구한다. [FM-post]
- 무기억·gold memory·learned memory와 고정한 task model/loader를 어떤 질문에 쓸 수 있는가. 정정·철회·인용/채택·현재 권한까지 보고 싶다면 원 평가에 있는 것과 별도 작은 탐구를 구분할 수 있는가.

`[#151 본문·댓글 2건 READ]` 생일 하나 아래 native 원본 여러 장, 제자리 compact와 세대 승계의 구분, 출처 있는 1KB 입구가 탐구 중심이다. 댓글은 공식 mod compact 후보·요청/완료/admission/회수의 구분을 조사하지만 운영 실행·schema는 승인하지 않았다. **FrontierMemory의 점수는 같은 garden 생일의 계보를 인증하지 않고, 안전한 refresh도 경험 학습의 품질을 인증하지 않는다.** 서로 다른 관측을 연결한다. [E151] [E151-r1] [E151-r2]

`[해석]` “기록이 남았다 → 필요한 원문을 찾았다 → 경험을 기억으로 다듬었다 → 다음 행동에 쓰였다 → 같은 존재의 다음 장으로 이어졌다”를 한 성공 플래그로 접지 않는 것이 이번 조사에서 가져갈 질문이다. Entwurf가 별도 기억 엔진이 되지 않으면서도, 그 연결에서 자기 몫인 정체성·주소·native lifecycle을 지킬 수 있는가를 본다.

## [2026-10-24] 검증면 — 점수보다 무엇을 증명하는가

아래는 **소스/파일 배치 READ**다. 테스트를 실행하지 않았으며 green·coverage·실효 검출력을 주장하지 않는다.

| 렌즈 | 읽은 구체적 표면 | 관측 경계 |
|---|---|---|
| 행동 옆 테스트 | Letta `src/tools/impl/external-coding-agent.test.ts`, reflection 구현 옆 `.test.ts`; FrontierMemory `tests/test_agents.py`, `test_memory_and_corpus.py` | 파일 배치를 확인. 테스트 수는 품질 점수가 아님 |
| 게이트의 자기검증 | Letta `scripts/unit-test-impact.test.cjs`·`test-sharding.test.cjs`; FrontierMemory `tests/test_cli_score_bundle.py`의 memory digest·run 전달 검사 | 선택기·점수/묶음 검증 자체도 시험 대상으로 둠. 실행/변이 검증 미측정 |
| 문서/형식↔코드 계약 | Letta `check-skill-frontmatter.js`의 `name` 구조 검사; FrontierMemory `docs/rules.md` ↔ `memory.py` | FrontierMemory는 nonempty MEMORY.md·UTF-8·8MiB·비정규 파일 제한과 digest를 구현. 이것은 내용 진실성 검사가 아님 |
| 평가 적격성 | 규칙상 corpus/memory digest·attempts·host·trace 검토 항목 | 자동 검사는 이 목록 전체가 아님을 아래에서 재현. hosted API 영수증도 완전한 trace/network 격리 증거로 승격하지 않는다고 문서에 명시 |

근거: [LC-tree], [LC-frontmatter], [LC-impact-tests], [FM-tree], [FM-memory], [FM-bundle-tests], [FM-rules].

## [2026-10-24] Opus와 교차 읽기 — 좋은 새 질문과 검증의 빈칸을 함께

`[형제의 자기보고/실제 왕복]` 새 Claude Code 형제 `20261024T115350-754cad`의 exact-nonce callback을 받은 뒤 연구 보고를 받았다. 모델은 Opus 5.5라고 자기보고했다. 역할은 공개자료 독립 조사이며 repo 파일 편집·하네스 설치·모델 과제 실행은 하지 않았다. 아래는 그 보고를 그대로 권위로 삼지 않고 코디가 소스·일부 합성 사례를 다시 대조한 내용이다.

### 대조군과 하네스 효과

`[발표 READ + 코디의 HTML 관측]` Figure 1은 Letta Dream/Letta Code 안에서 memory model을 비교하고, Figure 2는 각 memory system의 native task harness를 함께 바꾼다. 후자는 제품 조합의 비교로 읽을 수 있으나 generator·loader·task harness의 효과를 분리한 실험은 아니다. 코디도 공개 HTML에서 가격이 붙은 plot aria-label 70개를 읽었고, 그 점들에서 no-memory/gold control 표기를 찾지 못했다. **읽은 발표 글만으로 기억 유무의 이득 Δ나 gold 상한을 수치화하지 않는다.** README에 대조군 절차가 있다는 것과 그 대조 결과가 이 글에 제시됐다는 것은 다르다. [FM-post] [FM-readme]

`[산술/해석]` 15개에 한 번씩이면 한 과제는 약 6.7%p다. 작은 순위 격차를 안정적인 우월성으로 확대하지 않는다. 여기서 독립 표본·분산을 확인하지 않았으므로 신뢰구간을 산출하거나 실제 반복 변동 폭을 추정한 것도 아니다.

`[Opus 소스 READ, 코디는 비교 범위로 인수]` 공개 adapter들은 memory를 노출하는 방식이 다르고, 공개 CLI의 built-in 목록만으로 Letta/Prime 발표 행을 곧바로 재실행할 수 있는 경로는 확인되지 않았다. custom import/등록 확장점의 가능성까지 없다는 뜻은 아니다. **발표 실행의 harness 버전·loader·입력과 public reproduction 경로를 별도로 묻는다.** [FM-cli] [FM-readme]

### 자동 bundle 검사의 실제 범위

`[코디 독립 확인]` 고정 tree의 Git blob SHA로 `bundle.py`, `score.py`, `hosted.py`, `memory.py`, `docs/maintainers.md`, `docs/rules.md` 여섯 파일을 다시 대조해 일치를 확인했다. 이후 같은 소스의 `build_bundle`/`check_memory`에 임시 파일만 입력했다. network·API·모델·Docker는 호출하지 않았다. [FM-bundle] [FM-score] [FM-rules]

- **합성 입력:** 규칙 밖 host 선언 `not-a-model.invalid`, timeout multiplier `4.0`, corpus digest 없음, 3개 가짜 과제 각 1회, 그중 2개는 memory digest metadata 없음. 나머지 1개만 dream digest와 일치하도록 만들었다.
- **출력:** `problems=[]`, 합성 reward를 읽은 `passed/valid=3/3`. **실제 과제를 풀거나 verifier 통과를 얻은 수치가 아니다.**
- **음성 대조:** 세 과제 모두 memory digest가 없으면 memory 불일치 problem이 생겼다. 즉 digest 검사가 전혀 없는 것이 아니라, `score.py`가 null을 제외한 집합을 만들기 때문에 일부 trial의 누락이 남은 일치 digest에 가려지는 경우다.

`[문서↔코드 READ]` rules는 corpus release digest·model host·timeout·모든 trial의 memory digest·attempts 등을 bundle의 검사 항목으로 기술하지만, 현재 `problems`는 그 조건 전부를 자동 검사하지 않는다. 관련 값이 summary에 남아 사람의 trace/적격성 검토로 갈 수 있다. **빈 problems는 완전한 규칙 준수나 공식 리더보드 수용의 증거가 아니다.** `score.py`의 분모도 valid trial 수이므로 부분 job의 3/3을 전체 15과제·규정 attempts의 완주로 읽지 않는다. 이 사례를 실제 제출이 받아들여졌다거나 발표 결과가 거짓이라는 주장으로 확대하지 않는다. [FM-rules] [FM-bundle] [FM-score]

### verifier가 과제 해결 가능성에 주는 근거

`[코디 유지보수 문서 READ]` 공개 v1 oracle 점검 기록은 15개 target 중 10개 full pass, 한 개 0.83, 네 개 0이다. 기록은 hidden preference를 못 맞춘 reference solution과 비어 있는 oracle replay를 이유로 설명하며, 네 0점은 원천 과제에서도 같았다고 기술한다. 이것도 발행자 기록이며 원천 과제를 직접 감사한 결과는 아니다. **이 oracle 기록만으로 15개 전부의 strict pass 가능성이 입증되지는 않는다.** 반대로 모델/다른 해법도 과제를 풀 수 없다는 증명은 아니며, gated task 자체를 이번에 감사하지 않았다. 발행자의 수동 검토와 공개 실행 증거를 분리해 들고 간다. [FM-maintainers] [FM-score]

`[공동 범위 확인, 2026-10-24]` Opus가 위 절을 다시 읽고 범위 과장을 발견하지 못했다고 회신했다. 교차읽기에서 함께 좁힌 것은 세 가지다: memory 안에 발췌·검색 절차를 담을 수 있지만 원래 `/evidence` 전체가 후속 agent에 전달되는 것은 아니며, built-in adapter 미확인이 확장점 부재는 아니고, effort 설정 간 점수 차이는 반복 시행의 변동 폭 측정이 아니다. 이 범위 확인은 benchmark 재현이나 리더보드 검증이 아니다.

`[대화의 요지]` 그래서 FrontierMemory를 버릴 이유보다 **기억 효과를 묻는 좋은 새 질문과 그 질문을 증명하는 공개 자료의 빈칸을 함께 보는 이유**가 생겼다. 회수의 정확성, 낡은 기억 갱신·보류, 행동 개선 Δ, 원문 귀속, 같은 존재의 계보를 하나의 점수로 합치지 않는다.

## 미해결 — 다음 대화에서 먼저 볼 것

1. 공동 READ는 원 LoCoMo/LongMemEval까지다. LongMemEval README는 2026-05의 V2도 안내하므로, agentic memory로 확장된 후속 평가의 범위는 추가 확인해야 한다. 포화/우월 주장을 그대로 상속하지 않는다.
2. 발표의 665개와 현재 공개 corpus 674개, 1회 실험과 현재 제출 프로토콜의 변화 좌표를 확인한다. 변경 이유 미확인을 오류로 단정하지 않는다.
3. Andenken과 **retrieval / 기억에 대한 노출 / 실제 사용 / 후속 행동** 중 어디까지 현재 증명하고 있는지 이야기한다. 원본 출처·철회·채택 경계를 잃지 않고 배울 수 있는 것은 무엇인가.
4. Letta의 정본/투영/Git commit/remote sync·native identity를 독립적으로 관측할 필요가 있다. 이번의 README·prompt 읽음을 실제 저장·재개·장기 학습 측정으로 올리지 않는다.
5. 향후 실험은 별도 승인·격리·비용 예산부터. 개인 세션/가든/봇 기억을 공개 corpus나 외부 제품으로 보내지 않는다. gated corpus 조건 동의·다운로드, Docker/Modal/Harbor, memory/task/judge API 실행, 설치·자동 reflection·실제 compact는 이번에 하지 않는다.

## 공개 근거

소스는 아래 SHA에 고정했다. 웹 문서는 2026-10-24 읽은 시점의 자료이며 미래에 바뀔 수 있다. 비공개 출발 대화와 조사자의 해석을 상류 구현의 증거로 섞지 않는다.

[Origin]: https://www.letta.com/blog/memgpt-and-letta/
[Company]: https://www.letta.com/
[MemGPT-lab]: https://sky.cs.berkeley.edu/project/memgpt/
[FM-post]: https://frontiermemory.com/blog/v1/
[FM-repo]: https://api.github.com/repos/letta-ai/frontiermemory
[FM-package]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/pyproject.toml
[FM-readme]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/README.md
[FM-rules]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/docs/rules.md
[FM-cli]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/src/frontier_memory/cli.py#L297
[FM-memory]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/src/frontier_memory/memory.py
[FM-bundle-tests]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/tests/test_cli_score_bundle.py
[FM-tree]: https://github.com/letta-ai/frontiermemory/tree/49bea0f33a72da9771f8ef853ed7e48b69bf53df
[FM-bundle]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/src/frontier_memory/bundle.py
[FM-score]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/src/frontier_memory/score.py
[FM-maintainers]: https://github.com/letta-ai/frontiermemory/blob/49bea0f33a72da9771f8ef853ed7e48b69bf53df/docs/maintainers.md
[LoCoMo]: https://github.com/snap-research/locomo/blob/3eb6f2c585f5e1699204e3c3bdf7adc5c28cb376/README.md
[LongMemEval]: https://github.com/xiaowu0162/LongMemEval/blob/9e0b455f4ef0e2ab8f2e582289761153549043fc/README.md
[LC-package]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/package.json
[LC-readme]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/README.md
[LC-memory]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/src/agent/prompts/letta_root_memfs.md
[LC-reflection]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/src/agent/subagents/builtin/reflection-v2.md
[LC-external]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/src/tools/impl/external-coding-agent.ts
[LC-frontmatter]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/scripts/check-skill-frontmatter.js
[LC-impact-tests]: https://github.com/letta-ai/letta-code/blob/75d7921f1666b92b4a82acca64e5ef09001c1eb3/scripts/unit-test-impact.test.cjs
[LC-tree]: https://github.com/letta-ai/letta-code/tree/75d7921f1666b92b4a82acca64e5ef09001c1eb3
[E151]: https://github.com/junghan0611/entwurf/issues/151
[E151-r1]: https://github.com/junghan0611/entwurf/issues/151#issuecomment-6358142795
[E151-r2]: https://github.com/junghan0611/entwurf/issues/151#issuecomment-6358257585
[Andenken]: https://github.com/junghan0611/andenken/blob/1a8f9a3e70618a936581ebb53c9f28118fe337d3/README.md
