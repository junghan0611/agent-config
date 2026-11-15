# harness-dashboard

A data-first view of how other agent harnesses look from the seat of the entwurf / agent-config
maintainer: can an address, a round trip and continuity hold with a sibling in another house while
that house keeps its own workbench, memory, lifecycle and identity. It carries no score, rank or
adoption verdict. Colour means evidence state only.

Documents rot; this is the reason the observations live as rows with a date, a pinned SHA and a
receipt each, and the page is only a viewer over them.

| Task | Command |
|---|---|
| View locally | `python3 build.py` then open `index.html` (works from `file://`, no server, no network) |
| Validate only | `python3 build.py` — prints the offending row and exits 1 on any contract breach |
| Deploy | `./deploy.sh` — validates, assembles `public/`, runs `wrangler deploy` |

- `data/schema.json` is the contract; `data/*.json` are the data (one top-level array per file).
- `data.js` and `public/` are generated and gitignored.
- The update procedure, column/add-on rules and the publication boundary are in
  `skills/harness-bench/DASHBOARD.md`.
