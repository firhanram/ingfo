import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		permissions: [
			"activeTab",
			"tabs",
			"scripting",
			"tabCapture",
			"desktopCapture",
			"offscreen",
			"storage",
			"audioCapture",
		],
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
