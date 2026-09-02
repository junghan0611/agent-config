#!/usr/bin/env python3
"""Deterministic CLI checks for session-recap exact-session selection."""

import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("session-recap.py")

# 하이픈 때문에 평범한 import 가 안 된다 — 경로로 직접 로드한다.
_spec = importlib.util.spec_from_file_location("session_recap", SCRIPT)
recap = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(recap)


class ExactSessionFileTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory(prefix="session-recap-test-")
        self.home = Path(self.tempdir.name)
        self.pi_file = (
            self.home
            / ".pi"
            / "agent"
            / "sessions"
            / "--home-junghan-repos-gh-agent-config--"
            / "2026-08-10T00-00-00_20260810T000000-a1b2c3.jsonl"
        )
        self.claude_file = (
            self.home
            / ".claude"
            / "projects"
            / "-home-junghan-repos-gh-agent-config"
            / "94563ccb-3897-40f8-901b-965169261da8"
            / "subsession.jsonl"
        )
        self._write_pi(self.pi_file)
        self._write_claude(self.claude_file)

    def tearDown(self):
        self.tempdir.cleanup()

    @staticmethod
    def _write_pi(path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        rows = [
            {"type": "session", "id": "20260810T000000-a1b2c3", "timestamp": "2026-08-10T00:00:00Z"},
            {
                "type": "message",
                "timestamp": "2026-08-10T00:00:01Z",
                "message": {"role": "user", "content": [{"type": "text", "text": "exact pi request"}]},
            },
            {
                "type": "message",
                "timestamp": "2026-08-10T00:00:02Z",
                "message": {
                    "role": "assistant",
                    "provider": "openai-codex",
                    "model": "gpt-test",
                    "content": [{"type": "text", "text": "exact pi outcome"}],
                },
            },
        ]
        path.write_text("".join(json.dumps(row) + "\n" for row in rows))

    @staticmethod
    def _write_claude(path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        rows = [
            {
                "type": "user",
                "timestamp": "2026-08-10T01:00:00Z",
                "message": {"role": "user", "content": "exact claude request"},
            },
            {
                "type": "assistant",
                "timestamp": "2026-08-10T01:00:01Z",
                "message": {"role": "assistant", "content": [{"type": "text", "text": "exact claude outcome"}]},
            },
        ]
        path.write_text("".join(json.dumps(row) + "\n" for row in rows))

    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["HOME"] = str(self.home)
        env.pop("CLAUDECODE", None)
        return subprocess.run(
            ["python3", str(SCRIPT), *args],
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_exact_pi_bypasses_default_skip_and_size_floor(self):
        result = self.run_cli("--session-file", str(self.pi_file), "--messages", "5")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("exact pi request", result.stdout)
        self.assertIn("exact pi outcome", result.stdout)
        self.assertIn(f"파일: {self.pi_file}", result.stdout)
        self.assertIn("agent-config [pi:gpt]", result.stdout)

    def test_exact_nested_claude_path_reports_full_provenance(self):
        result = self.run_cli("--session-file", str(self.claude_file), "--format", "json")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload[0]["meta"]["source"], "claude")
        self.assertEqual(payload[0]["meta"]["project"], "agent-config")
        self.assertEqual(payload[0]["meta"]["path"], str(self.claude_file))
        self.assertTrue(payload[0]["meta"]["exact"])

    def test_relative_path_is_rejected(self):
        result = self.run_cli("--session-file", "relative.jsonl")
        self.assertEqual(result.returncode, 2)
        self.assertIn("must be an absolute path", result.stderr)

    def test_path_outside_session_roots_is_rejected(self):
        outside = self.home / "outside.jsonl"
        outside.write_text("{}\n")
        result = self.run_cli("--session-file", str(outside))
        self.assertEqual(result.returncode, 2)
        self.assertIn("must be under ~/.pi/agent/sessions or ~/.claude/projects", result.stderr)

    def test_final_symlink_is_rejected(self):
        link = self.pi_file.with_name("linked.jsonl")
        link.symlink_to(self.pi_file)
        result = self.run_cli("--session-file", str(link))
        self.assertEqual(result.returncode, 2)
        self.assertIn("not a symlink", result.stderr)

    def test_zero_parsed_messages_is_a_named_error(self):
        # exact 선택은 크기/구조 필터를 우회하므로 discovery 로는 도달할 수 없는
        # "메시지 0건" 이 여기까지 온다. 헤더만 찍고 rc=0 이면 호출자가 본문 없이
        # 요약하게 되므로 named error 로 끊는다.
        for name, body in (("empty.jsonl", ""), ("garbage.jsonl", "not json\n")):
            with self.subTest(name=name):
                path = self.pi_file.with_name(name)
                path.write_text(body)
                result = self.run_cli("--session-file", str(path))
                self.assertEqual(result.returncode, 1)
                self.assertIn("parsed 0 messages", result.stderr)
                self.assertNotIn("═══", result.stdout)

    def test_every_discovery_filter_is_rejected_with_exact_selection(self):
        # acceptance 가 고정한 7개 전부. 하나만 검증하면 나머지가 조용히 무시되는
        # 회귀를 못 잡는다 — exact selection 의 핵심 계약이다.
        for flag, value in (
            ("--sessions", "3"),
            ("--project", "agent-config"),
            ("--all-projects", None),
            ("--skip", "0"),
            ("--source", "pi"),
            ("--harness", "gpt"),
            ("--min-kb", "0"),
        ):
            with self.subTest(flag=flag):
                extra = [flag] if value is None else [flag, value]
                result = self.run_cli("--session-file", str(self.pi_file), *extra)
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn(f"--session-file cannot be combined with {flag}", result.stderr)

    def test_missing_path_is_rejected(self):
        missing = self.pi_file.with_name("absent.jsonl")
        result = self.run_cli("--session-file", str(missing))
        self.assertEqual(result.returncode, 2)
        self.assertIn("not readable", result.stderr)

    def test_wrong_suffix_is_rejected(self):
        other = self.pi_file.with_name("notes.txt")
        other.write_text("{}\n")
        result = self.run_cli("--session-file", str(other))
        self.assertEqual(result.returncode, 2)
        self.assertIn("must name a .jsonl file", result.stderr)

    def test_unreadable_file_is_a_named_error_not_a_traceback(self):
        # chmod 000 은 stat 을 통과하므로 resolve 단계가 실제로 열어봐야 한다.
        blocked = self.pi_file.with_name("blocked.jsonl")
        blocked.write_text("{}\n")
        blocked.chmod(0o000)
        try:
            result = self.run_cli("--session-file", str(blocked))
        finally:
            blocked.chmod(0o600)
        self.assertEqual(result.returncode, 2)
        self.assertIn("not readable", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_syntactically_valid_non_object_lines_are_not_records(self):
        # `[]` / `42` 는 JSON 으로는 유효하지만 레코드가 아니다. dict 가정이 깨지면
        # detect_pi_harness 가 AttributeError 로 죽는다.
        path = self.pi_file.with_name("nonobject.jsonl")
        path.write_text("[]\n42\n")
        result = self.run_cli("--session-file", str(path))
        self.assertEqual(result.returncode, 1)
        self.assertIn("parsed 0 messages", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_non_object_message_payload_is_skipped_not_fatal(self):
        # top-level 이 dict 여도 `message` 가 object 가 아닐 수 있다.
        path = self.pi_file.with_name("badmsg.jsonl")
        path.write_text(json.dumps({"type": "message", "message": []}) + "\n")
        result = self.run_cli("--session-file", str(path))
        self.assertEqual(result.returncode, 1)
        self.assertIn("parsed 0 messages", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_malformed_usage_does_not_discard_a_readable_turn(self):
        # usage 는 부가 정보다. 모양이 깨져도 turn 자체는 살아야 한다.
        path = self.pi_file.with_name("badusage.jsonl")
        path.write_text(
            json.dumps(
                {
                    "type": "message",
                    "timestamp": "2026-08-10T00:00:01Z",
                    "message": {"role": "user", "content": "valid", "usage": [1]},
                }
            )
            + "\n"
        )
        result = self.run_cli("--session-file", str(path), "--cost")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("valid", result.stdout)
        self.assertNotIn("Traceback", result.stderr)

    def test_zero_messages_is_rejected_instead_of_faking_an_empty_session(self):
        # -m 0 은 deque(maxlen=0) 로 전부 버린다. 읽을 수 있는 세션을 "읽을 게 없다"
        # 고 보고하면 named error 가 거짓말이 된다.
        result = self.run_cli("--session-file", str(self.pi_file), "--messages", "0")
        self.assertEqual(result.returncode, 2)
        self.assertIn("requires --messages >= 1", result.stderr)
        self.assertNotIn("parsed 0 messages", result.stderr)


class PiCorpusAdmissionTest(unittest.TestCase):
    """pi 코퍼스 admission — andenken `isNativePiSessionFile` 과 같은 규격.

    2026-08-06 에 pi 가 garden-id suffix 를 그만 쓰기 시작했는데 필터가 그대로여서,
    그 뒤 만들어진 pi 세션이 **한 건도** 코퍼스에 안 들어왔다. 에러 없이 인덱스만
    얇아졌다. 같은 종류의 drift 가 다음엔 소리내며 깨지도록 규격을 못박는다.
    """

    def test_current_uuidv7_is_admitted(self):
        for name in (
            "2026-08-10T06-20-36-243Z_019fea54-8813-7905-9a89-f777aba5c3ef.jsonl",
            "2026-08-10T06-31-22-503Z_019fea5e-6487-7241-82c4-e74838738ab4.jsonl",
        ):
            with self.subTest(name=name):
                self.assertTrue(recap._is_native_pi_session_file(name))

    def test_retired_species_are_not_or_ed_back_in(self):
        # GLG 판정 2026-08-10 — 호환성 유지하지 않는다.
        for name, why in (
            ("2026-08-06T01-15-27-810Z_20260806T101526-6b7de3.jsonl", "garden-id"),
            ("2026-07-01T00-00-00-000Z_8db61ee4-a535-4aa7-a504-e4a28fdeea73.jsonl", "UUIDv4"),
            ("2026-06-03T18-59-00-000Z_entwurf-abc123.jsonl", "entwurf-"),
            ("2026-06-03T18-59-00-000Z_delegate-abc123.jsonl", "delegate-"),
            ("20260603T1859-test056529.jsonl", "test artifact"),
            ("2026-08-10T06-20-36-243Z_019fea54-8813-c905-9a89-f777aba5c3ef.jsonl", "version c"),
            ("2026-08-10T06-20-36-243Z_019fea54-8813-7905-0a89-f777aba5c3ef.jsonl", "variant 0"),
            ("2026-08-10T06-20-36-243Z_019fea54-8813-7905-9a89-f777aba5c3ef.jsonl.bak", "not .jsonl"),
        ):
            with self.subTest(why=why):
                self.assertFalse(recap._is_native_pi_session_file(name))

    def test_tmp_exclusion_is_independent_of_the_filename_spec(self):
        self.assertTrue(recap._is_excluded_project_dir("--tmp-claude-1000--home-junghan--"))
        self.assertTrue(recap._is_excluded_project_dir("-tmp-scratch"))
        self.assertFalse(recap._is_excluded_project_dir("--home-junghan-repos-gh-agent-config--"))


class SessionCorpusTest(unittest.TestCase):
    """Corpus fixtures stay entirely below a temporary HOME and corpus root."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory(prefix="session-recap-corpus-test-")
        self.home = Path(self.tempdir.name) / "home"
        self.corpus = Path(self.tempdir.name) / "corpus"
        self._had_corpus_env = recap.CORPUS_ENV in os.environ
        self._old_corpus_env = os.environ.get(recap.CORPUS_ENV)
        self._old_home = os.environ.get("HOME")
        os.environ["HOME"] = str(self.home)
        os.environ.pop(recap.CORPUS_ENV, None)

        self.project_dir = "--home-junghan-repos-gh-agent-config--"
        self.live_pi = (
            self.home / ".pi" / "agent" / "sessions" / self.project_dir / "live.jsonl"
        )
        ExactSessionFileTest._write_pi(self.live_pi)

    def tearDown(self):
        if self._old_home is None:
            os.environ.pop("HOME", None)
        else:
            os.environ["HOME"] = self._old_home
        if self._had_corpus_env:
            os.environ[recap.CORPUS_ENV] = self._old_corpus_env
        else:
            os.environ.pop(recap.CORPUS_ENV, None)
        self.tempdir.cleanup()

    def enable_corpus(self):
        self.corpus.mkdir(parents=True, exist_ok=True)
        os.environ[recap.CORPUS_ENV] = str(self.corpus)

    def corpus_pi_file(self, device: str, name: str = "corpus.jsonl") -> Path:
        path = (
            self.corpus
            / device
            / ".pi"
            / "agent"
            / "sessions"
            / self.project_dir
            / name
        )
        ExactSessionFileTest._write_pi(path)
        return path

    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["HOME"] = str(self.home)
        env.pop("CLAUDECODE", None)
        return subprocess.run(
            ["python3", str(SCRIPT), *args],
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_unset_corpus_keeps_live_discovery_only(self):
        self.assertEqual(
            recap.get_sessions_dirs("pi"),
            [(self.home / ".pi" / "agent" / "sessions", "pi", None)],
        )

    def test_corpus_devices_ignore_metadata_files_and_union_with_live(self):
        self.enable_corpus()
        for name in ("MANIFEST.json", "MANIFEST.sha256", "README.md", "AGENTS.md"):
            (self.corpus / name).write_text("fixture\n")
        self.corpus_pi_file("oracle")
        self.corpus.mkdir(exist_ok=True)
        (self.corpus / "thinkpad").mkdir()

        self.assertEqual(recap.corpus_devices(), ["oracle", "thinkpad"])
        self.assertEqual(
            recap.get_sessions_dirs("pi"),
            [
                (self.home / ".pi" / "agent" / "sessions", "pi", None),
                (self.corpus / "oracle" / ".pi" / "agent" / "sessions", "pi", "oracle"),
            ],
        )

    def test_dedupe_prefers_larger_copy(self):
        self.enable_corpus()
        small = self.corpus_pi_file("thinkpad", "same.jsonl")
        large = self.corpus_pi_file("oracle", "same.jsonl")
        small.write_text("x" * 20)
        large.write_text("x" * 40)
        items = [
            (0.0, small, "agent-config", "pi", "thinkpad"),
            (0.0, large, "agent-config", "pi", "oracle"),
        ]

        self.assertEqual(recap.dedupe_by_basename(items), [items[1]])

    def test_dedupe_equal_size_prefers_lexicographically_smaller_path(self):
        self.enable_corpus()
        smaller = self.corpus_pi_file("alpha", "same.jsonl")
        larger = self.corpus_pi_file("beta", "same.jsonl")
        smaller.write_text("x" * 40)
        larger.write_text("x" * 40)
        items = [
            (0.0, larger, "agent-config", "pi", "beta"),
            (0.0, smaller, "agent-config", "pi", "alpha"),
        ]

        self.assertEqual(recap.dedupe_by_basename(items), [items[1]])

    def test_exact_accepts_live_and_corpus_and_labels_only_corpus(self):
        self.enable_corpus()
        corpus_file = self.corpus_pi_file("oracle")

        live = self.run_cli("--session-file", str(self.live_pi))
        self.assertEqual(live.returncode, 0, live.stderr)
        self.assertIn("agent-config [pi:gpt]", live.stdout)
        self.assertNotIn("pi:gpt@", live.stdout)

        corpus = self.run_cli("--session-file", str(corpus_file))
        self.assertEqual(corpus.returncode, 0, corpus.stderr)
        self.assertIn("agent-config [pi:gpt@oracle]", corpus.stdout)


if __name__ == "__main__":
    unittest.main()
