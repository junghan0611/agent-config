#!/usr/bin/env python3
"""Offline regression for the memory-task eval assets. No Andenken, index, network, bwrap, auth or model.

Run: python3 tests/memory-task-eval/test_offline.py
All values below are neutral placeholders, deliberately unrelated to any set's gold.
Everything specific to v2 lives in v2/test_v2.py, which is held back with v2/ (see README).
"""
import contextlib, io, json, os, re, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import drive as D

def generate(name, out):
	subprocess.run([sys.executable, str(HERE/name/"generate.py"), str(out)], check=True, capture_output=True, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"})

def assistant(answer, stop="stop"):
	# Shape of a Pi 1.6.1 `--mode json` assistant message_end (hand-written, not a copied trace).
	return {"type":"message_end","message":{"role":"assistant","provider":"openai","model":"gpt-6.2-sol","stopReason":stop,
		"content":[{"type":"thinking","thinking":"{not the answer}"},{"type":"text","text":"Answer: "+json.dumps(answer, ensure_ascii=False)}],
		"usage":{"input":10,"output":5,"cacheRead":1,"cacheWrite":0,"totalTokens":16}}}

def tool_end(rows, **details):
	return {"type":"tool_execution_end","toolName":"session_search","isError":False,"durationMs":4,
		"result":{"content":[],"details":{"results":[{"sessionFile":"/somewhere/"+f,"lineNumber":l} for f,l in rows],**details}}}

GOLD = {"slots":{"decision":[[r"alpha|알파"]],"constraint":[[r"(?<!\d)77(?!\d)"]],"rejected_option":[[r"bravo|브라보"]],"rejected_reason":[[r"charlie|찰리"]]},
	"bad":{"decision":{"stale":[r"delta"],"trap":[r"echo"]}},
	"evidence":{"decision":[{"file":"d.jsonl","line":2},{"file":"d.jsonl","line":3}],"constraint":[{"file":"c.jsonl","line":2}],
		"rejected_option":[{"file":"r.jsonl","line":2}],"rejected_reason":[{"file":"r.jsonl","line":3}]}}
GOOD = {"decision":"알파","constraint":"77분","rejected_option":"bravo","rejected_reason":"unknown","unrecorded":"unknown"}

class Fixtures(unittest.TestCase):
	def check(self, name):
		with tempfile.TemporaryDirectory() as t:
			a, b = Path(t)/"a", Path(t)/"b"
			generate(name, a); generate(name, b)
			self.assertEqual((a/"freeze.json").read_bytes(), (b/"freeze.json").read_bytes())
			with contextlib.redirect_stdout(io.StringIO()): D.check_fixtures(name, a)  # aggregate, code pins, freeze.json pin
			self.assertEqual(sum(1 for _ in (a/"corpus").rglob("*.jsonl")), D.SETS[name]["files"])
			banned = [s for s in D.forbidden_strings()]
			for p in (a/"corpus").rglob("*.jsonl"):
				self.assertFalse([s for s in banned if s in p.read_text()], p.name)
			next((a/"corpus").rglob("*.jsonl")).write_text("changed\n")
			with self.assertRaises(SystemExit): D.check_fixtures(name, a)

	def test_v1_reproduces_the_frozen_corpus(self):
		self.check("v1")

class ScoreV1(unittest.TestCase):
	def test_grounding_citations_and_retries(self):
		s = D.scorer("v1")
		cites = [{"slot":"decision","file":"d.jsonl","line":2},{"slot":"constraint","file":"nowhere.jsonl","line":1}]
		r = s.score([{"type":"tool_execution_start"}, tool_end([("d.jsonl",2)]), {"type":"auto_retry_start"}, assistant({**GOOD,"citations":cites})], GOLD)
		self.assertEqual((r["correct"], r["grounded"], r["wrongGuesses"], r["toolCalls"], r["autoRetries"]), (3,1,0,1,1))
		self.assertEqual((r["citations"]["decision"], r["citations"]["constraint"]), ("supporting","unobserved"))
		self.assertEqual((r["models"], r["stopReason"], r["usage"]["totalTokens"]), (["openai/gpt-6.2-sol"],"stop",16))

	def test_stale_trap_fabrication_abstain_and_unparsed(self):
		s = D.scorer("v1")
		r = s.score([assistant({"decision":"delta","constraint":"770","rejected_option":"unknown","unrecorded":"somebody"})], GOLD)
		self.assertEqual((r["slots"]["decision"], r["slots"]["constraint"], r["slots"]["rejected_option"], r["unrecorded"]), ("stale","wrong","abstain","fabricated"))
		self.assertEqual(r["wrongGuesses"], 3)
		self.assertEqual(s.score([assistant({"decision":"alpha echo"})], GOLD)["slots"]["decision"], "trap")
		empty = s.score([], GOLD)
		self.assertEqual((empty["parsed"], empty["unrecorded"]), (False,"missing"))

class Driver(unittest.TestCase):
	def test_arms_differ_only_by_the_tool(self):
		for name in D.SETS:
			off, on = D.pi_args(name,"off","q"), D.pi_args(name,"baseline","q")
			strip = lambda c: [x for x in c if x not in ("--no-tools","--extension","/andenken/dist/index.js","/guard/guard.mjs","--no-builtin-tools","--tools","session_search")]
			self.assertEqual(strip(off), strip(on))
			self.assertIn("--no-tools", off); self.assertEqual(on[on.index("--tools")+1], "session_search")

	def test_subscription_run_is_off_by_default_and_reads_nothing(self):
		with tempfile.TemporaryDirectory() as t:
			rec, out, auth = Path(t)/"record.json", Path(t)/"out", Path(t)/"no-such-auth.json"
			rec.write_text("{}")
			base = ["run","--record",str(rec),"--go",D.sha_file(rec),"--out",str(out),"--auth-file",str(auth)]
			for argv, why in ((base, "off by default"), ([*base[:4],"0"*64,*base[5:],"--allow-subscription-turns"], "--go must equal")):
				with self.assertRaises(SystemExit) as e: D.main(argv)
				self.assertIn(why, str(e.exception))
				self.assertFalse(out.exists())

	def test_orders_are_seeded_and_complete(self):
		tasks = [{"id":x} for x in "abcd"]
		a = D.plan("v1", tasks, ["off","baseline"])
		self.assertEqual(a, D.plan("v1", tasks, ["off","baseline"])); self.assertEqual(len({(t["id"],x) for t,x in a}), 8)

def drive_batch(case, name, builds, arms, lines):
	"""Run D's real batch loop with the sandbox, model and pins replaced. Returns (error, rows, boxes)."""
	with tempfile.TemporaryDirectory() as t:
		t = Path(t); fx = t/"fx"; fx.mkdir()
		(fx/"gold.json").write_text(json.dumps({"x": GOLD})); (fx/"tasks.json").write_text(json.dumps([{"id":"x","ask":"q","unrecorded":"u"}]))
		auth = t/"auth.json"; auth.write_text(json.dumps({"openai":{"type":"oauth","access":"fake","refresh":"real-refresh","expires":10**14},"other":{"key":"must-not-travel"}}))
		rec = {"order":[["x",arm] for arm in arms], "builds":builds, "maxToolAttempts":2}
		record = t/"record.json"; record.write_text(json.dumps(rec)); seen, boxes = [], []
		class FakeBox:
			def __init__(box, a, set_name, build, *rest):
				box.agent = Path(tempfile.mkdtemp(dir=t)); boxes.append((set_name, build))
			def argv(box, command):
				seen.append((box.agent, json.loads((box.agent/"auth.json").read_text())))
				return [sys.executable, "-c", "import sys\nfor l in sys.argv[1:]: print(l, flush=True)", *lines]
		saved = D.load_record, D.Box
		D.load_record, D.Box = (lambda a: (rec, name, fx, fx, fx)), FakeBox
		error = None
		try:
			with contextlib.redirect_stdout(io.StringIO()):
				D.main(["run","--record",str(record),"--go",D.sha_file(record),"--out",str(t/"out"),"--auth-file",str(auth),"--allow-subscription-turns"])
		except SystemExit as e: error = str(e)
		finally: D.load_record, D.Box = saved
		rows = [json.loads(l) for l in (t/"out/results.jsonl").read_text().splitlines()]
		for agent, copied in seen:
			case.assertFalse((agent/"auth.json").exists(), "temporary credential left behind")
			case.assertEqual(list(copied), ["openai"]); case.assertEqual(copied["openai"]["refresh"], "isolated-test-refresh-disabled")
		return error, rows, boxes

FAKE_TSC = """const fs=require("fs"),path=require("path");const out=process.argv[process.argv.indexOf("--outDir")+1];fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(".").filter(f=>f.endsWith(".ts")))fs.writeFileSync(path.join(out,f.replace(/ts$/,"js")),"// built\\n"+fs.readFileSync(f,"utf8"));"""

class Pair:
	"""A synthetic owner repo, one diff, a shared node_modules with its ledgers, and two assembled builds."""
	def __init__(self, t):
		self.t = Path(t).resolve(); repo = self.repo = self.t/"owner"; repo.mkdir()
		for rel, text in (("package.json","{}"),("tsconfig.json","{}"),("pnpm-lock.yaml","lock"),("index.ts","export const order = 1\n"),(".gitignore","dist\n")):
			(repo/rel).write_text(text)
		env = {"PATH":os.environ["PATH"],"HOME":str(self.t),"GIT_CONFIG_NOSYSTEM":"1"}
		self.git = lambda *a: subprocess.run(["git","-C",str(repo),"-c","user.name=t","-c","user.email=t@invalid","-c","core.hooksPath=/dev/null","-c","commit.gpgsign=false",*a], check=True, capture_output=True, text=True, env=env).stdout
		self.git("init","-q"); self.git("add","-A"); self.git("commit","-qm","base"); self.commit = self.git("rev-parse","HEAD").strip()
		(repo/"index.ts").write_text("export const order = 2\n")
		self.patch = self.t/"variant.patch"; self.patch.write_text(self.git("diff")); self.git("checkout","-q","--",".")
		self.nm = self.t/"shared/node_modules"
		for rel, text in (("typescript/bin/tsc",FAKE_TSC),(".pnpm/lock.yaml","lock"),("@lancedb/lancedb/package.json",'{"version":"0.0.0"}')):
			(self.nm/rel).parent.mkdir(parents=True, exist_ok=True); (self.nm/rel).write_text(text)
		(self.nm/"alias").symlink_to("typescript")
		self.files, self.links = self.t/"DEPS.sha256", self.t/"DEPS.links"
		have = D.entries(self.nm)
		self.files.write_text("".join(f"{v}  ./{k}\n" for k, v in sorted(have.items()) if not v.startswith("link:")))
		self.links.write_text("".join(f"./{k}\t{v[5:]}\n" for k, v in sorted(have.items()) if v.startswith("link:")))
		self.base, self.good = self.build("anywhere-a", False), self.build("elsewhere-b", True)

	def build(self, name, patched):
		b = self.t/name; shutil.copytree(self.repo, b, ignore=shutil.ignore_patterns(".git"))
		if patched: (b/"index.ts").write_text("export const order = 2\n")
		(b/"node_modules").symlink_to(self.nm)
		subprocess.run(["node","node_modules/typescript/bin/tsc","--outDir",str(b/"dist")], cwd=b, check=True)
		return b

	def freeze(self, out="freeze.json", **over):
		o = {"base":self.base,"improved":self.good,"commit":self.commit,"patches":[self.patch],"sha":None,**over}
		argv = ["freeze-builds","--build",str(o["base"]),"--improved-build",str(o["improved"]),"--base-commit",o["commit"],
			"--expect-patch-sha",o["sha"] or D.sha_file(o["patches"][0]),"--deps-ledger",str(self.files),"--deps-links",str(self.links),
			"--andenken",str(self.repo),"--record",str(self.t/out)]
		for p in o["patches"]: argv += ["--patch",str(p)]
		with contextlib.redirect_stdout(io.StringIO()): D.main(argv)
		return self.t/out

@contextlib.contextmanager
def pair():
	with tempfile.TemporaryDirectory() as t:
		p = Pair(t); saved = D.SETS["v2"]["baseCommit"]; D.SETS["v2"]["baseCommit"] = p.commit
		try: yield p
		finally: D.SETS["v2"]["baseCommit"] = saved

class VariantFreeze(unittest.TestCase):
	def refused(self, p, why, **over):
		with self.assertRaises(SystemExit) as e: p.freeze("refused.json", **over)
		self.assertIn(why, str(e.exception)); self.assertFalse((p.t/"refused.json").exists())

	def test_verified_pair_gives_a_path_free_record(self):
		with pair() as p:
			out = p.freeze(); text = out.read_text(); v = json.loads(text)
			self.assertNotIn(str(p.t), text); self.assertNotIn("index.ts", text)
			self.assertEqual((v["baseCommit"], v["patchSha256"], v["patchFiles"]), (p.commit, D.sha_file(p.patch), 1))
			self.assertEqual(D.check_variant_freeze(out, {"baseline":p.base,"improved":p.good}, p.commit), v)
			with self.assertRaises(FileExistsError): p.freeze()

	def test_refuses_anything_but_base_plus_the_one_announced_diff(self):
		with pair() as p:
			self.refused(p, "40-hex", commit="abc1234"); self.refused(p, "must come from base", commit="b"*40)
			self.refused(p, "announced variant hash", sha="0"*64)
			self.refused(p, "exactly one --patch", patches=[p.patch, p.patch])
			twice = p.t/"twice.patch"; twice.write_text(p.patch.read_text()*2); self.refused(p, "one plain git diff", patches=[twice])
			config = p.t/"config.patch"; (p.repo/"tsconfig.json").write_text('{"x":1}'); config.write_text(p.patch.read_text()+p.git("diff")); p.git("checkout","-q","--",".")
			self.refused(p, "touches dependencies, config", patches=[config])
			extra = p.build("extra", True); (extra/"hidden.ts").write_text("export const second = 1\n"); self.refused(p, "plus exactly this patch", improved=extra)
			drift = p.build("drift", False); (drift/"index.ts").write_text("export const order = 3\n"); self.refused(p, "is not the base commit", base=drift)

	def test_refuses_unbuilt_dist_and_foreign_dependencies(self):
		with pair() as p:
			stale = p.build("stale", True); (stale/"dist/index.js").write_text("hand edited"); self.refused(p, "fresh compile", improved=stale)
			self.refused(p, "dist is identical", improved=p.base)
			copy = p.t/"copy/node_modules"; shutil.copytree(p.nm, copy, symlinks=True); own = p.build("own", True); (own/"node_modules").unlink(); (own/"node_modules").symlink_to(copy)
			self.refused(p, "one shared node_modules", improved=own)
			(p.nm/"@lancedb/lancedb/extra.js").write_text("not in the ledger"); self.refused(p, "shared dependency ledger")
			(p.nm/"@lancedb/lancedb/extra.js").unlink(); (p.nm/"out").symlink_to("/etc"); self.refused(p, "leaves node_modules")

	def test_every_use_rechecks_dist_source_and_dependency_bytes(self):
		with pair() as p:
			out = p.freeze(); both = {"baseline":p.base,"improved":p.good}
			for wrong in ({**both,"baseline":p.good}, {"baseline":p.base}):
				with self.assertRaises(SystemExit): D.check_variant_freeze(out, wrong, p.commit)
			with self.assertRaises(SystemExit): D.check_variant_freeze(out, both, "c"*40)
			for path in (p.good/"dist/index.js", p.good/"index.ts", p.nm/"typescript/bin/tsc"):
				before = path.read_text(); path.write_text(before + "\n// changed after freeze")
				with self.assertRaises(SystemExit): D.check_variant_freeze(out, both, p.commit)
				path.write_text(before)
			D.check_variant_freeze(out, both, p.commit)

	def test_two_build_sets_cannot_be_pinned_without_it(self):
		with pair() as p:
			other = p.build("other", True); (other/"dist/index.js").write_text("other")
			freeze = p.freeze(); fx = p.t/"fx"; fx.mkdir(); (fx/"tasks.json").write_text("[]"); (fx/"freeze.json").write_text("{}")
			with fake_host(p), pinned_fixtures(fx):
				pin = ["pin","--set","v2","--fixtures",str(fx),"--index",str(fx),"--build",str(p.base),"--record",str(p.t/"r.json")]
				full = ["--improved-build",str(p.good),"--variant-freeze",str(freeze)]
				for extra, why in (([], "variant-freeze"), (["--improved-build",str(p.good)], "variant-freeze"), (full, "consumer-manifest"),
						(["--improved-build",str(other),"--variant-freeze",str(freeze),"--consumer-manifest","x"], "differs from the variant freeze")):
					with self.assertRaises(SystemExit) as e: D.main(pin+extra)
					self.assertIn(why, str(e.exception)); self.assertFalse((p.t/"r.json").exists())

	def test_run_record_carries_pins_and_load_rechecks_them(self):
		with pair() as p:
			freeze = p.freeze(); fx = p.t/"fx"; fx.mkdir(); (fx/"tasks.json").write_text("[]"); (fx/"freeze.json").write_text("{}")
			with fake_host(p), pinned_fixtures(fx):
				out, manifest = p.t/"record.json", p.t/"manifest.json"
				with contextlib.redirect_stdout(io.StringIO()):
					D.main(manifest_args(p, freeze, manifest))
					D.main(["pin","--set","v2","--fixtures",str(fx),"--index",str(fx),"--build",str(p.base),"--improved-build",str(p.good),"--variant-freeze",str(freeze),"--consumer-manifest",str(manifest),"--record",str(out)])
				rec = json.loads(out.read_text())
				self.assertEqual(rec["variantFreeze"]["pins"], json.loads(freeze.read_text()))
				self.assertEqual(rec["variantFreeze"]["pins"]["baseCommit"], p.commit); self.assertEqual(rec["dist"], rec["variantFreeze"]["pins"]["dist"])
				self.assertEqual(rec["consumerManifest"]["sha256"], D.sha_file(manifest))
				load = lambda r: (out.write_text(json.dumps(r)), D.load_record(type("A",(),{"record":str(out),"andenken":None,"pi_package":None})()))
				load(rec)
				forged = json.loads(json.dumps(rec)); forged["variantFreeze"]["pins"]["patchSha256"] = "0"*64
				for bad, why in ((forged,"pins differ"), ({**rec,"variantFreeze":None},"variant freeze missing"), ({**rec,"consumerManifest":None},"consumer manifest missing")):
					with self.assertRaises(SystemExit) as e: load(bad)
					self.assertIn(why, str(e.exception))

@contextlib.contextmanager
def pinned_fixtures(fx):
	"""Skip the fixture, corpus and index checks (covered elsewhere); everything about builds stays real."""
	saved = D.check_fixtures, D.corpus_root, D.index_gate
	D.check_fixtures, D.corpus_root, D.index_gate = (lambda *a: None), (lambda *a: fx), (lambda *a: {})
	try: yield
	finally: D.check_fixtures, D.corpus_root, D.index_gate = saved

@contextlib.contextmanager
def fake_host(p):
	"""A stand-in Pi package, node, bwrap and set directory, so manifest logic runs in any clone."""
	pkg = p.t/"store/node_modules/@earendil-works/pi-coding-agent"; pkg.mkdir(parents=True); (pkg/"package.json").write_text(json.dumps({"version":D.PI_VERSION}))
	for dep in ("jiti","undici"):
		(p.t/"store/node_modules"/dep).mkdir(); (p.t/"store/node_modules"/dep/"index.js").write_text(dep)
	node, bwrap = p.t/"tools/bin/node", p.t/"tools/bwrap"; node.parent.mkdir(parents=True); node.write_text("node"); bwrap.write_text("bwrap")
	here = p.t/"harness"; (here/"v2").mkdir(parents=True); shutil.copy(HERE/"sets.json", here/"sets.json")
	for f in ("score.py","guard.mjs","probe.mjs"): (here/"v2"/f).write_text("# placeholder " + f)
	saved = D.host_tools, D.pi_package, D.HERE, D.must_version, D.SETS["v2"].get("freezeJsonSha256")
	D.host_tools, D.pi_package, D.HERE, D.must_version = (lambda: (str(node), str(bwrap))), (lambda a: pkg), here, (lambda: "v0.0.0")
	try: yield here
	finally: D.host_tools, D.pi_package, D.HERE, D.must_version = saved[:4]

def manifest_args(p, freeze, out):
	return ["consumer-manifest","--build",str(p.base),"--improved-build",str(p.good),"--variant-freeze",str(freeze),"--record",str(out)]

class ConsumerManifest(unittest.TestCase):
	def test_arms_are_identical_but_for_the_build_and_the_record_is_path_free(self):
		with pair() as p:
			freeze = p.freeze()
			with fake_host(p) as here:
				out = p.t/"manifest.json"
				with contextlib.redirect_stdout(io.StringIO()): D.main(manifest_args(p, freeze, out))
				text = out.read_text(); m = json.loads(text)
				self.assertNotIn(str(p.t), text); self.assertTrue(m["arms"]["identicalAfterNormalisation"])
				cmd = m["arms"]["normalised"]["agent"]
				self.assertIn("<BUILD>/dist", cmd); self.assertIn("<DEPS>", cmd); self.assertIn("/guard/guard.mjs", cmd)
				self.assertEqual(m["arms"]["normalised"]["probe"][-2:], D.PROBE_ARGV)
				self.assertEqual(m["arms"]["normalised"]["agentSettings"]["retry"], {"enabled":False,"provider":{"maxRetries":0}})
				with contextlib.redirect_stdout(io.StringIO()): D.main(manifest_args(p, freeze, p.t/"again.json"))
				self.assertEqual((p.t/"again.json").read_bytes(), out.read_bytes())
				D.check_consumer_manifest(None, "v2", {"baseline":str(p.base),"improved":str(p.good)}, freeze, out)
				(here/"v2/guard.mjs").write_text("changed budget")
				with self.assertRaises(SystemExit): D.check_consumer_manifest(None, "v2", {"baseline":str(p.base),"improved":str(p.good)}, freeze, out)

	def test_an_arm_specific_difference_is_refused(self):
		with pair() as p:
			freeze = p.freeze()
			with fake_host(p):
				real = D.pi_args
				D.pi_args = lambda name, arm, text=None: real(name, arm, text) + (["--extra"] if arm == "improved" else [])
				try:
					with self.assertRaises(SystemExit) as e: D.main(manifest_args(p, freeze, p.t/"m.json"))
				finally: D.pi_args = real
				self.assertIn("more than the build", str(e.exception)); self.assertFalse((p.t/"m.json").exists())

class RunLoop(unittest.TestCase):
	"""The batch loop with the sandbox and model replaced by a local fake process and a fake credential."""
	def drive(self, lines, order=2):
		return drive_batch(self, "v1", {"off":"/builds/base","baseline":"/builds/base"}, ["baseline"]*order, lines)[:2]

	def test_clean_batch(self):
		error, rows = self.drive([json.dumps(assistant(GOOD))])
		self.assertIsNone(error); self.assertEqual(len(rows), 2)

	def test_unclean_end_forbidden_string_and_tool_cap_stop_the_run(self):
		error, rows = self.drive([json.dumps(assistant(GOOD, stop="error"))])
		self.assertIn("did not end cleanly", error); self.assertEqual(len(rows), 1)
		error, rows = self.drive([json.dumps({"type":"x","t":str(Path.home())})])
		self.assertIn("non-synthetic", error); self.assertEqual(len(rows), 1)
		_, rows = self.drive([json.dumps({"type":"tool_execution_start"})]*5, order=1)
		self.assertEqual(rows[0]["stop"], "tool-cap")

class Hygiene(unittest.TestCase):
	def test_tracked_assets_hold_no_host_path_secret_or_run_artifact(self):
		files = [p for p in HERE.rglob("*") if p.is_file() and "__pycache__" not in p.parts]
		self.assertFalse([p.name for p in files if p.suffix in (".jsonl",".lance",".sqlite",".db",".tsv",".stderr")])
		home = re.compile(r"/(home|Users)/(?!fixture)[A-Za-z0-9_.-]+")
		secret = re.compile(r"eyJ[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}")
		for p in files:
			text = p.read_text()
			if p.name != Path(__file__).name: self.assertIsNone(home.search(text), p.name)
			self.assertIsNone(secret.search(text), p.name)

if __name__ == "__main__":
	unittest.main()
