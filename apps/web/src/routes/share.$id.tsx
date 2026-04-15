import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/share/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/share/$id"!</div>;
}
