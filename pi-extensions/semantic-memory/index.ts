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
import { execSync } from "node:child_process";
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

// --- dictcli expand (3층) ---

function dictcliExpand(query: string): string[] {
  const koreanWords = query.match(/[\uAC00-\uD7AF]+/g) ?? [];
  if (koreanWords.length === 0) return [];

  // dictcli 위치: skills/dictcli/ (graph.edn과 같은 디렉토리)
  const dictcliDir = path.join(
    process.env.HOME ?? "",
    ".pi", "agent", "skills", "pi-skills", "dictcli",
  );
  const dictcliBin = path.join(dictcliDir, "dictcli");
  if (!fs.existsSync(dictcliBin)) return [];

  const expanded: string[] = [];
  for (const word of koreanWords) {
    try {
      const out = execSync(`./dictcli expand "${word}" --json`, {
        timeout: 1000,
        encoding: "utf-8",
        cwd: dictcliDir, // graph.edn이 여기에 있어야 함
      }).trim();
      if (out.startsWith("[")) {
        expanded.push(...(JSON.parse(out) as string[]));
      }
    } catch {
      // silent — dictcli not available or word not found
    }
  }
  return [...new Set(expanded)];
}

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
  let sessionInfoInjected = false;

  // --- Session naming + context injection ---
  const device = (() => {
    try {
      return fs.readFileSync(
        path.join(process.env.HOME ?? "", ".current-device"),
        "utf-8",
      ).trim();
    } catch {
      return "unknown";
    }
  })();

  pi.on("before_agent_start", async (event, ctx) => {
    if (sessionInfoInjected) return;
    sessionInfoInjected = true;

    const timeKST = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return {
      message: {
        customType: "session-info",
        content: `device=${device}, time_kst=${timeKST}`,
        display: false,
      },
    };
  });

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
      // Lazy init
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

      // 3층 dictcli expand — 한글 쿼리 확장
      const expanded = dictcliExpand(params.query);
      const enrichedQuery = expanded.length > 0
        ? `${params.query} ${expanded.join(" ")}`
        : params.query;

      const queryVector = await embedQuery(enrichedQuery, gemini);
      const vectorResults = await sessionStore.search(queryVector, limit * 2);
      const ftsResults = await sessionStore.fullTextSearch(params.query, limit * 2);

      let results = await retrieve(params.query, vectorResults, ftsResults, {
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        recencyHalfLifeDays: 14,
        minScore: 0.001,
        mergeStrategy: "rrf" as const,
        mmr: { enabled: false, lambda: 0.7 },
      });

      // 자동 폴백: session 결과가 빈약하면 knowledge_search도 실행
      const topScore = results[0]?.score ?? 0;
      let fallbackUsed = false;
      if (orgReady && (results.length < 3 || topScore < 0.005)) {
        const orgGemini = getGeminiConfig(768);
        if (orgGemini) {
          const orgQueryVector = await embedQuery(enrichedQuery, orgGemini);
          const orgVec = await orgStore.search(orgQueryVector, limit, 0.05);
          const orgFts = await orgStore.fullTextSearch(params.query, limit);
          const orgResults = await retrieve(params.query, orgVec, orgFts, {
            vectorWeight: 0.7,
            bm25Weight: 0.3,
            recencyHalfLifeDays: 90,
            minScore: 0.05,
            mmr: { enabled: true, lambda: 0.7 },
            mergeStrategy: "weighted" as const,
          });
          if (orgResults.length > 0) {
            results = [...results.slice(0, limit - 3), ...orgResults.slice(0, 3)];
            fallbackUsed = true;
          }
        }
      }

      const output = formatResults(
        expanded.length > 0 ? `${params.query} (+expand: ${expanded.join(", ")})` : params.query,
        results.slice(0, limit),
      );
      if (fallbackUsed) {
        output.content[0].text += "\n\n(⚡ session 결과 부족 → knowledge_search 폴백 포함)";
      }
      return output;
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

      // 3층 dictcli expand — 한글 쿼리 확장
      const expanded = dictcliExpand(params.query);
      const enrichedQuery = expanded.length > 0
        ? `${params.query} ${expanded.join(" ")}`
        : params.query;

      const queryVector = await embedQuery(enrichedQuery, gemini);
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

      return formatResults(
        expanded.length > 0 ? `${params.query} (+expand: ${expanded.join(", ")})` : params.query,
        results.slice(0, limit),
      );
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

  // --- /whoami 커맨드 — 세션 이름 설정 (영속) ---
  pi.registerCommand("whoami", {
    description: "세션 이름 설정 — /resume에서 구분. 예: /whoami 에이전트1",
    handler: async (args, ctx) => {
      const name = (args ?? "").trim();
      if (!name) {
        const current = pi.getSessionName();
        ctx.ui.notify(current ? `현재: ${current}` : "이름 없음. /name <이름>", "info");
        return;
      }
      pi.setSessionName(name);
      ctx.ui.notify(`✅ 세션 이름: ${name}`, "info");
    },
  });

  // --- /new 시 현재 세션 자동 인덱싱 ---
  // 현재 세션 JSONL은 계속 추가되므로 무조건 재인덱싱 (delete→insert)
  pi.on("session_before_switch", async (event, ctx) => {
    if (event.reason !== "new") return;

    const gemini = getGeminiConfig();
    if (!gemini || !sessionReady) return;

    try {
      // 현재 세션 파일 찾기 (가장 최근 수정된 것)
      const sessionFile = ctx.sessionManager.getSessionFile?.() ?? "";
      const files = findSessionFiles();

      // 현재 세션 + 미인덱싱 세션 모두 처리
      const indexed = await sessionStore.getIndexedFiles();
      const toIndex = files.filter((f) => !indexed.has(f));

      // 현재 세션은 이미 인덱싱됐더라도 재인덱싱 (내용이 늘어났으므로)
      const currentSessionFiles = sessionFile
        ? files.filter((f) => f.includes(sessionFile.split("/").pop()?.split(".")[0] ?? "___"))
        : [];
      const reindexFiles = [...new Set([...toIndex, ...currentSessionFiles])];

      // 최근 수정된 세션도 재인덱싱 (긴 세션이 업데이트됐을 수 있음)
      const now = Date.now();
      const recentFiles = files.filter((f) => {
        try {
          const stat = fs.statSync(f);
          return now - stat.mtimeMs < 24 * 60 * 60 * 1000; // 24시간 내 수정
        } catch { return false; }
      });
      const allToIndex = [...new Set([...reindexFiles, ...recentFiles])];

      if (allToIndex.length > 0) {
        ctx.ui.notify(`🧠 ${allToIndex.length}개 세션 인덱싱 중...`, "info");
        for (const file of allToIndex) {
          const chunks = await extractSessionChunks(file);
          if (chunks.length === 0) continue;
          const vectors = await embedDocumentBatch(
            chunks.map((c) => c.text),
            gemini,
          );
          // addChunks는 delete-before-insert (중복 방지)
          await sessionStore.addChunks(
            chunks.map((c, j) => ({ ...c, vector: vectors[j] })),
          );
        }
        try { await sessionStore.createFtsIndex(); } catch {}
        const total = await sessionStore.getCount();
        ctx.ui.notify(`✅ 인덱싱 완료. ${total} chunks.`, "info");
      }
    } catch (err) {
      ctx.ui.notify(
        `⚠ 인덱싱 실패: ${err instanceof Error ? err.message : String(err)}`,
        "warning",
      );
    }
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
