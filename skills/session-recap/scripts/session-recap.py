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
# andenken 0d4432b "tighten corpus to garden-native >300KB, drop tmp + legacy".
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


def _is_garden_native_pi_file(filename: str) -> bool:
    """0.9.0 이후 garden-native pi 세션 파일명.

    `<created-at>_<sessionId>.jsonl` 에서 sessionId 는 pi-shell-acp SSOT
    SESSION_ID_RE = /^\\d{8}T\\d{6}-[0-9a-f]{6}$/. 구형 종(`_<uuid>`, `_entwurf-…`,
    `_delegate-…`)은 폐기·미인덱싱. claude 는 항상 UUID라 미적용. andenken
    isGardenNativePiFile 과 동일 (full sessionId anchored → future drift fail-fast).
    """
    return bool(re.search(r"_\d{8}T\d{6}-[0-9a-f]{6}\.jsonl$", filename))


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


def get_sessions_dirs(source: str = "all") -> list[tuple[Path, str]]:
    """하네스별 세션 디렉토리 반환. (path, source_name) 튜플 리스트."""
    dirs = []
    pi_dir = Path.home() / ".pi" / "agent" / "sessions"
    claude_dir = Path.home() / ".claude" / "projects"
    if source in ("all", "pi") and pi_dir.exists():
        dirs.append((pi_dir, "pi"))
    if source in ("all", "claude") and claude_dir.exists():
        dirs.append((claude_dir, "claude"))
    return dirs


def find_session_files(
    source: str = "all", project: str | None = None
) -> list[tuple[float, Path, str, str]]:
    """(mtime, path, project_name, source) 목록을 최신순 반환.

    **구조 필터만** 적용 (크기 필터는 호출자가 skip 후 적용 — 아래 설명).
    - tmp/probe 프로젝트 디렉토리 제외 (양 런타임)
    - 비어있지 않은 파일 전부 (size > 0)
    - pi 는 garden-native 파일명만 (구형 _uuid/_delegate/_entwurf 제외); claude 미적용
    - claude 는 top-level + UUID 하위폴더(session-id 폴더)까지 스캔, `subagents` 폴더 제외
      (andenken scanClaudeDir 와 정합). pi 는 flat 구조라 top-level 만.

    크기 필터(`--min-kb`)를 여기서 적용하지 않는 이유: 현재 라이브 세션은 세션 초반엔
    아직 작아(<300KB) 크기 필터에 걸려 목록에서 빠진다. 그러면 `--skip 1`(현재 세션
    제외)이 목록 맨 위의 *직전 실작업* 세션을 대신 버려 엉뚱한 세션을 회수한다.
    "현재 세션 = mtime 최신"은 하네스 무관 불변식이므로, skip 은 구조 필터만 적용한
    완전한 최신순 목록 위에서 해야 정확하다. 크기 필터는 skip 이후 표시 후보에만 건다.
    """
    results = []
    for sessions_dir, src in get_sessions_dirs(source):
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
                if src == "pi" and not _is_garden_native_pi_file(f.name):
                    continue
                try:
                    st = f.stat()
                except OSError:
                    continue
                if st.st_size <= 0:
                    continue
                results.append((st.st_mtime, f, proj, src))

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

            role = msg.get("role", "")
            ts = d.get("timestamp", "")

            # 세션 시작 fallback (session/queue-operation이 없을 때)
            if not session_start and ts:
                session_start = ts

            # 비용 집계
            # pi:         usage.input / usage.output / usage.cost.total
            # Claude Code: usage.input_tokens / usage.output_tokens (cost 없음)
            usage = msg.get("usage", {})
            if usage:
                cost_info = usage.get("cost", {})
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

        source_label = f" [{meta['source']}]" if meta.get("source") else ""
        lines.append(f"═══ {meta['project']}{source_label} ({meta['file'][:40]}...) ═══")
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
        "--sessions", "-s", type=int, default=1, help="직전 N개 세션 (기본: 1)"
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
        "--skip", type=int, default=1, help="최신 N개 세션 건너뛰기 (기본: 1, 현재 세션)"
    )
    parser.add_argument(
        "--source", choices=["pi", "claude", "all"], default=None,
        help="세션 소스 필터 (기본: 현재 하네스 — Claude Code=claude, 그 외=pi). "
             "pi=pi 세션만, claude=Claude Code 세션만, all=양쪽"
    )
    parser.add_argument(
        "--min-kb", type=int, default=DEFAULT_MIN_KB,
        help=f"세션 크기 하한 KB, `size > min` (기본: {DEFAULT_MIN_KB}). "
             "0이면 크기 필터 끔 (직전 작은 세션도 회수)"
    )

    args = parser.parse_args()

    source = args.source if args.source else _default_source()

    files = find_session_files(
        source=source,
        project=args.project if not args.all_projects else None,
    )

    if not files:
        print("세션 파일 없음", file=sys.stderr)
        sys.exit(1)

    # 1) 현재 세션 건너뛰기 — 크기 무관 완전 최신순 목록 위에서 (현재 세션은 세션
    #    초반엔 작아 크기 필터에 걸릴 수 있으므로 skip 을 크기 필터보다 먼저 한다)
    files = files[args.skip:]

    # 2) 표시 후보에만 크기 필터 적용 — probe/test 단편 제거 (andenken 코퍼스 규율)
    min_bytes = args.min_kb * 1024
    if min_bytes > 0:
        files = [t for t in files if t[1].stat().st_size > min_bytes]

    # 3) 최근 N개 세션
    files = files[: args.sessions]

    if not files:
        print("해당하는 세션 없음", file=sys.stderr)
        sys.exit(1)

    sessions_data = []
    for mtime, fpath, proj, src in files:
        data = extract_messages(
            fpath, args.messages, args.chars, args.commits, args.cost
        )
        sessions_data.append(
            {
                "meta": {
                    "project": proj,
                    "file": fpath.name,
                    "source": src,
                    "size_kb": fpath.stat().st_size // 1024,
                    "mtime": datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat(),
                },
                "data": data,
            }
        )

    print(format_output(sessions_data, args.format))


if __name__ == "__main__":
    main()
