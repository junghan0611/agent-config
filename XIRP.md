# XIRP — 공장을 한 제품이 통째로 소유하는 쪽, 관측 기록

Spotify의 [Xirp](https://backstage.spotify.com/docs/xirp)를 보는 **외부 관측면**.
`YEGGE.md`처럼 가끔 둘러보는 자리이고, 벤치마크도 도입 후보도 아니다.

> **도입은 선택이 아니라 불가다.** Xirp는 **macOS 전용**이고 이 집은 Linux/NixOS다
> (read, Spotify 공식 문서 § Limitations). 그러니 이 문서는 "쓸까 말까"가 아니라
> **같은 문제를 통째로 소유하는 제품이 어디까지 갔는지**를 보는 자리다.

`entwurf` 담당자의 일은 garden-id·record/liveness·rail·delivery·visible lifecycle이라는
자기 로직을 보장하는 것이다. Xirp와 우열을 겨루는 것이 아니다. 외부 제품을 보고
"이 형제를 실제 운영에서 왜 받아들이는가"를 고민하는 일은 **entwurf 사용자인 GLG와
agent-config 시험소의 몫**이다.

---

## 상태 — 2026-09-18

| 축 | 서 있는 곳 |
|---|---|
| 정체 | **Spotify가 만든** "vendor-neutral agentic development environment" (본인들 표현, read) |
| 설치 | **불가.** macOS 전용 (read, 공식 문서 § Limitations) |
| 이 문서의 출처 | **대부분 inherited** — GLG가 2026-09-18에 붙여준 ChatGPT(gpt-5-6-thinking) 분석이 1차 재료다. 아래 §확인한 것 / §확인 못 한 것이 그 분리다 |
| 우리 쪽 대조 | entwurf `plugins/herdr/README.md`, `scripts/check-typing-call-fence.ts`, `NEXT.md:185` — **로컬에서 직접 읽음** |

---

## [2026-09-18] 첫 관측 — 그리고 inherited와 read를 분리한다

이 문서의 1차 재료는 **GLG가 붙여준 ChatGPT 분석**이다. 그 분석은 2026-08-13에 본 Xirp와
2026-09-18을 diff로 놓았고, 결론은 *"8월의 '프로젝트/worktree 공장형' 판정은 그대로인데
Xirp가 그 공장을 본격적인 agent development environment / session OS로 만들고 있다"*였다.

**나는 그 분석을 검증할 수 있는 만큼만 검증했다.** 오늘 이 집에서 배운 것이 그것이라
(`UNCLEBOB.md` §E — 하루에 네 번 깎였고 네 번 모두 증거 한 조각에서 결론까지 너무 멀리
갔다) 여기서는 처음부터 층을 나눠 적는다.

### 확인한 것 (read — Spotify 공식 문서·changelog·블로그)

- **Spotify가 만든다.** 블로그 「What we've learned scaling AI coding agents at Spotify」
  (2026-08-10): *"Xirp is a **vendor-neutral agentic development environment** born out of a
  concrete engineering need."*
- **동기가 명시돼 있다.** *"built to help our developers manage **dozens of concurrent agent
  sessions across multiple harnesses**… making it tenable to coordinate **50+ parallel
  sessions**. **Every session operates in its own worktree.**"*
- **vendor neutrality를 아키텍처 요구사항으로 못박았다.** *"**Context is decoupled from any
  single agent or harness**; switch tools mid-project, and the full working state carries
  over. Vendor neutrality is an **architectural requirement** that emerged directly from how
  our engineers work."* — 목적은 lock-in 회피이고, 모델 가격/성능으로 라우팅하고 자체
  호스팅 오픈소스 모델까지 쓰겠다고 쓴다.
- **macOS 전용.** 공식 문서 § Limitations.
- **Portal이 institutional memory 쪽이다.** Workspace가 catalog entities·resources·
  records/decisions·wiki·members·이전 세션을 **MCP로** 세션에 준다. 세션이 끝나면
  transcript와 metadata가 Portal로 돌아간다. *"Any engineer or agent can pick up where
  another left off."* 그리고 § Limitations에 **"Manual session upload for Workspace-launched
  sessions"** — 업로드가 아직 수동이다.
- **Cursor Agent를 지원한다.** changelog (read): *"Cursor Agent requires a tested minimum
  version — starting or swapping to Cursor Agent now checks the installed version."*
- **tmux를 쓴다.** changelog 경유 LinkedIn 요약 (read): *"the new **Doctor** page checks your
  coding agents, **tmux**, and agent hooks."* → 우리 바닥과 같은 층을 쓴다.
- **사람의 개입면을 제품화했다.** changelog: 응답의 특정 **passage를 골라 코멘트를 달고
  하나의 follow-up prompt로 되돌려보내는** Review 기능. 그리고 background agent가 다 끝날
  때까지 세션을 finished로 판정하지 않고, **subagent별로 permission 대기 상태를 개별 추적**한다.
- **세션 lifecycle을 제품이 소유한다.** changelog: agent swap(실패 시 이전 agent로 롤백),
  fork, worktree bootstrap script를 모든 생성 경로에서 실행, grid 레이아웃 축소 시 세션 보존.

### 확인 못 한 것 — 그리고 하필 우리에게 가장 중요한 것이다

> **⚠ `Pi`가 Xirp의 first-class coding agent가 되었다는 주장은 확인되지 않았다.**

ChatGPT 분석은 *"9월 11일 Pi를 정식 coding agent로 넣었다"*, *"Claude, Codex, Gemini,
**Pi**, Cursor"*라고 적었다(inherited, 출처 ChatGPT via GLG). 나는 이것을 확인하지 못했다:

- Spotify **공식 문서의 § Limitations는 지금도 `Claude Code, Codex, and Gemini coding
  agents`**라고만 쓴다 (read, 2026-09-18 fetch).
- 같은 문서 본문도 *"Run **Claude Code, Codex, or Gemini** in persistent terminal sessions"*다.
- **changelog 전문을 받아 `pi`를 찾았으나 없다.** 반면 Cursor Agent는 나온다.

즉 **Cursor는 확인되고 Pi는 안 된다.** 문서가 changelog보다 늦게 갱신되는 것일 수도 있고,
Exa 캐시가 오래된 것일 수도 있고, 주장이 틀린 것일 수도 있다. **셋 중 무엇인지 모른다.**

이 항목을 크게 적는 이유: *"Spotify가 만드는 multi-agent workbench에서 Pi가 일급 하네스가
됐다"*는 우리에게 **가장 값나가는 문장이고, 그래서 가장 위험한 문장**이다. 확인되면 Pi의
위상이 달라지고, 안 되면 아무 일도 아니다. **이것이 이 문서의 1순위 미해결이다.**

### 그 밖에 inherited로 남는 것 (확인 안 함)

- 최신 버전이 **v0.34.0 / 2026-09-17**이라는 것
- **`xirp` CLI가 v0.26(2026-09-03)에 생겼고** running session `list`/`message`, Claude/Cursor
  세션 import, transcript upload를 한다는 것 — changelog 본문에 *"deep links, or the CLI"*라는
  언급은 읽었으나, `session message` 같은 하위 명령의 존재와 도입 시점은 확인 못 했다
- v0.34의 `xirp session new-terminal`
- workflow status가 `backlog / in progress / in review / blocked / done`이라는 것
- 9월 9일 browser panel DOM 요소 클릭 + annotation 기능
- 서버 배포/SSH 호스팅 세션 미지원이 FAQ에 명시돼 있다는 것 (§Limitations의 macOS-only와
  결이 맞지만, FAQ 문구 자체는 확인 안 함)
- Xirp에 **third-party plugin API가 없다**는 것 — 문서에서 안 보인다는 negative claim이고,
  없음을 확인하는 것은 있음을 확인하는 것보다 어렵다

---

## 우리와 갈리는 축 — 층이 다르다

ChatGPT 분석의 핵심 대비는 이것이었고(inherited), 우리 쪽은 로컬에서 확인했다:

```
Xirp CLI                          entwurf
   ↓                                 ↓  garden id
Xirp가 소유·관리하는 session       서로 다른 harness citizen
   ↓                                 ↓
message / terminal / lifecycle     각 harness의 공식 delivery rail
```

**`xirp session message`가 있다는 것이 garden-id 같은 harness-independent identity와
delivery protocol의 증거는 아니다.** 공개 문서상으로는 Xirp가 **자기 세션**을 제어하는
API에 가깝다. 이것이 계속 볼 지점이다.

그리고 **기억축이 정반대다**:

| | Xirp + Portal | 우리 |
|---|---|---|
| 방향 | 조직 공통 맥락을 **Workspace 지식으로 축적**해 미래 agent가 재사용 | 기억의 authority를 합병하지 않고, **돌아온 담당자가 판을 다시 펼친다**(`/recall`) |
| 소유 | Portal이 **institutional memory substrate를 소유**한다 | 일부러 memory emperor가 되지 않는다 |

**단, Xirp의 "context is decoupled from any single agent or harness"는 우리 garden-id의
harness 독립성과 같은 문제의식이다.** 답이 다르다 — Xirp는 **컨텍스트를 제품이 들고** 하네스를
갈아끼우고, entwurf는 **주소만 들고** 컨텍스트를 각 citizen에게 남긴다. 어느 쪽이 맞는지는
이 문서가 판정하지 않는다.

---

## 우리 쪽에서 실제로 일어난 일 — 여기는 측정했다

ChatGPT 분석이 짚은 entwurf 쪽 사실들을 로컬에서 직접 읽었다.

**1. 경계가 문서에 박혔다** (read `~/repos/gh/entwurf/plugins/herdr/README.md:1-9`):

> Two surfaces, and only two: one **install-time build** … and one **overlay pane** …
> **Herdr owns the workbench** — workspaces, tabs, panes, layout, and the agent lifecycle it
> detects inside them. **Entwurf owns the screwdriver** — garden identity, official delivery,
> receipts, named refusals. This plugin is the smallest useful place those two meet.

(ChatGPT는 이를 *"Herdr supplies the workbench. Entwurf supplies the screwdriver"*로 인용했는데
원문은 `owns`다. 뜻은 같지만 인용은 `owns`가 맞다.)

**2. 0.23.0이 왜 필요한지도 박혀 있다** (read `NEXT.md:185`):

> **0.23.0** prepare → make → **GLG publish** → `plugins/herdr/runtime-lock.json`
> `source: npm` 0.23.0 핀 **(0.22.0은 `scripts/herdr-*.mjs`가 없어 핀 불가)** →
> 플러그인 `version` 0.2.0.

`package.json`은 아직 **0.22.0**이다 (measured, HEAD `ba6a4e3`). 즉 플러그인과 install path는
이미 있고 #116도 닫혔으며, 0.23.0 컷은 **그 플러그인이 쓰는 런타임을 candidate checkout이
아니라 정식 npm artifact에 고정하는 마지막 제품화 단계**다.

**3. 그리고 가장 볼 값이 있는 것 — 작업대가 준 공구를 드라이버가 거부했다.**

herdr는 `herdr agent prompt`, `herdr agent send-keys`를 제공한다. fresh sibling의 첫 턴을
그것으로 보낼 수 있어 보였는데, **그 길을 폐기하고 게이트로 막았다**
(read `~/repos/gh/entwurf/scripts/check-typing-call-fence.ts`). 금지 목록 8개 (read `:58-67`):

| 이름 | 표면 |
|---|---|
| `send-keys` | tmux / herdr CLI |
| `send_keys` | herdr `agent.send_keys` |
| `paste-buffer` / `load-buffer` | tmux |
| `send-text` / `send_text` | herdr `pane.send_text` |
| `"agent.prompt"` | herdr JSON-RPC method |
| `"pane.input.set"` | herdr JSON-RPC method |
| `["agent","prompt"]` | herdr CLI argv |

**이유가 소스 주석에 영수증과 함께 적혀 있다** (read `:16-21`):

> `[측정 2026-09-18, herdr @ 7505c08]` … `src/app/api_helpers.rs:25-32` wraps it in bracketed
> paste … what is acknowledged is that **input was written** — herdr's own help says it
> **"does not track turns"**.

> **작업대가 좋은 공구를 많이 제공하더라도, 부름의 증거가 될 수 없는 공구는 드라이버가
> 거부한다.** 키 입력이 성공했다는 것은 텍스트가 쓰였다는 사실이지 턴이 전달됐다는 사실이
> 아니다. 그래서 delivery receipt가 될 수 없다.

이것은 이 집 `subtract` 스킬이 요구하는 동작이 **게이트로 내려간 사례**다. 그리고
`UNCLEBOB.md` §A-4의 *"어떤 건 풀고 어떤 건 조인다"*와 같은 결이다 — herdr 통합은 풀고,
delivery 증거 기준은 조였다.

---

## 다시 볼 때

정기 추적하지 않는다. ChatGPT 분석이 제시한 두 관측점을 그대로 쓴다(inherited, 그리고 내가
보기에도 맞는 두 지점이다):

1. **`xirp session message`가 UI automation을 넘어 stable session identity / delivery receipt /
   agent-to-agent semantics로 깊어지는가.** 깊어지면 entwurf와 직접 비교할 영역이 생긴다.
   (우리 쪽 판정 기준은 위 §3에 이미 있다 — **"입력이 쓰였다"와 "턴이 전달됐다"를 구분하는가.**)
2. **Xirp가 실제 third-party plugin/integration API를 여는가.** 열리면 `herdr-entwurf`처럼
   *Xirp는 작업대, entwurf는 드라이버* 결합이 기술적으로 가능해질 수 있다. 다만 **macOS 전용
   제약이 남는 한 이 집에서는 실행 대상이 아니다.**

그리고 이 문서 자신의 것 하나:

3. **`Pi` first-class 주장을 확인하거나 폐기한다.** 위 §확인 못 한 것의 1순위 항목.
   확인 경로는 Xirp changelog의 해당 릴리즈 항목 또는 공식 문서 § Limitations의 갱신이다.

화면·세션 수·릴리즈 번호만 늘어난 것은 갱신 사유가 아니다.
