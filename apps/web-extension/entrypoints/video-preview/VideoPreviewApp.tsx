import { useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { RecordingMetadata } from "@/lib/metadata-types";
import { VideoPreviewDialog } from "./VideoPreviewDialog";

interface InitPayload {
	videoBlob: Blob;
	durationMs: number;
	metadata: RecordingMetadata;
}

type InboundMessage =
	| {
			type: "VIDEO_PREVIEW_INIT";
			videoBlob: Blob;
			durationMs: number;
			metadata: RecordingMetadata;
	  }
	| { type: "VIDEO_PREVIEW_CLOSE_REQUEST" };

export function VideoPreviewApp() {
	const [payload, setPayload] = useState<InitPayload | null>(null);

	useMountEffect(() => {
		function handleMessage(event: MessageEvent<InboundMessage>) {
			const data = event.data;
			if (!data || typeof data !== "object") return;
			if (data.type === "VIDEO_PREVIEW_INIT") {
				setPayload({
					videoBlob: data.videoBlob,
					durationMs: data.durationMs,
					metadata: data.metadata,
				});
			} else if (data.type === "VIDEO_PREVIEW_CLOSE_REQUEST") {
				closeDialog();
			}
		}

		window.addEventListener("message", handleMessage);
		window.parent.postMessage({ type: "VIDEO_PREVIEW_READY" }, "*");
		return () => window.removeEventListener("message", handleMessage);
	});

	function closeDialog() {
		window.parent.postMessage({ type: "VIDEO_PREVIEW_CLOSE" }, "*");
	}

	if (!payload) return null;

	return (
		<VideoPreviewDialog
			videoBlob={payload.videoBlob}
			durationMs={payload.durationMs}
			metadata={payload.metadata}
			onClose={closeDialog}
		/>
	);
}
