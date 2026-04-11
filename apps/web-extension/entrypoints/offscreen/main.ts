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
): Promise<void> {
	cleanupStreams();

	// Get tab media stream using the stream ID from tabCapture.
	// Constrain to the tab's actual viewport size to avoid aspect-ratio
	// mismatch that causes black letterboxing in the recorded video.
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

	// If mic enabled, get mic stream and mix audio
	if (micEnabled) {
		try {
			micStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
		} catch {
			// Mic unavailable — continue without it
		}
	}
}

function buildRecordingStream(): MediaStream {
	if (!mediaStream) throw new Error("No media stream available");

	const videoTracks = mediaStream.getVideoTracks();

	// If we have a mic stream, mix tab audio + mic audio
	if (micStream) {
		audioContext = new AudioContext();
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

function handleRecord(): void {
	const recordingStream = buildRecordingStream();

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
	recorder.start(1000); // Collect data every second
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

// Listen for messages from the background script
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
				).then(() => {
					respond({ ok: true });
				});
				return true; // async response

			case "OFFSCREEN_RECORD":
				handleRecord();
				respond({ ok: true });
				break;

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
