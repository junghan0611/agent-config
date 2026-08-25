---
name: quota
description: "다섯 개 모델 구독(rail)의 남은 쿼터를 한 번에 조회 — Copilot 프리미엄 요청 잔량, Z.AI GLM 5시간/주간 크레딧, Codex 5h/weekly 윈도우, Claude 5h/7d 윈도우, Grok SuperGrok weekly credit usage. GLG가 다음 분신을 어느 rail로 보낼지 결정할 때 쓴다. Use when: '쿼터', '얼마 남았', '남은 크레딧', '어디로 보낼까', 'quota', 'usage', 'how much is left', 'which rail', 'rate limit check'."
user_invocable: true
---

# quota — 남은 쿼터 한눈에

에이전트는 스킬 경로로, GLG는 `run.sh`로 부른다 — 같은 스크립트다.

```bash
# 에이전트 (하네스마다 baseDir이 다르므로 이쪽)
python3 {baseDir}/scripts/quota.py            # 1회 출력
python3 {baseDir}/scripts/quota.py --json     # 정규화 스냅샷

# GLG (손으로 치는 면)
./run.sh quota                 # 1회 출력
./run.sh quota:watch [초]      # TUI, 제자리 갱신 (기본 120초)
./run.sh quota:web [포트]      # http://127.0.0.1:8787 (기본 8787)
./run.sh quota:json            # 정규화 스냅샷
```

다섯 rail을 GET해서 한 화면에 정렬한다. 과거 이력도, 알림도 아니다 — **지금 이 순간의 상태**만
답한다. 스크립트가 숫자를 찍으면, 에이전트가 그걸 읽어 GLG에게 산문으로 설명한다.

## 구조 — 수집 1개, 렌더러 3개

```
scripts/railauth.py   자격증명 로딩 · HTTP · grok OIDC 갱신
scripts/collect.py    5 rail GET → 정규화 스냅샷  ← 유일한 진실
scripts/render.py     막대 · 리셋 시계 · 텍스트 레이아웃 (TUI와 웹이 공유)
scripts/quota.py      1회 / --watch(TUI) / --json
scripts/serve.py      127.0.0.1 웹 + /api/snapshot.json
```

**렌더러는 벤더를 직접 때리지 않는다.** 전부 `collect.snapshot()`을 그린다.

폴링 방어는 두 층이다. `serve.py`가 스냅샷 전체를 TTL 300초로 캐시하고, 그와 별개로
`collect.py`가 **레일별 캐시**(`~/.local/share/quota/rails.json`)를 둔다. 레일 캐시는
두 가지를 한다 — `MIN_INTERVAL` 안에 다시 부르면 재폴링하지 않고, 폴링이 실패하면 마지막
성공값을 `stale`로 표시해 계속 보여준다. `collect.py --force`로 간격 가드만 건너뛸 수 있다.

rail `status`는 셋이다: `ok` / `stale`(마지막 성공값 + 실패 이유) / `unavailable`(보여줄
값이 아예 없음).

의존성 0(표준 라이브러리만). 이 스킬은 여러 하네스로 심볼릭 링크돼 펼쳐지고, 그것들은 파이썬
환경을 공유하지 않는다.

## 정규화 스냅샷

```json
{"ts": "ISO8601+09:00", "rails": [
  {"rail": "claude", "status": "ok|unavailable", "reason": null, "plan": null,
   "gauges": [{"key","label","used_pct","used","limit","unit",
               "resets_at","window","basis","active","note"}]}]}
```

다섯 벤더 화면이 전부 같은 물건이다 — **레이블 + 퍼센트 + (선택) 사용/한도 + 리셋 시각**.
차이는 단위뿐(요청 수 / 크레딧 / 퍼센트만).

## 리셋 기준 — rail마다 다르다

"주간"이 같은 뜻이 아니다. 2026-08-25 실측:

| rail | 창 | 다음 리셋 (KST) | basis | 근거 |
|---|---|---|---|---|
| claude | 7d | 월 06:59:59 | `anchor` | 절대 시각만 옴. 5h/7d/7d-scoped 셋이 같은 경계 |
| codex | 7d | 월 09:42 | `rolling` | `reset_after_seconds`가 계속 줄어듦 |
| zai | 7d | 목 14:36 | `anchor` | `nextResetTime` 절대 시각 |
| grok | 7d | 금 18:11 | `period` | `currentPeriod.start/end` 명시 |
| copilot | 1mo | 매월 1일 09:00 | `calendar` | `quota_reset_date_utc` |

copilot은 **결제일이 아니라 달력 1일 00:00 UTC**(= KST 09:00)에 리셋되고 미사용분은
이월되지 않는다 — GitHub 공식 문서: "Allowances reset on the 1st of each month at
00:00:00 UTC" / "Unused requests ... do not carry over"
(docs.github.com/copilot .../github-copilot-premium-requests). 즉 8월 중순 가입이어도
9월 1일에 한 달치가 새로 열린다. 이 계정이 8월분을 일할로 받았는지는 한 번 관측으로는
알 수 없다(현재 `entitlement`는 만액 20,000). 9월 1일 이후 값으로 확정할 것.

`basis`는 **엔드포인트가 실제로 알려준 것만** 기록한다. 절대 시각 하나만 오는 rail을
"롤링"이라 단정하지 않는다(`anchor`). 그래서 화면은 항상 요일과 남은 시간을 같이 찍는다 —
"7일 남음"만으로는 어느 요일에 벽이 오는지 알 수 없다.

## 배속 — 절대 퍼센트로 색칠하지 않는다

`period_start` + `resets_at`로 **기간 경과율**을 구하고, `배속 = 사용률 ÷ 경과율`을 쓴다.
같은 숫자가 정반대 뜻이 되기 때문이다 (2026-08-25 실측):

| rail | 창 | 경과 | 사용 | 배속 | 읽기 |
|---|---|---|---|---|---|
| codex | 7d | 17% | 49% | **2.9배** | 하루 만에 사흘치를 태움 |
| claude | 7d Fable | 18% | 28% | 1.5배 | 약간 앞섬 |
| zai | 7d | 71% | 69% | **1.0배** | 69%가 찼지만 **딱 페이스** |
| copilot | 1mo | 78% | 17% | 0.2배 | 한참 여유 |

- 막대의 `┃`(웹은 파란 세로선)가 **기간 경과 지점**. 채움이 마커를 넘어가면 앞당겨 쓴 것.
- 화면 문구는 전부 영어다(레이블·요일·카운트다운). 이 문서만 한국어다.
- 색: 배속 ≥2.0 빨강, ≥1.3 또는 절대 80% 이상 노랑, 그 외 초록. 절대 90% 이상은 무조건 빨강
  (벽 앞에서는 "페이스대로"가 위안이 안 된다).
- 경과율 5% 미만이면 비율이 요동치므로 배속을 안 찍고 절대치로 판정한다.

`period_start`는 벤더가 주면 그대로(grok `currentPeriod.start`), 없으면
`resets_at - window_seconds`로 유도한다. copilot만 달력 월이라 리셋 월의 전달 1일을 쓴다.

## 일부러 안 찍는 것

라우팅 판단에 쓰이지 않는 게이지는 뺐다 — 화면은 훑어보는 물건이지 감사 로그가 아니다.

- **codex 추가 크레딧**: 잔액 0이고 살 계획이 없다
- **grok GrokBuild / GrokChat 내역**: 주간 크레딧 한 줄이면 충분하다

둘 다 `collect.py`에서 게이지를 만들지 않는 것이고, 필드는 응답에 그대로 있다. 되살리려면
`collect_codex` 끝의 credits 블록 / `collect_grok`의 `productUsage` 루프를 복원하면 된다.

## 화면이 지키는 것

- **요일**: 월·월·목·금·1일로 흩어져 있어 요일 없이는 파악이 안 된다
- **남은 시간**: `5일 17시간 뒤`
- **`active` 표시(●)**: 지금 실제로 물리고 있는 창. claude `is_active`, codex primary 등
- **배속과 경과 마커**: 위 절 참조. 절대 퍼센트만으로는 판단이 뒤집힌다
- **리셋 일정 블록**: 전 rail의 리셋을 가까운 순으로 한 줄씩. rail+시각 중복은 접는다

## rail별 요약

| rail | 무엇을 재나 | 엔드포인트 |
|---|---|---|
| copilot | 프리미엄 요청 잔량/한도/리셋일 | `GET api.github.com/copilot_internal/user` |
| zai | GLM Coding Plan Lite — 5시간 윈도우 + 주간 크레딧 풀 | `GET api.z.ai/api/monitor/usage/quota/limit` |
| codex | ChatGPT plan — 5h/weekly(현재 7d) 사용률 | `GET chatgpt.com/backend-api/wham/usage` |
| claude | Claude Code 구독 — `limits[]` (5h 세션 · 7d 전체 · 7d 모델별) | `GET api.anthropic.com/api/oauth/usage` |
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

- **claude**: `api/oauth/usage` — **가장 예민하다.** 2026-08-25 실측: 응답
  `HTTP 429` + `Retry-After: 165` + `{"type":"rate_limit_error"}`. **이건 쿼터 소진이
  아니라 엔드포인트 rate limit이다** — 화면 문구도 `rate-limited by the endpoint —
  retry in <n>s`로 그렇게 말한다. `User-Agent: claude-code/<ver>` 헤더가 없으면 더
  빡빡한 버킷으로 떨어진다는 커뮤니티 보고도 있다.

  그래서 폴링을 3중으로 막는다:
  1. `collect.py`의 `MIN_INTERVAL["claude"] = 180`초 — 그 안에 다시 부르면 아예 안 때리고
     캐시를 준다(측정된 Retry-After 165초보다 넉넉하게)
  2. `--watch`/`serve.py` 기본 주기 **300초**
  3. 그래도 429가 나면 `~/.local/share/quota/rails.json`의 **마지막 성공값을 `stale`로
     표시해 계속 보여준다** — 4분 지난 18%가 빈칸보다 낫다 (6시간 넘으면 버린다)
  응답의 `limits[]`가 정본이다 — `five_hour`/`seven_day`보다 넓고(모델별 scoped 창),
  `is_active`로 지금 물리는 창을 알려준다. 둘 다 없는 옛 응답용 폴백이 collect.py에 있다.
- **codex**: `wham/usage` — codex CLI 자체의 60초 폴러가 때리는 것과 같은 엔드포인트라, 이게
  깨지면 공식 CLI의 상태 표시도 같이 깨진다(카나리아 겸용).
- **zai**: 응답 필드(`unit`/`number`가 윈도우 길이를 인코딩하는 방식, `percentage`가 잔량이
  아니라 소진율이라는 것)는 Z.AI 문서 어디에도 없다 — 실제 응답과 벽시계를 대조해서 역추론한 것.
  앱 화면 리셋 시각은 베이징시(UTC+8) — quota.py KST가 정확한 한국 시각이고 앱보다 1시간 늦게 보인다(크레딧 숫자는 일치).
  **`usage`가 한도이고 `currentValue`가 실사용이다**(이름이 반대로 읽힌다). 그리고 창이
  0% 소진이면 `nextResetTime` 필드 자체가 오지 않는다 — 필수 취급하면 rail 전체가 죽는다.
- **copilot**: VS Code/JetBrains가 쓰는 내부 엔드포인트. `ghu_` 토큰이 만료/철회되면 조용히
  깨지는 대신 401을 던진다(스크립트가 `UNAVAILABLE`로 보고).
- **grok**: `cli-chat-proxy.grok.com` 은 grok CLI 전용 프록시. access token ~6h 만료;
  refresh 실패 시 `UNAVAILABLE — HTTP 401` 로 보이며, 그때는 `grok` CLI 를 한 번 띄워
  auth.json 을 갱신하면 된다. `creditUsagePercent` 필드명/의미는 문서화되어 있지 않다.

검증 원본(실제 응답 예시, 발견 경위, 채택하지 않기로 한 오픈소스 대안 비교)은
`~/repos/gh/agent-config/.agent-reports/quota-checks-20260820.md`.

## 2단계 — 이력과 귀속 (아직 안 만듦)

1단계는 **계정 총합의 현재 상태**만 답한다. 다음 두 층은 별개다:

- **이력**: 스냅샷을 `~/.local/share/quota/quota.db`(sqlite)에 append. 스키마가 이미
  시계열이라 스파크라인·소진 속도·"이 속도면 언제 벽" 예측이 따라온다.
  seam은 이미 있다 — `serve.py`가 갱신할 때마다 `~/.local/share/quota/last.json`을 쓴다.
- **귀속(누가 얼마나 썼나)**: **이 다섯 엔드포인트로는 원리적으로 안 나온다.** 계정 총합만
  준다. 귀속은 하네스 로그(Claude Code JSONL, codex 로그, pi 세션)에서 따로 와야 하고,
  시간축으로 조인하는 별개 테이블이다. 섞으면 1단계가 무너진다.
