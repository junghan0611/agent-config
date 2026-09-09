#!/usr/bin/env python3
"""List or show agent-config uppercase harness-bench files. No network."""

from __future__ import annotations

import re
import sys
from pathlib import Path

SKIP = {
	"AGENTS.md",
	"CHANGELOG.md",
	"CLAUDE.md",
	"ENV-SETUP.md",
	"MODELS.md",
	"NEXT.md",
	"README.md",
	"ROADMAP.md",
}

ALLCAPS = re.compile(r"^[A-Z][A-Z0-9_-]*\.md$")
H1 = re.compile(r"^#\s+(.+)$", re.M)
STATUS_H = re.compile(r"^##\s+상태[^\n]*$", re.M)
DATED_H = re.compile(r"^##\s+\[(\d{4}-\d{2}-\d{2})\]", re.M)


def repo_root() -> Path:
	# skills/harness-bench/scripts/status.py → repo root
	return Path(__file__).resolve().parents[3]


def benches(root: Path) -> list[Path]:
	out = []
	for p in sorted(root.glob("*.md")):
		if p.name in SKIP or p.name.startswith("NEXT--"):
			continue
		if ALLCAPS.match(p.name):
			out.append(p)
	return out


def kind_and_when(text: str) -> tuple[str, str]:
	h1 = H1.search(text)
	title = h1.group(1).strip() if h1 else ""
	if "검수 매트릭스" in title:
		kind = "matrix"
	elif "관측" in title:
		kind = "observe"
	else:
		kind = "other"
	st = STATUS_H.search(text)
	when = ""
	if st:
		line = text[st.start() : text.find("\n", st.start())]
		m = re.search(r"20\d{2}-\d{2}-\d{2}", line)
		when = m.group(0) if m else "상태"
	else:
		dates = DATED_H.findall(text)
		when = dates[-1] if dates else ""
	return kind, when


def section_after(text: str, pat: re.Pattern[str]) -> str:
	m = pat.search(text)
	if not m:
		return ""
	start = m.start()
	nxt = re.search(r"^##\s+", text[m.end() :], re.M)
	end = m.end() + nxt.start() if nxt else len(text)
	return text[start:end].rstrip() + "\n"


def cmd_list(root: Path) -> int:
	rows = benches(root)
	if not rows:
		print("no uppercase bench files", file=sys.stderr)
		return 1
	width = max(len(p.name) for p in rows)
	for p in rows:
		text = p.read_text(encoding="utf-8")
		kind, when = kind_and_when(text)
		print(f"{p.name:<{width}}  {kind:<8}  {when}")
	return 0


def cmd_show(root: Path, name: str) -> int:
	stem = name.removesuffix(".md").upper()
	path = root / f"{stem}.md"
	if not path.is_file():
		print(f"missing {path.name}", file=sys.stderr)
		return 1
	text = path.read_text(encoding="utf-8")
	body = section_after(text, STATUS_H)
	if not body:
		# last dated heading if no 상태
		matches = list(DATED_H.finditer(text))
		if matches:
			m = matches[-1]
			nxt = re.search(r"^##\s+", text[m.end() :], re.M)
			end = m.end() + nxt.start() if nxt else len(text)
			body = text[m.start() : end].rstrip() + "\n"
	if not body:
		print(text[:2000])
		return 0
	print(body, end="")
	return 0


def main(argv: list[str]) -> int:
	root = repo_root()
	if len(argv) <= 1:
		return cmd_list(root)
	return cmd_show(root, argv[1])


if __name__ == "__main__":
	raise SystemExit(main(sys.argv))
