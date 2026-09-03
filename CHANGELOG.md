# Changelog

> Versioning note: as of `v2026.6.1` this repo tracks **OpenClaw-style CalVer**
> date tags (`vYYYY.M.D`). The older `## 0.x` sections below are kept verbatim as
> history — they tracked the pinned `pi-shell-acp` consumer version, not this
> repo's own releases — and are not rewritten.

## Unreleased

## v2026.9.4 — 대문이 읽는 법을 먼저 말하고, 태그가 릴리즈까지 간다

### Added

* **README 상단에 「How to Read This」.** 대문은 매뉴얼이 아니라 현관이다 — 프레임워크를 설치하려는 사람이 아니라 **한 운영자가 실제로 무엇을 돌리는지** 보러 온 사람을 위해 쓴다. 네 가지를 먼저 세운다: ① 이 repo는 엔진이 아니다(엔진은 entwurf) ② 조용할수록 건강하다, 스킬 수는 기능 목록이 아니다 ③ 온 이유별 3갈래 읽기 표 ④ **여기 문장은 영수증을 달고 다닌다** — 이 문서 자신에게도 적용된다. `AGENTS.md`의 「이 섹션을 읽는 올바른 방식」이 담당자용이라면, 이것은 방문자용 같은 자리다.

* **담당자 문서를 공개 면으로 연결했다.** README는 [§agent-config: 스킬 SSOT와 시험소 — 멀티하네스 이후](https://notes.junghanacs.com/botlog/20260312T174622)로, `AGENTS.md`는 denote id `20260312T174622`로. 대문은 **지금 무엇이 참인지**를, 그 노트는 **어떻게 여기까지 왔는지**를 말한다. 에이전트에게는 `--outline` 우선 읽기까지 붙였다 — 통째로 읽고 다시 쓰는 것이 그 문서를 망치는 방식이라서.

* **prime-agent가 벤치의 세 번째 주체로 들어왔다.** 앞의 둘과 성격이 다르다 — 남의 런타임을 재는 것이 아니라 **직접 기르는 팔**이다. 상류 Prime Agent의 RLM이 persistent Python REPL에 사는데, 이 포크는 그 언어를 갈아끼운다: GraalVM native image 위 Clojure/SCI workspace, H8(`edc3a3e8`)부터 **기본 커널이 clojure이고 fallback이 없다**(바이너리가 없으면 teaching error). 이유는 언어 취향이 아니라 legibility다 — "자연어는 탐색, Lisp는 공개 상태·계약·form". 성공 조건도 벤치 점수가 아니라 **GLG가 workspace form을 읽고 다음 설계를 판단할 수 있는가**다. 세 규칙(Python oracle 안 지움 / 커버리지는 말할 자격 / FAIL은 판정이 아니라 분류할 관측)과 entwurf#88의 coordination↔computation 경계를 함께 실었다.

### Changed

* **`compaction` 키를 파이 레퍼런스에서 뺐다 — 그리고 그게 정리가 아닌 이유를 남겼다.** README의 절 제목이 `Session Management — No Compact`였고, 하네스가 compaction에 못 박혀 있는 것처럼 읽혔다. 아니다: `~/.claude/settings.json`에는 compaction 키가 **아예 없고**, 라이브 `~/.pi/agent/settings.json`은 `enabled: true`다(둘 다 oracle 실측 2026-09-04). entwurf가 0.17.2 #94에서 `autoCompactEnabled`/`env.DISABLE_AUTOCOMPACT`를 `RETIRED_SETTINGS_SCALARS`로 넘기며 스위치를 돌려줬고 — 소유권 이전이지 상태 변경이 아니다 — 운영자는 어느 쪽으로도 선언하지 않기로 했다. `merge_settings`가 EXISTING-WINS라 이 repo의 `false`는 **돌아가는 기계에 닿은 적이 없다**. 새 기계에만 운영자가 버린 의도를 심고 있었을 뿐이고, 그게 이 repo가 다른 데서 drift bomb이라 부르는 모양이다. 이유는 키가 있던 자리에 `_no_compaction`으로 남겼다 — 기억으로 되살리지 못하도록. **설정이 강제해야만 도는 습관은 애초에 습관이 아니었다.**

* **OMP는 후보가 아니라 형제다.** entwurf `0.16.0`(2026-08-31)이 OMP를 **다섯 번째 garden backend**로 admit했고 이 호스트에 실제로 서 있다 — `omp/18.0.0`, `~/.omp/agent/extensions/`의 `entwurf-meta-omp`·`entwurf-receive-omp`, `mcp.json`의 native `entwurf-bridge`, `tools.xdev: false`(실측 2026-09-04). README와 `OMP.md`가 아직 "시민권 미착수"라고 말하고 있었다. `OMP.md`에는 문장을 지우지 않고 `[2026-09-04] 정정` 절로 C4·C5·C1만 닫았다. **닫힌 것과 열린 것을 표로 갈랐다**: 시민권(주소가 서는가, entwurf 소관)은 닫혔고, 위임 이득(GLG의 검수 홉이 줄어드는가, 여기 소관)의 D1–D5는 **전부 미측정**이다. 그래서 셋은 계속 안 한다 — `run.sh`에 `omp` 브랜치 없음, `nixos-config`에 없음, **`~/.omp`에 스킬 SSOT 주입 없음**. 이미 내 스킬셋으로 채워준 대상은 "스킬셋이 필요했는가"에 답할 수 없다.

* **entwurf 소비면을 0.17.2로 맞췄다.** 여섯 rail을 한 문단으로 세웠다 — Claude Code·Copilot·OMP는 mailbox self-fetch, Antigravity는 mailbox가 아예 없는 native-push, Codex는 delivery probe는 있으나 managed install lane은 아직, pi는 control socket 공급. 도구 목록에서 빠져 있던 `entwurf_resume_call`을 채웠다(이번 세션 MCP 스키마에서 읽음). Harness Support 표에 OMP 행을 넣되 "이 repo는 아무것도 배선하지 않는다"를 그 행의 내용으로 적었다.

* **GitHub 디스크립션을 교체했다.** 낡은 것이 셋이었다 — "Gemini Embedding 2"(은퇴, 지금은 Qwen3-Embedding-8B 4096d), "org-mode knowledge bases"(org 축은 프로덕션 비활성, 살아있는 것은 md 가든 축), "Pi extension"(방향은 pi 확장이 아니라 모든 하네스가 부르는 스킬). 스킬 수 42 → 43도 실측으로 맞췄다.

### Fixed

* **`tag-release`가 실제로 GitHub Release를 만든다.** 이전 스킬은 릴리즈를 문서 맨 끝 한 줄짜리 "Optional"로 뒀고, 그 결과가 그대로 나왔다 — `v2026.9.2`와 `v2026.8.10`은 태그만 있고 릴리즈가 없다(실측). **`git push origin "$TAG"`는 릴리즈를 만들지 않는다.** GLG가 github.com에서 읽는 것은 CHANGELOG가 아니라 릴리즈 노트 페이지이므로, 릴리즈 없는 태그는 취향이 아니라 **미완료 컷**이다. Make 단계가 pre-flight → tag/push → **`gh release create`** → stamp가 되고, 노트는 CHANGELOG 해당 절을 **그대로** 추출한다(두 번째 요약은 원문에서 흘러내린다). 빌드 산출물 첨부가 이제 선택 항목이다 — 사용자가 직접 만들 수 없는 바이너리에만, gitignore된 빌드 출력을 검토된 것처럼 붙이지 않는다. 릴리즈 없이 지나간 태그는 같은 세션에 backfill하고 그 사실을 말한다.

## v2026.9.2 — 코퍼스가 한 기계를 벗어나고, 게이트가 자기 결함을 적는다

### Added

* **세션 코퍼스 읽기면.** `session-recap`과 `improve-agent`가 `ANDENKEN_SESSION_CORPUS` 하나를 andenken 인덱서와 공유해, 디바이스별로 모인 코퍼스(`<corpus>/<device>/`)를 읽는다. 코퍼스는 라이브 경로 앞에 두 마디만 덧댄 모양이라 discovery·exact 선택·mangled-cwd 조회가 전부 루트 추가로 끝났다 — 스키마도 device 컬럼도 만들지 않았다. 측정: thinkpad 라이브 2,104 → 합집합 2,567 (+463 oracle) 0.07s. 헤더는 `[claude@oracle]`로 출처를 밝히되, **device는 수집처이지 생성처가 아니다**(두 기계가 `rsync -a`를 mtime 보존으로 주고받아 원본 방향은 판정 불가) — 그 경고가 docstring·`--help`·SKILL.md 세 곳에 라벨과 함께 다닌다.

* **`quota` 스킬 — 다섯 rail의 잔량을 한 번에.** Copilot 프리미엄, Z.AI GLM 5시간/주간, Codex 5h/weekly, Claude 5h/7d, Grok SuperGrok weekly. pace-aware TUI와 로컬 웹 뷰를 함께 열고, 두 번째 실행은 웹 서버를 토글한다. 다음 형제를 어느 rail로 보낼지 정할 때 쓴다.

* **`cloudflare` 스킬.** 개인 계정의 DNS·Single Redirect·Email Routing·터널을 브라우저 없이 조작하고 공개면을 검증한다.

* **푸터에 마지막 턴 시각과 캐시 효율.** `GLG HH:MM:SS · pi HH:MM:SS`(KST)로 마지막에 답한 쪽이 언제였는지 보이고, 비용 통계에 캐시 효율 배수가 붙는다. ACP 턴 회계를 쓰도록 고쳤다.

### Changed

* **추론을 OpenRouter로 흘리지 않는다.** OpenRouter는 임베딩/이미지 전용 개인 rail이고, 형제 호출은 승인된 구독·직접 엔드포인트만 쓴다. skill 전용 provider 키는 pi 모델 선택기에서 감춘다 — 고를 수 없는 것을 목록에 두지 않는다.

* **하네스 소유 경계를 실제 소유자에게 넘겼다.** Claude statusLine은 entwurf 소유임을 기록하고 미사용 사본과 심링크를 지웠다. entwurf가 소유하는 키를 settings fragment에서 뺐고, `antigravity/` 표면은 통째로 제거했다(설정·MCP 배선은 entwurf `install-agy-*`가 소유). Copilot은 `~/.copilot/skills`로 SSOT를 팬아웃하고, Kiro는 스킬면만 링크한다. 스크롤 제어는 하네스가 아니라 tmux가 갖는다.

* **형제 사이에서 사실이 건너가는 방식을 `AGENTS.md`에 규범으로 세웠다.** 남에게 건너가는 문장마다 근거 상태(측정/`file:line`/외부 아티팩트/미검증 인용)를 달고, 상속된 사실과 설계 제안을 다른 상자에 둔다. 근거 없는 주장은 오류가 아니라 단서이고, 회신은 "틀렸다"가 아니라 "영수증이 없어서 재봤다"이다. GitHub 이슈·코멘트에는 저자 표기를 붙여 에이전트 초안과 GLG의 목소리를 가른다.

* **`semantic-memory` 스킬을 호출자 계약 형태로 다시 썼다.** 5건으로 시작해 고르고 열기 — 정확한 제목/인물은 denotecli, 하루 전체는 timeline.

### Fixed / aligned

* **`git-hooks`의 경로 allowlist가 gitleaks에 닿지 않는다는 사실을 문서화했다.** `allowlist-paths.txt`와 `.git-hooks-allow`는 `parse_added_lines`만 먹이고, gitleaks는 필터되지 않은 diff를 받는다. 경로를 allow해도 gitleaks는 침묵하지 않고 스캔도 빨라지지 않는다 — 2.9GB 코퍼스가 47분 47초 스캔에 걸렸을 때 가장 그럴듯해 보였던 처방이 실제로는 아무것도 바꾸지 못했을 것이다.

* **접두 시크릿 룰 15개에 좌측 토큰 경계가 없다는 것을 미결로 기록했다.** urlsafe-base64 본문 한복판의 `r8_`/`hf_`가 매칭된다. **진짜를 놓치는 게 아니라 오탐을 더한다** — 그래서 긴급이 아니라 미결이다. 고치려는 사람이 밟을 함정도 같이 적었다: 룩비하인드는 gitleaks를 panic시키고(Go RE2), sed 일괄 치환은 이미 capture group을 가진 두 룰을 깨뜨리며, `useDefault`는 대부분의 서비스를 덮지 못하는 데다 기본 GitHub 룰 자체가 같은 결함을 갖는다. 순차 알파벳으로 만든 fixture는 global allowlist stopword에 먹혀 조용히 빠진다 — 안 터지는 fixture는 잘 도는 룰과 똑같이 보인다. 독립 세션 검수를 거쳤다.

* **`doctor`가 스킬 바이너리의 존재가 아니라 실행을 확인한다.** 파일이 있다는 것은 도는 것과 다르다.

* PRIVATE 봇 workspace 리포 둘(`workspace-bbot`, `workspace-glg`)을 identity 스캔에서 loose로 내렸다(시크릿 스캔은 유지). Z.AI 앱 리셋 시각이 베이징(UTC+8) 기준임을 명시하고, Grok rail은 SuperGrok weekly `creditUsagePercent`를 읽는다. youtube-transcript는 org md transcript 아래에 저장하고 데이터센터 yt-dlp에서 EJS solver를 켠다. README/ENV-SETUP/HERMES의 누적 문서 드리프트와 스킬 카탈로그 드리프트를 바로잡았다.

## v2026.8.10 — 세미 젠킨스의 복귀면: 폴라로이드에서 편집실로

### Added

* **`session-recap --session-file` exact selector.** Semantic session search가 돌려준 absolute `file`을 discovery 추측 없이 한 transcript의 spine으로 복원한다. Exact intent는 tmp·size·filename·skip 필터를 우회하고 discovery flags와 섞이면 fail-fast한다. Hit 주변의 `line`은 semantic-memory `--with-excerpt`, 전체 세션은 recap이 소유한다.

* **`entwurf-peek situation` record-backed board.** Garden id와 native session id를 meta-record로 exact join하고, record 사실·socket mirror·transcript 추정을 분리한 read-only projection을 세웠다. Entwurf #64 판정대로 caller-side research surface로 유지하되 dispatch·role·placement·liveness authority는 갖지 않는다.

### Changed

* **`/recall`을 한 세션 요약에서 복귀 편집실 입구로 재정렬.** Unfiltered situation, pi와 Claude 각각의 recap, NEXT·ROADMAP·git, session semantic과 garden semantic을 provenance를 보존한 채 함께 본다. `session-recap`은 폴라로이드, `situation`은 현재 형제들의 스토리보드다. 출력만 zero/mid-flight 상태에 비례하며 day-axis는 요청할 때만 연다.

* **멀티하네스 skip을 caller 기준 3상으로 명시.** pi는 pi만, Claude Code는 Claude만 자기 live transcript로 skip한다. Codex·Antigravity는 두 indexed corpus 중 어느 것도 쓰지 않으므로 양쪽 모두 `--skip 0`이다.

* **pi discovery를 현행 native UUIDv7 suffix 단일 규격으로 교정.** 폐기된 garden-id·UUIDv4·`entwurf-`·`delegate-`를 하위호환 OR로 되살리지 않는다. Filename은 흔적의 위치일 뿐이고 canonical `garden id ↔ nativeSessionId ↔ transcriptPath` 계보는 entwurf meta-record만 소유한다. Andenken의 paid corpus 회복은 별도 estimate/reindex gate 앞에 남아 있다.

* **형제 호출 운영 경계를 강화.** “repo 담당자를 새로 불러”는 dormant continuity resume이 아니라 fresh target-project steward다. 현재 surface가 cross-repo fresh cwd를 만들지 못하면 resume으로 대체하지 않고 product gap을 보고한다. Sibling provider는 승인된 direct/subscription rail만 쓰고 OpenRouter를 launch rail로 쓰지 않는다(entwurf #73).

### Fixed / aligned

* Native Claude Code permission mode를 `bypassPermissions`로 고정하고, entwurf가 소유하는 `defaultMode`와 agent-config fragment의 경계를 정리했다.
* Fable 모델 별칭을 `fable` / `claude-fable-5`로 canonicalize했고, 과거 제목 없던 CalVer CHANGELOG 두 절에 이름을 붙였다.

## v2026.8.7 — 걸어놓고 기다리던 턴이, 스스로 깨어난다

### Added (pi가 못 하던 것 하나)

* **`pi-extensions/background-bash.ts` — 느린 명령을 걸고 턴을 끝내면, 끝나는 순간 에이전트가 스스로 깨어난다.** pi의 내장 bash는 동기 전용이라 `pnpm check` 같은 것은 턴 전체를 막거나 tmux에 세워둘 수밖에 없었고, 세워둔 일은 사람이 다시 와서 봐야 했다. 실제로 관측된 실패 양상은 **"pnpm check 하겠습니다" 하고 턴이 끝나 키 입력을 기다리는 것**이었다. Claude Code에는 이 문제가 없다 — `run_in_background` + 완료 알림이 모델을 다시 부른다.

  pi 코어에 완료 후크는 없다. **그런데 필요가 없다.** `pi.sendMessage(..., {triggerTurn:true})`는 아무 비동기 콜백에서나 부를 수 있고, `agent-session.ts`가 턴 종료 후 큐에 들어온 메시지에 대해 continuation을 돌린다고 주석으로 명시하고 있다("queued by agent_end extension handlers"). 그래서 자식 프로세스의 `exit` 핸들러가 결과를 큐에 넣고 턴을 켠다. 턴이 이미 돌고 있으면 follow-up으로 붙는다. `goal.ts`가 `agent_end`에서 쓰는 것과 같은 기전이다. 도구는 `bash_background` / `bash_background_check` 둘, 커맨드는 `/bg`, 상태표시줄은 `⏳ n tasks`.

  **삽질로 배운 것 둘을 코드와 문서에 박아뒀다.** ① pi 자신의 `getShellConfig()`로 셸을 띄운다 — 그게 `bash -c`를 준다. `-lc`로 하드코딩했더니 로그인 프로파일이 실행되며 **OSC 이스케이프 바이트가 모델 컨텍스트에 주입**됐다. ② `detached:true` + `process.kill(-pgid, …)` — bash pid만 죽이면 `… | xargs sha256sum`이 계속 돈다. 5초 뒤 SIGKILL 승격은 **저장한 pgid**로 하며 리더 생사나 `task.child`에 걸지 않는다. 그 조건에 걸면 승격이 필요한 바로 그 경우(SIGTERM을 무시하고 리더보다 오래 사는 자식)에만 승격이 안 된다.

  타임아웃은 실패와 다른 상태(`timedOut`)다 — 호출자가 요청한 종료를 "고쳐서 다시 돌려라"로 보고하면 에이전트가 없는 버그를 쫓는다. 모델에 가는 tail은 OSC/CSI/DCS/CR을 걷어내되(디스크 원본은 그대로), CSI 종료 바이트는 `A-Za-z`가 아니라 **`@-~`**다 — 아니면 `ESC[200~`가 새고, 반대로 `ESC(0`의 다음 인쇄 문자를 삼킨다.

  잔여 위험은 감춘 게 아니라 적었다: 리더가 죽은 뒤 맨 pgid로는 소유권을 증명할 수 없어 5초 창 안에 재활용된 pgid는 맞을 수 있다. 없애려면 supervisor나 cgroup이 필요하다.

### Added (agent-stuff에서 들여온 것)

* **`review.ts` — pi에 없던 `/review`.** PR·기준 브랜치·커밋·미커밋 변경·폴더 스냅샷. Claude Code의 `/code-review`에 대응하는 자리가 pi에도 생겼다.

* **`goal.ts` — 목표 모드.** 목표가 active인 동안 `agent_end`마다 continuation을 주입한다. 토큰·시간 예산, error/abort 정지, 세션 tree 재구성까지 들어 있다. 수선 1건: continuation 큐잉 실패 경로가 `hasUI` 확인 없이 `ctx.ui.notify()`를 불러서, **headless entwurf 세션에서 터지며 진짜 원인을 삼켰다** — continuation 유실이 가장 안 보이는 자리다.

* **`continue.ts`** — `shift+alt+enter`로 멈춘 에이전트에 "continue" 한 번. `goal.ts`의 수동 짝.

* **`commands/discuss.md` — `/discuss` 계획 인터뷰어.** 라운드당 질문 3개 이하, 각 질문에 권장 답안과 이유. 구현 금지.

### Changed

* **`env-loader` 상태표시줄 압축 — `env: 4 vars loaded` → `🔑4`.** footer 상태줄은 모든 확장이 나눠 쓰고 **잘린다**. 시작 시 한 번 정해지고 다시는 안 바뀌는 사실에 18칸을 쓸 자리가 아니다. `glg-footer.ts`는 손대지 않았다 — 업스트림 `footer.ts` 미러라 우리 로직을 넣으면 다음 동기화마다 충돌한다. 확장이 `setStatus`만 부르면 저절로 얹힌다.

### Rejected

* **`trust-github-repos.ts` — 들여왔다가 뺐다.** origin owner가 `junghan0611`이면 프로젝트 신뢰 프롬프트에 자동으로 "yes, 기억"을 답하는 확장이다. pi 소스만 보고 "싸고 확실한 이득"이라 판단했는데, `~/.pi/agent/trust.json`을 열어보니 **`/home/junghan/repos/gh`가 이미 통째로 True**였다. 하위 리포는 상속받으므로 대신 답할 프롬프트가 애초에 없다. 남는 효과는 `~/repos/gh` 밖 클론의 자동 신뢰뿐이고, 그건 이득이 아니라 owner 이름을 곧 실행 승인으로 바꾸는 일이다.

## v2026.8.6 — 없는 것을 지시하던 문서와, 남의 것을 소유하던 설정

### Added (Upstage Solar provider)

* **`pi-extensions/upstage-provider.ts` — Upstage Solar를 OpenAI 호환 provider로 등록.** `api.upstage.ai/v1`을 pi의 `/model` 목록에 올린다. 이 파일의 핵심은 모델 목록이 아니라 **compat**이다: pi가 OpenAI 호환 엔드포인트에 자동 적용하는 기본값 중 Upstage가 거부하는 셋(`store`, `role: "developer"`, `tools[].function.strict`)을 막는다 — 문서만 읽고 붙이면 전부 깨지는 자리다. 등록은 `CATALOG ∩ GET /v1/models` 교집합이라 계정이 못 부르는 모델은 안 뜨고, 권한이 생기면 저절로 뜬다. `UPSTAGE_FORCE_MODELS`로 교집합을 우회할 수 있다(미승인 private beta를 "숨은 모델"에서 "보이는 에러"로 바꾸는 용도).

* **Solar Pro 4 등록 (512K) + Solar Open 2 두 값 교정.** Pro 4는 2026-08-06 GA. 컨텍스트 **524,288**은 Upstage 자신의 `SOLAR_CONTEXT` 표 값이고, pro3의 131,072를 찾았던 것과 같은 방식(과대 `max_tokens` → 에러 메시지)으로 API에 직접 물어 독립 확인했다. 같은 날 실측: 병렬·멀티스텝 tool calling, 160K 토큰 프롬프트에서 바늘 2개 회수, 근거 없을 때 조항을 지어내지 않는 거절.

  **reasoning 척도가 Pro 3의 역이다** — 필드를 생략하면 추론이 **켜져** 있고 `low`는 끄는 값이 아니라 켜는 값이다. `PRO3_THINKING`을 재사용했다면 pi의 `/thinking off`가 `"low"`를 보내 **추론이 없다고 믿는 세션에 추론 토큰을 계속 청구**했을 것이다 — 에러가 안 나서 안 보이는 종류다. `FULL_EFFORT_THINKING`이 그 척도를 담는다.

  같은 매핑이 `solar-open2`에도 이미 틀려 있었고, Upstage 문서가 이제 그 모델에 전용 행을 준다. open2의 컨텍스트도 출시 블로그의 1M에서 **262,144**로 고쳤다 — Upstage 설치 스크립트가 그 값을 쓰고 모델을 256K로 표기한다. 1M은 웨이트 스펙이지 엔드포인트가 받는 값이 아니다. 둘 다 파일 안에 "미검증 추측, 재확인 요망"으로 표시돼 있던 값이다.

  가격은 프로모(무료 → 90% 할인)가 아니라 **2026-09-11부터의 정가**를 박았다. 카탈로그에 시간 가변 가격이 없고, 이 repo는 이미 낮게 읽힌 비용 추정의 대가를 치른 적이 있다.

### Added (skills & commands)

* **`timeline` — GLG의 시간축 관측소.** 어느 세션·리포에서든 하루를 깊이 0/1/2/3(시간블록·저널헤딩·에이전트스탬프·커밋/노트)으로 한 KST 축 위에 세운다. `collect.py`가 LOCAL FULL(`events.jsonl`, 로컬·gitignore)을 만들고 `query.py`가 꺼낸다. 스크립트는 HOME 앵커라 CWD와 무관하게 돈다. 계약(고정 KST, 반개방 `[from,to)`, 자정은 시작일 귀속, 0건은 ok가 아님, sqlite 직접 열기 금지)을 스킬 문서가 들고 있어 재도출하다 틀리는 일을 막는다. 이후 projection이 **자신을 읽은 기계 이름을 적도록** 고쳤고, `garden2wikidocs`를 garden/product로 등록했다.

* **`/authologplay` 커맨드** — 어쏠로그 유희 한 판(원석 → 가든 코어 글·연결·GLGMAN Universe 이미지).

* **`glg-image` now carries its own Gemini image generator.** A zero-dependency Node CLI mirrors the pi `generate_image` REST path, loads `GEMINI_API_KEY` itself, accepts exact prompt files and explicit project output paths, and works from Claude Code/Codex/Antigravity without a native image tool. General document-image generation is the default; the GLGMAN world block is applied only when that universe is requested.

### Changed (search surface)

* **`exa-search`가 기본 웹 검색면, `brave-search`는 폴백.** Exa는 키워드·의도 검색을 모두 하고 직접 `fetch`가 막히는 페이지를 크롤러가 읽어준다(검색당 약 $0.007). Brave는 Exa가 싸게 주지 못하는 것으로만 자격을 얻는다 — 월 2000건 무료 한도의 대량 조회, 국가 스코프, freshness 창.

### Fixed

* **`brave-search` 병렬 호출 429 — 요금제 한도지 소진이 아니다.** 무료 플랜이 **1 req/sec**이라 병렬 호출이 실패했다. 호출을 직렬로 늦추고, 매 실행이 남은 월 쿼터를 stderr에 찍게 해서 "키가 죽었다"는 오진을 막는다.

* **agenda 도장을 성공한 push 뒤로 한정.** 로컬 커밋에 도장을 찍으면 어젠다의 커밋 링크가 해석되지 않는다. 도장은 원격에 올라간 뒤에만 찍힌다.

* **`tmux` 스킬 — 에이전트가 만든 세션이 사용자에게 보이게.** private socket(`-L`/`-S`)에 만든 세션은 살아 있어도 사용자의 `tmux ls`에 **안 보인다**. 기본 소켓만 쓰도록 못 박고, `-f /dev/null`(사용자 tmux.conf를 버려 스크롤백이 잘림), 출력 리다이렉트(pane이 빈 화면이 됨) 함정도 문서화했다.

* **`run.sh` — 죽은 pi 확장 심링크와 `ensure_link` 백업 청소.**

* **git-hooks: `junghan0611/apply`를 loose로 강제.** 이력서는 실제 고용주 이름을 적어야 한다. origin URL로 판정하며 시크릿 스캔은 그대로 켜둔다.

### Docs

* **`bibcli` — URL 원샷 입수 핸드북.** 유튜브·책·블로그·웹 URL을 주면 `save` → 스타일·키 판단 → `pin --sync`로 **같은 세션에** Zotero 적소 분류와 인용 키를 확정한다(시점 분리 금지). 책 경계를 zotero-config 의례와 맞추고, 외부 캡처 동기화 반사와 SSOT 교리를 적었으며, 검색 필드를 정정하고 `sync`를 read-only로 표시했다.

* **역할 기반 조율(role-based coordination) 정의.** 조율은 모델·백엔드·지위가 아니라 **역할**이다. GLG가 어떤 형제를 조율자로 지명하면 그가 그 일의 라우팅 지점이 된다 — 저장소가 어디든, 각 세션을 누가 열었든. 교차 리뷰는 판결이 아니라 협업이며, 발견된 공백은 루프가 작동한 증거다.

* **들여쓰기 기본을 탭으로.** 프로젝트 스타일/린터가 달리 요구하지 않는 한.

* **`memory-sync` / `semantic-memory` — flock 잠금 반영, 자기 매칭 `pgrep` 안내 수정, 영어 본문화.**

* **`emacs` — 멈춘 데몬 복구 절차와 `add-history`/`add-link` 계약 명시.**

* **`gogcli` — blogger 면과 최소 스코프 인증 규칙.**

### Removed (surfaces with no consumer left)

* **Telegram bridge surface retired — `pi-entwurf`의 소비자 소멸.** 이 트랜스포트를 쓰던 Oracle 상주 세션(`pi-entwurf`, tmux, `@glg_entwurf_bot`)이 은퇴했고, 그 계보의 저장소 `junghan0611/pi-telegram`은 2026-04-24에 아카이브됐다. 그래서 `setup_links`의 `telegram.json` 생성 블록과 `setup_npm`의 `pi install git:github.com/badlogic/pi-telegram`을 걷어냈고, setup은 이제 남아 있던 `~/.pi/agent/telegram.json`을 **지운다**. README의 Persistent Agent 절·Harness 표 행·생태계 표 행과 `pihome` 별칭도 함께 내렸다.

  **지운 실효는 하나였다:** 남겨두면 확장이 매 세션 토큰을 읽고 폴링은 걸지 않아 **모든 pi 세션 상태바에 `telegram disconnected`를 영구 표시**했다. 에러가 아니라 "토큰은 있는데 아무도 안 쓴다"는 표시였다.

  **되살릴 때 필요한 좌표** — 역할이 언제 어떤 형태로 돌아올지 모르므로 남긴다. 업스트림 [`badlogic/pi-telegram`](https://github.com/badlogic/pi-telegram)(마리오 체크너, pi 저자)은 **아카이브가 아니다**. 다만 2026-04-04 이후 커밋이 없다(우리 설치본도 같은 `cb34008`). 봇 `@glg_entwurf_bot`은 **토큰이 여전히 유효**하고 `~/.env.local`의 `PI_ENTWURF_BOT_TOKEN`도 손대지 않았다 — 봇을 텔레그램에서 지울지는 이 스크립트의 판단이 아니다. 복구는 `pi install git:github.com/badlogic/pi-telegram` + `telegram.json`(`botToken`/`botId`/`allowedUserId`) 재생성이면 된다.

  **이름 함정(반드시 기억할 것):** `junghan0611/pi-telegram`(아카이브)과 `badlogic/pi-telegram`(업스트림)은 **이름만 같고 다른 물건**이다. 전자는 설명이 *"Hierarchical agent orchestration system with JSON-RPC 2.0"* — 텔레그램 브리지가 아니라 **entwurf의 조상**이다. "pi-telegram 정리"라고만 읽으면 살아 있는 쪽을 지운다.

  패키지 언인스톨은 **자동화하지 않았다**. `pi uninstall git:github.com/badlogic/pi-telegram`은 운영자 몫이다 — 이번 실행에서 설치하지도 않은 패키지를 걷어내는 setup 스크립트는 사람을 놀라게 한다.

* **Gemini CLI (legacy) 면 제거 — 바이너리가 사라졌다.** `gemini`는 이 머신 PATH에 없다(`agy`는 살아 있다). 저장소의 `gemini/` 디렉토리와 `setup_links`의 두 섹션(`~/.gemini/settings.json`, `~/.gemini/skills`)을 걷어냈고, setup은 남아 있던 그 두 **심링크만** 지운다. 스킬 팬아웃은 6면 → **5면**.

  ⚠️ **`~/.gemini/`를 통째로 지우면 안 된다.** 이름과 달리 그 디렉토리는 Gemini CLI의 집이 아니라 **Antigravity의 집**이다 — `antigravity-cli/`(settings·skills)와 `config/`(live-runtime MCP 경로)가 거기 산다. 정리는 legacy 심링크 둘로 한정했고, 그 이유를 `run.sh` 주석과 README에 박아뒀다. 실행 후 Antigravity 3경로 생존을 확인했다.

  함께 정정: README가 `antigravity/mcp_config*.json`을 링크한다고 적고 있었는데 **그 파일은 존재하지 않고**, agy MCP config는 entwurf의 `install-agy-bridge` adapter 소유다(심링크를 걸면 adapter가 REFUSE한다). `run.sh` 주석은 이미 맞게 적혀 있었고 README만 뒤처져 있었다.

* **`autoresearch.*` 실험 발판 제거.** 2026-05-07 `session-recap` 지연 최적화 세션이 남긴 저장소 루트의 추적 파일 4개(`autoresearch.sh`, `.checks.sh`, `.jsonl`, `.md`). 실험은 **결론이 났고 반영됐다** — `3af11d9`(bounded deque로 마지막 N 메시지만 유지). 성과는 코드에 남았고 발판만 루트에 남아 있었다. `autoresearch.md`가 참조하던 `autoresearch.ideas.md`는 애초에 존재하지 않았다.

### Changed (pi 설정 — 파일 둘을 레퍼런스 하나로)

* **`pi/settings.server.json`을 `pi/settings.json`에 접었다.** 새 구조는 `_common` + `_workstation`/`_server` 오버레이이고, `_` 접두 키가 산문을 나른다(JSON엔 주석이 없다). `setup_links`가 `is_server_device()`로 오버레이를 골라 `jq '(._common) * (.[$ov])'`로 평평한 fragment를 만든 뒤 `merge_settings`에 넘긴다. **이 repo는 설정을 참고하는 곳이지 라이브 저장소가 아니다** — 그 문장을 파일 맨 위 `_reference`에 박았다.

  두 파일을 유지할 이유가 없었다: entwurf `packages[]` 항목과 `lastChangelogVersion`(둘 다 우리 것이 아님)을 빼고 나니 **진짜 차이가 `defaultThinkingLevel` 하나**였다. 스칼라 하나 때문에 파일 전체를 복제해두면 그 복제본은 반드시 어긋난다.

* **`packages[]`에서 entwurf 제거 — 소유자가 둘이었다.** entwurf는 자기 `./run.sh install`로 `~/.pi/agent/settings.json`의 `packages[]`에 스스로를 user-scope citizen으로 등록하고 `remove-user-scope`가 그 역이다. 우리도 선언하고 있었으니 소유자가 둘이었고, entwurf는 절대경로를 쓰는데 우리 fragment는 상대경로여서 EXISTING-WINS 병합이 **영원히 화해시킬 수 없었다.** `run.sh`의 주석은 이미 "설치면은 entwurf에 맡긴다"고 적고 있었는데 **데이터만 그 말을 안 따르고 있었다.**

* **`packages[]`를 통째로 없앴다 — 이 파일은 이제 pi 패키지를 하나도 선언하지 않는다.** entwurf만 빼는 것으로는 부족했다: `merge_settings`가 배열을 **단일 leaf로 비교**하는데(jq 병합이 배열을 통째로 대체하므로) live의 `packages`는 entwurf가 자기를 추가해 자라므로, 우리가 그 키를 선언하는 한 두 배열은 **항상** 달라 경고가 계속 떴다. 키를 없애니 비교할 것이 없어 **경고가 사라졌다**(실행 확인).

  andenken도 함께 뺐다. 에이전트는 **`semantic-memory` 스킬**로 닿고 그건 모든 하네스가 부를 수 있으니, 설정 항목이 필요 없다. **알아둘 결과:** andenken이 pi 패키지로 등록된 적 없는 기기에서는 pi의 `session_search`/`knowledge_search` registerTool이 **없고** 스킬이 유일한 문이다. 이미 등록된 기기(이 워크스테이션 포함)는 그대로 동작한다 — EXISTING-WINS라 live에서 지워지지 않는다. 이게 의도한 모양이다: 모든 하네스가 공유하는 한 면이지, pi 전용 편의가 기준면이 아니다.

* **`entwurfProvider.mcpServers`도 뺐다 — 같은 이중 소유였다.** entwurf의 `./run.sh install`이 그 면을 실제로 쓴다(`scripts/smoke-acp-mcp-live.ts`가 명시). live에는 bare stable bin `entwurf-bridge`가 기록되고 그건 entwurf가 소유한 `~/.local/bin` 심링크로 해석된다(실물 확인). 우리는 절대 `start.sh` 경로를 박아두고 있었으니 두 번째 소유자였고, 값이 다른 형태라 화해가 불가능했으며, **entwurf가 자유롭게 옮길 수 있는 경로를 우리가 고정**하고 있었다. `entwurfProvider`에 남긴 `skillPlugins`는 이 repo가 만드는 소비자 플러그인 팜을 가리키므로 진짜 우리 것이다.

  결과: 남은 divergence 경고는 `defaultProvider`/`defaultModel`/`defaultThinkingLevel`/`compaction`뿐이고, 이것들은 **GLG의 실제 live 선택**이다. 소유권 충돌이 아니라 레퍼런스가 제 역할을 하는 것 — "이 기기는 참고값과 이만큼 다르다".

* **`scripts/` 제거.** 안 쓰는 `pi-entwurf.sh` 하나뿐이었다(은퇴한 상주 세션의 런처). 저장소·홈 어디에도 참조가 없음을 확인했다.

### Docs (drift sweep — 문서가 없는 것을 지시하고 있었다)

* **폐기된 entwurf 도구를 실사용으로 지시하던 자리 정정.** `AGENTS.md`가 "`entwurf_send`로 지시를 보낸다"고 적고 있었는데 그 도구는 entwurf #50 하드컷으로 사라졌다 — 읽고 그대로 호출하면 실패한다. Codex/Antigravity 검증 문장의 `entwurf_resume`, README의 `entwurf`/`_resume`/`_send`/`_peers` 행도 v2 표면(`entwurf_v2`/`peers`/`self`/`inbox_read`/`fresh_call`/`register_native`, 0.13.1)으로 교체했다.

* **`AGENTS.md § Release — entwurf Install Mode` 삭제.** `run.sh`의 `ENTWURF_INSTALL_SPEC`/`ENTWURF_TRACKING_REF`, `git:` 패키지 항목, `setup_npm()`의 `git checkout -B main origin/main`, v0.5.0 prerelease 창 — **어느 것도 존재하지 않는다**(entwurf는 0.13.1). 고치지 않고 지웠다: 이 repo가 소유하지 않는 설치 모드에는 이 repo가 문서화할 설정이 없다. 대신 `§ Version Pinning — who pins what`으로 대체해 **entwurf는 스스로 핀하고, 우리가 핀하는 것은 평가 대상 런타임(`HERMES_TAG`)** 이라는 비대칭을 적었다.

* **생태계 표에서 entwurf의 Telegram 행 삭제.** entwurf `src/`에도 README에도 telegram 코드가 한 줄도 없는데 전송 계층으로 등재돼 있었다.

* **수치 정합:** 스킬 41→42, commands 표 6→8(`/authologplay`, `/scaleplay` 누락), `pi/` 표 3→4(`settings.server.json` 누락).

### Added (bench)

* **`./run.sh setup:hermes` — 평가 대상 런타임을 이 repo가 직접 세운다.** `HERMES_TAG`로 버전을 고정하고 `.#minimal + anthropic`으로 작게 설치한다. `setup`에 포함하지 않는다(콜드 빌드 ~1000 파생). 자세한 근거는 README `§ Agent Runtime Bench`.

### Skills

* **`entwurf-peek` 문서 정정 (코드 수선은 랜딩 후).** description이 "`entwurf_peers`는 control socket 있는 세션만 보여주므로 내가 메운다"고 **존재 이유부터 거짓**을 말하고 있었다 — peers는 이제 meta-record citizen을 전부 보고한다. 자리를 다시 그었다: **peers = citizen 존재/liveness, peek = transcript heuristic 상태**. sync/`Mattering...` 프레이밍은 은퇴(v2는 fire-and-forget 전달만). placement 비권위를 두 곳에 박았다. `trace`의 `Session ID:` 매칭이 죽어 있다는 경고와 대체 방향(fresh-call nonce → callback sender envelope)을 달았고, 파서 교체는 entwurf `mux-placement` 랜딩 후 acceptance fixture로 한다(entwurf PM 합의, `NEXT.md [2026-08-06]`).

* **`glg-image` now carries its own Gemini image generator.** A zero-dependency Node CLI mirrors the pi `generate_image` REST path, loads `GEMINI_API_KEY` itself, accepts exact prompt files and explicit project output paths, and works from Claude Code/Codex/Antigravity without a native image tool. General document-image generation is the default; the GLGMAN world block is applied only when that universe is requested.

## v2026.7.14 — 스킬면 SSOT + 검증 게이트: 도구가 조용히 거짓말하지 못하게

### Decided (스킬면 소유)

* **바이너리 스킬의 스킬면은 agent-config가 단독 소유한다 — SKILL.md도, 배포 바이너리도.** 형제 repo는 **코드만** 갖는다. lifetract가 자기 `run.sh deploy`로 스킬 자리에 직접 쓰고 자기 SKILL.md까지 품고 있었는데, 둘 다 뺐다(gitcli는 `6613a23`로 이미 그 형태였다). 소유가 둘이면 어느 쪽이 참인지 아무도 모른다. 옛 lifetract deploy는 "세 자리 SHA256 일치"를 검사했는데 `~/.claude/skills`가 `agent-config/skills`로 걸린 심링크라 **한 자리를 두 번 세고 세 자리를 봤다고 말하고 있었다** — 하필 "검사가 검사인 척하는 것"을 죽이려고 만든 물건이.

### Added (게이트 + provenance)

* **스킬 바이너리 설치를 형제 repo의 테스트 스위트 뒤에 세웠다.** `run.sh setup:build`의 `go_build`가 이제 (1) 소스 repo의 테스트를 통과해야 하고 (2) **미커밋 소스를 거부**한다. 통과한 빌드만 스킬 자리에 앉는다.

* **`skills/.provenance.json` — 무엇이 깔렸는지 스킬면이 적는다.** 툴별로 `vcs_revision`(커밋), `src_tree`(소스 트리 해시), `sha256`(설치된 바이너리)을 기록한다. 이름을 댈 수 없는 스냅샷은 재현 가능한 게 아니라 그렇게 보일 뿐이다. 타임라인 축(`~/repos/gh/junghan0611`)이 이 스킬들의 숫자를 events.jsonl에 역사로 적는데, 자기 collector 해시만으로는 **어느 lifetract가 그 행을 냈는지** 말할 수 없었다. `./run.sh env`가 툴별 revision을 찍고 기록된 빌드와 다르면 경고한다.

### Skills (시간 계약)

* **gitcli v0.4.0 — KST 시간 계약 채택.** author timestamp, offset-aware 파싱, `\x1f` 구분자, `--all --no-merges`, sha dedupe, 심링크 repo 추적. timeline과 29일 표집에서 **full sha 집합이 완전히 일치**한다. 가장 큰 발견: `~/repos/gh/org`가 심링크라 **gitcli가 태초부터 못 보고 있었다**(257커밋, 올해만 201개) — Org 지식베이스 전체가 시간축에서 빠져 있었다. SKILL.md에서 더는 돌지 않는 예제 4개(`pi-mono`)도 함께 정리했다.

* **lifetract — 빈 답은 `null`이 아니라 `[]`다.** 7개 커맨드가 빈 창에서 `null`을 내던 것을 `[]`로 고쳤다(에이전트가 `len 0`을 순회하지 못하고 터지던 자리). `status`는 `warnings` 키를 상시로 내고, DB 부재는 조용한 빈 답이 아니라 **에러 + exit 1**이다.

* **lifetract — `steps_daily` 시간축 hardfix (9년치 복원).** Samsung export의 `day_time`은 epoch ms가 아니라 `"2026-07-13 00:00:00.000"` 문자열인데 코드 두 곳이 `strconv.ParseInt`로 읽고 있었다. 조회 경로는 파싱 실패를 `continue`로 삼켜 **CSV 폴백이 모든 창에서 항상 `[]`** 를 냈고, import 경로는 `create_time`으로 폴백해 **DB에 틀린 날짜를 심었다** — 2017-03-04~2025-07-14의 3,019행이 export 덤프 시각인 2025-07-15 하루에 압사했고(24,157,387보), 최근 1년치는 하루씩 밀린 채 나가고 있었다. 행수가 맞아서 손실 가드는 조용했다(`hrv`가 빈 껍데기 1,058행을 세던 것과 한 테이블 건너 같은 병). 고친 것: `day_time` 두 형식 공용 판독, `create_time` 날짜 폴백 **삭제**(못 읽으면 `invalid++`), 최신 `update_time` 기준 dedupe, 미래·동률 충돌 거부, **`steps_daily.date` UNIQUE 강제**(스키마 주석에만 있고 코드엔 없던 불변식), DB 조회의 `SUM` 제거. `--days N`은 단독·경계 조합 모두 **오늘 포함 정확히 N일**로 통일했다(전엔 단독 형태만 N+1일이라 "7일 평균"이 8일을 7로 나눴다). 손실 가드는 rejected 증가가 실제 감소를 가리지 못하도록 정상 baseline의 accepted-row shrink를 그대로 막는다. 133 tests·vet·race·TZ 3종, 실 DB 202,479행, CSV↔DB 3,381일 전수 일치. `hrv`는 은퇴했다 — export에 `rmssd` 컬럼이 아예 없어 1,058행이 전부 `0.0`으로 앉아 있던 빈 스트림이다.

### Changed (설치면 소유 경계 — entwurf issue #46)

* **entwurf consumer install을 놓았다 — entwurf가 자기 setup을 소유한다.** `run.sh setup`에서 entwurf 소비자 설치를 제거하고, antigravity의 agy MCP 설정을 entwurf adapter로 넘겼다. 잔여 배선(pi settings fragment 2개, antigravity `statusLine`, setup의 whole-file symlink)은 [issue #46](https://github.com/junghan0611/entwurf/issues/46)에서 계속 닫는다.

### Norms (검수 보고)

* **검수 보고는 자기평가가 아니라 상태 변화로 연다.** 실제 사건이면 영향과 복구를 앞에 두고 소유는 그 아래 한 줄 사실로 적는다. 크로스리뷰는 누가 옳았나가 아니라 **함께 무엇을 찾아 기웠나**로 기술한다. 발견된 구멍은 루프가 작동한 증거다 — 정정 아래 자기를 랭킹하면 그날의 일이 묻히고 긴 레인에 필요한 주도권이 깎인다. (`home/AGENTS.md § Entwurf and Peer Work`)

* **`improve-agent` — Claude Code 세션을 읽고, `--says`와 단일 시계를 얻었다.** 불평이 "에이전트가 *어떻게 들렸나*"일 때 단어 수가 아니라 오프닝 프레임을 보도록 했다. 회귀 테스트 8개.

* **`commit` 스킬 — 명시 요청된 push를 허용한다.** 커밋 요청만으로는 결코 push를 유추하지 않는다. GLG가 그 세션에서 명시할 때만 에이전트가 실행하고, 성공 후 어젠다에 도장을 찍는다.

### Removed (닿지 않는 면을 지운다)

* **OpenCode를 걷어냈다 — 배선이 없는 하네스를 지원한다고 적어두지 않는다.** README는 스킬이 `~/.config/opencode/skills/`로 팬아웃한다고 했고, `AGENTS.md`는 semantic-memory가 거기 뜬다고 표에 경로까지 적어뒀고, 담당자 스킬은 그 자리를 "디렉토리 통링크"로 그려뒀다. **`run.sh`에는 OpenCode 분기가 없다 — 문자열조차 없고, 그 링크를 만든 적이 없다.** 문서 셋이 서로를 뒷받침하며 존재한 적 없는 배선을 증언하고 있었다. 닿지 않는 하네스를 지원 목록에 얹어두면 그 목록 전체가 확인되지 않은 말이 된다. 실제 팬아웃은 여섯 곳(claude / pi / claude-plugin / codex / gemini / antigravity)뿐이다. OpenClaw(봇 4대)는 실재하므로 그대로 둔다.

* **은퇴한 Gemini 임베딩 스위트를 걷어냈다** (andenken `60b3606`). 라이브에서 Gemini로 임베딩하는 것은 아무것도 없다 — `model-presets.ts`에 gemini 프리셋이 없고, 세션 축과 가든 md 축 모두 OpenRouter Qwen3-Embedding-8B 4096d로 돈다. 스위트는 768d를 못박고 있었는데("outputDimensionality: fixed 768d") Gemini가 그 기본값을 3072로 바꾸면서 assertion 셋이 빨개졌고 그대로 빨간 채였다. 라이브 소비자가 눈치 못 챈 게 아니라 **라이브 소비자가 없었다**. `./run.sh test`가 이제 143 통과 / 0 실패다. **늘 실패하는 검사는 사람에게 모든 검사를 무시하도록 가르친다** — 진짜 실패가 그 옆을 걸어 지나가는 길이 그렇게 난다. 오늘 lifetract에서 죽인 병("검사하지 않은 것이 합격으로 보인다")의 거울상이다.

### Docs

* **README를 현재 정보로 끌어올렸다.** 다섯 자리가 사실과 어긋나 있었다: 스킬 목록이 31개(실제 41개), 스킬면 단독 소유와 빌드 게이트·provenance가 아예 없음, 임베딩 축(Qwen 4096d) 미기재, `pi-extensions` 표에 없는 `control.ts`가 있고 있는 `glg-footer.ts`가 빠짐, "Entwurf target policy: pinned/installed here"(이제 거짓 — consumer install을 놓았다). 확장면이 **왜 줄어드는지**도 처음 적었다: 확장은 pi 안에서만 살고 스킬은 어디서나 산다.

* **가든 소유를 `junghan0611/garden`으로 정정.** `junghanacs` org는 은퇴했다 — 링크하지 않는다.

* `autholog` 방 seed 정책 갱신, 기본 모델·가용성 라벨 갱신.

## v2026.7.2 — gogcli upstream 전환

### Changed

* **gogcli: 포크 로컬빌드 → nixos-managed 글로벌 upstream `gog`.** `junghan0611/gogcli` 포크 번들을 은퇴하고 upstream `steipete/gogcli`(v0.31.1)의 글로벌 설치(`~/.local/bin/gog`, nixos-config `scripts/external-packages.sh install gog`)로 전환했다. `run.sh`에서 포크 clone/build·스킬디렉토리→PATH 심링크·번들경로 검증 4곳을 제거하고 `command -v gog` PATH 검증으로 바꿨으며(실파일은 건드리지 않고 stale 심링크만 청소), `home/AGENTS.md`에 "Tooling and Skill Binaries — SSOT" 섹션(pnpm 단일소스, 글로벌 upstream 도구, sibling-repo CLI 번들 예외)을 추가했다. 배경: 과거 amd64 번들은 aarch64(oracle 봇)에서 실행 불가였고, upstream이 포크보다 최신 = 포크 불필요 확정.

### Config

* **`openclaw-config` git hook mode is forced to loose.** The repo is private memory/config data, so identity-term blocking is skipped there while gitleaks/secret scanning remains active. This makes the global hook policy match the Oracle `~/openclaw -> ~/repos/gh/openclaw-config` checkout without requiring a per-repo `.git-hooks-mode` override.

### Docs

* **gogcli 스킬을 upstream 서피스로 전면 재작성.** `SKILL.md`를 `steipete/gogcli` 기준으로 갱신했다: `{baseDir}/gog`(깨진 번들 참조) → 글로벌 `gog` 호출, Search Console의 positional `siteUrl`·`--from/--to`·`gsc` 별칭 등 upstream 문법 반영. **Maps 섹션**(API-key 인증 `places_api_key`; `places`는 서브커맨드인 반면 directions/distance/reverse는 플래그를 받는 함정; 광역지오코딩 driving `ZERO_RESULTS` caveat)과 **YouTube 섹션**(`youtube` OAuth 스코프; group→leaf 서브커맨드; search query는 positional)을 추가하고, Other-services 나열에서 `maps`를 뺐다.

## v2026.7.1 — co-owned settings merge

### Config

* **Co-owned settings are now keyset-merged instead of symlinked.** `run.sh setup:links` now breaks legacy `~/.pi/agent/settings.json` symlinks into real live files and merges `pi/settings*.json` with **existing-wins** semantics, matching the Claude settings path. This keeps pi runtime-owned `lastChangelogVersion` out of the repo while preserving it in the live file, and applies the same co-owner model to server/workstation Claude settings. Divergence warnings now compare fragment leaves explicitly, including `false`, `null`, nested values, and arrays.

* **Workflow toggles and model labels refreshed.** Claude settings fragments now disable workflow triggers explicitly; docs/skills/test fixtures moved active examples to Claude Opus 4.8, Claude Sonnet 5, and GPT-5.5 where applicable. `scripts/pi-entwurf.sh` now starts GPT-5.5, and the Telegram bot table was normalized to a four-column shape.

## v2026.6.30 — entwurf 릴리즈 싱크: skills-home + 시험소 포지셔닝

### Positioning (entwurf 릴리즈 싱크)

* **목적 전환 문서화 — agent-config = 스킬 SSOT + entwurf 시험소(proving ground).** entwurf가 `v0.12+`에서 garden-citizen dispatch substrate(`@junghanacs/entwurf`, 구 `pi-shell-acp` 은퇴)로 릴리즈되며 **모든 하네스 통합 설정·에이전트 통합관리의 강한 본체**가 됨에 따라, agent-config의 포지셔닝을 "co-equal pair"에서 **스킬 홈 + 시험소(인큐베이터)**로 재정렬했다. 하네스 config/hook/wiring은 여기서 먼저 담금질하고 몇 주 soak-test 한 뒤 깨끗하면 entwurf로 승격한다 — 검증 안 된 설정을 곧장 entwurf로 보내면 본체가 약해지므로 churn은 agent-config이 흡수한다. README 오프닝의 pi-centric "bridge layer that connects pi to…" 옛 설명을 제거했고, `ROADMAP.md [2026-06-30] purpose shift` 항목 신규, `AGENTS.md` 정체성에 "entwurf의 시험소이자 스킬 관리소" bullet을 추가했다. 방향 SSOT: `ROADMAP.md`.

### Fixed

* **git-hooks 시크릿 스캔이 모든 repo에서 죽어 있던 것 복구.** `_scan.sh`가 deprecated된 `gitleaks detect --source=-`를 호출하는데, gitleaks 8.x는 `-`를 존재하지 않는 파일 경로(`lstat -`)로 취급해 **0바이트만 스캔하고 항상 "no leaks"**를 반환했다 — gitleaks 시크릿 안전망이 strict/loose 양쪽 모두에서 조용히 무력화돼 있었다(identity-term/secretlint 레이어는 별개라 영향 없음). `gitleaks stdin` 서브커맨드로 교체해 파이프 diff를 실제로 읽고 발견 시 exit 1 하도록 고쳤다. 검증: `sk-ant` 고엔트로피 키가 strict·loose 양쪽에서 정상 차단, 일반 코드·identity-term-only(loose)는 통과하는 5케이스 매트릭스 통과.

### Added

* **`autholog` raw intake mend 스킬.** 링크드인·페이스북·텔레그램 날것을 `~/org/notes`의 기존 빈방/outdated 방에 원문(quote 보존) + 해설본으로 승격하는 ROSSE/autholog 수선 워크플로.

### Docs

* **`emacs` 스킬 — add-link hang 주의 + issue #9 gotchas 보강.** `agent-denote-add-link` nil 인자 hang 노트와 관련 gotcha를 추가했다.

### Notes

* `pi/settings.json` `lastChangelogVersion` → `0.80.2` (pi-runtime 자체 changelog ack; agent-config 릴리즈와 무관).

## v2026.6.23 — pi-shell-acp → entwurf 컨슈머 cutover

### entwurf rename (consumer cutover)

* **`pi-shell-acp` → `entwurf` 전면 cutover (23 files).** owning repo가 `pi-shell-acp`를 `entwurf`로 rename(코드 S1~S3 + repo/dir/remote)함에 따라, reference consumer인 이 repo의 모든 소비 면을 entwurf로 절단했다. workstation(`pi/settings.json`·`antigravity/mcp_config.json`·`codex/config.toml`) + server(`pi/settings.server.json`·`antigravity/mcp_config.server.json`·`claude/settings.server.json`) 양쪽에서: provider 키 `piShellAcpProvider`→`entwurfProvider`, MCP bridge 서버명/경로 `pi-tools-bridge`→`entwurf-bridge`(tool id `mcp__pi-tools-bridge__*`→`mcp__entwurf-bridge__*`), 로컬 클론 경로 `~/repos/gh/pi-shell-acp`→`~/repos/gh/entwurf`, install spec `git:github.com/junghan0611/pi-shell-acp`→`…/entwurf`, meta-bridge `.assembled` 경로를 일괄 전환. `run.sh`의 자체 셸 변수(`PI_SHELL_ACP_{DIR,INSTALL_SPEC,TRACKING_REF}`→`ENTWURF_{REPO_DIR,INSTALL_SPEC,TRACKING_REF}` — `ENTWURF_DIR` 의미충돌 회피로 `REPO_DIR`)와 함수(`pi_shell_acp_dir`→`entwurf_repo_dir`)도 정리. KEEP 토큰(`pi-telegram`·`pi-extensions`·`pi-mono`·`pi-coding-agent`·`pi-tui`·`PI_KEY`·`PI_SETTINGS`·`PI_SKIP_SKILLS`·`PI_ENTWURF_BOT_TOKEN`(텔레그램 봇))은 불변, `CHANGELOG.md` 0.x 역사 섹션도 보존.

* **`session-recap` historical dual-accept (cutover 정렬).** 과거 세션 transcript는 `provider:"pi-shell-acp"`로 영구 기록돼 있어, `session-recap.py`의 ACP 하네스 감지를 `entwurf` + `pi-shell-acp` 양쪽 수용으로 바꿔 옛 세션 recall을 유지한다. 런타임은 entwurf로 결별(cutover)하되 immutable 과거 데이터는 계속 읽는 consumer 측 historical-reader 정책. `entwurf-peek.py`(live 세션)·`test-discovery.py`(테스트)는 dual-accept 불필요라 전면 entwurf.

### Fixes (baseline 이후)

* **`session-recap` pi harness recall filter.** `--harness gpt|acp` 필터를 추가해 같은 하네스의 직전 세션을 정확히 떠올린다(`gpt`=pi native OpenAI/Codex, `acp`=entwurf Claude). `/recall`이 이 필터를 태운다.

* **`session-recap` size 필터 순서 수정.** `--min-kb` 가 `--skip` 보다 먼저 돌아 작은 현재 세션이 먼저 탈락 → `--skip 1` 이 실제 최신 세션을 떨궈 stale recap을 내던 버그를 고침. 구조 필터(tmp/garden-native명) → skip(full mtime 정렬) → `--min-kb`(생존자) 순으로 재배열.

## v2026.6.19-fix.1 — injection-strip 하드닝

* **Injection-strip hardening across injected skill shell snippets.** `v2026.6.19`를 실제로 컷하던 중, SKILL.md/command `.md` 안의 쉘 스니펫이 에이전트 컨텍스트로 주입될 때 하네스가 **bare `$N` 위치 파라미터**(`$1`/`$2`…)를 빈 문자열로 strip한다는 걸 발견(`${...}`/`$(...)`/`$word`는 생존). 깨진 곳을 전수 수정: `tag-release`의 CHANGELOG heading 체크를 `awk '$1=="##" && $2==tag'` → line-anchored `grep -qE "^## $TAG([[:space:]]|$)"`로 교체(`### `/줄 중간/탭 suffix 오탐까지 차단), `emacs`·`agenda`·`/mend`의 `ec()` emacsclient 헬퍼를 `"$1"` → `"${1}"`로 교체. `.sh`/`.py` 스크립트는 직접 실행이라 무관. GPT 공동검토(`20260619T124915-a4a02a`)로 grep 오탐과 stale 카운트 지적 반영.

* **`session-recap` Claude nested-scan parity.** andenken `scanClaudeDir`와 정합하도록 claude 세션을 top-level + UUID 하위폴더(session-id 폴더)까지 스캔하고 `subagents` 폴더는 제외. 현재 임계 초과 nested 파일은 0이라 동작 변화는 없지만 "인덱서와 정합" 주장을 코드로 맞춤.

## v2026.6.19 — Plane 이관 스킬 + 세션 코퍼스 정렬

### Skills / commands

* **New `plane` skill — self-hosted Plane(프로젝트 관리, Jira/Confluence 대체) REST 워크벤치 + Atlassian→Plane 이관 도구.** stdlib-only(의존성 0) 클라이언트로 프로젝트/work item/사이클/모듈/코멘트/멤버/상태/라벨 CRUD를 덮고, `jira_to_plane`(external_id·created_at backdate·created_by·2-pass parent·429 retry), `confluence_to_md`(Confluence 스페이스 → Markdown 트리), `md_to_plane_pages`, 그리고 `migrate_all` 오케스트레이터로 전량 풀(pull)을 묶는다. urllib 기본 UA가 Cloudflare 1010에 막히던 문제와 Confluence 스페이스 목록이 body-expand 25-cap에서 잘리던 페이지네이션 버그를 수정. **1차 이관 실측**: Jira work items 2,316건 / 10 프로젝트 / 실패 0; 문서(pages) 이관은 s3i에서 진행(핸드오프는 `NEXT--plane-migration.md`).

* **New `next-handoff` skill — NEXT 습관을 tag-release와 분리.** 세션 종료/중단 때 `NEXT.md`를 부트 섹터로 조이는 습관용 호출면. `tag-release`는 CHANGELOG/tag 의식으로 떼어내 명시 요청 때만 읽도록 경계를 박았다. 실제 사례(bridge infra / vendor SDK handoff)를 반영한 `Stem + detour mode` — 줄기(stem)·detour·return condition을 명시해 detour가 줄기를 대체하지 않게 한다.

* **New `/mend` command — 가든 노트 형식 일관성 수선 워크플로.** 기존 `~/org/` 노트를 PROTOCOL canonical shape에 맞추는 의식(섹션 통일·얼굴 정비·denote front-matter rename·ID/역링크/히스토리 보존).

* **`session-recap` corpus filters aligned with andenken `session-indexer.ts` (0d4432b).** recap이 실제 작업 세션만 떠올리도록 tmp/probe 프로젝트 디렉토리 제외, 300KB 이하 세션 제외(`size > MIN`, `--min-kb 0` 탈출구), pi는 garden-native 파일명(`_YYYYMMDDTHHMMSS-<6hex>`)만(구형 `_uuid`/`_delegate`/`_entwurf` 제외, claude는 항상 UUID라 면제). 기본 `--source`를 하네스-매칭(Claude Code=claude, 그 외 pi)으로 바꿔 같은 하네스의 직전 세션이 잡힌다. andenken 인덱서와 동일 path set으로 좁혀짐을 검증(절대 카운트는 라이브 세션이 300KB 임계를 넘으며 변동하므로 박지 않는다).

* **`jiracli` gained Confluence 페이지 생성/갱신/삭제** via `confluence_publish.py`.

* **`bibcli` skill leads with `save --sync --json`** as the one-shot citation recovery path.

### Identity / docs

* **Session End Protocol rewritten in English + per-lane `NEXT--<branch>.md` rule.** main은 branch-lane NEXT 파일을 들고 가지 않으며, 브랜치 종료 전 promote 후 삭제하는 규칙을 명문화. 글로벌 instructions도 압축(condense).

* **`tag-release` skill streamlined** — NEXT → CHANGELOG CalVer snapshot 흐름을 정리.

### Config / fixes

* **Server pi-shell-acp now points at the local v2 repo** instead of the git install, with meta-bridge plugin + keyset registered in server settings; `lastChangelogVersion` bumped to 0.79.6.

* **Fix — `go-to-bed` quiet hours shortened to 5am.**

## v2026.6.6 — 심볼릭 링크가 지우던 남의 설정, 가든 아이디로 모인 주소

* **`~/.claude/settings.json` is no longer symlinked on workstations — it is merged.** The live file is co-owned with pi-shell-acp's meta-bridge installer (disjoint keysets), and a symlink is whole-file ownership: the next writer's atomic rename silently clobbers the other side, which is why a stale meta-bridge block kept resurfacing as a dirty working tree. `run.sh setup` now injects only the agent-config keyset via a new `merge_settings` helper (`jq` `existing * fragment` — recursive object merge, array replace, legacy symlink auto-dereferenced, atomic write, idempotent). The former `claude/settings.json` is renamed to `claude/settings.fragment.json` and carries agent-config keys only. Server devices have no meta-bridge, so they stay a single-owner symlink to `claude/settings.server.json`.

* **`permissions.allow`/`deny` ceded to pi-shell-acp as single owner.** Both repos previously set the same permission arrays; the values happened to be identical, masking a keyset-owner violation that would have drifted the moment either side added one entry (the other's setup would array-replace it back). The fragment is now fully disjoint from pi-shell-acp's owned keyset (SSOT: `~/.claude/pi-shell-acp.install-state.json`) — agent-config sets only `hooks` / `language` / 개인취향 scalars (`editorMode`, `preferredNotifChannel`, `agentPushNotifEnabled`, `effortLevel`, `voiceEnabled`, `autoUpdates`) / `enabledPlugins.*@claude-plugins-official`. single-driver tool-limit policy (permissions + B-lite scalars + `statusLine` + meta wiring) is pi-shell-acp's to own and verify via its install/uninstall/doctor.

* **Entwurf coexistence docs reframed around the garden id as the single universal address.** `AGENTS.md` and `home/AGENTS.md` no longer carry a replyable/non-replyable split by backend. Every native session (pi / ACP / Claude Code / Codex / Gemini / Antigravity) becomes a garden citizen via the meta-bridge `SessionStart` hook — a meta-record + mailbox keyed by a garden id, the one address layer above every backend. Cross-session `entwurf_send`/receive runs host-to-host by garden id (doorbell → `entwurf_inbox_read`) with no pi or ACP required on either side; verified by a live host-to-host round-trip. The "Asymmetric Mitsein" sections become "Mitsein (garden-id)".

* **Added the `agent-config` 담당자 skill.** Operating-surface knowledge for spreading skills/identity/alignment across every harness (pi / pi-shell-acp Claude / Claude Code / OpenCode / Codex / Gemini / Antigravity) — the shovel knowledge `AGENTS.md` and `run.sh` do not hold (new-device setup, "my skill isn't showing", `.bak` traps, binary-from-sibling-repo pattern, git-hooks safety wall). Shared to pi via `.pi/settings.json`.

* **`entwurf-peek` now does garden-native session discovery** aligned with pi-shell-acp 0.9.0, and drops the dead `entwurf-`/`delegate-` id-prefix strip.

* **`slack-latest` gained bot-aware channel history.**

* **`forge` skill docs** — documented `git-credential-forge` install, added `close`/`reopen` to the verb table, and noted that `bin/forge` self-sources `~/.env.local`.

* **Fix — `git-hooks` scans only new-to-remote commits on a new-ref push,** instead of treating an entire new branch's history as freshly "added" lines.

## v2026.6.1 — Antigravity·Codex에도 같은 다리를 놓다

* **Claude Code direct surface now carries pi-style emacs keybindings.** `claude/keybindings.json` mirrors the gaps `pi/keybindings.json` covers that Claude Code actually exposes as configurable actions: `shift+enter` → newline and `ctrl+/` → undo in the Chat context, plus `ctrl+n`/`ctrl+p` → autocomplete next/previous alongside the existing `alt+j`/`alt+k`. The remaining emacs motions (`ctrl+a/e/b/f/k/u/w/d`, word/line ops, yank) are already built into Claude Code's readline-style input and are not re-exposed as rebindable actions, so only the deltas are added here.

* **Dropped the disabled `atlassian` Claude plugin from the managed set.** It was installed at `local` scope (projectPath `/home/junghan`) while `enabledPlugins` carried it as `false`, which left `/plugin` reporting "enabled in project settings but isn't installed here" and made the TUI/CLI uninstall fail with a scope mismatch (project/user said "use local", local said "not installed"). Resolved by running `claude plugin uninstall atlassian@claude-plugins-official --scope local` from the `/home/junghan` project dir, dropping the stale `enabledPlugins` line in `claude/settings.json`, removing the two `disabledMcpServers` references in `~/.claude.json`, and deleting the plugin cache. Company Jira stays on the `jiracli` skill, so no capability is lost.

* **Antigravity direct harness surface is now wired alongside Gemini legacy.** `run.sh setup` now links the shared skills SSOT into `~/.gemini/antigravity-cli/skills/`, manages repo-owned direct-harness settings via `antigravity/settings.json` → `~/.gemini/antigravity-cli/settings.json` (including the custom statusline script path), and manages a dedicated MCP profile for `agy` direct mode via `antigravity/mcp_config*.json` → `~/.gemini/antigravity-cli/mcp_config.json`. Because the current live binary still probes `~/.gemini/config/mcp_config.json` during MCP discovery/migration, setup also points that runtime-compat path at the same SSOT. Consumer effect: Antigravity direct mode now participates in this repo's multi-harness surface with the same skill set and `pi-tools-bridge` MCP entry, without waiting on any hypothetical ACP-carrier support from `agy` itself. The older `~/.gemini/settings.json` / `~/.gemini/skills/` Gemini CLI path remains in place as a legacy lane during the migration window.

* **Codex direct mode now has the same bridge dignity.** `codex/config.toml` now includes a repo-managed `pi-tools-bridge` stdio MCP registration, closing the last obvious direct-harness asymmetry after Antigravity was wired. Local verification: `codex doctor` now reports `MCP servers 1` and `codex mcp list` shows `pi-tools-bridge` enabled.

* **Selected command prompts now have skill-form wrappers for harnesses without native command-file surfaces.** First prototypes landed as `skills/command-recall/` and `skills/command-glgimage/`. This keeps `commands/` as the canonical SSOT for pi / Claude while giving Antigravity and Codex a path to use the same rituals through skills instead of duplicating a second prompt system. `glg-image` is intentionally routed to prefer native image generation on subscription-backed harnesses when available.

* **Global commit/push safety rail — identity terms + secrets.** New SSOT at `git-hooks/` wired via `core.hooksPath` (set in nixos-config `users/junghan/modules/shell.nix`, immediate activation via `./run.sh setup:git-hooks` which writes the same value to `~/.gitconfig`). On every `git commit` / `git push`, the hook scans **added lines** in the diff (gitleaks-style, pre-existing content grandfathered) and **blocks** when it sees identity terms (real names, company terms, GitHub handle variants `hejdev[0-9]*`) in public repos under `github.com/junghan0611/*` or `github.com/junghanacs/*`, or secrets (Anthropic/OpenAI/Google/Groq/HuggingFace/GitHub/Slack/Telegram/Discord keys, AWS IDs, PEM private keys) in any repo. Mode auto-detected from `origin` URL; per-repo override `<repo>/.git-hooks-mode` (`strict|loose|off`). After scanning, the hook chains to repo-local `.git/hooks/<name>` or `.husky/<name>` so husky-using repos keep working. Bypass `AGENT_ALLOW_UNSAFE_COMMIT=1` is **GLG-only**; the agent rule is documented in `~/AGENTS.md § Global Commit/Push Safety Rail`. `gitleaks` is added to `users/junghan/modules/development/default.nix` for real secret detection; if missing, the hook falls back to a small built-in pattern set covering the most dangerous key shapes. This closes the recurring "agent committed a real name / company term to a public repo, now we need `git push --force` to repair" failure mode that motivated `notes/change-text.sh` and `notes/.gitleaks.toml` and generalizes the protection to every repo on the machine. The rail is explicitly forward-only — what is already in tracked history is grandfathered and not chased.

* **Removed dead `--session-control` extension and its `send_to_session` / `list_sessions` tools** (`pi-extensions/control.ts`, 1,809 lines). Background: the extension predates pi-shell-acp's `entwurf-control.ts` (`~/.pi/entwurf-control/` socket + `--entwurf-control` flag, `entwurf_send` / `entwurf_peers` tools) and was kept around historically (CHANGELOG `0.4.x` § "intentionally retains its alias surface") as an `~/.pi/session-control/` socket variant. In practice the socket dir was empty across devices, no external consumer referenced it (doomemacs-config, pi-shell-acp, pi-tools-bridge, mcp/session-bridge all grep clean), and because `package.json` § `pi.extensions: ["./pi-extensions"]` autoloads the whole directory the dead extension still injected `send_to_session` / `list_sessions` into every LLM's tool schema — which is how those names kept showing up as confused stand-ins for `entwurf_send` / `entwurf_peers` in live sessions. Removing the file removes the schema, which removes the confusion. Independent of pi-shell-acp's `entwurf-control.ts` (separate socket + flag, untouched). README's `pi --session-control` shell alias and the now-redundant "Naming rule" guidance in `AGENTS.md` / `home/AGENTS.md` are dropped in the same commit. The `~/.pi/session-control/` empty dir is rmdir'd locally — other devices will simply stop creating it.

* **Oracle/OpenClaw prerelease install path now tracks pi-shell-acp latest `main`.** Server-mode `pi/settings.server.json` now installs `git:github.com/junghan0611/pi-shell-acp` without the `@v0.5.0` tag, and `run.sh setup` force-refreshes the pi-managed checkout to `origin/main` before running `pnpm install`. This is intentional only for the 0.6.0 prerelease / Oracle validation window: OpenClaw plugin commits live after the v0.5.0 release while upstream `package.json#version` still reads `0.5.0`, so git commit is the authority. Restore tagged mode when the next stable pi-shell-acp release lands.

## 0.5.0

* Pinned pi-shell-acp to `v0.5.0` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`). This is the largest single bump of the 0.4.x → 0.5.0 transition: the upstream release contains both the **session model lock** (anchored sessions refuse mid-life model switches) and the **0.5.0 declaration that the bridge does not implement compaction** (backend-native compaction is now always allowed, pi-side compaction blocked by default, legacy `PI_SHELL_ACP_ALLOW_COMPACTION=1` fail-fast at spawn intent). Full upstream changelog: <https://github.com/junghan0611/pi-shell-acp/releases/tag/v0.5.0>.
* **Session model lock — consumer posture** (upstream two-layer guard: `pi-extensions/model-lock.ts` + `ensureBridgeSession`). Once a pi-shell-acp session is *anchored* (`agent_start`, resume/fork, reload with messages, or startup with existing messages), any model switch that touches the pi-shell-acp provider is reverted by the extension and refused at the bridge with `ModelSwitchLockedError` carrying `outcome=locked`. Pre-anchor selection — CLI `--model`, pre-turn model selector, fresh new sessions before the first prompt — remains free. Resume/fork lock immediately. Native-to-native is unaffected. **Consumer impact**: the previous "switch model mid-session and the bridge silently respawns" behavior is gone — operators (and our slash commands) must now open a new pi session for a different model once the session is anchored. The `model_change` line in pi JSONL may show the attempted `X → Y → X` revert pattern; this is the extension-side revert and is transcript-dirty by design (upstream notes that a fully transcript-clean refusal would need a pi-core preflight hook that pi-shell-acp intentionally does not patch). Tooling that grepped for `outcome=respawn` must look for `outcome=locked` instead; the legacy value is gone and any fresh occurrence is a regression signal.
* **Bridge compaction policy declaration — consumer posture.** The 0.4.x debt where the bridge shipped `DISABLE_AUTO_COMPACT=1` / `DISABLE_COMPACT=1` (Claude) and `-c model_auto_compact_token_limit=9223372036854775807` (Codex) at spawn time is paid back. As of 0.5.0 the bridge ships **no** backend-side compaction knobs and surfaces no backend-specific compaction names; ACP backends compact natively and the pi session survives that. Two consumer-visible knobs:
  * `PI_SHELL_ACP_ALLOW_PI_COMPACTION=1` — opt back into pi-side compaction (default: blocked, because pi-side summary does not reduce the backend transcript and silently desynchronizes pi JSONL from the backend's persisted state).
  * `PI_SHELL_ACP_ALLOW_COMPACTION=1` — legacy single knob, **fail-fast at spawn intent**. The error message names the new key, so an old `.envrc` will surface loudly rather than silently bypassing the new policy.
  Operationally this means: GLG-direct `/compact` on a pi-shell-acp session is a no-op-with-message by default and we accept that; if a specific backend's auto-compaction needs altering, configure that backend through its own native interface — we do not surface backend-specific knobs in this repo's docs/skills either, matching the upstream maintainer-cleanup thesis (knowing the names is itself an inconsistency with the bridge boundary; the upstream CHANGELOG is the restoration source if we ever need to reintroduce per-backend guard awareness for a regression test). Verified end-to-end upstream against Claude Sonnet (organic + explicit `/compact`) and Codex GPT-5.4 (cheap lowered-threshold stand-in + real 244k → 84k native-window saturation, sentinel preserved). Gemini axis closed as an *honest ACP asymmetry, not a pass* — native Gemini CLI has `/compress` (alias `/compact`, `/summarize`) but Gemini ACP does not register it; organic `ChatCompressed` events are dropped silently by the ACP session switch and pressure ultimately surfaces as `stopReason: 'max_tokens'`. Operator-facing UX at `max_tokens`: "Gemini ACP reached context pressure; native CLI has `/compress` but ACP does not expose it here. Start a fresh session or reduce context."
* **`/recap` upgrade — multi-axis context hydration.** `commands/recap.md` is no longer a thin previous-session helper. It now drives `session-recap` → semantic-memory two-step (meta query → extracted-terms query) → `knowledge_search` (md axis) → `day-query` → journal `§` / llmlog markers, and forces the answer to declare which axes were seen and which were not, under the no-compact / no-raw-JSONL token discipline. `skills/session-recap/SKILL.md` is reframed as the low-level extractor and points multi-axis recall to `/recap`. The 2026-05-08 derivation history (v1 → 2026-04-28 agent-recall / prompt-spine note → 2026-05-03 split candidate → v2 multi-axis recall) and the raw evidence log (`session-recap` agent-config / pi-shell-acp, semantic-memory two-step, `knowledge_search`, `gitcli day --summary`, `denotecli day`, `lifetract`, calendar) live as a Denote llmlog note (`~/org/llmlog/20260508T090911--recap-v2-다축-맥락-복원-codex-가-남긴-raw-evidence__agent_llmlog_memory_recap_session.org`), not as an in-repo `docs/` file — recap is a resident-side memory workflow; this repo carries the command and the skill, not the working evidence.
* **Slash commands wired across surfaces.** `/recap`, `/boom`, `/scaleplay`, … are now installed into Claude Code direct mode (`~/.claude/commands/`) and the Claude plugin namespace (`~/.pi/agent/claude-plugin/commands/`), in addition to the existing pi-prompts surface (`~/.pi/agent/prompts/`). Codex and Gemini are intentionally omitted — Codex has no user-defined slash surface, Gemini would require a `.toml` format conversion. Verified the pi-prompts route end-to-end during /recap v2 work (multi-axis recall ran without a single raw JSONL read).
* **`semantic-memory` SKILL.md exposed on every surface, including pi-native.** `run.sh` no longer skips it via `PI_SKIP_SKILLS`. The andenken extension's `session_search` / `knowledge_search` registerTool is preserved on pi as a shortcut surface — same SSOT, two call shapes by design. Removes a long-standing surface asymmetry where pi-native callers couldn't reach a skill named `semantic-memory` even though every other backend could. Paired with this, `commands/recap.md` § Step 3 is rewritten capability-first: instead of naming a backend-specific tool (`session_search`), it lists the canonical skill name and a small surface-mapping table so any backend can pick the surface its schema actually exposes — stops the "tool name not in schema → silent workaround" failure mode that surfaced when Claude under pi-shell-acp tried to follow the old text literally.
* **`session-recap.py` `--chars` flag now honored.** Text output was hard-coded to a 200-char truncation regardless of the flag; the bug is fixed and `--chars` is the single knob now.
* **Runtime preference tuning.** `pi/settings.json`: `defaultModel` settled to `claude-sonnet-4-6` and `defaultThinkingLevel` settled to `medium` for the average session — opus/high stays reachable per turn when a heavier model is justified. `lastChangelogVersion` bumped to `0.74.0` earlier in the cycle. `codex/config.toml`: default model bumped `gpt-5.4 → gpt-5.5`, reasoning effort `high → medium`, and `~/repos/work/voscli` added to trusted projects. `claude/settings.json`: `model` field moved to the bottom of the JSON for consistent top-level ordering; value unchanged (still `opus`). These are runtime preferences, not bridge contract changes; recorded here so the cycle is auditable rather than landing as drive-by config drift.
* **`skills/voscli` rolled to v0.4b** — categorical anomaly (per-product/topic/joint + zero-baseline spikes + operating-hours-only scope) layered on top of v0.4a daily-totals anomaly (modified z-score). Surface change only; domain logic lives in `~/repos/work/voscli`.

## 0.4.17

* Pinned pi-shell-acp to `v0.4.17` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* **Transcript-poison bridge mapping is now invalidated** (upstream [#12](https://github.com/junghan0611/pi-shell-acp/issues/12)). When a resumed/loaded session's prompt fails with an Anthropic transcript-validity 400 — the `cache_control cannot be set for empty text blocks` / `text content blocks must be non-empty` family — the persisted `pi:<sessionId>` → `acpSessionId` mapping is dropped before the next bootstrap. The poison failure is surfaced through `[pi-shell-acp:prompt-error] reason=transcript_poison`, and the subsequent bootstrap — even within the same CLI invocation — takes `path=new` instead of replaying the poisoned `acpSessionId`. Consumer impact: a session that hit the empty-text-block trap during a long-running 4-step delegate cycle (Understanding → Review → Execution → Final Review) no longer gets permanently wedged on the bridge side; the existing `resume → load → new` ladder recovers cleanly without a manual `pi:<sessionId>` purge. The bridge does not force a same-turn retry of its own — recovery is just the next prompt, which is the agent-config-preferred shape (no implicit retries, no silent fallbacks).
* **Cold `entwurf_resume` now treats the saved session header cwd as authority** (upstream cwd-authority portion of [#10](https://github.com/junghan0611/pi-shell-acp/issues/10)). Both `runEntwurfResumeSync` and the async `entwurf_resume` path fail fast when neither the saved header cwd nor an explicit `options.cwd` override is available, instead of silently falling back to the resumer's `process.cwd()`. This closes the cold-resume seam that 0.4.16 left open after fixing the same-process resume seam — together they remove the last hydration-loss path that the original [#9](https://github.com/junghan0611/pi-shell-acp/issues/9) report surfaced. Consumer impact for agent-config's cross-cwd Cross-Repo Work Loop: a resume issued from agent-config that targets a sibling sitting in `~/repos/gh/<other-repo>` will keep that sibling pinned to its original cwd unless we explicitly hand it a new cwd, so the responsibility chain (agent-config caller × delegate repo cwd) is structurally preserved rather than relying on the caller to remember to pass `cwd:`. The MCP/native `entwurf_resume` tool descriptions and `EntwurfResumeOptions.cwd` doc-comments are updated upstream to call out header-cwd authority explicitly; the explicit `cwd` override remains as a debug/migration escape hatch that may forfeit backend continuity, which is the right shape for our policy. The broader ontology RFC (peer handle, `contact_peer` verb, registry) stays parked — no consumer follow-up here beyond watching for cold-resume failures that now surface loudly instead of silently fanning out to the wrong cwd.

## 0.4.16

* Pinned pi-shell-acp to `v0.4.16` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* **`entwurf_resume` cross-cwd hydration restored** (upstream [#9](https://github.com/junghan0611/pi-shell-acp/issues/9)). When the resume child spawns without an explicit cwd override, it now starts from the saved session header cwd and preserves the existing `pi:<sessionId>` → `acpSessionId` bridge record. Previously the ACP-routed resume could silently fall back to `newSession` and lose prior-turn memory. Consumer impact: agent-config's resume-driven 4-step delegate flow (Understanding → Review → Execution → Final Review) across distinct repo cwds is now reliable end-to-end. The same-session doomemacs-config delegate that ran during this consumer cycle (`task 5c92489e`: Step 1 in doomemacs-config cwd → Step 3 resume from agent-config cwd) exercised exactly this path before the consumer pin moved.
* **`verify-resume` Phase 2 cross-cwd smoke gate added upstream** (`scripts/cross-cwd-resume-smoke.ts`). Plants a sentinel in a spawned sibling, resumes from a different cwd through the MCP-shaped path, asserts recall, and captures child stderr through `PI_ENTWURF_CHILD_STDERR_LOG`. Upstream coverage only — agent-config does not have to run it — but the gate is what protects the #9 fix from silent regression on future releases.
* **`entwurf` demo GIF landed in upstream README** under `docs/assets/`, covering spawn / MCP `entwurf_resume` recall / live `entwurf_send`. Useful as visible evidence when a new consumer asks "what does the 4-step delegate flow actually look like".
* Upstream typecheck fence widened to a third `scripts/tsconfig.json` pass so strip-types verification scripts with explicit `.ts` imports are typechecked alongside the root and MCP configs. No consumer surface change; recorded here so the next pin sees the green-belt expanded.

## 0.4.15

* Pinned pi-shell-acp to `v0.4.15` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* **0.5.0 direction realigned upstream.** pi-shell-acp's README / AGENTS / NEXT now agree that 0.5.0 is a **compaction guard split / backend-native compaction escape hatch**, not the previously documented "caller-supplied recap hint slot" or "compact → new-session handoff". agent-config's own `/recap` slash-command stays unaffected — that is a consumer-side multi-axis recap workflow, not a bridge-injected hint slot, and it does not depend on the retracted 0.5.0 framing. No CHANGELOG-level retraction needed here because earlier agent-config entries (0.4.6 / 0.4.7) only referenced the prior framing as upstream Roadmap text, never adopted it as a consumer contract.
* **`[entwurf sent →]` is now a first-class UI message on the ACP backends.** Upstream promotes the ACP `entwurf_send` success echo into a real `[entwurf sent →]` rendered message using an Armin-style custom-message + context-filter pattern, instead of leaving it as a tool-result blob. Claude, Codex, and Gemini are covered through their respective ACP payload shapes; MCP sends keep the MCP path and native sends keep native tool rendering. Consumer impact: operator-visible transcripts in pi-shell-acp ACP sessions now show paired `[entwurf received ⟵]` (from 0.4.14) / `[entwurf sent →]` (new in 0.4.15) framing for every cross-session message, with no who-said-what ambiguity. The `wants_reply` etiquette marker and the sender-envelope wiring from 0.4.14 stay as-is.
* **Echo leak into LLM context is closed.** When a pi-shell-acp session is started without `--entwurf-control`, the `[entwurf sent →]` echo previously had a path to leak into the LLM context window of an unrelated session. 0.4.15 prevents that leak; it also avoids the late-Gemini "empty sent box" symptom when the ACP tool arguments cannot be recovered after the fact. Consumer side: no action required — the fix is bridge-internal — but the symptom (random `[entwurf sent →]` blocks appearing in a session that never invoked `entwurf_send`) is the one to look for if anyone reports residue from older runs.
* **`entwurf_send` detection hardened across backends.** Tile titles and permission-result labels for `entwurf_send` differed between Claude / Codex / Gemini. 0.4.15 stops keying off backend-specific optionId substrings and uses ACP option `kind` instead, so the same send produces the same `[entwurf sent →]` render no matter which backend emitted it. Knocks out a class of regressions where one of the three backends would silently render the echo as a plain tool-result instead of the new first-class message.
* **`gpt-5.2` removed from active smoke / sentinel paths upstream.** Upstream now keys smoke and sentinel scripts off `gpt-5.4` everywhere; CHANGELOG / archived BASELINE rows that already reference `5.2` stay as history. agent-config side is already clean (`git grep "gpt-5\.2[^.0-9]?"` returns nothing in active config or skill bodies), so this release does not introduce a follow-up here — the policy-vs-default collapse landed back in 0.4.10.
* **`smoke-gemini` npm script added upstream.** Adds the missing third-backend entry next to the existing `smoke-claude` / `smoke-codex` shortcuts inside the pi-shell-acp dev tree, plus refreshes stale verification comments around triple-backend smoke and typecheck coverage. Consumer side does not run these directly — `./run.sh smoke-gemini /path/to/project` is the consumer-facing entry — but the npm shortcut closes a small dev-experience gap on the bridge side.
* **`session-messaging-smoke.sh` repaired for the 0.4.14 schema.** The 4-case messaging matrix (`mcp`, `slash`, `tool`, `cli`) had drifted out of sync with the 0.4.14 `sessionId`-only addressing + required-sender-envelope contract; 0.4.15 restores it as a self-contained smoke. This is a pi-shell-acp internal verification surface, not a consumer entry, but it's the canonical proof that the four `entwurf_send` invocation paths all converge on the same envelope/render shape.
* Oracle / server-mode consumer path stays the same: bump `PI_SHELL_ACP_VERSION` and run `./run.sh setup`. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) still covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.14

* Pinned pi-shell-acp to `v0.4.14` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* **Surface unification — one MCP server, five tools.** Upstream `v0.4.14` retracts the bundled `session-bridge` server. `pi-shell-acp` now ships only `pi-tools-bridge`, and that server owns the full cross-session surface across Claude, Codex, and Gemini. The bundled tool set is exactly five: `entwurf`, `entwurf_resume`, `entwurf_send`, `entwurf_peers`, `entwurf_self`. This is a release-surface retraction, not a history rewrite — older agent-config docs and CHANGELOG entries that mention the two-server / eight-tool shape stay as evidence of what 0.4.8–0.4.13 actually exposed.
* **`entwurf_self` is the new self-introspection surface.** Returns the active session envelope (`sessionId`, `agentId`, `cwd`, `timestamp`) plus the control-socket path, making a session's own identity objectively checkable through the same MCP surface that messaging uses. Consumer-side note: `home/AGENTS.md § Agent Orchestration` capability table currently lists four entwurf tools — adding the fifth row is a separate surface-doc commit, not bundled into this release pin.
* **Sender-envelope transparency on live peer messaging.** `entwurf_send` now defaults to including the sender envelope on MCP / slash-command / in-process tool paths; the receiver renders who sent the message, from which cwd, and when. `agentId` is single-field (`pi-shell-acp/<model>`) — school × model is one identity. Receiver/sender direction is visually unambiguous: `[entwurf received ⟵]` vs `[entwurf sent →]`. Startup one-shot CLI keeps sender info opt-in (`--entwurf-send-include-sender-info`) — short-lived sender processes do not advertise a reply path they cannot honor.
* **Structural `PI_SESSION_ID` / `PI_AGENT_ID` MCP env wiring.** Closes the live ACP failure where Codex/Gemini MCP children were not guaranteed to inherit the session envelope unless the env array was populated explicitly. The sender envelope no longer depends on ambient `process.env` timing — `index.ts` forwards `options.sessionId` structurally, `acp-bridge.ts` injects both env vars into the backend child and the `pi-tools-bridge` stdio MCP entry via `enrichMcpServersWithEnvelope()`.
* **`wants_reply` etiquette marker (was `reply_requested`).** Renamed and re-scoped from a transport contract into a human-conversation etiquette marker — no wait, no polling, no delivery tracking. Default flipped from `true` to `false`: most peer messages (notifications, handoff packets, status pings) leave it unset, and the receiver render shows the `(wants reply)` badge only when the sender explicitly opts in. `parseSenderInfo` keeps a legacy `reply_requested` fallback so pre-rename transcripts still render correctly. The receiving model is no longer told it is "obliged" to ack — that wording recreated a topology gate the carrier paragraph split in `pi-context-augment.ts` removed.
* **No topology gate in carrier — coordinated with `home/AGENTS.md`.** A topology fault in the previous session traced to the carrier prompt teaching three validation gates (GLG-vs-sibling identification, ownership transfer check, reroute procedure) before a receiver could execute. Upstream `pi-context-augment.ts:78` is now a single gate-free statement; agent-config's `home/AGENTS.md § Agent Orchestration` replaced its `Topology — GLG addressing assigns ownership` three-rule section with `No topology — transport- and source-agnostic execution` (one paragraph). The same conclusion now reaches every ACP session from two angles — global carrier (transport-neutral) and home-prepended AGENTS.md (consumer-side restated). A task is a task: execute what you receive regardless of transport (spawn/resume/send) or source (GLG or sibling). The only thing not done unilaterally is **forward** — escalate to GLG instead of pushing to a sibling.
* **Install/remove migration handles legacy `session-bridge` entries.** Upstream `./run.sh install` now writes only `pi-tools-bridge` and prunes the legacy bundled `session-bridge` entry from older installs when it matches the repo-managed launcher path. `pi/settings.reference.json` lists only `pi-tools-bridge`; the Gemini overlay's MCP allowlist narrows correspondingly to `mcp.allowed:["pi-tools-bridge"]`. Consumer-side: agent-config's `pi/settings.server.json` carries no `session-bridge` entry (verified — only `pi-tools-bridge` MCP server is configured), so the migration is a no-op here, but oracle / older devices that still hold a stale entry from earlier install runs will see it pruned automatically on next `./run.sh setup`.
* **Model-switch reuse path now respawns.** Reuse-path model mismatch no longer attempts in-place `unstable_setSessionModel`. Doing so would leave the already-spawned MCP child broadcasting stale `PI_AGENT_ID`. 0.4.14 therefore requires `path=reuse outcome=respawn fallback=new_session reason=pi_agent_id_env_requires_respawn`, followed by a fresh bridge spawn. Bootstrap enforcement after a fresh spawn is unchanged. Consumer-facing impact: model swaps inside a saved session now incur a respawn cost rather than silently propagating a stale identity to the bridge — the right tradeoff (correctness over speed) for an identity-bearing surface.
* Oracle / server-mode consumer path stays the same: bump `PI_SHELL_ACP_VERSION` and run `./run.sh setup`. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) still covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.13

* Pinned pi-shell-acp to `v0.4.13` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* Upstream `v0.4.13` formalizes the Claude `skillPlugins` install surface: malformed plugin roots now fail fast at settings parse time, `README` gains a first-class `Custom Skills` section plus a self-contained `pi/skill-plugin-example/`, and the reference-consumer link no longer routes careful readers into agent-config's `~/.pi/agent/claude-plugin/` layout as if it were a bridge contract.
* agent-config follows that ownership correction by lowering its own tone around the local Claude plugin farm: this repo now describes `~/.pi/agent/claude-plugin/` as **our** operating layout built by `run.sh setup`, while upstream pi-shell-acp remains the authority for plugin shape, install guidance, and fail-fast validation.
* Oracle / server-mode consumer path stays the same: bump `PI_SHELL_ACP_VERSION` and run `./run.sh setup`. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) still covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.12

* Pinned pi-shell-acp to `v0.4.12` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* v0.4.12 fixes the **Entwurf registry recovery** regression that surfaced on oracle: `loadEntwurfTargets()` is no longer poisoned by a cached `EntwurfRegistryError` after the first missing/stale-registry failure. Registry caching is now positive-only with `mtime`-based invalidation, so repairing `~/.pi/agent/entwurf-targets.json` takes effect on the next call without restarting the running Gemini/MCP process.
* Upstream install policy for `~/.pi/agent/entwurf-targets.json` is now fail-fast instead of silently preserving drift. A stale regular file or wrong symlink now stops `install` / `setup` with an explicit repair path (`./run.sh setup:links --force` or `PI_ENTWURF_TARGETS_PATH=...`) instead of letting the breakage leak later as a sentinel or live `entwurf` failure.
* `./run.sh setup:links [--force]` now exists upstream as a focused repair path for the target registry. This closes the previous guidance gap where the `EntwurfRegistryError` told operators to run `setup:links` even though that subcommand did not exist on the pi-shell-acp side.
* Consumer-side note: agent-config's own `run.sh` already relinks `~/.pi/agent/entwurf-targets.json` to the installed package registry during setup (commit `d9b518a`). With v0.4.12 upstream, the resident-side relink and the bridge-side fail-fast / recovery semantics now align, so the oracle class of drift should be caught earlier and recover cleanly if repaired in-session.

## 0.4.11

* Pinned pi-shell-acp to `v0.4.11` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* v0.4.11 restores **Gemini capability parity** on the ACP bridge surface: operator skills are visible again (`activate_skill` reopened, `skills.enabled: true`, `skills` passthrough restored), Gemini now advertises the same `mcp_pi-tools-bridge_*` / `mcp_session-bridge_*` callable schema entries as Claude and Codex, and invocation no longer dies at a generic admin-policy deny for bridge tools.
* The earlier "Gemini MCP function-schema advertise asymmetry" framing from 0.4.8 / 0.4.9 is retracted. The gap was not an unavoidable upstream Gemini property — it was overlay-induced on the bridge side (policy + settings + skill closure too tight). This matters on the consumer side because our capability-first docs (`~/AGENTS.md`, skill plugin farm, semantic-memory / entwurf guidance) can again describe Gemini as participating in the same skill/MCP dignity surface as the other ACP backends, with the remaining isolation boundary focused on operator memory/settings rather than tool visibility.
* Upstream verification widened accordingly: `check-bridge` now includes a Gemini line and validates both visibility and real `entwurf_send` invocation, while `check-backends` adds assertions for the reopened skills passthrough and the removal of the decorative `mcp.excluded:["*"]` entry. This closes the earlier evidence gap where Gemini regressions could ship without the standard bridge parity gate catching them.
* Oracle / server-mode consumer path stays the same: bump `PI_SHELL_ACP_VERSION` and run `./run.sh setup`. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) still covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.10

* Pinned pi-shell-acp to `v0.4.10` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* **Gemini curated surface narrowed to `gemini-3.1-pro-preview` only.** `gemini-3-flash-preview` is dropped from the curated ACP-routed entwurf target. 3.1 Pro is the subscription-backed high-quality Gemini ACP route — same path as before (gemini CLI binary as the ACP server), better self-reporting (Pro correctly reports Gemini's MCP asymmetry — MCP servers are not registered as model-visible function-schema entries, model routes through `run_shell_command`). Flash had hallucinated MCP tool visibility in baseline tests; Pro does not. The agent-config-side `skills/summarize/` openrouter route (`openrouter/google/gemini-3-flash-preview`) is unaffected — that's a different surface (cheap long-context summarization via openrouter, not pi-shell-acp ACP).
* **Codex entwurf target narrowed to `gpt-5.4` + `gpt-5.5` only.** Registry drops `gpt-5.2` (deprecated, near-retirement) and `gpt-5.4-mini` on both the native `openai-codex` and ACP-routed `pi-shell-acp` paths. `DEFAULT_ENTWURF_MODEL` upstream moved from `openai-codex/gpt-5.2` to `openai-codex/gpt-5.4`, so callers omitting the model field now land on the current preferred model instead of the deprecated default. This collapses the previous policy/code drift (resident `~/AGENTS.md` had instructed agents to pass `gpt-5.4` explicitly because the upstream default was still `5.2`) — the natural no-model default now matches policy. As a result, the `~/AGENTS.md § Entwurf model operating rule` block (5.4 instruction + 5.2 caution) is removed; the registry + upstream default are now the SSOT. `~/AGENTS.md § Model resolution` (still pointing at `pi/entwurf-targets.json` as SSOT) stays.
* **`/make-release` slash command hardened.** Step 4 release-note extraction switched from a fragile awk range expression to a small Python block keyed by `VERSION="$ARGUMENTS"`. Earlier slash-command release runs intermittently produced empty `--notes-file` output even with a valid `## <version> — YYYY-MM-DD` section; the Python rewrite makes the extraction deterministic. Consumer side (this repo) is unaffected — release process lives in pi-shell-acp's `.pi/prompts/make-release.md`.
* Oracle baseline test (taken right after v0.4.9 receive, validates v0.4.10 surface assumptions): four backends — Sonnet 4.6 / Codex gpt-5.4 / Gemini Flash / Gemini Pro 3.1 — answered the same Q-B0 / Q-B0-CARRIER / Q-L1 / Q-L3 probe. All four correctly identified their backend, native-tool surface, and MCP routing. The L4 carrier `GEMINI_SYSTEM_MD_CANARY_PISHELLACP_V1` appeared only on the Gemini sessions (per design — the canary name itself declares the backend). No `denied by admin policy` false positives on Claude / Codex when probing Gemini-named tools (`read_file` / `list_directory` / `glob` / `grep_search` are absent from those backends' schemas, not policy-blocked). Pro's self-report — "MCP/custom 도구들이 단 하나도 포함되어 있지 않습니다 ... 문서에 적혀 있다고 해서 도구가 존재하는 척(환각)하지 않습니다" — is the live evidence backing the 0.4.8 documented Gemini MCP asymmetry.
* **Known issue (Gemini × NixOS, not closable from agent-config side)**: Gemini's native `read_file` rejects NixOS home-manager symlinks with `Path not in workspace: ... resolves outside the allowed workspace directories`. Cause: home-manager dotfiles (`~/.bashrc`, `~/.gnupg/*.conf`, `~/.gtkrc-2.0`, most `~/.config/*`, etc. — 15+ at depth 2 alone) are symlinks to `/nix/store/...`, and Gemini CLI's path validator resolves the symlink before checking the workspace allowlist. Affects every NixOS device. Workaround: route through `run_shell_command "cat <path>"` instead of `read_file` (no symlink resolution). Fix candidate lives upstream in pi-shell-acp's gemini overlay (potentially adding `/nix/store/` to allowed dirs or disabling follow-symlinks); tracked separately, not blocking this release.
* Oracle / server-mode consumer path: `PI_SHELL_ACP_VERSION` bump + `./run.sh setup` continues to be sufficient. The same direct-git fallback (`git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install`) covers the case where `pi install` reports success without refreshing the working tree.

## 0.4.9

* Pinned pi-shell-acp to `v0.4.9` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`).
* v0.4.9 closes the **L5 — Memory containment** layer on the Gemini backend, the sixth and final channel of the surface-isolation matrix that 0.4.8 opened. pi-shell-acp is the canonical memory authority on the pi side (semantic-memory + Denote llmlog); no backend may run a parallel memory layer that survives across sessions. Claude (`CLAUDE_CONFIG_DIR` + `disallowedTools` + `skillPlugins:[]`) and Codex (`-c memories.{generate,use}_memories=false` + `history.persistence="none"` + `features.memories=false`) already enforce this — Gemini now matches.
  - `experimental.memoryV2:false` + `experimental.autoMemory:false` pinned in overlay `settings.json` (defense in depth — `GEMINI_SYSTEM_MD` already replaces the prompt body, but the explicit pin holds even if the override path ever breaks). Overlay closure widens 14 → 16 keys.
  - `<configDir>/{tmp,history,projects}/` swept at every spawn — any `tmp/<slug>/memory/MEMORY.md`, autoMemory inbox `.patch`, command history, or per-project content from a previous gemini session does not carry. Constant renamed `GEMINI_OVERLAY_EMPTY_DIRS` → `GEMINI_OVERLAY_SWEPT_DIRS` to reflect the stronger contract. Operator's native `~/.gemini/projects.json` continues to never flow through.
  - Root-level `<configDir>/GEMINI.md` and `<configDir>/MEMORY.md` swept by the existing stale-entry cleanup. Within-session `write_file` calls can still create them, but they cannot survive into the next session.
  - `check-backends` 124 → 134 assertions (memoryV2 / autoMemory keys + L5 sweep behaviour for pre-seeded files + engraving substitution defuse).
* **Engraving substitution defuse (gemini)**: recent gemini-cli walks the `GEMINI_SYSTEM_MD` override and rewrites `${AgentSkills}`, `${SubAgents}`, `${AvailableTools}`, and `${<toolName>_ToolName}` with runtime values. Same engravings land verbatim on Claude (`_meta.systemPrompt`) and Codex (`-c developer_instructions`), so any `${...}` literal inside an engraving (e.g. a shell example) was silently mutating Gemini-only. `defuseGeminiSubstitutions` slides the `$` and `{` apart with a zero-width space (U+200B) before writing `system.md` — every substitution regex misses, model still reads the same visual string. Restores cross-backend invariant that the same engraving is not interpolated differently per backend.
* **Backend dependency bumps**:
  - `@agentclientprotocol/claude-agent-acp` 0.31.4 → 0.32.0 (SDK pin stays at `0.21.0`, transitive `@anthropic-ai/claude-agent-sdk` 0.2.121 → 0.2.126). `_meta._claude/origin` may now appear on `usage_update` notifications for task-notification followups (autonomous work triggered by a system message rather than the user prompt) — bridge passes through unchanged.
  - `@zed-industries/codex-acp` 0.12.0 → 0.13.0 (Codex 0.124 → 0.128.0). codex-acp internals shifted to async `AuthManager` + `EnvironmentManager`; new `ThreadGoalUpdated` event is emitted as plain agent text. Mode IDs (`read-only` / `auto` / `full-access`) and `-c features.<key>=false` gating surface unchanged.
  - devDeps `@mariozechner/pi-{ai,coding-agent,tui}` 0.70.2 → 0.73.0. pi-mono 0.71.0 removed the built-in `gemini-cli` *provider*, not the `google` API source — `getModels("google")` still ships `gemini-3-flash-preview`, so `check-models` assertions hold.
* **Release process upgrade**: pi-shell-acp moved to a self-contained `/make-release <version>` slash command at `pi-shell-acp/.pi/prompts/make-release.md`, replacing the old `scripts/release.sh` + `--notes-from-tag` pattern that produced empty release bodies for v0.4.7 / v0.4.6 / v0.4.1 / v0.3.x. New flow: pre-flight gates (argument shape, working tree clean, tag-not-exist local+remote, CHANGELOG section present, package.json version match, `pnpm check`, gh auth target consistency, `git push --dry-run`) → tag → push → `pi:release:<repo>` agenda stamp pointing at `releases/tag/v<version>` → Python-based CHANGELOG section extraction → `gh release create --title "v<version>"` (title is fixed; theme lives in body's first H3) → `gh release view` verify → Google Chat notify → `/tmp` cleanup. Each bash block re-derives its variables (slash command shells are not guaranteed to share state). Consumer side (this repo) is unaffected — release process lives in pi-shell-acp.
* Oracle / server-mode consumer path: bumping `PI_SHELL_ACP_VERSION` and running `./run.sh setup` is sufficient. `setup_npm()` reads installed `package.json#version` and force-upgrades on drift, with the `git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install` fallback if `pi install` reports success without refreshing the working tree.

## 0.4.8

* Pinned pi-shell-acp to `v0.4.8` in the consumer install path (`package.json` + `pi/settings.server.json` + `run.sh`). 0.4.7 is folded into this bump — its single feature (`--emacs-agent-socket` / `PI_EMACS_AGENT_SOCKET`) was already adopted on the resident side, so agent-config jumps `0.4.6 → 0.4.8`.
* v0.4.8 adds **Gemini CLI (`gemini --acp`) as a third ACP backend.** The bridge picks Gemini back up after pi-mono v0.71.0 dropped its built-in Google provider. Operators can now set `backend: "gemini"` in `piShellAcpProvider` or pick `pi-shell-acp/gemini-3-flash-preview` (curated, registered in entwurf-targets with `explicitOnly: true`). Default agent-config settings stay on Claude — Gemini is opt-in per session.
* **Gemini surface isolation closed on five channels** (2026-05-03 baseline): native system body via `GEMINI_SYSTEM_MD = <overlay-home>/.gemini/system.md`, operator memory path via `GEMINI_CLI_HOME`, tool surface via `tools.core` 7-name allow + `--admin-policy` deny-all (defense in depth at registry and policy layers), `GEMINI.md` hierarchical discovery suppressed via sentinel `context.fileName` + `memoryBoundaryMarkers:[]`, MCP whitelist via `mcp.allowed: [pi-tools-bridge, session-bridge]` + `excluded:["*"]`. Carrier appends `GEMINI_SYSTEM_MD_CANARY_PISHELLACP_V1` for baseline operator verification.
* **Documented Gemini asymmetry**: Gemini ACP accepts MCP servers via `mcpServers` but does **not** register them as model-visible function-schema entries the way Claude and Codex do — the model routes MCP calls through `run_shell_command` instead. Operators on the gemini backend should not expect entwurf / semantic-memory tools to appear as `mcp__<server>__<tool>` function entries. This is a Gemini ACP surface property, not closable from the bridge overlay.
* 0.4.7 (folded in) added `--emacs-agent-socket <name>` and `PI_EMACS_AGENT_SOCKET` env propagation, plus folding the socket into the bridge config signature so terminal (`server`) and Emacs-internal (`pi`) sockets don't accidentally cross-contaminate child processes. agent-config's `ec()` helper already honors `PI_EMACS_AGENT_SOCKET` (commit `c743c9d`), so this only changes the upstream surface, not resident behaviour.
* Mitsein cross-reference cleanup landed on the bridge side too: pi-shell-acp/AGENTS.md's "Naming pair" line dropped the now-stale `agent-config/home/MITSEIN.md` link in favor of `defined in the resident's own knowledge base (cwd-scoped, not a global persona)`. The resident-side residency stamp moved to `~/sync/org/MITSEIN.md` in the Mitsein refactor (`f83a48f` / `7965c79` / `d53b37b`). Both sides now agree the persona is cwd-scoped, not global.
* Oracle / server-mode consumer path: bumping `PI_SHELL_ACP_VERSION` and running `./run.sh setup` is sufficient. `setup_npm()` reads installed `package.json#version`, force-upgrades on drift, and falls back to `git fetch --tags && git checkout v${PI_SHELL_ACP_VERSION} && pnpm install` if `pi install` reports success but the working tree didn't refresh. No manual intervention needed on oracle.

## 0.4.6

* Pinned pi-shell-acp to `v0.4.6` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.6 restores Hard Rule #2 (`resume > load > new`) on the resume path. Since SDK 0.20.0 promoted `resumeSession` out of the `unstable_*` namespace, every `unstable_resumeSession` call had been throwing `TypeError`, getting silently caught by the bootstrap fallback, and routing every session to `loadSession` instead — capability check still advertised resume but Hard Rule #2 was quietly violated. Consumer impact: long-running entwurf sessions (especially openclaw-style) now skip the full transcript replay that `loadSession` triggers and that the bridge discards under Hard Rule #8, so resume cost no longer scales with session length.
* SDK pins move forward: `@agentclientprotocol/claude-agent-acp` 0.31.0 → 0.31.4, `@agentclientprotocol/sdk` 0.20.0 → 0.21.0 (with `@anthropic-ai/claude-agent-sdk` 0.2.121 transitive). No consumer surface change — same MCP/tool shape.
* Internal hardening at the bridge that doesn't affect our settings but is worth recording for next-class-of-bug prevention: new static gate `./run.sh check-sdk-surface` (and `pnpm check-sdk-surface`) requires every `(connection as any)` cast in `acp-bridge.ts` to carry an `SDK_CAST_OK` (permanent gap) or `SDK_CAST_DEBT` (tracked) marker, wired into `pnpm check` and the husky pre-commit hook. Root tsconfig also flipped `strict: false → true`, surfacing 23 implicit-any executor callbacks plus one real `RpcResponse | null` narrowing bug that was being hidden. AGENTS.md gets Hard Rule #10 ("SDK surface calls must use the typed connection") so the fix is structural rather than vigilance-based.
* Verification still owed on this pin (not blocking the release): `./run.sh smoke-claude /path/to/project` should show `[pi-shell-acp:bootstrap] path=resume` in stderr where 0.4.5 was emitting `path=load`. Recording here so the evidence-level check doesn't get lost.

## 0.4.5

* Pinned pi-shell-acp to `v0.4.5` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.5 moves the heavy pi / `~/AGENTS.md` / `cwd/AGENTS.md` context off the subscription-sensitive system-prompt carrier and into a one-shot first-user augment, so ACP-backed Claude and Codex sessions regain full resident context without triggering Claude Code's large-custom-system-prompt billing path.
* Entwurf-spawned ACP sessions now keep the home context while de-duplicating project AGENTS that already arrived through `<project-context ...>` injection; consumer-side implication: our 담당자 pattern stays intact without repeating repo context.
* Capability/tool-name hygiene is clearer upstream: agents are told to treat the callable schema as the source of truth and not infer concrete tool names from AGENTS prose alone. This aligns with agent-config's capability-first docs introduced in this release.
* `prompts/engraving.md` is now an optional personal surface rather than the place where bridge operating context must fit; pi-shell-acp carries the bridge narrative separately.

## 0.4.1

* Pinned pi-shell-acp to `v0.4.1` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.1 closes a 0.3.0-era release blocker: `pi-extensions/entwurf.ts` and `pi-extensions/entwurf-control.ts` were never wired into `package.json`'s `pi.extensions` array, so `--entwurf-control` and `/entwurf*` slash commands silently failed to load and the MCP bridge's expected sockets at `~/.pi/entwurf-control/` were never created. Both extensions are now registered. Effect for us: human-facing `/entwurf-sessions` / `/entwurf-send` slash commands actually work; the `mcp__pi-tools-bridge__entwurf_*` tools are unaffected (those route through the spawn path, not the control extension).
* New consumer-visible surface: `/entwurf-sessions` enriches each row with `cwd` / `model` / `idle` via a new `get_info` RPC and assigns `[N]` indices for direct addressing; `/entwurf-send <index|sessionId> <message>` is the new human-operator surface (defaults to `follow_up`, auto-attaches `<sender_info>`). The previously dead `~/.pi/entwurf-control/` directory now self-cleans stale `.sock` entries and pre-0.4.1 `.alias` symlinks on each control-server startup.
* **Breaking — entwurf-control surface only.** The `<sessionName>.alias` symlink layer is removed from pi-shell-acp's entwurf-control. Consumer impact: `mcp__pi-tools-bridge__entwurf_send`'s parameter renamed from `target` → `sessionId`; `entwurf_peers` no longer returns `name` / `aliases`; `--entwurf-session <alias>` only accepts a sessionId now. Reviewed agent-config's surface — `home/AGENTS.md` and `home/MITSEIN.md` describe these tools at intent level and don't reference the dropped fields, so no doc changes needed. Independent of agent-config's own `pi-extensions/control.ts` under `~/.pi/session-control/`, which intentionally retains its alias surface (different cost/benefit, no polling timer); the `mcp/session-bridge/`'s `SESSION_NAME` alias also remains as the stable identity surface on that side.
* Identity-verification note: a four-case interview (OpenRouter Sonnet, pi-shell-acp Sonnet, native Codex, pi-shell-acp Codex) was captured against 0.4.0 + this patch. Both pi-shell-acp cases recognize the bridge surface and enumerate `mcp__pi-tools-bridge__*` / `mcp__session-bridge__*` correctly; the two non-bridge cases honestly report the entwurf MCP as documented but absent from their schema. Transcripts move to `BASELINE.md` upstream.

## 0.4.0

* Pinned pi-shell-acp to `v0.4.0` in the consumer install path (`pi/settings.server.json` + `run.sh`).
* v0.4.0 brings PI-native identity carriers to both backends while isolating operator state with whitelist overlays: Claude now receives the engraving via full system-prompt replacement, Codex via `developer_instructions`, and both backends run behind pi-owned config overlays instead of inheriting the operator's broader config tree.
* Important isolation additions from the upstream release: codex thread/memory SQLite state is pinned inside the overlay via `CODEX_SQLITE_HOME`, compaction opt-in no longer disables identity isolation, and codex memory/history surfaces are further constrained by default.

## 0.3.1

* Pinned pi-shell-acp to `v0.3.1`. v0.3.1 emits a startup warning when `codexDisabledFeatures: []` is detected in settings, since the empty array is a fail-open opt-out (documented at `acp-bridge.ts` as "opt fully out of bridge feature gating") — not the no-op our 0.2.2/0.3.0 changelog entries claimed.
* Removed `codexDisabledFeatures: []` from `pi/settings.json` and `pi/settings.server.json`. With the key absent, pi-shell-acp's nullish-guard applies `DEFAULT_CODEX_DISABLED_FEATURES` (image_generation, tool_suggest, tool_search, multi_agent, apps) — the fail-closed baseline that aligns the codex tool surface with pi's advertised tools.
* Correction to prior entries: 0.2.2 and 0.3.0 described the `[]` knob as "redundant defense-in-depth, harmless". That was wrong. `parseStringArray` returns `undefined` for missing keys, so `merged.codexDisabledFeatures ?? [...DEFAULT]` only falls through on `undefined`/`null`; an explicit `[]` flips the resolution from fail-closed (5 features disabled) to fail-open (all features active). The original 0.2.1 spread-crash workaround should have been deleted in 0.2.2, not retained.

## 0.3.0

* Pinned pi-shell-acp to `v0.3.0` (consumer install path in `run.sh` + `pi/settings.server.json` packages line). v0.3.0 ships two install-automation fixes that close the oracle bootstrap fault from 0.2.x:
  * `CLAUDE_CODE_EXECUTABLE` is now injected into the claude child env automatically. Reason: `claude-agent-acp@0.31.0` (`acp-agent.js:1298`) ignores `_meta.claudeCode.options.pathToClaudeCodeExecutable` and only reads the env var, so on hosts where pi's wrapper sets `NODE_PATH` to a global pnpm store containing both `claude-agent-sdk-linux-arm64` and `claude-agent-sdk-linux-arm64-musl`, the SDK's musl-first auto-detect resolved a non-existent musl binary and surfaced as "Internal error" with no useful tail (oracle, glibc/aarch64). Manual `export CLAUDE_CODE_EXECUTABLE=...` workaround is no longer required.
  * `~/.pi/agent/entwurf-targets.json` symlink is created idempotently by pi-shell-acp's `install_local_package`. Operator overrides are preserved.
* `pi/settings.server.json:18` `codexDisabledFeatures: []` knob retained as defense-in-depth (redundant since 0.2.2 fixed the spread crash; harmless). **— Incorrect, see 0.3.1 correction.**

## 0.2.2

* Pinned pi-shell-acp to `v0.2.2` (consumer install path in `run.sh`). v0.2.2 fixes the universal `codexDisabledFeatures` spread crash that broke fresh consumer installs on 0.2.1 — the bridge now nullish-guards the field in both launch + session reuse paths, so the temporary `codexDisabledFeatures: []` knob in `pi/settings.json` is now redundant (kept as defense-in-depth).

## 0.2.1

* Pinned pi-shell-acp to `v0.2.1` (consumer install + run.sh `pi install` command). v0.2.1 fixes the `husky: command not found` error during `npm install --omit=dev` so server-mode (`pi install git:...`) works on fresh machines.
* Removed model tables from `home/AGENTS.md` and `home/MITSEIN.md`. pi-shell-acp's [`pi/entwurf-targets.json`](https://github.com/junghan0611/pi-shell-acp/blob/main/pi/entwurf-targets.json) is the SSOT registry — bare model IDs auto-route via the registry (native preferred, ACP requires explicit provider). Doc-side tables drifted; the registry is canonical.

## 0.2.0

* Cut docs to align as the reference consumer of `pi-shell-acp` (companion repo).
* Renamed `home/ENTWURF.md` → `home/MITSEIN.md` to disambiguate from pi-shell-acp's `entwurf` mechanism. The resident working-companion persona is now **Mitsein** (Heidegger: "함께 있음", being-with); **Entwurf** (기투, projection-of-self) stays in pi-shell-acp as the delegation mechanism Mitsein calls. `run.sh setup` retires the legacy `~/ENTWURF.md` symlink automatically.
* Updated `home/AGENTS.md`: tool surface now `entwurf` / `entwurf_resume` / `entwurf_send` / `entwurf_peers` (was `delegate*`); default model `pi-shell-acp/claude-opus-4-7`; `repos/gh` list refreshed (added `pi-shell-acp`, `geworfen`, `legoagent-config`, `cos`, `minimal-iot-core`, `abductcli`).
* Removed migrated surface artifacts: `mcp/pi-tools-bridge/dist/`, `mcp/session-bridge/dist/` (SSOT now lives in pi-shell-acp).
* Removed `deprecated/` archive (apps-script experiments, 2025 exploratory notes, legacy `bin/` scripts).
* Slimmed `README.md` to a consumer-facing intro (308 → ~210 lines); pi-shell-acp now owns ACP / skill-plugin / engraving / entwurf specs.
* Added `/boom` command — capture crashed pi-shell-acp sessions into `.agent-reports/` for later triage.
* Added release-hygiene skills: `commit`, `update-changelog`.
* Wired skill plugin farm for pi-shell-acp's SDK isolation mode (`~/.pi/agent/claude-plugin/`).
* Wired `session-bridge` MCP server in `pi/settings.json` alongside `pi-tools-bridge` (matches pi-shell-acp 0.2.0's bundled-server set).
* Hardened `run.sh setup` for fresh consumer installs (Oracle, etc.):
  * Preflight: Node ≥ 22.6, `pi` on PATH, `~/.current-device`, Claude auth.
  * Legacy cleanup: removes pre-migration `extensions/{delegate.ts,lib,semantic-memory}` and `delegate-targets.json` symlinks.
  * Light verification: runs pi-shell-acp's `check-mcp` after install (deterministic, no auth).
  * Stale detection: warns when project-local `.pi/settings.json` references the removed `claude-agent-sdk-pi` provider.
* Switched default pi provider/model to `pi-shell-acp/claude-opus-4-7`.
* Dropped `permissions.defaultMode: "auto"` from `claude/settings.json` — pi-shell-acp's `CLAUDE_CONFIG_DIR` overlay pins `"default"`.
* Migrated install path from npm to pnpm with frozen lockfile; trimmed `setup` to install-only and split `update` for explicit pulls.
* Dropped `effortLevel: xhigh` override on server settings.
* Statusline: read `context_window` directly (no more 200K heuristic), shorten `$HOME` → `~`, drop the always-`default` `output_style` segment.

### Migrated to pi-shell-acp

The Entwurf Orchestration surface (delegate/resume, target registry, identity preservation, `pi-tools-bridge`, `session-bridge`) moved to [pi-shell-acp](https://github.com/junghan0611/pi-shell-acp). agent-config now consumes it via `pi/settings.json`'s `piShellAcpProvider.mcpServers`.

## 0.1.0

* dictcli/emacs skill polish: rewrote dictcli `SKILL.md` to LSP pattern (140 → 77 lines), corrected `lookup` → `graph` command names, added `agent-org-agenda-todos` API to emacs skill.
* `run.sh`: dictcli build failure surfaced (`|| true` → `if !` pattern); cache validation guard added.
* dictcli upstream: cache validate gate, NixOS patchelf skip, reproducible builds across local + oracle.
* pi 0.67.2 compatibility: `control.ts` migrated to `session_start + event.reason` (replaces removed `session_switch`/`session_fork`); `context.ts` migrated `SlashCommandInfo.path` → `sourceInfo.path`.
* Verified delegate sync/async on GPT-5.4 baseline.
