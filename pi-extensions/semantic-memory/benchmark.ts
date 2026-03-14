#!/usr/bin/env tsx
/**
 * Org RAG Benchmark — Cross-lingual search quality evaluation
 *
 * Measures: Recall@K, MRR@K, cross-lingual hit rate
 *
 * Usage:
 *   cd pi-extensions/semantic-memory && source ~/.env.local
 *   npm run bench              # full benchmark (needs API + indexed org DB)
 *   npm run bench:dry          # dry run — show queries and expected, no API
 *
 * Design principles:
 * - Queries from real user scenarios (Korean/English/mixed)
 * - Expected results hand-curated from actual org notes
 * - Tests the "3-layer gap": what embedding finds vs what dblock/dictcli would find
 */

import * as fs from "node:fs";
import * as path from "node:path";

// --- Benchmark Queries ---
// Each query has:
//   q: natural language query (as a user would ask)
//   lang: "ko" | "en" | "mixed"
//   expected: array of Denote identifiers that SHOULD be found
//   category: what aspect this tests

interface BenchQuery {
  q: string;
  lang: "ko" | "en" | "mixed";
  expected: string[]; // Denote identifiers (YYYYMMDDTHHMMSS)
  category: string;
  notes?: string;
}

export const BENCH_QUERIES: BenchQuery[] = [
  // --- Cross-lingual (the core challenge) ---
  {
    q: "보편 학문에 대한 문서",
    lang: "ko",
    expected: [
      "20250516T090655", // @모티머애들러 파이데이아 관점 보편학 이해 (tags: paideia, universalism)
      "20250424T233558", // † 보편 특수 범용 특이 (meta note)
      "20241222T114848", // 지식의 커리큘럼 보편학 체계이론
    ],
    category: "cross-lingual",
    notes: "힣봇이 denotecli로 못 찾은 사례. 한글 '보편' → 영어 태그 'universalism'",
  },
  {
    q: "universalism education paideia",
    lang: "en",
    expected: [
      "20250516T090655", // 보편학 이해
      "20260301T091700", // 힣의 교육 지도 파이데이아에서 마인드스톰까지
    ],
    category: "cross-lingual",
    notes: "영어 쿼리 → 한글 타이틀 노트",
  },
  {
    q: "데이터로그 쿼리 언어",
    lang: "ko",
    expected: [
      "20220328T092700", // † 데이터로그 (meta)
    ],
    category: "cross-lingual",
    notes: "한글 타이틀 + 영어 태그 datalog",
  },

  // --- Korean concept search ---
  {
    q: "바흐 오르간 체화인지 몰입",
    lang: "ko",
    expected: [
      "20260305T090900", // 바흐의 오르간 기예와 푸가
    ],
    category: "korean-concept",
  },
  {
    q: "폴리매스 박학다식 만물박사",
    lang: "ko",
    expected: [
      "20240105T171414", // † 폴리매스 박식가 (meta)
    ],
    category: "korean-concept",
  },

  // --- Tag-based (tags should boost relevance) ---
  {
    q: "clojure emacs 개발환경",
    lang: "mixed",
    expected: [
      "20220712T090000", // @practicalli 이맥스 클로저 (bib)
    ],
    category: "tag-boost",
  },
  {
    q: "지식그래프 온톨로지",
    lang: "ko",
    expected: [
      "20220328T092700", // † 데이터로그 (meta, linked to knowledge graph)
    ],
    category: "tag-boost",
    notes: "dblock 2층이 해결하는 영역 — 임베딩만으로 충분한지 테스트",
  },

  // --- Dialectical pairs (대극) ---
  {
    q: "보편과 특수의 관계",
    lang: "ko",
    expected: [
      "20250424T233558", // † 보편 특수 범용 특이
      "20250516T090655", // 보편학 이해
    ],
    category: "dialectical",
    notes: "대극 쌍이 한 메타노트에 묶인 패턴. 3층 dictcli 영역",
  },

  // --- Heading-level precision ---
  {
    q: "Denote 파일명 규칙 네이밍",
    lang: "mixed",
    expected: [
      "20211117T190700", // notes 중 Denote 관련 (있으면)
    ],
    category: "heading-precision",
    notes: "2-tier: heading 검색이 content보다 빠르고 정확한지",
  },

  // --- Folder awareness ---
  {
    q: "에이전트 메모리 시스템 진화",
    lang: "ko",
    expected: [
      "20260312T103400", // 에이전트 메모리 진화사 (botlog)
    ],
    category: "folder-awareness",
    notes: "botlog 문서. folder 메타데이터가 검색에 영향주는지",
  },

  // --- GPTEL session notes ---
  {
    q: "grok xAI 모티머 애들러 프로피디아",
    lang: "mixed",
    expected: [
      "20250516T090655", // GPTEL_MODEL: grok-3, GPTEL_BACKEND: xAI
    ],
    category: "gptel-context",
    notes: "GPTEL property가 있는 문서. hasGptelProps 메타데이터 활용",
  },
];

// --- Evaluation Metrics ---

function recall_at_k(retrieved: string[], expected: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = expected.filter((e) => topK.some((r) => r.includes(e)));
  return expected.length > 0 ? hits.length / expected.length : 0;
}

function mrr(retrieved: string[], expected: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.some((e) => retrieved[i].includes(e))) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

// --- Dry Run ---

async function dryRun() {
  console.log("🧪 Org RAG Benchmark — Dry Run\n");
  console.log(`${BENCH_QUERIES.length} queries across ${new Set(BENCH_QUERIES.map((q) => q.category)).size} categories\n`);

  const categories = new Map<string, BenchQuery[]>();
  for (const q of BENCH_QUERIES) {
    if (!categories.has(q.category)) categories.set(q.category, []);
    categories.get(q.category)!.push(q);
  }

  for (const [cat, queries] of categories) {
    console.log(`=== ${cat} (${queries.length}) ===`);
    for (const q of queries) {
      console.log(`  [${q.lang}] "${q.q}"`);
      console.log(`    → expects: ${q.expected.join(", ")}`);
      if (q.notes) console.log(`    💡 ${q.notes}`);
    }
    console.log();
  }

  console.log("Run with 'npm run bench' for full evaluation (needs API + indexed DB).");
}

// --- Full Benchmark ---

async function fullBenchmark() {
  console.log("🧪 Org RAG Benchmark — Full Evaluation\n");

  const { embedQuery } = await import("./gemini-embeddings.ts");
  const { VectorStore } = await import("./store.ts");
  const { retrieve } = await import("./retriever.ts");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }

  const config = { apiKey, model: "gemini-embedding-2-preview", dimensions: 768 as const };

  // TODO: Use org-specific LanceDB table (org_chunks) when implemented
  // For now, this is a placeholder structure
  const dbPath = path.join(process.env.HOME ?? "", ".pi", "agent", "memory", "org.lance");
  if (!fs.existsSync(dbPath)) {
    console.log("⚠ Org index not found at", dbPath);
    console.log("  Index org files first, then run benchmark.");
    console.log("  Falling back to dry run.\n");
    await dryRun();
    return;
  }

  const store = new VectorStore(dbPath, 768);
  await store.init();

  const results: Array<{
    query: BenchQuery;
    retrieved: string[];
    recall5: number;
    recall10: number;
    mrrScore: number;
    hit: boolean;
  }> = [];

  for (const q of BENCH_QUERIES) {
    try {
      const qVec = await embedQuery(q.q, config);
      const vecResults = await store.search(qVec, 20, 0.05);
      const ftsResults = await store.fullTextSearch(q.q, 20);

      const hybrid = await retrieve(q.q, vecResults, ftsResults, {
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        recencyHalfLifeDays: 90, // org notes are older, wider window
        jinaApiKey: process.env.JINA_API_KEY,
      });

      const retrieved = hybrid.map((r) => r.sessionFile); // filePath for org

      const r5 = recall_at_k(retrieved, q.expected, 5);
      const r10 = recall_at_k(retrieved, q.expected, 10);
      const m = mrr(retrieved, q.expected);
      const hit = q.expected.some((e) => retrieved.some((r) => r.includes(e)));

      results.push({ query: q, retrieved, recall5: r5, recall10: r10, mrrScore: m, hit });

      const icon = hit ? "✅" : "❌";
      console.log(`${icon} [${q.lang}] "${q.q}" — R@5:${r5.toFixed(2)} R@10:${r10.toFixed(2)} MRR:${m.toFixed(2)}`);
      if (!hit) {
        console.log(`   Expected: ${q.expected.join(", ")}`);
        console.log(`   Got top3: ${retrieved.slice(0, 3).map((r) => path.basename(r).slice(0, 50)).join(" | ")}`);
      }
    } catch (err) {
      console.log(`⚠ "${q.q}" — error: ${(err as Error).message?.slice(0, 80)}`);
    }
  }

  await store.close();

  // --- Summary ---
  console.log("\n" + "─".repeat(50));
  console.log("Summary\n");

  const byCategory = new Map<string, typeof results>();
  for (const r of results) {
    const cat = r.query.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(r);
  }

  for (const [cat, rs] of byCategory) {
    const avgR5 = rs.reduce((s, r) => s + r.recall5, 0) / rs.length;
    const avgR10 = rs.reduce((s, r) => s + r.recall10, 0) / rs.length;
    const avgMRR = rs.reduce((s, r) => s + r.mrrScore, 0) / rs.length;
    const hitRate = rs.filter((r) => r.hit).length / rs.length;
    console.log(`  ${cat}: R@5=${avgR5.toFixed(2)} R@10=${avgR10.toFixed(2)} MRR=${avgMRR.toFixed(2)} Hit=${(hitRate * 100).toFixed(0)}%`);
  }

  const avgR5 = results.reduce((s, r) => s + r.recall5, 0) / results.length;
  const avgR10 = results.reduce((s, r) => s + r.recall10, 0) / results.length;
  const avgMRR = results.reduce((s, r) => s + r.mrrScore, 0) / results.length;
  const totalHit = results.filter((r) => r.hit).length;

  console.log(`\n  TOTAL: R@5=${avgR5.toFixed(2)} R@10=${avgR10.toFixed(2)} MRR=${avgMRR.toFixed(2)} Hit=${totalHit}/${results.length}`);
}

// --- Main ---

const args = process.argv.slice(2);
if (args.includes("dry") || args.includes("--dry")) {
  await dryRun();
} else {
  await fullBenchmark();
}
