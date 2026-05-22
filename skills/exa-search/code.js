#!/usr/bin/env node

// Exa Context API ("Exa Code"). Not yet exposed by exa-js SDK as of v2.13.
// Direct POST to https://api.exa.ai/context per
// https://exa.ai/docs/reference/context

const VALID_TOKENS_NUM = new Set(["dynamic"]);

const args = process.argv.slice(2);

function takeFlag(name) {
	const i = args.indexOf(name);
	if (i === -1) return false;
	args.splice(i, 1);
	return true;
}

function takeOpt(name) {
	const i = args.indexOf(name);
	if (i === -1 || !args[i + 1]) return null;
	const v = args[i + 1];
	args.splice(i, 2);
	return v;
}

const wantsHelp = takeFlag("-h") || takeFlag("--help");
const asJson = takeFlag("--json");
const tokensNumRaw = takeOpt("--tokens-num") ?? "dynamic";

const query = args.join(" ").trim();

if (wantsHelp || !query) {
	console.log("Usage: code.js <query> [options]");
	console.log("\nReturns a single token-efficient code-context block aggregated from");
	console.log("GitHub, Stack Overflow, and official docs. Designed to be dropped");
	console.log("straight into an LLM context window.");
	console.log("\nOptions:");
	console.log("  --tokens-num <n|dynamic>   Token budget: 'dynamic' (default) or 50-100000");
	console.log("                             (5000 recommended, 10000 for extensive context)");
	console.log("  --json                     Output raw JSON instead of just the response text");
	console.log("\nEnvironment:");
	console.log("  EXA_API_KEY                Required.");
	console.log("\nExamples:");
	console.log('  code.js "how to use cobra CLI in Go"');
	console.log('  code.js "React useEffect cleanup pattern" --tokens-num 5000');
	console.log('  code.js "postgres connection pooling in Go" --json');
	process.exit(wantsHelp ? 0 : 1);
}

if (!process.env.EXA_API_KEY) {
	console.error("Error: EXA_API_KEY environment variable is required.");
	process.exit(1);
}

let tokensNum;
if (VALID_TOKENS_NUM.has(tokensNumRaw)) {
	tokensNum = tokensNumRaw;
} else {
	const n = parseInt(tokensNumRaw, 10);
	if (!Number.isFinite(n) || n < 50 || n > 100000) {
		console.error(`Error: invalid --tokens-num "${tokensNumRaw}". Use "dynamic" or 50-100000.`);
		process.exit(1);
	}
	tokensNum = n;
}

try {
	const response = await fetch("https://api.exa.ai/context", {
		method: "POST",
		headers: {
			"x-api-key": process.env.EXA_API_KEY,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query, tokensNum }),
	});

	if (!response.ok) {
		const errText = await response.text();
		console.error(`HTTP ${response.status}: ${response.statusText}`);
		console.error(errText);
		process.exit(1);
	}

	const data = await response.json();

	if (asJson) {
		console.log(JSON.stringify(data, null, 2));
		process.exit(0);
	}

	if (data.response) {
		console.log(data.response);
	} else {
		console.error("No response field in API output.");
		console.log(JSON.stringify(data, null, 2));
	}

	const cost = data.costDollars?.total;
	const tokens = data.outputTokens;
	const count = data.resultsCount;
	if (cost != null || tokens != null || count != null) {
		console.error(`# results=${count ?? "?"} tokens=${tokens ?? "?"} cost=$${cost?.toFixed(4) ?? "?"}`);
	}
} catch (e) {
	console.error(`Error: ${e.message}`);
	process.exit(1);
}
