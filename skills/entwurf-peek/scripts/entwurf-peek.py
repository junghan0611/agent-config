#!/usr/bin/env python3
"""entwurf-peek: sync entwurf를 들여다보는 손.

호출자가 sync entwurf로 묶여있을 때 자식 분신이 무엇을 하고 있는지 확인.
entwurf_peers MCP가 control socket 있는 세션만 노출하는 한계를 보완 —
자식 entwurf-*.jsonl도 함께 보여준다.

Subcommands:
  peek <id|file>       진행 중 세션 안 들여다보기 (마지막 메시지 + 활성 여부)
  map                  살아있는 세션 전체 지도 (sockets + 최근 entwurf 파일)
  trace <parent-id>    부모 세션이 던진 자식 entwurf 추적

JSONL 파서는 session-recap 헬퍼 재사용.
peers 정보는 ~/.pi/entwurf-control/*.sock 디렉토리 직접 스캔.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────────────

SESSIONS_DIR = Path.home() / ".pi" / "agent" / "sessions"
CONTROL_DIR = Path.home() / ".pi" / "entwurf-control"


# ──────────────────────────────────────────────────────────────────────────────
# Activity classification
# ──────────────────────────────────────────────────────────────────────────────

ACTIVE_THRESHOLD_S = 30
IDLE_THRESHOLD_S = 300  # 5 min


def classify_activity(mtime: float, now: float | None = None) -> str:
    """mtime 기준 활성도 분류. 'active' | 'idle' | 'done'."""
    now = now or datetime.now().timestamp()
    age = now - mtime
    if age < ACTIVE_THRESHOLD_S:
        return "active"
    if age < IDLE_THRESHOLD_S:
        return "idle"
    return "done"


def status_icon(status: str, plain: bool = False) -> str:
    if plain:
        return {"active": "[ACTIVE]", "idle": "[IDLE  ]", "done": "[DONE  ]"}[status]
    return {"active": "🔴", "idle": "🟡", "done": "⚫"}[status]


def fmt_age(mtime: float, now: float | None = None) -> str:
    now = now or datetime.now().timestamp()
    age = int(now - mtime)
    if age < 60:
        return f"{age}s"
    if age < 3600:
        return f"{age // 60}m{age % 60:02d}s"
    return f"{age // 3600}h{(age % 3600) // 60:02d}m"


def fmt_ts(ts: str) -> str:
    if not ts:
        return "?"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.astimezone().strftime("%H:%M:%S")
    except (ValueError, TypeError):
        return ts[11:19] if len(ts) >= 19 else ts


# ──────────────────────────────────────────────────────────────────────────────
# Session file discovery
# ──────────────────────────────────────────────────────────────────────────────

def parse_filename(path: Path) -> dict:
    """세션 파일 분류.

    Returns dict with:
      kind: 'uuid' | 'entwurf' | 'delegate'
      id:   full UUID or 8-hex
      short: short id for display (8 chars)
    """
    stem = path.stem
    # 2026-04-30T09-27-12-568Z_entwurf-ddb3cbb2
    if "_" in stem:
        _, suffix = stem.split("_", 1)
    else:
        suffix = stem

    m = re.match(r"^entwurf-([a-f0-9]+)$", suffix)
    if m:
        return {"kind": "entwurf", "id": m.group(1), "short": m.group(1)[:8]}
    m = re.match(r"^delegate-([a-f0-9]+)$", suffix)
    if m:
        return {"kind": "delegate", "id": m.group(1), "short": m.group(1)[:8]}
    # full UUID
    return {"kind": "uuid", "id": suffix, "short": suffix.split("-")[0][:8]}


def find_active_sockets() -> set[str]:
    """~/.pi/entwurf-control/*.sock → UUID set."""
    if not CONTROL_DIR.exists():
        return set()
    return {s.stem for s in CONTROL_DIR.glob("*.sock")}


def find_session_files(
    project: str | None = None,
    only_entwurf: bool = False,
    since_seconds: int | None = None,
) -> list[Path]:
    """세션 파일 검색. mtime 최신순."""
    if not SESSIONS_DIR.exists():
        return []
    now = datetime.now().timestamp()
    results = []
    for proj_dir in SESSIONS_DIR.iterdir():
        if not proj_dir.is_dir():
            continue
        if project:
            dirname = proj_dir.name.strip("-")
            # cwd 디렉토리명에 project가 포함되면 매칭
            if project not in dirname:
                continue
        for f in proj_dir.iterdir():
            if f.suffix != ".jsonl":
                continue
            info = parse_filename(f)
            if only_entwurf and info["kind"] not in ("entwurf", "delegate"):
                continue
            mtime = f.stat().st_mtime
            if since_seconds is not None and (now - mtime) > since_seconds:
                continue
            results.append(f)
    results.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return results


def resolve_session(target: str) -> Path | None:
    """ID(8hex/full UUID/entwurf-xxx) 또는 파일 경로를 실제 JSONL 경로로 해결."""
    p = Path(target).expanduser()
    if p.is_file():
        return p
    if p.is_absolute() and p.exists():
        return p

    # bare token search across all sessions
    needle = target
    if needle.startswith("entwurf-") or needle.startswith("delegate-"):
        needle = needle.split("-", 1)[1]
    needle = needle.lower()

    matches = []
    for f in find_session_files():
        info = parse_filename(f)
        if info["id"].lower().startswith(needle) or info["short"].lower() == needle[:8]:
            matches.append(f)

    if not matches:
        return None
    # 동일 ID 여러 매치면 가장 최근
    matches.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0]


# ──────────────────────────────────────────────────────────────────────────────
# JSONL parsing
# ──────────────────────────────────────────────────────────────────────────────

# parent에서 child entwurf id를 추출하는 패턴
# 예: "[tool:done] mcp__pi-tools-bridge__entwurf — Task ID: ddb3cbb2"
# 닫는 괄호/em-dash/공백 등 가변 → 핵심은 entwurf 호출 텍스트와 같은 라인의 "Task ID:"
TASK_ID_RE = re.compile(
    r"mcp__pi-tools-bridge__entwurf[^\n]{0,200}?Task ID:\s*([a-f0-9]+)",
    re.IGNORECASE,
)


def read_jsonl_safe(path: Path) -> list[dict]:
    """JSONL 안전 읽기. 마지막 partial line 자동 스킵."""
    out = []
    try:
        with open(path) as f:
            content = f.read()
    except OSError:
        return out
    for line in content.split("\n"):
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except (json.JSONDecodeError, ValueError):
            # writer in progress — 마지막 partial 라인이면 스킵
            continue
    return out


def find_child_entwurf_ids(parent_path: Path) -> list[tuple[str, str]]:
    """부모 JSONL에서 자식 entwurf Task ID 추출.

    Returns list of (timestamp, child_id_8hex).
    """
    out = []
    for rec in read_jsonl_safe(parent_path):
        if rec.get("type") != "message":
            continue
        msg = rec.get("message", {})
        if msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        ts = rec.get("timestamp", "")
        for c in content:
            if not isinstance(c, dict):
                continue
            text = c.get("text", "")
            if not text:
                continue
            for m in TASK_ID_RE.finditer(text):
                out.append((ts, m.group(1)))
    return out


def extract_peek_data(path: Path, n_msgs: int, n_tools: int, include_thinking: bool) -> dict:
    """세션 JSONL → peek용 컴팩트 데이터.

    - 마지막 N개 user/assistant 메시지 (text 발췌)
    - 최근 N개 tool 호출 흔적 ([tool:start]/[tool:done] 텍스트 라인)
    - 최근 thinking 블록 1개 (옵션)
    - 기간, 라인 수, 부모-자식 시그널
    """
    records = read_jsonl_safe(path)

    messages = []          # user/assistant 텍스트 메시지
    tool_lines = []        # 인라인 tool 흔적 (텍스트로 들어옴)
    last_thinking = None
    session_start = None
    session_end = None
    first_user_task = None
    model = None

    for rec in records:
        t = rec.get("type", "")
        ts = rec.get("timestamp", "")

        if t == "session" or t == "queue-operation":
            session_start = session_start or ts
            continue
        if t == "model_change":
            model = rec.get("model") or rec.get("to") or model
            continue
        if t != "message":
            continue

        msg = rec.get("message", {})
        role = msg.get("role", "")
        if role not in ("user", "assistant", "toolResult"):
            continue

        if not session_start:
            session_start = ts
        session_end = ts

        content = msg.get("content", [])
        # toolResult role: skip in messages list (these are tool outputs)
        if role == "toolResult":
            continue

        texts = []
        if isinstance(content, str):
            texts.append(content)
        elif isinstance(content, list):
            for c in content:
                if not isinstance(c, dict):
                    continue
                ct = c.get("type")
                if ct == "text":
                    txt = c.get("text", "")
                    if txt:
                        # tool inline marker?
                        if txt.startswith("\n[tool:") or txt.startswith("[tool:"):
                            tool_lines.append((ts, txt.strip()))
                        elif "[permission:" in txt:
                            tool_lines.append((ts, txt.strip()))
                        else:
                            texts.append(txt)
                elif ct == "thinking":
                    if include_thinking:
                        thk = c.get("thinking", "")
                        if thk:
                            last_thinking = (ts, thk)

        text = "\n".join(texts).strip()
        if not text:
            continue

        # 첫 user 메시지 = task
        if role == "user" and first_user_task is None:
            first_user_task = text

        messages.append({"role": role, "ts": ts, "text": text})

    return {
        "messages": messages[-n_msgs:],
        "tool_trail": tool_lines[-n_tools:],
        "last_thinking": last_thinking,
        "session_start": session_start,
        "session_end": session_end,
        "first_user_task": first_user_task,
        "model": model,
        "record_count": len(records),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Subcommand: peek
# ──────────────────────────────────────────────────────────────────────────────

def cmd_peek(args) -> int:
    path = resolve_session(args.target)
    if path is None:
        print(f"세션 못 찾음: {args.target}", file=sys.stderr)
        return 1

    info = parse_filename(path)
    mtime = path.stat().st_mtime
    status = classify_activity(mtime)
    sockets = find_active_sockets()
    has_socket = info["kind"] == "uuid" and info["id"] in sockets

    data = extract_peek_data(path, args.messages, args.tools, args.thinking)

    icon = status_icon(status, args.plain)
    age = fmt_age(mtime)
    sock = " [socket]" if has_socket else ""

    lines = []
    lines.append(f"═══ {icon} {info['kind']}-{info['short']}  ({age} ago){sock} ═══")
    lines.append(f"  file:   {path.parent.name}/{path.name}")
    if data["model"]:
        lines.append(f"  model:  {data['model']}")
    lines.append(f"  span:   {fmt_ts(data['session_start'])} → {fmt_ts(data['session_end'])}  ({data['record_count']} records)")

    if data["first_user_task"]:
        task = data["first_user_task"].replace("\n", " ")
        # project-context 태그 제거 후 첫 의미 줄
        task = re.sub(r"<project-context[^>]*>.*?</project-context>", "[project-context]", task, flags=re.DOTALL)
        lines.append(f"  task:   {task[:args.chars]}")

    if data["last_thinking"]:
        ts_t, thk = data["last_thinking"]
        thk_clean = thk.replace("\n", " ")[:args.chars]
        lines.append(f"\n  💭 thinking [{fmt_ts(ts_t)}]: {thk_clean}")

    if data["tool_trail"]:
        lines.append("\n  🔧 recent tools:")
        for ts, txt in data["tool_trail"]:
            lines.append(f"    [{fmt_ts(ts)}] {txt[:args.chars]}")

    if data["messages"]:
        lines.append("\n  💬 messages:")
        for m in data["messages"]:
            ic = "👤" if m["role"] == "user" else "🤖"
            if args.plain:
                ic = "U" if m["role"] == "user" else "A"
            txt = m["text"].replace("\n", " ")[:args.chars]
            lines.append(f"    {ic} [{fmt_ts(m['ts'])}] {txt}")

    print("\n".join(lines))
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# Subcommand: map
# ──────────────────────────────────────────────────────────────────────────────

def cmd_map(args) -> int:
    sockets = find_active_sockets()
    # 1차: since 윈도우 안 세션 모두
    files = find_session_files(
        project=args.project,
        only_entwurf=False,
        since_seconds=args.since,
    )
    # 2차: control socket이 있는 세션은 윈도우 밖이라도 강제 포함 (활성 시그널)
    if sockets:
        files_set = set(files)
        for f in find_session_files(project=args.project, only_entwurf=False):
            info = parse_filename(f)
            if info["kind"] == "uuid" and info["id"] in sockets and f not in files_set:
                files.append(f)
                files_set.add(f)
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    if not files:
        print("살아있는 세션 없음", file=sys.stderr)
        return 1

    rows = []
    for f in files:
        info = parse_filename(f)
        mtime = f.stat().st_mtime
        status = classify_activity(mtime)
        has_socket = info["kind"] == "uuid" and info["id"] in sockets

        # done 상태는 기본 제외 — 단 socket이 살아있으면 강제 노출
        if status == "done" and not args.all and not has_socket:
            continue

        rows.append({
            "info": info,
            "path": f,
            "mtime": mtime,
            "status": status,
            "has_socket": has_socket,
        })

    if not rows:
        print(f"활성 세션 없음 (since {args.since}s)", file=sys.stderr)
        return 1

    # cwd 디렉토리별 그룹
    by_proj: dict[str, list] = {}
    for r in rows:
        proj_dir = r["path"].parent.name.strip("-")
        by_proj.setdefault(proj_dir, []).append(r)

    lines = []
    total_active = sum(1 for r in rows if r["status"] == "active")
    total_idle = sum(1 for r in rows if r["status"] == "idle")
    total_done = sum(1 for r in rows if r["status"] == "done")
    lines.append(
        f"═══ session map  "
        f"🔴{total_active} active · 🟡{total_idle} idle · ⚫{total_done} done · "
        f"sockets: {len(sockets)} ═══"
    )

    for proj, items in sorted(by_proj.items(), key=lambda x: -max(r["mtime"] for r in x[1])):
        lines.append(f"\n  📁 {proj}/")
        for r in items:
            icon = status_icon(r["status"], args.plain)
            sock = "🔌" if r["has_socket"] else "  "
            kind = r["info"]["kind"]
            short = r["info"]["short"]
            age = fmt_age(r["mtime"])
            lines.append(f"    {icon} {sock} {kind:8} {short}  ({age} ago)")

    print("\n".join(lines))
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# Subcommand: trace
# ──────────────────────────────────────────────────────────────────────────────

def cmd_trace(args) -> int:
    parent_path = resolve_session(args.parent)
    if parent_path is None:
        print(f"부모 세션 못 찾음: {args.parent}", file=sys.stderr)
        return 1

    parent_info = parse_filename(parent_path)
    parent_mtime = parent_path.stat().st_mtime
    parent_status = classify_activity(parent_mtime)
    sockets = find_active_sockets()
    parent_has_socket = parent_info["kind"] == "uuid" and parent_info["id"] in sockets

    # 1차 시그널: 부모 JSONL의 [tool:done] entwurf — Task ID: <hex>
    declared = find_child_entwurf_ids(parent_path)
    declared_ids = {child_id for _, child_id in declared}

    # 2차 시그널: 같은 cwd 디렉토리의 entwurf-* 파일
    siblings = []
    for f in parent_path.parent.iterdir():
        if f.suffix != ".jsonl" or f == parent_path:
            continue
        info = parse_filename(f)
        if info["kind"] not in ("entwurf", "delegate"):
            continue
        siblings.append((f, info))

    # 자식 결정: declared_ids에 들어있거나, 부모 활동 시간대 ±N분 이내
    children = []
    for f, info in siblings:
        mtime = f.stat().st_mtime
        # 8hex match
        matched = any(info["id"].startswith(d) or d.startswith(info["id"]) for d in declared_ids)
        # 시간 인접: 부모 시간대 내
        time_adj = abs(mtime - parent_mtime) <= 7200  # 2 hour window
        if matched or (args.heuristic and time_adj):
            children.append({
                "path": f,
                "info": info,
                "mtime": mtime,
                "status": classify_activity(mtime),
                "matched_by": "declared" if matched else "time_adjacent",
            })

    children.sort(key=lambda c: c["mtime"])

    # 출력
    lines = []
    p_icon = status_icon(parent_status, args.plain)
    p_sock = " 🔌" if parent_has_socket else ""
    lines.append(
        f"═══ trace {parent_info['kind']}-{parent_info['short']} {p_icon}{p_sock} "
        f"({fmt_age(parent_mtime)} ago) ═══"
    )
    lines.append(f"  parent: {parent_path.parent.name}/{parent_path.name}")
    lines.append(f"  declared task IDs in parent: {len(declared_ids)} → {sorted(declared_ids)}")
    lines.append(f"  entwurf siblings in same cwd: {len(siblings)}")

    if not children:
        lines.append("\n  (자식 없음)")
    else:
        lines.append(f"\n  children ({len(children)}):")
        for c in children:
            icon = status_icon(c["status"], args.plain)
            kind = c["info"]["kind"]
            short = c["info"]["short"]
            age = fmt_age(c["mtime"])
            lines.append(f"    {icon} {kind:8} {short}  ({age} ago)  [{c['matched_by']}]")

    print("\n".join(lines))
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="entwurf-peek — sync entwurf 자식을 들여다보는 손",
    )
    parser.add_argument("--plain", action="store_true", help="ASCII fallback (no emoji)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    # peek
    p_peek = sub.add_parser("peek", help="진행 중 세션 안 들여다보기")
    p_peek.add_argument("target", help="세션 ID (8hex/full UUID/entwurf-xxx) 또는 파일 경로")
    p_peek.add_argument("-m", "--messages", type=int, default=4,
                        help="마지막 N개 user/assistant 메시지 (기본 4)")
    p_peek.add_argument("-t", "--tools", type=int, default=5,
                        help="최근 N개 tool 흔적 (기본 5)")
    p_peek.add_argument("-c", "--chars", type=int, default=200,
                        help="요소당 최대 글자 (기본 200)")
    p_peek.add_argument("--thinking", action="store_true",
                        help="최근 thinking 블록 1개 포함 (기본 off)")
    p_peek.set_defaults(func=cmd_peek)

    # map
    p_map = sub.add_parser("map", help="살아있는 세션 전체 지도")
    p_map.add_argument("-p", "--project", help="프로젝트 디렉토리명 부분 매치 필터")
    p_map.add_argument("--since", type=int, default=3600,
                       help="최근 N초 이내 활동한 세션만 (기본 3600=1h)")
    p_map.add_argument("-a", "--all", action="store_true",
                       help="done 상태 세션도 포함")
    p_map.set_defaults(func=cmd_map)

    # trace
    p_tr = sub.add_parser("trace", help="부모로부터 자식 entwurf 추적")
    p_tr.add_argument("parent", help="부모 세션 ID 또는 파일 경로")
    p_tr.add_argument("--heuristic", action="store_true",
                      help="declared 매치 외 시간 인접 자식도 포함 (기본 off)")
    p_tr.set_defaults(func=cmd_trace)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
