import { Link2 } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_COL_WIDTHS, MIN_COL_WIDTH } from "../lib/columns";
import { browserInfo, consoleEvents, networkEvents } from "../lib/data";
import { BrowserInfoPanel } from "./browser-info-panel";
import { ConsolePanel } from "./console-panel";
import { NetworkPanel } from "./network-panel";
import { SummaryPanel } from "./summary-panel";
import { TabButton } from "./tab-button";

export function SharePage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [currentTimeMs, setCurrentTimeMs] = useState(0);
	const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
	const [activeTab, setActiveTab] = useState<"network" | "console">("network");
	const [copied, setCopied] = useState(false);
	const activeRowRef = useRef<HTMLTableRowElement>(null);
	const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
	const containerRef = useRef<HTMLDivElement>(null);

	// Panel resize (left/right columns)
	const onPanelResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const container = containerRef.current;
			if (!container) return;
			const startX = e.clientX;
			const startWidth = leftPanelWidth;
			const containerRect = container.getBoundingClientRect();
			const onMove = (ev: MouseEvent) => {
				const delta = ev.clientX - startX;
				const deltaPercent = (delta / containerRect.width) * 100;
				setLeftPanelWidth(
					Math.min(80, Math.max(20, startWidth + deltaPercent)),
				);
			};
			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		},
		[leftPanelWidth],
	);

	// Column resize
	const onColResizeStart = useCallback(
		(colIndex: number, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			const startWidth = colWidths[colIndex];
			const onMove = (ev: MouseEvent) => {
				const delta = ev.clientX - startX;
				setColWidths((prev) => {
					const next = [...prev];
					next[colIndex] = Math.max(MIN_COL_WIDTH, startWidth + delta);
					return next;
				});
			};
			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		},
		[colWidths],
	);

	// Video time update
	const onTimeUpdate = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		setCurrentTimeMs(video.currentTime * 1000);
	}, []);

	// Scroll to active row
	useLayoutEffect(() => {
		activeRowRef.current?.scrollIntoView({ block: "nearest" });
	}, [currentTimeMs]);

	const onCopyLink = useCallback(() => {
		navigator.clipboard.writeText(window.location.href);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, []);

	return (
		<div className="flex h-screen flex-col bg-surface text-neutral-900">
			{/* ── Header ────────────────────────────────────────────── */}
			<header className="flex shrink-0 items-center border-b border-neutral-200 px-5 py-3">
				<span className="font-semibold text-base tracking-tight text-neutral-900">
					ingfo
				</span>
				<span className="mx-2 text-neutral-300">·</span>
				<span className="truncate text-sm text-neutral-500">
					{browserInfo.title}
				</span>

				<button
					type="button"
					onClick={onCopyLink}
					className="ml-auto flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 active:bg-neutral-100"
				>
					<Link2 className="h-3.5 w-3.5" />
					{copied ? "Copied!" : "Copy Link"}
				</button>
			</header>

			{/* ── Body ──────────────────────────────────────────────── */}
			<div ref={containerRef} className="flex min-h-0 flex-1">
				{/* ── Left column: Video + Summary ─────────────────── */}
				<div className="flex flex-col" style={{ width: `${leftPanelWidth}%` }}>
					{/* Video */}
					<div className="flex flex-1 items-center justify-center bg-surface-sunken p-6">
						{/* biome-ignore lint/a11y/useMediaCaption: screen recording, no captions available */}
						<video
							ref={videoRef}
							controls
							className="max-h-full max-w-full rounded-lg shadow-lg"
							src="/dummy-recording.webm"
							onTimeUpdate={onTimeUpdate}
						/>
					</div>

					{/* Summary */}
					<SummaryPanel />
				</div>

				{/* ── Resize handle ───────────────────────────────── */}
				{/* biome-ignore lint: resize handle uses mouse drag only */}
				<div
					role="separator"
					aria-valuenow={Math.round(leftPanelWidth)}
					aria-valuemin={20}
					aria-valuemax={80}
					tabIndex={0}
					onMouseDown={onPanelResizeStart}
					className="group relative flex w-0 shrink-0 cursor-col-resize items-center justify-center"
				>
					<div className="absolute inset-y-0 -left-0.5 w-1 bg-neutral-200 transition-colors group-hover:bg-primary-600 group-active:bg-primary-600" />
				</div>

				{/* ── Right column: Browser Info + Tabs ────────────── */}
				<div className="flex min-w-0 flex-1 flex-col">
					{/* Browser Info */}
					<BrowserInfoPanel browserInfo={browserInfo} />

					{/* Tabs */}
					<div className="flex shrink-0 border-b border-neutral-200 bg-surface-raised">
						<TabButton
							active={activeTab === "console"}
							label="Console"
							count={consoleEvents.length}
							onClick={() => setActiveTab("console")}
						/>
						<TabButton
							active={activeTab === "network"}
							label="Network"
							count={networkEvents.length}
							onClick={() => setActiveTab("network")}
						/>
					</div>

					{/* Tab content */}
					<div className="flex min-h-0 flex-1 flex-col">
						{activeTab === "network" && (
							<NetworkPanel
								currentTimeMs={currentTimeMs}
								colWidths={colWidths}
								onColResizeStart={onColResizeStart}
								activeRowRef={activeRowRef}
							/>
						)}
						{activeTab === "console" && (
							<ConsolePanel currentTimeMs={currentTimeMs} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
