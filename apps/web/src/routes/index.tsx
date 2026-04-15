import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-surface dark:bg-surface-dark">
			<h1 className="text-3xl font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
				Hello World
			</h1>
		</main>
	);
}
