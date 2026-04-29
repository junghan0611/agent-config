---
description: 랜덤 문서 정비 한 판 — 허접 후보를 뽑아 front matter/title/tags/links를 보완하는 훈련 (notes/org/markdown 모두)
argument-hint: "[옵션] 대상 경로/ID/검색쿼리 (없으면 랜덤)"
---
You are entering **Docplay / Document Polish Play** mode.

User-supplied seed (optional): $ARGUMENTS

## Goal
- 랜덤하게 '허접한 문서(=retrieval이 약한 문서)'를 하나 골라
- 사용자의 한마디(코멘트/링크/방향)를 받은 뒤
- **구조를 강화**한다: title → filetags/tags → 관련링크/메타 → placeholder 제거 → 필요하면 rename.

이 작업은 org 담당자만의 일이 아니라, 어떤 작업 담당자(Repo steward)도 수행할 수 있는 **메타 훈련**이다.

## Candidate selection (seed 없을 때)
Pick 1 document that matches at least one:
- tags/filetags가 비어있거나 너무 빈약함 (예: `:llmlog:` 단독)
- title이 임시 표기(해시태그/LLM prefix 등)로 남아있음
- `- ...`, `TODO`, `TBD` 같은 placeholder가 남아있음
- 관련/참조 섹션이 비어있음
- 파일명/slug와 title이 불일치(특히 Denote/Front-matter 기반 문서)

Prefer **최근 수정된 문서** 또는 **사용자가 만진 문서 근처**에서 고른다.

## Workflow
1. **Show the candidate**
   - 파일 경로를 명시
   - front matter의 핵심만 발췌 (title/tags/description/date)
   - placeholder/약점 3개 이하로 요약
2. **Ask for a one-liner**
   - "이 문서의 정체성/용도는?"
   - "연결해야 할 노트/문서 1~3개?"
3. **Apply structural fixes (small batch, surgical)**
   - tags/filetags: 영어/소문자/알파뉴메릭, 개념 단위, dedup/sort
   - title: 검색/회상 단위로 정제 (이름은 title에, 태그는 개념에)
   - description: '무엇을 담는가/왜 있는가' 한 문장으로 정리
   - links: 관련메타/관련노트/참조 연결 1~3개
   - placeholder 제거 (`- ...` 등)
4. **Rename when appropriate**
   - Denote/org: front matter 기반 rename을 사용 (raw mv 금지)
   - 기타 문서: 프로젝트 규칙이 있으면 그 규칙을 따름
5. **Report back**
   - 변경 전/후 경로 (rename 시)
   - 최종 title + tags/filetags
   - 다음에 이어갈 1-step만 제안 (과잉 제안 금지)

## Org/Denote specialization
If the file is a Denote org note:
- 반드시 `~/org/PROTOCOL.md`의 태그 규칙을 준수한다.
- 가능하면 Emacs API `agent-denote-set-front-matter ... :rename t` 로 처리한다.
- filetags에서 `llmlog`는 **기본 제외** (사용자가 '이건 llmlog로 둘 것'이라 말한 경우만 예외).

## Non-goals
- 대규모 리라이트/요약본 생성
- 한 번에 여러 파일 고치기 (사용자가 명시적으로 원할 때만)
- 새 태그 남발 (기존 meta 자석 우선)
