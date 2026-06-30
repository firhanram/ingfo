import { createServerFn } from "@tanstack/react-start";
import type { ScreenshotMetadata } from "#/features/screenshot/lib/types";
import { SCREENSHOT_UPLOAD_CONFIG } from "#/features/screenshot/lib/upload";
import { r2 } from "#/lib/r2.server";

export interface ScreenshotData {
	imageUrl: string;
	metadata: ScreenshotMetadata;
}

export const fetchScreenshot = createServerFn({ method: "GET" })
	.inputValidator((screenshotId: string) => screenshotId)
	.handler(async ({ data: screenshotId }): Promise<ScreenshotData> => {
		const { keyPrefix, files } = SCREENSHOT_UPLOAD_CONFIG;
		const metadataKey = `${keyPrefix}/${screenshotId}/${files.metadata.filename}`;

		const obj = await r2.get(metadataKey);
		if (!obj) {
			throw new Error("Screenshot not found (404)");
		}

		const metadata = (await obj.json()) as ScreenshotMetadata;

		return {
			imageUrl: `/api/screenshot/${screenshotId}/image`,
			metadata,
		};
	});
