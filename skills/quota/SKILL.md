---
name: quota
description: "다섯 개 모델 구독(rail)의 남은 쿼터를 한 번에 조회 — Copilot 프리미엄 요청 잔량, Z.AI GLM 5시간/주간 크레딧, Codex 5h/weekly 윈도우, Claude 5h/7d 윈도우, Grok SuperGrok weekly credit usage. GLG가 다음 분신을 어느 rail로 보낼지 결정할 때 쓴다. Use when: '쿼터', '얼마 남았', '남은 크레딧', '어디로 보낼까', 'quota', 'usage', 'how much is left', 'which rail', 'rate limit check'."
user_invocable: true
---

# quota — 남은 쿼터 한눈에

```bash
python3 {baseDir}/scripts/quota.py
```

다섯 rail을 순서대로 GET하고, 한 화면에 정렬해서 찍는다.
과거 이력도, 알림도, 모니터링도 아니다 — **지금 이 순간의 상태**만 답한다.
스크립트가 숫자를 찍으면, 에이전트가 그걸 읽어 GLG에게 산문으로 설명한다.

## 출력 형태

```
quota check — YYYY-MM-DD HH:MM KST   (아래 숫자는 예시 — 실계정 상태가 아니다)

copilot   9000/20000  premium reqs (45% left)  reset MM-DD
zai      5h      500/2000   credits (25% left)  reset MM-DD HH:MM KST
      weekly   5000/10000  credits (50% left)  reset MM-DD HH:MM KST
codex    plan <tier>  40.0% used of 7d window  resets in 3.5d
claude   5h  25.0% used  reset MM-DD HH:MM KST
      7d  50.0% used  reset MM-DD HH:MM KST
grok     weekly  20.0% used (80.0% left)  reset MM-DD HH:MM KST  [GrokBuild credits]
```

## rail별 요약

| rail | 무엇을 재나 | 엔드포인트 |
|---|---|---|
| copilot | 프리미엄 요청 잔량/한도/리셋일 | `GET api.github.com/copilot_internal/user` |
| zai | GLM Coding Plan Lite — 5시간 윈도우 + 주간 크레딧 풀 | `GET api.z.ai/api/monitor/usage/quota/limit` |
| codex | ChatGPT plan — 5h/weekly(현재 7d) 사용률 | `GET chatgpt.com/backend-api/wham/usage` |
| claude | Claude Code 구독 — 5h/7d 사용률 | `GET api.anthropic.com/api/oauth/usage` |
| grok | SuperGrok **주간** credit 사용률 (`creditUsagePercent`) | `GET cli-chat-proxy.grok.com/v1/billing?format=credits` |

## grok은 두 지표가 있다 — 혼동 금지

| 지표 | 출처 | 이 스킬이 쓰나 | 의미 |
|---|---|---|---|
| **weekly credit usage** | `cli-chat-proxy.grok.com/v1/billing?format=credits` → `creditUsagePercent` | **예 (기본)** | SuperGrok 주간 구독 한도. grok.com/?_s=usage · `grok` CLI 와 같은 숫자 |
| **per-minute rate ceiling** | `POST api.x.ai/v1/chat/completions` 응답 헤더 `x-ratelimit-*` | 아니오 | 분당 RPM/TPM 상한. 구독 잔액이 아니다. 확인 자체가 max_tokens=1 완성 1회를 소비함 |

기본 출력은 weekly credit 만 찍는다. rate ceiling 이 필요하면 검증 원본의 copy-paste 명령을 직접 돌릴 것 — 라우팅 판단용 숫자가 아니다.

Auth 도 갈라진다:

- weekly billing → `~/.grok/auth.json` 의 OIDC access token (`.<scope>.key`, ~6h 만료)
- rate ceiling → `~/.pi/agent/auth.json` 의 `xai.access` (api.x.ai 키)

access token 이 만료됐거나 401 이면 스크립트가 `https://auth.x.ai/oauth2/token` 으로 refresh_token grant 를 한 번 시도하고, 성공 시 `auth.json` 에 갱신분을 best-effort 로 다시 쓴다. `grok` CLI 가 이미 갱신해 둔 최신 파일을 읽는 것만으로 충분한 경우가 대부분이다.

## 자격증명

토큰은 파일에서 읽어 요청 헤더로 바로 흘려보내고 절대 출력/로그하지 않는다.

- `~/.pi/agent/auth.json` — `github-copilot`(**`refresh`** 필드, `ghu_` 접두사인 GitHub App 유저 토큰. `access` 필드는 Copilot 프록시 세션 토큰이라 이 엔드포인트에 안 먹힌다), `zai`(`key`), `openai-codex`(`access` + `accountId`)
- `~/.claude/.credentials.json` — `claudeAiOauth.accessToken`
- `~/.grok/auth.json` — OIDC scope 키 아래 `key` / `refresh_token` / `expires_at` / `oidc_client_id` / `oidc_issuer` (grok weekly billing 전용)

## 취약점 — 정직하게

다섯 엔드포인트 중 **공식 문서에 실린 것은 없다**. 전부 각 벤더의 공식 CLI/앱이 내부적으로
때리는 걸 관찰해서 찾은 것 — 벤더가 언제든 바꿀 수 있다. 실패는 개별 rail 단위로 격리된다:
한 엔드포인트가 죽어도 `UNAVAILABLE — <이유>`만 찍고 나머지는 계속 진행한다.

- **claude**: `api/oauth/usage` — `User-Agent: claude-code/<ver>` 헤더가 없으면 훨씬 빡빡한
  rate-limit 버킷으로 떨어져 429가 계속 난다는 커뮤니티 보고가 있다. 429가 뜨면 "쿼터 소진"이
  아니라 "엔드포인트가 예민하다"로 읽을 것.
- **codex**: `wham/usage` — codex CLI 자체의 60초 폴러가 때리는 것과 같은 엔드포인트라, 이게
  깨지면 공식 CLI의 상태 표시도 같이 깨진다(카나리아 겸용).
- **zai**: 응답 필드(`unit`/`number`가 윈도우 길이를 인코딩하는 방식, `percentage`가 잔량이
  아니라 소진율이라는 것)는 Z.AI 문서 어디에도 없다 — 실제 응답과 벽시계를 대조해서 역추론한 것.
- **copilot**: VS Code/JetBrains가 쓰는 내부 엔드포인트. `ghu_` 토큰이 만료/철회되면 조용히
  깨지는 대신 401을 던진다(스크립트가 `UNAVAILABLE`로 보고).
- **grok**: `cli-chat-proxy.grok.com` 은 grok CLI 전용 프록시. access token ~6h 만료;
  refresh 실패 시 `UNAVAILABLE — HTTP 401` 로 보이며, 그때는 `grok` CLI 를 한 번 띄워
  auth.json 을 갱신하면 된다. `creditUsagePercent` 필드명/의미는 문서화되어 있지 않다.

검증 원본(실제 응답 예시, 발견 경위, 채택하지 않기로 한 오픈소스 대안 비교)은
`~/repos/gh/agent-config/.agent-reports/quota-checks-20260820.md`.
