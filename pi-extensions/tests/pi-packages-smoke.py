#!/usr/bin/env python3
"""Load the supported Pi packages without an LLM call and assert their seams."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HOME = Path.home()
SETTINGS = HOME / ".pi/agent/settings.json"
GLOBAL_EXTENSIONS = HOME / ".pi/agent/extensions"
COMPACTION_SOURCE = "npm:@ogulcancelik/pi-codex-compaction"
RECALL_SOURCE = "npm:@ogulcancelik/pi-session-recall"
ENTWURF_PACKAGE = "@junghanacs/entwurf"
BEFORE_COMPACT = re.compile(r"pi\.on\(\s*[\"']session_before_compact[\"']")

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


def package_source(entry: object) -> str:
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict) and isinstance(entry.get("source"), str):
        return entry["source"]
    fail(f"unsupported Pi package entry: {entry!r}")


def package_root(entry: object) -> Path:
    source = package_source(entry)
    if source.startswith("npm:"):
        return HOME / ".pi/agent/npm/node_modules" / source.removeprefix("npm:")
    if source.startswith("git:"):
        return HOME / ".pi/agent/git" / source.removeprefix("git:")
    path = Path(source).expanduser()
    return path if path.is_absolute() else SETTINGS.parent / path


def manifest(entry: object) -> dict[str, object]:
    path = package_root(entry) / "package.json"
    if not path.is_file():
        fail(f"Pi package has no manifest: {path}")
    return json.loads(path.read_text())


def loaded_extension_files(entry: object) -> list[Path]:
    if isinstance(entry, dict) and entry.get("extensions") == []:
        return []
    root = package_root(entry)
    pi_config = manifest(entry).get("pi", {})
    if not isinstance(pi_config, dict):
        fail(f"Pi manifest config is not an object: {root / 'package.json'}")
    extensions = pi_config.get("extensions", [])
    if not isinstance(extensions, list) or not all(isinstance(path, str) for path in extensions):
        fail(f"Pi manifest extensions are invalid: {root / 'package.json'}")
    files = [root / extension for extension in extensions]
    missing = [str(path) for path in files if not path.is_file()]
    if missing:
        fail(f"Pi extension entry missing: {missing}")
    return files


def compact_handlers(files: list[Path]) -> list[Path]:
    return [path for path in files if BEFORE_COMPACT.search(path.read_text())]


def assert_builtin_compaction(packages: list[object]) -> None:
    project_extensions = Path.cwd() / ".pi/extensions"
    local_files = [
        path for root in (project_extensions, GLOBAL_EXTENSIONS) if root.is_dir()
        for path in root.rglob("*") if path.is_file()
    ]
    local_handlers = compact_handlers(local_files)
    if local_handlers:
        fail(
            "session_before_compact must stay in tier 3 packages; found tier 1/2 handler(s): "
            + ", ".join(map(str, local_handlers))
        )

    compaction_index = next(
        (index for index, entry in enumerate(packages) if package_source(entry) == COMPACTION_SOURCE),
        None,
    )
    if compaction_index is not None:
        fail("retired pi-codex-compaction package must not override Pi built-in compaction")
    entwurf_index = next(
        (index for index, entry in enumerate(packages) if manifest(entry).get("name") == ENTWURF_PACKAGE),
        None,
    )
    if entwurf_index is None:
        fail("missing Entwurf Pi package")
    handlers_by_package = [compact_handlers(loaded_extension_files(entry)) for entry in packages]
    handler_indices = [index for index, handlers in enumerate(handlers_by_package) if handlers]
    if handler_indices != [entwurf_index]:
        rendered = ", ".join(
            f"{index}: {path}" for index, handlers in enumerate(handlers_by_package) for path in handlers
        )
        fail(
            "session_before_compact must be unique to Entwurf's lifecycle observer; found "
            + (rendered or "none")
        )
    if len(handlers_by_package[entwurf_index]) != 1:
        fail("Entwurf must register exactly one compaction lifecycle observer")


def main() -> None:
    settings = json.loads(SETTINGS.read_text())
    packages = settings.get("packages", [])
    if not isinstance(packages, list):
        fail("Pi settings packages are not a list")
    supported = json.loads((Path.cwd() / "pi/packages.json").read_text())["packages"]
    if has_package(supported, COMPACTION_SOURCE):
        fail("supported manifest must not reinstall retired Codex compaction")
    # Before the compaction check: that one reads every registered package's manifest,
    # so a recall entry whose install is gone would surface as "no manifest" instead.
    if has_package(supported, RECALL_SOURCE):
        fail("supported manifest must not reinstall retired session-recall")
    if has_package(packages, RECALL_SOURCE):
        fail(f"retired session-recall package is still registered in {SETTINGS}; "
             f"setup does not remove it — run: pi remove {RECALL_SOURCE}")
    compat = GLOBAL_EXTENSIONS / "session-recall-compat.ts"
    if compat.exists() or compat.is_symlink():
        fail(f"retired session-recall compatibility extension is still present: {compat}; "
             "run: ./run.sh setup:links")
    assert_builtin_compaction(packages)

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
    expected = {"session_search"}
    if set(tools) != expected:
        fail(f"unexpected recall tools: {tools}")
    if "andenken" not in tools["session_search"]:
        fail(f"semantic session_search lost andenken ownership: {tools}")
    if not any(
        record.get("type") == "response"
        and record.get("command") == "get_state"
        and record.get("success")
        for record in records
    ):
        fail("RPC state response missing")

    # Entwurf keeps the real agent directory for package/auth state while isolating HOME.
    # Retiring a package must not break this existing launch topology.
    with tempfile.TemporaryDirectory(prefix="pi-package-sandbox-") as sandbox_dir:
        sandbox_home = Path(sandbox_dir) / "home"
        sandbox_home.mkdir()
        sandbox_probe = Path(sandbox_dir) / "probe.ts"
        sandbox_probe.write_text(PROBE)
        sandbox_env = os.environ | {
            "HOME": str(sandbox_home),
            "PI_CODING_AGENT_DIR": str(HOME / ".pi" / "agent"),
        }
        sandbox = subprocess.run(
            ["pi", "--mode", "rpc", "--no-session", "-e", str(sandbox_probe)],
            input='{"id":"state","type":"get_state"}\n',
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
            env=sandbox_env,
        )
    if sandbox.returncode != 0:
        fail(f"sandbox HOME / real agent-dir load exited {sandbox.returncode}: {sandbox.stderr}")
    if "Failed to load extension" in sandbox.stderr or "Cannot find module" in sandbox.stderr:
        fail(sandbox.stderr)

    print("PASS: Pi packages load; compaction boundary and Andenken ownership hold; retired recall absent")


if __name__ == "__main__":
    main()
