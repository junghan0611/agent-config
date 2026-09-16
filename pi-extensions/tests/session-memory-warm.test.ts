/**
 * Session-memory warm regression — no Pi runtime, API, or embedding call.
 *
 *   bun run pi-extensions/tests/session-memory-warm.test.ts
 */

const EXT = new URL("../session-memory-warm.ts", import.meta.url).pathname;
const skills = new URL("../../skills", import.meta.url).pathname;
process.env.AGENT_CONFIG_SKILLS_DIR = skills;
const { TOP_UP_COOLDOWN_MS, createWarmGate, freshnessLine, installSessionMemoryWarm, isCurrentIndexAuthority } = await import(EXT);

type Handler = (event: any, ctx: any) => unknown;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
	if (ok) console.log(`  ok   ${name}`);
	else {
		failures++;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

console.log("warm gate — one request per cooldown, no timer");
{
	let now = 1_000;
	let launches = 0;
	const gate = createWarmGate(() => launches++, () => now);
	check("first request launches", gate.request() && launches === 1);
	now += TOP_UP_COOLDOWN_MS - 1;
	check("cooldown suppresses another launch", !gate.request() && launches === 1);
	now += 1;
	check("cooldown expiry permits one new launch", gate.request() && launches === 2);
}

console.log("authority — only the index authority asks for a warm");
{
	check("thinkpad is the default authority", isCurrentIndexAuthority({}, () => "thinkpad\n"));
	check("oracle is not the default authority", !isCurrentIndexAuthority({}, () => "oracle\n"));
	check("explicit authority moves with its config", isCurrentIndexAuthority({ ANDENKEN_INDEX_AUTHORITY: "laptop" }, () => "laptop\n"));
}

console.log("freshness receipt — index fact and one-sync-behind state stay distinct");
{
	check(
		"known index + request",
		freshnessLine("2026-09-16T01:12:13.111Z", 1).includes("index 2026-09-16T01:12:13.111Z") &&
			freshnessLine("2026-09-16T01:12:13.111Z", 1).includes("one sync behind"),
	);
	check("no request does not claim warming", !freshnessLine(undefined, undefined).includes("requested"));
}

console.log("Pi seam — session start, native session_search, and result annotation");
{
	const handlers = new Map<string, Handler>();
	let now = 1_000;
	let launches = 0;
	const statuses: Array<[string, string | undefined]> = [];
	installSessionMemoryWarm(
		{
			on: (event: string, handler: Handler) => handlers.set(event, handler),
		} as any,
		{
			now: () => now,
			launch: () => launches++,
			readManifestUpdatedAt: () => "2026-09-16T01:12:13.111Z",
			isAuthority: () => true,
		},
	);
	const ctx = { hasUI: true, ui: { setStatus: (key: string, value: string | undefined) => statuses.push([key, value]) } };
	await handlers.get("session_start")!({}, ctx);
	check("session_start requests local warm", launches === 1 && statuses.length === 1);
	await handlers.get("tool_call")!({ toolName: "knowledge_search" }, ctx);
	check("garden search does not warm sessions", launches === 1);
	await handlers.get("tool_call")!({ toolName: "session_search" }, ctx);
	check("same-session native search respects cooldown", launches === 1);
	now += TOP_UP_COOLDOWN_MS;
	await handlers.get("tool_call")!({ toolName: "session_search" }, ctx);
	check("native session_search tops up after cooldown", launches === 2);
	const result = await handlers.get("tool_result")!({
		toolName: "session_search",
		isError: false,
		content: [{ type: "text", text: "results" }],
	});
	check("successful native result carries freshness", result?.content?.at(-1)?.text?.includes("Session freshness"));
	const noPatch = await handlers.get("tool_result")!({ toolName: "session_search", isError: true, content: [] });
	check("failed search is not rewritten", noPatch === undefined);
	await handlers.get("session_shutdown")!({}, ctx);
	check("shutdown clears the transient status", statuses.at(-1)?.[1] === undefined);
}

console.log("Pi seam — a replica never launches a local writer");
{
	const handlers = new Map<string, Handler>();
	let launches = 0;
	installSessionMemoryWarm(
		{ on: (event: string, handler: Handler) => handlers.set(event, handler) } as any,
		{ launch: () => launches++, isAuthority: () => false },
	);
	await handlers.get("session_start")!({}, { hasUI: false, ui: { setStatus: () => undefined } });
	await handlers.get("tool_call")!({ toolName: "session_search" }, { hasUI: false, ui: { setStatus: () => undefined } });
	check("replica Pi makes no warm request", launches === 0);
}

console.log("Pi seam — a failed optional launcher never blocks session_search");
{
	const handlers = new Map<string, Handler>();
	installSessionMemoryWarm(
		{ on: (event: string, handler: Handler) => handlers.set(event, handler) } as any,
		{ launch: () => { throw new Error("missing launcher"); }, isAuthority: () => true },
	);
	let rejected = false;
	try {
		await handlers.get("tool_call")!({ toolName: "session_search" }, { hasUI: false, ui: { setStatus: () => undefined } });
	} catch {
		rejected = true;
	}
	check("native session_search launch failure is non-blocking", !rejected);
}

if (failures > 0) process.exit(1);
