#!/usr/bin/env python3
"""session-recap: 세션 JSONL에서 핵심 텍스트만 추출.

raw JSONL을 직접 read하면 50KB JSON 노이즈가 컨텍스트에 들어감.
이 스크립트는 user/assistant 텍스트만 뽑아서 에이전트가 빠르게 맥락을 파악하게 한다.

Usage:
  session-recap.py                     # 직전 1개 세션, 마지막 20개 메시지
  session-recap.py --sessions 3        # 직전 3개 세션
  session-recap.py --messages 10       # 마지막 10개 메시지만
  session-recap.py --chars 500         # 메시지당 500자
  session-recap.py --all-projects      # 모든 프로젝트 (기본: 현재 CWD 프로젝트)
  session-recap.py --project config    # 특정 프로젝트
  session-recap.py --commits           # git 커밋 정보도 추출
  session-recap.py --cost              # 세션별 비용 요약
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def _extract_project(dirname: str) -> str:
    """세션 디렉토리명에서 프로젝트명 추출.

    pi는 CWD를 --{path}-- 형식으로 인코딩 (/ → -).
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

    # home-{user} 또는 home-{user}-{rest}
    m = re.match(r"home-[a-z]+(?:-(.+))?$", dirname)
    if not m:
        return dirname
    rest = m.group(1)
    if not rest:
        return "home"

    # repos-{category}-PROJECT
    m = re.match(r"repos-(?:gh|work|3rd)-(.+)", rest)
    if m:
        return m.group(1)

    # sync-{subfolder}-PROJECT (subfolder 뒤에 내용이 있으면 그것이 프로젝트)
    m = re.match(r"sync-([a-z]+)-(.*)", rest)
    if m and m.group(2):
        return m.group(2)

    # sync-PROJECT (org, screenshot 등 — subfolder 자체가 프로젝트)
    m = re.match(r"sync-(.*)", rest)
    if m:
        return m.group(1)

    # 홈 직속 (doomemacs 등)
    return rest


def get_sessions_dir() -> Path:
    return Path.home() / ".pi" / "agent" / "sessions"


def find_session_files(
    sessions_dir: Path, project: str | None = None
) -> list[tuple[float, Path, str]]:
    """(mtime, path, project_name) 목록을 최신순 반환."""
    results = []
    if not sessions_dir.exists():
        return results

    for subdir in sessions_dir.iterdir():
        if not subdir.is_dir():
            continue
        # 프로젝트 이름 추출: 세션 디렉토리명 → 프로젝트명
        # home-junghan-repos-gh-agent-config → agent-config
        # home-junghan-sync-org → org
        # home-junghan-sync-emacs-doomemacs-config → doomemacs-config
        # home-goqual-repos-gh-homeagent-config → homeagent-config (리모트)
        # delegate → delegate
        dirname = subdir.name.strip("-")
        proj = _extract_project(dirname)

        if project and project != proj:
            continue

        for f in subdir.iterdir():
            if f.suffix == ".jsonl":
                results.append((f.stat().st_mtime, f, proj))

    results.sort(key=lambda x: x[0], reverse=True)
    return results


def extract_messages(
    filepath: Path, max_messages: int, max_chars: int, include_commits: bool, include_cost: bool
) -> dict:
    """세션 파일에서 핵심 정보 추출."""
    messages = []
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

            # 세션 메타
            if d.get("type") == "session":
                ts = d.get("timestamp", "")
                if ts:
                    session_start = ts

            if d.get("type") != "message":
                continue

            msg = d.get("message", {})
            role = msg.get("role", "")
            ts = d.get("timestamp", "")

            # 비용 집계
            usage = msg.get("usage", {})
            if usage:
                cost_info = usage.get("cost", {})
                total_cost += cost_info.get("total", 0)
                total_input += usage.get("input", 0)
                total_output += usage.get("output", 0)

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
                    elif c.get("type") == "toolCall":
                        tools.append(c.get("name", ""))
                        # git commit 추출
                        if include_commits and c.get("name") == "bash":
                            args = c.get("arguments", {})
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

    # 마지막 N개만
    messages = messages[-max_messages:]

    result = {
        "messages": messages,
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

        lines.append(f"═══ {meta['project']} ({meta['file'][:40]}...) ═══")
        lines.append(f"  기간: {stats.get('start', '?')[:19]} → {stats.get('end', '?')[:19]}")
        if "cost" in stats:
            lines.append(f"  비용: {stats['cost']} (in:{stats['input_tokens']:,} out:{stats['output_tokens']:,})")
        lines.append("")

        for m in data["messages"]:
            icon = "👤" if m["role"] == "user" else "🤖"
            text = m["text"].replace("\n", " ")[:200]
            ts_short = m.get("ts", "")[:19].split("T")[-1] if m.get("ts") else ""
            if m.get("tools"):
                tool_str = ",".join(m["tools"])
                lines.append(f"  {icon} [{ts_short}] ({tool_str}) {text}")
            else:
                lines.append(f"  {icon} [{ts_short}] {text}")

        if data.get("commits"):
            lines.append("\n  📦 커밋:")
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

    args = parser.parse_args()

    sessions_dir = get_sessions_dir()
    files = find_session_files(sessions_dir, args.project if not args.all_projects else None)

    if not files:
        print("세션 파일 없음", file=sys.stderr)
        sys.exit(1)

    # 현재 세션 건너뛰기
    files = files[args.skip:]
    files = files[: args.sessions]

    if not files:
        print("해당하는 세션 없음", file=sys.stderr)
        sys.exit(1)

    sessions_data = []
    for mtime, fpath, proj in files:
        data = extract_messages(
            fpath, args.messages, args.chars, args.commits, args.cost
        )
        sessions_data.append(
            {
                "meta": {
                    "project": proj,
                    "file": fpath.name,
                    "size_kb": fpath.stat().st_size // 1024,
                    "mtime": datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat(),
                },
                "data": data,
            }
        )

    print(format_output(sessions_data, args.format))


if __name__ == "__main__":
    main()
