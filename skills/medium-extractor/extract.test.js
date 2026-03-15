import assert from "node:assert/strict";
import test from "node:test";

import { buildCandidateUrls, extractMediumPostId, isBlockedHtml } from "./extract.js";

test("buildCandidateUrls includes freedium and scribe fallbacks for medium URL", () => {
  const input = "https://medium.com/@max.petrusenko/openclaw-i-let-this-ai-control-my-mac-for-3-weeks-heres-what-it-taught-me-about-trust-e1642b4c8c9c";
  const candidates = buildCandidateUrls(input);

  assert.ok(candidates.some((url) => url.startsWith("https://freedium.cfd/")));
  assert.ok(candidates.some((url) => url.startsWith("https://freedium-mirror.cfd/")));
  assert.ok(candidates.includes("https://scribe.rip/@max.petrusenko/openclaw-i-let-this-ai-control-my-mac-for-3-weeks-heres-what-it-taught-me-about-trust-e1642b4c8c9c"));
});

test("buildCandidateUrls keeps direct freedium URL unchanged", () => {
  const input = "https://freedium-mirror.cfd/https://medium.com/@foo/bar-e1642b4c8c9c";
  const candidates = buildCandidateUrls(input);

  assert.deepEqual(candidates, [input]);
});

test("extractMediumPostId returns trailing 12-char hex post id", () => {
  const postId = extractMediumPostId("/@max.petrusenko/openclaw-i-let-this-ai-control-my-mac-for-3-weeks-heres-what-it-taught-me-about-trust-e1642b4c8c9c");
  assert.equal(postId, "e1642b4c8c9c");
});

test("isBlockedHtml detects cloudflare challenge page", () => {
  const html = "<!doctype html><title>Just a moment...</title><p>Enable JavaScript and cookies to continue</p>";
  assert.equal(isBlockedHtml(html), true);
});
