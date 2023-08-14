import type { OnUseArgument } from "@amadeus-it-group/tansu";
import type { RecordingInfo } from "../common/rpcInterface";
import { noopOnUseArgument } from "../common/asyncSerialDerived";

export const recordAndUpload = (stream: MediaStream, uploadURL: string, set: OnUseArgument<undefined | RecordingInfo>, options?: MediaRecorderOptions) => {
	console.log("start recording!!");
	const recorder = new MediaRecorder(stream, options);
	let promise: Promise<string> = Promise.resolve(uploadURL);
	let offset = 0;
	let index = 0;
	const updateInfo = (updateTime = new Date().toISOString()) => {
		set({
			name: fileName,
			size: offset,
			startTime,
			updateTime,
		});
	};
	recorder.addEventListener("dataavailable", (event) => {
		const currentOffset = offset;
		const currentIndex = index;
		const recordingState = recorder.state;
		const body = event.data;
		offset += body.size;
		index++;
		updateInfo();
		promise = promise.then(async (url) => {
			if (!url) {
				return;
			}
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": recorder.mimeType,
					"X-Recording-Start-Timestamp": startTime,
					"X-Recording-Packet-Offset": `${currentOffset}`,
					"X-Recording-Packet-Index": `${currentIndex}`,
					"X-Recording-State": recordingState,
				},
				body,
			});
			const response = await res.json();
			return response.url;
		});
	});
	const startTime = new Date().toISOString();
	const fileName = `${startTime.replace(/[-:.]/g, "")}.webm`;
	updateInfo(startTime);
	recorder.start(500);
	recorder.requestData();
	return () => {
		console.log("stopping recording");
		recorder.stop();
		set(undefined);
		set = noopOnUseArgument;
	};
};
