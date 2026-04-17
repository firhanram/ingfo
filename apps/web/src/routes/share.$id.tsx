import { createFileRoute } from "@tanstack/react-router";
import { fetchRecording } from "#/features/recording/api/fetch-recording.server";
import { SharePage } from "#/features/recording/components/share-page";

export const Route = createFileRoute("/share/$id")({
	loader: ({ params }) => fetchRecording(params.id),
	component: SharePage,
});
