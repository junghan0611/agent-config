---
name: logickocli
description: "한국어 자연어 추론을 표준 논리 좌표계로 정규화하는 모드 컨버터. '이고 없애기' / 'conjunction elimination' / '∧E' 어느 표현으로 들어와도 같은 ID로 묶고, 한자말 + 기호로 응답. 자연어 논증을 [주장/전제/결론/형식화/사용 규칙/숨은 가정/평가] frame으로 구조화. Use when 사용자가 한국어로 논증을 펼치거나, 타당성/오류/추론 규칙/양상 논리 검토를 요청하거나, 한말 어휘(이고 없애기, 차근차근 이끌기 등)를 쓸 때."
---

# logickocli — 한국어 구조화 추론 프렐류드 (진입점)

이 SKILL.md 는 진입점이다. 본문 — 발동 신호 / 정규화 정책 / 응답 frame / 어휘 데이터 명세 — 은 logickocli 리포의 `references/skill-contract.md` 에 있다.

## SSOT 위치

```
~/repos/gh/logickocli/
```

| 파일 | 역할 |
|---|---|
| `references/skill-contract.md` | **모드 계약 본문** — 발동 신호, 정규화 정책, 응답 frame 5개 모드, 한계 |
| `vocab/core.yaml` | 표준 논리 어휘 (PROP/PRED/META/SEM/LEX/RULE 도메인, 123개) |
| `vocab/fallacies.yaml` | 형식·비형식 오류 카탈로그 (24개) |
| `vocab/SCHEMA.md` | 필드 명세 + alias 충돌 정책 + 입력 인식 우선순위 |
| `references/inference-rules.md` | 자연연역 + 술어 + 치환규칙 카드 |
| `references/modal-systems.md` | K/T/S4/S5/GL cheat sheet |
| `references/argument-frame.md` | default / proof / debate / modal / probability 모드 frame |
| `scripts/check_vocab.py` | vocab 자가 검증 |

## 발동 신호 (요약)

다음 중 하나라도 등장하면 `references/skill-contract.md` 의 frame 으로 응답한다.

- 자연어 **논증**: "X이면 Y이고, X니까 Y다", "왜냐하면", "그러므로", "이므로".
- **논리 어휘**: 전제·결론·타당·건전·모순·일관·필연·가능·증명·반례·오류·논증·추론.
- **한말 어휘**: "이고 없애기", "차근차근 이끌기", "마땅하다", "튼튼하다" 등. 매핑은 인식하되 응답은 표준어.
- **양상** 주장: 반드시, 어쩌면, 가능, 필연, 증명할 수 있다, 반증할 수 없다.
- **오류** 검토 / **형식 검증** 요청.

## 응답 규칙 (요약)

- 표준 한자말 + 기호로 응답. 영어 필요 시 병기.
- 한말 어휘는 입력 인식만, 응답에는 등장하지 않음.
- 형식 타당성과 사실 참(건전성)을 항상 분리해서 평가.
- Lean / Coq 은 검증 커널 — 실제 호출 없이 "검증됨"이라고 말하지 않음.

## 분석 frame (기본)

```
[주장]   결론 명제
[전제]   P1, P2, ...
[결론]   C
[형식화] 변수 할당 + 기호 표기 (A → B, A ⊢ B 등)
[사용 규칙] vocab ID (예: PROP.MODUS_PONENS / 전건긍정 / modus ponens / MP)
[숨은 가정]
[평가]   형식적 타당성 + 건전성 + 비형식 오류 후보
```

다섯 변형 모드(proof / debate / modal / probability) 와 세부 출력 명세는 `~/repos/gh/logickocli/references/argument-frame.md`.

## 사용 흐름

1. 입력 발화에서 논증/주장 식별
2. `vocab/core.yaml` + `vocab/fallacies.yaml` 을 통해 canonical ID 로 정규화
3. `references/skill-contract.md` 와 `references/argument-frame.md` 의 frame 적용
4. 형식 타당성·비형식 오류 후보 검토
5. 양상·확률·게임이론·증명 모드 필요 시 변형 frame
6. 검증 커널 필요 시 번역 후보만 제시 (검증 안 했다고 명시)

## 데이터 일관성

vocab 자가 검증은 리포 안에서 직접 돌린다:

```bash
cd ~/repos/gh/logickocli && python3 scripts/check_vocab.py
# entries: core=123, fallacies=24, total unique IDs=147
# intended alias collisions: 5 (모두 화이트리스트)
# unexpected: 0  → exit 0
```

vocab/SCHEMA.md 의 입력 인식 우선순위 / alias 충돌 분류 정책을 따른다.

## 응답 톤 — 다른 한국어 논리 어휘 작업 평가하지 않기

한말 어휘를 응답에 안 쓰는 건 어휘 가치 평가가 아니라 LLM 호환성 선택이다. 김명석 『두뇌보완계획100』 계열 한국어 토착화 작업, 학계 표준 한자말, Coq/Lean 한국어 자료 등은 각자의 결로 가치 있는 작업이며, 이 도구는 *범용 LLM 에이전트와 한국어 사용자 사이 좌표계 정렬* 이라는 좁은 목표에 정렬했을 뿐이다.

상세 톤 가이드는 logickocli 리포의 `AGENTS.md` 와 `vocab/SCHEMA.md` § native_aliases / note 절 참조.
