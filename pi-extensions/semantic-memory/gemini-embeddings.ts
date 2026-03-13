/**
 * Gemini Embedding 2 — Native API client
 *
 * Ported from OpenClaw embeddings-gemini.ts pattern.
 * Uses native Google AI API (not openai-compatible) for:
 * - taskType: RETRIEVAL_QUERY vs RETRIEVAL_DOCUMENT
 * - outputDimensionality: Matryoshka 768/1536/3072
 * - batchEmbedContents: native batch API
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-embedding-2-preview";
const VALID_DIMENSIONS = [768, 1536, 3072] as const;
const MAX_BATCH_SIZE = 100; // Gemini batch limit

export type TaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

export interface GeminiEmbeddingConfig {
  apiKey: string;
  model?: string;
  dimensions?: (typeof VALID_DIMENSIONS)[number];
}

export interface EmbeddingResult {
  values: number[];
}

/**
 * Embed a single text for query (search time)
 */
export async function embedQuery(
  text: string,
  config: GeminiEmbeddingConfig,
): Promise<number[]> {
  return embedSingle(text, "RETRIEVAL_QUERY", config);
}

/**
 * Embed a single text for document (index time)
 */
export async function embedDocument(
  text: string,
  config: GeminiEmbeddingConfig,
): Promise<number[]> {
  return embedSingle(text, "RETRIEVAL_DOCUMENT", config);
}

/**
 * Embed multiple texts for documents (index time, batch)
 */
export async function embedDocumentBatch(
  texts: string[],
  config: GeminiEmbeddingConfig,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await embedDocument(texts[0], config)];

  const model = config.model ?? DEFAULT_MODEL;
  const results: number[][] = [];

  // Process in batches of MAX_BATCH_SIZE
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const url = `${GEMINI_BASE_URL}/models/${model}:batchEmbedContents`;

    const body: Record<string, unknown> = {
      requests: batch.map((text) => {
        const req: Record<string, unknown> = {
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
        };
        if (config.dimensions) {
          req.outputDimensionality = config.dimensions;
        }
        return req;
      }),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini batch embed failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { embeddings: EmbeddingResult[] };
    results.push(...data.embeddings.map((e) => e.values));
  }

  return results;
}

async function embedSingle(
  text: string,
  taskType: TaskType,
  config: GeminiEmbeddingConfig,
): Promise<number[]> {
  const model = config.model ?? DEFAULT_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${model}:embedContent`;

  const body: Record<string, unknown> = {
    content: { parts: [{ text }] },
    taskType,
  };
  if (config.dimensions) {
    body.outputDimensionality = config.dimensions;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embed failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { embedding: EmbeddingResult };
  return data.embedding.values;
}
