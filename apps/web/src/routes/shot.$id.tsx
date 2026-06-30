import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { fetchScreenshot } from "#/features/screenshot/api/fetch-screenshot";
import { ScreenshotSharePage } from "#/features/screenshot/components/screenshot-share-page";

const getOrigin = createServerFn({ method: "GET" }).handler(() => {
	const req = getRequest();
	const url = new URL(req.url);
	return `${url.protocol}//${url.host}`;
});

export const Route = createFileRoute("/shot/$id")({
	loader: async ({ params }) => {
		const [screenshot, origin] = await Promise.all([
			fetchScreenshot({ data: params.id }),
			getOrigin(),
		]);
		return {
			...screenshot,
			shareUrl: `${origin}/shot/${params.id}`,
			imageAbsoluteUrl: `${origin}/api/screenshot/${params.id}/image`,
		};
	},
	head: ({ loaderData }) => {
		const browserInfo = loaderData?.metadata?.browserInfo;
		const shareUrl = loaderData?.shareUrl;
		const imageUrl = loaderData?.imageAbsoluteUrl;
		const title = browserInfo?.title
			? `${browserInfo.title} — Shared on ingfo`
			: "Shared screenshot — ingfo";
		const description = browserInfo?.url
			? `Screenshot of ${browserInfo.url}`
			: "A shared screenshot captured with ingfo.";

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:type", content: "website" },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:site_name", content: "ingfo" },
				...(shareUrl ? [{ property: "og:url", content: shareUrl }] : []),
				...(imageUrl ? [{ property: "og:image", content: imageUrl }] : []),
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				...(imageUrl ? [{ name: "twitter:image", content: imageUrl }] : []),
			],
		};
	},
	component: ScreenshotSharePage,
});
