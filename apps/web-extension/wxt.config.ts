import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Ingfo",
		permissions: [
			"activeTab",
			"tabs",
			"scripting",
			"tabCapture",
			"desktopCapture",
			"offscreen",
			"storage",
			"audioCapture",
			"debugger",
		],
		// Broad host access is required so chrome.debugger can attach to any
		// recorded tab for network capture. The `debugger` API is not covered
		// by `activeTab`, so without real host_permissions the attach is
		// rejected in production (WXT only auto-injects <all_urls> in dev).
		host_permissions: [
			"http://*/*",
			"https://*/*",
			...(import.meta.env.WXT_API_BASE_URL
				? [`${import.meta.env.WXT_API_BASE_URL}/*`]
				: []),
		],
		web_accessible_resources: [
			{
				resources: ["video-preview.html"],
				matches: ["<all_urls>"],
			},
		],
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	dev: {
		server: {
			port: 5434,
		},
	},
});
