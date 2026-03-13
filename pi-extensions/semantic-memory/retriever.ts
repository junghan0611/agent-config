/**
 * Hybrid Retriever
 *
 * Combines vector search + full-text search with:
 * - RRF (Reciprocal Rank Fusion) for merging
 * - Recency decay (newer sessions score higher)
 * - Jina Rerank (optional, cross-encoder)
 *
 * Design references:
 * - memory-lancedb-pro retriever.ts (RRF, decay)
 * - OpenClaw memory search (hybrid mode)
 */

import type { SearchResult } from "./store.js";

export interface RetrieverConfig {
  vectorWeight: number; // default 0.7
  bm25Weight: number; // default 0.3
  recencyHalfLifeDays: number; // default 14
  jinaApiKey?: string;
  jinaModel?: string; // default jina-reranker-v3
}

const DEFAULT_CONFIG: RetrieverConfig = {
  vectorWeight: 0.7,
  bm25Weight: 0.3,
  recencyHalfLifeDays: 14,
};

/**
 * RRF (Reciprocal Rank Fusion) merge of two result sets
 * k=60 is standard
 */
export function rrfFusion(
  vectorResults: SearchResult[],
  ftsResults: SearchResult[],
  vectorWeight: number,
  bm25Weight: number,
  k: number = 60,
): SearchResult[] {
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  // Vector scores
  vectorResults.forEach((r, rank) => {
    const rrfScore = vectorWeight / (k + rank + 1);
    const existing = scoreMap.get(r.id);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(r.id, { result: r, score: rrfScore });
    }
  });

  // FTS scores
  ftsResults.forEach((r, rank) => {
    const rrfScore = bm25Weight / (k + rank + 1);
    const existing = scoreMap.get(r.id);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(r.id, { result: r, score: rrfScore });
    }
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ result, score }) => ({ ...result, score }));
}

/**
 * Apply exponential recency decay
 * Score multiplier: 2^(-daysSince / halfLifeDays)
 */
export function applyRecencyDecay(
  results: SearchResult[],
  halfLifeDays: number,
): SearchResult[] {
  const now = Date.now();

  return results.map((r) => {
    if (!r.timestamp) return r;

    const ts = new Date(r.timestamp).getTime();
    if (isNaN(ts)) return r;

    const daysSince = (now - ts) / (1000 * 60 * 60 * 24);
    const decayMultiplier = Math.pow(2, -daysSince / halfLifeDays);

    return { ...r, score: r.score * decayMultiplier };
  });
}

/**
 * Jina Rerank — cross-encoder reranking
 * Free tier: 1M tokens/month
 */
export async function jinaRerank(
  query: string,
  results: SearchResult[],
  apiKey: string,
  model: string = "jina-reranker-v3",
  topN: number = 10,
): Promise<SearchResult[]> {
  if (results.length === 0) return [];

  const res = await fetch("https://api.jina.ai/v1/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      query,
      documents: results.map((r) => r.text),
      top_n: topN,
    }),
  });

  if (!res.ok) {
    // Fallback to original order on rerank failure
    console.error(`Jina rerank failed (${res.status}): ${await res.text()}`);
    return results.slice(0, topN);
  }

  const data = (await res.json()) as {
    results: Array<{ index: number; relevance_score: number }>;
  };

  return data.results.map((r) => ({
    ...results[r.index],
    score: r.relevance_score,
  }));
}

/**
 * Full retrieval pipeline
 */
export async function retrieve(
  query: string,
  vectorResults: SearchResult[],
  ftsResults: SearchResult[],
  config: Partial<RetrieverConfig> = {},
): Promise<SearchResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. RRF fusion
  let results = rrfFusion(
    vectorResults,
    ftsResults,
    cfg.vectorWeight,
    cfg.bm25Weight,
  );

  // 2. Recency decay
  results = applyRecencyDecay(results, cfg.recencyHalfLifeDays);

  // 3. Re-sort after decay
  results.sort((a, b) => b.score - a.score);

  // 4. Optional Jina rerank
  if (cfg.jinaApiKey && results.length > 0) {
    results = await jinaRerank(
      query,
      results,
      cfg.jinaApiKey,
      cfg.jinaModel,
      10,
    );
  }

  return results;
}
