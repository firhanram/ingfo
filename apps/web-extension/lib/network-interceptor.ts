import type { NetworkLogEntry } from "./metadata-types";

const MAX_BODY_SIZE = 32 * 1024; // 32KB

const dbg = (chrome as unknown as ChromeWithDebugger).debugger;

interface PendingRequest {
	url: string;
	method: string;
	requestHeaders: Record<string, string>;
	requestBody: string | null;
	timestamp: number;
	initiatorType: string;
	resourceType?: string;
	mimeType?: string;
	cacheSource?: "memory" | "disk" | "prefetch";
}

function shouldSkipBody(request: {
	resourceType?: string;
	mimeType?: string;
}): boolean {
	// API calls remain inspectable even when they return JavaScript or CSS.
	if (request.resourceType === "Fetch" || request.resourceType === "XHR") {
		return false;
	}
	if (
		request.resourceType === "Script" ||
		request.resourceType === "Stylesheet"
	) {
		return true;
	}
	const mime = request.mimeType?.split(";")[0].trim().toLowerCase() ?? "";
	return mime === "text/css" || /(?:java|ecma)script/.test(mime);
}

const pendingRequests = new Map<string, PendingRequest>();
let activeTabId: number | null = null;
let eventCallback:
	| ((entry: Omit<NetworkLogEntry, "elapsedMs">) => void)
	| null = null;

function handleDebuggerDetach(
	source: ChromeDebuggerDebuggee,
	_reason: string,
): void {
	if (source.tabId !== activeTabId) return;
	activeTabId = null;
	eventCallback = null;
	pendingRequests.clear();
}

export function isNetworkCaptureActive(tabId: number): boolean {
	return activeTabId === tabId;
}

function handleDebuggerEvent(
	source: ChromeDebuggerDebuggee,
	method: string,
	params?: Record<string, unknown>,
): void {
	if (source.tabId !== activeTabId || !params || !eventCallback) return;

	const requestId = params.requestId as string;

	if (method === "Network.requestWillBeSent") {
		const request = params.request as Record<string, unknown>;
		const headers = (request.headers as Record<string, string>) ?? {};
		const postData = (request.postData as string) ?? null;
		const resourceType = params.type as string | undefined;

		pendingRequests.set(requestId, {
			url: request.url as string,
			method: (request.method as string) ?? "GET",
			requestHeaders: headers,
			requestBody:
				postData && !shouldSkipBody({ resourceType })
					? postData.slice(0, MAX_BODY_SIZE)
					: null,
			resourceType,
			timestamp: Date.now(),
			initiatorType:
				((params.initiator as Record<string, unknown>)?.type as string) ??
				"other",
		});
	} else if (method === "Network.responseReceived") {
		const pending = pendingRequests.get(requestId);
		if (!pending) return;

		const response = params.response as Record<string, unknown>;
		const headers = (response.headers as Record<string, string>) ?? {};

		const fromDiskCache = response.fromDiskCache === true;
		const fromPrefetchCache = response.fromPrefetchCache === true;

		Object.assign(pending, {
			status: response.status as number,
			statusText: (response.statusText as string) ?? "",
			responseHeaders: headers,
			mimeType: (response.mimeType as string) ?? "",
			resourceType: (params.type as string) ?? pending.resourceType,
			cacheSource: fromPrefetchCache
				? "prefetch"
				: fromDiskCache
					? "disk"
					: pending.cacheSource,
		});
	} else if (method === "Network.requestServedFromCache") {
		const pending = pendingRequests.get(requestId);
		if (!pending) return;
		pending.cacheSource = "memory";
	} else if (method === "Network.loadingFinished") {
		const pending = pendingRequests.get(requestId);
		if (!pending) return;

		pendingRequests.delete(requestId);

		const encodedDataLength = (params.encodedDataLength as number) ?? 0;
		const endTime = Date.now();

		const tabId = activeTabId;
		if (tabId === null) return;

		if (shouldSkipBody(pending)) {
			const size = resolveSize(encodedDataLength, 0, pending);
			emitEntry(pending, endTime, size, null);
			return;
		}

		dbg
			.sendCommand({ tabId }, "Network.getResponseBody", {
				requestId,
			})
			.then((result) => {
				const body = result.body as string | undefined;
				const base64Encoded = result.base64Encoded as boolean | undefined;

				let responseBody: string | null = null;
				let bodyBytes = 0;
				if (body) {
					if (base64Encoded) {
						// base64 → raw bytes is length * 3/4 minus padding
						bodyBytes = Math.floor((body.length * 3) / 4);
						responseBody = `[binary data, ${bodyBytes} bytes]`;
					} else {
						bodyBytes = new Blob([body]).size;
						responseBody = body.slice(0, MAX_BODY_SIZE);
					}
				}

				// Cached resources report encodedDataLength: 0 because
				// nothing crossed the wire — fall back to the body size
				// or the Content-Length header so the UI shows something
				// useful instead of "—".
				const size = resolveSize(encodedDataLength, bodyBytes, pending);

				emitEntry(pending, endTime, size, responseBody);
			})
			.catch(() => {
				const size = resolveSize(encodedDataLength, 0, pending);
				emitEntry(pending, endTime, size, null);
			});
	} else if (method === "Network.loadingFailed") {
		const pending = pendingRequests.get(requestId);
		if (!pending) return;

		pendingRequests.delete(requestId);

		// Skip user-/page-canceled requests (e.g. analytics beacons torn down
		// by navigation, AbortController). DevTools hides these too when
		// "Preserve log" is off — emitting them floods the UI with status 0.
		if (params.canceled === true) return;

		const endTime = Date.now();
		const blockedReason = params.blockedReason as string | undefined;
		const errorText = blockedReason
			? `blocked: ${blockedReason}`
			: ((params.errorText as string) ?? "Failed");
		emitEntry(pending, endTime, 0, null, errorText);
	}
}

function emitEntry(
	pending: PendingRequest & {
		status?: number;
		statusText?: string;
		responseHeaders?: Record<string, string>;
		mimeType?: string;
		resourceType?: string;
		cacheSource?: "memory" | "disk" | "prefetch";
	},
	endTime: number,
	encodedDataLength: number,
	responseBody: string | null,
	errorText: string | false = false,
): void {
	if (!eventCallback) return;
	const skipBody = shouldSkipBody(pending);

	eventCallback({
		type: "network",
		timestamp: pending.timestamp,
		data: {
			url: pending.url,
			method: pending.method,
			status: errorText ? 0 : (pending.status ?? 0),
			statusText: errorText || (pending.statusText ?? ""),
			initiatorType: pending.initiatorType,
			resourceType: pending.resourceType,
			cacheSource: pending.cacheSource,
			startTime: pending.timestamp,
			responseEnd: endTime,
			duration: endTime - pending.timestamp,
			requestHeaders: pending.requestHeaders,
			responseHeaders: pending.responseHeaders ?? {},
			requestBody: skipBody ? null : pending.requestBody,
			responseBody: skipBody ? null : responseBody,
			mimeType: pending.mimeType ?? "",
			encodedDataLength,
			cached: pending.cacheSource !== undefined,
		},
	});
}

function resolveSize(
	encodedDataLength: number,
	bodyBytes: number,
	pending: PendingRequest,
): number {
	if (encodedDataLength > 0) return encodedDataLength;
	if (bodyBytes > 0) return bodyBytes;

	const headers =
		(pending as PendingRequest & { responseHeaders?: Record<string, string> })
			.responseHeaders ?? {};
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === "content-length") {
			const parsed = Number.parseInt(value, 10);
			if (Number.isFinite(parsed) && parsed > 0) return parsed;
		}
	}

	return 0;
}

export async function startNetworkCapture(
	tabId: number,
	onEvent: (entry: Omit<NetworkLogEntry, "elapsedMs">) => void,
): Promise<void> {
	activeTabId = tabId;
	eventCallback = onEvent;
	pendingRequests.clear();

	try {
		await dbg.attach({ tabId }, "1.3");
		await dbg.sendCommand({ tabId }, "Network.enable", {
			maxResourceBufferSize: 10 * 1024 * 1024,
			maxTotalBufferSize: 50 * 1024 * 1024,
		});
		dbg.onEvent.addListener(handleDebuggerEvent);
		dbg.onDetach.addListener(handleDebuggerDetach);
	} catch (err) {
		// Surface the precise reason instead of swallowing it — when attach
		// fails the network panel ends up empty with no banner. The two common
		// causes are: (1) DevTools (or another debugger client) is already
		// attached to the tab — Chrome allows only one per tab; close DevTools
		// and re-record. (2) Missing/ungranted host permission for the page
		// (activeTab is NOT sufficient for the debugger API) — set Site access
		// to "On all sites" in chrome://extensions → Ingfo → Details.
		const message = err instanceof Error ? err.message : String(err);
		console.error(
			`[ingfo] Failed to attach debugger (network capture disabled): ${message}. ` +
				"Likely causes: DevTools is open on this tab (close it and re-record), " +
				'or Site access is not "On all sites".',
		);
		activeTabId = null;
		eventCallback = null;
	}
}

export async function stopNetworkCapture(): Promise<void> {
	dbg.onEvent.removeListener(handleDebuggerEvent);
	dbg.onDetach.removeListener(handleDebuggerDetach);

	if (activeTabId !== null) {
		try {
			await dbg.detach({ tabId: activeTabId });
		} catch {
			// Already detached
		}
	}

	activeTabId = null;
	eventCallback = null;
	pendingRequests.clear();
}
