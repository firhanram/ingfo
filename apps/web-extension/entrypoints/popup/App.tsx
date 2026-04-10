import { Icon } from "@iconify/react";
import { CollapsibleCard } from "./components/CollapsibleCard";
import { Header } from "./components/Header";
import { SegmentedToggle } from "./components/SegmentedToggle";

function App() {
	return (
		<div className="w-[380px] bg-surface dark:bg-surface-dark">
			<Header />

			<div className="flex flex-col gap-3 px-4 pb-4">
				{/* Capture Screenshot */}
				<CollapsibleCard icon="mdi:camera-outline" title="Capture Screenshot">
					<div className="flex items-center justify-between">
						<span className="text-sm text-neutral-500 dark:text-neutral-400">
							Time delay
						</span>
						<SegmentedToggle options={["Off", "3s", "6s"]} />
					</div>
				</CollapsibleCard>

				{/* Record Tab */}
				<CollapsibleCard
					icon="mdi:monitor-screenshot"
					title="Record Tab"
					headerExtra={
						<span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
							<Icon icon="mdi:microphone-off" className="size-4" />
							Off
						</span>
					}
				>
					<div className="flex items-center justify-between">
						<span className="text-sm text-neutral-500 dark:text-neutral-400">
							Record area
						</span>
						<SegmentedToggle options={["Tab", "Desktop"]} />
					</div>
				</CollapsibleCard>
			</div>
		</div>
	);
}

export default App;
