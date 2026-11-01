/** Review preparation units plus an isolated real-SDK/faux-model scenario. Vendor/model APIs are never used. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, it } from "node:test";
import { fileURLToPath } from "node:url";
import extension, { review } from "../review.mjs";
import { REVIEW_RUBRIC } from "../review-rubric.mjs";

const ok = (value) => ({ ok: true, value });
const err = (code) => ({ ok: false, error: Object.assign(new Error(code), { code }) });
const text = (result) => result.output[0].text;
const roots = [];
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

function fixture({ files = {}, symlinks = {}, gitFailure = false, gitExitCode = 0, readFailure, piFailure } = {}) {
	const commands = [];
	let closed = 0;
	const env = {
		cwd: "/project/sub",
		absolutePath: async (file) => ok(path.resolve(env.cwd, file)),
		joinPath: async (parts) => ok(path.resolve(...parts)),
		canonicalPath: async (file) => ok(symlinks[file] ?? file),
		fileInfo: async (file) => {
			file = path.resolve(env.cwd, file);
			if (piFailure && file.endsWith("/.pi")) return err(piFailure);
			if (file in symlinks) return ok({ kind: "symlink" });
			if (!(file in files)) return err("not_found");
			return ok({ kind: files[file] === null ? "directory" : "file" });
		},
		openBinaryReader: async (file) => ok({
			read: async (offset, length) => readFailure ? err(readFailure) : ok(Buffer.from(files[file]).subarray(offset, offset + length)),
			close: async () => { closed++; },
		}),
		exec: async (argv, options, context) => {
			commands.push(argv);
			if (gitFailure) return err("spawn_error");
			const operation = argv[4];
			const output = operation === "merge-base" ? "b".repeat(40) : argv.includes("--verify") ? "a".repeat(40) : "/project";
			options.onOutput(output + "\n", context, { stream: "stdout" });
			return ok({ exitCode: gitExitCode });
		},
	};
	return { api: { env }, commands, closed: () => closed };
}

it("mirrors the complete original rubric exactly; no classic review changes required", () => {
	const source = readFileSync(new URL("../../pi-extensions/review.ts", import.meta.url), "utf8");
	const match = /const REVIEW_RUBRIC = (`[\s\S]*?`);\n\nasync function loadProjectReviewGuidelines/.exec(source);
	assert.ok(match, "original rubric moved — update the parity seam, not the rubric silently");
	assert.equal(REVIEW_RUBRIC, new Function(`return ${match[1]}`)());
	for (const sentence of ["Don't demand rigor inconsistent", "Were introduced in the changes", "provably affected", "These callouts alone must not change the verdict", "Fail-fast error handling (strict)"]) {
		assert.ok(REVIEW_RUBRIC.includes(sentence), sentence);
	}
});

it("is a native object with one unsafe preparation tool, no hooks/tasks/renderer/model factory", () => {
	assert.deepEqual(Object.keys(extension), ["name", "tools"]);
	assert.deepEqual(extension.tools, [review]);
	assert.equal(review.replay, "unsafe");
	assert.match(review.description, /only when the user explicitly asks/);
});

it("uncommitted scope includes staged, unstaged and untracked; no verdict/fix or session state", async () => {
	const box = fixture();
	const result = await review.execute({ mode: "uncommitted" }, box.api, {});
	assert.equal(result.content, undefined);
	assert.equal(result.details.prepared, true);
	assert.equal(result.details.target.cwd, "/project/sub");
	assert.match(text(result), /staged, unstaged AND untracked/);
	assert.match(text(result), /no inspection or verdict has happened yet/);
	assert.match(text(result), /no end-review operation/);
	assert.equal(box.commands.length, 1);
});

it("branch resolves exactly the supplied ref and merge base, includes local changes without checkout/fallback", async () => {
	const box = fixture();
	const result = await review.execute({ mode: "branch", ref: "topic'$(touch bad)" }, box.api, {});
	assert.equal(result.details.target.mergeBase, "b".repeat(40));
	assert.match(text(result), /staged, unstaged AND untracked/);
	assert.equal(box.commands[1].at(-1), "topic'$(touch bad)^{commit}");
	assert.ok(box.commands.every((command) => Array.isArray(command) && !command.includes("checkout")));
	assert.ok(!box.commands.flat().some((arg) => arg.includes("@{upstream}")));
});

it("commit scope is pinned and excludes working-tree changes", async () => {
	const result = await review.execute({ mode: "commit", ref: "HEAD~1" }, fixture().api, {});
	assert.equal(result.details.target.commit, "a".repeat(40));
	assert.match(text(result), /Review ONLY changes introduced by commit/);
	assert.match(text(result), /Do not fold in later working-tree changes/);
});

it("folder accepts space-containing paths outside Git and clearly scopes snapshot exceptions", async () => {
	const box = fixture({ files: { "/project/sub/space name": null }, gitFailure: true });
	const result = await review.execute({ mode: "folder", paths: ["space name"] }, box.api, {});
	assert.equal(box.commands.length, 0);
	assert.deepEqual(result.details.target.paths, ["space name"]);
	assert.match(text(result), /introduced-by-diff and diff-overlap rules do not apply/);
});

it("nearest .pi owns guidelines, custom extra applies only to this invocation", async () => {
	const box = fixture({ files: {
		"/project/.pi": null, "/project/REVIEW_GUIDELINES.md": "Only this project's rules",
		"/.pi": null, "/REVIEW_GUIDELINES.md": "NOT the parent rules",
	} });
	const first = await review.execute({ mode: "uncommitted", extra: "focus on back pressure" }, box.api, {});
	assert.match(text(first), /Only this project's rules/);
	assert.doesNotMatch(text(first), /NOT the parent rules/);
	assert.match(text(first), /focus on back pressure/);
	assert.equal(first.details.guidelines, "/project/REVIEW_GUIDELINES.md");
	const second = await review.execute({ mode: "uncommitted" }, box.api, {});
	assert.doesNotMatch(text(second), /focus on back pressure/);
	assert.equal(box.closed(), 2);
});

it("missing guidelines at the nearest .pi stops lookup rather than inheriting another project's rules", async () => {
	const box = fixture({ files: { "/project/.pi": null, "/.pi": null, "/REVIEW_GUIDELINES.md": "wrong" } });
	assert.equal((await review.execute({ mode: "uncommitted" }, box.api, {})).details.guidelines, null);
});

it("a symlinked .pi directory retains the original lookup semantics", async () => {
	const box = fixture({
		symlinks: { "/project/.pi": "/shared/pi" },
		files: { "/shared/pi": null, "/project/REVIEW_GUIDELINES.md": "symlink rules" },
	});
	assert.match(text(await review.execute({ mode: "uncommitted" }, box.api, {})), /symlink rules/);
});

for (const [label, options, expected] of [
	["git execution failure", { gitFailure: true }, /spawn_error/],
	["git nonzero exit", { gitExitCode: 128 }, /review-git-failed \(128\)/],
	["invalid UTF-8", { files: { "/project/.pi": null, "/project/REVIEW_GUIDELINES.md": Buffer.from([0xff]) } }, /encoded data/],
	[".pi permission failure", { piFailure: "permission_denied" }, /permission_denied/],
	["guidelines read failure", { files: { "/project/.pi": null, "/project/REVIEW_GUIDELINES.md": "rules" }, readFailure: "permission_denied" }, /permission_denied/],
	["oversize guidelines", { files: { "/project/.pi": null, "/project/REVIEW_GUIDELINES.md": "x".repeat(32769) } }, /review-guidelines-too-large/],
]) it(`${label} propagates, never becomes no-findings`, async () => {
	const box = fixture(options);
	await assert.rejects(review.execute({ mode: "uncommitted" }, box.api, {}), expected);
	if (options.files) assert.equal(box.closed(), 1);
});

for (const args of [
	{}, { mode: "pr" }, { mode: "branch" }, { mode: "commit", ref: "--help" },
	{ mode: "commit", ref: "a\nHEAD" }, { mode: "folder", paths: [] }, { mode: "folder", paths: ["\0"] },
	{ mode: "uncommitted", ref: "HEAD" }, { mode: "commit", ref: "HEAD", paths: ["."] },
	{ mode: "uncommitted", loopFixing: true }, { mode: "uncommitted", freshSession: true },
	{ mode: "uncommitted", extra: "x".repeat(8193) },
]) it(`rejects unsupported/inconsistent arguments ${JSON.stringify(args).slice(0, 100)} before any IO`, async () => {
	const box = fixture();
	await assert.rejects(review.execute(args, box.api, {}), /review-/);
	assert.equal(box.commands.length, 0);
});

it("missing native environment and missing snapshot path fail loudly", async () => {
	await assert.rejects(review.execute({ mode: "uncommitted" }, {}, {}), /review-environment-required/);
	await assert.rejects(review.execute({ mode: "folder", paths: ["absent"] }, fixture().api, {}), /not_found/);
});

const ENTWURF = process.env.AGENT_CONFIG_ENTWURF_DIR ?? path.join(homedir(), "repos", "gh", "entwurf");
const SDK = path.join(ENTWURF, "node_modules/@earendil-works/pi-durable/dist/index.js");
it("[prerequisite] built Entwurf durable SDK exists", () => {
	assert.ok(existsSync(SDK), `entwurf-checkout-missing: ${SDK}`);
});
it("real SDK validates, dispatches native review and stores output; same-id reopen has no active review state", { skip: !existsSync(SDK) && "entwurf-checkout-missing (prerequisite fails)" }, () => {
	const root = mkdtempSync(path.join(tmpdir(), "durable-review-"));
	roots.push(root);
	const home = path.join(root, "home");
	const cwd = path.join(root, "project");
	mkdirSync(home); mkdirSync(cwd);
	const result = spawnSync(process.execPath, [fileURLToPath(new URL("./review-scenarios.mjs", import.meta.url))], {
		cwd, env: { PATH: process.env.PATH, HOME: home, AGENT_CONFIG_ENTWURF_DIR: ENTWURF },
		encoding: "utf8", timeout: 60_000,
	});
	assert.equal(result.status, 0, result.stderr);
	const receipt = JSON.parse(result.stdout.trim().split("\n").at(-1));
	assert.equal(receipt.nativeToolResults, 8);
	assert.equal(receipt.sameConversation, true);
	assert.equal(receipt.worktreeUnchanged, true);
	assert.equal(receipt.vendorCalls, 0);
});
