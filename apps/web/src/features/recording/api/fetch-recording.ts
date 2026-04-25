import { createServerFn } from "@tanstack/react-start";
import type { RecordingMetadata } from "#/features/recording/lib/types";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { r2 } from "#/lib/r2.server";

export interface RecordingData {
	recordingUrl: string;
	metadata: RecordingMetadata;
}

export const fetchRecording = createServerFn({ method: "GET" })
	.inputValidator((recordingId: string) => recordingId)
	.handler(async ({ data: recordingId }): Promise<RecordingData> => {
		const { keyPrefix, files } = UPLOAD_CONFIG;
		const metadataKey = `${keyPrefix}/${recordingId}/${files.metadata.filename}`;

		const obj = await r2.get(metadataKey);
		if (!obj) {
			throw new Error("Recording not found (404)");
		}

		const metadata = (await obj.json()) as RecordingMetadata;

		return {
			recordingUrl: `/api/recording/${recordingId}/video`,
			metadata,
		};
	});
