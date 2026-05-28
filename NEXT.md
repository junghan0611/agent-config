# NEXT — agent-config

> Volatile next-step anchor. Closures belong in commit history,
> persistent facts in `AGENTS.md` / `docs/`. This file lists only
> what is left to do. Convention: `~/AGENTS.md § Session End Protocol — NEXT.md`.

## [2026-05-28] multi-harness command surface — 후속

- `commands/` SSOT 유지 + wrapper 방향 확정.
- 1차 prototype landed:
  - `skills/command-recall/SKILL.md`
  - `skills/command-glgimage/SKILL.md`
- 현재 원칙:
  - pi / Claude는 native command surface 유지
  - agy / Codex는 필요한 것만 **thin skill wrapper**
  - wrapper는 `command-*` 접두로 일반 skill과 구분
- 새로 알게 된 사실:
  - agy / Codex는 repo-managed command prompt surface보다 skill 쪽으로 유도한다.
  - 둘 다 **내장 이미지 생성 능력**이 있어 구독 요금으로 생성 가능. 따라서 `glg-image` wrapper도 native image generation 우선 전략이 맞다.
- 다음 검토:
  1. `recall`, `glg-image` wrapper가 실제 호출감/발견성 면에서 괜찮은지 본다.
  2. 괜찮으면 `/boom`, `/pandoc-html` 등으로 확장.
  3. command → wrapper 자동 생성기로 갈지 판단.

## [2026-05-27] global commit/push safety rail — 닫힘

- 3 device 활성 완료: 로컬 + oracle + hejdev6. 모두 `gitleaks 8.28.0`(또는 동등) + `core.hooksPath` 동작 중.
- 정식 wiring (nixos-config): `8207406` (GLG 직접 commit) — `programs.git.settings.core.hooksPath` + `home.packages: gitleaks`.
- agent-config 쪽: `06e8a18` (rail 도입) + `b78fd65` (NixOS XDG readonly trap 우회 — `git config --file ~/.gitconfig`).
- hejdev6 = 회사 머신 (hostname `goqual`, non-NixOS). 정체성 분리: nix-managed `Junghan Kim`(회사) 유지, `~/.gitconfig user.name = junghan`(개인 repo) override.
- 다음 device 추가 시 `./run.sh setup` 한 번으로 끝. 미래 문제 발생 시 이 섹션 다시 살릴 것 — 그 외 영속 사실은 commit history + CHANGELOG가 source.

---

## [2026-05-20] entwurf-peek 후속

- sync spawn blind spot 재발 시 `tool:done` 전 단계(`tool:start` + fresh child file correlation)까지 보여줄지 판단. 지금은 declared `tool:done Task ID`가 1차 시그널
- state는 last-event heuristic으로 정리됨. pi-shell-acp inline text / openai-codex toolCall 사례는 확인했지만, live 실행 중 provider별 JSONL shape는 실전 1~2회 더 보며 보정
- heuristic caller 오인 가능성 낮추는 scoring 보강 여부는 실전 사례 1~2회 더 보고 결정

---

## [2026-05-22 오후] pi-chat Add group 단계에서 멈춤 — 다음 세션 우선 항목

오전 결정 받아 본 시작했다. **막힌 자리: `/chat-config` → telegram-glg-entwurf-bot → Add group 선택 시 setup TUI가 즉시 닫힘 (silently die).** Telegram account 자체는 등록 완료, 채널만 비어 있음.

### 오늘 진척

| 항목 | 상태 | 위치 |
|---|---|---|
| nixos-config에 qemu 추가 | ✅ 커밋·푸시 (`956ebbb`) | `machines/shared.nix` Oracle 제외 블록 |
| `~/.env.local`에 `PI_ENTWURF_BOT_TOKEN` | ✅ 동기화됨 | syncthing — 모든 device 적용 |
| pi-chat npm 의존성 설치 | ✅ `npm ci --ignore-scripts` (298 packages) | `~/repos/3rd/pi/pi-chat/node_modules` |
| Node fetch IPv6 timeout 진단 | ✅ NixOS thinkpad는 IPv6 outbound 없음, Node 24 fetch가 IPv4 fallback 안 함 | curl -4 정상, curl -6 4ms fail |
| Process-level IPv4 patch | ✅ `~/.pi/agent/patches/ipv4-only.mjs` | `NODE_OPTIONS="--import=..."`로 적용 |
| pi-chat extension IPv4 patch | ✅ `index.ts` 상단 `setGlobalDispatcher` | upstream local, **PR 안 함** |
| Telegram account 등록 | ✅ `telegram-glg-entwurf-bot` | `~/.pi/agent/chat/config.json` |
| Add group → setup TUI | ❌ silently die | `observeTelegramTarget` catch가 에러 삼킴 |
| catch error log 진단 patch | ✅ `src/tui/telegram-setup.ts:149` | upstream local, **PR 안 함** |

### 다음 세션 첫 한 점

```bash
NODE_OPTIONS="--import=$HOME/.pi/agent/patches/ipv4-only.mjs" pi -e ~/repos/3rd/pi/pi-chat/
```

1. `/chat-config` → `telegram-glg-entwurf-bot` 선택 → **Add group** 재시도
2. terminal stderr에 `[pi-chat] observeTelegramTarget error: ...` 메시지 나옴 — 그 내용으로 분기:
   - `fetch failed ETIMEDOUT/ENETUNREACH` → IPv4 dispatcher가 group 호출 시점에 안 먹힘. 추가 fix 필요.
   - `401 Unauthorized` → token 또는 webhook 충돌 (이전에 다른 시스템에 물려 있던 자리)
   - 다른 메시지 → 케이스별 분석
3. **DM 모드도 한 번 통과시켜보기** — `/start` 봇 DM에 보내서 자동 등록까지 가는지. 매트릭스 좁히기용
4. 채널 등록 성공 시 → 그룹에서 `@glg_entwurf_bot 안녕` 같은 mention으로 첫 turn 왕복

### 정리·후속

- 위 IPv4 patch 자리는 **차후 round** — `NODE_OPTIONS` alias로 박을지, pi-chat fork 만들지, nixos-config에서 IPv6 라우팅 본질 점검할지 결정
- `[2026-05-22 오전]` § "기억할 자리"에 한 줄 추가 자리: **Node 24 native fetch가 IPv4 fallback 제대로 안 함** — 다른 pi extension에서도 만날 자리
- pi-chat upstream 2자리 local patch는 git 변경 그대로 — fetch 시 충돌 가능. 다음 세션 시작 시 `cd ~/repos/3rd/pi/pi-chat && git status` 한 번 확인

---

## [2026-05-22 오전] Track B 진척 — 격리 구조 파악, GLG 결정, 본 시작 준비

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
