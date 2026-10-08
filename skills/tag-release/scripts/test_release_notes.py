"""Offline regression: python3 skills/tag-release/scripts/test_release_notes.py."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from release_notes import release_notes


class ReleaseNotesTest(unittest.TestCase):
	def test_paragraphs_and_lists(self):
		source = "## Unreleased\n\n## v2026.10.8 — 수선\n\n문단의\n연속 줄.\n\n- 첫 항목\n  연속 줄.\n- 둘째 항목\n\n1. 순서\n   연속 줄.\n\n## v2026.10.7\nold\n"
		title, notes = release_notes(source, "v2026.10.8")
		self.assertEqual(title, "v2026.10.8 — 수선")
		self.assertEqual(notes, "문단의 연속 줄.\n\n- 첫 항목 연속 줄.\n- 둘째 항목\n\n1. 순서 연속 줄.\n")

	def test_structure_and_explicit_breaks(self):
		body = "### Heading\n\n> quote\n> next\n\n| a | b |\n| - | - |\n\nline  \nnext\\\nlast\n"
		self.assertEqual(release_notes("## v1\n" + body, "v1")[1], body)

	def test_fences_keep_bytes_and_section_headings(self):
		for opener, closer in [("```python", "```"), ("~~~~", "~~~~"), ("````md", "````")]:
			body = f"{opener}\n## v2\n  indented  \n```\n\n{closer}\n"
			# A three-backtick fence needs no embedded three-backtick closer.
			if opener == "```python":
				body = body.replace("```\n\n", "`literal`\n\n")
			self.assertEqual(release_notes("## v1\n\n" + body + "\n## v2\nold\n", "v1")[1], body)

	def test_tag_is_exact_not_prefix_or_regex(self):
		source = "## v1.2.30\nwrong\n## v1x2x3\nwrong\n## v1.2.3\nright\n"
		self.assertEqual(release_notes(source, "v1.2.3"), ("v1.2.3", "right\n"))

	def test_heading_inside_earlier_fence_is_not_a_tag(self):
		source = "```\n## v1\nfake\n```\n## v1\nreal\n"
		self.assertEqual(release_notes(source, "v1")[1], "real\n")

	def test_missing_or_empty_aborts(self):
		for source in ["## v2\nother\n", "## v1\n\n## v2\nother\n"]:
			with self.assertRaisesRegex(ValueError, "ABORT"):
				release_notes(source, "v1")

	def test_cli_and_failed_extraction_does_not_write(self):
		with tempfile.TemporaryDirectory() as directory:
			root = Path(directory)
			source, output = root / "CHANGELOG.md", root / "notes.md"
			source.write_text("## v1 — title\n\nwrapped\ntext\n", encoding="utf-8")
			command = [sys.executable, str(Path(__file__).with_name("release_notes.py")), str(source)]
			result = subprocess.run(command + ["v1", str(output)], capture_output=True, text=True)
			self.assertEqual(result.returncode, 0, result.stderr)
			self.assertEqual(result.stdout, "v1 — title\n")
			self.assertEqual(output.read_text(), "wrapped text\n")
			output.unlink()
			result = subprocess.run(command + ["absent", str(output)], capture_output=True, text=True)
			self.assertNotEqual(result.returncode, 0)
			self.assertFalse(output.exists())


if __name__ == "__main__":
	unittest.main()
