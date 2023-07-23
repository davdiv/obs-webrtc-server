import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { version } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		middlewareMode: true,
	},
	build: {
		outDir: "./dist/public",
		emptyOutDir: true,
	},
	plugins: [svelte()],
	define: {
		"import.meta.env.VERSION": JSON.stringify(version),
	},
});
