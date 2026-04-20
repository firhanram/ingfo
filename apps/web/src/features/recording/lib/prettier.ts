// Prettier's standalone browser build is loaded dynamically so language
// plugins only ship to clients that open a response body.

const PRETTIER_OPTIONS = { printWidth: 100, tabWidth: 2 } as const;

export async function prettify(code: string, lang: string): Promise<string> {
	if (lang === "json") {
		return formatJsonLoose(code);
	}

	try {
		const { format } = await import("prettier/standalone");

		if (lang === "css") {
			const postcss = await import("prettier/plugins/postcss");
			return await format(code, {
				...PRETTIER_OPTIONS,
				parser: "css",
				plugins: [postcss.default],
			});
		}

		if (lang === "html") {
			const html = await import("prettier/plugins/html");
			return await format(code, {
				...PRETTIER_OPTIONS,
				parser: "html",
				plugins: [html.default],
			});
		}

		if (lang === "javascript") {
			const [babel, estree] = await Promise.all([
				import("prettier/plugins/babel"),
				import("prettier/plugins/estree"),
			]);
			return await format(code, {
				...PRETTIER_OPTIONS,
				parser: "babel",
				plugins: [babel.default, estree.default],
			});
		}

		return code;
	} catch {
		// Invalid syntax / unsupported — fall back to the raw code so
		// Shiki can still highlight whatever the server returned.
		return code;
	}
}

// Token-based JSON pretty-printer. Tolerates truncated / partially
// invalid JSON so the response-body renderer stays readable even when
// the extension caps the body mid-string.
function formatJsonLoose(code: string): string {
	const INDENT = "  ";
	let out = "";
	let depth = 0;
	let inString = false;
	let escaped = false;

	const newline = () => {
		out += `\n${INDENT.repeat(depth)}`;
	};

	for (let i = 0; i < code.length; i++) {
		const ch = code[i];

		if (inString) {
			out += ch;
			if (escaped) {
				escaped = false;
			} else if (ch === "\\") {
				escaped = true;
			} else if (ch === '"') {
				inString = false;
			}
			continue;
		}

		if (ch === '"') {
			inString = true;
			out += ch;
			continue;
		}

		if (ch === "{" || ch === "[") {
			out += ch;
			const next = code[i + 1];
			if (next === "}" || next === "]") {
				out += next;
				i++;
				continue;
			}
			depth++;
			newline();
			continue;
		}

		if (ch === "}" || ch === "]") {
			depth = Math.max(0, depth - 1);
			newline();
			out += ch;
			continue;
		}

		if (ch === ",") {
			out += ch;
			newline();
			continue;
		}

		if (ch === ":") {
			out += ": ";
			continue;
		}

		if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
			continue;
		}

		out += ch;
	}

	return out;
}
