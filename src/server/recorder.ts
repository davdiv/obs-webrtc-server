import type { IncomingMessage, ServerResponse } from "http";
import type { ServerConfig } from "./config";
import { createId, hashId } from "./utils/createId";
import { resolve, dirname, join } from "path";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import type { WriteStream } from "fs";
import { pipeline } from "stream/promises";

const createPromise = () => {
	let resolve: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { resolve: resolve!, promise };
};

interface AllowedRecording {
	id: string;
	deviceId: string;
	activeRecordings: Set<StartedRecording>;
	resolveFinishedPromise: undefined | (() => void);
	finishedPromise: undefined | Promise<void>;
}

interface StartedRecording {
	id: string;
	filePath: string;
	file: WriteStream;
	packetOffset: number;
	packetIndex: number;
	allowedRecording: AllowedRecording;
}

export const recordingManager = (config: Pick<ServerConfig, "recordPrefix" | "recordingsFolder">, configFilePath: string) => {
	const recordURLs = new Map<string, AllowedRecording | StartedRecording>();
	const recordPrefix = config.recordPrefix!;
	const extractId = (url: string) => {
		if (url.startsWith(recordPrefix)) {
			return url.substring(recordPrefix.length);
		}
		return undefined;
	};

	const recordingsFolder = resolve(dirname(configFilePath), config.recordingsFolder!);
	const handleRequest = async (recording: AllowedRecording | StartedRecording, req: IncomingMessage, res: ServerResponse) => {
		const startTimestamp = req.headers["x-recording-start-timestamp"] as string;
		const packetOffset = +req.headers["x-recording-packet-offset"]!;
		const packetIndex = +req.headers["x-recording-packet-index"]!;
		const contentLength = +req.headers["content-length"]!;
		const end = req.headers["x-recording-state"] !== "recording";
		if ("deviceId" in recording) {
			// begining of the recording
			const deviceShortId = hashId(recording.deviceId);
			const creationTime = new Date(startTimestamp);
			const extension = ".webm";
			const filePath = join(recordingsFolder, deviceShortId, `${creationTime.toISOString().replace(/[-:.]/g, "")}${extension}`);
			console.log("Starting recording of ", filePath);
			const folder = dirname(filePath);
			await mkdir(folder, { recursive: true });
			const file = createWriteStream(filePath);
			const id = createId();
			const allowedRecording = recording;
			recording = { id, file, filePath, packetOffset: 0, packetIndex: 0, allowedRecording };
			allowedRecording.activeRecordings.add(recording);
			recordURLs.set(id, recording);
		}
		/*if (recording.startTimestamp !== startTimestamp) {
			console.log("Unexpected start timestamp index", startTimestamp, recording.nextPacketIndex);
		}*/
		if (recording.packetIndex !== packetIndex) {
			console.log("Unexpected packet index", packetIndex, recording.packetIndex);
		}
		if (recording.packetOffset !== packetOffset) {
			console.log("Unexpected packet offset", packetOffset, recording.packetOffset);
		}
		recording.packetIndex++;
		recording.packetOffset += contentLength;
		if (end) {
			recordURLs.delete(recording.id);
			console.log("Finishing recording of ", recording.filePath);
		}
		await pipeline(req, recording.file, { end });
		recording.file.removeAllListeners(); // workaround for node.js not correctly cleaning the event handlers it added in pipeline
		res.statusCode = 200;
		res.end(
			end
				? "{}"
				: JSON.stringify({
						url: `${recordPrefix}${recording.id}`,
				  }),
		);
		if (end) {
			recording.allowedRecording.activeRecordings.delete(recording);
		}
	};

	const checkRemainingRecordings = (recordingsInfo: AllowedRecording) => {
		if (recordingsInfo.resolveFinishedPromise && recordingsInfo.activeRecordings.size === 0) {
			recordingsInfo.resolveFinishedPromise();
		}
	};

	return {
		createRecordURL(deviceId: string) {
			const recordId = createId();
			recordURLs.set(recordId, {
				id: recordId,
				deviceId,
				activeRecordings: new Set(),
				finishedPromise: undefined,
				resolveFinishedPromise: undefined,
			});
			return `${recordPrefix}${recordId}`;
		},
		deleteRecordURL: async (url: string) => {
			const id = extractId(url);
			if (id) {
				const recordingsInfo = recordURLs.get(id);
				if (recordingsInfo && "deviceId" in recordingsInfo) {
					recordURLs.delete(id);
					const p = createPromise();
					recordingsInfo.resolveFinishedPromise = p.resolve;
					recordingsInfo.finishedPromise = p.promise;
					checkRemainingRecordings(recordingsInfo);
					await p.promise;
				}
			}
		},
		handleRequest(req: IncomingMessage, res: ServerResponse) {
			console.log(req.method, req.url);
			if (req.method === "POST") {
				const id = extractId(req.url!);
				const idInfo = id ? recordURLs.get(id) : undefined;
				if (idInfo) {
					handleRequest(idInfo, req, res);
					return true;
				}
			}
			return false;
		},
	};
};
