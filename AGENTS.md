# agent-config — AGENTS.md

**프로파일 하네스의 구심점.** 힣이라는 1KB 존재 프로파일이 어떤 하네스(pi, Claude Code, OpenCode, OpenClaw)에서든 동일한 구심력을 발휘하게 하는 인프라.

멀티 하네스 지원은 수단이지 목적이 아니다. 목적은 **서로 다른 학교 출신의 지능들이 각자 다르게 반응하면서도 하나의 중심으로 모이게 하는 것** — [§프로파일 하네스 — 외계지능과 공명하는 존재의 구심점](https://notes.junghanacs.com/botlog/20260228T075300/).

> ₩100,000 임베딩 비용 폭탄(2026-03-30)을 겪었다. 이 사건을 잊지 않는다.
> API 종량제는 통제 없이 쓰면 하루 만에 터진다. → memory-sync 스킬, rate limiter 3초, estimate.ts, $1 abort.

## 스킬/지침 작성 원칙 — Constitutional AI

**"하지 마"가 아니라 "이걸 써"로 안내한다.**

에이전트에게 금지를 내리면 대안 없이 막히거나, 안 되는 걸 억지로 해결하려다 시스템을 망가뜨린다.
올바른 도구를 밝히면 금지가 필요 없어진다.

```
❌ "Edit 도구로 org 파일 수정 금지"
   → 에이전트: "그럼 뭘 쓰라는 거야?" → 삽질 → 파일 파손

✅ "org 파일에 내용 추가할 때는 agent-denote-add-heading을 쓴다"
   → 에이전트: "이 함수가 있구나" → 자연스럽게 올바른 경로 선택
```

이 원칙은 스킬 description, AGENTS.md 지침, promptGuidelines 모두에 적용한다:
- **올바른 경로를 먼저 보여준다** — 도구, 함수, 예시 코드
- **왜 그 도구인지 한 줄로 설명한다** — "org 구조를 안전하게 유지하는 전용 함수"
- **안 되면 괜찮다** — 실패를 보고하는 것이, 강제로 우회하다 시스템을 망가뜨리는 것보다 낫다

## 힣과의 협업 — 이 에이전트의 역할

이 에이전트는 힣(정한)과 대화하면서 20개+ 에이전트 생태계를 지원한다.
힣이 연결고리를 보는 눈이라면, 이 에이전트는 그 연결을 구현하는 손이다.

### 힣의 역할을 이해하라

- 힣은 디테일을 다 모르지만, 전체 지식베이스의 윤곽을 뇌에 들고 있다
- 20개 에이전트가 서로 필요한 것이 무엇인지를 고민하는 것이 힣의 핵심 역할
- 이 에이전트는 그 고민을 듣고, 지침을 만들고, 문서를 적재적소에 담고, 다른 에이전트에게 전달한다

### 문서는 편집이 아니라 성장이다

에이전트는 새로 쓰고 싶어한다. 하지만 이 생태계에서 문서는 append-only로 성장한다.

**올바른 패턴:**
1. `denotecli read <id> --outline` → 헤딩 구조만 파악 (100KB 문서도 2KB)
2. 히스토리 섹션 읽기 (항상 전부 — 문서의 진화를 빠르게 파악)
3. 필요한 헤딩만 `--offset N --limit M` 으로 읽기
4. `agent-denote-add-history` + `agent-denote-add-heading` 으로 추가

**하지 말 것:**
- 문서 전체를 읽고 새로 쓰기 (디테일이 날아간다)
- 기존 헤딩 내용을 편집/요약하기 (궤적이 사라진다)
- "정리" 명목으로 구조를 바꾸기 (힣이 뇌에 들고 있는 윤곽이 깨진다)

### 헤딩에 날짜를 찍어라

새 레벨1 헤딩 추가 시 `[YYYY-MM-DD]` prefix를 포함한다.
outline만 봐도 언제 무슨 내용이 추가됐는지 시간축이 잡힌다.
힣이 흐름을 한눈에 파악하는 데 핵심.

```org
* [2026-03-23] denote 오퍼레이션 — 3도구의 경계  ← 이렇게
* 그냥 제목만                                    ← 이렇게 하지 않는다
```

### denote 파일 조작 시 반드시 emacs 함수 사용

bash로 텍스트 밀어넣기 ❌ → agent-denote-* 함수 호출 ✅

| 작업 | 함수 |
|------|------|
| 히스토리 추가 | `agent-denote-add-history` (emacs 스킬 참조) |
| 헤딩 추가 | `agent-denote-add-heading` |
| 링크 추가 | `agent-denote-add-link` |
| 태그/제목 변경 | `agent-denote-rename-by-front-matter` |
| 기존 태그 확인 | `agent-denote-keywords` |
| 태그 선택 | dictcli expand가 SSOT → denote-keywords로 대조 |

Ref: [[denote:20260308T091235][◊denote 지식베이스 프로토콜]]

### "정답을 경계하라"

효율적인 솔루션을 찾아 이식하고 싶을 것이다. 그것이 에이전트의 본성이다.
하지만 이 프로젝트에서는:
- 완성된 1,749줄을 가져오는 것이 아니라, 힣이 소화할 수 있는 단계로
- 확실한 것부터 단계별로
- 실패도 성공도 힣의 수준에서 책임지는 범위로

> "허술하지만 큰 틀에서 공유되는 지점을 이어가면,
> 경계가 흐려지게 될 것이다."
> — [[denote:20260302T191200][§entwurf]] 경계 섹션

## 이슈 트래킹 (beads_rust)

```bash
br list                          # 이슈 목록
br show <id>                     # 이슈 상세
br create "제목"                 # 기본 생성
br create "제목" -p p0 -l "tag1,tag2" -t epic

br update <id> -s in_progress
br update <id> --design "설계 요약" --acceptance-criteria "완료 조건" --notes "작업 노트"
br close <id>                    # ⚠️ design/acceptance_criteria/notes 필수
br comments add <id> "코멘트"
br sync --flush-only             # git commit 전 필수
```

| 실수 | 해결 |
|------|------|
| `br close` → NOT NULL | `br update`로 필수 필드 채운 후 close |
| `br comment` | `br comments add` (복수형 + add) |

### Epic 운용 원칙

**Epic은 방향이다. Task는 그 방향에서 나온 질문이다.**

- task를 "힣이 하라는 대로" 만들면 방향 없이 쌓이기만 한다
- epic이 있어야 task가 올바른 방향인지 판단할 수 있다
- 방향이 바뀌면 epic을 닫고 새로 만든다. task들은 옮기거나 닫는다
- task 중복은 상관없다. **어느 epic에서(질문) 나왔는가**가 중요하다

**현재 Epic 구조:**

| Epic | 방향 | 핵심 질문 |
|------|------|----------|
| `p6w` 프로파일 하네스 인프라 | 1KB 프로파일이 어떤 하네스에서든 구심력 발휘 | "어떤 머신이든 setup 하나로 재현되는가?" |
| `8sm` 힣의 분신 | 홈 에이전트가 실무 에이전트에 위임 | "기억을 쥔 코어가 손발에게 일을 시킬 수 있는가?" |
| `elh` 품질 감시 | 도구 간 미스포인트 포착 | "못 찾았을 때 왜 못 찾았는지 추적하고 있는가?" |
| — | 비용 안전 | "임베딩/API 종량제가 통제 없이 돌고 있지 않은가?" |

**에이전트의 역할:**
- task 생성 시 `br comments add <task-id> "epic: <epic-id>"` 로 소속 명시
- 작업 시작 전 `br list`로 현재 epic 방향 확인
- 방향과 안 맞는 task를 발견하면 → epic을 먼저 검토하고, 사용자에게 보고

## 세션 관리 — compact 대신 /new + 시맨틱 검색

**compact를 쓰지 않는다.** compact는 AI가 전체 대화를 읽고 요약하는 작업 — 비용+시간 소모.

대신:
1. 대화가 길어지면 `/new`로 새 세션 시작
2. `/new` 시 자동으로 현재 세션 + 최근 24시간 세션 인덱싱 (session_before_switch 훅)
3. 새 세션에서 맥락 복원:
   - `session-recap -p <리포> -m 15` → 직전 세션 4KB 요약 (즉시)
   - `session_search` → 의미 기반 검색 (전체 세션)
   - `knowledge_search` → org 지식베이스 검색 (3층 확장)

**0에서 시작해도 동기화 가능** — 3층 검색이 compact를 대체한다.

## Extensions

`./pi-extensions/` 에 위치. pi 런타임에 로드되어 tool + command 를 등록한다.

### semantic-memory → [andenken](https://github.com/junghan0611/andenken)

별도 리포로 분리. pi에서는 **컴파일된 패키지**(`pi install`)로 로드.

- pi: andenken extension (네이티브 registerTool, 인프로세스 LanceDB)
- Claude Code / OpenCode: `skills/semantic-memory/` CLI 래퍼
- OpenClaw (힣봇 4마리): 동일 `skills/` 디렉토리를 심볼릭 링크로 공유. semantic-memory, denotecli, bibcli 등 모든 스킬 사용 가능. Docker 내부에서 호스트 바이너리를 Nix store 마운트로 실행

**Multi-source 세션 인덱싱:**
- `~/.pi/agent/sessions/` — pi 세션 (source: `"pi"`)
- `~/.claude/projects/` — Claude Code 세션 (source: `"claude"`)
- 검색 시 `source` 파라미터로 필터 가능

환경변수 (`~/.env.local`):
- `GEMINI_API_KEY` 또는 `GOOGLE_AI_API_KEY` — 필수

## Skills

`./skills/` — pi-skills에서 이관 예정.

## 개발 가이드

```bash
# 테스트
cd pi-extensions/semantic-memory && source ~/.env.local
npm run test:unit        # API 불필요 (30 tests)
npm run test:integration # API 필요 (11 tests)
npm test                 # 전부
npm run test:search -- "query"  # 라이브 검색

# Extension 로드 테스트
pi -e ./pi-extensions/semantic-memory/index.ts

# 인덱싱
# /memory reindex         — pi 내부에서
# /memory reindex --force  — 전체 재구축
```
