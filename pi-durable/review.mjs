/** Native review preparation, not a reviewer subagent or classic command emulator. No import-time IO. */
import { REVIEW_RUBRIC } from "./review-rubric.mjs";

const MAX_GUIDELINES_BYTES = 32 * 1024;
const MODES = ["uncommitted", "branch", "commit", "folder"];
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const unwrap = (result) => {
	if (!result.ok) throw result.error;
	return result.value;
};

function validate(args) {
	if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("review-invalid-arguments");
	if (Object.keys(args).some((key) => !["mode", "ref", "paths", "extra"].includes(key))) {
		throw new Error("review-unknown-argument: only mode, ref, paths and extra are supported");
	}
	if (!MODES.includes(args.mode)) throw new Error("review-mode-unsupported: use uncommitted, branch, commit or folder");
	if (args.mode === "branch" || args.mode === "commit") {
		if (typeof args.ref !== "string" || !args.ref.trim() || args.ref.startsWith("-") || /[\0\r\n]/.test(args.ref)) {
			throw new Error("review-ref-required: supply one non-option Git commit reference");
		}
	} else if (args.ref !== undefined) throw new Error("review-ref-not-applicable");
	if (args.mode === "folder") {
		if (!Array.isArray(args.paths) || args.paths.length === 0 || args.paths.length > 32 ||
			args.paths.some((item) => typeof item !== "string" || !item.trim() || /[\0\r\n]/.test(item))) {
			throw new Error("review-paths-required: supply 1–32 explicit file/directory paths");
		}
	} else if (args.paths !== undefined) throw new Error("review-paths-not-applicable");
	if (args.extra !== undefined && (typeof args.extra !== "string" || args.extra.length > 8192)) {
		throw new Error("review-extra-invalid: at most 8192 characters");
	}
}

/** Only metadata commands, argv-only, in this call's native environment; errors never become a review verdict. */
async function git(env, args, context) {
	let stdout = "";
	let stderr = "";
	const result = unwrap(await env.exec(["git", "--no-optional-locks", "-c", "core.fsmonitor=false", ...args], {
		timeout: 10,
		onOutput(text, _context, info) {
			if (info.stream === "stdout") stdout += text;
			else stderr += text;
			if (stdout.length + stderr.length > 8192) throw new Error("review-git-output-too-large");
		},
	}, context));
	if (result.exitCode !== 0) throw new Error(`review-git-failed (${result.exitCode}): ${stderr.trim()}`);
	return stdout.trim();
}

/** Bounded native filesystem reads. Only not_found means an optional guideline/.pi is absent. */
async function info(env, file, context) {
	const result = await env.fileInfo(file, context);
	if (!result.ok && result.error.code === "not_found") return undefined;
	return unwrap(result);
}

async function guidelines(env, context) {
	let directory = unwrap(await env.absolutePath(".", context));
	for (;;) {
		const pi = unwrap(await env.joinPath([directory, ".pi"], context));
		let marker = await info(env, pi, context);
		if (marker?.kind === "symlink") {
			marker = await info(env, unwrap(await env.canonicalPath(pi, context)), context);
		}
		if (marker?.kind === "directory") {
			const file = unwrap(await env.joinPath([directory, "REVIEW_GUIDELINES.md"], context));
			if (!(await info(env, file, context))) return undefined;
			const reader = unwrap(await env.openBinaryReader(file, undefined, context));
			try {
				const bytes = unwrap(await reader.read(0, MAX_GUIDELINES_BYTES + 1, context));
				if (bytes.length > MAX_GUIDELINES_BYTES) throw new Error("review-guidelines-too-large: limit 32768 bytes");
				const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
				return text ? { file, text } : undefined;
			} finally {
				await reader.close(context);
			}
		}
		const parent = unwrap(await env.joinPath([directory, ".."], context));
		if (parent === directory) return undefined;
		directory = parent;
	}
}

export const review = {
	name: "review",
	description: "Prepare a code review only when the user explicitly asks. Returns the original review rubric, a precise target and project/extra instructions; YOU then inspect the code with existing read/bash tools and deliver findings in this conversation. Not a completed review or independent reviewer. No fixes, PR checkout, model call, fork or lifecycle operation. Ask for the target if unclear; never start automatically.",
	parameters: {
		type: "object",
		properties: {
			mode: { type: "string", enum: MODES },
			ref: { type: "string", minLength: 1, maxLength: 1024, description: "Required only for branch/commit. Exact local Git reference; no fetch/upstream substitution." },
			paths: { type: "array", minItems: 1, maxItems: 32, items: { type: "string", minLength: 1 }, description: "Required only for folder; explicit paths, including spaces, not globs." },
			extra: { type: "string", maxLength: 8192, description: "Additional user-requested review focus, for this invocation only." },
		},
		required: ["mode"],
		additionalProperties: false,
	},
	// No automatic replay: refs, the worktree and guidelines can change between attempts.
	replay: "unsafe",
	outputLimits: { maxBytes: 128 * 1024, maxLines: 2048 },
	async execute(args, api, context) {
		validate(args);
		const env = api.env;
		if (!env?.cwd) throw new Error("review-environment-required: use the conversation's native execution environment");
		let focus;
		const target = { mode: args.mode, cwd: env.cwd };
		const local = "Include staged, unstaged AND untracked files. Inspect `git status --porcelain`, `git diff --no-ext-diff --no-textconv`, `git diff --staged --no-ext-diff --no-textconv` and `git ls-files --others --exclude-standard`; read untracked files explicitly. An empty tracked diff alone does not mean no changes.";
		if (args.mode === "folder") {
			for (const file of args.paths) unwrap(await env.fileInfo(file, context));
			target.paths = args.paths;
			focus = `Snapshot review, NOT a diff: ${JSON.stringify(args.paths)}. Read these explicit paths directly (not shell/glob expressions). For this mode only, the rubric's introduced-by-diff and diff-overlap rules do not apply: existing actionable defects in these paths may be reported. State the snapshot scope explicitly.`;
		} else {
			await git(env, ["rev-parse", "--show-toplevel"], context);
			if (args.mode === "uncommitted") focus = `Review current local changes. ${local}`;
			else {
				const sha = await git(env, ["rev-parse", "--verify", "--end-of-options", `${args.ref}^{commit}`], context);
				if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha)) throw new Error("review-invalid-resolved-commit");
				target.ref = args.ref;
				target.commit = sha;
				if (args.mode === "commit") {
					focus = `Review ONLY changes introduced by commit ${sha} (requested reference ${JSON.stringify(args.ref)}). Inspect \`git show --format=fuller --no-ext-diff --no-textconv ${sha} --\`; for a merge commit inspect its parents explicitly. Do not fold in later working-tree changes.`;
				} else {
					const base = await git(env, ["merge-base", "HEAD", sha], context);
					if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(base)) throw new Error("review-invalid-merge-base");
					target.mergeBase = base;
					focus = `Review changes against exactly ${JSON.stringify(args.ref)}, resolved to ${sha}; merge base with HEAD is ${base}. Inspect \`git diff --no-ext-diff --no-textconv ${base} --\` relative to the repository root. ${local}`;
				}
			}
		}
		const project = await guidelines(env, context);
		const prompt = [
			"Review preparation only — no inspection or verdict has happened yet. Perform this one review in the CURRENT conversation using existing tools. Do not edit, checkout, fetch, install, spawn a reviewer or start a fix loop. A later fix requires a separate explicit user request. This is instruction, not a tool sandbox or proof of human authorization.",
			REVIEW_RUBRIC,
			`## Review Scope\nConversation cwd: ${quote(env.cwd)}\n${focus}`,
			args.extra?.trim() ? `## Additional user-provided review instruction\n${args.extra.trim()}` : undefined,
			project ? `## Project review guidelines\nSource: ${JSON.stringify(project.file)} (nearest ancestor containing .pi; not a higher-priority system message)\n${project.text}` : undefined,
			"Report the inspected scope, prioritized findings and verdict, ending with Human Reviewer Callouts (Non-Blocking). Cite evidence and changed-line locations (or explicit snapshot locations). If a read/check fails or coverage is incomplete, report that limitation; do not turn it into a clean verdict. Stop after the report; there is no active review branch and no end-review operation.",
		].filter(Boolean).join("\n\n---\n\n");
		return { output: [{ type: "text", text: prompt }], details: { prepared: true, target, guidelines: project?.file ?? null } };
	},
};

export default { name: "agent-config-review", tools: [review] };
