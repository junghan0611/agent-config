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

const DELEGATE_SESSION_DIR = path.join(os.homedir(), ".pi", "agent", "sessions", "--delegate--");
const DELEGATE_ENTRY_TYPE = "delegate-task";

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
  sessionFile?: string;
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
}

// ============================================================================
// State
// ============================================================================

const activeDelegates = new Map<string, AsyncDelegateInfo & { proc?: ChildProcess }>();

// ============================================================================
// Helpers
// ============================================================================

function parseMessages(messages: Array<{ role: string; content: unknown }>): string {
  const texts: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const content = msg.content;
    if (typeof content === "string") {
      texts.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && block.text) texts.push(block.text);
      }
    }
  }
  return texts.join("\n\n");
}

/** 세션 JSONL에서 마지막 어시스턴트 메시지 추출 */
function getLastAssistantFromSession(sessionFile: string): string | null {
  try {
    const content = fs.readFileSync(sessionFile, "utf-8");
    const lines = content.trim().split("\n").reverse();
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "message" && entry.message?.role === "assistant") {
          const msg = entry.message;
          if (typeof msg.content === "string") return msg.content;
          if (Array.isArray(msg.content)) {
            return msg.content
              .filter((b: { type: string; text?: string }) => b.type === "text" && b.text)
              .map((b: { text: string }) => b.text)
              .join("\n\n");
          }
        }
      } catch { /* skip malformed lines */ }
    }
  } catch { /* file not readable */ }
  return null;
}

/** 세션 JSONL에서 비용/턴 수 집계 */
function getSessionStats(sessionFile: string): { turns: number; cost: number } {
  let turns = 0;
  let cost = 0;
  try {
    const content = fs.readFileSync(sessionFile, "utf-8");
    for (const line of content.trim().split("\n")) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "message" && entry.message?.role === "assistant") {
          turns++;
          const c = entry.message?.usage?.cost?.total;
          if (typeof c === "number") cost += c;
        }
      } catch { /* skip */ }
    }
  } catch { /* file not readable */ }
  return { turns, cost };
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

  // pi 실행 인자 — 세션 저장 + extensions 비활성화 (exit 방해 방지)
  const piArgs = ["--mode", "json", "-p", "--no-extensions", "--session-dir", DELEGATE_SESSION_DIR];
  if (options.model) piArgs.push("--model", options.model);
  piArgs.push(task);

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

  const result: DelegateResult = { task, host, exitCode: 0, output: "", turns: 0, cost: 0 };
  const messages: Array<{ role: string; content: unknown }> = [];

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
        message?: { role: string; content: unknown; usage?: { cost?: { total?: number } }; model?: string };
        [k: string]: unknown;
      };
      try { event = JSON.parse(line); } catch { return; }

      if (event.type === "message_end" && event.message) {
        messages.push(event.message);
        if (event.message.role === "assistant") {
          result.turns++;
          const usage = event.message.usage;
          if (usage?.cost?.total) result.cost += usage.cost.total;
          if (event.message.model) result.model = event.message.model;
          const latest = parseMessages([event.message]);
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
      result.output = parseMessages(messages) || stderr || "(no output)";
      if (code !== 0 && stderr) result.error = stderr.slice(0, 500);
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

  // 세션 디렉토리 보장
  fs.mkdirSync(DELEGATE_SESSION_DIR, { recursive: true });

  // 세션 파일 경로 생성 (pi가 새 세션을 이 경로에 만듬)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionFile = path.join(DELEGATE_SESSION_DIR, `${timestamp}_delegate-${taskId}.jsonl`);

  // pi 실행 인자
  // --no-extensions: global extensions가 이벤트 루프를 잡아 pi -p exit을 막음
  // --session-control 제외: 소켓 서버가 exit을 막음
  const piArgs = [
    "--mode", "json",
    "-p",
    "--no-extensions",
    "--session", sessionFile,
  ];
  if (options.model) piArgs.push("--model", options.model);
  piArgs.push(task);

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
    model: options.model,
    startTime: Date.now(),
    status: "running",
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
    model: options.model,
    startTime: info.startTime,
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
      const lastMsg = getLastAssistantFromSession(localSessionFile);
      const stats = getSessionStats(localSessionFile);
      info.output = lastMsg ?? stderr ?? "(no output)";
      const summary = lastMsg
        ? lastMsg.slice(0, 500) + (lastMsg.length > 500 ? "..." : "")
        : `exit code ${code}`;

      // 분신 세션에 followUp 메시지 주입
      try {
        pi.sendMessage(
          {
            customType: "delegate-complete",
            content: `🏁 delegate \`${taskId}\` ${info.status} (${host}, ${stats.turns} turns, $${stats.cost.toFixed(4)})\n\n${summary}`,
            display: true,
            details: { taskId, host, status: info.status, turns: stats.turns, cost: stats.cost },
          },
          { triggerTurn: true, deliverAs: "followUp" },
        );
      } catch {
        // 분신 세션이 이미 종료된 경우 무시
      }
    } else if (stderr) {
      info.output = stderr.slice(0, 500);
      try {
        pi.sendMessage(
          {
            customType: "delegate-complete",
            content: `❌ delegate \`${taskId}\` failed (${host}): ${stderr.slice(0, 300)}`,
            display: true,
            details: { taskId, host, status: "failed", error: stderr.slice(0, 500) },
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
      "mode='async': Spawn and return immediately. Get notified on completion. Use delegate_status to check progress.",
      "async delegates save sessions — use delegate_status to check, or resume later.",
      "When a task involves research, analysis, writing, or anything that takes more than a few seconds → use async.",
      "Async delegates save sessions — use delegate_status to check, or resume later.",
      "When delegating tasks that produce notes, instruct the delegate to use llmlog (not botlog). Delegated work is agent-to-agent, not public.",
    ],
    parameters: Type.Object({
      task: Type.String({ description: "Task description for the delegate agent" }),
      host: Type.Optional(
        Type.String({ description: "SSH host (default: 'local'). e.g., 'gpu1i'" }),
      ),
      cwd: Type.Optional(
        Type.String({ description: "Working directory for the delegate" }),
      ),
      model: Type.Optional(
        Type.String({ description: "Model override (e.g., 'anthropic/claude-sonnet-4-6' or 'anthropic/claude-opus-4-6')" }),
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
        result.error ? `Error: ${result.error}` : null,
        "",
        result.output,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [{ type: "text", text: summary }],
        details: {
          task: result.task,
          host: result.host,
          exitCode: result.exitCode,
          turns: result.turns,
          cost: result.cost,
          model: result.model,
          sessionFile: result.sessionFile,
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

        // 상태 갱신
        if (info.status === "running" && info.pid > 0) {
          if (!isProcessAlive(info.pid)) {
            info.status = "completed";
          }
        }

        // 세션 파일에서 결과 추출 (로컬만)
        let lastMessage: string | null = null;
        let stats = { turns: 0, cost: 0 };
        if (info.host === "local" && fs.existsSync(info.sessionFile)) {
          lastMessage = getLastAssistantFromSession(info.sessionFile);
          stats = getSessionStats(info.sessionFile);
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
                info.exitCode !== undefined ? `Exit: ${info.exitCode}` : null,
                lastMessage ? `\nLast message:\n${lastMessage.slice(0, 800)}` : null,
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
        // 상태 갱신
        if (info.status === "running" && info.pid > 0 && !isProcessAlive(info.pid)) {
          info.status = "completed";
        }
        const elapsed = Math.round((Date.now() - info.startTime) / 1000);
        const icon = info.status === "running" ? "⏳" : info.status === "completed" ? "✅" : "❌";
        lines.push(`${icon} ${id} [${info.host}] ${info.status} (${elapsed}s) — ${info.task.slice(0, 60)}`);
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
      "Resume a completed delegate session. Runs the delegate's saved session with an additional prompt, synchronously. Use to continue work from where the delegate left off.",
    parameters: Type.Object({
      taskId: Type.String({ description: "Delegate task ID to resume" }),
      prompt: Type.String({ description: "Additional prompt to continue the work" }),
      host: Type.Optional(Type.String({ description: "SSH host override (for remote delegates)" })),
    }),

    async execute(_toolCallId, params, signal, onUpdate) {
      const info = activeDelegates.get(params.taskId);

      // taskId가 없으면 세션 디렉토리에서 검색
      let sessionFile: string | null = null;
      let host = params.host ?? "local";

      if (info) {
        sessionFile = info.sessionFile;
        host = params.host ?? info.host;
      } else {
        // taskId로 세션 파일 검색
        try {
          const files = fs.readdirSync(DELEGATE_SESSION_DIR);
          const match = files.find((f) => f.includes(params.taskId));
          if (match) {
            sessionFile = path.join(DELEGATE_SESSION_DIR, match);
          }
        } catch { /* dir not found */ }
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

      // resume 실행 — 동기로 결과를 받음 (이어가기이므로 블로킹이 맞음)
      const piArgs = [
        "--mode", "json",
        "-p",
        "--no-extensions",
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

      const messages: Array<{ role: string; content: unknown }> = [];
      let turns = 0;
      let cost = 0;
      let model: string | undefined;

      return new Promise((resolve) => {
        const proc = spawn(command, args, {
          cwd: isRemote ? undefined : (info?.cwd ?? process.cwd()),
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        });

        let buffer = "";
        let stderr = "";

        const processLine = (line: string) => {
          if (!line.trim()) return;
          try {
            const event = JSON.parse(line);
            if (event.type === "message_end" && event.message) {
              messages.push(event.message);
              if (event.message.role === "assistant") {
                turns++;
                const c = event.message.usage?.cost?.total;
                if (typeof c === "number") cost += c;
                if (event.message.model) model = event.message.model;
                const latest = parseMessages([event.message]);
                if (latest) {
                  onUpdate?.({
                    content: [{ type: "text", text: `[resume] ${latest.slice(0, 200)}...` }],
                  });
                }
              }
            }
          } catch { /* skip */ }
        };

        proc.stdout.on("data", (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const l of lines) processLine(l);
        });
        proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

        proc.on("close", (code) => {
          if (buffer.trim()) processLine(buffer);
          const output = parseMessages(messages) || stderr || "(no output)";

          resolve({
            content: [
              {
                type: "text",
                text: [
                  `Resumed: ${params.taskId}`,
                  `Turns: ${turns}`,
                  `Cost: $${cost.toFixed(4)}`,
                  model ? `Model: ${model}` : null,
                  code !== 0 ? `Exit: ${code}` : null,
                  "",
                  output,
                ].filter(Boolean).join("\n"),
              },
            ],
            details: { taskId: params.taskId, sessionFile, turns, cost, exitCode: code ?? 0 },
          });
        });

        proc.on("error", (err) => {
          resolve({
            content: [{ type: "text", text: `Resume failed: ${err.message}` }],
            isError: true,
            details: { error: err.message },
          });
        });

        if (signal) {
          const kill = () => {
            proc.kill("SIGTERM");
            setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
          };
          if (signal.aborted) kill();
          else signal.addEventListener("abort", kill, { once: true });
        }
      });
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
        if (info.status === "running" && info.pid > 0 && !isProcessAlive(info.pid)) {
          info.status = "completed";
        }
        const elapsed = Math.round((Date.now() - info.startTime) / 1000);
        const icon = info.status === "running" ? "⏳" : info.status === "completed" ? "✅" : "❌";
        lines.push(`${icon} ${id} [${info.host}] ${info.status} (${elapsed}s) — ${info.task.slice(0, 60)}`);
      }
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
