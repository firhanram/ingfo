interface RecordingIndicatorBadgeProps {
	tabTitle: string;
	recordingTabId: number;
}

export function RecordingIndicatorBadge({
	tabTitle,
	recordingTabId,
}: RecordingIndicatorBadgeProps) {
	function handleClick() {
		// Ask background to switch to the recorded tab
		browser.tabs.update(recordingTabId, { active: true });
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className="animate-slide-down fixed top-4 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-2.5 rounded-full bg-neutral-900/90 px-4 py-2 shadow-lg backdrop-blur-sm transition-opacity hover:opacity-90"
		>
			<span className="animate-pulse-red size-2 rounded-full bg-red-500" />
			<span className="text-xs font-medium text-white">
				Recording on {tabTitle}
			</span>
			<span className="text-xs text-white/50">· Click to return</span>
		</button>
	);
}
