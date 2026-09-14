#!/usr/bin/env python3
"""Load the supported Pi packages without an LLM call and assert their seam."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HOME = Path.home()
SETTINGS = HOME / ".pi/agent/settings.json"

PROBE = '''import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
\tpi.on("session_start", (_event, ctx) => {
\t\tconst tools = pi.getAllTools()
\t\t\t.filter((tool) => ["session_search", "session_literal_search", "session_query"].includes(tool.name))
\t\t\t.map((tool) => ({ name: tool.name, source: tool.sourceInfo.path }));
\t\tctx.ui.notify(JSON.stringify(tools), "info");
\t});
}
'''


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def has_package(entries: list[object], source: str) -> bool:
    return any(
        entry == source or isinstance(entry, dict) and entry.get("source") == source
        for entry in entries
    )


def main() -> None:
    settings = json.loads(SETTINGS.read_text())
    packages = settings.get("packages", [])
    if not has_package(packages, "npm:@ogulcancelik/pi-codex-compaction"):
        fail("missing pi-codex-compaction package")

    recall = next(
        (entry for entry in packages if isinstance(entry, dict)
         and entry.get("source") == "npm:@ogulcancelik/pi-session-recall"),
        None,
    )
    if recall != {"source": "npm:@ogulcancelik/pi-session-recall", "extensions": []}:
        fail(f"session-recall filter drifted: {recall!r}")

    with tempfile.TemporaryDirectory(prefix="pi-package-smoke-") as temp_dir:
        probe = Path(temp_dir) / "probe.ts"
        probe.write_text(PROBE)
        result = subprocess.run(
            ["pi", "--mode", "rpc", "--no-session", "-e", str(probe)],
            input='{"id":"state","type":"get_state"}\n',
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )

    if result.returncode != 0:
        fail(f"Pi package load exited {result.returncode}: {result.stderr}")
    if "Failed to load extension" in result.stderr or "conflicts with" in result.stderr:
        fail(result.stderr)

    records = [json.loads(line) for line in result.stdout.splitlines() if line]
    notifications = [
        record for record in records
        if record.get("type") == "extension_ui_request" and record.get("method") == "notify"
    ]
    if not notifications:
        fail("probe did not receive its session_start notification")
    tools = {entry["name"]: entry["source"] for entry in json.loads(notifications[0]["message"])}
    expected = {"session_search", "session_literal_search", "session_query"}
    if set(tools) != expected:
        fail(f"unexpected recall tools: {tools}")
    if "andenken" not in tools["session_search"]:
        fail(f"semantic session_search lost andenken ownership: {tools}")
    for name in ("session_literal_search", "session_query"):
        if not tools[name].endswith("session-recall-compat.ts"):
            fail(f"{name} is not owned by compatibility seam: {tools}")
    if not any(
        record.get("type") == "response"
        and record.get("command") == "get_state"
        and record.get("success")
        for record in records
    ):
        fail("RPC state response missing")

    print("PASS: supported Pi packages load; semantic and literal recall tools coexist")


if __name__ == "__main__":
    main()
