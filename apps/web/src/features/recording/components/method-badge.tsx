import type { JSX } from "react";
import { cn } from "#/lib/utils";

const colorMap: Record<string, string> = {
	GET: "text-info-500",
	POST: "text-warning-700",
	PUT: "text-primary-600",
	DELETE: "text-error-500",
	PATCH: "text-accent-500",
	OPTIONS: "text-neutral-400",
};

export function MethodBadge({ method }: { method: string }): JSX.Element {
	return (
		<span
			className={cn("font-semibold", colorMap[method] ?? "text-neutral-500")}
		>
			{method}
		</span>
	);
}
