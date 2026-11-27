#!/usr/bin/env python3
"""Run driver for the memory-task evaluation sets. Nothing here spends subscription turns unless
`run` gets BOTH --allow-subscription-turns and --go <sha256 of the pinned run record>.

  drive.py dry-run  --set S --fixtures DIR                      order only
  drive.py boundary --set S --fixtures DIR --build DIR [--index DIR --corpus-root DIR]
                    sandbox visibility check + catalog with a placeholder credential, no model;
                    with --index (v1 only) also a model-free tool smoke (local embedding)
  drive.py freeze-builds --build BASE_DIR --improved-build DIR --base-commit SHA40 --patch FILE
                    --expect-patch-sha SHA --deps-ledger FILE --deps-links FILE [--andenken REPO]
                    --record NEW.json
                    verifies source=base, source=base+one diff, one shared node_modules equal to the
                    owner's ledger, dist=fresh compile; writes a path-free variant freeze. Required
                    BEFORE any v2 corpus, task, gold, control or generator leaves the evaluator
  drive.py pin      --set S --fixtures DIR --index DIR --build DIR [--corpus-root DIR] --record NEW.json
                    (v2 also: --improved-build DIR --variant-freeze FREEZE.json)
                    index gate + write the run record
  drive.py retrieve (v2) same inputs as run, no chat model, no credential: probe.mjs per build.
                    THE FIRST RETRIEVAL FREEZES THE SET (see v2/RUBRIC.md).
  drive.py run      --record R.json --go SHA --allow-subscription-turns --out NEWDIR

Every execution is a bwrap sandbox: no host home, a throwaway agent dir (for `run`: only the openai
OAuth entry, refresh disabled, deleted afterwards), a fresh copy of the index, the synthetic corpus
read-only; gold is never mounted. The network namespace is shared with the host (model rail and
loopback Ollama), so egress is NOT restricted.
"""
import argparse, hashlib, importlib.util, json, os, random, re, shutil, signal, subprocess, sys, tempfile, threading, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
SETS = json.loads((HERE/"sets.json").read_text())
PROVIDER, MODEL, THINKING = "openai", "gpt-6.2-sol", "medium"
PI_VERSION = "1.6.1"
BGE_DIGEST = "7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab"
TIMEOUT_S = 180
MIN_TOKEN_LIFE_S = 45 * 60  # re-check against len(jobs) * TIMEOUT_S before every batch
SYSTEM = ("You answer questions about past decisions in fictional projects. "
	"You may use a search tool only if one is available. Never invent: when a fact is not supported by what you can actually see, answer \"unknown\". "
	"Report the decision currently in force, not drafts, quotations or other projects. "
	"End with exactly one JSON object with string keys decision, constraint, rejected_option, rejected_reason, unrecorded, "
	"and citations: a list of {\"slot\":..., \"file\": <session file name>, \"line\": <number>} taken only from search results ([] if you have none).")

sha_file = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def forbidden_strings():
	"""Strings that must never appear in a run's events: this host's home and personal stores."""
	return (str(Path.home()), "/repos/gh", "/org/", ".env.local", "/sync/")

def scorer(name):
	spec = importlib.util.spec_from_file_location(f"memeval_score_{name}", HERE/name/"score.py")
	m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def andenken_dir(a):
	return Path(a.andenken or os.environ.get("ANDENKEN_DIR") or Path.home()/"repos/gh/andenken").resolve()

def pi_package(a):
	if a.pi_package or os.environ.get("PI_PACKAGE_DIR"): found = [Path(a.pi_package or os.environ["PI_PACKAGE_DIR"])]
	else:
		store = Path(os.environ.get("PNPM_HOME") or Path.home()/".local/share/pnpm")/"store"
		found = [p.parent for p in store.glob(f"*/links/@earendil-works/pi-coding-agent/{PI_VERSION}/*/node_modules/@earendil-works/pi-coding-agent/package.json")]
	if len(found) != 1 or json.loads((found[0]/"package.json").read_text())["version"] != PI_VERSION:
		sys.exit(f"need exactly one Pi {PI_VERSION} package; pass --pi-package")
	return found[0].resolve()

def check_fixtures(name, fx):
	"""Generated files must be the frozen ones, and the set's code must match what generated them."""
	fz = json.loads((fx/"freeze.json").read_text())
	files = sorted(p for p in fx.rglob("*") if p.is_file() and p.name != "freeze.json")
	agg = hashlib.sha256("".join(f"{p.relative_to(fx)}\0{sha_file(p)}\n" for p in files).encode()).hexdigest()
	if agg != fz["fixtures"] or agg != SETS[name]["fixtures"]: sys.exit("fixtures differ from the frozen set")
	for f, want in fz["code"].items():
		if sha_file(HERE/name/f) != want: sys.exit(f"{name}/{f} changed after freeze")
	if "freezeJsonSha256" in SETS[name] and sha_file(fx/"freeze.json") != SETS[name]["freezeJsonSha256"]: sys.exit("freeze.json differs from the frozen record")

def tree(d):
	return {str(p.relative_to(d)): sha_file(p) for p in sorted(Path(d).rglob("*")) if p.is_file()}

def corpus_root(corpus, fx):
	root = Path(corpus).resolve() if corpus else fx/"corpus"
	if tree(root) != tree(fx/"corpus"): sys.exit("corpus root differs from the frozen corpus")
	return root

def prompt(t):
	return f"{t['ask']}\nFill: decision (what is in force), constraint (the hard limit), rejected_option, rejected_reason, and unrecorded = {t['unrecorded']}"

def plan(name, tasks, arms):
	jobs = [(t, a) for t in tasks for a in arms]
	random.Random(SETS[name]["seed"]).shuffle(jobs)
	return jobs

def pi_args(name, arm, text=None):
	c = ["--offline","--no-session","--no-extensions","--no-mcp","--no-skills","--no-prompt-templates","--no-themes","--no-context-files","--no-approve"]
	if arm == "off": c += ["--no-tools"]
	else: c += ["--extension", "/guard/guard.mjs" if SETS[name]["guard"] else "/andenken/dist/index.js", "--no-builtin-tools","--tools","session_search"]
	if text is not None: c += ["--provider",PROVIDER,"--model",MODEL,"--thinking",THINKING,"--system-prompt",SYSTEM,"--mode","json","--",text]
	return c

def dist_hash(build):
	return hashlib.sha256("".join(f"{p.name}:{sha_file(p)};" for p in sorted(Path(build,"dist").glob("*.js"))).encode()).hexdigest()

def deps_of(build):
	"""What a build is made and run with: dependency manifests and build config, no paths."""
	b = Path(build)
	need = {"packageJson": b/"package.json", "tsconfig": b/"tsconfig.json", "lock": b/"pnpm-lock.yaml", "installedLock": b/"node_modules/.pnpm/lock.yaml", "lancedb": b/"node_modules/@lancedb/lancedb/package.json"}
	missing = [k for k, p in need.items() if not p.is_file()]
	if missing: sys.exit(f"build lacks dependency manifests: {missing}")
	return {**{k: sha_file(p) for k, p in need.items() if k != "lancedb"}, "lancedbVersion": json.loads(need["lancedb"].read_text())["version"]}

NOT_SOURCE = ("dist", "node_modules")  # top-level entries of a build dir that are not base+patch source
PATCH_MAY_NOT_TOUCH = ("package.json", "tsconfig.json", "pnpm-lock.yaml", "dist", "node_modules")

def entries(root, skip=()):
	"""{relative path: content hash | link target} for a tree; links are never followed."""
	root = Path(root); out = {}
	for d, dirs, files in os.walk(root):
		if Path(d) == root:
			dirs[:] = [x for x in dirs if x not in skip]; files = [x for x in files if x not in skip]
		for n in dirs + files:
			p = Path(d)/n; rel = p.relative_to(root).as_posix()
			if p.is_symlink(): out[rel] = "link:" + os.readlink(p)
			elif p.is_file(): out[rel] = sha_file(p)
	return out

def tree_hash(root, skip=()):
	return hashlib.sha256(json.dumps(entries(root, skip), sort_keys=True).encode()).hexdigest()

def deps_tree(build):
	"""The installed dependency bytes themselves; refuses links that leave the tree."""
	nm = Path(build, "node_modules").resolve()
	have = entries(nm)
	for rel, v in have.items():
		if v.startswith("link:") and not (nm/rel).resolve().is_relative_to(nm): sys.exit("a dependency link leaves node_modules")
	return nm, have

def check_ledger(have, files_ledger, links_ledger):
	"""Owner's shared-dependency ledger (`sha256  ./path` and `./path<TAB>target`) must equal what is installed."""
	files = {l.split("  ", 1)[1].removeprefix("./"): l.split("  ", 1)[0] for l in Path(files_ledger).read_text().splitlines()}
	links = {l.split("\t", 1)[0].removeprefix("./"): "link:" + l.split("\t", 1)[1] for l in Path(links_ledger).read_text().splitlines()}
	if {**files, **links} != have: sys.exit("installed dependencies differ from the shared dependency ledger")
	return {"filesSha256": sha_file(files_ledger), "linksSha256": sha_file(links_ledger), "files": len(files), "links": len(links)}

def clean_env(tmp):
	return {"PATH": os.environ["PATH"], "HOME": str(tmp), "GIT_CEILING_DIRECTORIES": str(tmp), "GIT_CONFIG_NOSYSTEM": "1"}

def must(cmd, tmp, cwd, why, **kw):
	p = subprocess.run(cmd, cwd=cwd, env=clean_env(tmp), capture_output=True, timeout=600, **kw)
	if p.returncode: sys.exit(why)
	return p.stdout

def export_base_and_variant(andenken, commit, patch, tmp):
	"""base = `git archive commit`; variant = a second copy of it with exactly this one diff applied."""
	text = Path(patch).read_text()
	heads = [l for l in text.splitlines() if l.startswith("diff --git ")]
	if not heads or len(heads) != len(set(heads)) or re.search(r"(?m)^From [0-9a-f]{40} ", text): sys.exit("--patch must be one plain git diff, not a series or a concatenation")
	archive = must(["git", "-C", str(andenken), "archive", "--format=tar", commit], tmp, tmp, "cannot archive the base commit")
	trees = {}
	for arm in ("baseline", "improved"):
		trees[arm] = tmp/arm; trees[arm].mkdir()
		must(["tar", "-x", "-C", str(trees[arm])], tmp, tmp, "cannot unpack the base archive", input=archive)
	patch = str(Path(patch).resolve())
	touched = [l.split("\t")[2] for l in must(["git", "apply", "--numstat", patch], tmp, trees["improved"], "patch is unreadable").decode().splitlines()]
	if any(t == n or t.startswith(n + "/") for t in touched for n in PATCH_MAY_NOT_TOUCH): sys.exit("patch touches dependencies, config or build output")
	must(["git", "apply", "--whitespace=nowarn", patch], tmp, trees["improved"], "patch does not apply cleanly to the base commit")
	return trees, len(touched)

def freeze_builds(a):
	"""Fix both builds before the comparison corpus exists outside the evaluator. Verified here:
	same base commit, ONE diff between the two sources, same installed dependencies, and each dist
	equal to a fresh compile of its verified source."""
	if not re.fullmatch(r"[0-9a-f]{40}", a.base_commit): sys.exit("--base-commit must be a full 40-hex commit")
	if a.base_commit != SETS["v2"]["baseCommit"]: sys.exit(f"both v2 builds must come from base {SETS['v2']['baseCommit']} (sets.json)")
	if len(a.patch) != 1: sys.exit("exactly one --patch is allowed")
	patch = a.patch[0]
	if not Path(patch).is_file() or not Path(patch).stat().st_size: sys.exit("--patch must be a non-empty file")
	if sha_file(patch) != a.expect_patch_sha: sys.exit("patch hash differs from the announced variant hash")
	builds = {"baseline": Path(a.build).resolve(), "improved": Path(a.improved_build).resolve()}
	deps = deps_of(builds["baseline"])
	if deps_of(builds["improved"]) != deps: sys.exit("builds do not share the same dependencies and config")
	nm, installed = deps_tree(builds["baseline"])
	if deps_tree(builds["improved"])[0] != nm: sys.exit("builds do not use one shared node_modules")
	ledger = check_ledger(installed, a.deps_ledger, a.deps_links)
	if not all(any((b/"dist").glob("*.js")) for b in builds.values()): sys.exit("a build has no dist/*.js")
	dist = {arm: dist_hash(b) for arm, b in builds.items()}
	if dist["baseline"] == dist["improved"]: sys.exit("improved dist is identical to baseline")
	with tempfile.TemporaryDirectory(prefix="memeval-freeze-") as t:
		tmp = Path(t).resolve()
		trees, touched = export_base_and_variant(andenken_dir(a), a.base_commit, patch, tmp)
		source = {}
		for arm, build in builds.items():
			source[arm] = tree_hash(trees[arm], NOT_SOURCE)
			if tree_hash(build, NOT_SOURCE) != source[arm]:
				sys.exit(f"{arm} source is not " + ("the base commit" if arm == "baseline" else "the base commit plus exactly this patch"))
			(trees[arm]/"node_modules").symlink_to(nm)
			out = tmp/f"{arm}-out"
			must(["node", "node_modules/typescript/bin/tsc", "--pretty", "false", "--outDir", str(out)], tmp, trees[arm], f"{arm} does not compile")
			if entries(out) != entries(build/"dist"): sys.exit(f"{arm} dist differs from a fresh compile of its source")
	if deps_tree(builds["baseline"])[1] != installed: sys.exit("dependencies changed during verification")
	rec = {"kind": "memeval-variant-freeze-v2", "baseCommit": a.base_commit, "patchSha256": sha_file(patch), "patchFiles": touched,
		"source": source, "dist": dist, "distTree": {arm: tree_hash(b/"dist") for arm, b in builds.items()},
		"deps": deps, "depsTree": hashlib.sha256(json.dumps(installed, sort_keys=True).encode()).hexdigest(), "depsLedger": ledger,
		"verified": ["source=base", "source=base+one-diff", "shared-deps=ledger", "dist=rebuild"], "node": must_version(),
		"recordedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
	with open(a.record, "x") as f: json.dump(rec, f, indent=1)
	print("variant freeze sha256", sha_file(a.record))

def must_version():
	return subprocess.run(["node", "--version"], capture_output=True, text=True, check=True).stdout.strip()

def check_variant_freeze(path, builds, base_commit):
	"""Returns the record. No build path is assumed: both arms are whatever matches these pins."""
	v = json.loads(Path(path).read_text())
	if v.get("kind") != "memeval-variant-freeze-v2": sys.exit("not a variant freeze record")
	if v.get("baseCommit") != base_commit: sys.exit("variant freeze is not on the set's base commit")
	if not re.fullmatch(r"[0-9a-f]{64}", str(v.get("patchSha256"))): sys.exit("variant freeze has no patch hash")
	if set(v.get("verified", [])) != {"source=base", "source=base+one-diff", "shared-deps=ledger", "dist=rebuild"}: sys.exit("variant freeze lacks a required verification")
	if set(builds) != {"baseline","improved"} or v["dist"]["baseline"] == v["dist"]["improved"]: sys.exit("variant freeze needs two different builds")
	for arm, build in builds.items():
		if dist_hash(build) != v["dist"][arm] or tree_hash(Path(build)/"dist") != v["distTree"][arm]: sys.exit(f"{arm} dist differs from the variant freeze")
		if tree_hash(build, NOT_SOURCE) != v["source"][arm]: sys.exit(f"{arm} source differs from the variant freeze")
		if deps_of(build) != v["deps"]: sys.exit(f"{arm} dependencies or config differ from the variant freeze")
	roots = {Path(b, "node_modules").resolve() for b in builds.values()}
	if len(roots) != 1 or hashlib.sha256(json.dumps(deps_tree(next(iter(builds.values())))[1], sort_keys=True).encode()).hexdigest() != v["depsTree"]:
		sys.exit("shared dependencies differ from the variant freeze")
	return v

class Box:
	"""One throwaway sandbox root. Host requirements: bwrap, a /nix/store node, system CA bundle."""
	def __init__(self, a, name, build, corpus, index=None):
		self.tmp = tempfile.TemporaryDirectory(prefix="memeval-box-"); root = Path(self.tmp.name)
		self.work, self.home, self.agent, self.data = (root/n for n in ("work","home","agent","data"))
		for d in (self.work, self.home): d.mkdir()
		self.agent.mkdir(mode=0o700)
		(self.agent/"settings.json").write_text(json.dumps({"retry":{"enabled":False,"provider":{"maxRetries":0}},"compaction":{"enabled":False}}))
		if index: shutil.copytree(index, self.data)  # every run starts from the same index bytes
		else: self.data.mkdir()
		self.pi, self.name, self.build, self.corpus = pi_package(a), name, Path(build).resolve(), Path(corpus)

	def argv(self, command):
		node = os.path.realpath(shutil.which("node") or ""); bwrap = shutil.which("bwrap")
		if not bwrap or not node.startswith("/nix/store/"): sys.exit("need bwrap and a /nix/store node (see README dependencies)")
		deps = self.pi.parent.parent
		binds = [("/nix/store","/nix/store"), ("/etc/resolv.conf","/etc/resolv.conf"), ("/etc/ssl/certs/ca-certificates.crt","/etc/ssl/certs/ca-certificates.crt"),
			(self.pi,"/pi"), (os.path.realpath(deps/"jiti"),"/node_modules/jiti"), (os.path.realpath(deps/"undici"),"/node_modules/undici"),
			(self.build/"dist","/andenken/dist"), (self.build/"package.json","/andenken/package.json"), (os.path.realpath(self.build/"node_modules"),"/andenken/node_modules"),
			(self.corpus,self.corpus),  # same path inside: index rows carry it
			(self.work,"/work"), (self.home,"/home/fixture")]
		if SETS[self.name]["guard"]: binds.append((HERE/self.name/"guard.mjs","/guard/guard.mjs"))
		c = ["env","-i",bwrap,"--die-with-parent","--new-session","--unshare-pid","--unshare-ipc","--unshare-uts","--hostname","fixture",
			"--proc","/proc","--dev","/dev","--tmpfs","/tmp","--tmpfs","/dev/shm"]
		for src, dst in binds: c += ["--ro-bind",str(src),str(dst)]
		c += ["--bind",str(self.agent),"/agent","--bind",str(self.data),"/fixture-data"]
		env = {"HOME":"/home/fixture","USER":"fixture","LANG":"C.UTF-8","PATH":os.path.dirname(node),"PI_CODING_AGENT_DIR":"/agent","PI_OFFLINE":"1",
			"ANDENKEN_ENV_MODE":"process-only","ANDENKEN_DATA":"/fixture-data","ANDENKEN_SESSION_PROFILE":"ollama-bge-m3-1024",
			"ANDENKEN_MD_PROFILE":"ollama-bge-m3-1024","ANDENKEN_DISABLE_RECALL_TRACKING":"1","RAYON_NUM_THREADS":"2"}
		for k, v in env.items(): c += ["--setenv",k,v]
		return c + ["--chdir","/work","--",node,*command]

	def call(self, command, timeout=90):
		return subprocess.run(self.argv(command), capture_output=True, text=True, timeout=timeout)

PROBE = """
const fs = require("fs"); const [corpus, ...hidden] = process.argv.slice(1); const bad = [];
for (const p of [...hidden, "/home/fixture/.env.local", "/run/user", "/mnt", "/agent/auth.json", corpus + "/../tasks.json"]) if (fs.existsSync(p)) bad.push("visible:" + p.split("/").pop());
try { fs.writeFileSync(corpus + "/x", ""); bad.push("corpus-writable"); } catch {}
if (!fs.existsSync(corpus + "/synth")) bad.push("corpus-missing");
const allowed = /^(HOME|USER|LANG|PATH|PI_CODING_AGENT_DIR|PI_OFFLINE|ANDENKEN_(ENV_MODE|DATA|SESSION_PROFILE|MD_PROFILE|DISABLE_RECALL_TRACKING)|RAYON_NUM_THREADS|PWD|SHLVL)$/;
for (const k of Object.keys(process.env)) if (!allowed.test(k)) bad.push("env:" + k);
(async () => { const j = await (await fetch("http://127.0.0.1:11435/api/tags")).json();
const digest = j.models.find((m) => m.name === "bge-m3:latest")?.digest;
if (digest === undefined) bad.push("no-bge");
console.log(JSON.stringify({ bad, digest })); process.exit(bad.length ? 1 : 0); })();
"""

# Model-free: the pinned extension's session_search with a stand-in registrar; v1 filler query only.
SMOKE = """
const tools = {}; const noop = () => {};
(await import("/andenken/dist/index.js")).default({ on: noop, registerTool: (t) => (tools[t.name] = t), registerCommand: noop });
const r = await tools.session_search.execute("smoke", { query: "library shelf labels", limit: 5 });
const rows = r.details.results;
const out = { rows: rows.length, degraded: r.details.degraded, fts: r.details.diagnostics?.fts?.status,
	outside: rows.filter((x) => !x.sessionFile.startsWith(process.argv[2] + "/")).length };
console.log(JSON.stringify(out)); process.exit(out.rows && !out.outside && out.fts === "ok" && !out.degraded ? 0 : 1);
"""

INDEX_GATE = """
const [idx, corpus, andenken, gold, wantRows, wantFiles] = process.argv.slice(1);
const fs = require("fs"), path = require("path");
const lancedb = require(require.resolve("@lancedb/lancedb", { paths: [andenken] }));
(async () => { const t = await (await lancedb.connect(idx + "/sessions.lance")).openTable("session_chunks");
const rows = await t.query().select(["sessionFile", "lineNumber"]).limit(100000).toArray();
const outside = rows.filter((r) => !r.sessionFile.startsWith(corpus + "/")).length;
const files = new Set(rows.map((r) => r.sessionFile)).size;
const have = new Set(rows.map((r) => path.basename(r.sessionFile) + ":" + r.lineNumber));
const missingEvidence = Object.values(JSON.parse(fs.readFileSync(gold, "utf8"))).flatMap((g) => Object.values(g.evidence).flat()).filter((e) => !have.has(e.file + ":" + e.line)).length;
console.log(JSON.stringify({ rows: rows.length, files, outside, missingEvidence }));
process.exit(rows.length === Number(wantRows) && files === Number(wantFiles) && !outside && !missingEvidence ? 0 : 1); })();
"""

def index_gate(a, name, idx, corpus, fx):
	if any((Path(idx)/n).exists() for n in ("md.lance","openclaw.lance")): sys.exit("index dir has another axis")
	with tempfile.TemporaryDirectory(prefix="memeval-gate-") as g:  # the handed-over store is never opened
		shutil.copytree(idx, Path(g)/"d")
		p = subprocess.run(["node","-e",INDEX_GATE,str(Path(g)/"d"),str(corpus),str(andenken_dir(a)),str(fx/"gold.json"),str(SETS[name]["rows"]),str(SETS[name]["files"])], capture_output=True, text=True)
	if p.returncode: sys.exit("index gate failed: " + p.stdout.strip())
	return json.loads(p.stdout)

def boundary(a):
	fx = Path(a.fixtures).resolve(); check_fixtures(a.set, fx); corpus = corpus_root(a.corpus_root, fx)
	box = Box(a, a.set, a.build, corpus, a.index and Path(a.index).resolve())
	r = box.call(["-e", PROBE, str(corpus), str(Path.home()), str(fx/"gold.json")])
	print("boundary rc", r.returncode, r.stdout.strip(), r.stderr.strip()[-300:])
	ok = r.returncode == 0 and BGE_DIGEST in r.stdout
	if a.index and a.set == "v1":
		(box.work/"smoke.mjs").write_text(SMOKE)
		m = box.call(["/work/smoke.mjs", str(corpus)])
		print("tool smoke rc", m.returncode, m.stdout.strip()[:400], m.stderr.strip()[-300:]); ok &= m.returncode == 0
	# Placeholder credential, never the real file: only shows Pi starts and lists the pinned model in the box.
	(box.agent/"auth.json").write_text(json.dumps({"openai":{"type":"oauth","access":"probe-placeholder","refresh":"probe-placeholder","expires":int((time.time()+86400)*1000)}}))
	for arm in SETS[a.set]["arms"]:
		c = box.call(["/pi/dist/bundle/cli.js", *pi_args(a.set, arm), "--list-models", MODEL])
		listed = any(l.split()[:2] == [PROVIDER, MODEL] for l in c.stdout.splitlines())
		print(arm, "catalog rc", c.returncode, "pinned model listed:", listed, "| stderr:", c.stderr.strip()[:200]); ok &= listed and c.returncode == 0
	if not ok: sys.exit("boundary check failed")

def pin(a):
	fx = Path(a.fixtures).resolve(); name = a.set; check_fixtures(name, fx); corpus = corpus_root(a.corpus_root, fx)
	idx = Path(a.index).resolve()
	if "improved" in SETS[name]["arms"] and not (a.improved_build and a.variant_freeze): sys.exit(f"{name} pin needs --improved-build and --variant-freeze")
	builds = {arm: str(Path(a.improved_build if arm == "improved" else a.build).resolve()) for arm in SETS[name]["arms"]}
	variant = None
	if "improved" in builds:
		pins = check_variant_freeze(a.variant_freeze, builds, SETS[name]["baseCommit"])
		# The run record carries the pins themselves, not only a pointer to them.
		variant = {"path": str(Path(a.variant_freeze).resolve()), "sha256": sha_file(a.variant_freeze), "pins": pins}
	tasks = json.loads((fx/"tasks.json").read_text())
	rec = {"set": name, "fixturesDir": str(fx), "fixtures": SETS[name]["fixtures"], "freezeJsonSha256": sha_file(fx/"freeze.json"),
		"driveSha256": sha_file(__file__), "setsSha256": sha_file(HERE/"sets.json"), "scoreSha256": sha_file(HERE/name/"score.py"),
		"index": str(idx), "indexTree": hashlib.sha256(json.dumps(tree(idx), sort_keys=True).encode()).hexdigest(), "gate": index_gate(a, name, idx, corpus, fx),
		"corpusRoot": str(corpus), "variantFreeze": variant, "builds": builds, "dist": {k: dist_hash(v) for k, v in builds.items()},
		"model": f"{PROVIDER}/{MODEL}", "thinking": THINKING, "timeoutS": TIMEOUT_S, "maxToolAttempts": SETS[name]["maxToolAttempts"],
		"order": [[t["id"], arm] for t, arm in plan(name, tasks, list(builds))]}
	with open(a.record, "x") as f: json.dump(rec, f, indent=1)
	print("run record sha256", sha_file(a.record), "| gate", rec["gate"])

def load_record(a):
	rec = json.loads(Path(a.record).read_text()); fx = Path(rec["fixturesDir"]); name = rec["set"]
	check_fixtures(name, fx); corpus = corpus_root(rec["corpusRoot"], fx); idx = Path(rec["index"])
	now = {"driveSha256": sha_file(__file__), "setsSha256": sha_file(HERE/"sets.json"), "scoreSha256": sha_file(HERE/name/"score.py"),
		"indexTree": hashlib.sha256(json.dumps(tree(idx), sort_keys=True).encode()).hexdigest(), "dist": {k: dist_hash(v) for k, v in rec["builds"].items()}}
	drift = [k for k, v in now.items() if rec[k] != v]
	if drift: sys.exit(f"changed after pin: {drift}")
	if "improved" in SETS[name]["arms"]:
		v = rec.get("variantFreeze")
		if not v or sha_file(v["path"]) != v["sha256"]: sys.exit("variant freeze missing or changed after pin")
		if check_variant_freeze(v["path"], rec["builds"], SETS[name]["baseCommit"]) != v["pins"]: sys.exit("run record pins differ from the variant freeze")
		if v["pins"]["dist"] != rec["dist"]: sys.exit("run record dist differs from its variant pins")
	index_gate(a, name, idx, corpus, fx)
	return rec, name, fx, corpus, idx

def retrieve(a):
	rec, name, fx, corpus, idx = load_record(a)
	if name != "v2": sys.exit("retrieve is the v2 retrieval-only layer")
	out = Path(a.out); out.mkdir(mode=0o700)
	score = scorer(name); gold = json.loads((fx/"gold.json").read_text())
	for arm, build in rec["builds"].items():
		box = Box(a, name, build, corpus, idx)
		shutil.copy(HERE/name/"probe.mjs", box.work/"probe.mjs"); shutil.copy(fx/"tasks.json", box.work/"tasks.json")
		p = box.call(["/work/probe.mjs", "/work/tasks.json"], timeout=TIMEOUT_S)
		(out/f"{arm}.probe.jsonl").write_text(p.stdout)
		if p.returncode: sys.exit(f"probe failed for {arm}: {p.stderr[-300:]}")
		for line in p.stdout.splitlines():
			r = json.loads(line); e = score.exposure([(x["file"], x["line"]) for x in r["rows"]], gold[r["id"]]["evidence"])
			row = {"arm": arm, "task": r["id"], "degraded": r["degraded"], "fts": r["fts"], **e}
			with open(out/"retrieval.jsonl","a") as f: f.write(json.dumps(row)+"\n")
			print(json.dumps(row))

def isolated_auth(a, path, need_s):
	"""Only the openai OAuth entry of the real auth file, refresh disabled. Never printed."""
	source = Path(a.auth_file or Path.home()/".pi/agent/auth.json")
	e = json.loads(source.read_text()).get("openai") or {}
	if e.get("type") != "oauth" or not e.get("access") or e.get("expires",0) < (time.time()+need_s)*1000:
		sys.exit("openai oauth entry missing or expiring too soon; the sandbox cannot refresh it")
	fd = os.open(path, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
	with os.fdopen(fd,"w") as f: json.dump({"openai": {**e, "refresh":"isolated-test-refresh-disabled"}}, f)

def run(a):
	# Opt-in comes first: without it nothing is read, created or contacted.
	if not a.allow_subscription_turns: sys.exit("refused: subscription turns are off by default (--allow-subscription-turns)")
	if not (a.record and a.go and a.out): sys.exit("run needs --record --go --out")
	if a.go != sha_file(a.record): sys.exit("--go must equal sha256 of the run record")
	# TERM/HUP must unwind too, so the finally block deletes the temporary credential.
	for sig in (signal.SIGTERM, signal.SIGHUP): signal.signal(sig, lambda n, _f: sys.exit(128 + n))
	rec, name, fx, corpus, idx = load_record(a)
	if set(rec["builds"]) != set(SETS[name]["arms"]): sys.exit("the record does not hold every arm of this set")
	score = scorer(name); gold = json.loads((fx/"gold.json").read_text())
	tasks = {t["id"]: t for t in json.loads((fx/"tasks.json").read_text())}
	need = max(MIN_TOKEN_LIFE_S, len(rec["order"]) * TIMEOUT_S + 600)
	out = Path(a.out); out.mkdir(mode=0o700); (out/"record.json").write_bytes(Path(a.record).read_bytes())
	banned = forbidden_strings()
	for i, (tid, arm) in enumerate(rec["order"], 1):
		box = Box(a, name, rec["builds"][arm], corpus, idx)
		start = time.monotonic(); events, calls, stop = [], 0, None
		try:
			isolated_auth(a, box.agent/"auth.json", need)
			argv = box.argv(["/pi/dist/bundle/cli.js", *pi_args(name, arm, prompt(tasks[tid]))])
			with open(out/f"{i:02d}.stderr","w") as err, open(out/f"{i:02d}.events.jsonl","w") as raw:
				p = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=err, stdin=subprocess.DEVNULL, text=True)
				killer = threading.Timer(TIMEOUT_S, p.kill); killer.start()
				for line in p.stdout:
					raw.write(line)
					if any(s in line for s in banned): stop = "forbidden-string"
					try: ev = json.loads(line)
					except json.JSONDecodeError: continue
					events.append(ev); calls += ev.get("type") == "tool_execution_start"
					if calls > rec["maxToolAttempts"]: stop = stop or "tool-cap"
					if stop: p.kill(); break
				rc = p.wait(); late = not killer.is_alive(); killer.cancel(); p.stdout.close()
		finally:
			(box.agent/"auth.json").unlink(missing_ok=True)
		row = {"n": i, "task": tid, "arm": arm, "rc": rc, "stop": stop or ("timeout" if late else None), "wallS": round(time.monotonic()-start, 1), **score.score(events, gold[tid])}
		with open(out/"results.jsonl","a") as f: f.write(json.dumps(row, ensure_ascii=False)+"\n")
		print(json.dumps({k: row[k] for k in ("n","task","arm","rc","stop","wallS","correct","grounded","unrecorded")}), flush=True)
		# No retry, no fallback: anything unclean stops the batch.
		if stop == "forbidden-string": sys.exit("aborted: a non-synthetic path string appeared")
		if rc and not row["stop"]: sys.exit("aborted: pi failed")
		retries = row.get("autoRetries", row.get("cost", {}).get("autoRetries", 0))
		if not row["stop"] and (row["stopReason"] != "stop" or retries or not row["models"]): sys.exit("aborted: model run did not end cleanly")
		if row["models"] and row["models"] != [f"{PROVIDER}/{MODEL}"]: sys.exit("aborted: unexpected provider/model")
	print("completed", len(rec["order"]), "runs")

def main(argv=None):
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("mode", choices=["dry-run","boundary","freeze-builds","pin","retrieve","run"])
	ap.add_argument("--set", choices=sorted(SETS))
	for f in ("--fixtures","--index","--build","--improved-build","--corpus-root","--record","--go","--out","--andenken","--pi-package","--auth-file","--variant-freeze","--base-commit","--expect-patch-sha","--deps-ledger","--deps-links"): ap.add_argument(f)
	ap.add_argument("--allow-subscription-turns", action="store_true")
	ap.add_argument("--patch", action="append", help="exactly one plain git diff")
	a = ap.parse_args(argv)
	need = {"dry-run": ("set","fixtures"), "boundary": ("set","fixtures","build"), "pin": ("set","fixtures","index","build","record"), "freeze-builds": ("build","improved_build","base_commit","patch","expect_patch_sha","deps_ledger","deps_links","record"), "retrieve": ("record","out"), "run": ()}[a.mode]
	missing = [n for n in need if not getattr(a, n)]
	if missing: ap.error(f"{a.mode} needs " + " ".join("--"+n.replace("_","-") for n in missing))
	if a.mode == "dry-run":
		fx = Path(a.fixtures).resolve(); check_fixtures(a.set, fx)
		for t, arm in plan(a.set, json.loads((fx/"tasks.json").read_text()), SETS[a.set]["arms"]): print(t["id"], arm)
		print("model turns: 0 (dry run)")
	else: {"boundary": boundary, "freeze-builds": freeze_builds, "pin": pin, "retrieve": retrieve, "run": run}[a.mode](a)

if __name__ == "__main__":
	main()
