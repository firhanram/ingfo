import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SelectionOverlayProps {
	mode: "countdown" | "selection";
	countdownSeconds: number;
	onSelectionComplete: (
		region: {
			x: number;
			y: number;
			width: number;
			height: number;
		} | null,
	) => void;
	onCancel: () => void;
}

export function SelectionOverlay({
	mode: initialMode,
	countdownSeconds,
	onSelectionComplete,
	onCancel,
}: SelectionOverlayProps) {
	const [mode, setMode] = useState(initialMode);
	const [countdown, setCountdown] = useState(countdownSeconds);
	const [isDragging, setIsDragging] = useState(false);
	const [startPos, setStartPos] = useState({ x: 0, y: 0 });
	const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
	const overlayRef = useRef<HTMLDivElement>(null);

	// Cancel on Escape key
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onCancel();
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onCancel]);

	// Countdown timer
	useEffect(() => {
		if (mode !== "countdown") return;

		if (countdown <= 0) {
			setMode("selection");
			return;
		}

		const timer = setTimeout(() => {
			setCountdown((c) => c - 1);
		}, 1000);

		return () => clearTimeout(timer);
	}, [mode, countdown]);

	const selectionRect = isDragging
		? {
				x: Math.min(startPos.x, currentPos.x),
				y: Math.min(startPos.y, currentPos.y),
				width: Math.abs(currentPos.x - startPos.x),
				height: Math.abs(currentPos.y - startPos.y),
			}
		: null;

	const clipPath =
		selectionRect && selectionRect.width > 5 && selectionRect.height > 5
			? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${selectionRect.x}px ${selectionRect.y}px, ${selectionRect.x}px ${selectionRect.y + selectionRect.height}px, ${selectionRect.x + selectionRect.width}px ${selectionRect.y + selectionRect.height}px, ${selectionRect.x + selectionRect.width}px ${selectionRect.y}px, ${selectionRect.x}px ${selectionRect.y}px)`
			: undefined;

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (mode !== "selection") return;
			e.preventDefault();
			setIsDragging(true);
			setStartPos({ x: e.clientX, y: e.clientY });
			setCurrentPos({ x: e.clientX, y: e.clientY });
		},
		[mode],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			setMousePos({ x: e.clientX, y: e.clientY });
			if (!isDragging) return;
			setCurrentPos({ x: e.clientX, y: e.clientY });
		},
		[isDragging],
	);

	const handleMouseUp = useCallback(
		(e: React.MouseEvent) => {
			if (mode !== "selection" || !isDragging) return;
			setIsDragging(false);

			const dx = Math.abs(e.clientX - startPos.x);
			const dy = Math.abs(e.clientY - startPos.y);

			if (dx < 5 && dy < 5) {
				// Click — capture full viewport
				onSelectionComplete(null);
			} else {
				// Drag — capture selected region
				const x = Math.min(startPos.x, e.clientX);
				const y = Math.min(startPos.y, e.clientY);
				onSelectionComplete({
					x,
					y,
					width: Math.abs(e.clientX - startPos.x),
					height: Math.abs(e.clientY - startPos.y),
				});
			}
		},
		[mode, isDragging, startPos, onSelectionComplete],
	);

	if (mode === "countdown") {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-black/40">
				<div
					className="animate-countdown-pulse font-sans text-[120px] font-bold text-white"
					style={{ textShadow: "0 4px 24px rgba(0, 0, 0, 0.3)" }}
				>
					{countdown}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={overlayRef}
			role="application"
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			className="fixed inset-0 cursor-crosshair select-none"
		>
			{/* Dimmed overlay with selection cutout */}
			<div className="absolute inset-0 bg-black/30" style={{ clipPath }} />

			{/* Selection rectangle border */}
			{selectionRect && selectionRect.width > 5 && selectionRect.height > 5 && (
				<svg
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 size-full text-neutral-900"
				>
					<rect
						x={selectionRect.x}
						y={selectionRect.y}
						width={selectionRect.width}
						height={selectionRect.height}
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeDasharray="8 8"
						className="animate-marching-ants"
					/>
				</svg>
			)}

			{/* Cursor tooltip */}
			{!isDragging && (
				<div
					className="pointer-events-none fixed whitespace-nowrap rounded-md bg-neutral-900/85 px-3 py-1.5 font-sans text-[13px] font-medium text-white"
					style={{ left: mousePos.x + 16, top: mousePos.y + 16 }}
				>
					click or drag to screenshot
				</div>
			)}

			{/* Cancel button */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onCancel();
				}}
				onMouseDown={(e) => e.stopPropagation()}
				className="fixed top-4 right-4 flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-neutral-900/85 px-4 py-2 font-sans text-sm font-medium text-white"
			>
				<X size={16} />
				Cancel
			</button>
		</div>
	);
}
