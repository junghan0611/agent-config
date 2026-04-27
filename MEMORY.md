# agent-config MEMORY.md

세션을 넘어 기억해야 할 결정·교훈·주의사항. 새 세션 시작 시 읽고 맥락 복원.

> **0.2.0 (2026-04-27)**: pi-shell-acp의 reference consumer로 위치 정렬. `mcp/`, `deprecated/` 제거. README/AGENTS.md 슬림화. 자세한 내용은 [CHANGELOG.md](CHANGELOG.md).

---

## [2026-04-13] Gemini API 비용 관리

### 현황
- GCP `embedding-gemini2`에서 embedding과 Gemini delegate가 같은 API key를 공유
- org 풀인덱싱 1회 ≈ ₩5,300, sessions ≈ ₩500

### 교훈 — ₩100K 임베딩 폭탄 (2026-03-30)
- 반복 force rebuild + 양쪽 중복 빌드로 발생
- `./run.sh estimate all`로 사전 비용 확인 필수
- Gemini delegate 비용도 같은 한도에 합산됨

> 4 safety layers in andenken: 3s rate limiter, cost estimator, $1 abort threshold, removed auto-indexing on `/new`.

---

## [2026-04-13] gogcli — searchconsole 포크 운영

### 결정
- `steipete/gogcli` → `junghan0611/gogcli` 포크, `feat/searchconsole` 브랜치
- `gog sc` (analytics, inspect, sitemap, sites) 4개 서브커맨드

### 바이너리 경로 (SSOT)
- **SSOT**: `~/repos/gh/agent-config/skills/gogcli/gog`
- 심링크: `~/.local/bin/gog`, `~/.pi/agent/skills/pi-skills/gogcli/gog`
- `~/go/bin/gog` 잔재 — 삭제 완료 (sc 미지원 구버전)

### 주의사항
- `gog sc inspect`의 `--site`는 trailing slash 필수: `https://notes.junghanacs.com/`
- 오라클 인증: `GOG_KEYRING_PASSWORD` export 필요 (file backend). `gog login --remote --step 1/2` 방식

---

## [2026-04-15] andenken 로컬 임베딩 전환 — 미완

### 현재 상태
- **코드**: provider 추상화 완료 (Gemini + vLLM/ollama 모두 동작)
- **bake-off 인덱스**: `data/bakeoff-qwen4b/org.lance` — 94,931 chunks, 2560d
- **운영 인덱스**: 아직 Gemini 768d (dimension mismatch로 벡터 검색 불가)

### 다음 작업 (30분 추정)
1. cleanup 완료 확인 → verify 통과
2. golden-queries bake-off (Qwen3-4B vs Gemini)
3. bakeoff-qwen4b → 운영 경로 교체
4. `~/.env.local`에 `ANDENKEN_PROVIDER=vllm` + ollama 환경변수 설정
5. sessions 인덱스도 2560d 재구축
6. pi 재시작 → **완전한 로컬 시맨틱 검색 (Gemini API 의존 제거)**

### 의미
- 임베딩 비용 $0 (로컬 GPU/CPU)
- ₩100K 폭탄 재발 원천 차단
- 인터넷 없어도 시맨틱 검색 가능

---

## 일반 운영 메모

### extension 수정 후 반영
- `/reload` hot-reload. 재시작 불필요.
- pi는 extension을 프로세스 시작 시 + 세션 resume 시 로드. 실행 중인 세션은 자동 반영 안 됨.

### NixOS 빌드 주의
- patchelf로 nix store 인터프리터 → 표준 경로 변경 시 깨짐. NixOS는 patchelf skip이 정상.
- `|| true`로 빌드 실패를 삼키지 말 것 — `if !` 패턴으로 가시화.

### 다른 머신 재현 가능성
- `run.sh setup`이 SSOT. 새 작업 추가 시 항상 자문: "다른 디바이스에서 재현되는가?"
- 3rd-party 코드를 직접 수정하면 git pull 시 소실 → fork 후 관리.
