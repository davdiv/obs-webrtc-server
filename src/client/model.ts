import { asReadable, computed, derived, writable } from "@amadeus-it-group/tansu";
import fastDeepEqual from "fast-deep-equal";
import type { CallMethod, RemoteInterfaceImpl } from "../common/jsonRpc";
import type { ClientSentEmitterInfo, ClientSentInfo, ClientSentReceiverInfo, RpcClientInterface, RpcServerInterface, ServerSentInfo } from "../common/rpcInterface";
import { record } from "./recordUpload";
import { createRtcStatsModel } from "./rtcStats";
import { recordInBrowserStorage } from "./storage/recordInBrowserStorage";
import { websocketJsonRpc } from "./websocketJsonRpc";
import { addCaptureTimeToRTCConnection, addCaptureTimeToSdp } from "./absoluteCaptureTime";

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

const computeDelay = (captureDelay: number | undefined, timestampDiff: number | undefined, roundTripTime: number | undefined) =>
	captureDelay != null && timestampDiff != null && roundTripTime != null ? captureDelay - timestampDiff + roundTripTime / 2 : undefined;

export const createModel = () => {
	const url = new URL(window.location.href);
	url.protocol = url.protocol.replace(/^http/i, "ws");
	url.hash = "";

	let socket: WebSocket;
	const socketApi$ = writable(undefined as CallMethod<RpcServerInterface, ServerSentInfo> | undefined);
	const connected$ = writable(false as boolean | null);
	const data$ = computed(() => socketApi$()?.data$());
	const emitterOrReceiver$ = computed(() => data$()?.type);
	const emitterData$ = computed(() => {
		const data = data$();
		return data?.type === "emitter" ? data : undefined;
	});
	const receiverData$ = computed(() => {
		const data = data$();
		return data?.type === "receiver" ? data : undefined;
	});
	const clientSentInfo$ = computed((): ClientSentInfo => {
		const emitterOrReceiver = emitterOrReceiver$();
		if (emitterOrReceiver === "emitter") {
			return {
				streamInfo: emitterStreamInfo$(),
				roundTripTime: rtcStats.roundTripTime$(),
			} satisfies ClientSentEmitterInfo;
		} else if (emitterOrReceiver === "receiver") {
			return {
				obsActive: obsSourceActive$(),
			} satisfies ClientSentReceiverInfo;
		}
	});
	const roundTripTime$ = computed(() => receiverData$()?.roundTripTime);
	const targetDelay$ = computed(() => receiverData$()?.targetDelay);
	const audioDelay$ = computed(() => computeDelay(rtcStats.audio.captureDelay$(), rtcStats.timestampDiff$(), roundTripTime$()));
	const videoDelay$ = computed(() => computeDelay(rtcStats.video.captureDelay$(), rtcStats.timestampDiff$(), roundTripTime$()));
	const delayDiff$ = computed(() => {
		const targetDelay = targetDelay$();
		if (targetDelay != null) {
			const measuredDelay = audioDelay$() ?? videoDelay$();
			if (measuredDelay != null) {
				const diffDelay = (targetDelay - measuredDelay) / 1000;
				return Math.abs(diffDelay) < 0.01 ? 0 : diffDelay;
			}
		}
		return 0;
	});

	const createSocket = () => {
		console.log("Creating new websocket");
		const localSocket = new WebSocket(url.href, ["obs-webrtc-server"]);
		socket = localSocket;
		socketApi$.set(undefined);
		localSocket.addEventListener("close", async (event) => {
			if (socket != localSocket) return;
			closePeerConnection();
			if (event.code === 3001) {
				connected$.set(null);
				return; // do not reconnect
			} else {
				connected$.set(false);
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
			createSocket();
		});
		localSocket.addEventListener("open", async () => {
			if (socket != localSocket) return;
			console.log("Socket connected");
			connected$.set(true);
			socketApi$.set(websocketJsonRpc<RpcServerInterface, RpcClientInterface, ServerSentInfo, ClientSentInfo>(socket, rpcApi, clientSentInfo$));
		});
	};

	const recordLocally$ = writable(true);
	const peerConnection$ = writable(undefined as RTCPeerConnection | undefined, { equal: Object.is });
	const receiverStream$ = writable(null as MediaStream | null, { equal: Object.is });

	const emitterStream$ = writable(null as MediaStream | null);
	const emitterStreamInfo$ = computed(() => {
		const emitterStream = emitterStream$();
		const hasAudio = (emitterStream?.getAudioTracks()?.length ?? 0) > 0;
		const hasVideo = (emitterStream?.getVideoTracks()?.length ?? 0) > 0;
		return { hasAudio, hasVideo };
	});
	const recordEmitterStreamAction$ = derived(
		[emitterStream$, recordLocally$],
		([stream, recordLocally], set) => {
			if (stream && recordLocally) {
				return recordInBrowserStorage(stream);
			}
		},
		undefined,
	);
	const applyPlayoutDelayHintAction$ = computed(() => {
		const audioReceiver = rtcStats.audio.receiver$();
		const videoReceiver = rtcStats.video.receiver$();
		const delayDiff = delayDiff$();
		if (delayDiff != 0) {
			const existingDelay = (audioReceiver ?? (videoReceiver as any))?.playoutDelayHint ?? 0;
			const targetDelay = Math.max(0, existingDelay + delayDiff);
			if (audioReceiver) {
				(audioReceiver as any).playoutDelayHint = targetDelay;
			}
			if (videoReceiver) {
				(videoReceiver as any).playoutDelayHint = targetDelay;
			}
		}
	});
	const updateTracksAction$ = computed(() => {
		if (emitterOrReceiver$() === "emitter") {
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
	const recordStreamAction$ = derived(
		[computed(() => receiverData$()?.recordURL), computed(() => receiverData$()?.recordOptions, { equal: fastDeepEqual }), receiverStream$],
		([recordURL, recordOptions, stream], set) => {
			if (stream && recordURL) {
				return record(stream, recordURL, recordOptions);
			}
		},
		undefined,
	);
	const actions$ = computed(() => {
		updateTracksAction$();
		applyPlayoutDelayHintAction$();
		recordStreamAction$();
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
	};

	const rtcStats = createRtcStatsModel(peerConnection$);
	createSocket();

	actions$.subscribe(() => {});

	return {
		emitterOrReceiver$,
		emitterData$,
		receiverData$,
		connected$: asReadable(connected$),
		emitterStream$,
		receiverStream$: asReadable(receiverStream$),
		recordLocally$,
	};
};

export const model = createModel();
