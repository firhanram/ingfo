import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { r2 } from "#/lib/r2.server";
import { UploadError } from "#/lib/upload-error";

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
	const metadataSizeBytes = new Blob([metadataJson]).size;
	const metadataLimitBytes = files.metadata.maxSizeBytes;
	if (metadataSizeBytes > metadataLimitBytes) {
		const sizeMiB = (metadataSizeBytes / (1024 * 1024)).toFixed(2);
		const limitMiB = (metadataLimitBytes / (1024 * 1024)).toFixed(2);
		throw new UploadError(
			`Recording metadata is too large: ${sizeMiB} MiB (${metadataSizeBytes} bytes). Maximum allowed: ${limitMiB} MiB (${metadataLimitBytes} bytes). Metadata includes captured network requests and console logs.`,
			413,
		);
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
