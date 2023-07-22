import type { ReadableSignal } from "@amadeus-it-group/tansu";
import type { RemoteInterfaceImpl } from "../common/jsonRpc";
import { jsonRpc } from "../common/jsonRpc";

export const websocketJsonRpc = <T, U, DR, DS>(socket: WebSocket, methods: RemoteInterfaceImpl<U>, dataSent$: ReadableSignal<DS>) => {
	const callMethod = jsonRpc<T, U, DR, DS>(
		methods,
		{
			addMessageListener: (listener) => socket.addEventListener("message", (data) => listener(data.data)),
			addCloseListener: (listener) => socket.addEventListener("close", listener),
			isClosed: () => socket.readyState !== socket.OPEN,
			write: (message) => socket.send(message),
		},
		dataSent$,
	);
	return callMethod;
};
