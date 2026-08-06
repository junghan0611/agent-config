---
name: entwurf-peek
description: "형제 세션의 transcript 상태를 heuristic으로 들여다보는 진단 손. entwurf_peers가 citizen의 존재와 liveness를 말해준다면, 이 스킬은 그 세션이 지금 무엇을 하는 중인지(마지막 메시지·model·tool 진행 상태)를 JSONL에서 추정한다. 존재 확인이 아니라 상태 추정이 목적이다. placement(tmux server/window/pane) 사실의 출처가 아니다. 트리거: 'entwurf-peek', '분신 들여다보기', '진행 중 세션', 'peek session', 'live session map', '분신 추적'."
---

# entwurf-peek — 분신을 들여다보는 손

세 개의 서브커맨드. live control socket probe + 세션 JSONL header/name 스캔만으로 동작.
entwurf 새 surface 없음. session-recap의 JSONL 파서 패턴 재사용.

> ⚠️ **[2026-08-06] 이 문서는 정정됐고, 코드 수선은 아직이다.**
> entwurf v2(#50 하드컷) 이후 `trace`의 자식 매칭 근거가 사라졌다 — 아래 [§trace](#trace-parent-idfile)
> 참조. `peek` / `map`은 정상 동작한다. 파서 수선은 entwurf `mux-placement` 랜딩 후,
> acceptance가 남긴 실제 부모 transcript를 fixture로 써서 한다 (entwurf PM 합의, agent-config
> `NEXT.md [2026-08-06]`).

## 이 스킬의 자리 — 무엇이 아닌가

`entwurf_peers`가 **citizen의 존재와 liveness**를 말한다(meta-record 기반, 백엔드 불문).
그건 사실이고, 이 스킬은 거기 없는 걸 메우지 않는다.

이 손이 더하는 것은 **transcript heuristic 상태 추정**이다 — 마지막 메시지가 뭐였는지, 어떤
model인지, tool이 도는 중인지. peers가 답하지 않는 "지금 뭐 하는 중인가"가 담당 범위다.

**placement 사실의 출처가 아니다.** tmux server/window/pane은 launch receipt와 placement leaf의
영역이며, 여기서 유도하거나 주장하면 안 된다. 지도를 넓히려고 이 스킬을 키우지 않는다.
(entwurf `docs/mux-launch-rail.md` §4 경계 2)

## API

```bash
python3 {baseDir}/scripts/entwurf-peek.py <subcommand> [options]
```

| Subcommand | Purpose | Example |
|------------|---------|---------|
| `peek <id>` | 세션 안 마지막 메시지 + 활성 여부 + caller + model/state | `peek 9858a7` |
| `map` | 살아있는 세션 전체 지도 (sockets + 최근 entwurf 파일 + child caller + compact model/state) | `map -p abductcli` |
| `trace <parent>` | 부모가 던진 자식 entwurf 추적 + child compact model/state | `trace 20260604T094303-842ded` |

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

`<id>`는 **session selector**다. canonical target 은 JSONL header `id` 이며, garden sessionId 전체(`20260604T094309-9858a7`)나 6-hex 접미사(`9858a7`), legacy full UUID(`019dddb0-...`), 직접 파일 경로를 받을 수 있다. 0.9.0부터 `entwurf-xxx` 같은 옛 filename/task species 는 identity authority 가 아니다.

- full id (garden 또는 UUID)는 **exact match 우선**
- 같은 header id가 여러 파일에 있으면 wrong-cwd duplicate footgun 으로 보고 **ambiguous 에러**를 낸다
- 짧은 prefix가 여러 세션과 충돌해도 최근 것으로 침묵 선택하지 않고 **ambiguous 에러**를 낸다

### `map`

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project NAME` | all | cwd 디렉토리명 부분 매치 (e.g. `abductcli`, `agent-config`) |
| `--since SEC` | 3600 | 최근 N초 이내 활동한 세션. control socket 있는 세션은 강제 포함 |
| `-a, --all` | off | done 상태도 포함 |

활성도: `<30s` → 🔴 active · `<5m` → 🟡 idle · `5m+` → ⚫ done. 🔌 = connect() 성공한 live control socket.

### `trace <parent-id|file>`

| Flag | Default | Description |
|------|---------|-------------|
| `--heuristic` | off | declared 매치 외 시간 인접 자식도 포함 (±2h) |

> ⚠️ **현재 1차 시그널이 죽어 있다.** 코드는 부모 JSONL의 `Session ID: <YYYYMMDDTHHMMSS-xxxxxx>`
> 텍스트로 자식을 매칭하는데, 이 문자열은 v1 spawn 도구(`entwurf`/`entwurf_resume`/`entwurf_send`)가
> 남기던 것이고 그 도구들은 entwurf #50에서 하드컷으로 제거됐다. 그래서 **v2에서 시작된 자식은
> declared 매칭이 잡히지 않는다.** `--heuristic`(시간 인접)만 남아 정확도가 떨어진다.

**수선 방향은 정해져 있다 (entwurf PM, 2026-08-06).** `trace`는 폐기하지 않는다 — v2가 오히려
**더 강한 exact 관계**를 남기기 때문이다:

```text
entwurf_fresh_call → launch receipt에 nonce
                   → 자식의 첫 callback 본문 == 그 nonce
                   → 그 <sender_info>.sessionId == 자식의 canonical garden id
```

`nonce exact match → callback sender envelope`가 새 1차 시그널이다. 추정이 아니라 정확 매칭이라
지금보다 강해진다. 단 **그것은 identity/correlation 근거일 뿐 placement 근거가 아니다.**
그리고 나중의 **resume은 새 자식이 아니라 같은 citizen**이므로 nonce가 없고, trace 자식으로
세지 않는다.

파서 교체는 entwurf `mux-placement` 랜딩 후, acceptance가 남긴 실제 부모 transcript를 fixture로
써서 한다. 그 전까지 `trace` 결과는 **불완전한 것으로 취급할 것**.

## Examples

```bash
# 진행 중 자식 분신 들여다보기 (garden 6-hex suffix)
python3 {baseDir}/scripts/entwurf-peek.py peek 9858a7

# full garden sessionId로 thinking까지 보기
python3 {baseDir}/scripts/entwurf-peek.py peek 20260604T094309-9858a7 --thinking

# 지금 살아있는 세션 전부
python3 {baseDir}/scripts/entwurf-peek.py map

# 특정 cwd만 (abductcli 부모-자식 묶어서 보기)
python3 {baseDir}/scripts/entwurf-peek.py map -p abductcli -a --since 7200

# 부모 full sessionId로 자식 entwurf 트리
python3 {baseDir}/scripts/entwurf-peek.py trace 20260604T094303-842ded
```

## Workflow: "내가 던진 분신이 뭐 하고 있지?"

```
Step 1: map  →  살아있는 세션 그림 잡기
Step 2: trace <my-session-id>  →  내 자식들 식별
Step 3: peek <child-id>  →  자식 마지막 활동 확인
Step 4: 활성도가 ⚫ DONE이면 결과 회수, 🟡 IDLE이면 잠시 대기, 🔴 ACTIVE이면 진행 중
```

`entwurf_peers`로 citizen이 있다는 것과 liveness는 이미 안다. 이 스킬은 그 다음 질문 — **"그래서 지금 뭐 하는 중인가"** — 에 transcript heuristic으로 답한다. 상태 추정이므로 확정 사실로 인용하지 않는다.

> **은퇴한 프레이밍:** 예전 문서는 "sync entwurf로 호출자가 Mattering...에 묶여있을 때"를 사용 계기로 들었다. v2에는 sync 소환이 없다 — `entwurf_fresh_call`은 launch receipt + async callback이고, `entwurf_v2`는 fire-and-forget 전달만 한다. 호출자는 애초에 묶이지 않는다.

## Output 규칙

- 헤더에 항상 `═══ {icon} {kind}-{short_id} ({age}) ═══` 형식 — 무엇을 보고 있는지 고정
- child (kind `entwurf`) 는 가능하면 `caller: <kind>-<short> [declared|time_adjacent]` 를 함께 보여준다 (caller 는 보통 `control`/`plain` 세션)
- `peek` 는 가능하면 `model: provider/model` + `state: tool running | awaiting assistant reply | waiting for user` 를 함께 보여준다
- `map` / `trace` 는 child row 끝에 `· model / state` compact suffix를 붙인다
- 메시지/thinking은 `--chars`로 자르고, 줄바꿈은 공백으로 치환 (한 줄 압축)
- inline `[tool:start]/[tool:done]` 텍스트는 `🔧 recent tools` 섹션에 별도 분리

## 한계 및 신뢰 경계

- **활성 판정은 mtime 기반만**: control socket이 없는 세션은 프로세스 생존을 직접 못 본다. mtime이 멈춘 지 5분이면 done으로 분류 — 진짜 죽었는지 확신 못 함. control socket은 stale 파일을 세지 않고 connect() 성공한 것만 🔌로 표시한다. **liveness를 확정해야 하면 여기가 아니라 `entwurf_peers`를 볼 것.**
- **placement 비권위**: 이 스킬의 어떤 출력도 tmux server/window/pane 사실의 근거가 되지 않는다.
- **kind 판별은 session_info name 의 태그**: 첫 assistant 턴 전이거나 이름이 없는 세션은 `plain` 으로 분류된다 (legacy uuid 세션 포함). entwurf/control 태그가 박힌 뒤에야 그 종류로 보인다.
- **부모-자식 매칭**: declared(1차)는 강한 시그널. caller / `--heuristic`은 시간 인접만 보므로 같은 cwd에서 다른 부모가 던진 entwurf와 섞일 수 있음
- **상태 추정은 last-event heuristic**: 최신 이벤트가 tool start면 `tool running`, tool result면 `awaiting assistant reply`, assistant text면 `waiting for user`. 오래된 orphan toolCall은 무시한다. provider별 JSONL shape가 다르면 정확도는 떨어질 수 있음
- **partial line 안전**: 마지막 라인이 writer-in-progress면 자동 스킵 (json decode 실패 시 무시)

## Cost

| 작업 | Context | 대안 |
|------|---------|------|
| `peek` | ~2KB | raw JSONL read ~50KB |
| `map` | ~1KB | 수동 ls+stat 조합 5+ 호출 |
| `trace` | ~1KB | 수동 grep+ls 조합 |
