#!/usr/bin/env python3
"""test-discovery — deterministic gate for entwurf-peek's 0.9.0 garden-native
session discovery. No real ~/.pi; synthetic JSONL fixtures in a temp dir.

Locks the post-0.9.0 contract (the `*_entwurf-<taskId>.jsonl` filename species
is gone): lookup authority = JSONL header `id` (not filename suffix), "is this
an Entwurf session?" = the session NAME's `entwurf` tag, resident
`--entwurf-control` session = the `control` tag, child discovery from a parent =
the spawn result's `Session ID: <garden-id>` line.

Run: python3 test-discovery.py   (exit 0 = all pass)
"""

import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
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
        json.dumps({"type": "model_change", "provider": "entwurf", "modelId": "claude-sonnet-5"}),
    ]
    if name:
        lines.append(json.dumps({"type": "session_info", "name": name}))
    lines.extend(extra_lines or [])
    p = d / fn
    p.write_text("\n".join(lines) + "\n")
    return p


def write_record(d, gid, backend, native_id, transcript, model="openai-codex/gpt-5.6-sol",
                 filename=None, schema=3):
    p = d / (filename or f"{gid}.meta.json")
    p.write_text(json.dumps({
        "schemaVersion": schema,
        "gardenId": gid,
        "backend": backend,
        "nativeSessionId": native_id,
        "cwd": "/home/junghan/x",
        "model": model,
        "transcriptPath": str(transcript) if transcript else None,
        "createdAt": "2026-06-04T00:00:00.000Z",
        "recordUpdatedAt": "2026-06-04T00:00:00.000Z",
    }))
    return p


def main():
    d = pathlib.Path(tempfile.mkdtemp(prefix="entwurf-peek-test-"))
    # Every path that joins the two identity axes reads the record store, so no
    # test may fall through to the operator's real ~/.pi.
    records_dir = d / "meta-sessions"
    records_dir.mkdir()
    ep.RECORDS_DIR = records_dir
    try:
        child = write(
            d,
            "2026-06-04T00-00-00-000Z_20260604T090000-aaaaaa.jsonl",
            "20260604T090000-aaaaaa",
            "20260604T090000-aaaaaa==entwurf/claude-sonnet-5--reply-ok-only__entwurf_async",
        )
        ctrl = write(
            d,
            "2026-06-04T00-01-00-000Z_20260604T090100-bbbbbb.jsonl",
            "20260604T090100-bbbbbb",
            "20260604T090100-bbbbbb==deepseek/deepseek-v4-pro--home__control",
        )
        plain = write(d, "2026-06-04T00-02-00-000Z_20260604T090200-cccccc.jsonl", "20260604T090200-cccccc", None)
        spoof = write(
            d,
            "2026-06-04T00-03-00-000Z_20260604T090999-deadbe.jsonl",
            "20260604T091000-dddddd",
            "20260604T091000-dddddd==entwurf/claude-sonnet-5--header-authority__entwurf",
        )
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

        # parse_filename: id from JSONL header, kind from name, garden-aware short
        pf = ep.parse_filename(child)
        check("child id (sessionId from header)", pf["id"], "20260604T090000-aaaaaa")
        check("child short (6-hex suffix)", pf["short"], "aaaaaa")
        check("child parse_filename kind", pf["kind"], "entwurf")
        spoof_pf = ep.parse_filename(spoof)
        check("header id beats filename suffix", spoof_pf["id"], "20260604T091000-dddddd")
        check("filename suffix kept diagnostic only", spoof_pf["filename_id"], "20260604T090999-deadbe")
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

        # resolve_session follows entwurf's wrong-cwd duplicate footgun: header-id duplicates are ambiguous.
        old_sessions_dir = ep.SESSIONS_DIR
        sessions_base = d / "sessions"
        dir_a = sessions_base / "--tmp-a--"
        dir_b = sessions_base / "--tmp-b--"
        dir_a.mkdir(parents=True)
        dir_b.mkdir(parents=True)
        dup_id = "20260604T092000-eeeeee"
        write(dir_a, "2026-06-04T00-20-00-000Z_20260604T092000-eeeeee.jsonl", dup_id, None)
        write(dir_b, "renamed-without-id.jsonl", dup_id, None)
        ep.SESSIONS_DIR = sessions_base
        try:
            resolved, err = ep.resolve_session(dup_id)
            check("duplicate header id refuses exact resolve", resolved is None and "ambiguous" in (err or ""), True)
        finally:
            ep.SESSIONS_DIR = old_sessions_dir

        # ── record store: the ONLY join between garden id and native session id ──
        native = "019e8d9d-6db4-7f8f-b743-3c80729a9f27"
        gid_live = "20260604T093000-abcdef"
        write_record(records_dir, gid_live, "pi", native, legacy)
        write_record(records_dir, "20260604T093100-fedcba", "pi", "019e0000-0000-7000-8000-000000000000", None)
        write_record(records_dir, "20260604T093200-cc0001", "claude-code", "cc-native-1", None)

        check("record store reads all records", len(ep.read_records()), 3)
        check("garden id resolves to its transcript", ep.resolve_session(gid_live)[0], legacy)
        check("6-hex garden suffix resolves too", ep.resolve_session("abcdef")[0], legacy)
        check("record-less garden id does not resolve", ep.resolve_session("20260604T093100-fedcba")[0], None)
        check("transcript → owning record", ep.record_for_transcript(legacy)["gardenId"], gid_live)

        # live socket membership carries BOTH axes so a garden-id socket matches a
        # native-id session file.
        ep.find_active_sockets = lambda: {gid_live}
        check("live set carries garden id", gid_live in ep.live_session_ids(), True)
        check("live set carries native id", native in ep.live_session_ids(), True)

        # resume preconditions, read locally before offering the verb
        rec_ok = {"backend": "pi", "transcriptPath": str(legacy), "nativeSessionId": native}
        rec_no_transcript = {"backend": "pi", "transcriptPath": None, "nativeSessionId": native}
        rec_relative = {"backend": "pi", "transcriptPath": "sessions/x.jsonl", "nativeSessionId": native}
        rec_gone = {"backend": "pi", "transcriptPath": str(d / "not-here.jsonl"), "nativeSessionId": native}
        rec_foreign = {"backend": "pi", "transcriptPath": str(legacy), "nativeSessionId": "someone-else"}
        check("header id matches record → ok", ep.record_activity(rec_ok)["precheck"], "ok")
        check("no transcript names its own cause", ep.record_activity(rec_no_transcript)["precheck"], "no-transcript")
        check("relative path names its own cause", ep.record_activity(rec_relative)["precheck"], "relative-path")
        check("missing file names its own cause", ep.record_activity(rec_gone)["precheck"], "transcript-missing")
        check("foreign transcript names its own cause", ep.record_activity(rec_foreign)["precheck"], "foreign-transcript")
        # a foreign transcript's model/state must NOT be attached to this citizen
        foreign_act = ep.record_activity(rec_foreign)
        check("foreign transcript contributes no model", foreign_act["model"], None)
        check("foreign transcript contributes no state guess", "foreign" in foreign_act["state"], True)
        # backend-aware identity: a Claude transcript has no pi header, and that is
        # "we cannot read it with pi grammar", not "this is someone else's transcript"
        cc_file = d / "cc-session.jsonl"
        cc_file.write_text("\n".join([
            json.dumps({"type": "user", "sessionId": "cc-native-1", "timestamp": "2026-06-04T00:00:00Z",
                        "message": {"role": "user", "content": [{"type": "text", "text": "hi"}]}}),
            json.dumps({"type": "assistant", "sessionId": "cc-native-1", "timestamp": "2026-06-04T00:00:01Z",
                        "message": {"role": "assistant", "model": "claude-opus-5",
                                    "content": [{"type": "text", "text": "ho"}]}}),
        ]) + "\n")
        rec_cc = {"backend": "claude-code", "transcriptPath": str(cc_file), "nativeSessionId": "cc-native-1"}
        cc_act = ep.record_activity(rec_cc)
        check("claude transcript is not called foreign", cc_act["precheck"], "ok")
        check("claude model is read", cc_act["model"], "claude-opus-5")
        check("claude state is read", cc_act["state"], "waiting for user")
        cc_peek = ep.extract_peek_data_claude(cc_file, 4, 4, False)
        check("claude peek reads messages", [m["text"] for m in cc_peek["messages"]], ["hi", "ho"])
        check("claude peek reads state", cc_peek["current_state"], "waiting for user")

        # verbs are a list of what is possible, never a dispatch decision
        check("alive → send", ep.verbs_for("alive", "pi", "ok"), "send")
        check("dormant pi with transcript → resume|fresh", ep.verbs_for("dormant", "pi", "ok"), "resume | fresh")
        check("dormant pi without transcript → fresh only",
              "resume" not in ep.verbs_for("dormant", "pi", "no-transcript").split("(")[0], True)
        check("unprobed backend never offers resume",
              "resume" in ep.verbs_for("unprobed", "claude-code", "ok"), False)
        check("unprobed self-fetch points to full owner facts",
              "entwurf peer-facts" in ep.verbs_for("unprobed", "claude-code", "ok"), True)
        check("unprobed native-push does not advertise send?",
              "send?" in ep.verbs_for("unprobed", "codex", "identity-unverified"), False)
        # each blocked precheck names ITS OWN cause; lumping them is a false reason
        reasons = {ep.verbs_for("dormant", "pi", r) for r in ep.PRECHECK_BLOCKED}
        check("blocked reasons are distinct", len(reasons), len(ep.PRECHECK_BLOCKED))

        # ── active-store certification: defects leave the citizen list ──
        cert_dir = d / "cert-store"
        cert_dir.mkdir()
        ep.RECORDS_DIR = cert_dir
        good = "20260604T100000-000001"
        write_record(cert_dir, good, "pi", "native-good", legacy)
        write_record(cert_dir, "20260604T100100-000002", "pi", "native-b", None, schema=2)
        write_record(cert_dir, "20260604T100200-000003", "pi", "native-c", None,
                     filename="20260604T100200-999999.meta.json")
        write_record(cert_dir, "20260604T100300-000004", "pi", "shared-native", None)
        write_record(cert_dir, "20260604T100400-000005", "pi", "shared-native", None)
        (cert_dir / "20260604T100500-000006.meta.json").symlink_to(cert_dir / f"{good}.meta.json")

        kept, defects = ep.certify_records()
        kept_ids = {r["gardenId"] for r in kept}
        check("certified store keeps only the clean record", kept_ids, {good})
        check("old schema is a defect", any("schemaVersion" in x for x in defects), True)
        check("filename drift is a defect", any("파일명이 어긋난다" in x for x in defects), True)
        check("symlink is refused, never followed", any("symlink" in x for x in defects), True)
        check("duplicate nativeSessionId is a defect", any("one-to-one" in x for x in defects), True)
        check("duplicate claimants both drop out",
              {"20260604T100300-000004", "20260604T100400-000005"} & kept_ids, set())

        # a record excluded by certification must not be reachable as a citizen either
        check("defective record does not resolve as a garden id",
              ep.resolve_session("20260604T100300-000004")[0], None)

        # full v3 parse — a version number is not the contract (meta-session.ts:359-397)
        def parse_defect(body, filename="20260604T110000-aaaaaa.meta.json"):
            f = cert_dir / filename
            f.write_text(body if isinstance(body, str) else json.dumps(body))
            try:
                _kept, ds = ep.certify_records()
                return next((x for x in ds if x.startswith(filename)), None)
            finally:
                f.unlink()

        base = {"schemaVersion": 3, "gardenId": "20260604T110000-aaaaaa", "backend": "pi",
                "nativeSessionId": "n1", "cwd": "/x", "model": None, "transcriptPath": None,
                "createdAt": "t", "recordUpdatedAt": "t"}
        check("well-formed v3 record has no defect", parse_defect(base), None)

        # Entwurf #147: V3 gains one nullable arm revision, NOT a new identity.
        # An omitted field normalizes to null; present values are exact lower hex.
        parsed_old, old_err = ep.parse_record_v3(json.dumps(base))
        check("absent attachIncarnation normalizes to null without changing identity",
              (parsed_old, old_err), ({**base, "attachIncarnation": None}, None))
        incarnation = "0123456789abcdef0123456789abcdef"
        for label, value in (("null", None), ("32 lower hex", incarnation)):
            body = {**base, "attachIncarnation": value}
            parsed_arm, arm_err = ep.parse_record_v3(json.dumps(body))
            check(f"attachIncarnation accepts {label} and preserves the record",
                  (parsed_arm, arm_err), (body, None))
            check(f"store certifies attachIncarnation {label}", parse_defect(body), None)
        for backend in ep.META_CITIZEN_BACKENDS:
            body = {**base, "backend": backend, "attachIncarnation": incarnation}
            check(f"attachIncarnation is a schema field for {backend}, not a rail gate",
                  ep.parse_record_v3(json.dumps(body)), (body, None))
        invalid_incarnations = (
            ("uppercase", "ABCDEF0123456789ABCDEF0123456789"),
            ("31 chars", "a" * 31), ("33 chars", "a" * 33),
            ("trailing newline", "a" * 32 + "\n"),
            ("trailing CRLF", "a" * 32 + "\r\n"),
            ("leading space", " " + "a" * 32),
            ("non-hex", "g" * 32), ("unicode digits", "０" * 32),
            ("empty", ""), ("true", True), ("false", False),
            ("number", 0), ("float", 1.5), ("array", []), ("object", {}),
        )
        for label, value in invalid_incarnations:
            parsed_bad, bad_err = ep.parse_record_v3(json.dumps({**base, "attachIncarnation": value}))
            check(f"attachIncarnation refuses {label} with a field-specific defect",
                  (parsed_bad, bool(bad_err and "attachIncarnation" in bad_err)), (None, True))
        check("known attachIncarnation does not permit other unknown keys",
              "stray" in (parse_defect({**base, "attachIncarnation": incarnation, "stray": 1}) or ""), True)
        check("omp is a certified v3 citizen", parse_defect({**base, "backend": "omp"}), None)
        check("missing nativeSessionId is a defect",
              "nativeSessionId" in (parse_defect({**base, "nativeSessionId": ""}) or ""), True)
        check("bogus backend is a defect",
              "backend" in (parse_defect({**base, "backend": "bogus"}) or ""), True)
        check("stray key is a defect", "stray" in (parse_defect({**base, "stray": 1}) or ""), True)
        check("bad garden-id grammar is a defect",
              "gardenId" in (parse_defect({**base, "gardenId": "not-a-garden-id"},
                                          filename="not-a-garden-id.meta.json") or ""), True)
        check("wrong-typed cwd is a defect", "cwd" in (parse_defect({**base, "cwd": 3}) or ""), True)
        check("wrong-typed model is a defect", "model" in (parse_defect({**base, "model": 7}) or ""), True)
        # invalid UTF-8 must be a diagnostic, never a crash
        bad = cert_dir / "20260604T110100-bbbbbb.meta.json"
        bad.write_bytes(b'{"schemaVersion":3,\xff}')
        kept_u, defects_u = ep.certify_records()
        check("invalid UTF-8 is a defect, not a crash", any("UTF-8" in x for x in defects_u), True)
        bad.unlink()

        # a schema-invalid rival must NOT drag a healthy record out as a duplicate:
        # the parser drops it first, so it never reaches the uniqueness check.
        rival = cert_dir / "20260604T110200-cccccc.meta.json"
        rival.write_text(json.dumps({"schemaVersion": 3, "gardenId": "20260604T110200-cccccc",
                                     "backend": "bogus", "nativeSessionId": "native-good",
                                     "cwd": "/x", "model": None, "transcriptPath": None,
                                     "createdAt": "t", "recordUpdatedAt": "t", "stray": "foreign"}))
        kept_r = {r["gardenId"] for r in ep.certify_records()[0]}
        check("schema-invalid rival does not quarantine the healthy record", good in kept_r, True)
        rival.unlink()

        # Malformed arm revisions must be dropped BEFORE native-id uniqueness.
        # Conversely a valid revision must never hide a real identity duplicate.
        arm_rival = {**base, "gardenId": "20260604T110200-cccccc",
                     "nativeSessionId": "native-good"}
        for label, value in invalid_incarnations:
            rival.write_text(json.dumps({**arm_rival, "attachIncarnation": value}))
            arm_kept, arm_defects = ep.certify_records()
            check(f"invalid arm rival ({label}) cannot quarantine the healthy citizen",
                  (good in {r["gardenId"] for r in arm_kept},
                   any(x.startswith(rival.name) and "attachIncarnation" in x for x in arm_defects)),
                  (True, True))
        rival.write_text(json.dumps({**arm_rival, "attachIncarnation": incarnation}))
        arm_kept, arm_defects = ep.certify_records()
        check("valid arm revision does not bypass native-id uniqueness",
              ({good, arm_rival["gardenId"]} & {r["gardenId"] for r in arm_kept},
               any("one-to-one" in x for x in arm_defects)), (set(), True))
        rival.unlink()

        # two records claiming one transcript → no owner is picked
        write_record(cert_dir, "20260604T100600-000007", "pi", "native-rival", legacy)
        check("rival transcript claimants → no silent winner", ep.record_for_transcript(legacy), None)
        # …and the garden selector still carries its own record, so peek keeps identity
        path_sel, rec_sel, _err = ep.resolve_session_ctx(good)
        check("garden selector carries its record", (path_sel, rec_sel["gardenId"]), (legacy, good))

        # "we cannot read it" is not "it belongs to someone else"
        unsupported = {"backend": "antigravity", "transcriptPath": str(legacy), "nativeSessionId": native}
        check("unsupported backend is not called foreign",
              ep.record_activity(unsupported)["precheck"], "identity-unverified")
        check("unsupported backend contributes no state guess",
              ep.record_activity(unsupported)["model"], None)
        omp = {"backend": "omp", "transcriptPath": str(legacy), "nativeSessionId": native}
        check("omp transcript shares pi grammar", ep.record_activity(omp)["precheck"], "ok")
        empty_tail = d / "no-identity.jsonl"
        empty_tail.write_text(json.dumps({"type": "user", "message": {"role": "user", "content": "x"}}) + "\n")
        unknown = {"backend": "claude-code", "transcriptPath": str(empty_tail), "nativeSessionId": "cc-x"}
        check("unreadable identity is not called foreign",
              ep.record_activity(unknown)["precheck"], "identity-unverified")
        check("mismatch alone earns the foreign verdict",
              ep.record_activity({"backend": "pi", "transcriptPath": str(legacy),
                                  "nativeSessionId": "someone-else"})["precheck"], "foreign-transcript")

        # ── CLI-level owner gate: `peek <garden-id>` must not out-trust `situation` ──
        # A garden selector carries the record's authority. If peek falls through to the
        # file axis it reads bytes the record never vouched for — and a relative
        # transcriptPath that happens to exist in the caller's cwd is exactly that.
        cli = pathlib.Path(__file__).with_name("entwurf-peek.py")
        gate_store = d / "gate-store"
        gate_store.mkdir()
        gate_cwd = d / "gate-cwd"
        gate_cwd.mkdir()
        (gate_cwd / "victim.jsonl").write_text(
            json.dumps({"type": "session", "id": "someone-else", "cwd": "/x"}) + "\n")

        def gate_record(gid, backend, native, transcript):
            (gate_store / f"{gid}.meta.json").write_text(json.dumps({
                "schemaVersion": 3, "gardenId": gid, "backend": backend,
                "nativeSessionId": native, "cwd": "/x", "model": "m",
                "transcriptPath": transcript, "createdAt": "t", "recordUpdatedAt": "t"}))

        def run_peek(gid):
            env = dict(os.environ, ENTWURF_META_SESSIONS_DIR=str(gate_store))
            return subprocess.run([sys.executable, str(cli), "peek", gid],
                                  cwd=gate_cwd, env=env, capture_output=True, text=True)

        gate_record("20260604T120000-aaaaaa", "pi", "n-rel", "victim.jsonl")
        rel = run_peek("20260604T120000-aaaaaa")
        check("relative transcriptPath refuses instead of reading cwd bytes",
              (rel.returncode, "relative" in rel.stderr), (1, True))
        check("relative case leaks no transcript body", rel.stdout.strip(), "")

        gate_record("20260604T120100-bbbbbb", "pi", "n-gone", str(d / "gone.jsonl"))
        missing = run_peek("20260604T120100-bbbbbb")
        check("missing transcript refuses", (missing.returncode, "디스크에 없다" in missing.stderr), (1, True))

        gate_record("20260604T120200-cccccc", "pi", "n-none", None)
        none_t = run_peek("20260604T120200-cccccc")
        check("no transcript refuses", (none_t.returncode, "transcriptPath 없음" in none_t.stderr), (1, True))

        gate_record("20260604T120300-dddddd", "antigravity", "n-agy", str(legacy))
        unsup = run_peek("20260604T120300-dddddd")
        check("unsupported backend prints identity, not body",
              ("문법을 이 스킬이 모른다" in unsup.stdout, "messages" in unsup.stdout), (True, False))

        gate_record("20260604T120400-eeeeee", "pi", "n-mismatch", str(legacy))
        mism = run_peek("20260604T120400-eeeeee")
        check("mismatch prints identity, not body",
              ("native id와 다르다" in mism.stdout, "💬" in mism.stdout), (True, False))

        # ── pi-durable: transcript 없는 레일을 "첫 turn 전"으로 둔갑시키지 않는다 ──
        # 월 단위로 사는 시민이 가장 어린 시민으로 보고되는 실패를 고정한다.
        drec = {
            "schemaVersion": 3,
            "gardenId": "20261006T080634-a269da",
            "backend": "pi-durable",
            "nativeSessionId": "1791241594264-745a3c3d-e467-4eff-8dc7-45635d306324",
            "cwd": "/home/junghan/repos/gh/entwurf",
            "model": None,
            "transcriptPath": None,
            "createdAt": "2026-10-06T08:06:34.000Z",
            "recordUpdatedAt": "2026-10-06T08:06:34.000Z",
        }
        parsed, perr = ep.parse_record_v3(json.dumps(drec))
        check("pi-durable record certifies (entwurf enum mirror)",
              (parsed is not None, perr), (True, None))
        check("unknown backend still refused",
              ep.parse_record_v3(json.dumps({**drec, "backend": "pi-eternal"}))[0], None)

        dact = ep.record_activity(drec)
        check("durable state is named, not '첫 turn 전'",
              ("durable native store" in dact["state"], "첫 turn" in dact["state"]),
              (True, False))
        check("durable precheck is its own reason",
              dact["precheck"], "durable-native-store")
        check("durable reason is spelled out",
              "durable-native-store" in ep.PRECHECK_BLOCKED, True)
        check("durable store path = bucket(sha256 realpath cwd)[:24]/nativeSessionId",
              str(ep.durable_store_path(drec)).endswith(
                  "durable-sessions/f42d1f975f08a6e05e922e1f/"
                  "1791241594264-745a3c3d-e467-4eff-8dc7-45635d306324/session.sqlite"), True)
        check("durable path deriver needs both cwd and nativeSessionId",
              ep.durable_store_path({**drec, "cwd": ""}), None)
        check("pi with no transcript keeps the old reason",
              ep.record_activity({**drec, "backend": "pi"})["precheck"], "no-transcript")
        check("unprobed durable points to owner facts, not send or resume",
              ep.verbs_for("unprobed", "pi-durable", "durable-native-store"),
              "unverified — inspect with entwurf peer-facts")

        # ── durable 활동 = max(db, -wal) mtime. -shm은 읽기에도 움직이므로 세지 않는다 ──
        import time as _time
        now = _time.time()
        old, fresh = now - 10 * 86400, now - 60
        act_dir = d / "durable-activity"
        act_dir.mkdir()
        db = act_dir / "session.sqlite"
        db.write_bytes(b"")
        os.utime(db, (old, old))
        check("db only → db mtime, source db", ep.durable_store_activity(db), (old, "db"))
        wal = act_dir / "session.sqlite-wal"
        wal.write_bytes(b"")
        os.utime(wal, (fresh, fresh))
        check("old db + fresh wal → wal wins (checkpoint lag)", ep.durable_store_activity(db), (fresh, "wal"))
        shm = act_dir / "session.sqlite-shm"
        shm.write_bytes(b"")
        os.utime(shm, (now, now))
        check("newer -shm is ignored (reads move it)", ep.durable_store_activity(db), (fresh, "wal"))
        wal.unlink()
        check("closed session (no -wal) is normal, not a crash", ep.durable_store_activity(db), (old, "db"))
        wal.mkdir()
        check("-wal that is not a regular file is ignored", ep.durable_store_activity(db), (old, "db"))
        check("no store at all → (None, None)",
              ep.durable_store_activity(act_dir / "nope" / "session.sqlite"), (None, None))

        # ── CLI: 최근 창은 그대로, `--durable`은 since·limit 없이 모든 리포의 durable ──
        # 소유 temp HOME — durable store root, control dir, record store 전부 그 안에 있다.
        home = d / "home"
        agent = home / ".pi" / "agent"
        store_dir = agent / "meta-sessions"
        store_dir.mkdir(parents=True)
        repo_a = d / "repo-a"
        repo_b = d / "homerepo-b"
        repo_a.mkdir()
        repo_b.mkdir()

        def iso(t):
            return _time.strftime("%Y-%m-%dT%H:%M:%S.000Z", _time.gmtime(t))

        def cli_record(gid, backend, cwd, updated, native=None, store=None):
            ((store or store_dir) / f"{gid}.meta.json").write_text(json.dumps({
                "schemaVersion": 3, "gardenId": gid, "backend": backend,
                "nativeSessionId": native or f"native-{gid}", "cwd": str(cwd), "model": None,
                "transcriptPath": None, "createdAt": iso(updated), "recordUpdatedAt": iso(updated)}))

        def durable_store(gid, cwd, db_t, wal_t=None, agent_dir=None):
            import hashlib
            bucket = hashlib.sha256(os.path.realpath(cwd).encode()).hexdigest()[:24]
            sdir = (agent_dir or agent) / "experimental" / "durable-sessions" / bucket / f"native-{gid}"
            sdir.mkdir(parents=True)
            (sdir / "session.sqlite").write_bytes(b"")
            os.utime(sdir / "session.sqlite", (db_t, db_t))
            if wal_t is not None:
                (sdir / "session.sqlite-wal").write_bytes(b"")
                os.utime(sdir / "session.sqlite-wal", (wal_t, wal_t))

        d_old = "20261001T000000-d0d001"      # 장수 시민: 열흘 전 마지막 쓰기, -wal 없음
        d_lag = "20261007T000000-d0d002"      # checkpoint 지연: 본체 열흘 전, -wal 방금
        cli_record(d_old, "pi-durable", repo_a, old)
        durable_store(d_old, repo_a, old)
        cli_record(d_lag, "pi-durable", repo_b, old)
        durable_store(d_lag, repo_b, old, fresh)
        p_old = "20261002T000000-01d01d"
        cli_record(p_old, "pi", repo_a, old)
        for i in range(25):                   # 기본 limit 24를 채우는 최근 pi 시민들
            cli_record(f"20261013T{i:06d}-aaa{i:03d}", "pi", repo_a, now - 120 - i)

        def run_sit(*argv, at=None):
            h, s = at or (home, store_dir)
            env = {k: v for k, v in os.environ.items() if k not in ("PI_CODING_AGENT_DIR",)}
            env.update(HOME=str(h), ENTWURF_META_SESSIONS_DIR=str(s))
            return subprocess.run([sys.executable, str(cli), "situation", *argv],
                                  env=env, capture_output=True, text=True)

        def sit_json(*argv, at=None):
            out = run_sit("--json", *argv, at=at)
            return json.loads(out.stdout) if out.returncode == 0 else {"rc": out.returncode, "err": out.stderr}

        base_keys = {"gid", "backend", "cwd", "liveness", "model", "model_source", "state",
                     "mtime", "status", "precheck", "verbs", "is_self"}
        dflt = sit_json()
        dflt_ids = {r["gid"] for r in dflt["rows"]}
        check("default window keeps its limit 24", len(dflt["rows"]), 24)
        check("default rows keep every pre-existing key", all(base_keys <= set(r) for r in dflt["rows"]), True)
        check("synthetic store certifies clean (no defect hides a row)", dflt["store_defects"], [])
        check("default window still drops an old pi citizen", p_old in dflt_ids, False)
        check("…by the since filter: -a admits that same old pi citizen",
              p_old in {r["gid"] for r in sit_json("-a", "--limit", "200")["rows"]}, True)
        check("default window still drops an old durable", d_old in dflt_ids, False)
        dflt_all = sit_json("--limit", "200")
        check("old db + fresh wal durable is in the default since window",
              d_lag in {r["gid"] for r in dflt_all["rows"]}, True)
        lag_row = next(r for r in dflt_all["rows"] if r["gid"] == d_lag)
        check("its activity names the wal", lag_row["activity_source"], "wal")
        check("durable counts: total store-wide, shown = this table",
              (dflt_all["durable"]["total"], dflt_all["durable"]["shown"]), (2, 1))

        dur = sit_json("--durable")
        check("--durable lists every durable regardless of age and default limit",
              {r["gid"] for r in dur["rows"]}, {d_old, d_lag})
        check("--durable role is unknown, never inferred", {r["role"] for r in dur["rows"]}, {None})
        check("--durable row for a closed session reads db",
              next(r for r in dur["rows"] if r["gid"] == d_old)["activity_source"], "db")
        check("--durable -p narrows to that repo (partial match contract kept)",
              {r["gid"] for r in sit_json("--durable", "-p", "repo-a")["rows"]}, {d_old})
        check("--durable -p substring still matches homerepo-b",
              {r["gid"] for r in sit_json("--durable", "-p", "repo-b")["rows"]}, {d_lag})
        check("--durable with explicit --since is honored",
              {r["gid"] for r in sit_json("--durable", "--since", "3600")["rows"]}, {d_lag})
        check("--durable with explicit --limit is honored", len(sit_json("--durable", "--limit", "1")["rows"]), 1)

        txt = run_sit("-p", "repo-a").stdout
        bridge = next((ln for ln in txt.splitlines() if "장수 시민(pi-durable)" in ln), "")
        check("default text carries the bridge with store-wide total", "전체 2" in bridge, True)
        check("bridge scopes -p separately", "-p repo-a: 1" in bridge, True)
        check("bridge command has no -p", bridge.rstrip().endswith("situation --durable"), True)
        check("default footer directs live-target lookup to full owner facts",
              "Live-target lookup: entwurf peer-facts" in txt, True)
        dtxt = run_sit("--durable").stdout
        check("--durable text says role is unknown", "담당 역할: 알 수 없음" in dtxt, True)
        check("--durable text does not call file mtime online",
              "online도, 마지막 대화 시각도 아니다" in dtxt, True)
        check("durable footer exits the truncated-list dead end",
              "Durable receiver status: entwurf peer-facts" in dtxt, True)

        # ── 기본 limit 24를 넘는 durable 무리: --durable은 전부, 명시 limit은 자른다 ──
        # 그리고 헤더는 실효 창을 적는다 — 잘린 표를 「limit 무관」이라 적으면 전부로 읽힌다.
        home2 = d / "home2"
        agent2 = home2 / ".pi" / "agent"
        store2 = agent2 / "meta-sessions"
        store2.mkdir(parents=True)
        many = [f"20261001T{i:06d}-dd{i:04d}" for i in range(26)]
        for i, gid in enumerate(many):
            cwd_i = d / f"many-repo-{i:02d}"
            cwd_i.mkdir()
            cli_record(gid, "pi-durable", cwd_i, old - i, store=store2)
            durable_store(gid, cwd_i, old - i, agent_dir=agent2)
        at2 = (home2, store2)
        many_rows = sit_json("--durable", at=at2)["rows"]
        check("--durable lists all 26 durables past the default limit 24",
              {r["gid"] for r in many_rows}, set(many))
        check("--durable explicit --limit 1 trims to 1", len(sit_json("--durable", "--limit", "1", at=at2)["rows"]), 1)

        def header(*argv):
            return run_sit(*argv, at=at2).stdout.splitlines()[0]
        check("header: --durable has no since and no limit",
              header("--durable"), "═══ durable citizens  26 of 26 · since 없음 · limit 없음 ═══")
        check("header: explicit limit is shown, not called 무관",
              header("--durable", "--limit", "1"), "═══ durable citizens  1 of 26 · since 없음 · limit 1 ═══")
        check("header: -a lifts since only, limit still shown",
              header("--durable", "-a", "--limit", "1"),
              "═══ durable citizens  1 of 26 · since 무관 (-a) · limit 1 ═══")
        none_recent = run_sit("--durable", "--since", "3600", at=at2)
        check("empty --durable window names its effective since and limit",
              (none_recent.returncode, "since 3600s · limit 없음" in none_recent.stderr), (1, True))
        dflt2 = run_sit(at=at2)
        check("default window over only-old durables still bridges to all of them",
              (dflt2.returncode, "전체 26 · 이 표 0" in dflt2.stderr), (1, True))

        print(f"[test-discovery] {_n} checks, {_fail} failed")
        return 1 if _fail else 0
    finally:
        shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
