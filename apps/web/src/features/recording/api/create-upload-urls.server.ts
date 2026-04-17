import { PutObjectCommand } from "@aws-sdk/client-s3";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { env } from "#/lib/env.server";
import { R2_BUCKET, r2Client } from "#/lib/r2.server";

export type UploadRecordingResponse = {
	recordingId: string;
	recordingUrl: string;
	metadataUrl: string;
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

	const recordingBody = new Uint8Array(await recording.arrayBuffer());

	await Promise.all([
		r2Client.send(
			new PutObjectCommand({
				Bucket: R2_BUCKET,
				Key: recordingKey,
				Body: recordingBody,
				ContentType: files.recording.contentType,
			}),
		),
		r2Client.send(
			new PutObjectCommand({
				Bucket: R2_BUCKET,
				Key: metadataKey,
				Body: metadataJson,
				ContentType: files.metadata.contentType,
			}),
		),
	]);

	const base = env.R2_PUBLIC_URL.replace(/\/$/, "");

	return {
		recordingId,
		recordingUrl: `${base}/${recordingKey}`,
		metadataUrl: `${base}/${metadataKey}`,
	};
}

export class UploadError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}
