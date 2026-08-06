# HERMES — 검수 매트릭스

Hermes Agent를 **자기학습 벤치마크 대상**으로 재는 작업면. 비교 대상은 우리 축
(`AGENTS.md` + skills + semantic-memory + botlog/NEXT 루프).

설치 근거(태그 고정, `.#minimal` + anthropic, `setup_all` 제외, 검색 extra 없음)는
`run.sh:1026-` 주석이 SSOT다. 여기는 **측정 결과와 남은 것**만 적는다.

> 후보이지 채택이 아니다. `nixos-config`에 선언하지 않고, 우리 스킬 SSOT를
> `~/.hermes/skills`에 연결하지 않는다 — 주입하면 측정 대상이 사라진다.

---

## 상태 — 2026-08-06

`v0.20.0` (태그 `v2026.8.3`) · `~/repos/3rd/hermes-agent` 태그 고정 ·
`nix profile`에 `hermes` / `hermes-agent` / `hermes-acp` · `.#minimal` + `anthropic`.

**인증** — 전부 env/gh CLI 자동 발견: `copilot` `openrouter` `upstage`/`solar`
`deepseek` `gemini` `huggingface` `ollama-cloud`.
`anthropic`은 **구독 쿼터 소진**(HTTP 400, 헤르메스 축 아님), `openai-codex` 미등록.
→ 벤치마크는 Claude 구독을 안 태우는 레일로 돌린다.

---

## 기억축 — 헤르메스가 장점이라 말하는 그것

**최소 설치에 이미 다 있다. extra 불필요.** 실측으로 동작 확인.

| 축 | 정체 |
|---|---|
| `session_search` | 세션 DB에 대한 SQLite **FTS5**. `hermes_state_search.py` 2229줄. 3모드(discovery/scroll/browse), **LLM 호출 0** |
| `memory` | `MEMORY.md` / `USER.md`. `hermes memory --help`: *"Built-in memory is always active"* |
| 외부 provider | honcho·openviking·mem0·hindsight·holographic·retaindb·byterover. 동시 1개. **플러그인 — 현재 죽어 있음(↓)** |

둘 다 `toolsets.py` 기본 posture에 포함. 우리 축과의 대비:

| | Hermes 기본 | 우리 semantic-memory |
|---|---|---|
| 엔진 | SQLite FTS5 (키워드) | LanceDB 벡터 + FTS 하이브리드 |
| 임베딩 | 없음 | Qwen3-Embedding-8B 4096d |
| 질의 | 단일 언어 | 한↔영 크로스링귀얼(dictcli) |

**헤르메스의 기억 검색은 키워드다.** 우리가 벡터를 쓰는 자리에 FTS5를 쓴다.
그러므로 "자기개선"의 근거는 검색 품질이 아니라 **스킬 생성·개선 루프**에 있고,
D1/D2가 진짜 관측 지점이다.

## 플러그인 매니페스트 — 이 빌드의 구조적 결함

```
소스 plugins/**/plugin.yaml  96개  →  nix store  0개
bundled 0 manifest(s) / user 0 / entrypoints 0
```

빌드가 `.py`만 설치하고 매니페스트를 전부 빠뜨린다. 발견이 `plugin.yaml`을 키로
돌므로 **번들 플러그인 전체가 등록되지 않는다** — 웹 프로바이더 9종, 외부 memory
provider 7종, **a2a 플랫폼**, copilot-acp. 파일은 클로저에 있는데 등록만 안 된다.

- C축(A2A 포함)이 지금 빌드에서 **막힌다**.
- **D축이 살아 있는 이유도 이것** — core 모듈이지 플러그인이 아니라서.

---

## 남은 것

상태: `측정됨` / `미측정` / `막힘`

### A. 설치·격리

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| A1 | 바이너리 기동 | 측정됨 | `hermes --version` → `0.20.0` |
| A2 | 상태 격리 | 미측정 | 세션 한 판 뒤 `~/.hermes` 밖 쓰기가 있는가 |
| A4 | 재빌드 재현성 | 측정됨 | extra 추가→되돌리기 왕복에서 원래 store path로 정확히 복귀 |
| A5 | **plugin.yaml 부재 범위** | 미측정 | `.#full` / upstream `.#messaging`에도 빠지는가. upstream 버그 vs 우리 경로 |

### B. 추론 레일

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| B1 | 대안 provider 추론 | 미측정 | `hermes chat --provider openrouter` 한 턴 |
| B2 | `openai-codex` OAuth | 미측정 | `hermes auth add openai-codex --type oauth` |
| B3 | `anthropic` | 막힘 | 구독 쿼터. 헤르메스 축 아님 |

### C. 통신면 — A5 뒤로

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| C1 | ACP 의존성 | 측정됨 | `hermes-acp --check` → OK |
| C2 | ACP 실제 구동 | 미측정 | `--check`는 import 확인일 뿐 |
| C3 | `hermes mcp serve` | 미측정 | OpenClaw 9-tool 브리지 호환면 |
| C4+ | A2A 전반 | **막힘** | 플러그인 매니페스트(↑) |

> C는 D를 막지 않는다. **본체는 D다.**

### D. 자기학습 루프 — 본체

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| D1 | **스킬 자동 생성** | 미측정 | 세션을 돌려 `~/.hermes/skills`에 무엇이 언제 생기는가 |
| D2 | **사용 중 개선** | 미측정 | 같은 스킬이 재실행 사이에 바뀌는가 (diff) |
| D3 | 메모리 축 | 측정됨 | ↑ 기억축 표. 외부 provider 비교는 막힘 |
| D4 | `SOUL.md` | 미측정 | 우리 `AGENTS.md` 대응물인가. 사람이 쓰는가 에이전트가 쓰는가 |
| D5 | cron / hooks | 미측정 | 우리 `/loop`·훅과 겹치는 축 |
| D6 | `delegate_task` | 미측정 | 프로세스 내 서브에이전트, 재귀 위임 차단 |
| D7 | **비교 판정** | 미측정 | D1–D6을 우리 루프와 나란히. **이 문서의 존재 이유** |

### E. entwurf 축 — 우리 것이 아님

`entwurf_v2` peer protocol을 A2A로 여는 문제. **entwurf 소유, PM은 GPT.** 구현하지
않는다. 우리 몫은 시험 상대 제공뿐(단 C4가 막혀 지금은 그것도 불가).

전달할 때 값 있는 조사 결과(2026-08-06, 미전달):

- entwurf 문서에 A2A 언급 **0회** — 기각이 아니라 레이더 밖.
- **ACP가 두 개다.** entwurf/Hermes = Zed 계열 Agent **Client** Protocol.
  `homeagent-config/docs/A2A.md`가 비교한 건 IBM/BeeAI의 Agent **Communication**
  Protocol — 이름만 같다.
- entwurf `AGENTS.md § ACP Plugin Boundary`가 `peer protocol`을 **core 소유**로
  명시 → 플러그인이 아니라 **네 번째 capability domain**이 자연스럽다.
- A2A는 동기 RPC가 아니다(Task lifecycle + push + `tasks/subscribe`).
  `entwurf_v2`의 send-is-throw와 충돌하지 않는다.

---

## 미해결

1. **D7을 무엇으로 판정하는가.** 생성된 스킬 수는 지표가 아니다.
2. **A5** — C축 전체와 외부 memory provider가 여기 걸려 있다.
3. 어느 기기에서 재는가. 지금은 thinkpad 한 대.

## 명령

```bash
run.sh setup:hermes       # 태그 고정 설치 (setup_all에 없음)
hermes auth list          # env/gh CLI 자동 발견 포함
hermes chat --provider openrouter
hermes-acp --check
hermes mcp serve
```

`hermes login`은 폐기(Nous Portal 전용). 인증은 `hermes auth add <provider> --type oauth`.
