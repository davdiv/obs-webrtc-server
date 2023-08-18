import { createWriteStream } from "fs";
import { dirname, resolve } from "path";
import type { ServerConfig } from "./config";

export const createLogger = (config: Pick<ServerConfig, "log">, configFilePath: string) => {
	if (!config.log) return () => {};
	const filePath = resolve(dirname(configFilePath), config.log!);
	const file = createWriteStream(filePath, {
		flags: "a",
	});

	const addEntry = (entry: any) => {
		const time = new Date().toISOString();
		file.write(`${JSON.stringify({ time, ...entry })}\n`);
	};

	addEntry({ type: "app-start" });

	return addEntry;
};
