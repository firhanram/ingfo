import type { Message, Region } from "@/lib/messages";

export default defineBackground(() => {
	browser.runtime.onMessage.addListener(
		(message: Message, _sender, sendResponse) => {
			if (message.type === "START_CAPTURE") {
				handleStartCapture();
				sendResponse({ ok: true });
			} else if (message.type === "SELECTION_RESULT") {
				handleSelectionResult(message.region, message.devicePixelRatio);
				sendResponse({ ok: true });
			} else if (message.type === "CANCEL_CAPTURE") {
				sendResponse({ ok: true });
			}
		},
	);
});

async function getActiveTab(): Promise<number> {
	const [tab] = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});
	if (!tab?.id) throw new Error("No active tab found");
	return tab.id;
}

async function sendToContentScript(
	tabId: number,
	message: Message,
): Promise<void> {
	try {
		await browser.tabs.sendMessage(tabId, message);
	} catch {
		// Content script not injected yet — inject it, then retry
		await browser.scripting.executeScript({
			target: { tabId },
			files: ["/content-scripts/content.js"],
		});
		// Small delay to let the content script initialize
		await new Promise((resolve) => setTimeout(resolve, 100));
		await browser.tabs.sendMessage(tabId, message);
	}
}

async function handleStartCapture(): Promise<void> {
	const tabId = await getActiveTab();
	await sendToContentScript(tabId, { type: "BEGIN_SELECTION" });
}

async function handleSelectionResult(
	region: Region | null,
	devicePixelRatio: number,
): Promise<void> {
	const tabId = await getActiveTab();

	// Wait for overlay to be removed from the DOM before capturing
	await new Promise((resolve) => setTimeout(resolve, 100));

	const fullDataUrl = await browser.tabs.captureVisibleTab({
		format: "png",
	});

	let croppedDataUrl = fullDataUrl;

	if (region) {
		croppedDataUrl = await cropImage(fullDataUrl, region, devicePixelRatio);
	}

	await sendToContentScript(tabId, {
		type: "CAPTURE_COMPLETE",
		imageDataUrl: croppedDataUrl,
	});
}

async function cropImage(
	dataUrl: string,
	region: Region,
	dpr: number,
): Promise<string> {
	const response = await fetch(dataUrl);
	const blob = await response.blob();

	// Scale coordinates by devicePixelRatio
	const sx = Math.round(region.x * dpr);
	const sy = Math.round(region.y * dpr);
	const sw = Math.round(region.width * dpr);
	const sh = Math.round(region.height * dpr);

	const imageBitmap = await createImageBitmap(blob, sx, sy, sw, sh);

	const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");

	ctx.drawImage(imageBitmap, 0, 0);
	imageBitmap.close();

	const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
	return blobToDataUrl(croppedBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
