// Loose, tolerant formatters for rendered response bodies. We avoid
// prettier because real-world captures are often truncated at
// MAX_BODY_SIZE, and prettier bails on any syntax error — producing an
// unreadable single-line wall. These walkers never throw: they insert
// newlines at structural tokens while preserving strings and comments.

export function prettify(code: string, lang: string): string {
	switch (lang) {
		case "json":
			return formatJsonLoose(code);
		case "javascript":
			return formatJsLoose(code);
		case "css":
			return formatCssLoose(code);
		case "html":
		case "xml":
			return formatHtmlLoose(code);
		default:
			return code;
	}
}

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
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
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

		if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") continue;

		out += ch;
	}

	return out;
}

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

		if (ch === "/" && next === "/") {
			const end = code.indexOf("\n", i);
			const stop = end === -1 ? code.length : end;
			out += code.slice(i, stop);
			i = stop;
			continue;
		}

		if (ch === "/" && next === "*") {
			const end = code.indexOf("*/", i + 2);
			const stop = end === -1 ? code.length : end + 2;
			out += code.slice(i, stop);
			i = stop;
			continue;
		}

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

		if (ch === ";" || ch === ",") {
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

function formatCssLoose(code: string): string {
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

		if (ch === "/" && next === "*") {
			const end = code.indexOf("*/", i + 2);
			const stop = end === -1 ? code.length : end + 2;
			out += code.slice(i, stop);
			i = stop;
			continue;
		}

		if (ch === '"' || ch === "'") {
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

		if (ch === "{") {
			out = out.replace(/\s+$/, "");
			out += " {";
			depth++;
			newline();
			i++;
			continue;
		}

		if (ch === "}") {
			depth = Math.max(0, depth - 1);
			newline();
			out += "}";
			i++;
			// Collapse the newline we just added and re-emit on the next
			// declaration start so closing braces sit on their own line.
			const after = code[i];
			if (after && after !== "}") newline();
			continue;
		}

		if (ch === ";") {
			out += ";";
			newline();
			i++;
			continue;
		}

		if (ch === "\n" || ch === "\r" || ch === "\t") {
			i++;
			continue;
		}

		out += ch;
		i++;
	}

	return out;
}

function formatHtmlLoose(code: string): string {
	const INDENT = "  ";
	const VOID = new Set([
		"area",
		"base",
		"br",
		"col",
		"embed",
		"hr",
		"img",
		"input",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	]);
	let out = "";
	let depth = 0;
	let i = 0;

	const newline = () => {
		out = out.replace(/[ \t]+$/, "");
		if (out.length > 0) out += "\n";
		out += INDENT.repeat(Math.max(0, depth));
	};

	while (i < code.length) {
		if (code[i] === "<") {
			const end = code.indexOf(">", i);
			if (end === -1) {
				out += code.slice(i);
				break;
			}
			const tag = code.slice(i, end + 1);
			const isClose = tag.startsWith("</");
			const isComment = tag.startsWith("<!--");
			const isDoctype = /^<!doctype/i.test(tag);
			const isSelfClosing = tag.endsWith("/>");
			const nameMatch = tag.match(/^<\/?\s*([a-z0-9:-]+)/i);
			const name = nameMatch?.[1]?.toLowerCase() ?? "";
			const isVoid = VOID.has(name);

			if (isClose) depth = Math.max(0, depth - 1);
			newline();
			out += tag;
			if (!isClose && !isComment && !isDoctype && !isSelfClosing && !isVoid) {
				depth++;
			}
			i = end + 1;
			continue;
		}

		// Text content between tags — trim runs of whitespace to a single
		// space and skip newlines that the minifier left behind.
		const next = code.indexOf("<", i);
		const stop = next === -1 ? code.length : next;
		const text = code.slice(i, stop).replace(/\s+/g, " ");
		if (text.trim().length > 0) {
			newline();
			out += text.trim();
		}
		i = stop;
	}

	return out.trim();
}
