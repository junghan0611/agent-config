# PRIME — 검수 매트릭스

prime-agent(junghan0611/prime-agent, fork)를 **Lisp/SCI 워크스페이스가
대화를 평가 가능하게 만드는가**로 재는 작업면. 남의 인기 하네스가 아니라
**여기서 짓는 집**이다. 비교 대상은 Python REPL RLM이 이미 하던 루프와,
오늘 노트 `20250405T171216`(선택하지 않고 평가한다).

설치·스킬 연결은 이 벤치의 일이 아니다. 코드 SSOT는 `~/repos/gh/prime-agent`.

> 후보지 채택이 아니다 — 이미 우리 포크다. 벤치에 올린 이유는 README 표에
> 이름만 있고 대문자 파일이 없어서 harness-bench가 못 봤기 때문이다.
> `nixos-config`에 에이전트 런타임으로 선언하지 않는다. "built here, not installed."

---

## 상태 — 2026-09-09

리포 `~/repos/gh/prime-agent` · 브랜치 `feat/clojure-runtime` · HEAD `186dc13b`
(측정 `git log -1`, 원격 `origin/feat/clojure-runtime` 일치).

PATH에 이 벤치가 설치한 바이너리 없음. 구동 영수증은 이 파일이 아니라
그 집 담당자 문서·당일 어쏠로그에 있다. 이 매트릭스는 **아직 거의 미측정** —
표에 자리만 만든다.

밀고 있는 장점 (그 집·어쏠로그, inherited until re-measured here):
**자연어를 선택지로 닫지 않고, 함께 빚은 Lisp form을 제한된 REPL에서 평가한다.**
모델의 행동면은 이미 form 이다. 사람이 form을 직접 넣는 경로, Emmy, 형제 봉투의
`measured_at` 은 아직이거나 다른 층이다 (`20250405T171216`, 읽음 2026-09-09).

---

## 매트릭스

상태: `측정됨` / `미측정` / `막힘` / `안 함`

| # | 항목 | 상태 | 판정 |
|---|---|---|---|
| A1 | 리포·브랜치 | 측정됨 | `feat/clojure-runtime` `186dc13b` |
| A2 | Clojure가 기본 커널인가 | 미측정 | README 주장. 이 벤치에서 한 턴을 안 돌림 |
| B1 | 장점: form이 행동의 장부인가 | 미측정 | **돌릴 것.** 나머지는 같으니 스킵 |
| B2 | 선택지 UI vs 말=프롬프트 | 미측정 | 오늘 날것의 거부 |
| C1 | 이 벤치가 prime를 설치하는가 | **안 함** | 그 집 담당자 몫 |

---

## 미해결

1. 이 파일을 그 집 담당자 문서와 어떻게 겹치지 않게 둘 것인가.
2. 같은 모델로 장점만 도는 프로토콜이 서면 B1이 첫 칸이다.

## 명령

없다. `run.sh setup:prime`를 만들지 않는다.
