---
name: memory-sync
description: "Sessions indexing on Cyborg: plan a fresh BGE-M3 / 1024d candidate before any embedding. Legacy local warm / --global sync are not migration routes. Sessions only; Garden and OpenClaw use the Andenken authority procedure. Triggers: /memory-sync, /memory-sync --global, session embedding, 세션 임베딩, 세션 증분, 글로벌 세션 동기화, 기억 최신화."
user_invocable: true
---

# memory-sync — sessions candidate

| Intent | Do |
|---|---|
| `/memory-sync` or `/memory-sync --global` during migration | Do not run the old wrappers, gather, checkpoint, or publish. Start with the Andenken `andenken-embed` authority skill and the current `./run.sh --help` in `~/repos/gh/andenken`. |
| Size the first recent-sessions candidate | On Cyborg, `./run.sh candidate:sessions:plan` with an explicit recent date range, verified corpus, and separate absolute target and plan paths. Use the current source revision; this step does not embed. |
| Build or resume | Only after GLG approves the scope and start, use `./run.sh candidate:sessions:build` with the approved plan SHA and target. Pin `ollama-bge-m3-1024`; resume only against the same corpus, plan, policy and model digest. Do not bypass authority, custody or writer checks. |
| Verify and activate | Verify the isolated candidate, then test actual search. Activation and publication are separate decisions; neither is implied by build approval. |
| Garden or OpenClaw | Use `andenken-embed`; do not treat them as sessions or put their rows in the sessions index. |

The first candidate covers the recent 90 days, not full history. Preserve source paths, device labels, and closed durable snapshot admission; do not gather live durable SQLite. Keep previous data, manifests, policy, configuration and code together for recovery. Never query or update that generation from the new one.
