#!/usr/bin/env python3
"""Local-only regressions: scan additions, not diff metadata; never allowlist secrets."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent


def git(repo, *args, input=None):
	return subprocess.run(["git", "-C", str(repo), *args], input=input, text=True,
		check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def commit_object(repo, parent=None):
	tree = git(repo, "write-tree")
	args = ["commit-tree", tree, "-m", "synthetic fixture"]
	if parent:
		args += ["-p", parent]
	return git(repo, *args)


def main():
	assert shutil.which("gitleaks"), "gitleaks required"
	os.environ.update(GIT_AUTHOR_NAME="fixture", GIT_AUTHOR_EMAIL="fixture@example.invalid",
		GIT_COMMITTER_NAME="fixture", GIT_COMMITTER_EMAIL="fixture@example.invalid")
	digest = hashlib.sha256(b"synthetic-added-secret-regression").hexdigest()
	old = 'INDEXNOW_KEY="' + digest[:32] + '"\n# existing section\n'
	secret = "ghp_" + digest[:36]
	cases = [
		("hunk-context", old, old.replace("# existing", "# added comment\n# existing"), False, False),
		("removed-secret", secret + "\n", "safe replacement\n", False, False),
		("added-secret", "safe\n", secret + "\n", True, False),
		("allowlisted-secret", "safe\n", secret + "\n", True, True),
		("added-plus-secret", "safe\n", "+" + secret + "\n", True, False),
	]
	checks = 0
	with tempfile.TemporaryDirectory(prefix="hook-added-secrets-") as temp:
		for name, before, after, blocked, allowlisted in cases:
			repo = Path(temp) / name
			repo.mkdir()
			git(repo, "init", "-q")
			file = repo / "ledger.txt"
			file.write_text(before)
			git(repo, "add", "ledger.txt")
			base = commit_object(repo)
			git(repo, "update-ref", "HEAD", base)
			if allowlisted:
				(repo / ".git-hooks-allow").write_text("^ledger[.]txt$\n")
			file.write_text(after)
			git(repo, "add", "ledger.txt")
			if name == "hunk-context":
				diff = git(repo, "diff", "--cached", "-U0")
				assert any(line.startswith("@@") and digest[:32] in line for line in diff.splitlines()), diff
			target = commit_object(repo, base)
			for args in [("staged",), ("range", base, target)]:
				result = subprocess.run([str(ROOT / "_scan.sh"), *args], cwd=repo,
					text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
				assert result.returncode == int(blocked), (name, args[0], result.returncode, result.stderr)
				assert ("gitleaks found secret(s)" in result.stderr) == blocked, (name, args[0])
				checks += 1
	print(f"PASS: {checks} staged/range added-secret checks; synthetic repositories only")


if __name__ == "__main__":
	main()
