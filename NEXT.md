# NEXT — agent-config

> GLG 외출 지시로 작업 중단. 양쪽 정리·커밋·푸시만 마무리하고, 재개 지시 전 추가 실행하지 않는다.

# RAIL — 현재 좌표

- [ ] **1. OpenClaw 런처 단순화** ← CURRENT: 읽기 도어의 pnpm을 기존 `node --import tsx`로 바꾸는 최소안 검토. 아직 미구현.
- [ ] **2. 로컬 검수 완료** — 격리 G0/G1 인수 → FTS G2·필요 회귀 → 교차 검토.
- [ ] **3. 운영 FTS 반영** — 로컬 검수 통과 후 노트북 FTS 생성·검증 → Oracle 안전 게시·readiness 확인.

현재 좌표: 1의 설계 판단 전 중단 → 2·3 미완료.

# NOW — 다음에 할 것만

1. Andenken의 `run.sh verify openclaw`와 `fts:openclaw --check/--protocol`을 이미 writer에서 쓰는 Node 런처로 실행하는 최소안을 검토한다. 명령·옵션·출력·권한·잠금 계약은 유지한다. 불필요해진 pnpm 시험 설정·양성 통제는 실제 런처 기준으로 정리한다. 다른 트랙까지 확대하지 않는다.
2. 기존 로컬 deps 변이 가능성을 읽기로 확인한다(현재 미측정). 정적 검사도 설치 매니저 대신 기존 TypeScript CLI를 Node로 실행하는 방향을 검토한다. 새 설치·버전 변경은 하지 않는다.
3. 정확한 수정본 정적 검토 후 격리 검증을 한정 실행한다. 통과 영수증 인수 후에만 FTS 기능 fixture와 필요한 회귀를 돌리고 frozen diff 교차 검토로 닫는다.
4. 그 뒤에만 노트북의 기존 벡터로 FTS를 만들고, 완성 DB/index를 Oracle에 안전 게시·검증한다. Git checkpoint push는 운영 배포가 아니다.

## 재개 근거·경계

- Andenken 기준 체크포인트 `a898b4d` 이후 격리 수선은 미완료다. 최신 run3은 **exit11 / 34pass·1FAIL / G2 미실행**: 격리 내부 pnpm install 자식이 읽기 전용 경로 쓰기에 실패했다. 전체 G1 통과로 취급하지 않는다.
- Oracle 검색 데이터는 복구 완료 상태다. 복구 영속 기록은 `docs/storage.md`; 반복 복구·FTS 생성은 지금 하지 않는다.
- 다음 읽을 곳: Andenken `NEXT.md`; private `.agent-reports/20261104-fts-incident/HANDOFF.md`와 `OPUS754-ISOLATION-REVIEW.md`; 로그 `~/.local/state/andenken/investigations/20261104-openclaw-fts/barrier-run3.log`.
- 역할: 12d 총괄,877 Andenken owner,583 단일 구현,754 교차 검토. 재개 후에도 장벽 전 active/G2·미감사 suite·실 Oracle 음성 시험·자동 수선 재시도는 금지한다.
- 새 설치·전역 설정·재임베딩/유료 query·상류/다른 DB·원문/annex/oldDB 삭제·재시작·tag/release는 별도다.
