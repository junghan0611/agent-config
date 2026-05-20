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
UUID_RE = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", re.IGNORECASE)


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


def iter_session_files_in_dir(dir_path: Path) -> list[Path]:
    files = []
    if not dir_path.exists():
        return files
    for f in dir_path.iterdir():
        if f.suffix == ".jsonl":
            files.append(f)
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files


def format_session_label(path: Path, info: dict | None = None) -> str:
    info = info or parse_filename(path)
    return f"{info['kind']}-{info['short']}"


def resolve_session(target: str) -> tuple[Path | None, str | None]:
    """ID(8hex/full UUID/entwurf-xxx) 또는 파일 경로를 실제 JSONL 경로로 해결.

    full UUID는 exact match 우선. 짧은 prefix가 여러 세션과 충돌하면 최근 것으로
    침묵 선택하지 않고 ambiguous 에러를 돌려준다.
    """
    p = Path(target).expanduser()
    if p.is_file():
        return p, None
    if p.is_absolute() and p.exists():
        return p, None

    needle = target.strip()
    if needle.startswith("entwurf-") or needle.startswith("delegate-"):
        needle = needle.split("-", 1)[1]
    needle = needle.lower()

    candidates: list[tuple[Path, dict]] = []
    for f in find_session_files():
        info = parse_filename(f)
        candidates.append((f, info))

    if UUID_RE.fullmatch(needle):
        exact = [f for f, info in candidates if info["kind"] == "uuid" and info["id"].lower() == needle]
        if not exact:
            return None, f"세션 못 찾음: {target}"
        exact.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return exact[0], None

    exact = [f for f, info in candidates if info["id"].lower() == needle]
    if len(exact) == 1:
        return exact[0], None
    if len(exact) > 1:
        exact.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return exact[0], None

    prefix_matches = []
    for f, info in candidates:
        id_l = info["id"].lower()
        short_l = info["short"].lower()
        if id_l.startswith(needle) or (len(needle) <= 8 and short_l == needle):
            prefix_matches.append((f, info))

    if not prefix_matches:
        return None, f"세션 못 찾음: {target}"

    uniq_ids = {info["id"].lower() for _, info in prefix_matches}
    if len(uniq_ids) > 1:
        preview = ", ".join(
            f"{format_session_label(f, info)}@{f.parent.name}/{f.name}"
            for f, info in prefix_matches[:5]
        )
        return None, f"세션 ID ambiguous: {target} → {preview}"

    prefix_matches.sort(key=lambda x: x[0].stat().st_mtime, reverse=True)
    return prefix_matches[0][0], None


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


def find_declared_parents(child_path: Path) -> list[dict]:
    """child entwurf/delegate를 declared 완료 메시지로 가리키는 부모 세션 찾기."""
    child_info = parse_filename(child_path)
    if child_info["kind"] not in ("entwurf", "delegate"):
        return []

    child_id = child_info["id"].lower()
    parents = []
    for f in iter_session_files_in_dir(child_path.parent):
        if f == child_path:
            continue
        declared = find_child_entwurf_ids(f)
        if not declared:
            continue
        if any(child_id.startswith(d.lower()) or d.lower().startswith(child_id) for _, d in declared):
            info = parse_filename(f)
            parents.append({
                "path": f,
                "info": info,
                "mtime": f.stat().st_mtime,
                "matched_by": "declared",
            })

    parents.sort(key=lambda p: p["mtime"], reverse=True)
    return parents


def find_heuristic_parents(child_path: Path, window_seconds: int = 7200) -> list[dict]:
    """declared parent가 아직 안 박혔을 때 같은 cwd의 시간 인접 후보를 준다."""
    child_info = parse_filename(child_path)
    if child_info["kind"] not in ("entwurf", "delegate"):
        return []

    child_mtime = child_path.stat().st_mtime
    out = []
    for f in iter_session_files_in_dir(child_path.parent):
        if f == child_path:
            continue
        info = parse_filename(f)
        if info["kind"] not in ("uuid", "entwurf", "delegate"):
            continue
        mtime = f.stat().st_mtime
        if abs(mtime - child_mtime) > window_seconds:
            continue
        # 일반적으로 caller는 uuid 부모가 더 그럴듯하므로 가벼운 bias
        score = abs(mtime - child_mtime) + (0 if info["kind"] == "uuid" else 600)
        out.append({
            "path": f,
            "info": info,
            "mtime": mtime,
            "matched_by": "time_adjacent",
            "score": score,
        })

    out.sort(key=lambda x: (x["score"], -x["mtime"]))
    return out


def find_callers_for_child(child_path: Path) -> list[dict]:
    declared = find_declared_parents(child_path)
    if declared:
        return declared
    return find_heuristic_parents(child_path)


def extract_peek_data(path: Path, n_msgs: int, n_tools: int, include_thinking: bool) -> dict:
    """세션 JSONL → peek용 컴팩트 데이터.

    - 마지막 N개 user/assistant 메시지 (text 발췌)
    - 최근 N개 tool 호출 흔적 ([tool:start]/[tool:done] 텍스트 라인)
    - 최근 thinking 블록 1개 (옵션)
    - 기간, 라인 수, 부모-자식 시그널
    - 모델/provider, 현재 상태(대기/도구 실행/응답 대기) 추정
    """
    records = read_jsonl_safe(path)

    messages = []
    tool_lines = []
    last_thinking = None
    session_start = None
    session_end = None
    first_user_task = None
    model = None
    last_role_any = None
    last_event = None
    pending_tool_calls: dict[str, dict] = {}
    pending_inline_count = 0

    def set_model(provider: str | None, model_id: str | None):
        nonlocal model
        if provider and model_id:
            model = f"{provider}/{model_id}"
        elif model_id:
            model = model_id

    for rec in records:
        t = rec.get("type", "")
        ts = rec.get("timestamp", "")

        if t == "session" or t == "queue-operation":
            session_start = session_start or ts
            continue
        if t == "model_change":
            set_model(rec.get("provider"), rec.get("modelId") or rec.get("model") or rec.get("to"))
            continue
        if t != "message":
            continue

        msg = rec.get("message", {})
        role = msg.get("role", "")
        if role not in ("user", "assistant", "toolResult"):
            continue

        last_role_any = role
        if not session_start:
            session_start = ts
        session_end = ts

        if role == "assistant":
            set_model(msg.get("provider") or rec.get("provider"), msg.get("model") or rec.get("model"))

        content = msg.get("content", [])
        if role == "toolResult":
            tool_name = msg.get("toolName", "tool")
            tool_call_id = msg.get("toolCallId")
            is_error = bool(msg.get("isError"))
            if tool_call_id:
                pending_tool_calls.pop(tool_call_id, None)
            last_event = "tool_result"
            tool_lines.append((ts, f"[tool:{'failed' if is_error else 'done'}] {tool_name}"))
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
                    if not txt:
                        continue
                    stripped = txt.strip()
                    if txt.startswith("\n[tool:") or txt.startswith("[tool:"):
                        tool_lines.append((ts, stripped))
                        if "[tool:start]" in stripped:
                            pending_inline_count += 1
                            last_event = "inline_tool_start"
                        elif "[tool:done]" in stripped or "[tool:failed]" in stripped:
                            pending_inline_count = max(0, pending_inline_count - 1)
                            last_event = "tool_result"
                    elif "[permission:" in txt:
                        tool_lines.append((ts, stripped))
                    else:
                        texts.append(txt)
                        last_event = "assistant_text" if role == "assistant" else "user_text"
                elif ct == "thinking":
                    if include_thinking:
                        thk = c.get("thinking", "")
                        if thk:
                            last_thinking = (ts, thk)
                elif ct == "toolCall":
                    tool_name = c.get("name", "tool")
                    tool_call_id = c.get("id") or f"{ts}:{len(pending_tool_calls)}"
                    pending_tool_calls[tool_call_id] = {"name": tool_name, "ts": ts}
                    last_event = "tool_start"
                    tool_lines.append((ts, f"[tool:start] {tool_name}"))

        text = "\n".join(texts).strip()
        if not text:
            continue

        if role == "user" and first_user_task is None:
            first_user_task = text

        messages.append({"role": role, "ts": ts, "text": text})

    # State is a last-event heuristic. Stale orphaned tool calls can remain in
    # old JSONL, so only report "tool running" when the newest event itself is a
    # tool start. If a later assistant text exists, the session is waiting for user.
    pending_names = [v["name"] for _, v in sorted(pending_tool_calls.items(), key=lambda x: x[1]["ts"])]
    if last_event == "tool_start":
        current_state = f"tool running: {', '.join(pending_names[:3])}" if pending_names else "tool running"
    elif last_event == "inline_tool_start" and pending_inline_count > 0:
        current_state = "tool running (inline)"
    elif last_event == "tool_result" or last_role_any == "toolResult":
        current_state = "tool finished; awaiting assistant reply"
    elif last_event == "user_text" or (messages and messages[-1]["role"] == "user"):
        current_state = "awaiting assistant reply"
    elif last_event == "assistant_text" or (messages and messages[-1]["role"] == "assistant"):
        current_state = "waiting for user"
    else:
        current_state = "unknown"

    return {
        "messages": messages[-n_msgs:],
        "tool_trail": tool_lines[-n_tools:],
        "last_thinking": last_thinking,
        "session_start": session_start,
        "session_end": session_end,
        "first_user_task": first_user_task,
        "model": model,
        "current_state": current_state,
        "record_count": len(records),
    }


def compact_model_state_suffix(detail: dict) -> str:
    """한 줄 출력용 compact model/state suffix."""
    parts = []
    model = detail.get("model")
    if model:
        parts.append(model.split("/")[-1])
    state = detail.get("current_state")
    if state:
        parts.append(state)
    return "  · " + " / ".join(parts) if parts else ""


# ──────────────────────────────────────────────────────────────────────────────
# Subcommand: peek
# ──────────────────────────────────────────────────────────────────────────────

def cmd_peek(args) -> int:
    path, err = resolve_session(args.target)
    if path is None:
        print(err or f"세션 못 찾음: {args.target}", file=sys.stderr)
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
    callers = find_callers_for_child(path)
    if callers:
        primary = callers[0]
        suffix = ""
        if len(callers) > 1:
            suffix = f" (+{len(callers) - 1})"
        lines.append(f"  caller: {format_session_label(primary['path'], primary['info'])}  [{primary['matched_by']}]" + suffix)
    if data["model"]:
        lines.append(f"  model:  {data['model']}")
    lines.append(f"  state:  {data['current_state']}")
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

        caller = None
        detail = None
        if info["kind"] in ("entwurf", "delegate"):
            callers = find_callers_for_child(f)
            caller = callers[0] if callers else None
            detail = extract_peek_data(f, 1, 1, False)
        elif has_socket:
            detail = extract_peek_data(f, 1, 1, False)

        rows.append({
            "info": info,
            "path": f,
            "mtime": mtime,
            "status": status,
            "has_socket": has_socket,
            "caller": caller,
            "detail": detail,
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
            caller_suffix = ""
            if r.get("caller"):
                caller = r["caller"]
                caller_suffix = f"  ← {format_session_label(caller['path'], caller['info'])} [{caller['matched_by']}]"
            detail_suffix = compact_model_state_suffix(r["detail"]) if r.get("detail") else ""
            lines.append(f"    {icon} {sock} {kind:8} {short}  ({age} ago){caller_suffix}{detail_suffix}")

    print("\n".join(lines))
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# Subcommand: trace
# ──────────────────────────────────────────────────────────────────────────────

def cmd_trace(args) -> int:
    parent_path, err = resolve_session(args.parent)
    if parent_path is None:
        print(err or f"부모 세션 못 찾음: {args.parent}", file=sys.stderr)
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
    hidden_nearby = []
    for f, info in siblings:
        mtime = f.stat().st_mtime
        # 8hex match
        matched = any(info["id"].startswith(d) or d.startswith(info["id"]) for d in declared_ids)
        # 시간 인접: 부모 시간대 내
        time_adj = abs(mtime - parent_mtime) <= 7200  # 2 hour window
        row = {
            "path": f,
            "info": info,
            "mtime": mtime,
            "status": classify_activity(mtime),
            "matched_by": "declared" if matched else "time_adjacent",
        }
        if matched or (args.heuristic and time_adj):
            children.append(row)
        elif time_adj:
            hidden_nearby.append(row)

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
            detail = extract_peek_data(c["path"], 1, 1, False)
            detail_suffix = compact_model_state_suffix(detail)
            lines.append(f"    {icon} {kind:8} {short}  ({age} ago)  [{c['matched_by']}]{detail_suffix}")

    if hidden_nearby and not args.heuristic:
        lines.append(f"\n  nearby candidates hidden: {len(hidden_nearby)}  (pass --heuristic)")

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
