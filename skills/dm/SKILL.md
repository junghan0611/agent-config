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
| `--bot <channels\|entwurf>` | `channels` | 발신 봇 전환 |
| `--stdin` | off | 본문을 stdin에서 (여러 줄·긴 글) |
| `--dry-run` | off | 보내지 않고 완성된 메시지만 출력 |

```bash
# 여러 줄
printf '%s\n' "빌드 실패" "$(tail -5 build.log)" | {baseDir}/scripts/dm.sh --as pi/gpt-5.6 --stdin

# 발신 봇 전환
{baseDir}/scripts/dm.sh --as codex/gpt-5.6 --bot entwurf "형제 쪽 라인으로"

# 보내기 전에 양식 확인
{baseDir}/scripts/dm.sh --as codex/gpt-5.6 --dry-run "테스트"
```

종료코드: `0` 전달됨 · `2` 인자/설정 오류 · `5` 전달 실패.

## 언제 쓰나 — 그리고 언제 쓰지 마라

**쓴다**: 몇 분~몇 시간 뒤에야 답이 나오는 일이 끝났을 때. 사람의 판단이 필요한
분기점에 도달했을 때. 예약해둔 관측이 도착했을 때. 긴 작업이 실패했을 때.
하트비트 tick이 기억축·시간축에서 근거를 못 찾았을 때 — **그 무장 주기에 첫 결번 한 통.**

**쓰지 마라**: GLG가 지금 이 세션을 보고 있을 때(그냥 대답하면 된다). 진행 상황
중계(끝났을 때 한 번이면 된다). 한 작업에 여러 번 — **한 사건에 한 통**이 규칙이다.
tick마다, 같은 결번을 다시, `HEARTBEAT_OK` 자체를 DM하지 마라 — 그 예산이 죽는다.
텔레그램은 사람의 주의를 직접 가져가는 면이고, 그 예산은 유한하다.

## 어느 봇의 타임라인도 더럽히지 않는다

발신에 쓰는 두 봇은 **GLG가 지금 쓰지 않는 유휴 봇**이다. 힣봇 군단(main/glg/gpt/
gemini/mini/bbot)의 방은 사람과 봇의 대화 기록이고, 기계 알림이 그 사이에 끼면
나중에 그 방을 읽을 때 대화가 끊긴다.

| `--bot` | 봇 | 토큰 키 |
|---|---|---|
| `channels` (기본) | `@glg_pi_channels_bot` | `PI_TELEGRAM_BOT_TOKEN` |
| `entwurf` | `@glg_entwurf_bot` | `PI_ENTWURF_BOT_TOKEN` |

두 경로 모두 실측했다 (2026-09-09, oracle: `messageId=204` / `463`).

## 배관 — OpenClaw 를 거치지 않는다

```text
POST https://api.telegram.org/bot<TOKEN>/sendMessage
     chat_id=<PI_TELEGRAM_CHAT_ID>  text=<본문>
```

그게 전부다. 게이트웨이도, cron 잡도, 봇 세션도, 모델 턴도 없다. 따라서:

- **어느 기기에서든 돈다.** 게이트웨이가 사는 기기(oracle)에 묶이지 않는다.
- **비용 0.** 모델을 부르지 않는다.
- **컨텍스트 성장 0.** 어떤 세션에도 안 쌓인다.

토큰과 수신자 id 는 `~/.env.local` 이 SSOT 다 — 공개 리포인 이 스킬에는 값이 없다.
로그인 이후 그 파일에 추가된 줄은 실행 중인 셸 환경에 없으므로, 스크립트가 파일을
직접 읽어 보강한다. 토큰은 URL 에만 들어가고 stdout/stderr 로 새지 않는다 — 실패
응답도 텔레그램의 `description` 만 인쇄한다.

**진짜로 어느 봇에게 판단을 시키고 싶다면** 이 스킬이 아니다. 그건 agentTurn
(`openclaw agent --agent <id> --deliver` 또는 `cron add --message`)이고, 모델 턴을
쓰고 그 봇 세션에 쌓인다. 이 스킬은 그 반대편 — **말을 전하는 배관**이다.

## 이전 배관을 왜 버렸나 (2026-09-09)

처음엔 OpenClaw 의 `cron add --command … --announce --account mini` 로 만들었다.
동작은 했고 모델 턴도 없었지만 두 가지가 걸렸다: **mini 방에 기계 알림이 쌓이고**,
게이트웨이가 있는 oracle 에서만 돌았다. 유휴 봇 토큰을 쓰면 둘 다 사라진다.

참고로 `openclaw message send` 는 이 용도로 못 쓴다 — 멀티 에이전트 설정에서
소유자를 못 정해 거부하고(`Multiple agents are configured…`), 2026.8.2 의
`message send` 에는 에러 힌트가 안내하는 `--agent` 선택자가 실제로 없다(실측).
