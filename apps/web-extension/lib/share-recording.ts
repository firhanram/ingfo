import { API_BASE_URL } from "@/lib/api-config";
import type { RecordingMetadata } from "@/lib/metadata-types";

type UploadResponse = {
	recordingId: string;
};

export interface ShareResult {
	shareId: string;
	shareUrl: string;
}

export async function shareRecording(
	videoBlob: Blob,
	metadata: RecordingMetadata,
): Promise<ShareResult> {
	const form = new FormData();
	form.append(
		"recording",
		new File([videoBlob], "recording.webm", { type: "video/webm" }),
	);
	form.append("metadata", JSON.stringify(metadata));

	const res = await fetch(`${API_BASE_URL}/api/upload`, {
		method: "POST",
		body: form,
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		let message = text || res.statusText;
		try {
			const body: unknown = JSON.parse(text);
			if (
				typeof body === "object" &&
				body !== null &&
				"error" in body &&
				typeof body.error === "string" &&
				body.error.trim()
			) {
				message = body.error;
			}
		} catch {
			// Proxies may return plain text instead of the API's JSON error.
		}
		throw new Error(`Upload failed (${res.status}): ${message}`);
	}

	const data = (await res.json()) as UploadResponse;
	return {
		shareId: data.recordingId,
		shareUrl: `${API_BASE_URL}/share/${data.recordingId}`,
	};
}
