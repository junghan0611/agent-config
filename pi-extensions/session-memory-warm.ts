/**
 * Session-memory warm — request a local incremental before the next recall can need it.
 *
 * This is deliberately a consumer-side pulse, not a timer, daemon, or second indexer:
 * session_start asks once, session_search can top it up after a cooldown, and
 * andenken remains the sole writer/manifest authority. The current search never waits.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI, ExtensionContext, ToolResultEvent } from "@mariozechner/pi-coding-agent";

export const TOP_UP_COOLDOWN_MS = 10 * 60_000;

export type WarmLaunch = () => void;
export type Now = () => number;

type WarmGate = {
	request: () => boolean;
	requestedAt: () => number | undefined;
};

/** One process-local debounce; the launcher adds a cross-process request debounce. */
export function createWarmGate(launch: WarmLaunch, now: Now = Date.now): WarmGate {
	let lastRequestedAt: number | undefined;
	return {
		request: () => {
			const at = now();
			if (lastRequestedAt !== undefined && at - lastRequestedAt < TOP_UP_COOLDOWN_MS) return false;
			lastRequestedAt = at;
			launch();
			return true;
		},
		requestedAt: () => lastRequestedAt,
	};
}

function getSkillsDir(): string {
	if (process.env.AGENT_CONFIG_SKILLS_DIR) return process.env.AGENT_CONFIG_SKILLS_DIR;
	// setup:links places a file symlink in ~/.pi/agent/extensions. Resolve it so
	// the sibling skills directory is found in the source checkout, not under ~/.pi.
	return join(dirname(realpathSync(fileURLToPath(import.meta.url))), "..", "skills");
}

export function getWarmScriptPath(): string {
	const script = join(getSkillsDir(), "memory-sync", "scripts", "warm-local.sh");
	if (!existsSync(script)) throw new Error(`session-memory-warm: missing launcher ${script}; run ./run.sh setup:links`);
	return script;
}

/** A consumer pulse belongs only to the index authority; the writer rechecks it. */
export function isCurrentIndexAuthority(
	env: NodeJS.ProcessEnv = process.env,
	readDevice: () => string = () => readFileSync(join(env.HOME || "", ".current-device"), "utf8"),
): boolean {
	try {
		return readDevice().trim() === (env.ANDENKEN_INDEX_AUTHORITY || "thinkpad");
	} catch {
		return false;
	}
}

function launchLocalWarm(): void {
	const child = spawn(getWarmScriptPath(), [], { detached: true, stdio: "ignore" });
	// Spawn failure is an external process boundary. It must be visible, but never
	// turns a read-only recall into a blocked tool call.
	child.once("error", (error) => console.error(`[session-memory-warm] local refresh request failed: ${error.message}`));
	child.unref();
}

function sessionManifestUpdatedAt(): string | undefined {
	const dataDir = process.env.ANDENKEN_DATA || join(process.env.HOME || "", "repos", "gh", "andenken", "data");
	try {
		const parsed = JSON.parse(readFileSync(join(dataDir, "session-manifest.json"), "utf8")) as { lastUpdated?: unknown };
		return typeof parsed.lastUpdated === "string" ? parsed.lastUpdated : undefined;
	} catch {
		// The manifest is external state. Its absence/malformed form means only that
		// freshness is unknown; andenken remains responsible for index absence itself.
		return undefined;
	}
}

export function freshnessLine(updatedAt: string | undefined, requestedAt: number | undefined): string {
	const index = updatedAt ? `index ${updatedAt}` : "index timestamp unavailable";
	const requested = requestedAt === undefined ? "" : " · local refresh requested (this result may be one sync behind)";
	return `🧠 Session freshness: ${index}${requested}`;
}

export function installSessionMemoryWarm(
	pi: ExtensionAPI,
	options: {
		launch?: WarmLaunch;
		now?: Now;
		readManifestUpdatedAt?: () => string | undefined;
		isAuthority?: () => boolean;
	} = {},
): void {
	const warm = createWarmGate(options.launch ?? launchLocalWarm, options.now);
	const readManifestUpdatedAt = options.readManifestUpdatedAt ?? sessionManifestUpdatedAt;
	const isAuthority = options.isAuthority ?? isCurrentIndexAuthority;

	const request = (ctx: ExtensionContext, tolerateLaunchFailure = false) => {
		if (!isAuthority()) return;
		let requested: boolean;
		try {
			// This is the optional external-process boundary only. Keep ctx.ui outside
			// the catch: a Pi-context invariant remains a real extension failure.
			requested = warm.request();
		} catch (error) {
			if (!tolerateLaunchFailure) throw error;
			console.error(`[session-memory-warm] local refresh request failed: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}
		if (requested && ctx.hasUI) ctx.ui.setStatus("session-memory", "🧠 local session refresh requested");
	};

	// `/memory search` is a command path, not a tool_call; the per-session pulse
	// is therefore the common coverage for it and for native tool callers.
	pi.on("session_start", (_event, ctx) => request(ctx));
	pi.on("session_shutdown", (_event, ctx) => {
		if (ctx.hasUI) ctx.ui.setStatus("session-memory", undefined);
	});

	pi.on("tool_call", (event, ctx) => {
		if (event.toolName === "session_search") request(ctx, true);
	});

	pi.on("tool_result", (event: ToolResultEvent) => {
		if (event.toolName !== "session_search" || event.isError) return;
		return {
			content: [...event.content, { type: "text", text: freshnessLine(readManifestUpdatedAt(), warm.requestedAt()) }],
		};
	});
}

export default function sessionMemoryWarmExtension(pi: ExtensionAPI) {
	installSessionMemoryWarm(pi);
}
