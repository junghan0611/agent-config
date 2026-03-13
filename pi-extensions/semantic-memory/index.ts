/**
 * Semantic Memory — pi extension
 *
 * Session RAG: search past pi sessions by meaning, not just keywords.
 *
 * Tools:
 * - session_search: semantic search across all past sessions
 *
 * Commands:
 * - /memory status: show index stats
 * - /memory search <query>: manual search
 * - /memory reindex: rebuild index from scratch
 *
 * Architecture:
 * - LanceDB vector store (serverless, file-based)
 * - Gemini Embedding 2 native API (OpenClaw pattern)
 * - Hybrid BM25 + vector search with RRF fusion
 * - Jina Rerank (optional, cross-encoder)
 * - Recency decay (newer sessions rank higher)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  embedQuery,
  embedDocumentBatch,
  type GeminiEmbeddingConfig,
} from "./gemini-embeddings.js";
import { VectorStore } from "./store.js";
import {
  findSessionFiles,
  extractSessionChunks,
  type SessionChunk,
} from "./session-indexer.js";
import { retrieve, type RetrieverConfig } from "./retriever.js";

// --- Config ---

const VECTOR_DIMENSIONS = 3072; // Full precision for sessions (Matryoshka 768 for Phase 2/org)

function getGeminiConfig(): GeminiEmbeddingConfig | null {
  const apiKey =
    process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;
  return {
    apiKey,
    model: "gemini-embedding-2-preview",
    // No dimensions → 3072 default (full precision for sessions)
  };
}

function getRetrieverConfig(): Partial<RetrieverConfig> {
  return {
    vectorWeight: 0.7,
    bm25Weight: 0.3,
    recencyHalfLifeDays: 14,
    jinaApiKey: process.env.JINA_API_KEY,
    jinaModel: "jina-reranker-v3",
  };
}

// --- Extension ---

export default function (pi: ExtensionAPI) {
  const store = new VectorStore(undefined, VECTOR_DIMENSIONS);
  let initialized = false;
  let indexing = false;

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
      await store.init();
      initialized = true;

      const count = await store.getCount();
      if (count > 0) {
        ctx.ui.setStatus("semantic-memory", `🧠 ${count} chunks indexed`);
      } else {
        ctx.ui.setStatus(
          "semantic-memory",
          "🧠 No sessions indexed yet. Use /memory reindex",
        );
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
      "Search past sessions semantically — find conversations, decisions, and context by meaning",
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

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!initialized) {
        throw new Error(
          "Semantic memory not initialized. Check GOOGLE_AI_API_KEY.",
        );
      }

      const gemini = getGeminiConfig();
      if (!gemini) {
        throw new Error("GOOGLE_AI_API_KEY not set.");
      }

      const limit = params.limit ?? 10;

      // 1. Embed query
      const queryVector = await embedQuery(params.query, gemini);

      // 2. Vector search
      const vectorResults = await store.search(queryVector, limit * 2);

      // 3. Full-text search
      const ftsResults = await store.fullTextSearch(params.query, limit * 2);

      // 4. Hybrid retrieval (RRF + decay + optional rerank)
      const results = await retrieve(
        params.query,
        vectorResults,
        ftsResults,
        getRetrieverConfig(),
      );

      const topResults = results.slice(0, limit);

      if (topResults.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No results found for: "${params.query}"\n\nTry /memory reindex if sessions haven't been indexed yet.`,
            },
          ],
          details: { query: params.query, results: [] },
        };
      }

      // Format results
      const formatted = topResults
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
            type: "text",
            text: `Found ${topResults.length} results for: "${params.query}"\n\n${formatted}`,
          },
        ],
        details: {
          query: params.query,
          resultCount: topResults.length,
          results: topResults.map((r) => ({
            id: r.id,
            project: r.project,
            role: r.role,
            score: r.score,
            sessionFile: r.sessionFile,
            lineNumber: r.lineNumber,
          })),
        },
      };
    },
  });

  // --- /memory command ---
  pi.registerCommand("memory", {
    description:
      "Semantic memory management — status, search <query>, reindex",
    handler: async (args, ctx) => {
      const parts = (args ?? "").trim().split(/\s+/);
      const subcommand = parts[0] || "status";

      switch (subcommand) {
        case "status": {
          if (!initialized) {
            ctx.ui.notify("Semantic memory not initialized.", "warning");
            return;
          }
          const count = await store.getCount();
          const sessionFiles = findSessionFiles();
          const indexed = await store.getIndexedSessionFiles();
          ctx.ui.notify(
            `🧠 Semantic Memory\n` +
              `  Chunks: ${count}\n` +
              `  Sessions: ${indexed.size} / ${sessionFiles.length} indexed`,
            "info",
          );
          break;
        }

        case "search": {
          const query = parts.slice(1).join(" ");
          if (!query) {
            ctx.ui.notify("Usage: /memory search <query>", "warning");
            return;
          }
          // Trigger the tool via user message
          pi.sendUserMessage(
            `Use session_search to find: "${query}"`,
            { deliverAs: "followUp" },
          );
          break;
        }

        case "reindex": {
          if (!initialized) {
            ctx.ui.notify("Semantic memory not initialized.", "warning");
            return;
          }
          if (indexing) {
            ctx.ui.notify("Indexing already in progress...", "warning");
            return;
          }

          const gemini = getGeminiConfig();
          if (!gemini) {
            ctx.ui.notify("GOOGLE_AI_API_KEY not set.", "error");
            return;
          }

          const force = parts.includes("--force");
          ctx.ui.notify("🧠 Starting index...", "info");
          indexing = true;

          try {
            await indexSessions(store, gemini, ctx, force);
            const count = await store.getCount();
            ctx.ui.setStatus("semantic-memory", `🧠 ${count} chunks indexed`);
            ctx.ui.notify(`✅ Indexing complete. ${count} chunks.`, "info");
          } catch (err) {
            ctx.ui.notify(
              `❌ Indexing failed: ${err instanceof Error ? err.message : String(err)}`,
              "error",
            );
          } finally {
            indexing = false;
          }
          break;
        }

        default:
          ctx.ui.notify(
            "Usage: /memory [status | search <query> | reindex [--force]]",
            "warning",
          );
      }
    },
  });

  // Cleanup on shutdown
  pi.on("session_shutdown", async () => {
    await store.close();
  });
}

// --- Indexing Logic ---

async function indexSessions(
  store: VectorStore,
  gemini: GeminiEmbeddingConfig,
  ctx: { ui: { notify: (msg: string, level: string) => void } },
  force: boolean = false,
): Promise<void> {
  const sessionFiles = findSessionFiles();

  if (force) {
    await store.reset();
  }
  await store.ensureTable();

  // Find which sessions need indexing
  const indexed = force ? new Set<string>() : await store.getIndexedSessionFiles();
  const toIndex = sessionFiles.filter((f) => !indexed.has(f));

  if (toIndex.length === 0) {
    ctx.ui.notify("All sessions already indexed.", "info");
    return;
  }

  ctx.ui.notify(
    `Indexing ${toIndex.length} new sessions (${sessionFiles.length} total)...`,
    "info",
  );

  let totalChunks = 0;

  for (let i = 0; i < toIndex.length; i++) {
    const file = toIndex[i];
    const chunks = await extractSessionChunks(file);

    if (chunks.length === 0) continue;

    // Batch embed
    const texts = chunks.map((c) => c.text);
    const vectors = await embedDocumentBatch(texts, gemini);

    // Store
    const records = chunks.map((c, j) => ({
      id: c.id,
      text: c.text,
      vector: vectors[j],
      sessionFile: c.sessionFile,
      project: c.project,
      lineNumber: c.lineNumber,
      timestamp: c.timestamp,
      role: c.role,
      metadata: c.metadata,
    }));

    await store.addChunks(records);
    totalChunks += chunks.length;

    // Progress every 10 files
    if ((i + 1) % 10 === 0) {
      ctx.ui.notify(
        `  ${i + 1}/${toIndex.length} sessions, ${totalChunks} chunks...`,
        "info",
      );
    }
  }

  // Create FTS index
  await store.createFtsIndex();

  ctx.ui.notify(
    `Indexed ${toIndex.length} sessions → ${totalChunks} chunks`,
    "info",
  );
}
