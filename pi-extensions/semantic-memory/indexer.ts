/**
 * Unified Indexer — Sessions (3072d) + Org (768d)
 *
 * Parallel embedding + batched DB writes to minimize LanceDB fragments.
 *
 * Usage:
 *   npx tsx indexer.ts sessions [--force]
 *   npx tsx indexer.ts org [--force]
 *   npx tsx indexer.ts compact [sessions|org]
 *   npx tsx indexer.ts status
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  embedDocumentBatch,
  runWithConcurrency,
  DEFAULT_CONCURRENCY,
  type GeminiEmbeddingConfig,
} from "./gemini-embeddings.ts";
import { VectorStore } from "./store.ts";
import { findSessionFiles, extractSessionChunks } from "./session-indexer.ts";
import { findOrgFiles, chunkOrgFile } from "./org-chunker.ts";

// --- Config ---

const ORG_FOLDERS = new Set(["meta", "bib", "notes", "journal", "botlog"]);
const CONCURRENCY = parseInt(process.env.INDEX_CONCURRENCY ?? "", 10) || DEFAULT_CONCURRENCY;
const DB_WRITE_BATCH = 2000; // flush to DB every N chunks → fewer fragments

function getGeminiConfig(dimensions?: 768 | 3072): GeminiEmbeddingConfig {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return {
    apiKey,
    model: "gemini-embedding-2-preview",
    ...(dimensions ? { dimensions } : {}),
  };
}

function getOrgFolder(filePath: string): string {
  const parts = filePath.split("/");
  const orgIdx = parts.findIndex((p) => p === "org");
  return orgIdx >= 0 && orgIdx + 1 < parts.length ? parts[orgIdx + 1] : "";
}

// --- Write Buffer ---

interface PendingRecord {
  id: string;
  text: string;
  vector: number[];
  sessionFile: string;
  project: string;
  lineNumber: number;
  timestamp: string;
  role: string;
  metadata: Record<string, string>;
}

class WriteBuffer {
  private buffer: PendingRecord[] = [];
  private flushed = 0;

  constructor(
    private store: VectorStore,
    private batchSize: number,
  ) {}

  async add(records: PendingRecord[]) {
    this.buffer.push(...records);
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    await this.store.addChunks(this.buffer);
    this.flushed += this.buffer.length;
    this.buffer = [];
  }

  get totalFlushed() {
    return this.flushed + this.buffer.length;
  }
}

// --- Progress ---

class Progress {
  private completed = 0;
  private errors = 0;
  private chunks = 0;
  private t0 = Date.now();

  constructor(
    private total: number,
    private label: string,
  ) {}

  tick(addedChunks: number) {
    this.completed++;
    this.chunks += addedChunks;
    if (this.completed % 5 === 0 || this.completed === this.total) {
      this.print();
    }
  }

  error() {
    this.completed++;
    this.errors++;
  }

  print() {
    const elapsed = ((Date.now() - this.t0) / 1000).toFixed(1);
    const rate = (this.completed / ((Date.now() - this.t0) / 1000)).toFixed(1);
    const eta = Math.round(
      (this.total - this.completed) / Math.max(0.1, parseFloat(rate)),
    );
    console.log(
      `${this.label}: ${this.completed}/${this.total} [${this.chunks} ch] ${elapsed}s (${rate}/s, ~${eta}s left) err:${this.errors}`,
    );
  }

  summary(): string {
    const elapsed = ((Date.now() - this.t0) / 1000).toFixed(1);
    return `✅ ${this.label}: ${this.chunks} chunks | ${this.errors} errors | ${elapsed}s | concurrency=${CONCURRENCY}`;
  }
}

// --- Session Indexing (3072d) ---

async function indexSessions(force: boolean) {
  const config = getGeminiConfig();
  const store = new VectorStore(undefined, 3072);
  await store.init();
  if (force) await store.reset();
  await store.ensureTable();

  const files = findSessionFiles();
  const indexed = force ? new Set<string>() : await store.getIndexedFiles();
  const toIndex = files.filter((f) => !indexed.has(f));

  console.log(
    `Sessions: ${files.length} | indexed: ${indexed.size} | to index: ${toIndex.length} | concurrency: ${CONCURRENCY}`,
  );
  if (toIndex.length === 0) {
    console.log("✅ All sessions indexed.");
    await store.close();
    return;
  }

  const progress = new Progress(toIndex.length, "Sessions");
  const wb = new WriteBuffer(store, DB_WRITE_BATCH);

  const tasks = toIndex.map((file) => async () => {
    const chunks = await extractSessionChunks(file);
    if (chunks.length === 0) {
      progress.tick(0);
      return;
    }
    const vectors = await embedDocumentBatch(
      chunks.map((c) => c.text),
      config,
    );
    await wb.add(chunks.map((c, j) => ({ ...c, vector: vectors[j] })));
    progress.tick(chunks.length);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  await wb.flush(); // final flush

  try {
    await store.createFtsIndex();
  } catch {}
  const total = await store.getCount();
  console.log(progress.summary());
  console.log(`Total in DB: ${total}`);
  await store.close();
}

// --- Org Indexing (768d) ---

async function indexOrg(force: boolean) {
  const config = getGeminiConfig(768);
  const dbPath = path.join(
    process.env.HOME ?? "",
    ".pi",
    "agent",
    "memory",
    "org.lance",
  );
  const store = new VectorStore(dbPath, 768);
  await store.init();
  if (force) await store.reset();
  await store.ensureTable();

  const allFiles = findOrgFiles();
  const files = allFiles.filter((f) => ORG_FOLDERS.has(getOrgFolder(f)));
  const indexed = force ? new Set<string>() : await store.getIndexedFiles();
  const toIndex = files.filter((f) => !indexed.has(f));

  console.log(
    `Org: ${files.length} files (${allFiles.length} total) | indexed: ${indexed.size} | to index: ${toIndex.length} | concurrency: ${CONCURRENCY}`,
  );
  if (toIndex.length === 0) {
    console.log("✅ All org files indexed.");
    await store.close();
    return;
  }

  const progress = new Progress(toIndex.length, "Org");
  const wb = new WriteBuffer(store, DB_WRITE_BATCH);

  const tasks = toIndex.map((file) => async () => {
    const content = fs.readFileSync(file, "utf-8");
    const chunks = chunkOrgFile(content, file);
    if (chunks.length === 0) {
      progress.tick(0);
      return;
    }

    // Embed in batches of 100 (API limit)
    for (let b = 0; b < chunks.length; b += 100) {
      const batch = chunks.slice(b, b + 100);
      const vectors = await embedDocumentBatch(
        batch.map((c) => c.text),
        config,
      );

      await wb.add(
        batch.map((c, j) => ({
          id: c.id,
          text: c.text,
          vector: vectors[j],
          sessionFile: c.filePath,
          project: c.folder,
          lineNumber: c.lineNumber,
          timestamp: c.metadata.date || c.metadata.identifier || "",
          role: c.chunkType,
          metadata: {
            title: c.metadata.title,
            tags: c.metadata.filetags.join(","),
            hierarchy: c.hierarchy,
            prefix: c.metadata.titlePrefix,
            identifier: c.metadata.identifier,
          },
        })),
      );
    }
    progress.tick(chunks.length);
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  await wb.flush(); // final flush

  try {
    await store.createFtsIndex();
  } catch {}
  const total = await store.getCount();
  console.log(progress.summary());
  console.log(`Total in DB: ${total}`);
  await store.close();
}

// --- Compact ---

async function compact(target: string) {
  const lancedb = await import("@lancedb/lancedb");

  const targets =
    target === "all"
      ? ["sessions", "org"]
      : [target];

  for (const t of targets) {
    const dbPath =
      t === "sessions"
        ? path.join(process.env.HOME ?? "", ".pi", "agent", "memory", "sessions.lance")
        : path.join(process.env.HOME ?? "", ".pi", "agent", "memory", "org.lance");

    if (!fs.existsSync(dbPath)) {
      console.log(`${t}: not found`);
      continue;
    }

    const db = await lancedb.connect(dbPath);
    const table = await db.openTable("session_chunks");
    const rows = await table.countRows();

    const fragDir = path.join(dbPath, "session_chunks.lance", "data");
    const fragsBefore = fs.existsSync(fragDir)
      ? fs.readdirSync(fragDir).length
      : 0;

    const { execSync } = await import("node:child_process");
    const sizeBefore = execSync(`du -sh ${dbPath}`).toString().split("\t")[0];

    console.log(`${t}: ${rows} rows, ${fragsBefore} fragments, ${sizeBefore}`);
    console.log(`  compacting...`);

    await table.optimize({ cleanupOlderThan: new Date() });

    const fragsAfter = fs.readdirSync(fragDir).length;
    const sizeAfter = execSync(`du -sh ${dbPath}`).toString().split("\t")[0];
    console.log(`  → ${fragsAfter} fragments, ${sizeAfter}`);
  }
}

// --- Status ---

async function status() {
  const { execSync } = await import("node:child_process");

  const sessionStore = new VectorStore(undefined, 3072);
  await sessionStore.init();
  const sCount = await sessionStore.getCount();
  const sIndexed = await sessionStore.getIndexedFiles();
  const sFiles = findSessionFiles();
  const sDbPath = path.join(process.env.HOME ?? "", ".pi", "agent", "memory", "sessions.lance");
  const sSize = fs.existsSync(sDbPath)
    ? execSync(`du -sh ${sDbPath}`).toString().split("\t")[0]
    : "N/A";
  const sFragDir = path.join(sDbPath, "session_chunks.lance", "data");
  const sFrags = fs.existsSync(sFragDir)
    ? fs.readdirSync(sFragDir).length
    : 0;
  console.log(
    `🧠 Sessions (3072d): ${sCount} chunks | ${sIndexed.size}/${sFiles.length} files | ${sFrags} frags | ${sSize}`,
  );
  await sessionStore.close();

  const orgDbPath = path.join(process.env.HOME ?? "", ".pi", "agent", "memory", "org.lance");
  if (fs.existsSync(orgDbPath)) {
    const orgStore = new VectorStore(orgDbPath, 768);
    await orgStore.init();
    const oCount = await orgStore.getCount();
    const oIndexed = await orgStore.getIndexedFiles();
    const oFiles = findOrgFiles().filter((f) => ORG_FOLDERS.has(getOrgFolder(f)));
    const oSize = execSync(`du -sh ${orgDbPath}`).toString().split("\t")[0];
    const oFragDir = path.join(orgDbPath, "session_chunks.lance", "data");
    const oFrags = fs.existsSync(oFragDir)
      ? fs.readdirSync(oFragDir).length
      : 0;
    console.log(
      `📚 Org (768d): ${oCount} chunks | ${oIndexed.size}/${oFiles.length} files | ${oFrags} frags | ${oSize}`,
    );
    await orgStore.close();
  } else {
    console.log("📚 Org: not indexed yet");
  }
}

// --- Main ---

const args = process.argv.slice(2);
const cmd = args[0];
const force = args.includes("--force");

switch (cmd) {
  case "sessions":
    await indexSessions(force);
    break;
  case "org":
    await indexOrg(force);
    break;
  case "compact":
    await compact(args[1] ?? "all");
    break;
  case "status":
    await status();
    break;
  default:
    console.log("Usage: npx tsx indexer.ts <sessions|org|compact|status> [--force]");
    console.log("  INDEX_CONCURRENCY=2 npx tsx indexer.ts org --force");
    console.log("  npx tsx indexer.ts compact org    # defragment DB");
}
