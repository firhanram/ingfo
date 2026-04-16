export const UPLOAD_CONFIG = {
	presignedUrlExpirySeconds: 300,
	keyPrefix: "recordings",
	files: {
		recording: {
			filename: "recording.webm",
			contentType: "video/webm",
			maxSizeBytes: 50 * 1024 * 1024,
		},
		metadata: {
			filename: "metadata.json",
			contentType: "application/json",
			maxSizeBytes: 30 * 1024 * 1024,
		},
	},
} as const;
