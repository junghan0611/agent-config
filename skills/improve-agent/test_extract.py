#!/usr/bin/env python3
"""Regression tests for extract.py.

Run: python3 skills/improve-agent/test_extract.py

Every test here exists because the behavior broke once. Synthetic fixtures
only — never read the operator's real sessions, or the suite passes or fails
depending on what they did yesterday.
"""

import importlib.util
import json
import os
import tempfile
import time
import unittest
from datetime import datetime, timezone

_spec = importlib.util.spec_from_file_location(
    "extract", os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract.py"))
ex = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ex)


def write_jsonl(path, records):
    with open(path, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    return path


def claude_session(path, start_utc, records=()):
    """A Claude Code transcript starting at `start_utc` (ISO Z string)."""
    rows = [{"type": "user", "parentUuid": None, "timestamp": start_utc,
             "message": {"role": "user", "content": [{"type": "text", "text": "go"}]}}]
    rows.extend(records)
    return write_jsonl(path, rows)


def assistant(text=None, tools=(), thinking=None):
    content = []
    if thinking:
        content.append({"type": "thinking", "thinking": thinking})
    if text:
        content.append({"type": "text", "text": text})
    for tid, name, inp in tools:
        content.append({"type": "tool_use", "id": tid, "name": name, "input": inp})
    return {"type": "assistant", "timestamp": "2026-07-13T01:00:00.000Z",
            "message": {"role": "assistant", "content": content}}


def tool_result(tid, text, is_error=False):
    return {"type": "user", "timestamp": "2026-07-13T01:00:01.000Z",
            "message": {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": tid,
                 "content": [{"type": "text", "text": text}], "is_error": is_error}]}}


class TestClock(unittest.TestCase):
    """mtime must never decide a session's date or sort order."""

    def test_mtime_change_does_not_move_the_date(self):
        with tempfile.TemporaryDirectory() as d:
            p = claude_session(os.path.join(d, "a.jsonl"), "2026-07-13T05:00:00.000Z")
            before = ex.file_date(p)
            os.utime(p, (time.time() + 86400 * 3, time.time() + 86400 * 3))
            ex._START_CACHE.clear()
            self.assertEqual(ex.file_date(p), before)

    def test_mtime_change_does_not_reorder_last_n(self):
        with tempfile.TemporaryDirectory() as d:
            old = claude_session(os.path.join(d, "old.jsonl"), "2026-07-01T00:00:00.000Z")
            new = claude_session(os.path.join(d, "new.jsonl"), "2026-07-20T00:00:00.000Z")
            # Touch the OLD session so its mtime is newest. Sorting by mtime
            # would now pick it as the most recent session; sorting by start
            # time must still pick `new`.
            os.utime(old, (time.time() + 999, time.time() + 999))
            ex._START_CACHE.clear()
            picked = ex.get_session_files([d], last=1)
            self.assertEqual(picked, [new])

    def test_pi_and_claude_agree_on_the_same_instant(self):
        """A pi UTC filename and a Claude UTC record at the same moment must
        land on the same local day — otherwise --source all splits them."""
        with tempfile.TemporaryDirectory() as d:
            utc = "2026-07-13T22-30-00-000Z"
            pi = write_jsonl(os.path.join(d, f"{utc}_20260714T073000-abc123.jsonl"),
                             [{"type": "session", "cwd": "/x"}])
            cl = claude_session(os.path.join(d, "c.jsonl"), "2026-07-13T22:30:00.000Z")
            self.assertFalse(ex.is_claude_file(pi))
            self.assertTrue(ex.is_claude_file(cl))
            self.assertEqual(ex.file_date(pi), ex.file_date(cl))
            # And that day is the local one, not the UTC one.
            expect = datetime(2026, 7, 13, 22, 30, tzinfo=timezone.utc)
            self.assertEqual(ex.file_date(cl),
                             expect.astimezone().strftime("%Y-%m-%d"))


class TestSays(unittest.TestCase):
    def test_says_is_prose_only(self):
        """Thinking is private and tool calls are not speech; neither is what
        the operator read."""
        with tempfile.TemporaryDirectory() as d:
            p = claude_session(os.path.join(d, "a.jsonl"), "2026-07-13T01:00:00.000Z", [
                assistant(text="제 실수입니다.", thinking="secret reasoning",
                          tools=[("t1", "Bash", {"command": "ls"})]),
                assistant(tools=[("t2", "Read", {"file_path": "/x"})]),
            ])
            said = [t for t, _ in ex.extract_says(p)]
            self.assertEqual(said, ["제 실수입니다."])
            self.assertNotIn("secret reasoning", "".join(said))


class TestCorrectionsVsFailures(unittest.TestCase):
    def test_permission_denial_is_a_correction_not_a_failure(self):
        with tempfile.TemporaryDirectory() as d:
            p = claude_session(os.path.join(d, "a.jsonl"), "2026-07-13T01:00:00.000Z", [
                assistant(text="지우겠습니다.", tools=[("t1", "Bash", {"command": "rm -rf x"})]),
                tool_result("t1", "The user doesn't want to proceed with this "
                                  "tool use. The tool use was rejected", is_error=True),
                {"type": "user", "timestamp": "2026-07-13T01:00:02.000Z",
                 "message": {"role": "user",
                             "content": [{"type": "text", "text": "지우지 마"}]}},
            ])
            self.assertEqual(list(ex.extract_failures(p)), [])
            corrections = [c for c, _ in ex.extract_corrections(p)]
            self.assertEqual(len(corrections), 1)
            self.assertIn("지우지 마", corrections[0])

    def test_real_tool_error_is_still_a_failure(self):
        with tempfile.TemporaryDirectory() as d:
            p = claude_session(os.path.join(d, "a.jsonl"), "2026-07-13T01:00:00.000Z", [
                assistant(text="확인합니다.", tools=[("t1", "Bash", {"command": "nope"})]),
                tool_result("t1", "command not found: nope", is_error=True),
            ])
            failures = [f for f, _ in ex.extract_failures(p)]
            self.assertEqual(len(failures), 1)
            self.assertIn("command not found", failures[0])
            self.assertIn("bash", failures[0])

    def test_interrupt_is_charged_to_the_turn_it_killed(self):
        """Claude Code has no stopReason=aborted; the interrupt arrives after
        the fact and must be applied backwards, or --corrections sees nothing."""
        with tempfile.TemporaryDirectory() as d:
            p = claude_session(os.path.join(d, "a.jsonl"), "2026-07-13T01:00:00.000Z", [
                assistant(tools=[("t1", "Bash", {"command": "sleep 600"})]),
                {"type": "user", "timestamp": "2026-07-13T01:00:05.000Z",
                 "message": {"role": "user", "content": [
                     {"type": "text", "text": "[Request interrupted by user]"}]}},
                {"type": "user", "timestamp": "2026-07-13T01:00:06.000Z",
                 "message": {"role": "user", "content": [
                     {"type": "text", "text": "잠시 상황 검토부터하자"}]}},
            ])
            corrections = [c for c, _ in ex.extract_corrections(p)]
            self.assertEqual(len(corrections), 1)
            self.assertIn("sleep 600", corrections[0])
            self.assertIn("잠시 상황 검토부터하자", corrections[0])
            # The marker itself is noise and must not be served as the
            # operator's correction.
            self.assertNotIn("[Request interrupted", corrections[0])


class TestPiUnchanged(unittest.TestCase):
    def test_pi_schema_still_parses(self):
        with tempfile.TemporaryDirectory() as d:
            p = write_jsonl(os.path.join(d, "2026-07-13T01-00-00-000Z_x.jsonl"), [
                {"type": "message", "message": {"role": "assistant", "content": [
                    {"type": "text", "text": "됐습니다."},
                    {"type": "toolCall", "name": "bash",
                     "arguments": {"command": "make test"}}]}},
                {"type": "message", "message": {
                    "role": "toolResult", "isError": True, "toolName": "bash",
                    "content": [{"type": "text", "text": "FAIL"}]}},
            ])
            self.assertEqual([t for t, _ in ex.extract_says(p)], ["됐습니다."])
            self.assertEqual([c for c, _ in ex.extract_commands(p)], ["make test"])
            self.assertEqual(len(list(ex.extract_failures(p))), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
