import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import satori from "satori";
import type { RecordingMetadata } from "#/features/recording/lib/types";
import { UPLOAD_CONFIG } from "#/features/recording/lib/upload";
import { env } from "#/lib/env.server";

const FONT_URL =
	"https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-400-normal.woff";
const FONT_BOLD_URL =
	"https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-700-normal.woff";

let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function loadFonts() {
	if (fontCache) return fontCache;
	const [regularRes, boldRes] = await Promise.all([
		fetch(FONT_URL),
		fetch(FONT_BOLD_URL),
	]);
	if (!regularRes.ok || !boldRes.ok) {
		throw new Error(
			`Failed to load fonts (${regularRes.status}/${boldRes.status})`,
		);
	}
	const [regular, bold] = await Promise.all([
		regularRes.arrayBuffer(),
		boldRes.arrayBuffer(),
	]);
	fontCache = { regular, bold };
	return fontCache;
}

function formatDuration(ms: number) {
	const total = Math.round(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function truncate(str: string, max: number) {
	return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function stripQuery(rawUrl: string) {
	try {
		const u = new URL(rawUrl);
		return `${u.origin}${u.pathname}`.replace(/\/$/, "");
	} catch {
		return rawUrl.split("?")[0].replace(/\/$/, "");
	}
}

export const Route = createFileRoute("/api/recording/$id/og")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { keyPrefix, files } = UPLOAD_CONFIG;
				const base = env.R2_PUBLIC_URL.replace(/\/$/, "");
				const metadataUrl = `${base}/${keyPrefix}/${params.id}/${files.metadata.filename}`;

				const res = await fetch(metadataUrl);
				if (!res.ok) {
					return new Response("Recording not found", { status: 404 });
				}
				const metadata = (await res.json()) as RecordingMetadata;
				const { browserInfo, recordingDurationMs, events } = metadata;

				const networkCount = events.filter((e) => e.type === "network").length;
				const consoleCount = events.filter((e) => e.type === "console").length;

				const fonts = await loadFonts();

				const markup = {
					type: "div",
					props: {
						style: {
							width: "1200px",
							height: "630px",
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
							padding: "72px",
							backgroundColor: "#FFFBF7",
							backgroundImage:
								"radial-gradient(circle at 90% 10%, #FAE0D4 0, transparent 45%), radial-gradient(circle at 0% 100%, #F9ECDF 0, transparent 50%)",
							fontFamily: "Inter",
							color: "#352F29",
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", alignItems: "center", gap: "16px" },
									children: [
										{
											type: "div",
											props: {
												style: {
													width: "44px",
													height: "44px",
													borderRadius: "12px",
													backgroundColor: "#E07A5F",
												},
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "32px",
													fontWeight: 700,
													color: "#4A4239",
												},
												children: "ingfo",
											},
										},
									],
								},
							},
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: "20px",
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													fontSize: "60px",
													fontWeight: 700,
													lineHeight: 1.1,
													color: "#201C18",
												},
												children: truncate(
													browserInfo.title || "Shared recording",
													70,
												),
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "28px",
													color: "#7A6F64",
												},
												children: truncate(
													stripQuery(browserInfo.url || ""),
													80,
												),
											},
										},
									],
								},
							},
							{
								type: "div",
								props: {
									style: { display: "flex", gap: "16px" },
									children: [
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													padding: "14px 22px",
													borderRadius: "999px",
													backgroundColor: "#FFF6EE",
													border: "1px solid #E5E0DA",
													fontSize: "26px",
													color: "#4A4239",
													fontWeight: 600,
												},
												children: formatDuration(recordingDurationMs),
											},
										},
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													padding: "14px 22px",
													borderRadius: "999px",
													backgroundColor: "#FFF6EE",
													border: "1px solid #E5E0DA",
													fontSize: "26px",
													color: "#4A4239",
													fontWeight: 600,
												},
												children: `${networkCount} network`,
											},
										},
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													padding: "14px 22px",
													borderRadius: "999px",
													backgroundColor: "#FFF6EE",
													border: "1px solid #E5E0DA",
													fontSize: "26px",
													color: "#4A4239",
													fontWeight: 600,
												},
												children: `${consoleCount} console`,
											},
										},
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													padding: "14px 22px",
													borderRadius: "999px",
													backgroundColor: "#FFF6EE",
													border: "1px solid #E5E0DA",
													fontSize: "26px",
													color: "#4A4239",
													fontWeight: 600,
												},
												children: browserInfo.browserName || "Browser",
											},
										},
									],
								},
							},
						],
					},
				};

				const svg = await satori(markup as never, {
					width: 1200,
					height: 630,
					fonts: [
						{
							name: "Inter",
							data: fonts.regular,
							weight: 400,
							style: "normal",
						},
						{ name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
					],
				});

				const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
					.render()
					.asPng();

				return new Response(new Uint8Array(png), {
					headers: {
						"Content-Type": "image/png",
						"Cache-Control": "public, max-age=3600, s-maxage=86400",
					},
				});
			},
		},
	},
});
