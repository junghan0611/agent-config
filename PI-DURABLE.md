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
5. **native 앱의 검증면 부재** — 8파일에 테스트 배치가 없다는 것이 upstream의 experimental 선언과
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
