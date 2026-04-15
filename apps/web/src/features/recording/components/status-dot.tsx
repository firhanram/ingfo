import { cn } from "#/lib/utils";

export function StatusDot({
	isPassed,
	isActive,
	isError,
}: {
	isPassed: boolean;
	isActive: boolean;
	isError: boolean;
}) {
	if (isActive) {
		return (
			<span className="relative flex h-2.5 w-2.5">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75 motion-reduce:animate-none" />
				<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-400" />
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
				isError && isPassed && "bg-error-500",
				!isError && isPassed && "bg-primary-300",
				!isPassed && "bg-neutral-200",
			)}
		/>
	);
}
