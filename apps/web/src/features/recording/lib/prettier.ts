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
			try {
				return await format(code, {
					...PRETTIER_OPTIONS,
					parser: "babel",
					plugins: [babel.default, estree.default],
				});
			} catch {
				// Truncated webpack chunks and other partial JS bodies
				// make prettier throw. Fall through to the loose
				// formatter instead of the raw single-line blob.
				return formatJsLoose(code);
			}
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

// Loose JS formatter used when prettier rejects the body (typically
// truncated webpack chunks). Breaks minified JS at structural tokens
// without needing a valid AST. Best-effort — it does not reflow
// expressions, just adds newlines at `{`, `}`, `;`, and top-level `,`.
function formatJsLoose(code: string): string {
	const INDENT = "  ";
	let out = "";
	let depth = 0;
	let i = 0;

	const newline = () => {
		out = out.replace(/[ \t]+$/, "");
		out += `\n${INDENT.repeat(Math.max(0, depth))}`;
	};

	while (i < code.length) {
		const ch = code[i];
		const next = code[i + 1];

		// Line comment
		if (ch === "/" && next === "/") {
			const end = code.indexOf("\n", i);
			const stop = end === -1 ? code.length : end;
			out += code.slice(i, stop);
			i = stop;
			continue;
		}

		// Block comment
		if (ch === "/" && next === "*") {
			const end = code.indexOf("*/", i + 2);
			const stop = end === -1 ? code.length : end + 2;
			out += code.slice(i, stop);
			i = stop;
			continue;
		}

		// String / template literal — copy verbatim
		if (ch === '"' || ch === "'" || ch === "`") {
			const quote = ch;
			out += ch;
			i++;
			while (i < code.length) {
				const c = code[i];
				out += c;
				i++;
				if (c === "\\" && i < code.length) {
					out += code[i];
					i++;
					continue;
				}
				if (c === quote) break;
			}
			continue;
		}

		if (ch === "{" || ch === "[" || ch === "(") {
			out += ch;
			const peek = code[i + 1];
			if (
				(ch === "{" && peek === "}") ||
				(ch === "[" && peek === "]") ||
				(ch === "(" && peek === ")")
			) {
				out += peek;
				i += 2;
				continue;
			}
			depth++;
			if (ch === "{" || ch === "[") newline();
			i++;
			continue;
		}

		if (ch === "}" || ch === "]" || ch === ")") {
			depth = Math.max(0, depth - 1);
			if (ch === "}" || ch === "]") newline();
			out += ch;
			i++;
			continue;
		}

		if (ch === ";") {
			out += ch;
			newline();
			i++;
			continue;
		}

		if (ch === ",") {
			out += ch;
			newline();
			i++;
			continue;
		}

		out += ch;
		i++;
	}

	return out;
}
