import { Icon } from "@iconify/react";
import { type ReactNode, useState } from "react";

interface CollapsibleCardProps {
	icon: string;
	title: string;
	headerExtra?: ReactNode;
	children: ReactNode;
	defaultOpen?: boolean;
}

export function CollapsibleCard({
	icon,
	title,
	headerExtra,
	children,
	defaultOpen = true,
}: CollapsibleCardProps) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div className="rounded-lg border border-neutral-200 bg-surface-raised shadow-sm dark:border-neutral-700 dark:bg-surface-raised-dark">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center gap-3 px-4 py-3"
			>
				<Icon
					icon={icon}
					className="size-5 text-neutral-600 dark:text-neutral-300"
				/>
				<span className="flex-1 text-left text-sm font-medium text-neutral-900 dark:text-neutral-100">
					{title}
				</span>
				{headerExtra}
				<Icon
					icon={open ? "mdi:chevron-up" : "mdi:chevron-down"}
					className="size-5 text-neutral-400 dark:text-neutral-500"
				/>
			</button>
			{open && (
				<div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-700">
					{children}
				</div>
			)}
		</div>
	);
}
