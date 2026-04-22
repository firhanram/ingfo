import { Clock, Globe, Monitor } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "#/lib/utils";
import { formatElapsed, formatTimestamp, parseOS } from "../lib/format";
import type { BrowserInfo } from "../lib/types";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export function BrowserInfoPanel({
	browserInfo,
	totalRecordingMs,
	recordingStartTime,
}: {
	browserInfo: BrowserInfo;
	totalRecordingMs: number;
	recordingStartTime: number;
}) {
	const os = parseOS(browserInfo.userAgent, browserInfo.platform, {
		osName: browserInfo.osName,
		osVersion: browserInfo.osVersion,
		architecture: browserInfo.architecture,
	});
	const browserVersion =
		browserInfo.browserFullVersion || browserInfo.browserVersion;
	const urlWithoutQuery = stripQuery(browserInfo.url);

	return (
		<div className="shrink-0 border-b border-neutral-200 bg-white px-5 py-4">
			<h3 className="mb-3 font-semibold text-sm text-neutral-900">
				Browser Info
			</h3>
			<div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
				<InfoRow
					icon={Clock}
					label="Timestamp"
					value={formatTimestamp(recordingStartTime)}
				/>
				<InfoRow
					icon={Monitor}
					label="OS"
					value={os.version ? `${os.name} ${os.version}` : os.name || "Unknown"}
				/>
				<InfoRow
					icon={Globe}
					label="URL"
					value={urlWithoutQuery}
					href={urlWithoutQuery}
					mono
				/>
				<InfoRow
					icon={Monitor}
					label="Browser"
					value={`${browserInfo.browserName} ${browserVersion}`}
				/>
				<InfoRow
					icon={Monitor}
					label="Viewport"
					value={`${browserInfo.windowWidth}x${browserInfo.windowHeight}`}
				/>
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
