# NEXT — agent-config

> Volatile next-step anchor. Closures belong in commit history,
> persistent facts in `AGENTS.md` / `docs/`. This file lists only
> what is left to do. Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

## [2026-05-20] entwurf-peek 후속

- sync spawn blind spot 재발 시 `tool:done` 전 단계(`tool:start` + fresh child file correlation)까지 보여줄지 판단. 지금은 declared `tool:done Task ID`가 1차 시그널
- state는 last-event heuristic으로 정리됨. pi-shell-acp inline text / openai-codex toolCall 사례는 확인했지만, live 실행 중 provider별 JSONL shape는 실전 1~2회 더 보며 보정
- heuristic caller 오인 가능성 낮추는 scoring 보강 여부는 실전 사례 1~2회 더 보고 결정

---

## [2026-05-18] 오늘 정리 완료

- voscli 스킬 삭제 — `~/repos/work/voscli/` 로컬 스킬로 이관 완료 (`113e096`)
- session-control pi-extension 제거 — dead surface 정리 (`016005b`)
- Skill 툴 권한 추가 — permission prompt 제거 (`4742b6f`)
- lifetract SKILL.md 싱크 — ha 커맨드 + today JSON shape 호도 정정 (`5ec2ad2`)

다음 Track은 아래 pi-chat 검증 (진입 조건 변동 없음).

---

## [2026-05-22] Track B 진척 — 격리 구조 파악, GLG 결정, 본 시작 준비

- gpt-5.5 분신 리뷰 ($0.68, 9 turns) 완료 — 정정사항과 추가 위협 벡터 5개는 llmlog [[denote:20260522T085656][20260522T085656]]에 보존.
- **GLG 결정 (가볍게 시작, 좁혀가기)**:
  - 보안 통과 기준 — **넓게 시작 → 운영하며 좁힘**. 분신이 지적한 위협 벡터(`/shared` 오염, remote control 남용, runtime secret 파일 노출 등)는 *기록만* 해두고 차후 round에서 다시.
  - 설치 방식 — `pi -e ~/repos/3rd/pi/pi-chat` 확정. **코드 수정·PR 없음**. 삽질할 때 그 자리에서 코드 본다.
- voscli GraalVM 전환 거의 준비 완료 — Track B의 미래 진입 조건(VM 내부 실행 경로)을 동시에 채워주는 작업.

### 다음 한 걸음 (정리됨)

1. `pi -e ~/repos/3rd/pi/pi-chat`로 로컬 로드 → `/chat-config`로 Discord account/channel 1개 등록.
2. `/chat-connect` 또는 `/chat-spawn-all`로 worker 기동 → 메시지 3~5회 왕복.
3. `~/.pi/agent/chat/.../channel.jsonl`에서 inbound/outbound/job_completed 확인. `/workspace`·`/shared` 경계 감각 확인.
4. 운영 중 깨지는 자리는 *llmlog에 기록*. 즉시 막지 않음. 충분히 모이면 보안 round 다시.
5. 운용 감각 생긴 뒤에만 `skills/pi-chat/SKILL.md` — GLG식 상주 담당자 운영 매뉴얼.
6. 이후 incidentcli `NEXT.md`에 "v0.3 진입 조건: pi-chat + 상주 패턴 1회 이상 검증됨" 반영.

### 닫힌 자리 (기록)

- 첫 도메인: placeholder 담당자 유지. voscli/cos/botment는 격리 검증 후.
- 표면 채널: Discord 우선. Telegram은 이후 비교축.
- 설치 방식: `pi -e` (위 결정).
- 보안 기준: 넓게 시작 (위 결정).

### 기억할 자리 (운영 중 만나면 다시 봄)

- runtime secret `/workspace/.secrets/<name>` 파일 노출 (agent가 읽을 수 있음)
- `/shared/` 채널 간 prompt injection 전염
- remote control `stop/new/compact/status` 외부자 남용
- attachment의 memory/skill/SYSTEM.md 오염
- system prompt의 `apk` 사용 허용 → 공급망 자리
- outbound HTTP/TLS 다 열림 (Gondolin HTTP hook은 secret 치환에만 적용)

---

## [2026-05-16] Track B — pi-chat + 상주 담당자 패턴 (배경 보존)

`incidentcli v0.3`의 "격리 런타임 위 독립 담당자" 패턴을 바로 incidentcli 안에서 처음 만지면 위험하다. `pi-chat`을 먼저 `agent-config`에서 실제 운용해보고 상주 담당자 패턴을 표준화한 뒤 v0.3 진입 조건으로 가져간다.

**핵심 정렬 (변경 없음)**: `skills/pi-chat/SKILL.md`를 먼저 만들지 않는다. 이 작업의 관심은 "채팅 연결"이 아니라 **외부 채널에 노출되는 상주 담당자의 터를 얼마나 견고하게 잡을 수 있는가**다.

> 5/16 박힌 다음 한 걸음 6단계 + 검증 기준 초안은 [llmlog 20260522T085656][[denote:20260522T085656][링크]] § "pi-chat README/AGENTS.md 파악 결과"로 흡수됨. 5/22 결정에 따라 위 정리된 한 걸음으로 갱신.
