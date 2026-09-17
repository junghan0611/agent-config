import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type ToolDefinition = { name: string; label?: string; description?: string };
type UpstreamExtension = (pi: ExtensionAPI) => void | Promise<void>;

/**
 * Resolve the upstream module from the same agent directory Pi itself uses, not from
 * HOME. Pi's `getAgentDir()` also retains its path normalization contract (including `~`)
 * rather than re-implementing it here.
 *
 * `[측정 2026-09-16]` HOME and agent dir are not always the default pair. entwurf's LIVE
 * gates launch pi with a SANDBOX HOME and the operator's REAL `PI_CODING_AGENT_DIR` (the
 * agent dir is kept real on purpose — that is where runtime auth lives). This extension
 * then loaded from the real agent dir while resolving its dependency under the sandbox
 * HOME, where it does not exist, so pi refused to boot and exited before its first turn:
 *
 *   Cannot find module '<sandbox-home>/.pi/agent/npm/node_modules/@ogulcancelik/…'
 *
 * The visible symptom was a fresh sibling whose window vanished with no callback, twice,
 * with nothing in any log that named this file.
 */
const AGENT_DIR = getAgentDir();

const UPSTREAM_PATH = join(
	AGENT_DIR,
	"npm",
	"node_modules",
	"@ogulcancelik",
	"pi-session-recall",
	"session-recall.ts",
);

/**
 * andenken owns semantic `session_search`. The upstream extension also names
 * its literal rg tool `session_search`, so load it through this Pi-local seam
 * as `session_literal_search`; its focused `session_query` keeps its name.
 */
export default async function sessionRecallCompat(pi: ExtensionAPI): Promise<void> {
	const upstream = (await import(pathToFileURL(UPSTREAM_PATH).href)).default as UpstreamExtension;
	const compat = new Proxy(pi, {
		get(target, property, receiver) {
			if (property === "registerTool") {
				return (tool: ToolDefinition) => target.registerTool(
					tool.name === "session_search"
						? { ...tool, name: "session_literal_search", label: "Session Literal Search" }
						: tool,
				);
			}
			return Reflect.get(target, property, receiver);
		},
	});
	await upstream(compat);
}
