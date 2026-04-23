import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		cloudflare({
			viteEnvironment: {
				name: "ssr",
			},
		}),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	server: {
		port: 5433,
		host: true,
		allowedHosts: ["ingfo.local"],
	},
	optimizeDeps: {
		exclude: ["@resvg/resvg-js"],
	},
	ssr: {
		external: ["@resvg/resvg-js"],
	},
});

export default config;
