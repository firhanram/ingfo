import { createFileRoute } from "@tanstack/react-router";
import { uploadScreenshot } from "#/features/screenshot/api/upload-screenshot.server";
import { UploadError } from "#/lib/upload-error";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function jsonWithCors(data: unknown, init?: { status?: number }): Response {
	const res = Response.json(data, init);
	for (const [key, value] of Object.entries(corsHeaders)) {
		res.headers.set(key, value);
	}
	return res;
}

export const Route = createFileRoute("/api/screenshot/upload")({
	server: {
		handlers: {
			OPTIONS: () => {
				return new Response(null, {
					status: 204,
					headers: corsHeaders,
				});
			},
			POST: async ({ request }) => {
				const form = await request.formData();
				const screenshot = form.get("screenshot");
				const metadata = form.get("metadata");

				if (!(screenshot instanceof File)) {
					return jsonWithCors(
						{ error: "Missing 'screenshot' file field" },
						{ status: 400 },
					);
				}
				if (typeof metadata !== "string") {
					return jsonWithCors(
						{ error: "Missing 'metadata' text field" },
						{ status: 400 },
					);
				}

				try {
					JSON.parse(metadata);
				} catch {
					return jsonWithCors(
						{ error: "metadata is not valid JSON" },
						{ status: 400 },
					);
				}

				try {
					const result = await uploadScreenshot(screenshot, metadata);
					return jsonWithCors(result);
				} catch (err) {
					if (err instanceof UploadError) {
						return jsonWithCors({ error: err.message }, { status: err.status });
					}
					throw err;
				}
			},
		},
	},
});
