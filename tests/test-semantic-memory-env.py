#!/usr/bin/env python3
"""semantic-memory wrapper: ANDENKEN_ENV_MODE against a poisoned synthetic HOME.

API 0. The real HOME and its dotenv are never visible: every run gets a temp HOME
and a built-from-scratch environment (so no inherited ANDENKEN_* and no BASH_ENV).
The andenken runner is a stub that reports what reached it.

Run: python3 tests/test-semantic-memory-env.py
"""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

WRAPPER = Path(__file__).resolve().parent.parent / "skills" / "semantic-memory" / "semantic-memory"

# Executing the dotenv leaves a marker; its assignments override and inject.
POISON = """touch "$HOME/dotenv-executed"
export ANDENKEN_SESSION_PROFILE=poison
export ANDENKEN_INJECTED=poison
"""

STUB = """console.log(JSON.stringify({
	profile: process.env.ANDENKEN_SESSION_PROFILE ?? null,
	injected: process.env.ANDENKEN_INJECTED ?? null,
	args: process.argv.slice(2),
}));
process.exit(Number(process.env.STUB_EXIT ?? 0));
"""


class WrapperEnvModeTest(unittest.TestCase):
	def setUp(self):
		tmp = tempfile.TemporaryDirectory()
		self.addCleanup(tmp.cleanup)
		self.home = Path(tmp.name)
		runner = self.home / "repos/gh/andenken/node_modules/tsx/dist/cli.mjs"
		runner.parent.mkdir(parents=True)
		runner.write_text(STUB)
		(self.home / ".env.local").write_text(POISON)

	def run_wrapper(self, *args, **env):
		return subprocess.run(
			[str(WRAPPER), *args],
			env={"PATH": os.environ["PATH"], "HOME": str(self.home), **env},
			capture_output=True,
			text=True,
			timeout=30,
		)

	def executed(self):
		return (self.home / "dotenv-executed").exists()

	def test_unset_and_empty_keep_sourcing_the_dotenv(self):
		for extra in ({}, {"ANDENKEN_ENV_MODE": ""}):
			with self.subTest(extra=extra):
				(self.home / "dotenv-executed").unlink(missing_ok=True)
				p = self.run_wrapper("status", ANDENKEN_SESSION_PROFILE="explicit", **extra)
				self.assertEqual(p.returncode, 0, p.stderr)
				self.assertTrue(self.executed())
				self.assertEqual(json.loads(p.stdout)["injected"], "poison")

	def test_process_only_never_reads_the_dotenv(self):
		p = self.run_wrapper(
			"search-md", "두 단어 query", "--limit", "5",
			ANDENKEN_ENV_MODE="process-only", ANDENKEN_SESSION_PROFILE="explicit",
		)
		self.assertEqual(p.returncode, 0, p.stderr)
		self.assertFalse(self.executed())
		out = json.loads(p.stdout)
		self.assertEqual(out["profile"], "explicit")
		self.assertIsNone(out["injected"])
		self.assertEqual(out["args"][1:], ["search-md", "두 단어 query", "--limit", "5"])

	def test_process_only_does_not_fill_an_unset_value(self):
		p = self.run_wrapper("status", ANDENKEN_ENV_MODE="process-only")
		self.assertEqual(p.returncode, 0, p.stderr)
		self.assertIsNone(json.loads(p.stdout)["profile"])
		self.assertFalse(self.executed())

	def test_unknown_mode_refuses_before_dotenv_and_runner(self):
		for mode in ("process_only", "PROCESS-ONLY", "process-only ", "default"):
			with self.subTest(mode=mode):
				p = self.run_wrapper("status", ANDENKEN_ENV_MODE=mode)
				self.assertEqual(p.returncode, 2, p.stderr)
				self.assertEqual(p.stdout, "")
				self.assertIn("not a known mode", p.stderr)
				self.assertFalse(self.executed())

	def test_missing_dotenv_and_runner_exit_code(self):
		(self.home / ".env.local").unlink()
		p = self.run_wrapper("status", STUB_EXIT="4")
		self.assertEqual(p.returncode, 4, p.stderr)


if __name__ == "__main__":
	unittest.main()
