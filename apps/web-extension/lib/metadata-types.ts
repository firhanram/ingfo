export interface NetworkLogEntry {
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
		requestHeaders: Record<string, string>;
		responseHeaders: Record<string, string>;
		requestBody: string | null;
		responseBody: string | null;
		mimeType: string;
		encodedDataLength: number;
		cached: boolean;
	};
}

export interface ConsoleLogEntry {
	type: "console";
	timestamp: number;
	elapsedMs: number;
	data: {
		level: "log" | "warn" | "error" | "info" | "debug";
		args: string[];
		trace: string[];
	};
}

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

export type MetadataEvent = NetworkLogEntry | ConsoleLogEntry;

export interface RecordingMetadata {
	browserInfo: BrowserInfo;
	events: MetadataEvent[];
	recordingStartTime: number;
	recordingDurationMs: number;
}
