/**
 * Semantic Memory — pi extension
 *
 * Tools:
 * - session_search: search past pi sessions by meaning
 * - knowledge_search: search org-mode knowledge base by meaning
 *
 * Commands:
 * - /memory status: show index stats
 * - /memory search <query>: search sessions
 * - /memory reindex: rebuild session index
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  embedQuery,
  embedDocumentBatch,
  type GeminiEmbeddingConfig,
} from "./gemini-embeddings.ts";
import { VectorStore } from "./store.ts";
import {
  findSessionFiles,
  extractSessionChunks,
} from "./session-indexer.ts";
import { retrieve, type RetrieverConfig } from "./retriever.ts";

// --- Config ---

function getGeminiConfig(dimensions?: 768 | 3072): GeminiEmbeddingConfig | null {
  const apiKey =
    process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;
  return {
    apiKey,
    model: "gemini-embedding-2-preview",
    ...(dimensions ? { dimensions } : {}),
  };
}

// --- Extension ---

export default function (pi: ExtensionAPI) {
  const sessionStore = new VectorStore(undefined, 3072);
  const orgDbPath = path.join(
    process.env.HOME ?? "",
    ".pi",
    "agent",
    "memory",
    "org.lance",
  );
  const orgStore = new VectorStore(orgDbPath, 768);

  let sessionReady = false;
  let orgReady = false;

  // --- Initialize on session start ---
  pi.on("session_start", async (_event, ctx) => {
    const gemini = getGeminiConfig();
    if (!gemini) {
      ctx.ui.setStatus(
        "semantic-memory",
        "⚠ GOOGLE_AI_API_KEY not set — semantic memory disabled",
      );
      return;
    }

    try {
      await sessionStore.init();
      sessionReady = true;
      const sCount = await sessionStore.getCount();

      // Org store (if indexed)
      if (fs.existsSync(orgDbPath)) {
        await orgStore.init();
        orgReady = true;
        const oCount = await orgStore.getCount();
        ctx.ui.setStatus(
          "semantic-memory",
          `🧠 ${sCount} sessions + 📚 ${oCount} org chunks`,
        );
      } else {
        ctx.ui.setStatus("semantic-memory", `🧠 ${sCount} session chunks`);
      }
    } catch (err) {
      ctx.ui.setStatus(
        "semantic-memory",
        `⚠ Memory init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  // --- session_search tool ---
  pi.registerTool({
    name: "session_search",
    label: "Session Search",
    description:
      "Search past pi sessions by meaning. Use when you need to find previous conversations, decisions, or context from past sessions.",
    promptSnippet:
      "Search past pi sessions semantically — find conversations, decisions, and context by meaning",
    promptGuidelines: [
      "Use session_search when the user asks about past conversations, decisions, or context from other sessions.",
      "Use session_search when you need context that may have been discussed in a previous session.",
      "Prefer session_search over grep for finding past discussions — it understands meaning, not just keywords.",
    ],
    parameters: Type.Object({
      query: Type.String({
        description:
          "Natural language search query (e.g., 'claude-config memory 정리', 'NixOS GPU cluster setup')",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Max results (default 10)",
          default: 10,
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      // Lazy init — session_start may not have fired yet or env wasn't ready
      if (!sessionReady) {
        const gemini = getGeminiConfig();
        if (!gemini) throw new Error("GOOGLE_AI_API_KEY / GEMINI_API_KEY not set.");
        try {
          await sessionStore.init();
          sessionReady = true;
        } catch (err) {
          throw new Error(`Session memory init failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      const gemini = getGeminiConfig();
      if (!gemini) throw new Error("GOOGLE_AI_API_KEY not set.");

      const limit = params.limit ?? 10;
      const queryVector = await embedQuery(params.query, gemini);
      const vectorResults = await sessionStore.search(queryVector, limit * 2);
      const ftsResults = await sessionStore.fullTextSearch(params.query, limit * 2);

      const results = await retrieve(params.query, vectorResults, ftsResults, {
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        recencyHalfLifeDays: 14,
        minScore: 0.001,  // RRF scores are small (~0.01), don't filter them
        mergeStrategy: "rrf" as const,
        mmr: { enabled: false, lambda: 0.7 },
      });

      return formatResults(params.query, results.slice(0, limit));
    },
  });

  // --- knowledge_search tool ---
  pi.registerTool({
    name: "knowledge_search",
    label: "Knowledge Search",
    description:
      "Search the org-mode knowledge base (3000+ Denote notes) by meaning. Use for finding notes, concepts, references, meta-knowledge. Supports Korean and English queries.",
    promptSnippet:
      "Search org-mode knowledge base semantically — notes, concepts, references in Korean and English",
    promptGuidelines: [
      "Use knowledge_search when the user asks about their notes, concepts, or knowledge base.",
      "Use knowledge_search for cross-lingual queries — Korean '보편' finds English-tagged 'universalism' notes.",
      "Prefer knowledge_search over denotecli for semantic/conceptual search. Use denotecli for exact title/tag matching.",
    ],
    parameters: Type.Object({
      query: Type.String({
        description:
          "Natural language search query (e.g., '보편 학문', 'knowledge graph ontology', '바흐 체화인지')",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Max results (default 10)",
          default: 10,
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      // Lazy init — org DB may exist but session_start lost the race with env-loader
      if (!orgReady) {
        if (!fs.existsSync(orgDbPath)) {
          throw new Error("Org knowledge base not indexed. Run: ./run.sh index:org");
        }
        const gemini = getGeminiConfig(768);
        if (!gemini) throw new Error("GOOGLE_AI_API_KEY / GEMINI_API_KEY not set.");
        try {
          await orgStore.init();
          orgReady = true;
        } catch (err) {
          throw new Error(`Org memory init failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      const gemini = getGeminiConfig(768);
      if (!gemini) throw new Error("GOOGLE_AI_API_KEY not set.");

      const limit = params.limit ?? 10;
      const queryVector = await embedQuery(params.query, gemini);
      const vectorResults = await orgStore.search(queryVector, limit * 2, 0.05);
      const ftsResults = await orgStore.fullTextSearch(params.query, limit * 2);

      const results = await retrieve(params.query, vectorResults, ftsResults, {
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        recencyHalfLifeDays: 90,
        minScore: 0.05,
        mmr: { enabled: true, lambda: 0.7 },
        mergeStrategy: "weighted" as const,
      });

      return formatResults(params.query, results.slice(0, limit));
    },
  });

  // --- /memory command ---
  pi.registerCommand("memory", {
    description: "Semantic memory — status, search <query>, reindex",
    handler: async (args, ctx) => {
      const parts = (args ?? "").trim().split(/\s+/);
      const sub = parts[0] || "status";

      if (sub === "status") {
        const sCount = sessionReady ? await sessionStore.getCount() : 0;
        const oCount = orgReady ? await orgStore.getCount() : 0;
        const sFiles = findSessionFiles();
        const sIndexed = sessionReady ? await sessionStore.getIndexedFiles() : new Set();
        ctx.ui.notify(
          `🧠 Sessions: ${sCount} chunks (${sIndexed.size}/${sFiles.length} files)\n` +
            `📚 Org: ${oCount} chunks${orgReady ? "" : " (not indexed)"}`,
          "info",
        );
      } else if (sub === "search") {
        const query = parts.slice(1).join(" ");
        if (!query) {
          ctx.ui.notify("Usage: /memory search <query>", "warning");
          return;
        }
        pi.sendUserMessage(
          `Use session_search to find: "${query}"`,
          { deliverAs: "followUp" },
        );
      } else if (sub === "reindex") {
        if (!sessionReady) {
          ctx.ui.notify("Session memory not initialized.", "warning");
          return;
        }
        const gemini = getGeminiConfig();
        if (!gemini) {
          ctx.ui.notify("GOOGLE_AI_API_KEY not set.", "error");
          return;
        }
        const force = parts.includes("--force");
        ctx.ui.notify("🧠 Starting session index...", "info");
        try {
          await indexSessions(sessionStore, gemini, ctx, force);
          const count = await sessionStore.getCount();
          ctx.ui.setStatus("semantic-memory", `🧠 ${count} chunks indexed`);
          ctx.ui.notify(`✅ Done. ${count} chunks.`, "info");
        } catch (err) {
          ctx.ui.notify(
            `❌ Failed: ${err instanceof Error ? err.message : String(err)}`,
            "error",
          );
        }
      } else {
        ctx.ui.notify(
          "Usage: /memory [status | search <query> | reindex [--force]]",
          "warning",
        );
      }
    },
  });

  pi.on("session_shutdown", async () => {
    await sessionStore.close();
    await orgStore.close();
  });
}

// --- Helpers ---

function formatResults(query: string, results: import("./store.ts").SearchResult[]) {
  if (results.length === 0) {
    return {
      content: [{ type: "text" as const, text: `No results for: "${query}"` }],
      details: { query, results: [] },
    };
  }

  const formatted = results
    .map((r, i) => {
      const lines = [
        `## ${i + 1}. [${r.project}] ${r.role} (score: ${r.score.toFixed(3)})`,
        `- File: ${r.sessionFile}:L${r.lineNumber}`,
        `- Time: ${r.timestamp}`,
        `- Text:\n${r.text.slice(0, 500)}${r.text.length > 500 ? "..." : ""}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  return {
    content: [
      {
        type: "text" as const,
        text: `Found ${results.length} results for: "${query}"\n\n${formatted}`,
      },
    ],
    details: {
      query,
      resultCount: results.length,
      results: results.map((r) => ({
        id: r.id,
        project: r.project,
        role: r.role,
        score: r.score,
        sessionFile: r.sessionFile,
        lineNumber: r.lineNumber,
      })),
    },
  };
}

async function indexSessions(
  store: VectorStore,
  gemini: GeminiEmbeddingConfig,
  ctx: { ui: { notify: (msg: string, level: string) => void } },
  force: boolean = false,
): Promise<void> {
  const files = findSessionFiles();
  if (force) await store.reset();
  await store.ensureTable();

  const indexed = force ? new Set<string>() : await store.getIndexedFiles();
  const toIndex = files.filter((f) => !indexed.has(f));

  if (toIndex.length === 0) {
    ctx.ui.notify("All sessions already indexed.", "info");
    return;
  }

  ctx.ui.notify(`Indexing ${toIndex.length} sessions...`, "info");
  let totalChunks = 0;

  for (let i = 0; i < toIndex.length; i++) {
    const chunks = await extractSessionChunks(toIndex[i]);
    if (chunks.length === 0) continue;

    const vectors = await embedDocumentBatch(chunks.map((c) => c.text), gemini);
    await store.addChunks(chunks.map((c, j) => ({ ...c, vector: vectors[j] })));
    totalChunks += chunks.length;

    if ((i + 1) % 10 === 0) {
      ctx.ui.notify(`${i + 1}/${toIndex.length} sessions, ${totalChunks} chunks...`, "info");
    }
  }

  await store.createFtsIndex();
  ctx.ui.notify(`Indexed ${toIndex.length} sessions → ${totalChunks} chunks`, "info");
}
