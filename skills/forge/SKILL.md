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

운영 인스턴스 (2026-05-27 기준):

| profile | URL | 용도 |
|---------|-----|------|
| `oracle` | `https://forge.junghanacs.com` | 개인 / 공개 정원 페어 (`repos/gh/*`) |
| `work` | `https://<work-forge-host>/forge` | 회사 / mirror 운영면 (`repos/work/*`) |

## 핵심 원칙

1. **공장 모델 거부** — 병렬 에이전트 수가 아니라 *공유 컨텍스트와 자취*가 핵심
2. **단일 신원** — Forgejo 사용자 `glg-bot` 하나, footer 서명으로 모델/호스트 식별
3. **사람 게이트 merge** — v1에서 자동 merge 없음
4. **닫힌 계** — 시크릿은 `~/.env.local` + `pass`. repo 에는 변수명만
5. **운영 머신 ≠ forge 인스턴스** — thinkpad 에서 양쪽 forge 다 굴린다 (세션이 thinkpad 에 남아야 andenken 임베딩됨). cwd 가 어느 forge 인지 결정한다.

## 환경 변수 — profile 시스템

`bin/forge` 가 호출 시점에 **profile** 을 자동 결정해서 prefix 변수를 풀어쓴다.
에이전트는 변수만 박혀있는지만 확인하면 된다.

### Profile 결정 우선순위 (높을수록 우선)

1. `--forge oracle|work` 플래그
2. `FORGE_PROFILE` env (`oracle` / `work`)
3. **cwd 패턴 — 명시 anchor 만**:
   - `*/repos/work/*` → `work`
   - `*/repos/gh/*` → `oracle`
   - **그 외 (`~`, `~/org/`, `~/Downloads/` 등)** → 에러. 명시 요구.
4. Legacy env value fallback (URL/TOKEN 만) — profile prefixed 가 비어있을 때 unprefixed `FORGE_URL`/`FORGE_TOKEN` 참조. host-scoped switching 결과 (oracle/work 에 직접 ssh 들어갔을 때만 의미). `FORGE_REPO` 는 fallback 없음 (인스턴스 간 leak 방지).

→ thinkpad 에서 `cd ~/repos/gh/foo && forge list-open` 하면 자동 oracle.
→ `cd ~/repos/work/bar && forge state 3` 하면 자동 work.
→ `cd ~ && forge list-open` 은 **silent oracle default 금지** — 명시 요구. mutating 사고 방지.
→ `forge --forge work list-open glg-bot/<work-repo>` 로 어디서든 명시 override.

### Mutating 명령 stderr observability

`comment` / `label-add` / `label-remove` / `label-set` 호출 시 stderr 에 한 줄 노출:

```
[forge] profile=oracle repo=glg-bot/sandbox url=https://forge.junghanacs.com
```

→ 잘못된 인스턴스/repo 에 write 하기 전에 즉시 인지. `FORGE_PROFILE` env 가 셸에 오래 남아 cwd 보다 우선될 때의 사고도 같은 표면으로 잡힌다.

### Profile-prefixed env (`~/.env.local` SSOT)

| 변수 | 필수 | 비고 |
|------|------|------|
| `ORACLE_FORGE_URL` / `_TOKEN` / `_USER` | ✅ | oracle profile 원천 |
| `WORK_FORGE_URL` / `_TOKEN` / `_USER` | ✅ | work profile 원천 |
| `ORACLE_FORGE_REPO` | ⭕ | default `glg-bot/sandbox` |
| `WORK_FORGE_REPO` | ⭕ | default 없음 — 인자로 명시 강제 |
| `FORGE_MODEL` | ⭕ | footer 의 모델 부분 (없으면 `unknown`) |

### 머신별 default profile — `~/.current-forge-profile`

각 머신이 "어느 forge 의 *직접 접속 호스트* 인지" 박는다. 클라이언트 머신은 비워둔다.

| 머신 | 정체성 | 파일 |
|---|---|---|
| oracle | "oracle forge 의 호스트" | `echo oracle > ~/.current-forge-profile` |
| 회사 머신 | "work forge 의 호스트" | `echo work > ~/.current-forge-profile` |
| thinkpad / laptop / nuc 등 | 양쪽의 **클라이언트** (호스트 아님) | **없음** — cwd 로 매번 결정 |

`.env.local` 의 case 분기가 이 파일을 입력으로 unprefixed `FORGE_URL`/`TOKEN`/`USER` 를 set 한다. 클라이언트 머신은 case 매칭 실패 → bin/forge 의 cwd 패턴 결정에 자연 위임.

> 참고: `FORGE_BOT_FOOTER` env 는 **무시된다**. footer 형식은 정책이라
> 매 호출마다 `bin/forge` 가 자동 조립한다 — 깨진 부모 셸 env 가 발현되지
> 않도록 닫아둔 표면. 모델은 `FORGE_MODEL` 로만 customize.

### footer 자동 조립

```
— glg-bot [<FORGE_MODEL or "unknown"> / <~/.current-device or "unknown">]
```

세션 시작 시 모델만 박아두면 footer 가 정확해진다:

```bash
export FORGE_MODEL="claude-opus-4-7"
# thinkpad 에서 oracle forge 코멘트 → "— glg-bot [claude-opus-4-7 / thinkpad]"
# 같은 thinkpad 에서 work forge 코멘트 → 동일 footer (작업 머신 기준)
```

env 미설치 시 `bin/forge` 가 친절한 에러를 던지므로 그것을 따라가면 된다
(`FORGE_URL is required (profile=<name> — set <NAME>_FORGE_URL in ~/.env.local)`).

## 발견성 — namespace 와 처음 만난 repo

각 forge 인스턴스의 봇 namespace 는 **`glg-bot/*`** (oracle / work 양쪽 동일). 처음 다루는 repo 라 *어느 path 에 박지* 모르면 GitHub remote 의 `teamgoqual/*` / `junghan0611/*` 를 그대로 추측하지 말 것 — forge namespace 와 안 맞는다.

발견 recipe:

```bash
forge --forge work repos          # work forge 의 glg-bot/* 실재 목록
forge --forge oracle repos        # oracle forge 의 glg-bot/* 실재 목록
forge --forge work repos <other>  # 다른 namespace 도 명시 가능
```

운영 사실 (자취):
- oracle forge → `glg-bot/forge-config`, `glg-bot/sandbox`
- work forge → `glg-bot/voscli`, `glg-bot/incidentcli`, `glg-bot/sandbox`

GitHub repo 의 `<owner>/<name>` 에서 `<name>` 만 떼서 `glg-bot/<name>` 매핑하는 게 자연 fallback 이지만, 실재하지 않을 수 있다 — `forge repos` 로 먼저 확인한 뒤 매칭.

## API — v2 동사 9개

| 명령 | 인자 | 동작 |
|------|------|------|
| `repos` | `[OWNER]` | 현 profile 의 봇 namespace (기본 `<FORGE_USER>` = `glg-bot`) 아래 실재 repo 목록. **처음 만난 forge 의 발견 자리** |
| `list-open` | `[REPO]` | 열린 이슈 목록 (제목 + 라벨 + 코멘트 수). REPO 생략 시 default repo |
| `state` | `ISSUE` | 이슈 상태 + 라벨 + 최근 코멘트 3개 |
| `comment` | `ISSUE BODY` 또는 `ISSUE --body-file PATH|-` | 코멘트 작성. footer 자동 부착. **multi-line / child 결과는 `--body-file` 사용** |
| `label-add` | `ISSUE LABEL` | 라벨 이름으로 ID 조회 후 부착 |
| `label-remove` | `ISSUE LABEL` | 라벨 이름으로 ID 조회 후 제거 |
| `label-set` | `ISSUE STATUS-LABEL` | 상태 라벨군(`agent:ready/running/done/blocked`, `human:needs-review`)을 하나로 교체. `ci:failed` 같은 신호 라벨은 보존 |
| `issue-create` | `[REPO] TITLE BODY [OPTIONS]` 또는 `[REPO] TITLE --body-file PATH [OPTIONS]` | 이슈 생성. footer 자동 부착. atomic 라벨 (`--labels`) + Mattermost thread bridge (`--mm-channel/--mm-root-id/--mm-account`) 옵션. **multi-line BODY 는 `--body-file PATH` (또는 `-` = stdin) 필수** — inline BODY 는 single-line 만 |

`ISSUE` / `REPO` 인자 형식:

- `1` → default repo 의 #1
- `glg-bot/sandbox#1` → 명시된 repo 의 #1
- `owner/repo` (REPO) / `repo` (`<FORGE_USER>/repo` 로 확장)

`issue-create` — sweeper 의 일차 입력 자리:

```bash
# atomic 라벨 — 라벨 부착이 별도 호출이 아니라 생성과 동시
forge --forge work issue-create glg-bot/<work-repo> \
  "Bug: foo 안 됨" "운영팀 보고..." \
  --labels agent:ready

# multi-line BODY — 파일 또는 stdin 사용 (inline 인자에 \n 넣으면 positional 파서가 깨짐)
forge --forge work issue-create glg-bot/<work-repo> \
  "Feature: weekly/monthly VOC range report" \
  --body-file /tmp/voc-issue.md \
  --labels agent:ready

cat <<'EOF' | forge --forge work issue-create glg-bot/<work-repo> \
  "Feature: weekly/monthly VOC range report" --body-file - --labels agent:ready
## 배경
지난 분기 데이터 ...

## 요구
- 주간/월간 범위 ...
EOF
```

### Mattermost thread bridge — `--mm-channel/--mm-root-id/--mm-account`

봇이 Mattermost thread 에서 받은 요청으로 이슈 생성할 때, *원래 thread* 로 lifecycle 자취가 돌아가게 metadata 박을 자리. forge agent 가 이슈 처리 후 `replyToId` 로 같은 thread 에 답장하기 위함.

```bash
forge --forge work issue-create glg-bot/voscli \
  "Bug: foo 안 됨" --body-file - --labels agent:ready \
  --mm-channel cidABC123 --mm-root-id ridXYZ789
  # --mm-account default = "forgebot"
```

자취 두 자리에 박힘:

- **issue body 끝** — `<!-- openclaw:mm {"channel_id":"...","root_id":"...","account":"..."} -->` HTML comment. 렌더된 마크다운에 사람한테 안 보임, 봇이 read 시 회수
- **로컬 SQLite SSOT** — `~/.openclaw/state/forge-mm-links.sqlite`. key `<profile>:<repo>#<issue_num>` → `{channel_id, root_id, account_id, created_at}`. `sqlite3` 없으면 WARN 한 줄 + 계속 (body metadata 가 canonical)

검증:
- `--mm-channel` 과 `--mm-root-id` 는 **둘 다 박혀야** 한다. 한쪽만 박으면 ERROR exit 2 — 부분 metadata 가 thread bridge 동작 침묵 깨짐 자리

추가 동사(`read`, `pr ...`)는 v2 이후 운영 누적 후 forge-config 측에서 박는다. 여기서 동사를 임의로 늘리지 말 것 (SSOT 어긋남).

## 라벨 프로토콜 v2

| 라벨 | 색 | 의미 |
|------|----|----|
| `agent:ready` | `#0e8a16` | 에이전트가 잡아도 됨 |
| `agent:running` | `#fbca04` | 잡힘 — 작업 중 |
| `agent:done` | `#0366d6` | 완료 |
| `agent:blocked` | TBD | 막힘 — `label-set` 상태군에는 포함. repo에 없으면 `label-set ... agent:blocked` 는 실패하므로 사용 전 라벨 생성 필요 |
| `human:needs-review` | `#5319e7` | 사람 판단 필요 |
| `ci:failed` | `#d73a4a` | CI 깨짐 |

라벨 ID 는 인스턴스마다 다르므로 **이름으로만** 다룬다. `label-add` / `label-remove` / `label-set` 이 이름→ID 변환을 처리한다. 상태 전이는 `label-add` 대신 `label-set` 을 우선 사용해 `agent:ready,running,done` 누적을 막는다.

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
# 환경 sanity (profile 표시 포함)
~/repos/gh/forge-config/bin/forge help

# 발견 — 현 profile 의 glg-bot/* 실재 repo 목록
~/repos/gh/forge-config/bin/forge --forge work repos
~/repos/gh/forge-config/bin/forge --forge oracle repos

# 컨텍스트 기반 — cwd 가 oracle/work 결정
cd ~/repos/gh/forge-config && ~/repos/gh/forge-config/bin/forge list-open
cd ~/repos/work/foo        && ~/repos/gh/forge-config/bin/forge list-open glg-bot/<work-repo>

# 다른 repo (현 profile 안에서)
~/repos/gh/forge-config/bin/forge list-open glg-bot/forge-config

# 상태 확인 (라벨 + 최근 코멘트 3개)
~/repos/gh/forge-config/bin/forge state 1
~/repos/gh/forge-config/bin/forge state glg-bot/sandbox#1

# 코멘트 작성 (footer 자동)
~/repos/gh/forge-config/bin/forge comment 1 "분류 완료. nixos 담당자에게 위임."
printf '%s\n' '멀티라인/child 결과 본문' > /tmp/forge-comment.md
~/repos/gh/forge-config/bin/forge comment 1 --body-file /tmp/forge-comment.md

# 라벨 부착/제거/상태 전이
~/repos/gh/forge-config/bin/forge label-add 1 ci:failed
~/repos/gh/forge-config/bin/forge label-remove 1 ci:failed
~/repos/gh/forge-config/bin/forge label-set 1 agent:running

# 이슈 생성 (sweeper 의 일차 입력 자리)
~/repos/gh/forge-config/bin/forge issue-create glg-bot/<work-repo> \
  "Bug: 운영팀 보고" "본문..." --labels agent:ready

# multi-line BODY → --body-file (PATH 또는 - 로 stdin)
~/repos/gh/forge-config/bin/forge issue-create glg-bot/<work-repo> \
  "Feature: ..." --body-file /tmp/body.md --labels agent:ready
cat body.md | ~/repos/gh/forge-config/bin/forge issue-create glg-bot/<work-repo> \
  "Feature: ..." --body-file -

# 명시적 profile override — 어디서든
~/repos/gh/forge-config/bin/forge --forge work list-open glg-bot/<work-repo-alt>
FORGE_PROFILE=work ~/repos/gh/forge-config/bin/forge state glg-bot/<work-repo>#1
```

## 워크플로 — 에이전트가 잡는 흐름

```
1. list-open                       → 미처리 이슈 훑기
2. state <issue>                   → 본문 + 라벨 + 최근 코멘트 확인
3. label-set <issue> agent:running → 잡았음 표시 + 기존 상태 라벨 정리
4. (담당자 영역이면) 작업, (아니면) sibling 호출 + 결과 회수
5. 결과를 /tmp/forge-result.md 로 쓴 뒤 comment <issue> --body-file /tmp/forge-result.md
6. label-set <issue> agent:done    또는 agent:blocked 또는 human:needs-review
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
