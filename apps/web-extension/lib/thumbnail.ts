const MAX_WIDTH = 1280;
const IMAGE_TYPE = "image/webp";
const IMAGE_QUALITY = 0.9;

export async function captureThumbnailDataUrl(
	source: string | HTMLVideoElement,
	atSeconds: number,
): Promise<string> {
	const canvas = await captureThumbnailCanvas(source, atSeconds);
	return canvas.toDataURL(IMAGE_TYPE, IMAGE_QUALITY);
}

export async function captureThumbnailBlob(
	source: string | HTMLVideoElement,
	atSeconds: number,
): Promise<Blob> {
	const canvas = await captureThumbnailCanvas(source, atSeconds);
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Failed to encode thumbnail"));
			},
			IMAGE_TYPE,
			IMAGE_QUALITY,
		);
	});
}

async function captureThumbnailCanvas(
	source: string | HTMLVideoElement,
	atSeconds: number,
): Promise<HTMLCanvasElement> {
	const ownsVideo = typeof source === "string";
	const video = ownsVideo ? document.createElement("video") : source;
	const originalTime = ownsVideo ? 0 : video.currentTime;

	if (ownsVideo) {
		video.muted = true;
		video.playsInline = true;
		video.preload = "auto";

		await new Promise<void>((resolve, reject) => {
			video.onloadeddata = () => resolve();
			video.onerror = () =>
				reject(new Error("Failed to load video for thumbnail"));
			video.src = source;
		});
	}

	const seekTarget = Math.max(
		0,
		Math.min(atSeconds, Math.max(0, video.duration - 0.05)),
	);

	if (Math.abs(video.currentTime - seekTarget) > 0.01) {
		await new Promise<void>((resolve, reject) => {
			video.onseeked = () => resolve();
			video.onerror = () => reject(new Error("Failed to seek video"));
			video.currentTime = seekTarget;
		});
	}

	const ratio = video.videoHeight / video.videoWidth || 9 / 16;
	const width = Math.min(MAX_WIDTH, video.videoWidth || MAX_WIDTH);
	const height = Math.round(width * ratio);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D context unavailable");
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(video, 0, 0, width, height);

	if (!ownsVideo && Math.abs(video.currentTime - originalTime) > 0.01) {
		video.currentTime = originalTime;
	}

	return canvas;
}
