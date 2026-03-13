# agent-config — AGENTS.md

에이전트 인프라 허브. pi extension, skill, 설정을 관리한다.

## 이슈 트래킹 (beads_rust)

```bash
br list                          # 이슈 목록
br show <id>                     # 이슈 상세
br create "제목"                 # 기본 생성
br create "제목" -p p0 -l "tag1,tag2" -t epic

br update <id> -s in_progress
br update <id> --design "설계 요약" --acceptance-criteria "완료 조건" --notes "작업 노트"
br close <id>                    # ⚠️ design/acceptance_criteria/notes 필수
br comments add <id> "코멘트"
br sync --flush-only             # git commit 전 필수
```

| 실수 | 해결 |
|------|------|
| `br close` → NOT NULL | `br update`로 필수 필드 채운 후 close |
| `br comment` | `br comments add` (복수형 + add) |

## Extensions

`./pi-extensions/` 에 위치. pi 런타임에 로드되어 tool + command 를 등록한다.

### semantic-memory

Session RAG — LanceDB + Gemini Embedding 2 + Jina Rerank.

- **Architecture doc**: `~/org/botlog/20260312T174622`
- **OpenClaw pattern**: native Gemini API (not openai-compatible) — taskType, batchEmbed, Matryoshka 지원
- **DB**: `~/.pi/agent/memory/sessions.lance` (173MB, 11,844 chunks)
- **Test**: `cd pi-extensions/semantic-memory && npm test` (41 tests)

Key files:
| 파일 | 역할 |
|------|------|
| `index.ts` | ExtensionAPI 진입점 — session_search tool, /memory command |
| `gemini-embeddings.ts` | Gemini Embed 2 native API |
| `session-indexer.ts` | JSONL 파싱 → chunks |
| `store.ts` | LanceDB wrapper (OpenClaw lazy-init 패턴) |
| `retriever.ts` | RRF fusion + recency decay + Jina rerank |
| `test.ts` | 유닛 + 통합 테스트 |

환경변수 (모두 `~/.env.local`):
- `GEMINI_API_KEY` — 필수
- `JINA_API_KEY` — 선택 (rerank)

### 세션 소스 확장 (계획)

현재: `~/.pi/agent/sessions/` (pi 로컬)
다음: OpenClaw 봇 세션 (Oracle VM → git pull → reindex)
나중: `~/org/` Denote 노트 (Phase 2, Matryoshka 768d)

## Skills

`./skills/` — pi-skills에서 이관 예정.

## 개발 가이드

```bash
# 테스트
cd pi-extensions/semantic-memory && source ~/.env.local
npm run test:unit        # API 불필요 (30 tests)
npm run test:integration # API 필요 (11 tests)
npm test                 # 전부
npm run test:search -- "query"  # 라이브 검색

# Extension 로드 테스트
pi -e ./pi-extensions/semantic-memory/index.ts

# 인덱싱
# /memory reindex         — pi 내부에서
# /memory reindex --force  — 전체 재구축
```
