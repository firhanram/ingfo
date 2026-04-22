export function formatBytes(bytes: number): string {
	if (bytes === 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSize(
	bytes: number,
	cacheSource?: "memory" | "disk" | "prefetch",
): string {
	if (cacheSource === "memory") return "memory cache";
	if (cacheSource === "disk") return "disk cache";
	if (cacheSource === "prefetch") return "prefetch cache";
	return formatBytes(bytes);
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

export function formatTimestamp(ms: number): string {
	if (!ms) return "—";
	const date = new Date(ms);
	const datePart = date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
	const timePart = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	const offsetMin = -date.getTimezoneOffset();
	const sign = offsetMin >= 0 ? "+" : "-";
	const abs = Math.abs(offsetMin);
	const oh = Math.floor(abs / 60);
	const om = abs % 60;
	const tz =
		om === 0
			? `GMT${sign}${oh}`
			: `GMT${sign}${oh}:${String(om).padStart(2, "0")}`;
	return `${datePart} at ${timePart} ${tz}`;
}

export interface ParsedOS {
	name: string;
	version: string;
	family: "macos" | "ios" | "windows" | "android" | "linux" | "unknown";
}

export function parseOS(
	userAgent: string,
	platform: string,
	hints?: {
		osName?: string;
		osVersion?: string;
		architecture?: string;
	},
): ParsedOS {
	const ua = userAgent || "";
	const plat = platform || "";

	if (hints?.osName) {
		const name = hints.osName;
		const version = hints.osVersion ?? "";
		const arch = hints.architecture;
		const family: ParsedOS["family"] =
			name === "macOS"
				? "macos"
				: name === "iOS" || name === "iPadOS"
					? "ios"
					: name === "Windows"
						? "windows"
						: name === "Android"
							? "android"
							: name === "Linux" || name === "Chrome OS"
								? "linux"
								: "unknown";
		const displayName =
			family === "macos" && arch === "arm" ? `${name} (arm)` : name;
		return { name: displayName, version, family };
	}

	const iosMatch = ua.match(/OS (\d+[_.]\d+(?:[_.]\d+)?) like Mac OS X/);
	if (iosMatch) {
		return {
			name: /iPad/.test(ua) ? "iPadOS" : "iOS",
			version: iosMatch[1].replace(/_/g, "."),
			family: "ios",
		};
	}

	const macMatch = ua.match(/Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)/);
	if (macMatch || /Mac/i.test(plat)) {
		const version = macMatch ? macMatch[1].replace(/_/g, ".") : "";
		return { name: "macOS", version, family: "macos" };
	}

	const winMatch = ua.match(/Windows NT (\d+\.\d+)/);
	if (winMatch) {
		const map: Record<string, string> = {
			"10.0": "10",
			"6.3": "8.1",
			"6.2": "8",
			"6.1": "7",
		};
		return {
			name: "Windows",
			version: map[winMatch[1]] ?? winMatch[1],
			family: "windows",
		};
	}

	const androidMatch = ua.match(/Android (\d+(?:\.\d+)*)/);
	if (androidMatch) {
		return { name: "Android", version: androidMatch[1], family: "android" };
	}

	if (/Linux/i.test(ua) || /Linux/i.test(plat)) {
		return { name: "Linux", version: "", family: "linux" };
	}

	return { name: plat || "Unknown", version: "", family: "unknown" };
}

export interface ParsedBrowser {
	name: string;
	family: "chrome" | "firefox" | "safari" | "edge" | "opera" | "unknown";
}

export function parseBrowserFamily(name: string): ParsedBrowser["family"] {
	const n = name.toLowerCase();
	if (n.includes("edge")) return "edge";
	if (n.includes("opera") || n.includes("opr")) return "opera";
	if (n.includes("firefox")) return "firefox";
	if (n.includes("chrome")) return "chrome";
	if (n.includes("safari")) return "safari";
	return "unknown";
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
