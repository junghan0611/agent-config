---
name: session-recap
description: "직전 세션 요약 추출 — 세션 JSONL에서 핵심 텍스트만 뽑아 빠르게 맥락 복원. '직전에 뭐했지', '이전 세션', '무슨 작업', 'what did I do', 'last session'. raw JSONL read 대신 사용 — 100KB → 4KB로 85% 토큰 절감."
---

# session-recap — 세션 요약 추출

세션 JSONL에서 user/assistant **텍스트만** 추출한다.
raw JSONL을 `read`하면 50KB JSON 노이즈가 컨텍스트에 들어가므로 **절대 하지 않는다.**

스크립트: `{baseDir}/scripts/session-recap.py`

## When to Use

- "직전에 뭐했지?" → `session-recap.py -m 15`
- "이전 세션 요약" → `session-recap.py -m 20 --cost`
- "agent-config에서 뭐 했지?" → `session-recap.py -p agent-config`
- "최근 3개 세션" → `session-recap.py -s 3 -a -m 10`
- "커밋 목록" → `session-recap.py --commits` (또는 gitcli 사용)

## 에이전트 워크플로우: "직전에 뭐했지?"

**반드시 이 2스텝 패턴을 따른다:**

```
Step 1: python3 {baseDir}/scripts/session-recap.py [-p PROJECT] [-m 15]
Step 2: 결과를 읽고 요약 답변
```

**하지 말 것:**
- ❌ `read` 도구로 세션 JSONL 직접 읽기 (50KB JSON 노이즈 → $0.17/회)
- ❌ `session_search` 후 원본 JSONL 확인 (불필요한 중복)
- ❌ 여러 번 offset 바꿔가며 read (삽질 패턴)

**필요하면 추가:**
- 특정 주제 심화 → `session_search "주제 키워드"`로 정밀 검색
- 커밋 히스토리 → `gitcli day --days-ago 0 --me --summary`

## 옵션

| 플래그 | 기본값 | 설명 |
|--------|--------|------|
| `-s, --sessions N` | 1 | 직전 N개 세션 |
| `-m, --messages N` | 20 | 세션당 마지막 N개 메시지 |
| `-c, --chars N` | 300 | 메시지당 최대 글자수 |
| `-p, --project NAME` | 전체 | 프로젝트 필터 (정확 매칭) |
| `-a, --all-projects` | - | 모든 프로젝트 포함 |
| `--commits` | off | git 커밋 명령 포함 |
| `--cost` | off | 세션 비용 요약 |
| `-f, --format` | text | `text` 또는 `json` |
| `--skip N` | 1 | 최신 N개 세션 건너뛰기 (현재 세션) |

## 비용 비교

| 방법 | 컨텍스트 크기 | 비용 | 스텝 |
|------|-------------|------|------|
| raw JSONL read | ~100KB | ~$0.63 | 8-10 |
| **session-recap** | ~4KB | ~$0.09 | 2-3 |

## 환경

- NixOS: python3 기본 포함 (추가 패키지 불필요)
- 의존성: 표준 라이브러리만 (json, os, pathlib, argparse)
