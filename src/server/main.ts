import { resolve } from "path";
import { waitAbortSignal } from "../common/abortUtils";
import { createServer } from "./server";
import { openConfigFile } from "./openConfig";

const cli = async () => {
	const args = process.argv.slice(2);
	if (args.includes("--help") || args.length > 1) {
		console.log(`Usage: obs-webrtc-server [configFile.yaml]\nIf the configuration file does not exist, it is created.`);
		return;
	}
	const configFilePath = resolve(args[0] || "obs-webrtc-server.yaml");
	const configFileContent = await openConfigFile(configFilePath);
	const abortController = new AbortController();
	const exit = () => abortController.abort();
	process.on("SIGTERM", exit);
	process.on("SIGINT", exit);
	process.on("SIGHUP", exit);
	await createServer(configFileContent, configFilePath);
	await waitAbortSignal(abortController.signal);
	process.exit();
};

cli();
