/**
 * Org-mode Structure-Aware Chunker (Approach 3)
 *
 * Respects org heading hierarchy, Denote front matter, filetags,
 * GPTEL properties, and folder-based differentiation.
 *
 * Design informed by:
 * - John Kitchin emacs-rag-libsql (2-tier: headings + content)
 * - ELISA (paragraph-based, semantic merge)
 * - Org-roam semantic search (hierarchy preservation)
 * - embedding-config (folder-based chunk sizing, 2945 files verified)
 * - memex-kb RAG strategy docs (Korean-specific considerations)
 *
 * Key insight: "Org-mode is already designed for chunking" — ~120 lines.
 */

// --- Types ---

export interface DenoteMetadata {
  identifier: string; // YYYYMMDDTHHMMSS
  title: string; // Korean title from #+title
  filetags: string[]; // :tag1:tag2: parsed
  date: string; // [YYYY-MM-DD ...]
  folder: string; // notes, meta, bib, botlog, journal, llmlog, ...
  references: string[]; // citation keys from #+reference
  titlePrefix: string; // §, †, ‡, @, # or ""
  hasGptelProps: boolean;
}

export interface OrgHeading {
  level: number; // 1, 2, 3, ...
  title: string;
  tags: string[]; // :tag1:tag2: on heading line
  lineNumber: number;
  properties: Record<string, string>; // PROPERTY drawer
  isArchive: boolean; // :ARCHIVE: tag
  isLlmlog: boolean; // :LLMLOG: tag
}

export interface OrgChunk {
  id: string;
  text: string; // enriched text for embedding
  rawText: string; // original text
  filePath: string;
  folder: string;
  lineNumber: number;
  endLineNumber: number;
  chunkType: "heading" | "content"; // 2-tier: heading vs content
  metadata: DenoteMetadata;
  hierarchy: string; // "meta > 데이터로그 > 관련메타"
  heading?: OrgHeading;
}

// --- Folder-based chunk config (from embedding-config, verified on 2945 files) ---

const FOLDER_CHUNK_CONFIG: Record<string, { maxChars: number; overlap: number }> = {
  meta: { maxChars: 6000, overlap: 400 }, // 1500 tokens × 4
  bib: { maxChars: 4800, overlap: 300 }, // 1200 tokens
  notes: { maxChars: 4000, overlap: 300 }, // 1000 tokens
  journal: { maxChars: 3200, overlap: 200 }, // 800 tokens
  botlog: { maxChars: 4000, overlap: 300 },
  llmlog: { maxChars: 3200, overlap: 200 },
  office: { maxChars: 4000, overlap: 300 },
  default: { maxChars: 4000, overlap: 300 },
};

// --- Front matter parsing ---

export function parseDenoteFilename(filePath: string): Partial<DenoteMetadata> {
  const basename =
    filePath
      .split("/")
      .pop()
      ?.replace(/\.org$/, "") ?? "";

  // YYYYMMDDTHHMMSS--title__tag1_tag2
  const match = basename.match(
    /^(\d{8}T\d{6})--(.+?)(?:__(.+))?$/,
  );
  if (!match) return {};

  const identifier = match[1];
  const titleSlug = match[2];
  const tagsPart = match[3];
  const filetags = tagsPart ? tagsPart.split("_").filter(Boolean) : [];

  return { identifier, filetags, title: titleSlug };
}

export function parseOrgFrontMatter(content: string, filePath: string): DenoteMetadata {
  const fromFilename = parseDenoteFilename(filePath);

  // Folder from path
  const parts = filePath.split("/");
  const orgIdx = parts.findIndex((p) => p === "org");
  const folder = orgIdx >= 0 && orgIdx + 1 < parts.length ? parts[orgIdx + 1] : "unknown";

  // Parse #+key: value lines (only at start, before first heading)
  const headerEnd = content.indexOf("\n*");
  const header = headerEnd > 0 ? content.slice(0, headerEnd) : content.slice(0, 2000);

  const get = (key: string): string => {
    const re = new RegExp(`^#\\+${key}:\\s*(.+)$`, "mi");
    const m = header.match(re);
    return m?.[1]?.trim() ?? "";
  };

  const title = get("title") || fromFilename.title || "";
  const date = get("date");
  const identifier = get("identifier") || fromFilename.identifier || "";

  // filetags: :tag1:tag2:
  const filetagsRaw = get("filetags");
  const filetags = filetagsRaw
    ? filetagsRaw
        .split(":")
        .filter((t) => t.length > 0)
    : fromFilename.filetags ?? [];

  // references: key1;key2
  const refRaw = get("reference");
  const references = refRaw ? refRaw.split(";").map((r) => r.trim()).filter(Boolean) : [];

  // Title prefix detection (§, †, ‡, @, #)
  const prefixMatch = title.match(/^([§†‡@#])/);
  const titlePrefix = prefixMatch?.[1] ?? "";

  // GPTEL properties
  const hasGptelProps = /^:GPTEL_MODEL:/m.test(header) || /^:GPTEL_BACKEND:/m.test(header);

  return {
    identifier,
    title,
    filetags,
    date,
    folder,
    references,
    titlePrefix,
    hasGptelProps,
  };
}

// --- Heading parser ---

export function parseOrgHeadings(content: string): OrgHeading[] {
  const lines = content.split("\n");
  const headings: OrgHeading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match org headings: * Title :tag1:tag2:
    const match = line.match(/^(\*+)\s+(.+?)(?:\s+(:[a-zA-Z0-9_:]+:))?\s*$/);
    if (!match) continue;

    const level = match[1].length;
    const rawTitle = match[2].trim();
    const tagsStr = match[3] ?? "";
    const tags = tagsStr
      .split(":")
      .filter((t) => t.length > 0);

    // Parse PROPERTIES drawer if present
    const properties: Record<string, string> = {};
    if (i + 1 < lines.length && lines[i + 1].trim() === ":PROPERTIES:") {
      for (let j = i + 2; j < lines.length; j++) {
        const propLine = lines[j].trim();
        if (propLine === ":END:") break;
        const propMatch = propLine.match(/^:([A-Z_]+):\s*(.*)$/);
        if (propMatch) {
          properties[propMatch[1]] = propMatch[2];
        }
      }
    }

    headings.push({
      level,
      title: rawTitle,
      tags,
      lineNumber: i + 1,
      properties,
      isArchive: tags.includes("ARCHIVE"),
      isLlmlog: tags.includes("LLMLOG"),
    });
  }

  return headings;
}

// --- Hierarchy builder ---

function buildHierarchy(headings: OrgHeading[], currentIdx: number): string {
  const current = headings[currentIdx];
  const path: string[] = [current.title];

  for (let i = currentIdx - 1; i >= 0; i--) {
    if (headings[i].level < current.level) {
      path.unshift(headings[i].title);
      if (headings[i].level === 1) break;
    }
  }

  return path.join(" > ");
}

// --- Content extraction between headings ---

function extractContentBetween(
  lines: string[],
  startLine: number, // 0-indexed
  endLine: number, // 0-indexed, exclusive
): string {
  const relevant = lines.slice(startLine, endLine);

  // Skip PROPERTIES drawer
  const filtered: string[] = [];
  let inProperties = false;
  for (const line of relevant) {
    const trimmed = line.trim();
    if (trimmed === ":PROPERTIES:") {
      inProperties = true;
      continue;
    }
    if (trimmed === ":END:" && inProperties) {
      inProperties = false;
      continue;
    }
    if (inProperties) continue;

    // Skip org directives (#+...) unless meaningful
    if (/^#\+(BEGIN_|END_|begin_|end_)/.test(trimmed)) continue;
    if (/^#\+(title|date|filetags|identifier|export|hugo|description|OPTIONS|STARTUP|reference)/i.test(trimmed)) continue;

    filtered.push(line);
  }

  return filtered.join("\n").trim();
}

// --- Enriched text for embedding ---

function buildEmbeddingText(
  content: string,
  metadata: DenoteMetadata,
  hierarchy: string,
  heading?: OrgHeading,
): string {
  const parts: string[] = [];

  // File-level context (compact)
  if (metadata.title) {
    parts.push(metadata.title);
  }
  if (metadata.filetags.length > 0) {
    parts.push(`[${metadata.filetags.join(", ")}]`);
  }

  // Hierarchy context
  if (hierarchy && hierarchy !== metadata.title) {
    parts.push(`> ${hierarchy}`);
  }

  // Heading tags (if different from filetags)
  if (heading?.tags.length && !heading.isArchive) {
    const extra = heading.tags.filter((t) => !metadata.filetags.includes(t.toLowerCase()));
    if (extra.length > 0) {
      parts.push(`(${extra.join(", ")})`);
    }
  }

  // Content
  if (content) {
    parts.push("");
    parts.push(content);
  }

  return parts.join("\n");
}

// --- Sub-chunking for long sections ---

function subChunkContent(
  text: string,
  maxChars: number,
  overlap: number,
): Array<{ text: string; offsetLines: number }> {
  if (text.length <= maxChars) {
    return [{ text, offsetLines: 0 }];
  }

  const chunks: Array<{ text: string; offsetLines: number }> = [];
  const lines = text.split("\n");
  let current: string[] = [];
  let currentChars = 0;
  let startLine = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({
      text: current.join("\n"),
      offsetLines: startLine,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLen = line.length + 1;

    if (currentChars + lineLen > maxChars && current.length > 0) {
      flush();

      // Carry overlap
      const overlapLines: string[] = [];
      let overlapChars = 0;
      for (let j = current.length - 1; j >= 0 && overlapChars < overlap; j--) {
        overlapLines.unshift(current[j]);
        overlapChars += current[j].length + 1;
      }
      current = overlapLines;
      currentChars = overlapChars;
      startLine = i - overlapLines.length;
    }

    current.push(line);
    currentChars += lineLen;
  }

  flush();
  return chunks;
}

// --- Main chunker ---

export function chunkOrgFile(
  content: string,
  filePath: string,
): OrgChunk[] {
  const metadata = parseOrgFrontMatter(content, filePath);
  const headings = parseOrgHeadings(content);
  const lines = content.split("\n");
  const chunks: OrgChunk[] = [];

  const folderConfig = FOLDER_CHUNK_CONFIG[metadata.folder] ?? FOLDER_CHUNK_CONFIG.default;

  // Skip empty or very small files
  if (content.length < 50) return [];

  // --- Tier 1: Heading chunks (for fast structural search) ---

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (h.isArchive) continue; // Skip :ARCHIVE: headings

    const hierarchy = buildHierarchy(headings, i);
    const headingText = buildEmbeddingText(
      "", // No content — heading only
      metadata,
      hierarchy,
      h,
    );

    if (headingText.length < 20) continue;

    chunks.push({
      id: `${filePath}:h${h.lineNumber}`,
      text: headingText,
      rawText: h.title,
      filePath,
      folder: metadata.folder,
      lineNumber: h.lineNumber,
      endLineNumber: h.lineNumber,
      chunkType: "heading",
      metadata,
      hierarchy,
      heading: h,
    });
  }

  // --- Tier 2: Content chunks (for deep search) ---

  if (headings.length === 0) {
    // No headings — chunk entire file
    const text = extractContentBetween(lines, 0, lines.length);
    if (text.length < 30) return chunks;

    const subChunks = subChunkContent(text, folderConfig.maxChars, folderConfig.overlap);
    for (let i = 0; i < subChunks.length; i++) {
      const enriched = buildEmbeddingText(subChunks[i].text, metadata, "", undefined);
      chunks.push({
        id: `${filePath}:c${i}`,
        text: enriched,
        rawText: subChunks[i].text,
        filePath,
        folder: metadata.folder,
        lineNumber: subChunks[i].offsetLines + 1,
        endLineNumber: subChunks[i].offsetLines + subChunks[i].text.split("\n").length,
        chunkType: "content",
        metadata,
        hierarchy: "",
      });
    }
    return chunks;
  }

  // Chunk content under each heading
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (h.isArchive) continue;

    // Content range: after this heading to next same-or-higher level heading
    const startLine = h.lineNumber; // 1-indexed, heading line itself
    let endLine = lines.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        endLine = headings[j].lineNumber - 1;
        break;
      }
    }

    const rawContent = extractContentBetween(lines, startLine, endLine);
    if (rawContent.length < 30) continue;

    const hierarchy = buildHierarchy(headings, i);
    const subChunks = subChunkContent(rawContent, folderConfig.maxChars, folderConfig.overlap);

    for (let j = 0; j < subChunks.length; j++) {
      const enriched = buildEmbeddingText(subChunks[j].text, metadata, hierarchy, h);

      chunks.push({
        id: `${filePath}:c${h.lineNumber}:${j}`,
        text: enriched,
        rawText: subChunks[j].text,
        filePath,
        folder: metadata.folder,
        lineNumber: h.lineNumber + subChunks[j].offsetLines,
        endLineNumber: h.lineNumber + subChunks[j].offsetLines + subChunks[j].text.split("\n").length,
        chunkType: "content",
        metadata,
        hierarchy,
        heading: h,
      });
    }
  }

  return chunks;
}

// --- File discovery ---

import * as fsSync from "node:fs";
import * as pathMod from "node:path";

export function findOrgFiles(orgDir?: string): string[] {

  const dir = orgDir ?? pathMod.join(process.env.HOME ?? "", "sync", "org");
  if (!fsSync.existsSync(dir)) return [];

  const files: string[] = [];
  const SKIP_DIRS = new Set([".git", "node_modules", ".agent-shell", "setup", "archives"]);

  function walk(d: string) {
    const entries = fsSync.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(pathMod.join(d, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".org")) {
        files.push(pathMod.join(d, entry.name));
      }
    }
  }

  walk(dir);
  return files.sort();
}
