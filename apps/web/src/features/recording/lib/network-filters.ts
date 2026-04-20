import type { FilterCategory, NetworkEvent } from "./types";

export function getResourceType(event: NetworkEvent): string {
	const { initiatorType, resourceType, mimeType, url } = event.data;
	const mime = mimeType.toLowerCase();

	// Prefer the authoritative CDP ResourceType (what Chrome DevTools
	// itself displays). Falls through to heuristics for older captures
	// that predate this field.
	switch (resourceType) {
		case "Document":
			return "document";
		case "Stylesheet":
			return "stylesheet";
		case "Script":
			return "script";
		case "Font":
			return "font";
		case "XHR":
			return "xhr";
		case "Fetch":
			return "fetch";
		case "WebSocket":
			return "websocket";
		case "Manifest":
			return "manifest";
		case "Preflight":
			return "preflight";
		case "Ping":
			return "ping";
		case "EventSource":
			return "eventsource";
	}

	// Preflight requests
	if (initiatorType === "preflight") return "preflight";
	// XHR / Fetch
	if (initiatorType === "xmlhttprequest") return "xhr";
	if (initiatorType === "fetch") return "fetch";
	// WebSocket
	if (initiatorType === "websocket") return "websocket";

	// Derive from mimeType
	if (mime.includes("text/html")) return "document";
	if (mime.includes("text/css")) return "stylesheet";
	if (
		mime.includes("javascript") ||
		mime.includes("ecmascript") ||
		mime.includes("x-javascript")
	)
		return "script";
	if (mime.includes("application/json")) return "fetch";
	if (mime.includes("font/")) return "font";
	if (mime.includes("text/plain")) return "fetch";
	if (mime.includes("wasm")) return "wasm";

	// Images — show the specific format
	if (mime.includes("image/png")) return "png";
	if (mime.includes("image/jpeg")) return "jpeg";
	if (mime.includes("image/gif")) return "gif";
	if (mime.includes("image/svg")) return "svg";
	if (mime.includes("image/webp")) return "webp";
	if (mime.includes("image/x-icon")) return "ico";
	if (mime.includes("image/avif")) return "avif";
	if (mime.includes("image/")) return mime.split("/")[1];

	if (mime.includes("video/") || mime.includes("audio/"))
		return mime.split("/")[1];
	if (mime.includes("manifest")) return "manifest";

	// Fallback: try URL extension
	const extMatch = url.split("?")[0].match(/\.([a-z0-9]+)$/i);
	if (extMatch) return extMatch[1];

	// Last resort
	if (initiatorType === "script") return "fetch";
	return initiatorType || "other";
}

export function categorizeRequest(event: NetworkEvent): FilterCategory {
	const rt = getResourceType(event);

	switch (rt) {
		case "fetch":
		case "xhr":
		case "preflight":
			return "Fetch/XHR";
		case "document":
			return "Doc";
		case "stylesheet":
			return "CSS";
		case "script":
			return "JS";
		case "font":
		case "woff2":
		case "woff":
		case "ttf":
		case "otf":
		case "eot":
			return "Font";
		case "png":
		case "jpeg":
		case "gif":
		case "svg":
		case "webp":
		case "ico":
		case "avif":
			return "Img";
		case "mp4":
		case "webm":
		case "ogg":
		case "mp3":
		case "wav":
			return "Media";
		case "manifest":
			return "Manifest";
		case "websocket":
			return "WS";
		case "wasm":
			return "Wasm";
		default:
			return "Other";
	}
}
