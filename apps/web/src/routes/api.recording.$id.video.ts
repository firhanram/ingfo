import { createFileRoute } from "@tanstack/react-router";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { r2 } from "#/lib/r2.server";

export const Route = createFileRoute("/api/recording/$id/video")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { keyPrefix, files } = UPLOAD_CONFIG;
				const key = `${keyPrefix}/${params.id}/${files.recording.filename}`;

				const obj = await r2.get(key);
				if (!obj) {
					return new Response("Recording not found", { status: 404 });
				}

				const headers = new Headers();
				headers.set(
					"Content-Type",
					obj.httpMetadata?.contentType ?? files.recording.contentType,
				);
				headers.set("Content-Length", obj.size.toString());
				headers.set("Cache-Control", "public, max-age=31536000, immutable");
				headers.set("Accept-Ranges", "bytes");

				return new Response(obj.body, { headers });
			},
		},
	},
});
