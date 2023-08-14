import type { OnUseArgument } from "@amadeus-it-group/tansu";
import type { RecordingInfo } from "../../common/rpcInterface";
import { refreshStorageFiles } from "./browserStorage";
import { noopOnUseArgument } from "../../common/asyncSerialDerived";

export const recordInBrowserStorage = (stream: MediaStream, set: OnUseArgument<undefined | RecordingInfo>, options?: MediaRecorderOptions) => {
	console.log("start recording!!");
	const recorder = new MediaRecorder(stream, options);
	recorder.addEventListener("dataavailable", (event) => {
		const body = event.data;
		const recordingState = recorder.state;
		size += body.size;
		updateInfo();
		writableStream = writableStream.then(async (stream) => {
			await stream.write(body);
			if (recordingState !== "recording") {
				await stream.close();
			}
			refreshStorageFiles();
			return stream;
		});
	});
	const startTime = new Date().toISOString();
	let size = 0;
	const updateInfo = (updateTime = new Date().toISOString()) => {
		set({
			name: fileName,
			size,
			startTime,
			updateTime,
		});
	};
	const fileName = `${startTime.replace(/[-:.]/g, "")}.webm`;
	let writableStream: Promise<FileSystemWritableFileStream> = (async () => {
		const directory = await navigator.storage.getDirectory();
		const fileHandle = await directory.getFileHandle(fileName, { create: true });
		return await fileHandle.createWritable({
			keepExistingData: false,
		});
	})();
	recorder.start(500);
	updateInfo(startTime);
	recorder.requestData();
	return () => {
		console.log("stopping recording");
		recorder.stop();
		set(undefined);
		set = noopOnUseArgument;
	};
};
