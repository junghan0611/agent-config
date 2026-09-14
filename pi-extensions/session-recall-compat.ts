import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type ToolDefinition = { name: string; label?: string; description?: string };
type UpstreamExtension = (pi: ExtensionAPI) => void | Promise<void>;

const UPSTREAM_PATH = join(
	homedir(),
	".pi",
	"agent",
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
