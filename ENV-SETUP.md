# 환경변수 설정 가이드

pi-skills CLI들이 정상 동작하려면 아래 환경변수가 필요합니다.

## 필수

| 변수 | 값 | 용도 |
|------|-----|------|
| `BIBCLI_DIR` | `~/sync/emacs/zotero-config/output` | bibcli bib 파일 경로 |
| `GOG_ACCOUNT` | `junghanacs@gmail.com` | gogcli 기본 Google 계정 |

## 선택

| 변수 | 값 | 용도 |
|------|-----|------|
| `GROQ_API_KEY` | (API key) | transcribe 음성인식 |
| `BRAVE_SEARCH_API_KEY` | (API key) | brave-search 웹 검색 |
| `UPSTAGE_API_KEY` | (API key) | `upstage-provider.ts` — pi에서 Solar 모델 사용 |
| `UPSTAGE_FORCE_MODELS` | `solar-open2` | `/v1/models`에 안 뜨는 private beta 모델을 강제 등록 (쉼표 구분) |

### pi에서 숨기는 키

`OPENROUTER_API_KEY` · `HF_TOKEN` · `GEMINI_API_KEY` · `GROQ_API_KEY`는 `~/.env.local`에
그대로 두되, pi 프로세스에서는 지운다 — 키가 보이면 pi가 provider를 자동으로 켜서
모델 목록에 440개가 들어온다. `pi-extensions/hide-providers.ts`가 지우고
`env-loader.ts`의 `SKIP_KEYS`가 재주입을 막는다. 소비자(memory-sync, summarize,
transcribe, gemini-image-gen)는 전부 `~/.env.local`을 직접 읽으므로 영향이 없다.
자세한 내용은 [MODELS.md](MODELS.md).

## pi-durable — native 홈 환경 읽기 (Entwurf 0.32.0)

ordinary Pi의 `env-loader.ts`·`hide-providers.ts`는 durable에서 로드되지 않는다. 이 집의 [`pi-durable/env.mjs`](pi-durable/env.mjs)가 **같은 읽기 정책**을 native ESM top-level에서 수행한다 — provider 생성 전, shell 실행 없이.

```bash
# 최초 생성
entwurf pi-durable --provider openai-codex --model gpt-6.1-sol:high \
	--width task-wide --native-module "$HOME/repos/gh/agent-config/pi-durable/env.mjs"

# 같은 cwd의 최신 저장 세션 다시 열기 — 모듈은 매번 명시
entwurf pi-durable --continue \
	--native-module "$HOME/repos/gh/agent-config/pi-durable/env.mjs"
```

- 읽는 파일은 홈 `~/.env.local` 하나뿐이다. 프로젝트 파일은 읽지 않는다. 기존 env는 **빈 값도** 우선하고 `HOME`·`PI_SESSION_ID`·`PI_CODING_AGENT_DIR`·`ENTWURF_*`는 주입하지 않는다.
- 위 네 provider 키는 상속 env에서도 제거하고 파일에서도 재주입하지 않는다. 키가 필요한 스킬의 직접 파일 읽기는 그대로다. `BASH_ENV`를 설정하거나 지우지 않는다.
- Pi처럼 대입 줄을 추출한다: `export `·양끝 따옴표·`$HOME`·선두 `~/` 처리, 비대입 줄과 비식별자 key skip, 같은 key는 뒤 대입 우선. `case`/`if` 분기는 **평가하지 않는다**. shell 실행이나 운영 routing의 정답을 보장하는 로더가 아니다.
- `ENOENT`만 정상 read no-op이며 다른 읽기 실패는 기동을 거부한다. 값·원문을 출력하지 않는다.
- Entwurf 0.32.0 패키지가 app carrier + Pi 1.0.4 SDK를 공급한다. 이 집은 SDK·런타임을 설치하지 않고 셸 설정도 변경하지 않는다. `--continue`에는 fresh-only provider/model/width를 붙이지 않는다.

15/15 API-0 검증 및 실제 같은-id 재개·bash 자식 숨김 확인(2026-10-08). 엄격 파서의 실제 기동 실패와 수선은 [PI-DURABLE.md](PI-DURABLE.md)에 보존했다. [전체 레퍼런스 계약과 증거 한계](pi-durable/README.md), [셸 헬퍼](README.md#shell-aliases-bashrclocal), `./run.sh test:pi-durable-env`.

## Telegram (분신 에이전트)

| 변수 | 용도 |
|------|------|
| `PI_TELEGRAM_BOT_TOKEN` | entwurf 텔레그램 봇 토큰 (grammy) |
| `PI_TELEGRAM_CHAT_ID` | entwurf 허용 chat_id |
| `PI_ENTWURF_BOT_TOKEN` | pi-telegram 봇 토큰 (`@glg_entwurf_bot`) |

`~/.env.local`에 설정. ~~`run.sh setup`이 `PI_ENTWURF_BOT_TOKEN`을 읽어 `~/.pi/agent/telegram.json`을 자동 생성함~~ — telegram.json 생성은 2026-08-06에 폐지됐다(pi-telegram 브리지 은퇴, `v2026.8.6`). setup은 이제 남아 있는 `telegram.json`을 지운다. 토큰 자체는 `~/.env.local`에 그대로 둔다(봇은 텔레그램에서 계속 응답).

## NixOS 로컬 설정

`~/.config/environment.d/50-pi-skills.conf`:

```
BIBCLI_DIR=/home/junghan/sync/emacs/zotero-config/output
GOG_ACCOUNT=junghanacs@gmail.com
```

새 세션에서 자동 적용됨. 현재 세션에는 수동 export 필요.

## Docker/OpenClaw 설정

컨테이너 환경에서는 bib 경로가 다릅니다:

```
BIBCLI_DIR=/data/org/resources
GOG_ACCOUNT=junghanacs@gmail.com
```

## gog(Google) 인증 — 기기 추가 / 스코프 확장

경험칙: **스코프를 한 번에 다 넣으면 잘 안 된다.** 필요한 것만 최소로 넣는다.

- `--services`에 전체 목록을 나열하면 동의 화면이 비대해지고 실패 확률이 올라간다.
- URL에 `include_granted_scopes=true`가 붙기 때문에 **Google 쪽 grant는 누적된다.**
  `--services gmail`만 줘도 이전에 승인한 calendar/drive/searchconsole 등은 살아있다.
  즉 새 스코프 하나를 얹을 때는 그것만 요청하면 된다.
- `gog auth list`가 보여주는 `services` 칼럼은 **마지막 명령의 로컬 라벨일 뿐**
  실제 토큰 권한이 아니다. `gmail` 하나만 떠 있어도 다른 API가 정상 동작한다.
  권한 확인은 라벨이 아니라 실제 호출로 한다.
- 이름 없는 스코프(예: blogger)는 `--extra-scopes`로 URI를 직접 준다.

### 헤드리스 기기(oracle 등) — remote 2-step

브라우저가 없는 기기는 `--remote`로 URL을 만들고, 승인은 GLG 브라우저에서,
코드 교환은 다시 그 기기에서 한다. PKCE verifier가 해당 기기에만 있으므로
**URL 생성과 코드 교환은 반드시 같은 기기**여야 한다.

```bash
# step 1 (헤드리스 기기) — 인증 URL 출력
gog auth add junghanacs@gmail.com --client personal \
  --services gmail \
  --extra-scopes=https://www.googleapis.com/auth/blogger \
  --force-consent --remote --step 1

# GLG 브라우저에서 승인 → 127.0.0.1:<port>/oauth2/callback 로 리다이렉트.
# 연결 실패 페이지가 뜨는 게 정상(그 포트는 원격 기기의 로컬 포트).
# 주소창 URL을 통째로 복사.

# step 2 (같은 기기) — 코드 교환 + 토큰 저장
gog auth add junghanacs@gmail.com --client personal \
  --services gmail \
  --extra-scopes=https://www.googleapis.com/auth/blogger \
  --force-consent --remote --step 2 \
  --auth-url '<붙여넣은 리다이렉트 URL 전체>'
```

리다이렉트 URL의 `code=`는 **일회용**이고 교환 시점에 소진된다. PKCE 때문에
verifier 없는 제3자는 교환할 수 없다. 만료됐으면 step 1부터 다시 하면 된다.

브라우저 있는 기기는 그냥 `gog auth add <email> --services <최소> --extra-scopes=<uri> --force-consent`.

검증은 라벨이 아니라 실호출로:

```bash
gog calendar list -a junghanacs@gmail.com --max 2
gog api call blogger v3 blogs.listByUser --params '{"userId":"self"}' -a junghanacs@gmail.com
```

`--params`는 JSON 오브젝트여야 한다(`key=value` 아님). Blogger 사용법은
`skills/gogcli/SKILL.md`의 Blogger 절 참고.

## Author Config (gitcli)

`~/.config/gitcli/authors`:

```
junghan
jhkim2
```

포크 리포에서 본인 커밋만 필터링 (`gitcli day --me`).
