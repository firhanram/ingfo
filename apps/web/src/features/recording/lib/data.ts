import metadata from "#/data/dummy-metadata.json";
import { isErrorStatus } from "./format";
import type { ConsoleEvent, NetworkEvent, RecordingEvent } from "./types";

export const allEvents = metadata.events as RecordingEvent[];

export const networkEvents = allEvents.filter(
	(e): e is NetworkEvent => e.type === "network",
);

export const consoleEvents = allEvents.filter(
	(e): e is ConsoleEvent => e.type === "console",
);

export const errorEvents = networkEvents.filter((e) =>
	isErrorStatus(e.data.status),
);

export const largestEvents = [...networkEvents]
	.filter((e) => e.data.encodedDataLength > 0)
	.sort((a, b) => b.data.encodedDataLength - a.data.encodedDataLength)
	.slice(0, 3);

export const slowestEvents = [...networkEvents]
	.sort((a, b) => b.data.duration - a.data.duration)
	.slice(0, 3);

export const totalRecordingMs =
	allEvents.length > 0 ? Math.max(...allEvents.map((e) => e.elapsedMs)) : 0;

export const { browserInfo } = metadata;
