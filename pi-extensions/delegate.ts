/**
 * delegate — 독립 에이전트 프로세스에 태스크 위임
 *
 * 홈 에이전트(힣의 분신)가 실무 에이전트를 스폰하여 작업을 위임한다.
 * 서브에이전트가 아니라 독립 프로세스 간 대화.
 * 로컬과 리모트(SSH) 동일 패턴.
 *
 * pi --mode json -p --no-session "태스크"
 *   → NDJSON 이벤트 스트림 파싱
 *   → 결과 수신
 *
 * 사용:
 *   LLM이 delegate tool 호출 → 별도 pi 프로세스 스폰
 *   /delegate "태스크" → 커맨드로 직접 실행
 *
 * Epic: agent-config-8sm (힣의 분신)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawn } from "node:child_process";

interface DelegateResult {
  task: string;
  host: string;
  exitCode: number;
  output: string;
  turns: number;
  cost: number;
  model?: string;
  error?: string;
}

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

async function runDelegate(
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

  // pi 실행 인자
  const piArgs = ["--mode", "json", "-p", "--no-session"];
  if (options.model) piArgs.push("--model", options.model);
  piArgs.push(task);

  // 로컬 vs SSH
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
  };

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
      let event: { type: string; message?: { role: string; content: unknown; usage?: { cost?: { total?: number } }; model?: string }; [k: string]: unknown };
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
          if (usage?.cost?.total) result.cost += usage.cost.total;
          if (event.message.model) result.model = event.message.model;

          // 스트리밍 업데이트
          const latest = parseMessages([event.message]);
          if (latest && options.onUpdate) {
            options.onUpdate(latest);
          }
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

    // 중단 지원
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

export default function (pi: ExtensionAPI) {
  // --- delegate tool ---
  pi.registerTool({
    name: "delegate",
    label: "Delegate",
    description:
      "Delegate a task to an independent agent process. Spawns a separate pi instance (local or remote via SSH) and returns the result. Use when a task needs isolated execution or should run on a different machine.",
    promptSnippet: "Spawn independent agent for isolated task execution (local or SSH remote)",
    promptGuidelines: [
      "Use delegate for tasks that should run in isolation — different cwd, different machine, or resource-intensive work.",
      "For SSH remote: set host to SSH config name (e.g., 'gpu1i'). The remote must have pi installed.",
      "The delegate runs without session — it starts fresh, executes, and returns. No memory carryover.",
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
    }),

    async execute(toolCallId, params, signal, onUpdate) {
      const result = await runDelegate(params.task, {
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
        },
      };
    },
  });

  // --- /delegate 커맨드 ---
  pi.registerCommand("delegate", {
    description: "Delegate task to independent agent — /delegate [host:] task",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /delegate [host:] task\nExample: /delegate gpu1i: check disk space", "warning");
        return;
      }

      // host: task 형식 파싱
      let host = "local";
      let task = args.trim();
      const colonMatch = task.match(/^(\S+):\s+(.+)$/);
      if (colonMatch) {
        host = colonMatch[1];
        task = colonMatch[2];
      }

      ctx.ui.notify(`🚀 Delegating to ${host}...`, "info");

      const result = await runDelegate(task, { host });

      ctx.ui.notify(
        `✅ ${host}: ${result.turns} turns, $${result.cost.toFixed(4)}\n${result.output.slice(0, 200)}`,
        result.exitCode === 0 ? "info" : "error",
      );
    },
  });
}
