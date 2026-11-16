# NEXT — agent-config

# RAIL — 현재 좌표

- [x] **1. 과거 세션 B 후보 구축·기본 검수** — 완료 범위와 비용·제외 경계는 CHANGELOG `v2026.11.16` 참조. 실제 검색 DB는 아직 옛 세대다.
- [x] **2. 교체 도구 구현·격리 검증·독립 리뷰** — 최종 generation `30a1741b…c67192`, 격리300/0·경계24/24. 코드 검토 마감이지 production 실행 인증은 아니다.
- [ ] **3. 노트북 실사용 채택** ← CURRENT: GLG의 G5 one-run 승인 대기(DM1166). 오늘 태그 릴리즈 요청은 데이터 교체 승인이 아니다.
- [ ] **4. Oracle·OpenClaw·가든 후속** ← PAUSED: 별도 적용·게시 범위와 안전 게이트를 정한 뒤 단일 실행자로 진행.

# NOW — 다음 한 걸음

- **다음 한 수:** G5 승인이 오면 기존 단일 Sonnet에게 아래 동결 세대와 한정 순서를 라우팅한다. 주소는 각 집의 gitignored `team.json`; 실행 직전 owner의 현재 liveness를 확인한다. Opus 둘은 준비·리뷰 담당이며 현재 생산 작업은 하지 않는다.
- **동결:** `.agent-reports/20261116-authority-first-use/adoption/generation.json` SHA **`30a1741b6f19252d75d503393e69ae3e7b662ded4467636aa7ba04a5eac67192`**. 옛 `2343aa2d…` 사용 금지. `TEMP-FIX-RESULT.md`·`TEMP-FIX-CLOSURE.md`·`AMENDMENT-RESULT.md`가 코드/운영 원문이다.
- **승인할 실행:** CPU0–1, 동일 창에서 외부 hold와 writer0 조건으로 **check0 → apply0 → `./run.sh verify sessions` 1회 → inspect `adopted-verified`**. Native 기대값은 unique133711/dim4096/dup0/orphan0. Check도 락·owner preflight·후보 lock·rename probe를 쓰므로 승인 전 호출하지 않는다. Native verify는 provider HTTP 없이 sessions만 열지만, 락 비대상·native 내부쓰기 미확인·FTS 판정 없음의 한계를 유지한다.
- **실패:** source/input/생산 메타 drift·busy/stale·용량·검수 오류는 즉시 중단. 자동 rollback·resume·KEPT lock 삭제/회수 금지. 원문·annex·기존 DB·후보 증거·옛 checkpoint를 보존한다. 실제 production check/apply/inspect/native verify는 아직0이다.
- **warm 보류 유지:** 공유 warm lock의 기록은 `LAUNCH.json`(holder PID/startTicks/inode/window)에 있다. 같은 환경/path/inode의 자동 warm만 막으며 다른 환경·직접 CLI·옛 loaded writer 전체의 fence가 아니다. 재기동 뒤 살아 있다고 추정하지 않는다. Source 확인 없이 lock 파일을 지우거나 재생성하지 않는다. 수동 sync·durable index·gather/admit·모든 `--global`도 현재 보류다.
- **후보/입력:** target `~/.local/state/andenken/candidates/20261116-control-v1-b`, code `71e77ca`, corpus `cdc320a5`, plan SHA `467d1474…ec147b`. `B-measure.json`·`post-B-freeze.txt`가 행수/manifest/메타 바인딩 정본이다. 이후 gather/admit나 재처리로 세대를 바꾸지 않는다. 이미 입수된 closed durable103행만 포함했으며 live SQLite를 수집하지 않았다.
- **OpenClaw 남은 경계:** export snapshot6봇/10163행은 Qwen3-8B/4096/v6였고 형식 검수를 통과했다. CLI status는 offline ownership 거절, live `memory.status`는 쓰기 초기화 경로여서 호출0이다. Identity-valid/dirty/mem-lag·원문 총coverage/semantic 품질은 미확인. Import·watermark 갱신·prune·upstream index·Gateway 정지·Oracle 게시를 하지 않았다. 단순히 다시 전량 임베딩하지 말고 `OPENCLAW-AUDIT.md`와 `gateway-door-source-receipt.md`부터 읽는다.
- **승인 분리:** G5는 노트북 교체만이다. Oracle archive 수신/역로그→staged DB+정책/양 manifest 게시, loaded runtime 재적재, warm 해제와 새 행 이후 reversal 창 종료, OpenClaw 적용, 가든 증분, cleanup은 각각 범위 확인이 필요하다. 새 install/build/restart·추가 paid call·원본 삭제·추가 sibling/retire 권한은 없다.

# READ — 다음 세션의 원문

- `.agent-reports/20261116-authority-first-use/`: `G5-PREPARATION-GO.md`, `B-BUILD-RESULT.md`, `adoption/TEMP-FIX-CLOSURE.md`, `evidence-sonnet/`의 명령·검수·freeze 원문. Host-local/private이며 공개 릴리즈에 첨부하지 않는다.
- Andenken `NEXT.md`와 authority `.claude/skills/andenken-embed/SKILL.md`; 이 집 `skills/memory-sync/SKILL.md`는 얇은 소비자 포인터다.
- 닫힌11/9 운영 원문은 `.agent-reports/20261109-two-lanes/CLOSEOUT.md`와 `~/.private-work/precheck-20261109/`. 오늘 후보와 과거 양host 운영 완료를 섞지 않는다. 이력은 CHANGELOG와 Git에 남겼다.
