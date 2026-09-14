---
name: punchout
description: "하루/주간 마무리 도장 — day-query 결과를 org-mode 형식으로 저널에 삽입. 하루 마무리 시 '/punchout' 한 번이면 끝. 주 단위 회고는 '주간 마무리' 섹션으로 week 파일에 통합 삽입. Use when user says 'punchout', '퇴근', '오늘 마무리', '하루 마무리', 'punch out', '도장', '주간 마무리', '지난주 정리', 'weekly wrap-up', or wants a daily/weekly summary written to journal."
user_invocable: true
---

# punchout — 하루/주간 마무리 도장

day-query 결과를 **org-mode 호환 형식**으로 저널에 삽입한다. 기본은 하루 단위, 요청 시 주간 통합으로도 찍는다(아래 [주간 마무리](#주간-마무리-weekly) 참고).

## When to Use

- `/punchout` — 기본 (오늘)
- `/punchout 2026-02-22` — 특정 날짜
- "퇴근", "하루 마무리", "오늘 마무리", "도장 찍어줘", "펀치아웃"
- "주간 마무리", "지난주 정리해줘", "이번주 마무리", "week 파일 도장" — [주간 마무리](#주간-마무리-weekly) 참고

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
주간 마무리는 헤딩 텍스트("주간 마무리")로 따로 검색한다 — 같은 파일에 일간 `:PUNCHOUT:`이 여럿 있어도 정상이다.

## 주간 마무리 (Weekly)

Denote 주간 저널(`journal/<월요일ID>__journal_weekNN.org`, 월~일 한 파일)을 통째로 훑어 **한 주 통합 punchout**을 그 파일에 한 번 찍는다. 일간 punchout(하루 단위, `* YYYY-MM-DD Day` 아래 여러 번)과는 별개 블록이며 서로 덮어쓰지 않는다.

### 1단계: 대상 주 확정

```bash
denotecli day <DATE> --dirs ~/org   # DATE는 대상 주 아무 날짜(보통 지난주 아무 요일)
```

`journal.source`가 대상 week 파일. 파일명·`#+title`·헤딩(`* YYYY-MM-DD Day`)에서 월요일~일요일 날짜 범위를 확정한다.

### 2단계: 요일별 커밋 합산

`gitcli day`에는 주 단위 옵션이 없다 — 7일을 개별 호출해 `repos_summary`를 리포별로 합산한다.

```bash
for d in <월요일> <화> <수> <목> <금> <토> <일요일 날짜들>; do
  gitcli day "$d" --me --summary
done
```

리포명 키는 `repos_summary[].name`(day-query 관례인 `.repo`가 아니다). 합산 후 커밋 많은 순으로 정렬.

### 3단계: 저널 전체 정독

week 파일을 처음(월)부터 끝(일)까지 읽는다. 요일 헤딩(`* YYYY-MM-DD Day`)마다:
- 그날 이미 일간 `:PUNCHOUT:` 블록이 있으면 그 요약(리포·타임라인·건강 데이터)을 그대로 재사용 — 다시 계산하지 않는다.
- 없는 요일(주말에 흔함)은 그날의 헤딩/본문에서 상징적인 사건 1~2개를 직접 추출한다.

### 4단계: 건강 데이터

일간 punchout에 이미 박힌 `수면 Xh · 걸음 N · 심박 평균 N` 값을 그대로 가져와 요일별로 나열한다. 일간 punchout이 없는 요일만 `lifetract read <DATE>`로 재확인하고, 그래도 없으면 그 요일은 생략하고 "요일들 미기록"으로 한 줄에 정리한다(lifetract가 며칠씩 자동 기록이 비는 일이 흔하다).

### 5단계: `#+description` 갱신

파일 상단 `#+description:`은 보통 그 주 첫 며칠(작성 당시 시점)까지만 담겨 있다. 요일별 아크를 월→일 순서로 한 문단에 압축해 **전체 주**를 다시 요약하고 덮어쓴다. 하루짜리 문장을 이어붙이지 말고, 그 주를 관통하는 흐름(고민 시작 → 전환 → 정착 같은)으로 다시 쓴다.

### 6단계: 삽입 위치와 형식

일요일 섹션의 마지막 엔트리 **뒤**, `* NEWNOTES` 헤딩 **바로 위**에 삽입한다(일간 규칙과 동일하게 기존 내용은 건드리지 않는다).

```org
** HH:MM 주간 마무리 :PUNCHOUT:
<YYYY-MM-DD Sun HH:MM>

*N커밋 · M리포* (YYYY-MM-DD~MM-DD)

- 리포명 (커밋수) — 한줄 설명 (그 주에 있었던 일 위주)
- 리포명 (커밋수) — 한줄 설명
- 리포명 (커밋수), 리포명 (커밋수) — 소규모는 묶기
- 그 외 리포A·리포B·... 각 N — 소규모 다발 한 줄로 묶기

타임라인:
- MM-DD(월) 그날 상징적 사건 1~2개
- MM-DD(화) 그날 상징적 사건 1~2개
- ... (일요일까지 7줄)

수면·걸음·심박: 월(Xh·N보·N) · 화(Xh·N보·N) · ... — 미기록 요일은 뒤에 "OO/OO 미기록"으로 표기
```

일간 규칙(3·4·5·7·8번)을 그대로 따르되, 첫 줄에 `(YYYY-MM-DD~MM-DD)` 날짜 범위를 덧붙이고 타임라인은 시각이 아니라 **요일 단위 불릿 리스트**로 쓴다.

### 7단계: 재구성 노트 (작성 시점이 그 주 이후일 때)

주간 마무리는 보통 다음 주(또는 그 이후)에 회고로 작성된다. 블록 끝에 `[!assistant]` 인용을 하나 덧붙여 **언제·왜 다시 훑었는지, description도 같이 갱신했는지, 커밋/건강 데이터 출처**를 한 단락으로 남긴다.

```org
#+begin_quote
[!assistant]

[YYYY-MM-DD] 주간 마무리 재구성 — 일간 punchout이 N번뿐이라(요일 미기록 포함) GLG 요청으로 저널 전체를 다시 훑어 주간 통합으로 새로 썼다. 위 description(#+description)도 같은 이유로 갱신했다. 커밋 집계는 gitcli day×7 합산, 건강 데이터는 일일 punchout에 이미 박혀 있던 값을 그대로 가져왔다.
#+end_quote
```

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

주간 마무리 예시(week 파일, 일요일 섹션 끝):

```org
** 22:35 주간 마무리 :PUNCHOUT:
<2026-09-13 Sun 22:35>

*389커밋 · 24리포* (2026-09-07~09-13)

- homepage (63) — Hextra 재구축에서 SICM/Emmy eval 페이지까지
- entwurf (62) — 0.19.0→0.21.0 릴리즈 릴레이, codex 네이티브 시민 지원(#95)
- agent-config (49) — omp 역할 서브에이전트 금지, decision-gate 정비
- works-nixos-zigbee (33), prime-agent (29), botschaft (26) — 지그비 이관 / RLM / ChatGPT 웹 어댑터 신설
- 그 외 homeagent-config·nixos-config·butlercli·sorge 등 18리포 각 2~22 — 소규모 다발

타임라인:
- 09-07(Mon) "내 에이전트가 아니라 나를 아는 존재를 부르는 일" 루프 고민 시작
- 09-08(Tue) sorge/AIONSCLUBS B에게 "이 리포 자체가 B다" 정체성 세움
- 09-09(Wed) B 하트비트 415회 연속 NO_REPLY "반사였다" 진단
- 09-10(Thu) botschaft 신설, homepage eval 구상
- 09-11(Fri) entwurf codex 하네스 지원(#95) 완료
- 09-12(Sat) B 오토파일럿을 AIONSCLUBS 자체 진화로 돌려보내는 결정
- 09-13(Sun) entwurf 0.21.0(codex native citizen) 릴리즈

수면·걸음·심박: 월(6.4h·5,561보·108) · 화(6h·5,164보·106) · 수(5.8h·4,678보·104.1) · 목(6.5h·6,934보·106) · 금(5.1h·4,568보·105) — 토/일 미기록

#+begin_quote
[!assistant]

[2026-09-14] 주간 마무리 재구성 — 일간 punchout이 월~금 다섯 번뿐이라(토/일 미기록) GLG 요청으로 저널 전체를 다시 훑어 주간 통합으로 새로 썼다. 위 description도 같은 이유로 갱신했다. 커밋 집계는 gitcli day×7 합산, 건강 데이터는 일일 punchout에 이미 박혀 있던 값을 그대로 가져왔다.
#+end_quote
```

## 주의사항

- org 파일이므로 **모든 출력은 plain text + org 문법**만 사용
- 에이전트 응답도 간결하게: "하루 마무리 도장 찍었습니다 ✓" + 삽입 내용 요약
- 사용자가 Emacs에서 바로 볼 수 있어야 한다
