# NEXT — agent-config

# RAIL — 현재 좌표

- [x] **1. 요약 수집 수선·소규모 검증** — Andenken의 Pi(ACP 포함) 표준 compaction 요약 누락과 Claude Code 요약 분류를 수선. durable 기존 요약 보존. focused API-0 결과는 Opus 영수증 인수.
- [ ] **2. 양 저장소 Git 게시** ← CURRENT: GLG의 11/14 명시 승인으로 agent-config NEXT와 Andenken 수선 6파일을 정상 커밋·푸시. 결과를 Entwurf ff08d4에 전달.
- [ ] **3. 노트북 완전 전체 재임베딩 권장** — 과거 파일까지 새 파서로 다시 추출·임베딩하는 별도 실행 범위. 지금 Oracle에서 실행하지 않는다.

# NOW — 다음 한 걸음

- **권장: 노트북에서 완전 전체 재임베딩.** 이번에는 단순 전역 증분 최신화가 아니라, 변경 없는 과거 세션까지 새 파서로 재추출·재임베딩하여 Pi 요약 누락과 Claude Code 요약의 기존 `user` 분류를 보완하는 것이 목표다. 대상 하네스는 **Pi(ACP 포함)·Claude Code·pi-durable만**이며, 이미 입수된 durable 스냅샷 경계는 유지한다. 원본 삭제나 live DB 직접 수집을 뜻하지 않는다.
- **실행 전 별도 게이트:** 노트북의 코드·정책 pin·실행 경로를 확인하고, Andenken의 `andenken-embed` 권한 스킬에 따라 범위·비용을 산정한 뒤 GLG의 비용 승인을 받는다. `control-v1` pinned 데이터에 legacy `--force`를 밀어 넣지 않는다. 후보 빌드 등 적합한 재처리 경로는 Andenken 담당자와 확정한다. 이 권장은 지금의 유료 실행·재처리 승인이 아니다.
- 일반 증분은 변경 없는 과거 파일을 다시 읽지 않아 수선 전후 행이 공존할 수 있다. **전체 재임베딩이 유일한 복구 수단이라는 뜻은 아니며**, 이번에는 GLG가 요청한 권장 경로로 남긴다. Garden/OpenClaw 전체 최신화도 함께 수행할 경우 세션의 완전 재처리와 구분하고 각 축의 검증·게시 영수증을 받는다.
- CLI sync는 소스 변경을 사용하지만 Pi의 excerpt 확장은 새 `dist/` 빌드·로드가 필요하다. 노트북 설치·실제 로더와 restart/reload 방식은 미검증이다. Oracle 설치·재시작·DB/원문 변경·전체 임베딩은 하지 않는다.
- 이번 수선은 **감량이 아니라 누락 회복·분류 정정**이다. 반복 요약 사본 제거·최신 요약만 보존·원문 대체는 미채택. CC transcript window는 기존 표시 계약 때문에 `user` 라벨을 유지한다.
- Read: `.agent-reports/20261114-summary-selection/NEXT.md`; Andenken `session-indexer.ts`, `session-excerpt.ts`, `session-window.ts`와 대응 테스트. 공개 Git에는 코드·이 NEXT만 싣고 host-local 영수증은 로컬 인계에서 확인한다.

---

> **2026-11-09 두 형제 작업 종료·Git 마감.** Opus754의 이식 경계 수선과 Sonnet969의 증분·Oracle 동기화는 원문 인수 완료. GLG가 수선4파일+NEXT 커밋·푸시를 명시 승인했다. 이후 새 실행·검수·배포는 자동 시작하지 않는다.

# LEDGER — 11/9 이전 좌표

- [x] **4–8. 이전 FTS 출하·운영·Git 마감** — 11/5 전체 증분과 양repo Oracle ff, 11/8 session-recall 로컬 제거·`1c5b893` push/도장 완료. 이전 영수증은 아래 참조.
- [x] **9. 11/9 이식 경계 수선·새 증분** — Opus754의 합성 옛 설치 감지/안내·nonzero 수선 동결. 세션118191/가든11240/OpenClaw10824 양host4096·검수/게시 완료. 6봇 clean, sup✓84 백업 후 정리, retained932 보존.
- [ ] **10. 후속 검토 종료·GLG 새 범위 대기** ← CURRENT: Sonnet FTS-tail 조사완료. 기존LanceDB0.40 defaultquery는unindexed도검색하고fastSearch()만제외;실store는그옵션미사용。소스/SDK문서·합성canary 원문을12d가직접read인수。1675라는통계만으로검색누락·즉시재생성필요를주장하지않음。실전행coverage/latency/ranking은미측정,production조작0。수선4파일+NEXT는이번승인된Gitworkflow로마감하며추가범위는새요청대기.

현재 좌표: glgdot 이식 경계 신고 → 형제 수선/검수·오늘3축 동기화 완료 → **대기**.

## 11/9 종료 시점

- Next: **당시 종료 기록 — 새 GLG 요청 대기**. `~/.private-work/FTS-TAIL-20261109/{FTS-TAIL-REPORT.md,S3-synthetic.log,tail-probe.mjs}`와store.ts803–875/설치query.d.ts225–232 직접대조완료。기본경로는fake unindexed3의ASCII/한글·교체newtoken검색/oldtoken제외,fastSearch는tail제외、temp optimize후그fastquery도hit관측。진짜1675행·필터조합·score/perf/loadedreader검증아님。현재근거로prod optimize/replace/재임베딩하지않고종료。기존운영완료DM996은별개완료알림/중복0. 오늘수선은정상commit/push·후push도장으로닫으며이후새작업은시작하지않는다.
- Read: `.agent-reports/20261109-two-lanes/CLOSEOUT.md`; 오늘 임베딩 원문 `~/.private-work/precheck-20261109/{G,H,J}*.log`. Opus 원문은 전달받은 tool_result 위치/인용과 source diff로 구분하며 test 재실행/직접 JSONL 읽기0.
- Source: agent-config base `1c5b893`. Opus 변경은 `run.sh`, `docs/pi-extensions.md`, `pi-extensions/tests/pi-packages-smoke.py`, 새 `pi-extensions/tests/retired-pi-packages.test.sh`. NEXT는 코디 소유. Andenken e5165ec·기존 수선7핀/코드 clean은 Sonnet의 오늘 관측이다.
- Do not touch: 원문/annex·closed snapshot·보존 archive·prune backup·oldDB/prev·사고본. 이번5파일Git마감외 추가commitpush·Oracle code/프로필배포·자동package제거·setup/install/restart·production새batch·broadtest/실API·새형제/임의resume0. FTS최소합성fixture의temp쓰기만예외이며실데이터복사·수선은없다. notes rootNEXT의 타인 변경1개는 content밖/HEADe90a91 불변으로 관측·보존했다.
- 팀 주소: GLG 직접 지정 오푸스 `20261024T115350-754cad`(현재 Opus5.5 자기보고), 소넷 `20261105T155504-96956d`(현재 Sonnet5.5 자기보고). owner receiver=active로 이번 인계 전에 확인. team.json은 이 집에 없고 생성하지 않았다. 다음 생존은 새 owner facts로 확인하며 이 책갈피가 실행 권한은 아니다.

# RECENT — 오늘 종료 근거

- **수선 B:** 빈 지원목록이 옛 등록을 제거하지 않는 경계를 숨기지 않는다. string/object 등록·compat 잔존을 read-only 감지→정확한 `pi remove …`/`setup:links` 안내→관련 setup 도어 nonzero. 사용자 소유 설정/패키지는 자동 삭제하지 않는다. 전체setup aggregate 경로는 정적 wiring 검토만 했다.
- **회귀 증거:** Opus 측정 회신 b661d9/549a9f: 합성8케이스×2·smoke거절3 통과, 옛1c5b893에서 red rc1. green/red 별도 파일은 없고 비공개 Claude tool_result에 남음. 12d는 실제 diff/test source를 직접 읽었지만 실행 결과는 Opus 측정 인수이며 재실행하지 않았다. 실HOME/Pi loader/Oracle 제거는 검증하지 않았다.
- **Sessions:** 양쪽118191unique/4096/orphan0, source3168files. 44files·3160처리chunks는 순증+165와 다르다. corpus `8f9471554d378c89d65f6ee931c4bd87fba12687` 정상checkpoint1회·Oracle archive41keys수신/역로그/pairedindex 게시와 원격verify 완료.
- **Garden:** 양쪽11240unique/4096/orphan0, source2241files. notes9eaab→e90a91을 Oracle에서 ff-only로 먼저 맞춘 뒤 MD게시/검수. batch8/concurrency1은 이번 child 한정이다. cheapmtime suspect12를 payloadpending12로 인증하지 않는다.
- **OpenClaw:** upstream bbot/glg/mini각1회 후 J2 새 live export에서 configured6봇 valid/clean, claude0은 비설정 예외. 1751exported/1568written/183unchanged(순증이 아님). sup✓84(glg80/mini4)를 live recheck2/2·whole-vector backup 후10908→10824로 정리. retained932 불변. 양쪽 requiredFTS 검수/게시 exit0; source경로는 harvest host라 orphan0은 인증하지 않는다.
- **FTS/자원:** 양쪽 indexed9149/unindexed1675/native query ok/required-v1 healthy. 건강성 bar는 index+nativequery이며 전행coverage는 바깥이다. fully-indexed/새tail전행lexical·ranking·loadedSDK 인증0. compact는 물리29files만으로 실행하지 않았다. free 표본 thinkpad25GiB/Oracle8.1GiB.
- **한계:** J1 identity의 agent별 즉시 live재측정은 성공하지 않았고 H4 10:04snapshot 재사용이었다. 최종 J2는 새 live board로 확인했다. 이를 소급 검증하려고 추가 실행하지 않으며 다음에는 cached report와 live status를 구분한다.
- **비용:** 중앙 sessions 약$0.012+MD 약$0.001은 제출입력 추정, reportedprompt는 각각1367248/91256, probe1call은 process통계 밖이다. 실제 청구액·upstream CLI calls/cost는unknown. 오늘429/추가retry0. 이전11/5 성과를 합산하지 않았다.

# LEDGER — 보존 링크

- 오늘 prune backup: `data/openclaw-prune/2026-11-09T01-12-46-705Z-20261109T011033Z-1182064-2f2b16/`의 rows/receipt.
- 11/5 인수/Git: `.agent-reports/20261105-skill-usability-sonnet/{CLOSEOUT,GIT-CLOSEOUT}.md`, LAUNCH.json. 당시 agent-config a81b341/Andenken e5165ec 양host clean·기존tag불변. 이후11/8 제거는1c5b893으로 별도 push/도장.
- 초기 FTS 생산·전송·원자교체: `.agent-reports/20261105-openclaw-fts-production/`, `docs/storage.md`15:16절. 초기 ae55/10518과 오늘10824 세대의 증거를 섞지 않는다. Oracle prev/사고본과 원본·annex는 삭제 대상이 아니다.
