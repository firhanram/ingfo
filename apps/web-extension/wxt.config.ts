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
		host_permissions: [
			"http://localhost:5433/*",
			import.meta.env.WXT_API_BASE_URL,
			// TODO: add production web app URL once set
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
