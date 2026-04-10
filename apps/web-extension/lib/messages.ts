export type Region = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type Message =
	| { type: "START_CAPTURE"; delay: number }
	| { type: "START_COUNTDOWN"; seconds: number }
	| { type: "BEGIN_SELECTION" }
	| {
			type: "SELECTION_RESULT";
			region: Region | null;
			devicePixelRatio: number;
	  }
	| {
			type: "CAPTURE_COMPLETE";
			imageDataUrl: string;
	  }
	| { type: "CANCEL_CAPTURE" };
