import {
	Braces,
	Code,
	FileCode,
	FileText,
	Globe,
	Image,
	Paintbrush,
	Type,
} from "lucide-react";
import { cn } from "#/lib/utils";

export function ResourceTypeIcon({ resourceType }: { resourceType: string }) {
	const iconClass = "h-3.5 w-3.5 shrink-0";

	switch (resourceType) {
		case "fetch":
		case "xhr":
		case "preflight":
			return <Braces className={cn(iconClass, "text-accent-500")} />;
		case "document":
			return <FileText className={cn(iconClass, "text-info-500")} />;
		case "script":
			return <FileCode className={cn(iconClass, "text-warning-500")} />;
		case "stylesheet":
			return <Paintbrush className={cn(iconClass, "text-success-500")} />;
		case "font":
		case "woff2":
		case "woff":
		case "ttf":
			return <Type className={cn(iconClass, "text-primary-500")} />;
		case "png":
		case "jpeg":
		case "gif":
		case "svg":
		case "webp":
		case "ico":
		case "avif":
			return <Image className={cn(iconClass, "text-accent-400")} />;
		case "websocket":
			return <Globe className={cn(iconClass, "text-success-500")} />;
		default:
			return <Code className={cn(iconClass, "text-neutral-400")} />;
	}
}
