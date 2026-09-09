---
name: openclaw
description: "OpenClaw 런타임을 만질 때의 반사신경 — 봇 설정·heartbeat·cron/automation·channels·delivery·gateway를 기억이 아니라 그 버전의 사실로 다룬다. 첫 수는 언제나 `openclaw docs` / `config schema`이고, 소스는 라이브와 같은 태그로 고정한 클론에서만 인용한다. 안드로이드 앱·Control UI가 읽는 표준 스키마도 여기. 트리거: 'openclaw', '오픈클로', '봇 설정', 'heartbeat', '하트비트', 'cron', 'automation', '자동화', 'config set', '봇이 이상해', '봇 무응답', '앱에서 안 보여', 'control ui', 'payload kind', 'delivery', '채널 계정', 'accountId', '버전업', '업그레이드 후'."
user_invocable: true
---

# openclaw — 그 버전의 사실로 만지기

OpenClaw는 릴리즈마다 크게 바뀐다. **에이전트가 이 런타임에서 저지르는 사고는 거의 전부
"기억으로 찍었다" 하나다** — NixOS 설정을 옛 기억으로 만지다 뻑나는 것과 같은 병이다.
이 스킬은 그 병을 막는 절차다.

> **경계.** 디바이스·rebuild·run.sh·배포·커밋 규율은 **`nixos-config` 스킬**이 진다.
> 여기는 **OpenClaw 런타임 자체**(설정 스키마·봇·heartbeat·cron·채널·배달)만 본다.
> 둘은 일부러 분리돼 있다 — 한쪽을 안다고 다른 쪽을 안다고 생각하지 마라.

## 0. 첫 수 — 새로 쓰기 전에 이미 있는 것을 봐라

**upstream이 이미 문서화한 것을 우리가 다시 유도하지 마라.** 라이브에서 바로 돈다:

```bash
docker exec openclaw-gateway openclaw docs <검색어>   # docs.openclaw.ai 를 그대로 검색
docker exec openclaw-gateway openclaw config schema    # 라이브 JSON Schema (draft-07) 덤프
docker exec openclaw-gateway openclaw skills list      # 내장 스킬
```

`openclaw docs heartbeat` 한 줄이면 heartbeat 문서·config 예시·배달 규칙·scratch 사용법이
URL과 함께 나온다(실측 2026-09-09).

**이 절이 존재하는 이유 — 2026-09-09에 치른 값.** 우리는 오후 내내 `/app/dist/*.js`를 읽어
"배달 계정은 `heartbeat.accountId`로 지정한다"를 유도했다. 그런데 소스의
`docs/gateway/heartbeat.md:131`에 이미 이렇게 적혀 있었다:

```js
accountId: "ops-bot", // optional multi-account channel id
```

같은 문서 `:74`가 `target: owner` 폴백 순서까지 문장으로 설명한다. **먼저 봤으면 반나절이
한 줄이었다.**

## 1. 권위 — 무엇이 어느 질문에 답하는가

| 질문 | 권위 | 왜 |
|---|---|---|
| **지금 실제로 어떻게 도는가** | 라이브 런타임 (`docker exec openclaw-gateway openclaw …`, 로그) | 우리 설정·우리 데이터가 얹힌 상태는 여기만 안다 |
| **구조가 어떻게 생겼나 / 어디를 고치나** | 소스 클론 `~/repos/3rd/openclaw` — **라이브와 같은 태그로 고정된 것만** | 파일:줄로 인용 가능하고 버전이 고정된다 |
| **표준이 무엇인가**(앱·웹·CLI 공통) | `openclaw docs` + `src/config/zod-schema*.ts` | 클라이언트들이 이 스키마를 공유한다 |

셋이 어긋나면: **동작은 라이브가 옳고, 구조는 소스가 옳다.** 우리 문서가 그 둘과 어긋나면
우리 문서가 틀린 것이다.

## 2. 소스를 인용하기 전에 — 클론을 라이브에 맞춰라

**이 절차를 건너뛴 인용은 인용이 아니다.** 2026-09-09에 한 형제가 4개월 묵은 클론
(HEAD 5월, 5월부터 멈춘 rebase 얹힘)을 읽고 라이브 배선을 판정했다가 틀렸다.

```bash
docker exec openclaw-gateway openclaw --version        # 예: OpenClaw 2026.8.2 (0965053)
cd ~/repos/3rd/openclaw
git status -sb                                          # rebase/충돌 잔재부터 확인
git fetch --all --tags --prune
git rev-parse --short v<버전>^{commit}                  # 라이브 해시와 일치하는지 대조
git checkout v<버전>
```

체크아웃 전에 **잃을 게 있는지 먼저 재라**: `git rev-list --count origin/main..main`이 0이고
남은 작업이 upstream 커밋뿐이면 `rebase --abort`가 안전하다. 3rd 클론이라도 확인 없이 날리지 마라.

## 3. 인용하면 안 되는 것 — dist 번들 경로

`/app/dist/heartbeat-runner-jhGs3jbv.js` 같은 경로를 문서에 박지 마라. **번들 해시가 버전마다
바뀐다** — 같은 러너가 8.1에선 `-BAMpymke.js`, 8.2에선 `-jhGs3jbv.js`다.

읽는 것은 괜찮다(라이브 동작 확인엔 dist가 빠르다). 단 **인용할 때는 dist에서 본 함수명을
소스에서 grep해 `src/…:줄`로 바꿔 적어라.**

## 4. config를 바꿀 때 — `--merge`가 기본이 아니다

```bash
openclaw config set <path>.<leaf> '"값"'          # 하위 경로로 (권장)
openclaw config set <path> '{...}' --merge        # 객체째면 --merge 필수
openclaw config set … --dry-run                   # 먼저 이걸로
```

`config set --help`: *"Merge object/map values instead of replacing the target path
(default: false)"*. **기본이 교체다.** 객체를 통째로 주면 형제 키가 조용히 사라진다 —
우리 문서가 실제로 그 지뢰를 실었던 적이 있다(2026-09-09, 교차검수가 잡음).

대부분의 config 변경은 **hot reload로 붙는다**(로그 `config hot reload applied (<경로>)`).
등록 자체가 바뀌는 변경까지 덮는지는 미확인 — 그때만 `docker compose restart openclaw-gateway`.

라이브 설정 파일은 `~/openclaw/config/openclaw.json`이고 **커밋 대상이 아니다.**
바꾸기 전에 타임스탬프 백업을 남긴다(`openclaw.json.bak-<사유>-<YYYYmmddTHHMMSS>`).

## 5. 좌표 — 어느 주제를 어디서 보나

**주제별 소스 파일:심볼 표는 `~/repos/gh/nixos-config/docs/openclaw-reference-map.md`에 있다.**
설정 스키마 루트·agents·bindings·heartbeat·cron payload·delivery·gateway·plugins/skills/memory가
`src/…:줄`로 정리돼 있고, 미확인 항목은 미확인이라고 적혀 있다.

그중 자주 쓰는 둘:

- 설정 스키마 루트 `src/config/zod-schema.ts` (`OpenClawSchema`), 키맵 `…root-shape.ts`
- heartbeat 스키마 `src/config/zod-schema.agent-runtime.ts` (`HeartbeatSchema`, **`.strict()`** —
  문서에 없는 필드는 전부 거부된다)

## 6. 앱·웹도 같은 스키마를 읽는다 — 그리고 갭이 있다

안드로이드 앱과 Control UI는 게이트웨이가 주는 automation을 **자기 파서로 다시 검증한다.**
그래서 게이트웨이가 멀쩡해도 앱에서만 깨질 수 있다.

실례(2026-09-09, v2026.8.2): `apps/android/app/src/main/java/ai/openclaw/app/CronJobDetail.kt:160`

```kotlin
if (payloadKind !in setOf("systemEvent", "agentTurn", "command", "script")) return null
```

`heartbeat`가 빠져 있어 heartbeat 잡의 **상세만** *"Gateway returned an invalid automation."*
(`NodeRuntime.kt:2990`,`:5906`)이 된다. 목록 파서는 kind를 안 걸러서 목록엔 정상으로 뜬다.

**교훈**: 앱에서 안 보인다고 게이트웨이 설정을 의심하기 전에, `openclaw cron list --json`으로
게이트웨이가 뭘 주는지 보고 앱 소스의 파서를 확인하라. 앱 소스는 이 리포 안(`apps/android/`,
`apps/ios/`, `apps/linux/`, `apps/macos/`)에 있다.

## 7. 우리 문서와 upstream 문서의 분업

겹치면 둘 다 썩는다.

| | 담는 것 |
|---|---|
| **upstream** (`openclaw docs`, 소스 `docs/`) | 제품의 표준 — 필드 의미, 기본값, 규칙 |
| **우리** (`nixos-config/docs/openclaw-*.md`) | 우리 설치본의 **상태와 함정** — 어느 봇이 무엇을 도는가, 우리가 당한 것, 우리 결정 |

새 사실을 적기 전에 물어라: *이건 제품의 사실인가, 우리 설치본의 사실인가?* 제품의 사실이면
**적지 말고 `openclaw docs`를 가리켜라.**

우리 쪽 SSOT 셋: `docs/openclaw-automations.md`(사람 없이 도는 것 전량) ·
`docs/openclaw-gotchas.md`(함정 카탈로그) · `ORACLE.md`(운영 핸드북).

## 8. 실행 전 체크 — 세 줄

```bash
docker exec openclaw-gateway openclaw --version          # 지금 어느 버전인가
docker exec openclaw-gateway openclaw docs <주제>         # upstream이 이미 답했나
git -C ~/repos/3rd/openclaw describe --tags               # 클론이 그 버전인가
```

셋 다 통과하고 나서 손을 대라. 버전업 직후라면 `openclaw config schema` 출력을 이전 버전과
diff하는 것이 "우리 설정이 깨졌나"의 가장 빠른 답이다.
