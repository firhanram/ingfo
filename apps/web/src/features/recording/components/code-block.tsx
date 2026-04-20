import { useEffect, useState } from "react";
import { detectLanguage } from "../lib/format";
import { prettify } from "../lib/prettier";

const highlightCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 50;

function cacheKey(lang: string, code: string) {
	return `${lang}:${code.length}:${code}`;
}

export function CodeBlock({
	code,
	mimeType,
}: {
	code: string;
	mimeType: string;
}) {
	const lang = detectLanguage(mimeType, code);
	const cached =
		lang === "text" ? null : (highlightCache.get(cacheKey(lang, code)) ?? null);
	const [html, setHtml] = useState<string | null>(cached);

	useEffect(() => {
		if (lang === "text") {
			setHtml(null);
			return;
		}

		const key = cacheKey(lang, code);
		const hit = highlightCache.get(key);
		if (hit) {
			setHtml(hit);
			return;
		}

		setHtml(null);
		let cancelled = false;
		const handle = window.setTimeout(() => {
			(async () => {
				const formatted = await prettify(code, lang);
				if (cancelled) return;
				const { codeToHtml } = await import("shiki");
				const result = await codeToHtml(formatted, {
					lang,
					theme: "github-light",
				});
				if (cancelled) return;
				if (highlightCache.size >= MAX_CACHE_ENTRIES) {
					const oldestKey = highlightCache.keys().next().value;
					if (oldestKey) highlightCache.delete(oldestKey);
				}
				highlightCache.set(key, result);
				setHtml(result);
			})();
		}, 0);

		return () => {
			cancelled = true;
			window.clearTimeout(handle);
		};
	}, [code, lang]);

	if (lang === "text") {
		return (
			<pre className="whitespace-pre-wrap break-all rounded-md bg-surface-sunken p-3 font-mono text-xs text-neutral-700">
				{code}
			</pre>
		);
	}

	if (!html) {
		return (
			<div className="animate-pulse rounded-md bg-surface-sunken p-3">
				<div className="space-y-2">
					<div className="h-3 w-3/4 rounded bg-neutral-200" />
					<div className="h-3 w-1/2 rounded bg-neutral-200" />
					<div className="h-3 w-5/6 rounded bg-neutral-200" />
					<div className="h-3 w-2/3 rounded bg-neutral-200" />
				</div>
			</div>
		);
	}

	return (
		<div
			className="overflow-auto rounded-md bg-surface-sunken p-3 text-xs [&_pre]:!bg-transparent [&_pre]:!whitespace-pre-wrap [&_pre]:!break-all [&_code]:!text-xs"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is safe
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
