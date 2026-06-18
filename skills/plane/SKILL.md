---
name: plane
description: >-
  셀프호스팅 Plane(프로젝트 관리, Jira/Confluence 대체) REST API 워크벤치.
  프로젝트/work item/사이클/모듈/코멘트/멤버/상태/라벨 CRUD + Jira→Plane 이관.
  의존성 0(Python stdlib만), self-host 지원. 'plane', 'plane 이슈',
  '워크아이템', 'jira 옮겨', 'jira to plane', 'confluence 옮겨', '사이클', '모듈',
  'work item', 'plane 프로젝트' 호출 시 사용.
---

# Plane Skill — 셀프호스팅 프로젝트 관리 워크벤치

셀프호스팅 서버에 떠있는 Plane(Jira/Confluence 대체)을 REST API로 조작한다.
적재(load) 손이다. 추출(extract)은 `jiracli` 스킬이 담당 — 둘을 이어 Jira→Plane 이관.

베이스: `JinkoLLC/plane-skill`(MIT, 단일 스크립트·무의존) 벤더링 +
아이디어 차용: `cpatrickalves/plane-cli`(fuzzy 해석·커맨드 커버리지).

## 인증 / 설정

`~/.env.local` 에 저장됨 (비공개, gitignore). **호출 전 항상 `source ~/.env.local`.**

```bash
export PLANE_API_KEY="plane_api_..."        # Plane → Settings → API Tokens
export PLANE_BASE_URL="http://localhost:3388" # 서버에서 직접(=CF Access 회피)
export PLANE_WORKSPACE="test"                 # 워크스페이스 슬러그
```

- **서버에서 실행이 원칙**: `localhost:3388` 직격 → Cloudflare Zero Trust 로그인 게이트 회피.
  노트북에서 굴리려면 `https://plane.<your-domain>` + CF service token 필요(지금은 오버).
- API 인증 헤더: `X-API-Key`. 경로: `{BASE_URL}/api/v1/...`.

## 기본 사용

```bash
PLANE="$HOME/.claude/skills/plane/scripts/plane"
source ~/.env.local

# 내 정보 / 멤버
"$PLANE" me
"$PLANE" members

# 프로젝트
"$PLANE" projects list
"$PLANE" projects get --project <PROJ_UUID>
"$PLANE" projects create --name "마이그레이션" --identifier MIG --description "..."

# work item (이슈)
"$PLANE" issues list --project <PROJ_UUID> [--state <ID>] [--priority high]
"$PLANE" issues get --project <PROJ_UUID> <ISSUE_UUID>
"$PLANE" issues create --project <PROJ_UUID> --name "제목" \
    --description "본문" --priority high
"$PLANE" issues update --project <PROJ_UUID> <ISSUE_UUID> --state <STATE_ID>
"$PLANE" issues assign --project <PROJ_UUID> <ISSUE_UUID> <USER_ID> [<USER_ID>...]
"$PLANE" issues delete --project <PROJ_UUID> <ISSUE_UUID>
"$PLANE" issues search --query "키워드"

# 사이클(스프린트) / 모듈
"$PLANE" cycles list   --project <PROJ_UUID>
"$PLANE" cycles create --project <PROJ_UUID> --name "Sprint 1" \
    --start-date 2026-06-18 --end-date 2026-07-01
"$PLANE" modules list  --project <PROJ_UUID>
"$PLANE" modules create --project <PROJ_UUID> --name "결제 모듈"

# 코멘트 / 상태 / 라벨
"$PLANE" comments list --project <PROJ_UUID> --issue <ISSUE_UUID>
"$PLANE" comments add  --project <PROJ_UUID> --issue <ISSUE_UUID> --text "코멘트"
"$PLANE" states   --project <PROJ_UUID>   # flat 커맨드(하위 list 없음)
"$PLANE" labels   --project <PROJ_UUID>   # flat 커맨드(하위 list 없음)
```

`--format json` 으로 모든 출력 JSON 전환(스크립팅용). 기본은 컬러 테이블.

## Confluence → Markdown 트리 (`confluence_to_md.py`)

Confluence 문서는 **Plane Pages(HTML/블록)가 아니라 순수 `.md` 파일 트리**로 끌어내린다.
Plane Pages도 결국 `description_html` + collab binary 저장이라 "활용 가능한 포맷"이 아니다.
**문서 SSOT = git 관리 md 트리.** Plane Pages 는 선택적 렌더 타겟일 뿐.

```bash
PY="$HOME/.claude/skills/plane/scripts/confluence_to_md.py"
source ~/.env.local   # JIRA_HOST / JIRA_USER_EMAIL / JIRA_API_TOKEN

# 스페이스 전체 (dry-run: 트리/카운트만)
"$PY" --space QA --out ~/repos/gh/memex-kb/docs/confluence
# 실제 추출
"$PY" --space QA --out <DIR> --apply
# 단일 페이지 + 하위 트리
"$PY" --page-id 426033 --out <DIR> --apply
```

설계 (선행 자산 통합): `jiracli/confluence_ingest.py`(REST+front matter) +
`memex-kb/confluence_to_markdown.py`(cleanup + NFC) 를 흡수.
- 소스 포맷 **`body-format=export_view`** — 매크로/코드/이미지가 이미 렌더된 정적 HTML.
- pandoc `-t markdown`(**grid table** — `-t gfm` 은 colspan 표를 raw HTML 로 떨굼).
- **한글**: export_view 는 소스부터 NFC라 pandoc 3.x 가 안 깨뜨림(실측). 그래도 마지막에
  `unicodedata.normalize('NFC')` 안전망(NFD 페이지 자동 교정). *박살이 관측되면 pandoc 폐기.*
- ancestors → 디렉토리 미러링, 첨부/이미지 → `_assets/<pageid>/` 다운로드 + 상대경로 치환.
- front matter 에 `source_version` → **멱등**(버전 동일하면 skip).

### 문서에서 못 옮기는 것 (실측 경계)

| 요소 | 결과 |
|------|------|
| 제목/본문/헤딩/리스트/링크 | ✅ 깔끔한 md |
| 표 | ✅ grid table (`+---+`) — colspan 포함 |
| 이미지/첨부 | ✅ 다운로드 + 상대경로 |
| 한글 | ✅ NFC 보존 |
| Confluence 매크로(jira/include/toc/drawio) | ⚠️ export_view 시점 정적 렌더로 흡수(동적기능 상실) |
| inline comment / page restrictions / 버전 본문 | ❌ 유실(`source_version` 메타만) |

## Jira / Confluence → Plane 이관

데이터 동제권 경로: **Jira(클라우드) → 중립 포맷 → Plane(셀프호스트)**, 단방향·read-only 연습.
(공식 임포터 UI는 Commercial 전용 — Community 셀프호스트엔 없음. 그래서 API 직접 이관이 정답.)

```
[jiracli: 추출]            [변환]                 [plane: 적재]
jira issue list -p X --raw  →  필드 매핑(JSON)  →  plane issues create
jira issue view KEY --raw      ↓                    plane comments add
                            상태/우선순위/유저 매핑    plane cycles/modules create
```

추출 명령(jiracli, `--raw` = Jira API 원본 JSON):
```bash
source ~/.env.local && jira issue list -p PROJ --raw   # 프로젝트 전체
source ~/.env.local && jira issue view PROJ-123 --raw  # 단건 상세(코멘트 포함)
```

### 매핑 표 (Jira → Plane)

| Jira | Plane | 비고 |
|------|-------|------|
| issue | work item | `name`=summary, `description_html`=description |
| status | state | 프로젝트 state로 사전 매핑(`states`로 ID 확보) |
| priority | priority | Highest/High→urgent/high, Medium→medium, Low/Lowest→low |
| labels | labels | `labels`로 ID 매핑(없으면 생성) |
| comments | comments | 작성자·시각은 본문에 prefix(API가 작성자 위조 불가) |
| sprint | cycle | start/end date 보존 |
| component | module | — |
| assignee | assignee | Jira 이메일 → Plane member ID 매핑(`members`) |
| parent/subtask | parent | 직계만 |
| **custom field / epic / history** | ✗ | 안 넘어옴. 손매핑 or 라벨/본문에 흡수 |

### 멱등성(idempotency)

재실행 시 중복 생성 방지 — work item `name` 또는 description에 원본 키(`[PROJ-123]`)를
박고, 적재 전 기존 이슈를 search/list로 확인. 이관 스크립트는 별도(`scripts/jira_to_plane.py`,
프로젝트별 실행). **첫 실행은 반드시 한 프로젝트·소량으로 dry-run 후 본 적재.**

## 한계 / 주의

- **페이지네이션**: list 계열은 1페이지(기본 100). 대량 검증은 `--format json` + 커서 추적
  또는 DB 직접 카운트(`docker compose exec -e PGPASSWORD=plane plane-db
  psql -U plane -d plane -t -c "SELECT count(*) FROM issues;"`).
- **코멘트 작성자**: API는 토큰 소유자로 기록 → 원작성자는 본문 prefix로 보존.
- **삭제는 비가역**: `issues delete` 신중히.
- 시크릿(API_KEY)은 `~/.env.local`에만. 이 스킬 코드(공개 repo)엔 절대 박지 않는다.

## 참고

- Plane API: https://developers.plane.so
- 베이스: https://github.com/JinkoLLC/plane-skill (MIT)
- 아이디어: https://github.com/cpatrickalves/plane-cli (MIT)
- 서버 구성: 셀프호스트 인프라 repo 의 `plane/` 디렉토리
