#!/usr/bin/env python3
"""Credential loading and HTTP for the Claude and Codex quota rails.

Never prints a raw token: credentials are read from local files straight
into request headers and discarded. No retired-rail auth reads or refreshes.
"""

import json
import os
import urllib.request

HOME = os.path.expanduser("~")
PI_AUTH = os.path.join(HOME, ".pi", "agent", "auth.json")
CLAUDE_CREDS = os.path.join(HOME, ".claude", ".credentials.json")

TIMEOUT = 15


def _get(url, headers, data=None, method=None):
    req = urllib.request.Request(url, headers=headers, data=data, method=method)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp, resp.read()


def _load_json(path):
    with open(path) as f:
        return json.load(f)
