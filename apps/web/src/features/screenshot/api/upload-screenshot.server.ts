import { SCREENSHOT_UPLOAD_CONFIG } from "#/features/screenshot/lib/upload";
import { r2 } from "#/lib/r2.server";
import { UploadError } from "#/lib/upload-error";

export type UploadScreenshotResponse = {
	screenshotId: string;
};

export async function uploadScreenshot(
	screenshot: File,
	metadataJson: string,
): Promise<UploadScreenshotResponse> {
	const { keyPrefix, files } = SCREENSHOT_UPLOAD_CONFIG;

	if (screenshot.size > files.screenshot.maxSizeBytes) {
		throw new UploadError("Screenshot file exceeds maximum size", 413);
	}
	if (new Blob([metadataJson]).size > files.metadata.maxSizeBytes) {
		throw new UploadError("Metadata exceeds maximum size", 413);
	}

	const screenshotId = crypto.randomUUID();
	const screenshotKey = `${keyPrefix}/${screenshotId}/${files.screenshot.filename}`;
	const metadataKey = `${keyPrefix}/${screenshotId}/${files.metadata.filename}`;

	await Promise.all([
		r2.put(screenshotKey, screenshot.stream(), {
			httpMetadata: { contentType: files.screenshot.contentType },
		}),
		r2.put(metadataKey, metadataJson, {
			httpMetadata: { contentType: files.metadata.contentType },
		}),
	]);

	return { screenshotId };
}
