#!/usr/bin/env tsx
/**
 * Org RAG Benchmark — Cross-lingual search quality evaluation
 *
 * Measures: Recall@K, MRR@K, cross-lingual hit rate, rerank impact
 *
 * Usage:
 *   cd pi-extensions/semantic-memory && source ~/.env.local
 *   npm run bench              # full benchmark (needs API + indexed org DB)
 *   npm run bench:dry          # dry run — show queries and expected, no API
 *
 * Results are appended to benchmark-log.jsonl for tracking improvement over time.
 *
 * Design principles:
 * - Queries from real user scenarios (Korean/English/mixed)
 * - Expected results hand-curated from actual org notes
 * - Tests the "3-layer gap": what embedding finds vs what dblock/dictcli would find
 * - Each query runs with AND without Jina rerank for A/B comparison
 */

import * as fs from "node:fs";
import * as path from "node:path";

// --- Benchmark Queries ---

interface BenchQuery {
  q: string;
  lang: "ko" | "en" | "mixed";
  expected: string[]; // Denote identifiers (YYYYMMDDTHHMMSS)
  category: string;
  difficulty: "easy" | "medium" | "hard"; // expected difficulty for embedding
  notes?: string;
}

export const BENCH_QUERIES: BenchQuery[] = [
  // ============================
  // Cross-lingual (1층 핵심 도전)
  // ============================
  {
    q: "보편 학문에 대한 문서",
    lang: "ko",
    expected: [
      "20250516T090655", // @모티머애들러 파이데이아 관점 보편학 이해
      "20250424T233558", // † 보편 특수 범용 특이 (meta)
      "20241222T114848", // 지식의 커리큘럼 보편학 체계이론
    ],
    category: "cross-lingual",
    difficulty: "medium",
    notes: "힣봇이 denotecli로 못 찾은 실제 사례. 한글 '보편' → 영어 태그 'universalism'",
  },
  {
    q: "universalism education paideia",
    lang: "en",
    expected: [
      "20250516T090655", // 보편학 이해
      "20260301T091700", // 힣의 교육 지도 파이데이아에서 마인드스톰까지
    ],
    category: "cross-lingual",
    difficulty: "medium",
    notes: "영어 쿼리 → 한글 타이틀 노트",
  },
  {
    q: "데이터로그 쿼리 언어",
    lang: "ko",
    expected: ["20250415T165756", "20220328T092700"], // bib/데이터로그-클로저 or meta/데이터로그
    category: "cross-lingual",
    difficulty: "easy",
    notes: "한글 타이틀 + 영어 태그 datalog. bib와 meta 둘 다 유효",
  },
  {
    q: "knowledge graph ontology",
    lang: "en",
    expected: ["20240531T202141"], // † 지식그래프 (meta)
    category: "cross-lingual",
    difficulty: "medium",
    notes: "영어 개념 → 한글 메타노트",
  },

  // ============================
  // 형태소 변형 (universal/universalism/universalist)
  // ============================
  {
    q: "universal computer Turing",
    lang: "en",
    expected: ["20240305T064203"], // @마틴데이비스 유니버셜 컴퓨터
    category: "morphological",
    difficulty: "medium",
    notes: "universal vs 유니버셜 — 형태소 변형 + 음차",
  },
  {
    q: "범용 도구 언어서버",
    lang: "ko",
    expected: ["20241203T135848"], // bib/ 범용: 언어서버 린터 efm-langserver
    category: "morphological",
    difficulty: "easy",
    notes: "'범용'과 '보편'은 같은 meta note에 묶이지만 용례 다름",
  },

  // ============================
  // 대극 쌍 (dialectical pairs — 3층 dictcli 영역)
  // ============================
  {
    q: "보편과 특수의 관계",
    lang: "ko",
    expected: [
      "20250424T233558", // † 보편 특수 범용 특이 (meta, 대극 쌍)
      "20250516T090655", // 보편학 이해
    ],
    category: "dialectical",
    difficulty: "medium",
    notes: "대극 쌍이 한 메타노트에 묶인 패턴",
  },
  {
    q: "particular vs universal philosophy",
    lang: "en",
    expected: ["20250424T233558"], // 보편 특수 범용 특이
    category: "dialectical",
    difficulty: "hard",
    notes: "영어 철학 개념 → 한글 meta note. 임베딩만으로 찾기 어려울 수 있음",
  },

  // ============================
  // 한글 개념 검색
  // ============================
  {
    q: "바흐 오르간 체화인지 몰입",
    lang: "ko",
    expected: ["20260305T090900"], // 바흐의 오르간 기예와 푸가
    category: "korean-concept",
    difficulty: "easy",
  },
  {
    q: "폴리매스 박학다식 만물박사",
    lang: "ko",
    expected: ["20240105T171414"], // † 폴리매스 박식가 (meta)
    category: "korean-concept",
    difficulty: "easy",
  },
  {
    q: "양자역학 창발 우주 생명 의미",
    lang: "ko",
    expected: ["20240809T162609"], // @박권 양자역학 창발 우주
    category: "korean-concept",
    difficulty: "easy",
  },

  // ============================
  // 태그 부스트 (tags should boost relevance)
  // ============================
  {
    q: "clojure emacs 개발환경",
    lang: "mixed",
    expected: ["20250322T161007", "20240117T121614", "20220712T090000"], // cider, 이맥스IDE, practicalli
    category: "tag-boost",
    difficulty: "easy",
    notes: "clojure+emacs 관련 bib 노트 여러 개가 유효",
  },
  {
    q: "에이전트 메모리 시스템 진화",
    lang: "ko",
    expected: ["20260312T103400"], // 에이전트 메모리 진화사 (botlog)
    category: "tag-boost",
    difficulty: "easy",
  },

  // ============================
  // 간접 연결 (dblock 2층이 강한 영역, 임베딩 한계 테스트)
  // ============================
  {
    q: "신토피콘 Great Ideas 애들러",
    lang: "mixed",
    expected: ["20250421T125513"], // † syntopicon 신토피콘
    category: "indirect",
    difficulty: "easy",
  },
  {
    q: "일반체계이론 시스템",
    lang: "ko",
    expected: [
      "20241222T114446", // @베르탈란피 일반체계이론 보편학
      "20240527T150651", // † 시스템 (meta)
    ],
    category: "indirect",
    difficulty: "medium",
    notes: "보편학 meta note의 dblock에 연결된 노트. 임베딩만으로 찾는지?",
  },

  // ============================
  // 모호한 짧은 쿼리 (hardest — vague, short)
  // ============================
  {
    q: "특이점",
    lang: "ko",
    expected: [
      "20250605T094856", // @레이커즈와일 특이점
      "20250424T233558", // † 보편 특수 범용 특이 (meta)
    ],
    category: "vague-short",
    difficulty: "hard",
    notes: "2글자 쿼리. '특이점(singularity)' vs '특이(singular)' 구분 필요",
  },
  {
    q: "깨달음",
    lang: "ko",
    expected: ["20250314T144713", "20260307T165907"], // meta/꽝-하산하라-깨달음 or botlog/디팩초프라
    category: "vague-short",
    difficulty: "hard",
    notes: "1단어 모호한 쿼리. meta가 더 직접적, botlog도 유효",
  },

  // ============================
  // GPTEL 세션 문서
  // ============================
  {
    q: "grok xAI 모티머 애들러 프로피디아",
    lang: "mixed",
    expected: ["20250516T090655"], // GPTEL_MODEL: grok-3
    category: "gptel-context",
    difficulty: "medium",
    notes: "GPTEL property가 있는 문서. 모델명으로 찾을 수 있는지",
  },

  // ============================
  // 헤딩 정밀도 (2-tier heading vs content)
  // ============================
  {
    q: "Denote 파일명 네이밍 규칙",
    lang: "mixed",
    expected: ["20231114T105616", "20241020T172137", "20211117T190700"], // denote매뉴얼, meta/작명-네이밍, 이맥스팁
    category: "heading-precision",
    difficulty: "medium",
    notes: "denote 매뉴얼과 네이밍 meta 노트가 더 직접적",
  },
];

// --- Evaluation Metrics ---

function recall_at_k(retrieved: string[], expected: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = expected.filter((e) => topK.some((r) => r.includes(e)));
  return expected.length > 0 ? hits.length / expected.length : 0;
}

function mrr_score(retrieved: string[], expected: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.some((e) => retrieved[i].includes(e))) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

// --- Result logging ---

interface BenchResult {
  timestamp: string;
  query: string;
  category: string;
  difficulty: string;
  lang: string;
  recall5: number;
  recall10: number;
  mrr: number;
  hit: boolean;
  rerank: boolean; // with or without Jina
  topResults: string[]; // top 3 file basenames
  notes?: string;
}

function appendLog(results: BenchResult[], logPath: string) {
  const lines = results.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.appendFileSync(logPath, lines);
}

// --- Dry Run ---

async function dryRun() {
  console.log("🧪 Org RAG Benchmark — Dry Run\n");
  console.log(
    `${BENCH_QUERIES.length} queries across ${new Set(BENCH_QUERIES.map((q) => q.category)).size} categories\n`,
  );

  const categories = new Map<string, BenchQuery[]>();
  for (const q of BENCH_QUERIES) {
    if (!categories.has(q.category)) categories.set(q.category, []);
    categories.get(q.category)!.push(q);
  }

  const diffCount = { easy: 0, medium: 0, hard: 0 };
  for (const q of BENCH_QUERIES) diffCount[q.difficulty]++;

  console.log(`Difficulty: easy=${diffCount.easy} medium=${diffCount.medium} hard=${diffCount.hard}\n`);

  for (const [cat, queries] of categories) {
    console.log(`=== ${cat} (${queries.length}) ===`);
    for (const q of queries) {
      const diff = { easy: "🟢", medium: "🟡", hard: "🔴" }[q.difficulty];
      console.log(`  ${diff} [${q.lang}] "${q.q}"`);
      console.log(`    → expects: ${q.expected.join(", ")}`);
      if (q.notes) console.log(`    💡 ${q.notes}`);
    }
    console.log();
  }

  console.log("Run with 'npm run bench' for full evaluation (needs API + indexed DB).");
}

// --- Full Benchmark ---

async function runSearch(
  query: string,
  store: any,
  embedQuery: any,
  retrieve: any,
  config: any,
  useMMR: boolean,
): Promise<string[]> {
  const qVec = await embedQuery(query, config);
  const vecResults = await store.search(qVec, 20, 0.05);
  const ftsResults = await store.fullTextSearch(query, 20);

  const hybrid = await retrieve(query, vecResults, ftsResults, {
    vectorWeight: 0.7,
    bm25Weight: 0.3,
    recencyHalfLifeDays: 90,
    minScore: 0.05,
    mmr: { enabled: useMMR, lambda: 0.7 },
    mergeStrategy: "weighted" as const,
    // Jina disabled — hurts Korean+English mixed docs
  });

  return hybrid.map((r: any) => r.sessionFile ?? r.id ?? "");
}

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
  const dbPath = path.join(process.env.HOME ?? "", ".pi", "agent", "memory", "org.lance");

  if (!fs.existsSync(dbPath)) {
    console.log("⚠ Org index not found at", dbPath);
    console.log("  Run: ./run.sh index:org");
    await dryRun();
    return;
  }

  const store = new VectorStore(dbPath, 768);
  await store.init();

  const count = await store.getCount();
  console.log(`Index: ${count} chunks\n`);

  const _hasJina = Boolean(process.env.JINA_API_KEY); // reserved for future multilingual reranker
  const timestamp = new Date().toISOString();
  const allResults: BenchResult[] = [];

  // --- Run each query with and without rerank ---

  for (const q of BENCH_QUERIES) {
    const diff = { easy: "🟢", medium: "🟡", hard: "🔴" }[q.difficulty];

    // A/B: without MMR vs with MMR (Jina disabled — hurts Korean)
  for (const useMMR of [false, true]) {
      try {
        const retrieved = await runSearch(q.q, store, embedQuery, retrieve, config, useMMR);

        const r5 = recall_at_k(retrieved, q.expected, 5);
        const r10 = recall_at_k(retrieved, q.expected, 10);
        const m = mrr_score(retrieved, q.expected);
        const hit = q.expected.some((e) => retrieved.some((r) => r.includes(e)));
        const top3 = retrieved.slice(0, 3).map((r) => path.basename(r).slice(0, 60));

        const result: BenchResult = {
          timestamp,
          query: q.q,
          category: q.category,
          difficulty: q.difficulty,
          lang: q.lang,
          recall5: r5,
          recall10: r10,
          mrr: m,
          hit,
          rerank: useMMR, // repurposed: false=no MMR, true=with MMR
          topResults: top3,
          notes: q.notes,
        };
        allResults.push(result);

        const icon = hit ? "✅" : "❌";
        const rr = useMMR ? " [MMR]" : "";
        console.log(
          `${icon} ${diff} [${q.lang}]${rr} "${q.q}" — R@5:${r5.toFixed(2)} R@10:${r10.toFixed(2)} MRR:${m.toFixed(2)}`,
        );
        if (!hit) {
          console.log(`   Expected: ${q.expected.join(", ")}`);
          console.log(`   Got: ${top3.join(" | ")}`);
        }
      } catch (err) {
        console.log(`⚠ "${q.q}" — error: ${(err as Error).message?.slice(0, 80)}`);
      }
    }
  }

  await store.close();

  // --- Log results ---

  const logPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "benchmark-log.jsonl",
  );
  appendLog(allResults, logPath);
  console.log(`\n📝 Results appended to ${path.basename(logPath)}`);

  // --- Summary ---

  console.log("\n" + "─".repeat(60));
  printSummary(allResults, true);
}

function printSummary(allResults: BenchResult[], hasJina: boolean) {
  const noRerank = allResults.filter((r) => !r.rerank);  // no MMR
  const withRerank = allResults.filter((r) => r.rerank); // with MMR

  const summarize = (rs: BenchResult[], label: string) => {
    if (rs.length === 0) return;
    const avgR5 = rs.reduce((s, r) => s + r.recall5, 0) / rs.length;
    const avgR10 = rs.reduce((s, r) => s + r.recall10, 0) / rs.length;
    const avgMRR = rs.reduce((s, r) => s + r.mrr, 0) / rs.length;
    const hitRate = rs.filter((r) => r.hit).length / rs.length;

    console.log(`\n${label}: R@5=${avgR5.toFixed(3)} R@10=${avgR10.toFixed(3)} MRR=${avgMRR.toFixed(3)} Hit=${(hitRate * 100).toFixed(0)}% (${rs.filter((r) => r.hit).length}/${rs.length})`);

    // By category
    const cats = new Map<string, BenchResult[]>();
    for (const r of rs) {
      if (!cats.has(r.category)) cats.set(r.category, []);
      cats.get(r.category)!.push(r);
    }
    for (const [cat, crs] of [...cats].sort((a, b) => a[0].localeCompare(b[0]))) {
      const cr5 = crs.reduce((s, r) => s + r.recall5, 0) / crs.length;
      const cmrr = crs.reduce((s, r) => s + r.mrr, 0) / crs.length;
      const chit = crs.filter((r) => r.hit).length;
      console.log(`  ${cat.padEnd(20)} R@5=${cr5.toFixed(2)} MRR=${cmrr.toFixed(2)} Hit=${chit}/${crs.length}`);
    }

    // By difficulty
    for (const diff of ["easy", "medium", "hard"] as const) {
      const drs = rs.filter((r) => r.difficulty === diff);
      if (drs.length === 0) continue;
      const dHit = drs.filter((r) => r.hit).length;
      const dMRR = drs.reduce((s, r) => s + r.mrr, 0) / drs.length;
      const icon = { easy: "🟢", medium: "🟡", hard: "🔴" }[diff];
      console.log(`  ${icon} ${diff.padEnd(8)} MRR=${dMRR.toFixed(2)} Hit=${dHit}/${drs.length}`);
    }
  };

  summarize(noRerank, "📊 Without MMR");

  if (withRerank.length > 0) {
    summarize(withRerank, "📊 With MMR (λ=0.7)");

    // Delta comparison
    console.log("\n📈 MMR Impact:");
    for (const q of BENCH_QUERIES) {
      const nr = noRerank.find((r) => r.query === q.q);
      const wr = withRerank.find((r) => r.query === q.q);
      if (nr && wr && nr.mrr !== wr.mrr) {
        const delta = wr.mrr - nr.mrr;
        const icon = delta > 0 ? "↑" : "↓";
        console.log(`  ${icon} "${q.q.slice(0, 30)}" MRR: ${nr.mrr.toFixed(2)} → ${wr.mrr.toFixed(2)} (${delta > 0 ? "+" : ""}${delta.toFixed(2)})`);
      }
    }
  }
}

// --- Main ---

const args = process.argv.slice(2);
if (args.includes("dry") || args.includes("--dry")) {
  await dryRun();
} else {
  await fullBenchmark();
}
