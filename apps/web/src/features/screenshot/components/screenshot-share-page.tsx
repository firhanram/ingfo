import { Clock, Globe, Image as ImageIcon, Link2, Monitor } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useCallback, useState } from "react";
import { formatTimestamp, parseOS } from "#/features/recording/lib/format";
import type { ScreenshotMetadata } from "#/features/screenshot/lib/types";
import { cn } from "#/lib/utils";
import { Route } from "#/routes/shot.$id";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export function ScreenshotSharePage() {
	const { imageUrl, metadata } = Route.useLoaderData();
	const [copied, setCopied] = useState(false);

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
					{metadata.browserInfo.title || "Screenshot"}
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
			<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
				{/* Image */}
				<div className="flex flex-1 items-center justify-center overflow-auto bg-surface-sunken p-6">
					<img
						src={imageUrl}
						alt={metadata.browserInfo.title || "Shared screenshot"}
						className="max-h-full max-w-full rounded-lg shadow-lg"
					/>
				</div>

				{/* Metadata */}
				<ScreenshotInfoPanel metadata={metadata} />
			</div>
		</div>
	);
}

function ScreenshotInfoPanel({ metadata }: { metadata: ScreenshotMetadata }) {
	const { browserInfo } = metadata;
	const os = parseOS(browserInfo.userAgent, browserInfo.platform, {
		osName: browserInfo.osName,
		osVersion: browserInfo.osVersion,
		architecture: browserInfo.architecture,
	});
	const browserVersion =
		browserInfo.browserFullVersion || browserInfo.browserVersion;
	const urlDisplay = stripQuery(browserInfo.url);
	// Only allow http(s) as a link target — the URL comes from the captured
	// page and could carry a javascript:/data: scheme, which would be an XSS
	// vector if rendered as an href.
	const urlHref = safeHttpUrl(browserInfo.url);

	return (
		<div className="shrink-0 border-neutral-200 border-t bg-white px-5 py-4 lg:w-80 lg:border-t-0 lg:border-l">
			<h3 className="mb-3 font-semibold text-sm text-neutral-900">
				Screenshot Info
			</h3>
			<div className="grid grid-cols-1 gap-y-2.5">
				<InfoRow
					icon={Clock}
					label="Captured"
					value={formatTimestamp(metadata.capturedAt)}
				/>
				<InfoRow
					icon={Globe}
					label="URL"
					value={urlDisplay}
					href={urlHref}
					mono
				/>
				<InfoRow
					icon={Monitor}
					label="OS"
					value={os.version ? `${os.name} ${os.version}` : os.name || "Unknown"}
				/>
				<InfoRow
					icon={Monitor}
					label="Browser"
					value={`${browserInfo.browserName} ${browserVersion}`}
				/>
				<InfoRow
					icon={ImageIcon}
					label="Dimensions"
					value={`${metadata.width}×${metadata.height}`}
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
	href,
}: {
	icon: IconComponent;
	label: string;
	value: string;
	mono?: boolean;
	href?: string;
}) {
	const valueClass = cn(
		"truncate text-neutral-800",
		mono && "font-mono text-xs",
		href &&
			"text-primary-600 underline decoration-neutral-300 underline-offset-2 hover:decoration-primary-600",
	);
	return (
		<div className="flex items-start gap-2 text-sm">
			<Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
			<div className="flex min-w-0 items-center gap-1.5">
				<span className="text-neutral-500">{label}: </span>
				{href ? (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className={valueClass}
						title={value}
					>
						{value}
					</a>
				) : (
					<span className={valueClass} title={value}>
						{value}
					</span>
				)}
			</div>
		</div>
	);
}

function stripQuery(url: string): string {
	try {
		const parsed = new URL(url);
		parsed.search = "";
		parsed.hash = "";
		const result = parsed.toString();
		return result.endsWith("/") && !url.endsWith("/")
			? result.slice(0, -1)
			: result;
	} catch {
		const qIndex = url.indexOf("?");
		return qIndex >= 0 ? url.slice(0, qIndex) : url;
	}
}

// Returns a query-stripped URL only when it uses an http(s) scheme, otherwise
// undefined so it is never used as a link target (guards against
// javascript:/data: scheme injection from the captured page's URL).
function safeHttpUrl(url: string): string | undefined {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return undefined;
		}
		parsed.search = "";
		parsed.hash = "";
		const result = parsed.toString();
		return result.endsWith("/") && !url.endsWith("/")
			? result.slice(0, -1)
			: result;
	} catch {
		return undefined;
	}
}
