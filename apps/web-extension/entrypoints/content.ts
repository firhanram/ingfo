import { createElement } from "react";
import ReactDOM from "react-dom/client";
import { setupConsoleListener } from "@/lib/console-interceptor";
import type { Message } from "@/lib/messages";
import type { RecordingMetadata } from "@/lib/metadata-types";
import { recordingStore } from "@/lib/recording-store";
import { CountdownOverlay } from "./content-ui/CountdownOverlay";
import { PreviewDialog } from "./content-ui/PreviewDialog";
import { RecordingControlBar } from "./content-ui/RecordingControlBar";
import { SelectionOverlay } from "./content-ui/SelectionOverlay";
import styles from "./content-ui/style.css?inline";
import { VideoPreviewDialog } from "./content-ui/VideoPreviewDialog";

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

// Non-modal overlay for floating elements (control bar)
const floatingHostCss = `:host {
	position: fixed !important;
	inset: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	z-index: 2147483647 !important;
	display: block !important;
	overflow: visible !important;
	pointer-events: none !important;
}
:host > * {
	pointer-events: auto !important;
}`;

const floatingCss = `${floatingHostCss}\n${styles}`;

export default defineContentScript({
	matches: ["<all_urls>"],
	cssInjectionMode: "ui",
	main(ctx) {
		// --- Screenshot UIs ---
		let selectionUi: Awaited<ReturnType<typeof createShadowRootUi>> | null =
			null;
		let previewUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

		// --- Recording UIs ---
		let countdownUi: Awaited<ReturnType<typeof createShadowRootUi>> | null =
			null;
		let controlBarUi: Awaited<ReturnType<typeof createShadowRootUi>> | null =
			null;
		let videoPreviewUi: Awaited<ReturnType<typeof createShadowRootUi>> | null =
			null;

		// Track mic state for control bar re-renders
		let micEnabled = false;

		// Console listener cleanup
		let removeConsoleListener: (() => void) | null = null;

		// --- Screenshot mounting ---

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

		// --- Recording mounting ---

		async function mountCountdownOverlay(micOn: boolean) {
			countdownUi?.remove();
			micEnabled = micOn;

			countdownUi = await createShadowRootUi(ctx, {
				name: "ingfo-countdown-overlay",
				position: "modal",
				zIndex: 2147483647,
				css: fullCss,
				onMount(container) {
					const root = ReactDOM.createRoot(container);
					root.render(
						createElement(CountdownOverlay, {
							micEnabled: micOn,
							onComplete() {
								countdownUi?.remove();
								countdownUi = null;

								browser.runtime.sendMessage({
									type: "COUNTDOWN_DONE",
								} satisfies Message);
							},
							onCancel() {
								countdownUi?.remove();
								countdownUi = null;

								browser.runtime.sendMessage({
									type: "COUNTDOWN_CANCELLED",
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

			countdownUi.mount();
		}

		async function mountControlBar() {
			controlBarUi?.remove();
			recordingStore.reset();

			// Mic permission is scoped to the extension origin, not the
			// webpage origin, so content scripts cannot query it directly.
			// Instead, derive permission from whether mic was enabled at
			// recording start — the popup only allows micEnabled=true when
			// permission is already granted.
			const micPermission: PermissionState = micEnabled ? "granted" : "prompt";

			controlBarUi = await createShadowRootUi(ctx, {
				name: "ingfo-recording-control-bar",
				position: "overlay",
				zIndex: 2147483647,
				css: floatingCss,
				onMount(container) {
					const root = ReactDOM.createRoot(container);
					root.render(
						createElement(RecordingControlBar, {
							micEnabled,
							micPermission,
						}),
					);
					return root;
				},
				onRemove(root) {
					root?.unmount();
				},
			});

			controlBarUi.mount();
		}

		async function mountVideoPreview(
			videoDataUrl: string,
			durationMs: number,
			metadata: RecordingMetadata,
		) {
			videoPreviewUi?.remove();

			videoPreviewUi = await createShadowRootUi(ctx, {
				name: "ingfo-video-preview",
				position: "modal",
				zIndex: 2147483647,
				css: fullCss,
				onMount(container) {
					const root = ReactDOM.createRoot(container);
					root.render(
						createElement(VideoPreviewDialog, {
							videoDataUrl,
							durationMs,
							metadata,
							onClose() {
								videoPreviewUi?.remove();
								videoPreviewUi = null;
							},
						}),
					);
					return root;
				},
				onRemove(root) {
					root?.unmount();
				},
			});

			videoPreviewUi.mount();
		}

		// --- Message listener ---

		browser.runtime.onMessage.addListener(
			(message: Message, _sender, sendResponse) => {
				// Screenshot
				if (message.type === "BEGIN_SELECTION") {
					mountSelectionOverlay();
					sendResponse({ ok: true });
				} else if (message.type === "CAPTURE_COMPLETE") {
					mountPreviewDialog(message.imageDataUrl);
					sendResponse({ ok: true });
				}

				// Recording
				else if (message.type === "MIC_UNAVAILABLE") {
					micEnabled = false;
					sendResponse({ ok: true });
				} else if (message.type === "BEGIN_COUNTDOWN") {
					mountCountdownOverlay(message.micEnabled);
					sendResponse({ ok: true });
				} else if (message.type === "RECORDING_STARTED") {
					// Start forwarding console events to background
					removeConsoleListener = setupConsoleListener((msg) => {
						browser.runtime.sendMessage(msg satisfies Message);
					});
					mountControlBar();
					sendResponse({ ok: true });
				} else if (message.type === "RECORDING_TIME_UPDATE") {
					recordingStore.update({
						elapsedMs: message.elapsedMs,
						isPaused: message.isPaused,
					});
					sendResponse({ ok: true });
				} else if (message.type === "RECORDING_COMPLETE") {
					removeConsoleListener?.();
					removeConsoleListener = null;
					controlBarUi?.remove();
					controlBarUi = null;
					mountVideoPreview(
						message.videoDataUrl,
						message.durationMs,
						message.metadata,
					);
					sendResponse({ ok: true });
				} else if (message.type === "RECORDING_CANCELLED") {
					removeConsoleListener?.();
					removeConsoleListener = null;
					countdownUi?.remove();
					countdownUi = null;
					controlBarUi?.remove();
					controlBarUi = null;
					sendResponse({ ok: true });
				}
			},
		);
	},
});
