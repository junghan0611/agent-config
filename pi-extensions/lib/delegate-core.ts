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
 *   - explicit compat extension resolution for Claude models + opt-in Codex ACP routing
 *
 * Provider bridge routing contract:
 *   - Claude models (claude-*)            — always routed through pi-shell-acp.
 *     If pi-shell-acp can't be resolved, falls back to pi-claude-code-use, then warns.
 *   - Codex models (openai-codex/*, gpt-5*) — default is the direct openai-codex provider.
 *     Opt-in via env var `PI_DELEGATE_ACP_FOR_CODEX=1` routes Codex through pi-shell-acp,
 *     in which case `normalizeCodexDelegateModelForAcp()` strips the `openai-codex/`
 *     prefix because the bridge forwards the model id verbatim to codex-acp, which
 *     only accepts the bare backend id (e.g. `gpt-5.4`) on ChatGPT accounts.
 *
 * The `modelOverride` return field communicates this normalization to the caller so
 * the spawned pi --model matches what the downstream ACP backend expects.
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
export const DELEGATE_CODEX_ACP_ENV = "PI_DELEGATE_ACP_FOR_CODEX";

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
  /** Short id (8 hex chars) embedded in the session filename. Use this to call delegate_resume. */
  taskId: string;
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

export function isCodexModel(model?: string): boolean {
  if (typeof model !== "string") return false;
  const trimmed = model.trim();
  if (!trimmed) return false;

  const [provider, basename = trimmed] = trimmed.includes("/") ? trimmed.split("/", 2) : ["", trimmed];
  return provider === "openai-codex" || /^gpt-5([.-]|$)/.test(basename) || basename.includes("codex");
}

export function shouldRouteCodexViaAcp(model?: string): boolean {
  return isCodexModel(model) && process.env[DELEGATE_CODEX_ACP_ENV] === "1";
}

export function normalizeCodexDelegateModelForAcp(model?: string): string | undefined {
  if (!isCodexModel(model) || typeof model !== "string") return model;
  return model.startsWith("openai-codex/") ? model.slice("openai-codex/".length) : model;
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
// Explicit compat extensions (Claude + opt-in Codex ACP bridge routing)
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
): { args: string[]; names: string[]; warnings: string[]; provider?: string; modelOverride?: string } {
  const args: string[] = [];
  const names: string[] = [];
  const warnings: string[] = [];

  const wantsClaudeBridge = isClaudeModel(model);
  const wantsCodexBridge = shouldRouteCodexViaAcp(model);
  if (!wantsClaudeBridge && !wantsCodexBridge) return { args, names, warnings };

  const acpBridge = resolveExplicitExtensionSpec("pi-shell-acp");
  if (acpBridge) {
    args.push("-e", isRemote ? acpBridge.remotePath : acpBridge.localPath);
    names.push(acpBridge.name);
    return {
      args,
      names,
      warnings,
      provider: "pi-shell-acp",
      modelOverride: wantsCodexBridge ? normalizeCodexDelegateModelForAcp(model) : undefined,
    };
  }

  if (wantsClaudeBridge) {
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

  warnings.push(
    `Codex delegate requested with ${DELEGATE_CODEX_ACP_ENV}=1 but pi-shell-acp could not be resolved. Codex delegates will fall back to the default provider path.`,
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
// Saved delegate session lookup (for delegate_resume)
//
// PM-mandated layer separation: this is the *saved-session* world. It must
// NOT consult any active control-socket state. Pure filesystem walk over
// ~/.pi/agent/sessions/**/*delegate-<taskId>*.jsonl.
// ============================================================================

const DELEGATE_FILE_RE = /delegate-([0-9a-f]+)/i;

export function findDelegateSessionFile(taskId: string): string | null {
  if (!taskId || /[/\\]|\.\./.test(taskId)) return null;
  try {
    const dirs = fs.readdirSync(SESSIONS_BASE);
    for (const dir of dirs) {
      const dirPath = path.join(SESSIONS_BASE, dir);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(dirPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;

      let files: string[];
      try {
        files = fs.readdirSync(dirPath);
      } catch {
        continue;
      }
      for (const file of files) {
        if (file.includes(`delegate-${taskId}`) && file.endsWith(".jsonl")) {
          return path.join(dirPath, file);
        }
      }
    }
  } catch {
    /* sessions base missing */
  }
  return null;
}

export interface DelegateResumeOptions {
  host?: string;
  cwd?: string;
  /** Override the session's recorded model. Optional. */
  model?: string;
  signal?: AbortSignal;
  onUpdate?: (text: string) => void;
}

// ============================================================================
// Internal: spawn pi and collect message_end events.  Shared by sync + resume.
// ============================================================================

interface CollectInput {
  command: string;
  args: string[];
  cwd?: string;
  signal?: AbortSignal;
  onUpdate?: (text: string) => void;
  result: DelegateResult;
}

function collectPiRun({ command, args, cwd, signal, onUpdate, result }: CollectInput): Promise<DelegateResult> {
  const messages: AssistantMessageLike[] = [];

  return new Promise<DelegateResult>((resolve) => {
    const proc = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });

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
          if (latest && onUpdate) onUpdate(latest);
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

    if (signal) {
      const kill = () => {
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) proc.kill("SIGKILL");
        }, 5000);
      };
      if (signal.aborted) kill();
      else signal.addEventListener("abort", kill, { once: true });
    }
  });
}

// ============================================================================
// runDelegateResumeSync — revive a saved delegate session by taskId
//
// Contract:
//   - Input: taskId (8 hex chars from a prior delegate result) + prompt
//   - Looks up sessionFile via findDelegateSessionFile (pure filesystem walk)
//   - Reuses the existing session's recorded model unless caller overrides
//   - Spawns sync `pi --session <file> ... <prompt>` and waits for completion
//   - Does NOT touch ~/.pi/session-control; works regardless of whether the
//     original delegate process is still alive
//
// Verification status (planned rollout, see MEMORY.md verification roadmap):
//   1. local + Claude   — implemented, awaiting manual smoke
//   2. local + Codex    — same code path, awaiting smoke
//   3. async on Claude  — not implemented (separate design round)
//   4. async on Codex   — not implemented
//   5. remote (SSH)     — code path implemented but UNVERIFIED.
//                         Marked here because the SSH branch (cd <cwd> && pi ...)
//                         has not been exercised end-to-end against a real
//                         remote pi yet. Treat with care until smoke covers it.
// ============================================================================

export async function runDelegateResumeSync(
  taskId: string,
  prompt: string,
  options: DelegateResumeOptions,
): Promise<DelegateResult> {
  const host = options.host ?? "local";
  const isRemote = host !== "local";

  const sessionFile = findDelegateSessionFile(taskId);
  if (!sessionFile) {
    return {
      task: prompt,
      host,
      exitCode: 1,
      output: `No saved delegate session found for taskId "${taskId}" under ${SESSIONS_BASE}`,
      turns: 0,
      cost: 0,
      taskId,
      sessionFile: undefined,
      explicitExtensions: [],
      warnings: [],
      error: "session_not_found",
    };
  }

  if (!isRemote && !fs.existsSync(sessionFile)) {
    return {
      task: prompt,
      host,
      exitCode: 1,
      output: `Session file vanished between lookup and spawn: ${sessionFile}`,
      turns: 0,
      cost: 0,
      taskId,
      sessionFile,
      explicitExtensions: [],
      warnings: [],
      error: "session_file_missing",
    };
  }

  const recordedModel = !isRemote ? analyzeSessionFileLike(sessionFile).lastModel ?? undefined : undefined;
  const effectiveModel = resolveDelegateModel(options.model ?? recordedModel);
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
  piArgs.push("--model", explicitExtensions.modelOverride ?? effectiveModel);
  piArgs.push(prompt);

  let command: string;
  let args: string[];
  if (isRemote) {
    command = "ssh";
    const connectTimeout = Number.parseInt(process.env.PI_DELEGATE_SSH_CONNECT_TIMEOUT ?? "10", 10);
    const sshOptions = [
      "-o", "BatchMode=yes",
      "-o", `ConnectTimeout=${Number.isFinite(connectTimeout) && connectTimeout > 0 ? connectTimeout : 10}`,
    ];
    const remoteCmd = `cd ${options.cwd ?? "~"} && pi ${piArgs.map((a) => JSON.stringify(a)).join(" ")}`;
    args = [...sshOptions, host, remoteCmd];
  } else {
    command = "pi";
    args = piArgs;
  }

  const result: DelegateResult = {
    task: prompt,
    host,
    exitCode: 0,
    output: "",
    turns: 0,
    cost: 0,
    taskId,
    sessionFile,
    explicitExtensions: [...explicitExtensions.names],
    warnings: [...explicitExtensions.warnings],
  };

  return collectPiRun({
    command,
    args,
    cwd: isRemote ? undefined : options.cwd,
    signal: options.signal,
    onUpdate: options.onUpdate,
    result,
  });
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
  piArgs.push("--model", explicitExtensions.modelOverride ?? effectiveModel);
  piArgs.push(enrichedTask);

  let command: string;
  let args: string[];
  if (isRemote) {
    command = "ssh";
    const connectTimeout = Number.parseInt(process.env.PI_DELEGATE_SSH_CONNECT_TIMEOUT ?? "10", 10);
    const sshOptions = [
      "-o", "BatchMode=yes",
      "-o", `ConnectTimeout=${Number.isFinite(connectTimeout) && connectTimeout > 0 ? connectTimeout : 10}`,
    ];
    const remoteCmd = `cd ${options.cwd ?? "~"} && pi ${piArgs.map((a) => JSON.stringify(a)).join(" ")}`;
    args = [...sshOptions, host, remoteCmd];
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
    taskId,
    sessionFile,
    explicitExtensions: [...explicitExtensions.names],
    warnings: [...explicitExtensions.warnings],
  };

  return collectPiRun({
    command,
    args,
    cwd: isRemote ? undefined : effectiveCwd,
    signal: options.signal,
    onUpdate: options.onUpdate,
    result,
  });
}

// ============================================================================
// Shared summary formatter (used by both pi native and MCP surfaces)
// ============================================================================

export function formatSyncSummary(result: DelegateResult): string {
  return [
    `Task ID: ${result.taskId}`,
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
