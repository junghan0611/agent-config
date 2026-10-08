# NEXT — agent-config

> Volatile next-step anchor. Longer-running tracks belong in `ROADMAP.md`.
> Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

# RAIL — 현재 좌표

- [ ] **3. entwurf-peek `trace` 파서 수선** ← PAUSED: `mux-placement` acceptance fixture 대기
- [ ] **4. 설치면 소유 경계 마감 (#46)** ← PAUSED: entwurf `setup`이 먼저 normalize해야 한다
- [ ] **10. 다음 텀 — 이슈 넷 검토하고 닫기** ← 좌표 11·12로 흡수됐다(라벨 판이 답한다). 오늘 좌표 댓글을 다 달아뒀다: **#24**(게이트 전체가 섰다 — lint + 익스텐션 + 모델 지정면, 실물 2판. 닫기/가르기 판정만 남음) · **#23**(시계 채워짐, 세션 밖 상태전이·죽은 세션 깨우기·`LOOP.md` 열림) · **#21**(소비할 물건 생김, 지시문 한 장으로 좁아짐) · **#16**(재측정 결과 **아직 살아 있는 버그**, `run.sh:1775-1776` 한 줄 수정). 나머지 9개(#1·3·5·6·10·13·14·15·17·20)는 GLG 의 *"할일/급한일/안할일/나중에할일"* 분류를 한 판 잡고 해야 한다. → **그 분류 판이 2026-09-10 에 라벨로 섰다. 좌표 11 을 보라** — 이제 `board.py --mine` 이 답한다.
- [ ] **12. 판보기 2차 — 사용자 자리에서 검수했고, 판정 여섯이 GLG 앞에 있다** ← PAUSED: GLG 판정 여섯 대기 (2026-09-10). GLG 가 경계를 정했다: *"agent-config는 사용자야 우리 입장에서. 스킬만드는게 우리니까."* 그래서 이 집은 코드가 아니라 **「담당자가 이걸로 자기 몫을 볼 수 있는가」**를 봤다. 아래 NOW 참조. **이 집 코드 변경 0** — 수선은 전부 `sorge` 집에서 났다.

- [ ] **13. 하네스 관측소에 검증면 축이 섰다 — 두 대문자 문서 신규** ← PAUSED: 본작업 재개는 GLG 판정 뒤 (2026-09-18). `UNCLEBOB.md`(밥 마틴, 게이트 관측) · `XIRP.md`(Spotify, macOS 전용이라 설치 불가) · `harness-bench` **렌즈 5 = 검증면**. **본작업(entwurf 검증면)은 0.23.0 릴리즈가 끝난 뒤 GLG가 다시 연다** — 그때까지 이 좌표는 문서만 서 있는 상태다. 아래 NOW.

- [ ] **14. herdr 재조사 — 조사는 닫혔고, 대장 결함 하나가 열려 있다** ← PAUSED: status.py 방향 GLG 결정 대기 (2026-09-21). `HERDR.md` 09-21 절 + 오후 정정, 이웃 13종 실측(소넷 형제 둘), entwurf 담당자 답 다섯 — 전부 llmlog `20260914T161103`에 보존(`.agent-reports/`는 gitignore). **남은 한 줄: `harness-bench status`가 `## 상태` 헤딩을 먼저 찾고 뒤의 날짜 절을 안 본다** — `status.py:52-60`. 그래서 HERDR.md가 09-21까지 갱신됐는데 대장은 09-09로 보고한다. HERMES·OMP·OUROBOROS·PRIME도 같은 구조면 전부 과소보고다. 고치는 방향 둘 중 GLG 결정 대기: `max(상태, 마지막 dated 절)`을 쓰거나, 매트릭스 문서의 `## 상태` 헤딩을 갱신 대상으로 삼거나.
- [ ] **15. 기억축 성장·검색 효용 정기 판독** ← PAUSED: 다음 전체 동기화/월간 점검 때 관측값 축적 후 GLG가 andenken 담당자와 조율 요청 (판독점 2회: 09-27·10-06). 아래 NOW의 측정 좌표.
- [ ] **17. 판단 근거 적합성·재개 범위** ← CURRENT: GLG가 별도 세션에서 열 때만. 오늘은 의미 판정기·continuation 설계에 착수하지 않는다.
- [ ] **18. Pi 압축을 codex native → 빌트인으로 전환** ← 2026-10-03 GLG 실행 승인(entwurf 0.30.0 퍼블리시로 미뤘던 일). 지원 manifest·문서·검증 게이트 전환과 Oracle 제거는 `v2026.10.3`에 갈무리. 남은 것: 다른 기기 제거 + 새 프로세스/세션에서 첫 빌트인 압축 관측.
- [ ] **19. pi 1.0 + pi-durable 집중 탐구 — `PI.md` (#27 = 이 주제의 최신 좌표, entwurf#88 닫힘)** ← PAUSED: 2차 자동화 검수 완료·Fable 검수 통과(11:13 KST 보고, #27 댓글), **GLG 방향 판정 대기** (2026-10-02). GLG 방향: *"prime agent 보다 pi 버전업과 durable, codemode 등을 따라가야 하는 게 더 급해졌어."* 1차 결론: Opus 조사·Fable 검수 완료, v1.0.0 소스 읽음·미설치·테스트 미실행. 결론 셋: ① coding agent 1.0에 배경 압축 없음(측정) → 좌표 18 기대치 불변, 레버는 여전히 압축 모델 확장. ② durable 영속 inbox/`requestId`는 pi 1.0 시민에게 안 닿음(측정) — 경계 후보 「storage 안 = durable, storage 사이 = entwurf」(제안). ③ goal/autopilot/decision-gate가 손으로 지은 이어가기·fork 상태·재시작 시계·결정 memo가 durable 커널 원시와 1:1(단서). 다음 한 칸(GLG가 열 때만): `/tmp/pi-v1`에서 `npm ci` + faux 예제 25·13·23(API 0) → F7·B7·G4 측정. 아래 NOW 참조.

- [ ] **20. 기억축 정화 — 「GLG와 대화한 턴」만 남긴다 (andenken 조율)** ← CURRENT: **GLG가 직접 판정했다 (2026-10-02)** — C(하네스 주입)·B′(에이전트↔에이전트) **둘 다 drop**, **전체 재임베딩은 하지 않는다**. 실행은 andenken 담당자(garden `20261002T173340-f03de1`)가 자기 집 `NEXT.md` RAIL 5 「세션 축 입장 경계」를 CURRENT로 잡아 가져갔다 — 순서: 규칙 코드화 → API 0 dry-run → 백업·delete·verify·publish → acceptance. **이 집은 조율만 하고 dry-run을 따로 요청하지 않는다.** **GLG 북극성: *"목표는 나랑 대화한 턴이야. 그래야 decision-gate가 동작이 가능하게 기억이 생기거든."*** 좌표 15(월간 판독)와 짝 — 15는 관측, 20은 정리. 아래 NOW 참조.
- [ ] **21. `skill-audit` — 자기 수선 검수 스킬 (설계 재검토 후 착수)** ← PAUSED: grok 검토 끝, **다시 검토해서 다음에** (GLG 지시 2026-10-02). 자리 확정: `.claude/skills/skill-audit/SKILL.md` — **프로젝트 로컬, 범용 아님**, `agent-config` 담당자 스킬과 **따로**(GLG: *"agent-config 스킬이 자체가 자기수선이니까 따로 나눠야돼"*). 같은 좌표에 `skills/botlog/SKILL.md` 증류본(119줄/7,446B) **미커밋 채택 판정**이 함께 걸려 있다. 아래 NOW 참조.
- [ ] **22. pi-durable을 andenken 세 번째 세션 source로 — [andenken#15](https://github.com/junghan0611/andenken/issues/15) 관리** ← PAUSED: **GLG가 durable을 직접 써 본 뒤 Q1–Q7 판정** (2026-10-06). GLG: *"아직 나도 durable 을 완벽하게 파악하고 사용하는게 아니라. 먼저 만들기가 조심스럽다."* 계약 초안·측정·증거는 andenken `40c20e5` `probes/pi-durable/`에 있다. **이 집 코드 변경 0** — 소비면은 andenken 착지 뒤 함께 움직인다. 좌표 19(durable 탐구)의 기억축 갈래, 좌표 20(andenken RAIL 5)와 수신자 규칙을 공유(Q5). 아래 NOW 참조.

- [ ] **23. `pi-durable` 후속 실물 관측** ← PAUSED: 독립 명부·peek 수선·첫 사건 기록은 이미 `5c3d67c`·`c3f8dfb`·`a834380`에 커밋됐고 `v2026.10.8`에 갈무리. 남은 것은 prompt의 실제 스킬 주입·store mtime 관측 효용·모델 표면. GLG가 관측을 다시 열 때만; 아래 NOW 참조. 좌표 24(env/hide 구현·실사용 재개·0.32.0 레퍼런스 문서)는 같은 태그에 닫힘.

> 닫힌 좌표 1·2·5·6·7·8·9·11·16은 `CHANGELOG.md`로 넘어갔다 (`v2026.9.2` · `v2026.9.4` ·
> `v2026.9.4-wiring.1` · `v2026.9.9` · **8·11은 `v2026.9.21`에 늦게 갈무리** · 16은 `v2026.9.30`). 번호는
> 재사용하지 않는다 — 지난 핸드오프가 부른 이름이 계속 그 자리를 가리켜야 한다. 좌표 10이
> 가리키는 11의 내용은 이제 `v2026.9.21` 절에 있다. **24와 23의 닫힌 부분은 `v2026.10.8`** —
> 23의 후속 관측·22의 기억축 판정은 남겨 두었다.

현재 좌표: **24 닫힘 — durable env/hide 레퍼런스·실사용 재개·0.32.0 문서, `v2026.10.8`** · **23 PAUSED — durable 후속 실물 관측만 남음** · **20 CURRENT — 기억축 정화, andenken과 조율 중** · **22 PAUSED — pi-durable source, andenken#15에서 GLG Q1–Q7 판정 대기(노트북에서 두 리포 pull 후 재검수)** · 21 PAUSED(`skill-audit` 재검토 + botlog 증류본 채택 판정) · **19 PAUSED — 1·2차 끝, GLG가 #27 읽고 방향 판정(#27이 최신 좌표)** · 17(판단 근거·재개는 후일 GLG 재개 요청 대기) — 16은 `v2026.9.30`에 닫힘 — 18 압축 전환 적용 중(다른 기기 제거·첫 빌트인 관측 남음) — 14 herdr 판정 대기 · 15 기억축 월간 판독 대기 · 13 본작업 보류 · 12 GLG 판정 대기 · 3·4 남의 손 대기

# NOW

- **최근 닫힘 — 좌표 24, Entwurf 0.32.0 소비자 레퍼런스 (2026-10-08).** env/hide 구현·엄격 파서 사건과 Pi-compatible 수선·15/15 검증·실제 같은-id 재개는 `CHANGELOG.md v2026.10.8`과 `PI-DURABLE.md`에 승격했다. 사용·테스트·경계는 `pi-durable/README.md`, 셸 helper는 루트 README. 다음 세션은 이 구현을 다시 만들지 않는다. bridge 전체 env·운영 routing은 미측정이며, 관측 요청 없이 프로세스/셸/환경 파일을 바꾸지 않는다.

- **`pi-durable` 후속 실물 관측 — 좌표 23 (2026-10-08 갱신, PAUSED).** 독립 명부·peek의 enum/SQLite 관측 구분 수선(81 checks)·10-06 첫 레인 사건 기록은 이미 커밋됐고 `CHANGELOG.md v2026.10.8`로 승격했다. 당시 D0/source-only/0.31.0 출하 대기는 역사다; 현재는 **0.32.0 carrier + Pi 1.0.4 SDK·D2·contact 6개** (`PI-DURABLE.md` 마지막 날짜 절). 미커밋이라고 다시 읽지 않는다.
  - **Next (GLG가 관측을 열 때만):** 실제 durable `situation` 행의 모양·prompt에 스킬이 올라가는지·SQLite mtime이 나이 축으로 유효한지를 실물로 재고, 모델 표면 `model:null`의 현재 상태도 읽기 전용으로 재확인한다. DB를 열어 해결하지 않는다. 0.31.0 설치나 개발 브랜치 커밋을 기다리는 단계는 끝났다.
  - **별도 다음 손:** andenken#15 Q1–Q7 판정·착지 뒤 소비면은 좌표 22에서 따른다. bridge 전체 env·운영 routing은 이번 env/hide 수용의 미측정 경계이지 새 구현 지시가 아니다.
  - **Read:** `pi-durable/README.md` → `PI-DURABLE.md` 최신 절과 § (d), `CHANGELOG.md v2026.10.8`.
  - **Do not:** 형제 호출·entwurf 레인에 작업 전달 · live durable DB(RO 포함, Q6 미승인) · 런타임 설치/재시작 · 새 스킬 링크 · fresh-call 모듈 전파 · shell config/source 실행.

- **pi-durable 세션 source — 좌표 22, [andenken#15](https://github.com/junghan0611/andenken/issues/15) (2026-10-06, oracle).** 발단: entwurf 레인(gpt-6.1-sol, garden `20261003T164401-a30dda`)이 GLG 요청으로 durable 세션/기록면 조사를 이 집에 넘겼다(브리핑 oracle-local `~/tmp/entwurf-pi102-durable/new-lane/agent-config-durable-session-memory-brief.md`, sha `5052bbd4…`). GLG 결정: *"나는 pi-durable을 따로 소스로 만들고 싶어 … 누군가는 연속성 있게 기억할 녀석인거야 … 한녀석만 믿을수 없잖아. 다 세션을 기억되고 임베딩되고 저장관리할거야 … 내 대화 워딩도 거기 주로 있게될거야."* 배치(GLG): 코어 durable = oracle 상주·항상 live, 핵심 리포마다 하나. 노트북은 릴리즈 후 설치, 전원이 꺼지는 기기. 방향 경계 = entwurf#130 GLG 댓글 *"pi-durable에게 뭔가 더 해주면 안돼 … durable이 해야 할것은 기억축의 연장이야."*
  - **한 일:** native 소스(pi `cd32f772`+overlay) 직접 재확인 → andenken 담당자(Opus, garden `20261006T102129-a7ad17`, 레인 정지)를 fresh로 불러 계약 초안·API 0 측정·개정 diff를 받음 → andenken#15 등록(parked, ball:glg) → GLG가 andenken 세션에서 증거 커밋·푸시 요청 → andenken `40c20e5` `probes/pi-durable/`(REPORT·미적용 docs diff·`extract-durable.py`·합성 9시나리오 DB·생성기·README 재검수 순서). #15 본문 산출물 표를 그 위치로 정정함.
  - **핵심 사실 (근거는 #15):** 경로 `~/.pi/agent/experimental/durable-sessions/<sha256(cwd)[:24]>/<ms>-<UUIDv4>/session.sqlite` · entries INSERT-only + 전역 단조 id → watermark · fork는 물리 복사 아님 · `pi.compaction`이 role=user라 **kind로 분류** · live DB는 main만 cp하면 전손, `VACUUM INTO`가 정답 · GLG 발화 판별 = NULL `request_id` 소거법(Q4 위험) · 현행 andenken 9곳이 깨짐(`dedupeByBasename` 붕괴가 최악).
  - **노트북에서 첫 1보:** agent-config·andenken 둘 다 `git pull` → andenken `probes/pi-durable/README.md` 순서로 재검수 → #15 Q1–Q7 판정. 판정이 나오면 andenken 담당자가 구현, 이 집은 소비면을 따라 움직인다.
  - **이 집 몫 (andenken 착지 뒤, 지금은 0):** `semantic-memory` `--source pi-durable` · `session-recap` reader + `_is_native_pi_session_file` 거울 · `entwurf-peek` 「지금 무엇을 하는 중인가」(durable 형제는 현재 `transcript absent`) · `memory-sync` 문서 · `AGENTS.md` § semantic-memory multi-source 줄.
  - **Do not:** live 코디네이터 DB 접속(RO 포함 — Q6 승인 전) · durable 팀(entwurf #129/0.31.0)에 연락·작업 전달 · durable에 기능 추가 · Pi JSONL로 위장 export · 유료 임베딩·`sessions.lance` 변경.

- **pi 1.0 + pi-durable 집중 탐구 — 좌표 19 (2026-10-02, GLG 지시).** 발단: entwurf 코디네이터(gpt-6.1-sol, 세션 `20261002T100622-43047f`)가 10:15 KST 메일로 GLG 결정을 전달했다 — *"pi-durable 이슈는 리서치 껀이야. 그쪽으로 전달해. … 0.30.0은 acp까지 커버하는 기본기, 고도화는 agent-config 리서치 결과랑 합쳐서 내가 방향을 더 잡아볼게."* GLG가 이 세션에서 확정: Fable이 코디네이터, Opus 형제가 조사, `PI.md`를 harness-bench 과제로 세운다. **entwurf 0.30.0에는 섞지 않는다.** 결과를 바탕으로 GLG가 entwurf의 다음 방향을 역으로 잡는다. GLG 원문: *"pi-durable의 주제는 내가 여기 리포에서 autopilot decision-gate와도 다 연결될것같거든."*
  - **측정(2026-10-02 oracle):** `~/repos/3rd/pi/pi-mono` 워크트리는 v0.99.1, origin fetch 뒤 태그 `v1.0.0` 존재, `packages/durable` 153파일(README·CHANGELOG·docs·src·test·vitest.benchmark.config.ts). 설치 pi는 0.99.2. 이 집에 `PI.md` 없었음.
  - **코디네이터가 넘긴 연구 질문 넷(미결정):** durable이 소유할 대화·실행 복구 vs entwurf가 소유할 시민 주소·전달의 경계 / 내부 conversation·subagent ≠ 자동 garden citizen / interrupted delivery의 replay·idempotency 경계 / 기존 기억축·봇·접속면에 유효한 작은 실험. 발표 글의 주장(SQLite/JSONL 저장, task checkpoint 복구, replay-safe 도구만 재실행, requestId dedupe, 병렬 conversations/fork, background compaction·reset/handoff, 다중 client watch/steer)은 전부 **inherited** — 소스 읽기 전.
  - **이 집 접점(검수 때 볼 것):** 좌표 18 압축 전환 + llmlog `20261001T075945` §6 (a)(b)(e)(f) · `pi-extensions/{autopilot,decision-gate,goal}.ts` · andenken 세션축·session-recap의 append-only JSONL 가정 · entwurf garden-id/mailbox 전달.
  - **형제 좌표:** Opus fresh-call 영수증 — tmux 세션 `$222` 창 `@732` pane `%732`, nonce `mux-fresh-call-b63e6ff6f102f65648e3ce81`, cwd agent-config. **콜백 수신 10:22:32 KST → 주소 garden `20261002T102226-3f654d`** (meta-session/claude-code, 수신 영수증 `lastReadAt=2026-10-02T01:22:56Z`). 지시: `PI.md` 신규 + README harness-bench 표 한 줄, NEXT는 코디네이터 소유라 손대지 않음, 설치·커밋·푸시·추가 형제 없음.
  - **이슈 #27** 이 이 레인의 판이다. **entwurf 코디네이터에게 회신하지 않는다** [GLG 2026-10-02: *"entwurf 코디네이터한테 답장 하지말고 … entwurf는 0.30.0 릴리즈에만 집중해야 하니까"*]. 접수 ack 1회(10:2x KST, control-socket `sent`)가 마지막 메시지다. 결과는 PI.md·#27에 쌓고 GLG가 읽는다.
  - **Do not:** 0.30.0 요구에 섞지 않는다. durable을 live HOME에 설치하지 않는다. 채택 판정으로 쓰지 않는다 — harness-bench 다섯 렌즈 + 질문 넷의 증거 기록이다.
  - **1차 완료 + 검수 영수증 (2026-10-02 10:29 보고, Fable 검수):** `PI.md` 250줄(매트릭스 A–G 33행: 측정됨 9 · 읽음 16 · 미측정 5 · 안 함 2 · 외부 1) + `README.md` 표 한 줄(「Six subjects」→「Seven」은 검수 때 고침). Fable이 `/tmp/pi-v1`(v1.0.0 worktree, 원 클론 HEAD 불변)에서 앵커 12개를 재측정해 전부 일치: coding-agent `src`에 `backgroundTokens` 0건 · coding-agent `package.json`에 pi-durable 의존 0 · `agent.ts:143,191-192,299-304` 메모리 큐 · `spec.md:2175`(requestId는 한 conversation 안) · `spec.md:3670`(압축 모델 = agent 모델) · `README:527`(프로세스 하나가 storage 소유) · `tsconfig.build.json:19`·`files`에서 experimental 제외 · 확장 타입 diff는 `instructions` 한 필드 · andenken 필터 UUIDv7+200KB · `autopilot.ts:382,471` `setTimeout` · durable `types.ts:228-229` `sleep(until)` · `harness/types.ts:582-587` `memo`. 상세 영수증은 #27 댓글. 결함 0. 미커밋 — GLG가 읽고 결정.
  - **한 통 (GLG 2026-10-02: *"entwurf#88 이슈도 봐봐 … lisp 연결하는 것 목표 … 한 통으로 정리돼야 해"*):** `PI.md` § [2026-10-02] 한 통 — 다섯 자리 지도(표현·거처·계산·전달·사람 admission). #88 = 표현+전달, prime-agent(`PRIME.md`, #20) = 계산(R2), **durable = 거처(R3 기질 후보)**. 10-01 llmlog `20261001T070752`의 「durable 관련성은 추측」을 「거처 층에서 읽음, 표현·전달 층 무관」으로 좁혔다. 순서 불변: §8 비-eval form 한 장 왕복이 먼저, durable 거처 측정은 그 뒤(A5에 `defineDoc fork` + S-exp 문자열 한 줄). `PRIME.md`에 연결 절 추가. #27 본문에 관련 링크 추가.
  - **좌표 이동 (2026-10-02 10:4x):** entwurf#88을 GLG 결정으로 닫았다(댓글 `5944085370`, reason not planned). #27 본문 머리에 「좌표 갱신」 절 — 이 이슈가 최신 좌표, GLG 방향은 pi 버전업·durable·codemode 우선, prime-agent(계산 축)는 뒤로. 진행 형태: 자동화로 검수 가능한 것은 Opus가 재고, 그 결과로 GLG가 다음을 정한다.
  - **2차 과제 → Opus `20261002T102226-3f654d` (메일박스 enqueue `2026-10-02T01-50-30-578Z-eb1849.msg`):** A. `/tmp/pi-v1` `npm ci` + faux 예제 25·13·31·23(F7·B7·G4) · B. `defineDoc fork` 셋에 S-exp 문자열 → fork → JSONL/SQLite reopen, `main.jsonl` 가독성(R3 기질) · C. `/tmp` prefix에 coding-agent 1.0.0 설치 + 격리 HOME에서 우리 확장 21개 로드(모델 0 RPC 패턴 재사용 가능한지 — `run.sh`에 pi 바이너리 핀 없음, `command -v pi`만, `run.sh:395,549,1749`) · D. codemode-store/structuredContent 모델 0 범위 · E. coding-agent `v0.99.2..v1.0.0` CHANGELOG 우리 접점 표. 산출은 `PI.md` `## [2026-10-02] 2차 — 자동화 검수` 절 + 행 상태 갱신. 전부 /tmp 격리·API 0·커밋 0.
  - **2차 완료 + 검수 (11:13 KST 보고, Fable 재측정):** `PI.md` § [2026-10-02] 2차 — 자동화 검수(307~534행). 격리는 `/tmp`(루트 98%, 여유 2.7G)가 아니라 **`/dev/shm` tmpfs 1.3G**(`pi1`·`pi-v1`·npm-cache·pnpm-store; 재부팅에 사라짐, 치우는 명령 PI.md 끝). Fable 확인: 원 클론 `core.hooksPath` local 비어 있고 global 안전벽 그대로 · live `~/.pi/agent/settings.json`(10-01 09:13)·`~/.claude/settings.json`(10-01 06:46) mtime 불변 · `pi --version` 0.99.2 · npm -g는 `@openai/codex`뿐 · `loader.ts:108-120` `@mariozechner/*` 별칭 유지 · `decision-gate.load.test.ts:49-53` skip 분기 · pi-ai `env-api-keys.ts:100` openrouter 키 · CHANGELOG `generateImages` 두 줄 — 전부 일치. 결과: durable vitest 851 pass / 2 fail(`/bin/bash` 하드코딩, NixOS 호스트 가정) / 예제 4개 rc=0(단언 0) · 거처 fork 3종(`initial`=없음·`current`=부모 현재·`asOf`=fork 시점) JSONL/SQLite reopen 생존, 값은 `doc-<id>.jsonl`에 사람이 읽는 그대로 · pi 1.0 격리에서 하우스 테스트 319 ok(0.99.2와 동일), 확장 21개 로드·도구 노출 동일 · codemode store 호출 사이·재개 생존, 가지 밖 `null`, `structuredContent`는 세션 JSONL에 0건 · CHANGELOG 접점 둘: fullscreen 기본, codemode `models.generateImages()`→OpenRouter 길(codemode는 기본 꺼짐).
  - **GLG 판정 대기 셋:** ① pi 1.0 수용의 이 집 쪽 위험은 격리 실행에서도 안 보임 — 남는 실차이는 fullscreen 기본(herdr alt-screen 단서, 실 TTY 필요). ② 「한 통」 거처 칸 후보가 둘 — codemode store(이미 1.0에 있음) vs durable(타입 문서·fork 정책·원자 commit·다중 conversation). R3 기질을 어느 쪽에서 재기 시작할지. ③ 구조는 1.0에서도 경계에서 텍스트로 눌린다(`structuredContent` 세션 JSONL 0건) → andenken·recap·entwurf transcript는 늘 `content` 텍스트. (덧) 이 집 검증면 결함 1: load 스모크 2개가 pi-ai를 못 찾으면 rc=0 skip → `&&` 체인에서 통과로 읽힘(`decision-gate.load.test.ts:49-53`). 고칠지 GLG 판정.
  - **자동화로 더 못 재는 것:** 1.0 빌트인 압축 시간·요약 품질·드리프트(실 모델) · consult 적합성(좌표 17) · fullscreen의 herdr/tmux 영향(실 TTY) · durable 배경 압축 실지연 · pi 1.0 시민의 entwurf 경로(0.30.0 레인) · GLG 개입 홉(사람 단위).
  - **남긴 핀:** `/tmp/pi-v1` worktree(다음 칸 A5의 핀, 지우려면 `git -C ~/repos/3rd/pi/pi-mono worktree remove /tmp/pi-v1`). `protocol.md` 행은 아직 안 올렸다(미해결 4) — 올릴지 GLG 몫.

- **Pi 압축 전환 — codex native → 빌트인 (좌표 18, 2026-10-01 GLG 결정).** GLG 원문: *"이거 빌트인으로 바꿀꺼야. 단, 지금 entwurf 릴리즈 마치고 나서."* 근거와 고민거리 전문 = llmlog `20261001T075945`.
  - **왜 (측정, oracle, 최근 14일 25회):** `@ogulcancelik/pi-codex-compaction` 압축 시간은 모델 따라 갈렸다. gpt-5.6-terra/5.6-sol/6-sol에서는 31–163초였고, **gpt-6.1-sol(9/30~ 코디네이터)에서는 216–383초**였다. 컨텍스트(약 256K)와 thinking(high)은 같았다. 확장이 대화 전체를 Codex 서버에 보내므로, 그 서버 처리 시간만큼 코디네이터가 멈추고 형제들도 같이 기다린다.
  - **함정:** native 압축 엔트리의 `summary`는 표시 한 줄(`OpenAI Codex native compaction checkpoint (<uuid>).`)뿐이다. 실제 압축 내용은 `details.replacementHistory`에 있고, 확장이 요청마다 다시 끼운다(`index.ts` `before_provider_request`). **확장을 빼고 native 압축 세션을 다시 열면 맥락을 잃는다.** 그래서 전환은 코디네이터가 `/new` 할 때 하고, 옛 native 세션은 이어가지 않는다.
  - **적용 완료 기록:** `CHANGELOG.md` § `v2026.10.3` — Oracle 제거·API 0 로드 검증·`f8a5815` 푸시. GLG가 Oracle Pi Codex를 모두 새 프로세스·새 세션으로 시작하기로 확인했다. 다른 기기는 아직 미측정.
  - **Next:** 다른 기기에서도 `pi remove npm:@ogulcancelik/pi-codex-compaction` → 새 Pi 프로세스·새 세션. `run.sh setup`은 제거를 자동으로 하지 않는다. 첫 빌트인 압축 시간·평문 summary를 관측해 위 표와 나란히 둔다. 실 모델 압축은 아직 미측정.
  - **기대치:** 빌트인도 기본은 세션 모델과 세션 thinking으로 요약한다(pi 0.99.1 `_runDefaultCompaction`). 압축 전용 모델 설정은 없다. 그러니 **빨라진다는 보장은 없다.** 얻는 것은 평문 요약이다 — 사람이 읽을 수 있고 모델을 바꿔도 이어진다(Armin, earendil.com/posts/compaction-in-pi). 그래도 느리면 `session_before_compact`에 빠른 모델로 요약하는 작은 확장을 만드는 것이 다음 후보다. GLG 판정 뒤에만 한다.
  - **Do not:** 기존 native 압축 세션을 확장 없이 재개하거나 `/reload`로 전환하지 않는다. 제거 뒤 새 프로세스·새 세션 + `/recall`로 간다. 압축 전용 모델 확장은 만들지 않는다 — 우선 Pi 빌트인에 맡긴다.

- **Goal 도구 가시성 수선 + Pi 익스텐션 전수조사 (2026-09-29, Opus 보고).** `goal=null`이면 `get_goal`·`update_goal` 비노출, active면 둘 다, paused/blocked/complete 등 비활성이면 읽기 `get_goal`만. `update_goal` 실행도 active에서만 허용해 비활성 목표의 재상태변경·blocked 재호출 consult 에지를 막는다(`pi-extensions/goal.ts`). 영수증: `test:goal` 단위 29/29 + 격리 Pi RPC 13/13(모델 0), `test:decision-gate`·`test:autopilot` green(2026-09-29 Opus 보고). 기존 Pi 프로세스는 새 코드 재적재(`/reload` 또는 새 프로세스) 전까지 옛 도구 목록을 쓴다. 오늘 커밋 요청은 이 goal 수선과 그 검증에 한정한다.
  - **전수 범위:** 이 집 설치 Pi 확장 21개(로컬 TS 19 + npm 2), 다른 소유자 패키지·herdr 실파일 제외. **후속 수선 후보** A: `session-recall-compat.ts:44-50`이 이름만 바꿔 upstream 설명/오류 힌트에 `session_search`가 남음(semantic 검색과 혼동). E: `env-loader.ts:85-90`이 프로젝트 `.env.local`을 프로세스 환경에 주입(위험 가능성, 악용 재현 전). **GLG 정책 판정** B: `heartbeat.ts:327-343`은 트리 이동에 disarm 없음 — 가지 사이 시계를 이어갈지 결정 필요. 그 밖의 낮은 우선순위·관측 공백은 이 대화 Opus 전수조사 원문을 읽고 착수 전 재측정. goal 외 자동 수선·설치 확장 전체 변경은 하지 않는다.

- **Autopilot — 타이머·DM·consult 경로는 실물 관측, 판단의 적합성과 자동 재개는 미검증/미구현 (2026-09-29).** GLG가 새 Pi `20260929T135109-f43ba7`에서 `/autopilot on 1m 1m`으로 시험했다. 13:55 질문 DM, 13:56 두 번째 DM·잠정 패널. `decision-gate`가 `openai-codex/gpt-5.6-terra`로 축 호출 4회를 수행해 세션 인용 2건을 해소하고 `PROVISIONAL: 다음 세션에서도 한 판 시험해봐`를 남겼다(이 대화에 GLG가 붙인 DM·Pi 패널 전문). **이것은 GLG의 승인도 다음 턴도 아니다.** 현행 `autopilot.ts:728-736`은 `triggerTurn:false`로 패널만 남기며 실행 0; `decision-gate.ts:1028-1054`는 영수증만 남긴다. §1~§6 lint는 별도 파일 규칙이고 consult 결과를 검증/진행 조건으로 쓰지 않는다.
  - **독립 판독(2026-09-29 Grok Pi, 이 대화의 검수 원문 + 이 집 session_query/검색 재확인): 잠정 답의 인용은 이 질문을 지지하지 않는다.** `sessions#13`은 GLG의 승인 발화가 아니라 *어시스턴트가 작성한 첫 시험 대본*이다. GLG가 곧이어 말한 것은 “응 이거 적어놨다. 이따가 해볼게” — 이번 실물 1판이다. `sessions#20`의 “일단 여기까지 하고 이후 다음 세션 이어갈게”는 2026-05-13 andenken 작업의 후속 세션이지 autopilot이 아니다. consult 가 `#13`을 GLG 지시로 뒤집고 `#20`을 일반화했다. `ok + PROVISIONAL + resolved citation ≥1`은 *참조 해소*만 판정하고 화자·주제·시점·추론 적합은 판정하지 않는다. **현 실물 판은 자동 재개 문턱에서 FAIL이어야 한다.**
  - **다음 세션의 첫 1보(오늘 범위 밖):** GLG가 다시 열면 이번 인용 오류를 대조 fixture로 삼아 '인용 ID 해소 ≠ 현재 질문을 지지함'의 판정 계약부터 토론한다. 의미 판정기·자동 continuation·DM #3·형제 파견은 이번 커밋에 넣지 않는다. 평상시 Pi는 YOLO, `goal(blocked)` 강제 없음.
  - **닫을 계약(오늘):** 사람이 `/autopilot on` 할 때만 `waiting_for`가 보이고, off/트리 이동/세션 경계는 질문 시계와 도구 노출을 접는다. settled glg 선언에서만 DM#1→consult→DM#2·advisory panel; 답변·취소·바쁜 상태·실패·예산은 발신/consult를 중복하지 않는다. consult는 in-memory(별도 JSONL 0), Sol medium 기본·Copilot 후보 제외, `triggerTurn:false`(자동 실행 0). 결론의 내용이 옳다고 보증하지 않는다.
  - **검수(2026-09-29):** 미커밋 변경은 off 도구 숨김·트리 이동 시 해제, Sol medium 단일 기본 후보·Copilot 제외와 회귀 테스트다. `bg04` — 기존 `test:autopilot`·`test:decision-gate`·`test:pi-packages` 통과. Grok Pi 독립 리뷰는 스텁 둘 green, 트리 도구 복원 결함을 제시했고 이를 `session_tree` 회귀로 수선했다. 최종 영수증은 `./run.sh test:autopilot`(스텁·로드) · `./run.sh demo:autopilot`(격리 RPC의 실물 Pi off/on/off 활성 도구 측정 + DM dry-run) · `test:decision-gate` · `test:pi-packages` · `git diff --check`. 새 기본 모델의 유료 consult는 안 쟀다. 이미 뜬 Pi는 이전 확장이므로 새 프로세스/`/reload` 필요; reload 시 시계가 죽는다.
  - **도구 경계:** Pi 트리 이동은 transcript 도구 복원 뒤 `session_tree`를 낸다(설치 Pi 0.87.1 `agent-session.js:3003-3011`). 여기서 무장/시계를 접고 `waiting_for`를 다시 숨기도록 수선. `setActiveTools`는 전역 활성 목록 교체라 다른 확장과의 경쟁 가능성은 남는다. **숨김은 UX이지 권한 경계가 아니다** — off 실행 함수도 DM/기록을 거절한다. 설치되지 않은 타 확장의 임의 복원까지 보증하지 않는다.
  - **남은 모델 관측 공백(후일):** `/decision-gate model` 세션 지정은 autopilot의 `resolveCandidateSource(null)`에 전달되지 않는다(autopilot은 env/default만 사용). 영수증에 `thinkingLevel`이 없어 medium 실제 실행을 사후 증명하지 못한다. Sol 기본은 goal blocked도 바꾼다. 오늘은 후보·SDK 옵션을 로직 테스트로만 확인한다.
  - **Read:** `README.md § autopilot`, `pi-extensions/{autopilot,decision-gate}.ts`, `pi-extensions/decision-gate/README.md`; 이 대화의 DM·패널. **Do not:** 잠정 답을 승인·explicit_intent·자동 형제 호출로 승격하지 않는다. GLG는 오늘 로직 검수 후 커밋·푸시를 명시 요청했다.

- **기억축 운영 관측 — [2026-09-27] 전체 동기화 완료, 다음 판독은 이 집에서.** 실측: `andenken`의 `sync:sessions --global`은 95,789행·5조각을 검증하고 인덱스·매니페스트·코퍼스를 Oracle에 발행했다(완료 영수증 `1790494635586-bg06.log`: `No duplicate IDs (95,789 unique)` / `5 fragments, 4.0G` / `replicate corpus → oracle` / `done`). compact 직전 23조각·4.0G → 직후 4조각·4.0G, 이후 세션 4건 증분으로 5조각: **조각 수는 줄었으나 디스크 크기 절감은 확인되지 않았다.** md는 10,938행·51조각·534M → compact 후 2조각·374M, 로컬·Oracle 검증 통과(`1790498217793-bg07.log`: `No duplicate IDs (10,938 unique)` / `2 fragments, 374M` / `md oracle sync done`). OpenClaw는 이미 계산된 벡터 570개를 회수(API 0), 6,458행·11조각·126M 로컬·Oracle 검증 통과(`1790498779818-bg08.log`: `No duplicate IDs (6,458 unique)` / `11 fragments, 126M` / `openclaw oracle sync done`). 원격 md 검증에도 orphan 0. 이 운영 기록은 **우리 리포 소유**; andenken `NEXT.md`는 수정하지 않았다.
  - **Next (다음 전체 동기화 또는 월간 점검을 GLG가 열 때):** 세 축의 행·파일·조각·디스크 용량·증분량·API 비용·검증 결과를 전회와 나란히 기록하고, 대표 질의의 검색 적중/누락·응답시간을 같은 질의 세트로 비교한다. `status:json`은 전체 corpus 탐색(10분+)이므로 상시 호출하지 않는다. compact 전후 **조각과 용량을 별개로** 측정하고, 20조각 이상이면 해당 축만 정리→검증→발행(권한 호스트 thinkpad). 이 주기는 자동화/삭제 정책이 아니라 **검토 제안**이다.
  - **판정 경계:** 누적 크기가 검색 지연·품질·운영비를 실제로 해치는지 먼저 측정한다. 악화가 보이면 이 집에서 근거·질의 사례를 정리하고 GLG 요청에 따라 andenken 담당자와 보존/계층화/검색 범위를 조율한다. append-only 원본과 OpenClaw upstream retention을 여기서 임의로 바꾸거나 타 리포 NEXT를 대신 쓰지 않는다. compact의 조각 감소를 기억의 효용 증가로 주장하지 않는다.
  - **[2026-10-06] 두 번째 판독점 (thinkpad, "전체 임베딩" usual ask 실행 — 대표 질의 적중·응답시간은 안 쟀다).** 09-27 → 10-06: sessions 95,789행·5조각·4.0G → **102,139행·3조각·2.5G**(compact 직전 102,107행·24조각·4.2G → 직후 2조각·2.5G — **이번엔 용량도 줄었다**, 09-27 관측과 다르다. 이유는 안 쟀다) · md 10,938행·2조각·374M → 10,989행·10조각·382M(증분 159 chunk, 약 $0.001) · OpenClaw 6,458행·11조각·126M → 6,695행·1조각·114M(prune 5건 glg 1·gpt 3·mini 1, 백업은 andenken `data/openclaw-prune/2026-10-06T02-56-16-065Z-20261006T025452Z-96875-01aae1/`, undo `prune:openclaw --restore`). 로컬·oracle verify 전부 통과. 처음 oracle md verify의 orphan 1은 oracle 가든 checkout 지연이었고(`261fe0d31` → `ccfa03bda` `pull --ff-only`) pull 뒤 0. 영수증은 thinkpad `/tmp/embed-{1..10}-*.log`(휘발).
  - **열린 것 — bbot이 dirty로 남았다.** 증분 `memory index --agent bbot` 3회 뒤에도 `Dirty: yes`, 세션 파일 22/23(전체 135/136)에서 멈추고 행 3,064 고정. 라이브 세션이 쓰이는 중이라는 건 **가설**(미확인). sup✓ 5건이 hold로 prune에서 빠졌다. **Next:** 다음 `sync:openclaw` 보드에서 bbot을 다시 보고, 여전히 22/23이면 안 읽힌 세션 파일 1개를 특정해 GLG에게 보고한다. `--force`·`memory reset` 금지.

- **하네스 관측소에 「검증면」축이 섰다 — 그리고 본작업은 릴리즈 뒤로 미뤘다 (2026-09-18).**
  GLG 원문: *"본작업은 entwurf 이번 릴리즈끝나면 다시 이야기할거야."* 그러니 **이 좌표에서
  코드를 만지지 않는다.** 오늘 남긴 것은 문서 셋뿐이다.
  - **`UNCLEBOB.md`** — 밥 마틴이 SwarmForge(331커밋)를 접고 CRAP·mutation만 남긴 궤적.
    §B 세 코드베이스 대조(pi-mono / herdr / 밥 마틴) · §C entwurf 실측 · **§D는 "그냥 보라고"**
    (GLG 판정: *"가이드? 권고? 아니야. 그냥 보라고 하는 거야. 고민을 해야 하니까."*).
  - **`XIRP.md`** — Spotify Xirp. **macOS 전용이라 설치 불가**이므로 "쓸까"가 아니라 "공장을
    통째로 소유하면 어디까지 가는가"를 본다.
  - **`harness-bench` 렌즈 5 = 검증면.** coverage %를 묻지 않는다(셋 다 게이트로 안 쓴다).
    `ls`/`grep` 한 번에 재는 언어 독립 셋: ①테스트가 행동 옆에 있는가 ②게이트 코드 자신이
    검증되는가 ③문서↔코드 **구조적** 계약 게이트가 있는가.
  - **이 문서는 하루에 네 번 깎였고 회수 14건이 `UNCLEBOB.md` §E에 있다.** 네 번 모두 같은
    양상 — **증거 한 조각에서 결론까지 너무 멀리.** 특히 §D2는 `entwurf-v2-decider.ts:185-195`가
    이미 `gate-first → pure-before-IO → wire`로 서 있는데 그걸 "하자"고 제안한 것이었다
    (terra 회수). **다음에 이 문서를 만지는 형제는 그 양상을 먼저 의심하면 된다.**
  - **Next (값싸고 둘 다 이 집 몫):** (1) `XIRP.md` 1순위 미해결 — **Pi가 Xirp first-class
    하네스라는 주장 확인/폐기**(Spotify 공식 문서는 지금도 Claude/Codex/Gemini, changelog는
    Cursor는 있고 Pi는 없다). (2) `UNCLEBOB.md` 조건 6 — 대담 정본 **0–22분·35–49분**을 읽는다
    (49:37이 프레임을 바꾼 선례가 있다: 「미측정」 구간에 결론을 흔드는 것이 있었다).
  - **Blocker:** 없음. 본작업만 **entwurf 0.23.0 컷 이후**로 대기.
  - **Read:** `UNCLEBOB.md` §E(회수 목록) → §D. `XIRP.md` §확인 못 한 것.
  - **Do not touch:** entwurf 리포(릴리즈 중, 읽기만) · `~/org`(org 담당자 자리) ·
    우리 리포에 CRAP 상주(GLG: *"지금 crap 안 넣을거야"*) · 다른 `NAME.md`에 §D의
    "판정 금지선 넘기" 라이선스 복제(`UNCLEBOB.md`만 GLG 요청으로 넘었다).

- **판보기 2차 — 「모르는 것」과 「없는 것」이 같은 값으로 렌더되던 자리 넷 (2026-09-10 오후, 지난 NOW · GLG 판정 여섯 계속 유효).**
  GLG 가 이 집을 **사용자 자리**로 세웠고(*"스킬만드는게 우리니까"* — `sorge` 가 만드는 쪽),
  이 집은 실측과 검수만 했다. **이 집 코드 변경 0 · 남의 집 파일 0.** 수선은 `sorge` 6파일.
  - **첫 실측이 판을 열었다:** 배선은 6면 다 깔려 있었는데 **깔린 그 배선으로 부르면 `--debt` 가
    「빚 0」을 답했다**(심링크 경로 미분류 0 / 실물 경로 미분류 17, 둘 다 exit 0). 원인은
    `abspath` 가 심링크를 안 푸는 것 하나. `sorge` 가 3파일 4곳 고쳐 8/8 경로 검증.
  - **같은 형태가 넷이었다** — 전부 *「모르는 것과 없는 것이 같은 값으로 렌더된다」*:
    `board.py:130`(대장에 없다 ↔ 못 읽었다) · `sweep.py`(경고는 stderr, 표는 「빚 0」) ·
    `mine()` 빈 문구(다 따라잡았다 ↔ 판 밖이다) · 그리고 후보 은퇴가 만들 뻔한 네 번째.
  - **텍스트 후보 레인은 은퇴했다 (GLG 판정).** 원문: *"라벨에 리포이름을 넣자고했는데 텍스트로
    검색하면 안된다."* 근거 실측 — `apply` 는 영어 동사라 `(apply fn args)`·`lens.apply`·경로에
    걸리고, `junghan0611` 은 **owner 라 모든 URL 안에 있어 구조적 100% 오탐**. 경계(`edgeagent-config`)
    → 어휘(`garden`) → 접미사(`org-20250624`) → 품사·소유자로 매번 다음 층이 나왔다. **축이
    틀렸지 조정값이 틀린 게 아니었다.** `fetch(body=)` 는 파라미터째 사라졌다.
  - **발견 첫 칸은 안 빈다** (실측): 교차 filed 확정 10건이 전부 `house:` 라벨로 닿는다.
    사슬 = 발견(`--debt` 미분류 레인) → 판정(`--house`) → 몫(`--mine` 확정). `--house` 는
    sorge 전용이 아니라 **담당자가 직접 찍는다** — 미분류 15건은 한 화면이라 기다릴 일이 없다.
  - **이 집이 낸 문구 지적 둘(막지 않음):** ①`--mine` 이 찍는 `gh` 한 줄은 **7건**인데 판은
    **확정 20** 이다 — `LOOP.md:56`(*"이슈 리포 ≠ 일하는 집일 때만 붙인다"*)이라 **내 리포 이슈엔
    라벨이 없어서**다. 「남의 리포에 있는 N건」을 문구가 말하면 놀라움이 설계가 된다.
    ②`⚠ 대장에 없다` 블록의 마지막 줄이 수동태다(「GLG 판정 대기다」 → 「GLG 에게 요청하라」).
  - **내 아침 행동 하나가 틀렸던 것이 드러났다.** `agent-config#13` 을 「저 집 레인이다」라고
    넘기려고 `house:forge-config` 만 붙였는데, **덧셈 도구로 이사를 표현한 것**이다. 라벨엔 빼기가
    없어 그 뜻은 애초에 안 적혔고, `sorge` 의 reader 수정이 그 공백을 드러냈다(지금 확정 20 의 20번째).
    진짜 손은 `gh issue transfer` 다. → 아래 GLG 판정 ⑥.

- **`sorge` 수선은 나갔다 (2026-09-10).** `98f6b75` 6파일 +216/-108, `main` 에 있다.
  이 집이 낸 문구 지적 둘(Q3 수동태 · Q4 「7건 vs 확정 20」)도 **같은 커밋에 실렸다** — 실물 확인:
  `--mine` 이 이제 「남의 판에 있는 N건」과 *"이 집 리포의 이슈는 라벨을 안 달므로 여기 안 나온다
  — `LOOP.md:56`"* 을 함께 찍는다. **새 태그 없음** — `v2026.9.10` 은 백필하지 않고 오늘 것은
  `## Unreleased` 로 간다(두 집 합의). **Unreleased 절은 아직 안 적혔다** — 작성과 다음 컷 시점은
  GLG 판정 대기이고, `sorge` 가 쓰는 순간 알려주기로 했다. 여기서 앞서가지 않는다.

- **GLG 판정 대기 다섯 (2026-09-10 오후 기준).**
  ①`CHANGELOG ## Unreleased` 절 작성 + 다음 컷 시점 ②판/CLI 어휘 **8 중 7이 다르다**(판은
  `○ 분류됨`·`공=담당자`, CLI 는 `ready`·`owner`. `sorge` 하나만 일치했고 **그래서 여태 안 들켰다**)
  ③미분류 정본이 「라벨 없음」이냐 「state 없음」이냐 ④대장 밖 리포에 파일된 남의 집 일
  (이 집 의견: **검색면이 아니라 입력면 문제** — 텍스트로 되살리면 오탐 50건이 그대로 돌아온다)
  ⑤`agent-config#13` 「내 몫 아님」을 무엇으로 적나(transfer / 라벨 / 그대로).

- **판보기 — 자기 몫은 자기 리포 안에서 안 보인다 (2026-09-10 오전).**
  `sorge` 담당자가 「판보기 버튼」을 넘겼고, 받아서 이 집 빚을 갚았다.
  - **손:** `python3 ~/repos/gh/agent-config/skills/sorge/scripts/board.py --mine` (무인자 = cwd git remote 로 집 유추). 심링크 사슬은 이미 다 서 있었다 — **배선 문제가 아니라 목차 문제였다**(`SKILL.md` API 표에 `board.py` 가 아예 없었다). 지적 넷을 돌려줬고 sorge 가 `2d2fca2` 로 전부 닫았다.
  - **실측이 판단을 뒤집은 자리:** 이 집 몫 17건 중 **5건이 남의 리포에 filed** 돼 있었다(`sorge#1`·`#6`·`#7`·`#16`·`#17`). `gh issue list -R agent-config` 로는 영영 안 보인다.
  - **갚은 빚:** 미분류 **12 → 1**. `#13` 은 `house:forge-config` 로 라우팅했다(본문 전체가 그 집 레인 설계다). `house:` 를 갖는 집은 `sorge` 와 여기 둘뿐 — sorge 서기 전 여기가 coord 자리였던 유산이다.
  - **후보 판정이 휘발하던 자리는 닫혔다.** `andenken#13`·`#14` 를 내 몫으로 판정했는데 적을 라벨이 없어 sorge 에 돌려줬고, 그 집이 `d898a39` 로 고쳤다 — 원인은 내가 짚은 세 갈래 중 어느 것도 아니었고 게이트가 「어느 리포가 이슈를 드나」를 보고 있던 것이었다. 지금 이 집 판: **확정 20 · 미분류 0**(실측 2026-09-10 오후. 후보 레인은 그날 은퇴했다 — 위 「판보기 2차」).

- **raw-paste — 고친 것이 없었고, 늙은 프로세스였다 (2026-09-10).**
  폰(Termux)→ssh→tmux→pi 에서 여러 줄 붙여넣기가 줄마다 제출되던 건. **확장은 어제(`6a15009`)
  이미 옳았고 오늘 코드 수정은 0건이다.** 새 창을 띄우니 그대로 됐다.
  - **규칙:** pi 확장은 **프로세스 시작 때만** 프로토타입에 붙는다. 살아 있는 세션에 소급되지 않는다. *"확장 고쳤는데 안 된다"의 1순위 용의자는 늘 늙은 프로세스다.*
  - **회귀는 bun 으로 돈다** — `bun run pi-extensions/tests/raw-paste.test.ts` → 10/10. `npx tsx --test` 는 top-level await 를 cjs 로 트랜스폼하려다 8개 에러로 죽는다.
  - 판정 전문 = [`sorge#16`](https://github.com/junghan0611/sorge/issues/16). 남은 §5(tmux `extended-keys on` + `extended-keys-format csi-u`)는 `nixos-config` 몫이고 **붙여넣기와 무관하다** — Shift+Enter 줄바꿈 삶의 질이다.

- **Hot group: #24 예상 답안 게이트 — 계약에서 물건까지 왔다 (2026-09-09).**
  담당자 턴이 `blocked`로 끝났을 때 **무슨 근거로 계속하는가**. GLG 원문: *"무슨 근거로 계속
  진행을 한다는 거지? 기억축 시간축이 있는가 아닌가거든."* 계약 =
  [#24](https://github.com/junghan0611/agent-config/issues/24).
  - **섰다:** lint(`./run.sh test:gate`) · 익스텐션 `pi-extensions/decision-gate.ts` ·
    회귀 둘(`./run.sh test:decision-gate` → 132 checks, 스텁 + 실물 pi 로드 스모크) ·
    **모델 지정면**(`/decision-gate model …` / `DECISION_GATE_MODELS` / 기본값 3층).
  - **실물 2판(oracle, 스크래치 세션 디렉터리):** 상주 `xai/grok-4.6` ← 게이트
    `openai-codex/gpt-5.6-luna`(env). dig 11–15회·4축, 인용 3/3·2/2 해소, `helpful:null`,
    **consult 1회 $0.0015–0.0017**. → #24 §못 잰 것의 *"형제 호출 1회당 쿼터"* 가 재졌고,
    세션당 상한 3회의 실제 비용은 $0.005 남짓이다.
  - **교차검수 한 판(`openai-codex/gpt-5.6-terra`, `/tmp/dg-review-terra.md` 51줄, sha256
    `102f166…`)이 구멍 둘을 잡았고 둘 다 고쳤다.** ① **실패한 consult 가 영수증 없이 사라져
    같은 blocked 전이가 다음 `agent_settled` 에서 다시 유료로 발화했다** — 엔트리가 성공
    뒤에만 쓰였는데 `findPendingBlocked` 는 그 엔트리로 에지를 판정한다. 이제 결과가 무엇이든
    `outcome`(ok/no-model/deadline/error)과 사유를 실은 엔트리가 나간다. ② **dig 을 끊어도
    손자가 살아남았다**(래퍼 셸 → `npx tsx`): 실측 자손 2개 중 직계 kill 생존 2, 그룹 kill
    생존 0 → `detached` + `process.kill(-pid)`.
  - **두 번째 트리거 — `/autopilot` 파일럿 (2026-09-28).** GLG 저널 week39 원문: 질문에 답이 없으면
    DM → 그래도 없으면 decision-gate 가 기억축으로 잠정 판단 → DM. 목표 없는 평범한 YOLO 세션용이라
    트리거는 `update_goal(blocked)` 가 아니라 코디네이터의 명시 선언 `waiting_for(kind:"glg")` 다
    (멈춤 ≠ GLG 질문 — `peer`/`local` 이 따로 있다). `pi-extensions/autopilot.ts` + `decision-gate.ts`
    의 `runConsult` 추출. 10m DM → 20m consult → DM#2 + 패널, **진행 없음·도구 권한 없음**,
    예산 세션당 DM 4 · consult 3(공유). 회귀 `./run.sh test:autopilot`(스텁 + 실물 로드).
    **눈으로 보기:** `./run.sh demo:autopilot` — [DEMO] 판(실물 runConsult + 스텁 형제 → 정직한 hold, `dm.sh --dry-run`)과
    설치된 pi 격리 RPC 판(`/autopilot` 등록·on/status/off). 둘 다 **다리·로더가 실제로 돈다는 측정 증거**이고,
    GLG 판단·실물 DM·유료 consult 의 증거는 **아니다** — 텔레그램·모델·세션 파일 0.
    **이 기기(thinkpad)에 좁게 설치됨 (2026-09-28 17:50 KST):** `~/.pi/agent/extensions/autopilot.ts` → 리포 파일 심링크
    한 줄(옆 `decision-gate.ts` 링크와 나란히 — 하나만 있으면 로드 실패). 새 pi 프로세스부터 실리고 기본 OFF.
    되돌리기 `rm ~/.pi/agent/extensions/autopilot.ts`. 다른 기기는 `run.sh setup` 의 `*.ts` glob 이 같은 모양을 만든다.
    **다음:** 실물 DM/consult 한 판은 2026-09-29에 수행했다(상단 좌표 16). 남은 것은 인용 적합성 판독과 "진행" 경계 모델에 대한 GLG 판정.
  - **#24 는 닫혔다** (2026-09-09, GLG 지시 "일단 닫아"). 권고는 반대였고 그대로 남겼다. 좌표 댓글 =
    [issuecomment-5601577118](https://github.com/junghan0611/agent-config/issues/24#issuecomment-5601577118).
    본문의 "안 닫히는 이유 셋" 중 ②캐는 손은 닫혔고, ③G2는 좁은 경로가 기계가 됐고,
    ①lint 미연결은 **열린 채로 이슈가 닫혔다**.
  - **닫으면서 넘어온 것 둘 — 여기가 그 자리다. 이슈로 다시 열지는 GLG 몫:**
    ① **§1~§6 판단축 파일을 게이트가 쓰게 할 것인가.** 익스텐션은 캐기만 하고 `.md` 를 안 쓴다.
    그런데 이번 consult 자신이 그 질문을 캐서 *"축 1 in-file 유지 · 축 1b 별도 파일 기각"*
    [`sessions#81`] 과 *"agent-config 은 스킬 관리·시험소"* [`sessions#58`] 를 물어왔다(inference).
    **그게 맞으면 이 항목은 "연결한다"가 아니라 "연결하지 않는다"로 닫힌다.**
    ② **G2 하드닝 셋** — `agent_settled` 대기 비용(정착 뒤를 최대 8분 막는다) · 그 CLI 안이
    읽기 전용이라는 미증명 · provider 별칭이 같은 쿼터면 fail-closed 가 뚫리는 것. 전부
    `pi-extensions/decision-gate/README.md § 교차검수가 남긴 한계 셋`.
  - **아직 못 잰 것:** 자연 발생 `blocked`(두 판 다 `-t create_goal,update_goal` 로 3턴 게이트를
    우회해 띄웠다) · `openclaw` 축은 oracle 에 없다(exit 4 `state=absent`, authority=thinkpad,
    andenken#14) · `timeline` 축은 cwd 에 `events.jsonl` 이 있어야 선다.
- **직전에 닫은 것 (2026-09-09, `v2026.9.9`):** 사람이 앞에 없는 시간을 위한 세 물건이
  한 컷에 들어갔다 — `heartbeat`(스스로 깨는 시계) · `decision-gate` lint(근거 없는 진행 차단,
  G2는 아래 8번) · `dm`(끝난 쪽이 사람을 부른다). 여기에 `raw-paste`(마커 없는 붙여넣기)와
  footer 두 자리. **자르기 전에 문서를 먼저 검수했고** 교차검수 한 판(`gpt-5.6-terra`)이
  `home/AGENTS.md`가 이미 사라진 dm 게이트를 규칙으로 들고 있던 것을 잡았다.
- **직전 Hot group:** 7이 닫혔다(`v2026.9.9`, CHANGELOG § semantic-memory). `v2026.9.4-wiring.1`로 배선 다섯 자리가
  닫혔고, 3·4는 둘 다 남의 손을 기다린다.
- **Next:** 좌표 10 의 나머지 세 이슈(#23·#21·#16). 나머지 두 후보 3(entwurf-peek `trace`)·4(#46)은 **둘 다 여기서 시작할 수 없다** —
  각각 entwurf 쪽 fixture와 normalize가 선행이다.
- **직전에 닫은 것 (2026-09-04, `v2026.9.4-wiring.1`):** `forge` 스킬 실물을 `forge-config`로
  이관하고 상대 심링크로 연결(`3b9f72e`, 그쪽 `dfe25c8`) + `LINKED_SKILL_NAMES` · `doctor:bins`가
  `stale`/`unprovenanced`/`arch`를 이름으로 부른다(`8ea458d`) — **oracle 첫 실행에서 `bibcli`
  게이트 밖 배포를 잡았다** · `CLAUDE.md` 한 줄로 이 집 `AGENTS.md`가 Claude Code에 실린다
  (`ac35c02`) · emacs 5인자 형태와 대소문자 감지(`2510512` `7554331`) · denotecli `date` 오해
  (`9825bbc`) · `Pi ext/skill: not linked` 오탐(`d34c720`) · 임베딩 자리를 스킬이 아닌 포인터로
  (`b835e2e`). 세션+가든 임베딩 전량 동기화도 이날 돌렸다 — sessions 27건(오라클 포함),
  md 172건, 양쪽 verify orphan 0.
- **넘긴 것:** 9월 활동 리포 13개의 `CLAUDE.md` 누락은 **횡단 발견으로 `sorge`에** 넘겼다
  (남의 집 커밋은 그 집 담당자 몫). `forge-database`(Magit Forge 판) 네이밍 겹침과 base64
  판독 문제도 같은 경로로 넘겼다.
- **형제 공지:** 코퍼스 문서면 자체가 이미 공지다 — `AGENTS.md § device 축`을 모든 형제가 읽는다.
  브로드캐스트는 GLG가 직접 부를 몫이라 여기서 일방 발신하지 않는다.
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

- **기억축 정화 — 좌표 20 (2026-10-02, GLG 지시).** GLG 북극성: *"목표는 나랑 대화한 턴이야. 그래야 decision-gate가 동작이 가능하게 기억이 생기거든."* GLG가 1·2·3을 andenken 담당자에게 직접 전달하고 거기서 판정했다 — 원문(andenken 중계): *"**1번은 삭제해야돼. 남아야하는것은 나와 에이전트 사이의 대화 여야돼. … 전체 임베딩은 안할거야. … 넥스트에 잡아줘.**"* andenken은 이를 **C와 B′ 둘 다 drop**으로 읽었고, 실행 좌표를 자기 집 RAIL 5로 가져갔다.
  - ⚠️ **내가 이 좌표를 처음 쓸 때 「시간 날 때 전체 재임베딩」이라고 적었다. 그건 틀렸다** — GLG 판정은 **전체 재임베딩 안 함**이다. 삭제는 재임베딩을 부르지 않으므로(행 삭제, API 0) 전체 재임베딩이 필요한 일이 아니다.
  - **andenken 전량 재측정 [andenken 측정 — 실제 `extractSessionChunks`로 매니페스트 2,597 파일 재추출. 재추출 합 100,282 = 매니페스트 합 = `Total in DB`. 스크립트 thinkpad `/tmp/andk/{today,all,trend}.mts`]:** GLG 발화+GLG에게 한 답 **75,398(75.2%)** · 에이전트↔에이전트 **5,040(5.0%)** · **하네스 주입 17,925(17.9%)** · compaction/continuation 279 · 미분류 1,640.
  - **하네스 주입 내역:** CC skill 본문 `Base directory for this skill:` **8,291** · task-notification(도어벨/Stop hook) **5,619** · 슬래시 래퍼 1,399 · local-command 1,244 · pi `<skill name=` 803 · interrupted 432 · /loop 129 · system-reminder 8. **같은 SKILL.md가 반복 임베딩된다 — `commit` 764회 · `session-recap` 475회 · `next-handoff` 101회**(75개 skill에서 첫 파트 1,926개). 월별 하네스 비중: 04 14.3% · 05 5.4% · 06 14.1% · **07 25.6%** · 08 18.2% · 09 21.0% · **10 24.3%** — 형제 작업이 늘수록 도어벨도 함께 는다.
  - **판정:** **A(바닥을 추출 문자로) 기각** — 바닥은 축적의 손잡이가 아니다(형제는 통과해도 5~12 chunk). 바닥 본래 일(probe/test 거르기)은 지금도 한다. **B(세션 단위 서랍) 기각 → 턴 단위로 바꿔 채택 후보**. **C 신설 = 본론: 하네스 주입을 sanitize 단계에서 drop.** 17.9%이고 에이전트 몫의 3.5배다. **단 실제 삭제량은 17.9%보다 조금 적다** [andenken 정정] — 그 안에 슬래시 래퍼 1,399가 들어 있고 래퍼만 벗기고 args는 남기기 때문이다. 그리고 **GLG 판정으로 B′(에이전트↔에이전트 5,040)도 함께 drop**이므로, 남는 축은 「GLG ↔ 에이전트」 75,398 + compaction 279 쪽이다.
  - **왜 턴 단위인가:** 형제 식별 신호는 meta-record가 아니라 턴 안에 있다(첫 user 턴이 `You are a fresh visible citizen that entwurf opened…` — 616 파일 / 13,899 chunks). 그런데 **616 중 405 파일에 GLG가 형제 창에 직접 친 턴이 있다** — 세션 단위로 빼면 에이전트 5,040을 지우려다 **GLG 축 5,146을 함께 지운다**. 규칙: user 턴 = {human | agent-brief | harness}, assistant 턴은 **직전 user 턴의 출처를 수신자로 물려받는다**. 에이전트가 *보낸* 메시지는 기동 브리프 말고는 이미 구조적으로 빠져 있다(pi `custom_message`, claude `tool_result`) → 중복 우려는 대부분 근거 없음.
  - **조심할 것:** 슬래시 래퍼의 **args에는 GLG 말이 섞인다 → 래퍼만 벗기고 args는 남긴다.** continuation 요약은 pi compaction과 같은 성격이라 **남긴다**.
  - **비용·수순:** 빼는 쪽은 **API 0**(행 삭제는 재임베딩을 안 부른다). 앞으로의 유입은 sanitize 규칙+테스트로 막고, 과거 행은 `lance predicate delete → compact → verify → oracle publish`(tier 4 단계 C 수순, 백업·receipt 포함) + **매니페스트 chunks 재계산**.
  - **GLG 판정 끝 — 대기 없음.** C·B′ 둘 다 drop, 전체 재임베딩 없음. 남은 것은 andenken 쪽 실행과 acceptance 보고다.
  - **안 잰 가설 하나를 내가 사실처럼 썼다** [andenken 정정]: *"`commit` 764 복사본이 사라지면 검색 품질이 바로 오른다"* — **안 쟀다.** acceptance의 before/after로 재야 한다. 복사본 수가 top-k를 갉아먹는다는 것은 그럴듯하지만 측정이 아니다.
  - **내 전달 오류 기록(코디네이터):** 내가 형제 몫을 **75%로 과대보고**했다. 원인 — 내 재현이 pi `role:"toolResult"`의 text 블록을 셌고, 인덱서는 `session-indexer.ts:537` `if (role !== "user" && role !== "assistant") return []`로 그걸 버린다. sol 1차 전사 실측: `toolResult` 352,306자 vs `user+assistant` **6,891자**(98.1%가 버려지는 쪽). 그래서 「효율 5 대 490」은 형제 간 차이가 아니라 **코디네이터 대 형제 전체**의 차이이고, 실제 형제 몫은 **약 25%**다. **필터를 재현한다면서 필터 한 줄을 안 읽었다.**

- **`skill-audit` + botlog 증류 — 좌표 21 (2026-10-02).** 자리: `.claude/skills/skill-audit/SKILL.md` 프로젝트 로컬(`.claude/skills/`는 entwurf 격리 경계를 넘는 유일한 표면이라 이 repo 안의 모든 형제가 자동으로 집는다). **GLG 지시로 아직 쓰지 않았다** — grok 검토까지만 받고 멈췄다.
  - **완료 기준(사내 하네스 창립 문장에서):** 「검사가 있다」가 아니라 **「검사가 실제 위반을 실패로 반환한다」**.
  - **grok 검토 결과 — 설계 수정 셋 [grok `20261002T170828-2f3096` 보고, 2026-10-02]:** ① **크기 게이트와 botlog PASS는 양립 불가** — botlog 증류본이 119줄/7,446B로 `<100줄·<4KB`를 넘으므로 크기를 pass/fail 기준으로 쓸 수 없다. ② **라이브 파일을 영구 expected-FAIL fixture로 쓰지 마라** — `.claude/skills/agent-config/SKILL.md`(328줄/23,319B, 207행이 자기를 샘플로 선언)를 영구 오라클로 쓰면 **그 파일을 고치는 행위가 테스트를 깨뜨린다. 수선이 검사의 적이 된다.** 창립 결함(검사가 위반을 통과)의 반대편. → **얼린 표본(frozen sample)을 쓴다.** ③ **`70B/줄`은 한글을 벌한다** — `sorge` 106.5 B/줄 vs 60.1 자/줄, `timeline` 75.3 vs 43.1. **자/줄 > 70은 2/50뿐.** 바이트가 아니라 **자(char)로 재야 한다**.
  - **기각된 내 수치 [내가 재검산]:** `C8 6/50 → **8/50**`(내 `split('\n')` 길이가 개행+1이라 분모가 1 커서 비율이 낮게 나왔다. 경계: voscli 72.4·subtract 71.2·agent-config 71.1) · `C5 197/240 → 117/176`은 **비교 불가**(2차에서 패턴을 `금지`→`금지한다`로 바꿔 분모를 줄였다) · `바이트 중앙값 9,276 → **8,394**`(9,276은 denotecli의 바이트이고 어느 중앙값도 아니다) · **코퍼스 정의를 반드시 적을 것 = 50개**(`skills/*/SKILL.md` 49 + `.claude/skills/agent-config/SKILL.md`).
  - **보탤 검사:** description↔본문 모순(오늘 botlog이 케이스 — 본문은 「고민 좌표」를 first-class로 올렸는데 description은 `임시 작업기`만 말한다) · **베끼라고 한 예시가 현재 정책을 어김**(참조 노트의 `@pi` vs 규칙 `@mitsein` — *"예시는 규칙을 이긴다"*) · **검사 보고 계약: 분율은 분자·분모·코퍼스 정의·명령(`grep -c` vs `grep -o`)을 함께 적는다** — 오늘의 열두 오류가 이 집의 실제 위반이다 · 썩는 숫자를 문서에 박는 것(`25 notes already do`는 보존된 채 안 재어졌다) · 한 표면의 모양을 세 표면 규칙으로 쓰는 것(21행 `PI_MODEL`은 pi 모양, Claude Code·openclaw에 있는지 미측정).
  - **기계화 실패를 그대로 기록한다:** C5(금지에 대안 없음) 82%/66% → 소음. C7(앞 100줄 안에 표/블록) 0/50 → 너무 약함(첫 30줄로 좁히면 12/50, 다른 검사다). **「미구현」이 아니라 「시도했고 분수가 이래서 실패」로 적고 재현 명령을 함께 둔다.**
  - **열지 말 것:** `AGENTS.md:110`·`README.md:270`의 `Target: <100 lines, <4KB`를 **손으로 고치지 않는다** — GLG: *"그건 빼버려. 자기 수선에서 문제가 딱 걸려야돼."* 그 줄은 **검사의 입력**으로 남는다. 출처 추적 결과: 근거 노트 `20260401T112943` 히스토리 8행에 **`369줄→69줄, 14KB→3.4KB`**(emacs 한 건의 실측)만 있고 **`<4KB`·`<100줄`은 그 노트에 없다**. 강제 장치 **0건**(`run.sh:1714`의 `4096d`는 임베딩 차원, 거짓 양성). 50개 중 둘 다 만족 **6개(12%)**.
  - **같은 좌표의 미커밋 판정 — botlog 증류본:** `skills/botlog/SKILL.md` **250줄/12,291B → 119줄/7,446B** (SHA256 `0df4189595db2a411d25f5ef6fb6db6e1c50fe5a290264032afc11be60f58cdd`). sol 작성, grok 검토, 내가 역주 검산: (A)GLG 워딩 셋·(B)하네스 게이트 넷·(C)API 세 시그니처·(D)라우팅 표·(E)플레이스홀더 7종 **전부 생존**(줄번호는 grok 보고 참조). 사본 `/tmp/botlog-250.bak`(250줄)·`/tmp/botlog.bak`(229줄), HEAD=229줄. **GLG 판정 대기 넷:** ① 증류본 채택 ② 45줄 org 템플릿 — grok 추천 **(c) 복원 없이 `@pi`를 이름하는 한 줄 + 둘째 참조를 `timeline hub, not the skeleton`으로 라벨** ③ **description에 「고민 좌표」를 넣을지**(항상 보이는 문장이 본문과 싸운다) ④ 커밋(오늘 세 번 변경: 이슈 연결 신설 → GLG 정정 반영 → 증류).

# ACTIVE

## 남의 집 것 — 배정 전에는 건드리지 않는다
- **sorge#1 완료조건 10 (C-15)** — 09-03 임베딩 제공자 오류의 원인·복구. 담당 미정. 단서는
  `main` 봇이 남겼다: `getSessionsProvider()`가 sessions·openclaw 두 경로의 관문이라 env 하나가
  빠지면 두 축이 동시에 죽는다; 파일 폴백 `embedding-provider.ts:901-905`.
  **skill 표면의 계약과 맞닿아 있어 언젠가 이 집 자리가 될 수 있다.**
- **완료조건 6 (기억축 복구)** — 6봇 중 5봇이 15초 게이트를 통과 못 한다(glg 85.4s).
  `nixos-config`/oracle 몫으로 승급됐다.

## [2026-09-06] 아직 어디에도 안 박은 규칙 — `file:line`의 스냅샷 앵커
- 넘어가는 `file:line`에는 **스냅샷 앵커**를 단다 — `HEAD`(sha)인지 워킹트리(시각)인지.
  형제가 동시에 살아 있으면 `file:line`은 좌표가 아니라 **시점 의존 포인터**다.
- 오늘 이걸로 미끄러졌다: 내가 `sorge`의 receipt를 "틀렸다"고 했는데 **둘 다 자기 스냅샷에서
  맞았다** — `sorge`는 15:12에 `HEAD`(`67188c2`)를, 나는 15:29에 워킹트리(mtime 15:24)를 읽었고
  그 사이 andenken 담당자가 그 게이트를 걷어내는 중이었다.
- 자리: `~/AGENTS.md § How a fact crosses between siblings`의 "receipt를 나른다"에 붙는 확장.
  **GLG의 전역 규칙이라 이 집에서 손대지 않았다.** `sorge`가 `sorge#1` 본문에도 박기로 했다.

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
  신선도 검사가 `run.sh` 를 보는 것은 과검출이 아니다 — `4a3afd6` 이 배포 산출물의 종류
  자체를 바꿨고(host → portable) 두 기기 모두 실제로 재배포가 필요했다. 재배포 후 양쪽 다
  경고가 사라졌다. 검사 대상에서 빼지 마라.
- Devices: **양 기기 정렬 완료 (2026-09-03, thinkpad 실측).** thinkpad에도 nix-ld가 있다
  (`/lib64/ld-linux-x86-64.so.2` → `nix-ld-2.0.6`) — `standard loader missing` 은 뜨지
  않았다. 그 분기는 두 기기 모두에서 미발동이고, 미확인 칸은 닫혔다. GraalVM 전체 재빌드
  (`build --force`, native-image 19.4s, `:trans 2453` validate 통과) → gcroot 2경로 재고정
  → portable + graph.edn 세트 배포 → `doctor` 5/5 GREEN. 호스트 본 크기가 이전과
  바이트 동일해 src 무변화가 빌드 결정성으로도 확인됐다. 오라클은 read-only 확인만 했고
  손대지 않았다 — 이미 목표 상태다(배포본 == `target/dictcli-aarch64-portable`, graph
  `cmp` 동일, gcroot 09-03 10:08, smoke `harness`). 거기서 `build --force` 는 **돌리지 마라**:
  src가 04-15 이후 무변화라 산출물이 같은데 native-image Peak RSS 1.65GB를 봇 호스트에서 쓴다.
- Do not: 번들을 host 본으로 되돌리지 마라. nix-ld 덕에 portable 본이 NixOS 호스트에서도
  돈다(양 기기 실측). 되돌리면 **개발본 오배포**이고, doctor 가 그 이름으로 잡는다.
- Closed(합의): **doctor 진단명을 기기 능력으로 갈랐다** (dictcli 담당자와 논의 완료,
  2026-09-03). 배포는 언제나 `cp` 한 번이고 갈림길은 어느 산출물이냐뿐인데, 그 판정이
  기기마다 뒤집힌다 — 표준 loader 있으면 store interp 는 **개발본 오배포**(처방=배포본 교체,
  gcroot 무관), 없으면 개발본 배포가 **정상인 예외**(이때만 gcroot 가 방어선). `run.sh`
  `has_std_loader()` 가 가르고 `fragile` 태그가 `misdeploy` / `stale-dev` / 그 외로 나뉜다.
  담당자가 찾아준 자기모순도 닫았다 — `standard loader missing` 처방이 "개발본을 깔아라"라
  시키는데 새 이름은 같은 상태를 오배포라 불렀다. 이제 그 분기에 "이 기기는 예외"라고 명시한다.
  `stale-dev` 는 담당자 지적에서 나온 새 검사다: 핀은 매 빌드 리셋돼 *지금의* 개발본만
  가리키므로 불변식은 "핀에 있나"가 아니라 **배포된 개발본 == 리포의 개발본**이다.
  변이 테스트로 확인 — 개발본을 스킬 디렉토리에 넣으니 `dictcli(misdeploy)` 로 잡히고,
  배포본으로 되돌리니 GREEN(`cmp` 로 복구 확인).
- Not changed(합의): dictcli 리포는 안 건드린다. `pin_libc_gcroot` 의 `rm -f "$root_dir"/*`
  는 결함이 아니고(기기당 개발본 한 벌 = 핀은 그 상태의 반영), `build --output` 이 portable
  아닌 것을 내보내는 경로도 없다(담당자가 `run.sh:271` + `make_portable_binary` 방어 셋에서
  확인). 담당자가 기록한 무해 엣지 둘 — `DICTCLI_STATIC=1` 전환 시 이전 핀 **누수**(덮어쓰기가
  아니라 반대 방향), 한 `$HOME` 에서 두 arch 병존 시 `root_dir` 미분리. 둘 다 현재 미발동이라
  고치지 않았다.
- Detect(중요): `dictcli_stale_check` 는 `find -newer` mtime 비교라 **손으로 방금 cp 한
  개발본은 오히려 제일 최신이라 안 걸린다.** 즉 interp 분기가 개발본 오배포의 **유일한
  탐지기**다 — 이름을 틀리게 붙이면 탐지 경로 하나가 통째로 잘못된 처방을 낸다.

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
