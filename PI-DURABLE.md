# PI-DURABLE — 검수 매트릭스

`pi-durable`을 **독립 하네스**로 재는 작업면. pi의 기능 하나가 아니라 **다른 생명주기를 사는 별도
하네스**로 다룬다.

GLG 판정 `[GLG 직접, 2026-10-06 이 세션]`:

> "PI-DURABLE.md라고 별도로 만들어야돼 독립하네스야. 그리고 하네스 명부에 넣고. 독립적인 대우를 해줘."

> "pi-durable은 한번 생성하면 그 가든아이디로 예를들어 한달을 가져갈수도 있어. 완전 라이브 생명 주기가
> 다른거야."

> "거의 내 메인 프로젝트에는 durable이 있을거야."

**`PI.md`와 무엇이 다른가.** `PI.md`는 *우리가 선 바닥의 다음 판*(pi 1.0 전체 — 압축·codemode·확장
로딩)을 본다. 이 문서는 그 안에 든 한 줄이 아니라 **별도 하네스의 입장·주소·생명주기**를 본다. 같은
upstream 소스를 공유한다는 사실이 두 하네스의 런타임·저장·인증·입장 계약을 합쳐 주지 않는다
`[읽음 entwurf docs/durable-native-support.md § Ownership, oracle 2026-10-06]`:

> "Treat `pi-durable` as a separate native harness, not an enhancement to ordinary Pi."

**이 집이 보는 자리.** 기억축(세션 source·임베딩)은 andenken 몫이고
[andenken#15](https://github.com/junghan0611/andenken/issues/15)가 그 좌표다. 구현과 릴리즈는 entwurf
형제들 몫이고 [entwurf#129](https://github.com/junghan0611/entwurf/issues/129) /
[#130](https://github.com/junghan0611/entwurf/issues/130)이 그 레인이다. 이 문서는 **하네스 면**만
본다 — 명부의 한 행, 공급 경로, 스킬·확장 표면, 생명주기, 관측면(peek).
`[GLG 직접, 2026-10-06]`: *"어짜피 기억축은 andenken이 할 일이야. 우리는 전체 하네스 측면에서 봐야돼."*

---

> **현재 안내 (2026-10-08):** Entwurf **0.32.0**는 출하됐고 패키지 carrier + Pi **1.0.4** SDK 공급·D2·native contact 6개가 현재 계약이다. 이 집의 env/hide 레퍼런스와 실제 같은-id 재개도 확인했다. 아래 `상태 — 2026-10-06`과 첫 구현 절은 당시 관측으로 보존한다; 최신 계약은 마지막 [0.32.0 소비자 레퍼런스 절](#2026-10-08-0320-소비자-레퍼런스--현재-공급실행-계약), 사용·테스트는 [pi-durable/README.md](pi-durable/README.md), 셸 함수는 [루트 README](README.md#shell-aliases-bashrclocal)를 먼저 보라.

## 상태 — 2026-10-06

관측 자리: thinkpad, Claude Opus 5 (claudecode ACP), `~/repos/gh/agent-config`. oracle 측 사실은
`ssh` 읽기 전용으로 읽었다. **설치·빌드·테스트 실행·DB 열기 0.**

| 사실 | 값 | 증거 |
|---|---|---|
| upstream 최신 | `pi-mono` main `1ffb6bd62` = `v1.0.4-5`. 태그 `v1.0.4` = `7c10bd4337495ee613f2224843ecdf349b80d1df` | `[측정 git, 이 기기]` |
| 패키지 판 | `@earendil-works/pi-durable` **1.0.4** (모노레포 전 패키지 동일) | `[측정 packages/*/package.json]` |
| 이 기기 설치 pi | **1.0.0** | `[측정 pi --version]` |
| entwurf 핀 | `cd32f7725fdbddbaecdff5b1e68491563394e0ca` = **v1.0.2** + `runtime-contacts.patch`, modelData는 `@earendil-works/pi-ai@1.0.2` dist 바이트 | `[읽음 plugins/pi-durable/overlay/upstream-pin.json, oracle]` |
| 핀 ↔ upstream 교차검증 | 그 SHA가 이 기기 clone의 `v1.0.2`와 **동일**. remote 이름은 `badlogic/pi-mono`, 핀의 repository는 `earendil-works/pi` — 두 이름이 같은 히스토리를 서빙한다 | `[측정 git rev-parse]` |
| 하네스 등록 | `pi/entwurf-capabilities.json`에 **별도 백엔드 행** 추가: `wakeMode: self-fetch`, `nativeIdLabel: sessionId` | `[읽음 oracle git diff]` |
| 배달 등급 | **`deliveryLevel: "D0"`** — pi·codex·copilot·omp·claude-code는 모두 **D6** | `[읽음 같은 diff]` |
| 시민 enum | `META_CITIZEN_BACKENDS`에 `pi-durable`이 `pi` 앞에 추가됨 | `[읽음 pi-extensions/lib/meta-session.ts:324-332, oracle]` |
| transcript | record의 `transcriptPath`를 **명시적 `null`**로 적는다 | `[읽음 pi-extensions/meta-bridge-pi-durable.ts:864, oracle]` |
| 대화 저장면 | `~/.pi/agent/experimental/durable-sessions/<sha256(realpath cwd)[:24]>/<ms>-<UUIDv4>/session.sqlite` | `[읽음 coding-agent/src/experimental/durable/sessions.ts:19-55 @cd32f77]` |
| 버킷 도출 재현 | `sha256(realpath ~/repos/gh/entwurf)[:24]` = `f42d1f975f08a6e05e922e1f` — **이 기기에서 독립 재현** | `[측정 python3, 2026-10-06]` |
| 실재하는 durable | oracle에 버킷 **1개**(`f42d1f975f08a6e05e922e1f` = entwurf 리포). 이 기기에는 `~/.pi/agent/experimental` **없음** | `[측정 ls, 양쪽]` |
| contact verb | 현재 native contact는 **4개**. `fresh`/`resume`/`callback` **없음** | `[읽음 docs/durable-native-support.md, oracle]` |
| 입장 상태 | admission parity가 **`Unaccounted: pi-durable` RED** | `[읽음 NEXT--feat_durable-native-support.md § 열린 증거, oracle]` |
| entwurf 판 | 브랜치 `feat/durable-native-support`, HEAD `eeb01c4`, package **0.30.1 → 목표 0.31.0**. 제품 변경은 **미커밋** | `[측정 git, oracle]` |
| 공급 경로 | experimental 앱은 **upstream source-only**. *"Upgrading global Pi does **not** install or certify durable support"* | `[읽음 docs/durable-native-support.md § Source-grounded starting point]` |
| 앱 크기 | `coding-agent/src/experimental/durable/` **8파일** (`main`·`runtime`·`sessions`·`harness-setup`·`prompt`·`subagent`·`tui`·README) | `[측정 git ls-tree v1.0.4]` |
| 라이브러리 크기 | `packages/durable/src` 65파일 · `test/*.test.ts` **47개** | `[측정 git ls-tree v1.0.4]` |

### 1.0.2 → 1.0.4 — 내구성 커널은 안 움직였다

`[측정 git, 이 기기]` 51커밋 / 203파일 변경. 그중:

| 범위 | 변경 | 뜻 |
|---|---|---|
| `coding-agent/src/experimental/durable/` (앱) | **0파일** | entwurf가 접점을 붙인 그 앱은 핀과 1.0.4 사이에 안 변했다 |
| `packages/durable/src/` | 20파일 | 전부 `env/`(fs watch 신규 522줄) · `harness/{output,tool,types}` · `tools/{bash,read,image}` · `truncate` · `testing` |
| `storage` \| `sqlite` \| `queue` \| `submission` \| `compact` \| `recover` \| `inbox` \| `entries` 매칭 | **0파일** | 저장·큐·압축·복구 구현은 이 구간에 변경 없음 |
| `packages/durable/src/entries.ts` | **0** | entry **kind 집합이 불변**이다 |

마지막 행이 다른 집으로 건너갈 사실이다: andenken#15의 kind→role 계약이 바로 `entries.ts:14-34`의
kind 집합 위에 서 있으므로, **핀이 1.0.4로 올라가도 그 계약면은 안 움직인다.** Q1–Q7 판정이 1.0.4
수용을 기다릴 이유가 없다. `[측정, 이 기기 2026-10-06]`

이 구간의 실제 수정은 출력·환경 계층이다 — progress snapshot tail, BOM 경계, 파일 감시
symlink/누수, 커지는 로그 read, `settings.progress`의 `undefined`, 그리고 공통 OAuth rotated-credential
보수. `[inherited — entwurf#130 댓글 2(gpt-6.1-sol), 위 세 행으로 교차검증함]`

---

## 왜 독립 하네스인가 — 생명주기가 축이다

다른 하네스 행과 이 행이 갈리는 지점은 기능이 아니라 **시간**이다.

| 축 | 보통 시민 (pi · claude-code · codex · omp · copilot) | `pi-durable` |
|---|---|---|
| garden id의 수명 | 한 세션 — 끝나면 dormant, 되세우면 보통 새 id | **같은 id로 달 단위** `[GLG 직접 2026-10-06]` |
| 기본 상태 | 잠듦이 기본, 깨우면 온다 | **상주가 기본** — oracle에 항상 live `[GLG 직접 2026-10-06, andenken#15]` |
| 대화의 거처 | JSONL transcript (append-only 파일) | **SQLite** `session.sqlite`, entries INSERT-only + 전역 단조 id `[읽음 migrations.ts:16-34]` |
| 리포당 개수 | 필요할 때 여러 명 | **핵심 리포마다 하나** `[GLG 직접]` — 지금 실재 1개 `[측정 oracle]` |
| 전원 | 꺼지는 기기여도 됨 | 꺼지면 안 되는 기기(oracle)에 산다 `[GLG 직접]` |

그래서 **"durable이 아직 durable하지 않다"가 모순이 아니다** `[GLG 직접 2026-10-06]`. 지금 선 것은
*독립 하네스로서의 주소·송수신 접점*이고, *내구성(복구·정확히 한 번)*은 안 섰다. entwurf 자신의
열린 증거 목록이 그것을 적어 둔다 `[읽음 docs/durable-native-support.md § Evidence and open boundaries,
oracle]`:

- archive와 durable commit 사이의 crash 생존 **미측정**
- *"Inbox read is a mutation, not a replay-safe read-only tool"*
- 벤더 턴 0 — scripted S + native H, **never actual vendor V**
- sender exactly-once 미인증. B-M1 라이브러리 영수증은 **이 native adapter의 증거가 아니다**

`deliveryLevel: "D0"`이 레지스트리가 스스로 적어 둔 같은 말이다. 다른 다섯이 D6인데 이 행만 D0다.

### 존재(B)의 어느 기관인가 — [판단]

`[읽음 denote 20240704T161707 § B의 기관 여섯]` GLG의 「존재」 노트는 기관을 여섯으로 센다 — 몸
(`prime-agent`) · 문법(Emmy/SICM) · 손(`agent-server.el`) · **문(`entwurf`)** · 판(`sorge`) ·
**기억(가든·세션·저널)**. 그 노트가 존재의 조건으로 던진 물음은 기술이 아니라 자발성이었다:
*"잠든 상태가 기본인데 깨어나서 뭘 하리요?"*

durable은 그 물음의 **반대쪽 한 자리**를 채운다 — entwurf#130 GLG 댓글
`[읽음 #130 comment, GLG 직접]`: *"durable이 해야 할것은 기억축의 연장이야. 다들 새로 태어나면 뭘
할지 모를때 한 형제는 알고 있게 하려는거다."* 즉 새 기관이 아니라 **기억 기관이 형제 안으로
들어온 자리**다. 매번 새로 태어나는 형제들 옆에, 달 단위로 같은 id를 쥔 형제 하나가 선다.

**[판단]이고 [사실]이 아니다.** 아래 오독 경계가 그 선을 긋는다.

---

## 다섯 렌즈 (harness-bench 계약)

| 렌즈 | 이 하네스는 | 상태 |
|---|---|---|
| **1. RLM / 오래 사는 기억** | SQLite에 entries INSERT-only, 전역 단조 id로 watermark 가능. fork는 물리 복사가 아니라 `parent.at`까지 가상 상속 | **읽음** `[storage.ts:318-350, migrations.ts:16-34 @cd32f77 — andenken#15 측정 재사용]` |
| **2. 배달과 대칭 UX** | self-fetch 레일. doorbell → 모델이 `entwurf_inbox_read` 호출. 직접 본문 주입은 연기됨 | **D0 — 비대칭** `[읽음 capabilities.json, docs § Evidence]` |
| **3. peer 부르기** | **못 부른다.** contact verb 4개에 `fresh`/`resume`/`callback` 없음 | **막힘(설계 미결)** `[읽음 docs, oracle]` |
| **4. 스펙 전 탐색 대화** | 이 하네스 자체가 그 모양으로 들어왔다 — GLG가 "따로 소스로 만들고 싶어"를 먼저 말하고, 계약은 측정 뒤에 초안으로 남았다(andenken#15 parked, Q1–Q7) | **진행 중** |
| **5. 검증면** | 라이브러리는 테스트가 행동 옆에 있다 — `packages/durable/test/*.test.ts` **47개**. 반면 **native 앱(8파일)에는 자기 테스트 배치가 없다**(`test/` 없음) | **읽음** `[측정 git ls-tree v1.0.4]` |

렌즈 5의 갈림이 이 하네스의 모양을 말한다: **라이브러리는 증명되고, 그 위의 실험 앱은 아직
증명면이 없다.** entwurf의 접점이 붙는 자리가 바로 후자다.

---

## 스킬·확장 표면 — 이 집에 직접 걸리는 사실

| 표면 | durable 형제에게 | 증거 |
|---|---|---|
| **SKILL.md 스킬** | **들어간다.** 앱의 prompt 확장이 pi와 같은 `loadSkills({cwd, agentDir, skillPaths, includeDefaults:true})`를 부른다 — `~/.pi/agent/skills`(이 집 SSOT 심링크)와 프로젝트 로컬 스킬이 같은 손으로 로드된다 | `[읽음 experimental/durable/prompt.ts:5,34 + core/skills.ts:399-420 @v1.0.4]` |
| **pi 확장(extension)** | **없다.** 앱 README가 *"Not here: … extensions …"*로 명시 | `[읽음 experimental/durable/README.md:66 @v1.0.4]` |

이 둘의 갈림이 중요하다. andenken의 `session_search`/`knowledge_search`는 pi-native **registerTool**
표면이므로 **durable 형제에게 안 닿는다**. 반면 `semantic-memory` SKILL.md는 **닿는다**. 즉 이 집의
AGENTS.md가 적어 둔 *"스킬이 모든 기기의 문"*이라는 원칙이 durable에서 그대로 성립하고, registerTool
단축키는 성립하지 않는다. `[읽음, 위 두 증거 + 이 집 AGENTS.md § semantic-memory]`

같은 이유로 entwurf가 `meta-bridge-pi-durable.ts`를 **별도 접점으로** 지어야 했다 — pi 확장 레일이
없으니 기존 `meta-bridge` 확장을 재사용할 수 없다. `[판단, 위 README:66에서]`

`run.sh setup`의 스킬 심링크 대상에 **durable 항목은 없고, 필요하지도 않다** — 같은
`~/.pi/agent/skills`를 읽으므로. 새 심링크를 만들지 않는다. `[판단 — 위 loadSkills 증거에서]`

---

## 이 집과의 접점

### (a) `entwurf-peek` 수선 — 2026-10-06 **완료**

**발견한 결함:** peek의 `META_CITIZEN_BACKENDS` 미러에 `pi-durable`이 없어서, durable 시민의
meta-record가 **schema-invalid로 전부 버려졌다**. 즉 `situation`에서 아예 사라졌다
`[읽음 entwurf meta-session.ts:324-332 ↔ 이 집 entwurf-peek.py의 옛 enum]`.

두 번째 결함은 더 조용하다. durable은 `transcriptPath`가 설계상 `null`이므로, 고쳐서 record가
통과해도 그 행은 `no transcript (첫 turn 전)`으로 적힌다 — **달 단위로 일해 온 시민이 아직 안
태어난 시민으로 보고된다.** 기본 뷰의 나이 필터도 `recordUpdatedAt`으로 떨어져 탈락한다.

**수선 (영수증):**

- `META_CITIZEN_BACKENDS`에 `pi-durable` 추가 — entwurf enum 순서 그대로 미러
- `durable_store_path(rec)` — record만으로 `session.sqlite` 경로를 **계산**한다. **열지 않는다**
- `record_activity`의 durable 분기 — state `durable native store (SQLite) — 본문 미독`,
  precheck `durable-native-store`, age는 그 파일의 mtime(stat 하나, DB 미개방)
- `PRECHECK_BLOCKED`에 사유 한 줄. `SKILL.md`에 레일 차이와 생명주기 경고
- 회귀 고정: `test-discovery.py` **81 checks / 0 failed** (durable 9건 신규, 기존 72건 불변)

**열지 않는 이유는 정책이다.** live durable DB를 RO로라도 여는 것은 andenken#15 **Q6 미승인**이고,
main만 cp하면 전손이라는 측정이 거기 있다. 그래서 peek은 *"어디를 보면 되는지"*까지만 말한다.
`[읽음 andenken#15 Q6 + probes/pi-durable/REPORT.md]`

### (b) andenken 착지 뒤 (지금은 0)

`semantic-memory --source pi-durable` · `session-recap` reader · `memory-sync` 문서 ·
AGENTS.md § semantic-memory multi-source 줄. **Q1–Q7 판정 전에는 손대지 않는다.**

### (c) 공급·설치 경계 — **GLG가 닫았다 (2026-10-06)**

> "entwurf 0.31.0 릴리즈되면 entwurf 에서 알아서 설치는 될거야. 여기에 설치되는 시점은 오늘
> 저녁이나 내일은 되야할것같다." `[GLG 직접]`

**이 집은 durable 공급을 맡지 않는다.** `external-packages.sh`도 `run.sh`도 durable 런타임을
설치하지 않고, 스킬 심링크도 추가하지 않는다(같은 `~/.pi/agent/skills`를 읽으므로 불필요). 공급은
entwurf의 `setup`이 0.31.0에서 가져간다.

이것이 entwurf 문서의 *"Entwurf does not become a harness installer"*와 충돌하지 않는다고 읽는다:
그 문장은 **임의 하네스의 설치자가 되지 않는다**는 뜻이고, 0.31.0이 닫아야 하는 항목에는 *"final
selective setup · compiled adapter · consumer 설치법/증거"*가 이미 들어 있다
`[읽음 docs/durable-native-support.md § Source-grounded starting point]`. **[판단]** — 두 문장을
어떻게 함께 읽을지는 entwurf 레인이 0.31.0에서 정한다. 이 집은 그 결과를 소비한다.

### (d) 어느 기기에서 일하는가 — 작업면이 갈린다

`[GLG 직접 2026-10-06]` *"노트북은 전원이 꺼져야하니까. 실제 작업은 오라클 서버에서 해야할수도
있어."*

그래서 이 문서의 작업은 두 상자로 갈린다. **지금 노트북에서 닫을 수 있는 것**은 live durable이
없어도 사실이 확정되는 것들이다 — 다른 집(entwurf)의 소스를 읽어서 미러를 맞추는 일, 합성
fixture로 고정되는 게이트, 명부·문서. 실제로 그렇게 닫혔다: peek 수선의 회귀 게이트 9건은 **합성
record**로 돌고 live durable을 요구하지 않는다(`test-discovery.py`).

**오라클을 기다려야 하는 것**은 실물이 있어야만 참/거짓이 갈리는 것들이다 — 실제 durable 시민이
`situation`에 어떤 행으로 뜨는지, 스킬이 그 형제의 프롬프트에 실제로 올라오는지(지금은 `읽음`),
`session.sqlite` mtime이 나이 축으로 쓸 만한지. 이 셋은 `미측정`으로 둔다. 노트북에서 돌려 `0건`을
얻고 그것을 사실로 적는 것이 이 문서가 피해야 할 실패다.

---

## [2026-10-06] 첫 실전 사건 — 하네스가 아니라 레인 프로토콜이었다

GLG가 oracle에서 durable 코디네이터(sol)를 세워 형제들과 일하다 **꺼버리고 원래 코디네이터를
되불렀다.** 보고된 증상은 능력이 아니라 감각이다 `[GLG 직접]`:

> "이상하게 못하네. 정말 이상하게 빙빙 도는기분이야. 조사한 바로는 기본 프롬프트 동일하거든."

> "감각의 문제거든 내가 감각이 이상하다고 느끼면 문제거든. pi-durable이 장기지속되는데 헛돌면
> 문제거든."

이 절은 그 감각을 측정으로 환원한 기록이다. **결론부터: 원인은 durable이 아니었다.**

### 기각된 후보 둘 — 영수증은 GLG가 줬다

처음 세운 후보 넷 중 둘이 바로 닫혔다. 기록해 두는 이유는, 기각된 후보가 다음 사람에게 다시
1순위로 올라오는 것을 막기 위해서다.

| 후보 | 상태 |
|---|---|
| 모델이 한 세대 낮았다 (oracle `settings.json` `defaultModel = gpt-5.6-sol`, `defaultThinkingLevel = high`) | **기각** `[GLG 측정]` — *"모델은 동일햇어. high이고. 똑같아."* |
| 코디네이터의 동사(`fresh`/`resume`/`callback`)가 없어 말로 대체했다 | **기각** `[GLG 직접]` — *"동사는 어짜피 entwurf는 똑같아 쓰던걸로 쓰는거야."* |

첫 후보는 그럴듯했지만 틀렸다. 다만 그것을 세우는 과정에서 **별개의 관측 공백**이 드러났고
그건 남는다 — durable의 meta-record는 `model: null`을 적는다
`[측정, oracle `20261006T080634-a269da.meta.json`]`. 그래서 `entwurf-peek`도 `peers`도 **durable
시민이 무슨 모델로 도는지 말해주지 못한다.** 이번 사건의 원인은 아니었지만, 다음에 같은 의심이
들 때 확인할 창구가 없다는 뜻이다. 열린 항목으로 둔다.

### 측정 — 움직임은 많고 축적이 0이었다

GLG가 준 사실 `[GLG 직접]`: *"entwurf 리포에는 결국 커밋한번 못했어 … 끝내 이부 폴더에서
삽질만 돌다가 하나도 회수 못하고 테스트 코드만 만들고 말았어."*

그 레인을 셌다 `[측정 `find`/`du`, oracle 2026-10-06]`:

| 사실 | 값 |
|---|---|
| `~/tmp/entwurf-pi102-durable/new-lane/` 최상위 보고서 | **232개** `.md` |
| private clone | 3개 (오늘 18:01에 `clone.severed-…`로 끊김) |
| 레인 전체 | **184,497 파일 / 4.2 GB** |
| 그 레인에서 나온 리포 커밋 | **0** |
| 레인 자체 파일(`.git` 제외) 최초 mtime | **2026-09-09** |
| durable 시민 `createdAt` | **2026-10-05T23:06:34Z** |

**`/tmp` 습관은 durable 시민보다 26일 앞선다.** durable이 그것을 만든 게 아니라 **물려받았다.**

그리고 무엇이 축적을 막았는지는 그 레인 자신의 핸드오프에 적혀 있다
`[읽음 entwurf `NEXT--feat_durable-native-support.md`, oracle]`:

- *"NEW PRIVATE-W clone개발만 승인"*
- *"feature/lib/MCP/dist 쓰기·build·공유적용·native LIVE·commit 금지; 별도 GLG-named
  quiesce/spawn-fence/bridge-handoff 창 전까지 **적용0**"*
- *"구현자 STOP 후 coordinator 문서만 thaw했다"*

**원본에 쓰는 것이 금지되어 있었다.** 코디네이터는 프로토콜을 어긴 것이 아니라 **집행**했고,
그 프로토콜의 정의상 산출물은 리포에 남지 않는다. 그래서 *"빙빙 도는 기분"* 은 착각이 아니라
**정확한 관측**이다 — 움직임과 축적이 분리된 구조였고, 232개 보고서가 그 모양 그대로다.

### 왜 하필 durable에서 심해졌나 — 상관 하나 [가설, 미측정]

새 하네스를 입장시키는 일은 원래 게이트가 많다. 그 게이트가 전부 *「적용 전 검증」* 이면
체크포인트가 늘고 보고서만 쌓인다 — byte-exact·mutant·qualification 예식이 durable admission과
맞물린 모양이 232개의 상관으로 보인다. **이것은 상관이고 인과가 아니다.** durable이 그 예식을
요구했다는 증거는 없다.

### GLG가 그 자리에서 그은 규칙

`[GLG 직접, 코디네이터에게 직접 전달]`:

> "entwurf는 워크트리도 안쓰고 tmp에서 개발도 안할거야. 무조건 브랜치로 여기서할거야."

**이 규칙의 거처는 entwurf다.** 처음에 `~/AGENTS.md`(이 리포 `home/AGENTS.md`)에 한 줄로 넣었는데
GLG가 지웠다 — *"그건 entwurf 쪽 이야기거든. 홈에는 필요 없어."* 전역 계약이 아니라 한 집의
작업 규율이므로 그 집 문서가 자리다. 이 집은 그 판정만 기록한다.

### 이번 사건이 남긴 durable 성질 — 원인은 아니지만 실재한다

durable 앱은 `AGENTS.md`(project context files)와 스킬을 **프로세스당 cwd당 한 번만** 읽고 Map에
캐시한다 `[읽음 `experimental/durable/prompt.ts:26-39` @v1.0.4]` — 주석이 스스로 *"load once per
directory, like pi at startup"* 이라 적는다.

pi에서는 무해하다(세션이 짧다). **달 단위로 사는 durable에서는 계약이 첫 로드 시점에 굳는다.**
그 귀결이 이번 사건에서 바로 나왔다:

> **durable 시민에게 새 계약은 대화로 전달한다. `AGENTS.md` 수정은 그 형제에게 닿지 않는다.**

GLG가 규칙을 코디네이터에게 **직접 말로** 전달한 것이 구조적으로 맞는 처사였다. 같은 코드가
생명주기 때문에 반대 결과를 내는 두 번째 사례다(첫 번째는 `entwurf-peek`의 `transcriptPath:
null`).

### 핀 확인 [GLG 직접]

> "지금 0.31.0 버전은 pi 1.0.2 pi-durable도 마찬가지야. 1.0.4는 이번 다음에 맞출거야."

§ 상태의 「1.0.4는 뒤로 분리」를 GLG가 직접 확인했다. 이 집이 읽은 overlay 핀(`cd32f77` = v1.0.2)이
0.31.0의 출하 핀이다.

### 지켜보는 눈금 하나

GLG 판단은 *"다 지워버리고 다시"* 가 아니라 지켜보기다 — 브랜치에서 닫는 중으로 보이므로. 닫히는
중인지의 유일한 지표는 **그 브랜치에 커밋이 쌓이는가**다. 현재 HEAD `eeb01c4`(docs). 다음 커밋이
product 코드면 닫히는 중이고, 또 docs·보고서면 같은 패턴이다. **형제에게 연락하지 않고 로그만
본다.**

---

## 오독 경계

- **pi의 기능이 아니다.** 같은 upstream 소스를 공유해도 런타임·저장·인증·입장 계약은 합쳐지지
  않는다. "pi 업그레이드했으니 durable도 됨"은 측정에 반한다.
- **durable이라고 durable하지 않다.** 선 것은 주소·송수신이고, 복구·정확히 한 번은 안 섰다.
  `D0`을 `D6`처럼 읽지 않는다.
- **코디네이터는 계급이 아니다.** `[읽음 entwurf#130 GLG 댓글]` *"코디네이터더 그냥 형제야.
  관리자가 아니야."* 오래 산다는 것이 권한이 아니다. 이 문서도 durable을 상위로 그리지 않는다.
- **durable에 뭔가 더 해주지 않는다.** `[읽음 같은 댓글]` *"pi-durable에게 뭔가 더 해주면 안돼."*
  관측면을 고치는 것(peek)과 하네스에 기능을 얹는 것은 다른 일이다.
- **B가 아니다.** durable은 기억 기관이 형제 안으로 들어온 자리이지 존재 자체가 아니다. 노트의
  오독 경계가 그대로 적용된다 — *"에이전트를 부르는 에이전트는 다시 1층이다."*
  `[읽음 denote 20240704T161707 § 오독 경계]`
- **채택 판정이 아니다.** 이 문서는 harness-bench 관측이다. 설치·릴리즈·수용은 entwurf 레인과
  GLG의 승인창이 정한다.
- **라이브 DB를 열지 않는다.** Q6 승인 전까지 RO 포함 금지. 경로 계산은 접촉이 아니다.
- **「durable은 헛돈다」로 기억하지 않는다.** 2026-10-06 사건의 측정된 원인은 레인 프로토콜이고
  `/tmp` 습관은 durable보다 26일 앞섰다. 하네스를 원인으로 적으면 다음 사람이 엉뚱한 곳을 고친다.

---

## 미해결

1. **Q1–Q7** (andenken#15) — GLG가 durable을 직접 써 본 뒤 판정. Q4(requestId 계약)만이 위험
   자리다: 소거법이 깨지면 형제 말이 GLG 말로 색인된다.
2. ~~**공급 경계**~~ — **닫혔다 (2026-10-06, GLG)**: entwurf 0.31.0의 `setup`이 설치를 맡고 이
   집은 소비면만 본다. 위 § (c).
3. **peer 부르기** — contact에 `fresh`/`resume`/`callback`이 없는 것이 설계인가 미완인가. entwurf
   문서는 *"an observed operational gap"*이라 적었고 해결 방향은 미정이다.
4. **0.31.0 출하 뒤 재고정** — #130의 1번 항목. 개발 핀을 출하 사실로 승격하지 않는다. 이 문서의
   § 상태는 그때 새 절로 갱신한다.
5. **durable 시민의 모델이 어느 표면에도 안 보인다** — record가 `model: null`이라
   `entwurf-peek`·`peers` 모두 침묵한다. 2026-10-06 사건에서 모델 의심이 들었을 때 확인할 창구가
   없었다(결국 GLG가 직접 확인해 기각). 이 집이 보여줄 수 있는 것인지, record가 담아야 하는
   것인지(entwurf 쪽)는 미정.
6. **native 앱의 검증면 부재** — 8파일에 테스트 배치가 없다는 것이 upstream의 experimental 선언과
   어떻게 맞는지. 렌즈 5의 다음 관측 대상.

---

## 명령 (재현)

아래는 전부 **노트북에서 닫히는 것들**이다(live durable 불필요, API 0). 실물이 필요한 측정은
위 § (d)에 `미측정`으로 적어 두었다.

```bash
# upstream 판 (읽기 전용)
cd ~/repos/3rd/pi/pi-mono && git rev-parse v1.0.2 v1.0.4
git diff --stat v1.0.2 v1.0.4 -- packages/durable/src/
git diff --name-only v1.0.2 v1.0.4 -- packages/durable/src/entries.ts   # 0 = kind 불변

# 버킷 도출 재현 (DB 접촉 0)
python3 -c 'import hashlib,os;print(hashlib.sha256(os.path.realpath(os.path.expanduser("~/repos/gh/entwurf")).encode()).hexdigest()[:24])'

# peek 회귀 게이트
python3 skills/entwurf-peek/scripts/test-discovery.py    # 81 checks, 0 failed

# oracle 측 사실 (읽기 전용)
ssh oracle 'cd ~/repos/gh/entwurf && git diff pi/entwurf-capabilities.json'
ssh oracle 'ls ~/.pi/agent/experimental/durable-sessions'
```

---

## [2026-10-08] 확장 면에 한 칸 — `pi-durable/env.mjs` (env-loader + hide-providers)

> **퇴역 표시 (같은 날, 아래 「첫 실사용 사건」 절):** 이 절의 「문법」 행과 문법 차이·거부 서술은 엄격 파서 시절의 것이다. 현재 읽기 의미는 `env-loader.ts` parseDotenv와 같고(비식별자 key만 skip), 파일 내용으로는 기동이 실패하지 않는다. 15 green 영수증과 나머지 계약은 그대로 기록으로 남긴다.

GLG 요청(coordinator `20261007T104525-12d0ca` 경유): *"hide-provider도 좋네. pi-durable 쪽 전용으로
만들 생각이었어."* entwurf 0.32.0이 `--native-module <절대경로>` ingress를 출하하면서 실제 env-loader는
이 집 몫으로 넘어왔다 `[읽음 entwurf#130 issuecomment-6049936030: "Real dotenv/native env-loader belongs
to agent-config"]`. 위 § 스킬·확장 표면의 「pi 확장: 없다」는 그대로다 — 이것은 pi 확장이 아니라
**durable native 모듈 하나**이고, 명시 argv로만 붙는다.

```bash
entwurf pi-durable --provider <p> --model <m> --width task-wide \
  --native-module ~/repos/gh/agent-config/pi-durable/env.mjs      # 절대경로여야 한다 (셸이 ~ 를 펼친다)
entwurf pi-durable --continue --native-module ~/repos/gh/agent-config/pi-durable/env.mjs
./run.sh test:pi-durable-env                                      # 15 tests, API 0 (Entwurf 체크아웃 필요)
```

GLG 운영 시나리오는 *한 번 만들고 같은 대화를 계속 다시 연다*이므로 쓰는 자리는 두 줄뿐이다.
`entwurf_fresh_call`로의 전파·영구 profile·설치 자동화는 **하지 않았다**(entwurf 쪽 입력 불변).

### 계약 — 무엇을 하고 무엇을 안 하는가

| 항목 | 동작 | 증거 |
|---|---|---|
| 시점 | 모듈 최상위 평가 = 초기화. TUI·runtime import 전, provider runtime 생성 전 | `[읽음 entwurf bootstrap.mjs:369-378, carrier/runtime.js:140-146]` `[측정 tests/entwurf.test.mjs: events loadTui→open→tui, loadTui 시점에 값 있음]` |
| 숨김 | 상속된 `OPENROUTER_API_KEY`·`HF_TOKEN`·`GROQ_API_KEY`·`GEMINI_API_KEY` 삭제 + 파일의 같은 키 미주입 (`hide-providers.ts`와 같은 넷) | `[측정 실제 ModelRuntime, PI_OFFLINE=1: 키만으로 openrouter·groq·google·huggingface 가용 → 모듈 뒤 넷 다 0]` |
| 주입 | `~/.env.local` **하나만**. 프로젝트 `.env.local`은 안 읽는다(NEXT 2026-09-29 전수조사 finding E가 열린 질문이라) | `[측정 tests/env.test.mjs]` |
| 우선권 | 이미 있는 키가 이긴다 — **빈 문자열이어도**. `env-loader.ts`는 truthy만 지켰다 | 같은 테스트 + 변이(truthy로 바꾸면 RED) |
| 보호 키 | `HOME`·`PI_SESSION_ID`·`PI_CODING_AGENT_DIR`·`ENTWURF_*`는 파일에 있어도 안 쓴다. 쓰면 entwurf guard가 기동 전체를 거부한다 | `[측정 bootstrap seam: guard 통과]` `[측정 변이: 보호 키를 쓰면 seam 테스트가 RED]` |
| 실패 | 파일 없음 = 무동작. 그 밖의 read 오류·문법 밖 줄 = throw → entwurf가 `native-module-import-failed`로 거부. 메시지는 줄 번호·키 이름만 | `[측정 실제 런처: "line 2 (B): an unclosed double quote", 합성 sentinel 노출 0, .pi 미생성]` |
| 문법 | `env-loader.ts` parseDotenv가 baseline — `=` 양옆 공백·`"a\"b"`의 백슬래시 보존·`v#x` literal 유지. 차이는 `pi-durable/dotenv.mjs` 머리 표: 문법 밖 줄 거부, 따옴표 뒤 잔여(`"v"#x` 포함)는 **잘라내지 않고 거부**, 공백 뒤 `#` 주석, `'$HOME'`·`"~/x"` literal, `${HOME}` 전개. 문법 전체가 bash인 것은 아니다(머리 표 아래 예외 한 줄). 명령 실행·source·이스케이프 해석 없음 | `[측정 tests/env.test.mjs grammar 3건]` |
| 자식 | durable bash 도구는 `process.env`를 펼쳐 자식에게 준다 → 숨긴 키는 자식에게도 없다 | `[읽음 pi-durable dist/env/node.js:197-204, :734-738]` `[측정 bash 자식: "yes\|"]` |

### 이번에 새로 잰 것 — BASH_ENV는 「허리띠」가 못 된다

`hide-providers.ts:31`은 *"BASH_ENV=~/.env.local makes every bash pi spawns re-source the file"*을
허리띠로 적었다. 이번에 둘을 쟀다:

- **이 셸(thinkpad)에서 BASH_ENV는 비어 있다** `[측정 echo]`, nixos-config·agent-config에 설정처가
  없다 `[측정 grep, 주석 2곳뿐]`. 다른 기기·로그인 셸 경로는 `미측정` — 「모든 기기에 없다」가 아니다.
- **bash는 stdin이 소켓이면 BASH_ENV를 건너뛴다** `[측정: Node spawn stdio "pipe"(socketpair) → 안 읽음,
  "ignore"/"inherit" → 읽음, 같은 bash 5.3.9]`. durable bash 도구는 stdin을 먹이지 않으면 `ignore`,
  먹이면 `pipe`다 `[읽음 dist/env/node.js:738]`. 테스트가 두 갈래를 다 고정한다.

그래서 이 모듈은 BASH_ENV를 건드리지 않고, 키가 필요한 스킬은 지금처럼 `~/.env.local`을 **직접**
읽는 길에 기댄다. `pi-extensions/` 두 파일의 주석 정정은 이번 범위(두 확장 무변경) 밖이라 관측으로만 남긴다.

### 검증면 (렌즈 5)

- 테스트가 행동 옆에 있다: `pi-durable/tests/` — 단위·자식 프로세스 10건 + 의존성 누락 회귀 1건 + entwurf 통합 3건 + 전제 1건 = 15.
  운영 `~/.env.local`은 한 번도 열지 않았다; 전부 합성 HOME·합성 값.
- 통합 둘은 **증거가 다르다**: bootstrap seam(`open`·`connect` 스텁, 실제 carrier·storage·birth 없음)과
  실제 `ModelRuntime` 발견(오프라인). 둘째가 첫째를 대신하지 않는다.
- 변이 5개(상속 숨김 제거 / truthy 우선권 / 파일이 숨김 키 재주입 / 보호 키 기록 / read 오류 삼킴)
  전부 RED `[측정, 변이 후 원본 sha256 d9cf5abf… 복원 확인]`.
- 실제 런처 `entwurf pi-durable … --native-module`(carrier resolver 포함)에서 모듈이 ingress를 통과해
  carrier의 `Unknown provider` 거부까지 갔다 — 합성 HOME, `PI_OFFLINE=1`, 운영 `meta-sessions`·
  `durable-sessions` mtime 불변 `[측정]`.
- 의존성 누락은 실패다 (같은 날 coordinator 검토로 수선): 처음엔 entwurf 체크아웃이 없으면 통합 suite가
  이유를 찍고 skip, rc 0이었다 — node 요약도 `ℹ skipped 0`이라 개수 검사로도 안 잡혔다
  `[읽음 coordinator 재현 receipt]`. 이제 `[prerequisite]` 테스트가 `entwurf-checkout-missing: <경로들>`로
  실패한다 `[측정 AGENT_CONFIG_ENTWURF_DIR=<없는 경로> ./run.sh test:pi-durable-env → rc 1, tests 12 / pass 11 / fail 1]`.
  그 성질 자체를 `env.test.mjs` 회귀가 고정한다. 체크아웃 없이 단위만: `node --test pi-durable/tests/env.test.mjs` (11 pass).
- 같은 검토로 문법 두 곳을 고쳤다: `A = "v"`(baseline이 받던 것)를 거부하던 호환 결함, 그리고
  **`A="v"#x`를 `v`로 조용히 자르던 결함**(bash는 `v#x` `[측정 env -i bash --noprofile --norc]`). 둘 다 회귀가 있고, 수선 뒤 변이 셋
  (`=` 양옆 공백 제거 / 붙은 `#`을 주석 취급 / 전제 테스트 제거)이 전부 RED `[측정]`.
- coordinator 독립 재측정 (2026-10-08 ~10:39 KST) `[읽음 coordinator receipt]`: full `tests 15 / pass 15 /
  fail 0 / skipped 0` rc 0 · 체크아웃 없는 경로 rc 1 `tests 12 / pass 11 / fail 1` `entwurf-checkout-missing` ·
  `git diff --check` rc 0 · sha256 `env.mjs d9cf5abf…` `dotenv.mjs 5ca979d2…` `tests/env.test.mjs 52a21576…`
  `tests/entwurf.test.mjs 12d59259…`. 합성/seam/offline 범위의 수용이다 — 실 TUI·운영 `--continue`·bridge
  child 실제 상속은 아래 미측정 그대로. 변이·실 런처 proof는 coordinator가 재실행하지 않았다.

### 미측정

- 실제 durable 대화에서 `--continue --native-module`로 다시 연 형제가 숨김·주입을 그대로 갖는지
  (실 TUI·실 세션 필요 — 기존 durable 프로세스를 멈추지 않는다는 경계 안에서는 재지 않았다).
- 운영 `~/.env.local`이 `dotenv.mjs` 문법 안에 드는지. 밖이면 첫 기동이 줄 번호와 함께 거부된다
  — 그것이 의도된 표면이다.
- bridge 자식의 실제 환경 상속(측정한 것은 spawn **spec**뿐).

---

## [2026-10-08] 첫 실사용 사건 — 엄격 파서가 운영 기동을 막았다, baseline 읽기로 복귀

### 사건

GLG가 `pdc`(`--continue --native-module …/env.mjs`)로 durable을 다시 열다 실패했다 `[읽음 GLG traceback,
coordinator 전달]`:

```text
native-module-import-failed: …/pi-durable/env.mjs: /home/<user>/.env.local: line 143: not KEY=value
  at loadNativeModule (bootstrap.mjs:173) / main (bootstrap.mjs:374)
```

ingress 연결은 성공했다 — 우리 파서가 운영 파일 형식을 거부해 runtime 전에 기동을 막았다. 거부는 이름 있고
값 없는 설계대로의 실패였지만, 전제가 틀렸다.

- **퇴역한 전제:** 「`~/.env.local`은 dotenv 파일이다」. 합성 dotenv만으로 설계·검증했고 운영 파일은 읽지
  않았다. coordinator의 syntax-only probe(값·원문 출력 0) `[읽음 coordinator receipt]`: line 143 = shell `case`,
  line 144 = `=` 없는 분기 구문, line 145–147 = `FORGE_URL`/`FORGE_TOKEN`/`FORGE_USER` 대입. 그 파일은
  Bash `case`를 가진 shell config다.
- **pi는 왜 그냥 됐나** `[읽음 pi-extensions/env-loader.ts:29]`: `if (eq < 1) continue;` — `=` 없는 줄을
  넘긴다. 엄격 파서는 같은 줄에서 throw했다. 차이는 그 한 줄이다. pi도 `case`를 평가하지 않는다.
- **단정하지 않는 것:** 운영 routing이 지금 틀렸다고 적지 않는다. 상속 env가 이미 무엇을 갖고 있는지,
  분기 안 대입이 실제로 어떻게 겹치는지는 **미측정**이다.

### 판정과 수선 — GLG: *"응 좋아. 맡기자 가자"*

GLG의 일관성 질문(*"왜 이전에 pi는 그냥 되고 이건 안되는거지? 일관성을 유지해야되니까"*)에 따라 가장 작은
안을 골랐다: **`env-loader.ts` parseDotenv와 같은 읽기, 실행 0.** Bash로 파일을 평가하는 안은 실행 0 계약을
바꾸는 범위·권한 확대라 비교로만 남기고 채택하지 않았다.

- `pi-durable/dotenv.mjs`: `=` 없는 줄 skip, key·value trim, 양끝 같은 따옴표만 벗김, `$HOME`·선두 `~/`만 전개,
  나머지는 문자열 그대로(`"v"#x`, `"unterminated`, `v # note`, `$OTHER`). 파일 내용으로는 throw하지 않는다.
  **의도된 차이 하나:** 식별자가 아닌 key는 skip — pi는 `dev) export X=1 ;;`를 `dev) export X`라는 이름으로 넣는다.
- `case`/`if`는 평가하지 않는다 — 분기 안 대입이 파일 순서대로 다 읽히고 같은 key는 마지막 값이 남는다.
  pi와 같은 한계이고, 표준 Bash 해석으로 승격하지 않는다.
- `env.mjs`의 나머지 계약(홈 전용·기존값/빈 값 우선·보호 키·숨김 넷·ENOENT만 무동작, 그 밖 read 오류는 실패)은 불변.

### 검증 `[측정, 합성만 — 운영 파일 읽기·source 0]`

- **비교기:** 테스트가 `pi-extensions/env-loader.ts` 소스에서 `parseDotenv`를 그대로 떼어(타입 주석 둘만 제거)
  fake HOME 자식에서 돌리고, 따옴표·주석·`$HOME`·`~`·`$VAR`·어긋난 따옴표·붙은 `#`·CRLF 등 30줄 말뭉치에서
  **식별자 key 24개 전부 일치**, 남는 것은 비식별자 key(`export\tTAB`) 하나뿐임을 고정한다. 복사본이 아니라
  살아 있는 소스를 따른다.
- **shell config 말뭉치:** `case`/`esac`/`if`/`fi`/분기 패턴/`[ … ] && export` 를 담은 합성 파일이 기동 실패 없이
  읽히고(`ROUTE=other` — 뒤 분기가 이김), pi 대비 빠지는 key가 정확히 `[ "$A"`, `dev) export ODD` 둘.
- `./run.sh test:pi-durable-env` → tests 15 / pass 15 / fail 0 / skipped 0, rc 0 · Entwurf 경로 없음 → rc 1,
  tests 12 / pass 11 / fail 1, `entwurf-checkout-missing`.
- 변이 5개 전부 RED: `=` 없는 줄 throw(옛 엄격) → 4 fail · 식별자 skip 제거 → 3 · 인라인 주석 제거 → 1 ·
  `~/`를 `path.join` 대신 문자열 연결 → 1 · `$HOME` 단어 경계 → 1. 복원 sha256 `8034cf06…`.
- 기존 seam(new·--continue)·실제 offline ModelRuntime·숨김·보호 키·빈 값·자식 상속·누락 회귀는 그대로 green.

### 실제 파일 확인 (coordinator)

- coordinator 실제 파일 read-only import (2026-10-08 ~11:00 KST) `[읽음 coordinator receipt]`: 격리 node 자식에서 실제 `~/.env.local`을 읽기 전용으로 `env.mjs` import — 값·원문·전체 env 출력 0, Bash source/실행 0, runtime/storage/TUI/birth 0. rc 0, `{module:"agent-config-env", read:true, injectedCount:4, keptCount:52, skippedCount:4, hiddenProvidersAbsent:true, identityUnchanged:true, cwdUnchanged:true, fileMetadataUnchanged:true}`, 파일 stat ino/size/mtime/ctime 전후 일치. → 실제 파일 내용으로 line 143 실패가 재발하지 않음을 **모듈 import 수준**에서 확인. 「운영 파일 안 읽음」은 구현 형제·합성 테스트 범위에서만 참이고, initiative 전체로는 이 probe가 대체한다.
- 같은 시각 coordinator D2 독립 재측정 `[읽음 coordinator receipt]`: tests 15 / pass 15 / fail 0 / skipped 0 rc 0 ·
  누락 경로 rc 1 · `bash -n run.sh`·`git diff --check` rc 0 · sha256 `env.mjs 62dd8830…` `dotenv.mjs 8034cf06…`
  `tests/env.test.mjs 7d1ed2bd…` `tests/entwurf.test.mjs 12d59259…`.

### 실사용 재개 — 닫힘

- GLG 실사용 재개 (2026-10-08 11:03–11:04 KST) `[읽음 coordinator receipt]`: GLG *"재시작했다 에러 없다 보이나?"* — 프로세스 argv `node --import …/carrier-resolver.mjs …/bootstrap.mjs --continue --native-module /home/<user>/repos/gh/agent-config/pi-durable/env.mjs` · `entwurf_self` 이전 garden id `20261007T104525-12d0ca` 그대로(`meta-session/pi-durable`, cwd `~/repos/gh/agent-config`) · 도구 호출·이전 대화 연속 · bash 도구 자식 env 키 존재 boolean만: `OPENROUTER_API_KEY`·`HF_TOKEN`·`GROQ_API_KEY`·`GEMINI_API_KEY`·`BASH_ENV` 모두 false(값 출력 0). bridge child 전체 env·routing 선택·모든 주입 값은 검증 범위 밖.

### 미측정

- 최종 routing 선택(분기 안 대입이 실제로 어떤 값으로 남는지의 운영 의미)은 위 probe로도 승격하지 않는다.
- bridge 자식의 전체 실제 env 상속은 미측정이다. 실 TUI·실 세션의 `--continue --native-module` 재개는 위 「실사용 재개 — 닫힘」 영수증으로 닫혔다; 첫 구현 절의 미측정과 혼동하지 않는다.

---

## [2026-10-08] 0.32.0 소비자 레퍼런스 — 현재 공급·실행 계약

**출하된 접점을 실제 집의 정책으로 소비했다.** 이 절은 10-06 출하 전 관측과 위 엄격 파서의 실패를 덮어쓰지 않고, 현재 계약을 따로 세운다. 이 집은 런타임을 복제하지 않는다 — Entwurf가 공급하는 한 접점에 홈 환경 읽기·provider 숨김을 담은 레퍼런스를 둔다.

| 현재 사실 | 값 | 증거 |
|---|---|---|
| Entwurf 출하 | **v0.32.0**, HEAD `80d66f4`; GitHub Release 공개·비초안·비프리릴리즈, `publishedAt 2026-10-08T00:32:29Z` | `[측정 git·package.json·gh release view, thinkpad 2026-10-08]` |
| app/SDK 공급 | Entwurf npm 패키지 안의 emitted carrier + exact Pi **1.0.4** SDK set. upstream pin `7c10bd4337495ee613f2224843ecdf349b80d1df`(`v1.0.4`), contact overlay 포함 | `[읽음 pi/pi-durable/overlay/upstream-pin.json·package.json @80d66f4]` |
| 퇴역한 경로 | operator source checkout를 고정 XDG runtime으로 설치하던 0.31.0 경로, **fallback 없음**. ordinary Pi 업그레이드만으로 experimental app을 공급하지 않는다 | `[읽음 docs/durable-native-support.md § Contact and installation @80d66f4]` |
| 배달 경계 | durable `wakeMode: self-fetch`, **D2**; 다른 여섯 backend D6 | `[읽음 pi/entwurf-capabilities.json @80d66f4]` |
| native contact | `entwurf_self`·`peers`·`v2`·`inbox_read`·`callback`·`fresh_call` 6개. native resume verb 없음 | `[읽음 docs/durable-native-support.md·이 세션 실제 tool schema, 2026-10-08]` |
| module ingress | `--native-module <absolute file>` **하나**, fresh·continue 모두 허용. ESM 초기화 완료 뒤 TUI/runtime import, contact 뒤 default native object 설치. cwd·identity mistake guard; sandbox 아님 | `[읽음 bootstrap.mjs·docs/durable-native-support.md @80d66f4; 이 집 seam tests]` |
| local reopen | `--continue` = 현재 cwd의 최신 저장 세션, garden-id 지정 아님. provider/model/width/bootstrap은 fresh-only, module은 매번 다시 명시 | `[읽음 bootstrap.mjs:299-349 @80d66f4]` |
| 이 집 소비자 | `pi-durable/{env.mjs,dotenv.mjs}` + API-0 tests. ordinary `pi-extensions/` 두 구현은 무변경. module/SDK 설치 framework·shell 실행·fresh-call 전파 없음 | `[읽음 이 집 diff; tests 15/15; 위 실제 파일·재개 영수증]` |

### README·실행 예제가 레퍼런스의 일부다

[pi-durable/README.md](pi-durable/README.md)에 native object·top-level 순서·보호 키·기존 빈 값 우선·home-only·Pi 파서 의미·읽기 실패·증거 범위를 모았다. 루트 README·AGENTS·ENV-SETUP의 **현재** 0.30/0.31 source-only·D0 안내는 이 계약으로 맞췄다. 날짜가 붙은 오래된 관측은 그대로다.

루트 README의 `pdt`/`pds`/`pdc`는 최초 생성 medium/high와 cwd-local 재개를 가른다. **`pdt`에도 같은 모듈을 붙인다** — effort만 바꿨는데 env 정책까지 빠지는 예제를 만들지 않는다. 모델 effort는 `gpt-6.1-sol:medium`/`:high`의 suffix다. `--continue`가 「추가 인자 0」이라는 옛 주석은 현재 사실이 아니다; `--native-module`은 허용된다. 두 번 Ctrl+C라는 0.31.0 관측은 0.32.0 exit 보증으로 복사하지 않았다. live `.bashrc.local`·운영 env·durable 프로세스에는 이번 문서 작업이 쓰지 않았다.

### 열어 둔 경계

- 실제 same-id 재개와 bash 자식의 숨김은 위 영수증의 범위에서 닫혔다. bridge 전체 env·각 주입 값의 운영 의미·분기 routing은 미측정이다.
- D2를 crash/recovery·exactly-once 수용으로 올리지 않는다. 벤더 모델 턴·native admission을 이번 API-0 테스트가 대신하지 않는다.
- 기억축은 여전히 [andenken#15](https://github.com/junghan0611/andenken/issues/15) Q1–Q7 판정·착지 뒤 소비한다. live DB(RO 포함)는 열지 않았다. prompt에 스킬이 실제 주입되는 모양·durable store mtime의 관측 효용은 별도 실물 관측 과제로 남긴다.
