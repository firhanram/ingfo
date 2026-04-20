import { cn } from "#/lib/utils";
import {
	formatDuration,
	formatSize,
	getDisplayName,
	getDomain,
	isErrorStatus,
} from "../lib/format";
import { getResourceType } from "../lib/network-filters";
import type { NetworkEvent } from "../lib/types";
import { MethodBadge } from "./method-badge";
import { ResourceTypeIcon } from "./resource-type-icon";
import { StatusDot } from "./status-dot";

export function NetworkRow({
	event,
	index,
	currentTimeMs,
	activeRowRef,
	selected,
	onSelect,
}: {
	event: NetworkEvent;
	index: number;
	currentTimeMs: number;
	activeRowRef: React.RefObject<HTMLTableRowElement | null>;
	selected: boolean;
	onSelect: () => void;
}) {
	const { elapsedMs, data } = event;
	const endMs = elapsedMs + data.duration;
	const isActive = elapsedMs <= currentTimeMs && endMs >= currentTimeMs;
	const isPassed = elapsedMs <= currentTimeMs;
	const isError = isErrorStatus(data.status);
	const isPending = !isPassed;

	const rowClasses = cn(
		"border-b border-neutral-100 transition-colors cursor-pointer",
		selected && "bg-primary-50",
		!selected && isError && isPassed && "bg-error-50",
		!selected && !isPending && !isError && "hover:bg-neutral-50",
	);

	return (
		<tr
			ref={isActive ? activeRowRef : undefined}
			className={rowClasses}
			onClick={onSelect}
		>
			<td className="whitespace-nowrap px-2.5 py-1.5 text-neutral-400">
				<span className="flex items-center gap-1.5">
					<StatusDot
						isPassed={isPassed}
						isActive={isActive}
						isError={isError}
					/>
					<span>{index + 1}</span>
				</span>
			</td>

			<td className="max-w-0 px-2.5 py-1.5 text-neutral-800" title={data.url}>
				<span className="flex items-center gap-1.5">
					<ResourceTypeIcon resourceType={getResourceType(event)} />
					<span className="truncate">{getDisplayName(data.url)}</span>
				</span>
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
				{getResourceType(event)}
			</td>

			<td
				className="max-w-0 truncate px-2.5 py-1.5 text-neutral-400"
				title={getDomain(data.url)}
			>
				{getDomain(data.url)}
			</td>

			<td
				className={cn(
					"whitespace-nowrap px-2.5 py-1.5 text-neutral-500",
					data.cacheSource && "italic",
				)}
			>
				{formatSize(data.encodedDataLength, data.cacheSource)}
			</td>

			<td className="whitespace-nowrap px-2.5 py-1.5 text-neutral-500">
				{formatDuration(data.duration)}
			</td>
		</tr>
	);
}
