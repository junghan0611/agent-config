---
name: summarize
description: "URL/파일/미디어 요약 및 콘텐츠 추출. YouTube 영상, 웹페이지, PDF, 팟캐스트, 오디오/비디오 지원. 정본이 필요한 YouTube 자막은 youtube-transcript 스킬을 쓴다."
---

# summarize

[@steipete/summarize](https://github.com/steipete/summarize) 기반 콘텐츠 요약/추출 도구.
v0.21.11 설치 확인됨 — 최신판, 새 기능 릴리스는 없다(보안 패치뿐). **버전이 아니라 기능을
몰라서 못 쓰고 있었다.** 이 문서는 실제로 커맨드를 돌려서 확인한 결과를 기반으로 한다.

## 경계 — YouTube 정본이 필요하면 이 스킬을 쓰지 마라

`summarize --extract`는 YouTube 자막도 뽑아준다. 하지만 **정본(authoritative source)이
목적이면 안 된다.** `youtube-transcript` 스킬은 별개 계약을 가진 별개 도구다 — 이 스킬이
그것을 대체하지 않는다.

`youtube-transcript`의 계약(GLG 워딩, 원문은
`~/sync/org/notes/20250409T144319--...-유튜브-자막-정본과-...org`):
> "너가 가져온 스크립트 자체를 더 기계적으로 재현가능하게 담아내야 한다 … 마침표 구분은
> 이건 생각하기 나름이다. LLM이 개입되면 안돼 … 사람이 발화하면 다 문장 구조를 맞춰서
> 하는 것은 아니잖아. 그대로 살려야지."

구현자(grok-4.5, agent-config)가 남긴 한 문장이 이 도구와의 차이를 정확히 가른다:
> "없는 마침표·없는 화자·없는 문장 경계를 코드가 발명하는 순간, 그 파일은 증거가
> 아니라 해석본이 된다."

`youtube-transcript`는 원본 `>>` 화자 경계로만 turn을 나누고, 모르는 화자는 라벨을 안
붙이고, 문장 부호를 LLM이 다듬지 않는다. 산출물은 `~/org/md/transcript`에 denote md
정본으로 남아 가든 아이디로 편입된다. `summarize --extract`는 이 계약이 전혀 없다 — 빠르고
편하지만, LLM 마크다운 변환(`--markdown-mode llm`)을 켜면 문장 경계·마침표가 재구성될 수
있고, 기본 readability 경로도 원본 스트림 그대로를 보증하지 않는다.

**나눔 기준**: 인용·증거·가든 반입처럼 "누가 정확히 뭐라고 말했는가"가 중요하면
`youtube-transcript`. 빠르게 내용 파악만 하면 되는 리서치/스크리닝이면 `summarize
--extract`. 헷갈리면 정본 쪽으로 fail — `youtube-transcript`를 쓴다.

## Setup

```bash
pnpm add -g @steipete/summarize@latest
```

설정 파일: `~/.summarize/config.json` — **반드시 둔다.**
```json
{
  "model": { "id": "cli/claude/sonnet" }
}
```

이게 기본 레일이다(아래 "레일 선택" 절 참조) — 외부 계량 API가 아니라 기존 Claude Code
구독을 통해 돈다. 실측 확인: `summarize status` → `Model: cli/claude/sonnet (config)`.

환경변수 `GEMINI_API_KEY`는 `~/.env.local`에서 로드됨(Google 직결 폴백용, 아래 참조).
실행 전 항상 `source ~/.env.local &&`.

## ⚠️ `--model auto`를 쓰지 마라 — 실측으로 재현된 실패

설정 파일 없이 돌리거나 `--model auto`를 명시하면 이렇게 된다(2026-08-20, `--verbose`로 실측):

1. 내장 기본 후보 1순위 `google/gemini-3-flash` 시도 → **우리 Gemini 키에서 이미 실패**
   (`is not available via the Gemini API (v1beta) for this API key`). summarize 0.21.11에
   박혀 있는 기본 모델 id가 현재 Google API 버전과 안 맞는다 — 우리 쪽 설정 문제가 아니라
   패키지 내장 기본값이 낡았다.
2. `openai/gpt-5-mini` 시도 → `OPENAI_API_KEY` 없어서 skip.
3. **`openrouter/openai/gpt-5-mini`로 자동 폴백 — 실제로 OpenRouter API를 호출한다**
   (`OPENAI API error (404)`로 실패했을 뿐 호출 자체는 나갔다).
4. `anthropic/claude-sonnet-4-5` → 키 없어서 skip.
5. **`openrouter/anthropic/claude-sonnet-4.5`로 다시 OpenRouter 호출** → 가드레일에
   막혀 404.
6. 전부 실패 → 요약 없이 추출된 원문만 그대로 출력(`via html, no model`).

즉 **우리 OpenRouter 계정의 가드레일 설정이 우연히 막아줬을 뿐**, 그 설정이 달랐다면 auto
모드는 조용히 OpenRouter로 새서 추론을 돌렸을 것이다. `OPENROUTER_API_KEY`가 환경에 있는
한 이 경로는 항상 열려 있다.

**결론: 모델은 항상 명시적으로 고정한다.** `~/.summarize/config.json`에 `model.id`를 두면
auto 후보 목록 자체를 안 탄다 — `cli/claude/sonnet`로 고정한 뒤 `--verbose`로 재확인:
`auto candidate` 로그 줄이 아예 안 뜬다(고정 모델은 auto 선택 로직을 건너뛴다).
확인: `summarize status` → `Model: cli/claude/sonnet (config)`.

## 핵심 원칙: 요약보다 `--extract`를 먼저 고려하라

"요약은 지어낼 수 있어 못 믿겠다"는 걱정에 대한 답은 **무손실 경로를 쓰는 것**이다.
`--extract`는 LLM을 전혀 타지 않는다 — 실측 확인:

```bash
source ~/.env.local && summarize "https://example.com" --extract --plain
# → 3.8s, 모델/비용 표시 전혀 없음, 원문 그대로
```

`--json` 출력에서도 `--extract` 모드는 LLM metrics 필드 자체가 비어 있다. 추출은 웹페이지,
YouTube/미디어, 로컬 PDF에 다 된다(`-` stdin만 미지원). API 키가 아예 없어도 웹페이지/
YouTube 추출은 된다 — LLM을 안 타니까. (단, YouTube 정본이 목적이면 위 "경계" 절 참조 —
`--extract`는 편의 경로지 정본 경로가 아니다.)

```bash
# 웹페이지 원문 추출 (요약 없음, LLM 없음, 무료)
summarize "https://example.com/article" --extract --format md --plain

# YouTube 자막 원문 추출 (요약 없음, LLM 없음, 무료) — 빠른 스크리닝용, 정본 아님
summarize "https://youtu.be/VIDEO_ID" --extract --plain
```

실측(YouTube, Rick Astley 클래식 영상): 캐시 없이도 1.2초, `captionTracks`에서 바로 자막
가져옴, 조회수까지 같이 출력(`YouTube views: 1,806,048,551`). 요약이 필요 없고 원문/자막만
빠르게 훑으면 되면 `--extract`가 먼저다 — 정본이 필요하면 `youtube-transcript`로 간다.

## 레일 선택 — 기본은 `--cli claude`, 이유는 비용이 아니라 레일 가짓수

**외부 계량 API를 기본으로 쓰지 않는다.** Google 직결(`google/*`, `GEMINI_API_KEY`)도
기본값에서 내린다 — API 키를 여러 개 열면 관리해야 할 레일이 늘어나고 사고 표면이
넓어진다("API 열면 지저분해져서"). 기본 config는 `model.id: "cli/claude/sonnet"`로
고정하고, Claude Code 기존 구독 하나로 돈다.

**"우리가 파이프를 직접 짜면 되지 않나"에 대한 답 — 이미 측정됐다.** `summarize --extract`
로 뽑은 텍스트를 `claude -p`로 직접 파이프하는 방식과 `--cli claude`를 비교한 실측(같은
세션 계열, 위키 "Ship of Theseus" 2,557단어/16KB 기준):

- `summarize --extract` (3.6s) → `claude -p --model claude-sonnet-5 --output-format json`
  (12.0s) = 15.6s. usage: input 2 / cache_read 15,224 / cache_write 20,282 / output 504 →
  **입력 약 35.5k 토큰.**
- 즉 손으로 파이프를 짜면 `--cli claude`(아래 표의 31k)보다 **오히려 더 먹는다.** 그 30k대
  토큰은 summarize의 오버헤드가 아니라 **Claude Code 하네스 자체의 시스템 프롬프트/툴
  정의**다 — summarize든 손파이프든 Claude CLI를 부르는 순간 피할 수 없다.
- 결론: 직접 파이프를 새로 만들 이유가 없다. `--cli claude`가 이미 그 방식이고, 캐시·재시도·
  포맷 처리까지 더 잘 갖춰져 있다.

## 실측 비용/속도 (2026-08-20, `https://example.com` 기준 — 매우 짧은 페이지)

| 경로 | 시간 | 토큰 | 비용 |
|------|------|------|------|
| `--extract` | 3.8s | — (LLM 없음) | $0 |
| **`--cli claude` (기본 레일)** | 7.1–9.0s | ↑**31,160–31,254** ↓~100–130 | CLI가 표시하는 값은 $0.10 안팎이지만 이건 **API 환산 추정치**다. 실제 청구는 Claude Code 구독 쿼터에서 나간다 — $ 그 자체가 아니라 **형제들과 나눠 쓰는 5h/7d 윈도우를 얼마나 먹는지**로 읽어야 한다 |
| `--model google/gemini-3-flash-preview` (폴백, config 아님) | 3.6–4.9s | ↑899 ↓99 | **~$0.0007** (Gemini 3 Flash Preview 공시가 $0.50/1M in, $3/1M out 기준 계산 — CLI가 직접 $ 표시는 안 함) |
| `--model auto` (미고정) | 4s | ↑3,351×N회 시도 | 전부 실패 → 요약 안 나옴. 위 경고 참조 |

**`--cli claude`는 짧은 페이지에도 프롬프트 토큰이 31k 들어간다** — Google 직결(899 토큰)
대비 34배. 위 "레일 선택" 절에서 확인했듯 이건 summarize 탓이 아니라 Claude CLI 하네스
자체의 오버헤드이고, 직접 파이프로 짜도 피할 수 없다(오히려 35.5k로 더 나온 사례도 있음).
**대량 반복 요약 루프**에는 이 오버헤드가 누적되니 주의 — 그런 경우엔 Google 직결
폴백(아래)을 임시로 쓰는 게 합리적일 수 있다.

## 실행 방법

**반드시 `source ~/.env.local &&` 접두사와 함께 실행한다.**

```bash
source ~/.env.local && summarize <input> [flags]
```

## 핵심 사용법

### 원문/자막만 추출 (요약 없음, LLM 없음) — 기본으로 먼저 시도

```bash
summarize "https://example.com/article" --extract --format md --plain
summarize "https://youtu.be/VIDEO_ID" --extract --plain
summarize "/path/to/file.pdf" --extract --plain
```

### YouTube 영상 요약

```bash
summarize "https://www.youtube.com/watch?v=VIDEO_ID" --plain
summarize "https://youtu.be/VIDEO_ID" --length long --lang ko --plain
```

YouTube는 자막 우선 추출이 기본이다(`--youtube auto`): `youtubei` API → `captionTracks` →
`yt-dlp`(설정 시) → Apify(토큰 있을 시) 순으로 시도한다. 자막이 아예 없어도
`ytInitialPlayerResponse`의 설명(description)으로 최소한의 요약은 시도한다. (요약이 아니라
정본 자막이 목적이면 위 "경계" 절 — `youtube-transcript`로 간다.)

### 웹페이지 요약 / 추출

```bash
summarize "https://example.com/article" --plain
summarize "https://example.com/article" --length long --lang ko --plain
summarize "https://example.com" --extract --format md --plain
```

### PDF / 로컬 오디오·비디오 요약

```bash
summarize "/path/to/file.pdf" --plain
summarize "/path/to/audio.mp3" --plain
summarize "/path/to/video.mp4" --plain
```
(`yt-dlp`, `ffmpeg` 시스템 설치 필요 — 미디어 처리용. 이 두 항목은 문서 확인만 했고 이번
조사에서 직접 오디오/비디오 파일로는 실행하지 않았다 — **미확인**.)

### 팟캐스트 요약

```bash
summarize "https://feeds.example.com/podcast.xml" --plain      # RSS
summarize "https://podcasts.apple.com/..." --plain              # Apple Podcasts
summarize "https://open.spotify.com/episode/..." --plain        # Spotify
```
(**미확인** — 이번 조사에서 실제 팟캐스트 URL로는 돌려보지 않았다.)

### stdin 파이프

```bash
echo "긴 텍스트..." | summarize - --plain
```
(`--extract`는 stdin 미지원 — `docs/extract-only.md`에 명시. **미확인**: 실제 파이프 실행은
안 해봤다.)

### JSON 출력 (자동화용)

```bash
summarize "https://example.com" --json --metrics off > out.json
```

`--json`은 `input`/`env`/`extracted`/`prompt`/`llm`/`metrics`/`summary` 필드를 준다. **주의**:
`env` 블록에 `hasOpenRouterKey`/`hasGoogleKey` 등이 노출되지만 실제 키 값은 안 나온다.
`llm.calls[].promptTokens/completionTokens`는 있지만 **$ 비용 필드는 JSON 어디에도 없다**
— 비용은 사람이 읽는 stderr 푸터에만(그것도 CLI 레일에서만) 뜬다. 비용을 자동으로 추적하려면
토큰 수 × 공시 단가로 직접 계산해야 한다.

## 영상 속 슬라이드/장면 분석 — `--slides`

```bash
summarize "https://www.youtube.com/watch?v=..." --slides            # 요약 + 인라인 슬라이드
summarize "https://www.youtube.com/watch?v=..." --slides --extract  # 전체 트랜스크립트 + 슬라이드
summarize slides "https://www.youtube.com/watch?v=..." --render auto # 슬라이드만, 요약 없음
```

- 슬라이드 자체 설명 텍스트는 **모델을 안 탄다** — 타임스탬프 근처 트랜스크립트/OCR 텍스트를
  그대로 붙인다(`docs/slides.md`: "no model"). 단, `--slides`(요약 모드, `slides` 서브커맨드
  아님)로 내러티브를 짤 때는 그 내러티브 자체가 LLM 호출이다.
- `yt-dlp` + ffmpeg 필요. 기본 출력 위치 `./slides/<videoId>/`.
- `--slides-ocr`는 tesseract 필요.
- (**문서 기반 확인, 실행 미확인** — yt-dlp 다운로드 비용/시간 때문에 이번 조사에서 실제
  슬라이드 추출은 돌리지 않았다.)

## 화자 분리 / 화자 식별

```bash
summarize "URL" --extract --diarize                              # 화자 라벨만
summarize "URL" --extract --diarize elevenlabs --identify-speakers \
  --speaker-profile PROFILE --speaker-at "0:12=이름" --remember-speakers
```
`--diarize`는 ElevenLabs(기본, `ELEVENLABS_API_KEY` 필요) → OpenAI 순. 화자 이름 매핑은
`~/.summarize/config.json`의 `speakers.profiles`에 저장/재사용된다. (**문서 기반, 실행
미확인** — 우리 환경에 `ELEVENLABS_API_KEY` 없음, 테스트 안 함.)

## 구독 CLI 레일 — `--cli`

기본 레일이 `cli/claude/sonnet`이므로 config를 그대로 두면 `--cli` 플래그 없이도 이걸 쓴다.
다른 CLI로 일시적으로 바꾸고 싶을 때만 명시:

```bash
summarize "URL" --cli claude --plain   # config 기본값과 동일 레일
summarize "URL" --cli codex  --plain   # 미실행(구독 쿼터 아끼기 위해 이번엔 안 돌림)
```

`summarize status`로 뭐가 살아있는지 확인:
```
Claude CLI: available   Codex CLI: available   Cursor Agent CLI: available
GitHub Copilot CLI: available   Antigravity CLI: available   Pi CLI: available
```
전부 "쓸 수 있음"이지 전부 "써도 되는 레일"은 아니다 — AGENTS.md가 정한 승인 레일(기존
Claude Code 구독, pi의 GPT/Codex, xAI, Z.AI)만 쓴다. `openrouter/*`는 이 목록에 없다.

`--cli`는 계량 과금이 아니라 **구독 쿼터**를 먹는다. 위 "레일 선택" 절에서 확인했듯 이
오버헤드는 summarize를 거치든 손파이프를 짜든 피할 수 없는 Claude CLI 하네스 비용이다 —
대량 요약 루프를 자주 돌린다면 그만큼 형제들의 5h/7d 윈도우를 같이 쓰는 셈이니 계획해서 쓴다.

## 캐시

```bash
summarize --cache-stats   # 캐시 크기/항목 수 확인 (실측: 40KB, entries=9)
summarize --clear-cache   # 캐시 DB 삭제
```

- 요약/추출/트랜스크립트/슬라이드 각각 SQLite에 캐시됨(`~/.summarize/cache.sqlite`,
  기본 512MB/30일). 미디어(yt-dlp 다운로드)는 별도 파일 캐시(`~/.summarize/cache/media`,
  2GB/7일).
- `--no-cache`는 **요약(LLM) 캐시만** 우회한다 — 추출/트랜스크립트 캐시는 그대로 적용됨.
  미디어 다운로드 캐시를 끄려면 `--no-media-cache`.
- **같은 URL을 반복 요약하면 두 번째부터는 캐시 히트라 사실상 무료다** — contentHash 기반이라
  URL이 달라도 내용이 같으면 캐시가 맞는다.

## Preset / 모델별 규칙

`~/.summarize/config.json`의 `models` 블록으로 이름 붙인 프리셋을 만들 수 있다:
```json
{
  "models": { "fallback": { "id": "google/gemini-3-flash-preview" } },
  "model": "cli/claude/sonnet"
}
```
`model.mode: "auto"` + `rules`로 콘텐츠 종류/토큰 길이별 후보 목록을 직접 정의할 수도 있다
— 하지만 위에서 확인했듯 **기본 내장 규칙(`DEFAULT_RULES`)은 지금 우리 키에서 깨져 있고
OpenRouter로 새는 경로가 있다.** 커스텀 auto 규칙을 쓰더라도 candidates 목록에
`openrouter/*`가 들어가지 않게 직접 확인할 것. (우리는 이 기능 자체를 안 쓰고 `model.id`
고정만 쓴다 — 그게 맞는 선택이었다.)

## 주요 플래그 (실측/`--help` 확인)

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `--plain` | ANSI 렌더링 없이 텍스트 출력 | 에이전트는 항상 사용 |
| `--extract` | 콘텐츠 추출만, LLM 없음(**확인됨**) | - |
| `--length <값>` | `short\|medium\|long\|xl\|xxl` 또는 문자수 | `long`(`--help` 실측 — 이전 문서의 `medium` 표기는 오류였다) |
| `--lang, --language <언어>` | 출력 언어 | `auto` |
| `--model <id>` | 모델 지정. `auto`는 쓰지 말 것(위 경고) | `auto` |
| `--cli [provider]` | 구독 CLI 레일 사용 | - |
| `--format md\|text` | 추출/변환 포맷 | text(추출 URL 기본은 md) |
| `--json` | 구조화 출력, $ 비용 필드는 없음(**확인됨**) | - |
| `--youtube <mode>` | `auto\|web\|no-auto\|yt-dlp\|apify` | `auto` |
| `--slides [값]` | 슬라이드 추출 + 인라인 렌더 | - |
| `--diarize [provider]` | 화자 분리 | - |
| `--identify-speakers` | 화자 이름 식별 | - |
| `--timestamps` | 타임스탬프 포함 | false |
| `--force-summary` | 추출 내용이 짧아도 강제로 LLM 요약 | false |
| `--max-extract-characters <n>` | 추출 출력 길이 제한 | 무제한 |
| `--no-cache` | 요약(LLM) 캐시만 우회 | - |
| `--no-media-cache` | 미디어 다운로드 캐시 우회 | - |
| `--cache-stats` / `--clear-cache` | 캐시 조회/삭제 | - |
| `--metrics off\|on\|detailed` | 실행 후 푸터 상세도 | `on` |
| `--timeout <시간>` | 타임아웃(`30s`, `2m`) | `2m` |

## 모델 지정

**기본(config 고정): `cli/claude/sonnet`** — 외부 계량 API 없이 기존 Claude Code 구독으로
돈다. 짧은 페이지 실측 7.1–9.0s / 31k 프롬프트 토큰(위 "레일 선택" 절 참조 — 이건 Claude
CLI 하네스 자체 오버헤드고 손파이프로도 못 피한다).

**폴백(비고정, 필요할 때만 명시): `google/gemini-3-flash-preview`** — 짧은 페이지 실측
3.6–4.9s / ~$0.0007(899 in / 99 out 토큰, 공시가 기준 환산). 대량 반복 요약이라 구독
쿼터를 아끼고 싶을 때, 또는 Claude CLI 레일이 막혔을 때 `--model google/gemini-3-flash-preview`
로 일시 지정한다.

**`--model auto`는 쓰지 않는다** — 위 "auto를 쓰지 마라" 절 참조, 실측으로 OpenRouter 호출
재현됨. `openrouter/*`는 절대 기본값/예시로 쓰지 않는다.

## 출력 길이 가이드

| 프리셋 | 문자 수 |
|--------|---------|
| `short` | ~900 (600–1,200) |
| `medium` | ~1,800 (1,200–2,500) |
| `long` | ~4,200 (2,500–6,000) |
| `xl` | ~9,000 (6,000–14,000) |
| `xxl` | ~17,000 (14,000–22,000) |

## 에이전트 사용 가이드

1. **원문/자막만 필요 → 항상 `--extract`부터.** LLM 안 타서 무료, 왜곡 없음.
2. **YouTube 정본(인용/증거/가든 반입)이 필요** → `summarize`가 아니라 `youtube-transcript`
   스킬을 쓴다(위 "경계" 절).
3. **YouTube 영상 요약 요청** → `summarize URL --length long --lang ko --plain`
4. **YouTube 자막 빠른 스크리닝(정본 아님)** → `summarize URL --extract --plain`
5. **웹 아티클 요약 요청** → `summarize URL --lang ko --plain`
6. **웹페이지 텍스트 추출** → `summarize URL --extract --format md --plain`
7. **자동화/스크립트에서 쓸 때** → `--json --metrics off`, 비용은 토큰 수로 직접 계산
8. **PDF/파일 요약** → `summarize PATH --plain`
9. **사용자가 언어 미지정** → `--lang ko` 기본 사용 (Primary-Language: Korean)
10. **모델은 항상 명시/고정** — config 기본값(`cli/claude/sonnet`)에 맡기고 바꿀 때도
    `openrouter/*`는 쓰지 않는다.
11. **대량 반복 요약이라 구독 쿼터가 아까울 때만** → `--model google/gemini-3-flash-preview`
    로 일시 전환. 그 외엔 config 기본값(`--cli claude`)을 그대로 쓴다.

## Notes

- `--plain`은 에이전트 환경에서 항상 사용(ANSI 코드 방지).
- `--format md`는 `uvx --from markitdown[all] markitdown`을 시도할 수 있는데, 이 툴체인이
  로컬에 없거나 첫 실행이면 의존성 다운로드로 실패/지연될 수 있다(실측: `uvx` 시도 후
  실패, readability 폴백으로 정상 진행됨) — 급하면 `--markdown-mode readability`(웹페이지
  기본값)로 두면 이 경로를 안 탄다.
- `summarize status`, `summarize status --json`, `summarize status --probe`로 현재 살아있는
  provider 확인 가능. `--probe`는 실제 추론 없이 모델 리스트 엔드포인트만 확인한다.
- 긴 콘텐츠 처리 시 `--timeout 5m` 권장.
- `yt-dlp`, `ffmpeg`이 시스템에 설치되어 있어야 로컬 미디어/화자분리/슬라이드 처리 가능.
