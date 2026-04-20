import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { cn } from "#/lib/utils";
import { formatBytes, formatDuration, isErrorStatus } from "../lib/format";
import { getResourceType } from "../lib/network-filters";
import type { NetworkEvent } from "../lib/types";
import { CodeBlock } from "./code-block";

export function NetworkDetailPanel({
	event,
	onClose,
}: {
	event: NetworkEvent;
	onClose: () => void;
}) {
	const { data } = event;
	const [activeDetailTab, setActiveDetailTab] = useState<
		"headers" | "payload" | "response"
	>("headers");

	const statusColor = isErrorStatus(data.status)
		? "text-error-500"
		: "text-success-500";

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			{/* Detail tabs header */}
			<div className="flex shrink-0 items-center border-b border-neutral-200 bg-surface-raised">
				<button
					type="button"
					onClick={onClose}
					className="flex items-center justify-center px-2 py-2 text-neutral-400 hover:text-neutral-700"
				>
					<X className="h-3.5 w-3.5" />
				</button>
				<DetailTabButton
					active={activeDetailTab === "headers"}
					label="Headers"
					onClick={() => setActiveDetailTab("headers")}
				/>
				{data.requestBody && (
					<DetailTabButton
						active={activeDetailTab === "payload"}
						label="Payload"
						onClick={() => setActiveDetailTab("payload")}
					/>
				)}
				{data.responseBody && (
					<DetailTabButton
						active={activeDetailTab === "response"}
						label="Response"
						onClick={() => setActiveDetailTab("response")}
					/>
				)}
			</div>

			{/* Detail content */}
			<div className="flex-1 overflow-auto px-4 py-3">
				{activeDetailTab === "headers" && (
					<div className="space-y-4">
						{/* General */}
						<HeaderSection title="General">
							<HeaderRow label="Request URL" value={data.url} />
							<HeaderRow label="Request Method" value={data.method} />
							<HeaderRow
								label="Status Code"
								value={`${data.status} ${data.statusText}`}
								valueClass={statusColor}
								dot={statusColor}
							/>
							<HeaderRow label="Type" value={getResourceType(event)} />
							<HeaderRow
								label="Duration"
								value={formatDuration(data.duration)}
							/>
							{data.encodedDataLength > 0 && (
								<HeaderRow
									label="Size"
									value={formatBytes(data.encodedDataLength)}
								/>
							)}
						</HeaderSection>

						{/* Response Headers */}
						{Object.keys(data.responseHeaders).length > 0 && (
							<HeaderSection title="Response Headers">
								{Object.entries(data.responseHeaders).map(([key, value]) => (
									<HeaderRow key={key} label={key} value={value} />
								))}
							</HeaderSection>
						)}

						{/* Request Headers */}
						{Object.keys(data.requestHeaders).length > 0 && (
							<HeaderSection title="Request Headers">
								{Object.entries(data.requestHeaders).map(([key, value]) => (
									<HeaderRow key={key} label={key} value={value} />
								))}
							</HeaderSection>
						)}
					</div>
				)}

				{activeDetailTab === "payload" && data.requestBody && (
					<div>
						<h4 className="mb-2 font-semibold text-xs text-neutral-700">
							Request Payload
						</h4>
						<CodeBlock code={data.requestBody} mimeType={data.mimeType} />
					</div>
				)}

				{activeDetailTab === "response" && data.responseBody && (
					<div>
						<h4 className="mb-2 font-semibold text-xs text-neutral-700">
							Response Body
						</h4>
						<CodeBlock code={data.responseBody} mimeType={data.mimeType} />
					</div>
				)}
			</div>
		</div>
	);
}

function DetailTabButton({
	active,
	label,
	onClick,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative px-3 py-2 text-xs font-medium transition-colors",
				active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-700",
			)}
		>
			{label}
			{active && (
				<span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary-500" />
			)}
		</button>
	);
}

function HeaderSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(true);

	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="flex w-full items-center gap-1 border-b border-neutral-100 pb-1 text-left font-semibold text-xs text-neutral-800"
			>
				{open ? (
					<ChevronDown className="h-3 w-3" />
				) : (
					<ChevronRight className="h-3 w-3" />
				)}
				{title}
			</button>
			{open && <dl className="mt-1.5 space-y-1">{children}</dl>}
		</div>
	);
}

function HeaderRow({
	label,
	value,
	valueClass,
	dot,
}: {
	label: string;
	value: string;
	valueClass?: string;
	dot?: string;
}) {
	return (
		<div className="flex gap-3 py-0.5 font-mono text-xs">
			<dt className="w-40 shrink-0 text-neutral-500">{label}:</dt>
			<dd className={cn("min-w-0 break-all text-neutral-800", valueClass)}>
				{dot && (
					<span
						className={cn(
							"mr-1.5 inline-block h-2 w-2 rounded-full",
							isErrorStatus(Number.parseInt(value, 10))
								? "bg-error-500"
								: "bg-success-500",
						)}
					/>
				)}
				{value}
			</dd>
		</div>
	);
}
