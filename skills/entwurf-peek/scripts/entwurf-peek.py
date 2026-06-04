#!/usr/bin/env python3
"""entwurf-peek: sync entwurf를 들여다보는 손.

호출자가 sync entwurf로 묶여있을 때 자식 분신이 무엇을 하고 있는지 확인.
entwurf_peers MCP가 control socket 있는 세션만 노출하는 한계를 보완 —
자식 세션(이름 태그 entwurf)도 함께 보여준다.

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
import socket
import sys
from datetime import datetime
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────────────

def expand_tilde_path(value: str) -> Path:
    if value == "~":
        return Path.home()
    if value.startswith("~/"):
        return Path.home() / value[2:]
    return Path(value)


AGENT_DIR = expand_tilde_path(os.environ.get("PI_CODING_AGENT_DIR", "~/.pi/agent"))
SESSIONS_DIR = AGENT_DIR / "sessions"
CONTROL_DIR = Path.home() / ".pi" / "entwurf-control"
UUID_RE = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", re.IGNORECASE)

# 0.9.0 garden-native identity. The Entwurf `*_entwurf-<taskId>.jsonl` filename
# species is GONE. Pi normally names files `<created-at>_<sessionId>.jsonl`, but
# lookup authority is the JSONL header `id`, not the filename suffix (wrong-cwd
# duplicate / renamed-file gates rely on this). "Is this an Entwurf session?" is
# answered by the session NAME (a session_info entry) carrying the `entwurf` tag,
# NOT by the filename. Resident `--entwurf-control` sessions carry `control`.
# This mirrors pi-shell-acp entwurf-core's locked grammar + readSessionIdentity.
GARDEN_ID_RE = re.compile(r"^\d{8}T\d{6}-[0-9a-f]{6}$")
SESSION_TAG_RE = re.compile(r"^[a-z0-9]+$")
TITLE_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def is_garden_id(value: str) -> bool:
    return bool(GARDEN_ID_RE.match(value or ""))


def parse_session_name(name: str | None) -> dict | None:
    """Port of entwurf-core parseSessionName.

    `{sessionId}=={provider}/{model}--{titleSlug}__{tag}_{tag}` → fields, or None
    if the name is not canonical. Pure string; no registry. tags drive kind.
    """
    if not isinstance(name, str):
        return None
    sig = name.find("==")
    if sig < 0:
        return None
    sid = name[:sig]
    if not is_garden_id(sid):
        return None
    rest = name[sig + 2:]
    ti = rest.find("--")
    if ti < 0:
        return None
    provider_model = rest[:ti]
    title_and_tags = rest[ti + 2:]
    slash = provider_model.find("/")
    if slash < 0:
        return None
    provider = provider_model[:slash]
    model = provider_model[slash + 1:]
    if not provider or not model or "/" in model:
        return None
    if "/" in provider or "=" in provider or "--" in provider or "=" in model or "--" in model:
        return None
    title_slug = title_and_tags
    tags: list[str] = []
    tag_idx = title_and_tags.find("__")
    if tag_idx >= 0:
        title_slug = title_and_tags[:tag_idx]
        tags = title_and_tags[tag_idx + 2:].split("_")
        if any(not SESSION_TAG_RE.match(t) for t in tags):
            return None
    if not TITLE_SLUG_RE.match(title_slug):
        return None
    return {"sessionId": sid, "provider": provider, "model": model, "titleSlug": title_slug, "tags": tags}


# Cache (path, mtime) → meta so the many parse_filename() calls in map/trace
# read each file at most once per run.
_META_CACHE: dict[tuple[str, float], dict] = {}
_META_PREFIX_BYTES = 256 * 1024  # header + first-turn session_info fit easily


def read_session_meta(path: Path) -> dict:
    """Header id/cwd + latest session_info name (+ parsed tags + kind).

    kind: 'entwurf' (name has the entwurf tag) | 'control' (resident session) |
    'plain' (anything else, incl. legacy uuid sessions and un-named sessions).
    Reads only a bounded prefix — the name is set on the first assistant turn,
    well within the first turn's bytes.
    """
    try:
        key = (str(path), path.stat().st_mtime)
    except OSError:
        key = (str(path), 0.0)
    cached = _META_CACHE.get(key)
    if cached is not None:
        return cached

    sid = cwd = name = None
    try:
        with open(path, "rb") as f:
            chunk = f.read(_META_PREFIX_BYTES)
        text = chunk.decode("utf-8", errors="ignore")
        # Drop a trailing partial line from the prefix cut.
        lines = text.split("\n")
        if not text.endswith("\n"):
            lines = lines[:-1]
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except (json.JSONDecodeError, ValueError):
                continue
            t = rec.get("type")
            if t == "session":
                if isinstance(rec.get("id"), str):
                    sid = rec["id"]
                if isinstance(rec.get("cwd"), str):
                    cwd = rec["cwd"]
            elif t == "session_info":
                n = rec.get("name")
                if isinstance(n, str) and n:
                    name = n
    except OSError:
        pass

    parsed = parse_session_name(name)
    tags = parsed["tags"] if parsed else []
    if "entwurf" in tags:
        kind = "entwurf"
    elif "control" in tags:
        kind = "control"
    else:
        kind = "plain"
    meta = {"id": sid, "cwd": cwd, "name": name, "tags": tags, "kind": kind, "parsed": parsed}
    _META_CACHE[key] = meta
    return meta


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
    """세션 파일 분류 (0.9.0 garden-native).

    JSONL header `id`가 sessionId authority 다. 파일명은 Pi 산물
    `<created-at>_<sessionId>.jsonl` 이지만 lookup/resume logic 으로 쓰지 않는다.
    kind 는 파일명이 아니라 session_info name 의 태그로 정한다
    (entwurf / control / plain) via read_session_meta.

    Returns dict with:
      kind:  'entwurf' | 'control' | 'plain'
      id:    sessionId from JSONL header (fallback: filename suffix for corrupt legacy files)
      filename_id: suffix after first `_` for diagnostics only
      short: compact display id (garden → 6-hex suffix; uuid → first 8)
    """
    stem = path.stem
    # 2026-06-03T23-41-41-238Z_20260604T084140-de0810  → filename suffix after first _
    filename_id = stem.split("_", 1)[1] if "_" in stem else stem
    meta = read_session_meta(path)
    sid = meta.get("id") or filename_id
    if is_garden_id(sid):
        short = sid.split("-")[-1]
    else:
        short = sid.split("-")[0][:8]
    return {"kind": meta["kind"], "id": sid, "filename_id": filename_id, "short": short}


def is_socket_alive(socket_path: Path, timeout: float = 0.3) -> bool:
    """pi-shell-acp getLiveSessions parity: only count sockets that accept connect()."""
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            s.connect(str(socket_path))
            return True
    except OSError:
        return False


def find_active_sockets() -> set[str]:
    """~/.pi/entwurf-control/*.sock → live sessionId set."""
    if not CONTROL_DIR.exists():
        return set()
    out = set()
    for s in CONTROL_DIR.glob("*.sock"):
        if is_socket_alive(s):
            out.add(s.stem)
    return out


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
            if only_entwurf and info["kind"] not in ("entwurf",):
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
    """ID(garden sessionId / 6-hex 접미사 / legacy full UUID) 또는 파일 경로를 실제 JSONL 경로로 해결.

    full UUID는 exact match 우선. 짧은 prefix가 여러 세션과 충돌하면 최근 것으로
    침묵 선택하지 않고 ambiguous 에러를 돌려준다.
    """
    p = Path(target).expanduser()
    if p.is_file():
        return p, None
    if p.is_absolute() and p.exists():
        return p, None

    # 0.9.0: id 는 JSONL header sessionId (garden `YYYYMMDDTHHMMSS-xxxxxx` / legacy uuid)
    # 또는 6-hex short. 옛 `entwurf-<hex>` / `delegate-<hex>` 입력종은 폐기 —
    # display label(`{kind}-{short}`)을 그대로 붙여넣는 경로도 함께 사라진다.
    needle = target.strip().lower()

    candidates: list[tuple[Path, dict]] = []
    for f in find_session_files():
        info = parse_filename(f)
        candidates.append((f, info))

    def ambiguous_exact(paths: list[Path]) -> str:
        preview = ", ".join(f"{p.parent.name}/{p.name}" for p in paths[:5])
        return f"세션 ID ambiguous: {target} → {preview}"

    if UUID_RE.fullmatch(needle):
        exact = [f for f, info in candidates if info["id"].lower() == needle]
        if not exact:
            return None, f"세션 못 찾음: {target}"
        if len(exact) > 1:
            exact.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return None, ambiguous_exact(exact)
        return exact[0], None

    exact = [f for f, info in candidates if info["id"].lower() == needle]
    if len(exact) == 1:
        return exact[0], None
    if len(exact) > 1:
        exact.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return None, ambiguous_exact(exact)

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

# parent에서 child entwurf sessionId를 추출하는 패턴 (0.9.0).
# spawn 결과 텍스트가 "Task ID: <8hex>" → "Session ID: <YYYYMMDDTHHMMSS-xxxxxx>"
# 로 바뀌었다 (formatSyncSummary / async ack / native+MCP result text). garden id
# 포맷이 충분히 구별되므로 entwurf 호출 텍스트 근처가 아니어도 안전하게 잡는다.
SESSION_ID_LINE_RE = re.compile(
    r"Session ID:\s*(\d{8}T\d{6}-[0-9a-f]{6})",
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
    """부모 JSONL에서 자식 entwurf sessionId 추출 (0.9.0 garden id).

    Returns list of (timestamp, child_session_id).
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
            for m in SESSION_ID_LINE_RE.finditer(text):
                out.append((ts, m.group(1)))
    return out


def find_declared_parents(child_path: Path) -> list[dict]:
    """child entwurf/delegate를 declared 완료 메시지로 가리키는 부모 세션 찾기."""
    child_info = parse_filename(child_path)
    if child_info["kind"] not in ("entwurf",):
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
    if child_info["kind"] not in ("entwurf",):
        return []

    child_mtime = child_path.stat().st_mtime
    out = []
    for f in iter_session_files_in_dir(child_path.parent):
        if f == child_path:
            continue
        info = parse_filename(f)
        if info["kind"] not in ("plain", "control", "entwurf"):
            continue
        mtime = f.stat().st_mtime
        if abs(mtime - child_mtime) > window_seconds:
            continue
        # 일반적으로 caller는 uuid 부모가 더 그럴듯하므로 가벼운 bias
        score = abs(mtime - child_mtime) + (0 if info["kind"] in ("control", "plain") else 600)
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
    has_socket = info["id"] in sockets

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
            if info["id"] in sockets and f not in files_set:
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
        has_socket = info["id"] in sockets

        # done 상태는 기본 제외 — 단 socket이 살아있으면 강제 노출
        if status == "done" and not args.all and not has_socket:
            continue

        caller = None
        detail = None
        if info["kind"] in ("entwurf",):
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
    parent_has_socket = parent_info["id"] in sockets

    # 1차 시그널: 부모 JSONL의 entwurf spawn 결과 — Session ID: <garden id>
    declared = find_child_entwurf_ids(parent_path)
    declared_ids = {child_id for _, child_id in declared}

    # 2차 시그널: 같은 cwd 디렉토리의 name-tagged Entwurf 세션
    siblings = []
    for f in parent_path.parent.iterdir():
        if f.suffix != ".jsonl" or f == parent_path:
            continue
        info = parse_filename(f)
        if info["kind"] not in ("entwurf",):
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
    lines.append(f"  declared session IDs in parent: {len(declared_ids)} → {sorted(declared_ids)}")
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
    p_peek.add_argument("target", help="세션 ID (garden sessionId / 6-hex / legacy UUID) 또는 파일 경로")
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
