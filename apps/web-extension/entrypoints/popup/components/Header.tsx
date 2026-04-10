import { Icon } from "@iconify/react";

export function Header() {
	return (
		<header className="flex items-center justify-end gap-2 px-4 py-3">
			<button
				type="button"
				className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
			>
				<Icon icon="mdi:home-outline" className="size-5" />
			</button>
			<button
				type="button"
				className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
			>
				<Icon icon="mdi:dots-horizontal" className="size-5" />
			</button>
		</header>
	);
}
