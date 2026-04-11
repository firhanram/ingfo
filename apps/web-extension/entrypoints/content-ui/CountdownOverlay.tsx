import { Mic, MicOff } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface CountdownOverlayProps {
	micEnabled: boolean;
	onComplete: () => void;
	onCancel: () => void;
}

export function CountdownOverlay({
	micEnabled,
	onComplete,
	onCancel,
}: CountdownOverlayProps) {
	const [count, setCount] = useState(3);
	const [paused, setPaused] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const countRef = useRef(3);

	const startInterval = useCallback(() => {
		intervalRef.current = setInterval(() => {
			countRef.current -= 1;
			if (countRef.current <= 0) {
				if (intervalRef.current) clearInterval(intervalRef.current);
				onComplete();
			} else {
				setCount(countRef.current);
			}
		}, 1000);
	}, [onComplete]);

	useMountEffect(() => {
		startInterval();
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	});

	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onCancel();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	function handleClick() {
		if (paused) {
			setPaused(false);
			startInterval();
		} else {
			setPaused(true);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}
	}

	return (
		<div
			role="application"
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === " " || e.key === "Enter") handleClick();
			}}
			className="fixed inset-0 flex cursor-pointer select-none flex-col items-center justify-center bg-black/40"
		>
			{/* Center content */}
			<div className="flex flex-col items-center gap-3 rounded-2xl bg-neutral-900/85 px-10 py-8 text-center backdrop-blur-sm">
				<p className="text-lg font-semibold text-white">
					{paused ? "Paused" : "Preparing to record"}
				</p>
				<p className="flex items-center gap-1.5 text-sm text-neutral-300">
					Your microphone is currently{" "}
					{micEnabled ? (
						<span className="inline-flex items-center gap-1 font-medium text-emerald-400">
							<Mic className="size-3.5" />
							on
						</span>
					) : (
						<span className="inline-flex items-center gap-1 font-medium text-accent-400">
							<MicOff className="size-3.5" />
							muted
						</span>
					)}
				</p>
				<p className="text-xs text-neutral-400">
					{paused
						? "Click anywhere to resume"
						: "Click anywhere to pause the countdown"}
				</p>
			</div>

			{/* Bottom floating countdown pill */}
			<div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-neutral-900/90 px-5 py-2.5 backdrop-blur-sm">
				<span className="size-3 animate-pulse rounded-full bg-accent-400" />
				<span className="font-mono text-sm font-semibold text-white tabular-nums">
					Recording in {count}
				</span>
			</div>
		</div>
	);
}
