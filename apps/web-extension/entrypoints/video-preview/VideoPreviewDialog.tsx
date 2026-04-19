import { Pause, Play, Share2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { Message } from "@/lib/messages";
import type { RecordingMetadata } from "@/lib/metadata-types";
import { shareRecording } from "@/lib/share-recording";
import { captureThumbnailDataUrl } from "@/lib/thumbnail";

interface VideoPreviewDialogProps {
	videoBlob: Blob;
	durationMs: number;
	metadata: RecordingMetadata;
	onClose: () => void;
}

function formatTime(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function VideoPreviewDialog({
	videoBlob,
	durationMs,
	metadata,
	onClose,
}: VideoPreviewDialogProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const isScrubbing = useRef(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [videoDuration, setVideoDuration] = useState(durationMs / 1000);
	const [trimStart, setTrimStart] = useState(0);
	const [trimEnd, setTrimEnd] = useState(durationMs / 1000);
	const [isSharing, setIsSharing] = useState(false);
	const [shareError, setShareError] = useState<string | null>(null);
	// Create a same-origin blob URL inside this iframe document so playback is
	// not subject to the host page's media-src CSP.
	const [videoSrc, setVideoSrc] = useState<string | null>(null);

	useMountEffect(() => {
		const objectUrl = URL.createObjectURL(videoBlob);
		setVideoSrc(objectUrl);
		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	});

	// Refs to avoid stale closures in event handlers
	const trimStartRef = useRef(trimStart);
	trimStartRef.current = trimStart;
	const trimEndRef = useRef(trimEnd);
	trimEndRef.current = trimEnd;

	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	function handleLoadedMetadata() {
		const video = videoRef.current;
		if (!video) return;
		// Lock aspect-ratio so the element box matches the content exactly,
		// preventing the browser's intrinsic black video surface from showing.
		if (video.videoWidth && video.videoHeight) {
			video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
		}
		if (Number.isFinite(video.duration)) {
			setVideoDuration(video.duration);
			setTrimEnd(video.duration);
		}
	}

	function handleTimeUpdate() {
		const video = videoRef.current;
		if (!video) return;
		setCurrentTime(video.currentTime);

		// Auto-pause at trim end during playback
		if (video.currentTime >= trimEndRef.current && !video.paused) {
			video.pause();
			setIsPlaying(false);
		}
	}

	function handlePlayPause() {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) {
			// If at or past trim end, restart from trim start
			if (video.currentTime >= trimEndRef.current - 0.05) {
				video.currentTime = trimStartRef.current;
			}
			video.play();
			setIsPlaying(true);
		} else {
			video.pause();
			setIsPlaying(false);
		}
	}

	function handleScrubStart(e: React.MouseEvent) {
		isScrubbing.current = true;
		updateScrubPosition(e.clientX);

		function onMouseMove(ev: MouseEvent) {
			if (isScrubbing.current) updateScrubPosition(ev.clientX);
		}

		function onMouseUp() {
			isScrubbing.current = false;
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		}

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}

	function updateScrubPosition(clientX: number) {
		const track = trackRef.current;
		const video = videoRef.current;
		if (!track || !video) return;
		const rect = track.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const time = ratio * videoDuration;
		video.currentTime = Math.max(
			trimStartRef.current,
			Math.min(trimEndRef.current, time),
		);
	}

	function handleTrimHandleMouseDown(
		e: React.MouseEvent,
		handle: "start" | "end",
	) {
		e.stopPropagation();
		const track = trackRef.current;
		if (!track) return;

		function onMouseMove(ev: MouseEvent) {
			if (!track) return;
			const rect = track.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (ev.clientX - rect.left) / rect.width),
			);
			const time = ratio * videoDuration;
			if (handle === "start") {
				const newStart = Math.min(time, trimEndRef.current - 0.5);
				setTrimStart(newStart);
				if (videoRef.current && videoRef.current.currentTime < newStart) {
					videoRef.current.currentTime = newStart;
				}
			} else {
				const newEnd = Math.max(time, trimStartRef.current + 0.5);
				setTrimEnd(newEnd);
				if (videoRef.current && videoRef.current.currentTime > newEnd) {
					videoRef.current.currentTime = newEnd;
				}
			}
		}

		function onMouseUp() {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		}

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}

	const trimmedDuration = trimEnd - trimStart;
	const isTrimmed = trimStart > 0.1 || trimEnd < videoDuration - 0.1;

	async function handleShareReplay() {
		setIsSharing(true);
		setShareError(null);
		try {
			const sourceUrl = videoSrc;
			if (!sourceUrl) throw new Error("Video not ready");
			const blob = isTrimmed
				? await trimVideo(sourceUrl, trimStart, trimEnd)
				: videoBlob;
			const thumbnailDataUrl = await captureThumbnailDataUrl(
				videoRef.current ?? sourceUrl,
				isTrimmed ? trimStart : 0,
			);
			// Align the uploaded metadata duration with the actual video
			// duration shown in the recordings list, so the share page and
			// the card agree on the same number.
			const durationMs = Math.round(trimmedDuration * 1000);
			const result = await shareRecording(blob, {
				...metadata,
				recordingDurationMs: durationMs,
			});
			await browser.runtime.sendMessage({
				type: "SAVE_SHARED_RECORDING",
				payload: {
					...result,
					createdAt: Date.now(),
					title: metadata.browserInfo.title,
					durationMs,
					thumbnailDataUrl,
				},
			} satisfies Message);
			onClose();
			window.open(result.shareUrl, "_blank", "noopener");
		} catch (err) {
			setShareError(
				err instanceof Error ? err.message : "Failed to share recording",
			);
		} finally {
			setIsSharing(false);
		}
	}

	const startPercent = (trimStart / videoDuration) * 100;
	const endPercent = (trimEnd / videoDuration) * 100;
	const currentPercent = (currentTime / videoDuration) * 100;

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-neutral-900/40 font-sans backdrop-blur-sm">
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
				<div className="min-h-0 overflow-auto px-6 pt-15 pb-6">
					{/* biome-ignore lint/a11y/useMediaCaption: screen recording does not need captions */}
					<video
						ref={videoRef}
						src={videoSrc ?? undefined}
						onLoadedMetadata={handleLoadedMetadata}
						onTimeUpdate={handleTimeUpdate}
						onEnded={() => setIsPlaying(false)}
						className="mx-auto block max-h-[60vh] w-full rounded-md"
					/>
				</div>

				{/* Timeline & controls */}
				<div className="border-t border-neutral-200 bg-surface px-6 py-4">
					{/* Current timestamp */}
					<div className="mb-3 flex items-center justify-center">
						<span className="tabular-nums text-sm tracking-wide text-neutral-500">
							<span className="font-semibold text-neutral-900">
								{formatTime(currentTime * 1000)}
							</span>
							<span className="mx-1">/</span>
							{formatTime(videoDuration * 1000)}
						</span>
					</div>

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

						{/* Trim track wrapper — handles sit outside the waveform area */}
						<div className="relative h-10 flex-1">
							{/* Waveform / scrub area */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: timeline scrub area requires mousedown for drag-to-seek */}
							<div
								ref={trackRef}
								onMouseDown={handleScrubStart}
								className="absolute inset-y-0 right-4 left-4 cursor-pointer rounded-md bg-neutral-100"
							>
								{/* Trimmed region highlight */}
								<div
									className="absolute inset-y-0 bg-accent-100/60"
									style={{
										left: `${startPercent}%`,
										width: `${endPercent - startPercent}%`,
									}}
								/>

								{/* Trimmed region top/bottom border */}
								<div
									className="pointer-events-none absolute inset-y-0 border-y-2 border-accent-400"
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
							</div>

							{/* Trim start handle */}
							<div
								role="slider"
								aria-label="Trim start"
								aria-valuenow={trimStart}
								tabIndex={0}
								onMouseDown={(e) => handleTrimHandleMouseDown(e, "start")}
								className="absolute inset-y-0 flex w-4 cursor-col-resize items-center justify-center rounded-l-lg bg-accent-400 transition-colors hover:bg-accent-500"
								style={{
									left: `calc(${startPercent}% * (100% - 32px) / 100%)`,
								}}
							>
								<div className="flex gap-0.5">
									<div className="h-4 w-px rounded-full bg-white/70" />
									<div className="h-4 w-px rounded-full bg-white/70" />
								</div>
							</div>

							{/* Trim end handle */}
							<div
								role="slider"
								aria-label="Trim end"
								aria-valuenow={trimEnd}
								tabIndex={0}
								onMouseDown={(e) => handleTrimHandleMouseDown(e, "end")}
								className="absolute inset-y-0 flex w-4 cursor-col-resize items-center justify-center rounded-r-lg bg-accent-400 transition-colors hover:bg-accent-500"
								style={{
									left: `calc(16px + ${endPercent}% * (100% - 32px) / 100%)`,
								}}
							>
								<div className="flex gap-0.5">
									<div className="h-4 w-px rounded-full bg-white/70" />
									<div className="h-4 w-px rounded-full bg-white/70" />
								</div>
							</div>
						</div>
					</div>

					{/* Trim info + share */}
					<div className="mt-3 flex items-center justify-between">
						{shareError ? (
							<span className="text-xs text-red-600">{shareError}</span>
						) : (
							<span className="text-xs tabular-nums text-neutral-500">
								{isTrimmed
									? `Trimmed to ${formatTime(trimmedDuration * 1000)}`
									: ""}
							</span>
						)}

						<button
							type="button"
							onClick={handleShareReplay}
							disabled={isSharing}
							className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-accent-400 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Share2 size={16} />
							{isSharing ? "Sharing..." : "Share Replay"}
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
