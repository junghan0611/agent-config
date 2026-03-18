/**
 * peon-ping Extension for pi
 *
 * Bridges pi lifecycle events to peon-ping (peon.sh) for sound notifications,
 * desktop notifications, and mobile push (ntfy/pushover/telegram).
 *
 * Reuses the existing peon-ping installation at ~/.claude/hooks/peon-ping/
 * No additional dependencies required.
 *
 * Per-project sound packs:
 *   Create .pi/peon-ping.json in any repo with {"active_pack": "sc_scv"}
 *   This is symlinked to .claude/hooks/peon-ping/config.json at session start
 *   so peon.sh picks it up via its native project-local config support.
 *
 * Event mapping:
 *   pi session_start       → peon SessionStart   (session.start sound)
 *   pi before_agent_start  → peon UserPromptSubmit (task.acknowledge)
 *   pi agent_end           → peon Stop            (task.complete + notification)
 *   pi session_shutdown     → peon SessionEnd      (cleanup)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, symlinkSync, readlinkSync, unlinkSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PEON_DIR =
	process.env.CLAUDE_PEON_DIR ||
	path.join(process.env.HOME ?? "", ".claude", "hooks", "peon-ping");
const PEON_SH = path.join(PEON_DIR, "peon.sh");

/** Stable session ID — pi doesn't expose one, so we generate per-process. */
const SESSION_ID = `pi-${crypto.randomUUID()}`;

/**
 * Bridge .pi/peon-ping.json → .claude/hooks/peon-ping/config.json
 * peon.sh already checks ${PWD}/.claude/hooks/peon-ping/config.json for
 * project-local overrides. We symlink from .pi/peon-ping.json so pi
 * projects don't need a .claude/ directory.
 */
function bridgeProjectConfig(cwd: string): void {
	const piConfig = path.join(cwd, ".pi", "peon-ping.json");
	if (!existsSync(piConfig)) return;

	const claudeDir = path.join(cwd, ".claude", "hooks", "peon-ping");
	const claudeConfig = path.join(claudeDir, "config.json");

	// Already correct symlink?
	try {
		if (readlinkSync(claudeConfig) === piConfig) return;
		unlinkSync(claudeConfig);
	} catch {
		/* doesn't exist yet */
	}

	mkdirSync(claudeDir, { recursive: true });
	symlinkSync(piConfig, claudeConfig);
}

function firePeon(hookEvent: string, extra: Record<string, unknown> = {}): void {
	if (!existsSync(PEON_SH)) return;

	const cwd = process.cwd();
	const payload = JSON.stringify({
		hook_event_name: hookEvent,
		session_id: SESSION_ID,
		cwd,
		...extra,
	});

	const child = execFile(
		"bash",
		[PEON_SH],
		{ timeout: 10_000, cwd, env: { ...process.env, CLAUDE_PEON_DIR: PEON_DIR } },
		() => {
			/* ignore errors — sound is best-effort */
		},
	);
	child.stdin?.write(payload);
	child.stdin?.end();
}

export default function (pi: ExtensionAPI) {
	if (!existsSync(PEON_SH)) {
		return; // peon-ping not installed — silently skip
	}

	// --- Session greeting + project config bridge ---
	pi.on("session_start", async () => {
		bridgeProjectConfig(process.cwd());
		firePeon("SessionStart", { source: "new" });
	});

	// --- User submitted a prompt (task acknowledged) ---
	pi.on("before_agent_start", async () => {
		firePeon("UserPromptSubmit");
	});

	// --- Agent finished (task complete → sound + desktop/mobile notification) ---
	pi.on("agent_end", async () => {
		firePeon("Stop");
	});

	// --- Session cleanup ---
	pi.on("session_shutdown", async () => {
		firePeon("SessionEnd");
	});
}
