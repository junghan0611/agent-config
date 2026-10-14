# OPENRIG — 하네스들을 감싸는 rig, 관측 기록

[OpenRig](https://github.com/mvschwarz/openrig)를 보는 **외부 관측면**이다. `XIRP.md`·`YEGGE.md`처럼 가끔 둘러보는 자리이고, 벤치마크도 도입 후보도 아니다.

GLG `[GLG 직접, 2026-10-14 이 세션]`: *"일단 openrig도 담자. 배울게 다 있으니까."*

GLG가 처음 본 날의 말 `[GLG 직접, ~/org/journal/20261005T000000--2026-10-05__journal_week40.org § 17:58 openrig 훌륭한 토탈 솔루션이다, 2026-10-08]`:

> 훌륭하다 herdr위 계층을 또 감싼것이라고 봐야하나? herdr cmux를 감싼 계층이면서 uiux 까지 독자적인데 많이 나아간것같다. … openrig는 솔루션인것같고 딱 맞춤형 솔루션. 이거 내 입장에서는 전향하기 싫긴하거든.

> 나는 pi를 rpc로 풀지 않고 bg로 동작하게 하지 않고 오직 클로드코드 등과 같이 보이게 하는것이 원칙이거든. … mux, herdr 레일로 동작하더라도 하네스는 보여야하고 가든 아이디로 동작해야해.

`entwurf` 담당자의 일은 garden-id·delivery·visible lifecycle이라는 자기 로직을 보장하는 것이지 OpenRig와 우열을 겨루는 것이 아니다. 바깥의 큰 rig를 보고 "우리는 무엇을 배우고 무엇을 하지 않는가"를 고르는 일은 GLG와 이 시험소의 몫이다.

---

## 상태 — 2026-10-14

관측 자리: oracle, Claude Opus 5.5 (Claude Code), `~/repos/gh/agent-config`. **설치·`rig setup`·daemon 기동·테스트 실행 0.** 로컬 클론 `~/repos/3rd/openrig`는 `git fetch`만 했고 작업트리는 `bed4d45`(2026-10-11) 그대로다. 아래 소스 인용은 전부 `origin/HEAD` = `6448f6b`(2026-10-14)를 `git show`/`git grep`으로 읽은 것이다.

| 축 | 서 있는 곳 | 증거 |
|---|---|---|
| 정체 | *"A harness wraps a model. A rig wraps your harnesses."* YAML로 팀(rig)을 정의하고 명령 하나로 띄운다 | `[읽음 README.md 첫 단락]` |
| 판 | 최신 릴리스 v0.6.10 (2026-10-12), 10월 커밋 166개, TypeScript, 2026-04-01 생성, ★7,434 · open 144 | `[측정 gh api · git log, 2026-10-14]` |
| 런타임 | 6개 키: `claude-code` `codex` `pi` `omp` `stub` `terminal`. OMP 어댑터는 Pi 어댑터를 상속 | `[읽음 docs/as-built/architecture/adapters-and-runtimes.md:99-102]` |
| 층 | **Herdr 위에 선다.** 터미널 어댑터 기본은 `HerdrAdapter`, 없으면 cmux. `rig setup`이 Herdr를 기본 설치한다 | `[읽음 같은 문서:302-308, README § What OpenRig changes on your machine]` |
| 설치 | **이 집에서는 안 함.** daemon이 `~/.claude/skills`·`~/.agents/skills`에 스킬을 심고, 작업공간 `.claude/settings.local.json`에 statusLine·hook을, `~/.codex/config.toml`에 hook을 쓴다. 모두 entwurf와 공유하는 파일이다 | `[읽음 README § What OpenRig changes on your machine]` |

---

## [2026-10-14] 첫 관측 — pi를 RPC로 품는 토탈 솔루션

### pi를 어떻게 품는가 — 이 집 원칙과 정반대 축

`[읽음 packages/daemon/src/adapters/pi-runtime-adapter.ts:1-10]`:

> the Pi runtime adapter (RPC-first, runner-in-a-pane). The adapter launches the OpenRig-owned pi-runner inside the seat's normal tmux pane; the runner hosts `pi --mode rpc` (headless JSONL — Pi's first-class integration surface). … TUI-native Pi is a SEPARATE future contract, never a hidden mode here (BR-2).

pane 안에 사람이 보는 것은 runner가 비춰 주는 transcript이고, pi 자신의 TUI가 아니다. 활동 상태와 세션 정체는 RPC 이벤트에서 나온다. Pi와 OMP는 fork를 지원하고, 재개 토큰은 `pi_session_file`/`omp_session_file`이다 `[읽음 adapters-and-runtimes.md:290-293]`.

GLG의 원칙(위 10-08 인용)은 "RPC로 풀지 않는다, 클로드코드처럼 보이게 한다"다. OpenRig는 보이게 하되 **자기 runner로** 보이게 한다. 둘 다 "보이지 않는 곳에서 하지 않는다"는 쪽이지만, 화면의 주인이 다르다.

### pi-durable은 이 판에 없다

이슈 검색에서 `pi-durable`·`durable pi`는 토큰이 우연히 겹친 잡음만 잡혔다 `[측정 gh search issues, 2026-10-14]`. 재개 토큰이 세션 파일 꼴이라, 대화를 SQLite에 두고 `transcriptPath`가 null인 durable(`PI-DURABLE.md`)을 넣으려면 어댑터와 재개 정직성층을 새로 써야 한다 `[판단 — 위 두 사실에서]`. ROADMAP의 pi 관련 항목은 *"Operator recovery for Pi and Oh My Pi seats (#41)"* 하나다 `[읽음 ROADMAP.md:27]`.

### 주소 — 자리를 부른다, 차지한 이를 부르지 않는다

`[읽음 docs/reference/lore-routing.md:45]`: *"`position` | Canonical owning seat address, `<seat>@<rig>`. It names the position, never an occupant."* 부르는 꼴은 `rig send dev-build@starter '…'` `[읽음 README.md:134]`.

garden id는 그 반대다. 시민(차지한 이)을 부르고, 코디네이터는 계급이 아닌 임시 역할이다. OpenRig는 **자리가 남고 차지한 이가 바뀐다**는 쪽을 명시적으로 골랐다. 어느 쪽이 맞느냐가 아니라 같은 문제에 대한 다른 답이다.

### 기억 — compaction을 seat의 선언된 성질로

- `compaction_strategy`가 seat 설정 항목이다: `default-compaction` · `managed-compaction` · `handover` · `apprentice-handover` `[읽음 docs/reference/agent-spec.md:187, rig-spec.md:407]`.
- 0.5.6: *"an agent seat can now outlive its own context window without a human managing the transition."* managed-compaction은 압축 전 상태를 맡기라는 넛지를 주고, 복원 뒤 실제로 회복한 맥락의 양을 receipt로 남긴다 `[읽음 CHANGELOG.md:1570, 1602]`.
- handover는 `fork:`(살아 있는 맥락을 실어감) 또는 `rebuild`(durable chain으로 새 occupant를 priming)다 `[읽음 CHANGELOG.md:1674]`.
- 맥락을 파일 대신 주소로 당긴다: `rig context get <pack-ref>/<file>#<H2-slug>` `[읽음 CHANGELOG.md:1789]`.
- 일의 장부는 SQLite queue다 `[읽음 docs/as-built/architecture/coordination-primitive.md:19]`.

이 축은 지금 [entwurf#143](https://github.com/junghan0611/entwurf/issues/143)("pi-durable 장기 기억 코디네이터 — 무엇을 기억하고 이어갈 것인가")과 정면으로 겹친다. #143은 **같은 대화를 쥔 채 요약을 기다리는** 쪽이고, OpenRig는 **자리를 유지하고 사람(occupant)을 갈아 끼우는** 쪽까지 선택지로 둔다 `[판단]`.

### 재개를 정직하게 — 따로 세운 층

`[읽음 adapters-and-runtimes.md:24-28]`: *"A separate resume-honesty layer answers the question 'did this harness actually resume, or did it silently fresh-launch?' truthfully rather than optimistically."* 이 집의 "같은 id 재개를 측정했다 / 안 했다"를 가르는 습관(`PI-DURABLE.md` 10-08 절)이 저쪽에서는 제품 안의 층이다.

### 검증면 (렌즈 5) `[측정 git ls-tree · git grep @6448f6b, 실행 0]`

- (a) **테스트가 행동 옆에 있다.** `packages/*/test/`에 `.test.ts(x)` 1,580개, 테스트가 아닌 `.ts(x)` 1,313개. daemon 990 · cli 281 · ui 199 · tui 110.
- (b) **게이트 코드가 자기 테스트를 가진다.** `scripts/*.mjs` 구현 25개 중 20개가 짝 `.test.mjs`를 갖는다.
- (c) **문서↔코드 계약 게이트가 있다.** `check-docs-guard.mjs`, `check-first-run-references.mjs`. 후자의 머리 주석: *"Check concrete references, not prose quality."* 문구를 고정하지 않는다는 점에서 `UNCLEBOB.md`의 swarm-forge 규칙과 같은 선이다.
- 덧붙여 `docs/as-built/`에 문서가 스스로를 다시 재는 `grep` 명령이 47줄 박혀 있다(예: 런타임 키 6개를 세는 명령이 그 주장 바로 옆에 있다). 영수증이 문서와 함께 이동한다.

테스트를 돌리지 않았으므로 green/red는 미측정이다.

### 최근 방향 — 운영 통제판 `[읽음 git log origin/HEAD, 2026-10-12~14]`

여러 호스트에 걸친 사용량 창(usage windows), seat별 reasoning effort(`rig seat set-effort`), Pi 비용을 세션 entry에서 한 번만 세기, OpenRouter 실청구액 표시, Codex seat 대화 유지 재시작(`rig seat restart --keep-conversation`), Slack 게이트. ROADMAP은 OpenCode·Cursor·Grok·Devin 어댑터를 공유 어댑터 위에 둔다(#43) `[읽음 ROADMAP.md]`.

### 이미 배워 온 것 하나 `[상속: openclaw-config config/workspace-bbot/memory/2026-10-11.md:225 — bbot이 코디네이터 durable store transcript를 읽어 적음, 이 세션 미확인]`

2026-10-11 17:53 GLG가 코디네이터에게 `~/repos/3rd/openrig/demo`를 가리키며 *"프로젝트를 비교하자는건 아니고, demo gif가 좀 있어야겠어. 우리도."* → entwurf #138, 같은 날 첫 GIF.

---

## 배울 것 — 채택이 아니라 형태

1. **재개 정직성을 이름 붙인 층으로.** "정말 재개했는가, 조용히 새로 띄웠는가"를 제품이 스스로 묻는다. durable의 같은-id 재개 영수증이 같은 질문이다.
2. **문서 안의 재측정 명령.** `file:line` 옆에 그 수를 다시 세는 `grep`을 둔다. 이 집의 evidence state(`measured`/`read at`)를 기계로 한 걸음 더 민 형태다.
3. **compaction 전략을 선언된 seat 성질로.** #143에서 GLG가 정한 "background compaction 0, 기다린다"도 암묵 기본값이 아니라 선언된 정책일 때 다음 형제가 덜 헤맨다 `[판단]`.
4. **게이트 스크립트에 짝 테스트.** 렌즈 5 (b)의 실물.
5. **데모 GIF.** 10-11에 이미 가져왔다.

## 우리와 갈리는 축

| | OpenRig | 이 집 + entwurf |
|---|---|---|
| 주소 | 자리 `<seat>@<rig>` — occupant는 바뀐다 | garden id — 시민 자신, 역할은 임시 |
| pi 화면 | OpenRig runner가 RPC transcript를 비춤, TUI-native는 미래 계약 | pi 자신의 TUI, Claude Code와 같은 모습 |
| 층 | Herdr 위 — 수명·queue·맥락·Slack·사용량까지 소유 | 좁은 드라이버 — 주소와 전달만 |
| compaction | seat별 전략, handover로 occupant 교체 가능 | 같은 대화가 요약을 지나 이어감(#143) |
| 호스트 쓰기 | 스킬 루트·statusLine·Codex hook에 직접 씀 | `skills/` SSOT + entwurf 공동 소유 파일 |

## 오독 경계

- **도입 후보가 아니다.** `rig setup`·daemon 기동·bundle install을 이 HOME에서 하지 않는다. 위 호스트 쓰기 목록이 이유다.
- **OpenRig의 pi 지원 ≠ pi-durable 지원.** 재개 토큰이 세션 파일 꼴이다.
- **"자리 주소"가 틀린 답이 아니다.** 같은 문제의 다른 답이다. 이 문서는 우열을 매기지 않는다.
- **별 수는 점수가 아니다.**
- **"토탈 솔루션이니 entwurf도 그만큼 커져야 한다"로 읽지 않는다.** GLG 10-08: *"전향하기 싫긴하거든."* entwurf를 planner로 키우지 않는다는 README § Agent Runtime Bench의 선이 그대로다.

## 미해결

1. **TUI-native Pi 계약이 나오는가.** 나온다면 GLG 원칙과 같은 쪽으로 오는 첫 신호다.
2. **pi-durable을 들이는가.** #41(Pi/OMP seat 운영자 복구)과 #43(공유 어댑터)을 본다.
3. **렌즈 5는 세기만 했다.** 테스트 실행·CI 결과는 미측정.
4. **Herdr를 둘이 함께 만진다.** entwurf의 Herdr plugin과 OpenRig의 `HerdrAdapter`가 같은 Herdr 서버에 붙을 때 무엇이 겹치는가(예: 닫힌 #67 `HERDR_AGENT`). 미측정.

## 다시 볼 때

```bash
git -C ~/repos/3rd/openrig fetch -q && git -C ~/repos/3rd/openrig log origin/HEAD -1 --format='%h %ad' --date=short
gh api repos/mvschwarz/openrig/releases/latest --jq '"\(.tag_name) \(.published_at)"'
git -C ~/repos/3rd/openrig show origin/HEAD:packages/daemon/src/adapters/pi-runtime-adapter.ts | sed -n 1,10p   # TUI-native Pi?
git -C ~/repos/3rd/openrig grep -n -i 'durable' origin/HEAD -- packages/daemon/src/adapters | head   # pi-durable adapter?
```
