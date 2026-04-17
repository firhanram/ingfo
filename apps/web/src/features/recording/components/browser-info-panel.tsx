import { Clock, Globe, Monitor } from "lucide-react";
import { cn } from "#/lib/utils";
import { formatElapsed } from "../lib/format";
import type { BrowserInfo } from "../lib/types";

export function BrowserInfoPanel({
	browserInfo,
	totalRecordingMs,
}: {
	browserInfo: BrowserInfo;
	totalRecordingMs: number;
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
