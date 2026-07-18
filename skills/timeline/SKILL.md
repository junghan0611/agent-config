---
name: timeline
description: "GLG의 시간축 관측소 (범용 스킬) — 어느 세션·리포에서든 GLG의 하루를 깊이 0/1/2/3(시간블록·저널헤딩·에이전트스탬프·커밋/노트)으로 한 KST 축 위에 세운다. scripts/collect.py로 LOCAL FULL(events.jsonl, 로컬·gitignore)을 만들고 query.py로 꺼낸다. 스크립트는 HOME 앵커(~/repos·~/org·lifetract·agenda)라 CWD와 무관하게 돈다. 이 스킬을 읽지 않고 축을 건드리면 계약을 다시 도출하다 틀린다 — 고정 KST, 반개방 [from,to), 자정은 시작일 귀속, 0건은 ok가 아니다, sqlite를 직접 열지 않는다, 코멘트는 어떤 projection에도 나가지 않는다. Triggers: timeline, 관측소, 시간축, 깊이 0, depth axis, collect.py, query.py, events.jsonl, LOCAL FULL, 하루 slice, 주간 판독, 도메인 분포, projection, 표현, 증거, provenance, 커밋 수, 저널 일수, 사실 확인."
---

# timeline — 시간축 관측소

**이력서가 아니라 관측소다.** 선별된 최고작 대신 실제로 지나온 시간축을 열고, 판단은 읽는
쪽에 넘긴다. 논증은 하나 — **에이전트를 수십 개 붙여도 지나간 시간은 만들 수 없다.**

이 축을 발명한 게 아니다. 축은 이미 GLG의 org-agenda로 존재하고 매일 Emacs로 읽히며
`agenda.junghanacs.com`으로 공개된다. 이 스킬은 그 축의 **정규화된 복사본**을 만들 뿐이다.

## 범용 스킬 — 어디서 부르든, 무엇을 참조하든

이 스킬은 특정 리포에 묶이지 않는다. 스크립트는 **HOME 앵커**다: 커밋은 `~/repos/gh`·
`~/repos/work`, 노트는 `~/org`, 깊이 0은 배포된 `lifetract`, 스탬프는 `~/org`의 agenda에서
읽는다 (`scripts/collect.py`의 `HOME`/`ROOTS`/`ORG`). 그래서 **어느 세션·CWD에서 불러도**
같은 축이 나온다 — junghan0611 공개 도시에든, apply 제출 담당자든, 다른 리포든.

- **스킬 코드**는 `{baseDir}/scripts/` 에 산다 (`collect.py query.py view.py project.py
  test_timeline.py domains.json`, 그리고 private 오버라이드 심링크 `domains.local.json`).
- **데이터(LOCAL FULL)** 는 스킬이 소유하지 않는다. 부르는 쪽이 `--out`으로 위치를 정한다.
  `events.jsonl`·`snapshot.json`·`axis.html`은 전부 로컬이고 gitignore 대상이다 — 제목과
  ref를 나르기 때문. 리포에 커밋하지 않는다.
- **소비자**(예: junghan0611 공개 도시에의 축 리딩)는 자기 빌드에서 이 스킬의
  `{baseDir}/scripts/project.py`를 가리켜 자기 리포에 projection만 커밋한다. FULL은 커밋 안 한다.

## 깊이 0/1/2/3 — 하루를 보는 줌 레벨

소스는 끝내야 할 목록이 아니라 **줌 레벨**이다.

| 깊이 | 무엇이 보이나 | source | 누구의 기록 | 2026 커버리지 |
|---|---|---|---|---|
| **0** | 산 대로의 하루 — 수면·가족·독서·본짓 | timelog (`lifetract`) | **의도** | **194/194일** |
| **1** | 언제 무엇을 끄적였나 | journal 헤딩 | **의도** | 133일 |
| **2** | 에이전트가 무엇을 했나 | agenda 스탬프 | 산출물의 흔적 | 136일 |
| **3** | 상세 — 커밋 하나하나, 노트 | git · Denote note | 산출물의 흔적 | 184 / 160일 |

**0·1은 의도적 기록이고, 2·3은 잔여물이다.** 잔여물만 읽는 하네스는 무엇이 생산됐는지는
말해도 그것을 생산한 삶은 못 말한다.

**깊이 0을 자동 수집으로 바꾸려는 유혹을 경계하라.** 폰에서 손으로 export한다는 사실이
결함이 아니라 논지 자체다. 자동으로 흐르는 축은 다른 것을 재고 있다.

## 실행

```bash
# {baseDir} = ~/.claude/skills/timeline (Claude Code에선 직접 치환; pi는 자동 주입)
SK=~/.claude/skills/timeline/scripts
python3 $SK/collect.py --as-of 2026-07-14 --out events.jsonl > snapshot.json  # FULL (8초)
python3 $SK/query.py events.jsonl --day 2026-07-11              # 하루 slice
python3 $SK/query.py events.jsonl --source timelog --from 2026-01-01 --to 2026-07-14
python3 $SK/query.py events.jsonl --month 2026-06 --count entities
python3 $SK/view.py events.jsonl --snapshot snapshot.json --out axis.html  # 눈으로 본다
python3 $SK/test_timeline.py                                    # 계약 테스트
```

`view.py`는 **뷰어지 projection이 아니다.** 제목을 나르므로 출력(`axis.html`)은 `events.jsonl`과
똑같이 로컬이고 gitignore다. **집계를 붙이고 싶으면 projection에 붙여라** — 통계가 자라는 뷰어는
아무도 검토하지 않은 두 번째 축이 된다. `query.py`도 범용 분석기로 키우지 마라: 묻는 건 query,
보여주는 건 view, 내보내는 건 projection이다.

- `--as-of`는 **배타적** 상한(KST 자정). 안 주면 내일 = 오늘까지 포함.
- `--count`는 `events|entities`를 **명시해야 한다.** 커밋의 `authored`와 그 커밋을 가리키는
  `stamped`는 중복이 아니라 **같은 entity의 다른 event**다.
- `events.jsonl`은 **gitignore**다. 매번 다시 만든다(8초).

## 시간 계약

- **고정 KST.** 셸의 `$TZ`가 답을 바꾸면 안 된다. TZ 3개(UTC/Seoul/+14)로 돌려 바이트가
  같아야 한다.
- **반개방 `[from, to)`.** 이웃 창이 정확히 맞물린다.
- **자정을 넘는 블록은 시작일에 귀속.** 수면 `21:14→05:48` 514분은 전부 전날 것이다.
  (`lifetract`의 선례이고 축이 그걸 따랐다. 뒤집으려면 계약에 쓰고 하라.)
- **시간 블록은 구간이지 순간이 아니다.** `ts: null`, `duration_min`이 길이를 나른다.
  9시간짜리 블록에 순간을 찍는 건 day-only 노트에 `00:00`을 쓰는 것과 같은 날조다.

## 소스 상태 — `ok`를 함부로 쓰지 마라

| 상태 | 뜻 |
|---|---|
| `ok` | 읽었고, 뭔가 있었다 |
| `partial` | 읽었고, 일부를 reject했다 |
| **`empty`** | 읽었는데 **0건이다.** `ok`가 아니다 |
| **`stale`** | 깊이 0이 **다른 소스가 증언하는 날**을 못 덮는다 |
| `unreadable` | 못 읽었다 |

**`ok`는 두 가지를 한꺼번에 말한다 — 읽었다, 그리고 뭔가 있었다. 읽는 쪽은 두 번째만
훑는다.** `~/org`가 마운트 안 된 디스크에서 note는 `accepted 0, rejected 0, ok`가 된다.
깊이 하나가 통째로 "정상이며 비어 있음"으로 보고된다. 그래서 0건은 **`empty`**다.

`stale`에는 **임계값이 없다.** 커밋·스탬프·저널이 그날을 증언하는데 깊이 0이 침묵하면,
그 시간은 **안 산 게 아니라 안 적힌 것**이다. 다른 소스도 조용한 날이면 깊이 0이 하루
뒤처져도 거짓말이 아니니 `ok`다 — 매일 아침 울리는 경보는 아무도 안 읽고, 그 소음 밑으로
두 달짜리 구멍이 지나간다. (실제로 지나갔다.)

## 검증면 — 이 축을 인용하는 쪽이 주장할 수 있는 것과 없는 것

축을 소비하는 문서(projection, geworfen, **채용 제출본**)는 **manifest가 실제로 증언하는 것만**
주장해야 한다. 지문은 둘이고, **서로 다른 질문에 답한다.**

| | 덮는 것 | 답하는 질문 | 쓰는 데 |
|---|---|---|---|
| `events_sha256` | `events.jsonl`의 **정확한 바이트** | *같은 파일인가* | 이 디스크에서 그 run을 재현 |
| `content_sha256` | 각 이벤트에서 **`provenance` 제외** | *같은 관측인가* | **인용** |

`provenance.locator`는 *이 디스크의 어디서 읽었나*(어젠다의 줄번호, 클론의 절대경로)다.
어젠다는 역방향 datetree라 **스탬프 하나만 찍혀도 옛 줄이 전부 밀린다** — 이 문장을 쓴 날
오후에만 관측이 한 건도 안 바뀌었는데 `events_sha256`이 **세 번** 달라졌다. 그래서
**인용은 `content_sha256`으로 한다.** 그걸 못 박아두면 인용은 다음 스탬프에 죽는다.

**인용은 이렇게 한다 — `content_sha256` 하나만으로는 부족하다:**

```text
as_of + content_sha256 + code_sha256 + 소스 상태(sources) + 깊이0 tool revision
```

같은 content라도 **`as_of`가 다르면 다른 창**이고, **소스가 `partial`/`stale`이면 다른 품질**이며,
**lifetract 빌드가 다르면 깊이 0을 만든 손이 다르다.** `events_sha256`은 같은 디스크에서
**짝(events↔snapshot)을 검증**하는 데 함께 남긴다.

**지문이 증명하지 않는 것 — 이걸 넘어서 주장하지 마라:**

- **해시는 "이 코드가 실제로 돌았음"을 증명하지 않는다.** 바이트와 그 해시는 누구나 같이
  만들 수 있다. manifest는 **주장된 파생 경로**(code · tool · 소스 상태 · as_of)를 *기록*하고,
  해시는 그 manifest가 가리키는 **바이트/내용의 동일성을 확인하고 바꿔치기를 잡아낸다.**
  그게 전부다.
- 해시는 **소스의 진실성도, 완전성도** 증명하지 않는다. 축은 이 디스크가 말해준 것을 적었을 뿐이다.
- **외부 독립 확인 가능성은 이벤트의 "공개 도달성"에 달려 있다.** 공개 remote에 도달한 커밋과
  **공개 가든으로 export된 기록**(저널·노트 — 저널은 `:noexport:`를 뺀 전량이 가든으로 나간다)은
  확인할 수 있다. **비공개 리포·푸시 안 된 ref·export되지 않은 Org 기록**은 외부에서
  재구성되지 않는다. *"깊이 3은 누구나 검증 가능"도, "`~/org`는 전부 비공개"도 거짓이다.*
- **깊이 0은 폰에서 손으로 export한 1인칭 기록이다.** 외부에서 raw를 재구성할 길은 없다.
  확인할 수 있는 것은 *파생의 일관성*이다 — 옛/새 lifetract 바이너리를 같은 DB에 돌려 깊이 0
  이벤트를 diff하고, manifest의 `tool.sha256`/`vcs_revision`으로 어느 빌드가 만들었는지 댄다.
- **비율을 여기 박지 마라.** 로컬 ref와 가든 공개분에 따라 움직인다. 재고 싶으면 그때 재서
  projection에 적어라.
- **`unreadable`이 하나라도 있는 스냅샷은 FULL이 아니다. 소비자는 거절해야 한다.**
  collector는 그런 run에 `--out`을 아예 안 쓰고(exit 2), `view.py`는 그런 스냅샷으로 페이지를
  안 만든다. 짝이 맞는지는 **파일의 실제 바이트 sha**로 확인하지, 스냅샷의 말을 믿지 않는다.

## 하지 마라

- 🔴 **`lifetract.db`를 직접 열지 마라.** 깊이 0은 `lifetract`이 소유한다. 파서를 복제하면
  구간 모양·자정 규칙·코멘트 문제를 통째로 물려받는다. 테스트가 막는다.
- 🔴 **코멘트는 어떤 projection에도 올리지 마라.** `atl_interval.comment` 150건에 가족
  이름이 있다. 지속시간과 카테고리는 나가도 되고, 코멘트는 안 된다.
- 🔴 **임계값을 발명하지 마라.** 스킬이 소유한 판단은 스킬에서 고친다. 우회하면 관측소가
  다시 검문소가 된다.
- 🔴 **저자를 이름으로만 거르지 마라.** 클론에는 남의 커밋도 들어 있으니 저자 필터가 *누구의
  삶을 재는가*를 정한다. 이름은 그 해 gitconfig가 쓴 표시 문자열일 뿐이다 — `junghan`
  `Junghan Kim` `Jung Han` `mayor` `정한`이 전부 GLG의 실제 커밋에 서명돼 있다. 이름만 보다가
  **740커밋(2026년 500)**을 조용히 버렸다. `Jung Han`을 더하면 733/495건은 돌아오지만
  `mayor`·`정한` 7건은 여전히 못 잡는다 — 그건 **주소로만** 알아볼 수 있다. 이름 **또는**
  이메일이다 (`collect.is_operator`).
- 🔴 **깊이 0을 만든 빌드를 이름 없이 두지 마라.** `code_sha256`은 collector를 못박지만
  collector는 깊이 0을 만들지 않는다 — 리포 밖 `lifetract` 바이너리가 만들고, 그건 우리
  모르게 다시 빌드된다. manifest는 배포 기록(`~/.claude/skills/.provenance.json`)과 실제
  바이너리 해시를 대조해 revision을 적는다. **기록이 없으면 `null`(모르는 건 모른다고),
  기록이 어긋나면 깊이 0은 `unreadable`** — 거짓 provenance를 단 스냅샷은 아예 없는 것보다
  나쁘다.
- 🔴 **결정성을 "테스트가 초록불이다"로 주장하지 마라.** 가드를 **되돌려서 실제로 깨지는지**
  보고, **진짜 데이터로 돌려서 숫자를 눈으로 대조**하라. 목이 현실을 안 닮으면 되돌리기
  검증도 통과한다. 이 축에서 같은 함정이 반복해서 나왔다.
- **FULL의 포함 규칙을 JD나 문서에 맞춰 고치지 마라.** 맞춤형 문서는 FULL을 고치지 않고
  FULL의 event/ref를 가리키는 **projection**이다.

## 골든 데이 — 축이 무엇을 위해 있는지

2026년 194일 중 **잔여물(깊이 2·3)이 통째로 침묵한 날은 딱 2일**이다.

| | 깊이 0 | 깊이 1 | 깊이 2·3 |
|---|---|---|---|
| **2026-02-07** | 가족 611.6분 · 독서 358.6분 · 수면 484.6분 | — | **0** |
| **2026-07-11** | 수면 504 · 독서 477.2 · 가족 408.3 | 장염 복통 · 인간 환멸 | **0** |

**2/07은 깊이 0 말고 아무것도 없다.** 저널조차 없다. 산출물만 읽으면 그 하루는 **공백**인데,
실제로는 가족 10시간·독서 6시간이다. 깊이 0이 없었다면 그 하루는 축에서 통째로 사라진다.

**축을 고쳤는데 이 두 날이 안 나오면, 고친 게 아니다.**

## 경계

`events.jsonl`은 gitignore다 — 제목과 ref(페이로드)를 지킨다. **명부는 비밀이 아니다**:
리포 이름은 `{baseDir}/scripts/domains.json`에 공개돼 있고, GLG가 그렇게 정했다. 히스토리에
남은 이름을 force-push로 지우려 하지 마라 — README 「Repo names are not the secret」를 읽어라.

더 깊은 계약은 `{baseDir}/README.md`. 소비자(예: junghan0611 공개 도시에)는 자기 리포의
`AGENTS.md`·빌드가 이 스킬의 `scripts/project.py`를 가리키고, projection만 커밋한다.
