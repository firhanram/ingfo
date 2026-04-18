const MAX_WIDTH = 320;
const JPEG_QUALITY = 0.7;

export async function captureThumbnailDataUrl(
	src: string,
	atSeconds: number,
): Promise<string> {
	const canvas = await captureThumbnailCanvas(src, atSeconds);
	return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function captureThumbnailBlob(
	src: string,
	atSeconds: number,
): Promise<Blob> {
	const canvas = await captureThumbnailCanvas(src, atSeconds);
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Failed to encode thumbnail"));
			},
			"image/jpeg",
			JPEG_QUALITY,
		);
	});
}

async function captureThumbnailCanvas(
	src: string,
	atSeconds: number,
): Promise<HTMLCanvasElement> {
	const video = document.createElement("video");
	video.src = src;
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	video.crossOrigin = "anonymous";

	await new Promise<void>((resolve, reject) => {
		video.onloadedmetadata = () => resolve();
		video.onerror = () =>
			reject(new Error("Failed to load video for thumbnail"));
	});

	const seekTarget = Math.max(
		0,
		Math.min(atSeconds, Math.max(0, video.duration - 0.05)),
	);

	await new Promise<void>((resolve, reject) => {
		video.onseeked = () => resolve();
		video.onerror = () => reject(new Error("Failed to seek video"));
		video.currentTime = seekTarget;
	});

	const ratio = video.videoHeight / video.videoWidth || 9 / 16;
	const width = Math.min(MAX_WIDTH, video.videoWidth || MAX_WIDTH);
	const height = Math.round(width * ratio);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D context unavailable");
	ctx.drawImage(video, 0, 0, width, height);

	return canvas;
}
