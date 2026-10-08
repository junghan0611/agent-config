"""Extract a tag's CHANGELOG section, soft-wrapped for GitHub Releases (API-0)."""

import re
import sys
from pathlib import Path


BLOCK_START = re.compile(r"^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)")
FENCE_START = re.compile(r"^ {0,3}(`{3,}|~{3,})")


def fence_after(line, fence):
	if fence is not None:
		char, length = fence
		if re.fullmatch(r" {0,3}" + re.escape(char) + r"{" + str(length) + r",}\s*", line):
			return None
		return fence
	match = FENCE_START.match(line)
	return (match[1][0], len(match[1])) if match else None


def release_notes(source, tag):
	"""Return (title, notes); alter whitespace only, never fenced code."""
	heading = re.compile(r"^## " + re.escape(tag) + r"(?:[ \t]|$)")
	section, title, fence = [], None, None
	for line in source.splitlines():
		if fence is None and line.startswith("## "):
			if title is not None:
				break
			if heading.match(line):
				title = line[3:]
				continue
		fence = fence_after(line, fence)
		if title is not None:
			section.append(line)
	if title is None or not any(line.strip() for line in section):
		raise ValueError("ABORT: missing tag heading or empty release notes")

	out, cur, fence = [], None, None
	for line in section:
		next_fence = fence_after(line, fence)
		if fence is not None or next_fence is not None:
			if cur is not None:
				out.append(cur)
				cur = None
			out.append(line)
			fence = next_fence
			continue
		if not line.strip():
			if cur is not None:
				out.append(cur)
				cur = None
			out.append(line)
		elif cur is None or BLOCK_START.match(line):
			if cur is not None:
				out.append(cur)
			cur = line
		elif cur.endswith("  ") or cur.endswith("\\"):
			# Explicit Markdown hard breaks remain intentional structure.
			out.append(cur)
			cur = line
		else:
			cur = cur.rstrip() + " " + line.strip()
	if cur is not None:
		out.append(cur)

	# Trim boundary blank lines, not whitespace inside a fenced block.
	while out and not out[0].strip():
		out.pop(0)
	while out and not out[-1].strip():
		out.pop()
	notes = "\n".join(out) + "\n"
	squash = lambda text: re.sub(r"\s+", " ", text).strip()
	if squash(notes) != squash("\n".join(section)):
		raise ValueError("ABORT: soft-wrap changed release-note text beyond whitespace")
	return title, notes


if __name__ == "__main__":
	changelog, tag, output = sys.argv[1:]
	title, notes = release_notes(Path(changelog).read_text(encoding="utf-8"), tag)
	Path(output).write_text(notes, encoding="utf-8")
	print(title)
