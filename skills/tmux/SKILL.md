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

# 복합 명령 — && 또는 ; 로 한 줄에 이어쓰기
tmux new-session -d -s deploy '{ cd ~/project && npm install && npm run build; } > /tmp/pi-tmux-deploy.log 2>&1'
```

### ⚠️ 여러 줄 명령 — 이스케이프 함정

tmux new-session의 명령 인자는 **반드시 한 줄**이어야 한다.
`\n`을 넣으면 리터럴로 합쳐져서 `bashncd: command not found` 같은 에러가 난다.
tmux + bash -c + nix run 같은 중첩이 깊어지면 이스케이프가 기하급수적으로 복잡해진다.

```bash
# ❌ 줄바꿈 리터럴 → "bashncd" 합쳐짐
tmux new-session -d -s build "bash\ncd ~/repos\nmake"

# ❌ bash -c 안에 또 bash -c → 3중 이스케이프 지옥
tmux new-session -d -s build "bash -c \"nix run .#yocto -- -c \\\"make\\\"\""

# ✅ 방법 1: && 로 한 줄에 이어쓰기 (가장 안전)
tmux new-session -d -s build 'cd ~/repos && make > /tmp/pi-tmux-build.log 2>&1'

# ✅ 방법 2: 복잡하면 스크립트 파일로 빼기 (중첩 깊을 때 권장)
cat > /tmp/pi-tmux-build.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
cd ~/repos/3rd/yocto
nix run .#yocto -- -c "bitbake core-image-weston"
SCRIPT
chmod +x /tmp/pi-tmux-build.sh
tmux new-session -d -s build '/tmp/pi-tmux-build.sh > /tmp/pi-tmux-build.log 2>&1'
```

**원칙: 중첩이 2단계 이상이면 스크립트 파일로 빼라.** 이스케이프를 정확히 맞추는 것보다 파일로 빼는 게 빠르고 안전하다. 실패하면 왜 실패했는지도 디버깅이 쉽다.

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
