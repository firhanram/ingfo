import { useState } from "react";

interface SegmentedToggleProps {
	options: string[];
	defaultValue?: string;
	onChange?: (value: string) => void;
}

export function SegmentedToggle({
	options,
	defaultValue,
	onChange,
}: SegmentedToggleProps) {
	const [selected, setSelected] = useState(defaultValue ?? options[0] ?? "");

	function handleSelect(value: string) {
		setSelected(value);
		onChange?.(value);
	}

	return (
		<div className="flex items-center gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-surface-dark">
			{options.map((option) => (
				<button
					key={option}
					type="button"
					onClick={() => handleSelect(option)}
					className={`rounded-sm px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
						selected === option
							? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
							: "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
					}`}
				>
					{option}
				</button>
			))}
		</div>
	);
}
