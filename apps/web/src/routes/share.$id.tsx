import { createFileRoute } from "@tanstack/react-router";
import { SharePage } from "#/features/recording/components/share-page";

export const Route = createFileRoute("/share/$id")({
	component: SharePage,
});
