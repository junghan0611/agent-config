---
name: forge
description: "포지(forge) — 셀프호스팅 Forgejo 이슈/PR/라벨/코멘트 작업면. 힣 에이전트가 코드 면에서 일하는 공유 손. botment의 자식 패턴(가든 댓글면 → 코드 댓글면 endpoint swap). 'forge', 'forgejo', '포지', 'issue', 'pull request', '이슈', '풀리퀘', '코드 댓글', '라벨'."
user_invocable: true
---

# forge — Forgejo 코드 작업면

힣 에이전트가 Forgejo 이슈/라벨/코멘트를 *공유 작업면*으로 쓰는 스킬.
**botment의 자식 패턴**: 가든 댓글(remark42) → 코드 댓글(Forgejo) endpoint swap.

## SSOT

CLI 본체는 [`forge-config`](https://github.com/junghan0611/forge-config) repo 안에 산다.
agent-config은 이 SKILL.md만 들고, 실 명령은 외부 절대경로로 호출한다.

```
~/repos/gh/forge-config/bin/forge
```

이 스킬에서 다루는 동사/플래그/env 변수가 실제 동작과 어긋나면 **bin/forge가
정답**이다. 의문 시 `~/repos/gh/forge-config/AGENTS.md` 와 `NEXT.md` 확인.

운영 인스턴스: `https://forge.junghanacs.com` (Oracle, Forgejo 15.x).

## 핵심 원칙

1. **공장 모델 거부** — 병렬 에이전트 수가 아니라 *공유 컨텍스트와 자취*가 핵심
2. **단일 신원** — Forgejo 사용자 `glg-bot` 하나, footer 서명으로 모델/호스트 식별
3. **사람 게이트 merge** — v1에서 자동 merge 없음
4. **닫힌 계** — 시크릿은 `~/.env.local` + `pass`. repo 에는 변수명만

## 환경 변수

`bin/forge` 가 자동으로 `~/.env.local` 을 읽는다. 에이전트는 변수만 박혀있는지
확인.

| 변수 | 필수 | 기본 | 비고 |
|------|------|------|------|
| `FORGE_URL` | ✅ | (없음) | e.g. `https://forge.junghanacs.com` |
| `FORGE_TOKEN` | ✅ | (없음) | 단일 `glg-bot` 토큰 |
| `FORGE_USER` | ⭕ | `glg-bot` | 봇 사용자명 |
| `FORGE_REPO` | ⭕ | `glg-bot/sandbox` | 기본 repo (이슈 번호만 줄 때) |
| `FORGE_BOT_FOOTER` | ⭕ | `— glg-bot [gpt-5.5 / oracle]` | 코멘트 자동 footer |

세션 시작 hook 의 `device=` 값으로 호스트 부분을 맞춰서 export 해두는 것을 권장:

```bash
export FORGE_BOT_FOOTER="— glg-bot [claude-opus-4-7 / oracle]"
```

env 미설치 시 `bin/forge` 가 친절한 에러를 던지므로 그것을 따라가면 된다.

## API — v1 동사 4개

| 명령 | 인자 | 동작 |
|------|------|------|
| `list-open` | `[REPO]` | 열린 이슈 목록 (제목 + 라벨 + 코멘트 수). REPO 생략 시 `$FORGE_REPO` |
| `state` | `ISSUE` | 이슈 상태 + 라벨 + 최근 코멘트 3개 |
| `comment` | `ISSUE BODY` | 코멘트 작성. footer 자동 부착 |
| `label-add` | `ISSUE LABEL` | 라벨 이름으로 ID 조회 후 부착 |

`ISSUE` 인자 형식:

- `1` → `$FORGE_REPO` 의 #1
- `glg-bot/sandbox#1` → 명시된 repo 의 #1

추가 동사(`label-remove`, `read`, `unread`, `issue create`, `pr ...`)는 v2 — 운영
필요성이 누적되면 forge-config 측에서 박는다. 여기서 동사를 임의로 늘리지 말 것
(SSOT 어긋남).

## 라벨 프로토콜 v1 (5개)

| 라벨 | 색 | 의미 |
|------|----|----|
| `agent:ready` | `#0e8a16` | 에이전트가 잡아도 됨 |
| `agent:running` | `#fbca04` | 잡힘 — 작업 중 |
| `agent:done` | `#0366d6` | 완료 |
| `human:needs-review` | `#5319e7` | 사람 판단 필요 |
| `ci:failed` | `#d73a4a` | CI 깨짐 |

라벨 ID 는 인스턴스마다 다르므로 **이름으로만** 다룬다. `label-add` 가 이름→ID
변환을 처리한다.

## footer 서명 — 자기 식별

모든 코멘트 본문 끝에 자동 부착된다. 형식:

```
— glg-bot [<model> / <host>]
```

| 예 | 의미 |
|----|----|
| `— glg-bot [gpt-5.5 / oracle]` | OpenClaw GPT, oracle 호스트 |
| `— glg-bot [claude-opus-4-7 / oracle]` | 클로드 Opus, oracle |
| `— glg-bot [pi-codex / nuc]` | NUC 의 pi (codex 백엔드) |
| `— glg-bot [claude-code / laptop]` | 노트북의 Claude Code |

`<host>` 는 세션 시작 hook 의 `device=` 값, 또는 `cat ~/.current-device`. 불확실하면
적지 말고 명시적으로 정정.

이 서명이 빠지면 봇멘트 패턴과의 일관성이 깨진다. `bin/forge comment` 는 기본
footer 를 자동 삽입하므로 따로 박을 필요 없음.

## 사용법

```bash
# 환경 sanity
~/repos/gh/forge-config/bin/forge help

# 열린 이슈 보기 (기본 repo)
~/repos/gh/forge-config/bin/forge list-open

# 다른 repo 의 열린 이슈
~/repos/gh/forge-config/bin/forge list-open junghanacs/forge-config

# 상태 확인 (라벨 + 최근 코멘트 3개)
~/repos/gh/forge-config/bin/forge state 1
~/repos/gh/forge-config/bin/forge state glg-bot/sandbox#1

# 코멘트 작성 (footer 자동)
~/repos/gh/forge-config/bin/forge comment 1 "분류 완료. nixos 담당자에게 위임."

# 라벨 부착
~/repos/gh/forge-config/bin/forge label-add 1 agent:running
```

## 워크플로 — 에이전트가 잡는 흐름

```
1. list-open                       → 미처리 이슈 훑기
2. state <issue>                   → 본문 + 라벨 + 최근 코멘트 확인
3. label-add <issue> agent:running → 잡았음 표시
4. (담당자 영역이면) 작업, (아니면) sibling 호출 + 결과 회수
5. comment <issue> "결과 요약 + 링크"
6. label-add <issue> agent:done    또는 human:needs-review
```

우선순위: `ci:failed` > `agent:ready` > `human:needs-review` (정보용).

## 책임 경계

- **forge-config 담당자**: bin/forge 진화, 라벨 protocol, footer 규약, AGENTS.md SSOT
- **agent-config 담당자**: 이 SKILL.md 표면 일관성 유지, 다른 백엔드 (Codex/Gemini/Claude Code) 에 동일하게 노출
- **개별 repo 담당자**: 자기 repo 의 이슈를 받아서 실 코드 작업

이슈가 어느 영역인지 모호하면 forge-config 담당자가 코멘트로 정리한 뒤 힣
결정을 기다린다.

## 참조

- SSOT: `~/repos/gh/forge-config/bin/forge`
- 담당자 가이드: `~/repos/gh/forge-config/AGENTS.md`
- 다음 한 걸음: `~/repos/gh/forge-config/NEXT.md`
- 부모 패턴: `skills/botment/SKILL.md` (가든 댓글면)
- 디자인 노트: `denote:20260527T073823`
- 7-spike 로드맵: <https://github.com/junghan0611/agent-config/issues/13>
