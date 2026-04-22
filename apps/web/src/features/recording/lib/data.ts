import { isErrorStatus } from "./format";
import type {
	BrowserInfo,
	ConsoleEvent,
	NetworkEvent,
	RecordingEvent,
	RecordingMetadata,
} from "./types";

export interface RecordingViewData {
	browserInfo: BrowserInfo;
	networkEvents: NetworkEvent[];
	consoleEvents: ConsoleEvent[];
	errorEvents: NetworkEvent[];
	largestEvents: NetworkEvent[];
	slowestEvents: NetworkEvent[];
	totalRecordingMs: number;
	recordingStartTime: number;
}

export function parseRecordingData(
	metadata: RecordingMetadata,
): RecordingViewData {
	const allEvents = metadata.events as RecordingEvent[];

	const networkEvents = allEvents.filter(
		(e): e is NetworkEvent => e.type === "network",
	);

	const consoleEvents = allEvents.filter(
		(e): e is ConsoleEvent => e.type === "console",
	);

	const errorEvents = networkEvents.filter((e) => isErrorStatus(e.data.status));

	const largestEvents = [...networkEvents]
		.filter((e) => e.data.encodedDataLength > 0)
		.sort((a, b) => b.data.encodedDataLength - a.data.encodedDataLength)
		.slice(0, 3);

	const slowestEvents = [...networkEvents]
		.sort((a, b) => b.data.duration - a.data.duration)
		.slice(0, 3);

	// Prefer the authoritative recording duration captured by the recorder.
	// Falling back to the event-derived max is unreliable: on pages where
	// no network/console events fire after recording starts (e.g. static
	// pages), the max elapsedMs would be 0 and the share page would show
	// Duration 00:00.
	const totalRecordingMs =
		metadata.recordingDurationMs ||
		(allEvents.length > 0 ? Math.max(...allEvents.map((e) => e.elapsedMs)) : 0);

	return {
		browserInfo: metadata.browserInfo,
		networkEvents,
		consoleEvents,
		errorEvents,
		largestEvents,
		slowestEvents,
		totalRecordingMs,
		recordingStartTime: metadata.recordingStartTime,
	};
}
