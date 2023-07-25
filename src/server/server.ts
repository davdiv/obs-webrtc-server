import type { Server } from "http";
import { createServer as createHttpServer } from "http";
import type { AddressInfo } from "net";
import { createServer as createTCPServer } from "net";
import sirv from "sirv";
import { TLSSocket } from "tls";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import type { CallMethod, RemoteInterfaceImpl } from "../common/jsonRpc";
import type { RpcClientInterface, StreamInfo } from "../common/rpcInterface";
import { type RpcServerInterface, type ServerControlledData } from "../common/rpcInterface";
import type { ServerConfig } from "./config";
import { getInstallPath } from "./installPath";
import { noop, obsManager } from "./obs";
import { recordingManager } from "./recorder";
import { createId } from "./utils/createId";
import { websocketJsonRpc } from "./websocketJsonRpc";

const dev = import.meta.env.MODE === "development";

const createServeMiddleware = dev
	? async (server: Server) => {
			console.log("Starting in DEVELOPMENT mode!");
			const vite = await import("vite");
			const instance = await vite.createServer({
				root: getInstallPath(".."),
				configFile: getInstallPath("../vite.client.config.ts"),
				server: {
					hmr: {
						server,
					},
				},
			});
			return instance.middlewares;
	  }
	: () => sirv(getInstallPath("./public"), { single: true });

const checkSame = <T>(a: T, b: T) => {
	if (a !== b) throw new Error("interrupted");
};

interface ClientConnection {
	id: string;
	remoteConnection: ClientConnection | undefined;
	rtcCreated: undefined | Promise<void>;
	socket: WebSocket;
	data: ServerControlledData;
	streamInfo: StreamInfo;
	api: CallMethod<RpcClientInterface>;
}

const sendRegularHeartBeat = (wss: WebSocketServer) => {
	const activeClients = new WeakSet();
	wss.on("connection", (client) => {
		activeClients.add(client);
		client.on("pong", () => activeClients.add(client));
	});
	setInterval(() => {
		wss.clients.forEach((client) => {
			if (!activeClients.has(client)) {
				client.terminate();
			}
			activeClients.delete(client);
			client.ping();
		});
	}, 30000);
};

export const createServer = async (config: ServerConfig, configFilePath: string) => {
	const server = createHttpServer();
	const obs = obsManager(config, (id) => `${obsPrefix}${id}`);
	const recorder = recordingManager(config, configFilePath);
	const staticServer = await createServeMiddleware(server);

	server.on("request", (req, res) => {
		if (recorder.handleRequest(req, res)) return;
		staticServer(req, res);
	});
	const wss = new WebSocketServer({ noServer: true });
	sendRegularHeartBeat(wss);

	const serverApi: RemoteInterfaceImpl<RpcServerInterface, ClientConnection> = {
		async streamChange(arg, clientConnection) {
			clientConnection.streamInfo = arg;
			const remoteConnection = clientConnection.remoteConnection;
			if (remoteConnection) {
				if (arg.hasAudio || arg.hasVideo) {
					const configuration = config.rtcConfiguration ?? {};
					if (!clientConnection.rtcCreated) clientConnection.rtcCreated = clientConnection.api("createRTCConnection", { configuration });
					if (!remoteConnection.rtcCreated) remoteConnection.rtcCreated = remoteConnection.api("createRTCConnection", { configuration });
					await clientConnection.rtcCreated;
					checkSame(clientConnection.remoteConnection, remoteConnection);
					const offer = await clientConnection.api("createOfferRTCConnection", {});
					checkSame(clientConnection.remoteConnection, remoteConnection);
					await remoteConnection.rtcCreated;
					checkSame(clientConnection.remoteConnection, remoteConnection);
					const answer = await remoteConnection.api("createAnswerRTCConnection", { offer });
					checkSame(clientConnection.remoteConnection, remoteConnection);
					await clientConnection.api("completeOfferRTCConnection", { answer });
				} else {
					if (clientConnection.rtcCreated) {
						clientConnection.rtcCreated = undefined;
						clientConnection.api("deleteRTCConnection", {});
					}
					if (remoteConnection.rtcCreated) {
						remoteConnection.rtcCreated = undefined;
						remoteConnection.api("deleteRTCConnection", {});
					}
				}
			}
		},
		async iceCandidate(arg, context) {
			// TODO: validate parameters?
			await context.remoteConnection?.api?.("iceCandidate", arg);
		},
		async receiverInfo(arg, context) {
			// TODO: validate parameters?
			await context.remoteConnection?.api?.("receiverInfo", arg);
		},
	};

	const clientConnections = new Map<string, ClientConnection>();
	wss.on("connection", async (socket, request) => {
		const url = new URL(request.url!, "https://localhost/");
		let remoteConnection: ClientConnection | undefined;
		let data: ServerControlledData | undefined;
		if (config.emitterPaths?.includes(url.pathname)) {
			data = {
				type: "emitter",
			};
		} else if (url.pathname.startsWith(config.receiverPrefix!)) {
			const emitterId = url.pathname.substring(config.receiverPrefix!.length);
			const emitter = clientConnections.get(emitterId);
			if (emitter?.data.type === "emitter" && !emitter.remoteConnection) {
				remoteConnection = emitter;
				data = {
					type: "receiver",
				};
			}
		}
		if (!data) {
			socket.close(3001);
			return;
		}
		const id = createId();
		if (data.type === "receiver" && config.record) {
			data.recordURL = recorder.createRecordURL(id);
			data.recordOptions = config.recordOptions;
		} else if (data.type === "emitter") {
			data.mediaConstraints = config.mediaConstraints;
		}
		const clientConnection: ClientConnection = {
			id,
			socket,
			rtcCreated: undefined,
			remoteConnection,
			data,
			streamInfo: { hasAudio: false, hasVideo: false },
			api: null as any,
		};
		if (remoteConnection) {
			remoteConnection.remoteConnection = clientConnection;
		}
		clientConnection.api = websocketJsonRpc<RpcClientInterface, RpcServerInterface, ClientConnection>(serverApi, socket, clientConnection);
		clientConnections.set(clientConnection.id, clientConnection);
		let removeFromObs = noop;
		if (clientConnection.data.type === "emitter") {
			removeFromObs = obs.addId(clientConnection.id);
		}
		socket.on("close", () => {
			clientConnections.delete(clientConnection.id);
			removeFromObs();
			if (data?.type === "receiver" && data.recordURL) {
				recorder.deleteRecordURL(data.recordURL);
			}
			const remoteConnection = clientConnection.remoteConnection;
			if (remoteConnection) {
				if (remoteConnection.data.type === "receiver") {
					// TODO: wait somewhere for the end of recording upload?
					remoteConnection.socket.close();
				}
				if (remoteConnection.remoteConnection === clientConnection) {
					remoteConnection.remoteConnection = undefined;
				}
				clientConnection.remoteConnection = undefined;
			}
		});
		await clientConnection.api("dataChange", clientConnection.data);
		if (remoteConnection && (remoteConnection.streamInfo.hasAudio || remoteConnection?.streamInfo.hasVideo)) {
			await serverApi.streamChange(remoteConnection.streamInfo, remoteConnection);
		}
	});
	server.on("upgrade", (request, socket, head) => {
		const protocol = request.headers["sec-websocket-protocol"];
		if (protocol === "obs-webrtc-server") {
			wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
		} else if (!dev || protocol !== "vite-hmr") {
			socket.destroy();
		}
	});
	const tcpServer = createTCPServer((socket) => {
		socket.once("data", (data) => {
			socket.pause();
			socket.unshift(data);
			if (data.readUInt8(0) === 22) {
				// TLS coonnection
				if (config.tlsCertificate?.certificate && config.tlsCertificate.privateKey) {
					server.emit(
						"connection",
						new TLSSocket(socket, {
							isServer: true,
							cert: config.tlsCertificate?.certificate,
							key: config.tlsCertificate.privateKey,
						}),
					);
				}
				return;
			}
			server.emit("connection", socket);
			socket.resume();
		});
	});
	await new Promise((resolve, reject) => tcpServer.listen(config.listenPort, config.listenHost).on("listening", resolve).on("error", reject));
	const address = tcpServer.address() as AddressInfo;
	const baseURL = `https://${config.listenHost ?? "localhost"}:${address.port}`;
	const obsPrefix = `http://${config.listenHost ?? "localhost"}:${address.port}${config.receiverPrefix}`;
	console.log(`Listening on ${baseURL}`);
	for (const emitterPath of config.emitterPaths ?? []) {
		console.log(`Emitter URL: ${baseURL}${emitterPath}`);
	}
};
