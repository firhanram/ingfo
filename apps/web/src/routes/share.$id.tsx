import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { fetchRecording } from "#/features/recording/api/fetch-recording";
import { SharePage } from "#/features/recording/components/share-page";

const getOrigin = createServerFn({ method: "GET" }).handler(() => {
	const req = getRequest();
	const url = new URL(req.url);
	return `${url.protocol}//${url.host}`;
});

export const Route = createFileRoute("/share/$id")({
	loader: async ({ params }) => {
		const [recording, origin] = await Promise.all([
			fetchRecording({ data: params.id }),
			getOrigin(),
		]);
		return {
			...recording,
			ogImageUrl: `${origin}/api/recording/${params.id}/og`,
			shareUrl: `${origin}/share/${params.id}`,
		};
	},
	head: ({ loaderData }) => {
		const { browserInfo, recordingDurationMs, events } =
			loaderData?.metadata ?? {};
		const ogImageUrl = loaderData?.ogImageUrl;
		const shareUrl = loaderData?.shareUrl;
		const title = browserInfo?.title
			? `${browserInfo.title} — Shared on ingfo`
			: "Shared recording — ingfo";
		const durationSec = recordingDurationMs
			? Math.round(recordingDurationMs / 1000)
			: 0;
		const eventCount = events?.length ?? 0;
		const descParts: string[] = [];
		if (browserInfo?.url) descParts.push(browserInfo.url);
		if (durationSec) descParts.push(`${durationSec}s recording`);
		if (eventCount) descParts.push(`${eventCount} events`);
		const description =
			descParts.join(" · ") ||
			"A shared browser recording with network and console events.";

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:type", content: "video.other" },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:site_name", content: "ingfo" },
				...(shareUrl ? [{ property: "og:url", content: shareUrl }] : []),
				...(ogImageUrl
					? [
							{ property: "og:image", content: ogImageUrl },
							{ property: "og:image:width", content: "1200" },
							{ property: "og:image:height", content: "630" },
							{ name: "twitter:image", content: ogImageUrl },
						]
					: []),
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
			],
		};
	},
	component: SharePage,
});
