#!/usr/bin/env python3
"""entwurf-peek: 지금 누가 어디서 무엇을 하는가 — caller-side 판단 재료.

entwurf `docs/mux-launch-rail.md` §4의 situation map을 세운다. 새 entwurf surface가
아니라 호출자가 이미 가진 사실을 한 평면에 올리는 일이다. 실행(전달·재개·생성)은 하지
않는다 — 그것은 entwurf_v2 / entwurf_resume_call / entwurf_fresh_call이 한다.

Subcommands:
  situation            record(사실) + transcript(추정) + 가능한 verb 한 장
  peek <id|file>       한 세션 안 (마지막 메시지 + model + state + task)
  map                  파일 축 지도 (record 없는 세션까지; 진단용)
  trace <parent-id>    부모가 던진 자식 추적 — v2 하드컷으로 현재 불완전

두 identity 축은 문자열로 만나지 않는다: socket/dispatch는 garden id, 세션 파일과 JSONL
header는 native session id다. 잇는 것은 meta-record의 (gardenId, nativeSessionId,
transcriptPath)뿐이며 이 스크립트는 그 store를 읽기 전용으로 읽는다. 값이 entwurf_peers와
어긋나면 peers가 SSOT다. placement(tmux 좌표)는 여기서 절대 유도하지 않는다.
"""

import argparse
import errno
import json
import os
import re
import socket
import stat
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
# entwurf meta-record store. Read-only mirror of `defaultMetaSessionsDir()`
# (`meta-session.ts`): env override wins, else `<pi-agent-dir>/meta-sessions`.
RECORDS_DIR = (
    expand_tilde_path(os.environ["ENTWURF_META_SESSIONS_DIR"])
    if os.environ.get("ENTWURF_META_SESSIONS_DIR")
    else AGENT_DIR / "meta-sessions"
)
UUID_RE = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", re.IGNORECASE)

# 0.9.0 garden-native session identity. The old Entwurf
# `*_entwurf-<taskId>.jsonl` filename species is GONE. Pi normally names files
# `<created-at>_<sessionId>.jsonl`, but lookup authority is the JSONL header
# `id`, not the filename suffix (wrong-cwd duplicate / renamed-file gates rely
# on this). "Is this an Entwurf session?" is answered by the session NAME (a
# session_info entry) carrying the `entwurf` tag, NOT by the filename. Resident
# `--entwurf-control` sessions carry `control`. This mirrors entwurf
# entwurf-core's locked grammar + readSessionIdentity.
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
    """entwurf getLiveSessions parity: only count sockets that accept connect()."""
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


def live_session_ids() -> set[str]:
    """live socket을 파일 축의 id로도 읽을 수 있게 확장한 집합.

    socket 파일명은 **garden id**이고 pi 세션 파일/헤더 id는 **native session id**다.
    (pi 0.84 기준 파일명이 uuidv7이라 두 축은 문자열로 절대 만나지 않는다.)
    meta-record의 `(gardenId, nativeSessionId)`가 그 둘을 잇는 유일한 조인이므로
    두 축을 모두 담아 돌려준다.
    """
    sockets = find_active_sockets()
    if not sockets:
        return sockets
    out = set(sockets)
    for rec in read_records():
        if rec.get("gardenId") in sockets and rec.get("nativeSessionId"):
            out.add(rec["nativeSessionId"])
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
    """`resolve_session_ctx`의 얇은 래퍼 — 경로만 필요할 때."""
    path, _rec, err = resolve_session_ctx(target)
    return path, err


def resolve_session_ctx(target: str) -> tuple[Path | None, dict | None, str | None]:
    """selector → (transcript 경로, 그 selector가 지목한 record, 에러).

    garden id로 해석했다면 **그 record를 함께 돌려준다.** 경로만 넘기면 호출자가 다시
    path→record 역조회를 하게 되는데, 같은 경로를 두 record가 주장하는 순간 그 역조회는
    비고, 그러면 우리가 방금 확정한 identity와 backend 문법을 잃은 채 기본 파서로
    본문을 읽게 된다. selector가 준 사실을 버리지 않는 것이 여기서의 계약이다.

    full UUID는 exact match 우선. 짧은 prefix가 여러 세션과 충돌하면 최근 것으로
    침묵 선택하지 않고 ambiguous 에러를 돌려준다.
    """
    p = Path(target).expanduser()
    if p.is_file():
        return p, None, None
    if p.is_absolute() and p.exists():
        return p, None, None

    # 0.9.0: id 는 JSONL header sessionId (garden `YYYYMMDDTHHMMSS-xxxxxx` / legacy uuid)
    # 또는 6-hex short. 옛 filename-derived selector (`entwurf-<hex>` /
    # `delegate-<hex>`)는 폐기 — display label(`{kind}-{short}`)을 그대로
    # 붙여넣는 경로도 함께 사라진다.
    needle = target.strip().lower()

    # Garden id 우선 — `entwurf_peers` / `situation`이 인쇄하는 축이 이것이다.
    # pi 0.84의 session 파일명은 native uuidv7이라 garden id로는 절대 매치되지
    # 않는다. 그 둘을 잇는 것은 meta-record의 (gardenId, transcriptPath)다.
    garden_recs = [
        rec for rec in read_records()
        if rec["gardenId"].lower() == needle
        or (len(needle) <= 8 and rec["gardenId"].lower().endswith(f"-{needle}"))
    ]
    if len(garden_recs) > 1:
        preview = ", ".join(r["gardenId"] for r in garden_recs[:5])
        return None, None, f"garden id ambiguous: {target} → {preview}"
    if len(garden_recs) == 1:
        # garden selector로 들어왔으면 그 record가 이 selector의 authority다. transcript
        # 결함은 **named error로 끝난다** — file 축으로 흘려보내지 않는다. v3 schema는
        # relative transcriptPath를 허용하므로, 흘려보내면 현재 cwd에 우연히 같은 이름의
        # 파일이 있을 때 그것을 이 시민의 transcript로 채택한다(2026-08-07 3차 리뷰 재현).
        rec = garden_recs[0]
        gid = rec["gardenId"]
        tpath = rec.get("transcriptPath")
        if not tpath:
            return None, None, f"{gid}: transcriptPath 없음 — 첫 turn 전이라 읽을 대화가 없다"
        p_rec = Path(tpath)
        if not p_rec.is_absolute():
            return None, None, f"{gid}: transcriptPath가 relative ({tpath!r}) — record 결함이라 읽지 않는다"
        if not p_rec.is_file():
            return None, None, f"{gid}: recorded transcript가 디스크에 없다 ({tpath})"
        return p_rec, rec, None

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
            return None, None, f"세션 못 찾음: {target}"
        if len(exact) > 1:
            exact.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return None, None, ambiguous_exact(exact)
        return exact[0], None, None

    exact = [f for f, info in candidates if info["id"].lower() == needle]
    if len(exact) == 1:
        return exact[0], None, None
    if len(exact) > 1:
        exact.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return None, None, ambiguous_exact(exact)

    prefix_matches = []
    for f, info in candidates:
        id_l = info["id"].lower()
        short_l = info["short"].lower()
        if id_l.startswith(needle) or (len(needle) <= 8 and short_l == needle):
            prefix_matches.append((f, info))

    if not prefix_matches:
        return None, None, f"세션 못 찾음: {target}"

    uniq_ids = {info["id"].lower() for _, info in prefix_matches}
    if len(uniq_ids) > 1:
        preview = ", ".join(
            f"{format_session_label(f, info)}@{f.parent.name}/{f.name}"
            for f, info in prefix_matches[:5]
        )
        return None, None, f"세션 ID ambiguous: {target} → {preview}"

    prefix_matches.sort(key=lambda x: x[0].stat().st_mtime, reverse=True)
    return prefix_matches[0][0], None, None


# ──────────────────────────────────────────────────────────────────────────────
# JSONL parsing
# ──────────────────────────────────────────────────────────────────────────────

# parent에서 child Entwurf sessionId를 추출하는 패턴 (0.9.0).
# spawn 결과 텍스트는 legacy short task token("Task ID: <8hex>")이 아니라
# `Session ID: <YYYYMMDDTHHMMSS-xxxxxx>` 를 쓴다 (formatSyncSummary / async ack /
# native+MCP result text). garden id 포맷이 충분히 구별되므로 entwurf 호출
# 텍스트 근처가 아니어도 안전하게 잡는다.
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
    """child Entwurf 세션을 declared completion 메시지로 가리키는 부모 세션 찾기."""
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
        # 일반적으로 caller는 control/plain 부모가 더 그럴듯하므로 가벼운 bias
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


def extract_peek_data_claude(path: Path, n_msgs: int, n_tools: int, include_thinking: bool) -> dict:
    """Claude Code JSONL → extract_peek_data와 **같은 모양**의 데이터.

    두 harness의 transcript는 다른 문법이다(`type: user|assistant` + content part
    `tool_use`/`tool_result`). pi 파서를 그대로 물리면 model도 state도 못 읽고
    `unknown`만 남는데, 그것은 "조용하다"가 아니라 "우리가 못 읽는다"이므로 그 자리를
    빈칸으로 두지 않고 이 파서로 읽는다. 끝 512KB만 본다.
    """
    records = tail_json_lines(path, max_bytes=512 * 1024)
    messages, tool_lines = [], []
    last_thinking = None
    session_start = session_end = None
    model = None
    last_event = None

    for rec in records:
        t = rec.get("type")
        if t not in ("user", "assistant"):
            continue
        ts = rec.get("timestamp", "")
        msg = rec.get("message")
        if not isinstance(msg, dict):
            continue
        session_start = session_start or ts
        session_end = ts or session_end
        if t == "assistant" and msg.get("model"):
            model = msg["model"]
        content = msg.get("content")
        texts = []
        if isinstance(content, str):
            if content.strip():
                texts.append(content)
                last_event = "assistant_text" if t == "assistant" else "user_text"
        elif isinstance(content, list):
            for c in content:
                if not isinstance(c, dict):
                    continue
                ct = c.get("type")
                if ct == "text" and c.get("text", "").strip():
                    texts.append(c["text"])
                    last_event = "assistant_text" if t == "assistant" else "user_text"
                elif ct == "tool_use":
                    tool_lines.append((ts, f"[tool:start] {c.get('name', 'tool')}"))
                    last_event = "tool_start"
                elif ct == "tool_result":
                    state = "failed" if c.get("is_error") else "done"
                    tool_lines.append((ts, f"[tool:{state}]"))
                    last_event = "tool_result"
                elif ct == "thinking" and include_thinking and c.get("thinking"):
                    last_thinking = (ts, c["thinking"])
        text = "\n".join(texts).strip()
        if text:
            messages.append({"role": "assistant" if t == "assistant" else "user", "ts": ts, "text": text})

    return {
        "messages": messages[-n_msgs:] if n_msgs else [],
        "tool_trail": tool_lines[-n_tools:] if n_tools else [],
        "last_thinking": last_thinking,
        "session_start": session_start,
        "session_end": session_end,
        # 끝만 읽으므로 첫 user task는 이 창에 없을 수 있다. 없는 것을 지어내지 않는다.
        "first_user_task": None,
        "model": model,
        "current_state": _label_state(last_event),
        "record_count": len(records),
        # 이 데이터는 파일 끝 창에서만 나왔다. 호출자가 세션 전체로 읽지 않도록 표시한다.
        "window_only": True,
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
    path, selector_rec, err = resolve_session_ctx(args.target)
    if path is None:
        print(err or f"세션 못 찾음: {args.target}", file=sys.stderr)
        return 1

    info = parse_filename(path)
    mtime = path.stat().st_mtime
    status = classify_activity(mtime)
    sockets = live_session_ids()
    has_socket = info["id"] in sockets

    # transcript 문법은 backend마다 다르다. 그것을 아는 것은 record뿐이다. selector가
    # garden id였다면 그 record가 이미 손에 있으므로 path 역조회로 되묻지 않는다 —
    # 같은 경로를 두 record가 주장하면 역조회는 비고, 그러면 확정된 identity를 잃은 채
    # 기본 파서로 남의 문법을 읽게 된다. record가 아예 없을 때만 파일 축 기본값(pi)이다.
    gid_rec = selector_rec or record_for_transcript(path)

    icon = status_icon(status, args.plain)
    age = fmt_age(mtime)
    sock = " [socket]" if has_socket else ""

    lines = []
    lines.append(f"═══ {icon} {info['kind']}-{info['short']}  ({age} ago){sock} ═══")
    lines.append(f"  file:   {path.parent.name}/{path.name}")
    # 파일 축의 id는 native session id다. dispatch가 쓰는 축(garden id)은 record만이 안다.
    if gid_rec:
        lines.append(f"  garden: {gid_rec['gardenId']}  ({gid_rec.get('backend') or 'unknown'})")

    # record가 있으면 그 record가 owner gate다. identity가 `match`가 아니면 본문을
    # 읽지 않는다 — situation이 지키는 선을 peek만 통과시키면 같은 스킬이 두 정직성을
    # 갖게 된다. record 없는 file/native selector에서만 파일 축 기본값(pi)을 쓴다.
    owner = transcript_owner(path, gid_rec) if gid_rec else "match"
    if owner != "match":
        why = {
            "mismatch": "transcript header가 이 record의 native id와 다르다 — 본문을 읽지 않는다",
            "unknown": "transcript identity를 확인하지 못했다 — 본문을 읽지 않는다",
            "unsupported": f"{gid_rec.get('backend')} transcript 문법을 이 스킬이 모른다 — 본문을 읽지 않는다",
        }[owner]
        lines.append(f"  state:  {why}")
        print("\n".join(lines))
        return 0

    if gid_rec and gid_rec.get("backend") == "claude-code":
        data = extract_peek_data_claude(path, args.messages, args.tools, args.thinking)
    else:
        data = extract_peek_data(path, args.messages, args.tools, args.thinking)

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
    # Claude 경로는 끝 512KB만 읽는다. 그 창의 사실을 세션 전체의 사실처럼 쓰지 않는다.
    scope = "tail span" if data.get("window_only") else "span"
    unit = "tail records" if data.get("window_only") else "records"
    lines.append(
        f"  {scope}: {fmt_ts(data['session_start'])} → {fmt_ts(data['session_end'])}  "
        f"({data['record_count']} {unit})"
    )

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
    # `sockets` is the membership set (garden + native ids); the header counts
    # the real sockets, which is a different number.
    socket_count = len(find_active_sockets())
    sockets = live_session_ids()
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
        f"sockets: {socket_count} ═══"
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
        # declared child sessionId match (garden full id / compatible prefix)
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
# Subcommand: situation
#
# The caller-side situation map of `docs/mux-launch-rail.md` §4: garden peer
# facts and transcript activity read in one sentence. It is NOT a new entwurf
# surface and NOT a placement authority — tmux coordinates never appear here.
# ──────────────────────────────────────────────────────────────────────────────

# Backends that stand a control socket, so absence of a socket is a real
# dormant verdict rather than "no probe exists".
SOCKET_BACKENDS = {"pi"}
# Backends that can be reopened under the same garden id (entwurf_resume_call).
RESUMABLE_BACKENDS = {"pi"}


LIVE_RECORD_SCHEMA = 3
# `meta-session.ts:237` — 이 enum 밖의 backend는 v3 record가 아니다.
META_CITIZEN_BACKENDS = ("claude-code", "antigravity", "codex", "pi", "copilot")
# `meta-session.ts:347-357` — strict keyset. 여분 key는 coerce하지 않고 record를 버린다.
META_IDENTITY_KEYS = frozenset({
    "schemaVersion", "gardenId", "backend", "nativeSessionId", "cwd",
    "model", "transcriptPath", "createdAt", "recordUpdatedAt",
})
_NONEMPTY_FIELDS = ("nativeSessionId", "cwd", "createdAt", "recordUpdatedAt")
_NULLABLE_FIELDS = ("model", "transcriptPath")


def parse_record_v3(raw: str) -> tuple[dict | None, str | None]:
    """`parseMetaRecordV3`(meta-session.ts:359-397)의 검증을 그대로 건다.

    버전 숫자만 보고 통과시키면 nativeSessionId 없는 record가 citizen이 되고, 그보다
    나쁘게는 schema-invalid rival이 healthy record를 duplicate로 끌어내린다. owner는
    그런 record를 파싱 단계에서 이미 버린다.
    """
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"valid JSON이 아니다 ({exc.msg})"
    if not isinstance(obj, dict):
        return None, "JSON object가 아니다"
    if obj.get("schemaVersion") != LIVE_RECORD_SCHEMA:
        return None, f"schemaVersion={obj.get('schemaVersion')!r} — live schema v{LIVE_RECORD_SCHEMA} 아님"
    stray = sorted(set(obj) - META_IDENTITY_KEYS)
    if stray:
        return None, f"v3에 없는 key {', '.join(stray)} — 옛 세대는 읽지도 coerce하지도 않는다"
    gid = obj.get("gardenId")
    if not isinstance(gid, str) or not is_garden_id(gid):
        return None, f"gardenId 문법 위반 ({gid!r})"
    if obj.get("backend") not in META_CITIZEN_BACKENDS:
        return None, f"backend는 {' | '.join(META_CITIZEN_BACKENDS)} 중 하나여야 한다 ({obj.get('backend')!r})"
    for field in _NONEMPTY_FIELDS:
        v = obj.get(field)
        if not isinstance(v, str) or not v:
            return None, f"{field}가 non-empty string이 아니다 ({v!r})"
    for field in _NULLABLE_FIELDS:
        v = obj.get(field)
        if v is not None and (not isinstance(v, str) or not v):
            return None, f"{field}는 string 또는 null이어야 한다 ({v!r})"
    return obj, None


def read_store_record_file(path: Path) -> str:
    """record 바이트를 **읽을 그 file description 위에서** kind를 정해 읽는다.

    `meta-session.ts:855-905`의 이유를 그대로 진다: lstat으로 분류하고 path로 다시 열면
    그 사이에 final component가 symlink로 바뀔 수 있고, 그러면 store가 소유하지 않은
    바이트를 읽는다 — rule 1이 검사 누락이 아니라 race로 세탁되는 길이다.

      O_NOFOLLOW  final component가 symlink면 open 자체가 ELOOP로 실패한다
      O_NONBLOCK  fifo를 O_RDONLY로 열면 writer가 나타날 때까지 블록된다
      fstat(fd)   이 description의 kind — 이름의 kind가 아니다 (dir은 Linux에서 열린다)
    """
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    if not getattr(os, "O_NOFOLLOW", 0):
        raise OSError("이 플랫폼에는 O_NOFOLLOW가 없다 — entwurf는 Linux만 certify한다")
    fd = os.open(str(path), flags)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise IsADirectoryError("regular file이 아니다 (directory/fifo/device)")
        with os.fdopen(fd, "rb", closefd=False) as fh:
            return fh.read().decode("utf-8")
    finally:
        os.close(fd)


def certify_records() -> tuple[list[dict], list[str]]:
    """meta-record store를 읽되 **entwurf의 active-store 계약을 그대로 걸러낸다.**

    `meta-session.ts:720-750`의 certification 네 조건을 여기서 복제한다. 약하게 읽으면
    peers가 diagnostics로 격리하는 record를 우리만 정상 citizen으로 세워, 같은 store를
    두 사실면으로 갈라 놓기 때문이다. 계약은 이것이다 —

      1. regular file일 것 — 분류와 읽기가 **같은 fd** 위에서 일어난다
      2. LIVE v3 parser로 읽힐 것 (keyset·문법·enum·필드까지 전부)
      3. 파일명이 자기 body의 gardenId일 것 (`<gid>.meta.json`)
      4. `nativeSessionId`의 유일한 holder일 것 (store 전역)

    수선하지 않고, 가지치지 않고, duplicate 중 승자를 고르지 않는다 — certification이
    하지 않는 그 셋을 우리도 하지 않는다. 결함 record는 citizen 목록에서 빠지고
    diagnostics 줄로만 나간다. **순서가 계약의 일부다**: schema-invalid rival은 2에서
    이미 빠지므로 4의 duplicate 판정에 참여하지 못한다.
    """
    kept: list[dict] = []
    defects: list[str] = []
    by_native: dict[str, list[str]] = {}
    try:
        entries = sorted(
            (e for e in os.scandir(RECORDS_DIR) if e.name.endswith(".meta.json")),
            key=lambda e: e.name,
        )
    except FileNotFoundError:
        return [], []          # 없는 store는 빈 store다 — owner도 ENOENT만 그렇게 읽는다
    except OSError as exc:
        return [], [f"{RECORDS_DIR}: store를 열 수 없다 ({type(exc).__name__})"]

    for entry in entries:
        name = entry.name
        # owner는 두 층으로 본다: dirent snapshot의 kind 정책 판정(720-808)과, 그 뒤
        # 열린 fd의 race 판정(819-930). 스캔 순간 irregular였다가 open 직전에 regular로
        # 바뀐 entry는 앞 층에서 이미 거절된다 — 그 층을 빼면 "같은 계약"이 아니다.
        try:
            if not entry.is_file(follow_symlinks=False):
                defects.append(f"{name}: regular file이 아니다 (symlink/dir/fifo)")
                continue
        except OSError as exc:
            defects.append(f"{name}: entry를 분류할 수 없다 ({type(exc).__name__})")
            continue
        try:
            raw = read_store_record_file(Path(entry.path))
        except UnicodeDecodeError:
            defects.append(f"{name}: UTF-8이 아니다")
            continue
        except OSError as exc:
            reason = "symlink는 따라가지 않는다 (ELOOP)" if getattr(exc, "errno", None) == errno.ELOOP else str(exc)
            defects.append(f"{name}: 읽을 수 없다 — {reason}")
            continue
        rec, why = parse_record_v3(raw)
        if rec is None:
            defects.append(f"{name}: {why}")
            continue
        if name != f"{rec['gardenId']}.meta.json":
            defects.append(f"{name}: body gardenId={rec['gardenId']}와 파일명이 어긋난다")
            continue
        by_native.setdefault(rec["nativeSessionId"], []).append(rec["gardenId"])
        rec["_file"] = Path(entry.path)
        kept.append(rec)

    duplicated = {n for n, gids in by_native.items() if len(gids) > 1}
    if duplicated:
        for native in sorted(duplicated):
            claimants = ", ".join(sorted(by_native[native]))
            defects.append(f"nativeSessionId {native}: {claimants}가 함께 주장한다 (one-to-one 위반)")
        # certification처럼 승자를 고르지 않는다 — duplicate는 양쪽 다 빠진다.
        kept = [r for r in kept if r["nativeSessionId"] not in duplicated]

    kept.sort(key=lambda r: r.get("recordUpdatedAt") or r.get("createdAt") or "", reverse=True)
    return kept, defects


def read_records() -> list[dict]:
    """certify를 통과한 record만. store는 entwurf의 authority이고 peers가 SSOT다."""
    return certify_records()[0]


def record_for_transcript(path: Path) -> dict | None:
    """transcript 경로 → 그 파일을 자기 것이라 말하는 record. 둘 이상이면 None.

    같은 path를 주장하는 record가 여럿이면 어느 것이 그 대화의 주인인지 이 축에서는
    결정할 수 없다. 첫 행을 조용히 고르는 것이 바로 남의 주소를 붙이는 길이다.
    """
    target = str(path)
    hits = [rec for rec in read_records() if rec.get("transcriptPath") == target]
    return hits[0] if len(hits) == 1 else None


def tail_json_lines(path: Path, max_bytes: int = 262144) -> list[dict]:
    """파일 끝 max_bytes만 읽어 JSON 라인으로 파싱. 잘린 첫/마지막 줄은 버린다."""
    try:
        size = path.stat().st_size
        with path.open("rb") as fh:
            if size > max_bytes:
                fh.seek(size - max_bytes)
                fh.readline()  # drop the partial first line
            blob = fh.read()
    except OSError:
        return []
    out = []
    for line in blob.decode("utf-8", "replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue  # writer-in-progress tail, or a truncated head line
        if isinstance(rec, dict):
            out.append(rec)
    return out


def _state_from_pi_tail(records: list[dict]) -> tuple[str | None, str]:
    """pi JSONL tail → (model, state). extract_peek_data의 last-event 규칙과 같은 축."""
    model = None
    last_event = None
    for rec in records:
        if rec.get("type") == "model_change":
            mid = rec.get("modelId") or rec.get("model") or rec.get("to")
            prov = rec.get("provider")
            model = f"{prov}/{mid}" if prov and mid else (mid or model)
            continue
        if rec.get("type") != "message":
            continue
        msg = rec.get("message", {})
        role = msg.get("role")
        if role == "assistant":
            mid = msg.get("model") or rec.get("model")
            prov = msg.get("provider") or rec.get("provider")
            if mid:
                model = f"{prov}/{mid}" if prov else mid
        if role == "toolResult":
            last_event = "tool_result"
            continue
        content = msg.get("content")
        if isinstance(content, str) and content.strip():
            last_event = "assistant_text" if role == "assistant" else "user_text"
            continue
        if not isinstance(content, list):
            continue
        for c in content:
            if not isinstance(c, dict):
                continue
            ct = c.get("type")
            if ct == "toolCall":
                last_event = "tool_start"
            elif ct == "text":
                txt = c.get("text", "")
                if not txt:
                    continue
                if txt.lstrip().startswith("[tool:"):
                    last_event = "tool_start" if "[tool:start]" in txt else "tool_result"
                elif "[permission:" in txt:
                    continue
                else:
                    last_event = "assistant_text" if role == "assistant" else "user_text"
    return model, _label_state(last_event)


def _state_from_claude_tail(records: list[dict]) -> tuple[str | None, str]:
    """Claude Code JSONL tail → (model, state)."""
    model = None
    last_event = None
    for rec in records:
        t = rec.get("type")
        if t not in ("user", "assistant"):
            continue
        msg = rec.get("message", {})
        if not isinstance(msg, dict):
            continue
        if t == "assistant" and msg.get("model"):
            model = msg["model"]
        content = msg.get("content")
        if isinstance(content, str):
            last_event = "assistant_text" if t == "assistant" else "user_text"
            continue
        if not isinstance(content, list):
            continue
        for c in content:
            if not isinstance(c, dict):
                continue
            ct = c.get("type")
            if ct == "tool_use":
                last_event = "tool_start"
            elif ct == "tool_result":
                last_event = "tool_result"
            elif ct == "text":
                last_event = "assistant_text" if t == "assistant" else "user_text"
    return model, _label_state(last_event)


def _label_state(last_event: str | None) -> str:
    return {
        "tool_start": "tool running",
        "tool_result": "tool finished; awaiting assistant reply",
        "user_text": "awaiting assistant reply",
        "assistant_text": "waiting for user",
    }.get(last_event or "", "unknown")


# 이 스킬이 transcript 문법을 아는 backend. 나머지는 "모른다"이지 "남의 것"이 아니다.
READABLE_TRANSCRIPT_BACKENDS = {"pi", "claude-code"}


def transcript_owner(path: Path, rec: dict) -> str:
    """transcript가 이 record의 것인가 — `match | mismatch | unknown | unsupported`.

    삼값 이상이어야 하는 이유가 실측으로 있다. 문법은 backend마다 다른데(pi는 첫머리
    `type:"session"` header의 `id`, Claude Code는 각 엔트리의 `sessionId`), 한쪽 문법으로
    다른 쪽을 읽으면 **"못 읽었다"가 "다른 존재의 transcript다"로 둔갑한다.** 2026-08-07
    2차 리뷰에서 antigravity record 4건이 전부 `foreign`으로 오판된 것이 그 증거다.
    id를 확인하지 못한 것과 id가 다른 것은 다른 사실이므로 합치지 않는다.
    """
    backend = rec.get("backend")
    if backend not in READABLE_TRANSCRIPT_BACKENDS:
        return "unsupported"
    if backend == "claude-code":
        owner = None
        for entry in tail_json_lines(path, max_bytes=64 * 1024):
            sid = entry.get("sessionId")
            if isinstance(sid, str) and sid:
                owner = sid
                break
    else:
        owner = read_session_meta(path).get("id")
    if not owner:
        return "unknown"
    return "match" if owner == rec.get("nativeSessionId") else "mismatch"


def record_activity(rec: dict) -> dict:
    """record → transcript 기반 활동 추정. transcript가 없으면 정직하게 비운다.

    `precheck`은 `resolve_resume_launch_identity`(entwurf)가 던지는 전제를 로컬에서 미리
    읽은 사유다. bool 하나로 뭉치면 "왜 안 되는가"가 사라져 relative path도 foreign
    transcript도 전부 "transcript 없음"으로 보고하게 된다. entwurf는 이 뒤에도 볼 것이
    있으므로(addressability, recorded model, ACP bridge, header cwd) `ok`가 성공을
    보장하지는 않는다 — 거짓일 때 resume을 권하지 않기 위한 필터다.

    **foreign transcript면 본문을 읽지 않는다.** header id가 record의 nativeSessionId와
    다르면 그 파일은 다른 존재의 대화다(`resume-launch-identity.ts:138-143`). 그 model과
    state를 이 행에 붙이는 것은 추정 오차가 아니라 남의 상태를 이 citizen의 것으로
    보고하는 일이다.
    """
    blank = {"path": None, "mtime": None, "status": None, "model": None}
    tpath = rec.get("transcriptPath")
    if not tpath:
        return {**blank, "state": "no transcript (첫 turn 전)", "precheck": "no-transcript"}
    p = Path(tpath)
    if not p.is_absolute():
        return {**blank, "path": p, "state": "relative transcriptPath", "precheck": "relative-path"}
    if not p.is_file():
        return {**blank, "path": p, "state": "transcript missing", "precheck": "transcript-missing"}
    owner = transcript_owner(p, rec)
    if owner != "match":
        # 본문은 어느 경우에도 읽지 않는다. 다만 사유는 합치지 않는다 — mismatch만이
        # "남의 대화"이고, 나머지는 "우리가 확인하지 못했다"이다.
        state, precheck = {
            "mismatch": ("foreign/stale transcript — 본문을 읽지 않음", "foreign-transcript"),
            "unknown": ("transcript identity 확인 불가 — 본문 미독", "identity-unverified"),
            "unsupported": (
                f"{rec.get('backend')} transcript 문법 미지원 — 본문 미독", "identity-unverified"),
        }[owner]
        return {**blank, "path": p, "mtime": p.stat().st_mtime, "state": state, "precheck": precheck}
    tail = tail_json_lines(p)
    if rec.get("backend") == "claude-code":
        model, state = _state_from_claude_tail(tail)
    else:
        model, state = _state_from_pi_tail(tail)
    mtime = p.stat().st_mtime
    return {
        "path": p, "mtime": mtime, "status": classify_activity(mtime),
        "state": state, "model": model, "precheck": "ok",
    }


def liveness_for(rec: dict, sockets: set[str]) -> str:
    """local mirror of the entwurf liveness axis. peers가 SSOT이고 이건 미러다."""
    if rec.get("gardenId") in sockets:
        return "alive"
    return "dormant" if rec.get("backend") in SOCKET_BACKENDS else "unprobed"


# precheck 사유 → 왜 resume이 불가능한지. 뭉뚱그리면 거짓 사유가 된다.
PRECHECK_BLOCKED = {
    "no-transcript": "첫 turn 전이라 되살릴 대화가 없다",
    "relative-path": "transcriptPath가 relative — record 결함",
    "transcript-missing": "recorded transcript가 디스크에 없다",
    "foreign-transcript": "transcript header가 다른 세션의 것이다",
    "identity-unverified": "transcript identity를 확인하지 못했다",
}


def verbs_for(liveness: str, backend: str, precheck: str) -> str:
    """이 행에서 GLG가 고를 수 있는 verb. 초대가 아니라 목록이다."""
    if liveness == "alive":
        return "send"
    if liveness == "unprobed":
        return "send?"  # rail(mailbox/native-push/reject)은 dispatch 때 결정된다
    if backend not in RESUMABLE_BACKENDS:
        return "fresh (same-id resume 없음)"
    if precheck == "ok":
        return "resume | fresh"
    return f"fresh ({PRECHECK_BLOCKED.get(precheck, precheck)} → resume 불가)"


def cmd_situation(args) -> int:
    sockets = find_active_sockets()
    records, store_defects = certify_records()
    if not records and not store_defects:
        print(f"meta-record 없음: {RECORDS_DIR}", file=sys.stderr)
        return 1

    now = datetime.now().timestamp()
    rows = []
    for rec in records:
        gid = rec["gardenId"]
        backend = rec.get("backend") or "unknown"
        cwd = rec.get("cwd") or ""
        liveness = liveness_for(rec, sockets)
        if args.project and args.project not in cwd:
            continue
        act = record_activity(rec)
        if not args.all and liveness != "alive":
            ref = act["mtime"]
            if ref is None:
                try:
                    ref = datetime.fromisoformat(
                        (rec.get("recordUpdatedAt") or rec.get("createdAt") or "").replace("Z", "+00:00")
                    ).timestamp()
                except ValueError:
                    ref = 0
            if (now - ref) > args.since:
                continue
        rows.append({
            "gid": gid,
            "backend": backend,
            "cwd": cwd,
            "liveness": liveness,
            "model": act["model"] or rec.get("model"),
            "model_source": "transcript" if act["model"] else ("record" if rec.get("model") else None),
            "state": act["state"],
            "mtime": act["mtime"],
            "status": act["status"],
            "precheck": act["precheck"],
            "verbs": verbs_for(liveness, backend, act["precheck"]),
            "is_self": bool(args.self_id and args.self_id in gid),
        })
        if len(rows) >= args.limit:
            break

    if args.json:
        print(json.dumps({"rows": rows, "store_defects": store_defects},
                         ensure_ascii=False, indent=2, default=str))
        return 0

    if not rows:
        for d in store_defects:
            print(f"  ⚠ store defect: {d}", file=sys.stderr)
        print(f"해당 citizen 없음 (since {args.since}s, project={args.project or 'all'})", file=sys.stderr)
        return 1

    live_icon = {"alive": "🟢", "dormant": "⚫", "unprobed": "➖"}
    if args.plain:
        live_icon = {"alive": "[ALIVE]", "dormant": "[DORMANT]", "unprobed": "[UNPROBED]"}

    by_cwd: dict[str, list] = {}
    for r in rows:
        by_cwd.setdefault(r["cwd"] or "(no cwd)", []).append(r)

    n_alive = sum(1 for r in rows if r["liveness"] == "alive")
    n_dormant = sum(1 for r in rows if r["liveness"] == "dormant")
    n_unprobed = sum(1 for r in rows if r["liveness"] == "unprobed")

    lines = [
        f"═══ situation map  {n_alive} alive · {n_dormant} dormant · {n_unprobed} unprobed "
        f"· sockets {len(sockets)} ═══"
    ]
    for cwd, items in sorted(by_cwd.items(), key=lambda x: -max((r["mtime"] or 0) for r in x[1])):
        lines.append(f"\n  📁 {cwd}")
        for r in items:
            age = fmt_age(r["mtime"]) if r["mtime"] else "—"
            model = r["model"] or "(unknown)"
            if r["model_source"] == "record":
                model += "*"
            me = "  ← me" if r["is_self"] else ""
            lines.append(
                f"    {live_icon[r['liveness']]} {r['backend']:11} {r['gid']}  {model:26} "
                f"{age:>7}  · {r['state']}"
            )
            lines.append(f"          → {r['verbs']}{me}")

    if store_defects:
        lines.append("")
        lines.append(f"  ⚠ store defects {len(store_defects)}건 — 아래 record는 citizen 목록에서 빠졌다")
        lines.append("    (entwurf certification과 같은 계약. 수선·가지치기·승자 선택은 하지 않는다)")
        for d in store_defects:
            lines.append(f"    · {d}")

    lines.append("")
    lines.append("  * = transcript가 아니라 record가 말한 model (resume은 transcript를 따른다)")
    lines.append("  판단 재료 경계:")
    lines.append("   · liveness SSOT는 entwurf_peers다. 위 표는 같은 socket 축의 로컬 미러다.")
    lines.append("   · placement(tmux server/window/pane)는 여기 없다 — launch receipt 또는 peer self-report만이 근거다.")
    lines.append("   · state는 transcript last-event 추정이다. 사실이 필요하면 그 창을 직접 보거나 물어라.")
    lines.append("   · 행이 보인다는 것은 dispatch 초대가 아니다. 무엇을 부를지는 GLG가 정한다.")
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

    # situation
    p_sit = sub.add_parser("situation", help="누가 어디서 무엇을 하는 중인가 (판단 재료 한 장)")
    p_sit.add_argument("-p", "--project", help="cwd 부분 매치 필터 (e.g. entwurf, agent-config)")
    p_sit.add_argument("--since", type=int, default=86400,
                       help="최근 N초 이내 활동/갱신된 citizen만 (기본 86400=24h). alive는 항상 포함")
    p_sit.add_argument("-a", "--all", action="store_true", help="since 무시하고 전부")
    p_sit.add_argument("--limit", type=int, default=24, help="최대 행 수 (기본 24)")
    p_sit.add_argument("--self-id", dest="self_id",
                       help="entwurf_self가 준 내 garden id — 내 행을 표시한다")
    p_sit.add_argument("--json", action="store_true", help="JSON 출력")
    p_sit.set_defaults(func=cmd_situation)

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
