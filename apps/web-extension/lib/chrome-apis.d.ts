/**
 * Chrome-only APIs not available in the webextension-polyfill `browser` namespace.
 * These are used for tab recording (tabCapture, offscreen document).
 */

declare namespace chrome {
	namespace offscreen {
		enum Reason {
			USER_MEDIA = "USER_MEDIA",
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

	namespace runtime {
		function getContexts(filter: {
			contextTypes: string[];
		}): Promise<{ documentUrl?: string }[]>;
	}
}
