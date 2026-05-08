---
description: 다축 맥락 복원 — compact 없이 session/day/semantic 축으로 recap
---
`/recap`은 단순 직전 세션 요약이 아니라 **multi-axis context hydration**입니다.
목표는 raw JSONL이나 compact 없이, 적은 토큰으로 “지금 이어야 할 맥락”을 복원하는 것입니다.

먼저 읽을 것:
- `session-recap` 스킬
- 필요 시 `day-query` 스킬
- repo 문서: `docs/recap.md`

## 0. Scope 결정

- 기본 프로젝트명 = CWD 마지막 디렉토리명
  - `~/repos/gh/agent-config` → `agent-config`
  - `/home/junghan` → `home`
- 단, 사용자 의도가 우선입니다.
  - “home 디렉토리 분신”, “Entwurf” → `home`
  - “COS” → `cos`
  - 특정 repo 언급 → 그 repo명
- 날짜가 바뀐 새 세션이면 yesterday/today boundary를 의식합니다.

확실하지 않으면:

```bash
ls -lt ~/.pi/agent/sessions/ | head
```

## 1. Repo-local session recap

먼저 현재/지정 repo의 pi 세션을 봅니다.

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 15 --source pi
```

응답에는 반드시 헤더를 포함합니다.

```text
조회 프로젝트: <PROJECT>
대상 세션: ═══ <project> [pi] (...) ═══
```

## 2. 짧거나 빗나가면 확장

다음이면 즉시 확장합니다.

- 1턴 entwurf
- “Reply only OK” 같은 smoke 세션
- 사용자가 기대한 주제가 없음
- 날짜가 넘어가서 어제 긴 작업을 찾아야 함

```bash
python3 {baseDir}/scripts/session-recap.py -p <PROJECT> -m 20 -s 5 --skip 0 --source all
```

## 3. Semantic cross-session

recap 출력에서 proper noun을 뽑아 **semantic-memory**로 2단계 검색을 실행합니다.

1. meta query: 사용자가 말한 추상 주제
2. concrete query: 결과에서 뽑은 repo/version/commit/skill/§ label/design phrase

예:

```text
recap 기억축 compact 없이 모든 축 day-query agent-config pi-shell-acp 0.5.0
agent-recall session-recap v2 prompt spine compact transcript recall UX
```

**모든 백엔드에 `semantic-memory` 스킬이 동일하게 노출됩니다** (pi / ACP Claude / Codex / Gemini). 본인 schema에 보이는 surface를 쓰되 capability는 동일합니다.

| 백엔드 | 1순위 호출 (스킬) | 부수 surface |
|--------|------------------|--------------|
| pi 네이티브 | `semantic-memory` 스킬 (SKILL.md) | + andenken extension의 `session_search` / `knowledge_search` registerTool 도 사용 가능 |
| ACP Claude (pi-shell-acp 경유) | `agent-config-skills:semantic-memory` Skill (plugin namespace) | — |
| ACP Codex / Gemini | `semantic-memory` 스킬 (SKILL.md) | binary path 직접 호출도 가능 |

세 surface 모두 같은 andenken CLI에 연결되어 결과가 동일합니다. 통일하려고 우회하지 말고, 본인에게 가장 먼저 보이는 surface를 그대로 부르세요.

## 4. Day-axis hydration

사용자가 “어제 전체”, “오늘 이어서”, “나를 리콜”, “기억축”을 말하면 day-query 축을 봅니다.

```bash
gitcli day <DATE> --me --summary
denotecli day <DATE> --dirs ~/org
lifetract read <DATE> --data-dir ~/repos/gh/self-tracking-data
```

필요 시 calendar도 봅니다.

```bash
gog -j calendar list --from <DATE>T00:00:00+09:00 --to <NEXT_DATE>T00:00:00+09:00 --account junghanacs@gmail.com
```

## 5. Conscious markers

journal/llmlog의 신호를 우선 취급합니다.

- `§repo` = sibling/담당자 호출 index
- llmlog = 의식적으로 남긴 설계 기록
- session JSONL = working chatter

즉, session-recap만 보고 “80% 충분”이라고 결론내리지 않습니다.

## 6. 최종 응답 형식

요약은 다음 구조로 답합니다.

```text
조회 범위:
- session: ...
- semantic: ...
- day-axis: ...
- conscious markers: ...

복원된 맥락:
- ...

놓치기 쉬운 축:
- ...

아직 안 본 것:
- ...
```

금지:
- raw JSONL 직접 read
- 헤더 없는 요약
- 한 repo 세션만 보고 전체 맥락이라고 말하기
- 같은 meta query만 반복하기
