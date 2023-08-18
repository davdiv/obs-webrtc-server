import type { Server } from "http";
import { createServer as createHttpServer } from "http";
import type { AddressInfo } from "net";
import { createServer as createTCPServer } from "net";
import sirv from "sirv";
import { TLSSocket } from "tls";
import { WebSocketServer } from "ws";
import { createClientsManager } from "./clientConnection";
import type { ServerConfig } from "./config";
import { getInstallPath } from "./installPath";
import { obsManager } from "./obs";
import { recordingManager } from "./recorder";
import { createUploadManager } from "./uploadManager";
import { createLogger } from "./logger";

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
	const uploadManager = createUploadManager(config, configFilePath);
	const staticServer = await createServeMiddleware(server);
	const logger = await createLogger(config, configFilePath);

	server.on("request", (req, res) => {
		if (uploadManager.handleRequest(req, res)) return;
		if (recorder.handleRequest(req, res)) return;
		staticServer(req, res);
	});
	const wss = new WebSocketServer({ noServer: true });
	sendRegularHeartBeat(wss);

	const clientsManager = createClientsManager(config, obs, recorder, uploadManager, logger);
	wss.on("connection", clientsManager.createClientConnection);
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
	for (const adminPath of config.adminPaths ?? []) {
		console.log(`Admin URL: ${baseURL}${adminPath}`);
	}
	for (const emitterPath of config.emitterPaths ?? []) {
		console.log(`Emitter URL: ${baseURL}${emitterPath}`);
	}
};
