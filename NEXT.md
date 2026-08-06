# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

> NOW: active ⓪ **entwurf-peek 파서 수선 — 재료 대기.** 문서 정정은 끝났고, 파서/fixture는
> entwurf `mux-placement` 랜딩 후 PM이 넘길 acceptance transcript로 한다. **임의 샘플 금지**
> (아래 [2026-08-06]), ① **Solar Open 2 계정 승인 대기** (아래 [2026-07-30], issue #17),
> ② **dictcli provenance 공백 + oracle(aarch64) GraalVM 확인**,
> ③ 설치면 소유 경계 — entwurf 이관 옛 소유자 cleanup (issue #46),
> ④ pi-chat Add-group blocker, ⑤ gogcli 재인증 마무리(선택 — 아래 [2026-07-02]).
> `v2026.8.6`으로 닫힘: Upstage provider + Solar Pro 4(512K), timeline 스킬, exa-search 기본화,
> 죽은 면 정리(telegram·gemini legacy·autoresearch·scripts), pi 설정 레퍼런스 단일화·소유권 분리.
> 스킬면 SSOT·게이트·provenance와 gitcli/lifetract 시간 계약은 `v2026.7.14`로 닫힘.
> 대기: 어쏠로그 수선 때 7/13 근거 회수(아래 [2026-07-14] 어쏠로그).
> ⚠️ [2026-06-11] bibcli 항목은 **2026-07-14 결정과 방향이 반대다** — GLG 재판단 대기(아래).
> 방향(시험소·승격 파이프라인)은 `ROADMAP.md [2026-06-30]`. 닫힌 일은 `CHANGELOG.md`.

## [2026-08-06] entwurf-peek 수선 — 존재 이유 문장이 먼저 틀렸다

> entwurf가 v2로 넘어오면서(0.13.1, #50 하드컷) 이 스킬이 기대던 세계가 사라졌다.
> 코드가 죽은 게 아니라 **전제가 죽었다** — `scripts/entwurf-peek.py`(38KB, 6/23)는 그대로 있다.

**깨진 전제 3개** (`skills/entwurf-peek/SKILL.md`):

1. **존재 이유 문장이 틀렸다.** description이 "entwurf_peers는 control socket 있는 세션만
   보여주는데 이 스킬은 그걸 메운다"고 말하는데, 지금 `entwurf_peers`는 meta-record 기반
   garden citizen을 **전부** 준다(`liveness=unsupported` 포함, 8/6 관측 351+행). 메우려던
   구멍이 없어졌으니 스킬의 자기소개부터 다시 써야 한다.
2. **"sync entwurf 자식" / "Mattering...에 묶여있을 때"** — v2는 fire-and-forget만 남았다.
   이 대상 자체가 존재하는지 확인 필요.
3. **`trace`의 자식 매칭**이 부모 JSONL의 `Session ID: <YYYYMMDDTHHMMSS-xxxxxx>` 문자열에
   의존한다. v1 `entwurf`/`entwurf_resume`/`entwurf_send`가 하드컷으로 사라졌으니 그 문자열이
   더는 안 찍힐 가능성이 높다. `entwurf_fresh_call`은 tmux 좌표+nonce 영수증이고, 상관은
   callback sender envelope이다.

**지켜야 할 경계 (entwurf 쪽이 이미 못 박음, `docs/mux-launch-rail.md` §4 경계 2):**
peek은 heuristic **진단 손**이다. **placement 사실의 출처로 인용 금지**, 지도를 넓히려고
확장 금지. 수선은 전제를 진실로 되돌리는 것이지 기능을 키우는 게 아니다.

**entwurf PM 답 (2026-08-06, `20260806T101528-cae60f`, gpt-5.6-sol):**

- **`trace`는 폐기하지 않는다.** ← 우리 가설이 틀렸던 지점. `Session ID:` 매처가 죽은 건 맞지만,
  `fresh_call`이 **더 강한 exact 관계**를 남긴다: launch receipt의 nonce → 들어온 callback 본문이
  그 nonce와 일치 → 그 `<sender_info>.sessionId`가 **자식의 canonical garden id**다.
  즉 `nonce exact match → callback sender envelope`가 새 상관 근거다. 추정이 아니라 정확 매칭이다.
- **그것은 placement 근거가 아니다.** 거기서 tmux server/window/pane 사실을 유도하거나 주장하면
  안 된다. placement는 launch receipt / placement leaf의 영역이다.
- **resume은 새 자식이 아니다.** 나중의 resume은 같은 citizen이고 nonce가 필요 없다.
- **`peek`/`map`은 계속 유용하다.** 단 *이유*가 바뀐다 — peers가 이제 record citizen을 전부
  보고하므로, peek이 메우는 것은 **citizen 존재 여부가 아니라 heuristic transcript 상태**다.
- **sync/Mattering 프레이밍은 은퇴.** fresh_call은 launch receipt + async callback이고,
  v2는 fire-and-forget 전달만 있다.

**시점 (PM):** 구현 수선은 **`mux-placement` 랜딩 이후**로 미룬다. callback 계약 자체는 이미
안정적이지만 S0/S1 lifecycle 작업이 최종 transcript/operator 표면을 확정하므로, 지금 코드를
고치면 두 번 고치게 된다. **문서만 고치는 것은 먼저 해도 된다.** 단 trace 파서와 fixture는
랜딩을 기다렸다가 acceptance에서 나온 **실제 부모 transcript 기록물**을 fixture로 쓸 것.

**다음 한 걸음 (PM이 준 문장):**
> After mux-placement lands, repair entwurf-peek for v2: remove sync/control-socket-only claims;
> replace legacy Session ID trace matching with exact fresh-call nonce → callback sender-envelope
> correlation; keep trace heuristic and placement-non-authoritative.

**곁가지 — `entwurf-dev` 인테이크 (2026-08-06):** entwurf 쪽이 개발용 스킬을 만들어
`entwurf/.claude/skills/entwurf-dev/SKILL.md`에 두었다(untracked, S0 staged candidate를 건드리지
않으려는 의도). fresh_call → callback nonce → `<sender_info>.sessionId` → `entwurf_v2` 전달까지의
v2 워크플로를 감싸고, runtime guard(폐기 verb 노출 시 중단, transcript grep/polling 금지, nonce
없이 최신 peer 추측 금지)를 품고 있다. **`entwurf-peek` 수선과 같은 계약을 반대편에서 쓰는
물건이라, 파서를 고칠 때 이 스킬이 살아있는 참조가 된다.**

우리 `./skills/` SSOT로 담아올지는 **아직 결정 아님.** 판단할 것: 이건 entwurf를 *개발할 때*
쓰는 도구라 project-scope가 자연스러운데, 우리 SSOT는 6면이 아니라 5면 전체로 퍼진다. 모든
하네스에 전역으로 깔 이유가 있는지 먼저 답해야 한다. GLG 의사는 "일단 개발스킬로 두고 나중에
담아온다"이다.

**fixture 계약 (PM 확답 2026-08-06):** 지금은 **부모 transcript artifact 경로가 없다** — acceptance가
visible-first 재설계로 아직 착지 전이다. 랜딩 시 PM이 **scrubbed parent-transcript fixture의 exact
path + digest**를 branch handoff에 남기고 우리에게 한 줄로 전달한다. 그때까지 파서 구현을 미루는
판단이 맞다고 확인받았다.

fixture가 갖춰야 할 것 — **받을 때 이걸로 검수한다**:
- callback **nonce**와 **`sender_info` envelope**가 **함께** 보존될 것 (둘 중 하나만 있으면 상관 불가)
- **tmux placement 사실로 오독될 필드는 fixture oracle에서 제외**되어 있을 것

⚠️ **임의 샘플이나 개인 live transcript로 파서를 맞추지 말 것.** 전자는 계약과 어긋나고 후자는
개인정보다. 경로를 못 받았으면 아직 시작할 때가 아니다.

## [2026-07-30] Upstage — Solar Open 2 계정 승인 대기

> provider 자체와 Solar Pro 4(512K)는 `v2026.8.6`으로 닫혔다. 여기 남은 것은 **계정 게이트**뿐이다.
> 트래킹: **issue #17** (open2 승인 시 체크리스트, pro3 실측 baseline).

**막힌 지점:** `solar-open2`가 모델 목록에 없고 직접 호출도 400(`invalid or no longer supported`).
두 기기·두 키에서 같은 거부라 **키가 아니라 계정 게이트**다.

**다음 한 걸음:** ① **콘솔 계정 확인** — 신청 폼에 적은 계정으로 로그인해 `solar-open2`가 보이는지
확인하고, 아니면 그 계정에서 새 키를 발급해 `~/.env.local`을 교체한다. API로는 계정을 알 수 없다
(`/v1/me`·`/v1/usage`·`/v1/account` 전부 404). ② 승인 여부는 한 줄로 찍힌다 —
`UPSTAGE_FORCE_MODELS=solar-open2 pi --model upstage/solar-open2`. 미승인이면 400이 그대로 보이고,
승인되면 캐시를 지울 필요도 없이 바로 대화가 된다.

**승인되면 실측할 것:** 카탈로그의 open2 값 둘은 오늘 **문서 근거로** 고쳤다(컨텍스트 262144 —
Upstage 설치 스크립트의 `SOLAR_CONTEXT`; reasoning 척도 — 문서의 open2 전용 행). 라이브 호출로
확인한 게 아니므로, 승인되면 과대 `max_tokens` 프로브로 상한을 직접 받아둘 것(Pro 3의 131072과
Pro 4의 524288을 그 방법으로 확인했다).

**함정(키 교체마다 재발):** 옛 `UPSTAGE_API_KEY`가 env에 남은 프로세스는 새 키를 읽지 않는다
(env-loader가 기존 env를 덮지 않는다) → 전 호출 401인데 GA 폴백이라 정상처럼 보인다. 유일한
표식은 캐시 파일 부재다. 키를 바꾸면 장수 세션(tmux·pi)을 재시작할 것.

**기기별 setup:** `./run.sh setup`이 `pi-extensions/*.ts`를 링크한다. `UPSTAGE_API_KEY`는
`~/.env.local`(리포 밖)이라 기기마다 따로 넣어야 한다. apply Upstage 문항 1 관문의 나머지 절반은
Document Parse 스킬(`~/repos/gh/apply/NEXT.md`).

## [2026-07-14] 남은 공백 — dictcli provenance + timeline 저자명

> 오늘 닫힌 것(스킬면 SSOT 결정, `go_build` 게이트 + provenance manifest, gitcli v0.4.0
> 시간 계약, lifetract `steps_daily` 시간축 hardfix)은 `CHANGELOG.md v2026.7.14`로
> 갈무리했다. 여기 남는 건 공백 둘뿐.

**dictcli — provenance 공백:** GraalVM native-image라 `go_build`를 안 타고 provenance가
없다. `skills/.provenance.json`에 5개 중 4개만 있다. oracle은 aarch64인데 GraalVM은
크로스컴파일이 안 된다 → **oracle에 GraalVM이 있는지 확인 필요**. 없으면 dictcli는 그
기기에서 못 뜬다.

**timeline (gitcli 밖, GLG가 junghan0611에 전달함):** `collect.py:46`
`AUTHORS = ("junghan", "jhkim2")`에 `Jung Han`이 없어 **2026년 495커밋**을 덜 센다
(`"Jung Han".lower()`가 `"junghan"` 부분일치에 안 걸림). gitcli와 timeline의 차이는 전부
이 저자명 하나로 설명된다.

**검증 기준:** `./run.sh env`가 툴별 revision을 찍고 기록된 빌드와 다르면 경고한다.

## [2026-07-14] 어쏠로그 수선 때 회수할 근거 — 7/13 사건

> 관측 도구(`improve-agent`)와 규범(`home/AGENTS.md § Entwurf and Peer Work`)은 닫혔다
> (`CHANGELOG.md v2026.7.14`). 남은 건 글 쪽 회수뿐.

**사건과 근거(어쏠로그 수선 때 쓸 것):** 7/13(61커밋·8리포) 오푸스 세션에서 GLG가
자기비판 워딩을 감지해 출근길 글을 남겼다. 7/8(63커밋)·7/9(42커밋)을 기준선으로 재보니
**오푸스가 통계적으로 무너진 날은 아니었다** — 자책률·ESC·피어 서사 점유 모두 기준선
이하거나 동등. 남은 정직한 사실은 하나: 검수자 정당성과 자기 책임을 전면에 둔 문장이 몇 번
나타났고, 그중 **한 건은 명백히 판결형**(`notes:L299` "GPT가 1번과 2번 모두 맞습니다.
제 잘못이 둘입니다")이었다. GLG가 그 배열을 협업에 맞지 않는 것으로 느꼈다. 그 이상은
데이터가 증명하지 않는다. 핵심은 새로 가르치는 게 아니라 **되찾는 것** — 7/9 오푸스는 이미
그 배열을 지켰다("닫았습니다", "M3-1이 실기로 닫혔습니다").

**다음 한 걸음:** 어쏠로그 수선 때 원석(출근길 글)과 이 근거를 **별도 축으로** 다룬다.
org 근거표는 그때 만든다(지금 만들지 않는다). 오늘 세션 자체가 원자료다 —
`improve-agent --says --source claude --after 2026-07-13`로 언제든 재현된다.

## [2026-07-13] issue #46 마지막 단계 — 옛 소유자가 놓기

트래킹: https://github.com/junghan0611/entwurf/issues/46

entwurf 쪽 새 소유자는 이미 섰다: user/project `packages[]` +
`entwurfProvider.mcpServers.entwurf-bridge` writer/doctor/smoke, agy MCP·exact permission,
statusline, PreInvocation birth hook까지 모두 state-backed install/doctor/inverse로 닫혔다.
최종 감사에서 **agent-config의 옛 배선이 아직 남아 재실행 시 되돌릴 수 있음**을 확인했다.

**현재 남은 실제 파일:**
- `pi/settings.json`, `pi/settings.server.json`: entwurf package + repo-path
  `entwurfProvider.mcpServers.entwurf-bridge` 잔존.
- `antigravity/settings.json`: agent-config 절대경로 `statusLine` 잔존.
- `run.sh setup`: 위 agy settings 전체를 symlink로 다시 소유함. entwurf adapter는 symlink를
  정직하게 refuse하므로 다음 agent-config setup이 #46 배선을 다시 깨뜨릴 수 있다.
- `antigravity/statusline.sh`: 이관 완료 뒤 retired 후보.

**닫는 순서(반드시 새 소유자 먼저):**
1. entwurf repo에서 `./run.sh setup <project>`을 실행해 live user/project provider를 bare
   `entwurf-bridge`로 normalize. `doctor-pi-provider`가 EFFECTIVE bare + state-owned인지 확인.
2. 이 repo의 두 pi settings fragment에서 entwurf package와
   `entwurfProvider.mcpServers`를 제거한다. issue 원칙대로 최종적으로
   `entwurfProvider` 블록 전체를 template에서 놓되, live operator의 기존 sibling 설정을
   삭제하지 않도록 merge/inverse 순서를 검증한다.
3. `antigravity/settings.json`에서 `statusLine`을 제거하고, setup을 whole-file symlink에서
   **disjoint-key merge**로 바꾼다. permissions/model/trustedWorkspaces는 agent-config가,
   statusLine + exact entwurf permission은 entwurf가 같은 regular file에서 원소별 소유한다.
4. `antigravity/statusline.sh` 참조 0 확인 후 제거한다.
5. agent-config setup을 두 번 재실행하고 다음을 확인한다:
   - `doctor-pi-provider` EFFECTIVE bare, provider load 유지
   - `doctor-agy-bridge` / `doctor-agy-statusline` / `doctor-agy-hooks` green
   - `~/.gemini/antigravity-cli/settings.json` regular file 유지
   - agent-config repo path 재유입 0, unrelated operator 설정 보존
6. agent-config NEXT/CHANGELOG에서 #46 항목을 닫고 entwurf issue에 최종 증거를 남긴다.

## [2026-07-02] gogcli 재인증 — 이어서 (구조/문서는 v2026.7.2로 릴리즈됨)

> 코드(fork→글로벌 gog)·문서(SKILL.md upstream/Maps/YouTube, AGENTS.md SSOT)는
> `CHANGELOG.md v2026.7.2`로 닫힘. 여기 남는 건 **인증 상태 + 남은 선택 커맨드**뿐.

### 현재 auth 상태 (state)
- **personal `junghanacs@gmail.com`** (토큰 2026-07-02T06:35): analytics, appscript, calendar,
  chat, classroom, contacts, docs, drive, forms, gmail, people, searchconsole, sheets, slides,
  tasks, youtube. `ads` 제외(developer token 없으면 `unknownerror`로 전체 실패). ⚠️ 개인 gmail은 Chat API 불가.
- **work `<work-email>`** (jhkim2@회사도메인, 토큰 2026-05-24): 기존 14종. Chat 동작(알림용) — 재인증 불필요.
- **Maps**: `places_api_key` 설정됨. geocode/places search/directions/reverse 검증 OK.
  `distance --mode driving`은 광역지오코딩 시 ZERO_RESULTS(transit OK / place_id 쓰면 driving도 OK).

### 남은 선택 커맨드 (next, 전부 optional)
1. 개인계정에 photos/meet 더 얹기(테스트모드라 통과할 것):
   `gog login junghanacs@gmail.com --client personal --force-consent --services <위 personal 목록>,photos,meet`
2. 회사계정 넓히기(Chat엔 불필요):
   `gog login <work-email> --client work --force-consent --services appscript,calendar,chat,classroom,contacts,docs,drive,forms,gmail,people,searchconsole,sheets,slides,tasks,analytics,youtube`
3. commit 스킬 Chat 알림 발송 검증: work 계정 `gog chat messages send "$GOG_CHAT_SPACE_ID" ...`.
4. oracle 봇: nixos-config가 oracle(aarch64)에 글로벌 gog 설치(봇 필수). GLG가 nixos-config쪽 전달 완료.

### 재인증 명령 템플릿
```bash
gog login <email> --client <personal|work> --force-consent --services <a,b,c,...>
gog auth list
```

## [2026-06-11] 도구-내장 스킬을 owning repo로 환원 (구조 결함) — ⚠️ 재판단 필요

> **2026-07-14 결정과 방향이 반대다.** 아래는 "도구를 품은 repo가 스킬도 품는다"(voscli 패턴)를
> 목표로 잡았는데, 오늘 GLG는 **바이너리 스킬의 스킬면을 agent-config로 모으라**고 결정했다
> ("거기서 빼고 여기서 일단 관리하게하자. 헷갈려서"). lifetract가 정확히 아래 방향으로 가 있었고,
> 그걸 되돌린 게 오늘 일이다.
>
> 모순이 아닐 수도 있다 — 어려운 게 서로 다르다. 바이너리 스킬은 *배포*가 어렵고(7개 하네스
> fan-out + provenance), consumer 스킬(entwurf-peek)은 *검증*이 어렵다(owning repo 내부를 wrap).
> 각자 어려운 쪽이 사는 집으로 가는 게 맞을 수 있다. 그렇다면 bibcli는 **바이너리 스킬이므로
> agent-config에 남는다**. 아래 이주 계획은 폐기다.
>
> 아래 항목이 짚은 **진짜 문제(SKILL.md가 코드보다 늦게 흐른다)** 는 유효하다. 다만 답이
> 이주가 아니라 **게이트**다 — `go_build`가 미커밋 소스를 거부하고 `.provenance.json`이 무엇이
> 깔렸는지 적는다. 문서 드리프트는 담당자(매니저)가 검수로 잡는다. 오늘 gitcli SKILL.md에서
> 죽은 예제 4개(`pi-mono`)를 그렇게 잡았다.
>
> **다음 한 걸음: GLG가 위 해석을 승인하면 이 항목을 지운다.** 아래는 근거로만 남긴다.

**문제:** `bibcli` 스킬이 잘못된 곳에 산다. 소스(`zotero-config/bibcli/*.go`)와
스킬 런타임(`agent-config/skills/bibcli/{SKILL.md,bibcli}`)이 갈라져 있고,
`~/.local/bin/bibcli`·`~/.claude/skills`가 전부 agent-config를 가리킨다. 개발 repo에서
스킬을 소비하려면 거리가 멀어 **문서 동기화가 느리고**(SKILL.md가 zotero-config 워크플로
변화를 늦게 반영 — 예: `save --sync --json` 한방 경로가 한참 문서에 안 들어가 있었음),
openclaw 6개 사본까지 드리프트한다.

**목표 구조 (voscli 패턴):** 도구를 품은 repo가 스킬도 품는다.
```
<repo>/.claude/skills/<name>/SKILL.md   # + 바이너리 동거
<repo>/.pi/settings.json                # {"skills": ["../.claude/skills"]}  → pi 인식
```
예: `~/repos/work/voscli/.claude/skills/voscli/SKILL.md` (+ `.pi/settings.json`).
개발하는 에이전트가 **그 repo 안에서 바로 소비**한다.

**bibcli 이주 시 닫아야 할 plumbing (단독 rm 금지 — 연결점 많음):**
- `~/.claude/skills` → `agent-config/skills` 통째 심링크: bibcli만 빼면 Claude Code가
  못 보게 됨. project-scoped 소비로 전환하거나 심링크 전략 재설계 필요.
- `~/.local/bin/bibcli` → `agent-config/skills/bibcli/bibcli` 심링크 재지정.
- `./run.sh build`가 바이너리를 떨구는 목적지(agent-config) → zotero-config 내부로.
- openclaw-config 6개 사본(gpt/gemini/bbot/glg/claude-skills/workspace) 배포 경로 갱신.
- nixos-config home-manager가 위 심링크를 만드는지 확인.

**범위:** agent-config에서 도구-내장 스킬(bibcli 외에도 incidentcli는 이미 work repo
심링크 패턴)을 식별 → owning repo로 환원하는 일반 정책. 이번 세션엔 zotero-config
README/AGENTS.md/SKILL.md 내용만 바로잡았고(= save --sync --json 전면화, beads 제거),
**구조 이주는 이 NEXT 항목으로 보류**.

## [2026-05-29] pi-chat Add group blocker — 다음 세션 첫 한 점

오전 결정 받아 본 시작했다. **막힌 자리:** `/chat-config` → `telegram-glg-entwurf-bot` → **Add group** 선택 시 setup TUI가 즉시 닫힌다.
Telegram account 등록은 끝났고, 지금은 채널 등록만 막혀 있다.

### 준비 상태

- `~/.env.local`에 `PI_ENTWURF_BOT_TOKEN` 동기화 완료
- `~/repos/3rd/pi/pi-chat/node_modules` 설치 완료
- thinkpad IPv6 outbound 부재 + Node 24 fetch IPv4 fallback 문제 확인
- `~/.pi/agent/patches/ipv4-only.mjs` 준비 완료
- `pi-chat` 로컬 진단 patch 2개 유지 중
  - global dispatcher IPv4 강제
  - `observeTelegramTarget` catch stderr 로깅

### 다음 실행

```bash
NODE_OPTIONS="--import=$HOME/.pi/agent/patches/ipv4-only.mjs" pi -e ~/repos/3rd/pi/pi-chat/
```

1. `/chat-config` → `telegram-glg-entwurf-bot` → **Add group** 재시도
2. stderr에 `[pi-chat] observeTelegramTarget error: ...`가 보이면 그 메시지로 분기
   - `fetch failed ETIMEDOUT/ENETUNREACH` → IPv4 dispatcher 추가 fix 필요
   - `401 Unauthorized` → token / webhook 충돌 확인
   - 그 외 → 케이스별 분석
3. **DM 모드도 1회 통과**시켜 자동 등록 경로 비교
4. 채널 등록이 되면 그룹 mention 첫 왕복까지 확인

### 메모

- Track B의 중기 방향과 resident 담당자 패턴 축은 `ROADMAP.md`로 이동했다.
- 이 항목이 닫히면 `NEXT.md`를 비우거나 다음 한 걸음만 다시 적는다.
