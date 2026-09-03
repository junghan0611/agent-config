# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

# RAIL — 현재 좌표

- [x] **1. 세션 코퍼스 읽기면 착지** — 두 스킬이 device-merged 코퍼스를 읽는다 (`0b01f00`, `v2026.9.2`)
- [ ] **2. 그 변경의 검수** ← CURRENT: fixture(`01d518e`) · 실검수(`15e2385`) · 골든 반영(`df49e79`) → **남은 건 형제 공지뿐**
- [ ] **3. entwurf-peek `trace` 파서 수선** ← PAUSED: `mux-placement` acceptance fixture 대기
- [ ] **4. 설치면 소유 경계 마감 (#46)** ← PAUSED: entwurf `setup`이 먼저 normalize해야 한다

현재 좌표: 1 완료 → **2 진행** → 3·4 보류

# NOW

- **Hot group:** 세션 코퍼스 (아래 [2026-09-02])
- **Next:** 형제 공지. 검수·문서는 닫혔고(`b3d8d01`까지 푸시됨) **공지 창도 열렸다.**
  문서면 자체는 이미 공지다 — `AGENTS.md § device 축`을 모든 형제가 읽는다.
  남은 건 GLG가 직접 부를 브로드캐스트뿐이라 여기서 일방 발신하지 않는다.
- **Blocker:** 없음. 순서 게이트가 풀렸다 — 오라클이 `v2026.9.3`(`501cfe8`)로 올라와
  인덱싱 가드가 실렸다 (확인 2026-09-03 06:15, `ssh oracle git log -1` + `describe --tags`,
  `ANDENKEN_ALLOW_REPLICA_INDEX` 2회 출현). 즉 "오라클에서 `sync:sessions`/`/memory-sync`를
  부르지 않는다"는 **더 이상 유일한 방어가 아니다** — 스크립트가 막고, gather는 마친 뒤
  인덱싱만 거절한다(andenken 담당자가 오라클에서 실행 확인). 공지에 이 사실을 넣어도 된다:
  실수로 불러도 코퍼스는 포크되지 않는다.
- **Read:** 아래 [2026-09-02] 섹션, `AGENTS.md § semantic-memory → andenken`의 device 축 문단,
  참조 구현은 andenken `session-corpus.test.ts`.
- **Do not touch:** `~/repos/gh/session`은 git이 아니다(`MANIFEST.sha256`으로 검증되는 데이터 폴더,
  `.jsonl`은 발화 정본이라 읽기만). 수집기와 편입 기준은 andenken 소유.
  `git-hooks/gitleaks.toml`의 접두 룰은 **미결로 기록만** 했다 — 고치라는 지시가 없었다.

# ACTIVE

## dictcli Layer 3 — 부채까지 닫았다. 남은 건 마운트 제거 한 줄 (아래 [2026-09-03])
- Current: 봇 위치 GREEN. 그리고 **portable 아티팩트가 착지했다** — dictcli `4a3afd6`
  (담당자 pi/codex, push+도장 완료). 번들도 교체했다: `skills/dictcli/dictcli` 는 이제
  portable 본(interp `/lib/ld-linux-aarch64.so.1`, RUNPATH 0). 호스트·컨테이너 양쪽
  `["harness"]` exit 0 재확인(2026-09-03).
- Next: **없다. 닫혔다.** 마운트 두 줄이 제거됐고 10:36 recreate 후 마운트 없는 상태로
  실측 GREEN — 컨테이너 `/nix/store` 에 qqx8w6hd·rrd22q5c **부재**, 봇 위치
  `expand "하네스"` → `["harness"]` exit 0, 검색 stderr `not found` 0줄(우리가 따로 잼).
- Watch: **skew 부채 소멸.** 이제 dictcli를 재빌드해도 compose가 깨지지 않는다.
- Own: **dictcli 배포 운영은 우리 것으로 명시했다** (GLG 2026-09-03). 로직·graph는 dictcli
  담당자, 회수 품질은 andenken 담당자, **기기별 굽기·배포는 여기.** GraalVM이라 크로스
  컴파일이 없고(oracle aarch64 / thinkpad x86_64) 조용히 깨지거나 조용히 낡는다.
  `doctor_bins`가 셋을 본다: 표준 loader 부재(재빌드로 안 고쳐짐 — host 본으로 교체) ·
  배포 신선도 · graph.edn 세트 어긋남. 절차는 `.claude/skills/agent-config/SKILL.md § dictcli`.
- Next(기기): **thinkpad에 아직 안 날랐다.** 거기서 `./run.sh setup:build` 를 처음 칠 때
  nix-ld 유무에 따라 `standard loader missing` 이 뜰 수 있다 — 미확인. 뜨면 host 본으로 교체.
- Do not: 번들을 host 본으로 되돌리지 마라 — nix-ld(`/lib/ld-linux-aarch64.so.1` →
  `nix-ld-2.0.6`) 덕에 portable 본이 NixOS 호스트에서도 돈다(오라클 실측). 단
  **nix-ld 없는 NixOS 기기에서는 죽는다** — thinkpad 미확인. 거기서 깨지면 dictcli
  `target/dictcli-aarch64`(host 본)로 갈아끼우는 게 답이다.

## 세션 코퍼스 — 검수 (아래 [2026-09-02])
- Current: fixture 닫힘(`01d518e`, recap 17→22 / extract 8→12). 남은 건 골든뿐이다.
- Verify: 세 규칙은 변이 테스트로 이빨을 확인했다 — 동률 사전순 / `corpus_devices` 디렉터리 필터 /
  라이브 ∪ 코퍼스, 각각을 지우면 정확히 새 테스트 하나가 빨개진다.

## entwurf-peek — `trace`만 남았다 (아래 [2026-08-07] · [2026-08-06])
- Current: `situation`은 `0259f19`로 착지, entwurf #64가 caller-side projection으로 승인.
- Next: nonce → callback sender-envelope 상관으로 파서 교체. **임의 샘플 금지** —
  fixture는 `mux-placement` acceptance 산출물만.
- Do not: 현재 구현을 다시 뜯어고치지 말 것.

## 턴 시각 — Claude Code 쪽 (아래 [2026-08-25])
- Current: pi 푸터는 `df0df60`으로 닫혔다. Claude Code 쪽은 목표와 설계만 적혀 있다.
- Next: 훅이 찍고 statusline은 읽기만 — 공용 `turns.tsv`가 핵심. entwurf 렌더면은 건드리지 않는다.

## Hermes — 재지 않았다 (아래 [2026-08-06] Hermes)
- Current: `setup:hermes`는 설치면이다. 매트릭스는 `HERMES.md`.
- Next: D1(스킬 자동 생성 관측). 곁가지로 A5(plugin.yaml 범위), B1(대안 레일 한 턴).

## 설치면 소유 경계 — #46 (아래 [2026-07-13])
- Current: agy lane은 2026-08-13에 닫혔다. `pi/settings.json`·`pi/settings.server.json`의
  entwurf package + repo-path provider 잔존이 남았다.
- Next: **entwurf `setup`을 먼저** 돌려 bare `entwurf-bridge`로 normalize한 뒤 이쪽을 뺀다.

# DORMANT

- [2026-07-30] **Solar Open 2** — 계정 승인 대기. 트래킹 issue #17. 승인되면 한 줄로 찍힌다.
- [2026-07-14] **dictcli provenance 공백** — GraalVM native-image라 `go_build`를 안 탄다.
  oracle(aarch64)에 GraalVM이 있는지 확인이 선행.
- [2026-05-29] **pi-chat Add-group** — setup TUI가 즉시 닫힌다. 재현 명령은 아래 섹션에.
- [2026-07-02] **gogcli 재인증** — 선택. 남은 건 optional 커맨드뿐.
- [2026-07-14] **어쏠로그 7/13 근거 회수** — 수선할 때 원석과 근거를 별도 축으로.
- [2026-06-11] ⚠️ **bibcli 이주 계획** — 2026-07-14 결정과 방향이 반대다. GLG 재판단 대기.

> 방향(시험소·승격 파이프라인)은 `ROADMAP.md [2026-06-30]`. 닫힌 일은 `CHANGELOG.md`.

## [2026-09-03] dictcli — 봇 위치에서 살렸다. 그런데 회수는 안 올랐다.

> andenken#11(소비자축 검수)에서 nixos-config 담당자가 남긴 잔여를 받아 닫았다.
> 프로비저닝 nixos-config#9 · 품질 andenken#12.

**고친 것.** 컨테이너에서 `./dictcli: not found`(exit 127)가 매 검색마다 찍히고 있었다.
번들 바이너리가 nix 빌드 ELF라 인터프리터가 `/nix/store/qqx8w6hd…-glibc-2.40-218/…/ld-linux-aarch64.so.1`.
RUNPATH store 최상위는 **2개**(위 glibc + `rrd22q5c…-gcc-14.3.0-lib`) — 인터프리터 하나만 넣으면
로더는 뜨고 라이브러리에서 다시 죽는다.

처방은 재빌드도 patchelf도 아니었다. `~/openclaw/docker-compose.yml`이 **emacs를 위해 이미
nix store 경로를 개별 ro bind로 박아두고 있었다**(주석까지: "근본안은 +/nix/store:ro").
같은 목록에 두 줄 추가로 끝났다. andenken 코드 0줄, dictcli 재빌드 0회.

두 전제가 틀렸고 그게 처방을 바꿨다 — ① "컨테이너에 `/nix/store`가 없다" → 있다(emacs 4경로).
② "컨테이너 glibc 2.36 vs 빌드 2.40 심볼 문제" → 무관하다. 로더도 libc도 마운트된 nix 경로에서
온다. Debian glibc는 이 프로세스가 건드리지 않는다.

**안 오른 것.** recreate 후 컨테이너 안에서 골든셋 33행(session 10 + md 23)을 3회 돌렸다:

| 실행 | 결과 |
|---|---|
| `golden-queries.ts --compare` (topScore Δ) | 📈 3 · ➡️ 26 · 📉 4 |
| 기본 (expand 켬) | **31/33 passed** (session 9/10 · md 22/23) |
| `--no-expand` | **31/33 passed** — 동일 |

실패 2건도 같은 두 개(`피투성` md, `남은 작업 뭐지` session)이고 **둘 다 `expanded=[]`** —
dictcli가 손대지 않는 쿼리다. 즉 **이 골든셋에서 확장의 이득은 0**이다. "Layer 3가 0이라
회수가 깎이고 있다"는 손실 가설은 지지되지 않았다. 고친 건 실제로 고쳤지만 얻은 회수는 0이다.

그리고 최대 변화가 **하락**이고, 하필 골든셋이 대표 사례로 지목한 것이다
(`golden-queries.ts:103` — "paideia/universalism — dictcli expand가 영어 태그로 확장해야"):

```
📉 "보편 학문"  1.0713 → 0.8858  expanded 9개
📈 "하이데거 존재론"  0.9661 → 0.9927  expanded 1개 [ontology]
```

가설(미검증): 확장어를 원 질의에 이어붙이면 dense 임베딩에서 원 질의가 희석된다. 그렇다면
다음 작업은 "확장을 살린다"가 아니라 **"폭을 제한한다"**(top-N 컷, 또는 확장어를 BM25
경로에만 주고 dense는 원 질의 유지). andenken#12에 셋 다 적어뒀다.

**측정 한계를 같이 적는다.** `--compare`는 topScore Δ만 보고, 두 트랙의 점수 스케일이
다르다(session ~0.06 / md ~1.0). 그래서 결론은 pass/fail 쪽에 뒀다. 골든셋 33행이
크로스링귀얼 사례를 충분히 덮는지는 **안 쟀다** — "상향 0"은 *이 골든셋에서* 0이라는 뜻이다.

**협업 기록.** nixos-config 담당자와 entwurf로 6왕복. 세션 도중 GLM-5.3 쿼터 소진 →
grok-4.6 인수. 우리 쪽 실측이 상대의 두 전제를 뒤집었고, 상대 쪽 compose·recreate가
우리 검증을 가능하게 했다 — 어느 쪽도 혼자서는 못 닫았다.

**그리고 부채까지 닫혔다.** dictcli 담당자(pi/codex, `~/repos/gh/dictcli`)를 열어 FHS
아티팩트를 맡겼고 한 시간 안에 끝났다 — `4a3afd6`. host 본(nix store interp, gcroot 유지)과
portable 본(표준 loader, RUNPATH 제거)을 매 빌드마다 2벌 굽고, `portable-test` 가
`debian:bookworm-slim` 에서 정확 비교한다.

**(B)는 불가능으로 확정됐고, 옛 주석이 틀렸다.** `run.sh` 는 "NixOS aarch64에 musl-gcc
툴체인이 없다"고 적어뒀지만, 툴체인은 nixos-26.05에 있었다(GCC 15.2.0 aarch64 static).
막은 것은 GraalVM 25.0.2 자체 — `lib/static/linux-aarch64/musl` 의 java/nio/net static
library 부재로 `Building images on LINUX_AARCH64 (target libc: musl) is not supported`.
주석은 그 실측으로 정정됐다. **왜 안 되는지의 receipt가 되게 만든 것보다 오래 남는다.**

**내가 찾은 사실 하나가 설계를 줄였다.** 스킬 트리의 `dictcli` 는 호스트 에이전트와 컨테이너
봇이 **같은 파일 하나**를 본다. "번들을 portable로 갈면 NixOS 호스트가 깨지니 wrapper가
필요하다"가 다음 걱정이었는데, 이 기기에 nix-ld가 있어 표준 loader 경로가 이미 존재한다
(`/lib/ld-linux-aarch64.so.1` → `nix-ld-2.0.6`). **한 벌로 양쪽을 덮는다** — wrapper도
환경별 분기도 `~/openclaw/bin` 별도 SSOT(gog 전례)도 필요 없다.

**GPT 봇의 독립 검증이 확장 가설을 좁혔다** (andenken#10 · GPT 봇 → #12에 반영).
고유어를 뺀 긴 한국어 질의에서 `expanded: ["salvation","saving","rescueing"]` — **3개뿐인데
해롭다.** 즉 축이 둘이다: 폭(개수)과 질(무관성). 단순 top-N 컷은 절반만 푼다. 확장어를
BM25 경로에만 주는 안이 두 축을 동시에 무해화한다. 짧은 개념어(`하네스 엔지니어링` →
`["harness"]`)에서는 깨끗하다는 것도 같은 보고에 있다 — **끄는 문제가 아니라 언제 켜는지다.**

같은 보고가 우리 문서 결함도 하나 짚었다: `semantic-memory` SKILL.md가 `memory-sync` 를
CLI 하위 명령처럼 안내하는데 실제 CLI 표면은
`search-sessions|search-md|search-knowledge|status|reindex` 뿐이라 `Unknown command` 가
난다(봇 위치에서 재현). CLI 하위 명령과 형제 스킬을 문서에서 갈랐다.

그리고 봇이 제안한 세 품질축 중 **우리 몫 하나를 반영했다**: "1차 추상 → 후보 읽기 →
2차 구체"를 SKILL.md 운영 규칙 5번으로 승격(규칙 여덟 → 아홉). 지금까지는 AGENTS.md에만
있었고 스킬 문서에는 규칙 8의 꼬리 문장으로만 걸려 있었다. 규칙 4("다시 묻지 말고 열어라")와
충돌해 보이므로 그 경계를 명시했다 — **같은 추상어로 다시 묻지 마라, 1차가 가르쳐준 고유어로는
다시 물어라.** 나머지 둘(OpenClaw 코퍼스 연결, 오확장 억제)은 각각 nixos-config NEXT와
andenken#12에 있고 우리 착수 대상이 아니다.

## [2026-09-02] 세션 코퍼스 — 고쳤고, 검수는 아직 안 했다

> `0b01f00`으로 `session-recap`과 `improve-agent`가 세션 코퍼스(`ANDENKEN_SESSION_CORPUS`
> → `~/repos/gh/session`)를 읽는다. 계약·측정·판단 근거는 커밋 본문과
> `AGENTS.md § semantic-memory → andenken`의 device 축 문단에 있다. 여기 남는 건
> **검수와 공지**뿐이다.

**왜 남겨두는가:** 에이전트가 쓰는 표면을 바꿨다. 나중에 형제들이 "왜 다른 기계 세션이
보이지?", "`[claude@oracle]`이 뭐냐"고 물어볼 것이고, 그때 우리가 답할 수 있어야 한다.
검수 없이 답하면 그 답이 또 추측이 된다.

**막힌 데가 아니라 안 한 것 — 지금 사실:**

- ~~새 코드에 테스트가 0줄이다~~ — 닫힘(`01d518e`). 당시 측정 2026-09-02:
  `grep -c "corpus\|device" skills/session-recap/scripts/test-session-recap.py` → **0**,
  `skills/improve-agent/test_extract.py` → **0**. 기존 테스트는 통과한다(recap 17/17,
  extract 8/8) — 그러나 그건 코퍼스가 없던 시절의 계약만 지킨다. `corpus_root` /
  `corpus_devices` / `dedupe_by_basename` / device 라벨 / `resolve_session_file`의 코퍼스
  루트 수용 — 전부 미검증이다. **라이브 실측만 있고 fixture가 없다**(측정치는 커밋 본문).
- **andenken 재구축이 아직 안 끝났다** (2026-09-02 18시 기준 300/1592). 2K 절단 폐기로
  색인 본문이 두 배(chars 61.6M)가 됐고, 세션 축 recency decay도 껐다. 검색의 성격이
  달라졌다면 `skills/semantic-memory/SKILL.md`의 기대치 문구가 그걸 반영해야 한다.
  **지금은 손댈 근거가 없다 — 수치가 없다.**

**다음 한 걸음 (순서대로):**

0. ~~라이브 코퍼스 실검수~~ **완료 (`15e2385`, 2026-09-03).** 재구축 끝난 코퍼스를 상대로
   fresh reader가 실제로 돌려봤고 결함 2건이 나왔다 — 둘 다 fixture로는 안 잡히는 종류다.
   - **stale env로 코퍼스가 조용히 꺼진다.** env는 로그인 때 한 번 캡처되므로 09-02 17:09에
     `~/.env.local`에 추가된 줄을 그 전에 뜬 세션·데몬·에이전트는 영영 못 본다(실측: 이 셸에
     다른 `ANDENKEN_SESSION_*`는 다 있고 CORPUS만 없었다). 색인 경로는 1,609/1,609가 코퍼스
     경로라(`andenken/data/session-manifest.json` 실독, oracle 1,017 / thinkpad 592)
     `semantic-memory` → `--session-file` 이음매가 **전부** 거부됐다. 이제 변수가 env에
     *없을 때만* `.env.local`에서 그 키 하나를 읽는다. 빈 값 명시는 라이브 전용 탈출구로
     유지 — 단 **읽기면 한정**이다. `sync-sessions.sh`도 같은 폴백을 갖고 있지만 `-z`로
     검사해 빈 값을 미설정으로 본다(확인 2026-09-03). 같은 변수, 빈 문자열 해석 두 가지.
   - **`--device`가 기본 `--skip 1`에 최신 세션을 뺏겼다.** 현재 세션은 라이브라 device가
     없어 필터에 안 걸리므로, skip이 남의 기기 진짜 최신을 대신 버린다(실측: `--device oracle`이
     09-02T19:08 `69f08580`을 통째로 떨궜다). `--device`는 이제 `--skip 0`을 함의한다.
   - recap 22→27 / extract 12→14, 변이 확인. `--device`가 dedupe *앞*에서 걸린다는 사실
     (그래서 `--device thinkpad`는 코퍼스 사본을 가리킨다 — 실측 winning copy 라이브 2,106 /
     oracle 469 / thinkpad 0)은 SKILL.md에 기록했다.
1. ~~fixture 테스트~~ **완료 (`01d518e`, 2026-09-02).** recap 17→22 / extract 8→12, 전부 tmp
   HOME + tmp 코퍼스. env 미설정 / 실제 코퍼스 / 빈 tmp 코퍼스 세 조건에서 통과한다. 세 규칙
   (동률 사전순 · `corpus_devices` 디렉터리 필터 · 라이브 ∪ 코퍼스)은 변이 테스트로 이빨을
   확인했다. **"한 번도 안 밟힌 분기 아니냐"는 의심은 여기서 닫혔다.**
2. **골든 — andenken 재구축 완료 후.** 그쪽 `pnpm run golden`(검색 품질 회귀) 결과와
   최종 파일수·chunk수·role 분포를 받아, 우리 `semantic-memory` SKILL.md 기대치 문구를
   고칠지 판단한다. 숫자를 받기 전에 문구를 고치지 않는다.
2b. ~~골든 반영~~ **완료 (`df49e79`, 2026-09-03).** 골든 30/32. 세션 축 실패 1건은
   assertion(query-echo) 이슈, md 실패 1건은 오늘 작업과 무관(md 인덱스 미변경).
   품질 문구 세 가지를 실측으로 고쳤다 — recency decay 0(`cli.ts:255`·`index.ts:571`,
   `retriever.ts:365` 단락), chunk 밀도 75,267/1,609(최대 1,382), query-echo.
   덤으로 `memory-sync`: 증분 자체는 **device 가드가 없다**(`INDEX_AUTHORITY`는
   `push_replica` 안에서만 참조). 오라클에서 부르면 §7.1이 금지한 replica 인덱싱이
   조용히 일어났다. 보고 → andenken `ae8c5fb`가 가드를 인덱싱 진입 **앞**으로 올렸고
   (`sync-sessions.sh:118-132`, 확인), 우리 문구는 "문서 규칙"에서 "스크립트가 강제"로
   격상했다(`d5d7895`).
3. **그 다음에 공지.** 1·2가 닫히기 전에는 형제들에게 "쓰라"고 알리지 않는다.

**검증 기준:** 위 fixture 6항목이 통과하고, `ANDENKEN_SESSION_CORPUS` 유무 양쪽에서 기존
테스트(recap 17 / extract 8)가 그대로 통과할 것. 코퍼스 유무가 기존 계약을 흔들면 그게 결함이다.

**건드리지 말 것:** `~/repos/gh/session`은 git이 아니다(2026-09-02 GLG가 `.git` 삭제).
`MANIFEST.sha256`으로 검증되는 데이터 폴더이고, `.jsonl`은 발화 정본이라 읽기만 한다.
수집기(`gather-corpus.sh`)와 편입 기준은 andenken 소유다 — 여기서 고치지 않는다.

## [2026-08-25] 턴 시각 — Claude Code 쪽은 아직 안 했다 (목표만)

> **목표: 마지막으로 답한 형제가 누구인지 시각으로 안다.** pi 쪽은 `df0df60`으로 닫혔다 —
> `pi-extensions/glg-footer.ts`가 `session_start`에서 브랜치를 훑고 `message_end`로 갱신해
> 푸터에 `GLG HH:MM:SS · pi HH:MM:SS`(KST)를 찍는다. Claude Code 쪽은 **손대지 않았다.**
>
> **재료 (2026-08-25 이 세션에서 확인한 사실):**
> - `showTurnDuration`은 소요 시간(`23s`)이지 벽시계 시각이 아니다. 네이티브로 턴에 시각을
>   박는 설정은 없다 (`~/.claude/settings.json`에 현재 `false`).
> - transcript는 `~/.claude/projects/<slug>/<session-id>.jsonl`에 실시간 append되고 각 줄에
>   ISO `timestamp`가 있다 — 이 세션에서 확인:
>   `{"type":"assistant","timestamp":"2026-08-25T02:53:05.599Z"}`.
> - statusLine stdin JSON에 `session_id`가 온다 (`meta-bridge-statusline.sh:179`가 이미 쓴다).
>   `transcript_path`도 온다는 것은 **문서 근거일 뿐 아직 실측 안 했다** — 착수 시 stdin을
>   한 번 덤프해서 확인할 것.
>
> **설계 (한 번에 들어간다):** 훅이 찍고 statusline은 읽기만 한다.
> `UserPromptSubmit` / `Stop` 훅 → `~/.claude/turn-stamps/<session-id>` (세션별, statusline이
> `cat` 한 번) + `~/.claude/turn-stamps/turns.tsv` (공용 append: `ts / event / device / cwd /
> session-id`). 공용 파일이 핵심이다 — **자기 세션 푸터로는 형제 비교를 못 푼다.** pi 쪽도
> `message_end`에서 같은 tsv에 append하면 pi/Claude Code 형제가 한 축에 모인다.
>
> **경계: entwurf를 건드리지 않는다.** 현재 statusLine은
> `~/repos/gh/entwurf/scripts/meta-bridge-statusline.sh`라 렌더면을 고치려면 그 repo를 열어야
> 한다 — 이번엔 하지 않는다. 훅(이 repo/`~/.claude/hooks`)만으로 스탬프 축을 먼저 세우고,
> 렌더면은 entwurf 승인 후에 붙인다 — 이 repo가 들고 있던 미사용 사본
> `claude/statusline.sh`와 그 심링크는 2026-09-01에 제거했다(statusLine은 entwurf 소유).

## [2026-08-10] 세션 이음새 — 남은 두 실

> `v2026.8.10`으로 exact `--session-file`, UUIDv7 discovery, `/recall` 복귀 편집실을 닫았다.
> **발견(`situation`/semantic) → 주소(meta-record/path) → 회수(exact recap)**는 서로 대신하지
> 않는다. Exact selector의 filter 우회는 known-address access이지 잊힌 시민의 discovery가
> 아니다. Andenken production corpus 회복은 그 repo의 paid gate 앞에 남아 있다.
>
> **남은 실 1 — `entwurf-peek → recap`은 아직 열려 있다.** peek은 transcript 경로를 내부에서
> resolve하지만 내보내지 않는다: `peek`은 `<parent>/<name>`만 찍고 `--json`이 없으며
> (`--json`은 `situation`에만), `situation --json` row에도 transcript path가 없다. garden id를
> `--session-file` 인자로 바꿀 길이 없다. **peek을 지금 고치지 말 것** — 위 [2026-08-07]의
> "다시 뜯어고치지 말 것"이 우선이고, 이건 별도 승인 사안이다.
>
> **남은 실 2 — `기간` 의미 (non-blocking).** exact live transcript의 `기간`은 wall-clock
> min/max가 아니라 **session header start → file-order상 마지막 추출 메시지 timestamp**다.
> 외부 메시지 주입·append 중 out-of-order event로 역전돼 보일 수 있다(추출 텍스트는 정확).
> 공용 formatter를 바꾸기 전 **out-of-order fixture로 의미를 먼저 고정**한다. selector diff에서
> min/max로 고치는 것은 금지 — discovery 표시 로직 공용면이다.

## [2026-08-07] entwurf-peek `situation` 착지 — 다시 뜯어고치지 말 것

> `0259f19` (원격 작업, push 완료). garden id ↔ native session id를 **v3 meta-record로 exact
> join**하는 판단면 `situation`이 들어왔다. `test-discovery.py` 70/70 통과.
>
> 사실면이 세 층으로 갈라져 있고 그 분리가 **load-bearing**이다:
> **record(사실)** / **liveness socket mirror** / **transcript heuristic**.
> transcript owner는 backend-aware `match | mismatch | unknown | unsupported`이고,
> `unknown`을 `mismatch`나 소유 주장으로 승격하지 않는다. relative/missing/foreign/unsupported
> transcript는 **본문을 읽지 않는다**(cwd의 남의 파일을 citizen transcript로 채택하던 결함이
> 리뷰에서 잡혔다).
>
> **정책 (entwurf #64 [comment 5210382307](https://github.com/junghan0611/entwurf/issues/64#issuecomment-5210382307)):**
> caller-side research projection으로 **유지 가능**. rail §4 경계 2 때문에 per-session 진단으로
> 되돌릴 필요 없다. 단 public `entwurf_*` 표면이 아니고(`entwurf_situation` 툴 비승인),
> liveness SSOT·placement authority·dispatch·role grant·자동 선택이 아니다. 쓰이는 자리는 둘뿐:
> Phase A 전 기존 citizen 확인, exact callback 후 roster 확인. **역할은 사람이 Phase B에서 준다.**
>
> **하지 말 것:** 현재 구현을 다시 뜯어고치지 말 것. 이 코멘트는 구현 재개 지시가 아니다.
>
> **남은 실:**
> - `trace` 파서 수선 — 아래 [2026-08-06]. fixture 계약 그대로 유효.
> - store 계약 복제(`parseMetaRecordV3` 등)는 **테스트된 임시 mirror**이지 durable owner API가
>   아니다. 장기 소유권은 **entwurf #65**. #65가 owner-normalized read-only join을 내놓으면
>   그때 consumer-side 복제 제거 여부를 검토한다 — 지금 먼저 손대지 않는다.
> - rail §4 경계 2 **문구 개정은 entwurf 쪽 후속**이고 research 이후다. #62 amendment에 섞지 않는다.

## [2026-08-06] Hermes — 설치는 끝, 측정은 시작도 안 했다

> `v2026.8.6`에 `setup:hermes`가 들어갔지만(`9953f04`) 그건 **설치면**이다.
> 이 리포가 시험소인 이유는 재는 것이므로, 재지 않으면 후보로도 남지 못한다.
>
> 검수 매트릭스: **`HERMES.md`** — A(설치·격리) / B(추론 레일) / C(통신면 3종) /
> D(자기학습 루프) / E(entwurf 축, 우리 것 아님).
>
> - **기억축은 이미 다 있다.** `session_search`(SQLite FTS5, LLM 호출 0)와
>   `memory`(MEMORY.md/USER.md, always active) 둘 다 core 툴셋. extra 불필요.
>   검색 extra(`exa`)를 넣어봤다가 되돌렸다 — 웹 검색은 측정 대상이 아니고,
>   이 빌드에선 동작하지도 않는다(↓).
> - **헤르메스의 기억 검색은 키워드(FTS5)다.** 우리가 벡터 하이브리드를 쓰는
>   자리다. 그러므로 "자기개선"의 근거는 검색 품질이 아니라 스킬 생성·개선
>   루프에 있고, **D1/D2가 진짜 관측 지점**이다. D7(비교 판정)이 목적.
> - ⚠️ **이 빌드는 plugin.yaml을 하나도 설치하지 않는다** (소스 96개 → store 0개).
>   번들 플러그인 전체가 등록 불가 — 웹 프로바이더, 외부 memory provider,
>   **a2a 플랫폼**, copilot-acp. C축이 막혔고, D축이 살아 있는 이유도 이것이다
>   (core 모듈이지 플러그인이 아니라서). **A5**가 이걸 가른다.
> - 인증: `anthropic` OAuth는 **구독 쿼터 소진**(헤르메스 축 아님).
>   `copilot`/`upstage`가 자동 발견돼 있으니 그 레일로 돌린다(B1).
>   `openrouter`도 발견되지만 **쓰지 않는다** — 임베딩/이미지 전용 레일이다.
> - 경계: 우리 스킬 SSOT를 `~/.hermes/skills`에 연결하지 않는다 — 주입하면 측정
>   대상이 사라진다. `nixos-config` 선언 없음(후보이지 채택 아님).
> - E축(A2A ↔ `entwurf_v2`)은 **entwurf 소유, PM은 GPT**. 지금 전달 안 함
>   (entwurf가 mux-placement로 바쁨). 조사 결과는 `HERMES.md § E`에 보관.
>
> 다음 한 걸음: **D1(스킬 자동 생성 관측)** — 본체이고 아무것도 막지 않는다.
> 곁가지로 A5(plugin.yaml 범위), B1(대안 레일 한 턴).

## [2026-08-06] entwurf-peek 수선 — 이제 `trace` 하나만 남았다

> entwurf가 v2로 넘어오면서(0.13.1, #50 하드컷) 이 스킬이 기대던 세계가 사라졌다.
> 코드가 죽은 게 아니라 **전제가 죽었다** — `scripts/entwurf-peek.py`는 그대로 있었다.
>
> ✅ **닫힘 (`0259f19`, 위 [2026-08-07]):** 깨진 전제 1(존재 이유 문장)·2(sync/Mattering 프레이밍)는
> SKILL.md 재작성과 `situation` 착지로 해소됐다. 아래는 **전제 3 = `trace`**에만 해당한다.

**남은 깨진 전제** (`skills/entwurf-peek/SKILL.md § trace`):

3. **`trace`의 자식 매칭**이 부모 JSONL의 `Session ID: <YYYYMMDDTHHMMSS-xxxxxx>` 문자열에
   의존한다. v1 `entwurf`/`entwurf_resume`/`entwurf_send`가 하드컷으로 사라졌으니 그 문자열이
   더는 안 찍힐 가능성이 높다. `entwurf_fresh_call`은 tmux 좌표+nonce 영수증이고, 상관은
   callback sender envelope이다.

**지켜야 할 경계 (`docs/mux-launch-rail.md` §4 경계 2 — #64로 재조정됨):**
"이 스킬은 절대 자라지 못한다"가 아니라 **"각 행의 authority를 보존하는 caller-side 합성은
가능하되, dispatch·placement·role·liveness의 SSOT가 되지 못한다"**가 실제 경계다(위 [2026-08-07]).
`trace`에 대해서는 여전히 **placement 사실의 출처로 인용 금지**이고, 수선은 전제를 진실로
되돌리는 것이지 기능을 키우는 게 아니다.

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

**agy lane은 2026-08-13에 닫혔다.** `run.sh setup`의 agy settings symlink를 제거하고
소유권을 entwurf `install-agy-*`로 전량 이관했다. `antigravity/` 디렉토리는 통째로
제거했다(참조 0 확인 후 — skills 링크만 agent-config 소유로 남는다). thinkpad·oracle
양쪽에서 `doctor-agy-bridge` / `doctor-agy-statusline` / `doctor-agy-hooks` 모두 ok,
`~/.gemini/antigravity-cli/settings.json`은 regular file 유지.
(oracle은 심링크를 내용 보존한 채 실체 파일로 전환 후 두 installer 재실행.)

**닫는 순서(반드시 새 소유자 먼저):**
1. entwurf repo에서 `./run.sh setup <project>`을 실행해 live user/project provider를 bare
   `entwurf-bridge`로 normalize. `doctor-pi-provider`가 EFFECTIVE bare + state-owned인지 확인.
2. 이 repo의 두 pi settings fragment에서 entwurf package와
   `entwurfProvider.mcpServers`를 제거한다. issue 원칙대로 최종적으로
   `entwurfProvider` 블록 전체를 template에서 놓되, live operator의 기존 sibling 설정을
   삭제하지 않도록 merge/inverse 순서를 검증한다.
3. ~~agy settings~~ **완료(2026-08-13).** disjoint-key merge는 채택하지 않았다 — merge
   로직을 setup에 넣는 대신 `ensure_link` 한 줄을 제거해 소유권을 전량 넘겼다. agy가
   저장 시 심링크를 replace 하므로 링크는 애초에 유지되지 않았고, 초기값은 agy 자신 또는
   `install-agy-bridge` / `install-agy-statusline`이 만든다(없으면 create, 있으면 adopt).
4. ~~`antigravity/` 제거~~ **완료(2026-08-13).** 디렉토리 통째로 삭제.
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
