#!/usr/bin/env node --input-type=module
/**
 * Semantic Memory Test Suite
 *
 * Usage:
 *   cd pi-extensions/semantic-memory
 *   source ~/.env.local
 *   node test.ts                    # all tests
 *   node test.ts unit               # unit tests only (no API)
 *   node test.ts integration        # integration tests (needs API)
 *   node test.ts search "query"     # live search test
 *
 * Environment:
 *   GEMINI_API_KEY — required for integration tests
 *   JINA_API_KEY   — optional, tests rerank if set
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { VectorStore } from "./store.ts";
import {
  findSessionFiles,
  extractSessionChunks,
  extractProjectName,
} from "./session-indexer.ts";
import {
  rrfFusion,
  applyRecencyDecay,
  jinaRerank,
  retrieve,
} from "./retriever.ts";
import type { SearchResult } from "./store.ts";

// --- Test Framework ---

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}`);
  }
}

function skip(msg: string) {
  skipped++;
  console.log(`  ⏭  ${msg}`);
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

// --- Unit Tests (no API needed) ---

async function testSessionIndexer() {
  section("Session Indexer");

  // findSessionFiles
  const files = findSessionFiles();
  assert(files.length > 0, `findSessionFiles: found ${files.length} files`);
  assert(
    files.every((f) => f.endsWith(".jsonl")),
    "all files are .jsonl",
  );

  // extractProjectName
  assert(
    extractProjectName(
      "/home/user/.pi/agent/sessions/--home-user-repos-gh-agent-config--/file.jsonl",
    ) === "config",
    'extractProjectName: "config" from agent-config dir',
  );
  assert(
    extractProjectName(
      "/home/user/.pi/agent/sessions/--home-user--/file.jsonl",
    ) === "user",
    'extractProjectName: "user" from home dir',
  );

  // extractSessionChunks — test with first file
  if (files.length > 0) {
    const chunks = await extractSessionChunks(files[0]);
    assert(chunks.length > 0, `extractSessionChunks: ${chunks.length} chunks from first file`);

    // Validate chunk structure
    const c = chunks[0];
    assert(typeof c.id === "string" && c.id.length > 0, "chunk has id");
    assert(typeof c.text === "string" && c.text.length > 0, "chunk has text");
    assert(typeof c.sessionFile === "string", "chunk has sessionFile");
    assert(typeof c.project === "string", "chunk has project");
    assert(typeof c.lineNumber === "number", "chunk has lineNumber");
    assert(typeof c.role === "string", "chunk has role");
    assert(
      ["user", "assistant", "compaction"].includes(c.role),
      `chunk role is valid: "${c.role}"`,
    );

    // Text truncation
    assert(
      chunks.every((ch) => ch.text.length <= 2003), // 2000 + "..."
      "all chunks ≤ 2000 chars",
    );

    // Short messages filtered
    assert(
      chunks.filter((ch) => ch.role === "user").every((ch) => ch.text.length > 20),
      "user chunks > 20 chars (short filtered)",
    );
  }
}

async function testRetriever() {
  section("Retriever");

  // Mock results for testing
  const makeResult = (
    id: string,
    score: number,
    timestamp?: string,
  ): SearchResult => ({
    id,
    text: `text for ${id}`,
    sessionFile: "/test/file.jsonl",
    project: "test",
    lineNumber: 1,
    timestamp: timestamp ?? new Date().toISOString(),
    role: "user",
    metadata: {},
    score,
  });

  // RRF Fusion
  const vecResults = [makeResult("a", 0.9), makeResult("b", 0.7), makeResult("c", 0.5)];
  const ftsResults = [makeResult("b", 0.8), makeResult("d", 0.6), makeResult("a", 0.4)];

  const fused = rrfFusion(vecResults, ftsResults, 0.7, 0.3);
  assert(fused.length === 4, `RRF fusion: 4 unique results from 3+3`);
  assert(fused[0].id === "b" || fused[0].id === "a", `RRF: top result is overlapping (a or b)`);

  // Check that overlapping items get higher scores
  const aScore = fused.find((r) => r.id === "a")!.score;
  const dScore = fused.find((r) => r.id === "d")!.score;
  assert(aScore > dScore, `RRF: overlapping "a" (${aScore.toFixed(4)}) > unique "d" (${dScore.toFixed(4)})`);

  // Recency Decay
  const now = new Date();
  const oldDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const recentResults = [
    makeResult("recent", 1.0, now.toISOString()),
    makeResult("old", 1.0, oldDate.toISOString()),
  ];

  const decayed = applyRecencyDecay(recentResults, 14);
  const recentScore = decayed.find((r) => r.id === "recent")!.score;
  const oldScore = decayed.find((r) => r.id === "old")!.score;
  assert(
    recentScore > oldScore,
    `Decay: recent (${recentScore.toFixed(3)}) > old (${oldScore.toFixed(3)})`,
  );
  assert(
    oldScore < 0.5,
    `Decay: 30-day-old with halfLife=14 should be < 0.5 (got ${oldScore.toFixed(3)})`,
  );

  // Full retrieve pipeline (without rerank)
  const retrieved = await retrieve("test", vecResults, ftsResults, {
    vectorWeight: 0.7,
    bm25Weight: 0.3,
    recencyHalfLifeDays: 14,
  });
  assert(retrieved.length > 0, `Retrieve pipeline: ${retrieved.length} results`);
  assert(
    retrieved[0].score >= retrieved[retrieved.length - 1].score,
    "Retrieve: sorted descending by score",
  );
}

async function testVectorStore() {
  section("Vector Store (local)");

  // Test with temp DB
  const tmpDir = `/tmp/semantic-memory-test-${Date.now()}`;
  const store = new VectorStore(tmpDir, 8); // 8-dim for speed
  await store.init();
  await store.ensureTable();

  // Count starts at 0 (dummy deleted)
  const initialCount = await store.getCount();
  assert(initialCount === 0, `Initial count: ${initialCount} (dummy deleted)`);

  // Add chunks
  await store.addChunks([
    {
      id: "test-1",
      text: "NixOS configuration with flake",
      vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      sessionFile: "/test/session1.jsonl",
      project: "nixos-config",
      lineNumber: 10,
      timestamp: new Date().toISOString(),
      role: "user",
      metadata: { type: "test" },
    },
    {
      id: "test-2",
      text: "Emacs doom configuration setup",
      vector: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
      sessionFile: "/test/session2.jsonl",
      project: "doomemacs-config",
      lineNumber: 20,
      timestamp: new Date().toISOString(),
      role: "assistant",
      metadata: { type: "test" },
    },
  ]);

  const count = await store.getCount();
  assert(count === 2, `After add: ${count} chunks`);

  // Vector search
  const results = await store.search(
    [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    5,
    0,
  );
  assert(results.length === 2, `Vector search: ${results.length} results`);
  assert(results[0].id === "test-1", `Nearest: test-1 (same vector)`);
  assert(results[0].score > results[1].score, "Nearest has higher score");

  // Indexed session files
  const indexed = await store.getIndexedSessionFiles();
  assert(indexed.size === 2, `Indexed files: ${indexed.size}`);
  assert(indexed.has("/test/session1.jsonl"), "Has session1");

  // FTS (create index first)
  await store.createFtsIndex();
  const ftsResults = await store.fullTextSearch("NixOS", 5);
  assert(ftsResults.length >= 1, `FTS "NixOS": ${ftsResults.length} results`);

  // Reset
  await store.reset();
  const afterReset = await store.getCount();
  assert(afterReset === 0, `After reset: ${afterReset}`);

  await store.close();

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// --- Integration Tests (needs API) ---

async function testGeminiEmbeddings() {
  section("Gemini Embeddings (API)");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    skip("GEMINI_API_KEY not set");
    return;
  }

  const { embedQuery, embedDocument, embedDocumentBatch } = await import(
    "./gemini-embeddings.js"
  );
  const config = { apiKey, model: "gemini-embedding-2-preview" };

  try {
    // Single query embed
    const qVec = await embedQuery("NixOS 설정 방법", config);
    assert(qVec.length === 3072, `embedQuery: ${qVec.length} dims`);
    assert(typeof qVec[0] === "number", "embedQuery: values are numbers");

    // Single document embed
    const dVec = await embedDocument("NixOS 설정 가이드 문서", config);
    assert(dVec.length === 3072, `embedDocument: ${dVec.length} dims`);

    // Batch embed
    const batch = await embedDocumentBatch(
      ["첫 번째 문장", "두 번째 문장", "세 번째 문장"],
      config,
    );
    assert(batch.length === 3, `embedBatch: ${batch.length} vectors`);
    assert(batch[0].length === 3072, `embedBatch[0]: ${batch[0].length} dims`);

    // Empty batch
    const empty = await embedDocumentBatch([], config);
    assert(empty.length === 0, "embedBatch empty: 0 vectors");

    // Matryoshka dimensions
    const config768 = { ...config, dimensions: 768 as const };
    const smallVec = await embedQuery("test", config768);
    assert(smallVec.length === 768, `Matryoshka 768: ${smallVec.length} dims`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.includes("spending")) {
      skip(`API rate limited: ${msg.slice(0, 80)}`);
    } else {
      assert(false, `Gemini API error: ${msg.slice(0, 120)}`);
    }
  }
}

async function testLiveSearch() {
  section("Live Search (existing DB)");

  const dbPath = path.join(
    process.env.HOME ?? "",
    ".pi",
    "agent",
    "memory",
    "sessions.lance",
  );
  if (!fs.existsSync(dbPath)) {
    skip("No existing DB at " + dbPath);
    return;
  }

  const store = new VectorStore(dbPath, 3072);
  await store.init();

  const count = await store.getCount();
  assert(count > 0, `Live DB: ${count} chunks`);

  // FTS searches
  for (const q of ["memory", "NixOS", "botlog"]) {
    const results = await store.fullTextSearch(q, 5);
    console.log(`    FTS "${q}": ${results.length} results`);
  }

  // Indexed sessions
  const indexed = await store.getIndexedSessionFiles();
  assert(indexed.size > 0, `Indexed sessions: ${indexed.size}`);

  await store.close();
}

async function testJinaRerank() {
  section("Jina Rerank (API)");

  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) {
    skip("JINA_API_KEY not set — rerank disabled (optional)");
    return;
  }

  const results: SearchResult[] = [
    {
      id: "1",
      text: "NixOS 설정에서 flake.nix를 사용하는 방법",
      sessionFile: "",
      project: "test",
      lineNumber: 1,
      timestamp: "",
      role: "user",
      metadata: {},
      score: 0.5,
    },
    {
      id: "2",
      text: "오늘 점심 뭐 먹을까",
      sessionFile: "",
      project: "test",
      lineNumber: 1,
      timestamp: "",
      role: "user",
      metadata: {},
      score: 0.5,
    },
  ];

  try {
    const reranked = await jinaRerank("NixOS flake 설정", results, apiKey);
    assert(reranked.length > 0, `Rerank: ${reranked.length} results`);
    assert(
      reranked[0].text.includes("NixOS"),
      "Rerank: NixOS 관련이 1위",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    skip(`Jina API error: ${msg.slice(0, 80)}`);
  }
}

async function testSearchQuery(query: string) {
  section(`Live Search: "${query}"`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    skip("GEMINI_API_KEY not set");
    return;
  }

  const dbPath = path.join(
    process.env.HOME ?? "",
    ".pi",
    "agent",
    "memory",
    "sessions.lance",
  );
  if (!fs.existsSync(dbPath)) {
    skip("No existing DB");
    return;
  }

  const { embedQuery } = await import("./gemini-embeddings.js");
  const config = { apiKey, model: "gemini-embedding-2-preview" };
  const store = new VectorStore(dbPath, 3072);
  await store.init();

  try {
    const qVec = await embedQuery(query, config);
    const vecResults = await store.search(qVec, 20, 0.1);
    const ftsResults = await store.fullTextSearch(query, 20);

    const results = await retrieve(query, vecResults, ftsResults, {
      vectorWeight: 0.7,
      bm25Weight: 0.3,
      recencyHalfLifeDays: 14,
      jinaApiKey: process.env.JINA_API_KEY,
    });

    console.log(`  Vector: ${vecResults.length}, FTS: ${ftsResults.length}, Hybrid: ${results.length}`);
    console.log();
    for (const r of results.slice(0, 5)) {
      console.log(`  [${r.project}] ${r.role} (${r.score.toFixed(3)})`);
      console.log(`    ${r.text.slice(0, 120)}`);
      console.log();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.includes("spending")) {
      skip(`API rate limited: ${msg.slice(0, 80)}`);
    } else {
      assert(false, `Search error: ${msg.slice(0, 120)}`);
    }
  }

  await store.close();
}

// --- Main ---

const args = process.argv.slice(2);
const mode = args[0] ?? "all";

console.log("🧠 Semantic Memory Test Suite\n");

if (mode === "unit" || mode === "all") {
  await testSessionIndexer();
  await testRetriever();
  await testVectorStore();
}

if (mode === "integration" || mode === "all") {
  await testGeminiEmbeddings();
  await testJinaRerank();
  await testLiveSearch();
}

if (mode === "search") {
  const query = args.slice(1).join(" ") || "semantic memory extension";
  await testSearchQuery(query);
}

console.log(`\n${"─".repeat(40)}`);
console.log(`✅ ${passed} passed  ❌ ${failed} failed  ⏭  ${skipped} skipped`);

if (failed > 0) process.exit(1);
