# agent-config

**Agent infrastructure toolkit — extensions, skills, and configurations for [Pi](https://buildwithpi.ai/) coding agent.**

> Part of the 8-layer -config ecosystem by [@junghan0611](https://github.com/junghan0611)

[한국어](./README-KO.md) | [junghan0611 Profile](https://github.com/junghan0611)

---

## What is agent-config?

Public agent infrastructure hub. Extensions, skills, prompt templates, and themes for Pi coding agent.

### Position in 8-Layer Ecosystem

```
Layer 6: meta-config          (Agent Orchestration)
Layer 5: memex-kb, memacs     (Knowledge, Time Integration)
Layer 4: claude-config        (Private Memory)
         agent-config         (Public Toolkit) ← here
Layer 3: zotero-config        (Bibliography)
Layer 2: doomemacs-config     (Editor)
Layer 1: nixos-config         (OS)
```

## Pi Extensions

Custom extensions for Pi Coding Agent live in [`pi-extensions/`](pi-extensions/):

* [`semantic-memory/`](pi-extensions/semantic-memory/) — Session & knowledge RAG with LanceDB + Gemini Embedding 2 + Jina Rerank

## Skills

Skills will migrate here from [pi-skills](https://github.com/junghan0611/pi-skills) over time.

## Install

```bash
# As a pi package
pi install git:github.com/junghan0611/agent-config

# Or local path
pi install /path/to/agent-config
```

## Philosophy

> "에이전트가 어디서 뭘 대화했는지 기억 못 한다. 이건 말이 안 된다."

- Session JSONL → semantic search → context recovery
- OpenClaw patterns ported to pi-extension
- Open source contribution to pi ecosystem

---

## License

MIT
