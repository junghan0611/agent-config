---
name: session-recap
description: "직전 세션 요약 추출 — 세션 JSONL에서 핵심 텍스트만 뽑아 빠르게 맥락 복원. '직전에 뭐했지', '이전 세션', '무슨 작업', 'what did I do', 'last session'. raw JSONL read 대신 사용 — 100KB → 4KB로 85% 토큰 절감."
---

# session-recap — 세션 요약 추출

세션 JSONL에서 user/assistant **텍스트만** 추출한다.
raw JSONL을 `read`하면 50KB JSON 노이즈가 컨텍스트에 들어가므로 **절대 하지 않는다.**

**멀티 하네스 지원**: pi와 Claude Code 세션 모두 처리. **기본 source는 현재 하네스**
(Claude Code에서 돌면 `claude`, 그 외 pi). 같은 하네스의 세션을 봐야 직전 작업을
명확히 이어갈 수 있다. `--source`로 override 가능.

**코퍼스 필터** (andenken `session-indexer.ts`와 정합 — 0d4432b "tighten corpus to
garden-native >300KB, drop tmp + legacy"). 세션 임베딩과 동일 규율로 핵심 세션만 본다:

- **tmp 디렉토리 제외** (양 런타임) — pi `--tmp…--` / claude `-tmp…` scratch.
- **300KB 이하 제외** (양 런타임) — `size > 300KB`. test/probe 단편 컷. `--min-kb 0`으로 끔.
- **pi garden-native 파일명만** — `_YYYYMMDDTHHMMSS-<6hex>.jsonl` (0.9.0+). 구형 종
  (`_<uuid>`/`_delegate-`/`_entwurf-`)은 제외. claude는 항상 UUID라 파일명 필터 비적용.

이 스킬은 `/recall`의 저수준 extractor다. 단일 repo/session 복원은 여기서 처리하고, cross-project 회신·day-query·journal `§`/llmlog까지 엮는 multi-axis recall은 `commands/recall.md`를 따른다. (이전 슬래시명 `/recap`은 Claude Code 내장과 충돌해 2026-05-12 rename.)

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
| `--source` | 현재 하네스 | `pi`, `claude`, `all`. 미지정 시 Claude Code=claude, 그 외=pi |
| `--min-kb N` | 300 | 세션 크기 하한, `size > N*KB`. `0`이면 끔(작은 직전 세션 회수) |

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

# 양쪽 통합 (기본은 현재 하네스만 — all로 둘 다)
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --source all

# 직전 세션이 작아(<300KB) 안 잡힐 때 — 크기 필터 끄기
python3 {baseDir}/scripts/session-recap.py -p agent-config -m 15 --min-kb 0
```

## -p 프로젝트명 결정

기본 규칙은 **CWD의 마지막 디렉토리명**이다.
프로젝트명 = 리포 디렉토리명 (~/repos/gh/**agent-config** → `agent-config`).

| CWD | `-p` value |
|-----|-----------|
| `~/repos/gh/agent-config` | `agent-config` |
| `~/repos/work/some-proj` | `some-proj` |
| `/home/junghan` (홈) | `home` |

### 중요: CWD 규칙보다 사용자 의도가 우선

다음 경우는 CWD basename을 기계적으로 쓰지 말고, **사용자가 가리킨 맥락의 프로젝트명**을 넣는다.

- "home 디렉토리 분신", "Entwurf", "분신 기록" → `-p home`
- "COS" / 비서실장 세션 → `-p cos`
- 특정 리포 담당자 세션을 명시 → 그 리포명 (`andenken`, `notes`, `pi-shell-acp` 등)

확실하지 않으면:

```bash
ls -lt ~/.pi/agent/sessions/ | head
```

로 최근 세션 디렉토리를 보고, **사용자가 말한 작업명과 최근 세션명이 일치하는지 확인**한다.

`-p` 없으면 전체 프로젝트에서 최신 1개 — 다른 리포 세션이 나올 수 있다.

## Workflow: "직전에 뭐했지?"

```
Step 0: 사용자가 말한 맥락이 home/Entwurf/COS/특정 repo 담당자인지 먼저 판별
Step 1: python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15
        (source 미지정 → 현재 하네스 자동: Claude Code면 claude, pi면 pi)
Step 2: 출력 헤더(`═══ project [source] (file...) ═══`)와 첫 1~3개 메시지로 대상 세션이 맞는지 검증
Step 3: 결과가 비었거나 짧으면 → --min-kb 0 (작은 직전 세션) → --source all → -s 3 --skip 0
Step 4: 검증된 출력만 요약 답변
```

## Escalation: multi-axis recall

다음 경우는 session-recap만으로 끝내지 말고 `/recall` 프로토콜로 확장한다.

- 조회된 세션이 1턴 entwurf / smoke / “Reply OK”처럼 짧다.
- 사용자가 “어제 전체”, “오늘 이어서”, “기억축”, “compact 없이”, “나를 리콜”을 말한다.
- 현재 repo 세션은 맞지만 agent-config/andenken/voscli 등 cross-project 회신이 중요해 보인다.
- journal의 `§repo` 마커나 llmlog가 작업의 본류일 가능성이 있다.

확장 순서: `session-recap` → 결과에서 proper noun 추출 → `session_search` 2단계 → 필요 시 `day-query` (`gitcli --summary`, `denotecli day`, `lifetract`, calendar) → 본 축/안 본 축을 함께 보고.

**왜 하네스-매칭 기본값?** 직전 작업을 이어가려면 *같은 하네스*의 세션을 봐야 한다.
Claude Code에서 돌면 claude 세션을, pi에서 돌면 pi 세션을 본다(기본값 자동). 과거엔
Claude Code가 1~2 메시지짜리 짧은 세션을 많이 만들어 `pi` 우선을 권했지만, 이제
**300KB 이하 제외 필터**가 그 단편을 걸러내므로 claude 세션도 실질 작업 기록만 남는다.
다른 하네스 기록까지 보려면 `--source all`.

## 답변 규칙 (중요)

요약 답변에는 최소한 다음 두 줄을 포함한다.

- `조회 프로젝트: <PROJECT>`
- `대상 세션: ═══ ... ═══` 의 헤더 정보

그리고 요약 내용은 **반드시 실제 출력 텍스트에만 근거**해야 한다.
기억, 다른 세션, 비슷한 작업을 섞어 추론 요약하지 말 것.

### 권장 응답 템플릿

```text
조회 프로젝트: home
대상 세션: ═══ home [pi] (2026-04-19T23-53-12-415Z_...) ═══

요약:
- ...
- ...
- ...
```

헤더를 먼저 적으면, **지금 무엇을 보고 말하는지**가 답변에 고정된다.

### 기대 주제와 출력이 다를 때

사용자가 기대한 주제(예: denote wrapper)가 출력에 없으면, 억지로 이어붙여 요약하지 말고 먼저 이렇게 말한다.

- `현재 조회된 세션에는 denote wrapper 맥락이 없습니다.`
- `지금 출력은 모델 확인/인사 세션입니다.`
- `원하면 -p home 또는 -s 3으로 다시 확인하겠습니다.`

즉, **불일치는 실패가 아니라 신호**다. 먼저 보고하고, 그 다음 범위를 넓힌다.

**하지 말 것:**
- ❌ `read`로 세션 JSONL 직접 읽기 (50KB JSON 노이즈)
- ❌ `session_search` 후 원본 JSONL 확인 (불필요한 중복)
- ❌ 결과가 안 나온다고 같은 명령어를 옵션만 바꿔 5회 이상 반복
- ❌ 스크립트 출력 헤더를 확인하지 않고 기억에 의존해 요약
- ❌ 사용자가 말한 맥락(home/Entwurf/COS/특정 repo 담당자)을 무시하고 CWD basename만 기계적으로 사용

## Cost

| Method | Context | Cost |
|--------|---------|------|
| raw JSONL read | ~100KB | ~$0.63 |
| **session-recap** | ~4KB | ~$0.09 |
