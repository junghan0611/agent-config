#!/usr/bin/env node
/**
 * YouTube transcript → denote md under ~/org/transcript
 *
 * Contract:
 * - code-level only (no LLM rewrite)
 * - keep spoken raw form (uh, repeats, [laughter], …)
 * - merge timed cues on YouTube's own ">>" boundary
 * - turn start time as HTML comment: <!-- [m:ss] -->
 * - YAML front matter for video meta (denote md sample)
 * - offset from youtube-transcript-plus is already seconds
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { YoutubeTranscript } from 'youtube-transcript-plus';

const DEFAULT_OUTDIR = join(homedir(), 'org', 'transcript');
const DEFAULT_TAGS = ['transcript', 'youtube'];

const args = process.argv.slice(2);
let videoInput = null;
let lang = 'en';
let listOnly = false;
let noSave = false;
let outDir = DEFAULT_OUTDIR;

for (let i = 0; i < args.length; i++) {
	if (args[i] === '--lang' && args[i + 1]) {
		lang = args[++i];
	} else if (args[i] === '--list') {
		listOnly = true;
	} else if (args[i] === '--no-save') {
		noSave = true;
	} else if (args[i] === '--outdir' && args[i + 1]) {
		outDir = args[++i];
	} else if (!args[i].startsWith('-')) {
		videoInput = args[i];
	}
}

if (!videoInput) {
	console.error('Usage: transcript.js <video-id-or-url> [--lang en] [--list] [--no-save] [--outdir DIR]');
	console.error('');
	console.error('Default: merge cues on ">>", write denote md to ~/org/transcript, print full doc on stdout.');
	console.error('  --list      List available subtitle languages');
	console.error('  --no-save   Print only (do not write file)');
	console.error('  --outdir    Override save directory');
	process.exit(1);
}

const videoId = extractVideoId(videoInput);
if (!videoId) {
	console.error('Error: could not parse video id from:', videoInput);
	process.exit(1);
}

try {
	if (listOnly) {
		try {
			await YoutubeTranscript.fetchTranscript(videoId, { lang: 'xx-impossible' });
		} catch (e) {
			if (e.availableLangs) {
				console.log('Available languages:', e.availableLangs.join(', '));
				process.exit(0);
			}
			console.error('Error:', e.message);
			process.exit(1);
		}
	}

	const [cues, meta] = await Promise.all([
		YoutubeTranscript.fetchTranscript(videoId, { lang }),
		fetchOEmbed(videoId),
	]);

	const rows = cues.map((e) => ({
		offset: e.offset, // seconds (library contract)
		duration: e.duration,
		text: decodeEntities(e.text),
	}));

	const turns = mergeTurns(rows);
	const durationSec = rows.length
		? rows[rows.length - 1].offset + rows[rows.length - 1].duration
		: 0;

	const now = new Date();
	const identifier = denoteIdKST(now);
	const title = meta?.title || `YouTube ${videoId}`;
	const channel = meta?.author_name || '';
	const source = `https://youtu.be/${videoId}`;
	const tags = DEFAULT_TAGS;

	const header = formatYamlHeader({
		title,
		date: dateTimeKST(now),
		tags,
		identifier,
		source,
		video_id: videoId,
		channel,
		lang,
		duration: formatDuration(durationSec),
		cues: rows.length,
		turns: turns.length,
	});

	const body =
		turns
			.map((t) => `<!-- [${formatTimestamp(t.start)}] -->\n${t.text}`)
			.join('\n\n') + '\n';
	const doc = header + '\n' + body;

	if (!noSave) {
		const slug = slugify(title) || videoId.toLowerCase();
		const tagSlug = tags.join('_');
		const filename = `${identifier}--${slug}__${tagSlug}.md`;
		mkdirSync(outDir, { recursive: true });
		const path = join(outDir, filename);
		if (existsSync(path)) {
			console.error(`Error: file already exists: ${path}`);
			process.exit(1);
		}
		writeFileSync(path, doc, 'utf8');
		console.error(`Saved: ${path}`);
	}

	process.stdout.write(doc);
} catch (error) {
	if (error.availableLangs) {
		console.error(`Language "${lang}" not available.`);
		console.error('Available:', error.availableLangs.join(', '));
	} else {
		console.error('Error:', error.message);
	}
	process.exit(1);
}

// --- helpers ---

function extractVideoId(input) {
	if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
	const m = input.match(
		/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
	);
	return m ? m[1] : null;
}

function decodeEntities(str) {
	return str
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"');
}

/**
 * Merge consecutive cues into turns.
 * Hard boundary = cue text starting with ">>" (YouTube-provided, not invented).
 * Returns { start, text }[]; start = first cue offset of the turn (seconds).
 */
function mergeTurns(rows) {
	const turns = [];
	let parts = [];
	let start = null;

	const flush = () => {
		if (parts.length === 0) return;
		const text = parts.join(' ').replace(/[ \t]+/g, ' ').trim();
		if (text) turns.push({ start: start ?? 0, text });
		parts = [];
		start = null;
	};

	for (const row of rows) {
		let text = row.text.replace(/\s+/g, ' ').trim();
		if (!text) continue;

		const isBoundary = text.startsWith('>>');
		if (isBoundary) {
			flush();
			text = text.replace(/^>>\s*/, '').trim();
			if (!text) continue;
		}
		if (parts.length === 0) start = row.offset;
		parts.push(text);
	}
	flush();
	return turns;
}

async function fetchOEmbed(videoId) {
	const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
		`https://www.youtube.com/watch?v=${videoId}`,
	)}&format=json`;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

function yamlEscape(s) {
	// always quote strings that need it; simple double-quote escape
	const str = String(s).replace(/\s+/g, ' ').trim();
	if (/^[A-Za-z0-9._/-]+$/.test(str) && !/[:#]/.test(str)) return str;
	return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function formatYamlHeader(fields) {
	// denote md sample: YAML front matter
	const tags = Array.isArray(fields.tags)
		? `[${fields.tags.map((t) => yamlEscape(t)).join(', ')}]`
		: yamlEscape(fields.tags);
	const lines = [
		'---',
		`title:       ${yamlEscape(fields.title)}`,
		`date:        ${fields.date}`,
		`tags:        ${tags}`,
		`identifier:  ${yamlEscape(fields.identifier)}`,
		`source:      ${yamlEscape(fields.source)}`,
		`video_id:    ${yamlEscape(fields.video_id)}`,
		`channel:     ${yamlEscape(fields.channel)}`,
		`lang:        ${yamlEscape(fields.lang)}`,
		`duration:    ${yamlEscape(fields.duration)}`,
		`cues:        ${fields.cues}`,
		`turns:       ${fields.turns}`,
		'---',
		'',
	];
	return lines.join('\n');
}

function denoteIdKST(d = new Date()) {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Seoul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	}).formatToParts(d);
	const g = (t) => parts.find((p) => p.type === t).value;
	return `${g('year')}${g('month')}${g('day')}T${g('hour')}${g('minute')}${g('second')}`;
}

function dateTimeKST(d = new Date()) {
	// 2026-08-11T09:31:22+09:00
	const id = denoteIdKST(d);
	return `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}T${id.slice(9, 11)}:${id.slice(11, 13)}:${id.slice(13, 15)}+09:00`;
}

function formatDuration(seconds) {
	return formatTimestamp(seconds);
}

function formatTimestamp(seconds) {
	const s = Math.max(0, Math.floor(Number(seconds) || 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (h > 0) {
		return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	}
	return `${m}:${String(sec).padStart(2, '0')}`;
}

function slugify(title) {
	return title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9가-힣]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}
