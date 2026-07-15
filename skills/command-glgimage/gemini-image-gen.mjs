#!/usr/bin/env node
/**
 * Standalone Gemini image generator for the glg-image skill.
 *
 * Zero npm dependencies. It mirrors pi-extensions/gemini-image-gen.ts, but can be
 * called by Claude Code, Codex, Antigravity, or a shell without pi.registerTool.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";

const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_ASPECT_RATIO = "1:1";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const ASPECT_RATIOS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"]);
const IMAGE_SIZES = new Set(["512", "1K", "2K", "4K"]);

function usage() {
  console.log(`Usage:
  gemini-image-gen.mjs --prompt-file PROMPT.txt [options]
  gemini-image-gen.mjs --prompt "image description" [options]

Options:
  --output PATH          Save to PATH instead of ~/screenshot/<denote-name>.png
  --aspect-ratio RATIO   1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9
  --model MODEL          Default: ${DEFAULT_MODEL}
  --image-size SIZE      512, 1K, 2K, 4K
  --env-file PATH        Default: ~/.env.local
  --json                 Print machine-readable result JSON
  --dry-run              Validate and print request metadata without calling Gemini
  --help                 Show this help

The script reads GEMINI_API_KEY from the environment, then --env-file as fallback.
It never prints the key.`);
}

function toKstTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString();
  return kst.slice(0, 4) + kst.slice(5, 7) + kst.slice(8, 10) + "T" + kst.slice(11, 13) + kst.slice(14, 16) + kst.slice(17, 19);
}

function slugify(text, maxLen = 48) {
  const ascii = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen)
    .replace(/-$/g, "");
  return ascii || "generated-image";
}

function extensionFor(mimeType) {
  const mime = mimeType.toLowerCase();
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  return ".png";
}

async function loadApiKey(envFile) {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  let text;
  try {
    text = await readFile(envFile, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?GEMINI_API_KEY\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[1].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value) return value;
  }
  return undefined;
}

async function readPrompt(values) {
  if (values.prompt && values["prompt-file"]) {
    throw new Error("Use exactly one of --prompt or --prompt-file.");
  }
  if (values["prompt-file"]) {
    return (await readFile(resolve(values["prompt-file"]), "utf8")).trim();
  }
  return values.prompt?.trim();
}

function outputPath(requested, prompt, mimeType) {
  const actualExt = extensionFor(mimeType);
  if (!requested) {
    return join(homedir(), "screenshot", `${toKstTimestamp()}--${slugify(prompt)}__brand_nanobanana${actualExt}`);
  }
  const absolute = resolve(requested);
  const requestedExt = extname(absolute).toLowerCase();
  if (!requestedExt) return absolute + actualExt;
  const imageExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
  if (imageExts.has(requestedExt) && requestedExt !== actualExt) {
    return absolute.slice(0, -requestedExt.length) + actualExt;
  }
  return absolute;
}

const { values } = parseArgs({
  options: {
    prompt: { type: "string" },
    "prompt-file": { type: "string" },
    output: { type: "string", short: "o" },
    "aspect-ratio": { type: "string", default: DEFAULT_ASPECT_RATIO },
    model: { type: "string", default: DEFAULT_MODEL },
    "image-size": { type: "string" },
    "env-file": { type: "string", default: join(homedir(), ".env.local") },
    json: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (values.help) {
  usage();
  process.exit(0);
}

try {
  const prompt = await readPrompt(values);
  if (!prompt) throw new Error("A non-empty --prompt or --prompt-file is required.");
  if (!ASPECT_RATIOS.has(values["aspect-ratio"])) {
    throw new Error(`Unsupported aspect ratio: ${values["aspect-ratio"]}`);
  }
  if (values["image-size"] && !IMAGE_SIZES.has(values["image-size"])) {
    throw new Error(`Unsupported image size: ${values["image-size"]}`);
  }

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: values["aspect-ratio"],
        ...(values["image-size"] ? { imageSize: values["image-size"] } : {}),
      },
    },
  };

  if (values["dry-run"]) {
    const result = {
      dryRun: true,
      model: values.model,
      aspectRatio: values["aspect-ratio"],
      imageSize: values["image-size"] ?? null,
      output: values.output ? resolve(values.output) : null,
      promptChars: prompt.length,
      promptSource: values["prompt-file"] ? resolve(values["prompt-file"]) : "--prompt",
    };
    console.log(values.json ? JSON.stringify(result) : Object.entries(result).map(([k, v]) => `${k}: ${v}`).join("\n"));
    process.exit(0);
  }

  const apiKey = await loadApiKey(resolve(values["env-file"]));
  if (!apiKey) {
    throw new Error(`GEMINI_API_KEY not found in the environment or ${resolve(values["env-file"])}.`);
  }

  console.error(`Generating with ${values.model} (${values["aspect-ratio"]}${values["image-size"] ? `, ${values["image-size"]}` : ""})...`);
  const response = await fetch(`${ENDPOINT}/models/${encodeURIComponent(values.model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`Gemini API ${data.error.code ?? "error"}: ${data.error.message ?? "unknown error"}`);
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage ?? ""}`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const texts = parts.flatMap((part) => (part.text ? [part.text] : []));
  const image = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!image?.data) {
    throw new Error(`No image in response (finishReason: ${data.candidates?.[0]?.finishReason ?? "unknown"}).`);
  }

  const mimeType = image.mimeType ?? "image/png";
  const savedPath = outputPath(values.output, prompt, mimeType);
  await mkdir(dirname(savedPath), { recursive: true });
  await writeFile(savedPath, Buffer.from(image.data, "base64"));

  const result = {
    path: savedPath,
    filename: basename(savedPath),
    mimeType,
    bytes: Buffer.byteLength(image.data, "base64"),
    model: values.model,
    aspectRatio: values["aspect-ratio"],
    imageSize: values["image-size"] ?? null,
    modelText: texts.join(" ") || null,
    prompt,
  };
  if (values.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(savedPath);
    console.error(`Saved ${result.bytes} bytes (${mimeType}).`);
    if (result.modelText) console.error(`Model: ${result.modelText}`);
  }
} catch (error) {
  console.error(`gemini-image-gen: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
