import { Download, X } from "lucide-react";
import { useState } from "react";

interface PreviewDialogProps {
	imageDataUrl: string;
	fullImageDataUrl: string;
	onClose: () => void;
}

export function PreviewDialog({
	imageDataUrl,
	fullImageDataUrl,
	onClose,
}: PreviewDialogProps) {
	const [includeFullscreen, setIncludeFullscreen] = useState(false);

	function handleDownload() {
		const link = document.createElement("a");
		link.href = imageDataUrl;
		link.download = `screenshot-${Date.now()}.png`;
		link.click();

		if (includeFullscreen && fullImageDataUrl !== imageDataUrl) {
			const fullLink = document.createElement("a");
			fullLink.href = fullImageDataUrl;
			fullLink.download = `screenshot-full-${Date.now()}.png`;
			fullLink.click();
		}
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 font-sans">
			{/* Dialog */}
			<div className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-lg bg-surface-raised shadow-xl">
				{/* Close button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 left-3 z-1 flex size-9 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-900"
				>
					<X size={18} />
				</button>

				{/* Screenshot image */}
				<div className="max-h-[calc(90vh-120px)] overflow-auto p-6 pt-15">
					<img
						src={imageDataUrl}
						alt="Captured screenshot"
						className="max-w-full rounded-md border border-neutral-200"
					/>
				</div>

				{/* Bottom bar */}
				<div className="flex items-center justify-between border-t border-neutral-200 bg-surface px-6 py-3">
					{/* Fullscreen checkbox */}
					<label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-900">
						<input
							type="checkbox"
							checked={includeFullscreen}
							onChange={(e) => setIncludeFullscreen(e.target.checked)}
							className="size-4 accent-primary-400"
						/>
						{fullImageDataUrl !== imageDataUrl && (
							<img
								src={fullImageDataUrl}
								alt="Full screenshot thumbnail"
								className="h-7 w-10 rounded-sm border border-neutral-200 object-cover"
							/>
						)}
						Also include fullscreen screenshot
					</label>

					{/* Actions */}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleDownload}
							className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-primary-400 px-4 py-2 text-sm font-medium text-white"
						>
							<Download size={16} />
							Download
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
