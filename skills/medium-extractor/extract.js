#!/usr/bin/env node

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const REQUEST_TIMEOUT_MS = 15000;
const MIN_MARKDOWN_LENGTH = 120;
const BLOCK_MARKERS = [
  "Just a moment...",
  "Enable JavaScript and cookies to continue",
  "cf_chl_opt",
  "Attention Required! | Cloudflare",
  "captcha",
];

const FREEDIUM_HOSTS = new Set(["freedium.cfd", "freedium-mirror.cfd"]);

export function isMediumHost(hostname) {
  return hostname === "medium.com" || hostname.endsWith(".medium.com");
}

export function isBlockedHtml(html) {
  return BLOCK_MARKERS.some((marker) => html.includes(marker));
}

export function extractMediumPostId(pathname) {
  const match = pathname.match(/([a-f0-9]{12})(?:$|[/?#])/i);
  return match?.[1] ?? null;
}

export function buildCandidateUrls(inputUrl) {
  const url = new URL(inputUrl);

  if (FREEDIUM_HOSTS.has(url.hostname) || url.hostname === "scribe.rip") {
    return [url.href];
  }

  const candidates = [];
  const encoded = encodeURIComponent(url.href);

  candidates.push(`https://freedium.cfd/${encoded}`);
  candidates.push(`https://freedium-mirror.cfd/${encoded}`);
  candidates.push(`https://freedium-mirror.cfd/${url.href}`);

  if (isMediumHost(url.hostname)) {
    candidates.push(`https://scribe.rip${url.pathname}${url.search}${url.hash}`);
  }

  const postId = extractMediumPostId(url.pathname);
  if (postId) {
    candidates.push(`https://scribe.rip/${postId}`);
  }

  candidates.push(url.href);
  return [...new Set(candidates)];
}

function htmlToMarkdown(html) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  turndown.use(gfm);
  turndown.addRule("removeEmptyLinks", {
    filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
    replacement: () => "",
  });

  return turndown
    .turndown(html)
    .replace(/\[\\?\[\s*\\?\]\]\([^)]*\)/g, "")
    .replace(/ +/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractReadableMarkdown(html, url) {
  if (isBlockedHtml(html)) {
    throw new Error("Blocked by anti-bot challenge");
  }

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (article?.content) {
    const markdown = htmlToMarkdown(article.content);
    if (markdown.length >= MIN_MARKDOWN_LENGTH) {
      return {
        title: article.title?.trim() ?? "",
        markdown,
      };
    }
  }

  const fallbackDoc = new JSDOM(html, { url });
  const body = fallbackDoc.window.document;
  body.querySelectorAll("script, style, noscript, nav, header, footer, aside").forEach((el) => el.remove());

  const title = body.querySelector("title")?.textContent?.trim() ?? "";
  const main = body.querySelector("main, article, [role='main'], .content, #content") || body.body;
  const markdown = htmlToMarkdown(main?.innerHTML || "");

  if (markdown.length < MIN_MARKDOWN_LENGTH) {
    throw new Error("Extracted content looks too short");
  }

  return { title, markdown };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

export async function extractMediumArticle(input, options = {}) {
  const debug = options.debug === true;
  const candidates = buildCandidateUrls(input);
  const errors = [];

  for (const candidate of candidates) {
    try {
      if (debug) {
        console.error(`Trying: ${candidate}`);
      }

      const html = await fetchHtml(candidate);
      const result = extractReadableMarkdown(html, candidate);
      return {
        sourceUrl: candidate,
        ...result,
      };
    } catch (error) {
      errors.push(`${candidate} -> ${error.message}`);
      if (debug) {
        console.error(`Failed: ${candidate} (${error.message})`);
      }
    }
  }

  const details = errors.map((line) => `- ${line}`).join("\n");
  throw new Error(`Could not extract article from any source:\n${details}`);
}

function parseCliArgs(argv) {
  const withSource = argv.includes("--source");
  const debug = argv.includes("--debug");
  const input = argv.find((arg) => !arg.startsWith("--"));

  if (!input) {
    console.error("Usage: extract.js <medium-or-mirror-url> [--source] [--debug]");
    process.exit(1);
  }

  return { input, withSource, debug };
}

async function main() {
  const { input, withSource, debug } = parseCliArgs(process.argv.slice(2));
  const { sourceUrl, title, markdown } = await extractMediumArticle(input, { debug });

  if (withSource) {
    console.log(`Source: ${sourceUrl}\n`);
  }

  if (title) {
    console.log(`# ${title}\n`);
  }

  console.log(markdown);
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
