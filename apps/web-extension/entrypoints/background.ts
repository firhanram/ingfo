import type { Message, OffscreenMessage, Region } from "@/lib/messages";

// --- Recording state ---
let recordingTabId: number | null = null;
let recordingTabTitle = "";
let recorderWindowId: number | null = null;
let usingRecorderWindow = false;

export default defineBackground(() => {
	browser.runtime.onMessage.addListener(
		(message: Message | OffscreenMessage, _sender, sendResponse) => {
			// --- Screenshot flow ---
			if (message.type === "START_CAPTURE") {
				handleStartCapture();
				sendResponse({ ok: true });
			} else if (message.type === "SELECTION_RESULT") {
				handleSelectionResult(message.region, message.devicePixelRatio);
				sendResponse({ ok: true });
			} else if (message.type === "CANCEL_CAPTURE") {
				sendResponse({ ok: true });
			}

			// --- Recording state query ---
			else if (message.type === "GET_RECORDING_STATE") {
				sendResponse({
					isRecording: recordingTabId !== null,
					recordingTabId,
					recordingTabTitle,
				});
			}

			// --- Recording flow ---
			else if (message.type === "START_RECORDING") {
				handleStartRecording(message.micEnabled, message.recordArea);
				sendResponse({ ok: true });
			} else if (message.type === "COUNTDOWN_DONE") {
				handleCountdownDone();
				sendResponse({ ok: true });
			} else if (message.type === "COUNTDOWN_CANCELLED") {
				handleRecordingCancelled();
				sendResponse({ ok: true });
			} else if (message.type === "PAUSE_RECORDING") {
				sendToOffscreen({ type: "OFFSCREEN_PAUSE" });
				sendResponse({ ok: true });
			} else if (message.type === "RESUME_RECORDING") {
				sendToOffscreen({ type: "OFFSCREEN_RESUME" });
				sendResponse({ ok: true });
			} else if (message.type === "TOGGLE_MIC") {
				sendToOffscreen({ type: "OFFSCREEN_TOGGLE_MIC" });
				sendResponse({ ok: true });
			} else if (message.type === "STOP_RECORDING") {
				sendToOffscreen({ type: "OFFSCREEN_STOP" });
				sendResponse({ ok: true });
			} else if (message.type === "CANCEL_RECORDING") {
				sendToOffscreen({ type: "OFFSCREEN_CANCEL" });
				handleRecordingCancelled();
				sendResponse({ ok: true });
			}

			// --- Offscreen responses ---
			else if (message.type === "OFFSCREEN_TIME_UPDATE") {
				if (recordingTabId !== null) {
					sendToContentScript(recordingTabId, {
						type: "RECORDING_TIME_UPDATE",
						elapsedMs: message.elapsedMs,
						isPaused: message.isPaused,
					});
				}
				sendResponse({ ok: true });
			} else if (message.type === "OFFSCREEN_DATA_READY") {
				handleRecordingComplete(message.videoDataUrl, message.durationMs);
				sendResponse({ ok: true });
			} else if (message.type === "RECORDER_READY") {
				if (recorderReadyResolve) {
					recorderReadyResolve();
					recorderReadyResolve = null;
				}
				sendResponse({ ok: true });
			} else if (message.type === "DESKTOP_STREAM_ACQUIRED") {
				// Recorder got the desktop stream — minimize window, show countdown
				handleDesktopStreamAcquired(message.micEnabled);
				sendResponse({ ok: true });
			} else if (message.type === "DESKTOP_PICKER_CANCELLED") {
				// User cancelled the getDisplayMedia picker in the recorder window
				handleRecordingCancelled();
				sendResponse({ ok: true });
			}
		},
	);
});

// --- Helpers ---

async function getActiveTab(): Promise<{
	id: number;
	title: string;
	width: number;
	height: number;
}> {
	const [tab] = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});
	if (!tab?.id) throw new Error("No active tab found");
	return {
		id: tab.id,
		title: tab.title ?? "Tab",
		width: tab.width ?? 1920,
		height: tab.height ?? 1080,
	};
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
		await new Promise((resolve) => setTimeout(resolve, 100));
		await browser.tabs.sendMessage(tabId, message);
	}
}

async function sendToOffscreen(message: OffscreenMessage): Promise<void> {
	try {
		await browser.runtime.sendMessage(message);
	} catch {
		// Offscreen document may be closed
	}
}

// --- Screenshot ---

async function handleStartCapture(): Promise<void> {
	const { id: tabId } = await getActiveTab();
	await sendToContentScript(tabId, { type: "BEGIN_SELECTION" });
}

async function handleSelectionResult(
	region: Region | null,
	devicePixelRatio: number,
): Promise<void> {
	const { id: tabId } = await getActiveTab();

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

// --- Recording ---

async function ensureOffscreenDocument(
	reason: chrome.offscreen.Reason = chrome.offscreen.Reason.USER_MEDIA,
): Promise<void> {
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: ["OFFSCREEN_DOCUMENT"],
	});

	// Close any existing offscreen document (it may have a different reason)
	if (existingContexts.length > 0) {
		await closeOffscreenDocument();
	}

	await chrome.offscreen.createDocument({
		url: "/offscreen.html",
		reasons: [reason],
		justification: "Recording with MediaRecorder",
	});
}

async function closeOffscreenDocument(): Promise<void> {
	try {
		await chrome.offscreen.closeDocument();
	} catch {
		// Already closed
	}
}

let recorderReadyResolve: (() => void) | null = null;

function waitForRecorderReady(): Promise<void> {
	return new Promise((resolve) => {
		recorderReadyResolve = resolve;
	});
}

async function openRecorderWindow(): Promise<void> {
	if (recorderWindowId !== null) {
		try {
			await browser.windows.remove(recorderWindowId);
		} catch {
			// Already closed
		}
	}

	const getUrl = browser.runtime.getURL as (path: string) => string;
	const win = await browser.windows.create({
		url: getUrl("/recorder.html"),
		type: "popup",
		width: 1,
		height: 1,
		left: 0,
		top: 0,
		focused: false,
	});
	recorderWindowId = win?.id ?? null;
}

async function closeRecorderWindow(): Promise<void> {
	if (recorderWindowId !== null) {
		try {
			await browser.windows.remove(recorderWindowId);
		} catch {
			// Already closed
		}
		recorderWindowId = null;
	}
}

async function handleStartRecording(
	micEnabled: boolean,
	recordArea: "tab" | "desktop",
): Promise<void> {
	const { id: tabId, title, width, height } = await getActiveTab();
	recordingTabId = tabId;
	recordingTabTitle = title;

	if (recordArea === "desktop") {
		// Desktop recording: use offscreen document with DISPLAY_MEDIA reason.
		// getDisplayMedia() works without user gesture from offscreen documents,
		// showing Chrome's native screen/window picker directly.
		usingRecorderWindow = false;
		await ensureOffscreenDocument(chrome.offscreen.Reason.DISPLAY_MEDIA);

		await sendToOffscreen({
			type: "OFFSCREEN_START",
			streamId: "",
			micEnabled,
			tabWidth: width,
			tabHeight: height,
			recordArea,
		});

		// Note: BEGIN_COUNTDOWN is sent after DESKTOP_STREAM_ACQUIRED
	} else {
		// Get stream ID for the tab
		const streamId = await new Promise<string>((resolve) => {
			chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) =>
				resolve(id),
			);
		});

		// Use recorder window for mic-enabled recordings (offscreen documents
		// cannot access real microphone devices via getUserMedia).
		// For mic-disabled recordings, use the lighter offscreen document.
		usingRecorderWindow = micEnabled;
		if (micEnabled) {
			await openRecorderWindow();
			await waitForRecorderReady();
		} else {
			await ensureOffscreenDocument();
		}

		await sendToOffscreen({
			type: "OFFSCREEN_START",
			streamId,
			micEnabled,
			tabWidth: width,
			tabHeight: height,
			recordArea,
		});

		// Show countdown on the tab
		await sendToContentScript(tabId, {
			type: "BEGIN_COUNTDOWN",
			micEnabled,
		});
	}
}

async function handleDesktopStreamAcquired(micEnabled: boolean): Promise<void> {
	if (recordingTabId !== null) {
		await sendToContentScript(recordingTabId, {
			type: "BEGIN_COUNTDOWN",
			micEnabled,
		});
	}
}

async function handleCountdownDone(): Promise<void> {
	// Tell offscreen to start recording
	await sendToOffscreen({ type: "OFFSCREEN_RECORD" });

	// Tell content script to show control bar
	if (recordingTabId !== null) {
		await sendToContentScript(recordingTabId, { type: "RECORDING_STARTED" });
	}
}

async function closeRecordingContext(): Promise<void> {
	if (usingRecorderWindow) {
		await closeRecorderWindow();
	} else {
		await closeOffscreenDocument();
	}
	usingRecorderWindow = false;
}

async function handleRecordingComplete(
	videoDataUrl: string,
	durationMs: number,
): Promise<void> {
	const tabId = recordingTabId;
	recordingTabId = null;
	recordingTabTitle = "";
	await closeRecordingContext();

	if (tabId !== null) {
		await sendToContentScript(tabId, {
			type: "RECORDING_COMPLETE",
			videoDataUrl,
			durationMs,
		});
	}
}

async function handleRecordingCancelled(): Promise<void> {
	const tabId = recordingTabId;
	recordingTabId = null;
	recordingTabTitle = "";
	await closeRecordingContext();

	// Tell content script to remove control bar / countdown
	if (tabId !== null) {
		await sendToContentScript(tabId, { type: "RECORDING_CANCELLED" });
	}
}
