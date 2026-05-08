---
name: memory-sync
description: "Incrementally freshen the sessions index for semantic-memory. Explicit call only; local Qwen3-Embedding-4B, $0. ~20s on a vLLM-equipped server (gpu1i), but can take 5-10 minutes on a laptop with cold ollama. Use before a new session or when recent session recall feels stale. '/memory-sync', 'memory sync', 'session embedding', 'session indexing', '세션 임베딩'."
user_invocable: true
---

# memory-sync

semantic-memory의 **sessions 인덱스만** 증분 업데이트한다. 세션을 기억층으로 두기 위한 freshener.

## API

```bash
bash {baseDir}/scripts/sync-sessions.sh           # sessions 증분 (기본)
bash {baseDir}/scripts/sync-sessions.sh --push    # sessions 증분 + oracle rsync
```

| Flag | Default | Effect |
|------|---------|--------|
| (none) | - | sessions 증분, oracle push 없음 |
| `--push` | off | 끝난 뒤 `data/sessions.lance/`를 oracle로 rsync |
| `--backend ollama` | auto | 로컬 ollama(:11434) 강제 |
| `--backend gpu1i` | auto | gpu1i vLLM 터널 강제 |

기본 백엔드 선택: `ollama → gpu1i` 자동 폴백. 둘 다 Qwen3-Embedding-4B 2560d. 외부 API 비용 **$0**.

## 디바이스별 백엔드 선택 가이드

| 디바이스 | 권장 호출 | 이유 |
|----------|-----------|------|
| **노트북 (thinkpad 등)** | `--backend gpu1i` 명시 권장 | dGPU 없음 → ollama 내장 GPU만 사용 → 18 sessions 기준 600초+. gpu1i vLLM 터널은 같은 작업 ~20초. **약 32배 차이** |
| **NUC / 서버** | 인자 없이 (default) | ollama가 충분히 빠르거나 자동 폴백으로 gpu1i 잡음 |
| **Oracle 자체** | (해당 없음) | sessions 인덱스 freshen은 자기가 자기를 못 함 — `--push`로 oracle에 보냄 |

호출 전 `cat ~/.current-device`로 확인. 디바이스 모를 때 안전 default = `--backend gpu1i`.

## 호출 패턴 — 한 번에 동기로

이 스크립트에는 **동시 실행 락이 없습니다**. 두 인스턴스가 동시에 돌면 race / dim=0 abort 위험.

| 패턴 | 가능 |
|------|------|
| 동기 호출, 끝까지 대기 | ✅ 정상 |
| 백그라운드 호출 후 다른 작업 | ⚠️ 같은 sync를 다시 부르지 말 것 |
| 백그라운드 + sleep으로 폴링 + 후속 동기 호출 | ❌ 금지. 제가 자초한 race 패턴. |
| 두 세션에서 동시 호출 | ❌ 한 세션에서만 |

**노트북에서 ollama가 cold load되어 5~10분 걸려도 그냥 기다리세요.** 답답해서 다시 부르면 race 발생.

## 범위 — 무엇을 하지 않는가

이 스킬은 **sessions 증분 한 가지**만 한다. 아래는 사람이 andenken에서 직접:

```bash
cd ~/repos/gh/andenken && source ~/.env.local
./run.sh status            # 현재 상태
./run.sh estimate all      # 전체 비용 dry-run
./run.sh index:org         # org 증분
./run.sh verify all        # 무결성 검증
./run.sh cleanup org       # cleanup
ssh oracle "..."           # oracle 운영
```

## Notes

- **자동/cron 호출 금지.** 명시 호출만.
- 호출 시점: 새 세션 시작 전, `/new` 직후 직전 세션 회상이 필요할 때.
- 호출 직전 "이미 돌고 있나?" 확인: `pgrep -af sync-sessions` — 결과가 있으면 끝날 때까지 대기.
- 풀싱크 · 비용 게이트 · oracle 운영은 에이전트가 자동화하지 않는다 (₩100K 사고 잔존 안전). 사람이 andenken에서 직접 수행.
- SSOT는 `~/repos/gh/andenken/scripts/sync-sessions.sh`. 이 스킬은 thin wrapper.
