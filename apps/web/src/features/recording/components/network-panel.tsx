import { useState } from "react";
import { cn } from "#/lib/utils";
import { COL_HEADERS } from "../lib/columns";
import { categorizeRequest } from "../lib/network-filters";
import {
	FILTER_CATEGORIES,
	type FilterCategory,
	type NetworkEvent,
} from "../lib/types";
import { NetworkDetailPanel } from "./network-detail-panel";
import { NetworkRow } from "./network-row";

export function NetworkPanel({
	networkEvents,
	currentTimeMs,
	colWidths,
	onColResizeStart,
	activeRowRef,
}: {
	networkEvents: NetworkEvent[];
	currentTimeMs: number;
	colWidths: number[];
	onColResizeStart: (colIndex: number, e: React.MouseEvent) => void;
	activeRowRef: React.RefObject<HTMLTableRowElement | null>;
}) {
	const [filter, setFilter] = useState<FilterCategory>("All");
	const [selectedEvent, setSelectedEvent] = useState<NetworkEvent | null>(null);

	const filteredEvents =
		filter === "All"
			? networkEvents
			: networkEvents.filter((e) => categorizeRequest(e) === filter);

	return (
		<>
			{/* Filter bar */}
			<div className="flex shrink-0 flex-wrap gap-1 border-b border-neutral-200 bg-white px-3 py-2">
				{FILTER_CATEGORIES.map((cat) => (
					<button
						key={cat}
						type="button"
						onClick={() => setFilter(cat)}
						className={cn(
							"rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
							filter === cat
								? "border-neutral-900 bg-neutral-900 text-white"
								: "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
						)}
					>
						{cat}
					</button>
				))}
			</div>

			{/* Table + Detail split */}
			<div className="flex min-h-0 flex-1">
				{/* Table */}
				<div
					className={cn(
						"overflow-auto",
						selectedEvent ? "w-1/2 border-r border-neutral-200" : "flex-1",
					)}
				>
					<table className="w-full border-collapse font-mono text-xs">
						<thead className="sticky top-0 z-10 bg-surface-raised">
							<tr className="border-b border-neutral-200 text-left text-neutral-500">
								{COL_HEADERS.map((header, i) => (
									<th
										key={header}
										className="relative select-none whitespace-nowrap px-2.5 py-2 text-xs font-medium"
										style={{ width: selectedEvent ? undefined : colWidths[i] }}
									>
										{header}
										{!selectedEvent && i < COL_HEADERS.length - 1 && (
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
							{filteredEvents.map((event, index) => (
								<NetworkRow
									key={`${event.timestamp}-${event.data.method}-${event.data.url}`}
									event={event}
									index={index}
									currentTimeMs={currentTimeMs}
									activeRowRef={activeRowRef}
									selected={selectedEvent === event}
									onSelect={() => setSelectedEvent(event)}
								/>
							))}
						</tbody>
					</table>
				</div>

				{/* Detail panel */}
				{selectedEvent && (
					<NetworkDetailPanel
						event={selectedEvent}
						onClose={() => setSelectedEvent(null)}
					/>
				)}
			</div>
		</>
	);
}
