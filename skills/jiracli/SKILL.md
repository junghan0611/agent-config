---
name: jiracli
description: Jira CLI for issue tracking, project management, and sprint/board operations on goqual-dev.atlassian.net. Supports multiple projects (MAT, DEVT, IOT, etc.). Also fetches Confluence wiki pages — import an Atlassian wiki URL (tinyLink or full /wiki/spaces/.../pages/<id>) into a local Markdown file with KST timestamps via the bundled confluence_ingest.py script (Confluence to Markdown, Atlassian wiki ingestion, wiki page import).
---

# Jira CLI (jira-cli-go)

회사 Jira Cloud(`goqual-dev.atlassian.net`) 접근용 CLI 스킬.

## 환경

- **도구**: `jira` (ankitpokhrel/jira-cli v1.7.0, NixOS `jira-cli-go`)
- **인증**: `JIRA_API_TOKEN` in `~/.env.local` (export 필수)
- **설정**: `~/.config/.jira/.config.yml`
- **기본 프로젝트**: MAT (경동 Matter)
- **사용자**: jhkim2@goqual.com

## 필수: 환경변수 로드

**모든 명령 전에 반드시 `source ~/.env.local`을 실행한다.**

```bash
source ~/.env.local && jira <command>
```

## 프로젝트 목록 (주요)

| KEY | 이름 | 타입 |
|-----|------|------|
| MAT | 경동 Matter | classic (kanban) |
| DEVT | 개발팀 | classic |
| IOT | IOTWORKS | classic |
| GP1 | 헤이홈 B2C 앱 개발 | classic |
| B2BVOC | [B2B] Hejhome VOC | classic |
| GOQUALPRJ | Goqual Project | classic |

## 이슈 조회

```bash
# 기본 프로젝트(MAT) 이슈 목록
source ~/.env.local && jira issue list --plain

# 다른 프로젝트 이슈
source ~/.env.local && jira issue list -p DEVT --plain

# 나에게 할당된 이슈
source ~/.env.local && jira issue list -a$(jira me) --plain

# 상태별 필터
source ~/.env.local && jira issue list -s"개발 진행 중" --plain

# JQL 직접 사용
source ~/.env.local && jira issue list -q"summary ~ Matter" --plain

# 이슈 상세 보기
source ~/.env.local && jira issue view MAT-77 --plain

# 최근 생성된 이슈
source ~/.env.local && jira issue list --created month --plain

# 특정 담당자
source ~/.env.local && jira issue list -a"현승우" --plain
```

## 이슈 생성/수정

```bash
# 이슈 생성 (인터랙티브 — 에이전트에서는 비추천)
source ~/.env.local && jira issue create

# 이슈 상태 변경 (move)
source ~/.env.local && jira issue move MAT-77 "개발 완료"

# 이슈 할당
source ~/.env.local && jira issue assign MAT-77 "jhkim2@goqual.com"

# 코멘트 추가
source ~/.env.local && jira issue comment add MAT-77 "코멘트 내용"

# 브라우저에서 열기
source ~/.env.local && jira open MAT-77
```

## 보드/스프린트

```bash
# 보드 목록
source ~/.env.local && jira board list

# 스프린트 목록 (scrum 보드만)
source ~/.env.local && jira sprint list

# 에픽 목록
source ~/.env.local && jira epic list --plain
```

## 프로젝트 관리

```bash
# 전체 프로젝트 목록
source ~/.env.local && jira project list

# 서버 정보
source ~/.env.local && jira serverinfo

# 내 계정
source ~/.env.local && jira me
```

## 출력 포맷

- `--plain`: 탭 구분 텍스트 출력 (파싱/스크립팅용). **에이전트에서는 항상 --plain 사용 권장.**
- 기본: 인터랙티브 TUI (터미널 직접 사용 시)
- `issue view`는 `--plain` 없이도 상세 출력

## 유용한 조합 예시

```bash
# 프로젝트별 상태 요약
source ~/.env.local && jira issue list -p MAT --plain | tail -n +2 | awk -F'\t' '{print $NF}' | sort | uniq -c | sort -rn

# 진행 중인 내 이슈만
source ~/.env.local && jira issue list -a$(jira me) -s"개발 진행 중" --plain

# 이번 주 생성된 이슈
source ~/.env.local && jira issue list --created week --plain
```

## 다른 프로젝트로 전환

`-p` 플래그로 프로젝트를 지정하거나, 설정 파일의 `project.key`를 변경:

```bash
# 플래그로 임시 전환
source ~/.env.local && jira issue list -p DEVT --plain

# 설정 파일로 영구 전환
# ~/.config/.jira/.config.yml 의 project.key 수정
```

## Confluence URL → Markdown

`scripts/confluence_ingest.py` — Atlassian Cloud Confluence 페이지(tinyLink 또는
정규 `/wiki/spaces/.../pages/<id>` URL)를 단방향으로 가져와 YAML frontmatter
+ Markdown 본문으로 저장. `JIRA_API_TOKEN`이 Atlassian 통합 토큰이라 별도
Confluence 토큰 불필요. **stdlib only** (urllib + base64 + regex), `pandoc` 필요.

### 동작 요약
- URL 입력 (tinyLink resolve 후 pageId 추출)
- Confluence REST v2 (`/wiki/api/v2/pages/{id}?body-format=storage`) 호출
- storage XHTML cleanup (`ac:`, `ri:`, `local-id`, `data-*` 메타 제거)
- pandoc `html → gfm` 변환, NFC 정규화
- YAML frontmatter 7필드 (title / source / source_id / source_version /
  source_modified / fetched_at / tags) 모두 **KST 표시**
- 같은 path **덮어쓰기** (idempotent — 위키 갱신 시 같은 파일 재실행)
- 본문 stdout 미노출 — 파일 경로 + heading outline만 출력

### 사용법

```bash
source ~/.env.local && python3 \
  ~/repos/gh/agent-config/skills/jiracli/scripts/confluence_ingest.py \
  <URL> [--out DIR] [--filename NAME] [--tags t1,t2] [--format storage|view|export_view]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--out` | cwd | 출력 디렉토리 |
| `--filename` | `confluence-<pageId>.md` | 파일명 |
| `--tags` | (none) | 추가 태그, 콤마 분리. 기본 `confluence` + 호스트 태그(예 `goqualdev`)는 항상 포함 |
| `--format` | `storage` | Confluence body-format (`storage` / `view` / `export_view`) |

### 인증

- `JIRA_API_TOKEN`: `~/.env.local`의 export 값 (Atlassian Cloud 통합 토큰)
- 사용자 이메일: `~/.config/.jira/.config.yml`의 `login:` 필드에서 추출
  (또는 `JIRA_USER_EMAIL` env override)

### 호출 예시 — 영문 대문자 파일명으로 repo 홈에 저장

```bash
source ~/.env.local && python3 \
  ~/repos/gh/agent-config/skills/jiracli/scripts/confluence_ingest.py \
  '<wiki-url-or-tinylink>' \
  --out ~/repos/gh/<your-repo> \
  --filename DOC.md \
  --tags <topic>,<area>
```

→ `~/repos/gh/<your-repo>/DOC.md` 생성/갱신. 표준 출력은 파일 경로 + heading
구조만 (본문 미노출 — 민감 페이지 가능).

### 주의

- 양방향 sync **아님**. 단방향 가져오기 — 로컬 편집은 Confluence에 반영 안됨.
- 본문이 민감할 수 있음 — 스크립트는 stdout에 본문을 토하지 않지만, 결과 파일을
  공개 repo에 commit하기 전 내용 확인 필수.
- `pandoc`이 모르는 Confluence macro는 cleanup 정규식으로 메타데이터만 떨군
  뒤 변환. 일부 macro 본문은 plain text로 남거나 누락될 수 있음.

## 주의사항

1. **MAT 보드는 kanban** — 스프린트 명령은 scrum 보드에서만 동작
2. **`--plain`은 issue list에서만** — project list, board list에는 미지원 (기본이 plain)
3. **인터랙티브 명령 주의** — `issue create`는 에디터를 열므로 에이전트에서 사용 시 주의
4. **상태명은 한글** — `"개발 진행 중"`, `"개발 완료"`, `"대기 & 담당 지정"` 등 따옴표 필수
