/**
 * Hybrid Retriever
 *
 * OpenClaw-aligned pipeline:
 * 1. Weighted sum merge (vector × 0.7 + text × 0.3)
 * 2. Temporal decay (exponential, configurable halfLife)
 * 3. MMR diversity re-ranking (Jaccard-based, optional)
 * 4. Jina Rerank (optional, for when multilingual cross-encoder improves)
 *
 * Benchmark finding: Jina reranker v3 hurts Korean+English mixed docs
 * (MRR 0.754 → 0.642). Disabled by default. MMR used instead for diversity.
 */

import type { SearchResult } from "./store.ts";

export interface RetrieverConfig {
  vectorWeight: number;
  bm25Weight: number;
  recencyHalfLifeDays: number;
  minScore: number;
  mmr: {
    enabled: boolean;
    lambda: number; // 0=max diversity, 1=max relevance
  };
  jinaApiKey?: string;
  jinaModel?: string;
}

const DEFAULT_CONFIG: RetrieverConfig = {
  vectorWeight: 0.7,
  bm25Weight: 0.3,
  recencyHalfLifeDays: 90, // org notes span years
  minScore: 0.05,
  mmr: {
    enabled: true,
    lambda: 0.7, // OpenClaw default
  },
};

// --- Weighted Sum Merge (OpenClaw pattern) ---

export function weightedMerge(
  vectorResults: SearchResult[],
  ftsResults: SearchResult[],
  vectorWeight: number,
  textWeight: number,
): SearchResult[] {
  const byId = new Map<string, { result: SearchResult; vectorScore: number; textScore: number }>();

  for (const r of vectorResults) {
    byId.set(r.id, { result: r, vectorScore: r.score, textScore: 0 });
  }

  for (const r of ftsResults) {
    const existing = byId.get(r.id);
    if (existing) {
      existing.textScore = r.score;
    } else {
      byId.set(r.id, { result: r, vectorScore: 0, textScore: r.score });
    }
  }

  return Array.from(byId.values())
    .map(({ result, vectorScore, textScore }) => ({
      ...result,
      score: vectorWeight * vectorScore + textWeight * textScore,
    }))
    .sort((a, b) => b.score - a.score);
}

// --- RRF (kept for session search where it works well) ---

export function rrfFusion(
  vectorResults: SearchResult[],
  ftsResults: SearchResult[],
  vectorWeight: number,
  bm25Weight: number,
  k: number = 60,
): SearchResult[] {
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  vectorResults.forEach((r, rank) => {
    const s = vectorWeight / (k + rank + 1);
    const e = scoreMap.get(r.id);
    if (e) e.score += s;
    else scoreMap.set(r.id, { result: r, score: s });
  });

  ftsResults.forEach((r, rank) => {
    const s = bm25Weight / (k + rank + 1);
    const e = scoreMap.get(r.id);
    if (e) e.score += s;
    else scoreMap.set(r.id, { result: r, score: s });
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ result, score }) => ({ ...result, score }));
}

// --- Temporal Decay (OpenClaw pattern) ---

export function applyRecencyDecay(
  results: SearchResult[],
  halfLifeDays: number,
): SearchResult[] {
  if (halfLifeDays <= 0) return results;
  const now = Date.now();
  const lambda = Math.LN2 / halfLifeDays;

  return results.map((r) => {
    if (!r.timestamp) return r;
    const ts = new Date(r.timestamp).getTime();
    if (isNaN(ts)) return r;
    const ageInDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
    return { ...r, score: r.score * Math.exp(-lambda * ageInDays) };
  });
}

// --- MMR Diversity Re-ranking (OpenClaw pattern) ---

function tokenize(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const t of smaller) {
    if (larger.has(t)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

export function mmrRerank(
  results: SearchResult[],
  lambda: number = 0.7,
): SearchResult[] {
  if (results.length <= 1) return [...results];

  const tokenCache = new Map<string, Set<string>>();
  for (const r of results) {
    tokenCache.set(r.id, tokenize(r.text));
  }

  // Normalize scores
  const maxScore = Math.max(...results.map((r) => r.score));
  const minScore = Math.min(...results.map((r) => r.score));
  const range = maxScore - minScore;
  const norm = (s: number) => (range === 0 ? 1 : (s - minScore) / range);

  const selected: SearchResult[] = [];
  const remaining = new Set(results);

  while (remaining.size > 0) {
    let bestItem: SearchResult | null = null;
    let bestMMR = -Infinity;

    for (const candidate of remaining) {
      const relevance = norm(candidate.score);

      // Max similarity to already selected
      let maxSim = 0;
      const candTokens = tokenCache.get(candidate.id)!;
      for (const sel of selected) {
        const sim = jaccardSimilarity(candTokens, tokenCache.get(sel.id)!);
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestMMR || (mmrScore === bestMMR && candidate.score > (bestItem?.score ?? -Infinity))) {
        bestMMR = mmrScore;
        bestItem = candidate;
      }
    }

    if (bestItem) {
      selected.push(bestItem);
      remaining.delete(bestItem);
    } else break;
  }

  return selected;
}

// --- Jina Rerank (optional — currently hurts Korean+English) ---

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

// --- Full Pipeline ---

export type MergeStrategy = "weighted" | "rrf";

export async function retrieve(
  query: string,
  vectorResults: SearchResult[],
  ftsResults: SearchResult[],
  config: Partial<RetrieverConfig> & { mergeStrategy?: MergeStrategy } = {},
): Promise<SearchResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const strategy = config.mergeStrategy ?? "weighted";

  // 1. Merge
  let results =
    strategy === "rrf"
      ? rrfFusion(vectorResults, ftsResults, cfg.vectorWeight, cfg.bm25Weight)
      : weightedMerge(vectorResults, ftsResults, cfg.vectorWeight, cfg.bm25Weight);

  // 2. Temporal decay
  results = applyRecencyDecay(results, cfg.recencyHalfLifeDays);
  results.sort((a, b) => b.score - a.score);

  // 3. Min score filter
  results = results.filter((r) => r.score >= cfg.minScore);

  // 4. MMR diversity (default on)
  if (cfg.mmr?.enabled && results.length > 1) {
    results = mmrRerank(results, cfg.mmr.lambda);
  }

  // 5. Optional Jina rerank (off by default for org, on for sessions)
  if (cfg.jinaApiKey && results.length > 0) {
    results = await jinaRerank(query, results, cfg.jinaApiKey, cfg.jinaModel, 10);
  }

  return results;
}
