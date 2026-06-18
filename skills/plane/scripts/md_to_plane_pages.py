#!/usr/bin/env python3
"""md_to_plane_pages.py — Markdown 트리 → Plane Pages 업로드.

confluence_to_md.py 가 뽑은 .md 트리를 Plane 프로젝트의 Pages 로 올린다.
Plane Pages 는 `description_html` 저장 → md를 pandoc 으로 html 변환해 POST/PATCH.

전제: self-host 에 pages-api-patch 오버레이(v1 에 pages POST/PATCH 노출)가 있어야 함.
      (hej-kip/plane/pages-api-patch — 표준 Plane v1엔 pages 라우트 없음.)

멱등: Plane page 에는 external_id 가 없으므로 **title(name) 매칭**으로 dedup.
      같은 이름 페이지가 있으면 PATCH(본문 갱신), 없으면 POST.

계층: Plane Pages 도 parent 를 지원하나 patch 오버레이가 안 받을 수 있어
      1차 버전은 평면 업로드 + 본문 상단에 원본 경로 표시. (--nest 시 parent 시도)

의존성: Python stdlib + pandoc. ENV: PLANE_API_KEY / PLANE_BASE_URL / PLANE_WORKSPACE.

사용:
  md_to_plane_pages.py --dir <MD_DIR> --project <PLANE_PROJ_UUID>            # dry-run
  md_to_plane_pages.py --dir <MD_DIR> --project <PLANE_PROJ_UUID> --apply
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError

PLANE_KEY = os.environ.get("PLANE_API_KEY", "")
PLANE_BASE = os.environ.get("PLANE_BASE_URL", "").rstrip("/")
PLANE_WS = os.environ.get("PLANE_WORKSPACE", "")


def die(msg):
    print(f"\033[31m✗ {msg}\033[0m", file=sys.stderr)
    sys.exit(1)


def check_env():
    if not (PLANE_KEY and PLANE_BASE and PLANE_WS):
        die("PLANE_API_KEY / PLANE_BASE_URL / PLANE_WORKSPACE 미설정 (source ~/.env.local)")
    if shutil.which("pandoc") is None:
        die("pandoc not on PATH")


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
            body = e.read().decode()
            if e.code == 429 and attempt < _tries - 1:
                wait = float(e.headers.get("Retry-After") or 0) or min(60, 2 ** attempt * 5)
                time.sleep(wait)
                continue
            raise RuntimeError(f"Plane {e.code}: {body[:300]}")
        except URLError as e:
            die(f"연결 오류: {e.reason}")


def plane_paginated(endpoint):
    out, cursor = [], None
    while True:
        ep = endpoint + (("&" if "?" in endpoint else "?") + "per_page=100" +
                         (f"&cursor={urllib.parse.quote(cursor)}" if cursor else ""))
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


# --- markdown 파싱/변환 ------------------------------------------------------

FM_RE = re.compile(r"^---\n(.*?)\n---\n", re.S)


def parse_md(path: Path):
    """front matter(title 등) + 본문 분리. 단순 key: value 파서."""
    text = path.read_text(encoding="utf-8", errors="replace")
    meta, body = {}, text
    m = FM_RE.match(text)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip().strip('"').strip("'")
        body = text[m.end():]
    title = meta.get("title") or path.stem
    return title, meta, body


def md_to_html(body, base_dir: Path):
    """pandoc -f gfm -t html. 이미지 상대경로는 그대로(추후 asset 업로드는 별도)."""
    proc = subprocess.run(
        ["pandoc", "-f", "gfm", "-t", "html", "--wrap=none"],
        input=body.encode("utf-8"), capture_output=True, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError("pandoc: " + proc.stderr.decode("utf-8", "replace"))
    return proc.stdout.decode("utf-8")


# --- run -------------------------------------------------------------------

def run(args):
    check_env()
    root = Path(args.dir).expanduser()
    if not root.is_dir():
        die(f"디렉토리 아님: {root}")
    proj = args.project
    base = f"/workspaces/{PLANE_WS}/projects/{proj}/pages/"

    md_files = sorted(p for p in root.rglob("*.md"))
    print(f"\n\033[1m=== Markdown → Plane Pages ===\033[0m")
    print(f"입력: {root}  ({len(md_files)} md)  →  project {proj[:8]}  "
          f"({'APPLY' if args.apply else 'DRY-RUN'})\n")

    # 멱등: 기존 page name → id
    existing = {}
    if args.apply:
        for pg in plane_paginated(base):
            existing[pg.get("name", "")] = pg["id"]

    created = updated = failed = 0
    for f in md_files:
        title, meta, body = parse_md(f)
        rel = f.relative_to(root)
        # 원본 경로/출처를 본문 상단에 표시 (Plane Pages엔 메타 필드가 없음)
        src = meta.get("source", "")
        prefix = f"<p><em>📄 {rel.parent}</em>" + (f" · <a href=\"{src}\">원본</a>" if src else "") + "</p>\n"
        try:
            html = prefix + md_to_html(body, f.parent)
        except RuntimeError as e:
            print(f"  ❌ {rel}: {e}", file=sys.stderr); failed += 1; continue

        payload = {"name": title, "description_html": html,
                   "description_stripped": re.sub(r"<[^>]+>", "", html)[:5000]}
        try:
            if title in existing:
                if args.apply:
                    plane_req("PATCH", f"{base}{existing[title]}/", payload)
                updated += 1
                print(f"  ✏️  {title}  (갱신)")
            else:
                if args.apply:
                    res = plane_req("POST", base, payload)
                    existing[title] = (res or {}).get("id", title)
                created += 1
                print(f"  ✅ {title}")
        except RuntimeError as e:
            print(f"  ❌ {title}: {e}", file=sys.stderr); failed += 1

    print(f"\n\033[1m요약\033[0m  생성 {created} · 갱신 {updated} · 실패 {failed}")
    if not args.apply:
        print("  → 실제 업로드는 --apply")


def main():
    ap = argparse.ArgumentParser(description="Markdown 트리 → Plane Pages")
    ap.add_argument("--dir", required=True, help="md 트리 루트")
    ap.add_argument("--project", required=True, help="Plane 프로젝트 UUID")
    ap.add_argument("--apply", action="store_true", help="실제 업로드(없으면 dry-run)")
    args = ap.parse_args()
    run(args)


if __name__ == "__main__":
    main()
