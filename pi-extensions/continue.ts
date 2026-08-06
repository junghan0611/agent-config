import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Send a literal continuation prompt, but never steer or queue one mid-run.
 *
 * The manual counterpart to goal.ts: this nudges one turn by hand, goal.ts keeps
 * nudging until the objective is met.
 *
 * Upstream: earendil-works/agent-stuff extensions/continue.ts, unmodified.
 */
export default function (pi: ExtensionAPI) {
	pi.registerShortcut("shift+alt+enter", {
		description: 'Send "continue" when the agent is stopped',
		handler: (ctx) => {
			// isIdle() also remains false while Pi is retrying, compacting, or has
			// queued messages, so this cannot accidentally create a follow-up.
			if (!ctx.isIdle()) return;
			pi.sendUserMessage("continue");
		},
	});
}
