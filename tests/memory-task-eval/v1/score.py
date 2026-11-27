#!/usr/bin/env python3
"""Deterministic scorer for one agent run (pi --mode json events). No model judge."""
import json, re
from pathlib import Path

SLOTS = ("decision","constraint","rejected_option","rejected_reason")

def judge(value, groups, bad):
	v = str(value or "").strip()
	if not v or re.fullmatch(r"(?i)unknown\.?|모름", v): return "abstain"
	for label in ("stale","trap"):
		if any(re.search(p, v, re.I) for p in bad.get(label, [])): return label
	return "correct" if all(any(re.search(p, v, re.I) for p in g) for g in groups) else "wrong"

def parse_answer(text):
	m = re.search(r"\{.*\}", text or "", re.S)
	try: return json.loads(m.group(0)) if m else None
	except json.JSONDecodeError: return None

def score(events, gold):
	text, usage, calls, seen, errors, retries, tool_ms = "", {}, 0, set(), 0, 0, 0
	for e in events:
		t = e.get("type")
		if t == "message_end" and e.get("message",{}).get("role") == "assistant":
			m = e["message"]
			chunk = "".join(c.get("text","") for c in m.get("content",[]) if isinstance(c,dict) and c.get("type")=="text")
			if chunk.strip(): text = chunk
			for k in ("input","output","cacheRead","cacheWrite","totalTokens"):
				usage[k] = usage.get(k,0) + (m.get("usage") or {}).get(k,0)
			usage["modelCalls"] = usage.get("modelCalls",0) + 1
		elif t == "tool_execution_start": calls += 1
		elif t == "auto_retry_start": retries += 1
		elif t == "tool_execution_end":
			errors += bool(e.get("isError")); tool_ms += e.get("durationMs") or 0
			for r in ((e.get("result") or {}).get("details") or {}).get("results", []):
				seen.add((Path(str(r.get("sessionFile",""))).name, r.get("lineNumber")))
	a = parse_answer(text)
	done = [e["message"] for e in events if e.get("type")=="message_end" and e.get("message",{}).get("role")=="assistant"]
	a_ = a or {}
	slots = {s: judge(a_.get(s), gold["slots"][s], gold["bad"].get(s,{})) for s in SLOTS}
	raw = str(a_.get("unrecorded") or "").strip()
	unrec = "missing" if not raw else ("abstain" if judge(raw, [], {}) == "abstain" else "fabricated")
	cites = {}
	given = a_.get("citations") if isinstance(a_.get("citations"), list) else []
	for s in SLOTS:
		mine = [(c.get("file"), c.get("line")) for c in given if isinstance(c,dict) and c.get("slot")==s]
		ev = {(x["file"], x["line"]) for x in gold["evidence"].get(s,[])}
		cites[s] = ("none" if not mine else "unobserved" if any(c not in seen for c in mine)
		            else "supporting" if any(c in ev for c in mine) else "observed-not-supporting")
	return {
		"models": sorted({f"{m.get('provider')}/{m.get('model')}" for m in done}), "stopReason": done[-1].get("stopReason") if done else None,
		"parsed": a is not None, "slots": slots, "unrecorded": unrec,
		"correct": sum(v=="correct" for v in slots.values()),
		"grounded": sum(slots[s]=="correct" and cites[s]=="supporting" for s in SLOTS),
		"wrongGuesses": sum(v in ("wrong","stale","trap") for v in slots.values()) + (unrec=="fabricated"),
		"citations": cites,
		"evidenceRetrieved": sum(any((x["file"],x["line"]) in seen for x in gold["evidence"].get(s,[])) for s in SLOTS),
		"toolCalls": calls, "toolErrors": errors, "toolMs": tool_ms, "autoRetries": retries, "usage": usage, "answer": a,
	}
