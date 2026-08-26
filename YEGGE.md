# YEGGE — Wheelhouse 관측 기록

Steve Yegge의 에이전트 하네스 실험을 가끔 둘러보기 위한 **외부 관측면**.
`HERMES.md`처럼 하네스 리서치가 이 집의 몫이어서 두되, 벤치마크나 도입 후보는 아니다.
가든에 승격할 지식도, `entwurf`의 설계 문서도 아니다.

> 관측은 채택이 아니다. 새 화면과 비유에 끌려 우리 하네스를 늘리지 않는다.
> 공개된 근거가 바뀔 때만 날짜를 붙여 아래에 덧붙인다.

`entwurf` 담당자의 일은 Wheelhouse·Hermes·OMP와 우열을 겨루는 것이 아니다. garden-id,
record/liveness, rail 선택, delivery, visible lifecycle이라는 자기 로직을 보장하고 어제의
자기 코드보다 나아졌는지를 잰다. 외부 하네스를 비교하고 “이 형제를 실제 운영에서 왜
받아들이는가”를 고민하는 일은 **entwurf 사용자인 GLG와 agent-config 시험소의 몫**이다.
이 문서의 관측은 그 사용자 판단을 돕되 entwurf의 기능 요구로 넘어가지 않는다.

---

## [2026-08-26] Wheelhouse 한 번 보기

### 읽은 곳

- [The Shape of Things to Come, Part 1: The Continuous Thunderdome](https://yegge.ai/essays/the-shape-of-things-to-come/)
- [Part 2: Model Welfare for Agentic Engineers](https://yegge.ai/essays/model-welfare/)

### 공개 자료에서 확인한 것

2026-08-26 두 글과 이미지 설명에서 직접 읽었다.

- Wheelhouse는 Wyvern에 결합된 **비공개·맞춤형 하네스**다. Yegge 자신도 재사용
  프레임워크로 내놓지 않겠다고 한다.
- 본체는 Bash 위주이며 약 25k lines of Elisp가 있다고 썼다.
- 처음부터 all-Emacs로 만들었지만 **tmux under the hood**라고 명시했다. Emacs를
  종료해도 세션이 살아 있는 하부층과, 그 세션들을 한 판에 보는 상부 투영면을 나눈다.
- 출발점은 “에이전트를 전환할 수 있는 Emacs 인터페이스가 있으면 좋겠다”는 요청이었다.
- 첫 글의 cockpit 이미지 설명은 왼쪽을 **crew rolodex**, 가운데를 선택한 agent
  session, 아래를 fleet dashboard라고 부른다. dashboard에는 Portcullis land queue와
  agent status가 보인다.
- 둘째 글의 이미지는 같은 아래 자리에 `*roster*`를 열어 Seat / Pool / Pronouns /
  Since / Canon & declaration을 보여준다. 고정된 한 화면이라기보다 필요에 따라 바꾸는
  Wheelhouse 관제 buffer 자리다.
- 역할은 crew(설계·대화·일부 구현), fleet(구현), standing role agent(운영)로 나뉘고,
  Beads/Dolt가 작업 그래프와 기록을 맡는다.
- Part 2에서는 지속되는 이름·주소·이력을 **seat**, 한 번 깨어 일하고 넘기는 실행을
  **session**으로 구분한다. handoff, 전용 clone, 시작 시 목적과 기억 주입, polling을
  agent 밖으로 빼는 것을 model welfare의 실무 패턴으로 제시한다.

### 공개 자료만으로 모르는 것

- Emacs와 tmux 사이의 정확한 연결 코드는 공개되지 않았다.
- 가운데 화면이 `vterm`/`eat`에서 `tmux attach`한 것인지, tmux control mode를 직접
  렌더링한 것인지, 완전한 자체 terminal mode인지 확정할 수 없다.
- 왼쪽 glyph 각각의 정확한 의미도 공개 설명이 없다. 실행 상태·주의·context 등을
  압축한 표식으로 보이지만 이는 화면에서 한 추정이다.

### GLG의 판정

- GLG도 tmux를 세션의 생명주기 층으로 사용한다. **버퍼는 tmux로 가야 한다.** 그래야
  Emacs 생명주기와 분리되고, Emacs에 들어왔을 때만 전체 판을 잘 보여줄 수 있다.
- Wheelhouse의 화면은 이 원칙을 확인해 주지만, orca·Hermes류의 관제 레이아웃과
  본질적으로 다른 새 모양으로 보이지 않는다.
- Yegge의 이름·역할·상태가 빽빽한 cockpit은 GLG의 머리에 한 번에 들어오는 판이 아니다.
  이것은 아직 어떤 “수준”에 도달하지 못했다는 뜻으로 판정하지 않는다. 서로 다른
  인지 스타일과 프로젝트 규모에서 나온 선택이며, Yegge 자신도 시행착오 중이다.
- 따라서 이 관측을 이유로 Emacs sidebar, roster, dashboard 또는 새 역할 체계를 만들지
  않는다. Doom Emacs에도 당장 더 얹을 것이 없다.

### 우리에게 남는 선

Wheelhouse의 표면보다 `entwurf`의 본질을 지킨다.

1. **garden id가 유일한 주소축**이다. tmux window/pane은 배치 사실이지 주소가 아니다.
2. meta-record는 사실을 보고하고, 전송 rail은 liveness와 backend 사실로 decider가 고른다.
3. 살아 있는 형제에게 보내기, dormant pi를 같은 id로 다시 열기, 새 visible sibling을
   여는 일을 섞지 않는다.
4. 숨은 background child가 결과를 소유하게 하지 않는 **visible-first** 경계를 지킨다.
5. 형제는 worker가 아니며, GLG가 요청하지 않은 역할·위임·도시를 스스로 늘리지 않는다.
6. tmux는 지속 실행층, Emacs는 선택 가능한 투영면이다. 투영면이 본체를 소유하지 않는다.

Yegge에게서 지금 가져갈 것은 새 기능이 아니라 이 분리의 재확인뿐이다.

---

## 다시 볼 때

정기 추적하지 않는다. 새 글이나 공개 구현이 실제로 다음 중 하나를 바꿀 때만 날짜를
붙여 짧게 덧붙인다.

- Wheelhouse의 Emacs↔tmux 연결 방식이 공개되었는가
- seat/session 또는 handoff에 독립적으로 검증할 새 근거가 생겼는가
- `entwurf`의 주소·생명주기·visible-first 경계를 다시 생각하게 할 사실이 생겼는가

화면, 역할명, 에이전트 수, token burn만 늘어난 것은 기록 갱신 사유가 아니다.
