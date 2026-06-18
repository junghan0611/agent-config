#!/usr/bin/env python3
"""
jira_to_plane.py — Jira(Cloud) → Plane(self-host) 단방향 이관 브리지.

설계:
  - `jira` 바이너리 의존 없음. Jira REST v3 직격 (서버에서 Jira클라우드+Plane 양쪽 도달).
  - 두 모드:
      audit   : 실제 쓰지 않고 "무엇이 이관/변형/유실되는지" 리포트 (기본, 안전)
      migrate : 실제 Plane work item 생성 (--apply 필요)
  - 멱등성: work item name 에 [JIRA-KEY] prefix → 재실행 시 기존 것 skip.

환경 (~/.env.local):
  JIRA_HOST        예: your-org.atlassian.net  (없으면 ~/.config/.jira/.config.yml 의 server)
  JIRA_USER_EMAIL  예: you@company.com           (없으면 위 config 의 login)
  JIRA_API_TOKEN   Atlassian API token
  PLANE_API_KEY / PLANE_BASE_URL / PLANE_WORKSPACE

사용:
  source ~/.env.local
  ./jira_to_plane.py audit   --jira-project PROJ --plane-project <UUID> [--limit 50]
  ./jira_to_plane.py migrate --jira-project PROJ --plane-project <UUID> --apply [--limit 10]
"""

import os
import sys
import json
import time
import base64
import argparse
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def _jira_config_value(key):
    """Fallback: read server/login from jira-cli config (~/.config/.jira/.config.yml)."""
    cfg = Path.home() / ".config" / ".jira" / ".config.yml"
    if not cfg.exists():
        return None
    for line in cfg.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith(f"{key}:"):
            return line.split(":", 1)[1].strip().strip('"').strip("'")
    return None

JIRA_HOST = os.environ.get("JIRA_HOST") or _jira_config_value("server") or ""
JIRA_HOST = JIRA_HOST.replace("https://", "").replace("http://", "").rstrip("/")
JIRA_EMAIL = os.environ.get("JIRA_USER_EMAIL") or _jira_config_value("login") or ""
JIRA_TOKEN = os.environ.get("JIRA_API_TOKEN", "")

PLANE_KEY = os.environ.get("PLANE_API_KEY", "")
PLANE_BASE = os.environ.get("PLANE_BASE_URL", "https://api.plane.so").rstrip("/")
PLANE_WS = os.environ.get("PLANE_WORKSPACE", "")


def die(msg):
    print(f"\033[31mError:\033[0m {msg}", file=sys.stderr)
    sys.exit(1)


def check_env(need_plane=True):
    if not (JIRA_HOST and JIRA_EMAIL and JIRA_TOKEN):
        die("JIRA_HOST / JIRA_USER_EMAIL / JIRA_API_TOKEN 미설정 (source ~/.env.local)")
    if need_plane and not (PLANE_KEY and PLANE_WS):
        die("PLANE_API_KEY / PLANE_WORKSPACE 미설정")


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def jira_get(path, params=None):
    url = f"https://{JIRA_HOST}{path}"
    if params:
        url += "?" + urlencode(params)
    auth = base64.b64encode(f"{JIRA_EMAIL}:{JIRA_TOKEN}".encode()).decode()
    req = Request(url, headers={"Authorization": f"Basic {auth}", "Accept": "application/json"})
    try:
        with urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except HTTPError as e:
        die(f"Jira {e.code}: {e.read().decode()[:300]}")
    except URLError as e:
        die(f"Jira 연결 실패: {e.reason}")


def plane_req(method, endpoint, data=None, _tries=6):
    url = f"{PLANE_BASE}/api/v1{endpoint}"
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, method=method, headers={
        "X-API-Key": PLANE_KEY, "Content-Type": "application/json",
        # Cloudflare(error 1010) bans the default Python-urllib UA.
        "User-Agent": "plane-skill/1.0"})
    for attempt in range(_tries):
        try:
            with urlopen(req, timeout=60) as r:
                return None if r.status == 204 else json.loads(r.read().decode())
        except HTTPError as e:
            body = e.read().decode()
            # 429 RATE_LIMIT: Retry-After(또는 지수 백오프) 후 재시도.
            if e.code == 429 and attempt < _tries - 1:
                wait = float(e.headers.get("Retry-After") or 0) or min(60, 2 ** attempt * 5)
                time.sleep(wait)
                continue
            # external_id 멱등: 409 = 이미 존재. 에러로 안 보고 기존 id 반환.
            if e.code == 409:
                try:
                    d = json.loads(body)
                    d["_conflict"] = True
                    return d
                except (json.JSONDecodeError, ValueError):
                    pass
            raise RuntimeError(f"Plane {e.code}: {body[:300]}")


def plane_paginated(endpoint):
    """Follow Plane cursor pagination, return all results."""
    out, cursor = [], None
    while True:
        ep = endpoint + (("&" if "?" in endpoint else "?") + f"per_page=100" +
                         (f"&cursor={quote(cursor)}" if cursor else ""))
        d = plane_req("GET", ep)
        if isinstance(d, dict) and "results" in d:
            out.extend(d["results"])
            if d.get("next_page_results") and d.get("next_cursor"):
                cursor = d["next_cursor"]
                continue
        elif isinstance(d, list):
            out.extend(d)
        break
    return out


# ---------------------------------------------------------------------------
# ADF (Atlassian Document Format) → HTML  (minimal but covers common nodes)
# ---------------------------------------------------------------------------

def _esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def adf_to_html(node):
    """Convert ADF doc (or plain string) to HTML. Returns (html, lossy_notes set)."""
    notes = set()

    def marks(text, ms):
        for m in ms or []:
            t = m.get("type")
            if t == "strong": text = f"<strong>{text}</strong>"
            elif t == "em": text = f"<em>{text}</em>"
            elif t == "code": text = f"<code>{text}</code>"
            elif t == "strike": text = f"<s>{text}</s>"
            elif t == "link": text = f'<a href="{_esc(m.get("attrs",{}).get("href",""))}">{text}</a>'
            else: notes.add(f"mark:{t}")
        return text

    def walk(n):
        if isinstance(n, str):
            return _esc(n)
        t = n.get("type")
        ch = n.get("content", [])
        inner = "".join(walk(c) for c in ch)
        if t == "doc": return inner
        if t == "paragraph": return f"<p>{inner}</p>"
        if t == "text": return marks(_esc(n.get("text", "")), n.get("marks"))
        if t == "hardBreak": return "<br/>"
        if t == "heading":
            lvl = n.get("attrs", {}).get("level", 1)
            return f"<h{lvl}>{inner}</h{lvl}>"
        if t == "bulletList": return f"<ul>{inner}</ul>"
        if t == "orderedList": return f"<ol>{inner}</ol>"
        if t == "listItem": return f"<li>{inner}</li>"
        if t == "blockquote": return f"<blockquote>{inner}</blockquote>"
        if t == "codeBlock": return f"<pre><code>{inner}</code></pre>"
        if t == "rule": return "<hr/>"
        if t == "mention":
            notes.add("mention")
            return f'@{_esc(n.get("attrs",{}).get("text","user"))}'
        if t == "emoji":
            return _esc(n.get("attrs", {}).get("text", ""))
        if t == "mediaSingle" or t == "media" or t == "mediaGroup":
            notes.add("attachment/media")
            return "<p>[첨부/미디어 — 미이관]</p>"
        if t == "table":
            notes.add("table")
            return f"<table>{inner}</table>"
        if t in ("tableRow",): return f"<tr>{inner}</tr>"
        if t in ("tableCell", "tableHeader"): return f"<td>{inner}</td>"
        if t == "panel":
            notes.add("panel")
            return f"<blockquote>{inner}</blockquote>"
        # unknown
        notes.add(f"node:{t}")
        return inner

    if isinstance(node, str):
        return f"<p>{_esc(node)}</p>", notes
    if not isinstance(node, dict):
        return "", notes
    return walk(node), notes


# ---------------------------------------------------------------------------
# Mapping
# ---------------------------------------------------------------------------

# Jira priority name (영/한 prefix) → Plane priority
def map_priority(jira_pri):
    if not jira_pri:
        return "none"
    name = (jira_pri.get("name") or "").lower()
    if name.startswith(("blocker", "highest", "critical")): return "urgent"
    if name.startswith(("major", "high")): return "high"
    if name.startswith(("medium", "normal")): return "medium"
    if name.startswith(("minor", "low")): return "low"
    if name.startswith(("trivial", "lowest")): return "none"
    return "medium"


# Jira statusCategory key → Plane state group
_CAT_TO_GROUP = {"new": "unstarted", "indeterminate": "started", "done": "completed"}

def map_state(jira_status, plane_states_by_group, plane_states_by_name):
    """Try exact name match first, else fall back by statusCategory→group."""
    name = (jira_status.get("name") or "").strip()
    # exact (case-insensitive) name match
    for pname, sid in plane_states_by_name.items():
        if pname.lower() == name.lower():
            return sid, "name"
    cat = (jira_status.get("statusCategory") or {}).get("key", "")
    group = _CAT_TO_GROUP.get(cat)
    if group and plane_states_by_group.get(group):
        return plane_states_by_group[group][0], f"category:{cat}"
    return None, "unmatched"


# ---------------------------------------------------------------------------
# Jira fetch
# ---------------------------------------------------------------------------

JIRA_FIELDS = ("summary,description,issuetype,status,priority,assignee,reporter,"
               "labels,parent,created,updated,resolution,components,"
               "customfield_10014")  # Epic Link

def fetch_jira_issues(project, limit):
    issues, token = [], None
    while len(issues) < limit:
        params = {"jql": f"project={project} ORDER BY created ASC",
                  "maxResults": min(100, limit - len(issues)),
                  "fields": JIRA_FIELDS}
        if token:
            params["nextPageToken"] = token
        d = jira_get("/rest/api/3/search/jql", params)
        issues.extend(d.get("issues", []))
        token = d.get("nextPageToken")
        if d.get("isLast") or not token:
            break
    return issues[:limit]


def fetch_comments(issue_key):
    d = jira_get(f"/rest/api/3/issue/{issue_key}/comment", {"maxResults": 100})
    return d.get("comments", [])


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

# 무엇이 어디로 가는가 — 정적 분류 (실측 기반)
MIGRATE_MATRIX = [
    ("summary",        "→ name",                "✅ 완전"),
    ("description",    "→ description_html",    "⚠️ ADF→HTML 변환(표/패널/멘션/첨부 degrade)"),
    ("priority",       "→ priority",            "⚠️ 5단계 스킴 → Plane 5단계 매핑(근사)"),
    ("status",         "→ state",               "⚠️ 이름/카테고리 매핑(커스텀 상태는 근사)"),
    ("assignee",       "→ assignees",           "⚠️ 이메일이 Plane member 일 때만. 아니면 유실"),
    ("labels",         "→ labels",              "✅ (없으면 생성 필요)"),
    ("parent",         "→ parent",              "✅ 2-pass 배선(직계 + Epic Link cf_10014)"),
    ("comments",       "→ comments",            "⚠️ 미구현(phase 2; API는 created_by/actor 위조 지원)"),
    ("reporter",       "→ created_by",          "✅ Plane member 면 보존, 아니면 본문 note"),
    ("created",        "→ created_at",          "✅ 백데이트 보존 (updated_at 은 불가)"),
    ("멱등 키",        "→ external_id/source",  "✅ 재실행 409 dedup (이름 prefix 불필요)"),
    ("resolution",     "✗ Plane 개념 없음",      "❌ Done state 에 흡수"),
    ("epic(cf_10014)", "→ parent(우회)",        "⚠️ epic을 부모로 배선. epic *type* 은 미생성"),
    ("attachments",    "✗ asset API 별도/복잡",  "❌ 이번 범위 외"),
    ("worklog/votes/watches/rank/charts", "✗ 대응 없음", "❌ 유실"),
    ("issue links",    "✗ ",                    "❌ 유실"),
    ("history/changelog", "✗ ",                 "❌ 유실"),
    ("Confluence pages", "→ Plane Pages",       "✅ v1 Pages API (self-host 구버전은 overlay 로 노출 필요 — pages-api-patch)"),
]


def run_audit(args):
    check_env()
    print(f"\n\033[1m=== Jira→Plane 이관 감별 (audit) — {args.jira_project} ===\033[0m")
    issues = fetch_jira_issues(args.jira_project, args.limit)
    print(f"표본: {len(issues)} 건 (--limit {args.limit})\n")

    # Plane 매핑 소스
    states = plane_paginated(f"/workspaces/{PLANE_WS}/projects/{args.plane_project}/states/")
    by_group, by_name = {}, {}
    for s in states:
        by_group.setdefault(s.get("group"), []).append(s["id"])
        by_name[s["name"]] = s["id"]
    members = plane_paginated(f"/workspaces/{PLANE_WS}/members/")
    member_emails = {(m.get("email") or "").lower() for m in members}

    # 실측 카운터
    n_assignee = n_assignee_ok = n_epic = n_parent = n_labels = 0
    adf_notes = {}
    status_unmatched = {}
    pri_dist = {}
    for it in issues:
        f = it["fields"]
        if f.get("assignee"):
            n_assignee += 1
            if (f["assignee"].get("emailAddress") or "").lower() in member_emails:
                n_assignee_ok += 1
        if f.get("customfield_10014"): n_epic += 1
        if f.get("parent"): n_parent += 1
        if f.get("labels"): n_labels += 1
        _, notes = adf_to_html(f.get("description") or "")
        for nkey in notes:
            adf_notes[nkey] = adf_notes.get(nkey, 0) + 1
        sid, how = map_state(f.get("status") or {}, by_group, by_name)
        if how == "unmatched":
            status_unmatched[(f.get("status") or {}).get("name", "?")] = \
                status_unmatched.get((f.get("status") or {}).get("name", "?"), 0) + 1
        p = map_priority(f.get("priority"))
        pri_dist[p] = pri_dist.get(p, 0) + 1

    print("\033[1m필드별 이관 매트릭스\033[0m")
    for field, dest, verdict in MIGRATE_MATRIX:
        print(f"  {field:34} {dest:26} {verdict}")

    print(f"\n\033[1m표본 실측\033[0m")
    print(f"  담당자 있는 이슈            : {n_assignee}/{len(issues)}  "
          f"(이 중 Plane member 매칭: \033[31m{n_assignee_ok}\033[0m → 나머지 유실)")
    print(f"  Epic Link 보유             : {n_epic}  (❌ CE 라벨/모듈 우회 필요)")
    print(f"  부모(parent) 보유          : {n_parent}  (2pass 필요)")
    print(f"  라벨 보유                  : {n_labels}")
    print(f"  우선순위 매핑 분포          : {pri_dist}")
    if status_unmatched:
        print(f"  \033[31m상태 매핑 실패\033[0m            : {status_unmatched} (수동 매핑 필요)")
    else:
        print(f"  상태 매핑                  : 전부 매칭 ✅")
    if adf_notes:
        print(f"  \033[33m본문 ADF degrade 요소\033[0m      : {adf_notes}")
    print(f"\n  Plane members({len(members)}): {sorted(member_emails)}")
    print(f"  Plane states: {list(by_name.keys())}")
    print("\n→ 결론: ✅/⚠️ 는 이관, ❌ 는 유실/우회. --apply 로 실제 적재 (멱등).")


# ---------------------------------------------------------------------------
# Migrate
# ---------------------------------------------------------------------------

def _external_source():
    """external_id 와 함께 쓰는 출처 식별자 — 재실행 멱등의 키."""
    return f"jira:{JIRA_HOST}"


def _parent_key(f):
    """부모 후보: 직계 parent(하위작업) 우선, 없으면 Epic Link(cf_10014)."""
    p = f.get("parent")
    if isinstance(p, dict) and p.get("key"):
        return p["key"]
    ep = f.get("customfield_10014")
    if isinstance(ep, str) and ep.strip():
        return ep.strip()
    if isinstance(ep, dict) and ep.get("key"):
        return ep["key"]
    return None


def run_migrate(args):
    check_env()
    if not args.apply:
        die("실제 적재는 --apply 필요. 먼저 audit 으로 확인하세요.")
    issues = fetch_jira_issues(args.jira_project, args.limit)
    states = plane_paginated(f"/workspaces/{PLANE_WS}/projects/{args.plane_project}/states/")
    by_group, by_name = {}, {}
    for s in states:
        by_group.setdefault(s.get("group"), []).append(s["id"])
        by_name[s["name"]] = s["id"]
    members = plane_paginated(f"/workspaces/{PLANE_WS}/members/")
    email_to_id = {(m.get("email") or "").lower(): m["id"] for m in members}
    source = _external_source()
    base = f"/workspaces/{PLANE_WS}/projects/{args.plane_project}/work-items/"

    # ---- Pass 1: 생성/매칭 (external_id 멱등) → key→plane_id 맵 ----
    keymap = {}
    created = existed = failed = 0
    for it in issues:
        key = it["key"]
        f = it["fields"]
        html, _ = adf_to_html(f.get("description") or "")
        rep = f.get("reporter") or {}
        rep_name = rep.get("displayName", "—")
        # reporter 가 Plane member 가 아닐 때를 대비한 본문 note (유실 방지)
        note = f"<hr/><p><em>이관: Jira {key} · 보고자 {rep_name}</em></p>"
        payload = {
            "name": f.get("summary", "") or key,
            "description_html": html + note,
            "priority": map_priority(f.get("priority")),
            "external_id": key,
            "external_source": source,
        }
        sid, _ = map_state(f.get("status") or {}, by_group, by_name)
        if sid:
            payload["state"] = sid
        if f.get("created"):                       # 생성시각 백데이트
            payload["created_at"] = f["created"]
        rep_id = email_to_id.get((rep.get("emailAddress") or "").lower())
        if rep_id:                                 # reporter → created_by
            payload["created_by"] = rep_id
        asg = f.get("assignee") or {}
        mid = email_to_id.get((asg.get("emailAddress") or "").lower())
        if mid:
            payload["assignees"] = [mid]
        try:
            res = plane_req("POST", base, payload)
        except RuntimeError as e:
            print(f"  ❌ {key}: {e}", file=sys.stderr)
            failed += 1
            continue
        if not res or not res.get("id"):
            print(f"  ❌ {key}: 응답에 id 없음", file=sys.stderr)
            failed += 1
            continue
        keymap[key] = res["id"]
        if res.get("_conflict"):
            existed += 1
        else:
            created += 1
            print(f"  ✅ {key} → {res.get('sequence_id', res['id'][:8])}")

    # ---- Pass 2: 부모관계 배선 (둘 다 이관됐을 때만) ----
    linked = orphan = 0
    for it in issues:
        key = it["key"]
        pkey = _parent_key(it["fields"])
        if not pkey or key not in keymap:
            continue
        if pkey not in keymap:
            orphan += 1
            continue
        try:
            plane_req("PATCH", f"{base}{keymap[key]}/", {"parent": keymap[pkey]})
            linked += 1
        except RuntimeError as e:
            print(f"  ⚠ parent {key}→{pkey}: {e}", file=sys.stderr)

    print(f"\n완료: 생성 {created} · 기존(409) {existed} · 실패 {failed} "
          f"· 부모연결 {linked}" + (f" · 부모유실 {orphan}" if orphan else ""))


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Jira → Plane 단방향 이관 브리지")
    sub = ap.add_subparsers(dest="cmd")
    for name in ("audit", "migrate"):
        p = sub.add_parser(name)
        p.add_argument("--jira-project", required=True)
        p.add_argument("--plane-project", required=True, help="Plane project UUID")
        p.add_argument("--limit", type=int, default=50)
        if name == "migrate":
            p.add_argument("--apply", action="store_true", help="실제 적재(없으면 거부)")
    args = ap.parse_args()
    if args.cmd == "audit":
        run_audit(args)
    elif args.cmd == "migrate":
        run_migrate(args)
    else:
        ap.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
