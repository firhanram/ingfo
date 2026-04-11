import { Download, Pause, Play, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface VideoPreviewDialogProps {
	videoDataUrl: string;
	durationMs: number;
	onClose: () => void;
}

function formatTime(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function VideoPreviewDialog({
	videoDataUrl,
	durationMs,
	onClose,
}: VideoPreviewDialogProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [videoDuration, setVideoDuration] = useState(durationMs / 1000);
	const [trimStart, setTrimStart] = useState(0);
	const [trimEnd, setTrimEnd] = useState(durationMs / 1000);
	const [, setDragging] = useState<"start" | "end" | null>(null);
	const [isExporting, setIsExporting] = useState(false);

	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	const handleLoadedMetadata = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		// Use actual video duration if available (more accurate than durationMs)
		if (Number.isFinite(video.duration)) {
			setVideoDuration(video.duration);
			setTrimEnd(video.duration);
		}
	}, []);

	const handleTimeUpdate = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		setCurrentTime(video.currentTime);

		// Stop at trim end
		if (video.currentTime >= trimEnd) {
			video.pause();
			setIsPlaying(false);
			video.currentTime = trimStart;
		}
	}, [trimEnd, trimStart]);

	function handlePlayPause() {
		const video = videoRef.current;
		if (!video) return;

		if (isPlaying) {
			video.pause();
			setIsPlaying(false);
		} else {
			// Start from trim start if at the end
			if (video.currentTime >= trimEnd || video.currentTime < trimStart) {
				video.currentTime = trimStart;
			}
			video.play();
			setIsPlaying(true);
		}
	}

	function getTimeFromMouseEvent(e: React.MouseEvent | MouseEvent): number {
		const track = trackRef.current;
		if (!track) return 0;
		const rect = track.getBoundingClientRect();
		const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		return (x / rect.width) * videoDuration;
	}

	function handleTrackMouseDown(e: React.MouseEvent, handle: "start" | "end") {
		e.preventDefault();
		e.stopPropagation();
		setDragging(handle);

		function onMouseMove(moveEvent: MouseEvent) {
			const time = getTimeFromMouseEvent(moveEvent);
			if (handle === "start") {
				setTrimStart(Math.min(time, trimEnd - 0.5));
			} else {
				setTrimEnd(Math.max(time, trimStart + 0.5));
			}
		}

		function onMouseUp() {
			setDragging(null);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		}

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}

	const trimmedDuration = trimEnd - trimStart;
	const isTrimmed = trimStart > 0.1 || trimEnd < videoDuration - 0.1;

	async function handleDownload() {
		if (!isTrimmed) {
			// No trim needed — download directly
			const link = document.createElement("a");
			link.href = videoDataUrl;
			link.download = `recording-${Date.now()}.webm`;
			link.click();
			return;
		}

		// Trim via canvas re-encoding
		setIsExporting(true);
		try {
			const trimmedBlob = await trimVideo(videoDataUrl, trimStart, trimEnd);
			const url = URL.createObjectURL(trimmedBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `recording-${Date.now()}.webm`;
			link.click();
			URL.revokeObjectURL(url);
		} finally {
			setIsExporting(false);
		}
	}

	const startPercent = (trimStart / videoDuration) * 100;
	const endPercent = (trimEnd / videoDuration) * 100;
	const currentPercent = (currentTime / videoDuration) * 100;

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/60 font-sans">
			<div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-surface-raised shadow-xl">
				{/* Close button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 left-3 z-1 flex size-9 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-900"
				>
					<X size={18} />
				</button>

				{/* Video player */}
				<div className="flex-1 overflow-auto bg-surface-sunken px-6 pt-15 pb-6">
					{/* biome-ignore lint/a11y/useMediaCaption: screen recording does not need captions */}
					<video
						ref={videoRef}
						src={videoDataUrl}
						onLoadedMetadata={handleLoadedMetadata}
						onTimeUpdate={handleTimeUpdate}
						onEnded={() => setIsPlaying(false)}
						className="mx-auto max-h-[60vh] max-w-full rounded-md"
					/>
				</div>

				{/* Timeline & controls */}
				<div className="border-t border-neutral-200 bg-surface px-6 py-4">
					{/* Play button + timeline */}
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handlePlayPause}
							className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 transition-colors hover:bg-neutral-50"
						>
							{isPlaying ? (
								<Pause size={16} />
							) : (
								<Play size={16} className="ml-0.5" />
							)}
						</button>

						{/* Track */}
						<div
							ref={trackRef}
							className="relative h-8 flex-1 cursor-pointer rounded-md bg-neutral-100"
						>
							{/* Trimmed region highlight */}
							<div
								className="absolute inset-y-0 rounded-md bg-accent-200/50"
								style={{
									left: `${startPercent}%`,
									width: `${endPercent - startPercent}%`,
								}}
							/>

							{/* Playback position */}
							<div
								className="absolute inset-y-0 w-0.5 bg-neutral-800"
								style={{ left: `${currentPercent}%` }}
							/>

							{/* Trim start handle */}
							<div
								role="slider"
								aria-label="Trim start"
								aria-valuenow={trimStart}
								tabIndex={0}
								onMouseDown={(e) => handleTrackMouseDown(e, "start")}
								className="absolute inset-y-0 w-2 cursor-col-resize rounded-l-md bg-accent-500 transition-colors hover:bg-accent-600"
								style={{ left: `calc(${startPercent}% - 4px)` }}
							/>

							{/* Trim end handle */}
							<div
								role="slider"
								aria-label="Trim end"
								aria-valuenow={trimEnd}
								tabIndex={0}
								onMouseDown={(e) => handleTrackMouseDown(e, "end")}
								className="absolute inset-y-0 w-2 cursor-col-resize rounded-r-md bg-accent-500 transition-colors hover:bg-accent-600"
								style={{ left: `${endPercent}%` }}
							/>
						</div>
					</div>

					{/* Duration info + download */}
					<div className="mt-3 flex items-center justify-between">
						<span className="text-xs text-neutral-500">
							{isTrimmed
								? `Trimmed: ${formatTime(trimmedDuration * 1000)} / ${formatTime(videoDuration * 1000)}`
								: formatTime(videoDuration * 1000)}
						</span>

						<button
							type="button"
							onClick={handleDownload}
							disabled={isExporting}
							className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-accent-400 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Download size={16} />
							{isExporting ? "Exporting..." : "Download"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// --- Video trimming via canvas re-encoding ---

async function trimVideo(
	dataUrl: string,
	startTime: number,
	endTime: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.src = dataUrl;
		video.muted = true;

		video.onloadedmetadata = () => {
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			// biome-ignore lint/style/noNonNullAssertion: canvas is freshly created
			const ctx = canvas.getContext("2d")!;

			const stream = canvas.captureStream(30);

			// Add audio from the source video
			const audioCtx = new AudioContext();
			const source = audioCtx.createMediaElementSource(video);
			const destination = audioCtx.createMediaStreamDestination();
			source.connect(destination);
			source.connect(audioCtx.destination);

			for (const track of destination.stream.getAudioTracks()) {
				stream.addTrack(track);
			}

			const recorder = new MediaRecorder(stream, {
				mimeType: "video/webm;codecs=vp9,opus",
			});
			const chunks: Blob[] = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunks.push(e.data);
			};

			recorder.onstop = () => {
				audioCtx.close();
				resolve(new Blob(chunks, { type: "video/webm" }));
			};

			video.currentTime = startTime;

			video.onseeked = () => {
				recorder.start();
				video.play();

				function drawFrame() {
					if (video.currentTime >= endTime || video.paused) {
						video.pause();
						recorder.stop();
						return;
					}
					ctx.drawImage(video, 0, 0);
					requestAnimationFrame(drawFrame);
				}

				drawFrame();
			};
		};

		video.onerror = () => reject(new Error("Failed to load video"));
	});
}
