#!/usr/bin/env python3
"""migrate_all.py — 전체 Atlassian → Plane 이관 오케스트레이터.

매핑 표대로 Plane 프로젝트를 get-or-create 하고, 각 프로젝트에
  - Jira 프로젝트(들) → work items   (jira_to_plane.py migrate)
  - Confluence 스페이스(들) → md → Pages (confluence_to_md.py + md_to_plane_pages.py)
를 순차 실행한다. 전부 멱등(external_id / source_version / title) → 안전하게 재실행/resume.

긴 배치(rate-limit). tmux 등에서 백그라운드로. 진행은 프로젝트별로 출력.

ENV: PLANE_API_KEY / PLANE_BASE_URL / PLANE_WORKSPACE + JIRA_*.
사용: migrate_all.py [--only MAT,TUYA] [--skip GP1] [--pages-only] [--items-only]
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError

HERE = Path(__file__).resolve().parent
TMP = Path(os.environ.get("CONF_TMP",
           "/home/junghan/repos/gh/agent-config/.tmp-confluence-md"))

PLANE_KEY = os.environ.get("PLANE_API_KEY", "")
PLANE_BASE = os.environ.get("PLANE_BASE_URL", "").rstrip("/")
PLANE_WS = os.environ.get("PLANE_WORKSPACE", "")

# (plane_name, identifier, [jira projects], [confluence spaces])
MAPPING = [
    ("MAT",       "MAT",  ["MAT"],        ["MAT", "KDMAT"]),
    ("TUYA",      "TUYA", ["TUYA"],       ["GXTQNA"]),
    ("DEVT",      "DEVT", ["DEVT"],       ["CK7cJZ8jrCka", "GoqualDev"]),
    ("GPRC",      "GPRC", ["GPRC"],       []),
    ("GoqualPrj", "GQPR", ["GOQUALPRJ"],  []),
    ("ITSD",      "ITSD", ["ITSD"],       []),
    ("PRJ",       "PRJX", ["PRJ"],        []),
    ("LGThinQ",   "LGTQ", ["A25J000002"], []),
    ("SSVM",      "SSVM", ["SSVM"],       []),
    ("GP1",       "GP1",  ["GP1"],        []),   # 최대(1214) — 맨 뒤
    ("QA",        "QADOC",[],             ["QA"]),
    ("Backend",   "BACK", [],             ["Server"]),
    ("Firmware",  "FW",   [],             ["Firmware"]),
    ("Mobile",    "MOB",  [],             ["Mobile"]),
    ("Frontend",  "FE",   [],             ["Frontend"]),
]


def log(msg):
    print(msg, flush=True)


def plane_req(method, endpoint, data=None, _tries=6):
    url = f"{PLANE_BASE}/api/v1{endpoint}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "X-API-Key": PLANE_KEY, "Content-Type": "application/json",
        "User-Agent": "plane-skill/1.0"})
    for attempt in range(_tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return None if r.status == 204 else json.loads(r.read().decode())
        except HTTPError as e:
            b = e.read().decode()
            if e.code == 429 and attempt < _tries - 1:
                time.sleep(float(e.headers.get("Retry-After") or 0) or min(60, 2 ** attempt * 5))
                continue
            raise RuntimeError(f"Plane {e.code}: {b[:200]}")


def get_or_create_project(name, identifier):
    # 기존 프로젝트 검색 (identifier 매칭)
    out, cursor = [], None
    while True:
        ep = f"/workspaces/{PLANE_WS}/projects/?per_page=100"
        if cursor:
            ep += f"&cursor={urllib.parse.quote(cursor)}"
        d = plane_req("GET", ep)
        if isinstance(d, dict) and "results" in d:
            out.extend(d["results"])
            if d.get("next_page_results") and d.get("next_cursor"):
                cursor = d["next_cursor"]; continue
        elif isinstance(d, list):
            out.extend(d)
        break
    for p in out:
        if p.get("identifier") == identifier or p.get("name") == name:
            return p["id"], False
    res = plane_req("POST", f"/workspaces/{PLANE_WS}/projects/",
                    {"name": name, "identifier": identifier})
    return res["id"], True


def run_script(args_list, label):
    log(f"    $ {label}")
    p = subprocess.run([sys.executable] + args_list, capture_output=True, text=True)
    tail = (p.stdout or "").strip().splitlines()[-2:] + (p.stderr or "").strip().splitlines()[-2:]
    for ln in tail:
        log(f"      {ln}")
    return p.returncode == 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="콤마 구분 plane_name 목록만")
    ap.add_argument("--skip", help="콤마 구분 plane_name 제외")
    ap.add_argument("--items-only", action="store_true")
    ap.add_argument("--pages-only", action="store_true")
    ap.add_argument("--limit", type=int, default=10_000, help="Jira 프로젝트당 최대")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    skip = set(a.skip.split(",")) if a.skip else set()

    jira_py = str(HERE / "jira_to_plane.py")
    conf_py = str(HERE / "confluence_to_md.py")
    page_py = str(HERE / "md_to_plane_pages.py")

    t0 = time.time()
    for name, ident, jiras, spaces in MAPPING:
        if only and name not in only:
            continue
        if name in skip:
            continue
        log(f"\n=== {name} ({ident}) ===")
        try:
            puuid, fresh = get_or_create_project(name, ident)
        except RuntimeError as e:
            log(f"  ❌ 프로젝트 실패: {e}"); continue
        log(f"  project {puuid[:8]} {'(신규)' if fresh else '(기존)'}")

        if not a.pages_only:
            for jp in jiras:
                run_script([jira_py, "migrate", "--jira-project", jp,
                            "--plane-project", puuid, "--limit", str(a.limit), "--apply"],
                           f"jira {jp} → work items")
        if not a.items_only:
            for sp in spaces:
                outdir = str(TMP / name)
                run_script([conf_py, "--space", sp, "--out", outdir, "--apply"],
                           f"confluence {sp} → md")
            if spaces:
                run_script([page_py, "--dir", str(TMP / name),
                            "--project", puuid, "--apply"],
                           f"md → Pages ({name})")
    log(f"\n총 소요 {int(time.time()-t0)}s")


if __name__ == "__main__":
    main()
