#!/usr/bin/env python3
"""Decision-gate lint — agent-config#24.

Checks one evidence file (a "판단축" produced by a digging sibling) against the
contract in issue #24. This is a checker, not an engine: it holds no state, and
deleting it loses nothing.

Exit 0 = the gate may open. Exit 1 = blocked, with every blocking item named.

	python3 gate_lint.py <file.md> [<file.md> ...]

Gates (see issue #24):
  G1  every §6 item carries >= 1 citation [date, source, evidence-state];
      an item without one is "불명 — 블로킹" and stops progress there.
  G3  every §6 item anchors to §1 by reusing a date that §1 actually cites,
      so a reader sees the trajectory rather than a single verdict.
  틀  §1..§6 must all be present; §1 must be in chronological order and must
      itself carry at least one citation.

What this CANNOT check (검수 2026-09-08, openai-codex/gpt-5.6-terra): whether a
citation is about the item it sits under. Form is machine-checkable, relevance
is not — that stays with the digging sibling and the resident who reads it.
"""

import re
import sys

SECTIONS = {
	1: "얼개",
	2: "판단 기준",
	3: "유보",
	4: "갈린 곳",
	5: "못 찾은 것",
	6: "예상 답안",
}

# "## §1 얼개 — 시간순 (…)" / "## §6 예상 답안"
HEADING = re.compile(r"^##\s*§\s*(\d)\b\s*(.*)$")
# A bracketed citation must carry both a date and an evidence state.
BRACKET = re.compile(r"\[([^\[\]]*)\]")
DATE = re.compile(r"(\d{4}-\d{2}-\d{2})")
EVIDENCE = re.compile(
	r"measured|read[ -]at|read from|inherited|artifact|읽음|측정|상속|회수",
	re.IGNORECASE,
)
# An item inside §6: a top-level bullet, a numbered entry, or a level-3 heading.
# A top-level paragraph also opens an item (see split_items) so that prose
# trailing a compliant bullet cannot ride on that bullet's citation.
ITEM = re.compile(r"^(?:[-*+]\s+\S|\d+[.)]\s+\S|###\s+\S)")


def citations(text):
	"""Bracketed groups carrying a date AND a source AND an evidence state.

	`[2026-09-08, measured]` is NOT a citation: it names no source, so nobody
	can go read it. Three fields are the contract.
	"""
	found = []
	for raw in BRACKET.findall(text):
		date = DATE.search(raw)
		if not date or not EVIDENCE.search(raw):
			continue
		fields = [f.strip() for f in raw.split(",")]
		rest = [
			f
			for f in fields
			if f and not DATE.search(f) and not EVIDENCE.fullmatch(f.strip("[]() 「」"))
		]
		# Drop the field that is purely the evidence state.
		rest = [f for f in rest if not EVIDENCE.fullmatch(f)]
		if len(fields) >= 3 and rest:
			found.append((date.group(1), raw.strip()))
	return found


def split_sections(lines):
	"""Return {section_number: (heading_line_no, [body lines])}."""
	out, current = {}, None
	for lineno, line in enumerate(lines, 1):
		m = HEADING.match(line)
		if m:
			current = int(m.group(1))
			out[current] = (lineno, [])
			continue
		if current is not None:
			out[current][1].append(line)
	return out


def split_items(body):
	"""Return [(first_line_index, [item lines])] for §6.

	An item opens on a bullet/numbered/### line, and also on a top-level
	paragraph that follows a blank line — otherwise "실제 결정: …" written as
	plain prose after a compliant bullet inherits that bullet's citation.
	"""
	items, buf, start, blank = [], None, 0, True
	for idx, line in enumerate(body):
		stripped = line.strip()
		top_level_prose = (
			blank
			and stripped
			and not line[:1].isspace()
			and not line.startswith(">")
			and not line.startswith("|")
			and not line.startswith("#")
		)
		if ITEM.match(line) or top_level_prose:
			if buf is not None:
				items.append((start, buf))
			buf, start = [line], idx
		elif buf is not None:
			buf.append(line)
		blank = not stripped
	if buf is not None:
		items.append((start, buf))
	return items


def label(item_lines):
	head = item_lines[0].lstrip("-# ").strip()
	return (head[:60] + "…") if len(head) > 60 else head


def check(path):
	problems = []
	try:
		with open(path, encoding="utf-8") as fh:
			lines = fh.read().splitlines()
	except OSError as err:
		return [f"{path}: 열 수 없음 — {err}"]

	sections = split_sections(lines)

	# 틀 — every section present.
	for num, name in SECTIONS.items():
		if num not in sections:
			problems.append(f"{path}: 틀 — §{num} {name} 절이 없다 (반려)")

	# 틀 — §1 chronological.
	if 1 in sections:
		dates = [d for _, body in [sections[1]] for line in body for d, _ in citations(line)]
		for prev, nxt in zip(dates, dates[1:]):
			if nxt < prev:
				problems.append(f"{path}: 틀 — §1이 시간순이 아니다 ({prev} 뒤에 {nxt})")
				break

	if 6 not in sections:
		return problems

	anchor_dates = {
		d
		for _, body in [sections.get(1, (0, []))]
		for line in body
		for d, _ in citations(line)
	}
	if not anchor_dates:
		problems.append(f"{path}: G3 — §1에 인용이 하나도 없다 (§6이 앵커할 원문이 없다)")
	_, six_body = sections[6]
	items = split_items(six_body)
	if not items:
		problems.append(f"{path}: G1 — §6에 항목이 하나도 없다 (빈 절은 채워진 것이 아니다)")

	for _, item_lines in items:
		text = "\n".join(item_lines)
		cites = citations(text)
		name = label(item_lines)
		if not cites:
			problems.append(f"{path}: G1 불명 — 블로킹 — §6 「{name}」에 [날짜, 출처, 증거상태] 인용이 없다")
			continue
		if not anchor_dates or not any(d in anchor_dates for d, _ in cites):
			problems.append(f"{path}: G3 — §6 「{name}」이 §1의 어느 날짜도 인용하지 않는다 (판정 하나로 뭉침)")

	return problems


def main(argv):
	if len(argv) < 2:
		print(__doc__.strip(), file=sys.stderr)
		return 2
	blocked = []
	for path in argv[1:]:
		found = check(path)
		blocked.extend(found)
		if not found:
			print(f"ok   {path}")
	for line in blocked:
		print(f"BLOCK {line}", file=sys.stderr)
	return 1 if blocked else 0


if __name__ == "__main__":
	sys.exit(main(sys.argv))
