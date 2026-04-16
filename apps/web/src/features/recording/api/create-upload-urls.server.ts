import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { R2_BUCKET, r2Client } from "#/lib/r2.server";

export type UploadUrlsResponse = {
	recordingId: string;
	uploadUrls: {
		recording: string;
		metadata: string;
	};
	expiresInSeconds: number;
};

export async function generateUploadUrls(): Promise<UploadUrlsResponse> {
	const recordingId = crypto.randomUUID();
	const { keyPrefix, files, presignedUrlExpirySeconds } = UPLOAD_CONFIG;

	const [recording, metadata] = await Promise.all([
		getSignedUrl(
			r2Client,
			new PutObjectCommand({
				Bucket: R2_BUCKET,
				Key: `${keyPrefix}/${recordingId}/${files.recording.filename}`,
				ContentType: files.recording.contentType,
			}),
			{ expiresIn: presignedUrlExpirySeconds },
		),
		getSignedUrl(
			r2Client,
			new PutObjectCommand({
				Bucket: R2_BUCKET,
				Key: `${keyPrefix}/${recordingId}/${files.metadata.filename}`,
				ContentType: files.metadata.contentType,
			}),
			{ expiresIn: presignedUrlExpirySeconds },
		),
	]);

	return {
		recordingId,
		uploadUrls: { recording, metadata },
		expiresInSeconds: presignedUrlExpirySeconds,
	};
}
