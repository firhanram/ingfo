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

	// "debugger" is a reserved word in TS, so we use a top-level interface
	// and merge it into chrome via the var declaration below.

	namespace scripting {
		function executeScript<T>(details: {
			target: { tabId: number };
			func: (...args: unknown[]) => T;
			args?: unknown[];
			world?: "MAIN" | "ISOLATED";
		}): Promise<{ result: T }[]>;
	}
}

interface ChromeDebuggerDebuggee {
	tabId?: number;
}

interface ChromeDebuggerEventHandler {
	addListener(
		callback: (
			source: ChromeDebuggerDebuggee,
			method: string,
			params?: Record<string, unknown>,
		) => void,
	): void;
	removeListener(
		callback: (
			source: ChromeDebuggerDebuggee,
			method: string,
			params?: Record<string, unknown>,
		) => void,
	): void;
}

interface ChromeDebuggerDetachHandler {
	addListener(
		callback: (source: ChromeDebuggerDebuggee, reason: string) => void,
	): void;
	removeListener(
		callback: (source: ChromeDebuggerDebuggee, reason: string) => void,
	): void;
}

interface ChromeDebuggerApi {
	attach(
		target: ChromeDebuggerDebuggee,
		requiredVersion: string,
	): Promise<void>;
	detach(target: ChromeDebuggerDebuggee): Promise<void>;
	sendCommand(
		target: ChromeDebuggerDebuggee,
		method: string,
		commandParams?: Record<string, unknown>,
	): Promise<Record<string, unknown>>;
	onEvent: ChromeDebuggerEventHandler;
	onDetach: ChromeDebuggerDetachHandler;
}

// Access chrome.debugger via: (chrome as ChromeWithDebugger).debugger
interface ChromeWithDebugger {
	debugger: ChromeDebuggerApi;
}
