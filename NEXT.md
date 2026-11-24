# NEXT — agent-config

## RAIL — Cyborg 정본 이관 (2026-11-25)

1. **데이터 배치 완료:** 업무/COS, `repos/gh`(`memex-kb` 포함), `sync`/Org 체크섬 확인. `~/nixos-config` 링크·Home Manager tmux 확인. Syncthing 등록은 GLG 몫. 프로젝트별 비밀 설정과 USB에만 있는 자료는 아직 미대조.
2. **개발 환경 마감:** Pi·Claude·Codex 설치, Entwurf **소비자판** 0.62.0/core PASS. 새 Cyborg 세션만 시작. 로그인 및 Codex 최초 훅 승인 GLG 몫. full의 `lifetract` 자정 의존 테스트 2건 남음; `browser-tools` 의존성 설치 및 합성 5건 통과(실브라우저 미검증), `gog` 설치·인증 별개. 시스템 switch 미실행.
3. **CURRENT — 아카이브 정본과 실행 기기를 Cyborg에서 확정:** 격리본은 laptop 원본과 전송 검증 통과. 기존 매니페스트 3,942건 중 3,783건 일치, 159건은 원본부터 annex 포인터만 있음(Oracle 125, ThinkPad 34). 포인터는 본문 아님. USB·Oracle 등에서 해시가 맞는 본문을 회수하고 집계 이후 누락을 대조한다. 원래 기기별 경로 유지, Cyborg를 실행 기기로 지정하되 옛 기기 레이블은 바꾸지 않는다.
4. **다음 한 수:** Andenken authority 스킬로 Cyborg에서 기기 판별·gather 입력/대상·annex 원격/객체 소유권·비용 추정을 API-0으로 확인한다. Git/annex는 기존 이력·객체를 재연결할 수 있는지 먼저 검증하고, 곧장 재초기화하거나 옛 매니페스트를 덮어쓰지 않는다. 회수되지 않은 포인터는 별도 누락으로 기록하고 승인된 범위만 사용한다. 검증이 끝나면 Cyborg를 단일 작업 정본으로 지정하고, 기존 사본은 보존용으로만 구분한다. 사본 삭제는 별도 판단. 활성 세션 복원/재개 없음, 유료 임베딩·Oracle 게시 별도 승인.

- **`pass` 복구 완료:** 절차는 `nixos-config/docs/new-pc-migration.md`에 인계했다.

---

# RAIL — 현재 좌표

- [ ] **1. OpenClaw 생산 지연의 실효 정책 확인** ← CURRENT: 확대검수 원문 `EXPANDED-RESULT.md` 인수·DM1181 완료. 11/17 10:04/10:35 readonly 관측에서 bbot/mini 새파일이 색인에 없고 revision 변화0; 원인·실제 eligibility/mount 일치는U. GLG 요청으로 Oracle6f가 nixos-config 측 정책/trigger/hotfix를 검토하도록 ddb597 요청(운영 수선 승인 아님).
- [x] **2. 최소 API-0 관측** — 정상readonly집계2회·기존자료대조완료. SQLite read-mark부작용가능성명시. copy실험의원본hash불변은관측했으나kernel격리계약은미달이다. 최적화/토크나이저결과를적격production근거나보장으로승격하지않는다.
- [x] **3. 실제 질문의 검색 유용성** — 초기10개+확대22개query로FTS/vector/hybrid/strict·related분리. 4agent회수관측,조사형·긴꼬리miss남음. 확대817provider보고tokens/재시도0,실청구미확인. 일반적합격판정아님·운영reindex0.

## 닫힌 11/16 운영 좌표 — 재실행 대상 아님

- [x] **1. 과거 세션 B 후보 구축·기본 검수** — 구축 당시 범위와 비용·제외 경계는 CHANGELOG `v2026.11.16` 참조. 릴리즈 뒤 실제 채택은 아래3/4에서 완료했다.
- [x] **2. 교체 도구 구현·격리 검증·독립 리뷰** — 최종 generation `30a1741b…c67192`, 격리300/0·경계24/24. 코드 검토 마감이지 production 실행 인증은 아니다.
- [x] **3. 노트북 실사용 채택** — 16:50 실제 check/apply/native verify/inspect 전부0, unique133711/dim4096/dup0/orphan0·adopted-verified. 코디가 실행 원문을 읽어 인수(`G5-ACCEPTED.md`); 옛 DB·메타 보존, warm held.
- [x] **4. Oracle 실제 채택** — 17:35 check/apply/nativeverify/inspect 전부0·133711/4096/dup0/orphan0·adopted-verified, 양쪽4메타sha동일. 원문 직접 인수(`G9-ACCEPTED.md`); 옛 Oracle DB·원메타 보존, 강제종료·재시작0.
- [x] **5. OpenClaw 반영·Oracle 게시** — 17:51 import(seen10171/imported10164, API0, runId `20261116T084211Z-1429275-3116e6`), 17:53 `sync:openclaw:oracle --require-fts` rc0: 양쪽 11312 unique/4096/FTS healthy(indexed1047·unindexed10265·native query ok). 사전 보존: laptop `retained/20261116-openclaw-before`, Oracle 같은 경로 listsha `03757349…`/135파일. 영수증 `evidence-sonnet/oc-{pre,import,publish}.log`, `oc-publish-pre.txt`.
- [x] **6. G8 정상운영 복귀** — 17:55:02 holder(PID1279987/startTicks94552650/lock dev59 ino258/pane %85) fresh 확인 → 17:55:12 SIGTERM 1회 rc0, pid 소멸, lock 파일 보존·`flock -n` probe rc0. 9a515e 독립 재관측. 영수증 `evidence-sonnet/g8-release.log` (sha `a24d6706…8362c`). 해제 시점 post-adoption 쓰기 0(live ino12345954, 메타4 불변).

# NOW — 다음 한 걸음

- **다음 한 수:** Oracle6f의 정책 검토 회신을 받아 bbot/mini의 의도된 eligibility·watch mount·lazy manager/trigger와 실제 지연을 구분한다. 재검수/강제 reindex/서비스 restart부터 하지 않는다. f41·877·444 확대 실무는 마감했고 새 실험은 중단 상태다. 11.4 gpt 새행은 관측됐으므로 전체 생산 동결로 판정하지 않는다.
- **닫힌 확대 검수:** `.agent-reports/20261117-openclaw-producer-quality/{FINAL-E2E,EXPANDED-RESULT}.md`가 원문. 초기10질문은유리한서지장르였고,추가22질문은한query embedding을FTS/vector/hybrid에재사용했다. KEPT/SAID·4agent의회수와항목별leg보완을관측했지만조사형·긴꼬리miss가남았다. 일반적합격/문서-query정렬전체인증아님. 확대22calls/817보고tokens/재시도0·env단가약$0.0000082,실청구미확인. 시간표시는index/update time으로additive수선했고기존updated_at키/검색정책/DBschema는유지;owner877이최종3파일source diff와worker회귀영수증을맡는다. 이번GLG요청은양쪽commit/push이며배포·새운영수선은별도다.
- **복사 실험 경계:** 원본contenthash전후불변은관측했으나unshare-rn/env-i/pathguard만으로production경로·credentials가숨겨지거나kernelRO가되지는않았다. 요청한격리계약미달(deviation),실험결과는한정진단으로만보존한다. 6.45s→0.055s는첫openwarmup이섞인표본관측이며production속도보장아님. 적격재실험·생산optimize/FTS변경은새격리/범위GO가필요하다. 원문·DB·보존사본삭제0,강제임베딩/재시작0.
- **11/16 닫힌 배치:** 이번 세션 범위(B 후보 → 노트북·Oracle sessions 채택 → OpenClaw import·게시 → G8)는 닫혔다. 수동 증분·gather·`--global`·유료 호출은 실행 0. Sessions reversal 창은 합의된 계약대로 G8 warm 해제(17:55)에 이미 닫혔다. 다음 Pi 세션의 local warm은 새 행을 추가할 수 있으며, 되돌리기는 GLG 결정의 별도 수동 작업이다. 11/16 완료는 다음 유료 증분의 범위·비용 승인까지 뜻하지 않는다. 이후 sync/`--global`은 기존 authority·요청 범위를 따르며, 새 파서·정책 또는 미확인 backlog의 첫 사용은 전체 작업량·비용 확인과 GLG 수락이 별도다. Git 반영 여부는 GLG 결정. 후속은 아래 OpenClaw 남은 경계와 보존물 정리 판단.
- **동결:** `.agent-reports/20261116-authority-first-use/adoption/generation.json` SHA **`30a1741b6f19252d75d503393e69ae3e7b662ded4467636aa7ba04a5eac67192`**. 옛 `2343aa2d…` 사용 금지. `TEMP-FIX-RESULT.md`·`TEMP-FIX-CLOSURE.md`·`AMENDMENT-RESULT.md`가 코드/운영 원문이다.
- **닫힌 sessions 실행:** G5/G9 양쪽 check→apply→nativeverify→inspect는 이미 끝났으므로 재실행하지 않는다. Oracle실행세대SHA `fe04c17c3d1b81fa7e5df8680e8bf3e18f67a21a71ff0c3fa84d34dc99cb8ba6`. FreshCLI 검수는133711/4096/dup0/orphan0이며 full FTS/semantic·장수cachedreader는인증하지않았다. PID1461537/a30dda 상관은 owner resume영수증에대한68bd94보고를6f에게상속했고, 개인hold 자기보고도교환전도착했다. 전호스트census/FD폐쇄증명아님.
- **실패:** source/input/생산 메타 drift·busy/stale·용량·검수 오류는 즉시 중단. 자동 rollback·resume·KEPT lock 삭제/회수 금지. 원문·annex·기존 DB·후보 증거·옛 checkpoint를 보존한다. 노트북과Oracle 실제 실행 영수증을 모두 인수했다.
- **warm 복귀:** 공유 warm hold는 G8에서 해제됐다(위 6). lock 파일 `/run/user/1000/session-memory-warm.lock`(ino258)은 보존했고, 다시 일반 warm 경로가 쓴다. tmux pane %85는 dead pane으로 남아 있고 닫지 않았다. 첫 warm 증분의 대상은 오늘 P3 gather 이후 새 세션분으로 작을 것으로 보지만 미측정이다. 파서·정책을 또 바꾸면 memory-sync SKILL의 첫 사용 비용 gate가 그대로 적용된다.
- **후보/입력:** 원래target `~/.local/state/andenken/candidates/20261116-control-v1-b`의 dataset은 양쪽live로 이동했고 root4메타/형제location record만 남아 있다(build resume 금지). Code `71e77ca`, corpus `cdc320a5`, plan SHA `467d1474…ec147b`. `B-measure.json`·`post-B-freeze.txt`가 행수/manifest/메타 바인딩 정본이다. 이 동결 세대의 원문 증거는 재작성하지 않는다. 정상 복귀 뒤의 증분/gather는 기존 authority·비용 규칙을 따르는 다음 세대 작업이다. 이미 입수된 closed durable103행만 포함했으며 live SQLite를 수집하지 않았다.
- **OpenClaw 남은 경계:** 11/16의 v2026.11.3 import·게시는 완료(위 5). 당시 status는 unknown(CLI offline ownership 거절, `memory.status`는 쓰기 init 경로라 호출0)이었고 identity/dirty/coverage/semantic 품질은 미확인, prune 보류로 v5+v6 중복을 보존했다. 당시 FTS indexed1047/unindexed10265·native health query 통과는 tail 전체 BM25 coverage 증명이 아니다. 11/17 GLG가 Oracle OpenClaw 11.4 업그레이드를 보고했으며, 새 버전의 상태/CLI/RPC/FTS는 아직 검수하지 않았다. 옛 거절·쓰기 경로 판정을 11.4 현행 사실로 재사용하지 않는다. prune/compact/FTS 재색인·upstream index·Gateway 정지는 별도 요청. `OPENCLAW-AUDIT.md`·`adoption/OPENCLAW-APPLY-REVIEW.md`는11/16판독 원문이다.
- **보존물(삭제 0):** laptop/Oracle `retained/20261116-control-v1-b-before`(옛 sessions DB·원메타·journal), `retained/20261116-openclaw-before`(양쪽 옛 openclaw.lance; watermark·staging은 authority 사본에만 포함), 후보 root 4메타 + location record, `evidence-sonnet/`, corpus 원본·annex. 정리·삭제는 별도 GLG 요청. 새 install/build/restart·원본 삭제·추가 sibling/retire 없음.

# READ — 다음 세션의 원문

- `.agent-reports/20261116-authority-first-use/`: `G5-ACTUAL-GO.md`(최신 승인), `G5-PREPARATION-GO.md`(이전 준비 한정), `B-BUILD-RESULT.md`, `adoption/TEMP-FIX-CLOSURE.md`, `evidence-sonnet/`의 명령·검수·freeze 원문. Host-local/private이며 공개 릴리즈에 첨부하지 않는다.
- Andenken `NEXT.md`와 authority `.claude/skills/andenken-embed/SKILL.md`; 이 집 `skills/memory-sync/SKILL.md`는 얇은 소비자 포인터다.
- 닫힌11/9 운영 원문은 `.agent-reports/20261109-two-lanes/CLOSEOUT.md`와 `~/.private-work/precheck-20261109/`. 오늘 후보와 과거 양host 운영 완료를 섞지 않는다. 이력은 CHANGELOG와 Git에 남겼다.
