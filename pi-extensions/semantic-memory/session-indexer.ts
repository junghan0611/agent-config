/**
 * Session JSONL Indexer
 *
 * Extracts searchable chunks from pi session JSONL files:
 * - USER messages (what the user asked/instructed)
 * - Compaction summaries (session-level context)
 * - Assistant text responses (key conclusions)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

export interface SessionChunk {
  id: string; // unique: sessionFile:lineNumber
  text: string; // chunk text for embedding
  sessionFile: string; // path to JSONL file
  project: string; // extracted from session dir name
  lineNumber: number;
  timestamp: string; // ISO timestamp
  role: "user" | "compaction" | "assistant";
  metadata: Record<string, string>;
}

interface JsonlMessage {
  type: string;
  timestamp?: number;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }> | string;
  };
  compaction?: {
    summary: string;
  };
}

/**
 * Discover all session directories
 */
export function getSessionsBaseDir(): string {
  const home = process.env.HOME ?? "";
  return path.join(home, ".pi", "agent", "sessions");
}

/**
 * Find all JSONL session files
 */
export function findSessionFiles(baseDir?: string): string[] {
  const dir = baseDir ?? getSessionsBaseDir();
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const subdir of fs.readdirSync(dir)) {
    const subdirPath = path.join(dir, subdir);
    if (!fs.statSync(subdirPath).isDirectory()) continue;

    for (const file of fs.readdirSync(subdirPath)) {
      if (file.endsWith(".jsonl")) {
        files.push(path.join(subdirPath, file));
      }
    }
  }
  return files.sort();
}

/**
 * Extract project name from session directory
 * e.g. "--home-junghan-repos-gh-agent-config--" → "agent-config"
 */
export function extractProjectName(sessionFile: string): string {
  const dirName = path.basename(path.dirname(sessionFile));
  // Remove leading/trailing -- and split by -
  const cleaned = dirName.replace(/^-+|-+$/g, "");
  const parts = cleaned.split("-");
  // Last meaningful part is usually the project name
  return parts[parts.length - 1] || "unknown";
}

/**
 * Extract chunks from a single session JSONL file
 */
export async function extractSessionChunks(
  sessionFile: string,
): Promise<SessionChunk[]> {
  const chunks: SessionChunk[] = [];
  const project = extractProjectName(sessionFile);

  const fileStream = fs.createReadStream(sessionFile);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (!line.trim()) continue;

    let parsed: JsonlMessage;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const timestamp = parsed.timestamp
      ? new Date(parsed.timestamp).toISOString()
      : "";

    // Compaction summaries — high-value session overview
    if (parsed.type === "compaction" && parsed.compaction?.summary) {
      chunks.push({
        id: `${sessionFile}:${lineNumber}`,
        text: parsed.compaction.summary,
        sessionFile,
        project,
        lineNumber,
        timestamp,
        role: "compaction",
        metadata: { type: "compaction" },
      });
      continue;
    }

    if (parsed.type !== "message" || !parsed.message) continue;

    const { role, content } = parsed.message;

    // USER messages — what was asked/instructed
    if (role === "user") {
      const text = extractTextContent(content);
      if (text && text.length > 20) {
        // Skip very short messages
        chunks.push({
          id: `${sessionFile}:${lineNumber}`,
          text: truncateText(text, 2000),
          sessionFile,
          project,
          lineNumber,
          timestamp,
          role: "user",
          metadata: { type: "user_message" },
        });
      }
    }

    // Assistant text responses — key conclusions (skip tool calls)
    if (role === "assistant") {
      const text = extractTextContent(content);
      if (text && text.length > 100) {
        // Only substantial responses
        chunks.push({
          id: `${sessionFile}:${lineNumber}`,
          text: truncateText(text, 2000),
          sessionFile,
          project,
          lineNumber,
          timestamp,
          role: "assistant",
          metadata: { type: "assistant_response" },
        });
      }
    }
  }

  return chunks;
}

function extractTextContent(
  content: Array<{ type: string; text?: string }> | string,
): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
