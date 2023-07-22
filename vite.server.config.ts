import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone";
import { chmod, cp, readFile, stat, writeFile } from "fs/promises";
import { builtinModules } from "module";
import { resolve } from "path";
import tjs from "typescript-json-schema";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { version } from "./package.json";

const validatorFile = fileURLToPath(new URL("./src/server/validator.ts", import.meta.url));
const configFile = fileURLToPath(new URL("./src/server/config.ts", import.meta.url));
let serverConfigSchema = "";

export default defineConfig(async () => ({
	resolve: {
		browserField: false,
		alias: {
			ws: fileURLToPath(new URL("./node_modules/ws/wrapper.mjs", import.meta.url)),
		},
	},
	define: {
		"process.env.WS_NO_BUFFER_UTIL": "true",
		"import.meta.env.VERSION": JSON.stringify(version),
	},
	build: {
		emptyOutDir: false,
		target: "node20",
		outDir: "./dist",
		rollupOptions: {
			external: [...builtinModules, "vite"],
			output: {
				banner: (chunk) => (chunk.isEntry ? "#!/usr/bin/env node\n" : ""),
			},
		},
		lib: {
			entry: {
				"obs-webrtc-server": "src/server/main.ts",
			},
			fileName: (format, entryName) => entryName,
			formats: ["cjs"],
		},
	},
	plugins: [
		{
			name: "schema",
			enforce: "pre",
			resolveId(id, source) {
				if (source && resolve(source, "..", id) + ".ts" === validatorFile) {
					return { id: validatorFile, external: false };
				}
			},
			async load(id) {
				if (id === validatorFile) {
					const program = tjs.programFromConfig(fileURLToPath(new URL("./tsconfig.json", import.meta.url)), [configFile]);
					const schema = tjs.generateSchema(program, "ServerConfig", { noExtraProps: true, required: true });
					serverConfigSchema = JSON.stringify(schema);
					const ajv = new Ajv({ code: { source: true, esm: true } });
					const validate = ajv.compile(schema!);
					const moduleCode = standaloneCode(ajv, validate);
					return moduleCode;
				}
			},
			async closeBundle() {
				await writeFile(new URL("./dist/schema.json", import.meta.url), serverConfigSchema);
			},
		},
		{
			name: "files",
			async closeBundle() {
				console.log("Copying files...");
				await cp(new URL("./README.md", import.meta.url), new URL("./dist/README.md", import.meta.url));
				await cp(new URL("./LICENSE", import.meta.url), new URL("./dist/LICENSE", import.meta.url));
				const pkgJson = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
				delete pkgJson.devDependencies;
				delete pkgJson.scripts;
				delete pkgJson.private;
				delete pkgJson.packageManager;
				delete pkgJson.type;
				const binFile = new URL(`./dist/obs-webrtc-server`, import.meta.url);
				const fileInfo = await stat(binFile);
				await chmod(binFile, fileInfo.mode | ((fileInfo.mode & 0o444) >> 2)); // chmod +x
				await writeFile(new URL("./dist/package.json", import.meta.url), JSON.stringify(pkgJson));
				console.log("Finished copying files!");
			},
		},
	],
}));
