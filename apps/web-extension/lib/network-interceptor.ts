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
	cacheSource?: "memory" | "disk" | "prefetch";
}

const pendingRequests = new Map<string, PendingRequest>();
let activeTabId: number | null = null;
let eventCallback:
	| ((entry: Omit<NetworkLogEntry, "elapsedMs">) => void)
	| null = null;

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

		pendingRequests.set(requestId, {
			url: request.url as string,
			method: (request.method as string) ?? "GET",
			requestHeaders: headers,
			requestBody: postData ? postData.slice(0, MAX_BODY_SIZE) : null,
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
			resourceType: (params.type as string) ?? undefined,
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
		const endTime = Date.now();

		const errorText = (params.errorText as string) ?? "Failed";
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
			requestBody: pending.requestBody,
			responseBody,
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
	} catch (err) {
		console.error("[ingfo] Failed to attach debugger:", err);
		activeTabId = null;
		eventCallback = null;
	}
}

export async function stopNetworkCapture(): Promise<void> {
	dbg.onEvent.removeListener(handleDebuggerEvent);

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
