---
name: summarize
description: "URL/파일/미디어 요약 및 콘텐츠 추출. YouTube 영상, 웹페이지, PDF, 팟캐스트, 오디오/비디오 지원. 기존 youtube-transcript를 대체."
---

# summarize

[@steipete/summarize](https://github.com/steipete/summarize) 기반 콘텐츠 요약 도구.
YouTube, 웹페이지, PDF, 팟캐스트, 오디오/비디오 등 거의 모든 콘텐츠를 요약하거나 텍스트를 추출한다.

## Setup

```bash
pnpm add -g @steipete/summarize@latest
```

설정 파일: `~/.summarize/config.json`
```json
{
  "model": { "id": "openrouter/google/gemini-3-flash-preview" }
}
```

환경변수 `OPENROUTER_API_KEY`는 `~/.env.local`에서 로드됨.

## 실행 방법

**반드시 `source ~/.env.local &&` 접두사와 함께 실행한다.**

```bash
source ~/.env.local && summarize <input> [flags]
```

## 핵심 사용법

### YouTube 영상 요약

```bash
# 기본 요약
source ~/.env.local && summarize "https://www.youtube.com/watch?v=VIDEO_ID" --plain

# 긴 요약
source ~/.env.local && summarize "https://youtu.be/VIDEO_ID" --length long --plain

# 한국어 출력
source ~/.env.local && summarize "https://youtu.be/VIDEO_ID" --length long --lang ko --plain
```

### YouTube 자막(transcript) 추출만

```bash
# 자막만 추출 (요약 없이)
source ~/.env.local && summarize "https://youtu.be/VIDEO_ID" --extract --plain
```

**이것이 기존 youtube-transcript 스킬을 대체한다.**

### 웹페이지 요약

```bash
source ~/.env.local && summarize "https://example.com/article" --plain
source ~/.env.local && summarize "https://example.com/article" --length long --lang ko --plain
```

### 웹페이지 콘텐츠 추출만

```bash
source ~/.env.local && summarize "https://example.com" --extract --plain
source ~/.env.local && summarize "https://example.com" --extract --format md --plain
```

### PDF 요약

```bash
source ~/.env.local && summarize "/path/to/file.pdf" --plain
source ~/.env.local && summarize "https://example.com/report.pdf" --plain
```

### 팟캐스트 요약

```bash
# RSS 피드
source ~/.env.local && summarize "https://feeds.example.com/podcast.xml" --plain

# Apple Podcasts
source ~/.env.local && summarize "https://podcasts.apple.com/..." --plain

# Spotify
source ~/.env.local && summarize "https://open.spotify.com/episode/..." --plain
```

### 로컬 오디오/비디오

```bash
source ~/.env.local && summarize "/path/to/audio.mp3" --plain
source ~/.env.local && summarize "/path/to/video.mp4" --plain
```

### stdin 파이프

```bash
echo "긴 텍스트..." | source ~/.env.local && summarize - --plain
cat /path/to/file.txt | source ~/.env.local && summarize - --plain
```

## 주요 플래그

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `--plain` | ANSI 렌더링 없이 텍스트 출력 | 필수 권장 |
| `--length <값>` | 출력 길이: `short\|medium\|long\|xl\|xxl` 또는 문자수 | `medium` |
| `--lang <언어>` | 출력 언어 (`ko`, `en`, `auto`) | `auto` |
| `--model <id>` | 모델 지정 | config 기본값 |
| `--extract` | 콘텐츠 추출만 (요약 안 함) | - |
| `--format md\|text` | 추출 포맷 | `text` |
| `--youtube auto` | YouTube 자막 소스 | `auto` |
| `--json` | JSON 출력 (메트릭스 포함) | - |
| `--timeout <시간>` | 타임아웃 (`30s`, `2m`) | `2m` |

## 모델 지정

기본: `openrouter/google/gemini-3-flash-preview` (긴 컨텍스트, 빠름, 저렴)

```bash
# 다른 모델 사용 시
source ~/.env.local && summarize "URL" --model openrouter/anthropic/claude-sonnet-4-5 --plain
```

## 출력 길이 가이드

| 프리셋 | 문자 수 |
|--------|---------|
| `short` | ~900 (600-1,200) |
| `medium` | ~1,800 (1,200-2,500) |
| `long` | ~4,200 (2,500-6,000) |
| `xl` | ~9,000 (6,000-14,000) |
| `xxl` | ~17,000 (14,000-22,000) |

## 에이전트 사용 가이드

1. **YouTube 영상 요약 요청** → `summarize URL --length long --lang ko --plain`
2. **YouTube 자막 추출 요청** → `summarize URL --extract --plain`
3. **웹 아티클 요약 요청** → `summarize URL --lang ko --plain`
4. **웹페이지 텍스트 추출** → `summarize URL --extract --format md --plain`
5. **PDF/파일 요약** → `summarize PATH --plain`
6. **팟캐스트 요약** → `summarize RSS_OR_URL --length long --lang ko --plain`
7. **사용자가 언어 미지정** → `--lang ko` 기본 사용 (Primary-Language: Korean)

## Notes

- `--plain` 플래그는 에이전트 환경에서 항상 사용 (ANSI 코드 방지)
- 긴 콘텐츠 처리 시 `--timeout 5m` 권장
- 추출된 콘텐츠가 요청 길이보다 짧으면 원문 그대로 반환됨
- `yt-dlp`, `ffmpeg`이 시스템에 설치되어 있어 미디어 처리 가능
