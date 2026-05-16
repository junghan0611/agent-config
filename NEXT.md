# NEXT — agent-config

> Volatile next-step anchor. Closures belong in commit history,
> persistent facts in `AGENTS.md` / `docs/`. This file lists only
> what is left to do. Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

## [2026-05-16] Track B — pi-chat + 상주 담당자 패턴 선행 검증

### 왜

`incidentcli v0.3`의 “격리 런타임 위 독립 담당자” 패턴을 바로 incidentcli 안에서 처음 만지면 위험하다. `pi-chat` 자체를 먼저 `agent-config`에서 실제 운용해보고, 상주 담당자 패턴을 표준화한 뒤 v0.3 진입 조건으로 가져간다.

### 현재 파악

- upstream clone: `~/repos/3rd/pi/pi-chat`
- 성격: Discord/Telegram ↔ Live Adapter ↔ pi agent, 채널마다 Gondolin micro-VM 1개
- storage: `~/.pi/agent/chat/`
- 주요 명령: `/chat-config`, `/chat-connect`, `/chat-spawn-all`, `/chat-workers`, `/chat-open-all`, `/chat-kill-all`, `/chat-new`
- sandbox: agent tool `read/write/edit/bash`는 VM 내부 `/workspace`, `/shared` 기준으로 라우팅
- 채널 로그: append-only `channel.jsonl`; inbound/outbound/job lifecycle trace 남김

### 정렬 — skill부터 만들지 않는다

`skills/pi-chat/SKILL.md`를 먼저 만들지 않는다. 아직 실제로 운용해보지 않았고, Gondolin 격리 구조를 충분히 이해하지 않은 상태에서 skill을 만들면 upstream README 요약에 그친다. 이 작업의 관심은 “채팅 연결”이 아니라 **외부 채널에 노출되는 상주 담당자의 터를 얼마나 견고하게 잡을 수 있는가**이다.

### 다음 한 걸음

1. Gondolin / pi-chat 격리 구조부터 읽는다.
   - VM lifecycle, `/workspace`·`/shared` mount 경계
   - host ↔ guest path translation
   - tool routing: `read/write/edit/bash`가 실제로 어디서 실행되는지
   - outbound network / HTTP secret hook / runtime secret exchange
   - `channel.jsonl` trace와 job boundary가 공격·오작동 분석에 충분한지
2. Discord 우선 샘플 연결을 검토한다.
   - Slack 전 단계로 “슬랙 유사 surface”에서 운영자/상주 담당자 패턴을 시험한다.
   - 단, 연결 성공보다 격리·권한·로그·회복 경계 확인을 우선한다.
3. 첫 검증은 placeholder 담당자부터 시작한다.
   - 한 Discord 채널에서 mention/DM → 응답 → trace JSONL 확인
   - 아직 voscli/cos 같은 실제 업무 도메인에 붙이지 않는다.
4. 검증 기준 초안:
   - `/chat-config`로 Discord account/channel 1개 등록
   - `/chat-connect` 또는 `/chat-spawn-all`로 worker 기동
   - 메시지 3~5회 왕복
   - `~/.pi/agent/chat/.../channel.jsonl`에서 inbound/outbound/job_completed 확인
   - `/workspace`와 `/shared` 경계 확인
   - host 파일 접근 차단/제한 감각 확인
   - secret 주입 경로가 agent prompt/로그에 노출되지 않는지 확인
   - 외부 공격성 입력(prompt injection, 파일 요구, secret 요구)에 담당자가 무너지지 않는지 관찰
5. 실제 운용 감각이 생긴 뒤에만 `skills/pi-chat/SKILL.md`를 만든다.
   - 목적: pi-chat 사용법 요약이 아니라 **GLG식 상주 담당자 운영 매뉴얼**.
6. 이후 incidentcli `NEXT.md`에는 “v0.3 진입 조건: pi-chat + 상주 패턴 1회 이상 검증됨”으로 반영.

### 열린 결정

- 첫 도메인: placeholder 담당자 유지. voscli/cos/botment는 격리 검증 후.
- 표면 채널: Discord 우선으로 기울어짐. Telegram은 이후 비교축.
- `pi-chat` 설치 방식: `pi install ~/repos/3rd/pi/pi-chat` vs 개발 중 `pi -e ~/repos/3rd/pi/pi-chat`
- 상주 담당자 보안 기준: 어느 정도의 prompt injection / secret exfiltration / host escape 내성을 “통과”로 볼지 정해야 함.
