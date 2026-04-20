export interface NetworkEvent {
	type: "network";
	timestamp: number;
	elapsedMs: number;
	data: {
		url: string;
		method: string;
		status: number;
		statusText: string;
		initiatorType: string;
		resourceType?: string;
		cacheSource?: "memory" | "disk" | "prefetch";
		startTime: number;
		responseEnd: number;
		duration: number;
		encodedDataLength: number;
		cached: boolean;
		mimeType: string;
		requestHeaders: Record<string, string>;
		responseHeaders: Record<string, string>;
		requestBody: string | null;
		responseBody: string | null;
	};
}

export interface ConsoleEvent {
	type: "console";
	timestamp: number;
	elapsedMs: number;
	data: {
		level: string;
		args: string[];
		trace: string[];
	};
}

export type RecordingEvent = NetworkEvent | ConsoleEvent;

export interface BrowserInfo {
	url: string;
	title: string;
	userAgent: string;
	platform: string;
	browserName: string;
	browserVersion: string;
	windowWidth: number;
	windowHeight: number;
	devicePixelRatio: number;
	language: string;
}

export interface RecordingMetadata {
	browserInfo: BrowserInfo;
	events: RecordingEvent[];
	recordingStartTime: number;
	recordingDurationMs: number;
}

export const FILTER_CATEGORIES = [
	"All",
	"Fetch/XHR",
	"Doc",
	"CSS",
	"JS",
	"Font",
	"Img",
	"Media",
	"Manifest",
	"WS",
	"Wasm",
	"Other",
] as const;

export type FilterCategory = (typeof FILTER_CATEGORIES)[number];
