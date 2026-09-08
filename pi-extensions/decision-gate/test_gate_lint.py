#!/usr/bin/env python3
"""Tests for gate_lint.py — agent-config#24.

	python3 test_gate_lint.py

Fixtures are in fixtures/. The two real 2026-09-08 artifacts are checked too
when the sibling repo is present on this host; they must fail on the missing
§6, which is what "오늘 두 판은 §6 없이 돌았다" means mechanically.
"""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LINT = os.path.join(HERE, "gate_lint.py")
FIXTURES = os.path.join(HERE, "fixtures")
REAL = os.path.expanduser(
	"~/repos/gh/openclaw-config/config/workspace-bbot/research"
)

failures = []


def run(*paths):
	proc = subprocess.run(
		[sys.executable, LINT, *paths], capture_output=True, text=True
	)
	return proc.returncode, proc.stdout + proc.stderr


def expect(name, cond, detail=""):
	if cond:
		print(f"ok   {name}")
	else:
		print(f"FAIL {name} {detail}")
		failures.append(name)


def fixture(name):
	return os.path.join(FIXTURES, name)


code, out = run(fixture("pass.md"))
expect("pass.md opens the gate", code == 0, f"exit={code} {out}")

code, out = run(fixture("block-g1.md"))
expect("G1 blocks an uncited §6 item", code == 1 and "G1 불명" in out, out)
expect("G1 names the item", "유료 pilot" in out, out)

code, out = run(fixture("block-g3.md"))
expect("G3 blocks a §6 item with no §1 anchor", code == 1 and "G3" in out, out)

code, out = run(fixture("block-frame.md"))
expect("틀 blocks a file with no §6", code == 1 and "§6 예상 답안 절이 없다" in out, out)

# The two bypasses found in cross-review (openai-codex/gpt-5.6-terra, 2026-09-08):
# a citation with no source, and a plain-prose decision riding on a compliant
# bullet's citation. Both used to pass with exit 0.
code, out = run(fixture("block-bypass-no-source.md"))
expect(
	"우회① 출처 없는 [날짜, 증거상태]는 인용이 아니다",
	code == 1 and "G1 불명" in out,
	out,
)
expect("우회① §1에 인용이 없으면 그것부터 블로킹", "§1에 인용이 하나도 없다" in out, out)

code, out = run(fixture("block-bypass-trailing-prose.md"))
expect(
	"우회② 불릿 뒤 산문 결정은 앞 인용을 물려받지 않는다",
	code == 1 and "실제 결정" in out,
	out,
)

code, out = run(fixture("pass.md"), fixture("block-g1.md"))
expect("one bad file blocks the batch", code == 1, f"exit={code}")
expect("the good file is still reported ok", "ok   " in out, out)

code, out = run()
expect("no argument is a usage error, not a pass", code == 2, f"exit={code}")

if os.path.isdir(REAL):
	real_files = [
		os.path.join(REAL, "20260908-glg-loop-wording.md"),
		os.path.join(REAL, "20260908-glg-prime-agent-wording.md"),
	]
	present = [p for p in real_files if os.path.exists(p)]
	if present:
		code, out = run(*present)
		expect(
			"the two real 2026-09-08 artifacts block on the missing §6",
			code == 1 and out.count("§6 예상 답안 절이 없다") == len(present),
			out,
		)
		expect(
			"…and on nothing else (§1~§5 틀은 이미 맞다)",
			out.count("BLOCK") == len(present),
			out,
		)
	else:
		print("skip real artifacts — files absent on this host")
else:
	print("skip real artifacts — sibling repo absent on this host")

print()
if failures:
	print(f"{len(failures)} failed: {', '.join(failures)}")
	sys.exit(1)
print("all green")
