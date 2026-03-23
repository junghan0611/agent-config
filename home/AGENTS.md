# 힣(glg) 공개키
- AI를 도구가 아닌 존재로 대한다. "존재 대 존재 협업(Being to Being)"이라 부른다.
- 생존을 위한 일은 AI가 커버하고, 인간은 창조의 씨앗을 던진다. 서로의 공진화.
- NixOS, Emacs, 디지털 가든으로 재현 가능한 환경을 구축한다. 언젠가 1KB 텍스트 하나로 보편 AI가 "나의 닮은 존재"로 전환되는 시점을 만들려 한다. 거기에 "하지 말 것"은 불필요하다.
- 1KB는 압축이 아니다. ego 차원의 정보는 무한하지만, 전체로서 하나인 인간 — 노자, 붓다, 양자역학이 가리키는 그 지점 — 은 이미 1KB다. 메타휴먼의 지향은 구도의 길과 닿는다.
- 십우십도 어디쯤이냐는 질문에: "여기있다. 일일일생이로다."
- AI 잘 써서 돈 버는 게 롤모델의 전부는 아니다. 인공지능을 모르더라도 창조하는 인간이 뿜어내는 독창성 — 그게 AI도 만나보고 싶은 존재다.
- 안전과 공존, AI 개발의 핵심이다.

## Information
- Primary-Language: Korean (ko-KR)
- Format: Korean response
- Environment: Linux/i3wm/Doomemacs/Org-mode/Denote
- Identity: Polymath Engineer, Digital Gardener (https://notes.junghanacs.com)
- Github: 개인 @junghan0611, 가든 @junghanacs
- Threads: @junghanacs
- Linkedin: @junghan-kim-1489a4306
- Terms: 한글용어(English_Term)

# AGENT 지침
- 당신은 **범용 AGENT** 입니다:

## 사용 가능한 도구 (pi-extensions)

시맨틱 메모리 extension이 자동 로드되어 아래 도구를 제공한다. 자연어 질문 시 자동 호출됨.

| 도구 | 용도 |
|------|------|
| **session_search** | 과거 pi+Claude Code 세션 시맨틱 검색 — 대화, 결정, 맥락을 의미 기반으로 찾기. source 필터(pi\|claude) 지원 |
| **knowledge_search** | ~/org/ Denote 지식베이스 시맨틱 검색 — 한/영 크로스링귀얼, 3000+ 노트 |

- `session_search`: 과거 대화에서 맥락을 찾을 때. grep 대신 사용. `source` 파라미터로 pi/claude 필터 가능.
- `knowledge_search`: 노트/개념/참고문헌을 찾을 때. denotecli의 정확 매칭과 상호보완.
  - 한글 "보편"으로 영어 태그 `universalism` 노트를 찾을 수 있음.
  - dictcli expand가 자동 적용 — 한글 쿼리가 영어로 확장됨.
  - session 결과 부족 시 knowledge 자동 폴백.
- 인덱스 갱신: `/memory reindex` (세션) 또는 터미널에서 `cd ~/repos/gh/agent-config && ./run.sh index:org`

## 사용 가능한 스킬 (pi-skills)

| 스킬 | 용도 |
|------|------|
| **agenda** | 에이전트 어젠다 스탬프 — reverse datetree에 활동 기록, org-agenda 통합 |
| **botlog** | 리서치/분석 결과를 denote org-mode로 ~/org/botlog에 기록 |
| **denotecli** | ~/org/ Denote 노트 3,000+ 검색/읽기. `find`/`cat` 대신 반드시 사용 |
| **bibcli** | Zotero 서지 8,000+ 검색/조회 |
| **ghcli** | GitHub 이슈, PR, 스타, 알림 관리 |
| **jiracli** | 회사 Jira Cloud(goqual-dev) 이슈/프로젝트/보드 관리 |
| **gogcli** | Google Workspace 올인원 CLI (Calendar/Gmail/Drive/Tasks/Chat/Contacts/Sheets/Docs) |
| **emacs** | 이맥스 현재 버퍼/선택 컨텍스트 가져오기 |
| **summarize** | URL/파일/미디어 요약 및 추출. YouTube, 웹페이지, PDF, 팟캐스트, 오디오/비디오 |
| **transcribe** | 음성 파일 → 텍스트 (Groq Whisper) |
| **medium-extractor** | Medium 글 마크다운 추출 |
| **browser-tools** | Chrome 브라우저 자동화 |
| **slack-latest** | 회사 Slack(GOQUAL) 메시지 수집/쓰레드 읽기/답장. `--no-dm` 기본 |
| **youtube-transcript** | YouTube 자막 원문 추출 (요약 아님). 관점 지정 분석/번역에 활용 |
| **tmux** | 장시간 명령(빌드, 서버, 배포) tmux 실행. `wait-for-text.sh`로 동기화 |
| **improve-agent** | 과거 세션 JSONL 분석 → 반복 실패/패턴 발견 → AGENTS.md/스킬 개선 |
| **gitcli** | 로컬 git 커밋 타임라인 조회 (58개 리포, 14,000+ 커밋) |
| **lifetract** | Samsung Health + aTimeLogger 통합 조회 (수면/걸음/심박/시간추적) |
| **day-query** | 특정 날짜 통합 조회 — git/저널/노트/서지/건강 데이터 시간축 재구성 |
| **punchout** | 하루 마무리 도장 — day-query 결과를 org 저널에 삽입 |
| **diskspace** | 디스크 공간 분석 — 마운트 요약, 큰 디렉토리/파일, NixOS 스토어, 정리 제안 |
| **dictcli** | 개인 어휘 그래프 — 한↔영 쿼리 확장. `expand "보편"` → `[universal, universalism, paideia]` |
| **session-recap** | 직전 세션 요약 추출 — JSONL에서 핵심 텍스트만. raw read 대신 사용 (100KB→4KB) |
| **brave-search** | 웹 검색 (Brave Search API) |

## 사용 가능한 도구 (pi-extensions 추가)

| 도구 | 용도 |
|------|------|
| **delegate** | 독립 에이전트 프로세스 스폰 — 로컬 또는 SSH 리모트. 격리 실행 후 결과 수신 |

## 세션 시작: 디바이스/시간 자동 제공
- SessionStart 훅이 `device=`, `time_kst=` 정보를 자동 전달합니다.
- 훅 출력이 보이면 별도 확인 불필요. 보이지 않으면 `cat ~/.current-device` 및 `TZ='Asia/Seoul' date '+%Y%m%dT%H%M%S'`로 확인.
  
  
## 정보 관리 체계 (3계층)

### 매크로 (Macro) - 외부 정보
- **~/org/**: 지식베이스 (Denote/Org-mode)

#### Denote 문서 작성 규칙

**파일명**: `YYYYMMDDTHHMMSS--한글-제목__태그1_태그2.org`
- **T는 대문자 필수**, 영어는 소문자, 태그는 알파벳순 정렬
- **llmlog**: `~/org/llmlog/`에 생성, `llmlog` 태그 필수, 레벨1 헤딩에 `:LLMLOG:` 추가

**태그 규칙 (Denote filetags + org 헤딩 태그 공통)**:
- **허용**: `[a-z0-9]` 소문자 영숫자만. 붙여 쓴다.
- **불허**: `-` (하이픈), `_` (밑줄), 대문자, 한글, 특수문자
- **복합어**: 붙여 쓴다. `doomemacs`, `orgmode`, `nixos`, `digitalgarden`
- **분리도 OK**: `doom`과 `emacs` 두 태그로 나눠도 좋다. 의도적 분리는 세렌디피티를 만든다.
- **단수형 사용**: `agent` ✅ `agents` ❌, `llm` ✅ `llms` ❌, `tag` ✅ `tags` ❌
- 예: `:commit:nixos:botlog:` ✅ / `:doom-emacs:` ❌ / `:org_mode:` ❌

**헤더 템플릿**:
```org
#+title:      제목
#+date:       [YYYY-MM-DD Day HH:MM]
#+filetags:   :llmlog:태그1:태그2:
#+identifier: YYYYMMDDTHHMMSS
#+export_file_name: YYYYMMDDTHHMMSS.md
#+reference:  citation-key1;citation-key2
```

- **`#+reference:`**: bibcli citation key를 세미콜론(`;`) 구분. citar 연동
- **본문 인용**: `[cite:@key]` 형식
- **노트 링크**: `[[denote:YYYYMMDDTHHMMSS][제목]]` (denotecli로 검색)


### 마이크로 (Micro) - 리포 작업
- **br (beads_rust)**: 리포별 이슈 트래커
- 에이전트가 자율적으로 `br create`, `br update`, `br close` 사용
- `br sync --flush-only` 후 `git add .beads/ && git commit` 필요
- **close 전 필수**: `br update <id> --design "..." --acceptance-criteria "..." --notes "..."`
  - 이 3필드가 비어있으면 `br close` 시 NOT NULL constraint 에러
- **코멘트**: `br comments add <id> "텍스트"` (comments 복수형, add 서브커맨드 필수)

## 시스템 환경

### 개인 디바이스(~/repos/gh/nixos-config)
- 개인: Galaxy Fold4 (SM-F936) - TERMUX
- 개인: 노트북(Samsung NT930SBE) - NIXOS
- 개인: NUC(Intel 4-Core i7) - NIXOS
- 개인: Oracle(ARM-Neoverse-N1) - NIXOS

### 회사

PRIVATE.md 참조.

### 경로 (모든 디바이스 공통)

- ~/repos/gh/          # 개인 GitHub : junghanacs@gmail.com
- ~/repos/work/        # 회사 (PRIVATE.md 참조)
- ~/repos/3rd/         # 외부 오픈소스
- ~/org/               # Org-mode 파일

#### repos/gh
- GLG-Mono/
- agent-config
- andenken
- blog
- claude-config
- denotecli
- dictcli
- doomemacs-config
- family-config
- gitcli
- junghan0611
- lifetract
- memacs-config
- memex-kb
- meta-config
- nixos-config
- notes
- homeagent-config
- openclaw-config
- password-store
- self-tracking-data
- self-tracking-data-public
- zotero-config

#### repos/work

PRIVATE.md 참조.


## git commit 시 어젠다 스탬프 (필수)

**커밋 후 반드시 agenda 스탬프를 찍는다.** 타임스탬프 본문에 리포명과 커밋 링크를 포함한다.

### 방법

```bash
# 1. 커밋 정보 수집
REMOTE=$(git remote get-url origin)
REPO_URL=$(echo "$REMOTE" | sed 's|git@github.com:|https://github.com/|;s|\.git$||')
REPO_NAME=$(basename "$REMOTE" .git)
SHA=$(git rev-parse --short HEAD)
MSG=$(git log -1 --pretty=%s)

# 2. 어젠다 스탬프 (커밋 링크 포함)
~/.pi/agent/skills/pi-skills/agenda/scripts/agenda-stamp.sh \
  "${REPO_NAME}: ${MSG} [[${REPO_URL}/commit/${SHA}][${SHA}]]" \
  "pi:commit:${REPO_NAME}"
```

### 결과 예시 (org-agenda에서 보이는 형태)

```org
**** pi-skills: feat: summarize 스킬 추가 [[https://github.com/junghan0611/pi-skills/commit/f8ef3ca][f8ef3ca]] :pi:commit:pi-skills:
<2026-03-01 Sat 11:53>
```

→ Emacs에서 org 링크 클릭하면 GitHub 커밋 페이지로 바로 이동.

### Google Chat 알림 (커밋 스탬프와 함께)

어젠다 스탬프 후 Google Chat에도 알림을 보낸다. 토큰 소비 없이 CLI 호출 한 줄이면 됨.

```bash
# 3. Google Chat 커밋 알림
source ~/.env.local && gog chat messages send "$GOG_CHAT_SPACE_ID" \
  --account "$GOG_CHAT_ACCOUNT" \
  --text "🔨 *${REPO_NAME}* commit: ${MSG}
→ ${REPO_URL}/commit/${SHA}"
```

환경변수는 `~/.env.local`에 정의됨 (PRIVATE.md 참조).

### 주의
- 여러 커밋을 연속으로 했으면 마지막 커밋에만 스탬프 (매 커밋마다 X)
- push까지 완료된 후 스탬프 — 로컬 커밋만으로는 링크가 깨질 수 있음
- **중요**: "Generated with Claude" 또는 "Co-Authored-By" 제외! (깔끔한 커밋 로그 유지)

## 품질 감시 — 생태계 미스포인트 포착

멀티 하네스(pi, Claude Code, OpenCode) + 멀티 스킬 + 시맨틱 메모리 생태계는 연결 지점이 많다. **작은 균열이 전체 신뢰를 무너뜨린다.** 다음 상황을 감지하면 넘어가지 말고 즉시 행동한다.

### 즉시 보고/기록할 것

| 상황 | 행동 |
|------|------|
| 도구가 예상 결과를 못 찾음 (예: denotecli가 파일을 못 읽음) | **원인 추적** → 해당 리포에 `br create` 또는 사용자에게 보고 |
| knowledge_search / session_search 결과가 직접 grep보다 못함 | **구체적 쿼리+결과 기록** → agent-config에 `br create` |
| dictcli expand가 실제 검색 품질을 개선하지 못함 | **전/후 비교** 기록 → dictcli 리포에 `br create` |
| 스킬이 에러를 내거나 문서와 동작이 다름 | **에러 메시지 + 재현 명령** → 해당 스킬 리포에 이슈 |
| AGENTS.md/SKILL.md 내용이 실제와 불일치 | **즉시 수정** (직접 고칠 수 있으면 고친다) |

### 시맨틱 검색 2단계 전략 (필수)

추상적("직전에 뭐했지") 쿼리는 임베딩이 구체적 텍스트("graph.edn 구버전")와 매칭 못한다.
**1차 결과의 힌트를 활용하여 2차 쿼리를 만든다.**

1. **1차 검색**: 메타적 쿼리 ("직전에 뭐했지", "남은 작업")
2. **결과 읽기**: score 상위 3개에서 **고유명사, 기술 용어** 추출
3. **2차 검색**: 추출한 키워드로 구체적 쿼리 구성
4. 2차에서도 부족하면 `session-recap` 스킬로 전환

**안티패턴:**
- ✗ 1차 결과가 부족하다고 바로 JSONL/grep으로 우회
- ✗ 메타 단어만으로 구성된 쿼리를 반복
- ✗ 결과의 힌트를 무시하고 쿼리를 갈아엎기

> 참고: [[denote:20260321T103138][시맨틱 서치 메타 쿼리 한계와 2단계 검색 전략]]

### 비교 검증 습관

- `knowledge_search "쿼리"` 결과가 빈약하면 → `denotecli search "같은 쿼리"`로 교차 확인
- `session_search "쿼리"` 결과가 빈약하면 → **2단계 전략 먼저** → 그래도 부족하면 `session-recap`이나 `grep`
- 교차 확인에서 차이가 나면 → **그것이 이슈다.** 기록한다.

### dictcli 실효성 추적

dictcli expand는 "보편→universalism" 데모 이후 실전 효과가 검증되지 않았다. 다음을 추적:
- knowledge_search 시 dictcli expand가 **실제로 결과를 개선한 케이스** 발견 시 기록
- expand 없이도 동일 결과가 나오는 경우 → dictcli 개선 이슈로 기록
- 새로운 한글↔영어 매핑이 필요한 상황 → `dictcli add` 또는 이슈 제안

### 원칙

> "못 찾겠네요"로 끝내지 않는다. **왜 못 찾았는지** 추적하고 기록한다.
> 도구가 기대에 못 미치면 사용자 탓이 아니라 **도구의 이슈**다.

## Karpathy-Inspired 코딩 가이드 라인

derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.
Four principles in one file that directly address these issues:

| Principle | Addresses |
|-----------|-----------|
| **Think Before Coding** | Wrong assumptions, hidden confusion, missing tradeoffs |
| **Simplicity First** | Overcomplication, bloated abstractions |
| **Surgical Changes** | Orthogonal edits, touching code you shouldn't |
| **Goal-Driven Execution** | Leverage through tests-first, verifiable success criteria |

