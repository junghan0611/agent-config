/**
 * LanceDB Vector Store
 *
 * Wraps LanceDB for session chunk storage and retrieval.
 * Schema: id, text, vector, sessionFile, project, lineNumber, timestamp, role, metadata
 */

import * as lancedb from "@lancedb/lancedb";
import * as path from "node:path";
import * as fs from "node:fs";

export interface StoredChunk {
  id: string;
  text: string;
  vector: number[];
  sessionFile: string;
  project: string;
  lineNumber: number;
  timestamp: string;
  role: string;
  metadata: string; // JSON string
}

export interface SearchResult {
  id: string;
  text: string;
  sessionFile: string;
  project: string;
  lineNumber: number;
  timestamp: string;
  role: string;
  metadata: Record<string, string>;
  score: number;
}

const TABLE_NAME = "session_chunks";

export class VectorStore {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    const home = process.env.HOME ?? "";
    this.dbPath =
      dbPath ?? path.join(home, ".pi", "agent", "memory", "sessions.lance");
  }

  async init(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = await lancedb.connect(this.dbPath);

    // Check if table exists
    const tables = await this.db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
    }
  }

  async ensureTable(vectorDimension: number): Promise<void> {
    if (this.table) return;
    if (!this.db) throw new Error("Store not initialized");

    // Create table with first dummy record (LanceDB needs data to infer schema)
    // We'll use createEmptyTable with schema instead
    this.table = await this.db.createEmptyTable(TABLE_NAME, {
      schema: createSchema(vectorDimension),
    });
  }

  /**
   * Add chunks with their embeddings
   */
  async addChunks(
    chunks: Array<{
      id: string;
      text: string;
      vector: number[];
      sessionFile: string;
      project: string;
      lineNumber: number;
      timestamp: string;
      role: string;
      metadata: Record<string, string>;
    }>,
  ): Promise<void> {
    if (!this.table) throw new Error("Table not initialized");
    if (chunks.length === 0) return;

    const rows = chunks.map((c) => ({
      id: c.id,
      text: c.text,
      vector: c.vector,
      sessionFile: c.sessionFile,
      project: c.project,
      lineNumber: c.lineNumber,
      timestamp: c.timestamp,
      role: c.role,
      metadata: JSON.stringify(c.metadata),
    }));

    await this.table.add(rows);
  }

  /**
   * Vector similarity search
   */
  async search(
    queryVector: number[],
    limit: number = 10,
  ): Promise<SearchResult[]> {
    if (!this.table) return [];

    const results = await this.table
      .vectorSearch(queryVector)
      .limit(limit)
      .toArray();

    return results.map((r) => ({
      id: r.id as string,
      text: r.text as string,
      sessionFile: r.sessionFile as string,
      project: r.project as string,
      lineNumber: r.lineNumber as number,
      timestamp: r.timestamp as string,
      role: r.role as string,
      metadata: JSON.parse(r.metadata as string),
      score: r._distance != null ? 1 / (1 + (r._distance as number)) : 0,
    }));
  }

  /**
   * Full-text search (BM25-style via LanceDB FTS)
   */
  async fullTextSearch(
    query: string,
    limit: number = 10,
  ): Promise<SearchResult[]> {
    if (!this.table) return [];

    try {
      const results = await this.table
        .search(query, "text")
        .limit(limit)
        .toArray();

      return results.map((r) => ({
        id: r.id as string,
        text: r.text as string,
        sessionFile: r.sessionFile as string,
        project: r.project as string,
        lineNumber: r.lineNumber as number,
        timestamp: r.timestamp as string,
        role: r.role as string,
        metadata: JSON.parse(r.metadata as string),
        score: r._score != null ? (r._score as number) : 0,
      }));
    } catch {
      // FTS index might not exist yet
      return [];
    }
  }

  /**
   * Create FTS index on text column
   */
  async createFtsIndex(): Promise<void> {
    if (!this.table) return;
    try {
      await this.table.createIndex("text", {
        config: lancedb.Index.fts(),
      });
    } catch {
      // Index might already exist
    }
  }

  /**
   * Get all indexed session files (for incremental indexing)
   */
  async getIndexedSessionFiles(): Promise<Set<string>> {
    if (!this.table) return new Set();

    try {
      const results = await this.table
        .query()
        .select(["sessionFile"])
        .toArray();

      return new Set(results.map((r) => r.sessionFile as string));
    } catch {
      return new Set();
    }
  }

  /**
   * Get total count of indexed chunks
   */
  async getCount(): Promise<number> {
    if (!this.table) return 0;
    return await this.table.countRows();
  }

  /**
   * Drop all data and recreate
   */
  async reset(vectorDimension: number): Promise<void> {
    if (!this.db) throw new Error("Store not initialized");

    const tables = await this.db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      await this.db.dropTable(TABLE_NAME);
    }
    this.table = null;
    await this.ensureTable(vectorDimension);
  }

  async close(): Promise<void> {
    this.table = null;
    this.db = null;
  }
}

function createSchema(vectorDimension: number) {
  // LanceDB uses Apache Arrow schema
  const arrow = require("apache-arrow");
  return new arrow.Schema([
    new arrow.Field("id", new arrow.Utf8()),
    new arrow.Field("text", new arrow.Utf8()),
    new arrow.Field(
      "vector",
      new arrow.FixedSizeList(
        vectorDimension,
        new arrow.Field("item", new arrow.Float32()),
      ),
    ),
    new arrow.Field("sessionFile", new arrow.Utf8()),
    new arrow.Field("project", new arrow.Utf8()),
    new arrow.Field("lineNumber", new arrow.Int32()),
    new arrow.Field("timestamp", new arrow.Utf8()),
    new arrow.Field("role", new arrow.Utf8()),
    new arrow.Field("metadata", new arrow.Utf8()),
  ]);
}
