/**
 * Test driver for background-bash.mjs against the real durable SDK — imported ONLY inside a child node whose
 * HOME and cwd are synthetic (tests/background.test.mjs builds them). It opens a real `Harness` on
 * MemoryStorage or a test-owned temporary SQLite file, with pi-ai's faux provider as the only model: no
 * network, no credential, no model turn of any vendor.
 *
 * The SDK comes from the Entwurf checkout (AGENT_CONFIG_ENTWURF_DIR), imported by absolute file URL — the set
 * the durable app itself runs. agent-config installs none.
 *
 * The faux model is a script keyed on the last message:
 *   user "RUN {json}"    → bash_background(json)
 *   user "CHECK {json}"  → bash_background_check(json)
 *   user "HOLD {json}"   → hold(json)          (test-only tool: blocks until a gate file exists)
 *   user "[background task result] …" → answer "noted <first line>"
 *   tool result          → answer "ok <first line>"
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ENTWURF = process.env.AGENT_CONFIG_ENTWURF_DIR;
if (!ENTWURF) throw new Error("driver.mjs needs AGENT_CONFIG_ENTWURF_DIR");
const lib = (rel) => import(pathToFileURL(path.join(ENTWURF, "node_modules", "@earendil-works", rel)).href);

export const durable = await lib("pi-durable/dist/index.js");
export const { openNodeSqliteStorage } = await lib("pi-durable/dist/storage/sqlite/node.js");
const { createModels } = await lib("pi-ai/dist/models.js");
const faux = await lib("pi-ai/dist/providers/faux.js");
export const { BACKGROUND_CONTEXT: context } = await lib("chord/dist/context/index.js");

const MODEL = { provider: "faux", modelId: "faux-1" };

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll `check` until it returns a truthy value; throw after `ms`. */
export async function until(check, ms = 15_000, label = "condition") {
	const end = Date.now() + ms;
	for (;;) {
		const value = await check();
		if (value) return value;
		if (Date.now() > end) throw new Error(`timed out waiting for ${label}`);
		await sleep(20);
	}
}

function textOf(content) {
	if (typeof content === "string") return content;
	return content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
}

function route(request) {
	const last = request.messages.findLast((message) => message.role !== "system");
	const text = textOf(last.content);
	const first = text.split("\n")[0];
	if (last.role === "toolResult") return faux.fauxAssistantMessage([faux.fauxText(`ok ${first}`)]);
	const call = /^(RUN|CHECK|HOLD) (\{.*\})$/s.exec(text);
	if (call) {
		const name = { RUN: "bash_background", CHECK: "bash_background_check", HOLD: "hold" }[call[1]];
		return faux.fauxAssistantMessage([faux.fauxToolCall(name, JSON.parse(call[2]))], { stopReason: "toolUse" });
	}
	if (text.startsWith("[background task result]")) return faux.fauxAssistantMessage([faux.fauxText(`noted ${first}`)]);
	return faux.fauxAssistantMessage([faux.fauxText("?")]);
}

/** Test-only: a tool that keeps its conversation busy until `gate` exists. */
export const Hold = {
	name: "test-hold",
	tools: [
		{
			name: "hold",
			description: "Wait for a gate file.",
			parameters: { type: "object", properties: { gate: { type: "string" } }, required: ["gate"] },
			async execute(args) {
				await until(() => existsSync(args.gate), 30_000, `gate ${args.gate}`);
				return { content: [{ type: "text", text: "released" }] };
			},
		},
	],
};

/**
 * Open a Harness with `extensions` installed. `storage` is "memory" or a SQLite file path. The scheduler is
 * NOT started: call `harness.resume()` (or submit) — so a test can stage records first.
 */
export async function open({ extensions, storage = "memory" }) {
	const handle = faux.fauxProvider();
	handle.setResponses(Array.from({ length: 500 }, () => route));
	const models = createModels();
	models.setProvider(handle.provider);
	const registry = durable.createRegistry();
	for (const extension of extensions) registry.install(extension);
	const store = storage === "memory" ? new durable.MemoryStorage() : await openNodeSqliteStorage(storage);
	const harness = await durable.Harness.open(store, { models, registry }, context);
	const root = await harness.root(context, { agent: { model: MODEL, cwd: process.cwd() } });
	return { harness, root, ...observers(harness, root) };
}

function observers(harness, root) {
	/** The root transcript, oldest first, as { kind, role, text }. */
	async function transcript() {
		const items = [];
		let cursor;
		do {
			const page = await root.entries({}, 256, cursor, context);
			items.push(...page.items);
			cursor = page.next;
		} while (cursor !== undefined);
		items.sort((a, b) => a.id - b.id);
		return items.flatMap((entry) => {
			const message = entry.model?.[0];
			if (message === undefined) return [];
			return [{ kind: entry.kind, role: message.role, text: textOf(message.content ?? "") }];
		});
	}
	const reports = async () =>
		(await transcript()).filter((m) => m.role === "user" && m.text.startsWith("[background task result]"));
	const answers = async () => (await transcript()).filter((m) => m.role === "assistant").map((m) => m.text);
	const toolResults = async () => (await transcript()).filter((m) => m.role === "toolResult").map((m) => m.text);
	/** Live task graph nodes: { id, kind, status, phase, background }. */
	async function graph() {
		const state = await harness.taskGraph(context);
		const nodes = Object.values(state.value.tasks).map((node) => ({
			id: node.id,
			kind: node.kind,
			status: node.state.status,
			phase: node.state.checkpoint?.phase,
			background: node.background,
		}));
		state.dispose();
		return nodes;
	}
	const say = async (text) => (await root.submit({ type: "input", content: text }, context)).wait(context);
	const inbox = async () => {
		const view = await root.viewState(context);
		const items = (view.value.docs["pi.inbox"] ?? { items: [] }).items;
		view.dispose();
		return items.map((item) => ({ mode: item.mode, text: textOf(item.content ?? "") }));
	};
	const live = async () => {
		const view = await root.viewState(context);
		const run = view.value.docs["pi.live"]?.run;
		view.dispose();
		return run !== undefined;
	};
	return { transcript, reports, answers, toolResults, graph, say, inbox, live };
}

/** A shell command that appends one line to `marker`, then waits for `gate` (or not), then prints `out`. */
export const gated = ({ marker, gate, out = "done-output", exit = 0 }) =>
	[
		`echo ran >> ${JSON.stringify(marker)}`,
		gate ? `while [ ! -e ${JSON.stringify(gate)} ]; do sleep 0.05; done` : undefined,
		`echo ${JSON.stringify(out)}`,
		`exit ${exit}`,
	]
		.filter(Boolean)
		.join("; ");

/** Print the scenario's result as the last stdout line. */
export const emit = (value) => console.log(JSON.stringify(value));
