/**
 * pi-tools-bridge — MCP adapter exposing selected pi-side tools to Claude Code.
 *
 * Registered only via piShellAcpProvider.mcpServers in pi settings. No ambient discovery.
 *
 * Phase-1 scope (currently exposed):
 *   - session_search   → andenken cli.js search-sessions
 *   - knowledge_search → andenken cli.js search-knowledge
 *   - send_to_session  → pi control.ts Unix-socket RPC
 *   - delegate         → pi-extensions/lib/delegate-core (sync mode only; single source of truth)
 *
 * Phase-2 (deferred; separate design pass required):
 *   - delegate_status, delegate_resume, list_sessions
 *   - async mode for delegate (requires taskId tracking + completion notification that MCP
 *     currently has no surface for)
 *
 * Model routing for delegate:
 *   - Claude (`claude-*`) is always routed through pi-shell-acp.
 *   - Codex (`openai-codex/*`, `gpt-5*`) goes through the built-in openai-codex provider
 *     by default; opt-in env var `PI_DELEGATE_ACP_FOR_CODEX=1` on this MCP server routes it
 *     through pi-shell-acp (with model id normalization handled by delegate-core).
 *
 * Principles:
 *   - explicit forwarding, no dynamic tool discovery
 *   - surface errors (isError:true); never silent empty results
 *   - no user-specific paths baked in; env-configurable with safe defaults
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import * as process from "node:process";

import {
  runDelegateSync,
  formatSyncSummary,
  DEFAULT_DELEGATE_MODEL,
} from "../../../pi-extensions/lib/delegate-core.js";

const HOME = os.homedir();

const DEFAULT_ANDENKEN_DIR = path.join(HOME, "repos", "gh", "andenken");
const DEFAULT_CONTROL_DIR = path.join(HOME, ".pi", "session-control");

const ANDENKEN_DIR = process.env.ANDENKEN_DIR ?? DEFAULT_ANDENKEN_DIR;
const CONTROL_DIR = process.env.PI_CONTROL_DIR ?? DEFAULT_CONTROL_DIR;
const SOCKET_SUFFIX = ".sock";

const CLI_TIMEOUT_MS = Number(process.env.PI_TOOLS_BRIDGE_CLI_TIMEOUT_MS ?? 90_000);
const RPC_TIMEOUT_MS = Number(process.env.PI_TOOLS_BRIDGE_RPC_TIMEOUT_MS ?? 5_000);

// ============================================================================
// andenken CLI resolution
// ============================================================================

interface CliTarget {
  cmd: string;
  baseArgs: string[];
  cwd: string;
}

let cachedAndenken: CliTarget | Error | null = null;

function resolveAndenken(): CliTarget {
  if (cachedAndenken instanceof Error) throw cachedAndenken;
  if (cachedAndenken) return cachedAndenken;

  const dist = path.join(ANDENKEN_DIR, "dist", "cli.js");
  const src = path.join(ANDENKEN_DIR, "cli.ts");
  const tsx = path.join(ANDENKEN_DIR, "node_modules", ".bin", "tsx");

  let target: CliTarget;
  if (existsSync(dist)) {
    target = { cmd: process.execPath, baseArgs: [dist], cwd: ANDENKEN_DIR };
  } else if (existsSync(src) && existsSync(tsx)) {
    target = { cmd: tsx, baseArgs: [src], cwd: ANDENKEN_DIR };
  } else {
    const err = new Error(
      `andenken not found. Looked for ${dist} and ${src}+tsx. ` +
        `Install andenken or set ANDENKEN_DIR env.`,
    );
    cachedAndenken = err;
    throw err;
  }
  cachedAndenken = target;
  return target;
}

interface CliResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runAndenken(args: string[]): Promise<CliResult> {
  const target = resolveAndenken();
  return new Promise((resolve, reject) => {
    const child = spawn(target.cmd, [...target.baseArgs, ...args], {
      cwd: target.cwd,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`andenken CLI timeout after ${CLI_TIMEOUT_MS}ms`));
    }, CLI_TIMEOUT_MS);
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? -1 });
    });
  });
}

async function callAndenken(
  subcommand: "search-sessions" | "search-knowledge",
  query: string,
  limit: number | undefined,
): Promise<string> {
  const args: string[] = [subcommand, query];
  if (typeof limit === "number" && Number.isFinite(limit)) {
    args.push("--limit", String(Math.max(1, Math.floor(limit))));
  }
  const r = await runAndenken(args);
  if (r.code !== 0) {
    const msg = r.stderr.trim() || r.stdout.trim() || `andenken ${subcommand} exited ${r.code}`;
    throw new Error(msg);
  }
  return r.stdout.trim();
}

// ============================================================================
// pi control-socket RPC (for send_to_session)
// ============================================================================

interface RpcResponse {
  type: "response";
  command: string;
  success: boolean;
  error?: string;
  data?: unknown;
}

async function resolveControlSocket(target: string): Promise<string> {
  try {
    await fs.access(CONTROL_DIR);
  } catch {
    throw new Error(`pi control dir not found at ${CONTROL_DIR}. Target pi needs --session-control.`);
  }

  const direct = target.endsWith(SOCKET_SUFFIX)
    ? path.join(CONTROL_DIR, target)
    : path.join(CONTROL_DIR, `${target}${SOCKET_SUFFIX}`);
  if (existsSync(direct)) return direct;

  const entries = await fs.readdir(CONTROL_DIR).catch(() => [] as string[]);
  for (const name of entries) {
    if (name === target || name === `${target}${SOCKET_SUFFIX}`) {
      return path.join(CONTROL_DIR, name);
    }
  }
  throw new Error(`No pi control socket for "${target}" under ${CONTROL_DIR}`);
}

function rpcCall(socketPath: string, payload: Record<string, unknown>): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    const conn = net.createConnection(socketPath);
    let buffer = "";
    const timer = setTimeout(() => {
      conn.destroy();
      reject(new Error(`RPC timeout (${RPC_TIMEOUT_MS}ms) to ${socketPath}`));
    }, RPC_TIMEOUT_MS);
    conn.setEncoding("utf8");
    conn.on("connect", () => {
      conn.write(`${JSON.stringify(payload)}\n`);
    });
    conn.on("data", (chunk) => {
      buffer += chunk;
      const nl = buffer.indexOf("\n");
      if (nl !== -1) {
        clearTimeout(timer);
        const line = buffer.slice(0, nl).trim();
        conn.end();
        try {
          resolve(JSON.parse(line) as RpcResponse);
        } catch {
          reject(new Error(`Invalid RPC response: ${line.slice(0, 200)}`));
        }
      }
    });
    conn.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ============================================================================
// Helpers
// ============================================================================

function textOk(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function textErr(msg: string) {
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

function applySourceFilter(rawJson: string, source: "pi" | "claude", limit: number): string {
  try {
    const obj = JSON.parse(rawJson) as { results?: Array<{ source?: string }>; count?: number };
    if (!Array.isArray(obj.results)) return rawJson;
    const filtered = obj.results.filter((r) => r.source === source).slice(0, limit);
    return JSON.stringify({ ...obj, results: filtered, count: filtered.length });
  } catch {
    return rawJson;
  }
}

// ============================================================================
// MCP server
// ============================================================================

const server = new McpServer({ name: "pi-tools-bridge", version: "0.1.0" });

server.tool(
  "session_search",
  "Semantic search over past pi + Claude Code sessions (andenken). " +
    "Returns JSON with matched chunks. Prefer over grep for finding past discussions.",
  {
    query: z.string().min(1).describe("Search query (Korean or English)"),
    limit: z.number().int().positive().max(50).optional().describe("Max results, default 8"),
    source: z.enum(["pi", "claude"]).optional().describe("Filter by source"),
  },
  async ({ query, limit, source }) => {
    const effectiveLimit = limit ?? 8;
    // Over-fetch when filtering client-side so filtered results still hit the target size.
    const fetchLimit = source ? Math.min(effectiveLimit * 4, 50) : effectiveLimit;
    try {
      let text = await callAndenken("search-sessions", query, fetchLimit);
      if (source) text = applySourceFilter(text, source, effectiveLimit);
      return textOk(text);
    } catch (err) {
      return textErr(`session_search error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
);

server.tool(
  "knowledge_search",
  "Semantic search over the org-mode knowledge base (~/org/, 3000+ notes, Korean↔English cross-lingual).",
  {
    query: z.string().min(1).describe("Search query"),
    limit: z.number().int().positive().max(50).optional().describe("Max results, default 8"),
  },
  async ({ query, limit }) => {
    try {
      const text = await callAndenken("search-knowledge", query, limit);
      return textOk(text);
    } catch (err) {
      return textErr(`knowledge_search error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
);

server.tool(
  "send_to_session",
  "Send a message to another running pi session via its control socket. " +
    "Target by sessionId or alias name. Requires the target pi to have been launched with --session-control.",
  {
    target: z.string().min(1).describe("Session id or alias registered under pi control dir"),
    message: z.string().min(1).describe("Message text to deliver"),
    mode: z.enum(["steer", "follow_up"]).optional().describe("Default follow_up"),
  },
  async ({ target, message, mode }) => {
    try {
      const sock = await resolveControlSocket(target);
      const resp = await rpcCall(sock, { type: "send", message, mode: mode ?? "follow_up" });
      if (!resp.success) {
        return textErr(`send_to_session failed: ${resp.error ?? "unknown"}`);
      }
      return textOk(`delivered to ${target}`);
    } catch (err) {
      return textErr(`send_to_session error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
);

server.tool(
  "delegate",
  "Delegate a task to an independent pi agent process (sync mode only — Phase-1 MCP scope). " +
    "Spawns a fresh pi -p run, waits for completion, returns stdout + turns + cost. Use for " +
    "isolated work (different cwd, different machine via SSH, or resource-intensive jobs) " +
    "where you want the result inline. " +
    "For async spawn / taskId tracking / delegate_status / delegate_resume, use the pi native " +
    "surface (pi-extensions/delegate.ts) directly — those are deferred to Phase-2 and not yet " +
    "exposed here. " +
    "Claude delegates are always routed through pi-shell-acp. Codex delegates go through the " +
    "built-in openai-codex provider by default; set PI_DELEGATE_ACP_FOR_CODEX=1 in this MCP " +
    "server's environment to route Codex through pi-shell-acp (delegate-core normalizes the " +
    "model id, e.g. openai-codex/gpt-5.4 → gpt-5.4, before handing to the bridge). " +
    `Default model: ${DEFAULT_DELEGATE_MODEL}. Recommended qualified forms: ` +
    "pi-shell-acp/claude-sonnet-4-6 for Claude, openai-codex/gpt-5.4 for Codex.",
  {
    task: z.string().min(1).describe("The task to delegate (plain text prompt)"),
    host: z.string().min(1).optional().describe("SSH host name (omit or 'local' for local)"),
    cwd: z.string().min(1).optional().describe("Working directory for the delegate"),
    model: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Model override. Prefer qualified: pi-shell-acp/claude-sonnet-4-6 or openai-codex/gpt-5.4.",
      ),
  },
  async ({ task, host, cwd, model }) => {
    try {
      const result = await runDelegateSync(task, { host, cwd, model });
      const text = formatSyncSummary(result);
      return result.exitCode === 0 ? textOk(text) : textErr(text);
    } catch (err) {
      return textErr(`delegate error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
);

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(`[pi-tools-bridge] fatal: ${err instanceof Error ? err.stack : err}`);
  process.exit(1);
});
