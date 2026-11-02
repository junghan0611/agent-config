# Memory, sessions and public verification

Moved from the root README at `f05f103` (2026-10-30) without rewriting; only links and positional words were adjusted for the new location. The front door is [README.md](../README.md).

## Semantic Memory → [andenken](https://github.com/junghan0611/andenken)

Semantic memory has graduated to its own repo: **[andenken](https://github.com/junghan0611/andenken)** — "recollective thinking" (Heidegger).

| Tool | DB | Purpose |
|------|-----|---------|
| `session_search` / sessions skill axis | sessions.lance | pi/Claude Code records plus explicitly admitted closed pi-durable snapshots |
| `knowledge_search` / `search-md` | md.lance | Public digital garden export (`~/repos/gh/notes/content`) — agent-facing knowledge axis |
| `semantic-memory` OpenClaw axis | openclaw.lance | Private bot records, explicitly labeled and never a fallback from another axis |

Sessions and md embed through **OpenRouter Qwen3-Embedding-8B at 4096d**, with LanceDB vector/FTS retrieval. OpenClaw's independently computed compatible vectors are harvested, not re-embedded by this repo; row/vector publication is not a whole-hybrid quality certificate. FTS diagnostics distinguish a healthy zero from failure, not overall search usefulness. The Gemini embedding path is retired — `gemini-embeddings.ts` and `GeminiProvider` survive in andenken only as an unreferenced back-compat shim, and no preset selects them.

Agents call these autonomously. Ask "보편 학문 관련 노트 찾아줘" and the md knowledge surface fires with dictcli query expansion. The older org embedding track is disabled in production; use `denotecli` for exact/raw Denote lookups. Loading strategy per harness lives in the [Harness Support](harness-surfaces.md#harness-support) table.

## Session Management — `/new` + recall

`/new` + recall is the explicit cross-harness recovery path when a new session is the right boundary. It is not an alternative policy that suppresses in-session compaction.

1. When a fresh session is preferable, `/new` to start fresh
2. The index-authority Pi host requests one detached local session refresh at session start / native session search; it never waits, uses a timer, or publishes to Oracle. Run `memory-sync` explicitly only when fresh-now is required.
3. In the new session, recover context with `/recall`

Compaction is an allowed lifecycle on every harness; agent-config and entwurf do not write a suppress/enable policy. The current surfaces are:

| Surface | Compaction key | Measured |
|---|---|---|
| `~/.claude/settings.json` | **no compaction key at all** | oracle, 2026-09-04 |
| `~/.pi/agent/settings.json` (live) | `compaction.enabled: true` | oracle, 2026-09-04 |
| `pi/settings.json` (this repo's reference) | **removed 2026-09-04** — was `enabled: false` | this release |

entwurf retired `autoCompactEnabled` and `env.DISABLE_AUTOCOMPACT` from its managed settings in 0.17.2 (#94). That retirement leaves timing and enablement to the harness that owns them; it does not prescribe a state. `pi/settings.json` likewise carries no compaction key, so a fresh machine receives Pi defaults rather than a stale policy.

As of 2026-10-03, compaction is left to **Pi's built-in text summarization for every provider, including `openai-codex`**. The Codex-native checkpoint extension is retired; no replacement compaction extension or policy key is installed. Text summaries are readable and can travel across models; faster compaction is not guaranteed. `/recall` still serves the distinct job of crossing sessions and harnesses.

**Migration:** removing a package from `pi/packages.json` does not uninstall it on an existing device. Run `pi remove npm:@ogulcancelik/pi-codex-compaction` on each device, then start a **new Pi process and session**. A running process may retain the loaded extension. Do not resume an old native-checkpoint session without it: the visible summary is only a marker, while the actual context requires the removed extension's `details.replacementHistory` handling. Keep old transcripts as evidence and recover through `/recall` instead.

`/recall` is the **multi-axis context hydration** protocol owned by agent-config — not a per-session recap, not a entwurf bridge contract. It starts with `session-recap -p <repo> -m 15` but does not stop at one repo transcript. When the work crossed projects or days, it combines:

- `session-recap` — repo-local transcript extractor, no raw JSONL
- `session_search` — cross-project / cross-session semantic recall
- `knowledge_search` / `search-md` — public garden md concepts, journal exports, botlog/llmlog-derived design history
- `gitcli day --summary` + `denotecli day` — day-axis reconstruction
- journal `§repo` markers — sibling/담당자 call index

The answer must state which axes were seen and which were not. This keeps `/recall` token-light while avoiding false confidence from a plausible single-session summary.

The protocol itself lives in [`commands/recall.md`](../commands/recall.md). The 2026-05-08 derivation history and raw evidence log are kept as a Denote llmlog note (`20260508T090911`, `~/org/llmlog/`) rather than as in-repo docs — `/recall` is a resident-side memory workflow, not a spec this repo carries. Renamed from `/recap` on 2026-05-12 to avoid shadowing Claude Code's built-in `/recap` (one-line session summary, feature-flagged via `tengu_sedge_lantern`); the two now coexist.

## 세션 정본 버전관리 — #32 v1 준비

목표는 `sessions` 폴더를 버전관리하고, 가져온 원문을 해당 Git commit의 SHA 장부와 대조하는 것이다. [#32](https://github.com/junghan0611/agent-config/issues/32)의 현재 범위는 단순한 이력·내용 동일성 확인이다. 별도 서명·키·작성자 인증이나 임베딩과 정본의 완전한 버전 일치를 선행조건으로 두지 않는다.

| 단계 | 최소 룰 |
|---|---|
| 담기 | git-annex에 수집한 원문 버전을 담고, 기존 `MANIFEST.json`·`MANIFEST.sha256`도 같은 commit에 남긴다. **명시 요청한 전체 임베딩의 세션 복사·장부 갱신 완료 지점에서 한 번 커밋**한다. 동시 수집으로 stage와 장부가 어긋나지 않아야 한다. |
| 가져오기 | 필요한 과거 버전을 별도 읽기 위치에 확보한다. 현재 수집 폴더를 과거 commit으로 checkout하지 않는다. 객체 전송은 명시한 가져오기 단계에서만 한다. |
| 대조 | 실제 파일 SHA256을 선택 commit의 `MANIFEST.sha256`에서 해당 경로의 값과 비교하고, 선택 commit의 ID·날짜·메시지를 함께 본다. 경로의 마지막 변경 commit은 별도 참고 정보다. |

GLG는 2026-11-02 **git-annex를 선택**했고, 커밋 절차는 전체 임베딩 스킬의 sessions 복사 과정에 넣기로 했다. 전체 임베딩은 통상 global 증분 요청도 포함하며 무조건 full rebuild를 뜻하지 않는다. 파일마다·자동 local warm마다 커밋하지 않고 같은 실행의 gather를 재사용한다. 변경이 없으면 빈 커밋을 만들지 않는다. 아직 SSOT 스크립트에 자동 실행이 구현된 것은 아니며 실제 코퍼스 전환·기존 복제/장부 호환 후 연결한다.

원문도 함께 회수할 수 있어야 한다. Git에 장부·포인터가 있다는 것만으로 내용 객체가 보관됐다고 판단하지 않는다. 미취득 객체·장부 없음·해시 불일치를 구분하고, 다른 최신 파일로 조용히 대체하지 않는다. 원문과 장부/파일명 등 metadata는 기본적으로 비공개다. 이 공개 설정 리포에 세션 원문을 넣는 계획이 아니다.

2026-11-02, git-annex10.20260421의 기본 locked 방식으로 가짜 JSONL 하나(205→271bytes)와 로컬 제작/읽기 저장소를 시험했다. 세 번째 run에서21/21확인 항목을 통과했고 앞선 실패2건도 보존했다. 이 집은 스크립트/로그·결과표를 읽고 artifact SHA12개와 두 commit의 원문 객체·장부를 독립 대조했다. 이 작은 구성의 관측이며 실제 코퍼스 운영·독립 host 복구·규모/성능 인증이 아니다.

| 관측 | 결과 |
|---|---|
| 내용 없는 clone → 명시 local get | 미취득과 불일치를 구분했고, 가져온 뒤 선택 commit의 장부와 일치 |
| 별도 읽기 repo에서 과거 commit 회수 | 옛 원문도 회수·SHA 대조 성공, 제작 repo의 main/현재v2 내용은 유지 |
| 다른 revision 장부 또는 1byte 바뀐 반출 사본 대조 | 불일치 검출; 원래 annex 객체는 변경하지 않음 |
| 별도 annex init | 제작/읽기 repo의 annex UUID가 서로 다름 |

관측 근거는 로컬 private `fixture-annex/RESULT.md`(SHA256 `505bfa2289e1ba02cadd3deb36bdb42ca0d7415439bf7b6acd7f0d2081405329`)와 scripts/receipts/log다. 정확한 위치는 이슈 브랜치 NEXT에 남긴다. 재현용 입력은 전부 합성 자료다.

초기 운영안에서는 내용 객체의 자동 정리를 담기/읽기 절차에 넣지 않는다. 이 시험에서 옛 commit이 참조하는 객체도 `annex unused` 목록에 나왔다. Git 이력이 남았다는 이유로 `dropunused`가 안전하다고 판단하면 안 된다. 명시 get은 제작 repo의 내부 `refs/annex/last-index`를 바꾸기도 했으므로 완전 무부수효과 읽기라고 부르지 않는다. 실제 코퍼스의 Git/annex 초기화·remote·생산 reader는 아직 변경하지 않았다.

이행 전 최소 접점:

- Andenken의 기존 corpus 루트 `rsync` 복제가 `.git`까지 raw 복제하지 않도록 한다. `.git`을 빼는 것과 내용 객체를 실제로 전달하는 것은 별개다.
- 장부의 walk는 `.git`을 제외하고 미취득 symlink/포인터를 실제 누락·불일치와 구별해야 한다. 이번 기본 구성의 annex key에는 `.jsonl`이 붙지 않아 객체가 장부에 섞인다는 초기 가설은 재현되지 않았다. `.git` 제외는 불필요한 내부 순회·설정 의존성을 피하기 위한 접점으로 남긴다.
- 원문 버전 회수 위치가 정상 gather/index discovery에 섞이지 않고 기존 reader의 허용 경로·closed snapshot 경계를 지켜야 한다.

agent-config는 보관 방식·버전 회수·장부/commit 룰을, Andenken #18은 자기 리포의 수집·복제·장부·reader 최소 호환 변경을 맡는다. Nix는 도구 공급/저장 배치를 맡는다. 실제 변경 범위와 원문 보존·복구는 운영 이행 전에 다시 확인한다.

## Public Verification — Sessions as Evidence

This repo also owns the **resident-side policy** for publishing session artifacts when GLG wants public verification of harness behavior.

- `entwurf` owns bridge mechanism and invariants.
- `agent-config` owns export/review/upload workflow and publication criteria.
- Goal: long-term trust through evidence — raw-session publication, reject history, and later failure/drift analysis.
- Minimum publication gates: secret redaction, deny patterns, secret scanning (e.g. TruffleHog), semantic privacy review, small-batch dry-run.
- `pi-share-hf` is a strong reference shape for this pipeline.
