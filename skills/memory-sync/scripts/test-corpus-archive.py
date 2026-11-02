#!/usr/bin/env python3
"""Synthetic tests for corpus-archive.py (contract v2). Builds throwaway corpora under a temp dir; touches no real corpus.

Run: python3 -I skills/memory-sync/scripts/test-corpus-archive.py   (needs git, git-annex, bash and flock on PATH)
"""

import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, "corpus-archive.py")
P1 = "alpha/.claude/projects/-home-u-repos-x/00000000-0000-4000-8000-000000000001.jsonl"
P2 = "beta/.pi/agent/sessions/--home-u-repos-x--/2026-01-01T00-00-00-000Z_01900000-0000-7000-8000-000000000002.jsonl"
P3 = "beta/.pi/agent/experimental/durable-sessions/0123456789abcdef01234567/1767225600000-01900000-0000-7000-8000-000000000003/session.sqlite"
ATTRS = """*.jsonl annex.backend=SHA256E annex.largefiles=anything
session.sqlite annex.backend=SHA256E annex.largefiles=anything
/MANIFEST.json annex.largefiles=nothing
/MANIFEST.sha256 annex.largefiles=nothing
/CLAUDE.md annex.largefiles=nothing
/README.md annex.largefiles=nothing
/.gitattributes annex.largefiles=nothing
"""
GID = "20260101T000000-abcdef"


def sh(cwd, *args, check=True, data=None):
    p = subprocess.run(list(args), cwd=cwd, input=data, capture_output=True)
    if check and p.returncode != 0:
        raise AssertionError(f"{args} rc={p.returncode}: {p.stderr.decode()[-800:]}")
    return p.stdout.decode()


def write(root, rel, data):
    full = os.path.join(root, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)


def write_ledger(root, generated="2026-01-01T00:00:00+0000", extra=()):
    """Mimic the ledger shape (relpath -> sha256/size/mtimeMs + census); `extra` adds raw paths unchecked."""
    files = {}
    for dirpath, dirnames, names in os.walk(root):
        if dirpath == root:
            dirnames[:] = [d for d in dirnames if d != ".git"]
        for n in names:
            rel = os.path.relpath(os.path.join(dirpath, n), root)
            if n.endswith(".jsonl") or n == "session.sqlite":
                with open(os.path.join(root, rel), "rb") as f:
                    data = f.read()
                files[rel] = {"sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "mtimeMs": 0}
    for rel in extra:
        files[rel] = {"sha256": "0" * 64, "size": 1, "mtimeMs": 0}
    devices = {}
    for rel, v in files.items():
        d = devices.setdefault(rel.split("/", 1)[0], {"files": 0, "bytes": 0})
        d["files"] += 1
        d["bytes"] += v["size"]
    doc = {"generated": generated, "corpus": root, "algorithm": "sha256", "count": len(files),
           "bytes": sum(v["size"] for v in files.values()), "devices": devices, "files": dict(sorted(files.items()))}
    write(root, "MANIFEST.json", json.dumps(doc, indent=1).encode())
    write(root, "MANIFEST.sha256", "".join(f"{v['sha256']}  {k}\n" for k, v in sorted(files.items())).encode())


def init_repo(root, name, dotfiles="branch"):
    sh(root, "git", "init", "-q", "-b", "main", ".")
    sh(root, "git", "config", "user.name", "fixture")
    sh(root, "git", "config", "user.email", "fixture@invalid")
    sh(root, "git", "annex", "init", "-q", name)
    sh(root, "git", "config", "gc.pruneExpire", "never")
    sh(root, "git", "config", "gc.auto", "0")
    sh(root, "git", "config", "maintenance.auto", "false")
    if dotfiles == "branch":
        sh(root, "git", "annex", "config", "--set", "annex.dotfiles", "true")
    elif dotfiles == "local":
        sh(root, "git", "config", "annex.dotfiles", "true")


def fake_bin(root, fail_restore=False):
    """PATH dir whose git-annex really runs `add` and then exits 1 (a late failure after success records).
    With fail_restore it instead keeps add's exit code, appends one failed record (an ordinary admission
    failure) and arms a git wrapper that refuses the next `update-index` (the restore)."""
    real_annex, real_git = shutil.which("git-annex"), shutil.which("git")
    fb = os.path.join(root, "fakebin")
    os.makedirs(fb)
    mark = os.path.join(root, "refuse-update-index")
    late = (f'touch "{mark}"; echo \'{{"command":"add","file":"injected","success":false}}\'' if fail_restore
            else "exit 1")
    with open(os.path.join(fb, "git-annex"), "w") as f:
        f.write(f'#!/bin/sh\n"{real_annex}" "$@"; rc=$?\nif [ "$1" = add ]; then {late}; fi\nexit $rc\n')
    if fail_restore:
        with open(os.path.join(fb, "git"), "w") as f:
            f.write(f'#!/bin/sh\nfor a in "$@"; do if [ "$a" = update-index ] && [ -e "{mark}" ]; then '
                    f'echo "fixture: update-index refused" >&2; exit 1; fi; done\nexec "{real_git}" "$@"\n')
    for n in os.listdir(fb):
        os.chmod(os.path.join(fb, n), 0o755)
    return fb


def run(*args):
    p = subprocess.run([sys.executable, "-I", TOOL, *args], capture_output=True)
    return p.returncode, json.loads(p.stdout.decode() or "{}"), p.stderr.decode()


def run_with_fd(corpus, phase, *extra, lockfile=None, take=True):
    """Run the tool from bash with a really inherited descriptor, the way a shell caller would."""
    lockfile = lockfile or os.path.join(corpus, ".git", "corpus-custody.lock")
    take_cmd = 'flock -x "$L" || exit 99; ' if take else ""
    script = (f'exec {{L}}>>"$1"; {take_cmd}'
              f'exec "{sys.executable}" -I "{TOOL}" {phase} --corpus "$2" --lock-fd "$L" "${{@:3}}"')
    p = subprocess.run(["bash", "-c", script, "bash", lockfile, corpus, *extra], capture_output=True)
    return p.returncode, json.loads(p.stdout.decode() or "{}"), p.stderr.decode()


class CorpusArchiveTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="corpus-archive-test-")
        self.canon = os.path.join(self.tmp, "canon")
        os.makedirs(self.canon)
        write(self.canon, ".gitattributes", ATTRS.encode())
        write(self.canon, "README.md", b"synthetic corpus\n")
        write(self.canon, "CLAUDE.md", b"@AGENTS.md\n")
        write(self.canon, P1, b'{"n":1}\n' * 50)
        write(self.canon, P2, b'{"n":2}\n' * 70)
        write(self.canon, P3, os.urandom(4096))
        write_ledger(self.canon)
        init_repo(self.canon, "canon")
        self.git = lambda *a, **k: sh(self.canon, "git", *a, **k)

    def tearDown(self):
        sh(self.tmp, "chmod", "-R", "u+w", self.tmp, check=False)
        shutil.rmtree(self.tmp)

    def checkpoint(self, root=None, *extra):
        return run("checkpoint", "--corpus", root or self.canon, "--standalone", "--floor-bytes", "0", *extra)

    # --- preflight / protections
    def test_preflight_ready_and_protections(self):
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, out["result"]), (0, "ready"), out)
        self.git("config", "--unset", "gc.auto")
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, out["error"]), (10, "precondition"))

    def test_thin_is_read_as_a_git_boolean(self):
        for value, want in (("yes", 10), ("on", 10), ("1", 10), ("true", 10), ("bogus", 10), ("no", 0), ("0", 0), ("false", 0)):
            self.git("config", "annex.thin", value)
            rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
            self.assertEqual(rc, want, (value, out))
        self.git("config", "--unset", "annex.thin")
        self.assertEqual(run("preflight", "--corpus", self.canon, "--floor-bytes", "0")[0], 0)

    def test_maintenance_auto_is_a_required_local_git_false(self):
        pre = lambda: run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        for value, want in (("false", 0), ("off", 0), ("no", 0), ("0", 0), ("", 0),
                            ("true", 10), ("on", 10), ("yes", 10), ("1", 10), ("2", 10), ("bogus", 10)):
            self.git("config", "maintenance.auto", value)
            rc, out, _ = pre()
            self.assertEqual(rc, want, (value, out))
            if want:
                self.assertEqual(out["error"], "precondition", (value, out))
        self.git("config", "--unset", "maintenance.auto")
        self.assertEqual(pre()[0], 10)
        # false that does not live in the repository's own config is not the guard
        with mock.patch.dict(os.environ, {"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "maintenance.auto",
                                          "GIT_CONFIG_VALUE_0": "false"}):
            self.assertEqual(pre()[0], 10)
        # and a local false that something above it turns back on does not count either
        self.git("config", "maintenance.auto", "false")
        with mock.patch.dict(os.environ, {"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "maintenance.auto",
                                          "GIT_CONFIG_VALUE_0": "true"}):
            self.assertEqual(pre()[0], 10)
        self.assertEqual(pre()[0], 0)

    def test_checkpoint_refuses_without_maintenance_guard(self):
        self.git("config", "--unset", "maintenance.auto")
        rc, out, _ = self.checkpoint()
        self.assertEqual((rc, out.get("error")), (10, "precondition"), out)
        self.assertEqual(self.git("rev-parse", "-q", "--verify", "HEAD", check=False), "")

    def test_git_failure_detail_stays_out_of_the_json(self):
        self.assertEqual(self.checkpoint()[0], 0)
        marker = "leakmarker-7f3a"
        out_path = os.path.join(self.tmp, marker, "absent-dir", "x.bundle")
        p = subprocess.run([sys.executable, "-I", TOOL, "bundle", "--corpus", self.canon, "--out", out_path, "--standalone"],
                           capture_output=True)
        out = json.loads(p.stdout.decode())
        self.assertEqual((p.returncode, out["error"], out["message"]), (10, "precondition", "git bundle failed rc=128"), out)
        self.assertNotIn(marker, p.stdout.decode())  # Git named the path on stderr, not in the summary
        self.assertIn(marker, p.stderr.decode())
        self.assertNotIn("paths", out)

    def test_budget_floor(self):
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", str(10 ** 18))
        self.assertEqual((rc, out["error"]), (11, "budget"))

    def test_missing_dotfiles_config_is_precondition(self):
        bare = os.path.join(self.tmp, "nodot")
        shutil.copytree(self.canon, bare, ignore=shutil.ignore_patterns(".git"))
        init_repo(bare, "nodot", dotfiles=None)
        rc, out, _ = run("preflight", "--corpus", bare, "--floor-bytes", "0")
        self.assertEqual((rc, out["error"]), (10, "precondition"))

    def test_budget_counts_present_objects_after_failed_admission(self):
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        total = out["budget"]["need_bytes"]
        self.assertEqual(rc, 0)
        # a failed admission leaves its objects while the index is restored and main stays unborn
        self.git("-c", "annex.dotfiles=true", "-c", "annex.addunlocked=true", "annex", "add", "-q", "--", P1, P2, P3)
        self.git("rm", "-r", "-q", "--cached", "--", "alpha", "beta")
        self.assertEqual((self.git("ls-files"), self.git("rev-parse", "-q", "--verify", "HEAD", check=False)), ("", ""))
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, out["budget"]["need_bytes"]), (0, 0), out)  # the reviewed snapshot said `total`
        self.assertEqual(out["budget"]["need_keys"], 0)
        newp = "alpha/.claude/projects/-home-u-repos-x/00000000-0000-4000-8000-000000000006.jsonl"
        write(self.canon, newp, b'{"n":6}\n' * 3)
        write_ledger(self.canon)
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual(out["budget"]["need_bytes"], 24, out)
        self.assertGreater(total, 24)
        rc, out, err = self.checkpoint()
        self.assertEqual((rc, out["result"], out["admitted"]), (0, "committed", 4), (out, err))

    def test_unsafe_paths_rejected(self):
        for bad in ("../escape.jsonl", "/abs/x.jsonl", ".git/x.jsonl", "alpha/./x.jsonl", "toplevel.jsonl", "MANIFEST.json"):
            write_ledger(self.canon, extra=(bad,))
            rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
            self.assertEqual((rc, out.get("error")), (13, "ledger"), bad)
        write_ledger(self.canon)
        real = os.path.join(self.tmp, "elsewhere")
        os.makedirs(real)
        write(real, "y.jsonl", b"{}\n")
        os.symlink(real, os.path.join(self.canon, "alpha", "linked"))
        write_ledger(self.canon, extra=("alpha/linked/y.jsonl",))
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, out.get("error")), (13, "ledger"), out)

    def test_annex_add_late_failure_restores_index_then_retry_reuses_objects(self):
        self.git("add", "--", "README.md")
        pre = self.git("ls-files", "-s")
        fb = fake_bin(self.tmp)
        rc, out, err = self.checkpoint(None, "--bootstrap", "--annex-bin", fb)
        self.assertEqual((rc, out.get("error"), out.get("index_restore")), (14, "key", "restored"), (out, err))
        self.assertIn("exited rc=1", out["message"])
        self.assertEqual(self.git("ls-files", "-s"), pre)  # exactly the pre-call index
        self.assertEqual(self.git("rev-parse", "-q", "--verify", "HEAD", check=False), "")
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual(out["budget"]["need_bytes"], 0, out)  # the failed run's objects count as present
        rc, out, err = self.checkpoint(None, "--bootstrap")
        self.assertEqual((rc, out["result"], out["admitted"]), (0, "committed", 3), (out, err))
        rc, out, _ = run("verify", "--corpus", self.canon, "--objects")
        self.assertEqual((rc, out["counts"]), (0, {"match": 3}), out)

    def test_restore_failure_reports_both_errors_and_leaves_index(self):
        fb = fake_bin(self.tmp, fail_restore=True)
        rc, out, err = self.checkpoint(None, "--annex-bin", fb)
        self.assertEqual((rc, out.get("error"), out.get("index_restore"), out.get("original_error")),
                         (19, "restore", "failed", "key"), (out, err))
        self.assertIn("did not produce the ledger key", out["original_message"])
        self.assertIn("update-index rc=1", out["message"])
        self.assertTrue(self.git("ls-files"))  # partial staging is left in place, not hidden
        self.assertEqual(self.git("rev-parse", "-q", "--verify", "HEAD", check=False), "")

    # --- lock contract
    def test_lock_fd_contract(self):
        rc, out, _ = run("checkpoint", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual(rc, 2)  # neither --lock-fd nor --standalone
        rc, out, err = run_with_fd(self.canon, "checkpoint", "--floor-bytes", "0", "--worked-with", GID)
        self.assertEqual((rc, out.get("lock"), out.get("result")), (0, "caller-fd", "committed"), (out, err))
        self.assertIn(f"with {GID}.", self.git("log", "-1", "--format=%B"))
        other = os.path.join(self.tmp, "other.lock")
        rc, out, _ = run_with_fd(self.canon, "checkpoint", "--floor-bytes", "0", lockfile=other)
        self.assertEqual((rc, out.get("error")), (75, "lock"))
        fd = os.open(os.path.join(self.canon, ".git", "corpus-custody.lock"), os.O_RDWR)
        fcntl.flock(fd, fcntl.LOCK_EX)  # another writer holds it through its own open file description
        try:
            rc, out, _ = run_with_fd(self.canon, "checkpoint", "--floor-bytes", "0", take=False)
            self.assertEqual((rc, out.get("error")), (75, "lock"))
            rc, out, _ = self.checkpoint()
            self.assertEqual((rc, out.get("error")), (75, "lock"))
        finally:
            os.close(fd)
        rc, out, _ = run("checkpoint", "--corpus", self.canon, "--floor-bytes", "0", "--lock-fd", "987")
        self.assertEqual((rc, out.get("error")), (75, "lock"))

    def test_read_only_phases_check_the_lock_only_when_given(self):
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, "lock" in out), (0, False))  # plain read-only audit needs no lock
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0", "--standalone")
        self.assertEqual((rc, out.get("lock")), (0, "standalone"), out)  # one open, no self-conflict
        rc, out, _ = run_with_fd(self.canon, "preflight", "--floor-bytes", "0")
        self.assertEqual((rc, out.get("lock")), (0, "caller-fd"), out)
        rc, out, _ = run_with_fd(self.canon, "preflight", "--floor-bytes", "0", lockfile=os.path.join(self.tmp, "x.lock"))
        self.assertEqual((rc, out.get("error")), (75, "lock"))
        self.assertEqual(self.checkpoint()[0], 0)
        for args in (("preflight", "--floor-bytes", "0"), ("verify",)):
            rc, out, _ = run(args[0], "--corpus", self.canon, *args[1:], "--lock-fd", "987")
            self.assertEqual((rc, out.get("error")), (75, "lock"), args)  # a lost descriptor is not ignored
        fd = os.open(os.path.join(self.canon, ".git", "corpus-custody.lock"), os.O_RDWR)
        fcntl.flock(fd, fcntl.LOCK_EX)
        try:
            for phase in ("preflight", "verify"):
                rc, out, _ = run_with_fd(self.canon, phase, take=False)
                self.assertEqual((rc, out.get("error")), (75, "lock"), phase)
                rc, out, _ = run(phase, "--corpus", self.canon, "--standalone")
                self.assertEqual((rc, out.get("error")), (75, "lock"), phase)
            rc, out, _ = run("verify", "--corpus", self.canon)
            self.assertEqual((rc, out["counts"]), (0, {"match": 3}), out)  # without the flags it still reads
        finally:
            os.close(fd)

    def test_preflight_checks_leaf_sources_but_not_archive_identity(self):
        outside = os.path.join(self.tmp, "outside.jsonl")
        shutil.copy2(os.path.join(self.canon, P1), outside)
        os.remove(os.path.join(self.canon, P1))
        os.symlink(outside, os.path.join(self.canon, P1))
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0", "--show-paths")
        self.assertEqual((rc, out.get("error"), out.get("paths")), (13, "ledger", [P1]), out)  # same bytes, still a symlink
        os.remove(os.path.join(self.canon, P1))
        shutil.copy2(outside, os.path.join(self.canon, P1))
        os.remove(os.path.join(self.canon, P2))
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0", "--show-paths")
        self.assertEqual((rc, out.get("paths")), (13, [P2]), out)
        write(self.canon, P2, b"/annex/objects/SHA256E-s560--" + b"0" * 64 + b"\n")
        write_ledger(self.canon)  # a ledger computed over an unretrieved pointer
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0", "--show-paths")
        self.assertEqual((rc, out.get("paths")), (13, [P2]), out)
        write(self.canon, P2, b'{"n":2}\n' * 70)
        write_ledger(self.canon)
        self.assertEqual(self.checkpoint()[0], 0)
        with open(os.path.join(self.canon, P1), "ab") as f:  # a local warm: newer regular source, no archive commit
            f.write(b'{"n":"grown"}\n')
        write_ledger(self.canon, "2026-01-02T00:00:00+0000")
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, out["result"]), (0, "ready"), out)  # HEAD need not equal the current ledger

    # --- checkpoint
    def test_checkpoint_dotdir_pointers_regular_and_no_empty_commit(self):
        ino = {p: os.lstat(os.path.join(self.canon, p)).st_ino for p in (P1, P2, P3)}
        rc, out, err = self.checkpoint()
        self.assertEqual((rc, out["result"], out["admitted"]), (0, "committed", 3), (out, err))
        for p in (P1, P2, P3):
            blob = self.git("cat-file", "-p", f"HEAD:{p}")
            self.assertTrue(blob.startswith("/annex/objects/SHA256E-"), p)
            self.assertNotIn(".jsonl", blob)  # measured extension rule: 5-letter extensions are dropped
            full = os.path.join(self.canon, p)
            self.assertFalse(os.path.islink(full))
            self.assertEqual(os.lstat(full).st_ino, ino[p])
        before = self.git("rev-parse", "HEAD")
        rc, out, _ = self.checkpoint()
        self.assertEqual((rc, out["result"]), (0, "unchanged"))
        self.assertEqual(self.git("rev-parse", "HEAD"), before)
        rc, out, _ = run("verify", "--corpus", self.canon, "--objects")
        self.assertEqual((rc, out["counts"]), (0, {"match": 3}), out)

    def test_extension_rule_matches_git_annex(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location("corpus_archive", TOOL)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        names = ["a.jsonl", "b.json", "c.tar.gz", "d.JSON", "session.sqlite", "2026-01-01T00-00-00.000Z_f.jsonl",
                 "g.md", "h", "noext.", "i.a1", "j.toolong", "k.x.y.z", "l.ab-c", "m.tar.jsonl"]
        for n in names:
            write(self.canon, f"zz/{n}", n.encode())
        got = sh(self.canon, "git", "-c", "annex.largefiles=anything", "annex", "add", "--json", "--", *[f"zz/{n}" for n in names])
        for line in got.splitlines():
            rec = json.loads(line)
            ext = rec["key"].split("--", 1)[1][64:]
            self.assertEqual(mod.expected_ext(rec["file"], (4, 2)), ext, rec["file"])

    def test_checkpoint_refuses_prestaged_but_bootstraps_metadata(self):
        self.git("add", "--", "README.md", "CLAUDE.md", ".gitattributes")
        rc, out, _ = self.checkpoint()
        self.assertEqual((rc, out["error"]), (13, "ledger"))
        self.assertEqual(sorted(self.git("ls-files").split()), [".gitattributes", "CLAUDE.md", "README.md"])
        rc, out, err = self.checkpoint(None, "--bootstrap")
        self.assertEqual((rc, out["result"], out["bootstrap_metadata"]), (0, "committed", [".gitattributes", "CLAUDE.md", "README.md"]), (out, err))
        write(self.canon, "README.md", b"changed but not staged\n")
        self.git("add", "--", "README.md")
        rc, out, _ = self.checkpoint()
        self.assertEqual((rc, out["error"]), (13, "ledger"))

    def test_checkpoint_delta_only(self):
        self.assertEqual(self.checkpoint()[0], 0)
        write(self.canon, "alpha/.claude/projects/-home-u-repos-x/00000000-0000-4000-8000-000000000004.jsonl", b'{"n":4}\n')
        write_ledger(self.canon, "2026-01-02T00:00:00+0000")
        rc, out, _ = self.checkpoint()
        self.assertEqual((rc, out["admitted"], out["result"]), (0, 1, "committed"), out)

    def test_ledger_mismatch_stops_before_add(self):
        write(self.canon, P1, b'{"n":"changed"}\n')
        rc, out, _ = self.checkpoint()
        self.assertEqual((rc, out["error"]), (13, "ledger"))
        self.assertEqual(self.git("ls-files", "--", P1), "")

    def test_raw_in_git_detected(self):
        self.git("-c", "annex.gitaddtoannex=false", "add", "--", P1)
        self.assertFalse(self.git("cat-file", "-p", f":{P1}").startswith("/annex/objects/"))
        rc, out, _ = run("preflight", "--corpus", self.canon, "--floor-bytes", "0")
        self.assertEqual((rc, out["error"]), (12, "raw-in-git"))
        rc, out, _ = run("verify", "--corpus", self.canon, "--staged")
        self.assertEqual(rc, 12)

    def test_plain_git_add_follows_branch_dotfiles(self):
        self.git("add", "--", P1)
        self.assertTrue(self.git("cat-file", "-p", f":{P1}").startswith("/annex/objects/"))

    # --- replica
    def replica(self):
        rep = os.path.join(self.tmp, "replica")
        shutil.copytree(self.canon, rep, ignore=shutil.ignore_patterns(".git"))
        init_repo(rep, "replica", dotfiles="local")
        return rep

    def bundle(self, root=None, name="canon"):
        out = os.path.join(self.tmp, f"{name}.bundle")
        rc, res, err = run("bundle", "--corpus", root or self.canon, "--out", out, "--standalone")
        self.assertEqual(rc, 0, (res, err))
        return out

    def receive(self, rep):
        return run_with_fd(rep, "receive", "--bundle", self.bundle(), "--floor-bytes", "0")

    def whereis_count(self, root, path):
        out = sh(root, "git", "annex", "whereis", "--json", "--", path)
        return len(json.loads(out.splitlines()[0])["whereis"])

    def test_receive_adopts_same_main_distinct_uuid_and_both_logs(self):
        self.assertEqual(self.checkpoint()[0], 0)
        rep = self.replica()
        rc, out, err = self.receive(rep)
        self.assertEqual((rc, out["result"], out["admitted"]), (0, "adopted", 3), (out, err))
        self.assertEqual(sh(rep, "git", "rev-parse", "main"), self.git("rev-parse", "main"))
        self.assertNotEqual(sh(rep, "git", "config", "annex.uuid"), self.git("config", "annex.uuid"))
        self.assertEqual(sh(rep, "git", "status", "--porcelain", "--untracked-files=no"), "")
        self.assertFalse(os.path.islink(os.path.join(rep, P1)))
        rc, out, _ = run("verify", "--corpus", rep, "--objects")
        self.assertEqual((rc, out["counts"]), (0, {"match": 3}), out)
        self.assertEqual(self.whereis_count(rep, P1), 2)  # replica knows canonical + itself
        self.assertEqual(self.whereis_count(self.canon, P1), 1)
        rc, out, err = run("merge-log", "--corpus", self.canon, "--bundle", self.bundle(rep, "replica"), "--from", "replica", "--standalone")
        self.assertEqual((rc, out["result"]), (0, "merged"), (out, err))
        self.assertEqual(self.whereis_count(self.canon, P1), 2)  # and back: canonical knows the replica copy
        newp = "beta/.pi/agent/sessions/--home-u-repos-x--/2026-01-02T00-00-00-000Z_01900000-0000-7000-8000-000000000005.jsonl"
        write(self.canon, newp, b'{"n":5}\n')
        write_ledger(self.canon, "2026-01-02T00:00:00+0000")
        self.assertEqual(self.checkpoint()[0], 0)
        for rel in (newp, "MANIFEST.json", "MANIFEST.sha256"):  # what a .git-excluding replication brings
            os.makedirs(os.path.dirname(os.path.join(rep, rel)) or rep, exist_ok=True)
            shutil.copy2(os.path.join(self.canon, rel), os.path.join(rep, rel))
        rc, out, err = self.receive(rep)
        self.assertEqual((rc, out["result"], out["admitted"]), (0, "adopted", 1), (out, err))

    def test_receive_refuses_unarrived_copy_metadata_and_divergence(self):
        self.git("add", "--", "README.md", "CLAUDE.md", ".gitattributes")  # bootstrap carries repository metadata
        self.assertEqual(self.checkpoint(None, "--bootstrap")[0], 0)
        rep = self.replica()
        os.remove(os.path.join(rep, P2))
        rc, out, _ = self.receive(rep)
        self.assertEqual((rc, out["error"]), (13, "ledger"))
        self.assertEqual(sh(rep, "git", "ls-files"), "")
        self.assertNotIn("main", out)
        shutil.copy2(os.path.join(self.canon, P2), os.path.join(rep, P2))
        write(rep, "README.md", b"older replica readme\n")
        rc, out, _ = self.receive(rep)
        self.assertEqual((rc, out["error"]), (13, "ledger"))  # O3 metadata alignment must precede receive
        self.assertEqual(sh(rep, "git", "ls-files"), "")
        shutil.copy2(os.path.join(self.canon, "README.md"), os.path.join(rep, "README.md"))
        sh(rep, "git", "commit", "-q", "--allow-empty", "-m", "replica must not commit main")
        rc, out, _ = self.receive(rep)
        self.assertEqual((rc, out["error"]), (17, "diverged"))

    # --- readback
    def test_two_version_readback_from_separate_reader(self):
        self.assertEqual(self.checkpoint()[0], 0)
        c1 = self.git("rev-parse", "HEAD").strip()
        with open(os.path.join(self.canon, P1), "ab") as f:
            f.write(b'{"n":"grown"}\n')
        write_ledger(self.canon, "2026-01-02T00:00:00+0000")
        self.assertEqual(self.checkpoint()[0], 0)
        c2 = self.git("rev-parse", "HEAD").strip()
        reader = os.path.join(self.tmp, "reader")
        sh(self.tmp, "git", "clone", "-q", self.canon, reader)
        sh(reader, "git", "annex", "init", "-q", "reader")
        rc, out, _ = run("verify", "--corpus", reader, "--commit", c2)
        self.assertEqual((rc, out["counts"]), (18, {"unretrieved": 3}), out)  # unretrieved is not mismatch
        for c in (c1, c2):
            sh(reader, "git", "-c", "advice.detachedHead=false", "checkout", "-q", c)
            sh(reader, "git", "annex", "get", "-q", ".")
            rc, out, _ = run("verify", "--corpus", reader, "--commit", c, "--objects")
            self.assertEqual((rc, out["counts"]), (0, {"match": 3}), (c, out))
        self.assertEqual(sh(self.canon, "git", "rev-parse", "HEAD").strip(), c2)  # producer untouched

    def test_verify_refuses_symlinked_parent(self):
        self.assertEqual(self.checkpoint()[0], 0)
        outside = os.path.join(self.tmp, "outside-alpha")
        shutil.move(os.path.join(self.canon, "alpha"), outside)
        os.symlink(outside, os.path.join(self.canon, "alpha"))
        rc, out, _ = run("verify", "--corpus", self.canon, "--objects", "--show-paths")
        self.assertEqual((rc, out.get("error"), out.get("paths")), (13, "ledger", [P1]), out)
        lst = os.path.join(self.tmp, "paths.txt")
        write(self.tmp, "paths.txt", (P1 + "\n").encode())
        rc, out, _ = run("verify", "--corpus", self.canon, "--paths-from", lst)
        self.assertEqual((rc, out.get("error")), (13, "ledger"), out)

    def test_verify_paths_from_cannot_forge_success(self):
        self.assertEqual(self.checkpoint()[0], 0)
        lst = os.path.join(self.tmp, "sel.txt")
        cases = [(b"", 2), (b"\n", 2), (f"{P1}\n\n{P2}\n".encode(), 2), (f"{P1}\n{P1}\n".encode(), 2),
                 (b"\xff\xfe\n", 2), (b"not/in/the/ledger.jsonl\n", 18), (f"{P1}\r\n".encode(), 18)]
        for data, want in cases:
            write(self.tmp, "sel.txt", data)
            rc, out, _ = run("verify", "--corpus", self.canon, "--paths-from", lst)
            self.assertEqual(rc, want, (data, out))
        rc, out, _ = run("verify", "--corpus", self.canon, "--paths-from", os.path.join(self.tmp, "absent.txt"))
        self.assertEqual(rc, 2)
        write(self.tmp, "sel.txt", f"{P1}\n{P3}".encode())  # last line may lack its newline
        rc, out, _ = run("verify", "--corpus", self.canon, "--paths-from", lst, "--objects")
        self.assertEqual((rc, out["scope"], out["selected"], out["counts"]), (0, "paths-from", 2, {"match": 2}), out)

    def test_verify_reports_mismatch(self):
        self.assertEqual(self.checkpoint()[0], 0)
        write(self.canon, P1, b'{"n":"rewritten"}\n')
        rc, out, _ = run("verify", "--corpus", self.canon)
        self.assertEqual((rc, out["error"], out["failing"]), (18, "verify", 1))


if __name__ == "__main__":
    missing = [t for t in ("git-annex", "bash", "flock") if not shutil.which(t)]
    if missing:
        print(f"SKIP: not on PATH: {', '.join(missing)}")
        sys.exit(0)
    unittest.main(verbosity=1)
