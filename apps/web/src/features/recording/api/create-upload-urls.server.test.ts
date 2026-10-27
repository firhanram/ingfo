// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { r2 } from "#/lib/r2.server";
import { UPLOAD_CONFIG } from "../lib/upload";
import { uploadRecording } from "./create-upload-urls.server";

vi.mock("#/lib/r2.server", () => ({
	r2: { put: vi.fn().mockResolvedValue(undefined) },
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("recording metadata size errors", () => {
	it("reports actual UTF-8 bytes and the allowed limit before writing files", async () => {
		const limit = UPLOAD_CONFIG.files.metadata.maxSizeBytes;
		const metadataJson = `"${"é".repeat(limit / 2)}"`;
		const recording = new File(["video"], "recording.webm");

		expect(metadataJson.length).toBeLessThan(limit);
		await expect(
			uploadRecording(recording, metadataJson),
		).rejects.toMatchObject({
			status: 413,
			message: `Recording metadata is too large: 30.00 MiB (${limit + 2} bytes). Maximum allowed: 30.00 MiB (${limit} bytes). Metadata includes captured network requests and console logs.`,
		});
		expect(r2.put).not.toHaveBeenCalled();
	});

	it("allows metadata exactly at the byte limit", async () => {
		const limit = UPLOAD_CONFIG.files.metadata.maxSizeBytes;
		const metadataJson = `"${"a".repeat(limit - 2)}"`;
		const recording = new File(["video"], "recording.webm");

		await expect(uploadRecording(recording, metadataJson)).resolves.toEqual({
			recordingId: expect.any(String),
		});
		expect(r2.put).toHaveBeenCalledTimes(2);
	});
});
