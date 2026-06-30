import { createFileRoute } from "@tanstack/react-router";
import { SCREENSHOT_UPLOAD_CONFIG } from "#/features/screenshot/lib/upload";
import { r2 } from "#/lib/r2.server";

export const Route = createFileRoute("/api/screenshot/$id/image")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { keyPrefix, files } = SCREENSHOT_UPLOAD_CONFIG;
				const key = `${keyPrefix}/${params.id}/${files.screenshot.filename}`;

				const obj = await r2.get(key);
				if (!obj) {
					return new Response("Screenshot not found", { status: 404 });
				}

				const headers = new Headers();
				headers.set(
					"Content-Type",
					obj.httpMetadata?.contentType ?? files.screenshot.contentType,
				);
				headers.set("Content-Length", obj.size.toString());
				headers.set("Cache-Control", "public, max-age=31536000, immutable");

				return new Response(obj.body, { headers });
			},
		},
	},
});
