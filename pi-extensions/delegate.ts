/**
 * delegate — 독립 에이전트 프로세스에 태스크 위임
 *
 * 홈 에이전트(힣의 분신)가 실무 에이전트를 스폰하여 작업을 위임한다.
 * 서브에이전트가 아니라 독립 프로세스 간 대화.
 * 로컬과 리모트(SSH) 동일 패턴.
 *
 * 모드:
 *   sync  — 완료까지 블로킹, 결과 리턴. (기본)
 *   async — 스폰 후 즉시 리턴. 완료 시 분신 세션에 알림.
 *           세션이 남아 resume 가능.
 *
 * 비동기 delegate의 핵심:
 *   - 분신 세션이 --session-control로 소켓을 노출 (control.ts peer)
 *   - delegate는 소켓 없이 실행 (소켓 서버가 pi -p의 exit을 막으므로)
 *   - 완료 시 proc.on('close') → 분신에게 followUp 메시지 주입
 *   - delegate_status로 상태 조회 (pid + JSONL 파싱)
 *
 * 사용:
 *   LLM이 delegate tool 호출 → 별도 pi 프로세스 스폰
 *   /delegate "태스크" → 커맨드로 직접 실행
 *
 * 의존:
 *   - control.ts (peer extension, ~/.pi/agent/extensions/control.ts)
 *     분신 세션에 --session-control 필요 (delegate에는 불필요)
 *
 * Epic: agent-config-8sm (힣의 분신)
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawn, type ChildProcess } from "node:child_process";
import * as crypto from "node:crypto";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

// ============================================================================
// Constants
// ============================================================================

const SESSIONS_BASE = path.join(os.homedir(), ".pi", "agent", "sessions");
const DELEGATE_ENTRY_TYPE = "delegate-task";
const DEFAULT_DELEGATE_MODEL = "claude-sonnet-4-6";

/** cwd → 세션 디렉토리 경로 변환 (pi의 네이밍 규칙 준수)
 *  /home/junghan/repos/gh/dictcli → ~/.pi/agent/sessions/--home-junghan-repos-gh-dictcli--/
 */
function cwdToSessionDir(cwd: string): string {
  const normalized = cwd.replace(/\/$/, ""); // trailing slash 제거
  const dirName = "--" + normalized.replace(/^\//, "").replace(/\//g, "-") + "--";
  return path.join(SESSIONS_BASE, dirName);
}

/** taskId로 전체 sessions 디렉토리에서 delegate 세션 파일 검색 */
function findDelegateSession(taskId: string): string | null {
  // 1. active delegates에서 찾기
  const active = activeDelegates.get(taskId);
  if (active?.sessionFile) return active.sessionFile;

  // 2. 전체 sessions 디렉토리 검색
  try {
    for (const dir of fs.readdirSync(SESSIONS_BASE)) {
      const dirPath = path.join(SESSIONS_BASE, dir);
      try {
        if (!fs.statSync(dirPath).isDirectory()) continue;
        for (const file of fs.readdirSync(dirPath)) {
          if (file.includes(`delegate-${taskId}`)) {
            return path.join(dirPath, file);
          }
        }
      } catch { /* skip inaccessible dirs */ }
    }
  } catch { /* sessions base not found */ }
  return null;
}

// ============================================================================
// Types
// ============================================================================

interface DelegateResult {
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

interface AsyncDelegateInfo {
  taskId: string;
  sessionFile: string;
  pid: number;
  host: string;
  task: string;
  cwd: string;
  model?: string;
  startTime: number;
  status: "running" | "completed" | "failed";
  exitCode?: number;
  output?: string;
  error?: string;
  stopReason?: string;
  explicitExtensions?: string[];
  warnings?: string[];
}

interface AssistantMessageLike {
  role?: string;
  content?: unknown;
  usage?: { cost?: { total?: number } };
  model?: string;
  stopReason?: string;
  errorMessage?: string;
}

interface SessionAnalysis {
  lastAssistantText: string | null;
  lastError: string | null;
  lastStopReason: string | null;
  lastModel: string | null;
  turns: number;
  cost: number;
}

interface ExplicitExtensionSpec {
  name: string;
  localPath: string;
  remotePath: string;
}

// ============================================================================
// State
// ============================================================================

const activeDelegates = new Map<string, AsyncDelegateInfo & { proc?: ChildProcess }>();
const AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const PI_SETTINGS_PATH = path.join(AGENT_DIR, "settings.json");

// ============================================================================
// Helpers
// ============================================================================

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const texts: string[] = [];
  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
    ) {
      texts.push(block.text);
    }
  }
  return texts.join("\n\n");
}

function parseMessages(messages: AssistantMessageLike[]): string {
  return messages
    .filter((msg) => msg.role === "assistant")
    .map((msg) => extractTextContent(msg.content).trim())
    .filter(Boolean)
    .join("\n\n");
}

function analyzeSessionFile(sessionFile: string): SessionAnalysis {
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
        const entry = JSON.parse(line);
        if (entry.type !== "message" || entry.message?.role !== "assistant") continue;

        const msg = entry.message as AssistantMessageLike;
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
      } catch { /* skip malformed lines */ }
    }
  } catch { /* file not readable */ }

  return analysis;
}

function resolveDelegateModel(model?: string): string {
  const trimmed = model?.trim();
  return trimmed ? trimmed : DEFAULT_DELEGATE_MODEL;
}

function isClaudeModel(model?: string): boolean {
  return typeof model === "string" && /(^|\/)claude-/.test(model);
}

function resolveConfiguredPackageSource(packageNeedle: string): string | null {
  try {
    if (!fs.existsSync(PI_SETTINGS_PATH)) return null;
    const settings = JSON.parse(fs.readFileSync(PI_SETTINGS_PATH, "utf-8")) as { packages?: unknown };
    const packages = Array.isArray(settings.packages) ? settings.packages : [];
    for (const pkg of packages) {
      if (typeof pkg === "string" && pkg.includes(packageNeedle)) return pkg;
    }
  } catch { /* invalid settings */ }
  return null;
}

function resolveExplicitExtensionSpec(packageNeedle: string): ExplicitExtensionSpec | null {
  const source = resolveConfiguredPackageSource(packageNeedle);
  if (!source || source.startsWith("git:") || source.startsWith("npm:")) return null;

  const localRoot = path.resolve(AGENT_DIR, source);
  const remoteRoot = source.startsWith("/") ? source : `$HOME/.pi/agent/${source}`;
  const candidates = [
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
      return {
        name: packageNeedle,
        localPath: candidate.localPath,
        remotePath: candidate.remotePath,
      };
    }
  }

  return null;
}

function getDelegateExplicitExtensions(model: string | undefined, isRemote: boolean): {
  args: string[];
  names: string[];
  warnings: string[];
} {
  const args: string[] = [];
  const names: string[] = [];
  const warnings: string[] = [];

  if (!isClaudeModel(model)) return { args, names, warnings };

  const compat = resolveExplicitExtensionSpec("pi-claude-code-use");
  if (!compat) {
    warnings.push(
      "Claude delegate requested but pi-claude-code-use extension could not be resolved. Anthropic OAuth may fall back to extra-usage classification.",
    );
    return { args, names, warnings };
  }

  args.push("-e", isRemote ? compat.remotePath : compat.localPath);
  names.push(compat.name);
  return { args, names, warnings };
}

/** 프로세스가 살아있는지 확인 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Project context injection — 담당자 패턴
// ============================================================================

/** 대상 cwd의 AGENTS.md를 읽어 태스크에 프로젝트 컨텍스트를 주입한다.
 *  delegate가 해당 리포의 "담당자"로 동작하려면 AGENTS.md가 시스템 프롬프트에
 *  포함되어야 하지만, `pi -p --no-extensions`는 프로젝트 컨텍스트를 로드하지 않는다.
 *  따라서 태스크 앞에 AGENTS.md 내용을 명시적으로 삽입한다.
 */
function enrichTaskWithProjectContext(task: string, cwd: string): string {
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
    return task; // 읽기 실패 시 원본 태스크 유지
  }
}

// ============================================================================
// Sync delegate (기존 동작, --no-session 제거)
// ============================================================================

async function runDelegateSync(
  task: string,
  options: {
    host?: string;
    cwd?: string;
    model?: string;
    signal?: AbortSignal;
    onUpdate?: (text: string) => void;
  },
): Promise<DelegateResult> {
  const host = options.host ?? "local";
  const isRemote = host !== "local";
  const effectiveCwd = options.cwd ?? process.cwd();
  const effectiveModel = resolveDelegateModel(options.model);
  const enrichedTask = enrichTaskWithProjectContext(task, effectiveCwd);
  const taskId = crypto.randomUUID().slice(0, 8);

  // cwd 기반 세션 디렉토리 + delegate 파일명
  const sessionDir = cwdToSessionDir(effectiveCwd);
  fs.mkdirSync(sessionDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionFile = path.join(sessionDir, `${timestamp}_delegate-${taskId}.jsonl`);
  const explicitExtensions = getDelegateExplicitExtensions(effectiveModel, isRemote);

  // pi 실행 인자 — 세션 저장 + extensions 비활성화 (exit 방해 방지)
  const piArgs = [
    "--mode", "json",
    "-p",
    "--no-extensions",
    ...explicitExtensions.args,
    "--session", sessionFile,
  ];
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

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: isRemote ? undefined : (options.cwd ?? process.cwd()),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let buffer = "";
    let stderr = "";

    const processLine = (line: string) => {
      if (!line.trim()) return;
      let event: {
        type: string;
        message?: AssistantMessageLike;
        [k: string]: unknown;
      };
      try { event = JSON.parse(line); } catch { return; }

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

    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

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
        setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
      };
      if (options.signal.aborted) kill();
      else options.signal.addEventListener("abort", kill, { once: true });
    }
  });
}

// ============================================================================
// Async delegate (B안: control.ts 패턴)
// ============================================================================

async function runDelegateAsync(
  pi: ExtensionAPI,
  task: string,
  options: {
    host?: string;
    cwd?: string;
    model?: string;
  },
): Promise<{ taskId: string; sessionFile: string; pid: number }> {
  const host = options.host ?? "local";
  const isRemote = host !== "local";
  const taskId = crypto.randomUUID().slice(0, 8);
  const cwd = options.cwd ?? process.cwd();
  const effectiveModel = resolveDelegateModel(options.model);
  const enrichedTask = enrichTaskWithProjectContext(task, cwd);

  // cwd 기반 세션 디렉토리 + delegate 파일명
  const sessionDir = cwdToSessionDir(cwd);
  fs.mkdirSync(sessionDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionFile = path.join(sessionDir, `${timestamp}_delegate-${taskId}.jsonl`);
  const explicitExtensions = getDelegateExplicitExtensions(effectiveModel, isRemote);

  // pi 실행 인자
  // --no-extensions: global extensions가 이벤트 루프를 잡아 pi -p exit을 막음
  // --session-control 제외: 소켓 서버가 exit을 막음
  const piArgs = [
    "--mode", "json",
    "-p",
    "--no-extensions",
    ...explicitExtensions.args,
    "--session", sessionFile,
  ];
  piArgs.push("--model", effectiveModel);
  piArgs.push(enrichedTask);

  // 부모 세션 ID (control.ts가 설정한 환경변수)
  const parentSessionId = process.env.PI_SESSION_ID;

  let command: string;
  let args: string[];
  if (isRemote) {
    command = "ssh";
    const envPrefix = parentSessionId ? `PARENT_SESSION_ID=${parentSessionId}` : "";
    const remoteCmd = `cd ${cwd} && ${envPrefix} pi ${piArgs.map((a) => JSON.stringify(a)).join(" ")}`;
    args = [host, remoteCmd];
  } else {
    command = "pi";
    args = piArgs;
  }

  // 스폰 — detached로 독립 실행
  // stdout: "ignore" — JSONL 출력을 /dev/null로. pipe로 열면 버퍼(64KB) 초과 시 행(hang).
  //   결과는 세션 파일(JSONL)에서 읽으므로 stdout 불필요.
  // stderr: "pipe" — 에러 진단용
  const proc = spawn(command, args, {
    cwd: isRemote ? undefined : cwd,
    shell: false,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      ...(parentSessionId ? { PARENT_SESSION_ID: parentSessionId } : {}),
    },
  });

  const pid = proc.pid ?? 0;

  // 활성 delegate 등록
  const info: AsyncDelegateInfo & { proc?: ChildProcess } = {
    taskId,
    sessionFile: isRemote ? `${host}:${sessionFile}` : sessionFile,
    pid,
    host,
    task,
    cwd,
    model: effectiveModel,
    startTime: Date.now(),
    status: "running",
    explicitExtensions: [...explicitExtensions.names],
    warnings: [...explicitExtensions.warnings],
    proc,
  };
  activeDelegates.set(taskId, info);

  // 세션에 영속화
  pi.appendEntry(DELEGATE_ENTRY_TYPE, {
    taskId,
    sessionFile: info.sessionFile,
    pid,
    host,
    task,
    cwd,
    model: effectiveModel,
    startTime: info.startTime,
    explicitExtensions: info.explicitExtensions,
    warnings: info.warnings,
  });

  // stderr 수집 (에러 진단용)
  let stderr = "";
  proc.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });

  // 완료 시 분신에게 알림
  proc.on("close", (code) => {
    info.exitCode = code ?? 0;
    info.status = code === 0 ? "completed" : "failed";
    delete info.proc; // GC

    // 결과 추출
    const localSessionFile = isRemote ? null : info.sessionFile;
    if (localSessionFile && fs.existsSync(localSessionFile)) {
      const analysis = analyzeSessionFile(localSessionFile);
      if (analysis.lastModel) info.model = analysis.lastModel;
      info.stopReason = analysis.lastStopReason ?? undefined;
      info.error = analysis.lastError ?? undefined;
      if (!info.error && info.stopReason === "error") {
        info.error = "Delegate model returned stopReason=error";
      }
      if ((info.error || info.stopReason === "error") && info.exitCode === 0) {
        info.exitCode = 1;
      }
      if (info.error || info.stopReason === "error") info.status = "failed";

      info.output = analysis.lastAssistantText ?? info.error ?? stderr ?? "(no output)";
      const summaryText = analysis.lastAssistantText ?? info.error ?? `exit code ${info.exitCode}`;
      const summary = summaryText.slice(0, 2000) + (summaryText.length > 2000 ? "\n(truncated, full: session-recap)" : "");
      const meta = [
        info.explicitExtensions?.length ? `Compat: ${info.explicitExtensions.join(", ")}` : null,
        info.warnings?.length ? `Warnings: ${info.warnings.join(" | ")}` : null,
      ].filter(Boolean).join("\n");

      // 분신 세션에 followUp 메시지 주입
      try {
        pi.sendMessage(
          {
            customType: "delegate-complete",
            content: [
              `${info.status === "failed" ? "❌" : "🏁"} delegate \`${taskId}\` ${info.status} (${host}, ${analysis.turns} turns, $${analysis.cost.toFixed(4)})`,
              meta || null,
              summary,
            ].filter(Boolean).join("\n\n"),
            display: true,
            details: {
              taskId,
              host,
              status: info.status,
              turns: analysis.turns,
              cost: analysis.cost,
              error: info.error,
              stopReason: info.stopReason,
              explicitExtensions: info.explicitExtensions,
              warnings: info.warnings,
            },
          },
          { triggerTurn: true, deliverAs: "followUp" },
        );
      } catch {
        // 분신 세션이 이미 종료된 경우 무시
      }
    } else if (stderr) {
      info.error = stderr.slice(0, 500);
      info.output = info.error;
      info.status = "failed";
      try {
        pi.sendMessage(
          {
            customType: "delegate-complete",
            content: `❌ delegate \`${taskId}\` failed (${host}): ${stderr.slice(0, 300)}`,
            display: true,
            details: {
              taskId,
              host,
              status: "failed",
              error: stderr.slice(0, 500),
              explicitExtensions: info.explicitExtensions,
              warnings: info.warnings,
            },
          },
          { triggerTurn: true, deliverAs: "followUp" },
        );
      } catch { /* ignore */ }
    }
  });

  proc.on("error", (err) => {
    info.status = "failed";
    info.output = err.message;
    delete info.proc;
  });

  return { taskId, sessionFile: info.sessionFile, pid };
}

// ============================================================================
// Extension Export
// ============================================================================

export default function (pi: ExtensionAPI) {

  // --- session_start: 활성 delegate 복원 ---
  pi.on("session_start", async (_event, ctx) => {
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && (entry as { customType?: string }).customType === DELEGATE_ENTRY_TYPE) {
        const data = (entry as { data?: AsyncDelegateInfo }).data;
        if (!data?.taskId) continue;

        // 이미 추적 중이면 스킵
        if (activeDelegates.has(data.taskId)) continue;

        // 프로세스 상태 확인
        const alive = data.pid > 0 && isProcessAlive(data.pid);

        activeDelegates.set(data.taskId, {
          ...data,
          status: alive ? "running" : "completed",
        });
      }
    }
  });

  // --- delegate tool (sync + async) ---
  pi.registerTool({
    name: "delegate",
    label: "Delegate",
    description:
      "Delegate a task to an independent agent process. Spawns a separate pi instance (local or remote via SSH) and returns the result. Use when a task needs isolated execution or should run on a different machine.\n\nModes:\n- sync (default): Wait for completion, return result.\n- async: Spawn and return immediately. Get notified on completion. Use delegate_status to check progress.",
    promptSnippet: "Spawn independent agent for isolated task execution (local or SSH remote)",
    promptGuidelines: [
      "Use delegate for tasks that should run in isolation — different cwd, different machine, or resource-intensive work.",
      "For SSH remote: set host to SSH config name (e.g., 'gpu1i'). The remote must have pi installed.",
      "mode='sync' (default): Wait for completion, return result. Use for quick checks, git status, simple commands.",
      "Default delegate model: claude-sonnet-4-6.",
      "mode='async': Spawn and return immediately. Get notified on completion. Use delegate_status to check progress.",
      "async delegates save sessions — use delegate_status to check, or resume later.",
      "When a task involves research, analysis, writing, or anything that takes more than a few seconds → use async.",
      "Async delegates save sessions — use delegate_status to check, or resume later.",
      "When delegating tasks that produce notes, instruct the delegate to use llmlog (not botlog). Delegated work is agent-to-agent, not public.",
    ],
    parameters: Type.Object({
      task: Type.String({ description: "The task to delegate" }),
      host: Type.Optional(
        Type.String({ description: "SSH host (default: 'local'). e.g., 'gpu1i'" }),
      ),
      cwd: Type.Optional(
        Type.String({ description: "Working directory for the delegate" }),
      ),
      model: Type.Optional(
        Type.String({ description: "Model override (default: 'claude-sonnet-4-6'). e.g., 'claude-sonnet-4-6' or 'claude-opus-4-6'" }),
      ),
      mode: Type.Optional(
        Type.Union([Type.Literal("sync"), Type.Literal("async")], {
          description: "sync: wait for completion (default). async: return immediately with taskId.",
          default: "sync",
        }),
      ),
    }),

    async execute(toolCallId, params, signal, onUpdate) {
      const mode = params.mode ?? "sync";

      if (mode === "async") {
        const result = await runDelegateAsync(pi, params.task, {
          host: params.host,
          cwd: params.cwd,
          model: params.model,
        });

        return {
          content: [
            {
              type: "text",
              text: [
                `🚀 Async delegate spawned`,
                `Task ID: ${result.taskId}`,
                `Session: ${result.sessionFile}`,
                `PID: ${result.pid}`,
                `Host: ${params.host ?? "local"}`,
                "",
                "Use delegate_status to check progress. You'll be notified on completion.",
              ].join("\n"),
            },
          ],
          details: {
            taskId: result.taskId,
            sessionFile: result.sessionFile,
            pid: result.pid,
            host: params.host ?? "local",
            mode: "async",
          },
        };
      }

      // sync mode (기존 동작)
      const result = await runDelegateSync(params.task, {
        host: params.host,
        cwd: params.cwd,
        model: params.model,
        signal: signal ?? undefined,
        onUpdate: (text) => {
          onUpdate?.({
            content: [{ type: "text", text: `[${params.host ?? "local"}] ${text.slice(0, 200)}...` }],
          });
        },
      });

      const summary = [
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

      return {
        content: [{ type: "text", text: summary }],
        isError: result.exitCode !== 0,
        details: {
          task: result.task,
          host: result.host,
          exitCode: result.exitCode,
          turns: result.turns,
          cost: result.cost,
          model: result.model,
          sessionFile: result.sessionFile,
          error: result.error,
          stopReason: result.stopReason,
          explicitExtensions: result.explicitExtensions,
          warnings: result.warnings,
        },
      };
    },
  });

  // --- delegate_status tool ---
  pi.registerTool({
    name: "delegate_status",
    label: "Delegate Status",
    description:
      "Check status of async delegate tasks. Without taskId, lists all tracked delegates. With taskId, shows detailed status including last message.",
    parameters: Type.Object({
      taskId: Type.Optional(
        Type.String({ description: "Specific delegate task ID. Omit to list all." }),
      ),
    }),

    async execute(_toolCallId, params) {
      // 특정 태스크
      if (params.taskId) {
        const info = activeDelegates.get(params.taskId);
        if (!info) {
          return {
            content: [{ type: "text", text: `Unknown delegate task: ${params.taskId}` }],
            isError: true,
            details: { error: "not_found" },
          };
        }

        const alive = info.pid > 0 && isProcessAlive(info.pid);
        if (info.status === "running" && !alive) {
          info.status = "completed";
        }

        // 세션 파일에서 결과 추출 (로컬만)
        let lastMessage: string | null = null;
        let stats = { turns: 0, cost: 0 };
        if (info.host === "local" && fs.existsSync(info.sessionFile)) {
          const analysis = analyzeSessionFile(info.sessionFile);
          lastMessage = analysis.lastAssistantText;
          stats = { turns: analysis.turns, cost: analysis.cost };
          if (analysis.lastModel) info.model = analysis.lastModel;
          info.stopReason = analysis.lastStopReason ?? info.stopReason;
          info.error = analysis.lastError ?? info.error;
          if (!info.error && info.stopReason === "error") {
            info.error = "Delegate model returned stopReason=error";
          }
          if (info.error || info.stopReason === "error") info.status = "failed";
          if ((info.error || info.stopReason === "error") && info.exitCode === 0) info.exitCode = 1;
        }

        const elapsed = Math.round((Date.now() - info.startTime) / 1000);

        return {
          content: [
            {
              type: "text",
              text: [
                `Task: ${info.taskId}`,
                `Status: ${info.status}`,
                `Host: ${info.host}`,
                `Elapsed: ${elapsed}s`,
                `Turns: ${stats.turns}`,
                `Cost: $${stats.cost.toFixed(4)}`,
                `Session: ${info.sessionFile}`,
                info.model ? `Model: ${info.model}` : null,
                info.exitCode !== undefined ? `Exit: ${info.exitCode}` : null,
                info.stopReason ? `Stop reason: ${info.stopReason}` : null,
                info.explicitExtensions?.length ? `Compat: ${info.explicitExtensions.join(", ")}` : null,
                info.warnings?.length ? `Warnings: ${info.warnings.join(" | ")}` : null,
                info.error ? `Error: ${info.error}` : null,
                lastMessage ? `\nLast message:\n${lastMessage.slice(0, 3000)}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
          details: {
            taskId: info.taskId,
            status: info.status,
            host: info.host,
            elapsed,
            turns: stats.turns,
            cost: stats.cost,
            exitCode: info.exitCode,
            model: info.model,
            error: info.error,
            stopReason: info.stopReason,
            explicitExtensions: info.explicitExtensions,
            warnings: info.warnings,
          },
        };
      }

      // 전체 목록
      if (activeDelegates.size === 0) {
        return {
          content: [{ type: "text", text: "No active delegates." }],
          details: { count: 0 },
        };
      }

      const lines: string[] = [];
      for (const [id, info] of activeDelegates) {
        const alive = info.pid > 0 && isProcessAlive(info.pid);
        if (info.status === "running" && !alive) {
          info.status = "completed";
        }
        if (info.host === "local" && fs.existsSync(info.sessionFile)) {
          const analysis = analyzeSessionFile(info.sessionFile);
          if (analysis.lastModel) info.model = analysis.lastModel;
          info.stopReason = analysis.lastStopReason ?? info.stopReason;
          info.error = analysis.lastError ?? info.error;
          if (!info.error && info.stopReason === "error") {
            info.error = "Delegate model returned stopReason=error";
          }
          if (info.error || info.stopReason === "error") info.status = "failed";
          if ((info.error || info.stopReason === "error") && info.exitCode === 0) info.exitCode = 1;
        }
        const elapsed = Math.round((Date.now() - info.startTime) / 1000);
        const icon = info.status === "running" ? "⏳" : info.status === "completed" ? "✅" : "❌";
        const suffix = info.error ? ` — ${info.error.slice(0, 80)}` : "";
        lines.push(`${icon} ${id} [${info.host}] ${info.status} (${elapsed}s) — ${info.task.slice(0, 60)}${suffix}`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { count: activeDelegates.size },
      };
    },
  });

  // --- /delegate 커맨드 ---
  pi.registerCommand("delegate", {
    description: "Delegate task to independent agent — /delegate [async] [host:] task",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify(
          "Usage: /delegate [async] [host:] task\n" +
            "Examples:\n" +
            "  /delegate check disk space          (sync, default)\n" +
            "  /delegate async gpu1i: train model  (async, remote)\n" +
            "  /delegate async build project       (async, long-running)",
          "warning",
        );
        return;
      }

      let host = "local";
      let task = args.trim();
      let mode: "sync" | "async" = "sync";

      // async 키워드 (sync가 기본)
      if (task.startsWith("async ")) {
        mode = "async";
        task = task.slice(6).trim();
      }

      // host: task 형식
      const colonMatch = task.match(/^(\S+):\s+(.+)$/);
      if (colonMatch) {
        host = colonMatch[1];
        task = colonMatch[2];
      }

      if (mode === "async") {
        ctx.ui.notify(`🚀 Async delegating to ${host}...`, "info");
        const result = await runDelegateAsync(pi, task, { host });
        ctx.ui.notify(
          `✅ Spawned: ${result.taskId} (pid ${result.pid})\nSession: ${result.sessionFile}`,
          "info",
        );
      } else {
        ctx.ui.notify(`🚀 Delegating to ${host}...`, "info");
        const result = await runDelegateSync(task, { host });
        ctx.ui.notify(
          `✅ ${host}: ${result.turns} turns, $${result.cost.toFixed(4)}\n${result.output.slice(0, 200)}`,
          result.exitCode === 0 ? "info" : "error",
        );
      }
    },
  });

  // --- delegate_resume tool ---
  pi.registerTool({
    name: "delegate_resume",
    label: "Resume Delegate",
    description:
      "Resume a completed delegate session. Runs the delegate's saved session with an additional prompt. Use to continue work from where the delegate left off.",
    parameters: Type.Object({
      taskId: Type.String({ description: "Delegate task ID to resume" }),
      prompt: Type.String({ description: "Additional prompt to continue the work" }),
      host: Type.Optional(Type.String({ description: "SSH host override (for remote delegates)" })),
    }),

    async execute(_toolCallId, params, signal, onUpdate) {
      const info = activeDelegates.get(params.taskId);

      // taskId가 없으면 전체 sessions 디렉토리에서 검색
      let sessionFile: string | null = null;
      let host = params.host ?? "local";

      if (info) {
        sessionFile = info.sessionFile;
        host = params.host ?? info.host;
      } else {
        sessionFile = findDelegateSession(params.taskId);
      }

      if (!sessionFile) {
        return {
          content: [{ type: "text", text: `Delegate session not found: ${params.taskId}` }],
          isError: true,
          details: { error: "not_found" },
        };
      }

      // 로컬 파일 존재 확인
      const isRemote = host !== "local";
      if (!isRemote && !fs.existsSync(sessionFile)) {
        return {
          content: [{ type: "text", text: `Session file not found: ${sessionFile}` }],
          isError: true,
          details: { error: "file_not_found" },
        };
      }

      const sessionAnalysis = !isRemote && fs.existsSync(sessionFile)
        ? analyzeSessionFile(sessionFile)
        : null;
      const resumeModel = info?.model ?? sessionAnalysis?.lastModel ?? DEFAULT_DELEGATE_MODEL;
      const explicitExtensions = getDelegateExplicitExtensions(resumeModel, isRemote);

      // resume = 기존 세션에 추가 prompt로 스폰. delegate와 동일 패턴.
      const piArgs = [
        "--mode", "json",
        "-p",
        "--no-extensions",
        ...explicitExtensions.args,
        "--model", resumeModel,
        "--session", sessionFile,
        params.prompt,
      ];

      let command: string;
      let args: string[];
      if (isRemote) {
        command = "ssh";
        const remoteCmd = `pi ${piArgs.map((a) => JSON.stringify(a)).join(" ")}`;
        args = [host, remoteCmd];
      } else {
        command = "pi";
        args = piArgs;
      }

      // async로 스폰 — delegate와 동일 패턴
      const resumeTaskId = crypto.randomUUID().slice(0, 8);
      const cwd = info?.cwd ?? process.cwd();

      const proc = spawn(command, args, {
        cwd: isRemote ? undefined : cwd,
        shell: false,
        detached: true,
        stdio: ["ignore", "ignore", "pipe"],
      });

      const pid = proc.pid ?? 0;

      // 활성 delegate로 등록 (resume도 추적)
      const resumeInfo: AsyncDelegateInfo & { proc?: ChildProcess } = {
        taskId: resumeTaskId,
        sessionFile,
        pid,
        host,
        task: `resume:${params.taskId} — ${params.prompt.slice(0, 60)}`,
        cwd,
        model: resumeModel,
        startTime: Date.now(),
        status: "running",
        explicitExtensions: [...explicitExtensions.names],
        warnings: [...explicitExtensions.warnings],
        proc,
      };
      activeDelegates.set(resumeTaskId, resumeInfo);

      pi.appendEntry(DELEGATE_ENTRY_TYPE, {
        taskId: resumeTaskId,
        sessionFile,
        pid,
        host,
        task: resumeInfo.task,
        cwd,
        startTime: resumeInfo.startTime,
        model: resumeInfo.model,
        explicitExtensions: resumeInfo.explicitExtensions,
        warnings: resumeInfo.warnings,
      });

      // stderr 수집
      let stderr = "";
      proc.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });

      // 완료 시 알림
      proc.on("close", (code) => {
        resumeInfo.exitCode = code ?? 0;
        resumeInfo.status = code === 0 ? "completed" : "failed";
        delete resumeInfo.proc;

        if (!isRemote && fs.existsSync(sessionFile!)) {
          const analysis = analyzeSessionFile(sessionFile!);
          if (analysis.lastModel) resumeInfo.model = analysis.lastModel;
          resumeInfo.stopReason = analysis.lastStopReason ?? undefined;
          resumeInfo.error = analysis.lastError ?? undefined;
          if (!resumeInfo.error && resumeInfo.stopReason === "error") {
            resumeInfo.error = "Delegate model returned stopReason=error";
          }
          if ((resumeInfo.error || resumeInfo.stopReason === "error") && resumeInfo.exitCode === 0) {
            resumeInfo.exitCode = 1;
          }
          if (resumeInfo.error || resumeInfo.stopReason === "error") resumeInfo.status = "failed";

          resumeInfo.output = analysis.lastAssistantText ?? resumeInfo.error ?? stderr ?? "(no output)";
          const summaryText = analysis.lastAssistantText ?? resumeInfo.error ?? `exit code ${resumeInfo.exitCode}`;
          const summary = summaryText.slice(0, 2000) + (summaryText.length > 2000 ? "\n(truncated, full: session-recap)" : "");
          const meta = [
            resumeInfo.explicitExtensions?.length ? `Compat: ${resumeInfo.explicitExtensions.join(", ")}` : null,
            resumeInfo.warnings?.length ? `Warnings: ${resumeInfo.warnings.join(" | ")}` : null,
          ].filter(Boolean).join("\n");

          try {
            pi.sendMessage(
              {
                customType: "delegate-complete",
                content: [
                  `${resumeInfo.status === "failed" ? "❌" : "🏁"} resume \`${resumeTaskId}\` (← ${params.taskId}) ${resumeInfo.status} (${analysis.turns} turns, $${analysis.cost.toFixed(4)})`,
                  meta || null,
                  summary,
                ].filter(Boolean).join("\n\n"),
                display: true,
                details: {
                  taskId: resumeTaskId,
                  originalTaskId: params.taskId,
                  status: resumeInfo.status,
                  error: resumeInfo.error,
                  stopReason: resumeInfo.stopReason,
                  explicitExtensions: resumeInfo.explicitExtensions,
                  warnings: resumeInfo.warnings,
                },
              },
              { triggerTurn: true, deliverAs: "followUp" },
            );
          } catch { /* session already closed */ }
        }
      });

      proc.on("error", (err) => {
        resumeInfo.status = "failed";
        resumeInfo.error = err.message;
        resumeInfo.output = err.message;
        delete resumeInfo.proc;
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `🔄 Resume spawned (async)`,
              `Resume ID: ${resumeTaskId}`,
              `Original: ${params.taskId}`,
              `Session: ${sessionFile}`,
              `PID: ${pid}`,
              "",
              "Use delegate_status to check progress. You'll be notified on completion.",
            ].join("\n"),
          },
        ],
        details: { taskId: resumeTaskId, originalTaskId: params.taskId, sessionFile, pid },
      };
    },
  });

  // --- /delegate-status 커맨드 ---
  pi.registerCommand("delegate-status", {
    description: "Show status of async delegates",
    handler: async (_args, ctx) => {
      if (activeDelegates.size === 0) {
        ctx.ui.notify("No active delegates.", "info");
        return;
      }
      const lines: string[] = [];
      for (const [id, info] of activeDelegates) {
        const alive = info.pid > 0 && isProcessAlive(info.pid);
        if (info.status === "running" && !alive) {
          info.status = "completed";
        }
        if (info.host === "local" && fs.existsSync(info.sessionFile)) {
          const analysis = analyzeSessionFile(info.sessionFile);
          if (analysis.lastModel) info.model = analysis.lastModel;
          info.stopReason = analysis.lastStopReason ?? info.stopReason;
          info.error = analysis.lastError ?? info.error;
          if (!info.error && info.stopReason === "error") {
            info.error = "Delegate model returned stopReason=error";
          }
          if (info.error || info.stopReason === "error") info.status = "failed";
        }
        const elapsed = Math.round((Date.now() - info.startTime) / 1000);
        const icon = info.status === "running" ? "⏳" : info.status === "completed" ? "✅" : "❌";
        const suffix = info.error ? ` — ${info.error.slice(0, 80)}` : "";
        lines.push(`${icon} ${id} [${info.host}] ${info.status} (${elapsed}s) — ${info.task.slice(0, 60)}${suffix}`);
      }
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
