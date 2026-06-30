export function parseBrowserInfo(ua: string): {
	name: string;
	version: string;
} {
	if (ua.includes("Edg/")) {
		const match = ua.match(/Edg\/([\d.]+)/);
		return { name: "Edge", version: match?.[1] ?? "" };
	}
	if (ua.includes("OPR/")) {
		const match = ua.match(/OPR\/([\d.]+)/);
		return { name: "Opera", version: match?.[1] ?? "" };
	}
	if (ua.includes("Brave")) {
		const match = ua.match(/Chrome\/([\d.]+)/);
		return { name: "Brave", version: match?.[1] ?? "" };
	}
	if (ua.includes("Chrome/")) {
		const match = ua.match(/Chrome\/([\d.]+)/);
		return { name: "Chrome", version: match?.[1] ?? "" };
	}
	if (ua.includes("Firefox/")) {
		const match = ua.match(/Firefox\/([\d.]+)/);
		return { name: "Firefox", version: match?.[1] ?? "" };
	}
	if (ua.includes("Safari/")) {
		const match = ua.match(/Version\/([\d.]+)/);
		return { name: "Safari", version: match?.[1] ?? "" };
	}
	return { name: "Unknown", version: "" };
}
