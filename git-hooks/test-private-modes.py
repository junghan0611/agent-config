#!/usr/bin/env python3
"""API-0 fixtures: named private origins skip identity checks, never secrets."""
import hashlib
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent


def git(repo, *args):
	return subprocess.run(["git", "-C", str(repo), *args], check=True,
		stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def main():
	assert shutil.which("gitleaks"), "gitleaks is required to test secret protection"
	patterns = (ROOT / "sensitive-terms.txt").read_text().splitlines()
	terms = [m.group(1) for line in patterns
		if (m := re.fullmatch(r"\\b([A-Za-z][A-Za-z0-9_-]*)\\b", line.strip()))]
	assert terms, "fixture needs one literal word-boundary identity pattern"
	identity = terms[0]
	secret = "ghp_" + hashlib.sha256(b"synthetic-private-mode-fixture").hexdigest()[:36]
	origins = [
		("git@github.com:junghan0611/session.git", False),
		("https://github.com/junghan0611/session", False),
		("https://github.com/junghan0611/session.git", False),
		("git@github.com:junghan0611/session-extra.git", True),
		("https://github.com/junghan0611/session-extra", True),
		("git@github.com:junghan0611/agent-config.git", True),
	]
	checks = 0
	with tempfile.TemporaryDirectory(prefix="hook-private-modes-") as temp:
		for i, (origin, strict) in enumerate(origins):
			repo = Path(temp) / str(i)
			repo.mkdir()
			git(repo, "init", "-q")
			git(repo, "remote", "add", "origin", origin)
			for kind, content in (("identity", identity), ("secret", secret)):
				(repo / "ledger.txt").write_text(content + "\n")
				git(repo, "add", "ledger.txt")
				result = subprocess.run([str(ROOT / "_scan.sh"), "staged"],
					cwd=repo, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
				output = result.stdout + result.stderr
				if kind == "identity":
					assert result.returncode == int(strict), (origin, kind, result.returncode)
					assert ("identity term(s)" in output) == strict, (origin, kind)
				else:
					assert result.returncode == 1, (origin, kind, result.returncode)
					assert "gitleaks found secret(s)" in output, (origin, kind)
				checks += 1
	print(f"PASS: {checks} origin/identity/secret checks; no real repository changed")


if __name__ == "__main__":
	main()
