---
name: emacs
description: "Emacs daemon — org manipulation, denote notes, citar bibliography, org-agenda, arbitrary elisp. Two sockets: server (agent work), user (show file to user). Core: agent-denote-add-history(ID,CONTENT), agent-denote-add-heading(ID,TITLE,BODY) or (ID,TITLE,TAG,BODY) — no tag? body as 3rd arg. Never pass nil. agent-denote-add-link(ID,TARGET-ID,DESC). All 3 args required."
---

# Emacs Agent Server

## Connect

```bash
ec() { emacsclient -s "${PI_EMACS_AGENT_SOCKET:-server}" --eval "${1}"; }  # agent work (${1}, not a bare positional — those get stripped when this skill is injected)
eu() { emacsclient -s user --no-wait "$@"; }  # show file to user
```

Define ec/eu in EVERY bash call (subshell resets).

`PI_EMACS_AGENT_SOCKET` is injected by entwurf when launched with
`--emacs-agent-socket <name>` (e.g. `server`, `/run/emacs/server` for Docker).
Falls back to `server` when unset.

## API

| Function | Args | Example |
|----------|------|---------|
| `agent-denote-add-history` | ID, CONTENT | `ec '(agent-denote-add-history "ID" "@pi — msg")'` |
| `agent-denote-add-heading` | ID, TITLE, BODY | `ec '(agent-denote-add-heading "ID" "Title" "body")'` |
| | ID, TITLE, TAG, BODY | `ec '(agent-denote-add-heading "ID" "Title" "LLMLOG" "body")'` |
| `agent-denote-add-link` | ID, TARGET-ID, DESC | `ec '(agent-denote-add-link "ID1" "ID2" "desc")'` ⚠️ all 3 args required (see Gotchas) |
| `agent-denote-set-front-matter` | ID, &rest PLIST | `ec '(agent-denote-set-front-matter "ID" :title "새 제목" :filetags (quote ("meta" "reasoning")) :rename t)'` |
| `agent-denote-search` | QUERY, ?TYPE(title/tag/fulltext) | `ec '(agent-denote-search "term" (quote tag))'` |
| `agent-denote-keywords` | — | `ec '(agent-denote-keywords)'` → all tags list |
| `agent-denote-rename-by-front-matter` | FILE | `ec '(agent-denote-rename-by-front-matter "/path")'` |
| `agent-denote-rename-bulk` | DIRECTORY | `ec '(agent-denote-rename-bulk "/path/")'` |
| `agent-org-read-file` | FILE | `ec '(agent-org-read-file "/path")'` → content string (guarded paths only) |
| `agent-org-get-headings` | FILE, ?MAX-LEVEL | `ec '(agent-org-get-headings "/path" 2)'` |
| `agent-org-get-properties` | FILE | `ec '(agent-org-get-properties "/path")'` → alist |
| `agent-org-dblock-update` | FILE | `ec '(agent-org-dblock-update "/path")'` — ~/org/ all |
| `agent-org-agenda-day` | ?DATE | `ec '(agent-org-agenda-day "-1")'` — nil=today |
| `agent-org-agenda-week` | ?DATE | `ec '(agent-org-agenda-week)'` |
| `agent-org-agenda-tags` | MATCH | `ec '(agent-org-agenda-tags "commit")'` |
| `agent-org-agenda-todos` | ?PROJECT, ?PRIORITY | `ec '(agent-org-agenda-todos "andenken")'` |
| `agent-citar-lookup` | QUERY, ?MAX | `ec '(agent-citar-lookup "karpathy" 5)'` |
| `agent-server-status` | — | `ec '(agent-server-status)'` → version, uptime |
| `agent-being-data` | ?AS-JSON | `ec '(agent-being-data)'` → notes/journal/garden counts |

agent-org-agenda-todos: PROJECT is level-2 heading name in Entwurf agenda (e.g. "andenken", "blog", "agent-config"). PRIORITY is "A"/"B"/"C". Both optional — nil returns all TODOs grouped by project.

For agenda/task-hub work, prefer `agent-org-agenda-day/week/todos` over `agent-org-read-file`.
If the target file lives under `~/sync/org/...`, `agent-org-read-file` may be blocked by path guards even when the file is conceptually part of the workflow. In that case:
1. use `agent-org-agenda-todos` first
2. use `agent-org-agenda-day/week` for schedule context
3. only if raw structure is still needed, fall back to shell tools (`rg`) instead of repeatedly calling blocked Emacs read APIs

add-heading: 3rd arg is TAG if UPPERCASE (e.g. "LLMLOG"), BODY otherwise. ⚠️ Never pass `nil` — body silently drops. No tag? Put body as 3rd arg directly.

set-front-matter: touches only front matter / pre-heading region.
- Supported FM keys: `:title`, `:filetags`, `:description`, `:reference`, `:date`, `:hugo_lastmod`. Missing keys are created, existing keys replaced. Unknown FM lines preserved.
- Control key: `:rename t` → FM 갱신 후 denote 규칙대로 파일명까지 재생성. 분리 호출 불필요. rename 실패해도 FM 는 이미 저장됨 → `OK: ...; WARN: rename failed — ...` 로 분리 보고.
- filetags 값: 문자열 `"meta reasoning"`·`"meta,reasoning"`·`":meta:reasoning:"` / 리스트 `("meta" "reasoning")` 모두 허용. lowercase + alnum 검증 + sort + dedup 자동.
- reference 값: `";"` 또는 `","` 구분 문자열 / 리스트 둘 다 허용. 결과는 `;` 구분.

```bash
# no tag — body as 3rd arg
ec '(agent-denote-add-heading "ID" "New Section" "body text here")'
# with tag — TAG then body
ec '(agent-denote-add-heading "ID" "New Section" "LLMLOG" "body text here")'
# insert after a specific heading
ec '(agent-denote-add-heading "ID" "New Section" "body" "After This Heading")'

# set front matter — FM only
ec '(agent-denote-set-front-matter "ID" :title "새 제목" :description "요약")'
ec '(agent-denote-set-front-matter "ID" :filetags (quote ("meta" "reasoning")) :reference "key1;key2")'

# set front matter + auto rename (원샷)
ec '(agent-denote-set-front-matter "ID" :title "정제된 제목" :filetags (quote ("ethics" "information")) :rename t)'
```

## Arbitrary Elisp

ec accepts any elisp expression. Use for one-off org parsing or runtime extensions.

```bash
ec '(emacs-version)'
ec '(mapcar #'\''buffer-name (buffer-list))'
```

## Notes (read if needed)

### Paths
- Read: `~/org/`, `~/repos/gh/`, `~/repos/work/`, `~/repos/3rd/` (guarded allowlist)
- Write: `~/org/botlog/`, `~/repos/gh/self-tracking-data/`
- Dblock update: `~/org/` (all org files)
- Denote append (add-*): `~/org/` (all denote files, append-only)
- `~/sync/org/...` may be part of the real workflow but still blocked for `agent-org-read-file`; treat that as a known interface boundary

### Daemon management
- thinkpad: `cd ~/repos/gh/doomemacs-config && ./run.sh agent start|stop|restart`
- oracle: `~/openclaw/emacs-agent.sh start|stop|restart`
- agent-server.el 을 고치면 **데몬 재시작해야 반영**된다 (위 restart).
- 데몬이 hang 상태여도 `./run.sh agent restart` 가 복구한다: graceful `(kill-emacs)`
  를 5s timeout 으로 시도하고, 무응답이면 daemon PID 를 kill(→필요시 -9)한 뒤 stale
  socket 을 정리하고 start 한다 (bounded force-stop, 2026-07 수정). oracle
  `emacs-agent.sh` 는 별도 스크립트라 아직 수동 `pkill` 이 필요할 수 있다.

### Gotchas — stale buffer / rename (issue #9, fixed 2026-06-24)
- **add-* / set-front-matter 는 매 호출 디스크에서 새로 읽는다** (stale 버퍼 폐기).
  그래서 ~/org 파일을 일반 Write 도구로 직접 고친 뒤 곧바로 이 API 를 불러도 안전.
  과거엔 stale 버퍼 + "file changed on disk; really edit?" 프롬프트로 데몬이
  **조용히 hang** 했다 (DESC 누락과 무관한 hang — bbot 가 헷갈린 지점). 이제 그
  케이스는 hang 대신 `ERROR: ...` 문자열을 돌려준다.
- 그래도 ~/org 편집의 계약(contract)은 가능하면 raw Write 가 아니라 agent-denote-* API.
- **rename 은 데몬 cwd 와 무관하게 repo 안에서 git mv** 한다. 과거 `agent-denote-rename-*`
  가 데몬 cwd(예: `~/openclaw/`)에 따라 `../org/...` 상대경로 + `.git` 없는 cwd 로
  `git mv` 를 돌려 **"status 128"** 으로 죽던 버그를 `default-directory` 고정으로 수정.
- 위 수정은 `bin/agent-server.el` 에 있다 → **데몬 재시작 후** 유효.
- **add-history 는 자동으로 `[YYYY-MM-DD Day HH:MM]` timestamp 를 앞에 붙인다.**
  CONTENT 에 또 timestamp 를 넣으면 `[now] [caller-time]` 이 중복된다 — CONTENT 엔
  timestamp 없이 메시지 본문만 넘겨라 (예: `"@pi — 작업 완료"` ✓, 앞에 `[2026-…]` ✗).
- **add-link 는 표준 `* 관련노트` 섹션에만 넣는다** (없으면 만든다). 형제 섹션
  `* 관련메타`(자석) · `* 관련링크` · `* 관련 레퍼런스` 는 건드리지 않는다 — 붙여쓴
  `관련노트`(표준) 를 못 잡고 `관련 <다른말>` 을 오매칭하던 2026-07 회귀는 수정됨.

### Agenda
DATE format: nil=today, "-1"=yesterday, "+3"=3days, "2026-03-01"=specific date.
Returns plain text: `"Monday 1 April 2026\n  Agent: 9:20...... commit :pi:\n  Human: 13:40...... 작업 시작"`

Recommended order for Entwurf/COS operation:
1. `agent-org-agenda-day` — today's integrated working surface
2. `agent-org-agenda-todos` — Entwurf task hub view by project/priority
3. `agent-org-agenda-week` — weekly framing
4. `agent-org-read-file` — only for allowed raw org files when truly needed
