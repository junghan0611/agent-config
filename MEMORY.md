# agent-config MEMORY.md

세션을 넘어 기억해야 할 결정, 교훈, 주의사항을 기록한다.
AI 에이전트가 새 세션 시작 시 이 파일을 읽고 맥락을 복원한다.

---

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
