import { Clock, Mic, MicOff, Pause, Play, Square, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useRecordingStore } from "@/hooks/use-recording-store";
import type { Message } from "@/lib/messages";
import { MAX_RECORDING_DURATION_MS } from "@/lib/recording-constants";

function formatTime(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface RecordingControlBarProps {
	micEnabled: boolean;
	micPermission: PermissionState;
}

export function RecordingControlBar({
	micEnabled: initialMicEnabled,
	micPermission,
}: RecordingControlBarProps) {
	const micGranted = micPermission === "granted";
	const [micEnabled, setMicEnabled] = useState(initialMicEnabled);
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);
	const [showDurationLimit, setShowDurationLimit] = useState(false);
	const { elapsedMs, isPaused } = useRecordingStore();

	const WARNING_THRESHOLD_MS = MAX_RECORDING_DURATION_MS - 30_000;
	const isNearLimit = elapsedMs >= WARNING_THRESHOLD_MS;

	const handleConfirmCancel = useCallback(() => {
		setShowCancelConfirm(false);
		browser.runtime.sendMessage({
			type: "CANCEL_RECORDING",
		} satisfies Message);
	}, []);

	const handleDismissConfirm = useCallback(() => {
		setShowCancelConfirm(false);
	}, []);

	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				setShowCancelConfirm((prev) => {
					if (prev) {
						// Already showing — treat second Escape as confirm
						handleConfirmCancel();
						return false;
					}
					return true;
				});
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	// Listen for duration limit message from background
	useMountEffect(() => {
		function handleMessage(message: Message) {
			if (message.type === "RECORDING_DURATION_LIMIT") {
				setShowDurationLimit(true);
			}
		}
		browser.runtime.onMessage.addListener(handleMessage);
		return () => browser.runtime.onMessage.removeListener(handleMessage);
	});

	function handleDurationLimitStop() {
		setShowDurationLimit(false);
		browser.runtime.sendMessage({
			type: "DURATION_LIMIT_STOP",
		} satisfies Message);
	}

	// Auto-dismiss after 5 seconds
	useEffect(() => {
		if (!showCancelConfirm) return;
		const timer = setTimeout(() => setShowCancelConfirm(false), 5000);
		return () => clearTimeout(timer);
	}, [showCancelConfirm]);

	function handlePauseResume() {
		browser.runtime.sendMessage({
			type: isPaused ? "RESUME_RECORDING" : "PAUSE_RECORDING",
		} satisfies Message);
	}

	function handleToggleMic() {
		setMicEnabled((prev) => !prev);
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
		<>
			{/* Duration limit modal */}
			{showDurationLimit && (
				<div className="animate-pop-in fixed bottom-20 left-1/2 flex flex-col items-center gap-3 rounded-2xl bg-neutral-900/90 px-6 py-5 shadow-xl backdrop-blur-sm">
					<div className="flex items-center gap-2.5 text-sm text-white/90">
						<Clock className="size-4 text-accent-400" />
						<span>Recording limit reached</span>
					</div>
					<p className="text-center text-xs text-white/60">
						Maximum recording duration is 2 minutes.
					</p>
					<button
						type="button"
						onClick={handleDurationLimitStop}
						className="cursor-pointer rounded-lg bg-accent-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600"
					>
						Stop &amp; Save
					</button>
				</div>
			)}

			{/* Cancel confirmation */}
			{showCancelConfirm && !showDurationLimit && (
				<div className="animate-pop-in fixed bottom-20 left-1/2 flex flex-col items-center gap-3 rounded-2xl bg-neutral-900/90 px-6 py-5 shadow-xl backdrop-blur-sm">
					<div className="flex items-center gap-2.5 text-sm text-white/90">
						<X className="size-4 text-accent-400" />
						<span>Discard this recording?</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDismissConfirm}
							className="cursor-pointer rounded-lg bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
						>
							Keep recording
						</button>
						<button
							type="button"
							onClick={handleConfirmCancel}
							className="cursor-pointer rounded-lg bg-accent-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600"
						>
							Discard
						</button>
					</div>
					<p className="text-[10px] text-white/40">
						Press Esc again to discard
					</p>
				</div>
			)}

			{/* Control bar */}
			<div className="animate-slide-up fixed bottom-6 left-1/2 flex items-center gap-2 rounded-full bg-neutral-900/90 px-4 py-2 shadow-xl backdrop-blur-sm">
				{/* Recording indicator + time */}
				<div className="flex items-center gap-2.5 pr-1">
					<span className="animate-pulse-red size-2.5 rounded-full bg-red-500" />
					<span
						className={`font-mono text-sm font-medium tabular-nums ${isNearLimit ? "animate-pulse text-red-400" : "text-white"}`}
					>
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
					{isPaused ? (
						<Play className="size-4" />
					) : (
						<Pause className="size-4" />
					)}
				</button>

				{/* Mic toggle */}
				<button
					type="button"
					onClick={micGranted ? handleToggleMic : undefined}
					className={
						micGranted
							? "flex size-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
							: "flex size-8 items-center justify-center rounded-full text-white/30 cursor-not-allowed"
					}
					title={
						micGranted
							? micEnabled
								? "Mute microphone"
								: "Unmute microphone"
							: "Microphone permission not granted"
					}
				>
					{micEnabled && micGranted ? (
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
		</>
	);
}
