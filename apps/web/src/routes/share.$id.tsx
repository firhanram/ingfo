import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	Clock,
	Globe,
	HardDrive,
	Link2,
	Monitor,
} from "lucide-react";
import {
	type JSX,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import metadata from "#/data/dummy-metadata.json";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/share/$id")({
	component: SharePage,
});

// ── Types ────────────────────────────────────────────────────────────────────

interface NetworkEvent {
	type: "network";
	timestamp: number;
	elapsedMs: number;
	data: {
		url: string;
		method: string;
		status: number;
		statusText: string;
		initiatorType: string;
		startTime: number;
		responseEnd: number;
		duration: number;
		encodedDataLength: number;
		cached: boolean;
		mimeType: string;
		requestHeaders: Record<string, string>;
		responseHeaders: Record<string, string>;
		requestBody: string | null;
		responseBody: string | null;
	};
}

interface ConsoleEvent {
	type: "console";
	timestamp: number;
	elapsedMs: number;
	data: {
		level: string;
		args: string[];
		trace: string[];
	};
}

type RecordingEvent = NetworkEvent | ConsoleEvent;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
	if (bytes === 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)} ms`;
	return `${(ms / 1000).toFixed(2)} s`;
}

function formatElapsed(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPathname(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.pathname + parsed.search;
	} catch {
		return url;
	}
}

function isErrorStatus(status: number): boolean {
	return status === 0 || status >= 400;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const allEvents = metadata.events as RecordingEvent[];
const networkEvents = allEvents.filter(
	(e): e is NetworkEvent => e.type === "network",
);
const consoleEvents = allEvents.filter(
	(e): e is ConsoleEvent => e.type === "console",
);

const errorEvents = networkEvents.filter((e) => isErrorStatus(e.data.status));
const largestEvents = [...networkEvents]
	.filter((e) => e.data.encodedDataLength > 0)
	.sort((a, b) => b.data.encodedDataLength - a.data.encodedDataLength)
	.slice(0, 3);
const slowestEvents = [...networkEvents]
	.sort((a, b) => b.data.duration - a.data.duration)
	.slice(0, 3);

const totalRecordingMs =
	allEvents.length > 0 ? Math.max(...allEvents.map((e) => e.elapsedMs)) : 0;

// ── Column config ────────────────────────────────────────────────────────────

const COL_HEADERS = ["#", "Name", "Method", "Status", "Type", "Size", "Time"];
const DEFAULT_COL_WIDTHS = [40, 260, 80, 64, 72, 72, 72];
const MIN_COL_WIDTH = 36;

// ── Main component ──────────────────────────────────────────────────────────

function SharePage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [currentTimeMs, setCurrentTimeMs] = useState(0);
	const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
	const [activeTab, setActiveTab] = useState<"network" | "console">("network");
	const [copied, setCopied] = useState(false);
	const activeRowRef = useRef<HTMLTableRowElement>(null);

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

	const { browserInfo } = metadata;

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
			<div className="flex min-h-0 flex-1">
				{/* ── Left column: Video + Summary ─────────────────── */}
				<div className="flex w-1/2 flex-col border-r border-neutral-200">
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

				{/* ── Right column: Browser Info + Tabs ────────────── */}
				<div className="flex w-1/2 flex-col">
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

// ── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
	active,
	label,
	count,
	onClick,
}: {
	active: boolean;
	label: string;
	count: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative px-4 py-2 text-sm font-medium transition-colors",
				active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-700",
			)}
		>
			{label}
			<span
				className={cn(
					"ml-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
					active
						? "bg-primary-100 text-primary-700"
						: "bg-neutral-100 text-neutral-500",
				)}
			>
				{count}
			</span>
			{active && (
				<span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary-500" />
			)}
		</button>
	);
}

// ── Browser Info panel ───────────────────────────────────────────────────────

function BrowserInfoPanel({
	browserInfo,
}: {
	browserInfo: typeof metadata.browserInfo;
}) {
	return (
		<div className="shrink-0 border-b border-neutral-200 bg-white px-5 py-4">
			<h3 className="mb-3 font-semibold text-sm text-neutral-900">
				Browser Info
			</h3>
			<div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
				<InfoRow icon={Globe} label="URL" value={browserInfo.url} mono />
				<InfoRow
					icon={Monitor}
					label="Browser"
					value={`${browserInfo.browserName} ${browserInfo.browserVersion}`}
				/>
				<InfoRow
					icon={Monitor}
					label="Viewport"
					value={`${browserInfo.windowWidth} x ${browserInfo.windowHeight}`}
				/>
				<InfoRow icon={Globe} label="Language" value={browserInfo.language} />
				<InfoRow icon={Clock} label="Platform" value={browserInfo.platform} />
				<InfoRow
					icon={Clock}
					label="Duration"
					value={formatElapsed(totalRecordingMs)}
				/>
			</div>
		</div>
	);
}

function InfoRow({
	icon: Icon,
	label,
	value,
	mono,
}: {
	icon: typeof Globe;
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="flex items-start gap-2 text-sm">
			<Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
			<div className="min-w-0">
				<span className="text-neutral-500">{label}: </span>
				<span
					className={cn("text-neutral-800", mono && "font-mono text-xs")}
					title={value}
				>
					{value}
				</span>
			</div>
		</div>
	);
}

// ── Summary panel ────────────────────────────────────────────────────────────

function SummaryPanel() {
	const [expanded, setExpanded] = useState<string | null>(null);

	const toggle = useCallback(
		(key: string) => setExpanded((prev) => (prev === key ? null : key)),
		[],
	);

	return (
		<div className="shrink-0 border-t border-neutral-200 bg-white px-5 py-3">
			<div className="flex items-center gap-2">
				<SummaryChip
					icon={AlertTriangle}
					label="Errors"
					count={errorEvents.length}
					color="error"
					expanded={expanded === "errors"}
					onToggle={() => toggle("errors")}
				/>
				<SummaryChip
					icon={HardDrive}
					label="Large"
					count={largestEvents.length}
					color="warning"
					expanded={expanded === "large"}
					onToggle={() => toggle("large")}
				/>
				<SummaryChip
					icon={Clock}
					label="Slowest"
					count={slowestEvents.length}
					color="info"
					expanded={expanded === "slow"}
					onToggle={() => toggle("slow")}
				/>
			</div>

			{expanded === "errors" && errorEvents.length > 0 && (
				<ExpandedList
					items={errorEvents.map((e) => ({
						label: getPathname(e.data.url),
						badge: `${e.data.status} ${e.data.statusText}`,
						badgeColor: "text-error-500",
					}))}
				/>
			)}
			{expanded === "large" && largestEvents.length > 0 && (
				<ExpandedList
					items={largestEvents.map((e) => ({
						label: getPathname(e.data.url),
						badge: formatBytes(e.data.encodedDataLength),
						badgeColor: "text-warning-700",
					}))}
				/>
			)}
			{expanded === "slow" && slowestEvents.length > 0 && (
				<ExpandedList
					items={slowestEvents.map((e) => ({
						label: getPathname(e.data.url),
						badge: formatDuration(e.data.duration),
						badgeColor: "text-info-700",
					}))}
				/>
			)}
		</div>
	);
}

function SummaryChip({
	icon: Icon,
	label,
	count,
	color,
	expanded,
	onToggle,
}: {
	icon: typeof AlertTriangle;
	label: string;
	count: number;
	color: "error" | "warning" | "info";
	expanded: boolean;
	onToggle: () => void;
}) {
	const colorMap = {
		error: "border-error-100 bg-error-50 text-error-700 hover:bg-error-100",
		warning:
			"border-warning-100 bg-warning-50 text-warning-700 hover:bg-warning-100",
		info: "border-info-100 bg-info-50 text-info-700 hover:bg-info-100",
	};

	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn(
				"flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
				colorMap[color],
				expanded && "ring-1 ring-current/20",
			)}
		>
			<Icon className="h-3 w-3" />
			<span>{count}</span>
			<span>{label}</span>
			{expanded ? (
				<ChevronDown className="h-3 w-3" />
			) : (
				<ChevronRight className="h-3 w-3" />
			)}
		</button>
	);
}

function ExpandedList({
	items,
}: {
	items: { label: string; badge: string; badgeColor: string }[];
}) {
	return (
		<ul className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
			{items.map((item) => (
				<li
					key={`${item.label}-${item.badge}`}
					className="flex items-center gap-2 font-mono text-xs text-neutral-600"
				>
					<span className="truncate">{item.label}</span>
					<span
						className={cn("ml-auto shrink-0 font-semibold", item.badgeColor)}
					>
						{item.badge}
					</span>
				</li>
			))}
		</ul>
	);
}

// ── Network panel ────────────────────────────────────────────────────────────

function NetworkPanel({
	currentTimeMs,
	colWidths,
	onColResizeStart,
	activeRowRef,
}: {
	currentTimeMs: number;
	colWidths: number[];
	onColResizeStart: (colIndex: number, e: React.MouseEvent) => void;
	activeRowRef: React.RefObject<HTMLTableRowElement | null>;
}) {
	return (
		<div className="flex-1 overflow-auto">
			<table className="w-full border-collapse font-mono text-xs">
				<thead className="sticky top-0 z-10 bg-surface-raised">
					<tr className="border-b border-neutral-200 text-left text-neutral-500">
						{COL_HEADERS.map((header, i) => (
							<th
								key={header}
								className="relative select-none whitespace-nowrap px-2.5 py-2 text-xs font-medium"
								style={{ width: colWidths[i] }}
							>
								{header}
								{i < COL_HEADERS.length - 1 && (
									/* biome-ignore lint/a11y/noStaticElementInteractions: column resize drag handle */
									<div
										className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary-200"
										onMouseDown={(e) => onColResizeStart(i, e)}
									/>
								)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{networkEvents.map((event, index) => (
						<NetworkRow
							key={`${event.timestamp}-${event.data.method}-${event.data.url}`}
							event={event}
							index={index}
							currentTimeMs={currentTimeMs}
							activeRowRef={activeRowRef}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ── Console panel ────────────────────────────────────────────────────────────

function ConsolePanel({ currentTimeMs }: { currentTimeMs: number }) {
	return (
		<div className="flex-1 overflow-auto">
			{consoleEvents.length === 0 ? (
				<div className="flex h-full items-center justify-center text-sm text-neutral-400">
					No console messages recorded
				</div>
			) : (
				<div className="divide-y divide-neutral-100">
					{consoleEvents.map((event) => (
						<ConsoleRow
							key={`${event.timestamp}-${event.data.level}`}
							event={event}
							currentTimeMs={currentTimeMs}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ConsoleRow({
	event,
	currentTimeMs,
}: {
	event: ConsoleEvent;
	currentTimeMs: number;
}) {
	const isPending = event.elapsedMs > currentTimeMs;
	const levelColors: Record<string, string> = {
		error: "text-error-500 bg-error-50",
		warn: "text-warning-700 bg-warning-50",
		info: "text-info-500 bg-info-50",
		log: "text-neutral-600 bg-white",
	};
	const colorClass = levelColors[event.data.level] ?? levelColors.log;

	return (
		<div
			className={cn(
				"flex gap-3 px-4 py-2 font-mono text-xs",
				colorClass,
				isPending && "opacity-30",
			)}
		>
			<span className="shrink-0 text-neutral-400">
				{formatElapsed(event.elapsedMs)}
			</span>
			<span
				className={cn(
					"shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase",
					event.data.level === "warn" && "bg-warning-100 text-warning-700",
					event.data.level === "error" && "bg-error-100 text-error-700",
					event.data.level === "info" && "bg-info-100 text-info-700",
					event.data.level === "log" && "bg-neutral-100 text-neutral-500",
				)}
			>
				{event.data.level}
			</span>
			<span className="min-w-0 whitespace-pre-wrap break-all text-neutral-700">
				{event.data.args.join(" ")}
			</span>
		</div>
	);
}

// ── Network row ──────────────────────────────────────────────────────────────

function NetworkRow({
	event,
	index,
	currentTimeMs,
	activeRowRef,
}: {
	event: NetworkEvent;
	index: number;
	currentTimeMs: number;
	activeRowRef: React.RefObject<HTMLTableRowElement | null>;
}) {
	const { elapsedMs, data } = event;
	const endMs = elapsedMs + data.duration;
	const isActive = elapsedMs <= currentTimeMs && endMs >= currentTimeMs;
	const isPassed = elapsedMs <= currentTimeMs;
	const isError = isErrorStatus(data.status);
	const isPending = !isPassed;

	const rowClasses = cn(
		"border-b border-neutral-100 transition-colors",
		isError && isPassed && "bg-error-50",
		isActive && !isError && "bg-primary-50",
		isPending && "opacity-30",
		!isPending && !isActive && !isError && "hover:bg-neutral-50",
	);

	return (
		<tr ref={isActive ? activeRowRef : undefined} className={rowClasses}>
			<td className="whitespace-nowrap px-2.5 py-1.5 text-neutral-400">
				<span className="flex items-center gap-1.5">
					{isActive && <PulsingDot />}
					<span>{index + 1}</span>
				</span>
			</td>

			<td
				className="max-w-0 truncate px-2.5 py-1.5 text-neutral-800"
				title={data.url}
			>
				{getPathname(data.url)}
			</td>

			<td className="whitespace-nowrap px-2.5 py-1.5">
				<MethodBadge method={data.method} />
			</td>

			<td
				className={cn(
					"whitespace-nowrap px-2.5 py-1.5 font-semibold",
					isError ? "text-error-500" : "text-success-500",
				)}
			>
				{data.status}
			</td>

			<td className="whitespace-nowrap px-2.5 py-1.5 text-neutral-500">
				{data.initiatorType}
			</td>

			<td className="whitespace-nowrap px-2.5 py-1.5 text-neutral-500">
				{formatBytes(data.encodedDataLength)}
			</td>

			<td className="whitespace-nowrap px-2.5 py-1.5 text-neutral-500">
				{formatDuration(data.duration)}
			</td>
		</tr>
	);
}

// ── Pulsing dot ──────────────────────────────────────────────────────────────

function PulsingDot() {
	return (
		<span className="relative flex h-2 w-2">
			<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75 motion-reduce:animate-none" />
			<span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
		</span>
	);
}

// ── Method badge ─────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }): JSX.Element {
	const colorMap: Record<string, string> = {
		GET: "text-info-500",
		POST: "text-warning-700",
		PUT: "text-primary-600",
		DELETE: "text-error-500",
		PATCH: "text-accent-500",
		OPTIONS: "text-neutral-400",
	};

	return (
		<span
			className={cn("font-semibold", colorMap[method] ?? "text-neutral-500")}
		>
			{method}
		</span>
	);
}
