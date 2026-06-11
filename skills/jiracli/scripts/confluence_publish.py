#!/usr/bin/env python3
"""Confluence page publisher — create or update a page via Atlassian REST v2.

Companion to confluence_ingest.py (which is read-only). This one WRITES:
the jiracli `jira` CLI and confluence_ingest only read; page creation needs
the REST v2 write endpoint, which this wraps without any Claude Code builtin
plugin (stdlib only, low context).

Auth (same as confluence_ingest.py):
  - JIRA_API_TOKEN  : env, exported (`source ~/.env.local`). Atlassian unified token.
  - email           : parsed from ~/.config/.jira/.config.yml `login:` field
                      (or JIRA_USER_EMAIL env override).

Body format: Confluence **storage XHTML**. Pass it directly with --body-file,
or pass markdown with --md to convert via pandoc (gfm -> html). Markdown loses
status lozenges; for those use storage macros in a --body-file directly:
  status:  <ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">Green</ac:parameter><ac:parameter ac:name="title">완료</ac:parameter></ac:structured-macro>
  panel:   <ac:structured-macro ac:name="info"><ac:rich-text-body><p>...</p></ac:rich-text-body></ac:structured-macro>

Examples:
  # create under a folder (parentId) in space by key
  source ~/.env.local && python3 confluence_publish.py \
    --space-key CK7cJZ8jrCka --parent-id 264503298 \
    --title "[사내] 프로젝트 X 현황" --body-file page.storage.html

  # convert markdown body on the fly
  source ~/.env.local && python3 confluence_publish.py \
    --space-key CK7cJZ8jrCka --parent-id 264503298 \
    --title "..." --body-file page.md --md

  # update an existing page (version auto-incremented)
  source ~/.env.local && python3 confluence_publish.py \
    --page-id 264339520 --title "..." --body-file page.storage.html \
    --message "timeline update"
"""
from __future__ import annotations
import argparse
import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

JIRA_CONFIG_PATH = Path.home() / ".config" / ".jira" / ".config.yml"


def err(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)


def get_host() -> str:
    """Resolve Atlassian host from JIRA_HOST env or jira config `server:` field."""
    env = os.environ.get("JIRA_HOST")
    if env:
        return env.strip().replace("https://", "").replace("http://", "").rstrip("/")
    if JIRA_CONFIG_PATH.exists():
        pat = re.compile(r"^\s*server:\s*(.+?)\s*$")
        for line in JIRA_CONFIG_PATH.read_text(encoding="utf-8").splitlines():
            m = pat.match(line)
            if m:
                return m.group(1).strip().strip("'\"").replace("https://", "").replace("http://", "").rstrip("/")
    err("host not resolved — set JIRA_HOST env or `server:` in ~/.config/.jira/.config.yml")
    sys.exit(2)


def get_email() -> str:
    env = os.environ.get("JIRA_USER_EMAIL")
    if env:
        return env.strip()
    if not JIRA_CONFIG_PATH.exists():
        err(f"{JIRA_CONFIG_PATH} not found — set JIRA_USER_EMAIL env")
        sys.exit(2)
    pat = re.compile(r"^\s*login:\s*(.+?)\s*$")
    for line in JIRA_CONFIG_PATH.read_text(encoding="utf-8").splitlines():
        m = pat.match(line)
        if m:
            return m.group(1).strip().strip("'\"")
    err(f"`login:` not found in {JIRA_CONFIG_PATH} — set JIRA_USER_EMAIL")
    sys.exit(2)


def get_token() -> str:
    token = os.environ.get("JIRA_API_TOKEN")
    if not token:
        err("JIRA_API_TOKEN not set — `source ~/.env.local` before running")
        sys.exit(2)
    return token.strip()


def auth_header(email: str, token: str) -> str:
    raw = f"{email}:{token}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")


def api_call(host: str, method: str, path: str, auth: str, payload: dict | None = None):
    url = f"https://{host}/wiki/api/v2{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Authorization": auth, "Accept": "application/json",
                 "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def resolve_space_id(host: str, key: str, auth: str) -> str:
    status, data = api_call(host, "GET", f"/spaces?keys={key}", auth)
    if status != 200 or not isinstance(data, dict):
        err(f"space lookup failed (HTTP {status}): {str(data)[:300]}")
        sys.exit(1)
    results = data.get("results", [])
    if not results:
        err(f"space key {key!r} not found")
        sys.exit(1)
    return results[0]["id"]


def md_to_storage(md_text: str) -> str:
    """Strip YAML front matter + garden anchors, convert gfm -> html via pandoc."""
    # drop leading YAML front matter
    if md_text.startswith("---"):
        parts = md_text.split("\n---", 2)
        if len(parts) >= 2:
            md_text = parts[1].lstrip("-\n")
            # re-join any remaining body after the closing fence
            if len(parts) == 3:
                md_text = parts[2]
    # drop `{#anchor}` heading attributes (garden export artifact)
    md_text = re.sub(r"\s*\{#[^}]+\}", "", md_text)
    try:
        out = subprocess.run(
            ["pandoc", "--from=gfm", "--to=html", "--wrap=none"],
            input=md_text, capture_output=True, text=True, check=True,
        )
    except FileNotFoundError:
        err("pandoc not on PATH — install pandoc or pass storage HTML without --md")
        sys.exit(2)
    except subprocess.CalledProcessError as e:
        err(f"pandoc failed: {e.stderr[:300]}")
        sys.exit(1)
    return out.stdout


def full_url(host: str, resp: dict) -> str:
    links = resp.get("_links", {})
    base = links.get("base", f"https://{host}/wiki")
    return base + links.get("webui", "")


def parse_args(argv):
    p = argparse.ArgumentParser(description="Create / update / delete a Confluence page (REST v2).")
    p.add_argument("--title", help="page title (required for create/update)")
    src = p.add_mutually_exclusive_group(required=False)
    src.add_argument("--body-file", help="path to body (storage HTML, or markdown with --md)")
    src.add_argument("--body-html", help="inline storage HTML body")
    p.add_argument("--md", action="store_true", help="treat body as markdown -> pandoc gfm->html")
    p.add_argument("--space-key", help="space key (e.g. CK7cJZ8jrCka); resolved to spaceId")
    p.add_argument("--space-id", help="space id (skip key lookup)")
    p.add_argument("--parent-id", help="parent page/folder id (create under it)")
    p.add_argument("--page-id", help="existing page id -> UPDATE mode (version auto +1)")
    p.add_argument("--delete", action="store_true", help="trash --page-id (v1 API; v2 delete is flaky)")
    p.add_argument("--purge", action="store_true", help="with --delete: permanently remove (no trash)")
    p.add_argument("--host", default=None, help="Atlassian host; default from JIRA_HOST env or jira config server:")
    p.add_argument("--message", default="", help="version message (update mode)")
    p.add_argument("--json", action="store_true", help="emit result as JSON")
    p.add_argument("--dry-run", action="store_true", help="print payload, do not call API")
    return p.parse_args(argv)


def delete_page(host: str, page_id: str, auth: str, purge: bool) -> tuple[int, str]:
    """v1 content API — v2 page delete returns 500 here, v1 trash works (204)."""
    base = f"https://{host}/wiki/rest/api/content/{page_id}"
    req = urllib.request.Request(base, method="DELETE", headers={"Authorization": auth})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            trash_status = r.status
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    if not purge:
        return trash_status, "trashed"
    req2 = urllib.request.Request(base + "?status=trashed", method="DELETE",
                                  headers={"Authorization": auth})
    try:
        with urllib.request.urlopen(req2, timeout=60) as r:
            return r.status, "purged"
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main(argv) -> int:
    a = parse_args(argv)
    a.host = a.host or get_host()

    if a.delete:
        if not a.page_id:
            err("--delete needs --page-id")
            return 2
        auth = auth_header(get_email(), get_token())
        status, msg = delete_page(a.host, a.page_id, auth, a.purge)
        if status not in (200, 204):
            err(f"delete failed (HTTP {status}): {str(msg)[:300]}")
            return 1
        print(f"{msg}: {a.page_id} (HTTP {status})")
        return 0

    if not a.title:
        err("--title is required for create/update")
        return 2
    if not (a.body_file or a.body_html):
        err("--body-file or --body-html is required for create/update")
        return 2
    if not a.page_id and not (a.space_key or a.space_id):
        err("create mode needs --space-key or --space-id")
        return 2

    body = Path(a.body_file).read_text(encoding="utf-8") if a.body_file else a.body_html
    if a.md:
        body = md_to_storage(body)

    auth = auth_header(get_email(), get_token())

    if a.page_id:  # ---- UPDATE ----
        status, cur = api_call(a.host, "GET", f"/pages/{a.page_id}", auth)
        if status != 200 or not isinstance(cur, dict):
            err(f"page {a.page_id} fetch failed (HTTP {status}): {str(cur)[:300]}")
            return 1
        ver = cur.get("version", {}).get("number", 1) + 1
        payload = {"id": a.page_id, "status": "current", "title": a.title,
                   "body": {"representation": "storage", "value": body},
                   "version": {"number": ver, "message": a.message or "update"}}
        if a.dry_run:
            print(json.dumps({"mode": "update", **payload}, ensure_ascii=False)[:800]); return 0
        status, resp = api_call(a.host, "PUT", f"/pages/{a.page_id}", auth, payload)
        mode = "updated"
    else:  # ---- CREATE ----
        space_id = a.space_id or resolve_space_id(a.host, a.space_key, auth)
        payload = {"spaceId": space_id, "status": "current", "title": a.title,
                   "body": {"representation": "storage", "value": body}}
        if a.parent_id:
            payload["parentId"] = a.parent_id
        if a.dry_run:
            print(json.dumps({"mode": "create", **payload}, ensure_ascii=False)[:800]); return 0
        status, resp = api_call(a.host, "POST", "/pages", auth, payload)
        mode = "created"

    if status not in (200, 201) or not isinstance(resp, dict):
        err(f"{mode} failed (HTTP {status}): {str(resp)[:400]}")
        return 1

    pid = resp["id"]
    # verify parent relationship
    _, ver_resp = api_call(a.host, "GET", f"/pages/{pid}", auth)
    parent_type = ver_resp.get("parentType") if isinstance(ver_resp, dict) else None
    parent_id = ver_resp.get("parentId") if isinstance(ver_resp, dict) else None
    version = resp.get("version", {}).get("number")
    url = full_url(a.host, resp)

    result = {"mode": mode, "id": pid, "title": a.title, "url": url,
              "version": version, "parentType": parent_type, "parentId": parent_id}
    if a.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"{mode}: {pid} (v{version})")
        print(f"  title:  {a.title}")
        print(f"  url:    {url}")
        print(f"  parent: type={parent_type} id={parent_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
