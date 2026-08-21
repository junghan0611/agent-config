---
name: youtube-transcript
description: "YouTube 발화 정본 추출. 시간 조각 자막을 YouTube 원본 >> 경계로만 조립해 ~/org/md/transcript에 denote md로 저장. turn 시작은 <!-- [m:ss] -->. LLM 재작성 없음. transcript.js 기본 + ytdlp 폴백."
---

# YouTube Transcript

YouTube 자동/수동 자막을 **발화 정본 md**로 가져온다.
요약이 아니다. LLM 문장 교정도 아니다. **코드 레벨 조립**만 한다.

## 정본 계약

| 한다 | 안 한다 |
|------|---------|
| 원본 cue 텍스트 보존 (`uh`, 반복, `[laughter]`) | LLM 재작성 / 마침표 발명 |
| YouTube가 넣은 `>>` 경계로만 turn 분리 | 발화자 이름 추정·라벨 |
| YAML front matter에 영상 메타 | 본문에 보이는 `[0:00]` 접두 |
| turn 시작 `<!-- [m:ss] -->` (HTML 주석) | SRT/VTT 포맷 출력 |
| `~/org/md/transcript/` denote md 저장 | |

`>>`가 없으면 긴 덩어리로 남긴다. 없는 경계를 만들지 않는다.

## Setup

```bash
cd {baseDir}
npm install
```

## 방법 1: transcript.js (기본)

```bash
# 추출 + ~/org/md/transcript 저장 + stdout 전체 문서
{baseDir}/transcript.js <video-id-or-url>

# 언어 지정 (default: en)
{baseDir}/transcript.js <video-id-or-url> --lang en

# 저장 없이 stdout만
{baseDir}/transcript.js <video-id-or-url> --no-save

# 저장 경로 오버라이드
{baseDir}/transcript.js <video-id-or-url> --outdir ~/org/md/transcript

# 사용 가능 자막 언어
{baseDir}/transcript.js <video-id-or-url> --list
```

stderr에 `Saved: <path>`가 찍힌다. stdout은 헤더+본문 전체.

## 방법 2: transcript-ytdlp.sh (폴백)

transcript.js 실패 시. 쿠키 자동 감지. 같은 정본 계약.

```bash
{baseDir}/transcript-ytdlp.sh <video-id-or-url>
{baseDir}/transcript-ytdlp.sh <video-id-or-url> --lang en
{baseDir}/transcript-ytdlp.sh <video-id-or-url> --list
{baseDir}/transcript-ytdlp.sh <video-id-or-url> --no-save
```

### oracle / datacenter 참고

- 주거 IP(thinkpad)에서는 `transcript.js`가 쿠키 없이 되는 경우가 많다.
- 오라클(클라우드 IP)에서는 JS 경로가 막히고 **ytdlp + 쿠키**가 본선이다.
- 쿠키 파일: `~/cookies.txt` (컨테이너 마운트 `/home/node/cookies.txt`, **rw**).
  Netscape 포맷에 **`LOGIN_INFO`가 있어야** 한다. `yt-dlp --cookies-from-browser chrome`은
  이 필드를 빠뜨리는 경우가 있어, thinkpad에서 `browser-cookie3`로 export 한 뒤 scp 한다.
- yt-dlp **≥ 2026.8.19** + `--remote-components ejs:github` 필요(스크립트가 자동 포함).
  컨테이너 재빌드 전 임시 갱신: `docker exec -u root openclaw-gateway pip install -U --break-system-packages 'yt-dlp>=2026.8.19'`.

## 출력 예

파일명: `20260811T095500--gurudev-on-the-future-of-humanity__transcript_youtube.md`

```markdown
---
title:       "Gurudev on the Future of Humanity"
date:        2026-08-11T09:55:00+09:00
tags:        ["transcript", "youtube"]
identifier:  "20260811T095500"
source:      "https://youtu.be/ZBJkxUcgYa8"
video_id:    ZBJkxUcgYa8
channel:     "Mo Gawdat"
lang:        en
duration:    25:26
cues:        597
turns:       154
---

<!-- [0:00] -->
Do you believe that we are all [music] designed for some kind of a mission in life that

<!-- [0:04] -->
definitely there is certain uh [music] preset missions for all of us amenities or [music] uh instruments we need we end up getting that

<!-- [0:15] -->
when we align with what that mission
```

- `<!-- [m:ss] -->` — 에디터/미리보기에서 주석(흐리게). 발화 텍스트와 시각적으로 분리
- 저장 루트: `~/org/md/transcript` (실체: `~/sync/org/md/transcript`). md 가든 정책에 맞춘 Denote id 축 편입

## 판단 기준

1. 먼저 `transcript.js`
2. 실패 → `transcript-ytdlp.sh`
3. 둘 다 실패 → summarize `--extract` 또는 transcribe(Whisper)

## 에이전트 활용

1. 스크립트 실행 → `Saved:` 경로 확인 → 필요 시 파일 read
2. 영어 자막이 기본. 한국어 자막을 직접 받지 않는다 — en 받아 에이전트가 번역/분석
3. 정본을 고치거나 화자를 붙여 쓰지 않는다. 원본 조립본을 근거로 둔다

## Notes

- `youtube-transcript-plus`의 `offset`/`duration` 단위는 **초**
- oracle 등 다른 기기: `~/org/md/transcript` 경로와 npm install 전제
- `--lang en` 기본. 자동생성 영어 포함
