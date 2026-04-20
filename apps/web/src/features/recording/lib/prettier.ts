// Prettier's standalone browser build is loaded dynamically so language
// plugins only ship to clients that open a response body.

const PRETTIER_OPTIONS = { printWidth: 100, tabWidth: 2 } as const;

export async function prettify(code: string, lang: string): Promise<string> {
	try {
		const { format } = await import("prettier/standalone");

		if (lang === "json") {
			const [babel, estree] = await Promise.all([
				import("prettier/plugins/babel"),
				import("prettier/plugins/estree"),
			]);
			return await format(code, {
				...PRETTIER_OPTIONS,
				parser: "json",
				plugins: [babel.default, estree.default],
			});
		}

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
