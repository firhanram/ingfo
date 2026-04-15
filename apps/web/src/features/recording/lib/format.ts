export function formatBytes(bytes: number): string {
	if (bytes === 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)} ms`;
	return `${(ms / 1000).toFixed(2)} s`;
}

export function formatElapsed(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getDisplayName(url: string): string {
	try {
		const parsed = new URL(url);
		const pathname = parsed.pathname;

		if (pathname === "/" || pathname === "") {
			const query = parsed.search;
			if (query) return parsed.hostname + query;
			return parsed.hostname;
		}

		const segments = pathname.split("/").filter(Boolean);
		const lastSegment = segments[segments.length - 1];
		const query = parsed.search;
		return lastSegment + query;
	} catch {
		return url;
	}
}

export function getDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}

export function isErrorStatus(status: number): boolean {
	return status === 0 || status >= 400;
}

export function formatJsonSafe(str: string): string {
	try {
		return JSON.stringify(JSON.parse(str), null, 2);
	} catch {
		return str;
	}
}

export function detectLanguage(mimeType: string, content: string): string {
	const mime = mimeType.toLowerCase();
	if (mime.includes("json")) return "json";
	if (mime.includes("html")) return "html";
	if (mime.includes("css")) return "css";
	if (mime.includes("javascript") || mime.includes("ecmascript"))
		return "javascript";
	if (mime.includes("xml")) return "xml";

	const trimmed = content.trimStart();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
	if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) return "html";
	if (trimmed.startsWith("<")) return "xml";
	return "text";
}
