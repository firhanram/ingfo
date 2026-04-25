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
		throw new Error(`Upload failed (${res.status}): ${text || res.statusText}`);
	}

	const data = (await res.json()) as UploadResponse;
	return {
		shareId: data.recordingId,
		shareUrl: `${API_BASE_URL}/share/${data.recordingId}`,
	};
}
