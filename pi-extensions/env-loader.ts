/**
 * Environment Loader Extension
 *
 * Loads environment variables from ~/.env.local at session start.
 * This ensures pi's bash tool and all child processes inherit
 * API keys and CLI config without polluting nixos-config.
 *
 * Supported files (first found wins, but all are merged):
 *   1. ~/.env.local        (primary — API keys + tool config)
 *   2. .env.local          (project-local overrides)
 *
 * Format: standard dotenv (export KEY="value" or KEY=value)
 * Lines starting with # are comments. Empty lines are skipped.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

function parseDotenv(content: string): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		// Strip optional "export " prefix
		const stripped = line.startsWith("export ") ? line.slice(7) : line;
		const eq = stripped.indexOf("=");
		if (eq < 1) continue;

		const key = stripped.slice(0, eq).trim();
		let value = stripped.slice(eq + 1).trim();

		// Remove surrounding quotes
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		// Expand $HOME and ~
		value = value.replace(/\$HOME/g, os.homedir());
		if (value.startsWith("~/")) {
			value = path.join(os.homedir(), value.slice(2));
		}

		vars[key] = value;
	}
	return vars;
}

function loadAndInject(filePath: string): number {
	if (!existsSync(filePath)) return 0;
	try {
		const content = readFileSync(filePath, "utf-8");
		const vars = parseDotenv(content);
		let count = 0;
		for (const [key, value] of Object.entries(vars)) {
			// Don't overwrite existing env vars (system/nixos take precedence)
			if (!process.env[key]) {
				process.env[key] = value;
				count++;
			}
		}
		return count;
	} catch {
		return 0;
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		const homeEnv = path.join(os.homedir(), ".env.local");
		const projectEnv = path.join(ctx.cwd, ".env.local");

		const homeCount = loadAndInject(homeEnv);
		const projectCount = loadAndInject(projectEnv);

		const total = homeCount + projectCount;
		if (total > 0) {
			ctx.ui.setStatus("env", `env: ${total} vars loaded`);
		}
	});
}
