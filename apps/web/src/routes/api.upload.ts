import { createFileRoute } from "@tanstack/react-router";
import {
	UploadError,
	uploadRecording,
} from "#/features/recording/api/create-upload-urls.server";

export const Route = createFileRoute("/api/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const form = await request.formData();
				const recording = form.get("recording");
				const metadata = form.get("metadata");

				if (!(recording instanceof File)) {
					return Response.json(
						{ error: "Missing 'recording' file field" },
						{ status: 400 },
					);
				}
				if (typeof metadata !== "string") {
					return Response.json(
						{ error: "Missing 'metadata' text field" },
						{ status: 400 },
					);
				}

				try {
					JSON.parse(metadata);
				} catch {
					return Response.json(
						{ error: "metadata is not valid JSON" },
						{ status: 400 },
					);
				}

				try {
					const result = await uploadRecording(recording, metadata);
					return Response.json(result);
				} catch (err) {
					if (err instanceof UploadError) {
						return Response.json(
							{ error: err.message },
							{ status: err.status },
						);
					}
					throw err;
				}
			},
		},
	},
});
