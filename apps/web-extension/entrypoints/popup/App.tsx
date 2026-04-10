import {
	Camera,
	ChevronDown,
	ChevronUp,
	Ellipsis,
	House,
	MicOff,
	Monitor,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Message } from "@/lib/messages";

function Header() {
	return (
		<header className="flex items-center justify-end gap-1 px-4 py-3">
			<Button variant="ghost" size="icon-sm">
				<House data-icon="inline-start" />
			</Button>
			<Button variant="ghost" size="icon-sm">
				<Ellipsis data-icon="inline-start" />
			</Button>
		</header>
	);
}

function CaptureScreenshot() {
	const [open, setOpen] = useState(true);
	const [delay, setDelay] = useState("off");

	async function handleCapture() {
		const delayMs = delay === "3s" ? 3000 : delay === "6s" ? 6000 : 0;

		await browser.runtime.sendMessage({
			type: "START_CAPTURE",
			delay: delayMs,
		} satisfies Message);

		window.close();
	}

	return (
		<Card className="gap-0 py-0">
			<Collapsible open={open} onOpenChange={setOpen}>
				<div className="flex w-full items-center gap-3 px-4 py-3">
					<button
						type="button"
						onClick={handleCapture}
						className="flex flex-1 items-center gap-3"
					>
						<Camera className="size-5 text-muted-foreground" />
						<span className="flex-1 text-left text-sm font-medium">
							Capture Screenshot
						</span>
					</button>
					<CollapsibleTrigger asChild>
						<button type="button" className="p-1">
							{open ? (
								<ChevronUp className="size-5 text-muted-foreground" />
							) : (
								<ChevronDown className="size-5 text-muted-foreground" />
							)}
						</button>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent>
					<CardContent className="border-t px-4 py-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Time delay</span>
							<ToggleGroup
								type="single"
								value={delay}
								onValueChange={(v) => {
									if (v) setDelay(v);
								}}
								variant="outline"
							>
								<ToggleGroupItem value="off" size="sm">
									Off
								</ToggleGroupItem>
								<ToggleGroupItem value="3s" size="sm">
									3s
								</ToggleGroupItem>
								<ToggleGroupItem value="6s" size="sm">
									6s
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}

function RecordTab() {
	const [open, setOpen] = useState(true);

	return (
		<Card className="gap-0 py-0">
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="flex w-full items-center gap-3 px-4 py-3"
					>
						<Monitor className="size-5 text-muted-foreground" />
						<span className="flex-1 text-left text-sm font-medium">
							Record Tab
						</span>
						<span className="flex items-center gap-1 text-xs text-muted-foreground">
							<MicOff className="size-4" />
							Off
						</span>
						{open ? (
							<ChevronUp className="size-5 text-muted-foreground" />
						) : (
							<ChevronDown className="size-5 text-muted-foreground" />
						)}
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent className="border-t px-4 py-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Record area</span>
							<ToggleGroup type="single" defaultValue="tab" variant="outline">
								<ToggleGroupItem value="tab" size="sm">
									Tab
								</ToggleGroupItem>
								<ToggleGroupItem value="desktop" size="sm">
									Desktop
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}

function App() {
	return (
		<div className="w-[380px]">
			<Header />
			<div className="flex flex-col gap-3 px-4 pb-4">
				<CaptureScreenshot />
				<RecordTab />
			</div>
		</div>
	);
}

export default App;
