/**
 * glg-footer — pi footer with the final cwd segment highlighted (bright
 * magenta + bold). Distinct from the Claude statusline's bright cyan so the
 * two harnesses are visually unambiguous at a glance.
 *
 * Mirrors the upstream default footer (`pi-mono` packages/coding-agent/src/
 * modes/interactive/components/footer.ts) for all other content. Toggle
 * individual sections via the FLAGS constants below — set any flag to false
 * to hide that part. Re-sync this file when upstream footer.ts changes.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

const FLAGS = {
	tokenStats: true,         // ↑input ↓output Rcache Wcache
	cost: true,               // $0.045 (sub)
	contextPct: true,         // 18.3%/200k (auto)
	rightModel: true,         // model name + thinking level (+ provider) on the right
	sessionName: true,        // • <session-name> after pwd/branch
	extensionStatuses: true,  // third line listing active extension statuses
};

const HIGHLIGHT_ON = "\x1b[1;35m";   // bright magenta + bold
const HIGHLIGHT_OFF = "\x1b[22;39m"; // un-bold, default fg — leaves dim/bg attrs intact

function fmtTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10_000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

function sanitize(text: string): string {
	return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

function splitCwd(cwd: string): [string, string] {
	const idx = cwd.lastIndexOf("/");
	if (idx < 0) return ["", cwd];
	return [cwd.slice(0, idx + 1), cwd.slice(idx + 1)];
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());
			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					let totalInput = 0;
					let totalOutput = 0;
					let totalCacheRead = 0;
					let totalCacheWrite = 0;
					let totalCost = 0;
					for (const e of ctx.sessionManager.getEntries()) {
						if (e.type === "message" && e.message.role === "assistant") {
							const m = e.message as AssistantMessage;
							totalInput += m.usage.input;
							totalOutput += m.usage.output;
							totalCacheRead += m.usage.cacheRead;
							totalCacheWrite += m.usage.cacheWrite;
							totalCost += m.usage.cost.total;
						}
					}

					let pwd = ctx.sessionManager.getCwd();
					const home = process.env.HOME || process.env.USERPROFILE;
					if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
					const [pwdHead, pwdTail] = splitCwd(pwd);
					const litTail = `${HIGHLIGHT_ON}${pwdTail}${HIGHLIGHT_OFF}`;
					let pwdLine = theme.fg("dim", pwdHead) + litTail;

					const branch = footerData.getGitBranch();
					if (branch) pwdLine += theme.fg("dim", ` (${branch})`);

					if (FLAGS.sessionName) {
						const sessionName = ctx.sessionManager.getSessionName();
						if (sessionName) pwdLine += theme.fg("dim", ` • ${sessionName}`);
					}

					const statsParts: string[] = [];
					if (FLAGS.tokenStats) {
						if (totalInput) statsParts.push(`↑${fmtTokens(totalInput)}`);
						if (totalOutput) statsParts.push(`↓${fmtTokens(totalOutput)}`);
						if (totalCacheRead) statsParts.push(`R${fmtTokens(totalCacheRead)}`);
						if (totalCacheWrite) statsParts.push(`W${fmtTokens(totalCacheWrite)}`);
					}
					const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
					if (FLAGS.cost && (totalCost || usingSubscription)) {
						statsParts.push(`$${totalCost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`);
					}

					if (FLAGS.contextPct) {
						const usage = ctx.getContextUsage();
						const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
						const pctValue = usage?.percent ?? 0;
						const pctText = usage?.percent != null ? pctValue.toFixed(1) : "?";
						// autoCompactEnabled is not exposed to extensions; omit the "(auto)"
						// suffix entirely rather than risk showing a stale/incorrect label.
						const ctxText =
							pctText === "?"
								? `?/${fmtTokens(contextWindow)}`
								: `${pctText}%/${fmtTokens(contextWindow)}`;
						let ctxRendered: string;
						if (pctValue > 90) ctxRendered = theme.fg("error", ctxText);
						else if (pctValue > 70) ctxRendered = theme.fg("warning", ctxText);
						else ctxRendered = ctxText;
						statsParts.push(ctxRendered);
					}

					let statsLeft = statsParts.join(" ");
					let statsLeftWidth = visibleWidth(statsLeft);
					if (statsLeftWidth > width) {
						statsLeft = truncateToWidth(statsLeft, width, "...");
						statsLeftWidth = visibleWidth(statsLeft);
					}

					let rightSide = "";
					if (FLAGS.rightModel) {
						const modelName = ctx.model?.id || "no-model";
						let rightCore = modelName;
						if (ctx.model?.reasoning) {
							const level = pi.getThinkingLevel?.() ?? "off";
							rightCore =
								level === "off" ? `${modelName} • thinking off` : `${modelName} • ${level}`;
						}
						rightSide = rightCore;

						if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
							const withProvider = `(${ctx.model.provider}) ${rightCore}`;
							if (statsLeftWidth + 2 + visibleWidth(withProvider) <= width) {
								rightSide = withProvider;
							}
						}
					}

					const rightSideWidth = visibleWidth(rightSide);
					const minPadding = 2;
					let statsLine: string;
					if (statsLeftWidth + minPadding + rightSideWidth <= width) {
						const padCount = width - statsLeftWidth - rightSideWidth;
						statsLine = statsLeft + " ".repeat(padCount) + rightSide;
					} else {
						const avail = width - statsLeftWidth - minPadding;
						if (avail > 0) {
							const truncated = truncateToWidth(rightSide, avail, "");
							const padCount = Math.max(0, width - statsLeftWidth - visibleWidth(truncated));
							statsLine = statsLeft + " ".repeat(padCount) + truncated;
						} else {
							statsLine = statsLeft;
						}
					}

					const dimStatsLeft = theme.fg("dim", statsLeft);
					const remainder = statsLine.slice(statsLeft.length);
					const dimRemainder = theme.fg("dim", remainder);

					const pwdRendered = truncateToWidth(pwdLine, width, theme.fg("dim", "..."));
					const lines: string[] = [pwdRendered, dimStatsLeft + dimRemainder];

					if (FLAGS.extensionStatuses) {
						const statuses = footerData.getExtensionStatuses();
						if (statuses.size > 0) {
							const sorted = Array.from(statuses.entries())
								.sort(([a], [b]) => a.localeCompare(b))
								.map(([, t]) => sanitize(t));
							lines.push(truncateToWidth(sorted.join(" "), width, theme.fg("dim", "...")));
						}
					}

					return lines;
				},
			};
		});
	});
}
