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

				return new Response(res.body, {
					headers: {
						"Content-Type":
							res.headers.get("Content-Type") || files.recording.contentType,
						"Content-Length": res.headers.get("Content-Length") || "",
						"Cache-Control": "public, max-age=31536000, immutable",
					},
				});
			},
		},
	},
});
