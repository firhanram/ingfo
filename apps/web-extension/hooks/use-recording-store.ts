import { useSyncExternalStore } from "react";
import { recordingStore } from "@/lib/recording-store";

export function useRecordingStore() {
	return useSyncExternalStore(
		recordingStore.subscribe,
		recordingStore.getSnapshot,
	);
}
