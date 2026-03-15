---
name: jiracli
description: Jira CLI for issue tracking, project management, and sprint/board operations. Use when user asks about Jira issues, tasks, project status, or work tracking. Supports multiple projects (MAT, DEVT, IOT, etc.) on goqual-dev.atlassian.net.
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

## 주의사항

1. **MAT 보드는 kanban** — 스프린트 명령은 scrum 보드에서만 동작
2. **`--plain`은 issue list에서만** — project list, board list에는 미지원 (기본이 plain)
3. **인터랙티브 명령 주의** — `issue create`는 에디터를 열므로 에이전트에서 사용 시 주의
4. **상태명은 한글** — `"개발 진행 중"`, `"개발 완료"`, `"대기 & 담당 지정"` 등 따옴표 필수
