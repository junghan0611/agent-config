#!/usr/bin/env node

import Exa from "exa-js";

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
const includeText = takeFlag("--text");
const includeHighlights = takeFlag("--highlights");
const includeSummary = takeFlag("--summary");

const maxChars = parseInt(takeOpt("--max-chars") ?? "20000", 10);
const maxAgeHoursRaw = takeOpt("--max-age-hours");
const maxAgeHours = maxAgeHoursRaw !== null ? parseInt(maxAgeHoursRaw, 10) : null;

const urls = args.filter(a => /^https?:\/\//i.test(a));

if (wantsHelp || urls.length === 0) {
	console.log("Usage: contents.js <url> [<url> ...] [options]");
	console.log("\nOptions:");
	console.log("  --text                  Include full text (default if no content flag set)");
	console.log("  --highlights            Include query-relevant excerpts");
	console.log("  --summary               Include AI-written summary");
	console.log("  --max-chars <n>         Cap text length (default: 20000, only with --text)");
	console.log("  --max-age-hours <n>     Cache freshness: 0=always livecrawl, -1=cache only, omit=default");
	console.log("  --json                  Output raw JSON instead of formatted markdown");
	console.log("\nEnvironment:");
	console.log("  EXA_API_KEY             Required.");
	console.log("\nExamples:");
	console.log("  contents.js https://example.com/article --text");
	console.log("  contents.js https://a.com/1 https://a.com/2 --highlights");
	console.log("  contents.js https://example.com --text --max-chars 5000 --max-age-hours 24");
	process.exit(wantsHelp ? 0 : 1);
}

if (!process.env.EXA_API_KEY) {
	console.error("Error: EXA_API_KEY environment variable is required.");
	process.exit(1);
}

const options = {};
if (includeHighlights) options.highlights = true;
if (includeSummary) options.summary = true;
if (includeText) options.text = { maxCharacters: maxChars };
// Default to text if no content flag was set — /contents has no useful default.
if (!includeText && !includeHighlights && !includeSummary) {
	options.text = { maxCharacters: maxChars };
}
if (maxAgeHours !== null) options.maxAgeHours = maxAgeHours;

const exa = new Exa();

try {
	const resp = await exa.getContents(urls, options);

	if (asJson) {
		console.log(JSON.stringify(resp, null, 2));
		process.exit(0);
	}

	const results = resp.results ?? [];
	if (results.length === 0) {
		console.error("No content returned.");
		process.exit(0);
	}

	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		console.log(`--- Content ${i + 1} ---`);
		if (r.title) console.log(`Title: ${r.title}`);
		console.log(`URL: ${r.url}`);
		if (r.publishedDate) console.log(`Published: ${r.publishedDate}`);
		if (r.author) console.log(`Author: ${r.author}`);
		if (r.summary) console.log(`Summary:\n${r.summary}`);
		if (r.highlights?.length) {
			console.log("Highlights:");
			for (const h of r.highlights) console.log(`  - ${h}`);
		}
		if (r.text) console.log(`Text:\n${r.text}`);
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
