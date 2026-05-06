---
name: punchout
description: "하루 마무리 도장 — day-query 결과를 org-mode 형식으로 오늘 저널에 삽입. 하루 마무리 시 '/punchout' 한 번이면 끝. Use when user says 'punchout', '퇴근', '오늘 마무리', '하루 마무리', 'punch out', '도장', or wants a daily summary written to journal."
user_invocable: true
---

# punchout — 하루 마무리 도장

day-query 결과를 **org-mode 호환 형식**으로 오늘 저널에 삽입한다.

## When to Use

- `/punchout` — 기본 (오늘)
- `/punchout 2026-02-22` — 특정 날짜
- "퇴근", "하루 마무리", "오늘 마무리", "도장 찍어줘", "펀치아웃"

## 실행 순서

### 1단계: 현재 시각 확인

```bash
TZ='Asia/Seoul' date '+%H:%M'
```

### 2단계: day-query 데이터 수집

day-query 스킬의 1단계(개요)를 실행한다:

```bash
gitcli day <DATE> --me --summary
denotecli day <DATE> --dirs ~/org
lifetract read <DATE> --data-dir ~/repos/gh/self-tracking-data
```

`<DATE>` 기본값: 오늘 (`TZ='Asia/Seoul' date '+%Y-%m-%d'`).

### 3단계: 저널 파일 찾기

```bash
denotecli day <DATE> --dirs ~/org
```

JSON 응답의 `journal.source` 경로가 저널 파일이다.

### 4단계: 삽입 위치 결정

저널 파일에서 `* NEWNOTES` 헤딩 **바로 위**에 삽입한다.
`* NEWNOTES`가 없으면 파일 끝에 삽입.

### 5단계: org-mode 형식으로 작성

**반드시 아래 양식을 따른다.** 마크다운 표(|---|), ASCII 테이블 금지.

```org
** HH:MM 하루 마무리 :PUNCHOUT:
<YYYY-MM-DD Day HH:MM>

*N커밋 · M리포*

- 리포명 (커밋수) — 한줄 설명
- 리포명 (커밋수) — 한줄 설명
- 리포명 (커밋수), 리포명 (커밋수) — 소규모는 묶기

타임라인: HH:MM 내용 → HH:MM 내용 → HH:MM 내용
```

### 양식 규칙

1. **헤딩**: `** HH:MM 하루 마무리 :PUNCHOUT:` (현재 시각, 태그 필수)
2. **타임스탬프**: 헤딩 바로 아래 `<YYYY-MM-DD Day HH:MM>` (org-agenda 연동 필수)
3. **첫 줄**: bold 한줄 요약 — `*총커밋 · 리포수*`
   - 시간범위(`HH:MM~HH:MM`)나 지속시간(`Xh`)은 넣지 않는다.
   - 커밋 시각은 실제 작업 시작/종료를 대변하지 못하므로 punchout 요약에서 제외한다.
4. **리포 목록**: org 리스트(`- `) — 커밋 많은 순, 3개 이하는 한 줄로 묶기
5. **타임라인**: 저널 엔트리를 `→`로 연결한 한 줄 (너무 길면 2줄까지)
6. **건강 데이터**: lifetract에 데이터 있으면 추가:
   - `수면 Xh · 걸음 N · 심박 평균 N`
7. **커밋 0건인 날**: 리포 목록 대신 `코딩 활동 없음` 한 줄
8. **절대 금지**:
   - 마크다운 표 (`| col1 | col2 |`)
   - ASCII 테이블
   - 코드블록 안에 요약 넣기
   - `#+BEGIN_SRC` 래핑

### 6단계: edit 도구로 삽입

```
edit(
  path: 저널파일경로,
  oldText: "* NEWNOTES",
  newText: "<punchout 블록>\n\n* NEWNOTES"
)
```

**기존 내용은 절대 건드리지 않는다.** `* NEWNOTES` 앞에 끼워넣기만.

## 중복 방지

삽입 전에 저널 파일에서 `:PUNCHOUT:` 태그를 검색한다.
이미 있으면 "이미 punchout이 있습니다. 덮어쓸까요?" 확인 후 진행.

## 출력 예시

```org
** 19:05 하루 마무리 :PUNCHOUT:
<2026-02-27 Fri 19:05>

*84커밋 · 6리포*

- homeagent-config (34) — 홈에이전트 설정 집중
- pi-skills (20) — 스킬 업데이트/계층화
- sks-hub-zig (17) — 회사 프로젝트
- gitcli (6), denotecli (4), pi-mono (3) — CLI 개선

타임라인: 10:00 출근 → 11:32 식사 → 15:04 에이전트 개선 → 15:48 계층화 → 17:14 "오늘 많이했다" → 18:49 캘린더 등록

수면 6.5h · 걸음 8,234 · 심박 평균 72
```

## 주의사항

- org 파일이므로 **모든 출력은 plain text + org 문법**만 사용
- 에이전트 응답도 간결하게: "하루 마무리 도장 찍었습니다 ✓" + 삽입 내용 요약
- 사용자가 Emacs에서 바로 볼 수 있어야 한다
