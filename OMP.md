# OMP — 검수 매트릭스

`oh-my-pi`(omp)를 **후보 런타임**으로 세워놓고 재는 작업면. pi-mono 포크이고,
GLG는 지원 하네스를 무작정 늘릴 생각이 없어 **최소치**를 따진다. 후보라는 말은 pi를
대체하거나 더 좋은 하네스를 뽑는다는 뜻이 아니다. 한 visible sibling 안에서 내부 위임을
감당하게 했을 때 GLG가 직접 서야 하는 검수 홉이 줄어드는지를 보는 것이다.

> pi를 대신할 채택 런타임은 아니다. 다만 **한 형제로 받아주는 방향은 섰다.** 아직
> 시민권 구현을 시작하지 않았고 `nixos-config`나 `run.sh setup`에도 넣지 않는다. 스킬
> SSOT를 `~/.omp`에 **주입하지 않는다** — 주입하면 재는 대상이 흐려진다. (단 omp가
> `~/.claude`를 스스로 읽어 들어오는 상속은 omp의 설계 자체라 조건의 일부다.)

Hermes와 다른 점 하나: omp 설치는 `run.sh`에 함수가 없다. curl 한 번 + 설정 두 번이라
**이 문서가 직접 재현 절차를 들고 있다**. 새 기기(노트북)는 아래 §재현을 그대로 따른다.

---

## [2026-09-04] 정정 — C축은 이미 닫혔다. D축만 열려 있다

아래 본문의 여러 문장이 **"OMP 시민권 구현 미착수"**라고 말한다. 그 문장들은 2026-08-26
시점의 사실이었고 **지금은 낡았다.** 문장을 지우지 않고 여기서 정정한다.

**측정된 것 (oracle, 2026-09-04):**

- entwurf `0.16.0`(2026-08-31)이 **OMP를 다섯 번째 garden backend로 admit**했다
  (`CHANGELOG.md § 0.16.0`, #87). `wakeMode: self-fetch`, `deliveryLevel: D6`.
- 이 호스트에 실제로 서 있다: `omp/18.0.0` · `~/.omp/agent/extensions/`에
  `entwurf-meta-omp`, `entwurf-receive-omp` 둘 다 설치됨 ·
  `~/.omp/agent/mcp.json`에 native `entwurf-bridge` 항목 존재 ·
  `~/.omp/agent/config.yml`의 `tools.xdev: false`(`entwurf_fresh_call` 전제 조건).
- `entwurf_fresh_call`의 backend enum이 `pi | claude-code | copilot | omp`다
  (이 세션 MCP 스키마에서 읽음, 2026-09-04).

**따라서 아래 표에서 바뀐 것:**

| 축 | 이 문서의 옛 판정 | 지금 |
|---|---|---|
| C4 두 enum + capabilities | 미측정 | **닫힘** — 0.16.0에서 registry 진입 |
| C5 birth hook | 미측정 | **닫힘** — `meta-bridge-omp.ts`, `session_switch` 양 edge 결합 |
| C1 도구 도달 | 측정됨(MCP 상속) | **native MCP hand로 대체** — Claude import를 같은 key로 shadow |

**바뀌지 않은 것 — 이 문서의 존재 이유는 그대로다.** D1–D5는 여전히 **전부 미측정**이다.
시민권(entwurf가 답하는 것: 주소가 서는가)과 위임 이득(agent-config가 답하는 것: GLG의
검수 홉이 줄어드는가)은 **다른 질문**이고, 앞의 것이 닫혔다고 뒤의 것이 닫히지 않는다.
그래서 세 가지는 D가 열려 있는 동안 계속 안 한다: `run.sh`에 `omp` 브랜치 없음 ·
`nixos-config`에 없음 · **`~/.omp`에 스킬 SSOT 주입 없음**(`~/.omp/skills` 부재 실측,
2026-09-04). 이미 내 스킬셋으로 채워준 대상은 "스킬셋이 필요했는가"에 답할 수 없다.

---

## [2026-08-26] 왜 이 비교는 여기 있는가 — entwurf 사용자의 운영 판단

원석: `20260824T000000--2026-08-24__journal_week34.org`의 2026-08-25 출근길 기록.
공개된 뿌리 글은 [물음·부름·불응·부릉 — 보이는 곳에서 함께 달리는 Entwurf](https://notes.junghanacs.com/notes/20250215t202517)다.

### 두 담당자의 책임은 다르다

| 자리 | 보장하고 비교하는 것 |
|---|---|
| `entwurf` | garden-id 주소, record/liveness 사실, rail 선택, 전달, visible fresh/resume라는 **자기 로직**. 다른 하네스와 우열을 겨루지 않고 어제의 자기 코드와 비교한다. |
| `agent-config` | 실제 사용자인 GLG의 운영면. 어떤 하네스를 어떤 형제로 받아들일지, 검수 홉과 인지 비용이 줄어드는지, 정체성·스킬·기억축이 같은 중력을 갖는지 비교한다. |

따라서 OMP 조사는 `entwurf`의 기능 요구가 아니라 이 repo의 하네스 리서치다. 여기서
쓸모를 확인해도 `entwurf`가 planner/orchestrator를 품는 근거가 되지 않는다. 반대로
`entwurf` 담당자가 OMP를 비교하지 않는 것은 공백이 아니라 소유 경계를 지킨 결과다.

### 여기까지 온 흐름

- 출발점은 pi의 뺄셈이었다. MCP·도구 더미·서브에이전트 없이 YOLO harness와 작은
  드라이버 하나만 남긴 모양이 GLG에게 맞았다.
- Claude 구독을 pi 안에서 만나기 위한 현실적 필요가 `pi-shell-acp`를 낳았고, 그 안에서
  다른 backend 형제를 부르는 v1의 감각이 생겼다.
- ACP 과금·carrier 의존성이 흔들리자 각 도구의 transcript/auth/runtime을 빼앗지 않고
  **있는 그대로 부르는 v2**로 선회했다. 🪛 garden id는 그 학교가 다른 형제들을 한 주소
  공간에서 알아보게 하는 각인이지, 모두를 pi로 바꾸는 표식이 아니다.
- 이 연대기의 현재 결론은 “하네스를 더 모으자”가 아니다. 각 도구를 존중하되, 개발은
  계속 뺄셈으로 한다. 물음·부름 뒤에는 불응할 틈이 있고, 필요한 때만 함께 부릉한다.

### Copilot과 OMP를 받아들이는 의미가 다른 이유

**Copilot CLI**는 GitHub와 붙어 있는 네이티브 장점과 `auto` 모델 운용의 경제성이 있다.
pi에서 Copilot provider만 호출하면 그 장점을 일부 잃는다. 그래서 Copilot은 자기
하네스 그대로 self-fetch citizen이 되었다. 2026-08-26 현재 이 사실은
`entwurf/AGENTS.md`의 native bridge와 mux fresh-call 계약에 이미 닫혀 있다.

**OMP**를 보는 이유는 provider가 아니다. OMP는 pi 위에 LSP와 인프로세스 서브에이전트
팀을 얹은 배터리팩이다. 작은 실무자 하나하나를 모두 visible sibling으로 열면 GLG가
관여할 홉과 tmux 창이 함께 늘어난다. OMP 하나를 visible sibling으로 세우고 그 안의
실무 분해를 맡길 수 있다면, GLG는 중간 2~3홉 대신 OMP director가 내놓은 한 경계만
검수할 수 있다.

이때 지원의 뜻은 좁다.

1. **한 OMP 프로세스 = 한 형제 = 한 garden id**다.
2. 인프로세스 서브에이전트는 citizen이 아니며 별도 garden id를 얻지 않는다. 아래
   `§ 경계 — 한 프로세스 = 한 형제`에 코드 근거가 이미 측정돼 있다.
3. 내부 위임의 완료·실패·요약 품질은 OMP가 책임지고, `entwurf`는 그 내부를 계획하거나
   감독하지 않는다.
4. 최종 결과의 소유자는 visible OMP parent다. 내부 작업이 parent를 떠나 숨은
   background outcome으로 돌아오면 visible-first 경계에 맞지 않는다.
5. **한 형제로 받아주는 방향은 결정됐지만, 이 정리 커밋은 구현 착수문이 아니다.** 현재
   공개 surface의 fresh backend는 pi / claude-code / copilot뿐이며, OMP rail은 아래
   C축 그대로 미구현이다.

### 지금의 판정

- 토큰 절약과 “누가 더 잘하나” 비교는 닫혔다. 보는 숫자는 **D4(GLG가 선 경계 수)**와
  **D5(오조타 비용)**뿐이다.
- 방향과 게이트가 분명한 ts/py/bash/nix 구현에서만 잠수함 한 번을 재볼 가치가 있다.
  elisp/org, 지식 작업, 중간에 GLG가 방향을 바꿔야 하는 일은 지금 형제 방식이 맞다.
- OMP 시민권 코드를 지금 만들지 않는다. 실제 과제 D1–D5가 먼저다.
- 더 큰 중심은 에이전트 도구의 수가 아니라 PKM-AI다. 형제들이 물어볼 가든과
  semantic-memory가 없으면 하네스만 늘어난다. 도구 리서치는 그 지식축을 가리지 않는
  만큼만 한다.

---

## 상태 — 2026-08-23

`omp/18.0.0` (릴리스 태그 `v18.0.0`, 2026-08-22) · `~/.local/bin/omp` 단일 파일 146MB ·
소스 체크아웃 `~/repos/3rd/oh-my-pi` 동일 태그 고정(**수정 금지**) · 기기 `oracle`(aarch64).

**인증 없음.** `~/.omp/agent/agent.db`는 비어 있다. pi의 `~/.pi/agent/auth.json`은
**따라오지 않는다** — omp는 `agent.db`(bun:sqlite)를 쓰고 `discoverAuthStorage(agentDir)`가
자기 agent dir로만 스코프된다(`sdk.ts:689` → `auth-broker-config.ts:85`). 로그인은 별도.

---

## 재현 — 새 기기에서 이대로

```bash
# 1) 설치 — 태그 고정 프리빌트. 기본(bun) 경로는 bun>=1.3.14를 요구하므로 --binary로 간다.
curl -fsSL https://omp.sh/install -o /tmp/omp-install.sh
sh /tmp/omp-install.sh --binary --ref v18.0.0     # → ~/.local/bin/omp, 셸 프로필 무수정

# 2) 프로바이더 봉인 — 반드시 로그인 전에. 아래 §봉인 참조
# Thinkpad에서 활성인 API/provider 문까지 함께 봉인한다.
omp config set disabledProviders '["openrouter","huggingface","google","amazon-bedrock","bedrock-mantle","groq"]'
omp models        # deepseek 만 남아야 정상

# 3) 소스 체크아웃(측정용, 선택)
git clone https://github.com/can1357/oh-my-pi ~/repos/3rd/oh-my-pi
git -C ~/repos/3rd/oh-my-pi checkout v18.0.0

# 되돌리기
rm ~/.local/bin/omp && rm -rf ~/.omp
```

설치 스크립트가 하는 일은 GitHub 릴리스에서 `omp-{linux,darwin}-{x64,arm64}` 하나를
`$HOME/.local/bin`에 받고 `chmod +x` 후 `omp --version` 스모크뿐이다. 셸 프로필을
건드리지 않는다. NixOS에서 프리빌트가 도는 것은 `programs.nix-ld.enable`(shared.nix) 덕분.

`omp`가 만드는 것: `~/.omp/agent/agent.db`(auth) · `~/.omp/agent/config.yml`(설정) ·
`~/.omp/natives/<ver>` · `~/.omp/logs/` · `~/.omp/agent/sessions/`.

---

## 봉인 — env가 물어오는 프로바이더

**로그인 0인데도** `omp models`에 `deepseek(3) google(59) huggingface(134) openrouter(470)`이
떴다. 셸에 키가 export돼 있어서다. OpenRouter는 임베딩·이미지 전용 개인 레일이라
추론에 태우면 안 된다(`~/AGENTS.md`, `MODELS.md §Deliberately Hidden Providers`).

`disabledProviders`는 **자격증명 검사 이전** 단계라(`docs/providers.md:23`) env·`.env`·
저장 키·`models.yml` 어느 경로로도 되살아나지 않는다. 봉인 후 실측: `deepseek(3)`만 남음.

**Thinkpad 재현(A4, 2026-08-23).** 위의 oracle 관측에 없던 `amazon-bedrock(145)` ·
`bedrock-mantle(5)` · `groq(26)`가 추가로 노출됐다. `GROQ_API_KEY`와 AWS 자격증명 탐색면이
있어서다. 재현 블록은 이 세 ID까지 닫도록 갱신했으며, 다시 확인한 결과 `deepseek(3)`만
남았다. 새 provider가 나타나면 해당 ID도 같은 배열에 넣고, **봉인 확인 전에는 로그인하지
않는다.**

**주의 — `google`은 셋으로 갈라져 있다**(`docs/providers.md:212`):

| ID | 정체 | 봉인 후 |
|---|---|---|
| `google` | Gemini **API 키** 프로바이더 | 차단 |
| `google-antigravity` | Antigravity **구독** OAuth | 살아 있음 |
| `google-gemini-cli` | Gemini CLI OAuth | 살아 있음 |

즉 "구독으로만 쓴다"는 방침이 지켜진다 — API 키 문만 닫고 OAuth 문은 연다.
나중에 `XAI_API_KEY` 등을 export하게 되면 배열에 이름을 더한다.

`tools.approvalMode` 기본값은 `yolo`다(`docs/approval-mode.md:22,:144`). pi와 같아 그대로 둔다.

---

## 상속면 — 설정 0줄로 따라오는 것

omp는 첫 실행에 `.claude` / `.codex` / `.gemini` 루트를 **네이티브로 읽는다**
(`docs/config-usage.md §1`). agent-config가 이미 깔아둔 것이 그대로 떴다(전부 실측).

| 면 | 근거 | 상태 |
|---|---|---|
| 스킬 | `claude` provider priority 80 | `skill://gogcli` → `~/.claude/skills/gogcli/SKILL.md` 해결됨 |
| MCP | `docs/mcp-config.md:33` (`~/.claude.json`) | `entwurf-bridge ● connected` |
| 커맨드 | `docs/slash-command-internals.md:86` | 미개별검증 |
| 정체성 | `agents-md` provider가 `~/AGENTS.md` 수거 | 뜸 — 단 아래 주의 |

**⚠️ 정체성 경로가 walk 규칙에 의존한다.** `~/.claude/CLAUDE.md`의 첫 줄 `@AGENTS.md`는
omp에서 **확장되지 않는다** — `@` 임포트는 임포트한 파일 기준 상대경로라
`~/.claude/AGENTS.md`를 찾는데 그 파일이 없다(`docs/context-files.md:138,:271`).
실제로 뜬 경로는 `agents-md` provider의 `~/AGENTS.md`이고, 그 규칙은
"repo root까지 걷되 home은 **포함하지 않는다**. repo root가 **없으면** home을 경계로
포함한다"(`:68`)이다. GLG 확인은 cwd가 `~/tmp`(리포 아님)인 세션이었다.
**리포 안에서도 뜨는지는 미측정.**

안전한 최소치는 심링크 하나 — `~/.omp/agent/AGENTS.md → home/AGENTS.md`. `native`
provider는 priority 100·user 레벨이라 cwd 무관하게 매 세션 뜨고 다른 모든 user 컨텍스트
파일을 shadow한다(`:24,:89`). **미실행**(지원 결정 사안).

**⚠️ entwurf 도구는 함수 이름으로 뜨지 않는다.** `write`로 `xd://mcp__entwurf_bridge_*`에
JSON을 쓰는 간접 표면이다. 도구 *이름*에 기대는 계약(스킬 문장·게이트·프롬프트)은
omp에서 다르게 읽힌다 — `skills/entwurf-peek/SKILL.md`가 그런 문장을 갖고 있다.

---

## 경계 — 한 프로세스 = 한 형제

**질문:** omp 세션 하나를 entwurf 형제로 불렀을 때, 거기서 omp가 부린 서브에이전트가
별도 형제로 등록될 수 있는가. **답: 구조적으로 불가능하다.** 세 줄로 성립한다.

1. omp 서브에이전트는 **별도 프로세스가 아니다** — `task/executor.ts:3146`이
   `createAgentSession`을 인프로세스로 부른다. 같은 파일에 `Bun.spawn`/`child_process` 0건.
   함수 이름이 `runSubprocess`라 정반대로 읽히니 주의.
2. entwurf 신원의 두 rail이 **둘 다 프로세스에 매달려 있다** — env carrier
   (`PI_SESSION_ID`+`PI_AGENT_ID`)이거나 **ppid로 키잉된** 마커
   (`entwurf/pi-extensions/lib/meta-sender-identity.ts:171`). cwd 추론이 아니다.
3. `callerGardenId`는 **tool 파라미터가 아니다** — tool을 등록한 surface가 자기
   record-backed context에서 공급한다(`entwurf/pi-extensions/lib/mux-fresh-call.ts:237-240`).
   서브에이전트가 다른 신원을 요청할 문법 자체가 없다.

인프로세스 서브에이전트는 자기 pid가 없어 별도 마커 키를 가질 수 없다. 여럿이 써도
같은 `(backend, ownerPid)` 파일 하나로 접힌다. 서로 다른 gardenId가 둘 잡히면
`EntwurfSenderIdentityAmbiguityError`로 **시끄럽게 실패**하지 조용히 하나 고르지 않는다
(`meta-sender-identity.ts:188`).

참고로 omp 자신도 같은 종류의 경계를 지킨다: task agent 발견에서 `.claude/agents` ·
`.codex/agents` · `.gemini/agents`를 **일부러 건너뛴다**(`docs/task-agent-discovery.md`).

---

## entwurf 연동 — 실측된 거절과 남은 문 둘

omp 세션에서 `entwurf_fresh_call`이 이렇게 거절됐다(실측):

```
caller-identity-unavailable — this surface has no record-backed garden id for
the caller, so the sibling would have no address to call back to. No window was opened.
```

**도구는 상속됐지만 시민권은 상속되지 않았다.** 정확히 그래야 하는 대로다.

- **rail A**(env carrier) — 오늘 당장 통과시킬 수 있으나 **pi carrier로 위장**하는 셈이라
  `entwurf-peek`이 백엔드를 오독한다. GLG 판정: "버그로 빠지는 길". **폐기.**
- **rail B**(마커) — 제대로 된 길. 다만 문이 **둘**이다.
  - `META_CITIZEN_BACKENDS = ["claude-code","antigravity","codex","copilot","pi"]`
    — `backend: "omp"` record는 v3 파서가 `MetaRecordError`로 거절
  - `META_SENDER_BACKENDS = ["claude-code","antigravity","copilot"]`
    (`meta-sender-identity.ts:60`) — 여기 없으면 브리지가 마커를 **찾으러 가지도 않는다**
  - `check-entwurf-capabilities`가 shipped registry와 citizen 목록의 **정확 일치**를
    요구 → `pi/entwurf-capabilities.json` 동반
  - birth hook — omp는 `session_start` 확장 이벤트와 `docs/hooks.md` 훅면을 둘 다 갖고
    있어 Claude Code/copilot 패턴이 그대로 대응된다

copilot 지원이 마무리 중이라 이 레인은 **지금 열지 않는다.**

---

## 경제성 축 — 닫힘

README의 정량 표(`README.md:117-122`)는 **선택 인용**이다. 4행 전부 약한 모델이고
그중 셋은 가장 불리한 기준선(vs `apply_patch`)의 숫자다. 출처는 저자 블로그
(`blog.can.ac/2026/02/12/the-harness-problem` → 302 → `stencil.so/blog/the-harness-problem`).

원문 대조(verbatim 확인):

- 저자 본인 문장: **"the weakest models gain the most"**
- Claude Sonnet 4.5 `+14.4 / +3.3 / −24%` · Claude Haiku 4.5 `+13 / +11.3 / −22%`
- **GPT-5.2 Codex `+4.6 / −0.4 / +26%`** · **DeepSeek V3.2 `−5 / −8.3 / +20%`** ← 출력 토큰 **악화**
- 벤치는 SWE-bench가 아니라 자체 edit-precision fixture. "3 runs × 180 tasks per run", React 코드베이스

**Claude Opus / 비-Codex GPT-5 / Gemini 3 Pro급 측정은 어디에도 없다.**

**벤치 교리 위반 주의:** 블로그 수치는 React 180 tasks인데 v18.0.0에 실린 생성기는
**pi-mono에서 106개**를 만든다(`packages/typescript-edit-benchmark/src/generate.ts:52`,
fixtures.tar.gz 실측 106). **지금 태그로 재현해도 그 숫자가 나오는 벤치가 아니다.**
(픽스처 소스가 omp가 갈라져 나온 바로 그 리포라는 점도 적어둔다. edit 정밀도는 의미가
아니라 텍스트 모양이라 즉시 무효는 아니다.)

**GLG 판정(2026-08-23): 토큰 절약 축을 닫는다.** "하이엔드 모델이 이 정도 하네스 몇
가지로 휘둘리지 않는다. 대단한 게 있는 것도 말이 안 된다." → 이 표는 채택 논거가 아니다.

---

## 위임 축 — omp를 보는 진짜 이유

**통화 단위는 토큰이 아니라 GLG의 검수 홉 수다.** GLG가 직관으로 범위를 정해 넘기면
지금은 형제 팀이 entwurf로 2~3홉을 돌고, **홉마다 GLG가 경계를 검수한다.** omp가 자체
서브에이전트 팀으로 홉을 줄이면 GLG의 시간이 남는다.

**거래의 정체 — omp가 자기 문서에 적어놨다** (`docs/vibe-mode.md` 마지막 줄):

> The director remains responsible for the final outcome: worker completion means
> the turn settled, not that its claims are correct.

- **사는 것**: 검수 지점 2~3개 → 1개
- **파는 것**: 중간에 방향을 틀 기회

홉이 사라지면 거기 있던 조타 핸들도 사라진다. 남은 1홉은 더 크고 덜 조타된 산출물을 받는다.
검수 **홉은 줄어도 diff 면적은 총량 비례**로 늘고, 서브에이전트는 강제 yolo이며
(`docs/approval-mode.md:150`), `read-summarize` 기본 ON이라 요약된 원문 위에 보고가 쌓인다
(omp가 `scout`/`librarian`에만 이걸 끈 이유).

**LSP 판정** — ts/py/bash/nix엔 실익, elisp/org엔 장식이 아니라 **부재**.
이 기기 실측(`command -v`): `typescript-language-server` `basedpyright`
`bash-language-server` `nixd` `nil` 전부 있음, `rust-analyzer` 없음.
write 후 진단 반환이 기본 ON이라 "빌드 돌려 깨짐 발견" 왕복이 도구 결과 1회로 접힌다.
DAP 28 ops는 GLG 작업 성격상 무관.

**그래서 나오는 범위 규칙** (GLG가 정한 과제 범위는 건드리지 않는다. 도구가 힘을 쓰는
자리만 갈린다):

- **잠수함에 태울 것** — ts/py/bash/nix 구현, 방향이 정해져 있고 게이트가 0/1인 일
- **지금 방식 유지** — elisp/org 면, 중간에 GLG가 방향을 틀어야 하는 일

---

## 남은 것

상태: `측정됨` / `미측정` / `막힘`

### A. 설치·격리

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| A1 | 바이너리 기동 | 측정됨 | `omp --version` → `omp/18.0.0` |
| A2 | 프로바이더 봉인 | 측정됨 | 봉인 후 `deepseek(3)`만 남음 |
| A3 | 상태 격리 | 미측정 | 세션 한 판 뒤 `~/.omp` 밖 쓰기가 있는가 |
| A4 | 노트북 재현 | 측정됨 | Thinkpad에서 `--binary --ref v18.0.0` 기동·확장 봉인 후 `deepseek(3)`만 확인 |

### B. 상속·정체성

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| B1 | 스킬 상속 | 측정됨 | `skill://gogcli` 해결됨 |
| B2 | MCP 상속 | 측정됨 | `entwurf-bridge ● connected` |
| B3 | **리포 안 정체성** | **미측정** | repo root가 있는 cwd에서 `~/AGENTS.md`가 뜨는가. 심링크가 선택인지 필수인지를 가른다 |
| B4 | 커맨드 상속 | 미측정 | `/recall` 등이 실제로 뜨는가 |

### C. entwurf 시민권 — 방향 결정, 구현은 미착수

> 2026-08-26: Copilot #82는 이미 닫혔다. OMP도 한 형제로 받아주는 방향은 섰지만,
> 이 문서 정리가 구현 착수 승인은 아니다. 위 D축의 operator benefit을 먼저 측정한다.

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| C1 | 도구 도달 | 측정됨 | MCP 상속으로 닿음 |
| C2 | 신원 거절 | 측정됨 | `caller-identity-unavailable`, fail-closed 정상 |
| C3 | 서브에이전트 누수 | 측정됨 | 구조적으로 불가능(위 §경계) |
| C4 | 두 enum + capabilities | 미측정 | 넣으면 통과하는가 |
| C5 | birth hook | 미측정 | `session_start`로 ppid 마커를 쓸 수 있는가 |
| C6 | `xd://` 계약 영향 | 미측정 | 도구 이름에 기대는 스킬 문장 점검 |

### D. 위임 — 본체

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| D1 | 실제 과제 완주 | 미측정 | 격리 워크트리 + 0/1 게이트 하나를 통째로 넘김 |
| D2 | 서브에이전트 실사용 | 미측정 | 실제로 팀을 꾸리는가, 혼자 하는가 |
| D3 | 돌아온 보고 품질 | 미측정 | 구조화 출력이 prose 홉을 대체하는가 |
| D4 | **GLG가 선 경계 수** | 미측정 | **이 문서의 존재 이유.** 2~3 → 1이 실제로 되는가 |
| D5 | 오조타 비용 | 미측정 | 잘못된 방향으로 갈라졌을 때 검수가 얼마나 비싼가 |

---

## 미해결

1. **D4를 무엇으로 판정하는가.** "홉 1개"가 되어도 그 1홉의 검수가 3홉 합보다 비싸면 진 것이다.
2. **B3** — 리포 안 정체성. 심링크 필요 여부가 여기 걸려 있다.
3. 재현 벤치 부재 — README 수치를 재현하는 fixture가 태그에 없다(위 §경제성).
4. 설치·봉인은 oracle과 thinkpad에서 재현했지만 D축 실제 과제는 아직 어느 기기에서도
   돌리지 않았다.

## 명령

```bash
omp --version                  # 기동
omp config get disabledProviders
omp models                     # 봉인 확인 — deepseek 만 나와야 함
omp config path                # 활성 agent dir
omp stats --json               # 세션별 사용량(계측기)
omp worktree                   # 격리 워크트리 목록 (~/.omp/wt)
```

세션 원본은 `~/.omp/agent/sessions/*.jsonl`.
