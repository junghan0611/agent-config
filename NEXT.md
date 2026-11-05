# NEXT — agent-config

> 2026-11-05 GLG가 전체 그림을 Andenken 코디에게 전달하도록 명시했고 **커밋 후 진행 GO**를 줬다. 검수 source commit→노트북 운영 FTS 생성·검증으로 진행한다. Git push는 별도 명시가 없어 보류, Oracle 반영은 로컬 운영 인수·소스 호환·게시 권한 정렬 뒤.

# RAIL — 현재 좌표

- [x] **1. Oracle 수선본 노트북 인수** — 정상 checkout 3파일 적용, FROZEN byte-exact/CP3 SHA 일치.
- [x] **2. 노트북 x64 준비 검수** — 기존/전용test 타입 오류0, G1 38/0, full156/0, 최종 frozen 교차 리뷰 blocker없음/추가 회귀없음.
- [ ] **3. source 확정·운영 FTS 반영** ← CURRENT: source `4ac84bb` 정상4파일 commit/clean 인수.12d 단독으로 운영계약·원본보존·canonical락·API0 예산대조 후 노트북 FTS 생성·검증. Git push/Oracle 게시 gate는 뒤에서 정렬.

현재 좌표: 소스 인수·타입·ARM/x64 합성 검수·source commit 완료 → 노트북 운영 FTS 준비 → push·Oracle 호환·게시 gate 별도.

# NOW — 다음에 할 것만

1. **source commit `4ac84bb7e0c8a5beae1173f66619da725a67db42`**를13:31 직접 `gitlog/show/hash/status`로 인수했다. source3+owner NEXT 정확4파일,source3SHA 불변/clean/upstream보다1앞. 정상hook원문은 owner→583 회신 대기,Git push는 명시 승인 전0.
2. **승인된 노트북 운영 FTS**를12d가 단독 실행한다. source commit receipt→원본 독립 백업/전체hash→canonical락·4CPU이하·여유5GiB이상→기존 text/vector로 생성·required verify. 재임베딩·일반 전체 memory batch는 별도다.
3. Oracle 운영 checkout은 아직 `db9dff9`의 옛 pnpm 읽기 도어이므로, 검수한 source의 호환 반영을 먼저 닫고 완성 DB/index를 안전 게시·readiness 확인한다. 유료 실검색 검증은 별도 승인 범위다.

## 재개 근거·경계

- 원천: private `.agent-reports/20261105-oracle-return/{LAPTOP-ACCEPTANCE.md,LOCAL-X64-G2-CHECK.json,FINAL-G2.md,RESULTS.md,PACKET-VERIFICATION.json,FROZEN-3.diff}`.
- 오늘 타입 원천: `~/.local/state/andenken/investigations/20261105T123019-phaseA.MG2uEE/phaseB/`. G1 RUN `20261105T124350-openclaw-fts.LKyQLp`,full RUN `20261105T124908-openclaw-fts.m9qxyd`는 `~/.local/state/andenken/fixture-runs/` 아래 보존.
- full156은 G1active38+G2runtime110/static8이다. 76case,15CALLS·rsync7 모두fixture.invalid,실native0.40.0/x64 한 개·SHA7cac6b9f… 일치. 실검색recall·순위·운영FTS·배포 인증은 아니다.
- 메타데이터 digest와1초 자원 표본은 전체내용hash/hardcap이 아니다. launcher 미발화 거절 분기·E1/E2/E3·baseline이전deps불변unknown을 유지한다. 실패·미지원 무조건 재시도/자동 정리 금지.
- `sync:openclaw` reconcile·다른정상verify의pnpm/일반memorybatch·broadtestchain은 별도 운영 gate다. 이번 준비PASS로 인증하지 않는다.
- 역할: 12d 총괄·유일DM,877 Andenken owner가 실무583 직접 호출·지시,754는12d의 교차 리뷰. Oracle6f/7fa는 증거 보존·병렬 작업 대기.
- Oracle 검색 데이터는 어제10518행/4096d로 복구했고 사고 영향본을 양쪽에 보존했다(`docs/storage.md`). 오늘 추가 복구·생산DB open·FTS 생성은 하지 않았다.
- 새설치·전역 설정·상류/다른DB·원문/annex/oldDB삭제·재시작·tag/release·전체임베딩은 별도. 추가 회귀·고위험 suite는 자동 실행하지 않는다.
