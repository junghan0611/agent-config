#!/usr/bin/env python3
"""session-recap: 세션 JSONL에서 핵심 텍스트만 추출.

raw JSONL을 직접 read하면 50KB JSON 노이즈가 컨텍스트에 들어감.
이 스크립트는 user/assistant 텍스트만 뽑아서 에이전트가 빠르게 맥락을 파악하게 한다.

멀티 하네스 지원: pi와 Claude Code 세션 모두 처리.

Usage:
  session-recap.py                     # 직전 1개 세션, 마지막 20개 메시지
  session-recap.py --sessions 3        # 직전 3개 세션
  session-recap.py --messages 10       # 마지막 10개 메시지만
  session-recap.py --chars 500         # 메시지당 500자
  session-recap.py --all-projects      # 모든 프로젝트 (기본: 현재 CWD 프로젝트)
  session-recap.py --project config    # 특정 프로젝트
  session-recap.py --commits           # git 커밋 정보도 추출
  session-recap.py --cost              # 세션별 비용 요약
  session-recap.py --source pi         # pi 세션만
  session-recap.py --source claude     # Claude Code 세션만
  session-recap.py --source pi --harness gpt  # pi native GPT/Codex 세션만
  session-recap.py --session-file /abs/path/session.jsonl  # 정확한 세션 1개
"""

import argparse
import json
import os
import re
import sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path


def _fmt_ts(ts: str) -> str:
    """Convert ISO-8601 UTC timestamp ('...Z') to host local TZ.

    No-arg ``datetime.astimezone()`` picks up the system local TZ
    (respects ``TZ`` env var and ``/etc/localtime``). On unparseable
    input, fall back to the raw 19-char slice so output never breaks.
    """
    if not ts:
        return "?"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.astimezone().strftime("%Y-%m-%dT%H:%M:%S")
    except (ValueError, TypeError):
        return ts[:19]


# --- Corpus filters (andenken session-indexer.ts와 정합) ---
# andenken 0d4432b "tighten corpus … >300KB, drop tmp + legacy"; pi admission 은
# 2026-08-10 GLG 판정으로 현행 native UUIDv7 파일명 단일 규격이다.
# 세션 임베딩 코퍼스와 동일 규율로 session-recap도 핵심 세션만 본다.

# 세션 파일 크기 하한 (KB). 진짜 작업 세션은 수십~수백 KB (pi non-tmp median ≈300KB);
# test/probe 세션은 수 KB. GLG 정책 "300KB 이하 제외" → 필터는 `size > MIN` (정확히
# 300KB도 제외). --min-kb 0 으로 끄면 직전 작은 세션도 회수 (recap 탈출구).
DEFAULT_MIN_KB = 300


def _is_excluded_project_dir(dirname: str) -> bool:
    """tmp/probe scratch 프로젝트 디렉토리 — 양 런타임 인덱싱 제외.

    pi `--tmp…--` / claude `-tmp…` 는 감싸는 하이픈을 벗기면 "tmp"로 시작한다.
    probe/release-gate/v2matrix scratch 도 전부 `tmp-*` 라 이 규칙이 다 잡는다.
    andenken isExcludedProjectDir 와 동일.
    """
    return dirname.strip("-").startswith("tmp")


def _is_native_pi_session_file(filename: str) -> bool:
    """현행 pi 세션 파일명 — `<created-at>_<native session id>.jsonl`.

    native session id 는 **UUIDv7** 이다 (version nibble `7`, variant `[89ab]`).
    2026-08-06 을 마지막으로 pi 는 garden-id suffix 를 더는 쓰지 않는다.

    **호환성을 유지하지 않는다** (GLG 판정 2026-08-10): 구형 종 — garden-id
    (`_YYYYMMDDTHHMMSS-<6hex>`), UUIDv4, `_entwurf-…`, `_delegate-…` — 은 OR 로
    되살리지 않는다. 코퍼스 admission 은 현행 규격 하나다.

    garden id ↔ nativeSessionId ↔ transcriptPath 조인은 **entwurf meta-record 소유**다.
    파일명은 identity 를 말하지 않는다. 여기서는 코퍼스 발견에만 쓴다.

    claude 는 항상 UUID 라 미적용. andenken `isNativePiSessionFile` 과 동일.
    """
    return bool(
        re.search(
            r"_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jsonl$",
            filename,
        )
    )


def _default_source() -> str:
    """현재 하네스에 맞춘 기본 source. Claude Code에서 돌면 claude, 아니면 pi.

    이전 세션을 명확히 이어가려면 같은 하네스의 세션을 봐야 한다. --source 로 override.
    """
    return "claude" if os.environ.get("CLAUDECODE") else "pi"


def _extract_project(dirname: str) -> str:
    """세션 디렉토리명에서 프로젝트명 추출.

    pi는 CWD를 --{path}-- 형식으로 인코딩 (/ → -).
    Claude Code는 -{path} 형식 (/ → -).
    유저·컨테이너 경로를 제거하고 프로젝트명만 남긴다.

    경로 구조:
      ~/repos/{gh,work,3rd}/PROJECT  → PROJECT
      ~/sync/{subfolder}/PROJECT     → PROJECT  (emacs, family, man 등)
      ~/sync/PROJECT                 → PROJECT  (org, screenshot 등)
      ~/PROJECT                      → PROJECT  (doomemacs 등)
      리모트도 동일 (home-goqual-...)
    """
    if dirname == "delegate":
        return "delegate"
    if not dirname.startswith("home-"):
        return dirname

    parts = dirname.split("-", 2)
    if len(parts) < 3:
        return "home"
    rest = parts[2]

    if rest.startswith(("repos-gh-", "repos-work-", "repos-3rd-")):
        return rest.split("-", 2)[2]

    if rest.startswith("sync-"):
        sync_rest = rest[5:]
        if "-" in sync_rest:
            _, project = sync_rest.split("-", 1)
            if project:
                return project
        return sync_rest

    # 홈 직속 (doomemacs 등)
    return rest


CORPUS_ENV = "ANDENKEN_SESSION_CORPUS"
ENV_FILE_NAME = "~/.env.local"


def _corpus_from_env_file() -> str:
    """`~/.env.local` 에서 코퍼스 값 하나만 읽는다 (없으면 빈 문자열).

    프로세스 env 가 SSOT 파일보다 오래된 경우를 위한 폴백이다. 환경변수는
    로그인 시점에 한 번 캡처되므로, `.env.local` 에 코퍼스 줄이 추가된 뒤
    **그 전에 시작된 세션·데몬·에이전트는 영영 그 값을 못 본다** — 측정
    2026-09-03: 이 셸에 `ANDENKEN_SESSION_*` 는 있는데
    `ANDENKEN_SESSION_CORPUS` 만 없었다(17:09 에 추가된 줄). 그러면 코퍼스가
    조용히 꺼져 `--session-file` 이 semantic-memory 가 준 코퍼스 경로를 전부
    거절한다. 이 repo 의 다른 소비자(memory-sync·transcribe 등)도 같은 이유로
    `.env.local` 을 직접 읽는다 (`ENV-SETUP.md`).

    키를 **빈 값으로 명시**한 경우(`export ANDENKEN_SESSION_CORPUS=`)는 의도된
    라이브 전용이므로 호출자가 여기까지 오지 않는다. 이 해석은 **읽기면 한정**이다 —
    andenken `sync-sessions.sh` 도 같은 폴백을 갖지만 `-z` 로 검사해 빈 값을
    미설정으로 보고 파일 값을 쓴다 (확인 2026-09-03).
    """
    try:
        env_file = Path(os.path.expanduser(ENV_FILE_NAME))
        text = env_file.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    value = ""
    for line in text.splitlines():
        m = re.match(rf"\s*(?:export\s+)?{CORPUS_ENV}=(.*)$", line)
        if m:
            value = m.group(1).strip().split("#")[0].strip().strip("\"'")
    # `$HOME`/`${HOME}`/`~` 만 편다 — 임의 셸 확장은 하지 않는다.
    home = os.path.expanduser("~")
    value = value.replace("${HOME}", home).replace("$HOME", home)
    return value


def corpus_root() -> Path | None:
    """세션 코퍼스 루트. 미설정이거나 디렉토리가 아니면 None.

    andenken 과 **같은 환경변수 하나**를 읽는다. 그 변수의 SSOT 는
    `~/.env.local` 이므로, 변수가 프로세스 env 에 **아예 없을 때만** 그 파일을
    한 번 더 본다 (`_corpus_from_env_file` docstring 의 stale-env 사례).
    코퍼스는 라이브 경로 앞에 `<device>` 한 마디만 덧댄 모양이라, 아래
    discovery/resolve 는 루트를 더하는 것으로 끝난다:

      <corpus>/oracle/.pi/agent/sessions/--home-junghan-repos-gh-andenken--/…
      <corpus>/oracle/.claude/projects/-home-junghan-repos-gh-andenken/…
    """
    if CORPUS_ENV in os.environ:
        raw = os.environ[CORPUS_ENV].strip()
    else:
        raw = _corpus_from_env_file().strip()
    if not raw:
        return None
    root = Path(os.path.expanduser(raw))
    return root if root.is_dir() else None


def corpus_devices() -> list[str]:
    """코퍼스 루트 아래 device 디렉토리명. 결정적 순서로 정렬.

    루트에는 MANIFEST.json / README.md 같은 파일도 같이 산다 — 디렉토리만 센다.
    """
    root = corpus_root()
    if root is None:
        return []
    try:
        return sorted(
            d.name for d in root.iterdir() if d.is_dir() and not d.name.startswith(".")
        )
    except OSError:
        return []


def get_sessions_dirs(source: str = "all") -> list[tuple[Path, str, str | None]]:
    """세션 디렉토리 반환. (path, source_name, device) 튜플 리스트.

    device 는 라이브 저장소면 None, 코퍼스면 디바이스명이다.

    **라이브 ∪ 코퍼스** 를 모두 훑는다 — andenken 인덱서가 코퍼스 설정 시 라이브를
    *대체* 하는 것과 의도적으로 다르다. 인덱서는 `sync-sessions.sh` Step 0 에서
    gather 를 먼저 돌려 코퍼스 신선도를 자기가 보장하지만, recap 에는 gather 단계가
    없다. 코퍼스만 보면 마지막 gather 이후에 쓰인 **이 기계의 현재 세션이 목록에서
    빠지고**, `--skip 1` 이 기대는 "현재 세션 = mtime 최신" 불변식이 조용히 깨진다
    (find_session_files docstring 참조). 합집합은 dedupe_by_basename 이 중복을
    접기 때문에 안전하다 — 같은 세션의 라이브본과 코퍼스본이 만나면 큰 쪽(=최신)이
    이긴다.
    """
    dirs: list[tuple[Path, str, str | None]] = []
    pi_dir = Path.home() / ".pi" / "agent" / "sessions"
    claude_dir = Path.home() / ".claude" / "projects"
    if source in ("all", "pi") and pi_dir.exists():
        dirs.append((pi_dir, "pi", None))
    if source in ("all", "claude") and claude_dir.exists():
        dirs.append((claude_dir, "claude", None))

    root = corpus_root()
    if root is not None:
        for device in corpus_devices():
            if source in ("all", "pi"):
                d = root / device / ".pi" / "agent" / "sessions"
                if d.is_dir():
                    dirs.append((d, "pi", device))
            if source in ("all", "claude"):
                d = root / device / ".claude" / "projects"
                if d.is_dir():
                    dirs.append((d, "claude", device))
    return dirs


def dedupe_by_basename(
    results: list[tuple[float, Path, str, str, str | None]],
) -> list[tuple[float, Path, str, str, str | None]]:
    """같은 세션의 사본을 하나로 접는다. andenken `dedupeByBasename` 와 같은 규칙.

    키는 **basename**: pi/claude 세션 id 는 UUID 라 basename 이 같으면 같은
    대화다. 승자는 **큰 쪽** — transcript 는 자라기만 하므로 큰 사본이 나중에
    떠진 것이고 턴이 더 많다. 크기 동률이면 **경로 사전순** 으로 끊어 기계와
    무관하게 같은 답이 나오게 한다.

    두 기계가 과거에 `rsync -a` 로 claude 저장소를 주고받아 겹침이 실재한다
    (2026-09-02 측정: 코퍼스 2,145 중 553건). 그중 md5 가 갈린 5건은 fork 가
    아니라 **작은 쪽이 큰 쪽의 정확한 바이트 접두** 임이 확인됐다(andenken 담당자
    + Sol 대조) — append-only 스냅샷의 시점 차이다. "큰 쪽 승"이 그래서 안전하다.
    """
    best: dict[str, tuple[float, Path, str, str, str | None]] = {}
    sizes: dict[str, int] = {}
    for item in results:
        path = item[1]
        try:
            size = path.stat().st_size
        except OSError:
            continue
        key = path.name
        cur = best.get(key)
        if (
            cur is None
            or size > sizes[key]
            or (size == sizes[key] and str(path) < str(cur[1]))
        ):
            best[key] = item
            sizes[key] = size
    return list(best.values())


def detect_pi_harness(filepath: Path, max_lines: int = 200) -> str:
    """Classify a pi session by assistant message metadata.

    pi session records do not carry model/provider in the top-level session row.
    The first assistant message usually has message.api/provider/model:
    - openai-codex / gpt-*      → gpt
    - entwurf / claude-*        → acp  (historical sessions: provider "pi-shell-acp")
    Unknown sessions pass only when --harness=all.
    """
    try:
        with open(filepath) as f:
            for i, line in enumerate(f):
                if i >= max_lines:
                    break
                try:
                    d = json.loads(line.strip())
                except (json.JSONDecodeError, ValueError):
                    continue
                # 문법은 맞지만 object 가 아닌 줄(`[]`, `42`)은 레코드가 아니다.
                # exact 선택은 구조 필터를 우회하므로 이런 파일이 여기까지 온다.
                if not isinstance(d, dict):
                    continue

                msg = d.get("message", {})
                if not isinstance(msg, dict):
                    msg = {}

                role = msg.get("role", "")
                if role != "assistant":
                    continue

                api = str(msg.get("api") or d.get("api") or "").lower()
                provider = str(msg.get("provider") or d.get("provider") or "").lower()
                model = str(msg.get("model") or d.get("model") or "").lower()

                if "openai-codex" in api or "openai-codex" in provider or model.startswith("gpt-"):
                    return "gpt"
                if ("entwurf" in api or "entwurf" in provider
                        or "pi-shell-acp" in api or "pi-shell-acp" in provider
                        or model.startswith("claude-")):
                    return "acp"
    except OSError:
        return "unknown"

    return "unknown"


def resolve_session_file(session_file: str) -> tuple[float, Path, str, str]:
    """Resolve one explicitly selected pi/Claude transcript.

    Exact selection deliberately bypasses recency, size, tmp, and native-filename
    corpus filters. The absolute path itself is the caller's explicit intent, but
    it must still name a regular ``.jsonl`` file under a known session root.
    """
    candidate = Path(session_file).expanduser()
    if not candidate.is_absolute():
        raise ValueError("--session-file must be an absolute path")
    if candidate.suffix != ".jsonl":
        raise ValueError("--session-file must name a .jsonl file")
    if candidate.is_symlink():
        raise ValueError("--session-file must name a regular file, not a symlink")
    try:
        path = candidate.resolve(strict=True)
        stat = path.stat()
        # stat 만으로는 읽기 권한을 알 수 없다 (chmod 000 도 stat 은 통과한다).
        # 여기서 실제로 열어봐야 docs 가 약속한 `unreadable` named fact 가 성립한다.
        with open(path):
            pass
    except OSError as error:
        raise ValueError(f"--session-file is not readable: {error}") from error
    if not path.is_file():
        raise ValueError("--session-file must name a regular file")

    roots: list[tuple[Path, str, str | None]] = [
        (Path.home() / ".pi" / "agent" / "sessions", "pi", None),
        (Path.home() / ".claude" / "projects", "claude", None),
    ]
    # 코퍼스 루트도 **항상** 더한다 (discovery 와 달리 조건부가 아니다). exact 선택은
    # 호출자가 경로를 직접 짚은 것이므로, 라이브든 코퍼스든 알려진 루트 아래 있고
    # 읽히면 받는다. 여기서 라이브를 배제하면 코퍼스를 켠 기계에서 "현재 세션을
    # 경로로 지목" 하는 정상 사용이 거부된다.
    corpus = corpus_root()
    if corpus is not None:
        for device in corpus_devices():
            roots.append((corpus / device / ".pi" / "agent" / "sessions", "pi", device))
            roots.append((corpus / device / ".claude" / "projects", "claude", device))

    for root, source, device in roots:
        try:
            relative = path.relative_to(root.resolve())
        except (OSError, ValueError):
            continue
        if len(relative.parts) < 2:
            raise ValueError("--session-file must be inside a project session directory")
        dirname = relative.parts[0].strip("-")
        project = _extract_project(dirname)
        return stat.st_mtime, path, project, source, device

    known = "~/.pi/agent/sessions or ~/.claude/projects"
    if corpus is not None:
        known += f" or {corpus}/<device>/…"
    raise ValueError(f"--session-file must be under {known}")


def find_session_files(
    source: str = "all", project: str | None = None, device: str | None = None
) -> list[tuple[float, Path, str, str, str | None]]:
    """(mtime, path, project_name, source, device) 목록을 최신순 반환.

    device 는 라이브 저장소면 None, 코퍼스면 디바이스명. `device` 인자를 주면 그
    디바이스에서 수집된 것만 남긴다 — **"어디서 수집됐는가"이지 "어디서
    만들어졌는가"가 아니다** (corpus README: 두 기계가 `rsync -a` 로 주고받아
    mtime 까지 보존돼 원본 방향은 판정 불가). provenance 표기/필터로만 쓰고
    랭킹이나 중요도 신호로 쓰지 않는다.

    **구조 필터만** 적용 (크기 필터는 호출자가 skip 후 적용 — 아래 설명).
    - tmp/probe 프로젝트 디렉토리 제외 (양 런타임)
    - 비어있지 않은 파일 전부 (size > 0)
    - pi 는 현행 native UUIDv7 파일명만 (구형 garden-id/UUIDv4/_delegate/_entwurf 제외);
      claude 미적용
    - claude 는 top-level + UUID 하위폴더(session-id 폴더)까지 스캔, `subagents` 폴더 제외
      (andenken scanClaudeDir 와 정합). pi 는 flat 구조라 top-level 만.

    크기 필터(`--min-kb`)를 여기서 적용하지 않는 이유: 현재 라이브 세션은 세션 초반엔
    아직 작아(<300KB) 크기 필터에 걸려 목록에서 빠진다. 그러면 `--skip 1`(현재 세션
    제외)이 목록 맨 위의 *직전 실작업* 세션을 대신 버려 엉뚱한 세션을 회수한다.
    "현재 세션 = mtime 최신"은 하네스 무관 불변식이므로, skip 은 구조 필터만 적용한
    완전한 최신순 목록 위에서 해야 정확하다. 크기 필터는 skip 이후 표시 후보에만 건다.
    """
    results = []
    for sessions_dir, src, dev in get_sessions_dirs(source):
        if device and dev != device:
            continue
        for subdir in sessions_dir.iterdir():
            if not subdir.is_dir():
                continue
            # 프로젝트 이름 추출: strip("-")로 양쪽 하이픈 제거
            # pi:    --home-junghan-repos-gh-agent-config-- → home-junghan-repos-gh-agent-config
            # claude: -home-junghan-repos-gh-agent-config   → home-junghan-repos-gh-agent-config
            if _is_excluded_project_dir(subdir.name):
                continue
            dirname = subdir.name.strip("-")
            proj = _extract_project(dirname)

            if project and project != proj:
                continue

            # 후보 jsonl: top-level 항상. claude 는 UUID 하위폴더도(subagents 제외).
            candidates = [f for f in subdir.iterdir() if f.suffix == ".jsonl"]
            if src == "claude":
                for entry in subdir.iterdir():
                    if not entry.is_dir() or entry.name == "subagents":
                        continue
                    try:
                        candidates.extend(
                            f for f in entry.iterdir() if f.suffix == ".jsonl"
                        )
                    except OSError:
                        continue

            for f in candidates:
                if src == "pi" and not _is_native_pi_session_file(f.name):
                    continue
                try:
                    st = f.stat()
                except OSError:
                    continue
                if st.st_size <= 0:
                    continue
                results.append((st.st_mtime, f, proj, src, dev))

    results = dedupe_by_basename(results)
    results.sort(key=lambda x: x[0], reverse=True)
    return results


def extract_messages(
    filepath: Path, max_messages: int, max_chars: int, include_commits: bool, include_cost: bool
) -> dict:
    """세션 파일에서 핵심 정보 추출. pi와 Claude Code JSONL 포맷 모두 지원."""
    messages = deque(maxlen=max_messages)
    commits = []
    total_cost = 0.0
    total_input = 0
    total_output = 0
    session_start = None
    session_end = None

    with open(filepath) as f:
        for line in f:
            try:
                d = json.loads(line.strip())
            except (json.JSONDecodeError, ValueError):
                continue
            if not isinstance(d, dict):
                continue

            msg_type = d.get("type", "")

            # 세션 메타 — pi: "session", Claude Code: "queue-operation"
            if msg_type in ("session", "queue-operation"):
                ts = d.get("timestamp", "")
                if ts:
                    session_start = ts
                continue

            # 메시지 추출
            # pi:         type="message", message.role="user"/"assistant"
            # Claude Code: type="user"/"assistant", message.role="user"/"assistant"
            if msg_type == "message":
                msg = d.get("message", {})
            elif msg_type in ("user", "assistant"):
                msg = d.get("message", {})
            else:
                continue

            # `message` 가 object 가 아니면 이 레코드는 메시지가 아니다. 버리고
            # 계속 간다 — 전부 버려지면 exact 경로의 parsed-0 named error 가 받는다.
            if not isinstance(msg, dict):
                continue

            role = msg.get("role", "")
            ts = d.get("timestamp", "")

            # 세션 시작 fallback (session/queue-operation이 없을 때)
            if not session_start and ts:
                session_start = ts

            # 비용 집계
            # pi:         usage.input / usage.output / usage.cost.total
            # Claude Code: usage.input_tokens / usage.output_tokens (cost 없음)
            # usage 는 부가 정보다. 모양이 깨졌다고 읽을 수 있는 turn 을 버리지
            # 않는다 — 집계만 건너뛴다.
            usage = msg.get("usage", {})
            if not isinstance(usage, dict):
                usage = {}
            if usage:
                cost_info = usage.get("cost", {})
                if not isinstance(cost_info, dict):
                    cost_info = {}
                total_cost += cost_info.get("total", 0)
                total_input += usage.get("input", 0) or usage.get("input_tokens", 0)
                total_output += usage.get("output", 0) or usage.get("output_tokens", 0)

            if role not in ("user", "assistant"):
                continue

            content = msg.get("content", [])
            texts = []
            tools = []

            if isinstance(content, str):
                texts.append(content)
            elif isinstance(content, list):
                for c in content:
                    if not isinstance(c, dict):
                        continue
                    if c.get("type") == "text" and c.get("text"):
                        texts.append(c["text"])
                    elif c.get("type") in ("toolCall", "tool_use"):
                        tools.append(c.get("name", ""))
                        # git commit 추출
                        if include_commits and c.get("name") in ("bash", "Bash"):
                            # pi: arguments.command, Claude Code: input.command
                            args = c.get("arguments", {}) or c.get("input", {})
                            cmd = args.get("command", "")
                            if "git commit" in cmd or "git push" in cmd:
                                commits.append(cmd[:200])

            text = "\n".join(texts).strip()
            if not text and not tools:
                continue

            # 너무 짧은 메시지 스킵 (tool result 등)
            if role == "assistant" and not text and tools:
                continue  # 도구만 호출하고 텍스트 없는 턴 스킵

            session_end = ts

            entry = {"role": role, "text": text[:max_chars] if text else "", "ts": ts}
            if tools:
                entry["tools"] = tools
            messages.append(entry)

    result = {
        "messages": list(messages),
        "stats": {
            "start": session_start,
            "end": session_end,
            "message_count": len(messages),
        },
    }

    if include_cost:
        result["stats"]["cost"] = f"${total_cost:.4f}"
        result["stats"]["input_tokens"] = total_input
        result["stats"]["output_tokens"] = total_output

    if include_commits and commits:
        result["commits"] = commits

    return result


def format_output(sessions_data: list[dict], output_format: str) -> str:
    """출력 포맷팅."""
    if output_format == "json":
        return json.dumps(sessions_data, ensure_ascii=False, indent=2)

    # text 포맷 (기본)
    lines = []
    for sd in sessions_data:
        meta = sd["meta"]
        data = sd["data"]
        stats = data["stats"]

        source = meta.get("source")
        if source == "pi" and meta.get("harness"):
            source_label = f"pi:{meta['harness']}"
        else:
            source_label = source or ""
        # device 는 수집처 표기다 (생성처가 아니다 — find_session_files docstring).
        # 라이브 저장소에서 온 것은 device 가 없으므로 접미가 붙지 않는다.
        if meta.get("device"):
            source_label = f"{source_label}@{meta['device']}" if source_label else f"@{meta['device']}"
        source_label = f" [{source_label}]" if source_label else ""
        lines.append(f"═══ {meta['project']}{source_label} ({meta['file'][:40]}...) ═══")
        if meta.get("exact"):
            lines.append(f"  파일: {meta['path']}")
        lines.append(f"  기간: {_fmt_ts(stats.get('start', ''))} → {_fmt_ts(stats.get('end', ''))}")
        if "cost" in stats:
            lines.append(f"  비용: {stats['cost']} (in:{stats['input_tokens']:,} out:{stats['output_tokens']:,})")
        lines.append("")

        for m in data["messages"]:
            icon = "👤" if m["role"] == "user" else "🤖"
            text = m["text"].replace("\n", " ")
            ts_short = _fmt_ts(m.get("ts", "")).split("T")[-1] if m.get("ts") else ""
            if m.get("tools"):
                tool_str = ",".join(m["tools"])
                lines.append(f"  {icon} [{ts_short}] ({tool_str}) {text}")
            else:
                lines.append(f"  {icon} [{ts_short}] {text}")

        if data.get("commits"):
            lines.append("\n  commits:")
            for c in data["commits"]:
                lines.append(f"    {c[:120]}")

        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="세션 JSONL에서 핵심 텍스트 추출 (에이전트 컨텍스트 최적화)"
    )
    parser.add_argument(
        "--sessions", "-s", type=int, default=None, help="직전 N개 세션 (기본: 1)"
    )
    parser.add_argument(
        "--messages", "-m", type=int, default=20, help="세션당 마지막 N개 메시지 (기본: 20)"
    )
    parser.add_argument(
        "--chars", "-c", type=int, default=300, help="메시지당 최대 글자수 (기본: 300)"
    )
    parser.add_argument(
        "--project", "-p", type=str, default=None, help="프로젝트 필터 (기본: 모든 프로젝트)"
    )
    parser.add_argument(
        "--all-projects", "-a", action="store_true", help="모든 프로젝트 세션 포함"
    )
    parser.add_argument(
        "--commits", action="store_true", help="git 커밋 정보 포함"
    )
    parser.add_argument(
        "--cost", action="store_true", help="세션별 비용 요약 포함"
    )
    parser.add_argument(
        "--format", "-f", choices=["text", "json"], default="text", help="출력 형식"
    )
    parser.add_argument(
        "--skip", type=int, default=None, help="최신 N개 세션 건너뛰기 (기본: 1, 현재 세션)"
    )
    parser.add_argument(
        "--source", choices=["pi", "claude", "all"], default=None,
        help="세션 소스 필터 (기본: 현재 하네스 — Claude Code=claude, 그 외=pi). "
             "pi=pi 세션만, claude=Claude Code 세션만, all=양쪽"
    )
    parser.add_argument(
        "--device", default=None, metavar="NAME",
        help="세션 코퍼스 디바이스 필터 (예: oracle, thinkpad). "
             "ANDENKEN_SESSION_CORPUS 가 설정된 경우에만 의미가 있다. "
             "명시적 --skip 이 없으면 skip 기본값이 0 이 된다 (현재 세션은 라이브라 "
             "device 필터에 애초에 안 걸린다). "
             "주의: device 는 '어디서 수집됐는가'이지 '어디서 만들어졌는가'가 아니다"
    )
    parser.add_argument(
        "--harness", choices=["gpt", "acp", "all"], default=None,
        help="pi 내부 하네스 필터. gpt=pi native OpenAI/Codex, "
             "acp=entwurf Claude (historical: pi-shell-acp), all=필터 없음. Claude Code source 의미는 바꾸지 않음"
    )
    parser.add_argument(
        "--min-kb", type=int, default=None,
        help=f"세션 크기 하한 KB, `size > min` (기본: {DEFAULT_MIN_KB}). "
             "0이면 크기 필터 끔 (직전 작은 세션도 회수)"
    )
    parser.add_argument(
        "--session-file", type=str, default=None, metavar="ABS_PATH",
        help="정확한 pi/Claude 세션 JSONL 1개. recency/size/corpus 필터를 명시적으로 우회"
    )

    args = parser.parse_args()

    exact = args.session_file is not None
    if exact:
        incompatible = []
        if args.sessions is not None:
            incompatible.append("--sessions")
        if args.project is not None:
            incompatible.append("--project")
        if args.all_projects:
            incompatible.append("--all-projects")
        if args.skip is not None:
            incompatible.append("--skip")
        if args.source is not None:
            incompatible.append("--source")
        if args.harness is not None:
            incompatible.append("--harness")
        if args.min_kb is not None:
            incompatible.append("--min-kb")
        if args.device is not None:
            incompatible.append("--device")
        if incompatible:
            parser.error(f"--session-file cannot be combined with {', '.join(incompatible)}")
        # `-m 0` 은 deque(maxlen=0) 로 전부 버린다. 그러면 아래 0건 guard 가 읽을 수
        # 있는 세션을 "읽을 게 없다"고 거짓 판정한다. 요청을 거절하는 편이 정직하다.
        if args.messages < 1:
            parser.error("--session-file requires --messages >= 1")
        try:
            files = [resolve_session_file(args.session_file)]
        except ValueError as error:
            parser.error(str(error))
    else:
        source = args.source if args.source else _default_source()
        harness = args.harness if args.harness else "all"
        # --device 는 skip 기본값을 0 으로 바꾼다. `--skip 1` 은 "지금 쓰이고 있는
        # 세션 = mtime 최신" 하나를 버리는 장치인데, 현재 세션은 이 기계의 **라이브**
        # 저장소에 있고 device 가 없어 어떤 --device 값에도 안 걸린다. 그래서 device
        # 필터를 건 목록의 맨 위는 항상 남의 기기의 *진짜* 최신 세션이고, 거기에 1 을
        # 건너뛰면 그걸 버린다. 측정 2026-09-03: `-p agent-config --device oracle` 이
        # 09-02T19:08 세션(69f08580)을 떨궜고 `--skip 0` 에서만 나왔다.
        # 명시적 --skip 은 그대로 존중한다.
        skip = args.skip if args.skip is not None else (0 if args.device else 1)
        min_kb = args.min_kb if args.min_kb is not None else DEFAULT_MIN_KB
        sessions = args.sessions if args.sessions is not None else 1

        files = find_session_files(
            source=source,
            project=args.project if not args.all_projects else None,
            device=args.device,
        )

        if not files:
            print("세션 파일 없음", file=sys.stderr)
            sys.exit(1)

        # 1) 현재 세션 건너뛰기 — 크기 무관 완전 최신순 목록 위에서 (현재 세션은 세션
        #    초반엔 작아 크기 필터에 걸릴 수 있으므로 skip 을 크기 필터보다 먼저 한다)
        files = files[skip:]

        # 2) pi 내부 하네스 필터 — 현재 세션 skip 이후 적용해야 최신 GPT/ACP가
        #    --skip 1 로 잘못 빠지지 않는다. Claude Code source 의미는 변경하지 않는다.
        if harness != "all":
            files = [t for t in files if t[3] == "pi" and detect_pi_harness(t[1]) == harness]

        # 3) 표시 후보에만 크기 필터 적용 — probe/test 단편 제거 (andenken 코퍼스 규율)
        pre_size_count = len(files)
        min_bytes = min_kb * 1024
        if min_bytes > 0:
            files = [t for t in files if t[1].stat().st_size > min_bytes]

        # 4) 최근 N개 세션
        files = files[:sessions]

        if not files:
            if pre_size_count > 0 and min_kb > 0:
                print(
                    f"No matching sessions after --min-kb {min_kb}; "
                    "retry the same project/source/harness with --min-kb 0.",
                    file=sys.stderr,
                )
            else:
                print("해당하는 세션 없음", file=sys.stderr)
            sys.exit(1)

    sessions_data = []
    for mtime, fpath, proj, src, dev in files:
        harness = detect_pi_harness(fpath) if src == "pi" else None
        data = extract_messages(
            fpath, args.messages, args.chars, args.commits, args.cost
        )
        # exact 선택은 구조/크기 필터를 우회하므로 "메시지 0건"이 여기까지 온다.
        # discovery 경로는 필터가 이미 걸러 도달하지 않는다. 헤더만 찍고 rc=0으로
        # 끝나면 호출자가 "무엇을 보고 있는지"를 적어놓고 본문 없이 요약하게 된다.
        if exact and not data.get("messages"):
            print(
                f"--session-file parsed 0 messages: {fpath}\n"
                "The file is under a session root but holds no readable "
                "user/assistant turns (empty, truncated, or not a session transcript).",
                file=sys.stderr,
            )
            sys.exit(1)
        sessions_data.append(
            {
                "meta": {
                    "project": proj,
                    "file": fpath.name,
                    "path": str(fpath),
                    "exact": exact,
                    "source": src,
                    "device": dev,
                    "harness": harness,
                    "size_kb": fpath.stat().st_size // 1024,
                    "mtime": datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat(),
                },
                "data": data,
            }
        )

    print(format_output(sessions_data, args.format))


if __name__ == "__main__":
    main()
