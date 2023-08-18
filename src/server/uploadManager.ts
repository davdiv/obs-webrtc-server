import type { IncomingMessage, ServerResponse } from "http";
import type { ServerConfig } from "./config";
import { resolve, dirname, join } from "path";
import { mkdir } from "fs/promises";
import { createId } from "./utils/createId";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { immerWritable } from "../common/immerWritable";
import equal from "fast-deep-equal";

export interface FileInfo {
	emitterShortId: string;
	fileName: string;
}

export const createUploadManager = (config: Pick<ServerConfig, "recordPrefix" | "recordingsFolder">, configFilePath: string) => {
	const receivedFiles$ = immerWritable({} as Record<string, number>, { equal });
	const recordURLs = new Map<string, FileInfo>();
	const recordPrefix = config.recordPrefix!;
	const extractId = (url: string) => {
		if (url.startsWith(recordPrefix)) {
			return url.substring(recordPrefix.length);
		}
		return undefined;
	};

	const recordingsFolder = resolve(dirname(configFilePath), config.recordingsFolder!);

	const handleRequest = async (fileInfo: FileInfo, req: IncomingMessage, res: ServerResponse) => {
		try {
			const fullFileName = join(recordingsFolder, fileInfo.emitterShortId, fileInfo.fileName);
			await mkdir(dirname(fullFileName), { recursive: true });
			const stream = createWriteStream(fullFileName);
			const update = () =>
				receivedFiles$.update((receivedFiles) => {
					receivedFiles[`${fileInfo.emitterShortId}/${fileInfo.fileName}`] = stream.bytesWritten;
					return receivedFiles;
				});
			update();
			req.on("data", update);
			await pipeline(req, stream);
			update();
			res.statusCode = 200;
			res.end(JSON.stringify({}));
		} catch (error) {
			console.log(error);
			res.statusCode = 500;
			res.end(JSON.stringify({}));
		}
	};

	return {
		receivedFiles$,
		createUploadURL(info: FileInfo) {
			const id = createId();
			recordURLs.set(id, info);
			return `${recordPrefix}${id}`;
		},
		handleRequest(req: IncomingMessage, res: ServerResponse) {
			console.log(req.method, req.url);
			if (req.method === "PUT") {
				const id = extractId(req.url!);
				const idInfo = id ? recordURLs.get(id) : undefined;
				if (idInfo) {
					recordURLs.delete(id!);
					handleRequest(idInfo, req, res);
					return true;
				}
			}
			return false;
		},
	};
};
