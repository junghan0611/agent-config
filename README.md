# agent-config

**Token-Efficient Agent Toolkit with Google Workspace Integration**

> Part of the 8-layer -config ecosystem by [@junghan0611](https://github.com/junghan0611)

[한국어](./README-KO.md) | [junghan0611 Profile](https://github.com/junghan0611)

---

## What is agent-config?

**Public template and toolkit** for AI agents, focusing on token efficiency and workspace automation.

Originally derived from private `claude-config` (Layer 4), designed for community sharing.

### Position in 8-Layer Ecosystem

```
Layer 6: meta-config          (Agent Orchestration)
Layer 5: memex-kb, memacs     (Knowledge, Time Integration)
Layer 4: claude-config        (Private Memory) ← agent-config is public version
         agent-config         (Public Toolkit)
Layer 3: zotero-config        (Bibliography)
Layer 2: doomemacs-config     (Editor)
Layer 1: nixos-config         (OS)
```

---

## Core Features

### 🎯 3-Tier Information Architecture

```
Tier 1: Tracking → 50 tokens (thin pointers)
Tier 2: Workspace → 300 tokens (Apps Script summaries)
Tier 3: Repository → Direct access (what you need)
```

### 🚀 Apps Script Layer

- **10-20x token savings** (verified, not exaggerated)
- **Complete automation**: Time-driven triggers
- **Custom functions**: `=ANALYZE(A1:A10)` in Sheets
- **Workspace native**: Internal processing

### 📊 Lean Tracking

**1 Repository = 1 Tracking File** (1KB)

10 repos = 500 tokens (vs 10,000 traditional)

---

## Quick Start

```bash
# Clone
git clone https://github.com/junghan0611/agent-config.git

# Setup Google Workspace MCP
# See docs/GOOGLE-WORKSPACE.md

# Deploy Apps Script
# See src/apps-script/mcp-chat-app/README.md
```

---

## Philosophy

> "Memory is an index, Repository is truth, Workspace is dashboard"

- Agent memory: Just pointers
- Real data: In repositories
- Details: Workspace provides
- Automation: Apps Script handles

---

## Status

🚀 Active Development (2025-11-14)

Part of junghan0611's ecosystem: https://github.com/junghan0611

---

## License

MIT

---

*"Give agents wings with token-efficient tools"*
