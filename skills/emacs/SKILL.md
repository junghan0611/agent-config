---
name: emacs
description: "Emacs daemon 연결 — org 파일 조작, denote 검색, 서지 조회, dblock 업데이트, 임의 Elisp 실행. emacsclient로 호스트의 Emacs 30.2 daemon에 접속."
---

# Emacs Agent Server

호스트의 Emacs 30.2 daemon에 `emacsclient`로 접속하여 org 파일을 조작한다.
Nix store 마운트 방식으로 Docker 안에서도 동일 바이너리가 동작한다.

## ⚠️ 중요: `emacsclient` 직접 호출 금지

**절대 `emacsclient`를 직접 호출하지 마라.** PATH에 없으면 실패한다.
반드시 아래 `ec()` 함수를 통해서만 호출할 것.

## 접속 방법

환경에 따라 경로가 다르다. **자동 감지 스크립트를 먼저 실행:**

```bash
# 환경 자동 감지 — 이것을 복붙해서 실행
if [ -x /nix/store/hs9vi37k7ikrjv72w6mampipxrlr34ya-emacs-nox-30.2/bin/emacsclient ]; then
  # Docker 컨테이너 또는 NixOS 호스트
  ec() {
    /nix/store/hs9vi37k7ikrjv72w6mampipxrlr34ya-emacs-nox-30.2/bin/emacsclient \
      -s /run/emacs/agent-server --eval "$1"
  }
elif command -v emacsclient &>/dev/null; then
  # 로컬 (emacsclient가 PATH에 있는 경우)
  ec() { emacsclient -s agent-server --eval "$1"; }
else
  echo "ERROR: emacsclient를 찾을 수 없음"
fi
```

| 환경 | emacsclient 경로 | 소켓 |
|------|------------------|------|
| Docker (OpenClaw 봇) | `/nix/store/.../bin/emacsclient` | `/run/emacs/agent-server` |
| NixOS 로컬 (pi) | `emacsclient` (PATH) | `agent-server` (기본 검색) |

**접속 확인:**
```bash
ec '(+ 1 1)'  # → 2 가 나오면 정상
```

## 제공 함수 (API)

### agent-server-status
서버 상태 확인. 버전, 로드된 패키지, 업타임 반환.
```bash
ec '(agent-server-status)'
```

### agent-org-read-file
org 파일 내용을 문자열로 반환. 절대경로 필요.
```bash
ec '(agent-org-read-file "/home/junghan/org/notes/20260227T141200--제목__태그.org")'
```

### agent-org-get-headings
org 파일의 헤딩 목록을 (LEVEL TITLE) 리스트로 반환.
```bash
ec '(agent-org-get-headings "/path/to/file.org")'       # 모든 레벨
ec '(agent-org-get-headings "/path/to/file.org" 2)'     # 레벨 2까지
```

### agent-org-get-properties
파일 수준 메타데이터(#+TITLE, #+DATE, #+FILETAGS, #+IDENTIFIER, #+REFERENCE) 반환.
```bash
ec '(agent-org-get-properties "/path/to/file.org")'
```

### agent-denote-search
Denote 노트 검색. TYPE: title(기본), tag, fulltext.
```bash
ec '(agent-denote-search "에이전트" (quote title))'
ec '(agent-denote-search "emacs" (quote tag))'
ec '(agent-denote-search "OpenClaw" (quote fulltext))'
```
반환: (ID TITLE TAGS FILE) 리스트.

### agent-citar-lookup
서지 데이터 검색. 최대 결과 수 지정 가능(기본 10).
```bash
ec '(agent-citar-lookup "karpathy")'
ec '(agent-citar-lookup "transformer" 5)'
```

### agent-org-dblock-update
org 파일의 동적 블록(#+BEGIN: ... #+END:)을 업데이트하고 저장.
```bash
ec '(agent-org-dblock-update "/path/to/file.org")'
```

## 자유 Elisp 실행 (REPL)

위 함수 외에 임의의 Elisp를 실행할 수 있다. **이것이 핵심 기능.**

```bash
# Emacs 버전 확인
ec '(emacs-version)'

# org 버전 확인
ec '(org-version)'

# 버퍼 목록
ec '(mapcar #'\''buffer-name (buffer-list))'

# 새 함수 정의 (런타임 확장)
ec '(defun my-custom-fn (x) (format "hello %s" x))'
ec '(my-custom-fn "world")'

# org 파일 특정 헤딩 내용 추출
ec '(with-temp-buffer
      (insert-file-contents "/path/to/file.org")
      (org-mode)
      (goto-char (point-min))
      (when (re-search-forward "^\\* 원하는 헤딩" nil t)
        (org-get-entry)))'
```

## 보안: 경로 접근 제어

emacs daemon은 호스트에서 실행된다. Docker의 ro 마운트와 별개로,
**agent-server.el 내부에 경로 가드**가 있다.

### 읽기 허용 경로
- `/home/junghan/org/`
- `/home/junghan/repos/gh/`
- `/home/junghan/repos/work/`
- `/home/junghan/repos/3rd/`

### 쓰기 허용 경로 (Docker rw 마운트와 일치)
- `/home/junghan/org/botlog/` — botlog 작성
- `/home/junghan/repos/gh/self-tracking-data/` — lifetract DB

### 제한 사항
- API 함수(`agent-org-read-file`, `agent-org-dblock-update` 등)는 경로 가드 적용됨
- **자유 elisp(`emacs_eval`)은 가드 미적용** — `write-region` 등으로 우회 가능
- 따라서: **파일 쓰기는 반드시 API 함수를 통해서만**. 직접 `write-region` 사용 금지.
- `dblock-update`는 쓰기 권한이 필요하므로 botlog 등 쓰기 허용 경로에서만 동작

## 주의사항

- **경로**: `/home/junghan/org/`는 호스트의 `~/org/`를 가리킴 (Docker 마운트 아님, 호스트 직접)
- **daemon 재시작**: agent-server.el이 변경되면 daemon 재시작 필요.
- **소켓 없음 에러**: daemon이 꺼져있으면 `ec '...'`가 실패함. 관리자에게 알려줄 것.

## daemon 관리 (관리자용)

```bash
# 호스트에서 실행 (thinkpad: run.sh, oraclevm: emacs-agent.sh)

# thinkpad
cd ~/repos/gh/doomemacs-config && ./run.sh agent start|stop|restart|status

# oraclevm
~/openclaw/emacs-agent.sh start|stop|restart|status
```

**중요**: `--init-directory=/tmp/agent-emacs-init`으로 Doom init 우회.
`~/.emacs.d → doomemacs` 심볼릭 링크 환경에서 기존 Doom GUI 서버와 충돌 방지.

## org-agenda 통합 뷰 (핵심 기능)

전용 API 함수로 Human + Agent + Diary 통합 타임라인을 한 번에 얻는다.
파일 파싱 불필요. org-agenda가 시간순 병합, 카테고리 분류, 필터링을 모두 처리한다.

### agent-org-agenda-day
오늘(또는 특정 날짜) 일간 뷰. clean text 반환.
```bash
ec '(agent-org-agenda-day)'           # 오늘
ec '(agent-org-agenda-day "-1")'      # 어제
ec '(agent-org-agenda-day "+3")'      # 3일 후
ec '(agent-org-agenda-day "2026-03-01")'  # 특정 날짜
```

### agent-org-agenda-week
주간 뷰 (7일). clean text 반환.
```bash
ec '(agent-org-agenda-week)'          # 이번 주
ec '(agent-org-agenda-week "-7")'     # 지난 주
```

### agent-org-agenda-tags
태그 필터링 뷰. org-agenda 태그 매치 문법 사용.
```bash
ec '(agent-org-agenda-tags "commit")'         # 커밋만
ec '(agent-org-agenda-tags "pi|botlog")'      # 에이전트 활동
ec '(agent-org-agenda-tags "+emacs-draft")'   # emacs 태그 중 draft 제외
```

### 반환 예시
```
Sunday      1 March 2026
       Agent:       9:20......  botlog: 교육 지도 작성 :botlog:education:
       Human:       9:21...... Closed:  DONE 미래 교육 공간 회고
       Agent:      12:04......  pi-skills 커밋 :pi:commit:
       Human:      13:40......  SKS 허브 작업 시작
       Diary:      16:00-16:40  GTD Focus
```

### 비용과 성능

- emacsclient 호출 = 소켓 통신, LLM 토큰 소비 없음
- org-agenda 빌드 = 이맥스 내부 수십ms
- day-query 스킬에서 이 경로를 쓰면 denotecli + lifetract + gitcli + org-agenda = 완전체

### day-query 연동 가이드

day-query에서 "오늘 뭐 했지?" 응답 시:
1. `ec '(agent-org-agenda-day)'` 로 통합 타임라인 가져오기
2. gitcli로 커밋 히스토리 보완
3. lifetract로 건강/시간 데이터 추가
4. denotecli day로 생성 노트 확인

이 조합이면 하루의 모든 활동이 잡힌다.

## 언제 사용하나

- denotecli보다 **정밀한 org 구조 조작**이 필요할 때 (헤딩 파싱, 프로퍼티 추출)
- **dblock 업데이트** — denotecli로는 불가능
- **서지 검색** — citar의 풍부한 메타데이터 활용
- **새로운 org 처리 로직**을 즉석에서 만들어 테스트할 때 (REPL)
- denotecli가 텍스트 검색이라면, emacs는 **구조적 조작**
- **org-agenda 통합 뷰** — Human+Agent+Diary 타임라인을 한 번에 (day-query 연동)
