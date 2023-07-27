import { asReadable, computed, derived, writable } from "@amadeus-it-group/tansu";
import type { CallMethod, RemoteInterfaceImpl } from "../common/jsonRpc";
import type { ReceiverInfo, RpcClientInterface, RpcServerInterface, ServerControlledData } from "../common/rpcInterface";
import { websocketJsonRpc } from "./websocketJsonRpc";
import { record } from "./recordUpload";
import { recordInBrowserStorage } from "./storage/recordInBrowserStorage";

const obsSourceActive$ = writable(false);
if (window.obsstudio) {
	addEventListener("obsSourceActiveChanged", (event) => {
		obsSourceActive$.set((event as any).detail.active);
	});
}

export const createModel = () => {
	const url = new URL(window.location.href);
	url.protocol = url.protocol.replace(/^http/i, "ws");
	url.hash = "";

	const recordLocally$ = writable(true);
	const connected$ = writable(false as boolean | null);
	const data$ = writable(undefined as ServerControlledData | undefined);
	const peerConnection$ = writable(undefined as RTCPeerConnection | undefined);
	const receiverStream$ = writable(null as MediaStream | null, { equal: Object.is });

	const remoteReceiverInfo$ = writable(undefined as ReceiverInfo | undefined);
	const localReceiverInfo$ = computed(() => {
		return { active: obsSourceActive$() };
	});

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
		if (data$()?.type === "emitter") {
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
	const recordURL$ = computed(() => {
		const data = data$();
		return data?.type === "receiver" ? data.recordURL : undefined;
	});
	const recordOptions$ = computed(() => {
		const data = data$();
		return data?.type === "receiver" ? data.recordOptions : undefined;
	});
	const recordStreamAction$ = derived(
		[recordURL$, recordOptions$, receiverStream$],
		([recordURL, recordOptions, stream], set) => {
			if (stream && recordURL) {
				return record(stream, recordURL, recordOptions);
			}
		},
		undefined,
	);
	const sendDataAction$ = computed(() => {
		const type = data$()?.type;
		if (type === "emitter") {
			socketApi?.("streamChange", emitterStreamInfo$()); // TODO: promise
		} else if (type === "receiver") {
			recordStreamAction$();
			socketApi?.("receiverInfo", localReceiverInfo$()); // TODO: promise
		}
	});
	const actions$ = computed(() => {
		updateTracksAction$();
		sendDataAction$();
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

	const rpcApi: RemoteInterfaceImpl<RpcClientInterface, void> = {
		async dataChange(data) {
			data$.set(data);
		},
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
				socketApi?.("iceCandidate", { candidate: event.candidate }); // TODO: returned promise
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
		async receiverInfo(arg) {
			remoteReceiverInfo$.set(arg);
		},
	};

	let socket: WebSocket;
	let socketApi: CallMethod<RpcServerInterface> | undefined;

	const createSocket = () => {
		console.log("Creating new websocket");
		const localSocket = new WebSocket(url.href, ["obs-webrtc-server"]);
		socket = localSocket;
		socketApi = undefined;
		socket.addEventListener("close", async (event) => {
			if (socket != localSocket) return;
			closePeerConnection();
			data$.set(undefined);
			remoteReceiverInfo$.set(undefined);
			if (event.code === 3001) {
				connected$.set(null);
				return; // do not reconnect
			} else {
				connected$.set(false);
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
			createSocket();
		});
		socket.addEventListener("open", async () => {
			if (socket != localSocket) return;
			console.log("Socket connected");
			connected$.set(true);
			socketApi = websocketJsonRpc<RpcServerInterface, RpcClientInterface, void>(socket, rpcApi, undefined);
		});
	};

	createSocket();

	return {
		data$: asReadable(data$),
		connected$: asReadable(connected$),
		emitterStream$,
		receiverStream$: asReadable(receiverStream$),
		remoteReceiverInfo$: asReadable(remoteReceiverInfo$),
		recordLocally$,
	};
};

export const model = createModel();
