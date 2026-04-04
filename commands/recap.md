---
description: 직전 세션 요약 (session-recap 스킬 호출)
---
session-recap 스킬을 사용해서 현재 프로젝트의 직전 세션 내용을 요약해주세요.

`-p` 옵션에 프로젝트명을 넣어야 합니다. 프로젝트명은 세션 디렉토리명에서 추출되며, CWD에 따라 다릅니다:

| CWD | 세션 디렉토리 | `-p` 값 |
|-----|-------------|----------|
| `~/repos/gh/agent-config` | `--home-junghan-repos-gh-agent-config--` | `agent-config` |
| `~/repos/work/some-proj` | `--home-junghan-repos-work-some-proj--` | `some-proj` |
| `/home/junghan` (홈) | `--home-junghan--` | `home` |
| `~/sync/org` | `--home-junghan-sync-org--` | `org` |

확실하지 않으면 `ls -lt ~/.pi/agent/sessions/ | head` 로 디렉토리명을 확인한 후 session-recap.py의 `_extract_project` 로직에 맞춰 판단하세요.
