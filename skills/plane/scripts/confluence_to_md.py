#!/usr/bin/env python3
"""confluence_to_md.py — Confluence space/page → Markdown 트리 (REST API 벌크).

Atlassian 의존성 절단 손. Confluence를 "활용 가능한 포맷"(순수 .md 파일 트리)으로
끌어내린다. 문서 SSOT는 Plane Pages(HTML/블록)가 아니라 이 md 트리다.

설계 — 두 선행 자산을 통합:
  - jiracli/confluence_ingest.py : REST API + front matter (단건)
  - memex-kb/confluence_to_markdown.py : cleanup + NFC 정규화 (.doc 오프라인)
이 스크립트 = REST 벌크 + export_view + pandoc(-t markdown, grid table) +
              cleanup/NFC 흡수 + 첨부 다운로드 + 계층(ancestors) 미러링.

한글: REST export_view 는 소스부터 NFC라 pandoc(3.x)이 안 깨뜨린다(실측).
      그래도 마지막에 NFC 정규화를 무조건 한 번 더 건다(NFD 페이지 안전망).

의존성: Python stdlib + pandoc (PATH). 외부 패키지 0.

ENV (source ~/.env.local):
  JIRA_HOST        예: your-org.atlassian.net
  JIRA_USER_EMAIL  예: you@company.com
  JIRA_API_TOKEN   Atlassian API token

사용:
  # dry-run (트리/카운트만, 파일 안 씀)
  confluence_to_md.py --space QA --out ~/repos/gh/memex-kb/docs/confluence
  # 실제 추출
  confluence_to_md.py --space QA --out <DIR> --apply
  # 단일 페이지(+하위 트리)
  confluence_to_md.py --page-id 426033 --out <DIR> --apply
"""

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError

KST = timezone(timedelta(hours=9))

# --- env / auth ------------------------------------------------------------

HOST = (os.environ.get("JIRA_HOST", "")
        .replace("https://", "").replace("http://", "").rstrip("/"))
EMAIL = os.environ.get("JIRA_USER_EMAIL", "")
TOKEN = os.environ.get("JIRA_API_TOKEN", "")


def die(msg):
    print(f"\033[31m✗ {msg}\033[0m", file=sys.stderr)
    sys.exit(1)


def check_env():
    if not (HOST and EMAIL and TOKEN):
        die("JIRA_HOST / JIRA_USER_EMAIL / JIRA_API_TOKEN 미설정 (source ~/.env.local)")
    if shutil.which("pandoc") is None:
        die("pandoc not on PATH — install pandoc to continue")


def _auth_header():
    return "Basic " + base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()


def jira_get(path, params=None):
    url = f"https://{HOST}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "Authorization": _auth_header(),
        "Accept": "application/json",
        "User-Agent": "confluence-to-md/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except HTTPError as e:
        die(f"Confluence {e.code} on {path}: {e.read().decode()[:300]}")
    except URLError as e:
        die(f"연결 오류: {e.reason}")


def download(url, dest: Path):
    """인증 포함 바이너리 다운로드 (첨부/이미지)."""
    req = urllib.request.Request(url, headers={
        "Authorization": _auth_header(),
        "User-Agent": "confluence-to-md/1.0",
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


# --- fetch -----------------------------------------------------------------

def list_pages(space=None, page_id=None, limit=10_000):
    """스페이스 전체 또는 단일 페이지+하위 트리의 페이지 메타를 모은다.

    각 페이지: id, title, version, ancestors(title 체인), export_view HTML.
    v1 content API + expand 로 한 번에 끌어온다(페이지네이션 추적)."""
    pages, start = [], 0
    if space:
        base = "/wiki/rest/api/content"
        params_base = {"spaceKey": space, "type": "page", "limit": 100,
                       "expand": "body.export_view,ancestors,version,space"}
    else:
        # page_id: 단건 + 그 하위 descendants
        ids = [page_id] + _descendant_ids(page_id)
        for pid in ids:
            if len(pages) >= limit:
                break
            d = jira_get(f"/wiki/rest/api/content/{pid}",
                         {"expand": "body.export_view,ancestors,version,space"})
            pages.append(d)
        return pages[:limit]

    while len(pages) < limit:
        p = dict(params_base, start=start)
        d = jira_get(base, p)
        results = d.get("results", [])
        pages.extend(results)
        if len(results) < 100 or not d.get("_links", {}).get("next"):
            break
        start += 100
    return pages[:limit]


def _descendant_ids(page_id):
    out, start = [], 0
    while True:
        d = jira_get(f"/wiki/rest/api/content/{page_id}/descendant/page",
                     {"limit": 100, "start": start})
        results = d.get("results", [])
        out.extend(r["id"] for r in results)
        if len(results) < 100:
            break
        start += 100
    return out


def list_attachments(page_id):
    """{filename: absolute_download_url} 매핑."""
    out, start = {}, 0
    while True:
        d = jira_get(f"/wiki/rest/api/content/{page_id}/child/attachment",
                     {"limit": 100, "start": start})
        for a in d.get("results", []):
            dl = a.get("_links", {}).get("download", "")
            if dl:
                out[a["title"]] = f"https://{HOST}/wiki{dl}"
        if len(d.get("results", [])) < 100:
            break
        start += 100
    return out


# --- convert ---------------------------------------------------------------

def rewrite_images(html, page_id, assets_dir: Path, apply, asset_relprefix):
    """export_view 의 <img src=".../wiki/download/..."> 를 로컬 _assets 로 내려받고
    src 를 상대경로로 치환. 반환: (html, downloaded_count, missing)."""
    srcs = re.findall(r'<img[^>]*\bsrc="([^"]+)"', html)
    if not srcs:
        return html, 0, 0
    att_map = None
    n_dl, n_miss = 0, 0
    for src in set(srcs):
        # 다운로드 URL → 파일명 추출
        path = urllib.parse.urlparse(src).path
        fname = urllib.parse.unquote(os.path.basename(path))
        if not fname:
            n_miss += 1
            continue
        local_rel = f"{asset_relprefix}/{fname}"
        if apply:
            assets_dir.mkdir(parents=True, exist_ok=True)
            dl_url = src if src.startswith("http") else f"https://{HOST}{src}"
            try:
                download(dl_url, assets_dir / fname)
                n_dl += 1
            except Exception:
                # download 링크가 깨졌으면 첨부 API 매핑으로 폴백
                if att_map is None:
                    att_map = list_attachments(page_id)
                if fname in att_map:
                    try:
                        download(att_map[fname], assets_dir / fname)
                        n_dl += 1
                    except Exception:
                        n_miss += 1
                        continue
                else:
                    n_miss += 1
                    continue
        html = html.replace(f'src="{src}"', f'src="{local_rel}"')
    return html, n_dl, n_miss


def pandoc_html_to_md(html):
    """pandoc -f html -t markdown(grid table) --wrap=none. 한글 보존(실측)."""
    full = ("<!DOCTYPE html><html><head>"
            "<meta charset='utf-8'></head><body>" + html + "</body></html>")
    proc = subprocess.run(
        ["pandoc", "-f", "html",
         "-t", "markdown-simple_tables-multiline_tables", "--wrap=none"],
        input=full.encode("utf-8"), capture_output=True, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError("pandoc: " + proc.stderr.decode("utf-8", "replace"))
    return proc.stdout.decode("utf-8")


def clean_markdown(md):
    """memex-kb cleanup 흡수 + pandoc 속성 제거 + NFC 안전망."""
    # heading id  {#...}
    md = re.sub(r"[ \t]+\{#[^}]*\}", "", md)
    # 이미지/스팬 속성 {.class width=...}
    md = re.sub(r"\{\.[^}]*\}", "", md)
    md = re.sub(r"\{width=[^}]*\}", "", md)
    # 속성 제거 후 남은 [![alt](path)] 래퍼의 바깥 대괄호 풀기
    md = re.sub(r"\[(!\[[^\]]*\]\([^)]*\))\]", r"\1", md)
    # 남은 [text]{} 빈 속성 래퍼 → text
    md = re.sub(r"\[([^\]]*)\]\(\)", r"\1", md)
    # fenced div (:::) 제거 — memex
    md = re.sub(r"^:{3,}.*$", "", md, flags=re.MULTILINE)
    # syntaxhighlighter 코드블록 속성 정리
    md = re.sub(r"```\s*\{\.syntaxhighlighter-pre[^}]+\}", "```", md)
    # 연속 빈 줄 3+ → 2
    md = re.sub(r"\n{4,}", "\n\n\n", md)
    md = md.strip() + "\n"
    # NFC 정규화 (네 방식 — 안전망; 이미 NFC면 no-op)
    md = unicodedata.normalize("NFC", md)
    return md


# --- path / front matter ---------------------------------------------------

_SLUG_BAD = re.compile(r'[/\\:*?"<>|]+')


def slugify(title):
    s = unicodedata.normalize("NFC", title).strip()
    s = _SLUG_BAD.sub("-", s)        # 파일시스템 금지문자
    s = re.sub(r"\s+", " ", s).strip()
    return s[:120] or "untitled"


def page_relpath(page):
    """ancestors title 체인 → 디렉토리, 자신 title → 파일명."""
    anc = [slugify(a["title"]) for a in page.get("ancestors", [])]
    parts = anc + [slugify(page["title"]) + ".md"]
    return Path(*parts)


def kst(s):
    if not s:
        return ""
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.astimezone(KST).strftime("%Y-%m-%d %H:%M KST")
    except ValueError:
        return s


def front_matter(page):
    sp = (page.get("space") or {}).get("key", "")
    ver = (page.get("version") or {}).get("number", "")
    mod = kst((page.get("version") or {}).get("when", ""))
    pid = page["id"]
    title = unicodedata.normalize("NFC", page["title"]).replace('"', "'")
    host_tag = re.sub(r"[^a-z0-9]", "", HOST.split(".")[0].lower())
    src = f"https://{HOST}/wiki/spaces/{sp}/pages/{pid}"
    return (
        "---\n"
        f'title: "{title}"\n'
        f"source: {src}\n"
        f"source_id: {pid}\n"
        f"source_version: {ver}\n"
        f"source_modified: {mod}\n"
        f"fetched_at: {datetime.now(KST).strftime('%Y-%m-%d %H:%M KST')}\n"
        f"space: {sp}\n"
        f"tags: [confluence, {host_tag}]\n"
        "---\n\n"
    )


def existing_version(path: Path):
    if not path.exists():
        return None
    head = path.read_text(encoding="utf-8", errors="replace")[:600]
    m = re.search(r"^source_version:\s*(\d+)", head, re.MULTILINE)
    return m.group(1) if m else None


# --- run -------------------------------------------------------------------

def run(args):
    check_env()
    out = Path(args.out).expanduser()
    scope = f"space={args.space}" if args.space else f"page={args.page_id}+하위"
    print(f"\n\033[1m=== Confluence → Markdown — {scope} ===\033[0m")
    print(f"출력: {out}  ({'APPLY' if args.apply else 'DRY-RUN'})\n")

    pages = list_pages(space=args.space, page_id=args.page_id, limit=args.limit)
    print(f"대상 페이지: {len(pages)}\n")

    created = updated = skipped = img_total = img_miss = 0
    for pg in pages:
        rel = page_relpath(pg)
        dest = out / rel
        ver = str((pg.get("version") or {}).get("number", ""))
        prev = existing_version(dest)

        if prev == ver and ver:
            skipped += 1
            print(f"  ⏭  {rel}  (v{ver} 동일)")
            continue

        html = ((pg.get("body") or {}).get("export_view") or {}).get("value", "")
        # 이미지 → 페이지 옆 _assets/<pageid>/
        assets_dir = dest.parent / "_assets" / pg["id"]
        asset_relprefix = f"_assets/{pg['id']}"
        html, n_dl, n_miss = rewrite_images(
            html, pg["id"], assets_dir, args.apply, asset_relprefix)
        img_total += n_dl
        img_miss += n_miss

        try:
            md = clean_markdown(pandoc_html_to_md(html))
        except RuntimeError as e:
            print(f"  ❌ {rel}: {e}", file=sys.stderr)
            continue
        content = front_matter(pg) + md

        tag = "✏️ " if prev else "✅"
        if args.apply:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding="utf-8")
        if prev:
            updated += 1
        else:
            created += 1
        extra = f"  [img {n_dl}{'/'+str(n_miss)+'miss' if n_miss else ''}]" if (n_dl or n_miss) else ""
        print(f"  {tag} {rel}{extra}")

    print(f"\n\033[1m요약\033[0m  생성 {created} · 갱신 {updated} · skip {skipped} "
          f"· 이미지 {img_total}" + (f" (\033[31m{img_miss} 누락\033[0m)" if img_miss else ""))
    if not args.apply:
        print("  → 실제 추출은 --apply")


def main():
    ap = argparse.ArgumentParser(description="Confluence → Markdown 트리 (REST 벌크)")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--space", help="스페이스 키 (예: QA)")
    g.add_argument("--page-id", help="단일 페이지 ID(+하위 트리)")
    ap.add_argument("--out", required=True, help="출력 루트 디렉토리")
    ap.add_argument("--limit", type=int, default=10_000, help="최대 페이지 수")
    ap.add_argument("--apply", action="store_true", help="실제 파일 작성(없으면 dry-run)")
    args = ap.parse_args()
    run(args)


if __name__ == "__main__":
    main()
