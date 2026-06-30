import { API_BASE_URL } from "@/lib/api-config";
import type { ScreenshotMetadata } from "@/lib/metadata-types";

type UploadResponse = {
	screenshotId: string;
};

export interface ShareResult {
	shareId: string;
	shareUrl: string;
}

export async function shareScreenshot(
	imageBlob: Blob,
	metadata: ScreenshotMetadata,
): Promise<ShareResult> {
	const form = new FormData();
	form.append(
		"screenshot",
		new File([imageBlob], "screenshot.png", { type: "image/png" }),
	);
	form.append("metadata", JSON.stringify(metadata));

	const res = await fetch(`${API_BASE_URL}/api/screenshot/upload`, {
		method: "POST",
		body: form,
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Upload failed (${res.status}): ${text || res.statusText}`);
	}

	const data = (await res.json()) as UploadResponse;
	return {
		shareId: data.screenshotId,
		shareUrl: `${API_BASE_URL}/shot/${data.screenshotId}`,
	};
}
