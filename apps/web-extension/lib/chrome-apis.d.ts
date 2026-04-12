/**
 * Chrome-only APIs not available in the webextension-polyfill `browser` namespace.
 * These are used for tab recording (tabCapture, offscreen document).
 */

declare namespace chrome {
	namespace offscreen {
		enum Reason {
			USER_MEDIA = "USER_MEDIA",
			DISPLAY_MEDIA = "DISPLAY_MEDIA",
		}

		function createDocument(parameters: {
			url: string;
			reasons: Reason[];
			justification: string;
		}): Promise<void>;

		function closeDocument(): Promise<void>;
	}

	namespace tabCapture {
		function getMediaStreamId(
			options: { targetTabId: number },
			callback: (streamId: string) => void,
		): void;
	}

	namespace desktopCapture {
		function chooseDesktopMedia(
			sources: ("screen" | "window" | "tab" | "audio")[],
			targetTab: { id: number },
			callback: (streamId: string) => void,
		): number;

		function chooseDesktopMedia(
			sources: ("screen" | "window" | "tab" | "audio")[],
			callback: (streamId: string) => void,
		): number;

		function cancelChooseDesktopMedia(desktopMediaRequestId: number): void;
	}

	namespace runtime {
		function getContexts(filter: {
			contextTypes: string[];
		}): Promise<{ documentUrl?: string }[]>;
	}
}
