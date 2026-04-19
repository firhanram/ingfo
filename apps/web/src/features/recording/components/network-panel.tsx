import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "#/lib/utils";
import { COL_HEADERS } from "../lib/columns";
import { getDisplayName, getDomain } from "../lib/format";
import { categorizeRequest } from "../lib/network-filters";
import {
	FILTER_CATEGORIES,
	type FilterCategory,
	type NetworkEvent,
} from "../lib/types";
import { NetworkDetailPanel } from "./network-detail-panel";
import { NetworkRow } from "./network-row";

interface IndexedEvent {
	event: NetworkEvent;
	originalIndex: number;
	name: string;
	domain: string;
}

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
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const indexedEvents = useMemo<IndexedEvent[]>(
		() =>
			networkEvents.map((event, originalIndex) => ({
				event,
				originalIndex,
				name: getDisplayName(event.data.url),
				domain: getDomain(event.data.url),
			})),
		[networkEvents],
	);

	const fuse = useMemo(
		() =>
			new Fuse(indexedEvents, {
				keys: [
					{ name: "name", weight: 0.6 },
					{ name: "domain", weight: 0.4 },
				],
				threshold: 0.35,
				ignoreLocation: true,
				minMatchCharLength: 1,
			}),
		[indexedEvents],
	);

	const trimmedQuery = query.trim();
	const searchedEvents = useMemo(
		() =>
			trimmedQuery
				? fuse.search(trimmedQuery).map((r) => r.item)
				: indexedEvents,
		[fuse, indexedEvents, trimmedQuery],
	);

	const filteredEvents =
		filter === "All"
			? searchedEvents
			: searchedEvents.filter(
					({ event }) => categorizeRequest(event) === filter,
				);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const meta = e.metaKey || e.ctrlKey;
			if (meta && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			} else if (
				e.key === "Escape" &&
				document.activeElement === inputRef.current
			) {
				setQuery("");
				inputRef.current?.blur();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<>
			{/* Filter + search bar */}
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
				<div className="flex flex-wrap gap-1">
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

				<div className="ml-auto flex min-w-[220px] flex-1 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-neutral-700 transition-colors focus-within:border-neutral-900 sm:flex-none sm:min-w-[260px]">
					<Search
						className="h-3.5 w-3.5 shrink-0 text-neutral-400"
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search name or domain…"
						className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
						aria-label="Search network requests"
					/>
					{query ? (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								inputRef.current?.focus();
							}}
							className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
							aria-label="Clear search"
						>
							<X className="h-3 w-3" />
						</button>
					) : (
						<kbd className="hidden shrink-0 select-none rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-[10px] text-neutral-400 sm:inline-block">
							⌘K
						</kbd>
					)}
				</div>
			</div>

			{/* Table + Detail split */}
			<div className="flex min-h-0 flex-1">
				{/* Table */}
				<div
					className={cn(
						"overflow-auto bg-white",
						selectedEvent ? "w-1/2 border-r border-neutral-200" : "flex-1",
					)}
				>
					<table className="min-w-full border-collapse font-mono text-xs">
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
							{filteredEvents.length === 0 ? (
								<tr>
									<td
										colSpan={COL_HEADERS.length}
										className="px-4 py-10 text-center text-neutral-400"
									>
										{trimmedQuery
											? `No requests match "${trimmedQuery}"`
											: "No requests"}
									</td>
								</tr>
							) : (
								filteredEvents.map(({ event, originalIndex }, index) => (
									<NetworkRow
										key={originalIndex}
										event={event}
										index={index}
										currentTimeMs={currentTimeMs}
										activeRowRef={activeRowRef}
										selected={selectedEvent === event}
										onSelect={() => setSelectedEvent(event)}
									/>
								))
							)}
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
