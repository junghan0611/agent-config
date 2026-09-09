/**
 * glg-footer — pi footer with device name first and the final cwd segment
 * highlighted (bright magenta + bold). Distinct from the Claude statusline's
 * bright cyan so the two harnesses are visually unambiguous at a glance.
 *
 * Mirrors the upstream default footer (`pi-mono` packages/coding-agent/src/
 * modes/interactive/components/footer.ts) for all other content. Toggle
 * individual sections via the FLAGS constants below — set any flag to false
 * to hide that part. Re-sync this file when upstream footer.ts changes.
 *
 * Deliberate divergence from upstream: the context readout is "used/window pct"
 * (Claude Code shape, e.g. 235.6K/1M 23%). Upstream footer.ts renders
 * "pct%/window" and shows no absolute figure at all. Keep this on re-sync.
 *
 * Second deliberate divergence: the model id also sits on line 1, right after
 * the git branch, and line 1 degrades from the left so it survives. Upstream
 * keeps the model on the right of line 2 only, where a narrow pane truncates it
 * away — under i3wm a tiled pi loses the one field that says which model is
 * answering. Keep this on re-sync; it is a superset of upstream, so the right
 * side of line 2 is untouched and the two can still be diffed line by line.
 *
 * ACP accounting invariants:
 * - Keep this footer on ACP: pi's default footer aggregates only usage.input/output/
 *   cacheRead/cacheWrite, which ACP deliberately leaves at zero. Its blank cells would
 *   falsely make missing accounting look like a healthy cache; tokenStats: false,
 *   cost: true, and usage.acp ?? usage preserve the ACP turn aggregate instead.
 * - If an upstream carrier adds per-request ACP fields, guard or disable the nocache
 *   badge. It needs a session accounting total, but the carrier describes only one
 *   request, so nonzero partial values would silently misstate cache efficiency.
 */

import { readFileSync } from "node:fs";

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

type AcpTokenAccounting = Pick<AssistantMessage["usage"], "input" | "output" | "cacheRead" | "cacheWrite">;
type UsageWithAcpAccounting = AssistantMessage["usage"] & { acp?: AcpTokenAccounting };

const FLAGS = {
	tokenStats: false,        // ↑input ↓output Rcache Wcache
	turnTimes: true,          // last GLG / pi message times, KST HH:MM:SS
	cost: true,               // $0.045 (sub)
	contextPct: true,         // 235.6K/1M 23%  (used/window pct)
	rightModel: true,         // model name + thinking level (+ provider) on the right
	pwdModel: true,           // model id on line 1, right after (branch)
	sessionName: true,        // • <session-name> after pwd/branch/model
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

/**
 * Context-readout token formatter, following Claude Code's convention: uppercase
 * K/M, at most one decimal, trailing ".0" dropped. 235_600 -> "235.6K",
 * 1_000_000 -> "1M", 200_000 -> "200K".
 *
 * Deliberately separate from fmtTokens above rather than replacing it. fmtTokens
 * keeps pi's lowercase "k" and rounds the tenths away at >=10k (235_600 -> "236k");
 * that discarded tenth is exactly the resolution the context readout is for. The
 * two therefore disagree on casing if FLAGS.tokenStats is ever turned back on —
 * unify by pointing the tokenStats branch here, not by widening fmtTokens.
 */
function fmtCtxTokens(count: number): string {
	if (count < 1000) return count.toString();
	const unit = count < 1_000_000 ? "K" : "M";
	const value = count < 1_000_000 ? count / 1000 : count / 1_000_000;
	return `${value.toFixed(1).replace(/\.0$/, "")}${unit}`;
}

const kstTime = new Intl.DateTimeFormat("en-GB", {
	timeZone: "Asia/Seoul",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
});

function fmtTimestamp(timestamp: number | string): string | undefined {
	const date = new Date(timestamp);
	return Number.isNaN(date.getTime()) ? undefined : kstTime.format(date);
}

function sanitize(text: string): string {
	return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

function getDeviceName(): string {
	const home = process.env.HOME || process.env.USERPROFILE;
	if (!home) return "UNKNOWN";
	try {
		return sanitize(readFileSync(`${home}/.current-device`, "utf8")) || "UNKNOWN";
	} catch {
		return "UNKNOWN";
	}
}

function splitCwd(cwd: string): [string, string] {
	const idx = cwd.lastIndexOf("/");
	if (idx < 0) return ["", cwd];
	return [cwd.slice(0, idx + 1), cwd.slice(idx + 1)];
}

export default function (pi: ExtensionAPI) {
	let lastUserTimestamp: number | string | undefined;
	let lastAssistantTimestamp: number | string | undefined;

	pi.on("session_start", async (_event, ctx) => {
		lastUserTimestamp = undefined;
		lastAssistantTimestamp = undefined;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			if (entry.message.role === "user") lastUserTimestamp = entry.timestamp;
			if (entry.message.role === "assistant") lastAssistantTimestamp = entry.timestamp;
		}

		if (!ctx.hasUI) return;
		const device = getDeviceName();
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
							const usage = (m.usage as UsageWithAcpAccounting).acp ?? m.usage;
							totalInput += usage.input;
							totalOutput += usage.output;
							totalCacheRead += usage.cacheRead;
							totalCacheWrite += usage.cacheWrite;
							totalCost += m.usage.cost.total;
						}
					}

					let pwd = ctx.sessionManager.getCwd();
					const home = process.env.HOME || process.env.USERPROFILE;
					if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
					const [pwdHead, pwdTail] = splitCwd(pwd);

					const branch = footerData.getGitBranch();
					const branchSeg = branch ? ` (${branch})` : "";
					const modelSeg = FLAGS.pwdModel ? ` · ${ctx.model?.id || "no-model"}` : "";
					let sessionSeg = "";
					if (FLAGS.sessionName) {
						const sessionName = ctx.sessionManager.getSessionName();
						if (sessionName) sessionSeg = ` • ${sessionName}`;
					}

					// The model id is the whole reason this line changed: i3wm tiles panes
					// narrow, and truncateToWidth() cuts from the end, so appending the model
					// last would delete exactly the field it was moved here to protect. So
					// yield from the left instead — session name first (it is decoration),
					// then the leading path, then the device name, and only then the
					// highlighted tail. Branch survives because GLG's request puts the model
					// beside it; model survives whenever branch+model themselves fit.
					const keepWidth = visibleWidth(branchSeg) + visibleWidth(modelSeg);
					const candidates: [string, string, string][] = [
						[`${device} ${pwdHead}`, pwdTail, sessionSeg],
						[`${device} ${pwdHead}`, pwdTail, ""],
						[`${device} `, pwdTail, ""],
						["", pwdTail, ""],
					];
					let [head, tail, session] = candidates[candidates.length - 1]!;
					for (const candidate of candidates) {
						if (visibleWidth(candidate[0]) + visibleWidth(candidate[1]) + visibleWidth(candidate[2]) + keepWidth <= width) {
							[head, tail, session] = candidate;
							break;
						}
					}
					if (visibleWidth(head) + visibleWidth(tail) + keepWidth > width) {
						tail = truncateToWidth(tail, Math.max(0, width - visibleWidth(head) - keepWidth), "…");
					}

					const pwdLine =
						theme.fg("dim", head) +
						`${HIGHLIGHT_ON}${tail}${HIGHLIGHT_OFF}` +
						theme.fg("dim", branchSeg) +
						(modelSeg ? theme.bold(theme.fg("text", modelSeg)) : "") +
						theme.fg("dim", session);

					const statsParts: string[] = [];
					if (FLAGS.turnTimes) {
						const lastUserTime = lastUserTimestamp && fmtTimestamp(lastUserTimestamp);
						const lastAssistantTime = lastAssistantTimestamp && fmtTimestamp(lastAssistantTimestamp);
						if (lastUserTime) statsParts.push(`GLG ${lastUserTime}`);
						if (lastAssistantTime) statsParts.push(`pi ${lastAssistantTime}`);
					}
					if (FLAGS.tokenStats) {
						if (totalInput) statsParts.push(`↑${fmtTokens(totalInput)}`);
						if (totalOutput) statsParts.push(`↓${fmtTokens(totalOutput)}`);
						if (totalCacheRead) statsParts.push(`R${fmtTokens(totalCacheRead)}`);
						if (totalCacheWrite) statsParts.push(`W${fmtTokens(totalCacheWrite)}`);
					}
					const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
					// Cache-efficiency badge: the actual cost paid, what it would have cost with
					// every cacheRead/cacheWrite token billed as fresh input instead ("nocache"),
					// and the ratio between the two. costVariants holds narrowest-first fallbacks
					// so render() can drop the lowest-priority piece (ratio, then nocache) first
					// when width is tight — the actual cost is never dropped.
					let costIndex = -1;
					let costVariants: string[] | undefined;
					if (FLAGS.cost && (totalCost || usingSubscription)) {
						const actualText = `$${totalCost.toFixed(3)}`;
						const subscriptionText = usingSubscription ? " (sub)" : "";
						costVariants = [`${actualText}${subscriptionText}`];
						const rates = ctx.model?.cost;
						if (rates && totalCost > 0) {
							const nocache =
								(rates.input / 1e6) * (totalInput + totalCacheRead + totalCacheWrite) +
								(rates.output / 1e6) * totalOutput;
							const ratio = nocache / totalCost;
							// ACP sessions keep pi's four per-request fields at zero (entwurf#93),
							// but carry their turn accounting aggregate on usage.acp. The accumulation
							// above prefers that aggregate, so nocache and ratio remain meaningful
							// without feeding a multi-request total back into pi's context readers.
							if (Number.isFinite(ratio) && ratio > 0) {
								const withNocache = `${actualText} ($${nocache.toFixed(3)})`;
								costVariants.push(withNocache);
								const ratioText = `×${ratio.toFixed(1)}`;
								const ratioRendered =
									ratio >= 7
										? theme.fg("success", ratioText)
										: ratio >= 3
											? theme.fg("warning", ratioText)
											: theme.fg("error", ratioText);
								costVariants.push(`${withNocache} ${ratioRendered}${subscriptionText}`);
							}
						}
						costIndex = statsParts.length;
						statsParts.push(costVariants[costVariants.length - 1]);
					}

					if (FLAGS.contextPct) {
						const usage = ctx.getContextUsage();
						const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
						const pctValue = usage?.percent ?? 0;
						// usage.tokens is pi's own absolute context estimate (ContextUsage.tokens
						// in pi-coding-agent core/extensions/types.d.ts) — read directly, NOT
						// derived from percent, so the figure keeps full resolution instead of
						// being quantized to the percentage's decimals. tokens and percent go
						// null together (e.g. right after compaction, before the next LLM
						// response), so the one null check covers both.
						//
						// Percent is floored, not rounded, to match the requested example
						// (235.6K of 1M reads "23%", since 23.56 floors to 23). Rounding would
						// print 24% there. Swap Math.floor -> Math.round below to change it;
						// the colour thresholds keep using the unrounded pctValue either way.
						const usedTokens = usage?.tokens ?? null;
						// autoCompactEnabled is not exposed to extensions; omit the "(auto)"
						// suffix entirely rather than risk showing a stale/incorrect label.
						const ctxText =
							usedTokens === null
								? `?/${fmtCtxTokens(contextWindow)}`
								: `${fmtCtxTokens(usedTokens)}/${fmtCtxTokens(contextWindow)} ${Math.floor(pctValue)}%`;
						let ctxRendered: string;
						if (pctValue > 90) ctxRendered = theme.fg("error", ctxText);
						else if (pctValue > 70) ctxRendered = theme.fg("warning", ctxText);
						else ctxRendered = ctxText;
						statsParts.push(ctxRendered);
					}

					let statsLeft = statsParts.join(" ");
					let statsLeftWidth = visibleWidth(statsLeft);
					// Degrade the cost badge one piece at a time (ratio, then nocache) before
					// falling back to a hard "..." truncation of the whole line.
					if (statsLeftWidth > width && costIndex >= 0 && costVariants) {
						for (let i = costVariants.length - 2; i >= 0 && statsLeftWidth > width; i--) {
							statsParts[costIndex] = costVariants[i];
							statsLeft = statsParts.join(" ");
							statsLeftWidth = visibleWidth(statsLeft);
						}
					}
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
					const modelRemainder = theme.bold(theme.fg("text", remainder));

					const pwdRendered = truncateToWidth(pwdLine, width, theme.fg("dim", "..."));
					const lines: string[] = [pwdRendered, dimStatsLeft + modelRemainder];

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

	pi.on("message_end", (event, ctx) => {
		if (event.message.role === "user") lastUserTimestamp = Date.now();
		else if (event.message.role === "assistant") lastAssistantTimestamp = Date.now();
		else return;
		// Request one redraw without leaving a visible extension status.
		ctx.ui.setStatus("glg-footer-turn-times", undefined);
	});
}
