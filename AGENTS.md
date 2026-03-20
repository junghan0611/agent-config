# agent-config — AGENTS.md

에이전트 인프라 허브. pi extension, skill, 설정을 관리한다.

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
| `p6w` 멀티하네스 인프라 | pi/claude/opencode를 하나의 설정으로 | "어떤 머신이든 setup 하나로 재현되는가?" |
| `8sm` 힣의 분신 | 홈 에이전트가 실무 에이전트에 위임 | "기억을 쥔 코어가 손발에게 일을 시킬 수 있는가?" |
| `elh` 품질 감시 | 도구 간 미스포인트 포착 | "못 찾았을 때 왜 못 찾았는지 추적하고 있는가?" |

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
