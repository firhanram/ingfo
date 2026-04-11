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
	| { type: "START_RECORDING"; micEnabled: boolean }

	// Recording: Background → Content
	| { type: "BEGIN_COUNTDOWN"; micEnabled: boolean }
	| { type: "RECORDING_STARTED" }
	| {
			type: "RECORDING_TIME_UPDATE";
			elapsedMs: number;
			isPaused: boolean;
	  }
	| {
			type: "RECORDING_COMPLETE";
			videoDataUrl: string;
			durationMs: number;
	  }
	| { type: "RECORDING_CANCELLED" }

	// Recording: Popup → Background (query)
	| { type: "GET_RECORDING_STATE" }

	// Recording: Content → Background
	| { type: "COUNTDOWN_DONE" }
	| { type: "COUNTDOWN_CANCELLED" }
	| { type: "PAUSE_RECORDING" }
	| { type: "RESUME_RECORDING" }
	| { type: "TOGGLE_MIC" }
	| { type: "STOP_RECORDING" }
	| { type: "CANCEL_RECORDING" };

// --- Offscreen messages (background ↔ offscreen document) ---

export type OffscreenMessage =
	| {
			type: "OFFSCREEN_START";
			streamId: string;
			micEnabled: boolean;
			tabWidth: number;
			tabHeight: number;
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
	| { type: "OFFSCREEN_TIME_UPDATE"; elapsedMs: number; isPaused: boolean };
