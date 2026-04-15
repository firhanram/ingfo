import { cn } from "#/lib/utils";
import { consoleEvents } from "../lib/data";
import { formatElapsed } from "../lib/format";
import type { ConsoleEvent } from "../lib/types";

export function ConsolePanel({ currentTimeMs }: { currentTimeMs: number }) {
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
	const isPassed = event.elapsedMs <= currentTimeMs;

	return (
		<div
			className={cn(
				"flex items-start gap-3 px-4 py-2 font-mono text-xs",
				event.data.level === "error" && "bg-error-50",
				event.data.level === "warn" && "bg-warning-50",
			)}
		>
			<span
				className={cn(
					"mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
					isPassed ? "bg-primary-300" : "bg-neutral-200",
				)}
			/>
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
