# agent-config MEMORY.md

세션을 넘어 기억해야 할 결정, 교훈, 주의사항을 기록한다.
AI 에이전트가 새 세션 시작 시 이 파일을 읽고 맥락을 복원한다.

---

## [2026-04-22] pi-tools-bridge MCP 단계별 verification roadmap

### 배경
- pi-shell-acp는 thin bridge product로 닫힘. `agent-config`가 consuming harness.
- `mcp/pi-tools-bridge`는 pi-side tool을 ACP host(Claude/Codex)에 노출하는 어댑터. agent-config 소유.
- 이번 라운드에서 추가: `list_sessions` (active control sockets), `delegate_resume` (saved delegate session sync revival).

### 단계별 검증 순서 (PM 합의)
1. **delegate_resume sync on Claude** ← 현재 라운드, 수동 smoke 대기
2. **test on Codex** — 같은 코드 경로, 별도 smoke
3. **async on Claude** — 미구현. 별도 설계 라운드 필요 (MCP는 push notification surface 약함)
4. **async on Codex**
5. **remote (SSH)** — `runDelegateResumeSync`/`runDelegateSync`에 코드 경로는 있지만 **end-to-end 미검증**. delegate-core.ts와 delegate_resume tool description에 명시함.

### 두 lookup layer 분리 (PM 강조, 코드 reviewer가 확인할 것)
- `list_sessions` = `~/.pi/session-control/*.sock` (active world, control.ts)
- `delegate_resume` = `~/.pi/agent/sessions/**/delegate-<taskId>.jsonl` (saved world, delegate.ts)
- 두 lookup이 서로 의존하면 안 됨. delegate_resume은 control socket 죽어도 동작해야 함.

### 보류 (다른 축, 섞지 말 것)
- AGENTS.md 큰 리라이트 — 추후
- `defaultModel` bare-id 정리 / pi 0.68.0 대응 — 별도 축
- `pi-shell-acp` 코드 수정 — 닫혔음

---

## [2026-04-13] gogcli 포크 — searchconsole 서브커맨드

### 결정
- `steipete/gogcli` → `junghan0611/gogcli` 포크, `feat/searchconsole` 브랜치
- `run.sh setup`에서 upstream `go install` → 로컬 포크 빌드로 전환
- `gog sc` (analytics, inspect, sitemap, sites) 4개 서브커맨드

### 바이너리 경로 (SSOT)
- **SSOT**: `~/repos/gh/agent-config/skills/gogcli/gog` (빌드 결과)
- `~/.local/bin/gog` → 심링크 → SSOT
- `~/.pi/agent/skills/pi-skills/gogcli/gog` → 심링크 → SSOT
- `~/go/bin/gog` — 삭제함 (구버전 잔재, sc 미지원)

### 주의사항
- `gog sc inspect`의 `--site`는 trailing slash 포함 필수: `https://notes.junghanacs.com/`
- 오라클 인증: `GOG_KEYRING_PASSWORD` export 필요 (file backend). `gog login --remote --step 1/2` 방식
- OAuth scope 추가 시 `gog login <email>` 재인증 (기본값 `--services user`에 searchconsole 포함)

### 비용
- Search Console API 자체는 무료
- Gemini API로 delegate 분석 시 같은 API key 과금 주의 (embedding + 대화 합산)

## [2026-04-13] Gemini API 비용 관리

### 현황
- GCP 프로젝트 `embedding-gemini2`에서 embedding과 Gemini delegate가 같은 API key 사용
- 이번 달 ₩11.6K / ₩20K 한도
- org 풀인덱싱 1회 ≈ ₩5,300, sessions ≈ ₩500

### 교훈
- ₩100K 임베딩 폭탄 (2026-03-30) — 반복 force rebuild + 양쪽 중복 빌드
- `./run.sh estimate all`로 사전 비용 확인 필수
- Gemini delegate 비용도 같은 한도에 합산됨

## [2026-04-13] andenken 고도화 계획 수립 완료

### 4개 패턴 (모두 임베딩 재구축 불필요)
1. RRF top-rank bonus (10줄, retriever.ts rrfFusion)
2. Strong Signal Bypass (20줄, FTS 점수 분포 조사 선행)
3. 쿼리 결과 캐싱 (인메모리 Map + TTL)
4. Recall Tracking (recalls.jsonl → 기억공고화 2단계)

### 상세 계획
- llmlog `20260413T174833` 참조
- 리랭킹은 하지 않음 (Jina MRR 하락 검증됨)
- 한 번에 하나씩, golden-queries 전후 비교로 검증

## [2026-04-13] control.ts를 3rd-party에서 agent-config으로 fork

### 배경
- `control.ts`(세션 간 통신 extension)는 `mitsuhiko/agent-stuff` 3rd-party 코드
- 유일하게 agent-config에서 관리하지 않는 extension이었음
- 심링크: `~/.pi/agent/extensions/control.ts → repos/3rd/agent-stuff/pi-extensions/control.ts`

### 변경 내용
1. **targetSessionId fallback**: AI가 `targetSessionId`로 호출해도 `sessionId`로 인식
   - "Trust Agent Intuition" 원칙 적용
2. **gcStaleSockets()**: session_start 시 dead 소켓 자동 정리 (기존 TODO 구현)
3. **run.sh 수정**: 3rd-party 심링크 덮어쓰기 섹션 제거 → agent-config 루프에서 자동 포함

### 교훈
- 다른 머신 재현 가능성을 항상 자문할 것 — run.sh setup이 SSOT
- 3rd-party 코드를 직접 수정하면 git pull 시 소실됨 → fork해서 관리
- 수정 후 반드시 run.sh의 심링크 경로가 올바른지 확인

### 주의
- upstream(`mitsuhiko/agent-stuff`) 변경 시 수동 머지 필요
- `repos/3rd/agent-stuff`는 여전히 clone되어 있음 (다른 파일 참조 가능성)

## [2026-04-13] extension 수정 후 반영 방법

**`/reload`로 hot-reload 가능. 재시작 불필요.**

- pi는 extension을 프로세스 시작 시 로드하고, 세션 resume 시에도 다시 로드
- 하지만 이미 실행 중인 세션은 자동 반영 안 됨
- extension 코드 수정 후 실행 중인 세션에 반영하려면: `/reload` 명령 사용
- 재시작은 최후의 수단

## [2026-04-15] dictcli 빌드 안전성 강화 — 캐시 검증 + patchelf 가드

### 문제
- `target/dictcli-x86_64` 캐시가 깨져있어도 파일 존재만으로 재사용
- NixOS에서 patchelf가 인터프리터를 `/lib64/...`로 바꾸면 실행 불가 (nix store 경로 필요)
- `agent-config/run.sh`의 `|| true`가 빌드 실패를 삼킴

### 수정 (dictcli ded6c81 + agent-config 5eaa78f)
1. 캐시 체크에 `validate` 스모크 테스트 추가 — 깨진 바이너리 자동 감지 → rm → 재빌드
2. `/etc/NIXOS` 가드 — NixOS에서 patchelf 건너뛰기
3. `|| true` → `if !` 패턴 — 빌드 실패 시 경고 출력, 기존 바이너리 보존

### 재현 검증
- local(x86_64) + oracle(aarch64) 양쪽 fresh build 성공
- 캐시 재사용 경로 검증 (setup:build 재실행 → 해시 동일)
- graph.edn 해시 양쪽 일치 (94e880a...)

### 교훈
- **NixOS에서 patchelf는 독** — nix store 인터프리터가 정상. 표준 경로로 바꾸면 깨짐
- **캐시 = 파일 존재 ≠ 정상** — 반드시 validate 통과해야 캐시로 인정
- **`|| true` 금지** — 실패를 삼키면 다음 사람이 고생한다

## [2026-04-15] andenken 로컬 임베딩 전환 — 한 텀 남음

### 현재 상태
- **코드**: provider 추상화 완료 (Gemini + vLLM/ollama 모두 동작)
- **bake-off 인덱스**: `data/bakeoff-qwen4b/org.lance` — 94,931 chunks, 2560d, err:0
- **cleanup**: 25K duplicate 제거 진행 중 (concurrency race condition 원인)
- **운영 인덱스**: 아직 Gemini 768d — dimension mismatch로 벡터 검색 불가

### 노트북 ollama 서빙 계획
- 쿼리도 로컬로 전환 (현재 인덱싱만 GPU 서버, 쿼리는 Gemini)
- 노트북에 ollama + qwen3-embedding:4b 서빙
- Q4 양자화 쿼리 vs fp16 인덱스 품질 차이 확인 필요

### 다음 세션 작업 (30분)
1. cleanup 완료 확인 → verify 통과
2. golden-queries bake-off (Qwen3-4B vs Gemini 비교)
3. bakeoff-qwen4b → 운영 경로 교체
4. `~/.env.local`에 ANDENKEN_PROVIDER=vllm + ollama 환경변수 설정
5. sessions 인덱스도 2560d 재구축
6. pi 재시작 → **완전한 로컬 시맨틱 검색 (Gemini API 의존 제거)**

### 의미
- 임베딩 비용 $0 (로컬 GPU/CPU)
- ₩100K 폭탄 재발 원천 차단
- 인터넷 없어도 시맨틱 검색 가능
