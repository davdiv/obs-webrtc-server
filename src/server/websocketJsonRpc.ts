import type { WebSocket } from "ws";
import type { RemoteInterfaceImpl } from "../common/jsonRpc";
import { jsonRpc } from "../common/jsonRpc";

export const websocketJsonRpc = <T, U, Context>(methods: RemoteInterfaceImpl<U, Context>, socket: WebSocket, context: Context) => {
	const res = jsonRpc<T, U, Context>(
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
		context,
	);
	return res;
};
