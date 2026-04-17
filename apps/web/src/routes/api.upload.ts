import { createFileRoute } from "@tanstack/react-router";
import {
	UploadError,
	uploadRecording,
} from "#/features/recording/api/create-upload-urls.server";

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

export const Route = createFileRoute("/api/upload")({
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
				const recording = form.get("recording");
				const metadata = form.get("metadata");

				if (!(recording instanceof File)) {
					return jsonWithCors(
						{ error: "Missing 'recording' file field" },
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
					const result = await uploadRecording(recording, metadata);
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
