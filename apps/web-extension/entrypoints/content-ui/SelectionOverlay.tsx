import { useCallback, useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface SelectionOverlayProps {
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
	onSelectionComplete,
	onCancel,
}: SelectionOverlayProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [startPos, setStartPos] = useState({ x: 0, y: 0 });
	const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
	const [hasMoved, setHasMoved] = useState(false);
	const overlayRef = useRef<HTMLDivElement>(null);

	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onCancel();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

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

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);
		setStartPos({ x: e.clientX, y: e.clientY });
		setCurrentPos({ x: e.clientX, y: e.clientY });
	}, []);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			setMousePos({ x: e.clientX, y: e.clientY });
			if (!hasMoved) setHasMoved(true);
			if (!isDragging) return;
			setCurrentPos({ x: e.clientX, y: e.clientY });
		},
		[isDragging, hasMoved],
	);

	const handleMouseUp = useCallback(
		(e: React.MouseEvent) => {
			if (!isDragging) return;
			setIsDragging(false);

			const dx = Math.abs(e.clientX - startPos.x);
			const dy = Math.abs(e.clientY - startPos.y);

			if (dx < 5 && dy < 5) {
				onSelectionComplete(null);
			} else {
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
		[isDragging, startPos, onSelectionComplete],
	);

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
			{!isDragging && hasMoved && (
				<div
					className="pointer-events-none fixed whitespace-nowrap rounded-md bg-neutral-900/85 px-3 py-1.5 font-sans text-[13px] font-medium text-white"
					style={{ left: mousePos.x + 16, top: mousePos.y + 16 }}
				>
					click or drag to screenshot
				</div>
			)}
		</div>
	);
}
