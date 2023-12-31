import type { OnUseArgument, ReadableSignal } from "@amadeus-it-group/tansu";
import { asReadable, computed, derived, readable, writable } from "@amadeus-it-group/tansu";
import fastDeepEqual from "fast-deep-equal";
import { checkAbortSignal, waitAbortSignal } from "../common/abortUtils";
import { asyncSerialDerived } from "../common/asyncSerialDerived";
import type { CallMethod, RemoteInterfaceImpl } from "../common/jsonRpc";
import type { ClientSentEmitterInfo, ClientSentInfo, ClientSentReceiverInfo, RecordingInfo, Resolution, RpcClientInterface, RpcServerInterface, ServerSentInfo } from "../common/rpcInterface";
import { addCaptureTimeToRTCConnection, addCaptureTimeToSdp } from "./absoluteCaptureTime";
import { batteryInfo$ } from "./battery/battery";
import type { StreamConfig } from "./mediaDevices";
import { deriveStream, mediaDevices$ } from "./mediaDevices";
import { recordAndUpload } from "./recordUpload";
import { createRtcStatsModel } from "./rtcStats";
import { browserStorageFilesInfo$, removeFileByName, storageInfo$, uploadFile } from "./storage/browserStorage";
import { recordInBrowserStorage } from "./storage/recordInBrowserStorage";
import { websocketJsonRpc } from "./websocketJsonRpc";

const obsSourceActive$ = writable(false);
if (window.obsstudio) {
	addEventListener("obsSourceActiveChanged", (event) => {
		obsSourceActive$.set((event as any).detail.active);
	});
} else {
	window.obsstudio = {
		setObsSourceActive(value: boolean) {
			obsSourceActive$.set(value);
		},
	} as any;
}

const viewportSize$ = readable({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }, (set) => {
	const update = () => {
		set({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });
	};
	window.addEventListener("resize", update);
	return () => {
		window.removeEventListener("resize", update);
	};
});

const computeDelay = (captureDelay: number | undefined, timestampDiff: number | undefined, roundTripTime: number | undefined) =>
	captureDelay != null && timestampDiff != null && roundTripTime != null ? captureDelay - timestampDiff + roundTripTime / 2 : undefined;

export const createModel = () => {
	const url = new URL(window.location.href);
	url.protocol = url.protocol.replace(/^http/i, "ws");
	url.hash = "";

	const data$ = computed(() => socketApi$()?.data$());
	const mode$ = computed(() => data$()?.mode);
	const emitterData$ = computed(() => {
		const data = data$();
		return data?.mode === "emitter" ? data : undefined;
	});
	const receiverData$ = computed(() => {
		const data = data$();
		return data?.mode === "receiver" ? data : undefined;
	});
	const adminData$ = computed(() => {
		const data = data$();
		return data?.mode === "admin" ? data : undefined;
	});
	const clientSentInfo$ = computed((): ClientSentInfo => {
		const mode = mode$();
		if (mode === "emitter") {
			return {
				streamInfo: emitterStreamInfo$(),
				roundTripTime: rtcStats.roundTripTime$(),
				videoResolution: emitterStreamResolution$(),
				storageInfo: storageInfo$(),
				batteryInfo: batteryInfo$(),
				recording: recordEmitterStreamAction$(),
				files: browserStorageFilesInfo$(),
				mediaDevices: mediaDevices$(),
				streamConfig: emitterStreamConfig$() ?? undefined,
			} satisfies ClientSentEmitterInfo;
		} else if (mode === "receiver") {
			return {
				audioDelay: audioDelay.measuredDelay$(),
				videoDelay: videoDelay.measuredDelay$(),
				obsActive: obsSourceActive$(),
				recording: recordReceiverStreamAction$(),
				videoResolution: receiverStreamResolution$(),
				viewport: viewportSize$(),
			} satisfies ClientSentReceiverInfo;
		}
	});
	const roundTripTime$ = computed(() => receiverData$()?.roundTripTime);
	const targetDelay$ = computed(() => receiverData$()?.targetDelay);

	const needNewSocket$ = writable({} as null | object);
	const socketApi$ = asyncSerialDerived(needNewSocket$, {
		async derive(object, set: OnUseArgument<CallMethod<RpcServerInterface, ServerSentInfo> | undefined>, abortSignal) {
			if (!object) {
				return;
			}
			const socket = new WebSocket(url.href, ["obs-webrtc-server"]);
			socket.addEventListener("close", (event) => {
				if (abortSignal.aborted) return;
				if (event.code === 3001) {
					// do not reconnect
					needNewSocket$.set(null);
				} else {
					needNewSocket$.set({});
				}
			});
			set(undefined);
			try {
				const abortedPromise = waitAbortSignal(abortSignal);
				const openPromise = new Promise((resolve) => socket.addEventListener("open", resolve));
				await Promise.race([abortedPromise, openPromise]);
				checkAbortSignal(abortSignal);
				set(websocketJsonRpc<RpcServerInterface, RpcClientInterface, ServerSentInfo, ClientSentInfo>(socket, rpcApi, clientSentInfo$));
				await abortedPromise;
			} finally {
				set(undefined);
				socket.close();
				closePeerConnection();
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		},
	});
	const connected$ = computed(() => (socketApi$() ? true : needNewSocket$() ? false : null));

	const peerConnection$ = writable(undefined as RTCPeerConnection | undefined, { equal: Object.is });
	const receiverStream$ = writable(null as MediaStream | null, { equal: Object.is });

	const emitterStreamConfig$ = writable(null as StreamConfig);
	const emitterStream$ = deriveStream(emitterStreamConfig$);
	const emitterStreamInfo$ = computed(() => {
		const emitterStream = emitterStream$();
		const hasAudio = (emitterStream?.getAudioTracks().length ?? 0) > 0;
		const hasVideo = (emitterStream?.getVideoTracks().length ?? 0) > 0;
		return { hasAudio, hasVideo };
	});
	const resolutionRefresh$ = writable({});
	const updateResolution = () => {
		resolutionRefresh$.set({});
	};
	const createStreamResolution = (stream$: ReadableSignal<MediaStream | null>) =>
		computed(
			(): Resolution | undefined => {
				const stream = stream$();
				const videoStream = stream?.getVideoTracks()[0];
				if (videoStream) {
					resolutionRefresh$();
					const settings = videoStream.getSettings();
					return { width: settings.width!, height: settings.height! };
				}
				return undefined;
			},
			{ equal: fastDeepEqual },
		);
	const emitterStreamResolution$ = createStreamResolution(emitterStream$);
	const receiverStreamResolution$ = createStreamResolution(receiverStream$);

	const recordEmitterStreamAction$ = derived(
		[emitterStream$, computed(() => emitterData$()?.recordOptions, { equal: fastDeepEqual }), computed(() => emitterData$()?.record)],
		([stream, options, recordId], set) => {
			set(undefined);
			if (stream && recordId) {
				return recordInBrowserStorage(stream, set, options);
			}
		},
		undefined as undefined | RecordingInfo,
	);

	const applyDelayFor = (audioOrVideo: typeof rtcStats.audio) => {
		const measuredDelay$ = computed(() => computeDelay(audioOrVideo.captureDelay$(), rtcStats.timestampDiff$(), roundTripTime$()));
		const applyPlayoutDelayHintAction$ = computed(() => {
			const receiver: any = audioOrVideo.receiver$();
			if (!receiver) return;
			const measuredDelay = measuredDelay$();
			const targetDelay = targetDelay$();
			if (receiver && measuredDelay != null && targetDelay != null && Math.abs(targetDelay - measuredDelay) > 30) {
				const existingDelay = (receiver.playoutDelayHint ?? 0) * 1000;
				const newDelayNoBoundary = existingDelay + (targetDelay - measuredDelay) * 0.85;
				const newDelay = Math.max(Math.min(targetDelay, newDelayNoBoundary), 0);
				receiver.playoutDelayHint = newDelay / 1000;
			}
		});
		return {
			measuredDelay$,
			applyPlayoutDelayHintAction$,
		};
	};

	const updateTracksAction$ = computed(() => {
		if (mode$() === "emitter") {
			const peerConnection = peerConnection$();
			if (peerConnection) {
				const tracks = peerConnection.getSenders();
				for (const track of tracks) {
					peerConnection.removeTrack(track);
				}
				const emitterStream = emitterStream$();
				if (emitterStream) {
					for (const track of emitterStream.getTracks()) {
						peerConnection.addTrack(track, emitterStream);
					}
				}
				addCaptureTimeToRTCConnection(peerConnection);
			}
		}
	});
	const recordReceiverStreamAction$ = derived(
		[computed(() => receiverData$()?.recordURL), computed(() => receiverData$()?.recordOptions, { equal: fastDeepEqual }), receiverStream$, computed(() => receiverData$()?.record)],
		([recordURL, recordOptions, stream, record], set) => {
			if (stream && recordURL && record) {
				return recordAndUpload(stream, recordURL, set, recordOptions);
			}
		},
		undefined as RecordingInfo | undefined,
	);
	const actions$ = computed(() => {
		socketApi$();
		updateTracksAction$();
		audioDelay.applyPlayoutDelayHintAction$();
		videoDelay.applyPlayoutDelayHintAction$();
		recordReceiverStreamAction$();
		recordEmitterStreamAction$();
	});

	const checkSameConnection = (connection: RTCPeerConnection) => {
		if (peerConnection$() !== connection) throw new Error("Interrupted");
	};

	const closePeerConnection = () => {
		peerConnection$()?.close();
		peerConnection$.set(undefined);
		receiverStream$.set(null);
	};

	const rpcApi: RemoteInterfaceImpl<RpcClientInterface> = {
		async createRTCConnection(arg) {
			closePeerConnection();
			console.log("new RTCPeerConnection");
			const connection = new RTCPeerConnection(arg.configuration);
			connection.addEventListener("track", (trackEvent) => {
				console.log("track event!!", trackEvent);
				const stream = trackEvent.streams[0] ?? null;
				receiverStream$.set(stream);
			});
			connection.addEventListener("connectionstatechange", (event) => {
				console.log("connectionstatechange", event);
			});
			connection.addEventListener("icecandidate", (event) => {
				console.log("icecandidate event");
				checkSameConnection(connection);
				socketApi$()?.("iceCandidate", { candidate: event.candidate }); // TODO: returned promise
			});
			peerConnection$.set(connection);
		},
		async deleteRTCConnection() {
			closePeerConnection();
		},
		async createOfferRTCConnection(arg) {
			const connection = peerConnection$()!;
			console.log("createOffer");
			const offer = await connection.createOffer();
			const initialSdp = offer.sdp;
			offer.sdp = addCaptureTimeToSdp(offer.sdp!);
			checkSameConnection(connection);
			console.log("setLocalDescription");
			try {
				await connection.setLocalDescription(offer);
			} catch (error) {
				checkSameConnection(connection);
				offer.sdp = initialSdp;
				await connection.setLocalDescription(offer);
			}
			checkSameConnection(connection);
			return offer;
		},
		async createAnswerRTCConnection(arg) {
			const connection = peerConnection$()!;
			console.log("setRemoteDescription");
			await connection.setRemoteDescription(arg.offer);
			checkSameConnection(connection);
			console.log("createAnswer");
			const answer = await connection.createAnswer();
			checkSameConnection(connection);
			console.log("setLocalDescription");
			await connection.setLocalDescription(answer);
			return answer;
		},
		async completeOfferRTCConnection(arg) {
			console.log("setRemoteDescription");
			await peerConnection$()?.setRemoteDescription(arg.answer);
		},
		async iceCandidate(arg) {
			console.log("addIceCandidate");
			await peerConnection$()?.addIceCandidate(arg.candidate ?? undefined);
		},
		async removeFile(arg) {
			await removeFileByName(arg.fileName);
		},
		async uploadFile(arg) {
			await uploadFile(arg.fileName, arg.uploadURL, arg.startByte);
		},
		async changeStreamConfig(arg) {
			emitterStreamConfig$.set(arg.streamConfig);
		},
	};

	const rtcStats = createRtcStatsModel(peerConnection$);
	const audioDelay = applyDelayFor(rtcStats.audio);
	const videoDelay = applyDelayFor(rtcStats.video);

	const unsubscribeActions = actions$.subscribe(() => {});

	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			needNewSocket$.set(null);
			unsubscribeActions();
		});
		import.meta.hot.accept(() => {
			import.meta.hot!.invalidate();
		});
	}

	return {
		mode$,
		emitterData$,
		receiverData$,
		adminData$,
		connected$: asReadable(connected$),
		emitterStreamConfig$,
		mediaDevices$,
		emitterStream$,
		receiverStream$: asReadable(receiverStream$),
		updateResolution,
		emitterRecording$: computed(() => !!recordEmitterStreamAction$() || !!emitterData$()?.recordingInReceiver),
		socketApi$,
	};
};

export const model = createModel();
