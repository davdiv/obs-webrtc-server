export const record = (stream: MediaStream, uploadURL: string, options?: MediaRecorderOptions) => {
	console.log("start recording!!");
	const recorder = new MediaRecorder(stream, options);
	let promise: Promise<string> = Promise.resolve(uploadURL);
	let offset = 0;
	let index = 0;
	recorder.addEventListener("dataavailable", (event) => {
		const currentOffset = offset;
		const currentIndex = index;
		const recordingState = recorder.state;
		const body = event.data;
		offset += body.size;
		index++;
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
	recorder.start(10000);
	recorder.requestData();
	return () => {
		console.log("stopping recording");
		recorder.stop();
	};
};
