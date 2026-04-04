---
description: 직전 세션 요약 (session-recap 스킬 호출)
---
session-recap 스킬을 읽고, `{baseDir}/scripts/session-recap.py`를 실행해주세요.

`-p` 옵션에 현재 리포의 프로젝트명을 넣어야 합니다:
- 프로젝트명 = CWD의 마지막 디렉토리명 (예: `~/repos/gh/agent-config` → `agent-config`, `/home/junghan` → `home`)
- 확실하지 않으면 `ls -lt ~/.pi/agent/sessions/ | head` 로 확인

`-m 15`로 메시지 수를 지정하고, 결과를 한국어로 요약해주세요.
