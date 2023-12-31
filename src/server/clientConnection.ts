import type { ReadableSignal } from "@amadeus-it-group/tansu";
import { computed, readable, writable, type WritableSignal } from "@amadeus-it-group/tansu";
import deepEqual from "fast-deep-equal";
import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";
import { checkAbortSignal, waitAbortSignal } from "../common/abortUtils";
import { asyncSerialDerived } from "../common/asyncSerialDerived";
import type { CallMethod, RemoteInterfaceImpl } from "../common/jsonRpc";
import type {
	ClientSentEmitterInfo,
	ClientSentReceiverInfo,
	EmitterAdminInfo,
	EmitterToReceiverInfo,
	ReceiverToEmitterInfo,
	RpcClientInterface,
	RpcServerInterface,
	ServerSentAdminInfo,
	ServerSentEmitterInfo,
	ServerSentReceiverInfo,
	StreamInfo,
	TransformImage,
} from "../common/rpcInterface";
import { storeMap } from "../common/storeMap";
import type { ServerConfig } from "./config";
import type { obsManager } from "./obs";
import type { recordingManager } from "./recorder";
import type { createUploadManager } from "./uploadManager";
import { createId, hashId } from "./utils/createId";
import { websocketJsonRpc } from "./websocketJsonRpc";
import type { createLogger } from "./logger";

interface BaseClientConnection {
	id: string;
	ip: string;
	socket: WebSocket;
}

interface EmitterClientConnection extends BaseClientConnection {
	shortId: string;
	record$: WritableSignal<string | undefined>;
	remoteConnection$: WritableSignal<ReceiverClientConnection | undefined>;
	emitterToReceiverInfo$: ReadableSignal<EmitterToReceiverInfo | undefined>;
	streamInfo$: ReadableSignal<StreamInfo | undefined>;
	adminInfo$: ReadableSignal<EmitterAdminInfo>;
	api: CallMethod<RpcClientInterface, ClientSentEmitterInfo>;
}

type FullReceiverToEmitterInfo = ReceiverToEmitterInfo & Pick<ServerSentEmitterInfo, "recordingInReceiver">;

interface ReceiverClientConnection extends BaseClientConnection {
	record$: WritableSignal<string | undefined>;
	transformImage$: WritableSignal<TransformImage | undefined>;
	remoteConnection$: ReadableSignal<EmitterClientConnection | undefined>;
	receiverToEmitterInfo$: ReadableSignal<FullReceiverToEmitterInfo | undefined>;
	api: CallMethod<RpcClientInterface, ClientSentReceiverInfo>;
}

export const createClientsManager = (
	config: Pick<ServerConfig, "receiverPrefix" | "emitterPaths" | "adminPaths" | "mediaConstraints" | "rtcConfiguration" | "recordOptions" | "targetDelay">,
	obs: ReturnType<typeof obsManager>,
	recorder: ReturnType<typeof recordingManager>,
	uploadManager: ReturnType<typeof createUploadManager>,
	logger: ReturnType<typeof createLogger>,
) => {
	const emitterConnections = storeMap<string, EmitterClientConnection>();
	const receiverConnections = storeMap<string, ReceiverClientConnection>();

	const addToConnectionsList = <T extends EmitterClientConnection | ReceiverClientConnection>(connection: T, connectionsList: ReturnType<typeof storeMap<string, T>>) => {
		const removeConnection = connectionsList.add(connection.id, connection);
		connection.socket.on("close", removeConnection);
	};

	const createLogActionForStore = <T>(emitter: EmitterClientConnection, type: string, value$: ReadableSignal<T>, curValue: T) =>
		computed(() => {
			const value = value$();
			if (!deepEqual(value, curValue)) {
				logger({ type, id: emitter.shortId, value: value ?? null });
				curValue = value;
			}
		});

	const iceCandidate =
		(connection: EmitterClientConnection | ReceiverClientConnection): RemoteInterfaceImpl<RpcServerInterface>["iceCandidate"] =>
		async (arg) => {
			// TODO: validate parameters?
			await connection.remoteConnection$()?.api("iceCandidate", arg);
		};

	const subscribeUntilSocketClose = (action: ReadableSignal<void>, socket: WebSocket) => {
		const unsubscribe = action.subscribe(() => {});
		socket.on("close", unsubscribe);
	};

	const createEmitterConnection = (socket: WebSocket, ip: string) => {
		const id = createId();
		const connection: EmitterClientConnection = {
			id,
			ip,
			record$: writable(undefined),
			shortId: hashId(id),
			remoteConnection$: writable(undefined),
			streamInfo$: computed((): StreamInfo | undefined => connection.api.data$()?.streamInfo, { equal: deepEqual }),
			emitterToReceiverInfo$: computed((): EmitterToReceiverInfo | undefined => {
				const data = connection.api.data$();
				if (data) {
					return {
						roundTripTime: data.roundTripTime,
					};
				}
			}),
			adminInfo$: computed((): EmitterAdminInfo => {
				return {
					emitterIP: ip,
					emitterShortId: connection.shortId,
					emitterInfo: connection.api.data$(),
					receiverIP: connection.remoteConnection$()?.ip,
					receiverInfo: connection.remoteConnection$()?.api.data$(),
					transformImage: connection.remoteConnection$()?.transformImage$(),
				};
			}),
			socket,
			api: null as any,
		};
		logger({ type: "emitterConnect", id: connection.shortId, ip });
		const dataSent$ = computed((): ServerSentEmitterInfo => {
			return {
				mode: "emitter",
				mediaConstraints: config.mediaConstraints,
				recordOptions: config.recordOptions,
				record: connection.record$(),
				...connection.remoteConnection$()?.receiverToEmitterInfo$(),
			};
		});
		connection.api = websocketJsonRpc<RpcClientInterface, RpcServerInterface, ClientSentEmitterInfo, ServerSentEmitterInfo>(
			{
				iceCandidate: iceCandidate(connection),
			},
			socket,
			dataSent$,
		);
		addToConnectionsList(connection, emitterConnections);
		const logEmitterDevicesAction$ = createLogActionForStore(
			connection,
			"emitterDevices",
			computed(() => connection.api.data$()?.mediaDevices ?? { audioinput: {}, videoinput: {} }, { equal: deepEqual }),
			{ audioinput: {}, videoinput: {} },
		);
		const logEmitterStreamConfigAction$ = createLogActionForStore(
			connection,
			"emitterStreamConfig",
			computed(() => connection.api.data$()?.streamConfig, { equal: deepEqual }),
			undefined,
		);
		const logEmitterResolutionAction$ = createLogActionForStore(
			connection,
			"emitterResolution",
			computed(() => connection.api.data$()?.videoResolution, { equal: deepEqual }),
			undefined,
		);
		const logEmitterRecordingAction$ = createLogActionForStore(
			connection,
			"emitterRecording",
			computed(() => connection.api.data$()?.recording?.name, { equal: deepEqual }),
			undefined,
		);
		const actions$ = computed(() => {
			logEmitterDevicesAction$();
			logEmitterStreamConfigAction$();
			logEmitterRecordingAction$();
			logEmitterResolutionAction$();
		});
		subscribeUntilSocketClose(actions$, socket);
		socket.on("close", obs.addId(id));
		socket.on("close", () => {
			logger({ type: "emitterDisconnect", id: connection.shortId });
		});
	};

	const createReceiverConnection = (socket: WebSocket, emitter: EmitterClientConnection, ip: string) => {
		logger({ type: "receiverConnect", id: emitter.shortId, ip });
		const id = createId();
		const recordURL = recorder.createRecordURL(emitter.id);
		const connection: ReceiverClientConnection = {
			id,
			ip,
			transformImage$: writable(undefined, { equal: deepEqual }),
			record$: writable(undefined),
			remoteConnection$: readable(emitter),
			receiverToEmitterInfo$: computed(
				(): FullReceiverToEmitterInfo | undefined => {
					const data = connection.api.data$();
					if (data) {
						return {
							obsActive: !!data.obsActive,
							recordingInReceiver: !!data.recording,
						};
					}
				},
				{ equal: deepEqual },
			),
			socket,
			api: null as any,
		};
		const dataSent$ = computed((): ServerSentReceiverInfo => {
			return {
				mode: "receiver",
				transformImage: connection.transformImage$(),
				record: connection.record$(),
				recordOptions: config.recordOptions,
				recordURL,
				targetDelay: config.targetDelay,
				...emitter.emitterToReceiverInfo$(),
			};
		});
		connection.api = websocketJsonRpc<RpcClientInterface, RpcServerInterface, ClientSentReceiverInfo, ServerSentReceiverInfo>(
			{
				iceCandidate: iceCandidate(connection),
			},
			socket,
			dataSent$,
		);
		addToConnectionsList(connection, receiverConnections);
		emitter.remoteConnection$.set(connection);
		const stillConnected$ = computed(() => emitter.remoteConnection$() === connection);
		socket.on("close", () => {
			logger({ type: "receiverDisconnect", id: emitter.shortId });
			recorder.deleteRecordURL(id);
			if (stillConnected$()) {
				emitter.remoteConnection$.set(undefined);
			}
		});
		emitter.socket.on("close", async () => {
			socket.close(3001);
		});
		const logTransformImageAction$ = createLogActionForStore(emitter, "transformImage", connection.transformImage$, undefined);
		const logObsActiveAction$ = createLogActionForStore(
			emitter,
			"receiverObsActive",
			computed(() => !!connection.api.data$()?.obsActive),
			false,
		);
		const logViewportAction$ = createLogActionForStore(
			emitter,
			"receiverViewport",
			computed(() => connection.api.data$()?.viewport, { equal: deepEqual }),
			undefined,
		);
		const logReceiverRecordingAction$ = createLogActionForStore(
			emitter,
			"receiverRecording",
			computed(() => connection.api.data$()?.recording?.name, { equal: deepEqual }),
			undefined,
		);
		const connectStreamAction$ = asyncSerialDerived([stillConnected$, emitter.streamInfo$], {
			async derive([stillConnected, streamInfo], unused, abortSignal) {
				console.log("stillConnected", stillConnected, "streamInfo", streamInfo);
				if (stillConnected && (streamInfo?.hasAudio || streamInfo?.hasVideo)) {
					console.log("connecting stream ...");
					try {
						const configuration = config.rtcConfiguration ?? {};
						const emitterRtc = emitter.api("createRTCConnection", { configuration });
						const receiverRtc = connection.api("createRTCConnection", { configuration });
						await emitterRtc;
						checkAbortSignal(abortSignal);
						const offer = await emitter.api("createOfferRTCConnection", {});
						checkAbortSignal(abortSignal);
						await receiverRtc;
						checkAbortSignal(abortSignal);
						const answer = await connection.api("createAnswerRTCConnection", { offer });
						checkAbortSignal(abortSignal);
						await emitter.api("completeOfferRTCConnection", { answer });
						await waitAbortSignal(abortSignal);
					} finally {
						if (stillConnected$()) {
							await Promise.all([emitter.api("deleteRTCConnection", {}), connection.api("deleteRTCConnection", {})]);
						}
					}
				}
				console.log("end derived fn...");
			},
		});
		const actions$ = computed(() => {
			connectStreamAction$();
			logTransformImageAction$();
			logObsActiveAction$();
			logViewportAction$();
			logReceiverRecordingAction$();
		});
		subscribeUntilSocketClose(actions$, socket);
	};

	const createAdminConnection = (socket: WebSocket) => {
		const emitters$ = computed(() => {
			const connections = emitterConnections();
			const res: ServerSentAdminInfo["emitters"] = {};
			for (const connection of connections) {
				res[connection.id] = connection.adminInfo$();
			}
			return res;
		});
		const dataSent$ = computed((): ServerSentAdminInfo => {
			return {
				mode: "admin",
				mediaConstraints: config.mediaConstraints,
				emitters: emitters$(),
				files: uploadManager.receivedFiles$(),
			};
		});
		websocketJsonRpc<RpcClientInterface, RpcServerInterface, Record<string, never>, ServerSentAdminInfo>(
			{
				async uploadFile(arg) {
					const emitter = emitterConnections.get(arg.emitterId);
					if (emitter) {
						const uploadURL = uploadManager.createUploadURL({
							emitterShortId: emitter.shortId,
							fileName: arg.fileName,
							startByte: arg.startByte,
						});
						await emitter.api?.("uploadFile", {
							fileName: arg.fileName,
							uploadURL,
							startByte: arg.startByte,
						});
					}
				},
				async stopUpload(arg) {
					const emitter = emitterConnections.get(arg.emitterId);
					if (emitter) {
						uploadManager.stopUpload(`${emitter.shortId}/${arg.fileName}`);
					}
				},
				async removeFile(arg) {
					const emitter = emitterConnections.get(arg.emitterId);
					if (emitter) {
						await emitter.api?.("removeFile", {
							fileName: arg.fileName,
						});
					}
				},
				async toggleRecording(arg) {
					const emitter = emitterConnections.get(arg.emitterId);
					if (emitter) {
						const updateFn = (value: string | undefined): string | undefined => {
							if ((arg.action === "start" && !value) || arg.action === "newFile") {
								value = createId();
							} else if (arg.action === "stop") {
								value = undefined;
							}
							return value;
						};
						if (arg.emitter) {
							emitter.record$.update(updateFn);
						}
						if (arg.receiver) {
							emitter.remoteConnection$()?.record$.update(updateFn);
						}
					}
				},
				async transformImage(arg) {
					const emitter = emitterConnections.get(arg.emitterId);
					if (emitter) {
						emitter.remoteConnection$()?.transformImage$?.set(arg.transformImage);
					}
				},
				async changeStreamConfig(arg) {
					const emitter = emitterConnections.get(arg.emitterId);
					console.log("changeStreamConfig", arg, !!emitter);
					if (emitter) {
						emitter?.api("changeStreamConfig", { streamConfig: arg.streamConfig });
					}
				},
			},
			socket,
			dataSent$,
		);
	};

	return {
		createClientConnection: (socket: WebSocket, request: IncomingMessage) => {
			const url = new URL(request.url!, "https://localhost/");
			const ip = request.socket.remoteAddress!;

			if (config.emitterPaths?.includes(url.pathname)) {
				createEmitterConnection(socket, ip);
				return;
			} else if (config.adminPaths?.includes(url.pathname)) {
				createAdminConnection(socket);
				return;
			} else if (url.pathname.startsWith(config.receiverPrefix!)) {
				const emitterId = url.pathname.substring(config.receiverPrefix!.length);
				const emitter = emitterConnections.get(emitterId);
				if (emitter && !emitter.remoteConnection$()) {
					createReceiverConnection(socket, emitter, ip);
					return;
				}
			}

			socket.close(3001);
		},
	};
};
