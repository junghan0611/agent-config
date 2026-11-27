// Calls andenken's own extractor (no copy of its rules): is every gold evidence line in the indexable set?
import fs from "node:fs"; import path from "node:path";
const [andenken, fx] = process.argv.slice(2);
const { extractSessionChunks } = await import(`${andenken}/session-indexer.ts`);
const gold = JSON.parse(fs.readFileSync(`${fx}/gold.json`, "utf8"));
const root = `${fx}/corpus/synth/.pi/agent/sessions`;
const have = new Set(); let files = 0, empty = 0, chunks = 0;
for (const d of fs.readdirSync(root)) for (const f of fs.readdirSync(path.join(root, d))) {
	const c = await extractSessionChunks(path.join(root, d, f)); files++; chunks += c.length; if (!c.length) empty++;
	for (const x of c) have.add(`${f}:${x.lineNumber ?? x.metadata?.lineNumber}`);
}
const missing = Object.entries(gold).flatMap(([t, g]) => Object.entries(g.evidence).flatMap(([s, ev]) => ev.filter((e) => !have.has(`${e.file}:${e.line}`)).map((e) => `${t}/${s}:L${e.line}`)));
console.log(JSON.stringify({ files, filesWithoutChunks: empty, chunks, missingEvidence: missing }));
process.exit(missing.length ? 1 : 0);
