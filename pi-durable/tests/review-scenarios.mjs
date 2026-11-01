/** Runs only in the synthetic HOME/cwd created by review.test.mjs. Real SDK, scripted faux provider, API-0. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import aggregate from "../index.mjs";
import { context, open } from "./driver.mjs";

const { NodeExecutionEnv } = await import(pathToFileURL(path.join(
	process.env.AGENT_CONFIG_ENTWURF_DIR, "node_modules/@earendil-works/pi-durable/dist/env/node.js",
)).href);
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
git("init", "-b", "main");
writeFileSync("sample.txt", "base\n");
git("add", "sample.txt");
const commit = (message) => git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--no-gpg-sign", "-m", message);
commit("base");
const base = git("rev-parse", "HEAD");
git("switch", "-c", "topic");
writeFileSync("sample.txt", "base\ncommitted\n");
git("add", "sample.txt"); commit("topic");
writeFileSync("sample.txt", "base\ncommitted\nstaged\n"); git("add", "sample.txt");
writeFileSync("sample.txt", "base\ncommitted\nstaged\nunstaged\n");
writeFileSync("untracked.txt", "untracked\n");
mkdirSync(".pi");
writeFileSync("REVIEW_GUIDELINES.md", "Synthetic review guidelines: check the sample.\n");
mkdirSync("space folder"); writeFileSync("space folder/file.txt", "snapshot\n");
const status = git("status", "--porcelain=v1", "-uall");
const database = path.join(process.env.HOME, "test-owned.sqlite");
const environments = [];
const env = ({ cwd }) => {
	const environment = new NodeExecutionEnv({ cwd });
	environments.push(environment);
	return environment;
};
let state = await open({ extensions: [aggregate], storage: database, env });
const rootId = state.root.id;
const request = async (args) => {
	const settled = await state.say(`REVIEW ${JSON.stringify(args)}`);
	assert.equal(settled.status, "done");
	return (await state.toolResults()).at(-1);
};
try {
	const offered = (await state.root.agent(context)).tools.map((tool) => tool.name);
	assert.deepEqual(offered, ["bash_background", "bash_background_check", "review"]);
	const local = await request({ mode: "uncommitted" });
	assert.match(local, /staged, unstaged AND untracked/);
	assert.match(local, /Synthetic review guidelines/);
	assert.match(local, /Fail-fast error handling \(strict\)/);
	assert.match(local, /These callouts alone must not change the verdict/);
	const branch = await request({ mode: "branch", ref: "main" });
	assert.ok(branch.includes(`merge base with HEAD is ${base}`));
	const specific = await request({ mode: "commit", ref: "HEAD~1" });
	assert.ok(specific.includes(`commit ${base}`));
	assert.match(await request({ mode: "folder", paths: ["space folder"] }), /Snapshot review, NOT a diff/);
	// Schema boundary, semantic boundary and Git failure; no clean report on any error.
	assert.doesNotMatch(await request({ mode: "pr" }), /# Review Guidelines/);
	assert.match(await request({ mode: "branch" }), /review-ref-required/);
	assert.match(await request({ mode: "commit", ref: "absent-ref" }), /review-git-failed/);
	const before = await state.toolResults();
	assert.equal(before.length, 7);
	assert.equal(git("status", "--porcelain=v1", "-uall"), status);
	await state.harness.close(context);
	state = await open({ extensions: [aggregate], storage: database, env });
	assert.equal(state.root.id, rootId);
	const resumed = await request({ mode: "uncommitted", extra: "Reopened explicit focus" });
	assert.match(resumed, /Reopened explicit focus/);
	assert.doesNotMatch(resumed, /already in a review/i);
	assert.equal((await state.toolResults()).length, 8);
	assert.equal(git("status", "--porcelain=v1", "-uall"), status);
	console.log(JSON.stringify({ nativeToolResults: 8, sameConversation: true, worktreeUnchanged: true, vendorCalls: 0 }));
} finally {
	await state.harness.close(context);
	for (const environment of environments) await environment.cleanup(context);
}
