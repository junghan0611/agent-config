# agent-config MEMORY.md

세션을 넘어 기억해야 할 결정, 교훈, 주의사항을 기록한다.
AI 에이전트가 새 세션 시작 시 이 파일을 읽고 맥락을 복원한다.

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
