import { refreshStorageFiles } from "./browserStorage";

export const recordInBrowserStorage = (stream: MediaStream, options?: MediaRecorderOptions) => {
	console.log("start recording!!");
	const recorder = new MediaRecorder(stream, options);
	recorder.addEventListener("dataavailable", (event) => {
		const body = event.data;
		const recordingState = recorder.state;
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
	const fileName = `${startTime.replace(/[-:.]/g, "")}.webm`;
	let writableStream: Promise<FileSystemWritableFileStream> = (async () => {
		const directory = await navigator.storage.getDirectory();
		const fileHandle = await directory.getFileHandle(fileName, { create: true });
		return await fileHandle.createWritable({
			keepExistingData: false,
		});
	})();
	recorder.start(10000);
	recorder.requestData();
	return () => {
		console.log("stopping recording");
		recorder.stop();
	};
};
