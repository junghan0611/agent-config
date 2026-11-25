#!/usr/bin/env python3
"""Credential loading and HTTP for the Claude, Codex and Antigravity quota rails.

Never prints a raw token: credentials are read from local files straight
into request headers and discarded. No retired-rail auth reads or refreshes.
"""

import json
import os
import re
import shlex
import urllib.request

HOME = os.path.expanduser("~")
CODEX_AUTH = os.path.join(os.environ.get("CODEX_HOME") or os.path.join(HOME, ".codex"), "auth.json")
CLAUDE_CREDS = os.path.join(HOME, ".claude", ".credentials.json")
# Written and refreshed by agy itself; we only read it (never refresh).
AGY_TOKEN = os.path.join(HOME, ".gemini", "antigravity-cli", "antigravity-oauth-token")

TIMEOUT = 15


def _get(url, headers, data=None, method=None):
    req = urllib.request.Request(url, headers=headers, data=data, method=method)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp, resp.read()


def _api_key(name):
    if name in os.environ:
        return os.environ[name]
    key = ""
    with open(os.path.join(HOME, ".env.local")) as f:
        for line in f:
            match = re.match(rf"^\s*(?:export\s+)?{re.escape(name)}\s*=\s*(.*)$", line)
            if match:
                try:
                    parts = shlex.split(match[1], comments=True)
                except ValueError:
                    raise ValueError(f"Invalid {name} assignment") from None
                if len(parts) > 1:
                    raise ValueError(f"Invalid {name} assignment")
                key = parts[0] if parts else ""
    return key


def _load_json(path):
    with open(path) as f:
        return json.load(f)
