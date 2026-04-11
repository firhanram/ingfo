export interface RecordingState {
	elapsedMs: number;
	isPaused: boolean;
}

type Listener = () => void;

let state: RecordingState = { elapsedMs: 0, isPaused: false };
const listeners = new Set<Listener>();

export const recordingStore = {
	getSnapshot(): RecordingState {
		return state;
	},

	subscribe(listener: Listener): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},

	update(next: RecordingState): void {
		state = next;
		for (const listener of listeners) listener();
	},

	reset(): void {
		state = { elapsedMs: 0, isPaused: false };
		for (const listener of listeners) listener();
	},
};
