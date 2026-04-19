import { createFileRoute } from "@tanstack/react-router";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { env } from "#/lib/env.server";

export const Route = createFileRoute("/api/recording/$id/video")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { keyPrefix, files } = UPLOAD_CONFIG;
				const base = env.R2_PUBLIC_URL.replace(/\/$/, "");
				const url = `${base}/${keyPrefix}/${params.id}/${files.recording.filename}`;

				const res = await fetch(url);
				if (!res.ok) {
					return new Response("Recording not found", { status: 404 });
				}

				const headers: Record<string, string> = {
					"Content-Type":
						res.headers.get("Content-Type") || files.recording.contentType,
					"Cache-Control": "public, max-age=31536000, immutable",
				};
				const contentLength = res.headers.get("Content-Length");
				if (contentLength) headers["Content-Length"] = contentLength;
				const acceptRanges = res.headers.get("Accept-Ranges");
				if (acceptRanges) headers["Accept-Ranges"] = acceptRanges;

				return new Response(res.body, { headers });
			},
		},
	},
});
