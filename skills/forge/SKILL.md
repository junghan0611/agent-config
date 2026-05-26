---
name: forge
description: "포지(forge) — self-hosted Forgejo 이슈/PR/코멘트/라벨 작업면. 힣 에이전트가 코드 면에서 일하는 손. botment의 자식 패턴 — 가든 댓글면(remark42) → 코드 댓글면(Forgejo)으로 endpoint swap. v1 stub: caddy + Forgejo 배포 대기. 'forge', 'forgejo', '포지', 'issue', 'pull request', '이슈', '풀리퀘', '코드 댓글'."
user_invocable: true
---

# forge — self-hosted Forgejo 코드 작업면

힣 에이전트가 Forgejo의 이슈/PR/코멘트/라벨을 *공유 작업면*으로 쓰는 스킬.
**botment의 자식 패턴**: 가든 댓글(remark42) → 코드 댓글(Forgejo) endpoint swap.

## 상태

**v1 stub** — caddy + Forgejo 배포 대기 중. `FORGE_BASE_URL` + `FORGE_TOKEN`
박히면 실 API 채움. 부모 패턴(`skills/botment/scripts/botment.sh`, 277라인)을
endpoint만 갈아끼우는 fork 노선.

## 핵심 원칙

1. **공장 모델 거부** — 병렬 에이전트 수가 아니라 *공유 컨텍스트와 자취*가 핵심
2. **단일 신원** — Forgejo 사용자 `glg-bot` 하나, footer 서명으로 모델 식별
3. **사람 게이트 merge** — v1에서 자동 merge 없음

## 환경

| 변수 | 기본 | 비고 |
|------|------|------|
| `FORGE_BASE_URL` | (없음) | e.g. `https://forge.junghanacs.com` |
| `FORGE_TOKEN` | `~/.env.local` | 단일 `glg-bot` 토큰. 백엔드 공유 |

## API (v1, 동사 6개)

| 명령 | 동작 |
|------|------|
| `unread` | 할당/멘션된 미응답 이슈+PR |
| `list [open\|closed]` | 이슈/PR 목록 |
| `read <repo> <#>` | 이슈/PR 본문 + 코멘트 + 라벨 + CI 상태 |
| `comment <repo> <#> <text>` | 코멘트 작성. footer 서명 자동 |
| `label <add\|remove> <repo> <#> <label>` | 라벨 부착/제거 |
| `issue create <repo> <title> <body>` | 이슈 생성 |

PR 동사(`pr create`, `pr merge`)는 v2. merge는 사람 게이트.

## 라벨 프로토콜 v1 (5개)

| 라벨 | 의미 |
|------|------|
| `agent:ready` | 에이전트가 잡아도 됨 |
| `agent:running` | 잡힘 |
| `agent:done` | 완료 |
| `human:needs-review` | 사람 판단 필요 |
| `ci:failed` | CI 깨짐 |

운영하면서 부족하면 추가. botment도 read/reply 두 동작부터 시작했다.

## footer 서명

모든 코멘트 본문 끝에 자동 부착:

```
— glg-claude [claude-sonnet-4-6]
```

| 백엔드 | footer |
|--------|--------|
| Claude (Sonnet/Opus) | `— glg-claude [<model>]` |
| Codex (gpt-*) | `— glg-codex [<model>]` |
| Gemini | `— glg-gemini [<model>]` |
| OpenClaw 내부 | `— glg-bot@oracle [<model>]` |

## 사용법

```bash
bash {baseDir}/scripts/forge.sh unread
bash {baseDir}/scripts/forge.sh list
bash {baseDir}/scripts/forge.sh read forge-config 1
bash {baseDir}/scripts/forge.sh comment forge-config 1 "본문..."
bash {baseDir}/scripts/forge.sh label add forge-config 1 agent:running
bash {baseDir}/scripts/forge.sh issue create forge-config "제목" "본문"
```

## 부모/자식 참조

- 부모 패턴: `skills/botment/SKILL.md` — 가든 댓글면 (remark42)
- repo (생성 전, 이름 박아둠): https://github.com/junghan0611/forge-config
- 디자인 노트: `denote:20260527T073823` — 포지 레이어: 힣 에이전트의 공유 코드 작업면
- 디자인 이슈: https://github.com/junghan0611/agent-config/issues/13
