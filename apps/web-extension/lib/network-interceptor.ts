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

		Object.assign(pending, {
			status: response.status as number,
			statusText: (response.statusText as string) ?? "",
			responseHeaders: headers,
			mimeType: (response.mimeType as string) ?? "",
		});
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
				if (body) {
					if (base64Encoded) {
						responseBody = `[binary data, ${encodedDataLength} bytes]`;
					} else {
						responseBody = body.slice(0, MAX_BODY_SIZE);
					}
				}

				emitEntry(pending, endTime, encodedDataLength, responseBody);
			})
			.catch(() => {
				emitEntry(pending, endTime, encodedDataLength, null);
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
			startTime: pending.timestamp,
			responseEnd: endTime,
			duration: endTime - pending.timestamp,
			requestHeaders: pending.requestHeaders,
			responseHeaders: pending.responseHeaders ?? {},
			requestBody: pending.requestBody,
			responseBody,
			mimeType: pending.mimeType ?? "",
			encodedDataLength,
			cached: false,
		},
	});
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
