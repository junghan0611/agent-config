#!/usr/bin/env python3
"""Independent, network-isolated acceptance tests for setup profiles (#34)."""

import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BWRAP = shutil.which("bwrap")
BASH = os.path.realpath(shutil.which("bash"))
GIT = os.path.realpath(shutil.which("git"))
ENV = os.path.realpath(shutil.which("env"))
TOOLS = ("bash", "basename", "cat", "chmod", "cmp", "cp", "cut", "date", "dirname", "find", "git", "grep", "head", "ln", "mkdir", "mv", "printf", "readlink", "realpath", "rm", "sed", "sort", "tail", "tr", "wc", "awk", "uname", "touch", "id", "stat")


def snapshot(root):
    """Byte-level tree snapshot, including links without following them."""
    result = {}
    for path in sorted(root.rglob("*")):
        rel = str(path.relative_to(root))
        if path.is_symlink():
            result[rel] = ("link", os.readlink(path))
        elif path.is_file():
            result[rel] = ("file", path.read_bytes())
        elif path.is_dir():
            result[rel] = ("dir",)
    return result


@unittest.skipUnless(BWRAP, "bwrap required to enforce filesystem and network isolation")
class SetupProfiles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="setup-profiles-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.base = Path(cls.temp.name)
        cls.repo = cls.base / "repo"
        cls.repo.mkdir()
        cls.bin = cls.base / "bin"
        cls.bin.mkdir()
        for tool in TOOLS:
            target = shutil.which(tool)
            if target:
                (cls.bin / tool).symlink_to(os.path.realpath(target))
        # Obtain the tracked name set without consulting the operator's HOME.
        result = subprocess.run([GIT, "-C", str(ROOT), "ls-files", "-z", "skills"],
                                env={"HOME": str(cls.base), "PATH": str(cls.bin)},
                                check=True, capture_output=True)
        cls.names = {p.split("/")[1] for p in result.stdout.decode().split("\0")
                     if p.startswith("skills/") and p != "skills/.gitkeep"}
        index = subprocess.run([GIT, "-C", str(ROOT), "ls-files", "-s", "skills"],
                               env={"HOME": str(cls.base), "PATH": str(cls.bin)},
                               check=True, capture_output=True, text=True).stdout
        cls.symlink_names = {line.split("\t", 1)[1].split("/")[1]
                             for line in index.splitlines()
                             if line.startswith("120000 ") and line.split("\t", 1)[1].count("/") == 1}
        cls.bin_no_git = cls.base / "bin-no-git"
        cls.bin_no_git.mkdir()
        for tool in cls.bin.iterdir():
            if tool.name != "git":
                (cls.bin_no_git / tool.name).symlink_to(os.readlink(tool))
        shutil.copy2(ROOT / "run.sh", cls.repo / "run.sh")
        shutil.copy2(ROOT / "skill-tiers.tsv", cls.repo / "skill-tiers.tsv")
        (cls.repo / "pi").mkdir()
        shutil.copy2(ROOT / "pi/claude-plugin.json", cls.repo / "pi/claude-plugin.json")
        (cls.repo / "skills").mkdir()
        for name in cls.names:
            directory = cls.repo / "skills" / name
            if name in cls.symlink_names:
                directory.symlink_to(os.readlink(ROOT / "skills" / name))
            else:
                directory.mkdir()
                (directory / "SKILL.md").write_text("synthetic public fixture\n")
        git_env = {"HOME": str(cls.base), "PATH": str(cls.bin), "GIT_CONFIG_NOSYSTEM": "1"}
        subprocess.run([GIT, "-C", str(cls.repo), "init", "-q"], env=git_env, check=True)
        subprocess.run([GIT, "-C", str(cls.repo), "add", "skills"], env=git_env, check=True)
        cls.manifest = (cls.repo / "skill-tiers.tsv").read_text()
        cls.tiers = dict(line.split("\t") for line in cls.manifest.splitlines()
                         if line and not line.startswith("#"))

    def setUp(self):
        self.home = Path(tempfile.mkdtemp(prefix="home-", dir=self.base))
        self.addCleanup(shutil.rmtree, self.home, True)
        self.repo_copy = Path(tempfile.mkdtemp(prefix="repo-", dir=self.base))
        shutil.rmtree(self.repo_copy)
        shutil.copytree(self.repo, self.repo_copy, symlinks=True)
        self.addCleanup(shutil.rmtree, self.repo_copy, True)

    def run_setup(self, *args, without_git=False):
        # Only /nix/store and this test's temporary directory are visible. No
        # network namespace access, no real HOME, and no inherited environment.
        cmd = [BWRAP, "--unshare-user", "--unshare-pid", "--unshare-net",
               "--die-with-parent", "--ro-bind", "/nix/store", "/nix/store",
               "--bind", str(self.base), str(self.base), "--dev", "/dev",
               "--dir", "/usr/bin", "--symlink", ENV, "/usr/bin/env",
               "--chdir", str(self.repo_copy), "--clearenv",
               "--setenv", "HOME", str(self.home), "--setenv", "PATH", str(self.bin_no_git if without_git else self.bin),
               "--setenv", "AGENT_CONFIG_SETUP_NO_UPDATE", "1",
               BASH, str(self.repo_copy / "run.sh"), *args]
        return subprocess.run(cmd, text=True, capture_output=True, timeout=30)

    def assert_success(self, result, partial=False):
        output = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, output)
        self.assertRegex(result.stdout.rstrip().splitlines()[-1],
                         r"^DONE \(partial\):" if partial else r"^DONE:")

    def selected(self, profile="core", extra=()):
        allowed = {"core"} | ({"work"} if profile == "work" else set()) | set(extra)
        return {name for name, tier in self.tiers.items() if tier in allowed}

    def assert_links(self, selected):
        for root in (".pi/agent/skills/pi-skills", ".pi/agent/claude-plugin/skills", ".claude/skills"):
            directory = self.home / root
            self.assertTrue(directory.is_dir(), root)
            self.assertEqual({p.name for p in directory.iterdir()}, selected, root)
            for name in selected:
                link = directory / name
                self.assertTrue(link.is_symlink(), str(link))
                self.assertEqual(link.resolve(), (self.repo_copy / "skills" / name).resolve())
        link = self.home / ".pi/agent/claude-plugin/.claude-plugin/plugin.json"
        self.assertTrue(link.is_symlink())
        self.assertEqual(link.resolve(), (self.repo_copy / "pi/claude-plugin.json").resolve())

    def test_02_manifest_contract(self):
        self.assertEqual(set(self.tiers), self.names)
        seen = set()
        for line in self.manifest.splitlines():
            if not line or line.startswith("#"):
                continue
            self.assertEqual(line.count("\t"), 1, line)
            name, tier = line.split("\t")
            self.assertRegex(name, r"^[a-z0-9][a-z0-9-]*$")
            self.assertIn(tier, {"core", "core-pending", "net", "memory", "work", "full"})
            self.assertNotIn(name, seen)
            seen.add(name)

    def test_01_invalid_arguments_are_atomic(self):
        for verb in ("setup", "setup:links"):
            for args in (("--profile", "bogus"), ("--with", "bogus"),
                         ("--with", "net,bogus"), ("--profile", "full", "--with", "net")):
                with self.subTest(verb=verb, args=args):
                    before = snapshot(self.home)
                    result = self.run_setup(verb, *args)
                    self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                    self.assertEqual(snapshot(self.home), before)

    def test_02_invalid_manifest_is_atomic(self):
        path = self.repo_copy / "skill-tiers.tsv"
        valid = next(line for line in self.manifest.splitlines() if line and not line.startswith("#"))
        name = valid.split("\t")[0]
        full_name = next(n for n, tier in self.tiers.items()
                         if tier == "full" and n not in self.symlink_names)
        extra = self.repo_copy / "skills" / "synthetic-extra"
        extra.mkdir()
        (extra / "SKILL.md").write_text("untracked extra\n")
        cases = {"missing": None, "unreadable": self.manifest, "no-tab": self.manifest + "bad core\n",
                 "two-tabs": self.manifest + "bad\tcore\textra\n", "tier": self.manifest + "bad\twrong\n",
                 "duplicate": self.manifest + valid + "\n", "path": self.manifest + "../escape\tcore\n",
                 "missing-skill": self.manifest, "missing-full-directory-skill": self.manifest,
                 "extra-row": self.manifest + "synthetic-extra\tcore\n",
                 "missing-row": self.manifest.replace(valid + "\n", "")}
        for case, content in cases.items():
            with self.subTest(case=case):
                shutil.rmtree(self.home)
                self.home.mkdir()
                path.write_text(content or "")
                skill = self.repo_copy / "skills" / (full_name if case == "missing-full-directory-skill" else name) / "SKILL.md"
                if case == "missing": path.unlink()
                if case == "unreadable": path.chmod(0)
                if case in ("missing-skill", "missing-full-directory-skill"): skill.unlink()
                try:
                    before = snapshot(self.home)
                    result = self.run_setup("setup:links")
                    self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
                    self.assertEqual(snapshot(self.home), before)
                finally:
                    if path.exists(): path.chmod(0o600)
                    if not skill.exists(): skill.write_text("synthetic public fixture\n")

    def test_02_missing_row_without_git_is_atomic(self):
        valid = next(line for line in self.manifest.splitlines()
                     if line and not line.startswith("#") and line.split("\t")[0] not in self.symlink_names)
        (self.repo_copy / "skill-tiers.tsv").write_text(self.manifest.replace(valid + "\n", ""))
        before = snapshot(self.home)
        result = self.run_setup("setup:links", without_git=True)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(snapshot(self.home), before)

    def test_02_dangling_nonfull_symlink_is_invalid(self):
        name = next(n for n, tier in self.tiers.items() if tier == "core" and n not in self.symlink_names)
        path = self.repo_copy / "skills" / name
        shutil.rmtree(path)
        path.symlink_to("missing-sibling-target")
        before = snapshot(self.home)
        result = self.run_setup("setup:links")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(snapshot(self.home), before)

    def test_02_untracked_skill_without_git_is_seen_as_unlisted(self):
        extra = self.repo_copy / "skills" / "synthetic-extra"
        extra.mkdir()
        (extra / "SKILL.md").write_text("untracked fixture\n")
        before = snapshot(self.home)
        result = self.run_setup("setup:links", without_git=True)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(snapshot(self.home), before)

    def test_02_core_accepts_dangling_full_tier_tracked_links(self):
        self.assertTrue({"forge", "sorge"}.issubset(self.symlink_names))
        for name in ("forge", "sorge"):
            p = self.repo_copy / "skills" / name
            self.assertEqual(self.tiers[name], "full")
            self.assertTrue(p.is_symlink())
            self.assertFalse(p.exists())
        result = self.run_setup("setup")
        self.assert_success(result)
        self.assert_links(self.selected())

    def test_02_manifest_comments_and_blank_lines(self):
        path = self.repo_copy / "skill-tiers.tsv"
        path.write_text("# synthetic comment\n\n" + self.manifest + "\n# end\n")
        result = self.run_setup("setup:links")
        self.assert_success(result)
        self.assert_links(self.selected())

    def test_03_profile_selection_and_06_idempotency(self):
        cases = [("setup", (), "core", ()), ("setup", ("--profile", "core"), "core", ()),
                 ("setup:links", ("--profile", "work"), "work", ()),
                 ("setup", ("--with", "net,memory"), "core", ("net", "memory")),
                 ("setup:links", ("--profile", "work", "--with", "memory"), "work", ("memory",))]
        for verb, args, profile, extra in cases:
            with self.subTest(verb=verb, args=args):
                shutil.rmtree(self.home)
                self.home.mkdir()
                first = self.run_setup(verb, *args)
                self.assert_success(first)
                self.assert_links(self.selected(profile, extra))
                before = snapshot(self.home)
                second = self.run_setup(verb, *args)
                self.assert_success(second)
                self.assertEqual(snapshot(self.home), before)
                self.assertEqual(list(self.home.rglob("*.bak.*")), [])

    def test_04_preserves_protected_files(self):
        protected = [".pi/agent/settings.json", ".pi/agent/keybindings.json", ".pi/agent/extensions/keep",
                     ".pi/agent/themes/keep", ".pi/agent/prompts/keep", "AGENTS.md", "CLAUDE.md",
                     ".claude/settings.json", ".claude/settings.local.json", ".claude/hooks/keep",
                     ".claude/commands/keep", ".codex/keep", ".gemini/keep", ".copilot/keep",
                     ".kiro/keep", ".omp/keep", ".gitconfig"]
        for name in protected:
            p = self.home / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(b"sentinel\n")
        for profile in ("core", "work"):
            result = self.run_setup("setup", "--profile", profile)
            self.assert_success(result)
            for name in protected:
                self.assertEqual((self.home / name).read_bytes(), b"sentinel\n", name)
        self.assertFalse((self.home / ".current-device").exists())

    def test_05_preserve_other_links_and_files(self):
        names = sorted(self.selected())
        self.assertGreaterEqual(len(names), 2)
        root = self.home / ".claude/skills"
        root.mkdir(parents=True)
        (root / names[0]).write_text("owner file")
        (root / names[1]).symlink_to("/external/owner")
        result = self.run_setup("setup:links")
        self.assert_success(result, partial=True)
        self.assertEqual((root / names[0]).read_text(), "owner file")
        self.assertEqual(os.readlink(root / names[1]), "/external/owner")
        self.assertRegex((result.stdout + result.stderr).lower(), r"warn|skip|preserv|existing")

    def test_05_symlink_root_skipped(self):
        for same_repo in (False, True):
            with self.subTest(same_repo=same_repo):
                shutil.rmtree(self.home); self.home.mkdir()
                root = self.home / ".claude/skills"
                root.parent.mkdir(parents=True)
                target = self.repo_copy / "skills" if same_repo else self.base / "foreign"
                target.mkdir(exist_ok=True)
                before = snapshot(target)
                root.symlink_to(target)
                result = self.run_setup("setup:links")
                self.assert_success(result, partial=not same_repo)
                self.assertEqual(snapshot(target), before)
                if same_repo:
                    self.assertIn("already visible", (result.stdout + result.stderr).lower())

    def test_05_intermediate_symlink_or_file_never_followed(self):
        for parent in (".claude", ".pi/agent", ".pi/agent/claude-plugin/.claude-plugin"):
            for kind in ("symlink", "file"):
                with self.subTest(parent=parent, kind=kind):
                    shutil.rmtree(self.home); self.home.mkdir()
                    foreign = self.base / "foreign-parent"
                    foreign.mkdir(exist_ok=True)
                    marker = foreign / "sentinel"
                    marker.write_text("unchanged")
                    before = snapshot(foreign)
                    p = self.home / parent
                    p.parent.mkdir(parents=True, exist_ok=True)
                    if kind == "symlink": p.symlink_to(foreign, target_is_directory=True)
                    else: p.write_text("owner")
                    result = self.run_setup("setup:links")
                    self.assert_success(result, partial=True)
                    self.assertEqual(snapshot(foreign), before)
                    if kind == "file": self.assertEqual(p.read_text(), "owner")

    @unittest.skipIf(os.geteuid() == 0, "root bypasses permission bits")
    def test_06_unwritable_link_root_fails(self):
        root = self.home / ".claude/skills"
        root.mkdir(parents=True)
        root.chmod(0o555)
        try:
            result = self.run_setup("setup:links")
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        finally:
            root.chmod(0o755)

    def test_08_full_dispatch_and_refresh_forwarding_source_only(self):
        source = (self.repo_copy / "run.sh").read_text()
        self.assertRegex(source, r"(?s)setup_refresh_self\(\).*?exec[^\n]*run\.sh[^\n]*\$[@*]")
        self.assertRegex(source, r'(?s)setup_all\(\).*?setup_refresh_self\s+"\$@"')
        wrapper = source[source.index("setup_with_profile() {"):]
        wrapper = wrapper[:wrapper.index("\n}\n")]
        self.assertRegex(wrapper, r'(?s)SETUP_PROFILE.*?full.*?"\$full_fn"\s+"\$@"')
        for verb, function in (("setup", "setup_all"), ("setup:links", "setup_links")):
            with self.subTest(verb=verb):
                self.assertRegex(source, rf"{re.escape(verb)}\)\s*\n\s*shift;\s*setup_with_profile\s+{function}\s+\"\$@\"")


if __name__ == "__main__":
    unittest.main()
