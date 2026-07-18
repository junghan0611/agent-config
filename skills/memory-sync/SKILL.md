---
name: memory-sync
description: "세션 인덱스만 거의 라이브로 증분한다 — 호출 즉시 새 세션을 semantic-memory에 임베딩. OpenRouter Qwen3-Embedding-8B 4096d, 유료 remote지만 최근 수 세션 증분은 ~$0.000~0.001. dim 4096 preflight → to_index=0이면 API0 exit. 새 세션 시작 전이나 최근 세션 회상이 낡았을 때. '/memory-sync', 'memory sync', 'session embedding', '세션 임베딩', '세션 증분', '기억 최신화'."
user_invocable: true
---

# memory-sync — 세션 인덱스 라이브 증분

semantic-memory의 **sessions 인덱스만** 증분한다. 호출하면 바로 새 세션이
기억층에 들어간다. 세션 회상을 신선하게 유지하는 한 손 — 검색(semantic-memory)
직전에 부르면 직전 대화까지 잡힌다.

**md(가든)·verify·compact·oracle 복제는 여기서 하지 않는다.** 그 풀 유지보수는
andenken 리포의 `andenken-embed` 스킬 담당. 이 스킬은 **세션 한 트랙, 즉시 증분**만.

## 호출

```bash
bash {baseDir}/scripts/sync-sessions.sh           # 세션 증분 (기본)
bash {baseDir}/scripts/sync-sessions.sh --push    # 증분 + oracle rsync (DB+manifest)
```

그냥 부르면 된다. 인자도, 프리뷰도 필요 없다. 스크립트가 알아서:

1. **dim 4096 preflight** 1콜로 provider/DB 차원 일치 확인.
2. **`to_index=0` → API 0 exit.** 증분할 게 없으면 프로브도 없이 끝(비용 0). 방금
   돌린 뒤 다시 불러도 무해.
3. `to_index≥1`이면 새 세션만 임베딩. 보통 몇 초, ~$0.000~0.001.

| Flag | Default | Effect |
|------|---------|--------|
| (none) | - | 세션 증분, oracle push 없음 |
| `--push` | off | 끝난 뒤 `sessions.lance` + `session-manifest.json`을 oracle로 rsync |

sessions 트랙은 OpenRouter `qwen/qwen3-embedding-8b` / 4096d. 예전
`--backend ollama|gpu1i` 2560d 경로는 폐기됐다. 비용은 작지만 0은 아니다
(`$0.01/M tokens`). wrapper가 `~/.env.local`을 source해 `OPENROUTER_API_KEY`를
공급하고, provider/dim 안전장치는 andenken SSOT 스크립트가 담당한다.

## 한 번에 동기로 — race 금지

이 스크립트에는 **동시 실행 락이 없다.** 두 인스턴스가 동시에 돌면 index race.

| 패턴 | 가능 |
|------|------|
| 동기 호출, 끝까지 대기 | ✅ 정상 |
| 백그라운드 호출 후 다른 작업 | ⚠️ 같은 sync를 다시 부르지 말 것 |
| 백그라운드 + sleep 폴링 + 후속 동기 호출 | ❌ 자초한 race 패턴 |
| 두 세션에서 동시 호출 | ❌ 한 세션에서만 |

답답해서 다시 부르면 race. 완료를 기다린다. 시작 전 확인:
`pgrep -af 'sync-sessions|indexer.ts'` — 결과가 있으면 끝날 때까지 대기.

## andenken-embed와 역할 분리

| | memory-sync (이 스킬) | andenken-embed (andenken 리포) |
|--|--|--|
| 범위 | 세션 한 트랙 | sessions + md(가든) 풀 유지보수 |
| 목적 | 회상 신선도, 즉시 라이브 증분 | 재임베딩·검증·조각 정리·복제 |
| 어디서든 | ✅ 얇은 wrapper | andenken 리포에서 `./run.sh` |
| md / verify / compact / oracle 운영 | ❌ (andenken-embed로) | ✅ |
| 풀 rebuild(파괴적) | ❌ | 사람 게이트 (에이전트 자동화 금지) |

세션만 빠르게 최신화하고 싶으면 이 스킬. md 증분·무결성 검증·frag 정리·oracle
복제가 필요하면 andenken 리포에서 `andenken-embed`.

## Notes

- **명시 호출 전용.** 이 스킬을 에이전트가 cron/자동으로 부르지 않는다.
  (andenken `sync-sessions.sh` 자체는 hourly cron cadence를 상정하지만, 그건
  andenken 쪽 인프라가 도는 것이고 이 스킬 호출과는 별개다.)
- 호출 시점: 새 세션 시작 전, `/new` 직후 직전 세션 회상이 필요할 때, 검색 전에
  직전 대화까지 잡고 싶을 때.
- 풀싱크·비용 게이트·파괴적 rebuild는 에이전트가 자동화하지 않는다
  (₩100K 사고 잔존 안전). 세션 증분만 이 스킬로, 나머지는 andenken-embed로.
- SSOT는 `~/repos/gh/andenken/scripts/sync-sessions.sh`. 이 스킬은 그것을 exec하는
  thin wrapper다(`{baseDir}/scripts/sync-sessions.sh`).
