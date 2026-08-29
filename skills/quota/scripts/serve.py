#!/usr/bin/env python3
"""Local web view of the quota snapshot.

    serve.py [--port 8787] [--ttl 120]

Serves 127.0.0.1 only. Calling it again on the same port stops the
running server (toggle). Routes:
    /                  one dark page, same layout as the TUI
    /api/snapshot.json the normalized snapshot
    /api/stop          graceful shutdown (localhost toggle)

The snapshot is cached for --ttl seconds (default 120) and shared by
every request, so leaving the tab open all day does not hammer the vendor
endpoints. claude's api/oauth/usage answers 429 with Retry-After ~165s
when polled hard -- collect.py holds that rail to one poll per 180s
regardless of this TTL, so the page can refresh faster than the most
sensitive rail is allowed to.

Phase 2 seam: every refreshed snapshot is also written to
~/.local/share/quota/last.json, which is where the sqlite history
writer will hook in.
"""

import argparse
import errno
import json
import os
import signal
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import URLError
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import collect
import render

STATE_DIR = os.path.expanduser("~/.local/share/quota")
LAST = os.path.join(STATE_DIR, "last.json")
IDENT = "quota-web"

_lock = threading.Lock()
_cache = {"snap": None, "at": 0.0}


def get_snapshot(ttl):
    with _lock:
        if _cache["snap"] and time.time() - _cache["at"] < ttl:
            return _cache["snap"]
        snap = collect.snapshot()
        _cache["snap"], _cache["at"] = snap, time.time()
    try:
        os.makedirs(STATE_DIR, exist_ok=True)
        tmp = LAST + ".tmp"
        with open(tmp, "w") as f:
            json.dump(snap, f, ensure_ascii=False)
        os.replace(tmp, LAST)
    except OSError:
        pass  # the view still works without the on-disk seam
    return snap


PAGE = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>quota</title><style>
:root{--bg:#0d1117;--card:#161b22;--line:#272d36;--fg:#e6edf3;--dim:#8b949e;
--ok:#3fb950;--warn:#d29922;--crit:#f85149;--accent:#58a6ff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,"D2Coding",monospace;padding:24px}
h1{font-size:15px;font-weight:600;margin:0 0 2px}
.sub{color:var(--dim);font-size:12px;margin-bottom:20px}
.wrap{max-width:960px;margin:0 auto}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;
padding:14px 16px;margin-bottom:12px}
.rail{display:flex;align-items:baseline;gap:8px;margin-bottom:10px}
.rail b{font-size:14px}.rail span{color:var(--dim);font-size:12px}
.g{display:grid;gap:4px 10px;align-items:center;padding:4px 0;
grid-template-columns:minmax(96px,150px) minmax(60px,1fr) 44px 52px minmax(0,150px) minmax(0,190px);
grid-template-areas:"lbl track pct pace amt rst"}
.lbl{grid-area:lbl}.track{grid-area:track}.pct{grid-area:pct}
.pace{grid-area:pace}.amt{grid-area:amt}.rst{grid-area:rst}
.pace{text-align:right;font-size:12px;color:var(--dim);font-variant-numeric:tabular-nums}
.pace.warn{color:var(--warn)}.pace.crit{color:var(--crit)}
.pace.ok{color:var(--dim)}
.lbl{color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbl.act::before{content:"● ";color:var(--accent)}
.lbl:not(.act)::before{content:"  "}
.track{background:#21262d;border-radius:4px;height:9px;position:relative;overflow:hidden}
/* the elapsed-time marker: how much of the window is gone. A fill that
   runs past it is budget burned ahead of schedule. */
.mark{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--accent);
opacity:.9}
.fill{height:100%;border-radius:4px;transition:width .4s}
/* scoped to .fill: the same level class also lands on the pace text,
   which must be colored, not filled */
.fill.ok{background:var(--ok)}.fill.warn{background:var(--warn)}
.fill.crit{background:var(--crit)}.fill.none{background:#30363d}
.pct{text-align:right;font-variant-numeric:tabular-nums}
.amt,.rst{color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums;
overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rst b{color:var(--fg);font-weight:400}
.bad{color:var(--crit);font-size:12px}
.stale{color:var(--warn) !important;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px}
td{padding:3px 0;color:var(--dim)}td:first-child{color:var(--fg);width:150px}
td:nth-child(2){width:140px}
/* Narrow: the reset clock must never be the thing that gets clipped --
   it is the whole point of the page. Stack it under the bar instead. */
@media(max-width:860px){
.g{grid-template-columns:minmax(90px,1fr) minmax(50px,1.4fr) 44px 52px;
grid-template-areas:"lbl track pct pace" "rst rst amt amt";padding:6px 0}
.amt{text-align:right}.rst{white-space:nowrap}
td:first-child{width:auto}}
</style></head><body><div class="wrap">
<h1>quota</h1><div class="sub" id="sub">loading…</div>
<div class="sub" style="margin-top:-14px">│ = elapsed point in window · pace = used% / elapsed% (1.0x = on track)</div>
<div id="rails"></div>
<div class="card"><div class="rail"><b>resets</b><span>soonest first</span></div>
<table id="sched"></table></div>
</div><script>
const WD=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const pad=n=>String(n).padStart(2,"0");
function when(iso,now){if(!iso)return "—";const d=new Date(iso);
 if(d.toDateString()===now.toDateString())return pad(d.getHours())+":"+pad(d.getMinutes());
 return pad(d.getMonth()+1)+"-"+pad(d.getDate())+"("+WD[(d.getDay()+6)%7]+") "
  +pad(d.getHours())+":"+pad(d.getMinutes());}
function left(iso,now){if(!iso)return "";let s=(new Date(iso)-now)/1000;
 if(s<=0)return "resetting";const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),
 m=Math.floor(s%3600/60);
 return d?`in ${d}d ${h}h`:h?`in ${h}h ${m}m`:`in ${m}m`;}
function pacing(g,now){const p=g.used_pct;
 if(!g.period_start||!g.resets_at)return[null,null];
 const s=new Date(g.period_start),e=new Date(g.resets_at),span=e-s;
 if(span<=0)return[null,null];
 const el=Math.max(0,Math.min(100,100*(now-s)/span));
 if(p==null||el<=0)return[el,null];
 return[el,p/el];}
function lvl(g,now){const p=g.used_pct;
 if(p==null)return "none"; if(p>=90)return "crit";
 const[el,pace]=pacing(g,now);
 if(pace==null)return p>=70?"warn":"ok";
 if(el<5)return p>=25?"warn":"ok";
 if(pace>=2)return "crit"; if(pace>=1.3||p>=80)return "warn"; return "ok";}
function paceTxt(g,now){const[el,pace]=pacing(g,now);
 return (pace==null||el<5)?"":pace.toFixed(1)+"x";}
function amt(g){const f=n=>n.toLocaleString();
 if(g.used!=null&&g.limit!=null)return `${f(g.used)}/${f(g.limit)} ${g.unit||""}`;
 if(g.used!=null)return `${f(g.used)} ${g.unit||""}`;return "";}
let snap=null;
function draw(){if(!snap)return;const now=new Date();
 const ts=new Date(snap.ts);
 sub.textContent=`${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}`
  +`(${WD[(ts.getDay()+6)%7]}) ${pad(ts.getHours())}:${pad(ts.getMinutes())} KST`;
 rails.innerHTML=snap.rails.map(r=>{
  if(r.status==="unavailable")return `<div class="card"><div class="rail"><b>${r.rail}</b></div>
   <div class="bad">UNAVAILABLE — ${r.reason||""}</div></div>`;
  const tag=r.status==="stale"
   ?`<span class="stale">stale — ${r.reason||""} (as of ${when(r.fetched_at,now)})</span>`
   :(r.age_seconds>=60?`<span>as of ${when(r.fetched_at,now)}</span>`:"");
  const rows=r.gauges.map(g=>{const p=g.used_pct,L=lvl(g,now);
   const[el]=pacing(g,now);
   return `<div class="g"><div class="lbl ${g.active?"act":""}">${g.label}</div>
    <div class="track"><div class="fill ${L}" style="width:${p==null?0:Math.min(100,p)}%"></div>
     ${el==null?"":`<div class="mark" style="left:${el.toFixed(1)}%"></div>`}</div>
    <div class="pct">${p==null?"—":Math.round(p)+"%"}</div>
    <div class="pace ${L}">${paceTxt(g,now)}</div>
    <div class="amt">${amt(g)}</div>
    <div class="rst">${g.resets_at?`<b>${when(g.resets_at,now)}</b> ${left(g.resets_at,now)}`
      :(g.note||"")}</div></div>`}).join("");
  return `<div class="card"><div class="rail"><b>${r.rail}</b>
   <span>${r.plan||""}</span>${tag}</div>${rows}</div>`}).join("");
 const seen=new Set(),sch=[];
 snap.rails.forEach(r=>r.gauges.forEach(g=>{if(!g.resets_at)return;
  const k=r.rail+g.resets_at;if(seen.has(k))return;seen.add(k);
  sch.push([g.resets_at,r.rail,g.label])}));
 sched.innerHTML=sch.sort().map(([iso,rail,label])=>
  `<tr><td>${when(iso,now)}</td><td>${left(iso,now)}</td><td>${rail} · ${label}</td></tr>`).join("");}
async function load(){try{snap=await (await fetch("/api/snapshot.json")).json();draw();}
 catch(e){sub.textContent="collection failed — check the terminal";}}
load();setInterval(load,60000);setInterval(draw,30000);
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    ttl = 120

    def _send(self, code, ctype, body):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Quota", IDENT)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/":
            self._send(200, "text/html; charset=utf-8", PAGE.encode())
        elif path == "/api/snapshot.json":
            snap = get_snapshot(self.ttl)
            self._send(200, "application/json; charset=utf-8",
                       json.dumps(snap, ensure_ascii=False).encode())
        elif path == "/api/text":
            snap = get_snapshot(self.ttl)
            self._send(200, "text/plain; charset=utf-8",
                       render.render_text(snap, color=False).encode())
        elif path == "/api/stop":
            self._send(200, "text/plain; charset=utf-8", b"stopping\n")
            threading.Thread(target=self.server.shutdown, daemon=True).start()
        else:
            self._send(404, "text/plain; charset=utf-8", b"not found\n")

    def log_message(self, fmt, *args):
        pass  # the terminal stays readable; errors surface in the page


def already_ours(port):
    """True when 127.0.0.1:port is already this page (this or a prior build)."""
    try:
        req = Request(f"http://127.0.0.1:{port}/")
        with urlopen(req, timeout=0.8) as r:
            if r.headers.get("X-Quota") == IDENT:
                return True
            return b"<title>quota</title>" in r.read(800)
    except (URLError, TimeoutError, OSError):
        return False


def _wait_gone(port, seconds):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if not already_ours(port):
            return True
        time.sleep(0.1)
    return not already_ours(port)


def _port_from_cmdline(cmd, default=8787):
    parts = cmd.split()
    try:
        i = parts.index("--port")
        return int(parts[i + 1])
    except (ValueError, IndexError):
        return default


def _serve_pids(port):
    """PIDs whose cmdline is this script bound to port (default 8787)."""
    here = os.path.abspath(__file__)
    pids = []
    try:
        names = os.listdir("/proc")
    except OSError:
        return pids
    for name in names:
        if not name.isdigit():
            continue
        pid = int(name)
        if pid == os.getpid():
            continue
        try:
            with open(f"/proc/{pid}/cmdline", "rb") as f:
                cmd = f.read().replace(b"\x00", b" ").decode("utf-8", "replace")
        except (FileNotFoundError, PermissionError, ProcessLookupError, OSError):
            continue
        if here not in cmd and "quota/scripts/serve.py" not in cmd:
            continue
        if _port_from_cmdline(cmd) == port:
            pids.append(pid)
    return pids


def stop_ours(port):
    """Stop the quota web on port. Prefer /api/stop; SIGTERM older builds."""
    try:
        req = Request(f"http://127.0.0.1:{port}/api/stop")
        urlopen(req, timeout=1.0).read()
    except (URLError, TimeoutError, OSError):
        pass
    if _wait_gone(port, 1.5):
        return True
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for pid in _serve_pids(port):
            try:
                os.kill(pid, sig)
            except ProcessLookupError:
                pass
        if _wait_gone(port, 1.5):
            return True
    return not already_ours(port)


def bind(port):
    try:
        return ThreadingHTTPServer(("127.0.0.1", port), Handler)
    except OSError as e:
        if e.errno != errno.EADDRINUSE:
            raise
        if already_ours(port) and stop_ours(port):
            print(f"quota web — stopped http://127.0.0.1:{port}")
            sys.exit(0)
        print(
            f"quota web — port {port} already in use (not this server). "
            f"try: ./run.sh quota:web {port + 1}",
            file=sys.stderr,
        )
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--ttl", type=int, default=120,
                    help="seconds a snapshot is reused before re-polling vendors. "
                         "Safe at 120 because collect.py guards claude separately "
                         "at MIN_INTERVAL=180s -- the page cadence and the "
                         "sensitive rail's cadence are no longer the same number.")
    a = ap.parse_args()
    Handler.ttl = a.ttl
    if already_ours(a.port):
        if stop_ours(a.port):
            print(f"quota web — stopped http://127.0.0.1:{a.port}")
            sys.exit(0)
        print(f"quota web — failed to stop http://127.0.0.1:{a.port}", file=sys.stderr)
        sys.exit(1)
    srv = bind(a.port)
    print(f"quota web — http://127.0.0.1:{a.port}  (ttl {a.ttl}s, run again to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
