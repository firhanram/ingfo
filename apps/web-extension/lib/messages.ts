import type { RecordingMetadata } from "./metadata-types";

export type Region = {
	x: number;
	y: number;
	width: number;
	height: number;
};

// --- Screenshot messages ---

export type Message =
	// Screenshot flow
	| { type: "START_CAPTURE" }
	| { type: "BEGIN_SELECTION" }
	| {
			type: "SELECTION_RESULT";
			region: Region | null;
			devicePixelRatio: number;
	  }
	| { type: "CAPTURE_COMPLETE"; imageDataUrl: string }
	| { type: "CANCEL_CAPTURE" }

	// Recording: Popup → Background
	| {
			type: "START_RECORDING";
			micEnabled: boolean;
			recordArea: "tab" | "desktop";
	  }

	// Recording: Background → Content
	| { type: "BEGIN_COUNTDOWN"; micEnabled: boolean }
	| { type: "RECORDING_STARTED"; micEnabled: boolean }
	| {
			type: "RECORDING_TIME_UPDATE";
			elapsedMs: number;
			isPaused: boolean;
	  }
	| {
			type: "RECORDING_COMPLETE";
			videoDataUrl: string;
			durationMs: number;
			metadata: RecordingMetadata;
	  }
	| { type: "RECORDING_CANCELLED" }
	| { type: "RECORDING_DURATION_LIMIT" }
	| { type: "MIC_UNAVAILABLE" }

	// Recording: Popup → Background (query)
	| { type: "GET_RECORDING_STATE" }

	// Recording: Content → Background
	| { type: "COUNTDOWN_DONE" }
	| { type: "COUNTDOWN_CANCELLED" }
	| { type: "PAUSE_RECORDING" }
	| { type: "RESUME_RECORDING" }
	| { type: "TOGGLE_MIC" }
	| { type: "STOP_RECORDING" }
	| { type: "DURATION_LIMIT_STOP" }
	| { type: "CANCEL_RECORDING" }

	// Metadata: Content → Background
	| {
			type: "CONSOLE_LOG_EVENT";
			timestamp: number;
			level: "log" | "warn" | "error" | "info" | "debug";
			args: string[];
			trace: string[];
	  };

// --- Offscreen messages (background ↔ offscreen document) ---

export type OffscreenMessage =
	| {
			type: "OFFSCREEN_START";
			streamId: string;
			micEnabled: boolean;
			tabWidth: number;
			tabHeight: number;
			recordArea: "tab" | "desktop";
	  }
	| { type: "OFFSCREEN_RECORD" }
	| { type: "OFFSCREEN_PAUSE" }
	| { type: "OFFSCREEN_RESUME" }
	| { type: "OFFSCREEN_TOGGLE_MIC" }
	| { type: "OFFSCREEN_STOP" }
	| { type: "OFFSCREEN_CANCEL" }
	| {
			type: "OFFSCREEN_DATA_READY";
			videoDataUrl: string;
			durationMs: number;
	  }
	| { type: "OFFSCREEN_TIME_UPDATE"; elapsedMs: number; isPaused: boolean }
	| { type: "RECORDER_READY" }
	| { type: "DESKTOP_STREAM_ACQUIRED"; micEnabled: boolean }
	| { type: "DESKTOP_PICKER_CANCELLED" }
	| { type: "OFFSCREEN_RECORD_STARTED"; recordingStartTimeMs: number };
