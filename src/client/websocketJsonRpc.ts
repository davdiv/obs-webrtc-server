import type { RemoteInterfaceImpl } from "../common/jsonRpc";
import { jsonRpc } from "../common/jsonRpc";

export const websocketJsonRpc = <T, U, Context>(socket: WebSocket, methods: RemoteInterfaceImpl<U, Context>, context: Context) => {
	const callMethod = jsonRpc<T, U, Context>(
		methods,
		{
			addMessageListener: (listener) => socket.addEventListener("message", (data) => listener(data.data)),
			addCloseListener: (listener) => socket.addEventListener("close", listener),
			isClosed: () => socket.readyState !== socket.OPEN,
			write: (message) => socket.send(message),
		},
		context,
	);
	return callMethod;
};
