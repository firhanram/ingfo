import {
	Camera,
	Ellipsis,
	Globe,
	House,
	Mic,
	MicOff,
	Monitor,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { Message } from "@/lib/messages";

const toggleActiveClass =
	"cursor-pointer data-[state=on]:bg-accent-400 data-[state=on]:text-white data-[state=on]:hover:bg-accent-500";

function Header() {
	return (
		<header className="flex items-center justify-end gap-0.5 px-5 pt-4 pb-1">
			<div className="flex items-center gap-0.5">
				<Button variant="ghost" size="icon-sm">
					<House data-icon="inline-start" />
				</Button>
				<Button variant="ghost" size="icon-sm">
					<Ellipsis data-icon="inline-start" />
				</Button>
			</div>
		</header>
	);
}

function NavigatePrompt() {
	return (
		<div className="flex flex-col items-center gap-5 px-6 py-10">
			<div className="relative size-24">
				{/* Warm glow backdrop */}
				<div className="absolute inset-0 rounded-full bg-primary-100/50" />
				{/* Dashed page outline — "something goes here" */}
				<div className="absolute top-2.5 left-3.5 h-14 w-[60px] rounded-lg border-2 border-dashed border-accent-200 bg-accent-50/40" />
				{/* Globe badge */}
				<div className="absolute right-1.5 bottom-1.5 flex size-10 items-center justify-center rounded-full bg-accent-400 shadow-md">
					<Globe className="size-[18px] text-white" />
				</div>
			</div>

			<div className="text-center">
				<p className="text-[15px] font-semibold text-neutral-800">
					Navigate to a website
				</p>
				<p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">
					Open any webpage to start
					<br />
					capturing and recording
				</p>
			</div>
		</div>
	);
}

function ScreenshotSection() {
	async function handleCapture() {
		await browser.runtime.sendMessage({
			type: "START_CAPTURE",
		} satisfies Message);

		window.close();
	}

	return (
		<section>
			<h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
				Screenshot
			</h2>
			<button
				type="button"
				onClick={handleCapture}
				className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:bg-surface-sunken"
			>
				<Camera className="size-[18px] text-accent-500" />
				<span className="text-sm font-medium text-neutral-900">Capture</span>
			</button>
		</section>
	);
}

function RecordSection() {
	const [recordArea, setRecordArea] = useState("tab");
	const [micEnabled, setMicEnabled] = useState(false);

	return (
		<section>
			<h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
				Recording
			</h2>
			<div className="flex flex-col gap-2">
				<button
					type="button"
					className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:bg-surface-sunken"
				>
					<Monitor className="size-[18px] text-accent-500" />
					<span className="text-sm font-medium text-neutral-900">
						Record Tab
					</span>
				</button>

				<div className="flex items-center gap-2 px-3.5 py-2.5">
					<span className="text-sm text-neutral-500">Area</span>
					<div className="ml-auto">
						<ToggleGroup
							type="single"
							value={recordArea}
							onValueChange={(v) => {
								if (v) setRecordArea(v);
							}}
							variant="outline"
						>
							<ToggleGroupItem
								value="tab"
								size="sm"
								className={toggleActiveClass}
							>
								Tab
							</ToggleGroupItem>
							<ToggleGroupItem
								value="desktop"
								size="sm"
								className={toggleActiveClass}
							>
								Desktop
							</ToggleGroupItem>
						</ToggleGroup>
					</div>
				</div>

				<div className="flex items-center gap-2 px-3.5 py-2.5">
					<span className="text-sm text-neutral-500">Microphone</span>
					<div className="ml-auto">
						<ToggleGroup
							type="single"
							value={micEnabled ? "on" : "off"}
							onValueChange={(v) => {
								if (v) setMicEnabled(v === "on");
							}}
							variant="outline"
						>
							<ToggleGroupItem
								value="off"
								size="sm"
								className={toggleActiveClass}
							>
								<MicOff className="size-3.5" />
								Off
							</ToggleGroupItem>
							<ToggleGroupItem
								value="on"
								size="sm"
								className={toggleActiveClass}
							>
								<Mic className="size-3.5" />
								On
							</ToggleGroupItem>
						</ToggleGroup>
					</div>
				</div>
			</div>
		</section>
	);
}

function isRestrictedUrl(url: string | undefined): boolean {
	if (!url) return true;
	return /^(chrome|chrome-extension|edge|about|brave):\/\//i.test(url);
}

function App() {
	const [restricted, setRestricted] = useState<boolean | null>(null);

	useMountEffect(() => {
		browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
			setRestricted(isRestrictedUrl(tab?.url));
		});
		return undefined;
	});

	if (restricted === null) return <div className="w-[380px]" />;

	return (
		<div className="w-[380px]">
			<Header />
			{restricted ? (
				<NavigatePrompt />
			) : (
				<div className="flex flex-col gap-5 px-4 pt-3 pb-5">
					<ScreenshotSection />
					<RecordSection />
				</div>
			)}
		</div>
	);
}

export default App;
