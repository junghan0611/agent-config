#!/usr/bin/env python3
"""
confluence_ingest.py — fetch a Confluence Cloud wiki page and write a
Markdown file with YAML frontmatter.

Generic CLI: pass a URL (tinyLink or full /wiki/spaces/.../pages/<id>),
get a Markdown file in --out / --filename. KST timestamps everywhere.
Idempotent by default — same path is overwritten on re-run.

Stdlib only: urllib + base64 + regex. Requires `pandoc` on PATH.

Auth:
  - JIRA_API_TOKEN  (env, exported)  — Atlassian Cloud unified token,
                                       works on Confluence v2 API
  - email           parsed from ~/.config/.jira/.config.yml `login:` field

Sensitive content policy: never echo body to stdout. The script prints
only the output path and the heading outline.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")

JIRA_CONFIG_PATH = Path.home() / ".config" / ".jira" / ".config.yml"
ATLASSIAN_HOST_DEFAULT = "goqual-dev.atlassian.net"


# --- helpers ---------------------------------------------------------------


def err(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)


def get_email() -> str:
    """Parse `login:` from ~/.config/.jira/.config.yml without yaml dep."""
    if not JIRA_CONFIG_PATH.exists():
        raise SystemExit(
            f"jira config not found at {JIRA_CONFIG_PATH} — "
            "set JIRA_USER_EMAIL env or create the config first"
        )
    pat = re.compile(r"^\s*login:\s*(.+?)\s*$")
    for line in JIRA_CONFIG_PATH.read_text(encoding="utf-8").splitlines():
        m = pat.match(line)
        if m:
            email = m.group(1).strip().strip('"').strip("'")
            if email:
                return email
    raise SystemExit(
        f"`login:` field not found in {JIRA_CONFIG_PATH} — "
        "fix the file or set JIRA_USER_EMAIL"
    )


def get_token() -> str:
    token = os.environ.get("JIRA_API_TOKEN")
    if not token:
        raise SystemExit(
            "JIRA_API_TOKEN not set — `source ~/.env.local` before running"
        )
    return token


def auth_header(email: str, token: str) -> str:
    raw = f"{email}:{token}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")


def open_request(url: str, headers: dict[str, str]) -> urllib.request.OpenerDirector:
    """Open with redirect-follow + auth headers, return response object."""
    req = urllib.request.Request(url, headers=headers, method="GET")
    return urllib.request.urlopen(req, timeout=30)


# --- URL handling ----------------------------------------------------------


TINYLINK_RE = re.compile(r"/wiki/x/[A-Za-z0-9_\-]+/?$")
PAGE_URL_RE = re.compile(r"/wiki/spaces/(?P<space>[^/]+)/pages/(?P<id>\d+)")


def resolve_to_page_url(url: str, auth: str) -> str:
    """Return the canonical /wiki/spaces/.../pages/<id>/... URL.

    For tinyLink (`/wiki/x/...`) we GET with auth and follow redirects.
    For an already-canonical URL we return it unchanged.
    """
    parsed = urllib.parse.urlparse(url)
    if not parsed.scheme:
        raise SystemExit(f"URL missing scheme: {url!r}")

    if PAGE_URL_RE.search(parsed.path):
        return url
    if not TINYLINK_RE.search(parsed.path):
        raise SystemExit(
            f"unrecognized Confluence URL shape: {url!r} "
            "(expected /wiki/x/<short> or /wiki/spaces/<SPACE>/pages/<id>...)"
        )

    headers = {"Authorization": auth, "Accept": "application/json"}
    try:
        with open_request(url, headers) as resp:
            final = resp.geturl()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"tinyLink resolve failed: HTTP {e.code} {e.reason}")
    except urllib.error.URLError as e:
        raise SystemExit(f"tinyLink resolve network error: {e.reason}")

    if not PAGE_URL_RE.search(urllib.parse.urlparse(final).path):
        raise SystemExit(f"tinyLink {url!r} resolved to non-page URL: {final!r}")
    return final


def extract_page_id(url: str) -> str:
    m = PAGE_URL_RE.search(urllib.parse.urlparse(url).path)
    if not m:
        raise SystemExit(f"could not extract pageId from URL: {url!r}")
    return m.group("id")


def confluence_host(url: str) -> str:
    host = urllib.parse.urlparse(url).netloc
    return host or ATLASSIAN_HOST_DEFAULT


# --- API fetch -------------------------------------------------------------


def fetch_page(host: str, page_id: str, body_format: str, auth: str) -> dict:
    api = (
        f"https://{host}/wiki/api/v2/pages/{page_id}"
        f"?body-format={urllib.parse.quote(body_format)}"
    )
    headers = {"Authorization": auth, "Accept": "application/json"}
    try:
        with open_request(api, headers) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        raise SystemExit(f"fetch_page failed: HTTP {e.code} {e.reason} — {body}")
    except urllib.error.URLError as e:
        raise SystemExit(f"fetch_page network error: {e.reason}")


# --- Storage XHTML cleanup -------------------------------------------------


_AC_ATTR = re.compile(r'\sac:[a-zA-Z\-]+="[^"]*"')
_RI_ATTR = re.compile(r'\sri:[a-zA-Z\-]+="[^"]*"')
_LOCAL_ID = re.compile(r'\slocal-id="[^"]*"')
_DATA_ATTR = re.compile(r'\sdata-[a-zA-Z\-]+="[^"]*"')


def cleanup_storage(html: str) -> str:
    out = html
    for pat in (_AC_ATTR, _RI_ATTR, _LOCAL_ID, _DATA_ATTR):
        out = pat.sub("", out)
    return out


# --- pandoc ----------------------------------------------------------------


def storage_to_markdown(storage_html: str, title: str) -> str:
    if shutil.which("pandoc") is None:
        raise SystemExit("pandoc not on PATH — install pandoc to continue")
    wrapped = (
        "<html><head><meta charset='utf-8'>"
        f"<title>{html_escape(title)}</title></head><body>"
        f"<h1>{html_escape(title)}</h1>{storage_html}</body></html>"
    )
    proc = subprocess.run(
        ["pandoc", "-f", "html", "-t", "gfm", "--wrap=none"],
        input=wrapped.encode("utf-8"),
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(
            "pandoc failed: " + proc.stderr.decode("utf-8", errors="replace")
        )
    md = proc.stdout.decode("utf-8")
    return unicodedata.normalize("NFC", md)


def html_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


# --- KST + frontmatter -----------------------------------------------------


def kst_now() -> str:
    return datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")


def kst_from_iso(iso: str | None) -> str:
    if not iso:
        return ""
    s = iso.replace("Z", "+00:00") if iso.endswith("Z") else iso
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return iso  # surface the raw value rather than guess
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(KST).strftime("%Y-%m-%d %H:%M KST")


def yaml_list(items: list[str]) -> str:
    # one-line flow style for short tag lists
    return "[" + ", ".join(items) + "]"


def build_frontmatter(
    title: str,
    source_url: str,
    page_id: str,
    version_number: int | str,
    version_created_at_iso: str,
    tags: list[str],
) -> str:
    return (
        "---\n"
        f"title: {yaml_scalar(title)}\n"
        f"source: {source_url}\n"
        f"source_id: {page_id}\n"
        f"source_version: {version_number}\n"
        f"source_modified: {kst_from_iso(version_created_at_iso)}\n"
        f"fetched_at: {kst_now()}\n"
        f"tags: {yaml_list(tags)}\n"
        "---\n"
    )


def yaml_scalar(s: str) -> str:
    """Quote scalar if it contains YAML-significant chars; otherwise bare."""
    if not s:
        return '""'
    risky = any(ch in s for ch in ":#&*!|>'\"%@`,[]{}") or s.lstrip() != s
    if risky:
        # double-quote with minimal escaping
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


# --- main ------------------------------------------------------------------


def normalize_tags(raw_tags: list[str]) -> list[str]:
    """Lowercase, dedupe, keep order. Tags are validated only loosely —
    the script's job is to forward; the SKILL.md owns the policy."""
    seen: dict[str, None] = {}
    for t in raw_tags:
        k = t.strip().lower()
        if k and k not in seen:
            seen[k] = None
    return list(seen.keys())


def heading_outline(md: str, max_lines: int = 30) -> list[str]:
    """Extract markdown ATX headings — print-safe (no body content)."""
    out: list[str] = []
    for line in md.splitlines():
        if line.startswith("#"):
            out.append(line.rstrip())
            if len(out) >= max_lines:
                out.append(f"... (truncated, total > {max_lines})")
                break
    return out


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Fetch a Confluence Cloud page and write a Markdown file."
    )
    p.add_argument("url", help="Confluence URL: tinyLink or /wiki/spaces/.../pages/<id>")
    p.add_argument(
        "--out",
        default=os.getcwd(),
        help="Output directory (default: cwd). Combined with --filename.",
    )
    p.add_argument(
        "--filename",
        default=None,
        help="Output filename (default: confluence-<pageId>.md).",
    )
    p.add_argument(
        "--tags",
        default="",
        help="Extra tags, comma-separated. Defaults `confluence` and host-derived "
        "tag are always prepended.",
    )
    p.add_argument(
        "--format",
        default="storage",
        choices=["storage", "view", "export_view"],
        help="Confluence body-format (default: storage).",
    )
    return p.parse_args(argv)


def derive_host_tag(host: str) -> str:
    # goqual-dev.atlassian.net -> goqualdev (compound, lowercase, no separators)
    base = host.split(".")[0] if "." in host else host
    return re.sub(r"[^a-z0-9]", "", base.lower())


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    email = os.environ.get("JIRA_USER_EMAIL") or get_email()
    token = get_token()
    auth = auth_header(email, token)

    canonical_url = resolve_to_page_url(args.url, auth)
    page_id = extract_page_id(canonical_url)
    host = confluence_host(canonical_url)

    page = fetch_page(host, page_id, args.format, auth)
    title = page.get("title") or f"confluence-{page_id}"
    body = (page.get("body") or {}).get(args.format) or {}
    storage_html = body.get("value")
    if not storage_html:
        raise SystemExit(
            f"page {page_id} returned no body[{args.format}].value — "
            "try a different --format or check page permissions"
        )
    storage_clean = cleanup_storage(storage_html)

    md_body = storage_to_markdown(storage_clean, title)

    version = page.get("version") or {}
    version_number = version.get("number", "")
    version_created_at = version.get("createdAt", "")

    base_tags = ["confluence", derive_host_tag(host)]
    extra_tags = (
        [t for t in args.tags.split(",")] if args.tags else []
    )
    tags = normalize_tags(base_tags + extra_tags)

    frontmatter = build_frontmatter(
        title=title,
        source_url=args.url,  # preserve the URL the caller actually used
        page_id=page_id,
        version_number=version_number,
        version_created_at_iso=version_created_at,
        tags=tags,
    )

    filename = args.filename or f"confluence-{page_id}.md"
    out_dir = Path(os.path.expanduser(args.out)).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / filename

    # idempotent overwrite — atomic via temp file + rename
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=out_dir, delete=False, prefix=".confluence_ingest."
    ) as tmp:
        tmp.write(frontmatter)
        tmp.write("\n")
        tmp.write(md_body)
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, out_path)

    # safe stdout: path + heading outline only
    print(str(out_path))
    print("Headings:")
    for h in heading_outline(md_body):
        print(f"  {h}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        sys.exit(130)
