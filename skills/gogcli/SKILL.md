---
name: gogcli
description: Google Workspace all-in-one CLI (gog) for Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs. Replaces gccli/gdcli/gmcli.
---

# gogcli (gog)

All-in-one Google Workspace CLI. Single binary covering Calendar, Gmail, Drive, Tasks, Chat, Contacts, Sheets, Docs, and more.

Binary is bundled in the skill directory. Invoke via `{baseDir}/gog`.

## Accounts

- **Personal**: `--account junghanacs@gmail.com` (client: personal, services: all)
- **Work**: `--account jhkim2@goqual.com` (client: work, services: calendar,gmail,drive,tasks,chat)

Tip: `GOG_ACCOUNT=junghanacs@gmail.com` 환경변수로 기본 계정 설정 가능.

## Calendar

**주의**: `create`, `get`, `update`, `delete`는 `<calendarId>` 위치 인자 필수.
대부분의 경우 계정 이메일이 calendarId이다 (예: `jhkim2@goqual.com`).

```bash
# 이벤트 조회
gog calendar list --max 10
gog calendar list --from 2026-02-22T00:00:00+09:00 --to 2026-02-28T23:59:59+09:00
gog calendar list --today                        # 오늘만
gog calendar list --week                         # 이번 주
gog calendar list --days 3                       # 앞으로 3일
gog calendar list --all                          # 모든 캘린더에서

# 이벤트 상세
gog calendar get <calendarId> <eventId>

# 이벤트 생성 — calendarId 필수, --from/--to 사용 (--start/--end 아님!)
gog calendar create <calendarId> --summary "회의" --from 2026-03-01T10:00:00+09:00 --to 2026-03-01T11:00:00+09:00
gog calendar create <calendarId> --summary "종일" --from 2026-03-01 --to 2026-03-02 --all-day
gog calendar create <calendarId> --summary "회의" --from ... --to ... --description "내용" --location "장소"
gog calendar create <calendarId> --summary "미팅" --from ... --to ... --with-meet  # Meet 링크 생성

# 이벤트 수정 — calendarId + eventId 필수
gog calendar update <calendarId> <eventId> --summary "변경된 제목"
gog calendar update <calendarId> <eventId> --from 2026-03-01T11:00:00+09:00 --to 2026-03-01T12:00:00+09:00

# 이벤트 삭제 — calendarId + eventId 필수
gog calendar delete <calendarId> <eventId>

# 캘린더 목록
gog calendar calendars
```

## Tasks

```bash
# 태스크 리스트 목록
gog tasks lists

# 특정 리스트의 태스크 조회
gog tasks list <tasklistId>
gog tasks list <tasklistId> --all

# 태스크 추가 — --title 필수
gog tasks add <tasklistId> --title "제목"
gog tasks add <tasklistId> --title "제목" --notes "설명" --due 2026-03-01
gog tasks add <tasklistId> --title "반복" --due 2026-03-01 --repeat weekly --repeat-count 4

# 태스크 완료/미완료
gog tasks done <tasklistId> <taskId>
gog tasks undo <tasklistId> <taskId>

# 태스크 삭제
gog tasks delete <tasklistId> <taskId>
gog tasks clear <tasklistId>   # 완료된 것만 삭제
```

## Gmail

```bash
# 검색 — Gmail 쿼리 문법 사용
gog gmail search "newer_than:7d" --max 10
gog gmail search "from:someone@example.com subject:report"
gog gmail search "is:unread" --all               # 전체 페이지

# 메시지 조회
gog gmail get <messageId>

# 스레드 조회 — thread get 서브커맨드
gog gmail thread get <threadId>

# 스레드 첨부파일 목록
gog gmail thread attachments <threadId>

# 메일 발송 — --to, --subject, --body 필수
gog gmail send --to "a@b.com" --subject "제목" --body "내용"
gog gmail send --to "a@b.com" --subject "첨부" --body "내용" --attach /path/to/file
gog gmail send --to "a@b.com" --cc "cc@b.com" --subject "제목" --body "내용"
gog gmail send --body-file /tmp/content.txt --to "a@b.com" --subject "제목"

# 라벨
gog gmail labels list                             # 라벨 목록
gog gmail labels get <labelIdOrName>              # 라벨 상세
gog gmail labels modify <threadId> --add STARRED  # 스레드에 라벨 추가
gog gmail labels modify <threadId> --remove INBOX  # 라벨 제거
```

## Drive

```bash
gog drive ls [--folder <folderId>] [--max 20]
gog drive search "query" --max 10
gog drive get <fileId>
gog drive download <fileId> --out /tmp/
gog drive upload /path/to/file [--folder <folderId>]
gog drive mkdir "폴더명" [--parent <folderId>]
gog drive share <fileId> --anyone --role reader
gog drive permissions <fileId>
gog drive delete <fileId>
gog drive move <fileId> --to <folderId>
gog drive rename <fileId> "새이름"
gog drive url <fileId>                            # 웹 URL 출력
```

## Contacts

```bash
gog contacts list --max 20
gog contacts search "이름"
gog contacts get <resourceName>
# create — --given 필수 (--given-name 아님!)
gog contacts create --given "이름" --family "성" --email "a@b.com" --phone "010-1234-5678"
gog contacts update <resourceName> --given "새이름"
gog contacts delete <resourceName>
```

## Sheets

```bash
gog sheets get <spreadsheetId> "Sheet1!A1:D10" --json
gog sheets update <spreadsheetId> "Sheet1!A1:B2" '[["A","B"],["1","2"]]' --input USER_ENTERED
gog sheets append <spreadsheetId> "Sheet1!A:C" '[["x","y","z"]]'
gog sheets clear <spreadsheetId> "Sheet1!A2:Z"
gog sheets metadata <spreadsheetId>
gog sheets create "새 스프레드시트"
```

## Docs

```bash
gog docs cat <docId>                              # 텍스트 읽기
gog docs info <docId>                             # 문서 정보
gog docs export <docId> --format txt --out /tmp/doc.txt
gog docs export <docId> --format pdf --out /tmp/doc.pdf
gog docs create "새 문서"
gog docs write <docId> "내용"                      # 덮어쓰기
gog docs insert <docId> "삽입할 내용"               # 끝에 추가
gog docs find-replace <docId> "찾기" "바꾸기"
```

## Chat (Google Workspace only)

**주의**: Google Chat API는 Workspace 계정만 지원. 개인 Gmail 불가.
반드시 `--account jhkim2@goqual.com` (또는 다른 Workspace 계정) 사용.

```bash
# 스페이스/DM 목록 조회
gog chat spaces list

# 메시지 읽기
gog chat messages list <spaceId> --max 20

# 메시지 보내기
gog chat messages send <spaceId> --text "메시지"

# DM 보내기
gog chat dm send <userId> --text "DM 메시지"
```

## Shortcuts

```bash
gog send          # gmail send
gog ls            # drive ls
gog search        # drive search
gog download      # drive download
gog upload        # drive upload
gog whoami        # people me
```

## Output Formats

```bash
gog --json <command>                  # JSON 출력
gog --plain <command>                 # TSV 출력 (스크립팅용)
gog <command> --json --results-only   # envelope 제거
gog <command> --json --select "id,summary,start"  # 필드 선택
```

## Auth Management

```bash
gog auth status
gog auth list              # 등록된 계정 목록
gog auth credentials set <json> --client <name>
gog auth add <email> --client <name> --services <list> --manual
gog auth alias set <alias> <email>
```

## Common Flags

```bash
--account <email>     # 계정 지정 (필수 시)
--json / -j           # JSON 출력
--plain / -p          # TSV 출력
--dry-run / -n        # 실행하지 않고 확인만
--force / -y          # 확인 생략
--no-input            # 프롬프트 없이 실패 (CI용)
--verbose / -v        # 상세 로깅
```

## Notes

- **확인 필요**: 메일 발송, 이벤트 생성/삭제 전 반드시 사용자 확인
- **calendarId**: calendar create/get/update/delete에 필수. 보통 계정 이메일
- **--from/--to**: calendar의 시간 플래그 (--start/--end 아님!)
- **--given/--family**: contacts의 이름 플래그 (--given-name/--family-name 아님!)
- `--json`과 `jq` 조합으로 스크립팅 가능
- `gog schema`로 머신 리더블 명령어 스키마 조회
- `gog <command> --help`로 항상 최신 플래그 확인 가능
