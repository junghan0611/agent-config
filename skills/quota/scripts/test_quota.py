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


ACTIVE = ["claude", "codex", "grok"]


class QuotaTests(unittest.TestCase):
    def setUp(self):
        # Fail closed if any test accidentally reaches real auth, cache or HTTP.
        self.load = self.enterContext(patch.object(
            collect._q, "_load_json", side_effect=AssertionError("real auth read")))
        self.http = self.enterContext(patch.object(
            collect._q, "_get", side_effect=AssertionError("real vendor request")))
        self.enterContext(patch("urllib.request.urlopen", side_effect=AssertionError("network")))
        self.grok = self.enterContext(patch.object(
            collect._q, "_grok_access_token", side_effect=AssertionError("real Grok auth")))
        self.persist = self.enterContext(patch.object(
            collect._q, "_grok_persist_auth", side_effect=AssertionError("real auth write")))
        self.cache_load = self.enterContext(patch.object(collect, "_cache_load", return_value={}))
        self.cache_save = self.enterContext(patch.object(collect, "_cache_save"))
        self.now = datetime.datetime.now(collect.KST)
        reset = (self.now + datetime.timedelta(days=2)).isoformat()
        self.gauges = [collect.gauge("weekly", "weekly", 25, resets_at=reset, window="7d")]

    def legacy_cache(self):
        entry = {"ts": self.now.isoformat(), "plan": "fixture", "gauges": self.gauges}
        cache = {name: copy.deepcopy(entry) for name in ACTIVE}
        cache["zai"] = {**copy.deepcopy(entry), "plan": "retired-marker"}
        self.cache_load.return_value = cache
        return cache

    def cached_snapshot(self):
        self.legacy_cache()
        # Existing Claude interval guard plus failed Codex/Grok polls exercises
        # both the fresh-cache and stale-fallback paths without real IO.
        return collect.snapshot()

    def assert_active(self, snap):
        self.assertEqual([r["rail"] for r in snap["rails"]], ACTIVE)
        self.assertNotIn("zai", json.dumps(snap))
        self.assertNotIn("retired-marker", json.dumps(snap))

    def fake_vendors(self):
        auth = {
            collect._q.PI_AUTH: {"openai-codex": {"access": "fake-codex", "accountId": "fixture"}},
            collect._q.CLAUDE_CREDS: {"claudeAiOauth": {"accessToken": "fake-claude"}},
        }
        self.load.side_effect = lambda path: auth[path]
        self.grok.side_effect = None
        self.grok.return_value = ("fake-grok", {}, "scope", {})
        end = (self.now + datetime.timedelta(days=2)).isoformat()
        responses = {
            "https://api.anthropic.com/api/oauth/usage": {"limits": [
                {"kind": "weekly_all", "percent": 20, "resets_at": end, "is_active": True}]},
            "https://chatgpt.com/backend-api/wham/usage": {
                "plan_type": "prolite", "rate_limit": {"primary_window": {
                    "limit_window_seconds": 604800, "used_percent": 30,
                    "reset_at": int((self.now + datetime.timedelta(days=2)).timestamp())}}},
            "https://cli-chat-proxy.grok.com/v1/billing?format=credits": {"config": {
                "creditUsagePercent": 40, "currentPeriod": {
                    "start": (self.now - datetime.timedelta(days=5)).isoformat(), "end": end}}},
        }

        def get(url, headers):
            self.assertIn(url, responses)
            return None, json.dumps(responses[url]).encode()

        self.http.side_effect = get
        return responses

    def test_active_registry_has_only_three_collectors(self):
        self.assertEqual([name for name, _ in collect.RAILS], ACTIVE)
        self.assertFalse(hasattr(collect, "collect_zai"))

    def test_all_collectors_use_only_active_auth_and_endpoints(self):
        responses = self.fake_vendors()
        self.legacy_cache()
        snap = collect.snapshot(force=True)
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["ok"] * 3)
        self.assertEqual([r["gauges"][0]["used_pct"] for r in snap["rails"]], [20, 30, 40])
        self.assertEqual(snap["rails"][1]["plan"], "ChatGPT Pro (prolite)")
        self.assertEqual(snap["rails"][1]["gauges"][0]["window"], "7d")
        self.assertTrue(snap["rails"][0]["gauges"][0]["active"])
        self.assertEqual(snap["rails"][2]["gauges"][0]["basis"], "period")
        self.assertEqual({c.args[0] for c in self.http.call_args_list}, set(responses))
        self.assertEqual([c.args[0] for c in self.load.call_args_list],
                         [collect._q.CLAUDE_CREDS, collect._q.PI_AUTH])
        self.assertEqual(self.http.call_count, 3)
        self.persist.assert_not_called()

    def test_legacy_cache_is_not_an_active_rail(self):
        snap = self.cached_snapshot()
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["ok", "stale", "stale"])
        self.assertEqual([r["gauges"] for r in snap["rails"]], [self.gauges] * 3)
        self.cache_save.assert_not_called()

    def test_retired_only_selector_does_not_load_auth_or_poll(self):
        self.legacy_cache()
        self.assertEqual(collect.snapshot(only={"zai"}, force=True)["rails"], [])
        self.load.assert_not_called()
        self.http.assert_not_called()
        self.grok.assert_not_called()
        self.cache_save.assert_not_called()

    def test_missing_credentials_isolated_to_active_rails(self):
        self.load.side_effect = FileNotFoundError(2, "missing", "fixture-auth.json")
        self.grok.side_effect = FileNotFoundError(2, "missing", "fixture-grok.json")
        snap = collect.snapshot()
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["unavailable"] * 3)
        self.assertTrue(all("credential file missing" in r["reason"] for r in snap["rails"]))
        self.http.assert_not_called()

    def test_rate_limit_backoff_keeps_active_cached_numbers(self):
        import urllib.error
        self.legacy_cache()
        error = urllib.error.HTTPError("fixture", 429, "limited", {"Retry-After": "165"}, None)
        self.load.side_effect = error
        self.grok.side_effect = error
        snap = collect.snapshot(force=True)
        self.assert_active(snap)
        self.assertEqual([r["status"] for r in snap["rails"]], ["stale"] * 3)
        self.cache_save.assert_called_once()
        self.load.reset_mock()
        self.grok.reset_mock()
        snap = collect.snapshot(force=True)
        self.assert_active(snap)
        self.assertTrue(all("not re-polled" in r["reason"] for r in snap["rails"]))
        self.load.assert_not_called()
        self.grok.assert_not_called()

    def test_plain_and_color_renderers_do_not_revive_cached_rail(self):
        snap = self.cached_snapshot()
        for color in (False, True):
            body = render.render_text(snap, color=color)
            for name in ACTIVE:
                self.assertIn(name, body)
            self.assertNotIn("zai", body)
            self.assertNotIn("retired-marker", body)
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
            self.assertNotIn("zai", out.getvalue())
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
        self.assertNotIn("zai", out.getvalue())
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
                self.assertNotIn(b"zai", body)
                for name in ACTIVE:
                    self.assertIn(name.encode(), body)
            # The browser draws precisely the JSON snapshot's rail array.
            self.assertIn("rails.innerHTML=snap.rails.map", serve.PAGE)

    def test_grok_401_refresh_behavior_preserved(self):
        import urllib.error
        responses = self.fake_vendors()
        self.http.side_effect = [
            urllib.error.HTTPError("fixture", 401, "expired", {}, None),
            (None, json.dumps(responses[
                "https://cli-chat-proxy.grok.com/v1/billing?format=credits"]).encode()),
        ]
        self.persist.side_effect = None
        with patch.object(collect._q, "_grok_refresh_oidc", return_value={"key": "refreshed"}) as refresh:
            result = collect.collect_grok()
        refresh.assert_called_once()
        self.persist.assert_called_once()
        self.assertEqual(result["gauges"][0]["used_pct"], 40)
        self.assertEqual(self.http.call_args.kwargs["headers"]["Authorization"], "Bearer refreshed")


if __name__ == "__main__":
    unittest.main()
