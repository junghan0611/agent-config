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

## Telegram (분신 에이전트)

| 변수 | 용도 |
|------|------|
| `PI_TELEGRAM_BOT_TOKEN` | entwurf 텔레그램 봇 토큰 (grammy) |
| `PI_TELEGRAM_CHAT_ID` | entwurf 허용 chat_id |
| `PI_ENTWURF_BOT_TOKEN` | pi-telegram 봇 토큰 (`@glg_entwurf_bot`) |

`~/.env.local`에 설정. `run.sh setup`이 `PI_ENTWURF_BOT_TOKEN`을 읽어 `~/.pi/agent/telegram.json`을 자동 생성함.

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
