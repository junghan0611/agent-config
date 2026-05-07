---
name: memory-sync
description: "Incrementally freshen the sessions index for semantic-memory. Explicit call only; local Qwen3-Embedding-4B, $0, ~30s. Use before a new session or when recent session recall feels stale. '/memory-sync', 'memory sync', 'session embedding', 'session indexing', '세션 임베딩'."
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
- 풀싱크 · 비용 게이트 · oracle 운영은 에이전트가 자동화하지 않는다 (₩100K 사고 잔존 안전). 사람이 andenken에서 직접 수행.
- SSOT는 `~/repos/gh/andenken/scripts/sync-sessions.sh`. 이 스킬은 thin wrapper.
