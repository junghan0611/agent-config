#!/usr/bin/env python3
"""Server selection under pipefail; source actual functions, never execute setup."""

import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path


RUN_SH = Path(__file__).resolve().parents[1] / "run.sh"


def function_source(source, name):
    start = source.index(name + "() {")
    return source[start:source.index("\n}\n", start) + 3]


class ServerDeviceTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory(prefix="server-device-test-")
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        self.device = self.home / ".current-device"
        self.device.write_text("oracle\n")
        self.profile = self.home / "forge-profile"
        self.allowlist = self.home / "server-devices.txt"
        source = RUN_SH.read_text()
        self.functions = "\n".join(function_source(source, name) for name in (
            "current_forge_profile", "server_devices_list", "is_server_device",
        ))

    def classify(self, overrides=""):
        script = '''set -euo pipefail
SERVER_PROFILES="oracle work"
SERVER_DEVICES="oracle"
FORGE_PROFILE_FILE="$HOME/forge-profile"
SERVER_DEVICES_FILE="$HOME/server-devices.txt"
fail() { printf '%s\\n' "$*" >&2; }
''' + self.functions + "\n" + overrides + '''
if is_server_device; then
    printf 'server\\n'
else
    rc=$?
    printf 'non-server rc=%s\\n' "$rc"
    exit "$rc"
fi
'''
        return subprocess.run(
            ["bash", "-c", script], env={**os.environ, "HOME": str(self.home)},
            text=True, capture_output=True, timeout=5,
        )

    def assert_server(self, result):
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "server\n")

    def test_builtin_device_without_custom_file(self):
        self.assert_server(self.classify())

    def test_empty_comment_and_blank_allowlists_are_valid(self):
        for content in ("", "# comment\n", "  # comment\n\t# another\n", "\n \t\n"):
            with self.subTest(content=content):
                self.allowlist.write_text(content)
                self.assert_server(self.classify())

    def test_default_device_survives_custom_entries(self):
        self.allowlist.write_text("another-server\n")
        self.assert_server(self.classify())

    def test_custom_device_exact_match_and_final_line_without_newline(self):
        self.device.write_text("custom-server\n")
        self.allowlist.write_text("# comment\n\ncustom-server")
        self.assert_server(self.classify())
        self.device.write_text("custom\n")
        self.assertEqual(self.classify().returncode, 1)

    def test_device_names_are_literal_not_patterns_or_options(self):
        for name in ("-server", "server[1]", "server.*"):
            with self.subTest(name=name):
                self.device.write_text(name + "\n")
                self.allowlist.write_text(name + "\n")
                self.assert_server(self.classify())

    def test_non_server_and_missing_device_are_normal_non_matches(self):
        self.device.write_text("workstation\n")
        self.assertEqual(self.classify().returncode, 1)
        self.device.unlink()
        self.assertEqual(self.classify().returncode, 1)

    def test_forge_profile_precedes_device_allowlist(self):
        self.allowlist.write_text("oracle\n")
        for value in ("oracle\n", " work \n"):
            self.profile.write_text(value)
            self.assert_server(self.classify())
        self.profile.write_text("client\n")
        self.assertEqual(self.classify().returncode, 1)

    def test_blank_forge_profile_falls_back_to_device(self):
        self.profile.write_text(" \t\n")
        self.assert_server(self.classify())

    def test_delayed_producer_cannot_turn_a_match_into_sigpipe_failure(self):
        self.assert_server(self.classify('''server_devices_list() {
    printf 'oracle\\n'
    sleep 0.05
    printf 'another-server\\n'
}'''))

    def test_large_producer_is_drained_before_matching(self):
        self.assert_server(self.classify('''server_devices_list() {
    printf 'oracle\\n'
    seq 1 100000
}'''))

    def test_producer_failure_after_a_match_is_not_a_developer_verdict(self):
        result = self.classify('''server_devices_list() {
    printf 'oracle\\n'
    return 7
}''')
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("server", result.stderr)

    def test_profile_read_failure_cannot_fall_back_or_match(self):
        result = self.classify('''current_forge_profile() {
    printf 'oracle\\n'
    return 7
}''')
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)

    def test_present_device_read_failure_is_not_a_missing_device(self):
        result = self.classify('cat() { return 7; }')
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)

    @unittest.skipIf(os.geteuid() == 0, "root can read a chmod-000 fixture")
    def test_unreadable_custom_allowlist_reports_error(self):
        self.allowlist.write_text("custom-server\n")
        self.allowlist.chmod(0)
        try:
            result = self.classify()
        finally:
            self.allowlist.chmod(0o600)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("server", result.stderr)


class SelectionCallerTest(unittest.TestCase):
    def test_all_three_real_selection_blocks_propagate_errors(self):
        source = RUN_SH.read_text()
        # Only the actual if/else blocks are run. No setup body, install, or merge
        # executes; merge_settings/log/ok are harmless stubs below.
        blocks = []
        for match in re.finditer(r"(?m)^([ ]*)if is_server_device; then$", source):
            end = source.index("\n" + match[1] + "fi", match.end())
            blocks.append(source[match.start():end + len(match[1]) + 3])
        self.assertEqual(len(blocks), 3)
        with tempfile.TemporaryDirectory(prefix="server-callers-test-") as home:
            Path(home, ".current-device").write_text("oracle\n")
            for i, block in enumerate(blocks):
                for status in (0, 1, 2):
                    with self.subTest(block=i, status=status):
                        script = f'''set -euo pipefail
SCRIPT_DIR=/synthetic
DEVICE=oracle
is_server_device() {{ return {status}; }}
ok() {{ :; }}
log() {{ :; }}
merge_settings() {{ printf 'MERGE_CALLED\\n'; }}
selection() {{
{block}
    printf 'SELECTION_CONTINUED\\n'
}}
selection
'''
                        result = subprocess.run(
                            ["bash", "-c", script], env={**os.environ, "HOME": home},
                            text=True, capture_output=True, timeout=5,
                        )
                        self.assertEqual(result.returncode, 2 if status == 2 else 0,
                                         result.stdout + result.stderr)
                        if status == 2:
                            self.assertNotIn("MERGE_CALLED", result.stdout)
                            self.assertNotIn("SELECTION_CONTINUED", result.stdout)
                        else:
                            self.assertIn("SELECTION_CONTINUED", result.stdout)


if __name__ == "__main__":
    unittest.main()
