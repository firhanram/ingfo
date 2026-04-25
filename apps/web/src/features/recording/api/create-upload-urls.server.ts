import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { r2 } from "#/lib/r2.server";

export type UploadRecordingResponse = {
	recordingId: string;
};

export async function uploadRecording(
	recording: File,
	metadataJson: string,
): Promise<UploadRecordingResponse> {
	const { keyPrefix, files } = UPLOAD_CONFIG;

	if (recording.size > files.recording.maxSizeBytes) {
		throw new UploadError("Recording file exceeds maximum size", 413);
	}
	if (new Blob([metadataJson]).size > files.metadata.maxSizeBytes) {
		throw new UploadError("Metadata exceeds maximum size", 413);
	}

	const recordingId = crypto.randomUUID();
	const recordingKey = `${keyPrefix}/${recordingId}/${files.recording.filename}`;
	const metadataKey = `${keyPrefix}/${recordingId}/${files.metadata.filename}`;

	await Promise.all([
		r2.put(recordingKey, recording.stream(), {
			httpMetadata: { contentType: files.recording.contentType },
		}),
		r2.put(metadataKey, metadataJson, {
			httpMetadata: { contentType: files.metadata.contentType },
		}),
	]);

	return { recordingId };
}

export class UploadError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}
