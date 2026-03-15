/**
 * LanceDB Vector Store
 *
 * Wraps LanceDB for session chunk storage and retrieval.
 * Patterns from OpenClaw extensions/memory-lancedb:
 * - Lazy init with promise dedup
 * - Dummy data → delete for table creation
 * - L2 distance → similarity: 1/(1+distance)
 */

import type * as LanceDB from "@lancedb/lancedb";
import * as path from "node:path";
import * as fs from "node:fs";

// Lazy import to avoid startup cost
let lancedbImportPromise: Promise<typeof import("@lancedb/lancedb")> | null =
  null;
const loadLanceDB = async (): Promise<typeof import("@lancedb/lancedb")> => {
  if (!lancedbImportPromise) {
    lancedbImportPromise = import("@lancedb/lancedb");
  }
  return await lancedbImportPromise;
};

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
  private db: LanceDB.Connection | null = null;
  private table: LanceDB.Table | null = null;
  private initPromise: Promise<void> | null = null;
  private dbPath: string;
  private vectorDim: number;

  constructor(dbPath?: string, vectorDim: number = 3072) {
    const home = process.env.HOME ?? "";
    this.dbPath =
      dbPath ?? path.join(home, ".pi", "agent", "memory", "sessions.lance");
    this.vectorDim = vectorDim;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.table) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const lancedb = await loadLanceDB();
    this.db = await lancedb.connect(this.dbPath);

    const tables = await this.db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
    }
  }

  /**
   * Create table with dummy data then delete — OpenClaw pattern
   */
  private async createTable(): Promise<void> {
    if (!this.db) throw new Error("DB not connected");

    const dummyVector = Array.from({ length: this.vectorDim }).fill(
      0,
    ) as number[];
    this.table = await this.db.createTable(
      TABLE_NAME,
      [
        {
          id: "__schema__",
          text: "",
          vector: dummyVector,
          sessionFile: "",
          project: "",
          lineNumber: 0,
          timestamp: "",
          role: "",
          metadata: "{}",
        },
      ],
      { mode: "overwrite" },
    );
    await this.table.delete('id = "__schema__"');
  }

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async ensureTable(): Promise<void> {
    await this.ensureInitialized();
    if (!this.table) {
      await this.createTable();
    }
  }

  /**
   * Add chunks with their embeddings.
   * Safe: deletes existing chunks for the same file before inserting,
   * preventing duplicates on re-indexing.
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
    await this.ensureTable();
    if (chunks.length === 0) return;

    // Delete existing chunks for this file (prevent duplicates)
    const file = chunks[0].sessionFile;
    if (file) {
      try {
        await this.table!.delete(`sessionFile = "${file.replace(/"/g, '\\"')}"`);
      } catch {
        // Table might be empty or filter syntax issue — safe to ignore
      }
    }

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

    await this.table!.add(rows);
  }

  /**
   * Vector similarity search
   * L2 distance → similarity: 1/(1+distance) — OpenClaw pattern
   */
  async search(
    queryVector: number[],
    limit: number = 10,
    minScore: number = 0.1,
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();
    if (!this.table) return [];

    const results = await this.table
      .vectorSearch(queryVector)
      .limit(limit)
      .toArray();

    return results
      .map((r) => ({
        id: r.id as string,
        text: r.text as string,
        sessionFile: r.sessionFile as string,
        project: r.project as string,
        lineNumber: r.lineNumber as number,
        timestamp: r.timestamp as string,
        role: r.role as string,
        metadata: JSON.parse(r.metadata as string),
        score: r._distance != null ? 1 / (1 + (r._distance as number)) : 0,
      }))
      .filter((r) => r.score >= minScore);
  }

  /**
   * Full-text search (BM25-style via LanceDB FTS)
   * Uses query().fullTextSearch() — not search() which requires embedding functions
   */
  async fullTextSearch(
    query: string,
    limit: number = 10,
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();
    if (!this.table) return [];

    try {
      const results = await this.table
        .query()
        .fullTextSearch(query)
        .select([
          "id",
          "text",
          "sessionFile",
          "project",
          "lineNumber",
          "timestamp",
          "role",
          "metadata",
        ])
        .limit(limit)
        .toArray();

      return results.map((r, i) => ({
        id: r.id as string,
        text: r.text as string,
        sessionFile: r.sessionFile as string,
        project: r.project as string,
        lineNumber: r.lineNumber as number,
        timestamp: r.timestamp as string,
        role: r.role as string,
        metadata: JSON.parse(r.metadata as string),
        score: r._score != null ? (r._score as number) : 1 / (i + 1), // rank-based fallback
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
    await this.ensureInitialized();
    if (!this.table) return;
    const lancedb = await loadLanceDB();
    try {
      await this.table.createIndex("text", {
        config: lancedb.Index.fts(),
      });
    } catch {
      // Index might already exist
    }
  }

  /**
   * Get all indexed file paths (for incremental indexing)
   * Uses SQL-based distinct query to avoid loading all rows
   */
  async getIndexedFiles(): Promise<Set<string>> {
    await this.ensureInitialized();
    if (!this.table) return new Set();

    try {
      // LanceDB query with explicit large limit to get all unique files
      const count = await this.table.countRows();
      const results = await this.table
        .query()
        .select(["sessionFile"])
        .limit(count)
        .toArray();

      return new Set(results.map((r) => r.sessionFile as string));
    } catch {
      return new Set();
    }
  }

  /**
   * @deprecated Use getIndexedFiles() instead
   */
  async getIndexedSessionFiles(): Promise<Set<string>> {
    return this.getIndexedFiles();
  }

  /**
   * Get total count of indexed chunks
   */
  async getCount(): Promise<number> {
    await this.ensureInitialized();
    if (!this.table) return 0;
    return await this.table.countRows();
  }

  /**
   * Drop all data and recreate
   */
  async reset(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("DB not connected");

    const tables = await this.db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      await this.db.dropTable(TABLE_NAME);
    }
    this.table = null;
    this.initPromise = null;
    await this.createTable();
  }

  async close(): Promise<void> {
    this.table = null;
    this.db = null;
    this.initPromise = null;
  }
}
