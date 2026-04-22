import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
	server: {
		port: 5433,
	},
	optimizeDeps: {
		exclude: ["@resvg/resvg-js"],
	},
	ssr: {
		external: ["@resvg/resvg-js"],
	},
});

export default config;
