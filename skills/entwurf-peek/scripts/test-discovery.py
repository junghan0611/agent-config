#!/usr/bin/env python3
"""test-discovery — deterministic gate for entwurf-peek's 0.9.0 garden-native
session discovery. No real ~/.pi; synthetic JSONL fixtures in a temp dir.

Locks the post-0.9.0 contract (the `*_entwurf-<taskId>.jsonl` filename species
is gone): "is this an Entwurf session?" = the session NAME's `entwurf` tag, the
resident `--entwurf-control` session = the `control` tag, child discovery from a
parent = the spawn result's `Session ID: <garden-id>` line.

Run: python3 test-discovery.py   (exit 0 = all pass)
"""

import importlib.util
import json
import pathlib
import shutil
import sys
import tempfile

_spec = importlib.util.spec_from_file_location("entwurf_peek", pathlib.Path(__file__).with_name("entwurf-peek.py"))
ep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ep)

_n = 0
_fail = 0


def check(label, got, exp):
    global _n, _fail
    _n += 1
    if got == exp:
        print(f"  PASS  {label}")
    else:
        _fail += 1
        print(f"  FAIL  {label} -> {got!r} (expected {exp!r})")


def write(d, fn, header_id, name, extra_lines=None):
    lines = [
        json.dumps({"type": "session", "version": 3, "id": header_id, "cwd": "/home/junghan/x"}),
        json.dumps({"type": "model_change", "provider": "pi-shell-acp", "modelId": "claude-sonnet-4-6"}),
    ]
    if name:
        lines.append(json.dumps({"type": "session_info", "name": name}))
    lines.extend(extra_lines or [])
    p = d / fn
    p.write_text("\n".join(lines) + "\n")
    return p


def main():
    d = pathlib.Path(tempfile.mkdtemp(prefix="entwurf-peek-test-"))
    try:
        child = write(
            d,
            "2026-06-04T00-00-00-000Z_20260604T090000-aaaaaa.jsonl",
            "20260604T090000-aaaaaa",
            "20260604T090000-aaaaaa==pi-shell-acp/claude-sonnet-4-6--reply-ok-only__entwurf_async",
        )
        ctrl = write(
            d,
            "2026-06-04T00-01-00-000Z_20260604T090100-bbbbbb.jsonl",
            "20260604T090100-bbbbbb",
            "20260604T090100-bbbbbb==deepseek/deepseek-v4-pro--home__control",
        )
        plain = write(d, "2026-06-04T00-02-00-000Z_20260604T090200-cccccc.jsonl", "20260604T090200-cccccc", None)
        legacy = write(
            d,
            "2026-06-03T13-12-45-236Z_019e8d9d-6db4-7f8f-b743-3c80729a9f27.jsonl",
            "019e8d9d-6db4-7f8f-b743-3c80729a9f27",
            None,
        )
        parent = write(
            d,
            "2026-06-04T00-00-30-000Z_20260604T085900-ffffff.jsonl",
            "20260604T085900-ffffff",
            "20260604T085900-ffffff==deepseek/deepseek-v4-pro--home__control",
            extra_lines=[
                json.dumps(
                    {
                        "type": "message",
                        "timestamp": "2026-06-04T00:00:31Z",
                        "message": {
                            "role": "assistant",
                            "content": [{"type": "text", "text": "Spawned. Session ID: 20260604T090000-aaaaaa  PID: 1234"}],
                        },
                    }
                )
            ],
        )

        # name grammar → tags drive kind
        check("name tags: entwurf_async", ep.parse_session_name(ep.read_session_meta(child)["name"])["tags"], ["entwurf", "async"])
        check("name tags: control", ep.parse_session_name(ep.read_session_meta(ctrl)["name"])["tags"], ["control"])
        check("non-canonical name → None", ep.parse_session_name("just-a-uuid"), None)
        check("garden id validator", ep.is_garden_id("20260604T090000-aaaaaa"), True)
        check("uuid is not garden id", ep.is_garden_id("019e8d9d-6db4-7f8f-b743-3c80729a9f27"), False)

        # kind classification (name tag, NOT filename)
        check("child kind = entwurf", ep.read_session_meta(child)["kind"], "entwurf")
        check("resident kind = control", ep.read_session_meta(ctrl)["kind"], "control")
        check("named-less garden kind = plain", ep.read_session_meta(plain)["kind"], "plain")
        check("legacy uuid kind = plain", ep.read_session_meta(legacy)["kind"], "plain")

        # parse_filename: id from filename, kind from name, garden-aware short
        pf = ep.parse_filename(child)
        check("child id (sessionId from filename)", pf["id"], "20260604T090000-aaaaaa")
        check("child short (6-hex suffix)", pf["short"], "aaaaaa")
        check("child parse_filename kind", pf["kind"], "entwurf")
        check("legacy short (first 8 of uuid)", ep.parse_filename(legacy)["short"], "019e8d9d")

        # trace: child discovered from parent's "Session ID:" line (not "Task ID:")
        check(
            "find_child_entwurf_ids via Session ID",
            [cid for _, cid in ep.find_child_entwurf_ids(parent)],
            ["20260604T090000-aaaaaa"],
        )
        # the old "Task ID: <8hex>" form must NOT match (no back-compat)
        legacy_parent = write(
            d,
            "2026-06-04T00-00-40-000Z_20260604T085800-eeeeee.jsonl",
            "20260604T085800-eeeeee",
            "20260604T085800-eeeeee==deepseek/deepseek-v4-pro--home__control",
            extra_lines=[
                json.dumps(
                    {
                        "type": "message",
                        "timestamp": "2026-06-04T00:00:41Z",
                        "message": {"role": "assistant", "content": [{"type": "text", "text": "Task ID: ddb3cbb2"}]},
                    }
                )
            ],
        )
        check("legacy 'Task ID:' no longer matches", ep.find_child_entwurf_ids(legacy_parent), [])

        print(f"[test-discovery] {_n} checks, {_fail} failed")
        return 1 if _fail else 0
    finally:
        shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
