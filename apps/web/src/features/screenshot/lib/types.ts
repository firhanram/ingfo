import type { BrowserInfo } from "#/features/recording/lib/types";

export interface ScreenshotMetadata {
	browserInfo: BrowserInfo;
	capturedAt: number;
	width: number;
	height: number;
}
