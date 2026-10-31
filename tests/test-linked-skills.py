#!/usr/bin/env python3
"""Linked-skill rename contracts; synthetic homes, no setup, network or owner writes."""

import json
import os
import re
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "run.sh").read_text()


def maps_source():
	return "\n".join(re.search(rf"declare -A {name}=\(.*?\n\)", SOURCE, re.S).group(0)
		for name in ("LINKED_SKILL_REPOS", "LINKED_SKILL_NAMES"))


class LinkedSkillsTest(unittest.TestCase):
	def bash(self, script):
		return subprocess.run(["bash", "-c", "set -euo pipefail\n" + script],
			text=True, capture_output=True, timeout=5)

	def test_current_owner_maps_to_the_unchanged_skill_name(self):
		result = self.bash(maps_source() + '''
[[ ${LINKED_SKILL_REPOS[sorge-config]} == https://github.com/junghan0611/sorge-config.git ]]
[[ ${LINKED_SKILL_NAMES[sorge-config]} == forge ]]
[[ ! -v LINKED_SKILL_REPOS[forge-config] ]]
[[ ! -v LINKED_SKILL_NAMES[forge-config] ]]
[[ ${LINKED_SKILL_REPOS[sorge]} == https://github.com/junghan0611/sorge.git ]]
''')
		self.assertEqual(result.returncode, 0, result.stderr)

	def test_tracked_forge_link_is_relative_and_names_the_new_owner(self):
		link = ROOT / "skills/forge"
		self.assertTrue(link.is_symlink())
		self.assertEqual(os.readlink(link), "../../sorge-config/.claude/skills/forge")

	def test_actual_linked_setup_loop_uses_the_renamed_clone(self):
		start = SOURCE.index('  section "Linked Skill Repositories"')
		end = SOURCE.index("\n  return 0\n}", start)
		loop = SOURCE[start:end]
		with tempfile.TemporaryDirectory(prefix="linked skills ") as td:
			repos = Path(td) / "repos"
			skills = repos / "agent-config/skills"
			skills.mkdir(parents=True)
			for name in ("forge", "sorge"):
				(skills / name).symlink_to(os.readlink(ROOT / "skills" / name))
			script = maps_source() + f'''
REPOS={shlex.quote(str(repos))}
SKILLS_DIR={shlex.quote(str(skills))}
section() {{ :; }}
ok() {{ printf '%s\\n' "$*"; }}
warn() {{ printf 'unexpected warning: %s\\n' "$*" >&2; return 1; }}
ensure_repo() {{
 printf 'ensure %s %s\\n' "$1" "$2"
 local skill="${{LINKED_SKILL_NAMES[$1]:-$1}}"
 mkdir -p "$REPOS/$1/.claude/skills/$skill"
 printf '# synthetic skill\\n' > "$REPOS/$1/.claude/skills/$skill/SKILL.md"
}}
setup_linked_fixture() {{
{loop}
}}
setup_linked_fixture
'''
			result = self.bash(script)
			self.assertEqual(result.returncode, 0, result.stderr)
			self.assertIn("ensure sorge-config https://github.com/junghan0611/sorge-config.git", result.stdout)
			self.assertNotIn("ensure forge-config ", result.stdout)
			self.assertIn("sorge-config: skill linked (skills/forge", result.stdout)
			self.assertTrue((skills / "forge/SKILL.md").is_file())

	def test_existing_claude_codex_and_pi_chains_follow_the_root_link(self):
		with tempfile.TemporaryDirectory(prefix="linked skill chains ") as td:
			base = Path(td)
			root = base / "repos/agent-config/skills"
			root.mkdir(parents=True)
			(root / "forge").symlink_to(os.readlink(ROOT / "skills/forge"))
			owner = base / "repos/sorge-config/.claude/skills/forge"
			owner.mkdir(parents=True)
			(owner / "SKILL.md").write_text("# synthetic forge\n")
			home = base / "home"
			claude = home / ".claude/skills"
			claude.parent.mkdir(parents=True)
			claude.symlink_to(root)
			farms = [home / ".codex/skills/forge", home / ".pi/agent/skills/pi-skills/forge"]
			for link in farms:
				link.parent.mkdir(parents=True)
				link.symlink_to(root / "forge")
			for link in [claude / "forge", *farms]:
				self.assertEqual((link / "SKILL.md").read_text(), "# synthetic forge\n")
				self.assertEqual(link.resolve(), owner)

	def test_timeline_retains_old_refs_and_classifies_the_new_public_remote(self):
		registry = json.loads((ROOT / "skills/timeline/scripts/domains.json").read_text())["repos"]
		old = registry["github.com/junghan0611/forge-config"]
		new = registry["github.com/junghan0611/sorge-config"]
		self.assertEqual(new, old)
		self.assertEqual(new, {"domain": "agent", "layer": "product"})


if __name__ == "__main__":
	unittest.main()
