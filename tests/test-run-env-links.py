#!/usr/bin/env python3
"""Exercise run.sh env's Pi link counts without running setup or memory status."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path


RUN_SH = Path(__file__).resolve().parents[1] / "run.sh"


class PiEnvLinksTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory(prefix="run-env-links-test-")
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name) / "home with spaces"
        self.home.mkdir()
        # Run the actual two statements, not a duplicate implementation. The full
        # env command also invokes andenken status, outside this fixture's scope.
        env_case = RUN_SH.read_text().split("\n  env)\n", 1)[1]
        statements = [
            line for line in env_case.splitlines()
            if line.lstrip().startswith(('echo "  Pi ext:', 'echo "  Pi skills:'))
        ]
        self.assertEqual(len(statements), 2)
        self.script = "set -euo pipefail\n" + "\n".join(statements) + '\necho continued\n'

    def counts(self):
        result = subprocess.run(
            ["bash", "-c", self.script],
            env={**os.environ, "HOME": str(self.home)},
            text=True, capture_output=True, timeout=5,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("continued", result.stdout)
        self.assertNotIn("not linked", result.stdout)
        return result.stdout

    def test_missing_directories_report_zero_without_aborting(self):
        output = self.counts()
        self.assertRegex(output, r"Pi ext:\s+0 extensions")
        self.assertRegex(output, r"Pi skills:\s+0 skills")

    def test_per_item_symlinks_are_counted(self):
        extensions = self.home / ".pi/agent/extensions"
        extensions.mkdir(parents=True)
        source = self.home / "extension source.ts"
        source.write_text("// synthetic fixture\n")
        (extensions / "example.ts").symlink_to(source)
        farm = self.home / ".pi/agent/skills/pi-skills"
        farm.mkdir(parents=True)
        skill = self.home / "skill source"
        skill.mkdir()
        (skill / "SKILL.md").write_text("# synthetic fixture\n")
        (farm / "example").symlink_to(skill, target_is_directory=True)
        self.assertFalse(farm.is_symlink())
        output = self.counts()
        self.assertRegex(output, r"Pi ext:\s+1 extensions")
        self.assertRegex(output, r"Pi skills:\s+1 skills")

    def test_disabled_extensions_and_directories_without_skill_md_are_not_counted(self):
        extensions = self.home / ".pi/agent/extensions"
        extensions.mkdir(parents=True)
        (extensions / "disabled.ts.disabled").write_text("// not loaded\n")
        (self.home / ".pi/agent/skills/pi-skills/empty").mkdir(parents=True)
        output = self.counts()
        self.assertRegex(output, r"Pi ext:\s+0 extensions")
        self.assertRegex(output, r"Pi skills:\s+0 skills")


if __name__ == "__main__":
    unittest.main()
