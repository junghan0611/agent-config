"""Offline quota regression tests: no real credentials, cache, or network.

Run: python3 -B -m unittest discover -s skills/quota/scripts -p 'test_*.py' -v
"""

import contextlib
import copy
import datetime
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import collect
import quota
import render
import serve


ACTIVE = ["claude", "pi-codex", "codex-cli", "antigravity"]
RETIRED = ["zai", "grok"]


class QuotaTests(unittest.TestCase):
    def setUp(self):
        # Fail closed if any test accidentally reaches real auth, cache or HTTP.
        self.load = self.enterContext(patch.object(
            collect._q, "_load_json", side_effect=AssertionError("real auth read")))
        self.http = self.enterContext(patch.object(
            collect._q, "_get", side_effect=AssertionError("real vendor request")))
        self.enterContext(patch("urllib.request.urlopen", side_effect=AssertionError("network")))
        self.cache_load = self.enterContext(patch.object(collect, "_cache_load", return_value={}))
        self.cache_save = self.enterContext(patch.object(collect, "_cache_save"))
        self.now = datetime.datetime.now(collect.KST)
        reset = (self.now + datetime.timedelta(days=2)).isoformat()
        self.gauges = [collect.gauge("weekly", "weekly", 25, resets_at=reset, window="7d")]

    def legacy_cache(self):
        entry = {"ts": self.now.isoformat(), "plan": "fixture", "gauges": self.gauges}
        cache = {name: copy.deepcopy(entry) for name in ACTIVE}
        for name in RETIRED:
            cache[name] = {**copy.deepcopy(entry), "plan": f"retired-marker-{name}"}
        self.cache_load.return_value = cache
        return cache

    def cached_snapshot(self):
        self.legacy_cache()
        # Existing Claude interval guard plus failed Codex polling exercises
        # both the fresh-cache and stale-fallback paths without real IO.
        return collect.snapshot()

    def assert_retired_absent(self, body):
        if isinstance(body, bytes):
            body = body.decode()
        for name in RETIRED:
            self.assertNotIn(name, body)
        self.assertNotIn("retired-marker", body)

    def assert_active(self, snap):
        self.assertEqual([r["rail"] for r in snap["rails"]], ACTIVE)
        self.assert_retired_absent(json.dumps(snap))

    def fake_vendors(self):
        auth = {
            collect._q.PI_AUTH: {"openai-codex": {"access": "fake-codex", "accountId": "fixture"}},
            collect._q.CODEX_AUTH: {"auth_mode": "chatgpt", "tokens": {
                "access_token": "fake-cli-work", "account_id": "cli-work-fixture"}},
            collect._q.CLAUDE_CREDS: {"claudeAiOauth": {"accessToken": "fake-claude"}},
            collect._q.AGY_TOKEN: {"token": {
                "access_token": "fake-agy",
                "expiry": (self.now + datetime.timedelta(minutes=30)).isoformat()[:19]
                + ".123456789+09:00"}},
        }
        self.load.side_effect = lambda path: auth[path]
        end = (self.now + datetime.timedelta(days=2)).isoformat()
        responses = {
            "https://api.anthropic.com/api/oauth/usage": {"limits": [
                {"kind": "weekly_all", "percent": 20, "resets_at": end, "is_active": True}]},
            "https://chatgpt.com/backend-api/wham/usage": {
                "plan_type": "prolite", "rate_limit": {"primary_window": {
                    "limit_window_seconds": 604800, "used_percent": 30,
                    "reset_at": int((self.now + datetime.timedelta(days=2)).timestamp())}}},
            collect.AGY_BASE + "loadCodeAssist": {
                "currentTier": {"name": "Antigravity"}, "paidTier": {"name": "Google AI Pro"}},
            collect.AGY_BASE + "retrieveUserQuota": {"buckets": [
                {"modelId": "gemini-3-flash", "resetTime": end, "remainingFraction": 0.9},
                {"modelId": "gemini-2.5-pro", "resetTime": end, "remainingFraction": 0.8},
                {"modelId": "claude-opus-5-5-high", "resetTime": end, "remainingFraction": 0.1}]},
        }

        def get(url, headers, data=None, method=None):
            self.assertIn(url, responses)
            return None, json.dumps(responses[url]).encode()

        self.http.side_effect = get
        return responses

    def test_active_registry_matches_the_dashboard_rails(self):
        self.assertEqual([name for name, _ in collect.RAILS], ACTIVE)
        for name in RETIRED:
            self.assertFalse(hasattr(collect, f"collect_{name}"))
        self.assertFalse(hasattr(collect._q, "GROK_AUTH"))
        self.assertFalse(hasattr(collect._q, "_grok_access_token"))

    def test_all_collectors_use_only_active_auth_and_endpoints(self):
        responses = self.fake_vendors()
        self.legacy_cache()
        snap = collect.snapshot(force=True)
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["ok"] * 4)
        self.assertEqual([r["gauges"][0]["used_pct"] for r in snap["rails"] if r["gauges"]], [20, 30, 30, 20])
        agy = snap["rails"][3]
        self.assertEqual(agy["plan"], "Google AI Pro")
        self.assertEqual([(g["label"], g["used_pct"]) for g in agy["gauges"]],
                         [("5h Gemini", 20)])
        self.assertEqual(snap["rails"][1]["plan"], "ChatGPT Pro (prolite)")
        self.assertEqual(snap["rails"][1]["gauges"][0]["window"], "7d")
        self.assertTrue(snap["rails"][0]["gauges"][0]["active"])
        self.assertEqual({c.args[0] for c in self.http.call_args_list}, set(responses))
        self.assertEqual([c.args[0] for c in self.load.call_args_list],
                         [collect._q.CLAUDE_CREDS, collect._q.PI_AUTH, collect._q.CODEX_AUTH, collect._q.AGY_TOKEN])
        self.assertEqual(self.http.call_count, 5)
        wham_headers = [c.kwargs["headers"] for c in self.http.call_args_list
                        if c.args[0].endswith("/wham/usage")]
        self.assertEqual([(h["Authorization"], h["chatgpt-account-id"]) for h in wham_headers],
                         [("Bearer fake-codex", "fixture"),
                          ("Bearer fake-cli-work", "cli-work-fixture")])

    def test_codex_cli_never_reuses_pi_or_old_personal_cache(self):
        cache = self.legacy_cache()
        cache["codex"] = cache["pi-codex"]
        cache["codex-personal"] = cache.pop("codex-cli")
        snap = collect.snapshot(only={"codex-cli"})
        rail, = snap["rails"]
        self.assertEqual(rail["status"], "unavailable")
        self.assertEqual(rail["gauges"], [])
        self.load.assert_called_once_with(collect._q.CODEX_AUTH)
        self.http.assert_not_called()

    def test_expired_agy_token_is_not_refreshed_or_sent(self):
        self.fake_vendors()
        self.load.side_effect = lambda path: {"token": {
            "access_token": "fake-agy", "expiry": "2020-01-01T00:00:00.123456789+09:00"}}
        snap = collect.snapshot(only={"antigravity"}, force=True)
        rail = snap["rails"][0]
        self.assertEqual(rail["status"], "unavailable")
        self.assertIn("open agy", rail["reason"])
        self.http.assert_not_called()

    def test_legacy_cache_is_not_an_active_rail(self):
        snap = self.cached_snapshot()
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["ok", "stale", "stale", "ok"])
        self.assertEqual([r["gauges"] for r in snap["rails"]], [self.gauges] * 4)
        self.cache_save.assert_not_called()

    def test_retired_only_selector_does_not_load_auth_or_poll(self):
        self.legacy_cache()
        for name in RETIRED:
            self.assertEqual(collect.snapshot(only={name}, force=True)["rails"], [])
        self.load.assert_not_called()
        self.http.assert_not_called()
        self.cache_save.assert_not_called()

    def test_missing_credentials_isolated_to_active_rails(self):
        self.load.side_effect = FileNotFoundError(2, "missing", "fixture-auth.json")
        snap = collect.snapshot()
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["unavailable"] * 4)
        self.assertTrue(all("credential file missing" in r["reason"] for r in snap["rails"]))
        self.http.assert_not_called()

    def test_rate_limit_backoff_keeps_active_cached_numbers(self):
        import urllib.error
        self.legacy_cache()
        error = urllib.error.HTTPError("fixture", 429, "limited", {"Retry-After": "165"}, None)
        self.load.side_effect = error
        snap = collect.snapshot(force=True)
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["stale"] * 4)
        self.cache_save.assert_called_once()
        self.load.reset_mock()
        snap = collect.snapshot(force=True)
        self.assert_active(snap)
        self.assertTrue(all("not re-polled" in r["reason"] for r in snap["rails"]))
        self.load.assert_not_called()

    def test_plain_and_color_renderers_do_not_revive_cached_rail(self):
        snap = self.cached_snapshot()
        for color in (False, True):
            body = render.render_text(snap, color=color)
            for name in ACTIVE:
                self.assertIn(name, body)
            self.assert_retired_absent(body)
            self.assertIn("25%", body)
            self.assertIn("stale", body)

    def test_cli_json_and_text_use_active_snapshot(self):
        snap = self.cached_snapshot()
        for args in (["quota.py"], ["quota.py", "--json"]):
            out = io.StringIO()
            with patch.object(collect, "snapshot", return_value=snap), contextlib.redirect_stdout(out):
                self.assertEqual(quota.main(args), 0)
            if "--json" in args:
                self.assert_active(json.loads(out.getvalue()))
            self.assert_retired_absent(out.getvalue())
            for name in ACTIVE:
                self.assertIn(name, out.getvalue())

    def test_watch_uses_active_snapshot(self):
        snap = self.cached_snapshot()
        out = io.StringIO()
        with patch.object(collect, "snapshot", return_value=snap), \
                patch.object(quota.time, "sleep", side_effect=KeyboardInterrupt), \
                contextlib.redirect_stdout(out):
            quota.watch(120)
        for name in ACTIVE:
            self.assertIn(name, out.getvalue())
        self.assert_retired_absent(out.getvalue())
        self.assertIn("\033[?25h", out.getvalue())  # cursor restored

    def test_web_snapshot_and_ttl_ignore_legacy_rail_cache(self):
        self.legacy_cache()
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(serve, "STATE_DIR", directory), \
                patch.object(serve, "LAST", str(Path(directory) / "last.json")), \
                patch.object(serve, "_cache", {"snap": None, "at": 0.0}):
            snap = serve.get_snapshot(300)
            self.assert_active(snap)
            self.assert_active(json.loads((Path(directory) / "last.json").read_text()))
            with patch.object(collect, "snapshot", side_effect=AssertionError("TTL re-poll")):
                self.assertIs(serve.get_snapshot(300), snap)
            handler = object.__new__(serve.Handler)
            handler._send = Mock()
            for path in ("/api/snapshot.json", "/api/text"):
                handler.path = path
                handler.do_GET()
                status, _, body = handler._send.call_args.args
                self.assertEqual(status, 200)
                self.assert_retired_absent(body)
                for name in ACTIVE:
                    self.assertIn(name.encode(), body)
            # The browser draws precisely the JSON snapshot's rail array.
            self.assertIn("rails.innerHTML=snap.rails.map", serve.PAGE)


if __name__ == "__main__":
    unittest.main()
