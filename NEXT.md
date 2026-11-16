# NEXT — agent-config

# RAIL — 현재 좌표

- [x] **1. 과거 세션 B 후보 구축·기본 검수** — 구축 당시 범위와 비용·제외 경계는 CHANGELOG `v2026.11.16` 참조. 릴리즈 뒤 실제 채택은 아래3/4에서 완료했다.
- [x] **2. 교체 도구 구현·격리 검증·독립 리뷰** — 최종 generation `30a1741b…c67192`, 격리300/0·경계24/24. 코드 검토 마감이지 production 실행 인증은 아니다.
- [x] **3. 노트북 실사용 채택** — 16:50 실제 check/apply/native verify/inspect 전부0, unique133711/dim4096/dup0/orphan0·adopted-verified. 코디가 실행 원문을 읽어 인수(`G5-ACCEPTED.md`); 옛 DB·메타 보존, warm held.
- [x] **4. Oracle 실제 채택** — 17:35 check/apply/nativeverify/inspect 전부0·133711/4096/dup0/orphan0·adopted-verified, 양쪽4메타sha동일. 원문 직접 인수(`G9-ACCEPTED.md`); 옛 Oracle DB·원메타 보존, 강제종료·재시작0.
- [x] **5. OpenClaw 반영·Oracle 게시** — 17:51 import(seen10171/imported10164, API0, runId `20261116T084211Z-1429275-3116e6`), 17:53 `sync:openclaw:oracle --require-fts` rc0: 양쪽 11312 unique/4096/FTS healthy(indexed1047·unindexed10265·native query ok). 사전 보존: laptop `retained/20261116-openclaw-before`, Oracle 같은 경로 listsha `03757349…`/135파일. 영수증 `evidence-sonnet/oc-{pre,import,publish}.log`, `oc-publish-pre.txt`.
- [x] **6. G8 정상운영 복귀** — 17:55:02 holder(PID1279987/startTicks94552650/lock dev59 ino258/pane %85) fresh 확인 → 17:55:12 SIGTERM 1회 rc0, pid 소멸, lock 파일 보존·`flock -n` probe rc0. 9a515e 독립 재관측. 영수증 `evidence-sonnet/g8-release.log` (sha `a24d6706…8362c`). 해제 시점 post-adoption 쓰기 0(live ino12345954, 메타4 불변).

# NOW — 다음 한 걸음

- **다음 한 수:** 이번 세션 범위(B 후보 → 노트북·Oracle sessions 채택 → OpenClaw import·게시 → G8)는 닫혔다. 수동 증분·gather·`--global`·유료 호출은 실행 0. Sessions reversal 창은 합의된 계약대로 G8 warm 해제(17:55)에 이미 닫혔다. 다음 Pi 세션의 local warm은 새 행을 추가할 수 있으며, 되돌리기는 GLG 결정의 별도 수동 작업이다. 11/16 완료는 다음 유료 증분의 범위·비용 승인까지 뜻하지 않는다. 이후 sync/`--global`은 기존 authority·요청 범위를 따르며, 새 파서·정책 또는 미확인 backlog의 첫 사용은 전체 작업량·비용 확인과 GLG 수락이 별도다. Git 반영 여부는 GLG 결정. 후속은 아래 OpenClaw 남은 경계와 보존물 정리 판단.
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
