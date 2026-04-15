import { cn } from "#/lib/utils";

export function TabButton({
	active,
	label,
	count,
	onClick,
}: {
	active: boolean;
	label: string;
	count: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative px-4 py-2 text-sm font-medium transition-colors",
				active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-700",
			)}
		>
			{label}
			<span
				className={cn(
					"ml-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
					active
						? "bg-primary-100 text-primary-700"
						: "bg-neutral-100 text-neutral-500",
				)}
			>
				{count}
			</span>
			{active && (
				<span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary-500" />
			)}
		</button>
	);
}
