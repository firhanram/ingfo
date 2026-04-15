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
