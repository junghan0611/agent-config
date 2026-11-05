# NEXT — agent-config

> **2026-11-05 22:40 전체 기억 증분·Oracle 동기화 종료.** 소넷 실행 원문을12d가 읽고 인수했다. 추가 운영·유료 호출·검수·수선·commit/push는 자동 시작하지 않는다.

# RAIL — 현재 좌표

- [x] **4. 양쪽 v2026.11.5 태그·GitHub Release** — 기존 태그/출하 원문 보존, Oracle 완료 dated 보충은 원래 cut 본문을 보존해 추가.
- [x] **5–6. Oracle FTS 완성본 인계·운영 적용** — 현지 15:07:48–15:08:07 원자교체 인수. 초기10518행/ae55 완성 세대와 이후 정상 증분 세대는 별개다. prev·사고본 보존.
- [x] **7. 새 Sonnet 소비시험·429 수선·정상 전체 증분** — 세션117940/가든11256/OpenClaw10623, 양쪽4096d·검수·게시 완료. 6봇 clean, sup✓4행 백업 후 정리, retained932 보존. 스킬만으로 끝난 것이 아니라 보충·수선 후 guided 운영으로 종료.
- [ ] **8. 이 집 push 후 Oracle 최종 정렬** ← CURRENT: GLG가 `pi/settings.json`+NEXT 커밋·푸시를 명시 요청. 모델참조 gpt-6.1-terra·테마 두 키 제거로 JSON 유효형태를 유지한다. Andenken `e5165eccbaf37136ddfeb3dd189f13431dec454b`는 양host commit/ff·clean0/0·태그불변 완료(877/Oracle6f eec664 영수증). 이 집 최종SHA를6f에보내 ff-only 영수증으로닫는다.

현재 좌표: 출하·Oracle FTS 적용 → 수선·3축 정상 증분과 양쪽 검수 완료 → **대기**.

# NOW — 다음 한 걸음

- Next: **승인된 두 파일만 정상commit/push·도장→Oracle6f exactSHA ff-only 정렬**. Andenken push·도장은선완료,Emacs단일writer슬롯해제. Source reference 변경이지 live Pi 설정·theme/실행서비스 변경은아니다. reset/stash/discard/mergecommit·태그변경·새batch/배포0. Git 최종확인은실origin/main·양host HEAD/clean과6f회신으로닫고,추가완료문서커밋루프를만들지않는다. 최종 완료 **DM980 전달완료**(12d,pi-durable/gpt). 같은 완료사건 재통지·형제 중복 DM0.
- Read: `.agent-reports/20261105-skill-usability-sonnet/CLOSEOUT.md`와 `LAUNCH.json`; 실운영 원문 `~/.private-work/precheck-20261105/`의 D/E/F 로그.
- Source: Andenken 429수선 source7+NEXT는 `e5165eccbaf37136ddfeb3dd189f13431dec454b`로 정상출하·Oracle ff완료. 이 집은기존 `4276bf5b5ad0cd3f8f6ae8e3949ad98ae4e84ebf` 뒤설정참조/책갈피를이번커밋으로마감한다. 정상hooks/직렬도장만,새tag/release0.
- Preserve: 원문/annex·closed durable snapshot·retention932·prune backup·oldDB/prev/사고본. reset/rollback/강제 reclaim/락삭제/전역설정·install/restart0. Source writer와 운영 executor는 종료·대기.

# RECENT — 최종 인수

- **Sessions:** 노트북/Oracle117940unique·4096d·orphan0. 정상 global1회(D1), corpus `f4d0fc727eed34da3919edf45543695f3773d43a` receive/역로그 merge·pairedindex 게시·E원격verify 완료. 새 live tail/새 durable snapshot을 추격해 이 완료 단계를 다시 열지 않는다.
- **Garden:** 노트북/Oracle11256unique·4096d·orphan0, notes9eaab562a clean 동일. 마지막 파일은 기존 MD namespace batch8을 한 child에만 적용해45chunks/6HTTP allok. source/env파일·model/dim·전역설정 변경0. local payload estimate0이며 cheap status의 mtime-only suspect1은 별도 표시 관측; 재임베딩 사유로 자동 승격하지 않는다.
- **OpenClaw:** 정상 upstream bbot/glg/mini 각1회 후 설정된6봇 clean/valid; claude는 비설정·0행 예외. 1522 exported/1339 written/183 unchanged(순증 행 수 아님), sup✓4행만 live recheck2/2 후 백업·삭제. 최종10623unique/4096d·local/Oracle requiredFTS 검수·게시 exit0. source 경로는 harvest host라 OpenClaw orphan0은 인증하지 않는다.
- **FTS 경계:** 양쪽 indexed9284/unindexed1339/native query ok/`openclaw-fts-required v1: healthy`. `openclaw-fts.ts`의 의도된 건강성 기준은 index 존재+native query 성공이며, 통계/전행 coverage는 bar 밖이다. 완전색인·새1339행 전행 lexical coverage로 표현하지 않는다. 기존 index가 있으므로 bootstrap은 no-op; replacement/compact를 추가 실행하지 않았다.
- **보존/자원:** retained932 불변. prune backup `data/openclaw-prune/2026-11-05T13-40-04-957Z-20261105T133839Z-627369-5838b3/`에 whole-vector rows/receipt 보존. free 표본 thinkpad13GiB/Oracle9.3GiB. 물리20files만으로 compact 필요성을 만들지 않았다.
- **비용:** C1실패 당시 runsummary 없었으므로 실제 총비용 unknown. D1 reported prompt1486688, 추정 약$0.013/실청구 unknown. MD마지막 reported prompt45861. OpenClaw upstream CLI는 call/cost 미보고로 unknown; 중앙 harvest API0와 구분. loaded bot/Pi SDK·semantic/hybrid ranking·전행 coverage는 미검증.

# LEDGER — 수선·출처

- 최초 소비자 Sonnet `20261105T155504-96956d`, 코디/검수12d `20261007T104525-12d0ca`; Andenken owner877 `20261015T113054-877f91`, source author Opus583 `20261015T214249-583c57`; Oracle6f `20261008T084123-6f5c09`.
- C1의429실패는31성공·archive efc1096f를 보존하고 게시를 차단했다. Source의 모든4xx nonRetryable 분류 때문에 sessions429 복구가 없었고, 오류 뒤 summary가 출력되지 않았다. 정상 실패·중단과 근본 quota 원인을 구분한다. 잔액$6는 GLG 관측; TPM/day/provider 원인과 실제 청구액은 미판정.
- 수선은 sessions HTTP-size slice의 유한429 rescheduler, bounded/redacted 진단, sessions/MD finalization summary. MD자체retry는 불변. 5 caller시도≠5 HTTP; 이미 admit된 call의5xx retry는 계속될 수 있다. strict wire stop/whole-body deadline/subfile 영속resume는 주장하지 않는다.
- Owner acceptance `~/.local/state/andenken/investigations/20261105T171007-retry429.7y30w9/OWNER-ACCEPTANCE.md`; source7핀 aggregate `2e076d696418afe326a3157cb75b5e90e3abbe5b51f155cf856d23b8fd6f4b3d`. 두 type gate와34case/0fail·post불변 인수. 앞 두 launcher/env admission 중단 원문은 별도 보존. 실제 D1은429=0이라 live429 회복을 검증했다고 하지 않는다.
- 스킬 소비시험의 REPORT/EXPANDED와 소넷 중단/재개 원문은 보존. retry/local fallback 표현 충돌·무조건 compact 예제·stale archive 안내·암묵 설정·pre-gather 비용 한계 등의 정합은 미수선 후속이며 이번에 한꺼번에 바꾸지 않았다.
- 이전 FTS 생산/출하/인계 원문: `.agent-reports/20261105-openclaw-fts-production/`; 영속 운영 출처 `docs/storage.md` 15:16절. Oracle prev `data/openclaw.lance.prev-20261105T060748Z-ac9e55`·사고본 유지. 초기 ae55/10518과 이번10623행의 세대/증거를 섞지 않는다.
