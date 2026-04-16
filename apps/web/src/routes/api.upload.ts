import { createFileRoute } from "@tanstack/react-router";
import { generateUploadUrls } from "#/features/recording/api/create-upload-urls.server";

export const Route = createFileRoute("/api/upload")({
	server: {
		handlers: {
			POST: async () => {
				const result = await generateUploadUrls();
				return Response.json(result);
			},
		},
	},
});
