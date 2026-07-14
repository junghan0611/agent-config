---
name: agent-config
description: "agent-config 담당자의 운영 면(operating surface) — 스킬·정체성·정렬을 여러 하네스(pi / entwurf Claude / Claude Code / Codex / Gemini / Antigravity)로 펼치는 repo에서 실제로 손을 쓸 때. AGENTS.md가 '정신'을 담고 run.sh가 '로컬 명령'을 담는다면, 이 스킬은 그 둘이 못 가진 삽질 지식을 담는다: 스킬을 추가/수정해서 모든 하네스에 제대로 뜨게 하는 법, 새 기기 setup, '내 스킬이 안 보여요' 진단, .bak 함정, 바이너리-from-sibling-repo 패턴, 스킬 테스트 공백, git-hooks 안전벽. 트리거: 'agent-config', '스킬 추가', '스킬 안 떠', '스킬 링크', 'run.sh setup', '새 기기 셋업', '하네스 펼침', 'setup:links', '담당자 스킬', 'repo-local skill', 'consumer skill 이주'."
user_invocable: true
---

# agent-config — 담당자의 운영 면

Repo: `~/repos/gh/agent-config`. 이 집이 무엇인지(정신)는 `AGENTS.md`가, 한 줄 명령은
`run.sh`가 가진다. 이 스킬은 **그 둘이 못 가진 것** — 스킬을 만지고 펼칠 때마다 다시
당하는 삽질 — 을 담는다. AGENTS.md는 일부러 spec이 되길 거부하므로(정신은 한글로, API는
영어로) 운영 노하우가 들어갈 자리가 없다. 그 빈자리가 여기다.

> ⚠️ 먼저 자리를 붙들어라: 이 repo는 두 번째 하네스가 아니다. 하네스는 pi다.
> agent-config는 그 위에서 도구·기록·정체성·정렬을 관리하는 자리. 스킬 목록을 늘리는 게
> 발전이 아니다. (AGENTS.md `담당자의 자리` 참조 — 만지기 전에 그 섹션부터.)

## 멘탈 모델 — 한 SSOT가 N개 하네스로 펼쳐진다

```
skills/<name>/SKILL.md (+바이너리)   ← SSOT (이 repo)
        │  ./run.sh setup → setup_links
        ▼
   ┌─ ~/.pi/agent/skills/pi-skills/<name>          (pi, 개별 링크)
   ├─ ~/.pi/agent/claude-plugin/skills/<name>      (entwurf Claude, 개별 — SDK 격리)
   ├─ ~/.claude/skills            → skills/         (Claude Code, 디렉토리 통링크)
   ├─ ~/.codex/skills/<name>                        (Codex, 개별 — .system/ 빌트인 때문)
   ├─ ~/.gemini/skills            → skills/         (Gemini legacy, 디렉토리 통링크)
   └─ ~/.gemini/antigravity-cli/skills → skills/    (Antigravity, 디렉토리 통링크)
```

핵심 비대칭(이게 삽질의 근원): **어떤 하네스는 디렉토리 통째 링크, 어떤 하네스는 스킬마다
개별 링크**다. 개별 링크 하네스(pi / claude-plugin / codex)는 `setup:links`를 다시 돌려야
새 스킬이 잡힌다. 통링크 하네스(claude/gemini/antigravity)는 `skills/`에 디렉토리만
생기면 자동으로 보인다.

OpenCode 는 쓰지 않는다 — `run.sh` 에 분기가 없고 `~/.config/opencode/skills` 도 만든 적이
없다. 문서에만 있던 하네스라 2026-07-14 에 걷어냈다.

`./run.sh setup` 전체 순서: `refresh_self → preflight → repos(clone/pull) → build →
links → npm → git-hooks`. 스킬만 다시 펼치려면 빌드 없이 **`./run.sh setup:links`** 한 방.

## 스킬을 추가/수정한다 — 두 종류

스킬은 두 패턴이 공존한다. 어느 쪽인지부터 판별해야 한다.

### A. script 스킬 (SSOT가 여기) — botlog, agenda, entwurf-peek …
```bash
mkdir -p skills/<name>/scripts
$EDITOR skills/<name>/SKILL.md          # frontmatter: name + description(트리거 풍부히)
# 스크립트는 skills/<name>/scripts/ 에. {baseDir} placeholder 그대로 둘 것
./run.sh setup:links                    # 개별-링크 하네스에 펼침
./run.sh env                            # 링크 검증 (아래 진단 참조)
```

### B. 바이너리 스킬 (코드 SSOT가 sibling repo) — denotecli, bibcli, gitcli, lifetract, gogcli, dictcli
**경계는 하나다: 형제 repo는 코드를, agent-config는 스킬면(SKILL.md + 배포 바이너리)을 소유한다.**
형제 repo는 자기 SKILL.md를 갖지 않고, `skills/<name>/`에 아무것도 쓰지 않는다. 바이너리는
`.gitignore`에 박혀 있다 — 산출물이지 SSOT가 아니다. 소스는 형제 repo에서 고친다:
```bash
# 예: gitcli — 소스는 ~/repos/gh/gitcli, SKILL.md는 여기
$EDITOR ~/repos/gh/gitcli/...           # 로직은 거기서 고치고 거기서 테스트
git -C ~/repos/gh/gitcli commit ...     # 커밋해야 게이트를 통과한다 (아래)
./run.sh setup:build                    # go_build → skills/gitcli/gitcli (gitignored)
```
- denotecli/gitcli/lifetract/bibcli = `go_build`. gog = 글로벌 upstream(nixos-config).
  dictcli = GraalVM native-image + Kiwi(`dictcli/run.sh build`) — **게이트 밖이다**.
- 바이너리는 **머신별 네이티브 빌드**(oracle=aarch64, 나머지=x86_64). 기기 옮기면 재빌드 필수.

> 2026-07-14: lifetract가 자기 `run.sh deploy`로 `skills/lifetract/`에 바이너리와 SKILL.md를
> 직접 쓰고 있었다. 나쁜 의도가 아니라 옳은 직관이었다 — "바이너리와 문서는 한 세트다". 그런데
> 소유가 둘이 되니 GLG가 헷갈렸고, `~/.claude/skills`가 `skills/`로 걸린 심링크라는 걸 모르면
> 그쪽 "세 자리 SHA256 검사"가 실은 한 자리를 두 번 세는 것도 안 보였다. 그 세트 보장은
> **없애지 않고 `go_build`로 올렸다**(아래). 형제 repo에서 두 번 하지 않는다.

### 게이트 — `go_build`가 install을 막는다

setup은 바이너리 하나를 **7개 하네스에 동시에** 펼친다. 그래서 보증은 여기 산다:

1. **스위트.** `go test ./...` 실패 → 설치 안 함, 직전 바이너리 유지, 나머지 CLI는 계속 빌드,
   끝에서 non-zero. (테스트 없는 빌드가 gitcli day-summary 버그를 전 하네스로 내보냈다.)
2. **provenance.** 소스가 미커밋이면 거부한다. 배포된 숫자엔 가리킬 커밋이 있어야 한다.

**provenance는 저장소 전체가 아니라 소스 디렉토리로 잰다** (`git rev-parse HEAD:<src>`).
Go의 `vcs.modified`는 repo-wide인데 bibcli는 `zotero-config` 안에 살고 그 repo는 서지를
export할 때마다 dirty다. 그걸로 막으면 코드와 무관한 이유로 bibcli를 거부하게 되고 —
**우회를 배우게 만드는 게이트는 없는 게이트보다 나쁘다.**

`skills/.provenance.json`(gitignored)에 툴별 repo/revision/src_tree/sha256을 적는다.
timeline 축(`~/repos/gh/junghan0611`)은 이 스킬들을 링크만 하는 게 아니라 **shell out해서 그
숫자를 `events.jsonl`에 역사로 쓴다** — 어느 바이너리가 그 행을 만들었는지 이제 읽을 수 있다.
`./run.sh env`가 각 바이너리의 revision을 찍고, 기록된 빌드와 다르면 경고한다.

## repo-local 담당자 스킬 패턴 (← 이 파일이 바로 그 샘플)

두 가지 "스킬의 집"을 헷갈리지 마라:

| 위치 | 정체 | 누가 발견 |
|---|---|---|
| `agent-config/skills/<name>/` | **펼쳐지는 글로벌 스킬** (SSOT) | setup이 모든 하네스로 fan-out |
| `agent-config/.claude/skills/<repo>/` | **그 repo 담당자의 운영 스킬** (project-local) | Claude Code가 그 repo를 열었을 때만 |

이 파일은 후자다 — `voscli/.claude/skills/voscli/`, `memex-kb/.claude/skills/scanbook/`과
같은 종(種). **펼쳐지지 않는다.** AGENTS.md(항상 로드되는 정신)와 짝을 이루는, 그 repo에서
일할 때만 on-demand로 뜨는 손. 작업 자체가 삽질이라 AGENTS.md에 넣기 뭐한 노하우 —
scanbook이 MinerU 원격 서버 삽질을 담듯, 이 스킬은 fan-out 삽질을 담는다.

> 새 repo에서 "에이전트 문서는 있는데 운영 노하우가 자꾸 휘발된다" 싶으면, 그 repo에
> `.claude/skills/<repo>/SKILL.md`를 만들 때가 된 신호다. SSOT는 코드가 사는 그 repo,
> 펼침은 (필요하면) 거기 run.sh가.

## 새 기기 setup (재현 가능성)

```bash
cd ~/repos/gh/agent-config && ./run.sh setup
```
- **server vs dev 기기 자동 분기**: `~/.current-forge-profile`가 `oracle`/`work`면 server
  → consumer pi install 경로 + `pi/settings.server.json`. 클라이언트(thinkpad/laptop/nuc)는
  파일 없음 → dev 경로(entwurf를 `~/repos/gh/`로 clone). 사설 기기명은
  `~/.config/agent-config/server-devices.txt`.
- 끝나면 `./run.sh env`로 7개 하네스 링크 + 바이너리 arch 한눈에 검증.

## 진단 — "내 스킬이 안 보여요"

```bash
./run.sh env        # 모든 하네스 링크 상태 + 바이너리 arch/크기 한 판
```
체크 순서:
1. **`skills/<name>/SKILL.md` 있나** — 없으면 fan-out 스캔(`[ -f SKILL.md ]`)에서 탈락.
2. **개별-링크 하네스면 `setup:links` 다시 돌렸나** — pi/claude-plugin/codex는 새 스킬에
   재링크 필요. 통링크 하네스는 자동.
3. **frontmatter description 트리거가 빈약하지 않나** — 스킬 발견은 description 매칭. scanbook
   처럼 한/영 트리거를 넉넉히.
4. **`.bak.*` 디렉토리가 스캔을 오염시키지 않나** (아래 함정).

## 🐛 삽질 (다시 당하지 말 것)

- **`.bak.DATE` 함정.** `ensure_link`는 링크 자리에 일반 파일/디렉토리가 있으면
  `<link>.bak.YYYYMMDD`로 백업한다. 개별-링크 하네스(pi-skills, claude-plugin, codex)는
  **백업 디렉토리도 스킬로 스캔**해서 같은 스킬이 둘로 뜨거나 SDK가 충돌한다. setup이 끝에
  `.bak.*`를 청소하지만, 수동으로 만졌으면 직접 `rm -rf` 할 것.
- **`~/.claude/skills`는 디렉토리 통링크 → `skills/`.** 그래서 `.claude/skills/`(이 repo의
  project-local 스킬 폴더)와 **완전히 다른 경로**다. 이걸 헷갈려 글로벌에 둘 걸 project에
  두거나 반대로 하지 마라.
- **server 기기에서 dev 설정 펼치면 깨진다.** server는 `settings.server.json`(consumer
  install 경로)을 쓴다. forge profile 감지가 틀어지면 잘못된 settings가 링크된다 →
  `cat ~/.current-forge-profile`로 확인.
- **레거시 잔재 청소 로직이 setup에 박혀 있다.** `delegate.ts` / `delegate-targets.json` /
  pi `semantic-memory` extension 등은 entwurf/andenken로 이관됨 → setup이 옛 기기에서
  자동 제거. 손으로 되살리지 마라(곧 다시 지워진다).
- **PI_SKIP_SKILLS는 일부러 비어 있다.** semantic-memory를 pi 네이티브 registerTool과
  SKILL.md 스킬 **양쪽으로** 노출하는 건 정책상 중립(SSOT 하나, 호출 표면 둘). 충돌 아님.
- **바이너리는 gitignored.** `skills/*/denotecli` 등을 커밋하려 들지 마라. SSOT는 형제 repo.

## ⚠️ 스킬 테스트 공백 (정직하게)

**바이너리 스킬은 이제 게이트가 있다** (2026-07-14, 위 「게이트」). 형제 repo의 스위트가
깨지거나 소스가 미커밋이면 배포되지 않는다. 다섯 중 **dictcli만 밖에 있다** — GraalVM
native-image라 `go_build`를 안 탄다.

**아직 공백인 것은 script 스킬이다.** `./run.sh test`는 andenken로 위임될 뿐
(`$SM_DIR/run.sh`), `skills/<name>/scripts/`를 검증하지 않는다. 유일한 deterministic gate는
`skills/entwurf-peek/scripts/test-discovery.py`(수동 실행, 15-check).

**두 방향을 헷갈리지 마라 — 이게 오래 헷갈렸다:**

| 스킬 종류 | 코드가 사는 곳 | 스킬면이 사는 곳 |
|---|---|---|
| **바이너리 스킬** (gitcli, lifetract, …) | 형제 repo | **agent-config** (SKILL.md + 배포 바이너리) |
| **consumer 스킬** (entwurf-peek 등) | owning repo | owning repo (agent-config는 `setup:links`로 링크만) |

바이너리 스킬은 **agent-config로 모은다**(2026-07-14 GLG 결정 — 소유가 둘이면 헷갈린다).
consumer 스킬은 **owning repo로 보낸다**(그 repo CI가 parity gate로 테스트). 방향이 반대인
게 모순이 아니다: 전자는 *배포*가 어려운 것(7개 하네스 fan-out)이고, 후자는 *검증*이 어려운
것(owning repo 내부를 wrap)이다. 각자 어려운 쪽이 사는 집으로 간다.

## 🔒 git-hooks 안전벽 (커밋 삽질)

글로벌 `core.hooksPath`(SSOT: `git-hooks/`)가 staged/pushed diff에서 **정체성 용어 +
시크릿**을 막는다. 막히면:
1. hook 출력의 파일/라인/패턴을 읽는다.
2. diff를 고친다 — 용어/시크릿 제거, 디테일은 gitignored 파일(`PRIVATE.md`)로, 또는
   generic placeholder.
3. re-stage 후 재시도. **절대** `AGENT_ALLOW_UNSAFE_COMMIT=1` / `--no-verify` /
   `core.hooksPath` 변경 금지 — false positive 같으면 멈추고 GLG에게 hook 출력 그대로 보고.

## 릴리즈 / 커밋 루프

- 커밋: `commit` 스킬(Conventional + post-commit agenda stamp). 에이전트 커밋, **GLG push**.
  "Generated with Claude" / "Co-Authored-By" 금지(commit 스킬이 강제).
- 태그: `tag-release` 스킬(CalVer `YYYY.MM.DD` — CHANGELOG refresh → tag/push/stamp).
- CHANGELOG = 닫힌 일의 이력, ROADMAP.md = 앞으로 붙들 중기 축. 둘은 다른 거울.

## 영속 사실이 사는 곳 (썩는 문서 말고)

- 이 스킬 = agent-config를 **운영하는 법**(휘발 노하우의 닻).
- `AGENTS.md` = 담당자의 **정신/자세**(항상 로드, spec 거부).
- `NEXT.md` = 지금의 다음 한 걸음(휘발).
- `ROADMAP.md` = 중기 축. `CHANGELOG.md` / commit history = 무엇이 언제.
- `run.sh` = 로컬 명령의 SSOT. 이 스킬과 불일치하면 **즉시 정정**(둘 다 같은 진실을 봐야).
