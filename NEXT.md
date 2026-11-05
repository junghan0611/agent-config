# NEXT — agent-config

> 2026-11-05 GLG가 요청한 그림 전달·로컬 커밋·노트북 운영 FTS 생성/검증을 완료했다. **BG18015 exit0/6s,10518행/4096d 보존·FTS native query 정상**. Git push는 별도 명시가 없어 보류; 다음은 양쪽 push 승인→Oracle 호환 소스·완성 DB/index required 게시.

# RAIL — 현재 좌표

- [x] **1. Oracle 수선본 노트북 인수** — 정상 checkout 3파일 적용, FROZEN byte-exact/CP3 SHA 일치.
- [x] **2. 노트북 x64 준비 검수** — 기존/전용test 타입 오류0, G1 38/0, full156/0, 최종 frozen 교차 리뷰 blocker없음/추가 회귀없음.
- [x] **3. source 확정·노트북 운영 FTS** — code `4ac84bb`/정상 hook, handoff `0cda628` commit. BG18015에서 독립 백업·FD8·CPU0–1·API0·required verify·보존검사 통과. FTS 없음→native 정상,10518/4096 불변.
- [ ] **4. Git push·Oracle 호환 반영/required 게시** ← CURRENT: 명시 push 승인 대기. 승인 후 호환 source 선행→완성 DB/index 안전 게시·readiness 확인. 유료 검색은 별도 gate.

현재 좌표: 준비·로컬 commit·노트북 FTS 성공 → Git push/Oracle 다음 gate. 재bootstrap 불필요.

# NOW — 다음에 할 것만

1. **양쪽 Git push 승인**을 확인한다. 승인 전 push/agenda0. Andenken code `4ac84bb`와 owner handoff `8cf6a2c`, 이 집 storage/NEXT commit을 정상 rail로 게시한다.877은 기존 운영 원문·manifest/network/resource 기록을 오프라인 재계산해 local-ready를 인수했고, 원본/backup의 실제 재hash는12d controller 측정임을 구분했다.
2. 승인 후 Oracle 운영 checkout의 옛 `db9dff9` pnpm 읽기 도어를 호환 source로 먼저 맞춘 뒤, **`sync:openclaw:oracle --require-fts`**의 사전 protocol·로컬 필수검증·게시·원격 healthy를 닫는다. 기본 legacy 게시로 대체0, 호환 source 전 ‘확인만’ remote probe0.
3. 재개 원문: private `.agent-reports/20261105-openclaw-fts-production/RECEIPT.json`·stage logs·BEFORE/AFTER·backup. 영속 결과와 핵심 hash는 `docs/storage.md` 2026-11-05절. 노트북25files/407694904B/manifest `ae55b9949e01353ea4a9aa57672d9e374646d33b70caf290ab4ed1bf4eff4216`. 유료 query·전체 memory batch는 별도.

## 재개 근거·경계

- 원천: private `.agent-reports/20261105-oracle-return/{LAPTOP-ACCEPTANCE.md,LOCAL-X64-G2-CHECK.json,FINAL-G2.md,RESULTS.md,PACKET-VERIFICATION.json,FROZEN-3.diff}`.
- 오늘 타입 원천: `~/.local/state/andenken/investigations/20261105T123019-phaseA.MG2uEE/phaseB/`. G1 RUN `20261105T124350-openclaw-fts.LKyQLp`,full RUN `20261105T124908-openclaw-fts.m9qxyd`는 `~/.local/state/andenken/fixture-runs/` 아래 보존.
- full156은 G1active38+G2runtime110/static8이다. 76case,15CALLS·rsync7 모두fixture.invalid,실native0.40.0/x64 한 개·SHA7cac6b9f… 일치. 실검색recall·순위·운영FTS·배포 인증은 아니다.
- 메타데이터 digest와1초 자원 표본은 전체내용hash/hardcap이 아니다. launcher 미발화 거절 분기·E1/E2/E3·baseline이전deps불변unknown을 유지한다. 실패·미지원 무조건 재시도/자동 정리 금지.
- `sync:openclaw` reconcile·다른정상verify의pnpm/일반memorybatch·broadtestchain은 별도 운영 gate다. 이번 준비PASS로 인증하지 않는다.
- 역할: 12d 총괄·유일DM,877 Andenken owner가 실무583 직접 호출·지시,754는12d의 교차 리뷰. Oracle6f/7fa는 증거 보존·병렬 작업 대기.
- Oracle 검색 데이터는 어제10518행/4096d로 복구했고 사고 영향본을 양쪽에 보존했다. 오늘은 **노트북만 FTS 생성**, Oracle 접촉0. 원본19files/0c117… 독립 backup 재hash 일치,12payload 전체파일 hash·id/text 전체 digest·watermark/receipt 불변. lexical 양성3건은 hybrid·Pi·loaded reader·전체 coverage 인증이 아니다.
- 새설치·전역 설정·상류/다른DB·원문/annex/oldDB삭제·재시작·tag/release·전체임베딩은 별도. 추가 회귀·고위험 suite는 자동 실행하지 않는다.
