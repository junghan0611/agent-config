/**
 * The dotenv reading `env.mjs` uses: the same as pi-extensions/env-loader.ts parseDotenv, so a durable
 * sibling and a pi sibling read ~/.env.local the same way.
 *
 *   - trim each line; skip blank lines and `#` lines
 *   - strip a leading "export "
 *   - a line with no `=` (or `=` first) is skipped — `case`, `esac`, `fi`, a branch pattern …
 *   - key = text before the first `=`, trimmed; value = the rest, trimmed
 *   - a value both starting and ending with the same quote (" or ') loses those two characters
 *   - every `$HOME` becomes the home directory; a leading `~/` is joined onto it
 *   - everything else stays the literal string: `"v"#x`, `"unterminated`, `$OTHER`, `v # note`
 *   - a repeated key keeps its last value
 *
 * One deliberate difference: a key that is not an identifier ([A-Za-z_][A-Za-z0-9_]*) is skipped.
 * env-loader.ts injects it — a branch line such as `dev) export X=1 ;;` becomes a variable named
 * `dev) export X`.
 *
 * This is assignment extraction, not shell: nothing is executed or sourced, and a `case` is not
 * evaluated — every assignment inside it is read, in file order, as env-loader.ts reads it. Nothing
 * here throws on file content.
 */
import path from "node:path";

const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * @param {string} text
 * @param {string} home the expansion of $HOME and a leading ~/
 * @returns {Map<string, string>}
 */
export function parseDotenv(text, home) {
	const vars = new Map();
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const stripped = line.startsWith("export ") ? line.slice(7) : line;
		const eq = stripped.indexOf("=");
		if (eq < 1) continue;
		const key = stripped.slice(0, eq).trim();
		if (!KEY.test(key)) continue;
		let value = stripped.slice(eq + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		value = value.replace(/\$HOME/g, () => home);
		if (value.startsWith("~/")) value = path.join(home, value.slice(2));
		vars.set(key, value);
	}
	return vars;
}
