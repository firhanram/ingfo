import {
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	Clock,
	HardDrive,
} from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "#/lib/utils";
import { formatBytes, formatDuration, getDisplayName } from "../lib/format";
import { getResourceType } from "../lib/network-filters";
import type { NetworkEvent } from "../lib/types";
import { ResourceTypeIcon } from "./resource-type-icon";

export function SummaryPanel({
	errorEvents,
	largestEvents,
	slowestEvents,
}: {
	errorEvents: NetworkEvent[];
	largestEvents: NetworkEvent[];
	slowestEvents: NetworkEvent[];
}) {
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
						label: getDisplayName(e.data.url),
						icon: <ResourceTypeIcon resourceType={getResourceType(e)} />,
						badge: `${e.data.status} ${e.data.statusText}`,
						badgeColor: "text-error-500",
					}))}
				/>
			)}
			{expanded === "large" && largestEvents.length > 0 && (
				<ExpandedList
					items={largestEvents.map((e) => ({
						label: getDisplayName(e.data.url),
						icon: <ResourceTypeIcon resourceType={getResourceType(e)} />,
						badge: formatBytes(e.data.encodedDataLength),
						badgeColor: "text-warning-700",
					}))}
				/>
			)}
			{expanded === "slow" && slowestEvents.length > 0 && (
				<ExpandedList
					items={slowestEvents.map((e) => ({
						label: getDisplayName(e.data.url),
						icon: <ResourceTypeIcon resourceType={getResourceType(e)} />,
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
	items: {
		label: string;
		icon: React.ReactNode;
		badge: string;
		badgeColor: string;
	}[];
}) {
	return (
		<ul className="mt-2 max-h-48 space-y-1 overflow-y-auto border-t border-neutral-100 pt-2">
			{items.map((item) => (
				<li
					key={`${item.label}-${item.badge}`}
					className="flex items-center gap-2 font-mono text-xs text-neutral-600"
				>
					<span className="flex items-center gap-1.5 min-w-0">
						{item.icon}
						<span className="truncate">{item.label}</span>
					</span>
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
