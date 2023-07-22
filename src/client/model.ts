import { asReadable, computed, derived, writable } from "@amadeus-it-group/tansu";
import type { CallMethod, RemoteInterfaceImpl } from "../common/jsonRpc";
import type { ClientSentEmitterInfo, ClientSentInfo, ClientSentReceiverInfo, RpcClientInterface, RpcServerInterface, ServerSentInfo } from "../common/rpcInterface";
import { websocketJsonRpc } from "./websocketJsonRpc";
import { record } from "./recordUpload";
import { recordInBrowserStorage } from "./storage/recordInBrowserStorage";
import fastDeepEqual from "fast-deep-equal";

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
			} satisfies ClientSentEmitterInfo;
		} else if (emitterOrReceiver === "receiver") {
			return {
				obsActive: obsSourceActive$(),
			} satisfies ClientSentReceiverInfo;
		}
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
		recordStreamAction$();
		recordEmitterStreamAction$();
	});
	actions$.subscribe(() => {});

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
			checkSameConnection(connection);
			console.log("setLocalDescription");
			await connection.setLocalDescription(offer);
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

	createSocket();

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
