import { createElement } from "react";
import ReactDOM from "react-dom/client";
import type { Message } from "@/lib/messages";
import { PreviewDialog } from "./content-ui/PreviewDialog";
import { SelectionOverlay } from "./content-ui/SelectionOverlay";
import styles from "./content-ui/style.css?inline";

const hostOverrideCss = `:host {
	position: fixed !important;
	inset: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	z-index: 2147483647 !important;
	display: block !important;
	overflow: visible !important;
}`;

const fullCss = `${hostOverrideCss}\n${styles}`;

export default defineContentScript({
	matches: ["<all_urls>"],
	cssInjectionMode: "ui",
	main(ctx) {
		let selectionUi: Awaited<ReturnType<typeof createShadowRootUi>> | null =
			null;
		let previewUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

		async function mountSelectionOverlay() {
			selectionUi?.remove();

			selectionUi = await createShadowRootUi(ctx, {
				name: "ingfo-selection-overlay",
				position: "modal",
				zIndex: 2147483647,
				css: fullCss,
				onMount(container) {
					const root = ReactDOM.createRoot(container);
					root.render(
						createElement(SelectionOverlay, {
							onSelectionComplete(region) {
								selectionUi?.remove();
								selectionUi = null;

								browser.runtime.sendMessage({
									type: "SELECTION_RESULT",
									region,
									devicePixelRatio: window.devicePixelRatio,
								} satisfies Message);
							},
							onCancel() {
								selectionUi?.remove();
								selectionUi = null;

								browser.runtime.sendMessage({
									type: "CANCEL_CAPTURE",
								} satisfies Message);
							},
						}),
					);
					return root;
				},
				onRemove(root) {
					root?.unmount();
				},
			});

			selectionUi.mount();
		}

		async function mountPreviewDialog(imageDataUrl: string) {
			previewUi?.remove();

			previewUi = await createShadowRootUi(ctx, {
				name: "ingfo-preview-dialog",
				position: "modal",
				zIndex: 2147483647,
				css: fullCss,
				onMount(container) {
					const root = ReactDOM.createRoot(container);
					root.render(
						createElement(PreviewDialog, {
							imageDataUrl,
							onClose() {
								previewUi?.remove();
								previewUi = null;
							},
						}),
					);
					return root;
				},
				onRemove(root) {
					root?.unmount();
				},
			});

			previewUi.mount();
		}

		browser.runtime.onMessage.addListener(
			(message: Message, _sender, sendResponse) => {
				if (message.type === "BEGIN_SELECTION") {
					mountSelectionOverlay();
					sendResponse({ ok: true });
				} else if (message.type === "CAPTURE_COMPLETE") {
					mountPreviewDialog(message.imageDataUrl);
					sendResponse({ ok: true });
				}
			},
		);
	},
});
