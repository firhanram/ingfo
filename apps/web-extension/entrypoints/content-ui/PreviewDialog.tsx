import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface PreviewDialogProps {
	imageDataUrl: string;
	onClose: () => void;
}

export function PreviewDialog({ imageDataUrl, onClose }: PreviewDialogProps) {
	useMountEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		const response = await fetch(imageDataUrl);
		const blob = await response.blob();
		await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
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
				<div className="max-h-[calc(90vh-72px)] overflow-auto p-6 pt-15">
					<img
						src={imageDataUrl}
						alt="Captured screenshot"
						className="max-w-full rounded-md border border-neutral-200"
					/>
				</div>

				{/* Bottom bar */}
				<div className="flex items-center justify-end border-t border-neutral-200 bg-surface px-6 py-3">
					<button
						type="button"
						onClick={handleCopy}
						className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-accent-400 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500"
					>
						{copied ? <Check size={16} /> : <Copy size={16} />}
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
			</div>
		</div>
	);
}
