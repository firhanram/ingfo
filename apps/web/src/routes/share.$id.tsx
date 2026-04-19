import { createFileRoute } from "@tanstack/react-router";
import { fetchRecording } from "#/features/recording/api/fetch-recording";
import { SharePage } from "#/features/recording/components/share-page";

export const Route = createFileRoute("/share/$id")({
	loader: ({ params }) => fetchRecording({ data: params.id }),
	component: SharePage,
});
