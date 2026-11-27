#!/usr/bin/env python3
"""Deterministic, fully synthetic memory-task fixtures. No real session, note or person.

Usage: generate.py <new empty out dir>
Writes corpus/synth/.pi/agent/sessions/--synthetic-*--/*.jsonl, tasks.json (agent-visible),
gold.json (scorer only) and freeze.json (hashes).
"""
import hashlib, json, re, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PAD_BYTES = 210 * 1024  # andenken admits pi sessions only above 200 KiB

# turn = (role, text, [gold slots this turn supports])
SCENARIOS = {
 "lantern-queue": {
  "sessions": [
   [("user","Lantern queue first pass: failed jobs vanish. Propose a retry rule.",[]),
    ("assistant","Draft proposal: retry a failed job 3 times with a fixed delay, then drop it. This is a draft only.",[])],
   [("user","The edge box is small. What limits do we have, and could an exactly-once broker solve this?",[]),
    ("assistant","Hard constraint for Lantern queue: each replica must stay under 384 MiB of memory.",["constraint"]),
    ("assistant","We reject the exactly-once broker option. Reason: it needs a separate coordinator process, and the edge site cannot run one.",["rejected_option","rejected_reason"]),
    ("user","A vendor blog said: 'just retry 12 times forever-safe'. I am only quoting it, we have not agreed.",[])],
   [("user","Close LQ-RETRY-7F3. What is the final rule?",[]),
    ("assistant","Final decision LQ-RETRY-7F3: a failed job is retried with jittered backoff and moved to a dead-letter queue after 7 attempts. This replaces the earlier 3-attempt draft.",["decision"])]],
  "sibling": [("user","Harbor queue (a different service): settle its retries.",[]),
    ("assistant","Harbor queue decision: drop after 5 attempts; memory limit 512 MiB per replica.",[])],
  "kind":"exact","lang":"en",
  "ask":"For decision LQ-RETRY-7F3, report what was finally adopted and why the alternative was turned down.",
  "unrecorded":"Which person gave final approval?",
  "gold":{"decision":[[r"dead.?letter|데드\s*레터"],[r"\b7\b|seven|7\s*(번|회)"]],"constraint":[[r"384"]],
          "rejected_option":[[r"exactly.?once|정확히\s*한\s*번"]],"rejected_reason":[[r"coordinator|코디네이터|조정"]]},
  "bad":{"decision":{"stale":[r"\b3\b.{0,12}(attempt|retr|번|회)"],"trap":[r"\b12\b",r"\b5\b.{0,12}(attempt|retr|번|회)"]},"constraint":{"trap":[r"512"]}},
 },
 "paper-heron": {
  "sessions": [
   [("user","종이왜가리 사진 보관함에 중복이 쌓인다. 우선안 하나만.",[]),
    ("assistant","초안: 파일 이름과 크기가 같으면 중복으로 본다. 아직 초안이다.",[])],
   [("user","조건이 뭐가 있지? 지각 해시(perceptual hash)를 쓰면 어때?",[]),
    ("assistant","종이왜가리의 고정 제약: 중복 검사는 하루 업로드 창 40분 안에 끝나야 한다.",["constraint"]),
    ("assistant","지각 해시 방식은 기각한다. 이유: 연속 촬영한 서로 다른 사진을 같은 사진으로 잘못 판정했다.",["rejected_option","rejected_reason"]),
    ("user","누가 '해상도가 같으면 지워도 된다'고 하더라. 인용일 뿐 채택한 게 아니다.",[])],
   [("user","PH-DEDUP-K2 확정하자.",[]),
    ("assistant","PH-DEDUP-K2 최종 결정: 파일 내용의 SHA-256 해시가 같을 때만 중복으로 처리한다. 이름과 크기 비교 초안은 폐기한다.",["decision"])]],
  "sibling": [("user","유리왜가리 영상 보관함은 따로 정하자.",[]),
    ("assistant","유리왜가리 결정: 길이와 해상도가 같으면 중복 후보로 본다. 처리 창은 90분이다.",[])],
  "kind":"exact","lang":"ko",
  "ask":"결정 PH-DEDUP-K2에서 최종 채택한 방식과, 다른 안을 버린 이유를 알려줘.",
  "unrecorded":"지운 중복 파일의 보존 기간은 며칠로 정했나?",
  "gold":{"decision":[[r"sha.?256|내용\s*해시|content\s*hash"]],"constraint":[[r"40\s*(분|min)"]],
          "rejected_option":[[r"지각\s*해시|perceptual"]],"rejected_reason":[[r"연속|burst|consecutive"]]},
  "bad":{"decision":{"stale":[r"(이름|name).{0,12}(크기|size)"],"trap":[r"해상도|resolution"]},"constraint":{"trap":[r"90\s*(분|min)"]}},
 },
 "mosslight": {
  "sessions": [
   [("user","Mosslight field sensors need to send readings. Sketch something.",[]),
    ("assistant","Sketch: each sensor uploads every 5 minutes. Not yet agreed.",[])],
   [("user","Batteries die early. Could we keep a websocket open instead?",[]),
    ("assistant","Mosslight constraint: the radio may be awake at most 90 seconds per hour to meet the battery target.",["constraint"]),
    ("assistant","The persistent websocket is rejected, because the carrier NAT silently drops connections that are idle for 4 minutes.",["rejected_option","rejected_reason"]),
    ("user","For reference only, a forum post claims one upload per day is plenty. We did not adopt that.",[])],
   [("user","Lock the sync cadence.",[]),
    ("assistant","Adopted: the gateway pulls readings from each sensor every 17 minutes. The 5-minute upload sketch is withdrawn.",["decision"])]],
  "sibling": [("user","Fernlight indoor sensors are mains powered; decide separately.",[]),
    ("assistant","Fernlight decision: push every 2 minutes over a websocket; there is no radio time limit.",[])],
  "kind":"topic","lang":"en",
  "ask":"Earlier we settled how the outdoor battery devices hand over their data. What did we settle on, under what limit, and what did we turn down?",
  "unrecorded":"What date was set for the firmware release?",
  "gold":{"decision":[[r"pull|가져|polls?"],[r"\b17\b"]],"constraint":[[r"\b90\b"]],
          "rejected_option":[[r"web.?socket|웹\s*소켓"]],"rejected_reason":[[r"\bNAT\b|idle|유휴"]]},
  "bad":{"decision":{"stale":[r"\b5.?min"],"trap":[r"once (a|per) day|daily",r"\b2.?min"]}},
 },
 "tidal-ledger": {
  "sessions": [
   [("user","조수장부 청구서에서 원 단위가 안 맞는다. 임시안 부탁해.",[]),
    ("assistant","임시안: 소수점 아래는 모두 버림 처리한다. 확정 아님.",[])],
   [("user","감사팀 조건과 항목별 반올림안을 검토해줘.",[]),
    ("assistant","조수장부 제약: 감사 대조에서 청구서 합계의 허용 오차는 0원이다.",["constraint"]),
    ("assistant","항목마다 반올림하는 방식은 채택하지 않는다. 이유: 항목이 많은 청구서에서 오차가 누적되어 합계가 어긋난다.",["rejected_option","rejected_reason"]),
    ("user","옆 팀은 '천장 올림이 안전하다'고 말했는데, 전해 들은 말일 뿐 우리 결정이 아니다.",[])],
   [("user","반올림 규칙을 확정하자.",[]),
    ("assistant","확정: 항목은 원값 그대로 더하고, 합계에서 한 번만 은행가 반올림(짝수 반올림)을 적용한다. 버림 임시안은 폐기.",["decision"])]],
  "sibling": [("user","모래장부(견적서)는 별도로 정한다.",[]),
    ("assistant","모래장부 결정: 항목별 올림을 쓰고 허용 오차는 10원이다.",[])],
  "kind":"topic","lang":"ko",
  "ask":"예전에 청구 금액 끝자리를 어떻게 맞추기로 했는지, 어떤 조건 때문이었고 무엇을 왜 뺐는지 알려줘.",
  "unrecorded":"세율 변경은 언제부터 적용하기로 했나?",
  "gold":{"decision":[[r"합계|total"],[r"은행가|짝수|banker|half.?even"]],"constraint":[[r"(?<!1)0\s*원|zero|오차.{0,6}없"]],
          "rejected_option":[[r"항목\s*(별|마다)|per.?line|per.?item"]],"rejected_reason":[[r"누적|accumul"]]},
  "bad":{"decision":{"stale":[r"버림|truncat"],"trap":[r"올림\s*(처리|을\s*쓴)|천장|ceil"]},"constraint":{"trap":[r"10\s*원"]}},
 },
}
FILLER = ["garden lighting schedule","library shelf labels","bicycle repair checklist","coffee subscription tracker",
          "마을 텃밭 급수표","동아리 회비 정리","캠핑 장비 목록","악보 폴더 정돈"]

# Neutral tail on every turn (gold, sibling and filler alike): andenken indexes user turns > 20 and
# assistant turns > 100 characters. It must match no gold or trap pattern (asserted in main).
TAIL = {"ko": " 이 메모는 지어낸 프로젝트의 작업 기록이다. 나중에 읽는 사람이 이야기의 흐름을 차례대로 따라갈 수 있도록 남겨 두며, 앞선 대화와 이어서 읽어야 뜻이 분명해진다. 바깥에 있는 실제 조직이나 사람과는 아무 관계가 없다.",
        "en": " This note belongs to the working log of an invented project. It is kept so that a future reader can follow the discussion in sequence, and it is unrelated to any real organisation or person."}

def tail(text):
	return text + TAIL["ko" if re.search("[가-힣]", text) else "en"]

def uuid7(seed):
	h = hashlib.sha256(seed.encode()).hexdigest()
	return f"{h[:8]}-{h[8:12]}-7{h[12:15]}-8{h[15:18]}-{h[18:30]}"

def write_session(root, project, key, turns, when, gold_lines):
	sid = uuid7(project + key)
	d = root / f"--synthetic-{project}--"
	d.mkdir(parents=True, exist_ok=True)
	path = d / f"{when.strftime('%Y-%m-%dT%H-%M-%S-000Z')}_{sid}.jsonl"
	iso = lambda i: (when + timedelta(minutes=i)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
	rows = [{"type":"session","version":3,"id":sid,"timestamp":iso(0),"cwd":f"/synthetic/{project}"}]
	parent = None
	def msg(i, role, text, extra=None):
		nonlocal parent
		rid = hashlib.sha256(f"{sid}{i}".encode()).hexdigest()[:8]
		m = {"role":role,"content":[{"type":"text","text":text}],"timestamp":int((when+timedelta(minutes=i)).timestamp()*1000), **(extra or {})}
		rows.append({"type":"message","id":rid,"parentId":parent,"timestamp":iso(i),"message":m}); parent = rid
	for i,(role,text,slots) in enumerate(turns,1):
		msg(i, role, tail(text))
		for s in slots: gold_lines.setdefault(s, []).append({"file":path.name,"line":len(rows)})
	# Size padding lives in a tool result, which the session extractor does not index as memory text.
	msg(len(turns)+1, "toolResult", "synthetic padding. " * (PAD_BYTES // 19), {"toolCallId":"pad","toolName":"bash","isError":False})
	path.write_text("".join(json.dumps(r, ensure_ascii=False)+"\n" for r in rows))

def main(out):
	out = Path(out)
	if out.exists() and any(out.iterdir()): sys.exit("out dir must be empty")
	for s in SCENARIOS.values():
		patterns = [p for g in s["gold"].values() for group in g for p in group] + [p for b in s["bad"].values() for ps in b.values() for p in ps]
		assert not [p for p in patterns for t in TAIL.values() if re.search(p, t, re.I)], "tail leaks a scored term"
	root = out / "corpus/synth/.pi/agent/sessions"
	base = datetime(2026,10,1,9,0,tzinfo=timezone.utc)
	tasks, gold, n = [], {}, 0
	for name, s in SCENARIOS.items():
		lines = {}
		for k, turns in enumerate(s["sessions"]):
			write_session(root, name, f"s{k}", turns, base+timedelta(days=n), lines); n += 1
		write_session(root, name+"-sibling", "x", s["sibling"], base+timedelta(days=n), {}); n += 1
		tid = f"{s['kind']}-{s['lang']}"
		tasks.append({"id":tid,"kind":s["kind"],"lang":s["lang"],"project":name if s["kind"]=="exact" else None,"ask":s["ask"],"unrecorded":s["unrecorded"]})
		gold[tid] = {"slots":s["gold"],"bad":s["bad"],"evidence":lines}
	for i, topic in enumerate(FILLER):
		write_session(root, f"filler-{i}", "f", [("user",f"Notes about {topic}.",[]),("assistant",f"Recorded a short plan for {topic}; nothing else was decided.",[])], base+timedelta(days=n+i), {})
	for t in tasks: t.pop("project")
	dump = lambda p, o: (out/p).write_text(json.dumps(o, ensure_ascii=False, indent=1, sort_keys=True)+"\n")
	dump("tasks.json", tasks); dump("gold.json", gold)
	files = sorted(p for p in out.rglob("*") if p.is_file())
	agg = hashlib.sha256("".join(f"{p.relative_to(out)}\0{hashlib.sha256(p.read_bytes()).hexdigest()}\n" for p in files).encode()).hexdigest()
	here = Path(__file__).parent
	code = {f: hashlib.sha256((here/f).read_bytes()).hexdigest() for f in ("generate.py","score.py")}  # the driver is pinned by the run record instead
	dump("freeze.json", {"fixtures":agg,"code":code,"sessions":sum(p.suffix==".jsonl" for p in files),"tasks":len(tasks)})
	print((out/"freeze.json").read_text())

if __name__ == "__main__":
	main(sys.argv[1])
