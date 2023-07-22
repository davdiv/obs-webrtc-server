import type { ReadableSignal } from "@amadeus-it-group/tansu";
import type { WebSocket } from "ws";
import type { RemoteInterfaceImpl } from "../common/jsonRpc";
import { jsonRpc } from "../common/jsonRpc";

export const websocketJsonRpc = <T, U, DR, DS>(methods: RemoteInterfaceImpl<U>, socket: WebSocket, dataSent$: ReadableSignal<DS>) => {
	const res = jsonRpc<T, U, DR, DS>(
		methods,
		{
			addMessageListener: (listener) =>
				socket.on("message", (data) => {
					listener(data.toString("utf8"));
				}),
			addCloseListener(listener) {
				socket.on("close", listener);
			},
			isClosed: () => socket.readyState !== socket.OPEN,
			write: (message) => socket.send(message),
		},
		dataSent$,
	);
	return res;
};
