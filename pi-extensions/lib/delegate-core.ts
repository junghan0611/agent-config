/**
 * delegate-core — sync delegate execution, host-agnostic.
 *
 * Single implementation shared by:
 *   - pi-extensions/delegate.ts (pi native tool surface)
 *   - mcp/pi-tools-bridge/src/index.ts (MCP tool surface for ACP hosts)
 *
 * This module MUST NOT import anything from @mariozechner/pi-coding-agent or any
 * other pi runtime API. It is pure Node + @sinclair/typebox-free.  Anything that
 * requires pi's ExtensionAPI (sendMessage, appendEntry, sessionManager) belongs
 * in the async delegate path, which stays in pi-extensions/delegate.ts for now.
 *
 * Scope:
 *   - sync execution (spawn pi, collect message_end events, return summary)
 *   - local and SSH-remote hosts
 *   - project-context injection (cwd/AGENTS.md)
 *   - explicit compat extension resolution for claude-* models (pi-shell-acp etc.)
 */

import { spawn } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ============================================================================
// Constants
// ============================================================================

const AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const PI_SETTINGS_PATH = path.join(AGENT_DIR, "settings.json");
const SESSIONS_BASE = path.join(AGENT_DIR, "sessions");
export const DEFAULT_DELEGATE_MODEL = "openai-codex/gpt-5.4";

// ============================================================================
// Types
// ============================================================================

export interface DelegateSyncOptions {
  host?: string;
  cwd?: string;
  model?: string;
  signal?: AbortSignal;
  onUpdate?: (text: string) => void;
}

export interface DelegateResult {
  task: string;
  host: string;
  exitCode: number;
  output: string;
  turns: number;
  cost: number;
  model?: string;
  error?: string;
  stopReason?: string;
  sessionFile?: string;
  explicitExtensions: string[];
  warnings: string[];
}

export interface AssistantMessageLike {
  role?: string;
  content?: unknown;
  usage?: { cost?: { total?: number } };
  model?: string;
  stopReason?: string;
  errorMessage?: string;
}

export interface SessionAnalysis {
  lastAssistantText: string | null;
  lastError: string | null;
  lastStopReason: string | null;
  lastModel: string | null;
  turns: number;
  cost: number;
}

export interface ExplicitExtensionSpec {
  name: string;
  localPath: string;
  remotePath: string;
}

// ============================================================================
// Path / model helpers
// ============================================================================

export function cwdToSessionDir(cwd: string): string {
  const normalized = cwd.replace(/\/$/, "");
  const dirName = "--" + normalized.replace(/^\//, "").replace(/\//g, "-") + "--";
  return path.join(SESSIONS_BASE, dirName);
}

export function resolveDelegateModel(model?: string): string {
  const trimmed = model?.trim();
  return trimmed ? trimmed : DEFAULT_DELEGATE_MODEL;
}

export function isClaudeModel(model?: string): boolean {
  return typeof model === "string" && /(^|\/)claude-/.test(model);
}

// ============================================================================
// Content extraction
// ============================================================================

export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const texts: string[] = [];
  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      (block as { type?: unknown }).type === "text" &&
      "text" in block &&
      typeof (block as { text?: unknown }).text === "string"
    ) {
      texts.push((block as { text: string }).text);
    }
  }
  return texts.join("\n\n");
}

export function parseMessages(messages: AssistantMessageLike[]): string {
  return messages
    .filter((msg) => msg.role === "assistant")
    .map((msg) => extractTextContent(msg.content).trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Parse a pi session JSONL file and extract the latest assistant state.
 * Pure file I/O — safe to use from MCP bridge or pi runtime.
 */
export function analyzeSessionFileLike(sessionFile: string): SessionAnalysis {
  const analysis: SessionAnalysis = {
    lastAssistantText: null,
    lastError: null,
    lastStopReason: null,
    lastModel: null,
    turns: 0,
    cost: 0,
  };

  try {
    const content = fs.readFileSync(sessionFile, "utf-8");
    for (const line of content.trim().split("\n")) {
      try {
        const entry = JSON.parse(line) as { type?: string; message?: AssistantMessageLike };
        if (entry.type !== "message" || entry.message?.role !== "assistant") continue;

        const msg = entry.message;
        analysis.turns++;

        const text = extractTextContent(msg.content).trim();
        if (text) analysis.lastAssistantText = text;
        if (typeof msg.errorMessage === "string" && msg.errorMessage.trim()) {
          analysis.lastError = msg.errorMessage.trim();
        }
        if (typeof msg.stopReason === "string") analysis.lastStopReason = msg.stopReason;
        if (typeof msg.model === "string") analysis.lastModel = msg.model;

        const c = msg.usage?.cost?.total;
        if (typeof c === "number") analysis.cost += c;
      } catch {
        /* skip malformed lines */
      }
    }
  } catch {
    /* file not readable */
  }

  return analysis;
}

// ============================================================================
// Explicit compat extensions (claude-* models need a provider bridge)
// ============================================================================

function resolveConfiguredPackageSource(packageNeedle: string): string | null {
  try {
    if (!fs.existsSync(PI_SETTINGS_PATH)) return null;
    const settings = JSON.parse(fs.readFileSync(PI_SETTINGS_PATH, "utf-8")) as { packages?: unknown };
    const packages = Array.isArray(settings.packages) ? settings.packages : [];
    for (const pkg of packages) {
      if (typeof pkg === "string" && pkg.includes(packageNeedle)) return pkg;
    }
  } catch {
    /* invalid settings */
  }
  return null;
}

function resolveExplicitExtensionSpec(packageNeedle: string): ExplicitExtensionSpec | null {
  const source = resolveConfiguredPackageSource(packageNeedle);
  if (!source || source.startsWith("git:") || source.startsWith("npm:")) return null;

  const localRoot = path.resolve(AGENT_DIR, source);
  const remoteRoot = source.startsWith("/") ? source : `$HOME/.pi/agent/${source}`;
  const candidates = [
    { localPath: localRoot, remotePath: remoteRoot },
    { localPath: path.join(localRoot, "index.ts"), remotePath: `${remoteRoot}/index.ts` },
    {
      localPath: path.join(localRoot, "extensions", "index.ts"),
      remotePath: `${remoteRoot}/extensions/index.ts`,
    },
    {
      localPath: path.join(localRoot, "dist", "extensions", "index.js"),
      remotePath: `${remoteRoot}/dist/extensions/index.js`,
    },
    {
      localPath: path.join(localRoot, "dist", "index.js"),
      remotePath: `${remoteRoot}/dist/index.js`,
    },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.localPath)) {
      return { name: packageNeedle, localPath: candidate.localPath, remotePath: candidate.remotePath };
    }
  }
  return null;
}

export function getDelegateExplicitExtensions(
  model: string | undefined,
  isRemote: boolean,
): { args: string[]; names: string[]; warnings: string[]; provider?: string } {
  const args: string[] = [];
  const names: string[] = [];
  const warnings: string[] = [];

  if (!isClaudeModel(model)) return { args, names, warnings };

  const acpBridge = resolveExplicitExtensionSpec("pi-shell-acp");
  if (acpBridge) {
    args.push("-e", isRemote ? acpBridge.remotePath : acpBridge.localPath);
    names.push(acpBridge.name);
    return { args, names, warnings, provider: "pi-shell-acp" };
  }

  const compat = resolveExplicitExtensionSpec("pi-claude-code-use");
  if (compat) {
    args.push("-e", isRemote ? compat.remotePath : compat.localPath);
    names.push(compat.name);
    return { args, names, warnings };
  }

  warnings.push(
    "Claude delegate requested but pi-shell-acp could not be resolved. Claude delegates may fail without an explicit provider bridge.",
  );
  return { args, names, warnings };
}

// ============================================================================
// Project-context injection (담당자 패턴)
// ============================================================================

export function enrichTaskWithProjectContext(task: string, cwd: string): string {
  const agentsPath = path.join(cwd, "AGENTS.md");
  try {
    if (!fs.existsSync(agentsPath)) return task;
    const content = fs.readFileSync(agentsPath, "utf-8");
    if (!content.trim()) return task;
    return [
      `<project-context path="${agentsPath}">`,
      content.trim(),
      `</project-context>`,
      "",
      task,
    ].join("\n");
  } catch {
    return task;
  }
}

// ============================================================================
// runDelegateSync — spawn pi and collect result
// ============================================================================

export async function runDelegateSync(task: string, options: DelegateSyncOptions): Promise<DelegateResult> {
  const host = options.host ?? "local";
  const isRemote = host !== "local";
  const effectiveCwd = options.cwd ?? process.cwd();
  const effectiveModel = resolveDelegateModel(options.model);
  const enrichedTask = enrichTaskWithProjectContext(task, effectiveCwd);
  const taskId = crypto.randomUUID().slice(0, 8);

  const sessionDir = cwdToSessionDir(effectiveCwd);
  fs.mkdirSync(sessionDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionFile = path.join(sessionDir, `${timestamp}_delegate-${taskId}.jsonl`);
  const explicitExtensions = getDelegateExplicitExtensions(effectiveModel, isRemote);

  const piArgs = [
    "--mode",
    "json",
    "-p",
    "--no-extensions",
    ...explicitExtensions.args,
    "--session",
    sessionFile,
  ];
  if (explicitExtensions.provider) piArgs.push("--provider", explicitExtensions.provider);
  piArgs.push("--model", effectiveModel);
  piArgs.push(enrichedTask);

  let command: string;
  let args: string[];
  if (isRemote) {
    command = "ssh";
    const remoteCmd = `cd ${options.cwd ?? "~"} && pi ${piArgs.map((a) => JSON.stringify(a)).join(" ")}`;
    args = [host, remoteCmd];
  } else {
    command = "pi";
    args = piArgs;
  }

  const result: DelegateResult = {
    task,
    host,
    exitCode: 0,
    output: "",
    turns: 0,
    cost: 0,
    sessionFile,
    explicitExtensions: [...explicitExtensions.names],
    warnings: [...explicitExtensions.warnings],
  };
  const messages: AssistantMessageLike[] = [];

  return new Promise<DelegateResult>((resolve) => {
    const proc = spawn(command, args, {
      cwd: isRemote ? undefined : effectiveCwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let buffer = "";
    let stderr = "";

    const processLine = (line: string) => {
      if (!line.trim()) return;
      let event: { type: string; message?: AssistantMessageLike; [k: string]: unknown };
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }

      if (event.type === "message_end" && event.message) {
        messages.push(event.message);
        if (event.message.role === "assistant") {
          result.turns++;
          const usage = event.message.usage;
          if (typeof usage?.cost?.total === "number") result.cost += usage.cost.total;
          if (event.message.model) result.model = event.message.model;
          if (typeof event.message.stopReason === "string") result.stopReason = event.message.stopReason;
          if (typeof event.message.errorMessage === "string" && event.message.errorMessage.trim()) {
            result.error = event.message.errorMessage.trim();
          }

          const latest = extractTextContent(event.message.content).trim();
          if (latest && options.onUpdate) options.onUpdate(latest);
        }
      }
    };

    proc.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) processLine(line);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (buffer.trim()) processLine(buffer);
      result.exitCode = code ?? 0;
      if (!result.error && result.stopReason === "error") {
        result.error = "Delegate model returned stopReason=error";
      }
      const assistantText = parseMessages(messages).trim();
      result.output = assistantText || result.error || stderr || "(no output)";
      if (code !== 0 && stderr && !result.error) result.error = stderr.slice(0, 500);
      if ((result.error || result.stopReason === "error") && result.exitCode === 0) result.exitCode = 1;
      resolve(result);
    });

    proc.on("error", (err) => {
      result.exitCode = 1;
      result.error = err.message;
      result.output = "(spawn failed)";
      resolve(result);
    });

    if (options.signal) {
      const kill = () => {
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) proc.kill("SIGKILL");
        }, 5000);
      };
      if (options.signal.aborted) kill();
      else options.signal.addEventListener("abort", kill, { once: true });
    }
  });
}

// ============================================================================
// Shared summary formatter (used by both pi native and MCP surfaces)
// ============================================================================

export function formatSyncSummary(result: DelegateResult): string {
  return [
    `Host: ${result.host}`,
    `Turns: ${result.turns}`,
    `Cost: $${result.cost.toFixed(4)}`,
    result.model ? `Model: ${result.model}` : null,
    result.stopReason ? `Stop reason: ${result.stopReason}` : null,
    result.explicitExtensions.length ? `Compat: ${result.explicitExtensions.join(", ")}` : null,
    result.warnings.length ? `Warnings: ${result.warnings.join(" | ")}` : null,
    result.error ? `Error: ${result.error}` : null,
    "",
    result.output,
  ]
    .filter(Boolean)
    .join("\n");
}
