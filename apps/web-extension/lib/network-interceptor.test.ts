import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const debuggerApi = {
	attach: vi.fn().mockResolvedValue(undefined),
	detach: vi.fn().mockResolvedValue(undefined),
	sendCommand: vi.fn(),
	onEvent: { addListener: vi.fn(), removeListener: vi.fn() },
	onDetach: { addListener: vi.fn(), removeListener: vi.fn() },
};

async function startCapture() {
	vi.stubGlobal("chrome", { debugger: debuggerApi });
	const { startNetworkCapture } = await import("./network-interceptor");
	const onEntry = vi.fn();
	await startNetworkCapture(1, onEntry);
	const handleEvent = debuggerApi.onEvent.addListener.mock.calls[0][0] as (
		source: { tabId: number },
		method: string,
		params: Record<string, unknown>,
	) => void;
	return {
		onEntry,
		emit(method: string, params: Record<string, unknown> = {}) {
			handleEvent({ tabId: 1 }, `Network.${method}`, {
				requestId: "request-1",
				...params,
			});
		},
	};
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	debuggerApi.sendCommand.mockResolvedValue({ body: '{"ok":true}' });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("static resource body capture", () => {
	it.each([
		"Script",
		"Stylesheet",
	])("omits %s bodies without fetching them, but preserves request metadata", async (type) => {
		const { emit, onEntry } = await startCapture();
		emit("requestWillBeSent", {
			type,
			request: {
				url: "https://example.com/resource",
				method: "POST",
				postData: "request body",
				headers: { Accept: "*/*" },
			},
		});
		emit("responseReceived", {
			type,
			response: {
				status: 200,
				statusText: "OK",
				mimeType: "text/plain",
				headers: { "Content-Length": "1234" },
			},
		});
		emit("loadingFinished", { encodedDataLength: 1234 });

		expect(debuggerApi.sendCommand).toHaveBeenCalledTimes(1);
		expect(onEntry).toHaveBeenCalledOnce();
		expect(onEntry.mock.calls[0][0].data).toMatchObject({
			url: "https://example.com/resource",
			method: "POST",
			status: 200,
			statusText: "OK",
			resourceType: type,
			requestHeaders: { Accept: "*/*" },
			responseHeaders: { "Content-Length": "1234" },
			requestBody: null,
			responseBody: null,
			encodedDataLength: 1234,
			duration: expect.any(Number),
		});
	});

	it.each([
		"text/css; charset=utf-8",
		"application/javascript",
	])("uses MIME fallback for %s and retains cached size from headers", async (mimeType) => {
		const { emit, onEntry } = await startCapture();
		emit("requestWillBeSent", {
			request: {
				url: "https://example.com/resource",
				postData: "discard this",
			},
		});
		emit("responseReceived", {
			response: {
				status: 200,
				mimeType,
				fromDiskCache: true,
				headers: { "content-length": "4321" },
			},
		});
		emit("loadingFinished", { encodedDataLength: 0 });

		expect(debuggerApi.sendCommand).toHaveBeenCalledTimes(1);
		expect(onEntry.mock.calls[0][0].data).toMatchObject({
			requestBody: null,
			responseBody: null,
			encodedDataLength: 4321,
			cached: true,
			cacheSource: "disk",
		});
	});

	it.each([
		["Fetch", "application/javascript"],
		["XHR", "text/css"],
		["Fetch", "application/json"],
		["Document", "text/html"],
	])("preserves %s bodies returned as %s", async (type, mimeType) => {
		const { emit, onEntry } = await startCapture();
		emit("requestWillBeSent", {
			type,
			request: {
				url: "https://example.com/resource",
				postData: "keep this",
			},
		});
		emit("responseReceived", {
			type,
			response: { status: 200, mimeType },
		});
		emit("loadingFinished", { encodedDataLength: 100 });

		await vi.waitFor(() => expect(onEntry).toHaveBeenCalledOnce());
		expect(debuggerApi.sendCommand).toHaveBeenCalledWith(
			{ tabId: 1 },
			"Network.getResponseBody",
			{ requestId: "request-1" },
		);
		expect(onEntry.mock.calls[0][0].data).toMatchObject({
			requestBody: "keep this",
			responseBody: '{"ok":true}',
		});
	});

	it("still emits failed static requests without bodies", async () => {
		const { emit, onEntry } = await startCapture();
		emit("requestWillBeSent", {
			type: "Script",
			request: {
				url: "https://example.com/app.js",
				postData: "discard this",
			},
		});
		emit("loadingFailed", { errorText: "net::ERR_FAILED" });

		expect(onEntry.mock.calls[0][0].data).toMatchObject({
			status: 0,
			statusText: "net::ERR_FAILED",
			resourceType: "Script",
			requestBody: null,
			responseBody: null,
		});
	});
});
