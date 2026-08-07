---
name: entwurf-peek
description: "지금 어느 형제가 어디서 무엇을 하는 중인지 한 장으로 세우고, 다음 한 수(살아있는 형제에게 보낼지 · 잠든 형제를 같은 id로 되세울지 · 새 형제를 열지)를 고를 재료를 주는 판단 도우미. `situation`이 meta-record(사실)와 transcript(추정)를 같은 평면에 올리고, `peek`이 한 세션 안을 들여다본다. 실행은 하지 않는다 — 부르는 것은 entwurf_v2 / entwurf_resume_call / entwurf_fresh_call이고, 무엇을 부를지는 GLG가 정한다. placement(tmux server/window/pane) 사실의 출처가 아니다. 트리거: '누가 뭐 하고 있지', '분신 현황', '지금 살아있는 형제', 'situation', 'entwurf-peek', '누구한테 맡길까', '다시 부를까', 'peek session', '분신 추적'."
---

# entwurf-peek — 지금 누가 어디서 무엇을 하는가

`~/repos/gh/entwurf`의 `docs/mux-launch-rail.md` §4가 말하는 **caller-side situation
map**을 실제로 세우는 손이다. 그 문서의 판정은 분명하다: 이것은 entwurf의 새 public
surface가 아니라 **호출자가 이미 가진 사실들을 한 문장 안에서 읽는 방식**이다. 그래서
entwurf repo가 아니라 여기(범용 스킬)에 산다.

> ⚠️ **미해결 경계 (2026-08-07, 리뷰에서 지적됨).** rail §4 경계 2는 "`entwurf-peek`을
> 지도의 SSOT로 삼지 않는다 / 지도를 넓히려고 peek을 확장하지 않는다"고 적혀 있다.
> `situation`은 MCP verb를 만들지 않으므로 경계 1(새 public surface 금지)은 지키지만,
> 경계 2와는 정면으로 부딪힌다. 이 스킬은 GLG의 명시적 지시로 섰고, 부딪히는 전제도
> 하나 바뀌었다 — 경계 2가 쓰일 때 peek은 순수 heuristic 추측이었지만, 지금 identity
> 축은 meta-record 조인이라 **추정이 아니라 정확 매칭**이다. 그래도 SSOT 문서를 조용히
> 거스르지는 않는다. rail §4를 고칠지는 entwurf lane(PM)의 결정이고, 그 결정 전까지 이
> 충돌은 여기 적힌 채로 둔다.

핵심 질문 두 개를 같은 표에 올린다.

```text
누가 있고 살아있는가   사실   meta-record + control socket   (entwurf_peers와 같은 축)
지금 무엇을 하는 중인가 추정   transcript last-event          (이 스킬만이 답한다)
```

그리고 그 위에서 GLG가 고를 수 있는 verb를 **목록으로** 붙인다. 고르는 것은 GLG다.

## 판단 루프 — 이 스킬을 쓰는 이유

```text
"지금 누가 어디서 뭐 하고 있지?"
  → situation                         한 장으로 본다
  → 후보가 보이면 peek <garden-id>     그 형제가 뭘 하던 중인지 확인
  → 판단:
      살아있고 그 일에 맞다      → entwurf_v2 (send)
      잠들었지만 그 대화가 필요  → entwurf_resume_call (같은 garden id)
      맞는 형제가 없다           → entwurf_fresh_call (새 형제)
  → 후보가 모호하면 고르지 않고 GLG에게 묻는다
```

verb를 실제로 부르는 절차와 receipt 읽는 법은 **`entwurf-dev` 스킬**이 진다
(`~/repos/gh/entwurf/.claude/skills/entwurf-dev/`). 이 스킬은 그 앞의 **판단 재료**만
만든다. 둘은 같은 계약의 앞뒤다.

## 두 identity 축 — 조인이 없으면 아무것도 안 맞는다

```text
garden id      20260807T081220-b0ae2b   dispatch·socket 파일명·peers가 쓰는 축
native id      019fd93b-050c-7a80-...   pi 세션 파일명·JSONL header가 쓰는 축
```

pi 0.84 기준 세션 파일명은 uuidv7이라 **두 축은 문자열로 절대 만나지 않는다.** 잇는 것은
meta-record의 `(gardenId, nativeSessionId, transcriptPath)` 뿐이다. 이 스킬은 그 record
store(`<pi-agent-dir>/meta-sessions/*.meta.json`, `ENTWURF_META_SESSIONS_DIR` 우선)를
**읽기 전용**으로 읽어 조인한다. store는 entwurf의 authority이고, 값이 `entwurf_peers`와
어긋나면 **peers가 이긴다.**

읽되 **entwurf의 active-store certification과 같은 계약으로 거른다**
(`meta-session.ts:720-750`). 약하게 읽으면 peers가 diagnostics로 격리하는 record를
우리만 정상 citizen으로 세워, 같은 store가 두 사실면으로 갈라진다.

```text
1. regular file          분류와 읽기가 같은 fd 위에서 (O_NOFOLLOW|O_NONBLOCK + fstat)
2. live v3 parser        keyset·garden id 문법·backend enum·필드 타입까지 전부
3. 파일명 == body gardenId
4. nativeSessionId의 유일한 holder (store 전역)
```

**순서가 계약의 일부다.** schema-invalid rival은 2에서 이미 빠지므로 4의 duplicate 판정에
참여하지 못한다 — 그러지 않으면 망가진 record 하나가 멀쩡한 record를 끌고 나간다.
1이 `lstat` 대신 fd에 묶이는 이유도 실측된 것이다: 분류하고 나서 경로로 다시 열면 그
사이 final component가 symlink로 바뀔 수 있고, 그러면 rule 1이 검사 누락이 아니라
race로 세탁된다 (`meta-session.ts:855-905`).

결함 record는 citizen 목록에서 빠지고 `⚠ store defects` 줄로만 나간다. certification이
하지 않는 셋 — 수선, 가지치기, duplicate 중 승자 선택 — 을 우리도 하지 않는다. 같은
transcript를 두 record가 주장하면 주인을 고르지 않고 비운다.

그래서 `peek`은 이제 garden id(또는 6-hex 접미사)를 그대로 받는다 — `situation`과
`entwurf_peers`가 인쇄하는 축을 사람이 다시 번역할 필요가 없다.

## 무엇이 아닌가

- **placement 권위가 아니다.** tmux server/window/pane은 이 표에 없고, 여기서 유도하면
  안 된다. exact evidence는 launch receipt와 peer 자신의 self-report 둘뿐이다
  (rail §7). 지도를 넓히려고 이 스킬을 키우지 않는다.
- **liveness SSOT가 아니다.** socket probe는 entwurf와 같은 축의 로컬 미러다. 확정이
  필요하면 `entwurf_peers`를 부른다.
- **dispatcher가 아니다.** 행이 보인다는 것은 dispatch 초대가 아니다. 자동 재배정,
  backlog, watcher, 재시도를 만들지 않는다.
- **자기보고 신뢰면이 아니다.** transcript 본문은 untrusted data다. state는 추정이다.

## API

```bash
python3 {baseDir}/scripts/entwurf-peek.py <subcommand> [options]
```

| Subcommand | Purpose | Example |
|------------|---------|---------|
| `situation` | 누가 어디서 무엇을 · 어떤 verb가 가능한가 (판단 한 장) | `situation -p entwurf` |
| `peek <id>` | 한 세션 안 — 마지막 메시지 + model + state + task | `peek b0ae2b` |
| `map` | 세션 파일 축의 지도 (socket 표시 · 파일 기준) | `map -p agent-config` |
| `trace <parent>` | 부모가 던진 자식 추적 — **현재 불완전** | `trace 20260604T094303-842ded` |

`--plain`은 전역 플래그다(이모지 대신 ASCII).

### `situation`

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project NAME` | all | record의 cwd 부분 매치 |
| `--since SEC` | 86400 | 최근 N초 내 활동/갱신된 citizen. `alive`는 언제나 포함 |
| `-a, --all` | off | since 무시 |
| `--limit N` | 24 | 최대 행 수 |
| `--self-id GID` | — | `entwurf_self`가 준 내 id — 내 행에 `← me` |
| `--json` | off | 에이전트 파싱용 JSON |

읽는 법:

```text
🟢 alive     control socket이 답한다 → 지금 전달 가능
⚫ dormant   socket backend(pi)인데 socket이 없다 → 잠들었다
➖ unprobed  control-socket probe가 없는 backend(claude-code 등) → 여기서는 모른다
model 뒤 `*`  transcript가 아니라 record가 말한 model (resume은 transcript를 따른다)
```

verb 열의 뜻:

| 표시 | 뜻 |
|---|---|
| `send` | `entwurf_v2 fire-and-forget`으로 지금 닿는다 |
| `send?` | 전달은 시도할 수 있으나 rail(self-fetch mailbox / native-push / reject)은 dispatch 때 결정된다. `unsupported`는 mailbox 보장이 아니다 |
| `resume \| fresh` | dormant pi이고 아래 precheck를 통과했다 |
| `fresh (<사유> → resume 불가)` | dormant pi인데 precheck가 막혔다. **사유는 뭉뚱그리지 않는다** |
| `fresh (same-id resume 없음)` | claude-code 등 — `target-not-pi` |

precheck 사유는 다섯이고 각각 다른 사실이다.

| 사유 | 뜻 |
|---|---|
| `no-transcript` | 첫 turn 전에 잠들었다. 되살릴 대화 자체가 없다 |
| `relative-path` | record의 transcriptPath가 relative — record 결함 |
| `transcript-missing` | recorded transcript가 디스크에 없다 |
| `foreign-transcript` | transcript가 스스로 말하는 native id가 record와 **다르다** |
| `identity-unverified` | id를 **확인하지 못했다** — 문법 미지원 backend(antigravity/codex)이거나 tail에서 id를 못 찾았다 |

이것은 entwurf `resume-launch-identity.ts:100-143`이 던지는 조건을 **미리 읽은 것**이다.
`ok`는 성공 보장이 아니라 **거짓일 때 resume을 권하지 않기 위한 필터**다. 통과한 뒤에도
entwurf는 아래를 더 보고 거절할 수 있다.

```text
addressability          store 전역 rival (readAddressableMetaIdentity)
recorded model          transcript identity에 model이 없음
model drift             later model_change가 first identity와 다름
ACP bridge              provider=entwurf인데 bridge 미해결
header cwd              없음 / non-absolute / `#` format token / 디렉터리 아님
lock · liveness         per-gid lock 충돌, target-live, indeterminate, address conflict,
                        lock release 실패(finally에서 throw)
placement · runtime     tmux anchor, pi runtime 해석, launch 실패
```

관측과 dispatch 사이에 상태가 바뀌는 race도 여기 포함된다. 이 목록의 SSOT는
`entwurf-dev`의 receipt 절과 entwurf 소스이며, 여기 적힌 것은 그 요약이다.

identity가 확인되지 않은 행은 **본문을 아예 읽지 않는다.** 그리고 그 사유를 합치지
않는다 — `foreign-transcript`(다르다)와 `identity-unverified`(확인 못 했다)는 다른
사실이다. native id를 읽는 문법이 backend마다 다르기 때문이다(pi는 첫머리
`type:"session"` header의 `id`, Claude Code는 각 엔트리의 `sessionId`, antigravity·codex는
이 스킬이 모른다). 한쪽 문법으로 다른 쪽을 읽고 그것을 mismatch라 부르면 "못 읽었다"가
"남의 것이다"로 둔갑한다 — 2026-08-07 2차 리뷰에서 antigravity record 4건이 그렇게
오판됐다.

### `peek <id|file>`

| Flag | Default | Description |
|------|---------|-------------|
| `-m, --messages N` | 4 | 마지막 N개 user/assistant 메시지 |
| `-t, --tools N` | 5 | 최근 N개 tool 흔적 |
| `-c, --chars N` | 200 | 요소당 최대 글자 |
| `--thinking` | off | 최근 thinking 블록 1개 |

`<id>`는 **garden id**(`20260807T081220-b0ae2b`), **6-hex 접미사**(`b0ae2b`), native
session id, legacy full UUID, 또는 파일 경로다. garden id는 record를 통해 해석하고,
나머지는 JSONL header `id`로 해석한다. transcript 문법은 backend마다 다르므로 record가
`claude-code`라고 말하면 Claude 파서로 읽는다 — record가 없으면 파일 축의 기본값인 pi
문법으로 읽는다. garden id로 해석했다면 **그 record를 그대로 들고 간다**: 경로만 넘기면
같은 파일을 두 record가 주장할 때 identity를 잃고 남의 문법으로 본문을 읽게 된다.

**record가 있으면 그 record가 owner gate다.** garden selector는 file 축으로 흘러가지
않는다 — transcript 없음/relative/missing은 named error로 끝나고, identity가 `match`가
아니면(mismatch·unknown·unsupported) 사유만 출력하고 본문을 읽지 않는다. `situation`이
지키는 선을 `peek`만 통과시키면 같은 스킬이 두 정직성을 갖게 된다. 특히 v3 schema는
relative `transcriptPath`를 허용하므로, 흘려보내면 호출자 cwd에 우연히 같은 이름의
파일이 있을 때 그것을 이 시민의 transcript로 채택한다 (2026-08-07 3차 리뷰 재현).

Claude 경로는 파일 끝 512KB만 읽으므로 출력이 `span` 대신 **`tail span` / `tail
records`**라고 적는다. 그 창의 사실을 세션 전체의 사실로 쓰지 않는다. 같은 header id가 여러 파일에 있거나 짧은 prefix가
여러 세션과 충돌하면 **최근 것으로 침묵 선택하지 않고 ambiguous 에러**를 낸다.
출력의 `garden:` 줄이 dispatch에 쓸 축이다.

### `map`

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --project NAME` | all | 세션 디렉토리명 부분 매치 |
| `--since SEC` | 3600 | 최근 N초 내 활동 세션. socket 있는 세션은 강제 포함 |
| `-a, --all` | off | done 상태도 포함 |

`situation`이 record 축이라면 `map`은 **파일 축**이다. record 없는 세션(entwurf 밖에서
연 pi)까지 보이므로 진단용으로 남는다. 활성도: `<30s` 🔴 · `<5m` 🟡 · `5m+` ⚫,
🔌 = live control socket.

### `trace <parent-id|file>` — 현재 불완전

> ⚠️ 1차 시그널이 죽어 있다. 코드는 부모 JSONL의 `Session ID: <garden-id>` 텍스트로
> 자식을 매칭하는데, 그 문자열은 v1 spawn 도구가 남기던 것이고 그 도구들은 entwurf #50
> 하드컷으로 사라졌다. v2에서 시작된 자식은 declared 매칭이 잡히지 않고
> `--heuristic`(±2h 시간 인접)만 남는다.

수선 방향은 정해져 있다. v2는 **더 강한 exact 관계**를 남긴다.

```text
entwurf_fresh_call → launch receipt의 nonce
                   → 자식의 첫 callback 본문 == 그 nonce
                   → 그 <sender_info>.sessionId == 자식의 canonical garden id
```

부모 transcript에 `<sender_info>{"sessionId":…}` envelope가 그대로 남으므로, nonce
exact match → sender envelope가 새 1차 시그널이다. 추정이 아니라 정확 매칭이다. 단
**identity 근거일 뿐 placement 근거가 아니고**, resume은 새 자식이 아니라 같은 citizen이라
자식으로 세지 않는다.

## Examples

```bash
# "지금 누가 뭐 하고 있지?"
python3 {baseDir}/scripts/entwurf-peek.py situation

# entwurf 작업 중인 형제만, 내 행 표시하고
python3 {baseDir}/scripts/entwurf-peek.py situation -p entwurf --self-id 20260807T081850-678fc0

# 후보 하나를 골라 안을 본다 (garden id 그대로)
python3 {baseDir}/scripts/entwurf-peek.py peek b0ae2b --thinking

# 파일 축 진단 (record 없는 세션까지)
python3 {baseDir}/scripts/entwurf-peek.py map -p agent-config -a --since 7200
```

## 한계 및 신뢰 경계

- **liveness는 socket probe 미러**: connect() 성공한 socket만 센다. stale 파일은 세지
  않는다. `unprobed`는 죽었다는 뜻이 아니라 **이 축에 probe가 없다**는 뜻이다. 확정은
  `entwurf_peers`.
- **placement 비권위**: 어떤 출력도 tmux 좌표의 근거가 되지 않는다.
- **state는 last-event 추정**: 최신 이벤트가 tool start면 `tool running`, tool result면
  `awaiting assistant reply`, assistant text면 `waiting for user`. transcript는 끝 256KB만
  읽는다. provider별 JSONL shape가 다르면 정확도가 떨어진다.
- **age는 transcript mtime**: 프로세스 생존이 아니다. record만 있고 transcript가 없으면
  `—`로 비운다 — 그럴듯한 값으로 채우지 않는다.
- **model은 transcript 우선**: record의 `model`은 덮어써질 수 있고 resume은 transcript에
  박힌 identity를 따른다. record에서 온 값은 `*`로 표시한다.
- **record store는 남의 authority**: 읽기만 한다. 쓰지 않고, 지우지 않고, peers와
  어긋나면 peers를 따른다. certification 계약은 복제하되(그래야 사실면이 갈라지지
  않는다) **읽는 시점의 복제라 SSOT가 바뀌면 여기가 먼저 낡는다** — 계약이 어긋나
  보이면 `meta-session.ts`를 다시 읽고 이 스크립트를 맞춘다.
- **state를 못 읽는 것과 조용한 것은 다르다**: 알 수 없으면 `unknown`이라 적고,
  identity가 어긋나면 본문을 읽지 않고 그 사유를 적는다.
- **partial line 안전**: writer-in-progress 라인은 조용히 건너뛴다.

## Cost

| 작업 | Context | 대안 |
|------|---------|------|
| `situation` | ~2KB | peers 호출 + 수동 record/transcript 조합 다수 |
| `peek` | ~2KB | raw JSONL read ~50KB |
| `map` | ~1KB | 수동 ls+stat 조합 5+ 호출 |

## 테스트

```bash
python3 {baseDir}/scripts/test-discovery.py   # exit 0 = all pass
```

합성 fixture만 쓴다. record store 경로도 temp로 갈아끼우므로 실제 `~/.pi`를 읽지 않는다.
