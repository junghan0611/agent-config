---
name: entwurf-peek
description: "sync entwurf 자식을 들여다보는 손. 호출자가 'Mattering...'에 묶여있을 때 자식 분신이 무엇을 하는지 확인. entwurf_peers는 control socket 있는 세션만 보여주는데, 이 스킬은 자식 entwurf-*.jsonl까지 합쳐서 본다. 트리거: 'entwurf-peek', '분신 들여다보기', '진행 중 세션', 'sync entwurf 안에서', 'peek session', 'live session map', '분신 추적'."
---

# entwurf-peek — 분신을 들여다보는 손

세 개의 서브커맨드. control socket 디렉토리 + 세션 JSONL fs 스캔만으로 동작.
pi-shell-acp 새 surface 없음. session-recap의 JSONL 파서 패턴 재사용.

## API

```bash
python3 {baseDir}/scripts/entwurf-peek.py <subcommand> [options]
```

| Subcommand | Purpose | Example |
|------------|---------|---------|
| `peek <id>` | 세션 안 마지막 메시지 + 활성 여부 | `peek ddb3cbb2` |
| `map` | 살아있는 세션 전체 지도 (sockets + 최근 entwurf 파일) | `map -p abductcli` |
| `trace <parent>` | 부모가 던진 자식 entwurf 추적 | `trace 019dddb0` |

### Common flags

| Flag | Where | Description |
|------|-------|-------------|
| `--plain` | global | ASCII fallback (`[ACTIVE]/[IDLE]/[DONE]` 대신 `🔴🟡⚫`) |

### `peek <id|file>`

| Flag | Default | Description |
|------|---------|-------------|
| `-m, --messages N` | 4 | 마지막 N개 user/assistant 메시지 |
| `-t, --tools N` | 5 | 최근 N개 inline tool 흔적 |
| `-c, --chars N` | 200 | 요소당 최대 글자 |
| `--thinking` | off | 최근 thinking 블록 1개 포함 |

`<id>`는 8-hex (`ddb3cbb2`), full UUID (`019dddb0-...`), `entwurf-xxx`, 또는 직접 파일 경로.

### `map`

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project NAME` | all | cwd 디렉토리명 부분 매치 (e.g. `abductcli`, `agent-config`) |
| `--since SEC` | 3600 | 최근 N초 이내 활동한 세션. control socket 있는 세션은 강제 포함 |
| `-a, --all` | off | done 상태도 포함 |

활성도: `<30s` → 🔴 active · `<5m` → 🟡 idle · `5m+` → ⚫ done. 🔌 = active control socket.

### `trace <parent-id|file>`

| Flag | Default | Description |
|------|---------|-------------|
| `--heuristic` | off | declared 매치 외 시간 인접 자식도 포함 (±2h) |

자식 매칭은 부모 JSONL의 `[tool:done] mcp__pi-tools-bridge__entwurf — Task ID: <hex>` 텍스트에서 추출. 이게 1차 시그널.

## Examples

```bash
# 진행 중 자식 분신 들여다보기
python3 {baseDir}/scripts/entwurf-peek.py peek ddb3cbb2

# thinking까지 보고 싶을 때
python3 {baseDir}/scripts/entwurf-peek.py peek ddb3cbb2 --thinking

# 지금 살아있는 세션 전부
python3 {baseDir}/scripts/entwurf-peek.py map

# 특정 cwd만 (abductcli 부모-자식 묶어서 보기)
python3 {baseDir}/scripts/entwurf-peek.py map -p abductcli -a --since 7200

# 부모로부터 자식 entwurf 트리
python3 {baseDir}/scripts/entwurf-peek.py trace 019dddb0
```

## Workflow: "내가 던진 분신이 뭐 하고 있지?"

```
Step 1: map  →  살아있는 세션 그림 잡기
Step 2: trace <my-session-id>  →  내 자식들 식별
Step 3: peek <child-id>  →  자식 마지막 활동 확인
Step 4: 활성도가 ⚫ DONE이면 결과 회수, 🟡 IDLE이면 잠시 대기, 🔴 ACTIVE이면 진행 중
```

Sync entwurf로 호출자가 "Mattering..."에 묶여있을 때, **다른 세션에서** 이 스킬을 돌려 자식의 실시간 상태를 확인한다. peers MCP는 control socket이 있는 UUID 세션만 보여주지만, 자식 `entwurf-*.jsonl`은 socket이 없어 peers에 안 잡힌다 — 이걸 메우는 도구.

## Output 규칙

- 헤더에 항상 `═══ {icon} {kind}-{short_id} ({age}) ═══` 형식 — 무엇을 보고 있는지 고정
- 메시지/thinking은 `--chars`로 자르고, 줄바꿈은 공백으로 치환 (한 줄 압축)
- inline `[tool:start]/[tool:done]` 텍스트는 `🔧 recent tools` 섹션에 별도 분리

## 한계 및 신뢰 경계

- **활성 판정은 mtime 기반만**: 자식 entwurf-*는 control socket이 없어서 프로세스 살아있는지 직접 못 본다. mtime이 멈춘 지 5분이면 done으로 분류 — 진짜 죽었는지 확신 못 함
- **부모-자식 매칭**: declared(1차)는 강한 시그널. `--heuristic`은 시간 인접만 보므로 같은 cwd에서 다른 부모가 던진 entwurf와 섞일 수 있음
- **partial line 안전**: 마지막 라인이 writer-in-progress면 자동 스킵 (json decode 실패 시 무시)

## Cost

| 작업 | Context | 대안 |
|------|---------|------|
| `peek` | ~2KB | raw JSONL read ~50KB |
| `map` | ~1KB | 수동 ls+stat 조합 5+ 호출 |
| `trace` | ~1KB | 수동 grep+ls 조합 |
