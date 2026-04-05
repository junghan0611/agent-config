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

## Author Config (gitcli)

`~/.config/gitcli/authors`:

```
junghan
jhkim2
```

포크 리포에서 본인 커밋만 필터링 (`gitcli day --me`).
