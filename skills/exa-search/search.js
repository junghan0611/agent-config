#!/usr/bin/env node

import fs from "node:fs";
import Exa from "exa-js";

const VALID_TYPES = new Set([
	"auto", "fast", "instant", "deep-lite", "deep", "deep-reasoning",
	"neural", "keyword", "hybrid",
]);

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

function takeListOpt(name) {
	const v = takeOpt(name);
	if (!v) return null;
	return v.split(",").map(s => s.trim()).filter(Boolean);
}

const wantsHelp = takeFlag("-h") || takeFlag("--help");
const asJson = takeFlag("--json");
const includeText = takeFlag("--text");
const includeHighlights = takeFlag("--highlights");
const includeSummary = takeFlag("--summary");

const numResults = parseInt(takeOpt("-n") ?? takeOpt("--num-results") ?? "10", 10);
const type = takeOpt("--type");
const maxChars = parseInt(takeOpt("--max-chars") ?? "20000", 10);
const category = takeOpt("--category");
const includeDomains = takeListOpt("--include-domains");
const excludeDomains = takeListOpt("--exclude-domains");
const startDate = takeOpt("--start-date");
const endDate = takeOpt("--end-date");
const outputSchemaPath = takeOpt("--output-schema");

const query = args.join(" ").trim();

if (wantsHelp || !query) {
	console.log("Usage: search.js <query> [options]");
	console.log("\nOptions:");
	console.log("  -n, --num-results <n>      Number of results (default: 10)");
	console.log("  --type <type>              auto|fast|instant|deep-lite|deep|deep-reasoning (default: auto)");
	console.log("  --text                     Include full text content");
	console.log("  --highlights               Include query-relevant highlights");
	console.log("  --summary                  Include AI-written summary");
	console.log("  --max-chars <n>            Cap text length (default: 20000, only with --text)");
	console.log("  --category <cat>           company|research paper|news|pdf|tweet|personal site|...");
	console.log("  --include-domains <list>   Comma-separated domains to include");
	console.log("  --exclude-domains <list>   Comma-separated domains to exclude");
	console.log("  --start-date <iso>         Start published date (YYYY-MM-DD)");
	console.log("  --end-date <iso>           End published date (YYYY-MM-DD)");
	console.log("  --output-schema <file>     Path to JSON schema for structured output");
	console.log("  --json                     Output raw JSON instead of formatted markdown");
	console.log("\nEnvironment:");
	console.log("  EXA_API_KEY                Required. Get one at https://dashboard.exa.ai");
	console.log("\nExamples:");
	console.log('  search.js "latest AI safety research"');
	console.log('  search.js "rust async runtime" --type deep --highlights');
	console.log('  search.js "startup funding" --category news --start-date 2026-01-01');
	console.log('  search.js "transformers" --include-domains "arxiv.org,openai.com"');
	console.log('  search.js "GPU vendors" --output-schema ./companies.schema.json');
	process.exit(wantsHelp ? 0 : 1);
}

if (!process.env.EXA_API_KEY) {
	console.error("Error: EXA_API_KEY environment variable is required.");
	console.error("Get your key at: https://dashboard.exa.ai");
	process.exit(1);
}

if (type && !VALID_TYPES.has(type)) {
	console.error(`Error: invalid --type "${type}". Valid: ${[...VALID_TYPES].join(", ")}`);
	process.exit(1);
}

const contents = {};
if (includeHighlights) contents.highlights = true;
if (includeSummary) contents.summary = true;
if (includeText) contents.text = { maxCharacters: maxChars };
// If no content flag set, default to highlights (token-efficient per Exa guide).
if (Object.keys(contents).length === 0) contents.highlights = true;

const options = {
	numResults,
	contents,
};
if (type) options.type = type;
if (category) options.category = category;
if (includeDomains) options.includeDomains = includeDomains;
if (excludeDomains) options.excludeDomains = excludeDomains;
if (startDate) options.startPublishedDate = startDate;
if (endDate) options.endPublishedDate = endDate;
if (outputSchemaPath) {
	try {
		options.outputSchema = JSON.parse(fs.readFileSync(outputSchemaPath, "utf8"));
	} catch (e) {
		console.error(`Error reading --output-schema file "${outputSchemaPath}": ${e.message}`);
		process.exit(1);
	}
}

const exa = new Exa();

try {
	const resp = await exa.search(query, options);

	if (asJson) {
		console.log(JSON.stringify(resp, null, 2));
		process.exit(0);
	}

	// Structured output: print first, then sources
	if (resp.output) {
		console.log("# Structured Output\n");
		console.log(JSON.stringify(resp.output.content ?? resp.output, null, 2));
		if (resp.output.grounding?.length) {
			console.log("\n# Grounding\n");
			for (const g of resp.output.grounding) {
				const cites = (g.citations ?? []).map(c => c.url).join(", ");
				console.log(`- ${g.field}${g.confidence ? ` [${g.confidence}]` : ""}: ${cites}`);
			}
		}
		console.log("\n# Source Results\n");
	}

	const results = resp.results ?? [];
	if (results.length === 0 && !resp.output) {
		console.error("No results found.");
		process.exit(0);
	}

	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		console.log(`--- Result ${i + 1} ---`);
		if (r.title) console.log(`Title: ${r.title}`);
		console.log(`Link: ${r.url}`);
		if (r.publishedDate) console.log(`Published: ${r.publishedDate}`);
		if (r.author) console.log(`Author: ${r.author}`);
		if (typeof r.score === "number") console.log(`Score: ${r.score.toFixed(3)}`);
		if (r.summary) console.log(`Summary:\n${r.summary}`);
		if (r.highlights?.length) {
			console.log("Highlights:");
			for (const h of r.highlights) console.log(`  - ${h}`);
		}
		if (r.text) console.log(`Content:\n${r.text}`);
		console.log("");
	}

	if (resp.costDollars?.total != null) {
		console.error(`# cost: $${resp.costDollars.total.toFixed(4)}`);
	}
} catch (e) {
	console.error(`Error: ${e.message}`);
	if (e.statusCode) console.error(`HTTP ${e.statusCode}`);
	process.exit(1);
}
