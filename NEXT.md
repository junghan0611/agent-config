# NEXT — agent-config

> 2026-11-05 GLG가 **양쪽 태그/GitHub Release와 Oracle 코디의 운영 진행**을 승인했다. 노트북 FTS 완료 이력은 CHANGELOG `v2026.11.5`와 `docs/storage.md`로 옮겼다. Oracle 운영은 그쪽 agent-config6f가 Andenken 코디와 진행하고,12d는 릴리즈·검수본/완성 DB·원문 영수증 제공을 맡는다.

# RAIL — 현재 좌표

- [ ] **4. 양쪽 태그/GitHub Release** ← CURRENT: 이 집12d·Andenken877이 각 `v2026.11.5` 컷을 준비한다. 정상 commit·preflight·main/tag push·GitHub Release·repo별 도장까지 닫는다.
- [ ] **5. Oracle 코디에 실행권·완성본 인계** — remote-pair로6f에게 GLG 위임을 보냈고 상대 host accepted를 받았다. 실제 인수/수신 경로 회신을 받고 release SHA/URL과 고정 DB packet을 private로만 보낸다.
- [ ] **6. Oracle 호환 적용·필수 검증** — Oracle6f→그쪽 Andenken 코디가 실행.12d의 직접 원격 운영/중복 실행0,완료 영수증 전 PASS 주장0.

현재 좌표: 준비·노트북 운영 FTS 완료 → 양쪽 release 출하·Oracle 실행 인계 중. 재bootstrap 불필요.

# NOW — 다음 한 걸음

1. 릴리즈는 tag-release/commit 스킬을 따른다. 이 집 baseline `v2026.11.3` 이후8커밋과 닫힌 NEXT를 갈무리했다. hook 추가내용 회귀·release extractor·Bash 문법과 문서 일관성을 API0로 확인하고, source/tag/GitHub Release/agenda 영수증을 보존한다. 새 설치·미감사 전체 suite·데이터 재검수0.
2. Oracle 코디 `20261008T084123-6f5c09`의 현재 인수·0700 수신 경로를 확인한다. 노트북 canonical 잠금 안 완성 DB의 독립 snapshot/전체hash와 허용 목록의 운영 원문만 packet으로 만들고 private staging으로 전달한다. 키/env·Git·node_modules/native·원본 코퍼스·사고 영향본은 넣지 않으며 remote production 경로에 직접 덮지 않는다.
3. Oracle6f가 호환 release source를 먼저 맞춘 뒤, 그쪽 Andenken 코디와 잠금·현재 baseline/자원·stage 전체hash·기존 DB 보존·안전 교체·required healthy·native 양성 readback을 닫는다. Oracle에서 bootstrap/import/reindex나 authority override0. `sync:openclaw:oracle`의 producer 권한을 Oracle에서 우회하지 말고 고정 authority snapshot의 출처와 필수검증 계약을 유지한다.

## 재개 근거·경계

- 운영 원문: private `.agent-reports/20261105-openclaw-fts-production/{RECEIPT.json,CLOSEOUT.md,COORDINATOR-AUDIT.json,BEFORE.json,AFTER.json}` 및 stage/network/resource logs. BG18015 exit0/6s,10,518행/4096d·id/text 전체digest·12row/vector payload SHA 불변,FTS 생성/required healthy·native lexical 양성3건/API0. 독립 원본 backup도 보존한다.
- 완성 DB:25files/407694904B,manifest `ae55b9949e01353ea4a9aa57672d9e374646d33b70caf290ab4ed1bf4eff4216`. 빌드 code `4ac84bb`/Andenken 인수 `8cf6a2c`; release prep 이후 source3 bytes는 그대로다.
- 준비 원문: `.agent-reports/20261105-oracle-return/` 및 `~/.local/state/andenken/fixture-runs/20261105T124908-openclaw-fts.m9qxyd/`. 타입0·G1 38/0·full156/0은 합성 검수이며 운영/실검색/coverage 인증과 다르다.
- Oracle 운영 source는 인계 전 마지막 관측 `db9dff9`다. 호환 source 적용 전 옛 pnpm 도어로 ‘확인만’ probe0. 현재 healthy·세대·여유는 그쪽에서 새로 측정한다.
- Oracle 영향본·원문/annex/oldDB/외장 cold copy는 보존. 실패·busy·변경된 baseline·미지원은 중지,자동 retry/rollback/delete0.
- 유료 query·전체 memory batch·추가 임베딩·상류 SQLite·설치/전역설정·재시작은 범위 밖. 정상 batch의 pnpm 잔존 경로와 loaded reader/Pi/hybrid 품질도 이번 컷으로 인증하지 않는다.
- 알림:12d는 양쪽 release·인계 완료를1회 DM,Oracle6f는 그쪽 운영 최종완료/결정 blocker를 별도1회 소유.877/7fa/583/ac9 중복 DM·Oracle 중복 release stamp0.
