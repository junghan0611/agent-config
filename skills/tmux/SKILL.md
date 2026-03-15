---
name: tmux
description: Use tmux instead of bash tool to run commands that take more than ~30 seconds, like bulk operations, db migrations, dev servers.
---

# tmux for Long-Running Processes

에이전트가 장시간 명령을 실행할 때 tmux를 사용한다.
`nohup`, `&` 같은 백그라운딩은 bash 도구에서 쓰지 않는다.

## Start a Process

```bash
tmux new-session -d -s <name> '<command> > /tmp/pi-tmux-<name>.log 2>&1'
```

**이름 규칙**: `dev-server`, `nix-build`, `deploy` 같이 용도를 알 수 있게.

```bash
# 단일 명령
tmux new-session -d -s nix-build 'nixos-rebuild switch > /tmp/pi-tmux-nix-build.log 2>&1'

# 복합 명령 — 중괄호로 감싸서 출력 통합
tmux new-session -d -s deploy '{ npm install && npm run build; } > /tmp/pi-tmux-deploy.log 2>&1'
```

## User Visibility (필수)

세션 시작 직후 반드시 사용자에게 모니터링 명령을 알려준다:

```bash
# 실시간 모니터링
tmux attach -t <name>
# 빠져나오기: Ctrl+b d

# 출력 한번 확인
tmux capture-pane -p -J -t <name> -S -200

# 로그 스트림
tail -f /tmp/pi-tmux-<name>.log
```

## List / Find Sessions

```bash
# 기본
tmux ls

# 상세 (이름 필터링 포함)
{baseDir}/scripts/find-sessions.sh
{baseDir}/scripts/find-sessions.sh -q nix
```

## Read Output

**장시간 프로세스** — 로그 파일 사용 (프로세스 종료 후에도 남음):
```bash
tail -100 /tmp/pi-tmux-<name>.log
```

**인터랙티브 도구** (REPL, 프롬프트):
```bash
tmux capture-pane -p -J -t <name> -S -200
```

세션 시작 후 ~0.5초 대기 후 읽기.

## Stop a Session

```bash
tmux kill-session -t <name>
```

## Send Input

```bash
# 텍스트 전송 (리터럴, 셸 확장 방지)
tmux send-keys -t <name> -l -- "input text"
tmux send-keys -t <name> Enter

# 컨트롤 키
tmux send-keys -t <name> C-c
tmux send-keys -t <name> C-d
```

**규칙**: `-l`로 리터럴 텍스트, 키 이름으로 컨트롤 키, `Enter`는 별도 인자.

## Wait for Prompt (인터랙티브 동기화)

REPL 등에서 다음 입력 전에 프롬프트를 기다린다:

```bash
# Python 프롬프트 대기
{baseDir}/scripts/wait-for-text.sh -t <name>:0.0 -p '^>>> ' -T 15

# 특정 메시지 대기 (고정 문자열)
{baseDir}/scripts/wait-for-text.sh -t <name>:0.0 -p 'Server started' -F -T 30
```

타임아웃 시 최근 출력을 stderr로 보여준다.

## Rules

1. **항상 출력 리다이렉트** → `/tmp/pi-tmux-<name>.log`
2. **설명적 세션 이름** 사용
3. 생성 전 **`tmux ls`** 확인 (이름 충돌 방지)
4. 시작 직후 **사용자 모니터링 명령** 출력
5. **안전한 입력**: `send-keys -l --` + `Enter` 별도
6. **인터랙티브 동기화**: `wait-for-text.sh` 사용
7. **정리**: 완료 후 세션 kill, 로그는 재량껏
