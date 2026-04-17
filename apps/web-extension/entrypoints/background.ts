import {
	consoleCleanupFunction,
	consoleInjectorFunction,
} from "@/lib/console-interceptor";
import { db } from "@/lib/db";
import type { Message, OffscreenMessage, Region } from "@/lib/messages";
import type {
	BrowserInfo,
	MetadataEvent,
	RecordingMetadata,
} from "@/lib/metadata-types";
import {
	startNetworkCapture,
	stopNetworkCapture,
} from "@/lib/network-interceptor";
import { MAX_RECORDING_DURATION_MS } from "@/lib/recording-constants";

// --- Recording state ---
let recordingTabId: number | null = null;
let recordingTabTitle = "";
let recordingMicEnabled = false;
let recorderWindowId: number | null = null;
let usingRecorderWindow = false;

// --- Metadata state ---
let metadataEvents: MetadataEvent[] = [];
let recordingStartTimeMs = 0;
let browserInfo: BrowserInfo | null = null;
let pauseIntervals: { pausedAt: number; resumedAt: number }[] = [];
let currentPauseStart: number | null = null;
let durationLimitSent = false;

export default defineBackground(() => {
	// Re-inject control bar and metadata capture when the recording tab reloads
	browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
		if (
			tabId === recordingTabId &&
			changeInfo.status === "complete" &&
			recordingStartTimeMs > 0
		) {
			handleRecordingTabReloaded(tabId);
		}
	});

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
				currentPauseStart = Date.now();
				sendToOffscreen({ type: "OFFSCREEN_PAUSE" });
				sendResponse({ ok: true });
			} else if (message.type === "RESUME_RECORDING") {
				if (currentPauseStart !== null) {
					pauseIntervals.push({
						pausedAt: currentPauseStart,
						resumedAt: Date.now(),
					});
					currentPauseStart = null;
				}
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

			// --- Duration limit stop ---
			else if (message.type === "DURATION_LIMIT_STOP") {
				sendToOffscreen({ type: "OFFSCREEN_STOP" });
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

					// Enforce duration limit
					if (
						!durationLimitSent &&
						!message.isPaused &&
						message.elapsedMs >= MAX_RECORDING_DURATION_MS
					) {
						durationLimitSent = true;
						sendToOffscreen({ type: "OFFSCREEN_PAUSE" });
						sendToContentScript(recordingTabId, {
							type: "RECORDING_DURATION_LIMIT",
						});
					}
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

			// --- Metadata ---
			else if (message.type === "OFFSCREEN_RECORD_STARTED") {
				recordingStartTimeMs = message.recordingStartTimeMs;
				sendResponse({ ok: true });
			} else if (message.type === "CONSOLE_LOG_EVENT") {
				metadataEvents.push({
					type: "console",
					timestamp: message.timestamp,
					elapsedMs: 0, // computed at recording end
					data: {
						level: message.level,
						args: message.args,
						trace: message.trace,
					},
				});
				sendResponse({ ok: true });
			}

			// --- Shared recording persistence ---
			else if (message.type === "SAVE_SHARED_RECORDING") {
				db.recordings.put(message.payload).then(
					() => sendResponse({ ok: true }),
					(err: unknown) =>
						sendResponse({
							ok: false,
							error: err instanceof Error ? err.message : String(err),
						}),
				);
				return true; // keep sendResponse alive for async put
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

function parseBrowserInfo(ua: string): {
	name: string;
	version: string;
} {
	if (ua.includes("Edg/")) {
		const match = ua.match(/Edg\/([\d.]+)/);
		return { name: "Edge", version: match?.[1] ?? "" };
	}
	if (ua.includes("OPR/")) {
		const match = ua.match(/OPR\/([\d.]+)/);
		return { name: "Opera", version: match?.[1] ?? "" };
	}
	if (ua.includes("Brave")) {
		const match = ua.match(/Chrome\/([\d.]+)/);
		return { name: "Brave", version: match?.[1] ?? "" };
	}
	if (ua.includes("Chrome/")) {
		const match = ua.match(/Chrome\/([\d.]+)/);
		return { name: "Chrome", version: match?.[1] ?? "" };
	}
	if (ua.includes("Firefox/")) {
		const match = ua.match(/Firefox\/([\d.]+)/);
		return { name: "Firefox", version: match?.[1] ?? "" };
	}
	if (ua.includes("Safari/")) {
		const match = ua.match(/Version\/([\d.]+)/);
		return { name: "Safari", version: match?.[1] ?? "" };
	}
	return { name: "Unknown", version: "" };
}

function resetMetadataState(): void {
	metadataEvents = [];
	recordingStartTimeMs = 0;
	browserInfo = null;
	pauseIntervals = [];
	currentPauseStart = null;
	durationLimitSent = false;
}

function computeElapsedMs(timestamp: number): number {
	let elapsed = timestamp - recordingStartTimeMs;
	for (const interval of pauseIntervals) {
		if (timestamp > interval.resumedAt) {
			elapsed -= interval.resumedAt - interval.pausedAt;
		} else if (timestamp > interval.pausedAt) {
			elapsed -= timestamp - interval.pausedAt;
		}
	}
	return Math.max(0, elapsed);
}

async function handleStartRecording(
	micEnabled: boolean,
	recordArea: "tab" | "desktop",
): Promise<void> {
	const { id: tabId, title, width, height } = await getActiveTab();
	recordingTabId = tabId;
	recordingTabTitle = title;
	recordingMicEnabled = micEnabled;

	// Reset metadata for new recording
	resetMetadataState();

	// Collect browser info
	const ua = navigator.userAgent;
	const { name: browserName, version: browserVersion } = parseBrowserInfo(ua);
	const tab = await browser.tabs.get(tabId);
	browserInfo = {
		url: tab.url ?? "",
		title: tab.title ?? "",
		userAgent: ua,
		platform: navigator.platform,
		browserName,
		browserVersion,
		windowWidth: width,
		windowHeight: height,
		devicePixelRatio: 1, // best effort from background
		language: navigator.language,
	};

	// Attach debugger early so the infobar is already visible when we
	// measure the tab dimensions.  This prevents an aspect-ratio mismatch
	// (black bars) caused by the banner shrinking the viewport after the
	// stream constraints are set.
	await startNetworkCapture(tabId, (entry) => {
		metadataEvents.push(entry as MetadataEvent);
	});

	// Wait for the debugger infobar to render before re-measuring
	await new Promise((resolve) => setTimeout(resolve, 200));

	// Re-measure tab dimensions now that the debugger banner is showing
	const postDebuggerTab = await browser.tabs.get(tabId);
	const adjustedWidth = postDebuggerTab.width ?? width;
	const adjustedHeight = postDebuggerTab.height ?? height;

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
			tabWidth: adjustedWidth,
			tabHeight: adjustedHeight,
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
			tabWidth: adjustedWidth,
			tabHeight: adjustedHeight,
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

async function handleRecordingTabReloaded(tabId: number): Promise<void> {
	// Re-inject console interceptor into the reloaded page
	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			func: consoleInjectorFunction,
			world: "MAIN",
		});
	} catch (err) {
		console.warn("[ingfo] Failed to re-inject console interceptor:", err);
	}

	// Re-attach debugger for network capture (debugger detaches on navigation)
	await stopNetworkCapture();
	await startNetworkCapture(tabId, (entry) => {
		metadataEvents.push(entry as MetadataEvent);
	});

	// Update browser info with new URL
	if (browserInfo) {
		const tab = await browser.tabs.get(tabId);
		browserInfo.url = tab.url ?? browserInfo.url;
		browserInfo.title = tab.title ?? browserInfo.title;
	}

	// Re-mount the control bar (skip countdown — recording is already in progress)
	await sendToContentScript(tabId, {
		type: "RECORDING_STARTED",
		micEnabled: recordingMicEnabled,
	});
}

async function handleCountdownDone(): Promise<void> {
	// Inject console interceptor (network capture already started in handleStartRecording)
	if (recordingTabId !== null) {
		try {
			await chrome.scripting.executeScript({
				target: { tabId: recordingTabId },
				func: consoleInjectorFunction,
				world: "MAIN",
			});
		} catch (err) {
			console.warn("[ingfo] Failed to inject console interceptor:", err);
		}
	}

	// Tell offscreen to start recording
	await sendToOffscreen({ type: "OFFSCREEN_RECORD" });

	// Tell content script to show control bar
	if (recordingTabId !== null) {
		await sendToContentScript(recordingTabId, {
			type: "RECORDING_STARTED",
			micEnabled: recordingMicEnabled,
		});
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

async function cleanupMetadataCapture(tabId: number | null): Promise<void> {
	await stopNetworkCapture();

	if (tabId !== null) {
		try {
			await chrome.scripting.executeScript({
				target: { tabId },
				func: consoleCleanupFunction,
				world: "MAIN",
			});
		} catch {
			// Tab may be closed
		}
	}
}

function buildRecordingMetadata(durationMs: number): RecordingMetadata {
	// Compute elapsedMs for all events
	for (const event of metadataEvents) {
		event.elapsedMs = computeElapsedMs(event.timestamp);
	}

	// Sort by timestamp
	metadataEvents.sort((a, b) => a.timestamp - b.timestamp);

	return {
		browserInfo: browserInfo ?? {
			url: "",
			title: "",
			userAgent: "",
			platform: "",
			browserName: "",
			browserVersion: "",
			windowWidth: 0,
			windowHeight: 0,
			devicePixelRatio: 1,
			language: "",
		},
		events: metadataEvents,
		recordingStartTime: recordingStartTimeMs,
		recordingDurationMs: durationMs,
	};
}

async function handleRecordingComplete(
	videoDataUrl: string,
	durationMs: number,
): Promise<void> {
	const tabId = recordingTabId;
	recordingTabId = null;
	recordingTabTitle = "";

	await cleanupMetadataCapture(tabId);
	const metadata = buildRecordingMetadata(durationMs);

	await closeRecordingContext();

	if (tabId !== null) {
		await sendToContentScript(tabId, {
			type: "RECORDING_COMPLETE",
			videoDataUrl,
			durationMs,
			metadata,
		});
	}

	resetMetadataState();
}

async function handleRecordingCancelled(): Promise<void> {
	const tabId = recordingTabId;
	recordingTabId = null;
	recordingTabTitle = "";

	await cleanupMetadataCapture(tabId);
	resetMetadataState();
	await closeRecordingContext();

	// Tell content script to remove control bar / countdown
	if (tabId !== null) {
		await sendToContentScript(tabId, { type: "RECORDING_CANCELLED" });
	}
}
