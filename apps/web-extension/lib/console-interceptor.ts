/**
 * Console interceptor for capturing console logs during recording.
 *
 * Two parts:
 * 1. `consoleInjectorFunction` — injected into the page's main world via
 *    chrome.scripting.executeScript. Monkey-patches console methods and
 *    posts events via window.postMessage.
 * 2. `consoleCleanupFunction` — restores original console methods.
 *
 * The content script listens for __INGFO_CONSOLE__ messages and forwards
 * them to the background script.
 */

const CONSOLE_MESSAGE_TYPE = "__INGFO_CONSOLE__";

/**
 * This function runs in the page's MAIN world. It must be fully
 * self-contained — no imports or closures.
 */
export function consoleInjectorFunction(): void {
	const MSG_TYPE = "__INGFO_CONSOLE__";
	const MAX_ARG_LENGTH = 2048;
	const MAX_ARGS = 10;
	const levels = ["log", "warn", "error", "info", "debug"] as const;

	// Store originals on a namespaced key to avoid collisions
	const originals: Record<string, (...args: unknown[]) => void> = {};
	const key = "__ingfo_original_console__";

	// Prevent double-patching
	if ((window as unknown as Record<string, unknown>)[key]) return;

	for (const level of levels) {
		originals[level] = console[level].bind(console);
	}
	(window as unknown as Record<string, unknown>)[key] = originals;

	function serialize(value: unknown): string {
		try {
			const str = typeof value === "string" ? value : JSON.stringify(value);
			return (str ?? String(value)).slice(0, MAX_ARG_LENGTH);
		} catch {
			return String(value).slice(0, MAX_ARG_LENGTH);
		}
	}

	function getTrace(): string[] {
		const err = new Error();
		const stack = err.stack ?? "";
		return stack
			.split("\n")
			.slice(3) // skip Error, getTrace, and the patched console method
			.map((line) => line.trim())
			.filter(Boolean)
			.slice(0, 10);
	}

	for (const level of levels) {
		console[level] = (...args: unknown[]) => {
			// Call original first
			originals[level](...args);

			const serializedArgs = args.slice(0, MAX_ARGS).map(serialize);
			const trace = level === "error" ? getTrace() : [];

			window.postMessage(
				{
					type: MSG_TYPE,
					level,
					args: serializedArgs,
					trace,
					timestamp: Date.now(),
				},
				"*",
			);
		};
	}
}

/**
 * Restores original console methods. Runs in the page's MAIN world.
 */
export function consoleCleanupFunction(): void {
	const key = "__ingfo_original_console__";
	const originals = (window as unknown as Record<string, unknown>)[key] as
		| Record<string, (...args: unknown[]) => void>
		| undefined;

	if (!originals) return;

	const levels = ["log", "warn", "error", "info", "debug"] as const;
	for (const level of levels) {
		if (originals[level]) {
			console[level] = originals[level];
		}
	}

	delete (window as unknown as Record<string, unknown>)[key];
}

/**
 * Sets up a window message listener in the content script that forwards
 * console events to the background script.
 */
export function setupConsoleListener(
	sendToBackground: (message: {
		type: "CONSOLE_LOG_EVENT";
		timestamp: number;
		level: "log" | "warn" | "error" | "info" | "debug";
		args: string[];
		trace: string[];
	}) => void,
): () => void {
	function handler(event: MessageEvent): void {
		if (event.data?.type !== CONSOLE_MESSAGE_TYPE) return;

		sendToBackground({
			type: "CONSOLE_LOG_EVENT",
			timestamp: event.data.timestamp,
			level: event.data.level,
			args: event.data.args,
			trace: event.data.trace,
		});
	}

	window.addEventListener("message", handler);
	return () => window.removeEventListener("message", handler);
}
