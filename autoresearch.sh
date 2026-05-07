#!/usr/bin/env bash
set -euo pipefail

cmd=(python3 skills/session-recap/scripts/session-recap.py -p agent-config -m 15 --source pi)

python3 - <<'PY' "${cmd[@]}"
import statistics, subprocess, sys, time
cmd = sys.argv[1:]
samples = []
for _ in range(7):
    t0 = time.perf_counter_ns()
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    dt_ms = (time.perf_counter_ns() - t0) / 1_000_000
    samples.append(dt_ms)
median = statistics.median(samples)
spread = max(samples) - min(samples)
print(f"METRIC recap_ms={median:.3f}")
print(f"METRIC spread_ms={spread:.3f}")
PY
