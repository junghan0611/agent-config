---
name: session-recap
description: "직전 세션 요약 추출 — 세션 JSONL에서 핵심 텍스트만 뽑아 빠르게 맥락 복원. '직전에 뭐했지', '이전 세션', '무슨 작업', 'what did I do', 'last session'. raw JSONL read 대신 사용 — 100KB → 4KB로 85% 토큰 절감."
---

# session-recap — 세션 요약 추출

세션 JSONL에서 user/assistant **텍스트만** 추출한다.
raw JSONL을 `read`하면 50KB JSON 노이즈가 컨텍스트에 들어가므로 **절대 하지 않는다.**

**멀티 하네스 지원**: pi와 Claude Code 세션 모두 처리. `--source`로 필터링 가능.

## API

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15
```

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project NAME` | all | Project filter (exact match). **Always specify.** |
| `-m, --messages N` | 20 | Last N messages per session |
| `-s, --sessions N` | 1 | Last N sessions |
| `-c, --chars N` | 300 | Max chars per message |
| `-a, --all-projects` | - | Include all projects |
| `--commits` | off | Include git commit commands |
| `--cost` | off | Session cost summary |
| `--skip N` | 1 | Skip latest N sessions (current) |
| `-f, --format` | text | `text` or `json` |
| `--source` | all | `pi`, `claude`, or `all`. 하네스 필터 |

## Examples

```bash
# 직전 세션
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15

# 이전 세션 요약 + 비용
python3 {baseDir}/scripts/session-recap.py -p dictcli -m 20 --cost

# 전체 최근 세션
python3 {baseDir}/scripts/session-recap.py -a -m 10

# 최근 3개 세션
python3 {baseDir}/scripts/session-recap.py -p notes -s 3 -m 10

# 커밋 목록
python3 {baseDir}/scripts/session-recap.py -p nixos-config --commits

# pi 세션만
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source pi

# Claude Code 세션만
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source claude

# 양쪽 통합 (기본값)
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source all
```

## -p 프로젝트명 결정

프로젝트명 = 리포 디렉토리명 (~/repos/gh/**agent-config** → `agent-config`).

| CWD | `-p` value |
|-----|-----------|
| `~/repos/gh/agent-config` | `agent-config` |
| `~/repos/work/some-proj` | `some-proj` |
| `/home/junghan` (홈) | `home` |

`-p` 없으면 전체 프로젝트에서 최신 1개 — 다른 리포 세션이 나올 수 있다.

## Workflow: "직전에 뭐했지?"

```
Step 1: python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15 --source pi
Step 2: 결과가 비었거나 짧으면 → --source all 또는 -s 3 --skip 0
Step 3: 결과를 읽고 요약 답변
```

**왜 `--source pi` 먼저?** Claude Code는 재시작마다 새 JSONL을 만들어서,
`--source all`(기본)이면 메시지 1~2개짜리 짧은 세션으로 결과가 도배된다.
pi 세션이 실질적인 작업 기록이므로 먼저 시도.

**하지 말 것:**
- ❌ `read`로 세션 JSONL 직접 읽기 (50KB JSON 노이즈)
- ❌ `session_search` 후 원본 JSONL 확인 (불필요한 중복)
- ❌ 결과가 안 나온다고 같은 명령어를 옵션만 바꿔 5회 이상 반복

## Cost

| Method | Context | Cost |
|--------|---------|------|
| raw JSONL read | ~100KB | ~$0.63 |
| **session-recap** | ~4KB | ~$0.09 |
