import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

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
});
