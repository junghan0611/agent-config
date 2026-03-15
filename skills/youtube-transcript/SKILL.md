---
name: youtube-transcript
description: "YouTube 자막 원문 추출 (요약 아님). 영어 자막(자동생성 포함)을 가져와서 에이전트가 번역/분석에 활용. 두 가지 방법 지원: transcript.js (npm, 빠름) + transcript-ytdlp.sh (쿠키 지원, 폴백)"
---

# YouTube Transcript

YouTube 영상의 자막 원문을 추출한다. **요약이 아니라 원문 텍스트**를 가져온다.
에이전트가 가져온 영어 자막을 번역하거나 분석에 활용한다.

## 두 가지 방법

| 방법 | 장점 | 단점 |
|------|------|------|
| **transcript.js** (기본) | 빠름, 쿠키 불필요 | 자막 비활성화 영상 불가 |
| **transcript-ytdlp.sh** (폴백) | 쿠키 지원, 자동생성 자막 강제 추출 | yt-dlp + EJS 설정 필요 |

## 판단 기준

1. 먼저 `transcript.js`로 시도
2. 실패하면 `transcript-ytdlp.sh`로 폴백
3. 둘 다 실패하면 → summarize 스킬의 `--extract` 옵션 시도

## Setup

```bash
cd {baseDir}
npm install
```

## 방법 1: transcript.js (기본)

```bash
# 영어 자막 추출 (기본 lang=en)
{baseDir}/transcript.js <video-id-or-url>

# 언어 지정
{baseDir}/transcript.js <video-id-or-url> --lang en

# 사용 가능한 자막 언어 목록
{baseDir}/transcript.js <video-id-or-url> --list
```

### 예시

```bash
# Video ID로
{baseDir}/transcript.js dQw4w9WgXcQ

# URL로
{baseDir}/transcript.js "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
{baseDir}/transcript.js "https://youtu.be/dQw4w9WgXcQ"

# 자막 언어 확인
{baseDir}/transcript.js dQw4w9WgXcQ --list
# → Available languages: en, en, de-DE, ja, pt-BR, es-419
```

## 방법 2: transcript-ytdlp.sh (폴백)

yt-dlp 기반. 쿠키 파일을 자동 감지한다 (`~/cookies.txt` 또는 `~/Downloads/www.youtube.com_cookies.txt`).

```bash
# 영어 자막 추출
{baseDir}/transcript-ytdlp.sh <video-id-or-url>

# 언어 지정
{baseDir}/transcript-ytdlp.sh <video-id-or-url> --lang en

# 사용 가능한 자막 목록
{baseDir}/transcript-ytdlp.sh <video-id-or-url> --list

# 쿠키 파일 직접 지정
{baseDir}/transcript-ytdlp.sh <video-id-or-url> --cookies ~/cookies.txt
```

## Output

타임스탬프 + 텍스트 형식:

```
[0:00] We're no strangers to love
[0:04] You know the rules and so do I
[0:08] A full commitment's what I'm thinking of
```

## 에이전트 활용 가이드

1. **영어 자막 추출** → `transcript.js URL` (실패 시 `transcript-ytdlp.sh URL`)
2. **자막 + 한국어 번역** → 자막 추출 후 에이전트가 직접 번역
3. **자막 + 분석/요약** → 자막 추출 후 에이전트가 관점 지정 분석
4. **자막 언어 확인** → `transcript.js URL --list`
5. **한국어 자막은 받지 않는다** — 영어(자동생성 포함) 받아서 번역하는 게 품질이 더 좋음

## Notes

- `--lang en`이 기본. 한국어 자막을 직접 받을 일은 없다
- 자막 비활성화 영상은 transcript.js 불가 → transcript-ytdlp.sh 시도
- 둘 다 불가하면 오디오 다운로드 + transcribe 스킬(Whisper)로 전사
- oracle 서버에도 `~/youtube-transcript/`, `~/cookies.txt` 배포 완료
