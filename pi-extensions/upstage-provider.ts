/**
 * Upstage Solar Provider Extension
 *
 * Registers Upstage (https://api.upstage.ai/v1) as an OpenAI-compatible
 * provider so Solar models show up in `/model` and `pi --list-models`.
 * Upstage's own integrations (hermes-upstage-setup.sh) register the same way —
 * an OpenAI-compatible custom provider pointed at that base URL.
 *
 * Model availability is read live from GET /v1/models and intersected with the
 * catalog below, then cached for 24h in ~/.pi/agent/cache/upstage-models.json.
 * That way a model the account cannot call yet (Solar Open 2 private beta) does
 * not appear until Upstage actually grants it — and appears on its own once
 * they do. To pick up a grant immediately, delete that cache file.
 *
 * Everything in the compat block below was measured against the live API, not
 * inferred; the four `false` flags are all cases where pi's autodetected
 * default for an OpenAI-compatible endpoint makes Upstage reject the request.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PROVIDER_ID = "upstage";
const PROVIDER_NAME = "Upstage Solar";
const BASE_URL = "https://api.upstage.ai/v1";
const CACHE_FILE = path.join(os.homedir(), ".pi", "agent", "cache", "upstage-models.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

/**
 * Quirks of the Upstage chat/completions endpoint, all verified by direct
 * request. The first three are rejections — pi's defaults for a non-OpenAI
 * OpenAI-compatible endpoint would send each of them:
 *
 *   store: false                  → "Unrecognized request arguments supplied: store"
 *   role: "developer"             → "must be one of ['system','assistant','user','tool']"
 *   tools[].function.strict: true → "The value 'true' isn't supported yet"
 *
 * The rest are confirmed working: reasoning_effort is accepted top-level and
 * comes back as message.reasoning (which pi's openai-completions API already
 * parses) plus completion_tokens_details.reasoning_tokens; stream_options
 * .include_usage is honored; prompt_tokens_details.cached_tokens reports
 * Upstage's automatic prompt caching. max_tokens and max_completion_tokens are
 * both accepted — max_tokens is what Upstage documents.
 */
const SOLAR_COMPAT = {
	supportsStore: false,
	supportsDeveloperRole: false,
	supportsStrictMode: false,
	supportsReasoningEffort: true,
	supportsUsageInStreaming: true,
	maxTokensField: "max_tokens" as const,
	requiresToolResultName: true,
};

/**
 * pi thinking level → Upstage reasoning_effort. null hides a level pi offers
 * that Upstage has no distinct value for, so `/thinking` only shows real steps.
 *
 * Solar Pro 3 reasons by default and turns it off with "low"; Solar Pro 2 is
 * the inverse — off by default ("minimal"), on only at "high", with its own
 * "medium"/"low" documented as aliases of high/minimal, so neither is exposed.
 */
const PRO3_THINKING = {
	off: "low",
	minimal: null,
	low: null,
	medium: "medium",
	high: "high",
	xhigh: null,
	max: null,
} as const;

const PRO2_THINKING = {
	off: "minimal",
	minimal: null,
	low: null,
	medium: null,
	high: "high",
	xhigh: null,
	max: null,
} as const;

type CatalogEntry = {
	id: string;
	name: string;
	reasoning: boolean;
	thinkingLevelMap?: Record<string, string | null>;
	contextWindow: number;
	maxTokens: number;
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
};

/**
 * Context windows for the Solar Pro and Mini rows are Upstage's own numbers,
 * lifted from the SOLAR_CONTEXT table in their hermes-upstage-setup.sh (GET
 * /v1/models does not report them); Solar Open 2's is discussed at its entry.
 * Prices are from upstage.ai/pricing/api, USD per 1M tokens, VAT excluded.
 *
 * maxTokens is a deliberate fraction of the window, not a hard API limit:
 * Upstage bills output against the same context budget, so requesting the full
 * window fails as soon as the prompt is non-empty ("maximum context length is
 * 131072 tokens, but your request contains ..."). For Solar Pro 3 the value
 * matches its 32,768-token high-effort reasoning budget.
 *
 * Text only — image_url input is rejected ("Image input is not allowed for this
 * model") on every Solar model.
 *
 * syn-pro is intentionally absent: Upstage documents it as having no function
 * calling, which makes it unusable as a coding-agent model.
 */
const CATALOG: CatalogEntry[] = [
	{
		id: "solar-pro3",
		name: "Solar Pro 3",
		reasoning: true,
		thinkingLevelMap: { ...PRO3_THINKING },
		contextWindow: 131072,
		maxTokens: 32768,
		cost: { input: 0.15, output: 0.6, cacheRead: 0.015, cacheWrite: 0 },
	},
	{
		id: "solar-pro2",
		name: "Solar Pro 2",
		reasoning: true,
		thinkingLevelMap: { ...PRO2_THINKING },
		contextWindow: 65536,
		maxTokens: 16384,
		cost: { input: 0.15, output: 0.6, cacheRead: 0.015, cacheWrite: 0 },
	},
	{
		id: "solar-mini",
		name: "Solar Mini",
		reasoning: false,
		contextWindow: 32768,
		maxTokens: 8192,
		// Pricing lists one flat rate for Mini and no cached-input discount,
		// so cacheRead stays at the input rate rather than assuming one.
		cost: { input: 0.15, output: 0.15, cacheRead: 0.15, cacheWrite: 0 },
	},
	// Solar Open 2 — private beta, granted per console account, free while the
	// beta runs (hence zero cost). 250B total / 15B active MoE, released
	// 2026-07-08, Feb 2026 data cut-off, built for agentic tool use.
	//
	// Two values here are unverified because the account cannot call the model
	// yet — recheck both the way the Solar Pro rows were checked, once granted:
	//
	//   contextWindow: 1M per the launch blog and the console dashboard. Note
	//     the model page prints "Undisclosed context length" and Upstage's own
	//     hermes-upstage-setup.sh hardcodes 262144 for the API, so if requests
	//     start failing on long contexts, that 256K figure is the first thing to
	//     try. Probe the real ceiling the way solar-pro3's 131072 was found:
	//     send an oversized max_tokens and read the limit off the error.
	//   thinkingLevelMap: the model page says "Reasoning mode available" but
	//     documents no effort scale, so assume Solar Pro 3's (reasoning on by
	//     default, "low" turns it off). Every value sent is a documented
	//     reasoning_effort, so a wrong guess mismaps levels rather than erroring.
	{
		id: "solar-open2",
		name: "Solar Open 2",
		reasoning: true,
		thinkingLevelMap: { ...PRO3_THINKING },
		contextWindow: 1048576,
		maxTokens: 32768,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	},
	// Listed in hermes-upstage-setup.sh but absent from the model page's
	// Versions list, so it may never appear in /v1/models. Harmless either way —
	// the availability intersection drops it.
	{
		id: "solar-open2-preview",
		name: "Solar Open 2 Preview",
		reasoning: true,
		thinkingLevelMap: { ...PRO3_THINKING },
		contextWindow: 1048576,
		maxTokens: 32768,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	},
];

/** Models to register when /v1/models cannot be reached and no cache exists. */
const GA_FALLBACK = ["solar-pro3", "solar-pro2", "solar-mini"];

/**
 * The API key. env-loader.ts injects ~/.env.local on session_start, which runs
 * after extension factories, so read the file directly rather than depend on
 * that ordering. The provider itself still resolves $UPSTAGE_API_KEY per
 * request — this only decides whether to register at all, and seeds the env
 * var for pi when the shell did not export it.
 */
function resolveApiKey(): string | undefined {
	const fromEnv = process.env.UPSTAGE_API_KEY;
	if (fromEnv) return fromEnv;

	const envFile = path.join(os.homedir(), ".env.local");
	if (!existsSync(envFile)) return undefined;
	try {
		for (const raw of readFileSync(envFile, "utf-8").split("\n")) {
			const line = raw.trim();
			if (!line || line.startsWith("#")) continue;
			const stripped = line.startsWith("export ") ? line.slice(7) : line;
			const eq = stripped.indexOf("=");
			if (eq < 1) continue;
			if (stripped.slice(0, eq).trim() !== "UPSTAGE_API_KEY") continue;
			let value = stripped.slice(eq + 1).trim();
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			if (value) {
				process.env.UPSTAGE_API_KEY = value;
				return value;
			}
		}
	} catch {
		// unreadable ~/.env.local is not worth failing startup over
	}
	return undefined;
}

function readCache(): string[] | undefined {
	try {
		if (!existsSync(CACHE_FILE)) return undefined;
		if (Date.now() - statSync(CACHE_FILE).mtimeMs > CACHE_TTL_MS) return undefined;
		const parsed = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
		if (Array.isArray(parsed?.models) && parsed.models.every((m: unknown) => typeof m === "string")) {
			return parsed.models;
		}
	} catch {
		// fall through to a live fetch
	}
	return undefined;
}

function writeCache(models: string[]): void {
	try {
		mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
		writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), models }, null, 2));
	} catch {
		// cache is an optimization; losing it only costs one request next time
	}
}

async function fetchModelIds(apiKey: string): Promise<string[] | undefined> {
	try {
		const response = await fetch(`${BASE_URL}/models`, {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!response.ok) return undefined;
		const payload = (await response.json()) as { data?: Array<{ id?: string }> };
		const ids = (payload.data ?? []).map((m) => m.id).filter((id): id is string => typeof id === "string");
		return ids.length > 0 ? ids : undefined;
	} catch {
		return undefined;
	}
}

async function resolveAvailableIds(apiKey: string): Promise<string[]> {
	const cached = readCache();
	if (cached) return cached;

	const fetched = await fetchModelIds(apiKey);
	if (fetched) {
		writeCache(fetched);
		return fetched;
	}
	return GA_FALLBACK;
}

export default async function (pi: ExtensionAPI) {
	const apiKey = resolveApiKey();
	if (!apiKey) return;

	const available = new Set(await resolveAvailableIds(apiKey));
	// Upstage also lists version-pinned ids (solar-pro3-260323); the catalog
	// carries aliases only, which their docs recommend for forward compatibility.
	const models = CATALOG.filter((model) => available.has(model.id));
	if (models.length === 0) return;

	pi.registerProvider(PROVIDER_ID, {
		name: PROVIDER_NAME,
		baseUrl: BASE_URL,
		apiKey: "$UPSTAGE_API_KEY",
		api: "openai-completions",
		models: models.map((model) => ({
			id: model.id,
			name: model.name,
			reasoning: model.reasoning,
			...(model.thinkingLevelMap ? { thinkingLevelMap: model.thinkingLevelMap } : {}),
			input: ["text"],
			cost: model.cost,
			contextWindow: model.contextWindow,
			maxTokens: model.maxTokens,
			compat: { ...SOLAR_COMPAT },
		})),
	});
}
