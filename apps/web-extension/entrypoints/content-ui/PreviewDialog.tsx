import { Check, Copy, Link2, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { parseBrowserInfo } from "@/lib/browser-info";
import type { Message } from "@/lib/messages";
import type { ScreenshotMetadata } from "@/lib/metadata-types";
import { shareScreenshot } from "@/lib/share-screenshot";

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

	const imgRef = useRef<HTMLImageElement>(null);
	const [copied, setCopied] = useState(false);
	const [isSharing, setIsSharing] = useState(false);
	const [shareError, setShareError] = useState<string | null>(null);

	async function handleCopy() {
		const response = await fetch(imageDataUrl);
		const blob = await response.blob();
		await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	function buildMetadata(blob: Blob): ScreenshotMetadata {
		const { name: browserName, version: browserVersion } = parseBrowserInfo(
			navigator.userAgent,
		);
		return {
			browserInfo: {
				url: location.href,
				title: document.title,
				userAgent: navigator.userAgent,
				platform: navigator.platform,
				browserName,
				browserVersion,
				windowWidth: window.innerWidth,
				windowHeight: window.innerHeight,
				devicePixelRatio: window.devicePixelRatio,
				language: navigator.language,
			},
			capturedAt: Date.now(),
			width: imgRef.current?.naturalWidth ?? 0,
			height: imgRef.current?.naturalHeight ?? 0,
		};
	}

	async function handleShare() {
		setIsSharing(true);
		setShareError(null);
		try {
			const blob = await (await fetch(imageDataUrl)).blob();
			const metadata = buildMetadata(blob);
			const result = await shareScreenshot(blob, metadata);
			await browser.runtime.sendMessage({
				type: "SAVE_SHARED_SCREENSHOT",
				payload: {
					...result,
					createdAt: Date.now(),
					title: document.title,
					thumbnailDataUrl: imageDataUrl,
				},
			} satisfies Message);
			onClose();
			window.open(result.shareUrl, "_blank", "noopener");
		} catch (err) {
			setShareError(
				err instanceof Error ? err.message : "Failed to share screenshot",
			);
		} finally {
			setIsSharing(false);
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
				<div className="max-h-[calc(90vh-72px)] overflow-auto p-6 pt-15">
					<img
						ref={imgRef}
						src={imageDataUrl}
						alt="Captured screenshot"
						className="max-w-full rounded-md border border-neutral-200"
					/>
				</div>

				{/* Bottom bar */}
				<div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-surface px-6 py-3">
					{shareError && (
						<span
							className="mr-auto max-w-xs truncate text-sm text-red-600"
							title={shareError}
						>
							{shareError}
						</span>
					)}
					<button
						type="button"
						onClick={handleCopy}
						disabled={isSharing}
						className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{copied ? <Check size={16} /> : <Copy size={16} />}
						{copied ? "Copied!" : "Copy"}
					</button>
					<button
						type="button"
						onClick={handleShare}
						disabled={isSharing}
						className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-accent-400 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSharing ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<Link2 size={16} />
						)}
						{isSharing ? "Sharing…" : "Share link"}
					</button>
				</div>
			</div>
		</div>
	);
}
