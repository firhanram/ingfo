import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Film, Image as ImageIcon } from "lucide-react";
import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import { db, type SharedRecording, type SharedScreenshot } from "@/lib/db";

function formatDuration(ms: number): string {
	const totalSeconds = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function ThumbnailFallback({ icon: Icon }: { icon: typeof Film }) {
	return (
		<div className="flex aspect-video w-full items-center justify-center bg-surface-sunken text-neutral-300">
			<Icon className="size-8" />
		</div>
	);
}

function Thumbnail({
	blob,
	alt,
	fallbackIcon,
	objectFit = "cover",
}: {
	blob: unknown;
	alt: string;
	fallbackIcon: typeof Film;
	objectFit?: "cover" | "contain";
}) {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		// Guard against legacy / malformed records where `thumbnail` is not a
		// real Blob (e.g. persisted before Blobs were serialized correctly
		// across the extension message bus). createObjectURL throws a
		// TypeError on anything that isn't a Blob/MediaSource.
		if (!(blob instanceof Blob) || blob.size === 0) {
			setUrl(null);
			return;
		}
		let objectUrl: string;
		try {
			objectUrl = URL.createObjectURL(blob);
		} catch {
			setUrl(null);
			return;
		}
		setUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [blob]);

	if (!url) return <ThumbnailFallback icon={fallbackIcon} />;

	return (
		<img
			src={url}
			alt={alt}
			className={`aspect-video w-full ${objectFit === "contain" ? "bg-surface-sunken object-contain" : "object-cover"}`}
			loading="lazy"
			onError={() => setUrl(null)}
		/>
	);
}

interface ThumbnailBoundaryProps {
	children: ReactNode;
	fallbackIcon: typeof Film;
}

interface ThumbnailBoundaryState {
	hasError: boolean;
}

class ThumbnailErrorBoundary extends Component<
	ThumbnailBoundaryProps,
	ThumbnailBoundaryState
> {
	state: ThumbnailBoundaryState = { hasError: false };

	static getDerivedStateFromError(): ThumbnailBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: unknown) {
		console.warn("Thumbnail render failed:", error);
	}

	render() {
		if (this.state.hasError)
			return <ThumbnailFallback icon={this.props.fallbackIcon} />;
		return this.props.children;
	}
}

function RecordingCard({ recording }: { recording: SharedRecording }) {
	function handleOpen() {
		window.open(recording.shareUrl, "_blank", "noopener");
	}

	const title = recording.title || "Untitled recording";

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-neutral-200 bg-surface-raised text-left shadow-sm transition-all hover:border-accent-200 hover:shadow-md"
		>
			<div className="relative overflow-hidden">
				<ThumbnailErrorBoundary fallbackIcon={Film}>
					<Thumbnail
						blob={recording.thumbnail}
						alt={title}
						fallbackIcon={Film}
					/>
				</ThumbnailErrorBoundary>
				{typeof recording.durationMs === "number" && (
					<span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-neutral-900/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
						<Clock className="size-3" />
						{formatDuration(recording.durationMs)}
					</span>
				)}
			</div>
			<div className="flex flex-col gap-1 px-3.5 py-3">
				<p className="truncate text-sm font-medium text-neutral-900">{title}</p>
				<p className="text-[11px] text-neutral-400">
					{formatDate(recording.createdAt)}
				</p>
			</div>
		</button>
	);
}

function ScreenshotCard({ screenshot }: { screenshot: SharedScreenshot }) {
	function handleOpen() {
		window.open(screenshot.shareUrl, "_blank", "noopener");
	}

	const title = screenshot.title || "Untitled screenshot";

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-neutral-200 bg-surface-raised text-left shadow-sm transition-all hover:border-accent-200 hover:shadow-md"
		>
			<div className="relative overflow-hidden">
				<ThumbnailErrorBoundary fallbackIcon={ImageIcon}>
					<Thumbnail
						blob={screenshot.thumbnail}
						alt={title}
						fallbackIcon={ImageIcon}
						objectFit="contain"
					/>
				</ThumbnailErrorBoundary>
			</div>
			<div className="flex flex-col gap-1 px-3.5 py-3">
				<p className="truncate text-sm font-medium text-neutral-900">{title}</p>
				<p className="text-[11px] text-neutral-400">
					{formatDate(screenshot.createdAt)}
				</p>
			</div>
		</button>
	);
}

function EmptyState({
	icon: Icon,
	title,
	hint,
}: {
	icon: typeof Film;
	title: string;
	hint: string;
}) {
	return (
		<div className="flex flex-col items-center gap-4 py-24 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-primary-100/50">
				<Icon className="size-7 text-accent-500" />
			</div>
			<div>
				<p className="text-base font-semibold text-neutral-800">{title}</p>
				<p className="mt-1 text-sm text-neutral-400">{hint}</p>
			</div>
		</div>
	);
}

function Grid({ children }: { children: ReactNode }) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{children}
		</div>
	);
}

type Tab = "recordings" | "screenshots";

function TabButton({
	active,
	label,
	count,
	onClick,
}: {
	active: boolean;
	label: string;
	count: number | undefined;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative px-1 py-3 text-sm font-medium transition-colors ${
				active ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
			}`}
		>
			{label}
			{typeof count === "number" && count > 0 && (
				<span className="ml-1.5 text-neutral-400">{count}</span>
			)}
			{active && (
				<span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-500" />
			)}
		</button>
	);
}

function App() {
	const [tab, setTab] = useState<Tab>("recordings");

	const recordings = useLiveQuery(
		() => db.recordings.orderBy("createdAt").reverse().toArray(),
		[],
	);
	const screenshots = useLiveQuery(
		() => db.screenshots.orderBy("createdAt").reverse().toArray(),
		[],
	);

	const content = useMemo(() => {
		if (tab === "recordings") {
			if (recordings === undefined) return null;
			if (recordings.length === 0)
				return (
					<EmptyState
						icon={Film}
						title="No recordings yet"
						hint="Record and share a tab to see it here."
					/>
				);
			return (
				<Grid>
					{recordings.map((r) => (
						<RecordingCard key={r.shareId} recording={r} />
					))}
				</Grid>
			);
		}

		if (screenshots === undefined) return null;
		if (screenshots.length === 0)
			return (
				<EmptyState
					icon={ImageIcon}
					title="No screenshots yet"
					hint="Capture and share a screenshot to see it here."
				/>
			);
		return (
			<Grid>
				{screenshots.map((s) => (
					<ScreenshotCard key={s.shareId} screenshot={s} />
				))}
			</Grid>
		);
	}, [tab, recordings, screenshots]);

	return (
		<div className="min-h-screen">
			<header className="border-b border-neutral-200 bg-surface-raised">
				<div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 pt-4">
					<h1 className="text-lg font-semibold tracking-tight text-neutral-900">
						Library
					</h1>
					<nav className="flex items-center gap-5">
						<TabButton
							active={tab === "recordings"}
							label="Recordings"
							count={recordings?.length}
							onClick={() => setTab("recordings")}
						/>
						<TabButton
							active={tab === "screenshots"}
							label="Screenshots"
							count={screenshots?.length}
							onClick={() => setTab("screenshots")}
						/>
					</nav>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-6 py-6">{content}</main>
		</div>
	);
}

export default App;
