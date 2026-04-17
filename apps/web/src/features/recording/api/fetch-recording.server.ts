import type { RecordingMetadata } from "#/features/recording/lib/types";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { env } from "#/lib/env.server";

export interface RecordingData {
	recordingUrl: string;
	metadata: RecordingMetadata;
}

export async function fetchRecording(
	recordingId: string,
): Promise<RecordingData> {
	const { keyPrefix, files } = UPLOAD_CONFIG;
	const base = env.R2_PUBLIC_URL.replace(/\/$/, "");

	const metadataUrl = `${base}/${keyPrefix}/${recordingId}/${files.metadata.filename}`;

	const res = await fetch(metadataUrl);
	if (!res.ok) {
		throw new Error(`Recording not found (${res.status})`);
	}

	const metadata = (await res.json()) as RecordingMetadata;

	// Proxy the video through the same origin to avoid CORS issues
	const recordingUrl = `/api/recording/${recordingId}/video`;

	return { recordingUrl, metadata };
}
