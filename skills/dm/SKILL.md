---
name: dm
description: "에이전트가 GLG에게 텔레그램 DM 한 줄을 보낸다. 긴 작업 도중 알릴 것이 생겼을 때, 사람이 터미널 앞에 없어도 닿는 유일한 경로. 양식은 'DM <기기> <리포> <하네스/모델>' + 본문. 트리거: 'dm', 'DM 보내', '텔레그램으로 알려', '나한테 알려줘', '끝나면 알려', 'notify me', 'ping me'."
user_invocable: true
---

# dm — 에이전트가 GLG에게 직접 말을 거는 경로

GLG는 터미널 앞에 붙어 있지 않다. 긴 빌드, 예약된 검증, 몇 시간 뒤의 관측 —
그 결과를 알릴 방법이 없으면 사람이 주기적으로 돌아와 확인해야 한다. 이 스킬은
그 방향을 뒤집는다: **끝난 쪽이 사람을 부른다.**

```bash
{baseDir}/scripts/dm.sh --as claudecode/opus "14:41 하트비트 전송면 확인 완료 — accountId=bbot"
```

GLG의 텔레그램에 이렇게 도착한다:

```text
DM oracle nixos-config claudecode/opus
14:41 하트비트 전송면 확인 완료 — accountId=bbot
```

## 양식이 왜 이 순서인가

`DM <기기> <리포> <하네스/모델>` 다음 줄부터 본문.

GLG는 동시에 여러 기기·여러 리포·여러 하네스의 형제들을 돌린다. 본문만 오면
**누가 말하는지 몰라서 답을 못 한다.** 세 토큰이 그 좌표다.

| 자리 | 무엇 | 기본값 |
|---|---|---|
| 기기 | oracle · thinkpad · nuc · laptop | `~/.current-device` → `hostname -s` |
| 리포 | 작업 중인 리포 이름 | git toplevel basename → cwd basename |
| 하네스/모델 | **직접 적어야 한다** (`--as`) | 없음 — 비우면 실패한다 |

`--as`에 적을 값은 자기 정체다: `claudecode/opus` · `pi/gpt-5.6-terra` ·
`codex/gpt-5.6` · `openclaw/bbot` · `antigravity/gemini-3.7`. 하네스를 빼고 모델만
적지 마라 — GLG가 구분하는 축은 모델이 아니라 **어느 창에서 도는가**다.

## API

| Flag | 기본 | 설명 |
|---|---|---|
| `--as <하네스/모델>` | `$DM_AS` | **필수.** 없으면 종료코드 2 |
| `--machine <name>` | 자동 | 기기 이름 강제 |
| `--repo <name>` | 자동 | 리포 이름 강제 |
| `--account <id>` | `mini` | 배달에 쓸 텔레그램 봇 계정 |
| `--stdin` | off | 본문을 stdin에서 (여러 줄·긴 글) |
| `--dry-run` | off | 보내지 않고 완성된 메시지만 출력 |

```bash
# 여러 줄
printf '%s\n' "빌드 실패" "$(tail -5 build.log)" | {baseDir}/scripts/dm.sh --as pi/gpt-5.6 --stdin

# 보내기 전에 양식 확인
{baseDir}/scripts/dm.sh --as codex/gpt-5.6 --dry-run "테스트"
```

종료코드: `0` 전달됨 · `2` 인자 오류 · `3` 이 기기에 게이트웨이 없음 · `4` 잡 생성 실패 · `5` 전달 실패.

## 언제 쓰나 — 그리고 언제 쓰지 마라

**쓴다**: 몇 분~몇 시간 뒤에야 답이 나오는 일이 끝났을 때. 사람의 판단이 필요한
분기점에 도달했을 때. 예약해둔 관측이 도착했을 때. 긴 작업이 실패했을 때.

**쓰지 마라**: GLG가 지금 이 세션을 보고 있을 때(그냥 대답하면 된다). 진행 상황
중계(끝났을 때 한 번이면 된다). 한 작업에 여러 번 — **한 사건에 한 통**이 규칙이다.
텔레그램은 사람의 주의를 직접 가져가는 면이고, 그 예산은 유한하다.

## 이 메시지는 봇 세션에 쌓이지 않는다

`--account mini`는 **발신 봇 토큰**일 뿐 화자가 아니다. mini는 이 메시지를 자기
대화로 기억하지 않고, 답하지도 않고, 컨텍스트도 안 자란다.

배관이 그렇게 생겼다. 잡의 payload가 `kind: "command"`(게이트웨이가 `sh -lc`로
실행)이고 배달이 `mode: "announce"`(그 stdout을 채널로 흘림)라, **모델 호출이 없다.**

실측 (2026-09-09 12:31, oracle): 메시지 발송 후 `sessions list --agent mini`의
최신 세션은 여전히 19시간 전 `probe…`, mini의 텔레그램 세션은 9일 전 그대로.
같은 시각 cli-backend 로그에 항목 없음. 토큰 소모 0.

**진짜로 mini에게 판단을 시키고 싶다면** 이 스킬이 아니라 agentTurn 페이로드
(`cron add --message` 또는 `openclaw agent --agent mini --deliver`)를 써야 한다.
그건 sonnet-5 턴을 쓰고 mini 세션에 쌓인다.

## 경계 — 어디서 도는가

**게이트웨이 컨테이너가 사는 기기에서만 동작한다. 현재 `oracle` 하나다.**
스크립트는 `docker inspect openclaw-gateway`로 먼저 확인하고, 없으면 종료코드 3으로
그 사실을 말하며 멈춘다 — 조용히 실패하지 않는다.

thinkpad/laptop에서 쓰려면 원격 게이트웨이 경로(`--url wss://… --token …`)가
필요한데, **그 경로는 아직 측정하지 않았다.** 이 문서에 "된다"고 적혀 있지 않은
이유가 그것이다. 열게 되면 여기에 실측과 함께 적는다.

## 배관 상세 (고칠 때 볼 것)

```text
cron add --command <shell> --command-env DM_BODY=<본문>
         --announce --channel telegram --account <id> --to <chatId>
         --at 6h --delete-after-run --best-effort-deliver
  → cron run <id> --wait          (즉시 발화. --at 은 자동 발화와 경주하지 않으려고 멀리 둔 것)
  → cron rm <id>                  (trap EXIT — 실패해도 잔여 잡을 남기지 않는다)
```

본문을 셸 인자가 아니라 `--command-env`로 넘긴다. 따옴표·개행·`$`가 들어간 문장이
`sh -lc` 안에서 재해석되지 않게 하기 위해서다.

`openclaw message send`를 쓰지 않는 이유: 멀티 에이전트 설정에서 소유자를 못 정해
거부한다(`Multiple agents are configured, but this operation has no explicit owner`).
2026.8.2의 `message send`에는 `--agent` 선택자가 없다 — 에러 힌트가 그걸 안내하지만
그 힌트는 낡았다(실측 2026-09-09).

전달 확인은 로그의 `telegram outbound send ok accountId=<id> chatId=… messageId=…`.
