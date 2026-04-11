import { Mic, MicOff, Pause, Play, Square } from "lucide-react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useRecordingStore } from "@/hooks/use-recording-store";
import type { Message } from "@/lib/messages";

function formatTime(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface RecordingControlBarProps {
	micEnabled: boolean;
}

export function RecordingControlBar({ micEnabled }: RecordingControlBarProps) {
	const { elapsedMs, isPaused } = useRecordingStore();

	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				browser.runtime.sendMessage({
					type: "CANCEL_RECORDING",
				} satisfies Message);
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	function handlePauseResume() {
		browser.runtime.sendMessage({
			type: isPaused ? "RESUME_RECORDING" : "PAUSE_RECORDING",
		} satisfies Message);
	}

	function handleToggleMic() {
		browser.runtime.sendMessage({
			type: "TOGGLE_MIC",
		} satisfies Message);
	}

	function handleStop() {
		browser.runtime.sendMessage({
			type: "STOP_RECORDING",
		} satisfies Message);
	}

	return (
		<div className="animate-slide-up fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/90 px-4 py-2 shadow-xl backdrop-blur-sm">
			{/* Recording indicator + time */}
			<div className="flex items-center gap-2.5 pr-1">
				<span className="animate-pulse-red size-2.5 rounded-full bg-red-500" />
				<span className="font-mono text-sm font-medium text-white tabular-nums">
					{formatTime(elapsedMs)}
				</span>
			</div>

			{/* Divider */}
			<div className="h-5 w-px bg-white/20" />

			{/* Pause/Resume */}
			<button
				type="button"
				onClick={handlePauseResume}
				className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
				title={isPaused ? "Resume" : "Pause"}
			>
				{isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
			</button>

			{/* Mic toggle */}
			<button
				type="button"
				onClick={handleToggleMic}
				className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
				title={micEnabled ? "Mute microphone" : "Unmute microphone"}
			>
				{micEnabled ? (
					<Mic className="size-4" />
				) : (
					<MicOff className="size-4" />
				)}
			</button>

			{/* Stop */}
			<button
				type="button"
				onClick={handleStop}
				className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-red-500/80 hover:text-white"
				title="Stop recording"
			>
				<Square className="size-3.5 fill-current" />
			</button>
		</div>
	);
}
