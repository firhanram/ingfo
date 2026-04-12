// Recorder page — used when mic is enabled.
// Extension pages (unlike offscreen documents) CAN access the microphone
// via getUserMedia. This page listens for the same OFFSCREEN_* message
// protocol so the background script needs minimal routing changes.

import { browser } from "wxt/browser";
import type { OffscreenMessage } from "@/lib/messages";

let mediaStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let startTime = 0;
let pausedElapsed = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let isPaused = false;
let audioContext: AudioContext | null = null;
function getElapsedMs(): number {
	if (isPaused) return pausedElapsed;
	return pausedElapsed + (Date.now() - startTime);
}

function startTimeUpdates() {
	timerInterval = setInterval(() => {
		browser.runtime.sendMessage({
			type: "OFFSCREEN_TIME_UPDATE",
			elapsedMs: getElapsedMs(),
			isPaused,
		} satisfies OffscreenMessage);
	}, 500);
}

function stopTimeUpdates() {
	if (timerInterval !== null) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

function cleanupStreams() {
	if (mediaStream) {
		for (const track of mediaStream.getTracks()) track.stop();
		mediaStream = null;
	}
	if (micStream) {
		for (const track of micStream.getTracks()) track.stop();
		micStream = null;
	}
	if (audioContext) {
		audioContext.close();
		audioContext = null;
	}
	recorder = null;
	chunks = [];
	stopTimeUpdates();
}

async function handleStart(
	streamId: string,
	micEnabled: boolean,
	tabWidth: number,
	tabHeight: number,
	_recordArea: "tab" | "desktop",
): Promise<void> {
	cleanupStreams();

	// Tab capture: use chromeMediaSource "tab"
	mediaStream = await navigator.mediaDevices.getUserMedia({
		audio: {
			mandatory: {
				chromeMediaSource: "tab",
				chromeMediaSourceId: streamId,
			},
		} as MediaTrackConstraints,
		video: {
			mandatory: {
				chromeMediaSource: "tab",
				chromeMediaSourceId: streamId,
				maxWidth: tabWidth,
				maxHeight: tabHeight,
			},
		} as MediaTrackConstraints,
	});

	if (micEnabled) {
		try {
			const stored = await browser.storage.local.get("selectedMicDeviceId");
			const deviceId = stored.selectedMicDeviceId as string | undefined;
			if (deviceId) {
				try {
					micStream = await navigator.mediaDevices.getUserMedia({
						audio: { deviceId: { exact: deviceId } },
					});
				} catch {
					console.warn(
						"[ingfo] Selected mic unavailable, falling back to default",
					);
					micStream = await navigator.mediaDevices.getUserMedia({
						audio: true,
					});
				}
			} else {
				micStream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
			}
		} catch (error) {
			console.error("[ingfo] Failed to acquire microphone:", error);
		}
	}
}

async function buildRecordingStream(): Promise<MediaStream> {
	if (!mediaStream) throw new Error("No media stream available");

	const videoTracks = mediaStream.getVideoTracks();

	if (micStream) {
		audioContext = new AudioContext();
		await audioContext.resume();
		const destination = audioContext.createMediaStreamDestination();

		const tabAudioTracks = mediaStream.getAudioTracks();
		if (tabAudioTracks.length > 0) {
			const tabSource = audioContext.createMediaStreamSource(
				new MediaStream(tabAudioTracks),
			);
			tabSource.connect(destination);
		}

		const micSource = audioContext.createMediaStreamSource(micStream);
		micSource.connect(destination);

		return new MediaStream([
			...videoTracks,
			...destination.stream.getAudioTracks(),
		]);
	}

	return mediaStream;
}

async function handleRecord(): Promise<void> {
	const recordingStream = await buildRecordingStream();

	chunks = [];
	recorder = new MediaRecorder(recordingStream, {
		mimeType: "video/webm;codecs=vp9,opus",
	});

	recorder.ondataavailable = (e) => {
		if (e.data.size > 0) chunks.push(e.data);
	};

	recorder.onstop = () => {
		const blob = new Blob(chunks, { type: "video/webm" });
		const durationMs = getElapsedMs();
		stopTimeUpdates();

		const reader = new FileReader();
		reader.onload = () => {
			browser.runtime.sendMessage({
				type: "OFFSCREEN_DATA_READY",
				videoDataUrl: reader.result as string,
				durationMs,
			} satisfies OffscreenMessage);
			cleanupStreams();
		};
		reader.readAsDataURL(blob);
	};

	isPaused = false;
	pausedElapsed = 0;
	startTime = Date.now();
	recorder.start(1000);
	startTimeUpdates();
}

function handlePause(): void {
	if (recorder?.state === "recording") {
		pausedElapsed = getElapsedMs();
		isPaused = true;
		recorder.pause();
	}
}

function handleResume(): void {
	if (recorder?.state === "paused") {
		isPaused = false;
		startTime = Date.now();
		recorder.resume();
	}
}

function handleToggleMic(): void {
	if (micStream) {
		for (const track of micStream.getAudioTracks()) {
			track.enabled = !track.enabled;
		}
	}
}

function handleStop(): void {
	if (recorder && recorder.state !== "inactive") {
		recorder.stop();
	}
}

function handleCancel(): void {
	stopTimeUpdates();
	if (recorder && recorder.state !== "inactive") {
		recorder.onstop = null;
		recorder.stop();
	}
	cleanupStreams();
}

// Signal that the recorder page is ready to receive messages
browser.runtime.sendMessage({
	type: "RECORDER_READY",
} satisfies OffscreenMessage);

// Listen for messages from the background script (same protocol as offscreen)
browser.runtime.onMessage.addListener(
	(message: OffscreenMessage, _sender: unknown, sendResponse: unknown) => {
		const respond = sendResponse as (response: { ok: boolean }) => void;

		switch (message.type) {
			case "OFFSCREEN_START":
				handleStart(
					message.streamId,
					message.micEnabled,
					message.tabWidth,
					message.tabHeight,
					message.recordArea,
				)
					.then(() => respond({ ok: true }))
					.catch((err) => {
						console.error("[ingfo] handleStart failed:", err);
						respond({ ok: false });
					});
				return true;

			case "OFFSCREEN_RECORD":
				handleRecord()
					.then(() => respond({ ok: true }))
					.catch((err) => {
						console.error("[ingfo] handleRecord failed:", err);
						respond({ ok: false });
					});
				return true;

			case "OFFSCREEN_PAUSE":
				handlePause();
				respond({ ok: true });
				break;

			case "OFFSCREEN_RESUME":
				handleResume();
				respond({ ok: true });
				break;

			case "OFFSCREEN_TOGGLE_MIC":
				handleToggleMic();
				respond({ ok: true });
				break;

			case "OFFSCREEN_STOP":
				handleStop();
				respond({ ok: true });
				break;

			case "OFFSCREEN_CANCEL":
				handleCancel();
				respond({ ok: true });
				break;
		}
	},
);
