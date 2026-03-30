---
name: dictcli
description: "개인 어휘 그래프 — 한↔영 크로스링귀얼 쿼리 확장 + 한국어 형태소 분석. expand로 한글 단어에서 영어 태그 후보를 찾고, stem으로 한국어 어간을 추출한다. knowledge_search의 3층 역할. '단어 확장', '태그 찾기', '한영 매핑', 'expand', 'stem', '형태소'."
---

# dictcli — 개인 어휘 그래프 (3층)

한↔영 트리플 그래프. 한글 단어를 영어 Denote 태그로 확장한다.
knowledge_search의 크로스링귀얼 정확도를 높이는 3층 역할.

## When to Use

- knowledge_search 결과가 부족할 때 — expand로 쿼리 확장 후 재검색
- 한글 개념에 대응하는 영어 태그를 모를 때
- Denote 노트에 영어 태그를 붙일 때 후보 확인
- "보편"이 영어로 뭔지, 관련 개념이 뭔지 궁금할 때

## 사용법

### expand — 쿼리 확장 (핵심)

Binary is bundled in the skill directory. Invoke via `{baseDir}/dictcli`.
graph.edn is co-located — **must cd to {baseDir} before calling** (GraalVM native binary reads CWD/graph.edn).

```bash
cd {baseDir} && ./dictcli expand "보편" --json
# → ["universal","universalism","particular","special","generalpurpose","general","paideia"]

{baseDir}/dictcli expand "기술" --json
# → ["art","technology","technique"]

{baseDir}/dictcli expand "도피" --json
# → ["escape","flight","avoidance","evasion"]
```

한글 단어에서:
1. 직접 번역 (:trans)
2. 대극의 번역 (보편→특수→particular)
3. 관련어의 번역 (보편→파이데이아→paideia)

### knowledge_search 연동 패턴

```bash
# 1. 사용자: "보편 학문 관련 노트"
# 2. expand로 영어 키워드 확보
EXPANDED=$({baseDir}/dictcli expand "보편" --json)
# → ["universal","universalism","particular","paideia"...]

# 3. knowledge_search에 확장 키워드 포함
# "보편 학문 universal universalism paideia"로 검색
```

에이전트가 자율적으로:
1. 한글 쿼리에서 핵심 개념어 추출
2. expand로 영어 확장
3. 원래 쿼리 + 확장 키워드로 knowledge_search

### lookup — 단어 조회

```bash
{baseDir}/dictcli lookup "보편"
# 해당 단어의 모든 트리플 (trans, opposite, related, source 등)
```

### stats — 그래프 통계

```bash
{baseDir}/dictcli stats
# 트리플 수, 단어 수, 클러스터 수, 관계별 분포
```

### stem — 한국어 어간 추출 (Kiwi 형태소 분석)

Kiwi(C++ 엔진, JNI 바인딩)로 한국어 문장에서 명사 어간을 추출한다.
graph.edn의 2,255개 트리플이 Kiwi 사용자 사전에 자동 주입된다.
expand와 파이프라인 — stem이 어간을 뽑고, expand가 한↔영 확장.

**⚠️ JVM 모드 전용** — GraalVM native-image 불가(JNI). dictcli 리포의 `run.sh stem` 으로 실행.
에이전트가 직접 호출할 일은 거의 없다 — andenken이 인덱싱 시 배치 호출한다.

```bash
# 단건
cd ~/repos/gh/dictcli && ./run.sh stem "설계했다"
# → 🌱 stem: 설계

cd ~/repos/gh/dictcli && ./run.sh stem "하네스 엔지니어링의 본질"
# → 🌱 stem: 하네스, 엔지니어링, 본질
# → 🔍 하네스 → harness
# → 🔍 본질 → essence

# 배치 (andenken 인덱싱 파이프라인용)
echo -e "설계했다\n검토하셨습니다" | cd ~/repos/gh/dictcli && ./run.sh stem --batch
# → ["설계"]
# → ["검토"]
```

stem + expand 파이프라인:
```
"설계했다" → stem → "설계" → expand → [design, architecture]
"봇멘트를 달았다" → stem → "봇멘트" → expand → [botment]
"에이전틱 엔지니어링" → stem → "에이전틱", "엔지니어링" → expand → [agentic]
```

graph.edn에 등록된 단어(봇멘트, 에이전틱, 하네스 등)는 Kiwi 사전에 주입되어 OOV 없이 정확히 추출된다.

## 데이터

- `graph.edn` — 2,400+ 트리플, 2,255 사전 주입 단어
- 소스: 메타노트 클러스터, 신토피콘 102 Great Ideas, philosophy glossary 2,035개
- 관계: :trans(835), :source(233), :synonym(44), :related(26), :opposite(8)

## 3층 모델에서의 위치

| 층 | 도구 | 역할 |
|----|------|------|
| 1층 | knowledge_search | 임베딩 벡터 검색 (Hit 100%, MRR 0.872) |
| 2층 | denotecli + dblock | 정확 매칭 + 그래프 링크 |
| **3층** | **dictcli expand + stem** | **한→영 쿼리 확장 + 한국어 어간 추출** |

1층만으로 "보편" MRR 0.13. expand 적용 시 "보편 universal universalism paideia"로 MRR 상승 예상.

## 주의

- expand 결과가 빈 배열이면 — 아직 graph.edn에 없는 단어. 그냥 원래 쿼리로 검색.
- 바이너리: GraalVM native-image. 0.009초. 체감 지연 없음.
- graph.edn은 dictcli 리포에서 관리. 여기는 복사본.
