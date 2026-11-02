#!/usr/bin/env python3
"""corpus-archive — keep the session corpus under git-annex next to its MANIFEST ledger (agent-config#32, contract v2).

Phases:
  preflight   read-only readiness: repository, tools, protections, raw-in-Git, ledger pair and paths, budget
  checkpoint  canonical host: admit exactly the ledger's changed paths (unlocked, dotfiles) and commit at most once
  bundle      canonical or replica: package main + git-annex into a Git bundle (repository unchanged)
  receive     replica host: admit local regular copies under the canonical keys, then fast-forward main to canonical
  merge-log   either host: union another host's git-annex branch (location log) from a bundle; main untouched
  verify      read-only: compare a commit's (or the index's) ledger, pointers, worktree and objects

Mutating phases (checkpoint, bundle, receive, merge-log) need the custody lock: the caller holds
<corpus>/.git/corpus-custody.lock with flock and passes that inherited descriptor as --lock-fd N, or the operator
passes --standalone. preflight and verify run without it, but when either flag is given they check it the same way
(a lost or wrong descriptor is 75). The lock is taken once per process, before the phase runs. The path list comes
from MANIFEST.json only; nothing walks the corpus or `.git`. preflight checks readiness, not archive identity: each
ledger source must be a present regular file inside its parents and not an unretrieved pointer, but its SHA256 is
compared only where content is admitted (checkpoint/receive delta) or audited (verify). stdout carries one JSON summary; diagnostics go to stderr;
relative paths appear only with --show-paths. No push, drop, gc, prune or content transfer happens here.

Rollback is partial, not atomic. A failure during staging puts back exactly the index entries that step changed
(content objects already ingested stay); if that restore itself fails, the exit is 19, the JSON names both errors and
the index is left as found. A commit rejected by a hook (15) leaves the staged pointers on purpose. A failed
`update-ref` or `git annex merge` in receive/merge-log leaves whatever state was reached; inspect the repository
before retrying. Nothing rolls refs back automatically.

Exit codes: 0 ok/unchanged, 2 usage, 10 precondition, 11 budget, 12 raw-in-git, 13 ledger, 14 key, 15 hook,
16 tree, 17 diverged, 18 verify, 19 restore, 75 lock.
"""

import argparse
import errno
import fcntl
import hashlib
import json
import os
import re
import stat
import subprocess
import sys

EXIT = {
    "ok": 0, "usage": 2, "precondition": 10, "budget": 11, "raw-in-git": 12, "ledger": 13,
    "key": 14, "hook": 15, "tree": 16, "diverged": 17, "verify": 18, "restore": 19, "lock": 75,
}
METADATA = (
    ".gitattributes", ".gitignore", "AGENTS.md", "CLAUDE.md", "DEVICES.json",
    "MANIFEST.json", "MANIFEST.sha256", "README.md",
)
CHECKPOINT_METADATA = ("MANIFEST.json", "MANIFEST.sha256", "DEVICES.json")
LOCK_NAME = "corpus-custody.lock"
MUTATING = ("bundle", "checkpoint", "merge-log", "receive")
KEY_RE = re.compile(r"^SHA256E-s([0-9]+)--([0-9a-f]{64})((?:\.[A-Za-z0-9]+)*)$")
POINTER_PREFIX = b"/annex/objects/"
POINTER_MAX = 1024
ZERO_OID = "0" * 40
ADD_FLAGS = ("-c", "annex.dotfiles=true", "-c", "annex.addunlocked=true")
REMOTE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
GARDEN_ID_RE = re.compile(r"^[0-9]{8}T[0-9]{6}-[0-9a-f]{6}$")


class Fail(Exception):
    def __init__(self, kind, message, paths=()):
        super().__init__(message)
        self.kind = kind
        self.paths = list(paths)


class Repo:
    def __init__(self, corpus, annex_bin):
        self.root = corpus
        env = dict(os.environ)
        if annex_bin:
            env["PATH"] = annex_bin + os.pathsep + env.get("PATH", "")
        env["LC_ALL"] = "C"
        self.env = env
        self._ext = None

    def git(self, *args, data=None, check=True, literal=False):
        # literal pathspecs only where we pass paths; exported globally it breaks git-annex's own git calls
        pre = ["--literal-pathspecs"] if literal else []
        p = subprocess.run(["git", "-C", self.root, *pre, *args], input=data, capture_output=True, env=self.env)
        if check and p.returncode != 0:
            # the JSON summary carries only the verb and rc; Git's own words may name paths, so they go to stderr
            sys.stderr.write(p.stderr.decode(errors="replace")[-4000:])
            raise Fail("precondition", f"git {git_verb(args)} failed rc={p.returncode}")
        return p

    def out(self, *args, data=None):
        return self.git(*args, data=data).stdout.decode()

    def config(self, key):
        p = self.git("config", "--get", key, check=False)
        return p.stdout.decode().strip() if p.returncode == 0 else None

    def ref(self, name):
        p = self.git("rev-parse", "-q", "--verify", name + "^{commit}", check=False)
        return p.stdout.decode().strip() if p.returncode == 0 else None

    def head(self):
        return self.ref("HEAD")

    def index_entries(self):
        out = {}
        for rec in self.git("ls-files", "-s", "-z").stdout.split(b"\0"):
            if rec:
                meta, path = rec.split(b"\t", 1)
                mode, oid, _stage = meta.decode().split()
                out[path.decode()] = (mode, oid)
        return out

    def tree_entries(self, rev):
        out = {}
        if not rev:
            return out
        for rec in self.git("ls-tree", "-r", "-z", rev).stdout.split(b"\0"):
            if rec:
                meta, path = rec.split(b"\t", 1)
                mode, _typ, oid = meta.decode().split()
                out[path.decode()] = (mode, oid)
        return out

    def blobs(self, oids):
        """Return {oid: bytes} for blobs under POINTER_MAX; larger blobs map to None (never read)."""
        oids = sorted(set(oids))
        if not oids:
            return {}
        sizes = {}
        for line in self.out("cat-file", "--batch-check", data="".join(o + "\n" for o in oids).encode()).splitlines():
            oid, _typ, size = line.split()
            sizes[oid] = int(size)
        small = [o for o in oids if sizes[o] < POINTER_MAX]
        out = {o: None for o in oids if sizes[o] >= POINTER_MAX}
        raw = self.git("cat-file", "--batch", data="".join(o + "\n" for o in small).encode()).stdout
        i = 0
        for o in small:
            nl = raw.index(b"\n", i)
            size = int(raw[i:nl].split()[2])
            out[o] = raw[nl + 1:nl + 1 + size]
            i = nl + 1 + size + 1
        return out

    def content_locations(self, keys):
        keys = sorted(set(keys))
        if not keys:
            return {}
        lines = self.out("annex", "contentlocation", "--batch", data="".join(k + "\n" for k in keys).encode()).split("\n")
        if len(lines) < len(keys):
            raise Fail("precondition", "git annex contentlocation answered fewer keys than asked")
        return {k: lines[n] for n, k in enumerate(keys)}  # "" = no local content for that key

    def ext_rule(self):
        """(max extension length, max extension count) as git-annex applies them to SHA256E keys."""
        if self._ext is None:
            self._ext = (int(self.config("annex.maxextensionlength") or 4), int(self.config("annex.maxextensions") or 2))
        return self._ext

    def worktree_blob(self, path):
        return self.out("hash-object", "--no-filters", "--", path).strip()

    def restore(self, before):
        """Put back exactly the index entries this call changed: {path: (mode, oid) or None}.
        Return None once the index reads back as `before`, else a short reason (the index is then left as is)."""
        if not before:
            return None
        rec = "".join((f"{e[0]} {e[1]}\t{p}" if e else f"0 {ZERO_OID}\t{p}") + "\0" for p, e in sorted(before.items()))
        p = self.git("update-index", "-z", "--index-info", data=rec.encode(), check=False)
        if p.returncode != 0:
            return f"git update-index rc={p.returncode}"
        try:
            now = self.index_entries()
        except Fail as e:
            return f"index unreadable after restore: {e}"
        wrong = sum(1 for path, e in before.items() if now.get(path) != e)
        return f"{wrong} index entries differ after restore" if wrong else None


def git_verb(args):
    """The subcommand of a git argument list, skipping `-c key=value` pairs and other leading options."""
    it = iter(args)
    for a in it:
        if a == "-c":
            next(it, None)
        elif not a.startswith("-"):
            return a
    return "?"


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def expected_ext(path, rule):
    """git-annex SHA256E extension: up to `count` trailing dot-parts, each 1..`length` ASCII alphanumerics,
    taken right to left and stopping at the first part that does not qualify (measured on 10.20260421)."""
    length, count = rule
    parts = os.path.basename(path).split(".")[1:]
    taken = []
    for part in reversed(parts):
        if len(taken) == count or not (1 <= len(part) <= length and part.isascii() and part.isalnum()):
            break
        taken.append(part)
    return "".join("." + p for p in reversed(taken))


def expected_key(path, size, sha, rule):
    return f"SHA256E-s{size}--{sha}{expected_ext(path, rule)}"


def key_matches(key, path, size, sha, rule):
    return bool(KEY_RE.match(key or "")) and key == expected_key(path, size, sha, rule)


def check_source_path(path):
    parts = path.split("/")
    return not (
        path.startswith("/") or "\n" in path or "\0" in path or len(parts) < 2
        or any(p in ("", ".", "..") for p in parts) or parts[0].startswith(".") or path in METADATA
    )


def check_paths(root, paths):
    """Reject unsafe ledger paths and any symlinked/non-directory parent (leaf type is checked where content is read)."""
    bad = [p for p in paths if not check_source_path(p)]
    seen = {}
    for p in paths:
        if p in bad:
            continue
        cur = root
        for part in p.split("/")[:-1]:
            cur = os.path.join(cur, part)
            if cur not in seen:
                try:
                    seen[cur] = stat.S_ISDIR(os.lstat(cur).st_mode)
                except FileNotFoundError:
                    seen[cur] = True  # absent parent: the file is reported missing where content is read
            if not seen[cur]:
                bad.append(p)
                break
    if bad:
        raise Fail("ledger", "ledger names an unsafe path or one under a symlinked/non-directory parent", bad)


def check_sources(root, ledger):
    """Each ledger source is a present regular file (not a symlink) holding content, not an unretrieved pointer.
    Parents are checked by check_paths first; SHA256 is left to checkpoint/receive/verify."""
    bad = []
    for p in ledger:
        full = os.path.join(root, p)
        try:
            st = os.lstat(full)
        except FileNotFoundError:
            bad.append(p)
            continue
        if not stat.S_ISREG(st.st_mode):
            bad.append(p)
        elif st.st_size < POINTER_MAX:
            with open(full, "rb") as f:
                if f.read(len(POINTER_PREFIX)) == POINTER_PREFIX:
                    bad.append(p)
    if bad:
        raise Fail("ledger", "ledger sources must be present regular files with content (no symlink, no unretrieved pointer)", bad)


def read_paths_from(path):
    """--paths-from: UTF-8, one relative path per line, no empty line, no repeat, at least one path."""
    try:
        with open(path, "rb") as f:
            text = f.read().decode("utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise Fail("usage", f"--paths-from is not a readable UTF-8 file ({e.__class__.__name__})")
    lines = text.split("\n")
    if lines[-1] == "":
        lines.pop()
    if not lines:
        raise Fail("usage", "--paths-from names no path; an empty selection verifies nothing")
    if "" in lines:
        raise Fail("usage", "--paths-from has an empty line")
    if len(set(lines)) != len(lines):
        raise Fail("usage", "--paths-from lists a path more than once")
    return lines


def load_ledger(root, json_text=None, sha_text=None):
    """Return {path: (size, sha256)} after checking that MANIFEST.json and MANIFEST.sha256 agree."""
    if json_text is None:
        with open(os.path.join(root, "MANIFEST.json"), encoding="utf-8") as f:
            json_text = f.read()
    if sha_text is None:
        with open(os.path.join(root, "MANIFEST.sha256"), encoding="utf-8") as f:
            sha_text = f.read()
    files = json.loads(json_text)["files"]
    side = {}
    for line in sha_text.split("\n"):
        if not line:
            continue
        if line.startswith("\\") or len(line) < 67 or line[64:66] != "  ":
            raise Fail("ledger", "MANIFEST.sha256 has a line this tool does not parse")
        side[line[66:]] = line[:64]
    bad = [p for p in set(files) | set(side) if p not in files or p not in side or files[p]["sha256"] != side[p]]
    if bad:
        raise Fail("ledger", "MANIFEST.json and MANIFEST.sha256 disagree", bad)
    bad = [p for p in files if not check_source_path(p)]
    if bad:
        raise Fail("ledger", "ledger names an unsafe path", bad)
    return {p: (int(v["size"]), v["sha256"]) for p, v in files.items()}


def pointer_key(blob):
    if blob is None or not blob.startswith(POINTER_PREFIX):
        return None
    key = blob.strip().decode(errors="replace").rsplit("/", 1)[-1]
    return key if KEY_RE.match(key) else None


def source_pointers(repo, entries):
    """Split {path: (mode, oid)} into ({path: key}, [raw paths]) for every non-metadata path."""
    src = {p: e for p, e in entries.items() if p not in METADATA}
    blobs = repo.blobs([oid for _mode, oid in src.values()])
    keys, raw = {}, []
    for p, (mode, oid) in src.items():
        k = pointer_key(blobs.get(oid)) if mode in ("100644", "100755") else None
        if k is None:
            raw.append(p)
        else:
            keys[p] = k
    return keys, raw


_HELD = []


def take_lock(repo, args, result):
    path = os.path.join(repo.root, ".git", LOCK_NAME)
    if args.standalone:
        fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_CLOEXEC, 0o600)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as e:
            os.close(fd)
            if e.errno in (errno.EWOULDBLOCK, errno.EAGAIN):
                raise Fail("lock", "custody lock is busy")
            raise
        _HELD.append(fd)  # released when the process exits
        result["lock"] = "standalone"
        return
    if args.lock_fd is None:
        raise Fail("usage", "this phase needs --lock-fd N (caller-held custody lock) or --standalone")
    try:
        st = os.fstat(args.lock_fd)
        want = os.stat(path)
    except OSError:
        raise Fail("lock", "--lock-fd is not an open descriptor of the custody lock file")
    if not stat.S_ISREG(st.st_mode) or (st.st_dev, st.st_ino) != (want.st_dev, want.st_ino):
        raise Fail("lock", "--lock-fd does not refer to <corpus>/.git/corpus-custody.lock")
    try:
        fcntl.flock(args.lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)  # same open file description: re-entrant
    except OSError as e:
        if e.errno in (errno.EWOULDBLOCK, errno.EAGAIN):
            raise Fail("lock", "custody lock is held through another open file description")
        raise
    result["lock"] = "caller-fd"  # never unlocked or closed here


def free_bytes(root):
    st = os.statvfs(os.path.join(root, ".git"))
    return st.f_bavail * st.f_frsize


def preflight(repo, args, result):
    root = repo.root
    checks = result.setdefault("checks", {})
    top = repo.git("rev-parse", "--show-toplevel", check=False)
    if top.returncode != 0 or os.path.realpath(top.stdout.decode().strip()) != root:
        raise Fail("precondition", "corpus is not the top of a Git repository")
    checks["repository"] = "pass"
    uuid, version = repo.config("annex.uuid"), repo.config("annex.version")
    if not uuid or version != "10":
        raise Fail("precondition", "git-annex v10 is not initialised here")
    av = repo.git("annex", "version", "--raw", check=False)
    if av.returncode != 0:
        raise Fail("precondition", "git-annex is not runnable (PATH or --annex-bin)")
    result["annex_uuid"], result["annex_version"] = uuid, av.stdout.decode().strip()
    checks["annex"] = "pass"
    thin = repo.git("config", "--type=bool", "--get", "annex.thin", check=False)  # Git boolean: yes/on/1 are true
    if thin.returncode not in (0, 1):
        raise Fail("precondition", "annex.thin is not a valid Git boolean")
    if thin.returncode == 0 and thin.stdout.decode().strip() != "false":
        raise Fail("precondition", "annex.thin is true; it would share inodes with the originals")
    checks["thin_false"] = "pass"
    if repo.config("gc.pruneExpire") != "never" or repo.config("gc.auto") != "0":
        raise Fail("precondition", "gc.pruneExpire=never and gc.auto=0 are required")
    # gc.auto=0 does not turn off `git maintenance run --auto`, which commit and fetch may start; require an
    # explicit repo-local Git-boolean false that no higher-priority config turns back on
    for scope in (("--local",), ()):
        m = repo.git("config", *scope, "--type=bool", "--get", "maintenance.auto", check=False)
        if m.returncode != 0 or m.stdout.decode().strip() != "false":
            raise Fail("precondition", "maintenance.auto must be false in the repository's local config, not overridden")
    checks["gc_protection"] = "pass"
    branch_dot = repo.git("annex", "config", "--get", "annex.dotfiles", check=False).stdout.decode().strip()
    if (repo.config("annex.dotfiles") or branch_dot or "").lower() != "true":
        raise Fail("precondition", "annex.dotfiles must be true (git-annex branch config or local config)")
    checks["dotfiles"] = "pass"
    head = repo.head()
    head_keys, head_raw = source_pointers(repo, repo.tree_entries(head))
    raw = head_raw + source_pointers(repo, repo.index_entries())[1]
    if raw:
        raise Fail("raw-in-git", "non-pointer source content is staged or committed", sorted(set(raw)))
    checks["raw_in_git"] = "pass"
    ledger = load_ledger(root)
    check_paths(root, ledger)
    check_sources(root, ledger)
    checks["ledger"] = "pass"
    # cost = every key the ledger implies whose content object is not already here, whatever HEAD says:
    # objects left by an earlier failed admission (index restored, main unborn) are reused, not copied again
    rule = repo.ext_rule()
    expected = {expected_key(p, size, sha, rule): size for p, (size, sha) in ledger.items()}
    locations = repo.content_locations(expected)
    need = {k: size for k, size in expected.items() if not locations[k]}
    b = {"free_bytes": free_bytes(root), "need_bytes": sum(need.values()), "need_keys": len(need),
         "floor_bytes": args.floor_bytes}
    b["after_bytes"] = b["free_bytes"] - b["need_bytes"]
    result["budget"] = b
    if b["after_bytes"] < args.floor_bytes:
        raise Fail("budget", "admission would leave less than the free-space floor")
    checks["budget"] = "pass"
    result["ledger"] = {"count": len(ledger), "bytes": sum(s for s, _ in ledger.values())}
    return ledger, head, head_keys


def admit(repo, paths, expect):
    """annex-add exactly `paths` (unlocked, dotfiles forced); expect(path, key) -> bool. Return failing paths."""
    if not paths:
        return []
    data = "".join(p + "\n" for p in paths).encode()
    p = repo.git(*ADD_FLAGS, "annex", "add", "--batch", "--json", data=data, check=False)
    if p.returncode != 0:  # success records printed before a late failure do not make the run a success
        sys.stderr.write(p.stderr.decode(errors="replace")[-4000:])
        raise Fail("key", f"git annex add exited rc={p.returncode}", paths)
    seen, bad = set(), []
    for line in p.stdout.decode().splitlines():
        try:
            rec = json.loads(line)
        except ValueError:
            raise Fail("key", "git annex add printed a line that is not JSON", paths)
        path = rec.get("file")
        seen.add(path)
        if not rec.get("success") or not expect(path, rec.get("key")):
            bad.append(path)
    return bad + [x for x in paths if x not in seen]


def check_regular(root, paths, ledger):
    bad = []
    for p in paths:
        full = os.path.join(root, p)
        size, sha = ledger[p]
        try:
            st = os.lstat(full)
        except FileNotFoundError:
            bad.append(p)
            continue
        if not stat.S_ISREG(st.st_mode) or st.st_size != size or sha256_file(full) != sha:
            bad.append(p)
    return bad


def check_objects(repo, keys_by_sha):
    locs = repo.content_locations(keys_by_sha.values())
    return [k for sha, k in keys_by_sha.items() if not locs.get(k) or sha256_file(os.path.join(repo.root, locs[k])) != sha]


def guard_index(repo, ledger, expect_keys=None):
    """Every non-metadata index entry is a pointer whose key matches the ledger; the ledger is fully present."""
    keys, raw = source_pointers(repo, repo.index_entries())
    if raw:
        raise Fail("raw-in-git", "non-pointer source content is staged", raw)
    extra = [p for p in keys if p not in ledger]
    if extra:
        raise Fail("ledger", "staged source paths outside the ledger", extra)
    missing = [p for p in ledger if p not in keys]
    if missing:
        raise Fail("ledger", "ledger paths absent from the index", missing)
    rule = repo.ext_rule()
    wrong = [p for p, k in keys.items()
             if not key_matches(k, p, *ledger[p], rule) or (expect_keys is not None and expect_keys.get(p) != k)]
    if wrong:
        raise Fail("key", "staged pointer keys disagree with the ledger", wrong)
    return keys


def rollback(repo, before, err, result):
    """Called while `err` propagates out of a mutating step: restore the index, or replace `err` with a
    restore failure that still names it."""
    problem = repo.restore(before)
    result["index_restore"] = "failed" if problem else "restored"
    if problem:
        # a Fail message is already safe for the JSON; any other exception may quote a path, so only its type goes there
        kind, detail = (err.kind, str(err)) if isinstance(err, Fail) else (type(err).__name__, type(err).__name__)
        if not isinstance(err, Fail):
            sys.stderr.write(f"corpus-archive: {err!r}\n")
        result["original_error"], result["original_message"] = kind, detail
        raise Fail("restore", f"{kind}: {detail}; restoring the index then failed ({problem}); "
                   "the index is left as found for inspection", getattr(err, "paths", ())) from err


def device_name():
    try:
        with open(os.path.expanduser("~/.current-device"), encoding="utf-8") as f:
            return f.read().strip() or None
    except FileNotFoundError:
        return None


def commit_message(root, worked_with):
    with open(os.path.join(root, "MANIFEST.json"), encoding="utf-8") as f:
        doc = json.load(f)
    census = ", ".join(f"{d} {v['files']} files/{v['bytes']} B" for d, v in sorted(doc.get("devices", {}).items()))
    lines = [f"chore(corpus): checkpoint {doc.get('generated', 'unknown')}", "",
             f"Ledger {doc['count']} files, {doc['bytes']} bytes ({census})."]
    device, ids = device_name(), ", ".join(worked_with)
    if device and ids:
        lines += ["", f"Worked on {device} with {ids}."]
    elif device:
        lines += ["", f"Worked on {device}."]
    elif ids:
        lines += ["", f"Worked with {ids}."]
    return "\n".join(lines) + "\n"


def index_matches(repo, rev):
    """True when the index records exactly rev's tree (or is empty when rev is None)."""
    if rev:
        return repo.git("diff", "--cached", "--quiet", rev, check=False).returncode == 0
    return not repo.index_entries()


def phase_checkpoint(repo, args, result):
    ledger, head, head_keys = preflight(repo, args, result)
    pre = repo.index_entries()
    if not index_matches(repo, head):
        ok = (args.bootstrap and head is None and all(p in METADATA for p in pre)
              and all(os.path.isfile(os.path.join(repo.root, p)) and repo.worktree_blob(p) == pre[p][1] for p in pre))
        if not ok:
            raise Fail("ledger", "the index already holds staged changes; checkpoint refuses to mix them in", sorted(pre))
        result["bootstrap_metadata"] = sorted(pre)
    elif args.bootstrap:
        raise Fail("usage", "--bootstrap applies only to an unborn main with staged metadata")
    removed = [p for p in head_keys if p not in ledger]
    if removed:
        raise Fail("ledger", "the ledger dropped committed paths (the corpus is append-only)", removed)
    rule = repo.ext_rule()
    delta = sorted(p for p in ledger if not key_matches(head_keys.get(p), p, *ledger[p], rule))
    bad = check_regular(repo.root, delta, ledger)
    if bad:
        raise Fail("ledger", "worktree content differs from the ledger or is not a regular file", bad)
    meta = [m for m in CHECKPOINT_METADATA if os.path.isfile(os.path.join(repo.root, m))]
    before = {p: pre.get(p) for p in delta + meta}
    new = {}
    try:
        bad = admit(repo, delta, lambda p, k: p in ledger and key_matches(k, p, *ledger[p], rule))
        if bad:
            raise Fail("key", "annex add did not produce the ledger key", bad)
        repo.git("add", "--", *meta, literal=True)
        keys = guard_index(repo, ledger)
        new = {ledger[p][1]: keys[p] for p in delta}
        bad = check_objects(repo, new)
        if bad:
            raise Fail("key", "annex object missing or differs from the ledger", bad)
    except BaseException as e:
        rollback(repo, before, e, result)
        raise
    result["admitted"], result["new_keys"] = len(delta), len(new)
    if index_matches(repo, head):
        result["result"], result["main"] = "unchanged", head
        return
    p = repo.git("commit", "-q", "-F", "-", data=commit_message(repo.root, args.worked_with).encode(), check=False)
    if p.returncode != 0:
        sys.stderr.write(p.stderr.decode(errors="replace")[-4000:])
        raise Fail("hook", "git commit was rejected; staged pointers are left for inspection")
    result["result"], result["main"] = "committed", repo.head()


def phase_bundle(repo, args, result):
    if not args.out or not os.path.isabs(args.out):
        raise Fail("usage", "bundle needs an absolute --out")
    if not repo.ref("refs/heads/main"):
        raise Fail("precondition", "main has no commit yet")
    repo.git("bundle", "create", "-q", args.out, "refs/heads/main", "refs/heads/git-annex")
    repo.git("bundle", "verify", "-q", args.out)
    heads = repo.out("bundle", "list-heads", args.out).split()
    result.update(result="written", main=repo.ref("refs/heads/main"), bundle_sha256=sha256_file(args.out),
                  heads=sorted(h for h in heads if h.startswith("refs/")))


def bundle_heads(repo, path, need):
    if not path or not os.path.isabs(path) or not os.path.isfile(path):
        raise Fail("usage", "--bundle must be an existing absolute file")
    repo.git("bundle", "verify", "-q", path)
    heads = repo.out("bundle", "list-heads", path).split()
    if any(h not in heads for h in need):
        raise Fail("precondition", f"bundle must carry {', '.join(need)}")


def phase_receive(repo, args, result):
    bundle_heads(repo, args.bundle, ("refs/heads/main", "refs/heads/git-annex"))
    local = repo.ref("refs/heads/main")
    if not index_matches(repo, local):
        raise Fail("ledger", "the index differs from local main; receive refuses to mix staged changes in")
    repo.git("fetch", "-q", args.bundle, "+refs/heads/main:refs/remotes/canonical/main",
             "+refs/heads/git-annex:refs/remotes/canonical/git-annex")
    c = repo.ref("refs/remotes/canonical/main")
    if local and repo.git("merge-base", "--is-ancestor", local, c, check=False).returncode != 0:
        raise Fail("diverged", "local main is not an ancestor of canonical main")
    for m in ("MANIFEST.json", "MANIFEST.sha256"):
        if not os.path.isfile(os.path.join(repo.root, m)) or repo.worktree_blob(m) != repo.out("rev-parse", f"{c}:{m}").strip():
            raise Fail("ledger", f"worktree {m} is not the canonical one (replication not arrived?)")
    ledger, _head, _ = preflight(repo, args, result)
    rule = repo.ext_rule()
    ctree = repo.tree_entries(c)
    ckeys, craw = source_pointers(repo, ctree)
    if craw:
        raise Fail("raw-in-git", "canonical commit carries non-pointer source content", craw)
    if set(ckeys) != set(ledger) or any(not key_matches(k, p, *ledger[p], rule) for p, k in ckeys.items()):
        raise Fail("ledger", "canonical tree and canonical ledger disagree")
    lkeys = source_pointers(repo, repo.tree_entries(local))[0]
    delta = sorted(p for p, k in ckeys.items() if lkeys.get(p) != k)
    bad = check_regular(repo.root, delta, ledger)
    if bad:
        raise Fail("ledger", "local copy differs from the canonical ledger or is not a regular file", bad)
    cmeta = sorted(p for p in ctree if p in METADATA)
    wrong = [p for p in cmeta if not os.path.isfile(os.path.join(repo.root, p)) or repo.worktree_blob(p) != ctree[p][1]]
    if wrong:
        raise Fail("ledger", "worktree metadata differs from canonical (align it before receive)", wrong)
    pre = repo.index_entries()
    before = {p: pre.get(p) for p in delta + cmeta}
    try:
        bad = admit(repo, delta, lambda p, k: ckeys.get(p) == k)
        if bad:
            raise Fail("key", "annex add did not reproduce the canonical key", bad)
        repo.git("add", "--", *cmeta, literal=True)
        guard_index(repo, ledger, ckeys)
        if repo.out("write-tree").strip() != repo.out("rev-parse", c + "^{tree}").strip():
            raise Fail("tree", "staged tree differs from the canonical tree")
        bad = check_objects(repo, {ledger[p][1]: ckeys[p] for p in delta})
        if bad:
            raise Fail("key", "annex object missing or differs from the ledger", bad)
    except BaseException as e:
        rollback(repo, before, e, result)
        raise
    repo.git("update-ref", "refs/heads/main", c, local or ZERO_OID)
    repo.git("annex", "merge")
    result.update(result="adopted" if local != c else "unchanged", main=c, admitted=len(delta))


def phase_merge_log(repo, args, result):
    if not args.source or not REMOTE_NAME_RE.match(args.source):
        raise Fail("usage", "merge-log needs --from NAME (letters, digits, '_' or '-')")
    bundle_heads(repo, args.bundle, ("refs/heads/git-annex",))
    before = repo.ref("refs/heads/git-annex")
    repo.git("fetch", "-q", args.bundle, f"+refs/heads/git-annex:refs/remotes/{args.source}/git-annex")
    repo.git("annex", "merge")
    after = repo.ref("refs/heads/git-annex")
    result.update(result="merged" if after != before else "unchanged", git_annex_before=before, git_annex_after=after)


def phase_verify(repo, args, result):
    if args.staged:
        keys, raw = source_pointers(repo, repo.index_entries())
        result["counts"] = {"pointer": len(keys), "raw": len(raw)}
        if raw:
            raise Fail("raw-in-git", "non-pointer source content is staged", raw)
        result["result"] = "verified"
        return
    rev = args.commit or "HEAD"
    c = repo.ref(rev)
    if not c:
        raise Fail("precondition", f"{rev} names no commit")
    result["commit"] = repo.out("show", "--no-patch", "--date=iso-strict", "--format=%H %ad %s", c).strip()
    ledger = load_ledger(repo.root, repo.out("show", f"{c}:MANIFEST.json"), repo.out("show", f"{c}:MANIFEST.sha256"))
    keys, raw = source_pointers(repo, repo.tree_entries(c))
    rule = repo.ext_rule()
    paths = read_paths_from(args.paths_from) if args.paths_from else sorted(ledger)
    result["scope"], result["selected"] = ("paths-from" if args.paths_from else "ledger"), len(paths)
    if not paths:
        raise Fail("verify", "the commit's ledger lists no file; nothing was verified")
    check_paths(repo.root, [p for p in paths if p in ledger])  # never read through a symlinked parent
    locs = repo.content_locations(keys[p] for p in paths if p in keys) if args.objects else {}
    cats = {}
    for p in paths:
        full = os.path.join(repo.root, p)
        if p not in ledger:
            cat = "no-ledger"
        elif p in raw or p not in keys or not key_matches(keys[p], p, *ledger[p], rule):
            cat = "key-ledger"
        else:
            try:
                st = os.lstat(full)
            except FileNotFoundError:
                st = None
            if st is None or (stat.S_ISLNK(st.st_mode) and not os.path.exists(full)):
                cat = "unretrieved"
            elif not stat.S_ISREG(st.st_mode):
                cat = "mismatch"
            else:
                with open(full, "rb") as f:
                    head = f.read(len(POINTER_PREFIX))
                if head == POINTER_PREFIX and st.st_size < POINTER_MAX:
                    cat = "unretrieved"
                elif sha256_file(full) != ledger[p][1]:
                    cat = "mismatch"
                else:
                    cat = "match"
        if cat == "match" and args.objects:
            loc = locs.get(keys[p])
            if not loc or sha256_file(os.path.join(repo.root, loc)) != ledger[p][1]:
                cat = "object-missing"
        cats.setdefault(cat, []).append(p)
    result["counts"] = {k: len(v) for k, v in sorted(cats.items())}
    bad = [p for k, v in cats.items() if k != "match" for p in v]
    if bad:
        raise Fail("verify", "ledger comparison found non-matching paths", bad)
    result["result"] = "verified"


PHASES = {
    "preflight": lambda repo, args, result: (preflight(repo, args, result), result.update(result="ready")),
    "checkpoint": phase_checkpoint,
    "bundle": phase_bundle,
    "receive": phase_receive,
    "merge-log": phase_merge_log,
    "verify": phase_verify,
}


def main(argv=None):
    ap = argparse.ArgumentParser(prog="corpus-archive", description=__doc__.split("\n")[0])
    ap.add_argument("phase", choices=sorted(PHASES))
    ap.add_argument("--corpus", required=True, help="absolute corpus root (the Git top level)")
    ap.add_argument("--annex-bin", help="directory prepended to PATH for git/git-annex child processes only")
    ap.add_argument("--floor-bytes", type=int, default=5 * 1024 ** 3, help="free space that must remain after admission")
    ap.add_argument("--lock-fd", type=int, help="inherited descriptor on which the caller holds the custody lock "
                    "(required by mutating phases; checked by preflight/verify when given)")
    ap.add_argument("--standalone", action="store_true", help="operator use: take the custody lock here (non-blocking)")
    ap.add_argument("--bootstrap", action="store_true", help="checkpoint: first commit may include already staged metadata")
    ap.add_argument("--worked-with", action="append", default=[], metavar="ID", help="one known garden id per flag")
    ap.add_argument("--bundle", help="receive/merge-log: absolute bundle path")
    ap.add_argument("--from", dest="source", help="merge-log: name for the bundle's host")
    ap.add_argument("--out", help="bundle: absolute output path")
    ap.add_argument("--commit", help="verify: commit to compare against (default HEAD)")
    ap.add_argument("--staged", action="store_true", help="verify: only check that staged source entries are pointers")
    ap.add_argument("--objects", action="store_true", help="verify: also hash each annex object")
    ap.add_argument("--paths-from", help="verify: UTF-8 file, one relative ledger path per line (no empty line or repeat)")
    ap.add_argument("--show-paths", action="store_true", help="include failing relative paths in the JSON")
    try:
        args = ap.parse_args(argv)
    except SystemExit as e:
        return EXIT["usage"] if e.code else 0
    result = {"phase": args.phase, "ok": False}
    try:
        if not os.path.isabs(args.corpus) or not os.path.isdir(args.corpus):
            raise Fail("usage", "--corpus must be an existing absolute directory")
        if args.lock_fd is not None and args.standalone:
            raise Fail("usage", "--lock-fd and --standalone are exclusive")
        if any(not GARDEN_ID_RE.match(i) for i in args.worked_with):
            raise Fail("usage", "--worked-with takes one garden id (YYYYMMDDTHHMMSS-xxxxxx) per flag")
        repo = Repo(os.path.realpath(args.corpus), args.annex_bin)
        if args.phase in MUTATING or args.lock_fd is not None or args.standalone:
            take_lock(repo, args, result)  # once per process: --standalone never opens the lock twice
        PHASES[args.phase](repo, args, result)
        result["ok"] = True
        code = 0
    except Fail as f:
        result.update(error=f.kind, message=str(f), failing=len(f.paths))
        if args.show_paths and f.paths:
            result["paths"] = sorted(f.paths)[:200]
        sys.stderr.write(f"corpus-archive {args.phase}: {f.kind}: {f}\n")
        code = EXIT[f.kind]
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return code


if __name__ == "__main__":
    sys.exit(main())
