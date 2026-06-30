export const SCREENSHOT_UPLOAD_CONFIG = {
	keyPrefix: "screenshots",
	files: {
		screenshot: {
			filename: "screenshot.png",
			contentType: "image/png",
			maxSizeBytes: 15 * 1024 * 1024,
		},
		metadata: {
			filename: "metadata.json",
			contentType: "application/json",
			maxSizeBytes: 30 * 1024 * 1024,
		},
	},
} as const;
