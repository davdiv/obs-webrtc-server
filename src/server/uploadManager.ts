import type { IncomingMessage, ServerResponse } from "http";
import type { ServerConfig } from "./config";
import { resolve, dirname, join } from "path";
import { mkdir } from "fs/promises";
import { createId } from "./utils/createId";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { immerWritable } from "../common/immerWritable";
import equal from "fast-deep-equal";
import type { ServerFileInfo } from "../common/rpcInterface";

export interface FileInfo {
	emitterShortId: string;
	fileName: string;
	startByte: number;
	fileKey: string;
	id: string;
	stream?: ReturnType<typeof createWriteStream>;
	res?: ServerResponse;
}

export const createUploadManager = (config: Pick<ServerConfig, "recordPrefix" | "recordingsFolder">, configFilePath: string) => {
	const receivedFiles$ = immerWritable({} as Record<string, ServerFileInfo>, { equal });
	const recordURLs = new Map<string, FileInfo>();
	const openFiles = new Map<string, FileInfo>();
	const recordPrefix = config.recordPrefix!;
	const extractId = (url: string) => {
		if (url.startsWith(recordPrefix)) {
			return url.substring(recordPrefix.length);
		}
		return undefined;
	};

	const stopUpload = (fileKey: string) => {
		const existingOpenFile = openFiles.get(fileKey);
		if (existingOpenFile) {
			recordURLs.delete(existingOpenFile.id);
			openFiles.delete(fileKey);
			if (existingOpenFile.res) {
				existingOpenFile.res.statusCode = 500;
				existingOpenFile.res.end(JSON.stringify({}));
			}
			existingOpenFile.stream?.close();
		}
	};

	const recordingsFolder = resolve(dirname(configFilePath), config.recordingsFolder!);

	const handleRequest = async (fileInfo: FileInfo, req: IncomingMessage, res: ServerResponse) => {
		try {
			const fullFileName = join(recordingsFolder, fileInfo.emitterShortId, fileInfo.fileName);
			await mkdir(dirname(fullFileName), { recursive: true });
			if (openFiles.get(fileInfo.fileKey) !== fileInfo) return;
			const stream = createWriteStream(fullFileName, { start: fileInfo.startByte, flags: fileInfo.startByte === 0 ? "w" : "r+" });
			fileInfo.stream = stream;
			fileInfo.res = res;
			const update = () => {
				const newFile = openFiles.get(fileInfo.fileKey);
				if (newFile?.stream && newFile !== fileInfo) return;
				receivedFiles$.update((receivedFiles) => {
					receivedFiles[fileInfo.fileKey] = {
						size: fileInfo.startByte + stream.bytesWritten,
						open: !stream.closed,
					};
					return receivedFiles;
				});
			};
			req.on("data", update);
			stream.on("close", update);
			update();
			await pipeline(req, stream);
			update();
			res.statusCode = 200;
			res.end(JSON.stringify({}));
		} catch (error) {
			console.log(error);
			res.statusCode = 500;
			res.end(JSON.stringify({}));
		} finally {
			if (openFiles.get(fileInfo.fileKey) === fileInfo) {
				openFiles.delete(fileInfo.fileKey);
			}
		}
	};

	return {
		receivedFiles$,
		createUploadURL(info: Pick<FileInfo, "emitterShortId" | "startByte" | "fileName">) {
			const fileKey = `${info.emitterShortId}/${info.fileName}`;
			stopUpload(fileKey);
			const id = createId();
			const fileInfo = { ...info, id, stream: undefined, fileKey };
			recordURLs.set(id, fileInfo);
			openFiles.set(fileKey, fileInfo);
			return `${recordPrefix}${id}`;
		},
		stopUpload,
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
