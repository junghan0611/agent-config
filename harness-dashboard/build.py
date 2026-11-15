#!/usr/bin/env python3
"""data/*.json 검증 → data.js (window.DATA). 실패 시 행별 사유를 출력하고 exit 1."""
import json, os, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "data")
EVID = ["code", "measured", "claim", "inherited", "hypothesis", "question", "unobserved"]
STAT = ["current", "retracted", "superseded", "open"]
errors = []


def err(where, msg):
	errors.append(f"{where}: {msg}")


def load(name):
	p = os.path.join(D, name)
	if not os.path.exists(p):
		return None
	with open(p, encoding="utf-8") as f:
		return json.load(f)


def rows(name, key):
	"""파일이 [..] 또는 {key: [..]} 어느 쪽이어도 받는다."""
	raw = load(name)
	if raw is None:
		return None
	if isinstance(raw, dict):
		if key not in raw:
			err(name, f"최상위 객체에 '{key}' 배열이 없음")
			return []
		raw = raw[key]
	if not isinstance(raw, list):
		err(name, "배열이 아님")
		return []
	return raw


def nonempty(v):
	return isinstance(v, str) and v.strip() != ""


seed = load("observations.seed.json") or {}
used_seed = False

houses = rows("houses.json", "houses")
axes = rows("axes.json", "axes")
obs = rows("observations.json", "observations")
if obs is None:
	obs = seed.get("observations", [])
	used_seed = True
if axes is None:
	axes = seed.get("axes", [])
	used_seed = True
if houses is None:
	houses = seed.get("houses")
	if houses is None:
		ids = []
		for o in obs:
			for h in (o.get("houses") or []) if isinstance(o, dict) else []:
				if h not in ids:
					ids.append(h)
		houses = [{"id": h, "name": h, "kind": "(houses.json 없음 — 관측에서 유추)", "sources": [], "_derived": True} for h in ids]
	used_seed = True
questions = rows("questions.json", "questions") or []
experiments = rows("experiments.json", "experiments") or []
corrections = rows("corrections.json", "corrections") or []
metrics = rows("metrics.json", "metrics") or []
flows = rows("flows.json", "flows") or []

hid, aid, oid = set(), set(), set()
for i, h in enumerate(houses):
	w = f"houses[{i}]"
	if not isinstance(h, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "name"):
		if not nonempty(h.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if h.get("id") in hid:
		err(w, f"id 중복 {h.get('id')}")
	hid.add(h.get("id"))
	if h.get("role") is not None and h["role"] not in ("base", "addon"):
		err(w, f"role '{h['role']}' 는 base|addon 아님")
	if h.get("role") == "addon" and h.get("column_label"):
		err(w, "column_label 은 role=base 인 집에만 둘 수 있음")
	for j, s in enumerate(h.get("sources") or []):
		kind = s.get("kind", "repo")
		if kind not in ("repo", "docs", "version"):
			err(f"{w}.sources[{j}]", f"kind '{kind}' 는 repo|docs|version 밖")
		for k in (("repo", "sha", "read_at") if kind == "repo" else ("repo", "read_at")):
			if not nonempty(s.get(k)):
				err(f"{w}.sources[{j}]", f"필수 필드 '{k}' 누락")
for i, a in enumerate(axes):
	w = f"axes[{i}]"
	for k in ("id", "title"):
		if not nonempty(a.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if a.get("id") in aid:
		err(w, f"id 중복 {a.get('id')}")
	aid.add(a.get("id"))
for i, o in enumerate(obs):
	w = f"observations[{i}] ({o.get('id') if isinstance(o, dict) else '?'})"
	if not isinstance(o, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "axis", "statement", "evidence", "observed_at", "observer", "status"):
		if not nonempty(o.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if o.get("id") in oid:
		err(w, "id 중복")
	oid.add(o.get("id"))
	if o.get("evidence") not in EVID:
		err(w, f"evidence '{o.get('evidence')}' 는 enum 밖 {EVID}")
	if o.get("status") not in STAT:
		err(w, f"status '{o.get('status')}' 는 enum 밖 {STAT}")
	if o.get("axis") not in aid:
		err(w, f"axis '{o.get('axis')}' 가 axes에 없음")
	hs = o.get("houses")
	if not isinstance(hs, list) or not hs:
		err(w, "houses 는 하나 이상의 배열이어야 함")
	else:
		for h in hs:
			if h not in hid:
				err(w, f"house '{h}' 가 houses에 없음")
	if o.get("evidence") == "unobserved" and not nonempty(o.get("scope")):
		err(w, "unobserved 인데 scope 없음")
	rc = o.get("receipts")
	if not isinstance(rc, list) or not rc:
		err(w, "receipts 가 비어 있음")
	else:
		for j, r in enumerate(rc):
			if not nonempty(r.get("ref")):
				err(f"{w}.receipts[{j}]", "ref 누락")
			if r.get("evidence") is not None and r["evidence"] not in EVID:
				err(f"{w}.receipts[{j}]", f"evidence '{r['evidence']}' enum 밖")
	try:
		datetime.date.fromisoformat(o.get("observed_at", ""))
	except ValueError:
		err(w, f"observed_at '{o.get('observed_at')}' 가 YYYY-MM-DD 아님")
for o in obs:
	for k in ("supersedes",):
		if o.get(k) and o[k] not in oid:
			err(f"observations ({o['id']})", f"{k} '{o[k]}' 가 존재하지 않음")
qid = set(q.get("id") for q in questions if isinstance(q, dict))
def reflist(w, r, key, known, what):
	v = r.get(key)
	if v is None:
		return
	if not isinstance(v, list):
		err(w, f"{key} 는 배열이어야 함"); return
	for x in v:
		if x not in known:
			err(w, f"{key} '{x}' 가 {what}에 없음")
for i, r in enumerate(questions):
	w = f"questions[{i}] ({r.get('id') if isinstance(r, dict) else '?'})"
	if not isinstance(r, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "text", "raised_at", "status"):
		if not nonempty(r.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if r.get("status") not in ("open", "answered"):
		err(w, f"status '{r.get('status')}' 는 open|answered 아님")
	reflist(w, r, "axes", aid, "axes"); reflist(w, r, "houses", hid, "houses")
	if r.get("answered_by") and r["answered_by"] not in oid:
		err(w, f"answered_by '{r['answered_by']}' 가 observations에 없음")
	if r.get("status") == "answered" and not r.get("answered_by"):
		err(w, "answered 인데 answered_by 없음")
for i, r in enumerate(experiments):
	w = f"experiments[{i}] ({r.get('id') if isinstance(r, dict) else '?'})"
	if not isinstance(r, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "title", "learns", "cost"):
		if not nonempty(r.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if not isinstance(r.get("steps"), list) or not r.get("steps"):
		err(w, "steps 는 비어 있지 않은 배열이어야 함")
	if not isinstance(r.get("executed"), bool):
		err(w, "executed 는 true/false 여야 함")
	reflist(w, r, "answers", qid, "questions")
for i, r in enumerate(corrections):
	w = f"corrections[{i}] ({r.get('id') if isinstance(r, dict) else '?'})"
	if not isinstance(r, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "claim", "correction", "corrected_at"):
		if not nonempty(r.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	rb = r.get("retired_by")
	if not isinstance(rb, list) or not rb:
		err(w, "retired_by 가 비어 있음")
	else:
		for j, x in enumerate(rb):
			if not isinstance(x, dict) or not nonempty(x.get("ref")):
				err(f"{w}.retired_by[{j}]", "ref 누락")

bases = {}
for h in houses:
	if isinstance(h, dict) and h.get("role") == "base":
		c = h.get("column") or h.get("id")
		bases.setdefault(c, []).append(h.get("id"))
for c, l in bases.items():
	if len(l) > 1:
		err(f"column '{c}'", f"base 가 둘 이상: {l}")
cols = set((h.get("column") or h.get("id")) for h in houses if isinstance(h, dict))
for h in houses:
	if isinstance(h, dict) and h.get("column") and h.get("role") is None:
		err(f"houses ({h.get('id')})", "column 이 있는데 role 없음")

def receipts_ok(w, rc, required=True):
	if not isinstance(rc, list) or (required and not rc):
		err(w, "receipts 가 비어 있음"); return
	for j, r in enumerate(rc):
		if not isinstance(r, dict) or not nonempty(r.get("ref")):
			err(f"{w}.receipts[{j}]", "ref 누락")

mid = set()
for i, m in enumerate(metrics):
	w = f"metrics[{i}] ({m.get('id') if isinstance(m, dict) else '?'})"
	if not isinstance(m, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "house", "key", "label", "evidence", "observed_at"):
		if not nonempty(m.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if m.get("value") is None or m.get("value") == "":
		err(w, "value 누락")
	if m.get("id") in mid:
		err(w, "id 중복")
	mid.add(m.get("id"))
	if m.get("evidence") not in EVID:
		err(w, f"evidence '{m.get('evidence')}' enum 밖")
	if m.get("house") not in hid:
		err(w, f"house '{m.get('house')}' 가 houses에 없음")
	receipts_ok(w, m.get("receipts"))
fid = set()
for i, f in enumerate(flows):
	w = f"flows[{i}] ({f.get('id') if isinstance(f, dict) else '?'})"
	if not isinstance(f, dict):
		err(w, "객체가 아님"); continue
	for k in ("id", "title", "observed_at"):
		if not nonempty(f.get(k)):
			err(w, f"필수 필드 '{k}' 누락")
	if f.get("id") in fid:
		err(w, "id 중복")
	fid.add(f.get("id"))
	for x in f.get("houses") or []:
		if x not in hid:
			err(w, f"house '{x}' 가 houses에 없음")
	lanes = f.get("lanes")
	lid = set()
	if not isinstance(lanes, list) or not lanes:
		err(w, "lanes 가 비어 있음"); lanes = []
	for j, l in enumerate(lanes):
		if not isinstance(l, dict) or not nonempty(l.get("id")) or not nonempty(l.get("label")):
			err(f"{w}.lanes[{j}]", "id·label 필요"); continue
		if l["id"] in lid:
			err(f"{w}.lanes[{j}]", f"lane id 중복 {l['id']}")
		lid.add(l["id"])
	steps = f.get("steps")
	if not isinstance(steps, list) or not steps:
		err(w, "steps 가 비어 있음"); steps = []
	for j, st in enumerate(steps):
		sw = f"{w}.steps[{j}]"
		if not isinstance(st, dict):
			err(sw, "객체가 아님"); continue
		if not isinstance(st.get("n"), int):
			err(sw, "n 은 정수여야 함")
		for k in ("from", "to"):
			if st.get(k) not in lid:
				err(sw, f"{k} '{st.get(k)}' 가 lanes에 없음")
		if not nonempty(st.get("label")):
			err(sw, "label 누락")
		if st.get("evidence") not in EVID:
			err(sw, f"evidence '{st.get('evidence')}' enum 밖")
		receipts_ok(sw, st.get("receipts"), required=st.get("evidence") not in ("hypothesis", "unobserved", "question"))
	ns = [st.get("n") for st in steps if isinstance(st, dict)]
	if len(ns) != len(set(ns)):
		err(w, "step n 중복")

if errors:
	print(f"검증 실패 {len(errors)}건:", file=sys.stderr)
	for e in errors:
		print("  - " + e, file=sys.stderr)
	sys.exit(1)

schema = load("schema.json") or {}
data = {
	"lens": schema.get("_lens", ""),
	"built_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
	"used_seed": used_seed,
	"evidence_states": EVID,
	"statuses": STAT,
	"houses": houses, "axes": axes, "observations": obs,
	"questions": questions, "experiments": experiments, "corrections": corrections,
	"metrics": metrics, "flows": flows,
}
with open(os.path.join(HERE, "data.js"), "w", encoding="utf-8") as f:
	f.write("window.DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
print(f"data.js 작성: 집 {len(houses)} · 축 {len(axes)} · 관측 {len(obs)} · 질문 {len(questions)} · 실험 {len(experiments)} · 정정 {len(corrections)} · 숫자 {len(metrics)} · 흐름 {len(flows)}" + (" (seed/유추 사용)" if used_seed else ""))
